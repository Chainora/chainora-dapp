import { getAddress, isAddress } from 'viem';

import { fromInitAddress } from '../../components/UserDetail';

export const CREATE_POOL_QR_FEATURE = 'chainora-native-wallet:create-pool';

export const mapCreatePoolStatusMessage = (status: string): string => {
  switch (status) {
    case 'awaiting_card_scan':
      return 'QR scanned. Tap your card to continue.';
    case 'create_pool_precheck':
      return 'Checking group details...';
    case 'create_pool_precheck_timeout_continue':
      return 'Network is busy. Continuing...';
    case 'create_pool_device_verify_challenge':
    case 'create_pool_device_verify_backend':
    case 'create_pool_device_attestation_request':
      return 'Verifying your card...';
    case 'create_pool_device_verification_submit':
    case 'create_pool_device_verification_receipt':
      return 'Finishing card verification...';
    case 'create_pool_signing_tx':
      return 'Signing your create-group request...';
    case 'create_pool_waiting_receipt':
      return 'Almost done. Confirming your group...';
    case 'create_pool_syncing_backend':
      return 'Saving your group...';
    case 'create_pool_success':
      return 'Group created successfully.';
    case 'create_pool_failed':
      return 'Could not create group. Refresh QR and try again.';
    case 'connecting':
      return 'Connecting...';
    case 'connected':
    case 'qr_ready':
      return 'QR ready. Scan with Chainora app.';
    case 'message_error':
      return 'Connection interrupted. Please refresh QR.';
    case 'error':
      return 'Connection lost. Please refresh QR.';
    case 'closed':
      return 'Window closed.';
    default:
      return 'Scan QR to create your group.';
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
