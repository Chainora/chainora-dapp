import {
  ChainNotConfiguredError,
  createConnector,
  type CreateConnectorFn,
} from 'wagmi';
import {
  fromHex,
  getAddress,
  numberToHex,
  SwitchChainError,
  type Address,
  type Chain,
  type EIP1193Provider,
  type EIP1193RequestFn,
} from 'viem';

import { walletRelayBrowserClient } from '../services/walletRelayBrowserClient';
import { walletDebugLog } from '../services/walletDebugLog';

type RelayProvider = EIP1193Provider;

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const resolveOrigin = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.origin;
};

const rpcRequest = async (rpcUrl: string, method: string, params: unknown[] | undefined): Promise<unknown> => {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: Date.now(),
      jsonrpc: '2.0',
      method,
      params: params ?? [],
    }),
  });

  const payload = (await response.json()) as {
    result?: unknown;
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(`RPC ${method} failed with status ${response.status}.`);
  }

  if (payload.error) {
    const message = payload.error.message?.trim() || `RPC ${method} failed.`;
    throw new Error(message);
  }

  return payload.result;
};

const parsePersonalSignParams = (params: unknown[] | undefined): { address: string; message: string } => {
  const first = typeof params?.[0] === 'string' ? String(params[0]) : '';
  const second = typeof params?.[1] === 'string' ? String(params[1]) : '';

  if (ADDRESS_REGEX.test(first)) {
    return {
      address: first,
      message: second,
    };
  }

  return {
    address: second,
    message: first,
  };
};

const normalizeQuantityHex = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'bigint') {
    return numberToHex(value);
  }

  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return numberToHex(BigInt(Math.trunc(value)));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
      return trimmed.toLowerCase();
    }
    if (/^[0-9]+$/.test(trimmed)) {
      return numberToHex(BigInt(trimmed));
    }
  }

  return undefined;
};

const normalizeRelayTransaction = (
  transaction: Record<string, unknown>,
  fallbackFrom: string,
  chainId: number,
): Record<string, unknown> => {
  return {
    from: typeof transaction.from === 'string' ? transaction.from : fallbackFrom,
    to: typeof transaction.to === 'string' ? transaction.to : '',
    value: normalizeQuantityHex(transaction.value) ?? '0x0',
    data: typeof transaction.data === 'string' ? transaction.data : '0x',
    gas: normalizeQuantityHex(transaction.gas),
    gasPrice: normalizeQuantityHex(transaction.gasPrice),
    nonce: normalizeQuantityHex(transaction.nonce),
    chainId: normalizeQuantityHex(transaction.chainId) ?? numberToHex(BigInt(chainId)),
  };
};

