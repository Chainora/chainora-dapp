# Chainora Wallet Relay MVP (QR + WebSocket)

## Connect Flow (QR + Relay)
1. Browser dApp calls `POST /v1/wallet-relay/pair` with `chainId`.
2. Backend returns `sessionId`, `pairingToken`, `browserToken`, `pairingUri`, `expiresAt`.
3. dApp opens browser WS: `GET /v1/wallet-relay/ws/:sessionId?role=browser&token=browserToken`.
4. dApp displays QR from `pairingUri` (`chainora-wallet://pair?...`).
5. Native app scans QR, opens mobile WS: `GET /v1/wallet-relay/ws/:sessionId?role=mobile&token=pairingToken`.
6. Native app reads card address via JavaCard (PIN + NFC).
7. Browser sends `connect` request through relay.
8. Native app replies `approve` with `{ address }` and same `payloadHash`.
9. Backend binds `session.address`; dApp connector becomes connected.
10. InterwovenKit `openWallet` works on top of connected Wagmi state.

## Sign Flows
### `signMessage`
1. dApp provider receives `personal_sign`.
2. dApp sends relay request `{ type: "signMessage", requestId, payloadHash, payload: { message, address } }`.
3. Native app shows approve modal; user enters PIN + taps card.
4. Native signs EIP-191 hash via JavaCard and replies `approve` with `{ signature }`.
5. dApp receives signature and returns it to Wagmi caller.

### `signTransaction`
1. dApp provider receives `eth_sendTransaction`.
2. dApp sends relay request `{ type: "signTransaction", requestId, payloadHash, payload: { transaction, address } }`.
3. Native app approves, signs by JavaCard, broadcasts to Chainora node.
4. Native replies `approve` with `{ txHash }`.
5. dApp returns `txHash`.

## TypeScript Skeleton
```ts
// custom connector
const connector = createConnector((config) => ({
  id: 'chainora-relay',
  name: 'Chainora Mobile (QR Relay)',
  type: 'chainora-relay',
  async connect() { /* pair + ws + connect request */ },
  async disconnect() { /* close ws */ },
  async getAccounts() { /* return session address */ },
  async getProvider() { return { request: eip1193Request }; },
  async isAuthorized() { /* ws open + session */ },
}));

// browser relay client
class WalletRelayBrowserClient {
  async createPair(chainId: number) {}
  async openBrowserWS(sessionId: string, browserToken: string) {}
  async sendRequest(type: 'connect' | 'signMessage' | 'signTransaction', payload: unknown) {}
  async requestSignMessage(args: { message: string; address: string }) {}
  async requestSendTransaction(args: { transaction: Record<string, unknown>; address: string }) {}
}

// relay ws server
func Pair(ctx *gin.Context) { /* create session + tokens + pairing URI */ }
func ConnectWS(ctx *gin.Context) {
  // role=browser|mobile
  // token validation
  // one-time consume pairingToken
  // relay approve/reject/error
}

// pairing URI builder
function buildPairingURI(input: {
  sessionId: string;
  token: string;
  relay: string;
  chainId: string;
}) {
  return `chainora-wallet://pair?v=1&sessionId=${input.sessionId}&token=${input.token}&relay=${encodeURIComponent(input.relay)}&chainId=${input.chainId}`;
}

// InterwovenKit provider + custom wagmi connector
const wagmiConfig = createConfig({
  chains: [chainoraRollup],
  connectors: [chainoraRelayConnector()],
  storage: createStorage({ key: `chainora.wagmi.${tabId}`, storage: sessionStorage }),
  transports: { [chainoraRollup.id]: http(CHAINORA_RPC_URL) },
});
```

## Native App Pseudo-code
```ts
onScanQr(raw) {
  pair = parsePairUri(raw); // chainora-wallet://pair
  ws = connectRelay(pair.sessionId, 'mobile', pair.token);
  address = withVerifiedWalletSession(pin, s => s.ethAddress);
  connectReq = waitForConnectRequest(pair.sessionId);
  sendApprove(connectReq.requestId, { address }, connectReq.payloadHash);
  bindSessionAddress(pair.sessionId, address);
}

onRelayRequest(req) {
  if (req.type === 'signMessage') {
    ensureActiveAccountMatchesSession(req.sessionId);
    signature = signEip191WithCard(req.payload.message, pin);
    sendApprove(req.requestId, { signature }, req.payloadHash);
  }

  if (req.type === 'signTransaction') {
    ensureActiveAccountMatchesSession(req.sessionId);
    txHash = signAndBroadcastTx(req.payload.transaction, pin);
    sendApprove(req.requestId, { txHash }, req.payloadHash);
  }
}
```

## JSON Schemas (MVP)
```json
{
  "$id": "wallet-relay-message",
  "type": "object",
  "required": ["type"],
  "properties": {
    "type": { "enum": ["pair", "connect", "signMessage", "signTransaction", "approve", "reject", "error"] },
    "sessionId": { "type": "string" },
    "requestId": { "type": "string" },
    "timestamp": { "type": "number" },
    "chainId": { "type": "string" },
    "origin": { "type": "string" },
    "address": { "type": "string" },
    "payloadHash": { "type": "string" },
    "payload": { "type": "object" },
    "error": { "type": "string" }
  }
}
```

```json
{
  "$id": "pair-request",
  "type": "object",
  "required": ["chainId"],
  "properties": { "chainId": { "type": "string" } }
}
```

```json
{
  "$id": "connect-payload",
  "type": "object",
  "required": ["chainId", "origin"],
  "properties": {
    "chainId": { "type": "string" },
    "origin": { "type": "string" }
  }
}
```

```json
{
  "$id": "signMessage-payload",
  "type": "object",
  "required": ["address", "message"],
  "properties": {
    "address": { "type": "string" },
    "message": { "type": "string" }
  }
}
```

```json
{
  "$id": "signTransaction-payload",
  "type": "object",
  "required": ["address", "transaction"],
  "properties": {
    "address": { "type": "string" },
    "transaction": { "type": "object" }
  }
}
```

```json
{
  "$id": "approve-payload",
  "type": "object",
  "properties": {
    "address": { "type": "string" },
    "signature": { "type": "string" },
    "txHash": { "type": "string" }
  }
}
```

```json
{
  "$id": "reject-payload",
  "type": "object",
  "required": ["error"],
  "properties": { "error": { "type": "string" } }
}
```

```json
{
  "$id": "error-payload",
  "type": "object",
  "required": ["error"],
  "properties": { "error": { "type": "string" } }
}
```

## Security Checklist
- `sessionId` generated with crypto-random bytes.
- `pairingToken` one-time use (consumed on mobile WS connect).
- Session TTL and request timeout enforced server-side.
- Browser WS validates `Origin`; pair binds `origin + chainId`.
- Session binds `address` after `connect.approve`.
- `payloadHash` is required and checked between request/approve.
- Pairing QR carries only short metadata (`sessionId`, `token`, `relay`, `chainId`, `v`).
- No private key/seed/APDU raw leaves mobile/JavaCard.
- Use HTTPS/WSS in production.
