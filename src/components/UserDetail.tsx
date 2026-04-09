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

export function UserDetail({ username, address }: UserDetailProps) {
  const safeUsername = username?.trim() ?? '';
  const label = safeUsername ? `${safeUsername}.init` : shortenAddress(address ?? '');

  return (
    <div className="inline-flex items-center rounded-full border border-black bg-white px-3 py-1">
      <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-black">{label || 'Unknown User'}</span>
    </div>
  );
}
