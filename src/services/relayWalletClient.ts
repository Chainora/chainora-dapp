import { getAddress, isAddress, type Address, type WalletClient } from 'viem';
import { getConnectorClient } from 'wagmi/actions';

import { wagmiConfig } from '../configs/wagmi';

const CONNECTOR_CLIENT_RETRY_ATTEMPTS = 15;
const CONNECTOR_CLIENT_RETRY_DELAY_MS = 300;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });

const resolveAccountFromWalletClient = (client: WalletClient | null | undefined): Address | null => {
  if (!client) {
    return null;
  }

  const raw = client.account as unknown;
  if (typeof raw === 'string' && isAddress(raw)) {
    return getAddress(raw);
  }

  if (raw && typeof raw === 'object' && 'address' in raw) {
    const address = (raw as { address?: unknown }).address;
    if (typeof address === 'string' && isAddress(address)) {
      return getAddress(address);
    }
  }

  return null;
};

const hasWriteContract = (
  client: WalletClient | null | undefined,
): client is WalletClient & { writeContract: (params: unknown) => Promise<`0x${string}`> } => {
  return Boolean(client && typeof (client as { writeContract?: unknown }).writeContract === 'function');
};

const matchesRelayAddress = (client: WalletClient | null | undefined, relayAddress: Address): boolean => {
  const walletAddress = resolveAccountFromWalletClient(client);
  return Boolean(walletAddress && walletAddress.toLowerCase() === relayAddress.toLowerCase());
};

export const resolveRelayWalletClient = async (
  relayAddress: Address,
  fallbackWalletClient?: WalletClient | null,
): Promise<WalletClient> => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < CONNECTOR_CLIENT_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const connectorClient = await getConnectorClient(wagmiConfig, {
        account: relayAddress,
      }) as unknown as WalletClient;

      if (matchesRelayAddress(connectorClient, relayAddress)) {
        if (!hasWriteContract(connectorClient)) {
          console.info('[wallet][relay] connector client has no writeContract, will use wagmi write fallback.');
        }
        return connectorClient;
      }
    } catch (error) {
      lastError = error;
    }

    if (matchesRelayAddress(fallbackWalletClient, relayAddress)) {
      if (!hasWriteContract(fallbackWalletClient)) {
        console.info('[wallet][relay] fallback wallet client has no writeContract, will use wagmi write fallback.');
      }
      return fallbackWalletClient as WalletClient;
    }

    if (attempt < CONNECTOR_CLIENT_RETRY_ATTEMPTS - 1) {
      await sleep(CONNECTOR_CLIENT_RETRY_DELAY_MS);
    }
  }

  if (lastError) {
    console.warn('[wallet][relay] resolve wallet client failed', lastError);
  }
  throw new Error('Wallet session is syncing. Please retry this action.');
};
