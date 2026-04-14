import { createPublicClient, formatEther, getAddress, http } from 'viem';

const chainoraRpcUrl = import.meta.env.VITE_CHAINORA_RPC_URL?.trim() || 'http://23.94.63.207:8545';

const chainoraChainIdRaw = Number.parseInt(import.meta.env.VITE_CHAINORA_CHAIN_ID?.trim() || '', 10);
const chainoraChainId = Number.isFinite(chainoraChainIdRaw) ? chainoraChainIdRaw : 1123337227327254;

const publicClient = createPublicClient({
  chain: {
    id: chainoraChainId,
    name: 'Chainora Testnet',
    nativeCurrency: {
      name: 'tCNR',
      symbol: 'tCNR',
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [chainoraRpcUrl],
      },
      public: {
        http: [chainoraRpcUrl],
      },
    },
  },
  transport: http(chainoraRpcUrl, { timeout: 10000 }),
});

export const fetchChainoraBalance = async (address: string): Promise<{ wei: bigint; formatted: string }> => {
  const checksum = getAddress(address.trim());
  const wei = await publicClient.getBalance({
    address: checksum,
    blockTag: 'latest',
  });

  const formattedRaw = formatEther(wei);
  const [whole, fraction = ''] = formattedRaw.split('.');
  const fractionPadded = `${fraction}0000`.slice(0, 4);
  const formatted = `${whole}.${fractionPadded}`;

  return { wei, formatted };
};
