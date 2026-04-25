import ky from 'ky';

type KyOptionRecord = Record<string, unknown>;

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const normalizeLegacyPrefixOption = <T>(options: T): T => {
  if (!options || typeof options !== 'object') {
    return options;
  }

  const raw = options as KyOptionRecord;
  if (!hasOwn(raw, 'prefixUrl')) {
    return options;
  }

  const { prefixUrl, ...rest } = raw;
  if (hasOwn(raw, 'prefix')) {
    return rest as T;
  }

  return {
    ...rest,
    prefix: prefixUrl,
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
