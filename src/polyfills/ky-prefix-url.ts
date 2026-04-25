import ky from 'ky';

type KyOptionRecord = Record<string, unknown>;

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

// ky 1.x uses `prefixUrl`. Some legacy callers passed `prefix` instead — rename
// it to `prefixUrl` so ky honors the base URL. Keep `prefixUrl` untouched.
const normalizeLegacyPrefixOption = <T>(options: T): T => {
  if (!options || typeof options !== 'object') {
    return options;
  }

  const raw = options as KyOptionRecord;
  if (!hasOwn(raw, 'prefix')) {
    return options;
  }

  const { prefix, ...rest } = raw;
  if (hasOwn(raw, 'prefixUrl')) {
    return rest as T;
  }

  return {
    ...rest,
    prefixUrl: prefix,
  } as T;
};

const patchKyLegacyPrefixUrl = () => {
  const kyWithFactory = ky as typeof ky & {
    __chainoraPatchedPrefixUrl?: boolean;
  };

  if (kyWithFactory.__chainoraPatchedPrefixUrl) {
    return;
  }

  const originalCreate = ky.create.bind(ky);
  const originalExtend = ky.extend.bind(ky);

  ky.create = ((options?: unknown) => {
    const normalized = normalizeLegacyPrefixOption(options) as Parameters<typeof ky.create>[0];
    return originalCreate(normalized);
  }) as typeof ky.create;

  ky.extend = ((defaultOptions?: unknown) => {
    const normalized = normalizeLegacyPrefixOption(defaultOptions) as Parameters<typeof ky.extend>[0];
    return originalExtend(normalized);
  }) as typeof ky.extend;

  kyWithFactory.__chainoraPatchedPrefixUrl = true;
};

patchKyLegacyPrefixUrl();
