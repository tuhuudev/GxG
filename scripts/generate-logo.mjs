// Render logo.svg ra PNG: logo.png (512) cho JSON-LD/Facebook, apple-touch-icon.png (180).
// Chạy 1 lần khi logo thay đổi:  node scripts/generate-logo.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const FONT = path.join(__dirname, "fonts", "BeVietnamPro-Bold.ttf");

const svg = await fs.readFile(path.join(PUBLIC, "logo.svg"), "utf-8");

function renderPng(width) {
  return new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: [FONT], defaultFontFamily: "Be Vietnam Pro" },
  })
    .render()
    .asPng();
}

await fs.writeFile(path.join(PUBLIC, "logo.png"), renderPng(512));
await fs.writeFile(path.join(PUBLIC, "apple-touch-icon.png"), renderPng(180));
console.log("[logo] Đã tạo logo.png (512) và apple-touch-icon.png (180)");
