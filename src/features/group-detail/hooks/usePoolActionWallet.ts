import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  encodeFunctionData,
  erc20Abi,
  getAddress,
  isAddress,
  type Address,
} from 'viem';
import { useAccount, usePublicClient } from 'wagmi';

import { chainoraApiBase } from '../../../configs/api';
import { POOL_ABI } from '../../../contract/chainoraAbis';
import { useDeviceAttestationGate } from '../../../hooks/useDeviceAttestationGate';
import { useRelayAbiWriteExecutor } from '../../../hooks/useRelayAbiWriteExecutor';
import { walletDebugLog } from '../../../services/walletDebugLog';
import { mapPoolActionStatusMessage } from '../utils';

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

const normalizePoolActionError = (raw: unknown): string => {
  const fallback = 'Could not complete this action. Please try again.';
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
  if (lower.includes('transfer_from_failed')) {
    return 'tcUSD transfer failed. Please ensure this account has enough tcUSD and token allowance for this pool.';
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
    || lower.includes('wallet is not connected')
    || lower.includes('connector not connected')
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
    || lower.includes('rpc')
    || lower.includes('invalid parameters')
  ) {
    return fallback;
  }

  return message;
};

const classifyPoolActionError = (raw: unknown): string => {
  const message = raw instanceof Error ? raw.message.trim().toLowerCase() : String(raw ?? '').trim().toLowerCase();
  if (!message) {
    return 'UNKNOWN';
  }
  if (message.includes('transfer_from_failed')) {
    return 'TRANSFER_FROM_FAILED';
  }
  if (message.includes('reverted') || message.includes('execution reverted') || message.includes('failed to execute message')) {
    return 'REVERTED_ON_CHAIN';
  }
  if (message.includes('mobile peer is not connected') || message.includes('relay websocket')) {
    return 'RELAY_DISCONNECTED';
  }
  if (message.includes('wallet is not connected') || message.includes('connector not connected')) {
    return 'RELAY_DISCONNECTED';
  }
  if (message.includes('relay request timeout') || message.includes('timed out')) {
    return 'RELAY_TIMEOUT';
  }
  if (message.includes('wallet session is syncing') || message.includes('connector already connected')) {
    return 'SESSION_SYNCING';
  }
  if (message.includes('account') && message.includes('mismatch')) {
    return 'ACCOUNT_MISMATCH';
  }
  if (message.includes('rejected')) {
    return 'USER_REJECTED';
  }
  if (message.includes('insufficient') || message.includes('allowance')) {
    return 'TOKEN_PRECHECK_FAILED';
  }
  return 'UNMAPPED';
};

const POOL_FUNDS_ABI = [
  {
    type: 'function',
    name: 'stablecoin',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'contributionAmount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const resolveContributeFallbackGas = (): bigint => {
  const raw = String(import.meta.env.VITE_CHAINORA_CONTRIBUTE_FALLBACK_GAS ?? '').trim();
  if (/^[0-9]+$/.test(raw)) {
    try {
      const parsed = BigInt(raw);
      if (parsed > 0n) {
        return parsed;
      }
    } catch {
      // noop
    }
  }

  return 450_000n;
};

const CONTRIBUTE_FALLBACK_GAS = resolveContributeFallbackGas();

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
  txHash: `0x${string}`;
};

type BuiltPoolActionIntent = PoolActionIntent & {
  calldata: `0x${string}`;
};

