type StatusTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'info'
  | 'muted'
  | 'danger';

const toneClassName: Record<StatusTone, string> = {
  default: 'chip',
  success: 'chip chip-ok',
  warning: 'chip chip-warn',
  info: 'chip chip-signal',
  muted: 'chip',
  danger: 'chip chip-risk',
};

export function StatusBadge({
  label,
  tone = 'default',
}: {
  label: string;
  tone?: StatusTone;
}) {
  return <span className={toneClassName[tone]}>{label}</span>;
}
