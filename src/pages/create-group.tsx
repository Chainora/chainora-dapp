import { Navigate, useNavigate } from '@tanstack/react-router';
import { type ChangeEvent, type FormEvent, useCallback, useMemo, useState } from 'react';
import {
  decodeEventLog,
  getAddress,
  isAddress,
  parseUnits,
  type Address,
} from 'viem';
import { useAccount, usePublicClient } from 'wagmi';

import { DeviceAttestDialog } from '../components/wallet/DeviceAttestDialog';
import { chainoraApiBase } from '../configs/api';
import { FACTORY_ABI } from '../contract/chainoraAbis';
import { CHAINORA_PROTOCOL_ADDRESSES, ZERO_ADDRESS } from '../contract/chainoraAddresses';
import { useAuth } from '../context/AuthContext';
import {
  CURRENCY_DECIMALS,
  createGroupSchema,
  type CreateGroupInput,
  defaultForm,
  toContractDurations,
} from '../features/create-group/formSchema';
import { resolveCreatorEVMAddress } from '../features/create-group/status';
import {
  DASHBOARD_FORCE_SYNC_ONCE_KEY,
  DASHBOARD_PREFERRED_MODE_KEY,
} from '../features/dashboard/constants';
import {
  readDashboardGroupCache,
  readJoinedPoolIdCache,
  writeDashboardGroupCache,
  writeJoinedPoolIdCache,
} from '../features/dashboard/cache';
import type { ApiGroup } from '../services/groupsService';
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
import { useDeviceAttestationGate } from '../hooks/useDeviceAttestationGate';
import { useRelayAbiWriteExecutor } from '../hooks/useRelayAbiWriteExecutor';
import { syncGroupStateAfterTx, waitForGroupProjectionSync } from '../services/groupStateSync';
import { uploadMediaImage } from '../services/mediaService';
import { createGroupRecord } from '../services/groupsService';

const DEFAULT_DASHBOARD_QUERY_KEY = '|created_at|desc||';

const mergeGroupIntoList = (current: ApiGroup[], incoming: ApiGroup): ApiGroup[] => {
  const filtered = current.filter(
    group => group.poolId.trim().toLowerCase() !== incoming.poolId.trim().toLowerCase(),
  );
  return [incoming, ...filtered];
};

const primeDashboardCacheWithGroup = (group: ApiGroup, isPublic: boolean, viewerAddress: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const modes: Array<'joined' | 'public'> = isPublic ? ['joined', 'public'] : ['joined'];
  for (const mode of modes) {
    const existing = readDashboardGroupCache(mode, DEFAULT_DASHBOARD_QUERY_KEY, viewerAddress) ?? [];
    writeDashboardGroupCache(mode, DEFAULT_DASHBOARD_QUERY_KEY, mergeGroupIntoList(existing, group), viewerAddress);
  }
};

const primeJoinedPoolCache = (viewerAddress: string, poolId: string): void => {
  if (!viewerAddress || !poolId) {
    return;
  }

  const existing = readJoinedPoolIdCache(viewerAddress);
  const lowered = poolId.trim().toLowerCase();
  if (existing.some(item => item.trim().toLowerCase() === lowered)) {
    return;
  }
  writeJoinedPoolIdCache(viewerAddress, [poolId, ...existing]);
};

type CreateGroupWalletFlowState =
  | 'idle'
  | 'connecting'
  | 'awaiting_wallet_approval'
  | 'awaiting_card'
  | 'broadcasting'
  | 'confirmed'
  | 'attest_required'
  | 'error';

const mapCreateGroupWalletStatus = (state: CreateGroupWalletFlowState): string => {
  switch (state) {
    case 'connecting':
      return 'Connecting wallet session...';
    case 'awaiting_wallet_approval':
      return 'Preparing create-group transaction...';
    case 'awaiting_card':
      return 'Approve in native app and sign with your card.';
    case 'broadcasting':
      return 'Broadcasting transaction and waiting for confirmation...';
    case 'confirmed':
      return 'Group created successfully.';
    case 'attest_required':
      return 'Device verification required before create-group.';
    case 'error':
      return 'Could not create group.';
    default:
      return 'Review your group details, then confirm with wallet.';
  }
};

