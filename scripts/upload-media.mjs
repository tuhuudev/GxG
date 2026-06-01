// Upload mot file (anh hoac video) len Cloudflare R2 va in ra link cong khai.
// Dung cho video ban tu quay/tai, hoac anh roi muon chen vao bai.
//
// Usage:
//   npm run media:up -- duong-dan/video.mp4
//   npm run media:up -- anh.png --kind images
//   npm run media:up -- video.mp4 --embed     # in luon doan <video> de dan vao bai

import fs from "node:fs/promises";
import path from "node:path";
import { loadDotEnv } from "./lib/ai-post.mjs";
import { uploadFile, uploadBuffer, mediaKey, contentTypeFor } from "./lib/r2.mjs";
import { toWebp } from "./lib/image.mjs";

function parseArgs(argv) {
  const opts = { file: "", kind: "", embed: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--kind") opts.kind = argv[++i] || "";
    else if (arg === "--embed") opts.embed = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else if (!opts.file) opts.file = arg;
  }
  return opts;
}

function guessKind(file) {
  const ct = contentTypeFor(file);
  if (ct.startsWith("video/")) return "videos";
  if (ct.startsWith("image/")) return "images";
  return "files";
}

async function main() {
  await loadDotEnv();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.file) {
    console.log(`
Upload anh/video len Cloudflare R2.
  npm run media:up -- duong-dan/video.mp4
  npm run media:up -- anh.png --kind images
  npm run media:up -- video.mp4 --embed     In kem doan <video> de dan vao bai
`);
    if (!opts.file && !opts.help) process.exit(1);
    return;
  }

  const kind = opts.kind || guessKind(opts.file);
  const ct = contentTypeFor(opts.file);

  let url;
  if (ct.startsWith("image/")) {
    // Anh -> chuyen WebP roi day len.
    console.log(`[media] Chuyen WebP & upload ${path.basename(opts.file)} len R2 (${kind})...`);
    const raw = await fs.readFile(opts.file);
    const w = await toWebp(raw);
    const base = path.basename(opts.file).replace(/\.[^.]+$/, "") + w.ext;
    url = await uploadBuffer(w.buffer, mediaKey(kind, base), w.mime);
  } else {
    console.log(`[media] Dang upload ${path.basename(opts.file)} len R2 (${kind})...`);
    url = await uploadFile(opts.file, { kind });
  }
  console.log(`\n[media] Xong! Link cong khai:\n${url}\n`);
  if (opts.embed || ct.startsWith("video/")) {
    if (ct.startsWith("video/")) {
      console.log("Doan dan vao cot 'body' cua Sheet (hoac file .md):");
      console.log(`<video controls width="100%" src="${url}"></video>`);
    } else {
      console.log("Doan dan vao bai:");
      console.log(`![mo ta anh](${url})`);
    }
  }
}

main().catch((err) => {
  console.error("[media] Error:", err.message);
  process.exit(1);
});