const createRelayProvider = (chain: Chain): RelayProvider => {
  const request: EIP1193RequestFn = async ({ method, params }) => {
    const session = walletRelayBrowserClient.getSession();
    const connectedAddress = walletRelayBrowserClient.getConnectedAddress();
    const normalizedAddress = connectedAddress ? getAddress(connectedAddress) : '';
    walletDebugLog.info('eip1193.request.start', {
      method,
      chainId: chain.id,
      sessionId: session?.sessionId ?? '',
      sessionAddress: session?.address ?? '',
      connectedAddress: normalizedAddress,
    });

    try {
      switch (method) {
        case 'eth_chainId':
          walletDebugLog.info('eip1193.request.success', {
            method,
            result: numberToHex(chain.id),
          });
          return numberToHex(chain.id) as never;
        case 'eth_accounts':
          walletDebugLog.info('eip1193.request.success', {
            method,
            result: normalizedAddress ? [normalizedAddress] : [],
          });
          return (normalizedAddress ? [normalizedAddress] : []) as never;
        case 'eth_requestAccounts': {
          const approvedAddress = await walletRelayBrowserClient.connect(chain.id);
          walletDebugLog.info('eip1193.request.success', {
            method,
            approvedAddress,
          });
          return [getAddress(approvedAddress)] as never;
        }
        case 'wallet_switchEthereumChain': {
          const chainIdHex = (params as [{ chainId: string }] | undefined)?.[0]?.chainId;
          if (typeof chainIdHex !== 'string') {
            throw new Error('wallet_switchEthereumChain requires chainId.');
          }
          const requestedChainId = fromHex(chainIdHex as `0x${string}`, 'number');
          if (requestedChainId !== chain.id) {
            throw new SwitchChainError(new ChainNotConfiguredError());
          }
          walletDebugLog.info('eip1193.request.success', {
            method,
            requestedChainId,
          });
          return null as never;
        }
        case 'personal_sign': {
          const { address, message } = parsePersonalSignParams(params as unknown[] | undefined);
          if (!ADDRESS_REGEX.test(address)) {
            throw new Error('personal_sign requires wallet address.');
          }
          const chainId = session?.chainId ?? chain.id;
          walletDebugLog.info('eip1193.personal_sign.dispatch', {
            chainId,
            address,
            messagePreview: message.slice(0, 80),
          });
          return walletRelayBrowserClient.requestSignMessage({
            chainId,
            origin: resolveOrigin(),
            address,
            message,
          }) as never;
        }
        case 'eth_sendTransaction': {
          const transaction = ((params as unknown[] | undefined)?.[0] ?? {}) as Record<string, unknown>;
          const from = typeof transaction.from === 'string' ? transaction.from : normalizedAddress;
          if (!from || !ADDRESS_REGEX.test(from)) {
            throw new Error('eth_sendTransaction requires from address.');
          }
          const chainId = session?.chainId ?? chain.id;
          walletDebugLog.info('eip1193.eth_sendTransaction.dispatch', {
            chainId,
            address: from,
            to: typeof transaction.to === 'string' ? transaction.to : '',
            value: String(transaction.value ?? ''),
            gas: String(transaction.gas ?? ''),
            nonce: String(transaction.nonce ?? ''),
            dataPreview: typeof transaction.data === 'string' ? transaction.data.slice(0, 18) : '',
          });
          return walletRelayBrowserClient.requestSendTransaction({
            chainId,
            origin: resolveOrigin(),
            address: from,
            transaction: normalizeRelayTransaction(transaction, from, chainId),
          }) as never;
        }
        default:
          walletDebugLog.info('eip1193.rpc.forward', {
            method,
            chainId: chain.id,
          });
          return rpcRequest(chain.rpcUrls.default.http[0], method, (params as unknown[] | undefined) ?? []) as never;
      }
    } catch (error) {
      walletDebugLog.error('eip1193.request.failed', {
        method,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  return {
    request,
    on: () => undefined,
    removeListener: () => undefined,
  } as RelayProvider;
};

chainoraRelayConnector.type = 'chainora-relay' as const;

export function chainoraRelayConnector(): CreateConnectorFn {
  return createConnector<RelayProvider>((config) => {
    let provider: RelayProvider | null = null;

    const resolveChain = (chainId?: number): Chain => {
      const selected = typeof chainId === 'number'
        ? config.chains.find(chain => chain.id === chainId)
        : config.chains[0];
      if (!selected) {
        throw new SwitchChainError(new ChainNotConfiguredError());
      }
      return selected;
    };

    return {
      id: 'chainora-relay',
      name: 'Chainora Mobile (QR Relay)',
      type: chainoraRelayConnector.type,
      async connect<withCapabilities extends boolean = false>(
        parameters: {
          chainId?: number;
          isReconnecting?: boolean;
          withCapabilities?: withCapabilities | boolean;
        } = {},
      ) {
        const { chainId, withCapabilities } = parameters;
        const chain = resolveChain(chainId);
        const approvedAddress = await walletRelayBrowserClient.connect(chain.id);
        const account = getAddress(approvedAddress) as Address;

        return {
          accounts: (withCapabilities
            ? [{ address: account, capabilities: {} }]
            : [account]) as never,
          chainId: chain.id,
        };
      },
      async disconnect() {
        walletRelayBrowserClient.disconnect();
      },
      async getAccounts() {
        const connectedAddress = walletRelayBrowserClient.getConnectedAddress();
        if (!connectedAddress) {
          return [];
        }
        return [getAddress(connectedAddress)];
      },
      async getChainId() {
        const session = walletRelayBrowserClient.getSession();
        if (session) {
          return session.chainId;
        }
        return config.chains[0].id;
      },
      async getProvider({ chainId } = {}) {
        const chain = resolveChain(chainId);
        provider = createRelayProvider(chain);
        return provider;
      },
      async isAuthorized() {
        return walletRelayBrowserClient.isAuthorized();
      },
      async switchChain({ chainId }) {
        const chain = resolveChain(chainId);
        const session = walletRelayBrowserClient.getSession();
        if (session && session.chainId !== chain.id) {
          throw new SwitchChainError(new Error('Current relay session is bound to a different chain.'));
        }
        return chain;
      },
      onAccountsChanged(accounts) {
        if (accounts.length === 0) {
          this.onDisconnect();
          return;
        }

        config.emitter.emit('change', {
          accounts: accounts
            .filter(account => ADDRESS_REGEX.test(account))
            .map(account => getAddress(account)),
        });
      },
      onChainChanged(chainId) {
        const normalized = Number(chainId);
        if (Number.isFinite(normalized)) {
          config.emitter.emit('change', { chainId: normalized });
        }
      },
      async onDisconnect() {
        walletRelayBrowserClient.disconnect();
        config.emitter.emit('disconnect');
      },
    };
  });
}