const extractRevertDetail = (message: string): string => {
  const trimmed = message.trim();
  if (!trimmed) {
    return '';
  }

  const failedExecuteMatch = trimmed.match(/failed to execute message;[^\n\r]*/i);
  if (failedExecuteMatch) {
    return failedExecuteMatch[0].trim();
  }

  const executionRevertedMatch = trimmed.match(/execution reverted(?::\s*([^\n\r]+))?/i);
  if (executionRevertedMatch) {
    const reason = (executionRevertedMatch[1] ?? '').trim();
    return reason ? `execution reverted: ${reason}` : 'execution reverted';
  }

  if (trimmed.toLowerCase().includes('reverted')) {
    return 'execution reverted';
  }

  return '';
};

const normalizeCreateGroupError = (raw: unknown): string => {
  const fallback = 'Could not create group. Please try again.';
  const message = raw instanceof Error ? raw.message.trim() : String(raw ?? '').trim();
  const providerCode = typeof raw === 'object' && raw !== null && 'code' in raw
    ? Number((raw as { code?: unknown }).code)
    : Number.NaN;
  if (providerCode === 4001) {
    return 'Request canceled in Chainora Wallet. No transaction was sent.';
  }
  if (!message) {
    return fallback;
  }

  const lower = message.toLowerCase();
  if (lower.includes('user rejected') || lower.includes('request rejected in mobile wallet')) {
    return 'Request canceled in Chainora Wallet. No transaction was sent.';
  }
  const revertDetail = extractRevertDetail(message);
  if (revertDetail) {
    return `Transaction reverted on-chain: ${revertDetail}`;
  }

  if (
    lower.includes('mobile peer is not connected')
    || lower.includes('relay websocket is not connected')
    || lower.includes('wallet relay account is not connected')
    || lower.includes('relay session disconnected')
  ) {
    return 'Wallet relay session disconnected. Please reconnect wallet and scan QR again.';
  }

  if (
    lower.includes('session account mismatch')
    || lower.includes('switch active account before approving this request')
    || (lower.includes('account') && lower.includes('mismatch'))
  ) {
    return 'Wallet account mismatch for this session. Reconnect this tab and scan QR with the matching account.';
  }

  if (lower.includes('relay request timeout')) {
    return 'Native wallet did not approve in time. Please retry and confirm on mobile.';
  }

  if (
    lower.includes('nonce')
    || lower.includes('sequence')
    || lower.includes('invalid parameters')
    || lower.includes('rpc')
  ) {
    return fallback;
  }

  return message;
};

const decodePoolCreatedFromReceipt = (
  logs: readonly { address: Address; data: `0x${string}`; topics: readonly `0x${string}`[] }[],
  factoryAddress: Address,
): { poolAddress: Address; poolId: string } => {
  for (const log of logs) {
    if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: FACTORY_ABI,
        data: log.data,
        topics: [...log.topics] as [`0x${string}`, ...`0x${string}`[]],
        strict: false,
      });

      if (decoded.eventName !== 'ChainoraPoolCreated') {
        continue;
      }

      return {
        poolAddress: getAddress(String(decoded.args.pool)),
        poolId: String(decoded.args.poolId),
      };
    } catch {
      // Ignore non-matching logs.
    }
  }

  throw new Error('Transaction confirmed but ChainoraPoolCreated event was not found.');
};

