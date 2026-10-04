import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { SITE_URL } from "./src/consts.ts";

// Trang bai viet da render title thanh <h1>; ha moi "# ..." trong noi dung markdown
// xuong <h2> de moi trang chi co dung 1 <h1>.
function rehypeDemoteH1() {
  const walk = (node) => {
    if (node.type === "element" && node.tagName === "h1") node.tagName = "h2";
    node.children?.forEach(walk);
  };
  return walk;
}

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
    rehypePlugins: [rehypeDemoteH1],
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },
});
