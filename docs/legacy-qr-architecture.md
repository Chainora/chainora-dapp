# Legacy QR Architecture (Deprecated)

This document captures the old QR-first architecture that has been replaced by InterwovenKit + WalletConnect.

## Legacy Topology

- Dapp generated business QR payloads for:
  - login (`auth.login`)
  - create-group (`chainora-native-wallet:create-pool`)
  - pool-action (`chainora-native-wallet:pool-action`)
  - username relayer (`username.register`, `username.set_primary`)
- Native app scanner consumed those QR payloads and executed full business logic.
- Native app pushed progress to backend WebSocket channels.
- Dapp waited on WebSocket status updates and rendered QR lifecycle states.

## Legacy Dapp Modules

- `src/services/authQrFlow.ts` (deleted)
- `src/services/qrSessionFlow.ts` (deleted)
- `src/features/group-detail/hooks/usePoolActionQr.ts` (deleted)
- QR modal orchestration in:
  - `src/components/auth/HeaderLoginButton.tsx` (removed QR flow)
  - `src/pages/create-group.tsx` (removed QR flow)
  - `src/pages/profile.tsx` (removed QR flow)

## Legacy Native Modules (Now Legacy/Unused For Business Flow)

- `qrAuthFlowService`
- `qrCreateGroupFlowService`
- `qrPoolActionFlowService`
- `qrUsernameFlowService`

`QRScannerScreen` is now attest-only and no longer drives the above business flows.

## Current Replacement

- Wallet connection/signing in dapp is InterwovenKit-first.
- Business actions are initiated directly from dapp wallet session.
- QR remains only for `chainora-native-wallet:device-attest`.
