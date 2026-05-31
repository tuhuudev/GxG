import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { SITE_URL } from "./src/consts.ts";

// https://astro.build/config
export default defineConfig({
  // QUAN TRỌNG cho SEO: phải khai báo đúng tên miền để sinh sitemap + canonical chuẩn
  site: SITE_URL,
  integrations: [sitemap()],
  // Build ra HTML tĩnh hoàn toàn (mặc định) -> phục vụ từ CDN, load cực nhanh
  compressHTML: true,
  build: {
    inlineStylesheets: "auto", // inline CSS nhỏ để giảm request -> LCP tốt hơn
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
});
