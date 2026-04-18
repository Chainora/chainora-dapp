import React, { createContext, useContext, useMemo, useState } from 'react';

type InitiaWalletContextValue = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const defaultChainId = Number(import.meta.env.VITE_CHAINORA_CHAIN_ID ?? '1123337227327254');
const defaultRPC = import.meta.env.VITE_CHAINORA_RPC_URL ?? 'http://157.66.100.120:8545/';
const defaultExplorer = import.meta.env.VITE_CHAINORA_EXPLORER_URL ?? 'https://scan.testnet.initia.xyz';

const InitiaWalletContext = createContext<InitiaWalletContextValue | undefined>(undefined);

export function InitiaEVMProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);

  const connect = async () => {
    const ethereum = (window as typeof window & { ethereum?: { request: (args: { method: string }) => Promise<string[]> } })
      .ethereum;
    if (!ethereum) {
      throw new Error('Initia EVM wallet provider not found in browser');
    }

    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    setAddress(accounts[0] ?? null);
  };

  const disconnect = () => {
    setAddress(null);
  };

  const value = useMemo<InitiaWalletContextValue>(
    () => ({
      chainId: defaultChainId,
      chainName: 'Chainora Testnet',
      rpcUrl: defaultRPC,
      explorerUrl: defaultExplorer,
      address,
      connect,
      disconnect,
    }),
    [address],
  );

  return <InitiaWalletContext.Provider value={value}>{children}</InitiaWalletContext.Provider>;
}

export function useInitiaEVM() {
  const context = useContext(InitiaWalletContext);
  if (!context) {
    throw new Error('useInitiaEVM must be used within InitiaEVMProvider');
  }
  return context;
}
