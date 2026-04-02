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

  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
};
