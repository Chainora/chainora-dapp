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

export type PoolActionIntent = {
  actionKey: string;
  label: string;
  functionName: string;
  args?: readonly unknown[];
  valueWei?: string;
};

type BuiltPoolActionIntent = PoolActionIntent & {
  calldata: `0x${string}`;
};

type UsePoolActionQrParams = {
  token: string;
  poolAddress: Address | null;
  onActionSuccess?: (intent: PoolActionIntent) => void;
};

export type UsePoolActionQrResult = {
  isOpen: boolean;
  isActing: boolean;
  pendingActionLabel: string;
  isPreparing: boolean;
  status: string;
  statusMessage: string;
  sessionId: string;
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
          const nextStatus = String(payload.status ?? '').trim();
          if (!nextStatus) {
            return;
          }

          setStatus(nextStatus);

          if (nextStatus === 'pool_action_failed') {
            setActionError('Pool action failed on mobile app. Refresh QR to retry.');
            setErrorMessage('Pool action failed on mobile app. Refresh QR to retry.');
            return;
          }

          if (nextStatus === 'pool_action_success') {
            setActionMessage(`${pendingIntent.label} confirmed on-chain.`);
            setActionError('');
            onActionSuccessRef.current?.(pendingIntent);
            closeDialog();
          }
        },
        socketState => {
          setStatus(current => (socketState === 'closed' && current === 'pool_action_success' ? current : socketState));
        },
      );

      wsRef.current = ws;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create signing session';
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
      setActionError('Pool address is missing. Refresh and retry.');
      return;
    }
    if (!token) {
      setActionError('Authentication expired. Please login again.');
      return;
    }

    const calldata = encodeFunctionData({
      abi: POOL_ABI,
      functionName: intent.functionName as never,
      args: (intent.args ?? []) as never,
    });

    setActionError('');
    setActionMessage(`Preparing ${intent.label} QR signing...`);
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
    sessionId: session?.sessionId ?? '',
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
