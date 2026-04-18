import { chainoraApiBase } from '../configs/api';

type UploadKind = 'avatar' | 'group';

type UploadResult = {
  url: string;
};

type Envelope<T> = T | { success?: boolean; data?: T; error?: string };

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const BACKEND_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const TARGET_UPLOAD_BYTES = 4_700_000;
const MAX_DIMENSION = 2048;
const MIN_DIMENSION = 480;
const QUALITY_STEPS = [0.88, 0.8, 0.72, 0.64, 0.56, 0.5];
const RESIZE_STEPS = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4];

const normalizeEnvelope = <T>(raw: Envelope<T>): T => {
  if (raw && typeof raw === 'object' && 'data' in raw && (raw as { data?: T }).data) {
    return (raw as { data: T }).data;
  }

  return raw as T;
};

const toJpegFileName = (originalName: string): string => {
  const trimmed = originalName.trim();
  if (!trimmed) {
    return `image-${Date.now()}.jpg`;
  }

  const dotIndex = trimmed.lastIndexOf('.');
  const baseName = dotIndex > 0 ? trimmed.slice(0, dotIndex) : trimmed;
  return `${baseName}.jpg`;
};

const loadImageElement = async (file: File): Promise<HTMLImageElement> => {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Unable to decode image file.'));
      element.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const canvasToBlob = async (canvas: HTMLCanvasElement, quality: number): Promise<Blob> => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Image optimization failed to encode output.'));
          return;
        }

        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
};

const optimizeImageForUpload = async (file: File): Promise<File> => {
  if (typeof document === 'undefined') {
    return file;
  }

  const image = await loadImageElement(file);
  const initialScale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const baseWidth = Math.max(1, Math.round(image.naturalWidth * initialScale));
  const baseHeight = Math.max(1, Math.round(image.naturalHeight * initialScale));

  let fallbackBlob: Blob | null = null;

  for (const resizeStep of RESIZE_STEPS) {
    const width = Math.max(1, Math.round(baseWidth * resizeStep));
    const height = Math.max(1, Math.round(baseHeight * resizeStep));

    if (width < MIN_DIMENSION && height < MIN_DIMENSION && fallbackBlob) {
      break;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Image optimization is not supported by this browser.');
    }

    // Fill white background so transparent source images don't render black after JPEG conversion.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, quality);
      fallbackBlob = blob;

      if (blob.size <= TARGET_UPLOAD_BYTES) {
        return new File([blob], toJpegFileName(file.name), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
      }
    }
  }

  if (!fallbackBlob) {
    throw new Error('Unable to optimize image before upload.');
  }

  if (fallbackBlob.size > BACKEND_MAX_UPLOAD_BYTES) {
    throw new Error('Image is too large even after optimization. Try a smaller source image.');
  }

  return new File([fallbackBlob], toJpegFileName(file.name), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
};

const parseApiError = (raw: string, fallback: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: string;
      message?: string;
      data?: { error?: string; message?: string };
    };

    return parsed.error || parsed.message || parsed.data?.error || parsed.data?.message || fallback;
  } catch {
    return trimmed;
  }
};

export const uploadMediaImage = async (
  authFetch: AuthFetch,
  file: File,
  kind: UploadKind,
): Promise<UploadResult> => {
  if (!(file instanceof File)) {
    throw new Error('Invalid upload file');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are supported.');
  }

  const optimizedFile = await optimizeImageForUpload(file);

  const body = new FormData();
  body.set('kind', kind);
  body.set('file', optimizedFile, optimizedFile.name);

  const response = await authFetch(`${chainoraApiBase}/v1/media/upload`, {
    method: 'POST',
    body,
  });

  if (!response.ok) {
    const rawError = await response.text();
    throw new Error(parseApiError(rawError, `Upload failed: ${response.status}`));
  }

  const raw = (await response.json()) as Envelope<UploadResult>;
  const result = normalizeEnvelope(raw);
  if (!result?.url) {
    throw new Error('Upload response missing url');
  }

  return result;
};
