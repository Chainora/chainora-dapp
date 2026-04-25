# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev                  # Start dev server (Vite)
yarn build                # Generate routes + typecheck + Vite build
yarn preview              # Preview production build
yarn router:generate      # Regenerate routeTree.gen.ts (run after adding/removing route files)
yarn typecheck            # Type-check without emitting (runs router:generate first)
```

No test runner or linter is configured in this project.

## Architecture Overview

Chainora DApp is a Web3 React application for managing token-pooling groups on the Chainora protocol (Initia EVM rollup).

### Provider Stack (main.tsx)

Providers wrap the app outer-to-inner:
```
WagmiProvider → AppQueryProvider → InterwovenKitProvider → AuthProvider → RouterProvider
```

- `WagmiProvider` — wagmi config for EVM wallet connections
- `AppQueryProvider` — React Query client (30s stale time, no refetch on focus, 1 retry for queries, 0 for mutations); lives in `src/query/provider.tsx`
- `InterwovenKitProvider` — from `@initia/interwovenkit-react`; provides Initia wallet UX. Network selected via `VITE_INTERWOVEN_NETWORK` (mainnet/testnet), default chain via `VITE_INTERWOVEN_DEFAULT_CHAIN_ID`
- `AuthProvider` — Manages JWT tokens, wallet addresses (EVM + Initia), username, avatar; persists to `localStorage` under `chainora.auth`

### Routing

Uses **TanStack React Router** with file-based routing. Route files live in `src/routes/`.

**Important:** `src/routeTree.gen.ts` is auto-generated — never edit it manually. Run `yarn router:generate` after adding or removing route files.

Key routes:
- `/` — Landing
- `/dashboard` — Groups list (auth-protected)
- `/create-group` — Pool creation flow
- `/profile` — User profile
- `/groups/$poolId` — Group detail (plural)
- `/group/$poolId` — Group detail (singular, separate route file)

### Web3 / Contract Layer (`src/contract/`)

- `chainoraProtocol.ts` — Protocol client factory. Pass a `publicClient` (+ optional `walletClient`) to get typed read/write helpers for Registry, Factory, and Pool contracts.
- `chainoraAbis.ts` — All contract ABIs
- `chainoraAddresses.ts` — Reads contract addresses from env vars
- `constants.ts` — Additional contract constants (e.g. `HUI_CONTRACT_ADDRESS`, `HUI_ABI`) read from `VITE_HUI_CONTRACT_ADDRESS`
- `index.ts` — Barrel re-export for all contract layer exports

`src/configs/wagmi.ts` — wagmi config with `chainoraRollup` custom chain definition (chain ID, RPC, explorer all from env).

Contract reads go directly to RPC with no caching. Use `publicClient` for reads, `walletClient` for writes.

### Data Flow

1. **Auth**: Relay-based login flow using `InterwovenKit` + custom wallet relay connector. dApp creates auth session (`/v1/auth/session`), signs nonce via relay (`personal_sign`), verifies via `/v1/auth/verify`, and stores auth state per-tab in `sessionStorage`.
2. **Groups**: Fetched from backend (`VITE_CHAINORA_API_URL/groups`), cached in localStorage with TTL. React Query manages staleness.
3. **Contract state**: Queried on demand via the protocol client in `src/hooks/useChainora.ts` and `useChainoraProtocol.ts`.

### Code Organization

| Folder | Purpose |
|---|---|
| `src/routes/` | TanStack Router route definitions (file = route) |
| `src/pages/` | Page-level components with business logic and data fetching |
| `src/components/` | Reusable UI components, grouped by feature/domain |
| `src/features/` | Feature bundles (schema, types, sub-components) e.g. `create-group/` |
| `src/services/` | Backend API calls and protocol-level helpers |
| `src/hooks/` | Custom React hooks wrapping services and contract operations |
| `src/context/` | React Context providers (auth state) |
| `src/contract/` | ABIs, addresses, and typed protocol client |
| `src/configs/` | wagmi config, API base URL (env-driven) |
| `src/query/` | React Query provider and client setup (`AppQueryProvider`) |
| `src/stores/` | Global state stores |
| `src/constants/` | App-wide constants |

### Styling

TailwindCSS with a custom Chainora color theme defined in `tailwind.config.ts`:
- `chainora-bg` — Background
- `chainora-ink` — Text
- `chainora-accent` — Primary accent

### Environment Variables

Copy `.env.contracts.example` to `.env` and fill in values:

```
# Contract addresses
VITE_CHAINORA_REGISTRY_ADDRESS
VITE_CHAINORA_FACTORY_ADDRESS
VITE_CHAINORA_POOL_IMPLEMENTATION_ADDRESS
VITE_CHAINORA_STABLECOIN_ADDRESS

# Chain config
VITE_CHAINORA_CHAIN_ID
VITE_CHAINORA_RPC_URL
VITE_CHAINORA_EXPLORER_URL

# Display
VITE_CHAINORA_CURRENCY_SYMBOL
VITE_CHAINORA_CONTRIBUTION_SYMBOL
VITE_CHAINORA_TOKEN_DECIMALS

# Backend API
VITE_CHAINORA_API_URL

# Initia username lookup
VITE_INITIA_API_URL
VITE_ENABLE_INITIA_USERNAME_LOOKUP

# InterwovenKit (Initia wallet)
VITE_INTERWOVEN_NETWORK          # "mainnet" or "testnet" (default: testnet)
VITE_INTERWOVEN_DEFAULT_CHAIN_ID # override default chain for InterwovenKit

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID

# Additional contracts (optional)
VITE_HUI_CONTRACT_ADDRESS
```

## Path Aliases

`@/*` maps to `src/*` (configured in `tsconfig.json`; Vite resolves it automatically from tsconfig paths — no explicit alias entry in `vite.config.ts`). Always use this alias for imports within `src/`.
