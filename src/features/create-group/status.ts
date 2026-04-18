import { getAddress, isAddress } from 'viem';

import { fromInitAddress } from '../../components/UserDetail';

export const CREATE_POOL_QR_FEATURE = 'chainora-native-wallet:create-pool';

export const mapCreatePoolStatusMessage = (status: string): string => {
  switch (status) {
    case 'awaiting_card_scan':
      return 'QR scanned on mobile. Please tap your NFC card to continue.';
    case 'create_pool_precheck':
      return 'Running on-chain pre-check...';
    case 'create_pool_precheck_timeout_continue':
      return 'Continuing without full pre-check (fast mode or RPC slow) and signing transaction directly...';
    case 'create_pool_device_verify_challenge':
    case 'create_pool_device_verify_backend':
    case 'create_pool_device_attestation_request':
      return 'Preparing one-time device verification...';
    case 'create_pool_device_verification_submit':
    case 'create_pool_device_verification_receipt':
      return 'Confirming one-time device verification transaction...';
    case 'create_pool_signing_tx':
      return 'Signing create-pool transaction on card...';
    case 'create_pool_waiting_receipt':
      return 'Waiting for create-pool transaction confirmation...';
    case 'create_pool_syncing_backend':
      return 'Syncing created group to backend...';
    case 'create_pool_success':
      return 'Create-pool completed. You can open dashboard now.';
    case 'create_pool_failed':
      return 'Create-pool failed on mobile. Check native app error and refresh QR to retry.';
    case 'connecting':
      return 'Connecting websocket...';
    case 'connected':
    case 'qr_ready':
      return 'QR ready. Scan with native wallet.';
    case 'message_error':
      return 'Received invalid websocket payload.';
    case 'error':
      return 'Websocket error. Refresh QR to continue.';
    case 'closed':
      return 'Session closed.';
    default:
      return 'Scan QR to start create-pool signing flow.';
  }
};

const createPoolProgressStatuses = new Set([
  'create_pool_precheck',
  'create_pool_precheck_timeout_continue',
  'create_pool_device_verify_challenge',
  'create_pool_device_verify_backend',
  'create_pool_device_attestation_request',
  'create_pool_device_verification_submit',
  'create_pool_device_verification_receipt',
  'create_pool_signing_tx',
  'create_pool_waiting_receipt',
  'create_pool_syncing_backend',
]);

export const shouldLockCreatePoolQr = (status: string): boolean => {
  if (status === 'awaiting_card_scan') {
    return true;
  }

  return createPoolProgressStatuses.has(status);
};

export const resolveCreatorEVMAddress = (rawAddress: string, rawInitAddress: string): string => {
  const addressCandidate = String(rawAddress ?? '').trim();
  if (isAddress(addressCandidate)) {
    return getAddress(addressCandidate);
  }

  const initCandidate = String(rawInitAddress ?? '').trim();
  if (!initCandidate) {
    return '';
  }

  const converted = fromInitAddress(initCandidate);
  if (!converted || !isAddress(converted)) {
    return '';
  }

  return getAddress(converted);
};