export function CreateGroupPage() {
  const navigate = useNavigate();
  const { token, isAuthenticated, address, initAddress } = useAuth();
  const { authFetch } = useAuthFetch();
  const executeAbiWrite = useRelayAbiWriteExecutor();
  const { address: connectedWalletAddressRaw } = useAccount();
  const publicClient = usePublicClient();

  const connectedWalletAddress = useMemo(() => {
    if (!connectedWalletAddressRaw || !isAddress(connectedWalletAddressRaw)) {
      return null;
    }
    return getAddress(connectedWalletAddressRaw);
  }, [connectedWalletAddressRaw]);

  const creatorEVMAddress = useMemo(
    () => resolveCreatorEVMAddress(address, initAddress),
    [address, initAddress],
  );

  const actionAddress = useMemo<Address | null>(() => {
    if (creatorEVMAddress && isAddress(creatorEVMAddress)) {
      return getAddress(creatorEVMAddress);
    }
    if (connectedWalletAddress && isAddress(connectedWalletAddress)) {
      return getAddress(connectedWalletAddress);
    }
    return null;
  }, [connectedWalletAddress, creatorEVMAddress]);

  const attestationGate = useDeviceAttestationGate({
    publicClient,
    accountAddress: actionAddress,
    apiBase: chainoraApiBase,
  });

  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isUploadingGroupImage, setIsUploadingGroupImage] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewInput, setReviewInput] = useState<CreateGroupInput | null>(null);
  const [reviewFlowState, setReviewFlowState] = useState<CreateGroupWalletFlowState>('idle');
  const [reviewDialogError, setReviewDialogError] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isCreatePoolSuccess, setIsCreatePoolSuccess] = useState(false);
  const [toasts, setToasts] = useState<UiToast[]>([]);
  const [pendingNavigationOnDone, setPendingNavigationOnDone] = useState(false);

  const amountPerPeriod = Number(form.amountPerPeriod || '0');
  const members = Number(form.targetMembers || '0');
  const totalPot = Number.isFinite(amountPerPeriod * members) ? amountPerPeriod * members : 0;

  const reviewStatusMessage = useMemo(() => {
    if (reviewFlowState === 'error' && reviewDialogError.trim()) {
      return reviewDialogError.trim();
    }
    return mapCreateGroupWalletStatus(reviewFlowState);
  }, [reviewDialogError, reviewFlowState]);

  const dismissToast = useCallback((id: number) => {
    setToasts(previous => previous.filter(item => item.id !== id));
  }, []);

  const pushToast = useCallback((tone: UiToast['tone'], message: string) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const id = Date.now() + Math.floor(Math.random() * 10_000);
    setToasts(previous => [...previous, { id, tone, message: trimmed }]);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        setToasts(previous => previous.filter(item => item.id !== id));
      }, 5_000);
    }
  }, []);

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
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Unable to upload group image';
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
    setShowReviewDialog(false);
    setReviewInput(null);
    setReviewDialogError('');
    setReviewFlowState('idle');
    setIsSubmittingReview(false);
    setIsCreatePoolSuccess(false);
    setPendingNavigationOnDone(false);
  }, []);

  const navigateToDashboardAfterCreate = useCallback(() => {
    if (typeof window !== 'undefined') {
      const preferredMode = reviewInput?.groupVisibility === 'private' ? 'joined' : 'public';
      window.sessionStorage.setItem(DASHBOARD_PREFERRED_MODE_KEY, preferredMode);
      window.sessionStorage.setItem(DASHBOARD_FORCE_SYNC_ONCE_KEY, '1');
    }

    void navigate({ to: '/dashboard' });
  }, [navigate, reviewInput]);

  const executeCreateGroup = useCallback(async (input: CreateGroupInput) => {
    if (!publicClient) {
      throw new Error('RPC client is not ready. Please refresh and try again.');
    }
    if (!actionAddress) {
      throw new Error('Please log in again to continue.');
    }
    if (!token.trim()) {
      throw new Error('Session expired. Please log in again.');
    }
    if (CHAINORA_PROTOCOL_ADDRESSES.factory.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
      throw new Error('Factory contract is not configured.');
    }

    setIsSubmittingReview(true);
    setReviewDialogError('');
    setReviewFlowState('awaiting_wallet_approval');

    try {
      const contractTimes = toContractDurations(
        input.periodDuration,
        input.auctionWindow,
        input.contributionWindow,
      );
      const contributionAmountWei = parseUnits(input.amountPerPeriod, CURRENCY_DECIMALS);
      const createPoolArgs = [
        {
          contributionAmount: contributionAmountWei,
          minReputation: BigInt(input.minReputationScore),
          targetMembers: input.targetMembers,
          periodDuration: contractTimes.periodDurationSeconds,
          contributionWindow: contractTimes.contributionWindowSeconds,
          auctionWindow: contractTimes.auctionWindowSeconds,
        },
        input.groupVisibility === 'public',
      ] as const;
      const { txHash, receipt } = await executeAbiWrite({
        actionKey: 'create_group',
        expectedAccountAddress: actionAddress,
        contractAddress: CHAINORA_PROTOCOL_ADDRESSES.factory,
        abi: FACTORY_ABI,
        functionName: 'createPool',
        args: createPoolArgs,
        onStageChange: stage => {
          switch (stage) {
            case 'connecting':
              setReviewFlowState('connecting');
              break;
            case 'processing':
              setReviewFlowState('awaiting_wallet_approval');
              break;
            case 'awaiting_native':
              setReviewFlowState('awaiting_card');
              break;
            case 'broadcasting':
              setReviewFlowState('broadcasting');
              break;
            case 'confirmed':
              setReviewFlowState('confirmed');
              break;
            case 'error':
              setReviewFlowState('error');
              break;
            default:
              break;
          }
        },
      });

      const created = decodePoolCreatedFromReceipt(
        receipt.logs as readonly { address: Address; data: `0x${string}`; topics: readonly `0x${string}`[] }[],
        CHAINORA_PROTOCOL_ADDRESSES.factory,
      );

      const persistedGroup = await createGroupRecord(token.trim(), {
        poolId: created.poolId,
        poolAddress: created.poolAddress,
        name: input.name,
        description: input.description,
        groupImageUrl: input.groupImageUrl?.trim() || '',
        publicRecruitment: input.groupVisibility === 'public',
        contributionAmount: contributionAmountWei.toString(),
        minReputation: String(input.minReputationScore),
        targetMembers: input.targetMembers,
        periodDuration: contractTimes.periodDurationSeconds,
        contributionWindow: contractTimes.contributionWindowSeconds,
        auctionWindow: contractTimes.auctionWindowSeconds,
        txHash,
      });

      primeDashboardCacheWithGroup(persistedGroup, input.groupVisibility === 'public', actionAddress);
      primeJoinedPoolCache(actionAddress, persistedGroup.poolId);

      setIsCreatePoolSuccess(true);
      setReviewFlowState('confirmed');
      pushToast('success', 'Group created successfully.');
      closeReviewDialog();
      navigateToDashboardAfterCreate();

      void (async () => {
        try {
          const projectionSync = await waitForGroupProjectionSync({
            accessToken: token.trim(),
            poolId: created.poolId,
            txHash,
          });
          const synced = await syncGroupStateAfterTx({
            accessToken: token.trim(),
            poolId: created.poolId,
            targets: ['overview'],
          });
          const finalGroup = synced.overview ?? persistedGroup;
          primeDashboardCacheWithGroup(finalGroup, input.groupVisibility === 'public', actionAddress);
          primeJoinedPoolCache(actionAddress, finalGroup.poolId);
          if (projectionSync.timedOut) {
            console.warn('[create-group] backend projection sync delayed', {
              poolId: created.poolId,
              txHash,
            });
          }
        } catch (syncError) {
          console.warn('[create-group] post-submit sync failed', syncError);
        }
      })();
    } catch (error) {
      const message = normalizeCreateGroupError(error);
      setReviewFlowState('error');
      setReviewDialogError(message);
      pushToast('error', message);
      throw error;
    } finally {
      setIsSubmittingReview(false);
    }
  }, [
    actionAddress,
    closeReviewDialog,
    executeAbiWrite,
    navigateToDashboardAfterCreate,
    publicClient,
    pushToast,
    token,
  ]);

  const onConfirmReview = useCallback(async () => {
    if (!reviewInput) {
      return;
    }

    try {
      const started = await attestationGate.runWithGate(async () => {
        await executeCreateGroup(reviewInput);
      });

      if (!started) {
        setReviewFlowState('attest_required');
      }
    } catch (error) {
      const message = normalizeCreateGroupError(error);
      setReviewFlowState('error');
      setReviewDialogError(message);
      setIsSubmittingReview(false);
    }
  }, [attestationGate, executeCreateGroup, reviewInput]);

  const onReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    const validData = validateForm();
    if (!validData) {
      return;
    }
    if (!actionAddress) {
      setSubmitError('Please log in again to continue.');
      return;
    }

    setReviewInput(validData);
    setReviewFlowState('idle');
    setReviewDialogError('');
    setShowReviewDialog(true);
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
        open={showReviewDialog}
        statusMessage={reviewStatusMessage}
        isSubmitting={isSubmittingReview}
        isCreatePoolSuccess={isCreatePoolSuccess}
        reviewDialogError={reviewDialogError}
        closeReviewDialog={closeReviewDialog}
        onConfirm={() => {
          void onConfirmReview();
        }}
        onDone={() => {
          if (!pendingNavigationOnDone) {
            closeReviewDialog();
            return;
          }
          closeReviewDialog();
          navigateToDashboardAfterCreate();
        }}
      />

      <DeviceAttestDialog
        open={attestationGate.isDialogOpen}
        statusMessage={attestationGate.statusMessage}
        qrImageUrl={attestationGate.qrImageUrl}
        isChecking={attestationGate.isChecking}
        onClose={attestationGate.closeDialog}
        onConfirm={() => {
          void attestationGate.confirmAttestationAndResume().catch(error => {
            const message = normalizeCreateGroupError(error);
            setReviewFlowState('error');
            setReviewDialogError(message);
            pushToast('error', message);
          });
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
