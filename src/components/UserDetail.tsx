import { bech32 } from '@scure/base';
import { bytesToHex, getAddress, hexToBytes, isAddress } from 'viem';

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

export const toInitAddress = (address: string): string => {
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

export const fromInitAddress = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const normalized = trimmed.toLowerCase();
    if (!normalized.startsWith('init1')) {
      return '';
    }
    const decoded = bech32.decode(normalized as `${string}1${string}`);
    if (decoded.prefix !== 'init') {
      return '';
    }
    const bytes = Uint8Array.from(bech32.fromWords(decoded.words));
    if (bytes.length !== 20) {
      return '';
    }
    const hexAddress = bytesToHex(bytes);
    if (!isAddress(hexAddress)) {
      return '';
    }
    return getAddress(hexAddress);
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
  const initTooltip = initAddress ? initAddress.toUpperCase() : '';
  const label = safeUsername
    ? `${safeUsername}.init`
    : initAddress
      ? shortenInitAddress(initAddress)
      : shortenAddress(address ?? '');

  return (
    <div className="chip chip-mono" title={initTooltip || undefined}>
      <span className="t-tiny font-semibold uppercase tracking-[0.14em]">{label || 'Unknown User'}</span>
    </div>
  );
}
