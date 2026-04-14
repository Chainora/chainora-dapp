import { bech32 } from '@scure/base';
import { hexToBytes, isAddress } from 'viem';

type UserDetailProps = {
  username?: string;
  address?: string;
};

const shortenAddress = (address: string): string => {
  if (!address) {
    return '';
  }

  if (address.length <= 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const toInitAddress = (address: string): string => {
  if (!isAddress(address)) {
    return '';
  }

  try {
    const bytes = hexToBytes(address);
    return bech32.encode('init', bech32.toWords(bytes));
  } catch {
    return '';
  }
};

const shortenInitAddress = (address: string): string => {
  if (!address) {
    return '';
  }

  if (address.length <= 22) {
    return address;
  }

  return `${address.slice(0, 11)}...${address.slice(-6)}`;
};

export function UserDetail({ username, address }: UserDetailProps) {
  const safeUsername = username?.trim() ?? '';
  const initAddress = toInitAddress(address ?? '');
  const label = safeUsername
    ? `${safeUsername}.init`
    : initAddress
      ? shortenInitAddress(initAddress)
      : shortenAddress(address ?? '');

  return (
    <div className="inline-flex items-center rounded-full border border-black bg-white px-3 py-1">
      <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-black">{label || 'Unknown User'}</span>
    </div>
  );
}
