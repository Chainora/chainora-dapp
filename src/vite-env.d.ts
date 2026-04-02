/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_CHAINORA_API_URL?: string;
	readonly VITE_CHAINORA_RPC_URL?: string;
	readonly VITE_CHAINORA_CHAIN_ID?: string;
	readonly VITE_CHAINORA_EXPLORER_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
