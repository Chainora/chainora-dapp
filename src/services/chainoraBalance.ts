import { createPublicClient, erc20Abi, formatEther, formatUnits, getAddress, http } from 'viem';

import { CHAINORA_PROTOCOL_ADDRESSES, ZERO_ADDRESS } from '../contract/chainoraAddresses';
import { CHAINORA_RPC_URL } from '../configs/rpc';

const chainoraRpcUrl = CHAINORA_RPC_URL;

const chainoraChainIdRaw = Number.parseInt(import.meta.env.VITE_CHAINORA_CHAIN_ID?.trim() || '', 10);
const chainoraChainId = Number.isFinite(chainoraChainIdRaw) ? chainoraChainIdRaw : 1123337227327254;
const stablecoinSymbolFallback = import.meta.env.VITE_CHAINORA_CONTRIBUTION_SYMBOL?.trim() || 'tcUSD';
const stablecoinDecimalsFallbackRaw = Number.parseInt(import.meta.env.VITE_CHAINORA_TOKEN_DECIMALS?.trim() || '', 10);
const stablecoinDecimalsFallback = Number.isFinite(stablecoinDecimalsFallbackRaw) ? stablecoinDecimalsFallbackRaw : 18;

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
  transport: http(chainoraRpcUrl, { timeout: 15000, retryCount: 3, retryDelay: 400 }),
});

const toFixedBalance = (wei: bigint, decimals: number): string => {
  const formattedRaw = formatUnits(wei, decimals);
  const [whole, fraction = ''] = formattedRaw.split('.');
  const fractionPadded = `${fraction}0000`.slice(0, 4);
  return `${whole}.${fractionPadded}`;
};

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

export const fetchChainoraStablecoinBalance = async (
  address: string,
): Promise<{ wei: bigint; formatted: string; symbol: string; decimals: number; tokenAddress: string }> => {
  const tokenAddress = CHAINORA_PROTOCOL_ADDRESSES.stablecoin;
  if (tokenAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    throw new Error('Stablecoin contract address is not configured.');
  }

  const checksum = getAddress(address.trim());
  const stablecoinAddress = getAddress(tokenAddress);

  const [wei, symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address: stablecoinAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [checksum],
    }),
    publicClient.readContract({
      address: stablecoinAddress,
      abi: erc20Abi,
      functionName: 'symbol',
    }).catch(() => stablecoinSymbolFallback),
    publicClient.readContract({
      address: stablecoinAddress,
      abi: erc20Abi,
      functionName: 'decimals',
    }).catch(() => stablecoinDecimalsFallback),
  ]);

  const normalizedDecimals = Number.isFinite(Number(decimals))
    ? Number(decimals)
    : stablecoinDecimalsFallback;

  return {
    wei,
    formatted: toFixedBalance(wei, normalizedDecimals),
    symbol: String(symbol || stablecoinSymbolFallback),
    decimals: normalizedDecimals,
    tokenAddress: stablecoinAddress,
  };
};
