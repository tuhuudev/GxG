// Ghi mot bai viet thanh 1 DONG MOI trong Google Sheet (database).
// Gui JSON toi mot Apps Script Web App (xem apps-script-doPost.gs).
//
// Can bien moi truong:
//   SHEET_WRITE_URL - URL Web App cua Apps Script (...script.google.com/.../exec)

import { normalizeTags } from "./ai-post.mjs";

export function isSheetWriteConfigured() {
  return Boolean(process.env.SHEET_WRITE_URL);
}

// row: { title, description, category, tags, pubDate, body, ogImage, status }
export async function appendPostRow(row) {
  const url = process.env.SHEET_WRITE_URL;
  if (!url) {
    throw new Error("Thieu SHEET_WRITE_URL. Dien vao .env (xem HUONG-DAN-LUU-TRU-R2-SHEET.md).");
  }

  const payload = {
    title: row.title || "",
    description: row.description || "",
    category: row.category || "",
    tags: normalizeTags(row.tags).join(", "),
    pubDate: row.pubDate || new Date().toISOString().slice(0, 10),
    body: row.body || "",
    ogImage: row.ogImage || "",
    status: row.status || "draft",
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Ghi Sheet that bai (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  // Apps Script tra ve JSON { ok: true } khi thanh cong.
  try {
    const json = JSON.parse(text);
    if (json && json.ok === false) {
      throw new Error(`Apps Script bao loi: ${json.error || text.slice(0, 200)}`);
    }
  } catch {
    // Khong phai JSON cung khong sao neu HTTP 200.
  }
  return true;
}
