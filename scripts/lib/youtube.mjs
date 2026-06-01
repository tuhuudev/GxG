// Tim video YouTube lien quan & CHO PHEP NHUNG, tao ma nhung (iframe) hop phap.
// KHONG tai video ve - chi nhung qua trinh phat chinh thuc cua YouTube.
//
// Dung YouTube Data API v3 (mien phi) de loc video nhung duoc + xep hang lien quan.
// Can env YOUTUBE_API_KEY. Neu khong co key -> bo qua video (tranh nhung video hong/sai).
//   Lay key: console.cloud.google.com -> bat "YouTube Data API v3" -> tao API key.

export function isYouTubeConfigured() {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function buildEmbedHtml(id, title) {
  const safeTitle = String(title || "Video").replace(/"/g, "'");
  return (
    `<div style="position:relative;padding-top:56.25%;margin:1.5rem 0">` +
    `<iframe src="https://www.youtube.com/embed/${id}" title="${safeTitle}" ` +
    `style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px" ` +
    `loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
    `allowfullscreen></iframe></div>`
  );
}

// Tach tu khoa (bo dau, bo tu ngan) de so khop lien quan.
function keywords(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4);
}

// Video lien quan: tieu de phai trung it nhat 2 tu khoa "dat" voi chu de.
function relevanceScore(query, title) {
  const q = new Set(keywords(query));
  if (!q.size) return 1;
  let hits = 0;
  for (const w of new Set(keywords(title))) if (q.has(w)) hits++;
  return hits;
}

// Tra ve { id, title, url, embedHtml } hoac null.
export async function findYouTubeEmbed(query) {
  const q = String(query || "").trim();
  if (!q) return null;

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null; // khong co key -> bo qua (tranh video hong/sai chu de)

  const url =
    "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video" +
    "&videoEmbeddable=true&maxResults=10&order=relevance" +
    "&relevanceLanguage=vi&regionCode=VN&safeSearch=moderate" +
    `&q=${encodeURIComponent(q)}&key=${key}`;

  let json;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`YouTube API HTTP ${res.status}: ${t.slice(0, 160)}`);
    }
    json = await res.json();
  } catch (e) {
    console.warn(`[youtube] ${e.message}`);
    return null;
  }

  const items = (json.items || [])
    .map((it) => ({ id: it.id?.videoId, title: decodeEntities(it.snippet?.title) }))
    .filter((v) => v.id && v.title);
  if (!items.length) return null;

  // Chon video lien quan nhat (it nhat 2 tu khoa trung); neu khong co thi bo qua.
  let best = null;
  let bestScore = 0;
  for (const v of items) {
    const score = relevanceScore(q, v.title);
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  if (!best || bestScore < 2) return null; // khong du lien quan -> bo qua

  return {
    id: best.id,
    title: best.title,
    url: `https://www.youtube.com/watch?v=${best.id}`,
    embedHtml: buildEmbedHtml(best.id, best.title),
  };
}
