// =============================================================
//  indexnow.mjs — Báo công cụ tìm kiếm (Bing, Yandex, Seznam...) về URL MỚI/CẬP NHẬT
//  để index gần như tức thì, qua giao thức IndexNow (miễn phí, không cần tài khoản).
//
//  Chạy SAU khi build (đọc dist/sitemap-0.xml) hoặc lấy sitemap từ site live:
//    npm run build
//    npm run index:ping
//
//  Cơ chế: cần 1 "key file" công khai tại https://<domain>/<key>.txt chứa đúng key.
//  Script tự tạo key (lưu ở indexnow.key) và ghi public/<key>.txt để build sau deploy kèm.
//  Ghi chú: Google ĐÃ BỎ sitemap-ping (2023); dùng Search Console cho Google. IndexNow
//  phủ Bing/Yandex/Seznam/Naver — vẫn đáng làm.
// =============================================================
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");

async function getSiteUrl() {
  const consts = await fs.readFile(path.join(ROOT, "src", "consts.ts"), "utf-8");
  const m = consts.match(/SITE_URL\s*=\s*"([^"]+)"/);
  if (!m) throw new Error("Không đọc được SITE_URL trong src/consts.ts");
  return m[1].replace(/\/$/, "");
}

// Key ổn định: ưu tiên env, nếu không có thì đọc/tạo file indexnow.key ở gốc.
async function getKey() {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY.trim();
  const keyPath = path.join(ROOT, "indexnow.key");
  try {
    const k = (await fs.readFile(keyPath, "utf-8")).trim();
    if (k) return k;
  } catch {
    /* chưa có -> tạo mới */
  }
  const key = crypto.randomUUID().replace(/-/g, "");
  await fs.writeFile(keyPath, key + "\n", "utf-8");
  console.log(`[indexnow] Đã tạo key mới -> indexnow.key`);
  return key;
}

// Lấy danh sách URL từ sitemap đã build (dist) hoặc từ site live.
async function getUrls(siteUrl) {
  const local = path.join(ROOT, "dist", "sitemap-0.xml");
  let xml;
  try {
    xml = await fs.readFile(local, "utf-8");
    console.log("[indexnow] Đọc URL từ dist/sitemap-0.xml");
  } catch {
    const res = await fetch(`${siteUrl}/sitemap-0.xml`);
    if (!res.ok) throw new Error(`Không có sitemap (chạy 'npm run build' trước, hoặc deploy site). HTTP ${res.status}`);
    xml = await res.text();
    console.log("[indexnow] Đọc URL từ site live");
  }
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  const siteUrl = await getSiteUrl();
  if (siteUrl.includes("pages.dev")) {
    console.warn("[indexnow] ⚠️ SITE_URL vẫn là tên miền demo *.pages.dev — nên đổi sang domain thật trước.");
  }
  const host = new URL(siteUrl).host;
  const key = await getKey();

  // Ghi key file công khai để deploy kèm (IndexNow yêu cầu xác thực sở hữu).
  // public/ -> để build SAU kèm theo; dist/ -> để bản build HIỆN TẠI có ngay khi deploy.
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(path.join(PUBLIC_DIR, `${key}.txt`), key, "utf-8");
  try {
    await fs.access(path.join(ROOT, "dist"));
    await fs.writeFile(path.join(ROOT, "dist", `${key}.txt`), key, "utf-8");
  } catch {
    /* chưa build -> bỏ qua */
  }

  const urls = await getUrls(siteUrl);
  if (!urls.length) {
    console.log("[indexnow] Không có URL nào để gửi.");
    return;
  }

  const payload = {
    host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList: urls,
  };
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  // IndexNow: 200/202 = nhận; 422 = key/URL chưa khớp host; 403 = key file chưa truy cập được.
  console.log(`[indexnow] Gửi ${urls.length} URL -> HTTP ${res.status} ${res.statusText}`);
  if (res.status === 403) {
    console.log(`[indexnow] 403: hãy chắc ${siteUrl}/${key}.txt đã deploy & truy cập được, rồi chạy lại.`);
  }
}

main().catch((err) => {
  console.error("[indexnow] Lỗi:", err.message);
  process.exit(1);
});
