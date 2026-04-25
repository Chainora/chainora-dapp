const LOG_PREFIX = '[chainora][wallet-debug]';

const resolveEnabled = (): boolean => {
  const raw = String(import.meta.env.VITE_CHAINORA_DEBUG_WALLET_LOGS ?? '').trim().toLowerCase();
  if (raw === 'false' || raw === '0' || raw === 'off') {
    return false;
  }
  if (raw === 'true' || raw === '1' || raw === 'on') {
    return true;
  }
  return Boolean(import.meta.env.DEV);
};

const isEnabled = resolveEnabled();

type LogPayload = Record<string, unknown> | undefined;

const emit = (
  level: 'info' | 'warn' | 'error',
  event: string,
  payload?: LogPayload,
) => {
  if (!isEnabled) {
    return;
  }

  const base = `${LOG_PREFIX} ${event}`;
  if (payload && Object.keys(payload).length > 0) {
    if (level === 'error') {
      console.error(base, payload);
      return;
    }
    if (level === 'warn') {
      console.warn(base, payload);
      return;
    }
    console.info(base, payload);
    return;
  }

  if (level === 'error') {
    console.error(base);
    return;
  }
  if (level === 'warn') {
    console.warn(base);
    return;
  }
  console.info(base);
};

export const walletDebugLog = {
  info: (event: string, payload?: LogPayload) => emit('info', event, payload),
  warn: (event: string, payload?: LogPayload) => emit('warn', event, payload),
  error: (event: string, payload?: LogPayload) => emit('error', event, payload),
};