type UsePoolActionWalletParams = {
  token: string;
  poolAddress: Address | null;
  expectedAccountAddress?: Address | null;
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
  expectedAccountAddress = null,
  onActionSuccess,
}: UsePoolActionWalletParams): UsePoolActionWalletResult => {
  const executeAbiWrite = useRelayAbiWriteExecutor();
  const { address: connectedWalletAddressRaw } = useAccount();
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

  const attestationAccountAddress = useMemo(
    () => connectedWalletAddress ?? expectedAccountAddress ?? null,
    [connectedWalletAddress, expectedAccountAddress],
  );

  const attestationGate = useDeviceAttestationGate({
    publicClient,
    accountAddress: attestationAccountAddress,
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
      walletDebugLog.info('poolAction.skip.inflight', {
        action: intent.functionName,
        label: intent.label,
      });
      return;
    }
    walletDebugLog.info('poolAction.execute.start', {
      action: intent.functionName,
      label: intent.label,
      poolAddress: poolAddress ?? '',
      expectedAccountAddress: expectedAccountAddress ?? '',
      connectedWalletAddress: connectedWalletAddress ?? '',
    });
    if (!token.trim()) {
      walletDebugLog.warn('poolAction.execute.blocked', {
        action: intent.functionName,
        reason: 'missing_auth_token',
      });
      setStatus('error');
      setErrorMessage('Login expired. Please log in again.');
      setActionError('Login expired. Please log in again.');
      return;
    }
    if (!poolAddress) {
      walletDebugLog.warn('poolAction.execute.blocked', {
        action: intent.functionName,
        reason: 'missing_pool_address',
      });
      setStatus('error');
      setErrorMessage('Group details are missing. Please refresh and try again.');
      setActionError('Group details are missing. Please refresh and try again.');
      return;
    }
    if (!publicClient) {
      walletDebugLog.warn('poolAction.execute.blocked', {
        action: intent.functionName,
        reason: 'missing_public_client',
      });
      setStatus('error');
      setErrorMessage('RPC client is not ready. Please refresh and try again.');
      setActionError('RPC client is not ready. Please refresh and try again.');
      return;
    }

    if (!expectedAccountAddress) {
      walletDebugLog.warn('poolAction.execute.blocked', {
        action: intent.functionName,
        reason: 'missing_expected_account',
      });
      setStatus('error');
      setErrorMessage('Login expired. Please log in again.');
      setActionError('Login expired. Please log in again.');
      return;
    }

    inFlightRef.current = true;
    setErrorMessage('');
    setActionError('');
    setActionMessage(`Preparing ${intent.label}...`);

    try {
      const started = await attestationGate.runWithGate(async () => {
        const value = BigInt(intent.valueWei ?? '0');
        const args = (intent.args ?? []) as readonly unknown[];
        const { txHash, receipt } = await executeAbiWrite({
          actionKey: intent.actionKey,
          expectedAccountAddress,
          contractAddress: poolAddress,
          abi: POOL_ABI,
          functionName: intent.functionName,
          args,
          value,
          beforeEstimate: async ({ relayAddress }) => {
            if (intent.functionName === 'contribute') {
              setActionMessage('Checking tcUSD balance and allowance...');
              const [stablecoinRaw, contributionAmountRaw] = await Promise.all([
                publicClient.readContract({
                  address: poolAddress,
                  abi: POOL_FUNDS_ABI,
                  functionName: 'stablecoin',
                }),
                publicClient.readContract({
                  address: poolAddress,
                  abi: POOL_FUNDS_ABI,
                  functionName: 'contributionAmount',
                }),
              ]);

              const stablecoinAddress = typeof stablecoinRaw === 'string' && isAddress(stablecoinRaw)
                ? getAddress(stablecoinRaw)
                : null;
              if (!stablecoinAddress) {
                throw new Error('Pool stablecoin is not configured.');
              }

              const contributionAmount = typeof contributionAmountRaw === 'bigint'
                ? contributionAmountRaw
                : BigInt(String(contributionAmountRaw ?? '0'));
              if (contributionAmount <= 0n) {
                throw new Error('Invalid pool contribution amount.');
              }

              const [balance, allowance] = await Promise.all([
                publicClient.readContract({
                  address: stablecoinAddress,
                  abi: erc20Abi,
                  functionName: 'balanceOf',
                  args: [relayAddress],
                }),
                publicClient.readContract({
                  address: stablecoinAddress,
                  abi: erc20Abi,
                  functionName: 'allowance',
                  args: [relayAddress, poolAddress],
                }),
              ]);

              walletDebugLog.info('poolAction.contribute.precheck', {
                action: intent.functionName,
                poolAddress,
                account: relayAddress,
                stablecoinAddress,
                contributionAmount: contributionAmount.toString(),
                balance: balance.toString(),
                allowance: allowance.toString(),
              });

              if (balance < contributionAmount) {
                throw new Error('Insufficient tcUSD balance for this contribution.');
              }

              if (allowance < contributionAmount) {
                setActionMessage('Allowance is missing. Chainora Wallet will run approval before contribution in one scan.');
                return {
                  gasStrategy: {
                    mode: 'fixed',
                    gas: CONTRIBUTE_FALLBACK_GAS,
                    reason: 'allowance_missing_auto_approve_path',
                  },
                };
              }
            }

            if (intent.functionName === 'voteInvite') {
              const proposalId = args[0];
              const proposalIdValue = typeof proposalId === 'bigint' ? proposalId : BigInt(String(proposalId ?? '0'));
              const [, , , open] = await publicClient.readContract({
                address: poolAddress,
                abi: POOL_ABI,
                functionName: 'inviteProposal',
                args: [proposalIdValue],
              });
              if (!open) {
                throw new Error('Invite proposal is already closed. Please refresh and try again.');
              }
            }

            if (intent.functionName === 'voteJoinRequest') {
              const requestId = args[0];
              const requestIdValue = typeof requestId === 'bigint' ? requestId : BigInt(String(requestId ?? '0'));
              const [, , , open] = await publicClient.readContract({
                address: poolAddress,
                abi: POOL_ABI,
                functionName: 'joinRequest',
                args: [requestIdValue],
              });
              if (!open) {
                throw new Error('Join request is already closed. Please refresh and try again.');
              }
            }

            if (intent.functionName === 'voteInvite' || intent.functionName === 'voteJoinRequest') {
              const isActiveMember = await publicClient.readContract({
                address: poolAddress,
                abi: POOL_ABI,
                functionName: 'isActiveMember',
                args: [relayAddress],
              });
              if (!isActiveMember) {
                throw new Error('This wallet is not an active member for voting in this group.');
              }
            }

            return undefined;
          },
          onStageChange: stage => {
            switch (stage) {
              case 'connecting':
                setStatus('connecting');
                setActionMessage('Connecting wallet session...');
                break;
              case 'processing':
                setStatus('awaiting_wallet_approval');
                setActionMessage('Preparing transaction...');
                break;
              case 'awaiting_native':
                setStatus('awaiting_card');
                setActionMessage('Approve and sign in native app with your card.');
                break;
              case 'broadcasting':
                setStatus('broadcasting');
                setActionMessage('Broadcasting transaction and waiting for confirmation...');
                break;
              case 'confirmed':
                setStatus('confirmed');
                break;
              case 'error':
                setStatus('error');
                break;
              default:
                break;
            }
          },
        });

        walletDebugLog.info('poolAction.tx.submitted', {
          action: intent.functionName,
          txHash,
        });
        walletDebugLog.info('poolAction.tx.receipt', {
          action: intent.functionName,
          txHash,
          status: receipt.status,
          blockNumber: receipt.blockNumber?.toString() ?? '',
          gasUsed: receipt.gasUsed?.toString() ?? '',
        });
        if (receipt.status !== 'success') {
          throw new Error('Transaction reverted.');
        }

        setStatus('confirmed');
        setActionMessage(`${intent.label} completed successfully.`);
        setActionError('');
        onActionSuccessRef.current?.({
          intent,
          completionStatus: 'confirmed',
          txHash,
        });
      });

      if (!started) {
        walletDebugLog.info('poolAction.attestation.required', {
          action: intent.functionName,
        });
        setStatus('attest_required');
        setActionMessage('Device verification required before this action.');
        return;
      }
    } catch (error) {
      const message = normalizePoolActionError(error);
      walletDebugLog.error('poolAction.execute.failed', {
        action: intent.functionName,
        code: classifyPoolActionError(error),
        rawMessage: error instanceof Error ? error.message : String(error),
        normalizedMessage: message,
      });
      setStatus('error');
      setErrorMessage(message);
      setActionError(message);
    } finally {
      inFlightRef.current = false;
      walletDebugLog.info('poolAction.execute.done', {
        action: intent.functionName,
      });
    }
  }, [
    attestationGate,
    executeAbiWrite,
    connectedWalletAddress,
    poolAddress,
    publicClient,
    token,
    expectedAccountAddress,
  ]);

  const startAction = useCallback((intent: PoolActionIntent) => {
    if (!poolAddress) {
      walletDebugLog.warn('poolAction.start.blocked', {
        action: intent.functionName,
        reason: 'missing_pool_address',
      });
      setActionError('Group details are missing. Please refresh and try again.');
      return;
    }
    if (!token.trim()) {
      walletDebugLog.warn('poolAction.start.blocked', {
        action: intent.functionName,
        reason: 'missing_auth_token',
      });
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
    walletDebugLog.info('poolAction.start', {
      action: intent.functionName,
      label: intent.label,
      poolAddress,
    });
    void executeIntent(builtIntent);
  }, [executeIntent, poolAddress, token]);

  const refreshAction = useCallback(() => {
    if (!pendingIntent) {
      walletDebugLog.warn('poolAction.retry.skipped', {
        reason: 'no_pending_intent',
      });
      return;
    }
    walletDebugLog.info('poolAction.retry.start', {
      action: pendingIntent.functionName,
      status,
    });
    if (status === 'attest_required') {
      void attestationGate.confirmAttestationAndResume().catch(error => {
        const message = normalizePoolActionError(error);
        walletDebugLog.error('poolAction.retry.attestation_failed', {
          action: pendingIntent.functionName,
          code: classifyPoolActionError(error),
          rawMessage: error instanceof Error ? error.message : String(error),
          normalizedMessage: message,
        });
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
    if (status === 'error' && errorMessage.trim()) {
      return errorMessage.trim();
    }
    return mapPoolActionStatusMessage(status);
  }, [errorMessage, status]);

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
