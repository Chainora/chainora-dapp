/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_CHAINORA_API_URL?: string;
	readonly VITE_CHAINORA_RPC_URL?: string;
	readonly VITE_CHAINORA_CHAIN_ID?: string;
	readonly VITE_CHAINORA_EXPLORER_URL?: string;
	readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
	readonly VITE_INTERWOVEN_NETWORK?: string;
	readonly VITE_INTERWOVEN_DEFAULT_CHAIN_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
