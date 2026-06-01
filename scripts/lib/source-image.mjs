// Lay anh dai dien (og:image) tu chinh cac bai nguon tim duoc khi grounding.
// LUU Y BAN QUYEN: anh bao chi co the co ban quyen; luon ghi nguon va uu tien nguon
// cho phep dung lai. Co anh du phong hop phap (stock/Wikimedia) khi khong lay duoc.

function extractMeta(html, name) {
  // Tim <meta property|name="<name>" content="...">  (linh hoat thu tu thuoc tinh)
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${name}["'][^>]*>|<meta[^>]+content=["'][^"']*["'][^>]*(?:property|name)=["']${name}["'][^>]*>`,
    "i"
  );
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  return tag.match(/content=["']([^"']+)["']/i)?.[1] || null;
}

function extFromUrlOrMime(url, mime) {
  if (mime?.includes("png")) return ".png";
  if (mime?.includes("webp")) return ".webp";
  if (mime?.includes("jpeg") || mime?.includes("jpg")) return ".jpg";
  const m = String(url).toLowerCase().match(/\.(jpg|jpeg|png|webp)(\?|$)/);
  if (m) return m[1] === "jpeg" ? ".jpg" : `.${m[1]}`;
  return ".jpg";
}

async function tryOneUrl(sourceUrl) {
  // Tai trang nguon (theo redirect cua grounding -> bai goc).
  const page = await fetch(sourceUrl, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GxG-Blog/1.0)" },
  });
  if (!page.ok) return null;
  const finalUrl = page.url || sourceUrl;
  const html = await page.text();

  let imgUrl =
    extractMeta(html, "og:image:secure_url") ||
    extractMeta(html, "og:image") ||
    extractMeta(html, "twitter:image");
  if (!imgUrl) return null;
  // URL tuong doi -> tuyet doi.
  imgUrl = new URL(imgUrl, finalUrl).href;

  const res = await fetch(imgUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; GxG-Blog/1.0)" } });
  if (!res.ok) return null;
  const mime = res.headers.get("content-type") || "image/jpeg";
  if (!mime.startsWith("image/")) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 8 * 1024) return null; // anh qua nho/placeholder -> bo

  const host = new URL(finalUrl).hostname.replace(/^www\./, "");
  return {
    buffer,
    mime,
    ext: extFromUrlOrMime(imgUrl, mime),
    attribution: { text: `Anh: ${host}`, url: finalUrl },
  };
}

// Thu lan luot cac URL nguon, tra ve { buffer, ext, mime, attribution } dau tien lay duoc.
export async function fetchSourceImage(sourceUrls = [], { maxTry = 4 } = {}) {
  for (const url of sourceUrls.slice(0, maxTry)) {
    if (!url) continue;
    const got = await tryOneUrl(url).catch(() => null);
    if (got) return got;
  }
  return null;
}
