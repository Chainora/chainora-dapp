import { isAddress } from 'viem';

import { toInitAddress } from '../UserDetail';

const shorten = (value: string, left: number, right: number): string => {
  if (value.length <= left + right + 3) {
    return value;
  }
  return `${value.slice(0, left)}...${value.slice(-right)}`;
};

export const formatWalletCompact = (address: string): string => {
  if (!isAddress(address)) {
    return '';
  }

  const initAddress = toInitAddress(address);
  if (initAddress) {
    return shorten(initAddress, 10, 6);
  }

  return shorten(address, 8, 6);
};

