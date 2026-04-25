import { useCallback } from 'react';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { type Address, type WalletClient } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';

import { useConnectRelayWallet } from './useConnectRelayWallet';
import { resolveRelayWalletClient } from '../services/relayWalletClient';
import { estimateBufferedContractGas } from '../services/txGas';
import { walletDebugLog } from '../services/walletDebugLog';
import { writeContractWithFallback } from '../services/walletWriteContract';

const sleep = (ms: number): Promise<void> => new Promise(resolve => {
  window.setTimeout(resolve, ms);
});

const isRetryableWalletWriteError = (raw: unknown): boolean => {
  const message = raw instanceof Error ? raw.message.trim().toLowerCase() : String(raw ?? '').trim().toLowerCase();
  if (!message) {
    return false;
  }

  return message.includes('wallet relay account is not connected')
    || message.includes('mobile peer is not connected')
    || message.includes('relay websocket is not connected')
    || message.includes('relay session disconnected')
    || message.includes('wallet client is unavailable')
    || message.includes('wallet client not connected')
    || message.includes('wallet is not connected')
    || message.includes('connector not connected')
    || message.includes('account not found')
    || message.includes('session account mismatch')
    || message.includes('switch active account before approving this request')
    || message.includes('wallet session is syncing');
};

export type AbiWriteStage =
  | 'connecting'
  | 'processing'
  | 'awaiting_native'
  | 'broadcasting'
  | 'confirmed'
  | 'error';

type GasStrategy = {
  mode: 'estimate' | 'fixed';
  gas?: bigint;
  reason?: string;
};

type BeforeEstimateResult = {
  gasStrategy?: GasStrategy;
};

export type ExecuteAbiWriteParams = {
  actionKey: string;
  expectedAccountAddress: Address;
  contractAddress: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  beforeEstimate?: (context: { relayAddress: Address }) => Promise<BeforeEstimateResult | void>;
  onStageChange?: (stage: AbiWriteStage) => void;
};

type ExecuteAbiWriteResult = {
  txHash: `0x${string}`;
  relayAddress: Address;
  receipt: Awaited<ReturnType<NonNullable<ReturnType<typeof usePublicClient>>['waitForTransactionReceipt']>>;
};

