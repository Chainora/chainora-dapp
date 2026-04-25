import { useCallback, useMemo, useRef, useState } from 'react';
import type { Address, PublicClient } from 'viem';

import { buildQrImageUrl } from '../services/qrFlow';
import {
  buildDeviceAttestPayload,
  isDeviceVerifiedOnChain,
} from '../services/deviceAttestation';

type PendingAction = (() => Promise<void>) | null;

export const useDeviceAttestationGate = ({
  publicClient,
  accountAddress,
  apiBase,
}: {
  publicClient: PublicClient | undefined;
  accountAddress: Address | null;
  apiBase: string;
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [qrPayload, setQrPayload] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const pendingActionRef = useRef<PendingAction>(null);
  const resumeInFlightRef = useRef(false);

  const qrImageUrl = useMemo(() => buildQrImageUrl(qrPayload, 320), [qrPayload]);

  const ensureVerified = useCallback(async (): Promise<boolean> => {
    if (!publicClient || !accountAddress) {
      throw new Error('Wallet is not connected.');
    }

    return isDeviceVerifiedOnChain({
      publicClient,
      accountAddress,
    });
  }, [accountAddress, publicClient]);

  const runWithGate = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    const verified = await ensureVerified();
    if (verified) {
      await action();
      return true;
    }

    pendingActionRef.current = action;
    setStatusMessage('Device verification required. Scan QR in Chainora app and complete card attestation.');
    setQrPayload(buildDeviceAttestPayload({
      apiBase,
      accountAddress: accountAddress as Address,
      requestId: `attest_${Date.now()}`,
    }));
    setIsDialogOpen(true);
    return false;
  }, [accountAddress, apiBase, ensureVerified]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setIsChecking(false);
    setStatusMessage('');
    setQrPayload('');
    pendingActionRef.current = null;
  }, []);

  const confirmAttestationAndResume = useCallback(async () => {
    if (resumeInFlightRef.current) {
      return;
    }

    resumeInFlightRef.current = true;
    setIsChecking(true);
    setStatusMessage('Checking device verification status...');

    try {
      const verified = await ensureVerified();
      if (!verified) {
        setStatusMessage('Device is still not verified. Complete attestation in native app, then try again.');
        return;
      }

      const pendingAction = pendingActionRef.current;
      pendingActionRef.current = null;
      setStatusMessage('Device verified. Resuming request...');
      setIsDialogOpen(false);
      setQrPayload('');

      if (pendingAction) {
        await pendingAction();
      }
    } finally {
      setIsChecking(false);
      resumeInFlightRef.current = false;
    }
  }, [ensureVerified]);

  return {
    isDialogOpen,
    isChecking,
    qrImageUrl,
    statusMessage,
    runWithGate,
    closeDialog,
    confirmAttestationAndResume,
  };
};
