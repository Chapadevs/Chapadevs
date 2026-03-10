/**
 * Resize base64 image data URLs for CodeSandbox payload.
 * Keeps images small enough so payload stays under 20MB limit.
 * @param {string[]} dataUrls - Array of data:image/... base64 URLs
 * @param {object} [opts] - { maxWidth: 480, maxHeight: 360, quality: 85 }
 * @returns {Promise<string[]>} Resized data URLs (or originals on failure)
 */

const MAX_WIDTH = 480;
const MAX_HEIGHT = 360;
const JPEG_QUALITY = 85;

export async function resizeImagesForCodesandbox(dataUrls, opts = {}) {
  const urls = Array.isArray(dataUrls) ? dataUrls : [];
  const valid = urls.filter(
    (u) => typeof u === "string" && u.startsWith("data:image/"),
  );
  if (valid.length === 0) return [];

  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    return [];
  }

  const maxW = opts.maxWidth ?? MAX_WIDTH;
  const maxH = opts.maxHeight ?? MAX_HEIGHT;
  const quality = opts.quality ?? JPEG_QUALITY;

  const results = await Promise.allSettled(
    valid.map(async (dataUrl) => {
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buf = Buffer.from(base64, "base64");
      const out = await sharp(buf)
        .resize(maxW, maxH, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();
      return `data:image/jpeg;base64,${out.toString("base64")}`;
    }),
  );

  const resized = results.map((r) =>
    r.status === "fulfilled" && r.value ? r.value : null,
  );
  const firstValid = resized.find(Boolean);
  return resized.map((v) => v || firstValid);
}
