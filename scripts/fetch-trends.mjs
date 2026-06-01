// Discover what's trending from free RSS sources (no API key needed),
// then ask Gemini to pick the topics best suited to the GxG blog.
//
// Usage:
//   npm run ai:trends                 # in ra danh sach chu de goi y
//   npm run ai:trends -- --count 10   # lay nhieu hon
//   npm run ai:trends -- --raw        # chi xem tin tho, khong dung Gemini
//   npm run ai:trends -- --json       # ghi ket qua ra trends.json

import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import {
  ROOT,
  DEFAULT_TEXT_MODEL,
  loadDotEnv,
  requireApiKey,
  geminiGenerate,
  getText,
  parseJsonArray,
} from "./lib/ai-post.mjs";

// Nguon trend mien phi (RSS cong khai). "category" la goi y chuyen muc cho blog.
const SOURCES = [
  {
    name: "Google Trends VN",
    category: "Tong hop",
    url: "https://trends.google.com/trending/rss?geo=VN",
  },
  {
    name: "Google News VN",
    category: "Tong hop",
    url: "https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi",
  },
  {
    name: "Google News - Cong nghe",
    category: "Cong nghe",
    url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=vi&gl=VN&ceid=VN:vi",
  },
  {
    name: "Google News - Kinh doanh",
    category: "Marketing",
    url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=vi&gl=VN&ceid=VN:vi",
  },
  {
    name: "Hacker News (AI/Tech)",
    category: "Cong nghe",
    url: "https://hnrss.org/frontpage?points=100",
  },
];

function decodeEntities(str) {
  return String(str || "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function parseRssItems(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const block of blocks) {
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const title = decodeEntities(titleMatch?.[1]);
    if (!title) continue;
    items.push({ title, link: decodeEntities(linkMatch?.[1]) });
  }
  return items;
}

async function fetchSource(source, perSource) {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "Mozilla/5.0 (GxG trend fetcher)" },
    });
    if (!res.ok) {
      console.warn(`[trends] ${source.name}: HTTP ${res.status}, bo qua.`);
      return [];
    }
    const xml = await res.text();
    return parseRssItems(xml)
      .slice(0, perSource)
      .map((item) => ({ ...item, source: source.name, category: source.category }));
  } catch (err) {
    console.warn(`[trends] ${source.name}: ${err.message}, bo qua.`);
    return [];
  }
}

