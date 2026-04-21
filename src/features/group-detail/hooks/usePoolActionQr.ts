import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { encodeFunctionData, type Address } from 'viem';

import { chainoraApiBase } from '../../../configs/api';
import { POOL_ABI } from '../../../contract/chainoraAbis';
import { buildQrImageUrl, buildQrPayload } from '../../../services/qrFlow';
import {
  createQrSession,
  openQrSessionSocket,
  type QrSessionResponse,
  type QrSessionWsEvent,
} from '../../../services/qrSessionFlow';
import { mapPoolActionStatusMessage, shouldLockPoolActionQr } from '../utils';

const POOL_ACTION_QR_FEATURE = 'chainora-native-wallet:pool-action';

const normalizePoolActionError = (raw: unknown): string => {
  const fallback = 'Could not prepare QR. Please refresh and try again.';
  const message = raw instanceof Error ? raw.message.trim() : '';
  if (!message) {
    return fallback;
  }

  const lower = message.toLowerCase();
  if (
    lower.includes('session')
    || lower.includes('payload')
    || lower.includes('websocket')
    || lower.includes('rpc')
    || lower.includes('tx')
    || lower.includes('nonce')
    || lower.includes('sequence')
    || lower.includes('status')
    || lower.includes('selector')
  ) {
    return fallback;
  }

  return message;
};

export type PoolActionIntent = {
  actionKey: string;
  label: string;
  functionName: string;
  args?: readonly unknown[];
  valueWei?: string;
};

export type PoolActionCompletion = {
  intent: PoolActionIntent;
  completionStatus: 'confirmed';
};

type BuiltPoolActionIntent = PoolActionIntent & {
  calldata: `0x${string}`;
};

type UsePoolActionQrParams = {
  token: string;
  poolAddress: Address | null;
  onActionSuccess?: (result: PoolActionCompletion) => void;
};

export type UsePoolActionQrResult = {
  isOpen: boolean;
  isActing: boolean;
  pendingActionLabel: string;
  isPreparing: boolean;
  status: string;
  statusMessage: string;
  qrImageUrl: string;
  qrLocked: boolean;
  isSuccess: boolean;
  errorMessage: string;
  actionMessage: string;
  actionError: string;
  startAction: (intent: PoolActionIntent) => void;
  refreshQr: () => void;
  closeDialog: () => void;
};

