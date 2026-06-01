// Lay anh THAT mien phi tu kho anh (Pexels hoac Pixabay) theo tu khoa.
// Anh Pexels/Pixabay free cho ca muc dich thuong mai, khong bat buoc ghi nguon.
//
// Bien moi truong (chi can 1 trong 2):
//   PEXELS_API_KEY   - https://www.pexels.com/api/ (mien phi)
//   PIXABAY_API_KEY  - https://pixabay.com/api/docs/ (mien phi)

function stripHtml(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extFromUrlOrMime(url, mime) {
  if (mime?.includes("png")) return ".png";
  if (mime?.includes("webp")) return ".webp";
  if (mime?.includes("jpeg") || mime?.includes("jpg")) return ".jpg";
  const m = String(url).toLowerCase().match(/\.(jpg|jpeg|png|webp)(\?|$)/);
  if (m) return m[1] === "jpeg" ? ".jpg" : `.${m[1]}`;
  return ".jpg";
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tai anh that bai (HTTP ${res.status}).`);
  const mime = res.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mime, ext: extFromUrlOrMime(url, mime) };
}

function pick(arr) {
  // Chon ngau nhien trong vai ket qua dau de moi bai mot anh khac nhau.
  const top = arr.slice(0, Math.min(8, arr.length));
  return top[Math.floor(Math.random() * top.length)];
}

async function fromPexels(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=15`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`Pexels loi (HTTP ${res.status}).`);
  const json = await res.json();
  const photos = json?.photos || [];
  if (!photos.length) return null;
  const photo = pick(photos);
  const src = photo.src?.large2x || photo.src?.large || photo.src?.original;
  if (!src) return null;
  return downloadImage(src);
}

async function fromPixabay(query) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const url = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=15`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pixabay loi (HTTP ${res.status}).`);
  const json = await res.json();
  const hits = json?.hits || [];
  if (!hits.length) return null;
  const hit = pick(hits);
  const src = hit.largeImageURL || hit.webformatURL;
  if (!src) return null;
  return downloadImage(src);
}

// Wikimedia Commons (khong can key). Anh that ve san pham/dia danh/nhan vat,
// co giay phep nhung CAN GHI NGUON -> tra ve kem 'attribution'.
async function fromWikimedia(query) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    "&generator=search&gsrnamespace=6&gsrlimit=12" +
    `&gsrsearch=${encodeURIComponent(query)}` +
    "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600";
  const res = await fetch(url, { headers: { "User-Agent": "GxG-Blog/1.0 (contact: blog)" } });
  if (!res.ok) throw new Error(`Wikimedia loi (HTTP ${res.status}).`);
  const json = await res.json();
  const pages = Object.values(json?.query?.pages || {});
  // Chi lay anh raster (jpg/png/webp), bo svg/pdf.
  const candidates = pages
    .map((p) => p.imageinfo?.[0])
    .filter((ii) => ii && /\.(jpe?g|png|webp)$/i.test(ii.url || ""));
  if (!candidates.length) return null;
  const ii = pick(candidates);
  const src = ii.thumburl || ii.url;
  const meta = ii.extmetadata || {};
  const artist = stripHtml(meta.Artist?.value) || "Khong ro tac gia";
  const license = stripHtml(meta.LicenseShortName?.value) || "xem trang nguon";
  const img = await downloadImage(src);
  return {
    ...img,
    attribution: { text: `Anh: ${artist} / Wikimedia Commons (${license})`, url: ii.descriptionurl || src },
  };
}

// Tra ve { buffer, ext, mime, attribution? } cua 1 anh hop voi tu khoa.
// Uu tien Pexels/Pixabay (khong can ghi nguon), roi Wikimedia (can ghi nguon).
export async function fetchStockImageBuffer(query) {
  const q = String(query || "").trim() || "technology";
  let result = null;
  if (process.env.PEXELS_API_KEY) {
    result = await fromPexels(q).catch((e) => {
      console.warn(`[stock] Pexels: ${e.message}`);
      return null;
    });
  }
  if (!result && process.env.PIXABAY_API_KEY) {
    result = await fromPixabay(q).catch((e) => {
      console.warn(`[stock] Pixabay: ${e.message}`);
      return null;
    });
  }
  if (!result) {
    result = await fromWikimedia(q).catch((e) => {
      console.warn(`[stock] Wikimedia: ${e.message}`);
      return null;
    });
  }
  if (!result) throw new Error(`Khong tim duoc anh stock cho tu khoa "${q}".`);
  return result;
}
