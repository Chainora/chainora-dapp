export type QrFeaturePayload<TData extends Record<string, unknown>> = {
  feature: string;
  apiBase: string;
  data: TData;
};

export const buildQrPayload = <TData extends Record<string, unknown>>(
  payload: QrFeaturePayload<TData>,
): string => {
  return JSON.stringify(payload);
};

export const buildQrImageUrl = (payload: string, size = 280): string => {
  if (!payload) {
    return '';
  }

  const params = new URLSearchParams({
    size: `${size}x${size}`,
    format: 'svg',
    ecc: 'L',
    qzone: '2',
    data: payload,
  });

  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`;
};
