// =============================================================
//  Tự động sinh ảnh OG (1200x630 PNG) cho mỗi bài viết.
//  Chạy: node scripts/generate-og.mjs  (đã gắn vào "npm run build")
//  Ảnh lưu ở public/og/<slug>.png -> dùng cho thẻ og:image khi share.
// =============================================================
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(ROOT, "src", "content", "posts");
const OUT_DIR = path.join(ROOT, "public", "og");
const FONT_DIR = path.join(__dirname, "fonts");

// Giống slugify trong src/utils.ts (giữ đồng bộ để tên file ảnh khớp URL)
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

// Lấy tên trang từ src/consts.ts để không lặp cấu hình
async function getSiteName() {
  const consts = await fs.readFile(path.join(ROOT, "src", "consts.ts"), "utf-8");
  const m = consts.match(/SITE_NAME\s*=\s*"([^"]+)"/);
  return m ? m[1] : "Blog";
}

function template({ title, category, siteName }) {
  return html(`
    <div style="width:1200px;height:630px;display:flex;flex-direction:column;justify-content:space-between;padding:72px;background-color:#1e3a8a;background-image:linear-gradient(135deg,#2563eb 0%,#1e3a8a 100%);font-family:'Be Vietnam Pro';color:#ffffff;">
      <div style="display:flex;font-size:30px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#bfdbfe;">${category}</div>
      <div style="display:flex;font-size:66px;font-weight:700;line-height:1.15;">${title}</div>
      <div style="display:flex;align-items:center;font-size:32px;font-weight:400;color:#e0e7ff;">${siteName}</div>
    </div>
  `);
}

async function main() {
  const [regular, bold] = await Promise.all([
    fs.readFile(path.join(FONT_DIR, "BeVietnamPro-Regular.ttf")),
    fs.readFile(path.join(FONT_DIR, "BeVietnamPro-Bold.ttf")),
  ]);
  const fonts = [
    { name: "Be Vietnam Pro", data: regular, weight: 400, style: "normal" },
    { name: "Be Vietnam Pro", data: bold, weight: 700, style: "normal" },
  ];

  const siteName = await getSiteName();
  await fs.mkdir(OUT_DIR, { recursive: true });

  const files = (await fs.readdir(POSTS_DIR)).filter((f) => f.endsWith(".md"));
  let count = 0;

  for (const file of files) {
    const raw = await fs.readFile(path.join(POSTS_DIR, file), "utf-8");
    const { data } = matter(raw);
    if (data.draft) continue;
    // Bỏ qua nếu bài đã khai báo ogImage riêng (ảnh thật do người dùng đặt)
    if (data.ogImage) continue;

    const slug = slugify(data.title);
    const markup = template({
      title: data.title ?? "",
      category: data.category ?? "Bài viết",
      siteName,
    });

    const svg = await satori(markup, { width: 1200, height: 630, fonts });
    const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } })
      .render()
      .asPng();

    await fs.writeFile(path.join(OUT_DIR, `${slug}.png`), png);
    count++;
    console.log(`  ✓ og/${slug}.png`);
  }

  console.log(`[og] Đã sinh ${count} ảnh OG vào public/og/`);
}

main().catch((err) => {
  console.error("[og] Lỗi sinh ảnh OG:", err);
  process.exit(1);
});
