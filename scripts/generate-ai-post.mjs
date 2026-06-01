// Generate an Astro blog post with Gemini from a topic you provide.
// Usage:
//   $env:GEMINI_API_KEY="..."
//   npm run ai:post -- "Chu de bai viet" --category "Cong nghe" --tags "AI, SEO"

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
import { appendPostRow, isSheetWriteConfigured } from "./lib/sheet-write.mjs";
import { triggerDeploy, isDeployHookConfigured } from "./lib/deploy.mjs";

function parseArgs(argv) {
  const opts = {
    topic: "",
    category: "",
    tags: "",
    author: "GxG",
    draft: false,
    image: true,
    local: false,
    context: "",
    textModel: process.env.GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL,
    imageModel: process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
    words: process.env.AI_POST_WORDS || "900-1300",
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i] ?? "";
    if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--category") opts.category = next();
    else if (arg === "--tags") opts.tags = next();
    else if (arg === "--author") opts.author = next();
    else if (arg === "--draft") opts.draft = true;
    else if (arg === "--no-image") opts.image = false;
    else if (arg === "--local-image") opts.localImage = true;
    else if (arg === "--local") opts.local = true;
    else if (arg === "--image-source") opts.imageSource = next();
    else if (arg === "--stock") opts.imageSource = "stock";
    else if (arg === "--source-image") opts.imageSource = "source";
    else if (arg === "--ai-image") opts.imageSource = "gemini";
    else if (arg === "--no-grounding") opts.grounded = false;
    else if (arg === "--no-youtube") opts.youtube = false;
    else if (arg === "--model") opts.textModel = next();
    else if (arg === "--image-model") opts.imageModel = next();
    else if (arg === "--words") opts.words = next();
    else positional.push(arg);
  }
  opts.topic = positional.join(" ").trim();
  return opts;
}

function printHelp() {
  console.log(`
Generate an AI blog post from a topic.

Mac dinh: ghi 1 dong vao Google Sheet (database). Dung --local de ghi file .md.

Commands:
  npm run ai:post -- "Chu de bai viet"
  npm run ai:post -- "AI marketing cho shop nho" --category "Marketing" --tags "AI, ban hang"
  npm run ai:post -- "Kinh nghiem du lich Da Lat" --draft           (ghi Sheet, status=draft)
  npm run ai:post -- "Checklist SEO" --local --local-image          (ghi file .md + anh local)

Environment:
  GEMINI_API_KEY       Required
  GEMINI_TEXT_MODEL    Optional, default ${DEFAULT_TEXT_MODEL}
  GEMINI_IMAGE_MODEL   Optional, default ${DEFAULT_IMAGE_MODEL}
  SHEET_WRITE_URL      De ghi vao Sheet (neu thieu se ghi file .md local)
  R2_*                 De luu anh len Cloudflare R2 (xem huong dan)
`);
}

async function main() {
  await loadDotEnv();
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();
  if (!opts.topic) {
    printHelp();
    throw new Error("Missing topic.");
  }

  const apiKey = requireApiKey();
  const { post, slug, ogImage } = await generatePostBundle(opts, apiKey);

  const toSheet = !opts.local && isSheetWriteConfigured();
  if (!opts.local && !isSheetWriteConfigured()) {
    console.warn("[ai] Chua cau hinh SHEET_WRITE_URL -> ghi file .md local.");
  }

  if (toSheet) {
    const status = opts.draft ? "draft" : "published";
    await appendPostRow({
      title: post.title,
      description: post.description,
      category: post.category || opts.category,
      tags: post.tags,
      body: post.body,
      ogImage,
      status,
    });
    console.log(`[ai] Da them 1 dong vao Sheet (status=${status}): "${post.title}"`);
    if (status === "published" && isDeployHookConfigured()) {
      await triggerDeploy();
      console.log("[ai] Da goi Deploy Hook -> Cloudflare se build lai.");
    }
  } else {
    const outPath = await writePostFile(post, opts, ogImage, slug);
    console.log(`[ai] Created ${path.relative(ROOT, outPath)}`);
  }
  if (ogImage) console.log(`[ai] Image ${ogImage}`);
}

main().catch((err) => {
  console.error("[ai] Error:", err.message);
  process.exit(1);
});
