/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_CHAINORA_API_URL?: string;
	readonly VITE_CHAINORA_RPC_URL?: string;
	readonly VITE_CHAINORA_CHAIN_ID?: string;
	readonly VITE_CHAINORA_EXPLORER_URL?: string;
	readonly VITE_CHAINORA_ROLLUP_CHAIN_ID?: string;
	readonly VITE_CHAINORA_INTERWOVEN_DEFAULT_CHAIN_ID?: string;
	readonly VITE_CHAINORA_ROLLUP_BRIDGE_ENABLED?: string;
	readonly VITE_CHAINORA_BRIDGE_SRC_CHAIN_ID?: string;
	readonly VITE_CHAINORA_BRIDGE_SRC_DENOM?: string;
	readonly VITE_CHAINORA_BRIDGE_DST_DENOM?: string;
	readonly VITE_INITIA_ROUTER_API_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
