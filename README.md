# Chainora DApp

Web frontend for Chainora built with Vite, React, TypeScript, TanStack Router, wagmi, and InterwovenKit.

## Local Development Baseline

- Node `20 LTS`
- Yarn `1.22.x`
- A running `chainora-api` instance
- A reachable Chainora RPC endpoint and deployed contract addresses

## Setup

### 1. Create the local env file

Copy `.env.contracts.example` to `.env.local`.

Required values for a real local run:

- `VITE_CHAINORA_API_URL`
- `VITE_CHAINORA_REGISTRY_ADDRESS`
- `VITE_CHAINORA_FACTORY_ADDRESS`
- `VITE_CHAINORA_POOL_IMPLEMENTATION_ADDRESS`
- `VITE_CHAINORA_STABLECOIN_ADDRESS`
- `VITE_CHAINORA_RPC_URL`
- `VITE_CHAINORA_EXPLORER_URL`
- `VITE_CHAINORA_CHAIN_ID`
- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_INTERWOVEN_NETWORK`
- `VITE_INTERWOVEN_DEFAULT_CHAIN_ID`

Username lookup is disabled by default in the example file because the sample Initia HTTP base used previously is not compatible with the current lookup code.

### 2. Install dependencies

```powershell
corepack yarn install
```

### 3. Start the app

```powershell
corepack yarn dev
```

The frontend defaults to `http://localhost:8080` if `VITE_CHAINORA_API_URL` is not set, but keeping the value explicit in `.env.local` is recommended.

## Validation

```powershell
corepack yarn typecheck
corepack yarn build
```

There is currently no dedicated test runner or linter configured in this repo.
