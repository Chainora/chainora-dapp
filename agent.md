# Chainora Dapp Agent Guide

## Scope
React + Vite + TypeScript dapp in this folder.

## Prompt Update Rule
After every prompt that changes files in this folder, update this `agent.md` with:
- changed areas
- verification commands used
- known caveats

## Agent and Skill
- Custom agent: `.github/agents/chainora-dapp.agent.md`
- Skill: `.github/skills/chainora-dapp/SKILL.md`
- Reuse-first rule: prefer small reusable components before writing page-level markup.

## Fast Navigation
- `src/routes/`: route definitions
- `src/pages/`: page-level views
- `src/components/`: reusable UI
- `src/configs/`: app/web3 setup
- `src/contract/`: contract constants and wrappers
- `src/hooks/`: custom hooks

## Verify
- `yarn -s tsc --noEmit`
- `yarn build`

## Latest Update (2026-04-14)
- Changed areas:
	- Renamed landing page file from `pages/index.tsx` to `pages/landing.tsx` and updated root route import.
	- Removed dashboard/profile route wrapper components so route files stay minimal and page files handle auth redirects.
	- Updated root header to show only brand (logo + ICRosca) and auth controls (no dashboard/profile menu links).
	- Updated logged-in header controls to show identity pill, notifications icon, avatar placeholder, and hover dropdown with Edit profile.
	- Added auto-redirect behavior: unauthenticated users to landing, authenticated users from landing to dashboard.
	- Recolored landing typography and CTA treatment toward stronger blue visual identity.
	- Rebuilt dashboard page as a Figma-inspired UI scaffold with metrics cards, search/filter controls, and group card grid.
- Verification commands used:
	- `yarn router:generate && yarn tsc --noEmit`
- Known caveats:
	- Dashboard list/search/filter/create actions are currently UI-only (no backend integration yet).
	- Notification and avatar controls are visual placeholders only.

## Session 2026-04-15 createpool-hotfix
Summary: Updated createPool config for new contracts and separated contribution token (tcUSD) from gas token (tCNR).
Changed files: chainora-dapp/.env.contracts.example, chainora-dapp/.env.local, chainora-dapp/src/contract/chainoraAbis.ts, chainora-dapp/src/contract/chainoraProtocol.ts, chainora-dapp/src/pages/create-group.tsx, chainora-dapp/src/pages/dashboard.tsx, chainora-native-app/src/services/qrLoginService.ts, chainora-native-app/src/screens/QRScannerScreen.tsx
Validation: dapp yarn typecheck + yarn build passed; native npx tsc --noEmit passed
Next steps: Run mobile QR->NFC createPool on deployed contracts and confirm device adapter verification status for wallet

## Session 2026-04-15 create-pool onchain device verification
Summary: No module code changes this session.
Changed files: chainora-api/src/rest/handler/card_handler.go, chainora-api/src/rest/routers/routes.go, chainora-api/src/rest/bootstrap/bootstrap.go, chainora-api/src/rest/config/config.go, chainora-api/src/rest/config/config.yaml, chainora-api/src/rest/config/config.yaml.example, chainora-api/src/rest/properties/properties.go, chainora-native-app/src/services/qrLoginService.ts
Validation: go test ./... (rest) passed; npx tsc --noEmit (native) passed; yarn typecheck (dapp) passed
Next steps: Set CARD_DEVICE_VERIFIER_PRIVATE_KEY and trust its address on ChainoraDeviceAdapter, then run QR+NFC createPool E2E

## Session 2026-04-15 create-pool session lock + status sync
Summary: Create-group QR flow now uses backend auth session + websocket status sync, locks QR after first scan, and supports refresh/retry. Updated factory and pool implementation addresses.
Changed files: chainora-dapp/src/pages/create-group.tsx, chainora-dapp/.env.contracts.example, chainora-dapp/.env.local, chainora-native-app/src/services/qrLoginService.ts, chainora-native-app/src/screens/QRScannerScreen.tsx
Validation: native npx tsc --noEmit passed; dapp yarn typecheck passed
Next steps: Restart dapp/native/api, verify one-scan create-pool UX and confirm registry points to new factory dependencies

