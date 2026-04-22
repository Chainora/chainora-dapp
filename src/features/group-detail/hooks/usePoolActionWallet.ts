import { useInterwovenKit } from '@initia/interwovenkit-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  encodeFunctionData,
  getAddress,
  isAddress,
  type Address,
} from 'viem';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

import { chainoraApiBase } from '../../../configs/api';
import { POOL_ABI } from '../../../contract/chainoraAbis';
import { useDeviceAttestationGate } from '../../../hooks/useDeviceAttestationGate';
import { mapPoolActionStatusMessage } from '../utils';

const normalizePoolActionError = (raw: unknown): string => {
  const fallback = 'Could not complete this action. Please try again.';
  const message = raw instanceof Error ? raw.message.trim() : String(raw ?? '').trim();
  if (!message) {
    return fallback;
  }

  const lower = message.toLowerCase();
  if (
    lower.includes('nonce')
    || lower.includes('sequence')
    || lower.includes('rpc')
    || lower.includes('invalid parameters')
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

type UsePoolActionWalletParams = {
  token: string;
  poolAddress: Address | null;
  onActionSuccess?: (result: PoolActionCompletion) => void;
};

export type UsePoolActionWalletResult = {
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

export const usePoolActionWallet = ({
  token,
  poolAddress,
  onActionSuccess,
}: UsePoolActionWalletParams): UsePoolActionWalletResult => {
  const { openConnect } = useInterwovenKit();
  const { address: connectedWalletAddressRaw, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isOpen, setIsOpen] = useState(false);
  const [pendingIntent, setPendingIntent] = useState<BuiltPoolActionIntent | null>(null);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const inFlightRef = useRef(false);
  const onActionSuccessRef = useRef(onActionSuccess);

  useEffect(() => {
    onActionSuccessRef.current = onActionSuccess;
  }, [onActionSuccess]);

  const connectedWalletAddress = useMemo(() => {
    if (!connectedWalletAddressRaw || !isAddress(connectedWalletAddressRaw)) {
      return null;
    }
    return getAddress(connectedWalletAddressRaw);
  }, [connectedWalletAddressRaw]);

  const attestationGate = useDeviceAttestationGate({
    publicClient,
    accountAddress: connectedWalletAddress,
    apiBase: chainoraApiBase,
  });

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setPendingIntent(null);
    setStatus('idle');
    setErrorMessage('');
    setActionError('');
    setActionMessage('');
    inFlightRef.current = false;
    attestationGate.closeDialog();
  }, [attestationGate]);

  const executeIntent = useCallback(async (intent: BuiltPoolActionIntent) => {
    if (inFlightRef.current) {
      return;
    }
    if (!token.trim()) {
      setStatus('error');
      setErrorMessage('Login expired. Please log in again.');
      setActionError('Login expired. Please log in again.');
      return;
    }
    if (!poolAddress) {
      setStatus('error');
      setErrorMessage('Group details are missing. Please refresh and try again.');
      setActionError('Group details are missing. Please refresh and try again.');
      return;
    }
    if (!isConnected || !connectedWalletAddress || !walletClient || !publicClient) {
      setStatus('connecting');
      setActionMessage('Connecting wallet session...');
      openConnect();
      return;
    }

    inFlightRef.current = true;
    setErrorMessage('');
    setActionError('');
    setActionMessage(`Preparing ${intent.label}...`);

    try {
      const started = await attestationGate.runWithGate(async () => {
        setStatus('awaiting_wallet_approval');
        setActionMessage('Preparing transaction...');
        setStatus('awaiting_card');
        setActionMessage('Approve and sign in native app with your card.');

        const txHash = await walletClient.writeContract({
          account: connectedWalletAddress,
          address: poolAddress,
          abi: POOL_ABI,
          functionName: intent.functionName as never,
          args: (intent.args ?? []) as never,
          value: BigInt(intent.valueWei ?? '0'),
        });

        setStatus('broadcasting');
        setActionMessage('Broadcasting transaction and waiting for confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== 'success') {
          throw new Error('Transaction reverted.');
        }

        setStatus('confirmed');
        setActionMessage(`${intent.label} completed successfully.`);
        setActionError('');
        onActionSuccessRef.current?.({
          intent,
          completionStatus: 'confirmed',
        });
      });

      if (!started) {
        setStatus('attest_required');
        setActionMessage('Device verification required before this action.');
        return;
      }
    } catch (error) {
      const message = normalizePoolActionError(error);
      setStatus('error');
      setErrorMessage(message);
      setActionError(message);
    } finally {
      inFlightRef.current = false;
    }
  }, [
    attestationGate,
    connectedWalletAddress,
    isConnected,
    openConnect,
    poolAddress,
    publicClient,
    token,
    walletClient,
  ]);

  const startAction = useCallback((intent: PoolActionIntent) => {
    if (!poolAddress) {
      setActionError('Group details are missing. Please refresh and try again.');
      return;
    }
    if (!token.trim()) {
      setActionError('Login expired. Please log in again.');
      return;
    }

    const calldata = encodeFunctionData({
      abi: POOL_ABI,
      functionName: intent.functionName as never,
      args: (intent.args ?? []) as never,
    });

    const builtIntent: BuiltPoolActionIntent = {
      ...intent,
      calldata,
      valueWei: intent.valueWei ?? '0',
    };

    setPendingIntent(builtIntent);
    setStatus('idle');
    setErrorMessage('');
    setActionError('');
    setIsOpen(true);
    void executeIntent(builtIntent);
  }, [executeIntent, poolAddress, token]);

  const refreshAction = useCallback(() => {
    if (!pendingIntent) {
      return;
    }
    if (status === 'attest_required') {
      void attestationGate.confirmAttestationAndResume().catch(error => {
        const message = normalizePoolActionError(error);
        setStatus('error');
        setErrorMessage(message);
        setActionError(message);
      });
      return;
    }
    void executeIntent(pendingIntent);
  }, [attestationGate, executeIntent, pendingIntent, status]);

  const statusMessage = useMemo(() => {
    if (status === 'attest_required') {
      return 'Device verification required. Scan QR and complete card attestation.';
    }
    return mapPoolActionStatusMessage(status);
  }, [status]);

  const isPreparing = status === 'connecting'
    || status === 'awaiting_wallet_approval'
    || status === 'awaiting_card'
    || status === 'broadcasting';
  const isActing = isOpen && (isPreparing || status === 'attest_required');

  return {
    isOpen,
    isActing,
    pendingActionLabel: pendingIntent?.label ?? '',
    isPreparing,
    status,
    statusMessage,
    qrImageUrl: status === 'attest_required' ? attestationGate.qrImageUrl : '',
    qrLocked: false,
    isSuccess: status === 'confirmed',
    errorMessage,
    actionMessage,
    actionError,
    startAction,
    refreshQr: refreshAction,
    closeDialog,
  };
};
