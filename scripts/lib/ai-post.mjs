// Shared helpers for generating Astro blog posts with Gemini.
// Used by both scripts/generate-ai-post.mjs (manual topic)
// and scripts/auto-trend-post.mjs (trend-driven, semi-automatic).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isR2Configured, uploadBuffer, mediaKey } from "./r2.mjs";
import { fetchStockImageBuffer } from "./stock-image.mjs";
import { fetchSourceImage } from "./source-image.mjs";
import { findYouTubeEmbed, isYouTubeConfigured } from "./youtube.mjs";
import { toWebp } from "./image.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..", "..");
export const POSTS_DIR = path.join(ROOT, "src", "content", "posts");
export const IMAGE_DIR = path.join(ROOT, "public", "ai-images");

// Default models. Override via env GEMINI_TEXT_MODEL / GEMINI_IMAGE_MODEL.
export const DEFAULT_TEXT_MODEL = "gemini-3.5-flash";
export const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
export const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  try {
    const raw = await fs.readFile(envPath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // .env is optional.
  }
}

export function requireApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Put it in .env or set it in the shell.");
  }
  return apiKey;
}

export function slugify(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function yamlString(value) {
  return `"${String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function uniquePath(dir, base, ext) {
  let candidate = path.join(dir, `${base}${ext}`);
  let index = 2;
  while (true) {
    try {
      await fs.access(candidate);
      candidate = path.join(dir, `${base}-${index}${ext}`);
      index++;
    } catch {
      return candidate;
    }
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Loi tam thoi (qua tai / gioi han toc do) -> nen thu lai.
function isTransient(status, message) {
  const m = message || "";
  // Quota cung / can bat billing (vd model anh free tier limit:0) -> thu lai vo ich.
  if (/billing|limit:\s*0|check your plan/i.test(m)) return false;
  if (status === 429 || status === 500 || status === 503) return true;
  return /high demand|overloaded|unavailable|try again|rate limit|temporarily/i.test(m);
}

export async function geminiGenerate(model, apiKey, body, { retries = 4 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    if (res.ok) return json;

    const message = json?.error?.message || text || `HTTP ${res.status}`;
    lastErr = new Error(`Gemini API error (${model}): ${message}`);

    // Neu la loi tam thoi va con luot thu -> doi roi thu lai (2s, 5s, 12s, 25s).
    if (isTransient(res.status, message) && attempt < retries) {
      const waitMs = [2000, 5000, 12000, 25000][attempt] || 30000;
      console.warn(`[ai] Model ban (${res.status}). Thu lai sau ${waitMs / 1000}s... (lan ${attempt + 1}/${retries})`);
      await sleep(waitMs);
      continue;
    }
    throw lastErr;
  }
  throw lastErr;
}

export function getText(response) {
  return response?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
}

function parseJsonObject(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return a JSON object.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function parseJsonArray(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return a JSON array.");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Buoc 1 (grounding): nho Gemini tra Google de lay SU THAT + nguon, truoc khi viet bai.
// Tra ve { brief, sources: [{title, uri}] }.
async function researchTopic(opts, apiKey) {
  const prompt = `
Tra cuu Google ve chu de: "${opts.topic}".${opts.context ? `\nBoi canh: ${opts.context}` : ""}

Hay tom tat cac SU THAT chinh, so lieu cu the, moc thoi gian, boi canh va dien bien moi nhat,
CHI dua tren ket qua tra cuu thuc te (khong suy doan). Viet tieng Viet, gach dau dong ngan gon.
Neu thong tin chua ro rang hoac trai chieu, hay noi ro.
`.trim();

  const response = await geminiGenerate(opts.textModel, apiKey, {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.4 },
  });

  const brief = getText(response) || "";
  const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  const sources = [];
  for (const c of chunks) {
    const w = c.web || c.retrievedContext;
    if (!w?.uri || seen.has(w.uri)) continue;
    seen.add(w.uri);
    sources.push({ title: w.title || w.uri, uri: w.uri });
  }
  return { brief, sources };
}

function buildPostPrompt(opts, research) {
  const contextBlock = opts.context
    ? `\nBoi canh / goc viet (dua tren tin dang nong, hay khai thac nhung khong sao chep):\n${opts.context}\n`
    : "";
  const hasResearch = research?.brief?.trim();
  const researchBlock = hasResearch
    ? `\nDU LIEU THUC TE da tra cuu (CHI dung thong tin nay, TUYET DOI khong bja them so lieu/trich dan):\n${research.brief}\n` +
      (research.sources?.length
        ? `\nDanh sach nguon (dung de viet muc "Nguon tham khao" o cuoi bai, dang link Markdown):\n${research.sources
            .map((s) => `- [${s.title}](${s.uri})`)
            .join("\n")}\n`
        : "")
    : "";
  const factRule = hasResearch
    ? `- Bai phai dua tren DU LIEU THUC TE o tren. Neu thieu thong tin, viet chung chung mot cach trung thuc, KHONG bja.
- Ket bai bang muc "## Nguon tham khao" liet ke cac nguon o tren (link Markdown).`
    : `- Neu bai dua tren tin thoi su: giai thich boi canh, y nghia, tac dong; KHONG bja so lieu hay trich dan gia.`;

  return `
Ban la bien tap vien SEO tieng Viet cho blog GxG.

Hay viet mot bai blog hoan chinh ve chu de: "${opts.topic}".
${contextBlock}${researchBlock}
Yeu cau:
- Ngon ngu: tieng Viet tu nhien, ro rang, khong pha tieng Anh neu khong can.
- Do dai muc tieu: ${opts.words} tu.
- Neu chu de co rui ro y te, tai chinh, phap ly: viet theo huong thong tin tham khao, khuyen doc gia hoi chuyen gia.
- Noi dung phai huu ich, co cau truc de doc, khong noi chung chung.
${factRule}
- Markdown body chi dung H2/H3, danh sach, bang neu co ich. Khong lap lai title trong H1.
- Khong chen hinh anh trong body (tru link nguon).
- Toi uu SEO nhung khong nhoi tu khoa.

Thong tin goi y:
- Category nguoi dung muon: ${opts.category || "(tu chon category phu hop)"}
- Tags nguoi dung muon: ${opts.tags || "(tu chon 4-7 tag phu hop)"}

Tra ve DUY NHAT JSON hop le, khong markdown fence, theo schema:
{
  "title": "Tieu de hap dan, toi da 70 ky tu",
  "description": "Mo ta SEO 130-160 ky tu",
  "category": "Ten chuyen muc ngan",
  "tags": ["tag 1", "tag 2"],
  "imagePrompt": "Prompt tieng Anh de tao anh blog cover 16:9, khong chu, khong logo, khong watermark",
  "imageQuery": "2-4 tu khoa tieng Anh DON GIAN de tim anh stock (vd: smartphone battery, self driving car)",
  "videoQuery": "2-5 tu khoa tieng Viet GON, SAT chu de de tim video YouTube minh hoa (vd: meo bao quan pin dien thoai android)",
  "body": "Noi dung Markdown (gom muc Nguon tham khao neu co du lieu thuc te)"
}
`.trim();
}

// Tra ve { post, research }. Mac dinh BAT BUOC grounding co nguon (tranh bja);
// dung --no-grounding (opts.grounded=false) de viet chay khi can.
export async function generatePost(opts, apiKey, { attempts = 2 } = {}) {
  // Buoc 1: tra cuu thuc te (grounding).
  let research = null;
  if (opts.grounded !== false) {
    console.log("[ai] Researching (Google grounding)...");
    research = await researchTopic(opts, apiKey); // loi -> nem ra (bat buoc co nguon)
    if (!research?.sources?.length) {
      throw new Error(
        "Grounding khong tra ve nguon thuc te -> bo bai (tranh bja). Dung --no-grounding de viet chay."
      );
    }
    console.log(`[ai] Co ${research.sources.length} nguon tham khao.`);
  }

  let lastErr;
  for (let i = 0; i < attempts; i++) {
    const response = await geminiGenerate(opts.textModel, apiKey, {
      contents: [{ parts: [{ text: buildPostPrompt(opts, research) }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 16384, // du cho bai dai, tranh bi cat ngang -> JSON hong
      },
    });

    const finish = response?.candidates?.[0]?.finishReason;
    const text = getText(response);
    if (!text) {
      lastErr = new Error("Gemini returned no text.");
    } else {
      try {
        return { post: parseJsonObject(text), research };
      } catch (e) {
        lastErr = new Error(
          finish === "MAX_TOKENS"
            ? "Bai qua dai bi cat ngang (MAX_TOKENS)."
            : `JSON tra ve khong hop le: ${e.message}`
        );
      }
    }
    if (i < attempts - 1) console.warn(`[ai] ${lastErr.message} -> thu tao lai...`);
  }
  throw lastErr;
}

// Goi Gemini tao anh, tra ve { buffer, ext, mime } (chua luu o dau).
async function generateImageBuffer(opts, apiKey, imagePrompt) {
  const response = await geminiGenerate(opts.imageModel, apiKey, {
    contents: [{ parts: [{ text: imagePrompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "16:9", imageSize: "1K" },
    },
  });

  const parts = response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part) => part.inlineData || part.inline_data);
  const inline = imagePart?.inlineData || imagePart?.inline_data;
  if (!inline?.data) throw new Error("Gemini image model returned no image.");

  const mime = inline.mimeType || inline.mime_type || "image/png";
  const ext = mime.includes("jpeg") || mime.includes("jpg") ? ".jpg" : ".png";
  return { buffer: Buffer.from(inline.data, "base64"), ext, mime };
}

// Chon nguon anh: --image-source / IMAGE_SOURCE.
//  "source" (mac dinh): uu tien anh og:image tu bai nguon (kem ghi nguon), khong co -> stock.
//  "stock": anh co giay phep (Pexels/Pixabay/Wikimedia).
//  "gemini": anh AI (can bat billing).
function resolveImageSource(opts) {
  return opts.imageSource || process.env.IMAGE_SOURCE || "source";
}

async function stockImageFor(post, opts) {
  const query =
    post.imageQuery ||
    (Array.isArray(post.tags) ? post.tags.join(" ") : "") ||
    post.title ||
    opts.topic;
  return fetchStockImageBuffer(query);
}

// Lay buffer anh cover theo nguon. Tra ve { buffer, ext, mime, source, attribution? }.
async function getCoverImageBuffer(opts, apiKey, post, research) {
  const source = resolveImageSource(opts);

  if (source === "gemini") {
    return { ...(await generateImageBuffer(opts, apiKey, post.imagePrompt)), source: "gemini" };
  }

  if (source === "source") {
    // Uu tien anh tu bai nguon (grounding). Khong co -> ve stock.
    const urls = (research?.sources || []).map((s) => s.uri).filter(Boolean);
    if (urls.length) {
      const got = await fetchSourceImage(urls).catch(() => null);
      if (got) return { ...got, source: "source" };
    }
    return { ...(await stockImageFor(post, opts)), source: "stock" };
  }

  return { ...(await stockImageFor(post, opts)), source: "stock" };
}

// Tao anh cover: mac dinh upload len R2. Tra ve { url, attribution? }.
// Neu opts.localImage hoac chua cau hinh R2 -> luu vao public/ai-images va tra ve /ai-images/...
async function generateCoverImage(opts, apiKey, post, slug, research) {
  let { buffer, ext, mime, attribution } = await getCoverImageBuffer(opts, apiKey, post, research);

  // Chuyen sang WebP (nhe hon) truoc khi luu. Loi thi giu anh goc.
  try {
    const w = await toWebp(buffer);
    buffer = w.buffer;
    ext = w.ext;
    mime = w.mime;
  } catch (e) {
    console.warn(`[ai] Khong chuyen WebP duoc, giu anh goc: ${e.message}`);
  }

  const useR2 = !opts.localImage && isR2Configured();
  if (useR2) {
    const key = mediaKey("images", `${slug}${ext}`);
    return { url: await uploadBuffer(buffer, key, mime), attribution };
  }

  await fs.mkdir(IMAGE_DIR, { recursive: true });
  const outPath = await uniquePath(IMAGE_DIR, slug, ext);
  await fs.writeFile(outPath, buffer);
  return { url: `/ai-images/${path.basename(outPath)}`, attribution };
}

function frontmatter(post, opts, ogImage) {
  const tags = normalizeTags(post.tags);
  const lines = [
    "---",
    `title: ${yamlString(post.title)}`,
    `description: ${yamlString(post.description)}`,
    `pubDate: ${new Date().toISOString().slice(0, 10)}`,
    `category: ${yamlString(post.category || opts.category || "Khac")}`,
    `tags: [${tags.map(yamlString).join(", ")}]`,
    `author: ${yamlString(opts.author)}`,
  ];
  if (ogImage) lines.push(`ogImage: ${yamlString(ogImage)}`);
  if (opts.draft) lines.push("draft: true");
  lines.push("---", "", String(post.body || "").trim(), "");
  return lines.join("\n");
}

// Sinh noi dung bai + anh cover (KHONG luu vao dau). Tra ve { post, slug, ogImage }.
export async function generatePostBundle(opts, apiKey) {
  console.log(`[ai] Generating post with ${opts.textModel}...`);
  const { post, research } = await generatePost(opts, apiKey);

  const slug = slugify(post.title || opts.topic);
  if (!slug) throw new Error("Could not create slug from generated title.");

  let ogImage = "";
  if (opts.image) {
    const where = !opts.localImage && isR2Configured() ? "R2" : "local";
    console.log(`[ai] Cover image (${resolveImageSource(opts)} -> ${where})...`);
    try {
      const { url, attribution } = await generateCoverImage(opts, apiKey, post, slug, research);
      ogImage = url;
      // Anh Wikimedia can ghi nguon -> chen dong credit vao cuoi body.
      if (attribution?.text) {
        const credit = attribution.url
          ? `_[${attribution.text}](${attribution.url})_`
          : `_${attribution.text}_`;
        post.body = `${String(post.body || "").trim()}\n\n${credit}\n`;
      }
    } catch (err) {
      console.warn(`[ai] Image skipped: ${err.message} (bai van co anh OG tu dong khi build)`);
    }
  }

  // Nhung video YouTube lien quan & cho phep nhung (qua YouTube Data API). Tat bang --no-youtube.
  if (opts.youtube !== false) {
    if (!isYouTubeConfigured()) {
      console.log("[ai] YouTube: bo qua (chua dat YOUTUBE_API_KEY).");
    } else {
      try {
        const vid = await findYouTubeEmbed(post.videoQuery || post.title || opts.topic);
        if (vid) {
          console.log(`[ai] YouTube: ${vid.title}`);
          post.body = `${String(post.body || "").trim()}\n\n## Video lien quan\n\n${vid.embedHtml}\n`;
        } else {
          console.log("[ai] YouTube: khong tim duoc video du lien quan (bo qua).");
        }
      } catch (err) {
        console.warn(`[ai] YouTube skipped: ${err.message}`);
      }
    }
  }
  return { post, slug, ogImage };
}

// Ghi bai ra file .md trong src/content/posts. Tra ve duong dan file.
export async function writePostFile(post, opts, ogImage, slug) {
  await fs.mkdir(POSTS_DIR, { recursive: true });
  const outPath = await uniquePath(POSTS_DIR, slug, ".md");
  await fs.writeFile(outPath, frontmatter(post, opts, ogImage), "utf-8");
  return outPath;
}

