// Semi-automatic: discover trends -> pick the best topic(s) -> create draft post(s).
// By design the posts are saved as DRAFT so you review before publishing.
//
// Usage:
//   npm run ai:auto                  # tao 1 bai nhap tu chu de hot nhat
//   npm run ai:auto -- --count 3     # tao 3 bai nhap tu 3 chu de hang dau
//   npm run ai:auto -- --publish     # dang thang (khong de nhap) - can than!
//   npm run ai:auto -- --no-image    # khong tao anh

import path from "node:path";
import {
  ROOT,
  DEFAULT_TEXT_MODEL,
  DEFAULT_IMAGE_MODEL,
  loadDotEnv,
  requireApiKey,
  generatePostBundle,
  writePostFile,
} from "./lib/ai-post.mjs";
import { fetchTrendIdeas } from "./fetch-trends.mjs";

function parseArgs(argv) {
  const opts = {
    count: 1,
    draft: true,
    image: true,
    local: false,
    author: "GxG",
    textModel: process.env.GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL,
    imageModel: process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
    words: process.env.AI_POST_WORDS || "900-1300",
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count") opts.count = parseInt(argv[++i], 10) || opts.count;
    else if (arg === "--publish") opts.draft = false;
    else if (arg === "--no-image") opts.image = false;
    else if (arg === "--local") opts.local = true;
    else if (arg === "--local-image") opts.localImage = true;
    else if (arg === "--image-source") opts.imageSource = argv[++i] || "";
    else if (arg === "--stock") opts.imageSource = "stock";
    else if (arg === "--source-image") opts.imageSource = "source";
    else if (arg === "--ai-image") opts.imageSource = "gemini";
    else if (arg === "--no-grounding") opts.grounded = false;
    else if (arg === "--no-youtube") opts.youtube = false;
    else if (arg === "--words") opts.words = argv[++i] ?? opts.words;
    else if (arg === "--help" || arg === "-h") opts.help = true;
  }
  return opts;
}

async function main() {
  await loadDotEnv();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(`
Do trend -> tu chon chu de tot nhat -> tao bai .md trong src/content/posts.
Mac dinh tao BAN NHAP (draft: true, chua hien tren web) de ban duyet truoc.
  npm run ai:auto                  Tao 1 bai nhap tu chu de hot nhat
  npm run ai:auto -- --count 3     Tao 3 bai nhap
  npm run ai:auto -- --publish     Dang thang (khong draft -> hien luon)
  npm run ai:auto -- --no-image    Khong tao anh
`);
    return;
  }

  const apiKey = requireApiKey();

  console.log("[auto] Dang do tin nong va chon chu de...");
  const ideas = await fetchTrendIdeas({ count: Math.max(opts.count, 3), apiKey, textModel: opts.textModel });
  if (ideas.length === 0) throw new Error("Khong tim duoc chu de phu hop.");

  const picked = ideas.slice(0, opts.count);
  console.log(`[auto] Se tao ${picked.length} bai${opts.draft ? " (nhap)" : " (dang thang)"}:`);
  picked.forEach((idea, i) => console.log(`  ${i + 1}. [${idea.category}] ${idea.topic}`));
  console.log("");

  let ok = 0;
  for (const idea of picked) {
    try {
      const postOpts = {
        topic: idea.topic,
        category: idea.category || "",
        tags: Array.isArray(idea.tags) ? idea.tags.join(", ") : idea.tags || "",
        context: idea.angle || "",
        author: opts.author,
        draft: opts.draft,
        image: opts.image,
        localImage: opts.localImage,
        imageSource: opts.imageSource,
        grounded: opts.grounded,
        youtube: opts.youtube,
        textModel: opts.textModel,
        imageModel: opts.imageModel,
        words: opts.words,
      };
      const { post, slug, ogImage } = await generatePostBundle(postOpts, apiKey);
      const outPath = await writePostFile(post, postOpts, ogImage, slug);
      console.log(`[auto] OK: ${path.relative(ROOT, outPath)}${ogImage ? ` (+ ${ogImage})` : ""}`);
      ok++;
    } catch (err) {
      console.warn(`[auto] Loi voi "${idea.topic}": ${err.message}`);
    }
  }

  console.log(`\n[auto] Xong ${ok}/${picked.length} bai.`);
  if (ok > 0) {
    console.log("Da ghi file .md trong src/content/posts" + (opts.draft ? " (draft: true)." : ".") +
                " Commit + push de Cloudflare build lai.");
  }
}

main().catch((err) => {
  console.error("[auto] Error:", err.message);
  process.exit(1);
});
