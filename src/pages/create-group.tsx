import { Navigate, useNavigate } from '@tanstack/react-router';
import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseUnits } from 'viem';

import { CHAINORA_PROTOCOL_ADDRESSES } from '../contract/chainoraAddresses';
import { chainoraApiBase } from '../configs/api';
import { useAuth } from '../context/AuthContext';
import {
  CONTRIBUTION_SYMBOL,
  CURRENCY_DECIMALS,
  createGroupSchema,
  type CreateGroupInput,
  defaultForm,
  toContractDurations,
} from '../features/create-group/formSchema';
import {
  CREATE_POOL_QR_FEATURE,
  mapCreatePoolStatusMessage,
  resolveCreatorEVMAddress,
  shouldLockCreatePoolQr,
} from '../features/create-group/status';
import {
  DASHBOARD_FORCE_SYNC_ONCE_KEY,
  DASHBOARD_PREFERRED_MODE_KEY,
} from '../features/dashboard/constants';
import {
  BasicInfoSection,
  ContractSummarySection,
  FinancialSection,
  TimingSection,
} from '../features/create-group/sections';
import { CreateGroupReviewDialog } from '../features/create-group/reviewDialog';
import { ToastStack } from '../features/group-detail/components/ToastStack';
import type { UiToast } from '../features/group-detail/types';
import type {
  DurationForm,
  FieldErrors,
  FormState,
} from '../features/create-group/types';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { uploadMediaImage } from '../services/mediaService';
import { buildQrImageUrl, buildQrPayload } from '../services/qrFlow';
import { createQrSession, openQrSessionSocket, type QrSessionResponse, type QrSessionWsEvent } from '../services/qrSessionFlow';

const normalizeCreateGroupError = (raw: string, fallback: string): string => {
  const message = String(raw ?? '').trim();
  if (!message) {
    return fallback;
  }

  const lower = message.toLowerCase();
  if (
    lower.includes('payload')
    || lower.includes('session')
    || lower.includes('websocket')
    || lower.includes('rpc')
    || lower.includes('tx')
    || lower.includes('hash')
    || lower.includes('nonce')
    || lower.includes('sequence')
    || lower.includes('selector')
    || lower.includes('invalid parameters')
    || lower.includes('status')
  ) {
    return fallback;
  }

  return message;
};

