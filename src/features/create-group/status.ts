import { getAddress, isAddress } from 'viem';

import { fromInitAddress } from '../../components/UserDetail';

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
