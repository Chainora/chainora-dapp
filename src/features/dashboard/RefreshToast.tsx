type RefreshToastProps = {
  visible: boolean;
};

const containerStyle = {
  position: 'fixed' as const,
  top: 24,
  right: 24,
  zIndex: 60,
  background: 'var(--ink-2)',
  border: '1px solid var(--ink-5)',
  borderRadius: 'var(--r-md)',
  boxShadow: 'var(--shadow-md)',
  padding: '8px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
  pointerEvents: 'none' as const,
  transition: 'opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)',
};

const spinnerStyle = {
  width: 14,
  height: 14,
  borderRadius: '50%',
  border: '2px solid rgba(40,151,255,0.2)',
  borderTopColor: 'var(--signal-300)',
  animation: 'chainora-spin 0.8s linear infinite',
};

export function RefreshToast({ visible }: RefreshToastProps) {
  return (
    <>
      <style>{`@keyframes chainora-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        role="status"
        aria-live="polite"
        aria-hidden={!visible}
        style={{
          ...containerStyle,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        }}
      >
        <span style={spinnerStyle} aria-hidden="true" />
        <span className="t-tiny c-2" style={{ whiteSpace: 'nowrap' }}>
          Refreshing groups…
        </span>
      </div>
    </>
  );
}
