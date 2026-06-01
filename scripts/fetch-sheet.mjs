// =============================================================
//  Đọc bài viết từ Google Sheet -> sinh file .md trong src/content/posts
//  Chạy đầu tiên trong "npm run build".
//
//  Đặt biến môi trường SHEET_CSV_URL trỏ tới CSV của Google Sheet, ví dụ:
//    https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=Posts
//  (Sheet cần chia sẻ "Bất kỳ ai có link: Người xem")
//
//  Cột trong Sheet (hàng đầu là tiêu đề cột):
//    title | description | category | tags | pubDate | body | ogImage | status
//  - title  : bắt buộc
//  - body   : nội dung Markdown (dài, nhiều đoạn)
//  - tags   : ngăn cách bằng dấu phẩy
//  - status : "published" để đăng; để trống cũng đăng; "draft" thì bỏ qua
// =============================================================
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "src", "content", "posts");

const PUBLISHED = new Set(["", "published", "publish", "public", "đăng", "1", "true", "yes"]);

// Đọc .env ở gốc project (nếu có) để chạy được dưới máy local. Trên Cloudflare,
// SHEET_CSV_URL đã có sẵn trong env nên hàm này không ghi đè.
async function loadDotEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, ".env"), "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      const val = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    // .env là tuỳ chọn.
  }
}

function slugify(input) {
  return input
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

const yaml = (s) => `"${String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

// Xóa các file đã sinh từ Sheet lần trước (để bài bị xóa trên Sheet cũng biến mất)
async function clearOld() {
  const files = await fs.readdir(POSTS_DIR);
  await Promise.all(
    files
      .filter((f) => f.startsWith("sheet-") && f.endsWith(".md"))
      .map((f) => fs.unlink(path.join(POSTS_DIR, f)))
  );
}

async function readCsv(csvUrl) {
  if (csvUrl.startsWith("http")) {
    const res = await fetch(csvUrl, { redirect: "follow" });
    if (!res.ok) throw new Error(`Tải Sheet thất bại: HTTP ${res.status}`);
    return await res.text();
  }
  // hỗ trợ đường dẫn file cục bộ để test
  return await fs.readFile(path.resolve(ROOT, csvUrl), "utf-8");
}

async function main() {
  await loadDotEnv();
  const CSV_URL = process.env.SHEET_CSV_URL;

  // Luôn dọn file sheet-*.md cũ trước (tránh bài cũ còn sót khi Sheet thay đổi/để trống).
  await clearOld();

  if (!CSV_URL) {
    console.log("[sheet] Bỏ qua (chưa đặt SHEET_CSV_URL).");
    return;
  }
  const csv = await readCsv(CSV_URL);
  // columns: cắt dấu cách thừa ở tên cột (vd "title " -> "title") để khớp tên cột chắc chắn.
  const rows = parse(csv, {
    columns: (header) => header.map((h) => String(h).trim()),
    skip_empty_lines: true,
    trim: true,
  });

  const seen = new Set();
  let count = 0;
  for (const row of rows) {
    const title = (row.title || row.Title || "").trim();
    if (!title) continue;

    const status = (row.status || "").trim().toLowerCase();
    if (!PUBLISHED.has(status)) continue;

    let slug = slugify((row.slug || title).trim());
    if (!slug) continue;
    if (seen.has(slug)) slug = `${slug}-${seen.size}`; // tránh trùng slug
    seen.add(slug);

    const body = (row.body || row.content || "").replace(/\r\n/g, "\n").trim();
    const descRaw = (row.description || "").trim();
    // Mô tả: dùng description nếu có; nếu trống thì lấy tóm tắt từ body
    // (bỏ ký tự Markdown, gộp xuống dòng/khoảng trắng về 1 dòng).
    const plain = body
      .replace(/[#>*`_\[\]()~-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const description = (descRaw || plain.slice(0, 155) || title)
      .replace(/\s+/g, " ")
      .trim();
    const category = (row.category || "Khác").trim() || "Khác";
    const tags = (row.tags || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const pubDate =
      (row.pubDate || row.date || "").trim() ||
      new Date().toISOString().slice(0, 10);
    const ogImage = (row.ogImage || row.image || "").trim();

    const fm = [
      "---",
      `title: ${yaml(title)}`,
      `description: ${yaml(description)}`,
      `pubDate: ${pubDate}`,
      `category: ${yaml(category)}`,
      `tags: [${tags.map(yaml).join(", ")}]`,
      ...(ogImage ? [`ogImage: ${yaml(ogImage)}`] : []),
      "---",
      "",
      body,
      "",
    ].join("\n");

    await fs.writeFile(path.join(POSTS_DIR, `sheet-${slug}.md`), fm, "utf-8");
    count++;
  }
  console.log(`[sheet] Đã tạo ${count} bài từ Google Sheet.`);
}

main().catch((err) => {
  console.error("[sheet] Lỗi:", err.message);
  process.exit(1);
});
