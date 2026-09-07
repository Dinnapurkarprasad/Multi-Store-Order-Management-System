"use client";

// The API has no upload endpoint. `image_url` is validated as z.string().url()
// with max 2048 chars (Backend/src/validators), and a data: URI passes that —
// so a file picked from the device has to fit inside 2048 characters or it
// cannot be stored at all.
//
// ponytail: squeeze the image into that budget on the client. 2048 base64
// chars is roughly 1.5 KB of JPEG, so this lands a small square — fine for an
// avatar, visibly soft for a store cover. The real fix is an upload endpoint
// or an object store; add one and this whole file goes away in favour of
// posting the file and storing the returned URL.

export const MAX_IMAGE_URL = 2048;

/** Tried largest-first — the first result that fits the budget wins. */
const ATTEMPTS: { size: number; quality: number }[] = [
  { size: 128, quality: 0.6 },
  { size: 96, quality: 0.55 },
  { size: 80, quality: 0.5 },
  { size: 64, quality: 0.45 },
  { size: 48, quality: 0.4 },
];

async function loadBitmap(file: File) {
  // createImageBitmap handles orientation and is far less code than an
  // <img> + onload dance.
  return createImageBitmap(file);
}

/**
 * Centre-crops to a square, downscales, and returns a JPEG data URL that fits
 * MAX_IMAGE_URL. Returns null when even the smallest attempt is too big.
 */
export async function fileToDataUrl(file: File): Promise<string | null> {
  const bitmap = await loadBitmap(file);

  // Square crop from the centre, so a portrait photo doesn't come out squashed.
  const edge = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - edge) / 2;
  const sy = (bitmap.height - edge) / 2;

  try {
    for (const { size, quality } of ATTEMPTS) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, size, size);

      // JPEG, not PNG — a photo as PNG blows the budget immediately.
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_IMAGE_URL) return dataUrl;
    }
    return null;
  } finally {
    bitmap.close();
  }
}

export const isDataUrl = (value: string) => value.startsWith("data:");

/** next/image needs an absolute http(s) URL — anything else throws
 *  "Failed to parse src", which is easy to hit while a URL is being typed. */
export const isRemoteUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

/** Safe to hand to an <img> or next/image at all. */
export const isUsableSrc = (value?: string | null): value is string =>
  Boolean(
    value &&
      (isRemoteUrl(value) || isDataUrl(value) || value.startsWith("blob:")),
  );