export const usePoolActionQr = ({
  token,
  poolAddress,
  onActionSuccess,
}: UsePoolActionQrParams): UsePoolActionQrResult => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<BuiltPoolActionIntent | null>(null);
  const [session, setSession] = useState<QrSessionResponse | null>(null);
  const [status, setStatus] = useState('idle');
  const [isPreparing, setIsPreparing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const onActionSuccessRef = useRef(onActionSuccess);
  const sessionRef = useRef<QrSessionResponse | null>(null);
  const isStartingRef = useRef(false);

  useEffect(() => {
    onActionSuccessRef.current = onActionSuccess;
  }, [onActionSuccess]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setPendingIntent(null);
    setSession(null);
    sessionRef.current = null;
    setStatus('idle');
    setErrorMessage('');
    setIsPreparing(false);
    wsRef.current?.close();
    wsRef.current = null;
    isStartingRef.current = false;
  }, []);

  const startSession = useCallback(async (options?: { force?: boolean }) => {
    if (!pendingIntent || !poolAddress || !token) {
      return;
    }
    if (isStartingRef.current) {
      return;
    }
    if (!options?.force && sessionRef.current) {
      return;
    }

    isStartingRef.current = true;

    setIsPreparing(true);
    setErrorMessage('');
    setStatus('idle');
    if (options?.force) {
      setSession(null);
      sessionRef.current = null;
    }

    wsRef.current?.close();
    wsRef.current = null;

    try {
      const createdSession = await createQrSession(chainoraApiBase);
      setSession(createdSession);
      setStatus('qr_ready');

      const ws = openQrSessionSocket(
        chainoraApiBase,
        createdSession.sessionId,
        (payload: QrSessionWsEvent) => {
          const rawStatus = String(payload.status ?? '').trim();
          if (!rawStatus) {
            return;
          }

          const nextStatus = rawStatus === 'pool_action_pending_confirmation'
            ? 'pool_action_waiting_receipt'
            : rawStatus;
          setStatus(nextStatus);

          if (nextStatus === 'pool_action_failed') {
            const message = 'Could not complete this action. Refresh QR and try again.';
            setActionError(message);
            setErrorMessage(message);
            return;
          }

          if (nextStatus === 'pool_action_success') {
            setActionMessage(`${pendingIntent.label} completed successfully.`);
            setActionError('');
            onActionSuccessRef.current?.({
              intent: pendingIntent,
              completionStatus: 'confirmed',
            });
            closeDialog();
            return;
          }
        },
        socketState => {
          setStatus(current => (
            socketState === 'closed'
            && current === 'pool_action_success'
              ? current
              : socketState
          ));
        },
      );

      wsRef.current = ws;
    } catch (error) {
      const message = normalizePoolActionError(error);
      setErrorMessage(message);
      setActionError(message);
      setStatus('error');
      setSession(null);
    } finally {
      isStartingRef.current = false;
      setIsPreparing(false);
    }
  }, [closeDialog, pendingIntent, poolAddress, token]);

  useEffect(() => {
    if (!isOpen || !pendingIntent || sessionRef.current) {
      return;
    }

    void startSession();
  }, [isOpen, pendingIntent, startSession]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const startAction = useCallback((intent: PoolActionIntent) => {
    if (!poolAddress) {
      setActionError('Group details are missing. Please refresh and try again.');
      return;
    }
    if (!token) {
      setActionError('Login expired. Please log in again.');
      return;
    }

    const calldata = encodeFunctionData({
      abi: POOL_ABI,
      functionName: intent.functionName as never,
      args: (intent.args ?? []) as never,
    });

    setActionError('');
    setActionMessage(`Preparing ${intent.label}...`);
    setSession(null);
    sessionRef.current = null;
    setStatus('idle');
    setPendingIntent({
      ...intent,
      calldata,
      valueWei: intent.valueWei ?? '0',
    });
    setIsOpen(true);
  }, [poolAddress, token]);

  const qrPayload = useMemo(() => {
    if (!pendingIntent || !session || !poolAddress || !token) {
      return '';
    }

    return buildQrPayload({
      feature: POOL_ACTION_QR_FEATURE,
      apiBase: chainoraApiBase,
      data: {
        sessionId: session.sessionId,
        action: pendingIntent.actionKey,
        authToken: token,
        poolAction: {
          to: poolAddress,
          data: pendingIntent.calldata,
          valueWei: pendingIntent.valueWei ?? '0',
          label: pendingIntent.label,
          poolAddress,
        },
      },
    });
  }, [pendingIntent, poolAddress, session, token]);

  const qrImageUrl = useMemo(() => buildQrImageUrl(qrPayload, 420), [qrPayload]);
  const statusMessage = useMemo(() => mapPoolActionStatusMessage(status), [status]);
  const qrLocked = useMemo(() => shouldLockPoolActionQr(status), [status]);
  const isActing = useMemo(
    () =>
      isOpen
      || isPreparing
      || status === 'awaiting_card_scan'
      || status === 'pool_action_signing_tx'
      || status === 'pool_action_waiting_receipt',
    [isOpen, isPreparing, status],
  );

  return {
    isOpen,
    isActing,
    pendingActionLabel: pendingIntent?.label ?? '',
    isPreparing,
    status,
    statusMessage,
    qrImageUrl,
    qrLocked,
    isSuccess: status === 'pool_action_success',
    errorMessage,
    actionMessage,
    actionError,
    startAction,
    refreshQr: () => {
      void startSession({ force: true });
    },
    closeDialog,
  };
};
