import { chromium } from "playwright";
const URL = process.env.URL || "http://localhost:4322/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 1400 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

// Quét mọi điểm để tìm phần tử có nền tối bất thường
const found = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 20 || r.width > 900) continue;
    const bg = cs.backgroundColor;
    // tìm nền tối (gần đen)
    const m = bg.match(/rgba?\((\d+), (\d+), (\d+)/);
    if (m) {
      const [r2, g2, b2] = [+m[1], +m[2], +m[3]];
      if (r2 < 60 && g2 < 60 && b2 < 60 && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
        out.push({ tag: el.tagName, cls: el.className, id: el.id, bg, pos: cs.position, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), html: el.outerHTML.slice(0, 200) });
      }
    }
  }
  return out;
});
console.log(JSON.stringify(found, null, 2));
await browser.close();
