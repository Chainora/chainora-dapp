import { useCallback } from 'react';
import { useInterwovenKit } from '@initia/interwovenkit-react';
import { getAddress, isAddress, type Address } from 'viem';
import { useAccount, useChainId, useConnect, useDisconnect } from 'wagmi';
import { getAccount } from 'wagmi/actions';

import { wagmiConfig } from '../configs/wagmi';
import { walletRelayBrowserClient } from '../services/walletRelayBrowserClient';
import { walletDebugLog } from '../services/walletDebugLog';

const RELAY_CONNECTOR_ID = 'chainora-relay';

const resolveConnectedAccount = (raw: unknown): Address | null => {
  if (typeof raw !== 'string' || !isAddress(raw)) {
    return null;
  }
  return getAddress(raw);
};

type ConnectRelayMode = 'default' | 'login';
type ConnectRelayWalletOptions = {
  mode?: ConnectRelayMode;
  forceReconnect?: boolean;
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => {
  window.setTimeout(resolve, ms);
});

export const useConnectRelayWallet = () => {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { disconnect: interwovenDisconnect } = useInterwovenKit();

  return useCallback(async (options: ConnectRelayWalletOptions = {}): Promise<Address> => {
    const mode = options.mode ?? 'default';
    const forceReconnect = Boolean(options.forceReconnect);
    const snapshot = getAccount(wagmiConfig);
    const liveAddress = resolveConnectedAccount(snapshot.address);
    const activeAddress = liveAddress ?? resolveConnectedAccount(address);
    const relaySessionAddress = resolveConnectedAccount(walletRelayBrowserClient.getConnectedAddress());
    const relayAuthorized = walletRelayBrowserClient.isAuthorized();
    const isRelayConnected = Boolean(
      snapshot.isConnected && (snapshot.connector?.id ?? connector?.id) === RELAY_CONNECTOR_ID,
    );
    const relayMatchesActive = !relaySessionAddress
      || !activeAddress
      || relaySessionAddress.toLowerCase() === activeAddress.toLowerCase();
    const targetChainId = Number.isFinite(chainId) && chainId > 0
      ? chainId
      : Number.parseInt(import.meta.env.VITE_CHAINORA_CHAIN_ID?.trim() || '', 10);

    walletDebugLog.info('connectRelayWallet.start', {
      mode,
      forceReconnect,
      chainId: targetChainId,
      snapshotIsConnected: snapshot.isConnected,
      connectorId: snapshot.connector?.id ?? connector?.id ?? '',
      activeAddress: activeAddress ?? '',
      relaySessionAddress: relaySessionAddress ?? '',
      relayAuthorized,
      isRelayConnected,
      relayMatchesActive,
    });

    if (forceReconnect) {
      console.info('[wallet][relay] relay.connect.force_reconnect', { mode });
      walletRelayBrowserClient.disconnect();
      walletDebugLog.info('connectRelayWallet.forceReconnect.applied', {
        mode,
      });
    }

    if (!forceReconnect && isRelayConnected && activeAddress) {
      if (relayAuthorized && relayMatchesActive) {
        walletDebugLog.info('connectRelayWallet.reuse.authorized', {
          mode,
          address: activeAddress,
        });
        return activeAddress;
      }

      if (Number.isFinite(targetChainId) && targetChainId > 0) {
        try {
          console.info('[wallet][relay] relay.connect.start', {
            mode,
            strategy: 'resume',
            chainId: targetChainId,
          });
          const resumedAddress = await walletRelayBrowserClient.connect(targetChainId, { intent: mode });
          const normalizedResumed = resolveConnectedAccount(resumedAddress);
          if (normalizedResumed) {
            console.info('[wallet][relay] relay.connect.approved', {
              mode,
              strategy: 'resume',
              address: normalizedResumed,
            });
            walletDebugLog.info('connectRelayWallet.resume.success', {
              mode,
              address: normalizedResumed,
            });
            return normalizedResumed;
          }
        } catch (resumeError) {
          console.warn('[wallet][relay] session resume failed', resumeError);
          walletDebugLog.warn('connectRelayWallet.resume.failed', {
            mode,
            message: resumeError instanceof Error ? resumeError.message : String(resumeError),
          });
          throw (resumeError instanceof Error
            ? resumeError
            : new Error('Could not resume wallet relay session.'));
        }
      }
    }

    if (snapshot.isConnected || isConnected) {
      try {
        interwovenDisconnect();
      } catch (disconnectError) {
        console.warn('[wallet][relay] interwoven disconnect failed', disconnectError);
        walletDebugLog.warn('connectRelayWallet.disconnect.interwoven_failed', {
          mode,
          message: disconnectError instanceof Error ? disconnectError.message : String(disconnectError),
        });
      }

      try {
        await disconnectAsync();
      } catch (disconnectError) {
        console.warn('[wallet][relay] wagmi disconnect failed', disconnectError);
        walletDebugLog.warn('connectRelayWallet.disconnect.wagmi_failed', {
          mode,
          message: disconnectError instanceof Error ? disconnectError.message : String(disconnectError),
        });
      }

      for (let attempt = 0; attempt < 12; attempt += 1) {
        const afterDisconnect = getAccount(wagmiConfig);
        if (!afterDisconnect.isConnected) {
          break;
        }
        await sleep(80);
      }
    }

    const relayConnector = connectors.find(item => item.id === RELAY_CONNECTOR_ID);
    if (!relayConnector) {
      throw new Error('Chainora relay connector is not available.');
    }

    walletRelayBrowserClient.setNextConnectIntent(mode);
    console.info('[wallet][relay] relay.connect.start', {
      mode,
      strategy: 'new-session',
      chainId,
    });
    let result;
    try {
      result = await connectAsync({ connector: relayConnector });
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message.trim() : String(connectError ?? '').trim();
      walletDebugLog.warn('connectRelayWallet.connectAsync.failed', {
        mode,
        message,
      });
      if (message.toLowerCase().includes('connector already connected')) {
        const latest = getAccount(wagmiConfig);
        const currentAddress = resolveConnectedAccount(latest.address)
          ?? resolveConnectedAccount(address)
          ?? resolveConnectedAccount(walletRelayBrowserClient.getConnectedAddress());
        if (currentAddress) {
          if (Number.isFinite(targetChainId) && targetChainId > 0) {
            try {
              await walletRelayBrowserClient.connect(targetChainId, { intent: mode });
            } catch (resumeError) {
              console.warn('[wallet][relay] relay.connect.resume_after_already_connected.failed', resumeError);
            }
          }
          console.info('[wallet][relay] relay.connect.already_connected', {
            mode,
            address: currentAddress,
          });
          walletDebugLog.info('connectRelayWallet.alreadyConnected.reused', {
            mode,
            address: currentAddress,
          });
          return currentAddress;
        }
      }
      walletDebugLog.error('connectRelayWallet.connectAsync.error', {
        mode,
        message: message || 'unknown connectAsync error',
      });
      throw connectError;
    }
    const firstAccount = result.accounts[0] as unknown;
    const accountAddress = typeof firstAccount === 'string'
      ? resolveConnectedAccount(firstAccount)
      : (
        firstAccount
        && typeof firstAccount === 'object'
        && 'address' in firstAccount
        ? resolveConnectedAccount((firstAccount as { address?: unknown }).address)
        : null
      );

    if (!accountAddress) {
      throw new Error('Wallet connected but no valid relay account was returned.');
    }

    console.info('[wallet][relay] relay.connect.approved', {
      mode,
      strategy: 'new-session',
      address: accountAddress,
    });
    walletDebugLog.info('connectRelayWallet.success', {
      mode,
      strategy: 'new-session',
      address: accountAddress,
    });
    return accountAddress;
  }, [
    address,
    connectAsync,
    connector?.id,
    connectors,
    disconnectAsync,
    interwovenDisconnect,
    isConnected,
    chainId,
  ]);
};