export function CreateGroupPage() {
  const navigate = useNavigate();
  const { token, isAuthenticated, address, initAddress } = useAuth();
  const { authFetch } = useAuthFetch();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isUploadingGroupImage, setIsUploadingGroupImage] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [reviewInput, setReviewInput] = useState<CreateGroupInput | null>(null);
  const [reviewSession, setReviewSession] = useState<QrSessionResponse | null>(null);
  const [reviewWsStatus, setReviewWsStatus] = useState('idle');
  const [reviewDialogError, setReviewDialogError] = useState('');
  const [isPreparingReviewSession, setIsPreparingReviewSession] = useState(false);
  const [toasts, setToasts] = useState<UiToast[]>([]);
  const reviewWsRef = useRef<WebSocket | null>(null);
  const hasAutoNavigatedAfterSuccessRef = useRef(false);
  const toastCounterRef = useRef(1);
  const lastToastKeyRef = useRef('');

  const amountPerPeriod = Number(form.amountPerPeriod || '0');
  const members = Number(form.targetMembers || '0');
  const totalPot = Number.isFinite(amountPerPeriod * members) ? amountPerPeriod * members : 0;

  const creatorEVMAddress = useMemo(
    () => resolveCreatorEVMAddress(address, initAddress),
    [address, initAddress],
  );

  const reviewPayload = useMemo(() => {
    if (!reviewInput || !reviewSession) {
      return '';
    }

    const contractTimes = toContractDurations(
      reviewInput.periodDuration,
      reviewInput.auctionWindow,
      reviewInput.contributionWindow,
    );

    return buildQrPayload({
      feature: CREATE_POOL_QR_FEATURE,
      apiBase: chainoraApiBase,
      data: {
        sessionId: reviewSession.sessionId,
        action: 'review_and_sign_create_pool',
        tokenSymbol: CONTRIBUTION_SYMBOL,
        groupName: reviewInput.name,
        groupDescription: reviewInput.description,
        groupImageUrl: reviewInput.groupImageUrl?.trim() || undefined,
        publicRecruitment: reviewInput.groupVisibility === 'public',
        minReputationScore: reviewInput.minReputationScore,
        authToken: token,
        contractVariables: {
          factoryAddress: CHAINORA_PROTOCOL_ADDRESSES.factory,
          contributionAmount: reviewInput.amountPerPeriod,
          contributionAmountWei: parseUnits(reviewInput.amountPerPeriod, CURRENCY_DECIMALS).toString(),
          skipPrecheck: true,
          publicRecruitment: reviewInput.groupVisibility === 'public',
          minReputation: reviewInput.minReputationScore,
          targetMembers: reviewInput.targetMembers,
          periodDurationSeconds: contractTimes.periodDurationSeconds,
          contributionWindowSeconds: contractTimes.contributionWindowSeconds,
          auctionWindowSeconds: contractTimes.auctionWindowSeconds,
        },
      },
    });
  }, [reviewInput, reviewSession, token]);

  const qrImageUrl = useMemo(() => buildQrImageUrl(reviewPayload, 420), [reviewPayload]);
  const reviewStatusMessage = useMemo(() => mapCreatePoolStatusMessage(reviewWsStatus), [reviewWsStatus]);
  const isReviewQrLocked = shouldLockCreatePoolQr(reviewWsStatus);
  const isCreatePoolSuccess = reviewWsStatus === 'create_pool_success';

  const setField = (field: keyof FormState, value: string) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
  };

  const onGroupImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors(previous => ({ ...previous, groupImageUrl: 'Please select an image file.' }));
      return;
    }

    setIsUploadingGroupImage(true);
    setSubmitError('');
    setErrors(previous => ({ ...previous, groupImageUrl: undefined }));

    try {
      const upload = await uploadMediaImage(authFetch, file, 'group');
      setForm(previous => ({ ...previous, groupImageUrl: upload.url }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to upload group image';
      setErrors(previous => ({ ...previous, groupImageUrl: message }));
    } finally {
      setIsUploadingGroupImage(false);
    }
  };

  const setDurationField = (
    field: 'periodDuration' | 'auctionWindow' | 'contributionWindow',
    value: DurationForm,
  ) => {
    setForm(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
  };

  const validateForm = (): CreateGroupInput | null => {
    const result = createGroupSchema.safeParse(form);
    if (!result.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (typeof path === 'string' && !(path in nextErrors)) {
          if (
            path === 'name'
            || path === 'description'
            || path === 'groupImageUrl'
            || path === 'groupVisibility'
            || path === 'minReputationScore'
            || path === 'amountPerPeriod'
            || path === 'targetMembers'
            || path === 'periodDuration'
            || path === 'auctionWindow'
            || path === 'contributionWindow'
          ) {
            nextErrors[path] = issue.message;
          }
        }
      }
      setErrors(nextErrors);
      return null;
    }

    setErrors({});
    return result.data;
  };

  const closeReviewDialog = useCallback(() => {
    setShowScanDialog(false);
    setReviewSession(null);
    setReviewWsStatus('idle');
    setReviewDialogError('');
    setIsPreparingReviewSession(false);
    hasAutoNavigatedAfterSuccessRef.current = false;
    reviewWsRef.current?.close();
    reviewWsRef.current = null;
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(previous => previous.filter(item => item.id !== id));
  }, []);

  const pushToast = useCallback((tone: UiToast['tone'], message: string) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
    const id = toastCounterRef.current;
    toastCounterRef.current += 1;
    setToasts(previous => [...previous, { id, tone, message: trimmed }]);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setToasts(previous => previous.filter(item => item.id !== id));
      }, 5000);
    }
  }, []);

  const reportReviewError = useCallback((message: string) => {
    setReviewDialogError(message);
    pushToast('error', message);
  }, [pushToast]);

  const extractWsErrorText = useCallback((payload: QrSessionWsEvent): string => {
    const source = payload as Record<string, unknown>;
    const keys = ['error', 'errorMessage', 'reason', 'message', 'detail', 'details'];
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }, []);

  const startCreatePoolSession = useCallback(async () => {
    if (!reviewInput) {
      return;
    }
    if (!creatorEVMAddress) {
      const message = 'Please log in again to continue.';
      reportReviewError(message);
      setReviewWsStatus('error');
      return;
    }

    setIsPreparingReviewSession(true);
    setReviewDialogError('');
    setReviewWsStatus('idle');
    setReviewSession(null);
    hasAutoNavigatedAfterSuccessRef.current = false;

    reviewWsRef.current?.close();
    reviewWsRef.current = null;

    try {
      const session = await createQrSession(chainoraApiBase);
      setReviewSession(session);
      setReviewWsStatus('qr_ready');

      const ws = openQrSessionSocket(
        chainoraApiBase,
        session.sessionId,
        (payload: QrSessionWsEvent) => {
          const rawStatus = String(payload?.status ?? '').trim();
          if (!rawStatus) {
            return;
          }

          const nextStatus = rawStatus === 'create_pool_pending_confirmation'
            ? 'create_pool_waiting_receipt'
            : rawStatus;
          setReviewWsStatus(nextStatus);
          const wsError = extractWsErrorText(payload);
          if (nextStatus === 'create_pool_failed') {
            const message = normalizeCreateGroupError(
              wsError,
              'Could not create group. Refresh QR and try again.',
            );
            setReviewDialogError(message);
          }
        },
        state => {
          setReviewWsStatus(current => (
            state === 'closed' && current === 'create_pool_success'
              ? current
              : state
          ));
          if (state === 'message_error') {
            const message = 'Connection interrupted. Please refresh QR.';
            reportReviewError(message);
          } else if (state === 'error') {
            const message = 'Connection lost. Please refresh QR.';
            reportReviewError(message);
          }
        },
      );

      reviewWsRef.current = ws;
    } catch (error) {
      const message = normalizeCreateGroupError(
        error instanceof Error ? error.message : '',
        'Could not prepare QR. Please try again.',
      );
      reportReviewError(message);
      setReviewSession(null);
      setReviewWsStatus('error');
    } finally {
      setIsPreparingReviewSession(false);
    }
  }, [creatorEVMAddress, extractWsErrorText, reportReviewError, reviewInput]);

  useEffect(() => {
    if (!showScanDialog) {
      return;
    }

    void startCreatePoolSession();
  }, [showScanDialog, startCreatePoolSession]);

  useEffect(() => {
    return () => {
      reviewWsRef.current?.close();
      reviewWsRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (reviewWsStatus === 'create_pool_success') {
      const key = 'create_pool_success';
      if (lastToastKeyRef.current !== key) {
        lastToastKeyRef.current = key;
        pushToast('success', 'Group created successfully.');
      }
      return;
    }

    if (reviewWsStatus === 'create_pool_failed') {
      const message = reviewDialogError.trim() || 'Create group failed. Please try again.';
      const key = `create_pool_failed:${message}`;
      if (lastToastKeyRef.current !== key) {
        lastToastKeyRef.current = key;
        pushToast('error', message);
      }
    }
  }, [pushToast, reviewDialogError, reviewWsStatus]);

  const navigateToDashboardAfterCreate = useCallback(() => {
    if (typeof window !== 'undefined') {
      const preferredMode = reviewInput?.groupVisibility === 'private' ? 'joined' : 'public';
      window.sessionStorage.setItem(DASHBOARD_PREFERRED_MODE_KEY, preferredMode);
      window.sessionStorage.setItem(DASHBOARD_FORCE_SYNC_ONCE_KEY, '1');
    }

    void navigate({ to: '/dashboard' });
  }, [navigate, reviewInput]);

  useEffect(() => {
    if (!showScanDialog || !isCreatePoolSuccess || hasAutoNavigatedAfterSuccessRef.current) {
      return;
    }

    hasAutoNavigatedAfterSuccessRef.current = true;
    closeReviewDialog();
    navigateToDashboardAfterCreate();
  }, [closeReviewDialog, isCreatePoolSuccess, navigateToDashboardAfterCreate, showScanDialog]);

  const onReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    const validData = validateForm();
    if (!validData) {
      return;
    }
    if (!creatorEVMAddress) {
      setSubmitError('Please log in again to continue.');
      return;
    }

    setReviewInput(validData);
    setShowScanDialog(true);
  };

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-slate-900">Create New Savings Group</h1>
        <p className="text-lg text-slate-500">Smart contract will automatically manage your savings group.</p>
      </div>

      <form onSubmit={onReview} className="space-y-5">
        <BasicInfoSection
          form={form}
          errors={errors}
          setField={setField}
          isUploadingGroupImage={isUploadingGroupImage}
          onGroupImageChange={onGroupImageChange}
        />
        <TimingSection
          form={form}
          errors={errors}
          setField={setField}
          setDurationField={setDurationField}
        />
        <FinancialSection
          form={form}
          errors={errors}
          setField={setField}
        />
        <ContractSummarySection form={form} totalPot={totalPot} />

        {submitError ? <p className="text-sm font-semibold text-rose-600">{submitError}</p> : null}

        <button
          type="submit"
          className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-lg font-semibold text-white transition hover:bg-blue-500"
        >
          Review and Sign Contract
        </button>
      </form>

      <CreateGroupReviewDialog
        open={showScanDialog}
        reviewStatusMessage={reviewStatusMessage}
        isPreparingReviewSession={isPreparingReviewSession}
        isReviewQrLocked={isReviewQrLocked}
        isCreatePoolSuccess={isCreatePoolSuccess}
        qrImageUrl={qrImageUrl}
        reviewDialogError={reviewDialogError}
        closeReviewDialog={closeReviewDialog}
        onRefresh={() => {
          void startCreatePoolSession();
        }}
        onDone={() => {
          closeReviewDialog();
          navigateToDashboardAfterCreate();
        }}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
