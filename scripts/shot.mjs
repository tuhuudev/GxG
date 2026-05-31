import { chromium } from "playwright";
const URL = process.env.URL || "http://localhost:4322/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 1500 } });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: "scripts/shots/home.png" });
await browser.close();
console.log("done");
