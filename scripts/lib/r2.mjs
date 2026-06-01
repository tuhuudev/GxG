// Upload media (anh, video) len Cloudflare R2 bang S3 API (aws4fetch).
// Tra ve URL cong khai de luu vao Google Sheet / frontmatter bai viet.
//
// Can cac bien moi truong (trong .env):
//   R2_ACCOUNT_ID        - Account ID cua Cloudflare
//   R2_ACCESS_KEY_ID     - tu R2 API Token (Object Read & Write)
//   R2_SECRET_ACCESS_KEY - tu R2 API Token
//   R2_BUCKET            - ten bucket, vd "gxg-media"
//   R2_PUBLIC_BASE       - domain cong khai, vd "https://pub-xxxx.r2.dev"

import fs from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
};

export function contentTypeFor(filename) {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] || "application/octet-stream";
}

// Doc cau hinh R2 tu env. Bao loi ro neu thieu.
function r2Config() {
  const cfg = {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET,
    publicBase: (process.env.R2_PUBLIC_BASE || "").replace(/\/+$/, ""),
  };
  const missing = Object.entries(cfg)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `Thieu cau hinh R2 (${missing.join(", ")}). Dien vao .env theo HUONG-DAN-LUU-TRU-R2-SHEET.md.`
    );
  }
  return cfg;
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET &&
      process.env.R2_PUBLIC_BASE
  );
}

// Tao "key" (duong dan trong bucket) theo loai + nam/thang, vd images/2026/06/slug.png
export function mediaKey(kind, filename) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return `${kind}/${yyyy}/${mm}/${safe}`;
}

// Upload mot Buffer/Uint8Array len R2. Tra ve URL cong khai.
export async function uploadBuffer(buffer, key, contentType) {
  const cfg = r2Config();
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    region: "auto",
    service: "s3",
  });
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
  const res = await client.fetch(endpoint, {
    method: "PUT",
    body: buffer,
    headers: { "Content-Type": contentType || "application/octet-stream" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload R2 that bai (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  return `${cfg.publicBase}/${key}`;
}

// Upload mot file tu o dia len R2. Tra ve URL cong khai.
export async function uploadFile(localPath, { kind, key } = {}) {
  const buffer = await fs.readFile(localPath);
  const finalKey = key || mediaKey(kind || "files", path.basename(localPath));
  return uploadBuffer(buffer, finalKey, contentTypeFor(localPath));
}