## Session 2026-04-15 precheck latency analysis
Summary: No module code changes. Confirmed create-group page only consumes websocket session status and does not execute on-chain precheck directly.
Changed files: none
Validation: Code inspection only (no build/test run).
Next steps: Optionally tune viem transport retry/timeout and trim duplicate on-chain diagnostics to reduce precheck wait time.

## Session 2026-04-15 create-pool precheck latency optimization
Summary: No module code changes. Dapp behavior remains session-status consumer for create-pool progress.
Changed files: chainora-native-app/src/services/web3Client.ts; chainora-native-app/src/services/qrLoginService.ts; chainora-native-app/src/services/activitySyncService.ts; chainora-native-app/src/screens/QRScannerScreen.tsx
Validation: cd chainora-native-app && npx tsc --noEmit (pass)
Next steps: Measure median create_pool_precheck duration from scan to signing stage; if still high, add dedicated fast RPC endpoint for precheck-only reads.

## Session 2026-04-15 login-session device verification warmup
Summary: Auth QR payload now includes optional protocol factory address and auto-device-verification intent for native login flow. Login modal now locks QR after first scan across login_device_* in-progress statuses and displays warmup status text.
Changed files: chainora-dapp/src/services/authQrFlow.ts; chainora-dapp/src/components/auth/HeaderLoginButton.tsx; chainora-native-app/src/services/qrLoginService.ts; chainora-native-app/src/screens/QRScannerScreen.tsx
Validation: cd chainora-native-app && npx tsc --noEmit (pass); cd chainora-dapp && yarn typecheck (pass)
Next steps: Test one full login scan on mobile with stable RPC and verify ws statuses login_device_* then check create-pool precheck bypasses device adapter verification path.

## Session 2026-04-15 precheck-timeout bypass and new pool implementation config
Summary: Updated contract env examples/local pool implementation address to 0x2d2df54e295f29255e05593373286255ab4b297f and added UI status handling for create_pool_precheck_timeout_continue so users see explicit continue-on-timeout behavior.
Changed files: chainora-native-app/src/services/qrLoginService.ts; chainora-dapp/src/pages/create-group.tsx; chainora-dapp/.env.local; chainora-dapp/.env.contracts.example
Validation: cd chainora-native-app && npx tsc --noEmit (pass); cd chainora-dapp && yarn typecheck (pass)
Next steps: Restart dapp/native to reload env and flow logic, then test create-pool after login warmup; if tx still stalls, switch Chainora RPC endpoint to a healthier node.

## Session 2026-04-15 login/create-pool smoothness speed pass
Summary: No logic change for create-pool signing payload shape. Existing websocket status handling remains compatible while native speed optimizations reduce long waiting states.
Changed files: chainora-native-app/src/screens/QRScannerScreen.tsx; chainora-native-app/src/services/qrLoginService.ts; chainora-native-app/src/services/transactionService.ts
Validation: cd chainora-native-app && npx tsc --noEmit (pass); cd chainora-dapp && yarn typecheck (pass)
Next steps: Restart Metro/native app and dapp dev server; then verify login closes promptly after auth verify and create-pool reaches signing stage even when precheck RPC is sluggish.

## Session 2026-04-15 10:45
Summary: Added dashboard localStorage group cache for fast first paint and wired groups fetch to support optional sync=true for manual refresh.
Changed files: chainora-api/src/rest/handler/group_handler.go, chainora-dapp/src/services/groupsService.ts, chainora-dapp/src/pages/dashboard.tsx
Validation: GOCACHE=/tmp/go-build-cache go test ./... (chainora-api/src/rest) passed; yarn typecheck (chainora-dapp) passed
Next steps: Configure worker username_sync.addresses from DB-derived wallet list and restart worker/api services.
