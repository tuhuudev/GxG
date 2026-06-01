// Chuyen anh sang WebP (nhe, tai nhanh) truoc khi day len R2.
// Dung sharp. Tu thu nho kich thuoc neu anh qua to.

import sharp from "sharp";

// input: Buffer. Tra ve { buffer, ext: ".webp", mime: "image/webp" }.
export async function toWebp(input, { maxWidth = 1600, quality = 82 } = {}) {
  const img = sharp(input, { animated: true });
  const meta = await img.metadata().catch(() => ({}));
  let pipe = img;
  if (meta?.width && meta.width > maxWidth) {
    pipe = pipe.resize({ width: maxWidth, withoutEnlargement: true });
  }
  const buffer = await pipe.webp({ quality }).toBuffer();
  return { buffer, ext: ".webp", mime: "image/webp" };
}