// Lay tin tho tu tat ca cac nguon (da khu trung lap theo tieu de).
export async function fetchRawTrends({ perSource = 12 } = {}) {
  const results = await Promise.all(SOURCES.map((s) => fetchSource(s, perSource)));
  const all = results.flat();
  const seen = new Set();
  const deduped = [];
  for (const item of all) {
    const key = item.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

// Doc tieu de cac bai DA CO tu Google Sheet (SHEET_CSV_URL) de tranh goi y trung.
export async function fetchExistingTitles() {
  const url = process.env.SHEET_CSV_URL;
  if (!url || !url.startsWith("http")) return [];
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return [];
    const rows = parseCsv(await res.text(), { columns: true, skip_empty_lines: true, trim: true });
    return rows
      .map((r) => (r.title || r.Title || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildRankPrompt(rawItems, count, existingTitles = []) {
  const list = rawItems
    .map((it, i) => `${i + 1}. [${it.category}] ${it.title}`)
    .join("\n");
  const avoid = existingTitles.length
    ? `\nCac bai blog DA CO (TUYET DOI khong goi y trung y hoac gan giong):\n${existingTitles
        .slice(0, 200)
        .map((t) => `- ${t}`)
        .join("\n")}\n`
    : "";
  return (avoid + `
Ban la tong bien tap cua blog GxG (tieng Viet, doc gia pho thong VN).
Blog viet ve: Cong nghe/AI, Marketing/Ban hang, Doi song/Du lich, va cac chu de dang hot.

Duoi day la cac tieu de dang nong lay tu nhieu nguon tin:
${list}

Hay chon ${count} chu de TOT NHAT de viet thanh bai blog, theo tieu chi:
- Co suc hut, nhieu nguoi quan tam, con thoi su nhung van huu ich lau dai (evergreen).
- Phu hop blog pho thong, KHONG chon: tin giat gan, tai nan, chinh tri nhay cam, tin ca nhan/scandal, tin qua dia phuong hoac qua ngan han.
- Uu tien da dang chuyen muc, khong trung lap y.
- Voi tin tieng Anh (vd Hacker News), hay Viet hoa thanh chu de tieng Viet de hieu.

Voi moi chu de, viet lai thanh mot "goc bai blog" hap dan (khong sao chep tieu de bao).

Tra ve DUY NHAT JSON hop le (khong markdown fence), la mot mang theo schema:
[
  {
    "topic": "Chu de/tieu de goi y cho bai blog (tieng Viet, hap dan)",
    "category": "Mot trong: Cong nghe | Marketing | Doi song | Du lich | Tong hop",
    "tags": ["tag1", "tag2", "tag3"],
    "angle": "1-2 cau goc viet: vi sao thu vi, nen khai thac khia canh nao",
    "score": 1-10
  }
]
Sap xep theo score giam dan.
`).trim();
}

// Lay tin tho -> nho Gemini xep hang -> tra ve danh sach chu de goi y.
export async function fetchTrendIdeas({ count = 8, apiKey, textModel } = {}) {
  const raw = await fetchRawTrends();
  if (raw.length === 0) throw new Error("Khong lay duoc tin trend nao (mang loi?).");

  const key = apiKey || requireApiKey();
  const model = textModel || process.env.GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL;

  const existing = await fetchExistingTitles();
  if (existing.length) console.log(`[trends] Da co ${existing.length} bai trong Sheet -> tranh trung.`);

  const response = await geminiGenerate(model, key, {
    contents: [{ parts: [{ text: buildRankPrompt(raw, count, existing) }] }],
    generationConfig: { temperature: 0.6, responseMimeType: "application/json" },
  });
  const text = getText(response);
  if (!text) throw new Error("Gemini khong tra ve ket qua.");
  const ideas = parseJsonArray(text);
  return ideas.slice(0, count);
}

function parseArgs(argv) {
  const opts = { count: 8, raw: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count") opts.count = parseInt(argv[++i], 10) || opts.count;
    else if (arg === "--raw") opts.raw = true;
    else if (arg === "--json") opts.json = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
  }
  return opts;
}

async function main() {
  await loadDotEnv();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`
Do trend va goi y chu de bai viet.
  npm run ai:trends                 In danh sach chu de goi y
  npm run ai:trends -- --count 10   Lay nhieu hon
  npm run ai:trends -- --raw        Chi xem tin tho (khong dung Gemini)
  npm run ai:trends -- --json       Ghi ket qua ra trends.json
`);
    return;
  }

  if (opts.raw) {
    const raw = await fetchRawTrends();
    console.log(`[trends] ${raw.length} tin tho:\n`);
    raw.forEach((it, i) => console.log(`${i + 1}. [${it.source}] ${it.title}`));
    if (opts.json) {
      await fs.writeFile(path.join(ROOT, "trends.json"), JSON.stringify(raw, null, 2), "utf-8");
      console.log("\n[trends] Da ghi trends.json");
    }
    return;
  }

  console.log("[trends] Dang do tin nong va nho Gemini chon loc...");
  const ideas = await fetchTrendIdeas({ count: opts.count });

  console.log(`\n[trends] ${ideas.length} chu de goi y:\n`);
  ideas.forEach((idea, i) => {
    console.log(`${i + 1}. (${idea.score ?? "-"}/10) [${idea.category}] ${idea.topic}`);
    if (idea.angle) console.log(`   Goc viet: ${idea.angle}`);
    if (idea.tags?.length) console.log(`   Tags: ${idea.tags.join(", ")}`);
    console.log("");
  });

  if (opts.json) {
    await fs.writeFile(path.join(ROOT, "trends.json"), JSON.stringify(ideas, null, 2), "utf-8");
    console.log("[trends] Da ghi trends.json");
  }

  console.log("Tao bai tu chu de #1:");
  console.log("  npm run ai:auto            (tu lay chu de tot nhat -> tao bai nhap)");
  console.log('  npm run ai:post -- "<chu de o tren>" --draft');
}

// Chi chay main() khi goi truc tiep, khong chay khi bi import.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("fetch-trends.mjs")) {
  main().catch((err) => {
    console.error("[trends] Error:", err.message);
    process.exit(1);
  });
}