export const useRelayAbiWriteExecutor = () => {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const connectRelayWallet = useConnectRelayWallet();
  const { waitForTxConfirmation } = useInterwovenKit();

  return useCallback(async (params: ExecuteAbiWriteParams): Promise<ExecuteAbiWriteResult> => {
    if (!publicClient) {
      throw new Error('RPC client is not ready. Please refresh and try again.');
    }

    const emitStage = (stage: AbiWriteStage) => {
      params.onStageChange?.(stage);
      walletDebugLog.info('abiWrite.stage', {
        action: params.actionKey,
        functionName: params.functionName,
        stage,
      });
    };

    try {
      emitStage('connecting');
      let relayAddress = await connectRelayWallet({ mode: 'default' });
      if (relayAddress.toLowerCase() !== params.expectedAccountAddress.toLowerCase()) {
        throw new Error('Connected wallet does not match authenticated account.');
      }

      let activeWalletClient: WalletClient | null = null;
      try {
        activeWalletClient = await resolveRelayWalletClient(relayAddress, walletClient);
      } catch (initialResolveError) {
        walletDebugLog.warn('abiWrite.walletClient.resolve.retry_initial', {
          action: params.actionKey,
          message: initialResolveError instanceof Error ? initialResolveError.message : String(initialResolveError),
        });
        await sleep(450);
        try {
          activeWalletClient = await resolveRelayWalletClient(relayAddress, walletClient);
        } catch (resolveRetryError) {
          try {
            relayAddress = await connectRelayWallet({
              mode: 'default',
              forceReconnect: true,
            });
            if (relayAddress.toLowerCase() !== params.expectedAccountAddress.toLowerCase()) {
              throw new Error('Connected wallet does not match authenticated account.');
            }
            activeWalletClient = await resolveRelayWalletClient(relayAddress, walletClient);
          } catch (resolveAfterReconnectError) {
            walletDebugLog.warn('abiWrite.walletClient.resolve.fallback_to_wagmi', {
              action: params.actionKey,
              message: resolveAfterReconnectError instanceof Error
                ? resolveAfterReconnectError.message
                : String(resolveAfterReconnectError || resolveRetryError),
            });
            activeWalletClient = null;
          }
        }
      }

      emitStage('processing');
      const preEstimate = await params.beforeEstimate?.({ relayAddress });
      const strategy = preEstimate?.gasStrategy;

      const value = params.value ?? 0n;
      const gas = strategy?.mode === 'fixed'
        ? strategy.gas
        : await estimateBufferedContractGas(publicClient, {
          account: relayAddress,
          address: params.contractAddress,
          abi: params.abi,
          functionName: params.functionName,
          args: params.args,
          value,
        });

      if (!gas || gas <= 0n) {
        throw new Error('Invalid gas configuration for transaction.');
      }

      walletDebugLog.info('abiWrite.gas', {
        action: params.actionKey,
        functionName: params.functionName,
        gas: gas.toString(),
        gasMode: strategy?.mode ?? 'estimate',
        reason: strategy?.reason ?? '',
      });

      emitStage('awaiting_native');

      const writeOnce = async (
        accountAddress: Address,
        client: WalletClient | null,
      ): Promise<`0x${string}`> => writeContractWithFallback({
        account: accountAddress,
        address: params.contractAddress,
        abi: params.abi,
        functionName: params.functionName,
        chain: client?.chain ?? null,
        gas,
        args: (params.args ?? []) as never,
        value,
      }, client);

      let txHash: `0x${string}` | null = null;
      try {
        txHash = await writeOnce(relayAddress, activeWalletClient);
      } catch (firstWriteError) {
        if (!isRetryableWalletWriteError(firstWriteError)) {
          throw firstWriteError;
        }

        let softRetryError: unknown = firstWriteError;
        let recoveredWithoutRepair = false;
        const softRetryDeadline = Date.now() + 10_000;
        while (Date.now() < softRetryDeadline) {
          await sleep(600);

          try {
            activeWalletClient = await resolveRelayWalletClient(relayAddress, walletClient);
          } catch {
            activeWalletClient = null;
          }

          try {
            txHash = await writeOnce(relayAddress, activeWalletClient);
            recoveredWithoutRepair = true;
            break;
          } catch (softRetryWriteError) {
            if (!isRetryableWalletWriteError(softRetryWriteError)) {
              throw softRetryWriteError;
            }
            softRetryError = softRetryWriteError;
          }
        }

        if (!recoveredWithoutRepair) {
          walletDebugLog.warn('abiWrite.repair.required', {
            action: params.actionKey,
            message: softRetryError instanceof Error ? softRetryError.message : String(softRetryError),
          });

          const reconnectedAddress = await connectRelayWallet({
            mode: 'default',
            forceReconnect: true,
          });
          if (reconnectedAddress.toLowerCase() !== params.expectedAccountAddress.toLowerCase()) {
            throw new Error('Connected wallet does not match authenticated account.');
          }
          relayAddress = reconnectedAddress;

          try {
            activeWalletClient = await resolveRelayWalletClient(relayAddress, walletClient);
          } catch (resolveAfterReconnectError) {
            walletDebugLog.warn('abiWrite.walletClient.resolve_after_reconnect.fallback_to_wagmi', {
              action: params.actionKey,
              message: resolveAfterReconnectError instanceof Error ? resolveAfterReconnectError.message : String(resolveAfterReconnectError),
            });
            activeWalletClient = null;
          }

          txHash = await writeOnce(relayAddress, activeWalletClient);
        }
      }

      if (!txHash) {
        throw new Error('Transaction submission failed.');
      }

      emitStage('broadcasting');
      try {
        await waitForTxConfirmation({
          txHash,
          chainId: import.meta.env.VITE_INTERWOVEN_DEFAULT_CHAIN_ID?.trim() || undefined,
          timeoutMs: 90_000,
          intervalMs: 2_000,
        });
      } catch (interwovenError) {
        walletDebugLog.warn('abiWrite.interwoven.wait_fallback', {
          action: params.actionKey,
          message: interwovenError instanceof Error ? interwovenError.message : String(interwovenError),
        });
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== 'success') {
        throw new Error('Transaction reverted.');
      }

      emitStage('confirmed');
      return {
        txHash,
        relayAddress,
        receipt,
      };
    } catch (error) {
      emitStage('error');
      throw error;
    }
  }, [
    connectRelayWallet,
    publicClient,
    waitForTxConfirmation,
    walletClient,
  ]);
};
