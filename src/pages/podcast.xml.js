// Podcast RSS (audio) — mỗi tập = 1 bài viết ĐÃ có bản đọc mp3 trong public/audio/<slug>.mp3.
// File mp3 do dự án video sinh bằng edge-tts (src/blog_audio.py). Bài chưa có audio thì bỏ qua.
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import fs from "node:fs";
import path from "node:path";
import { SITE_NAME, SITE_DESCRIPTION } from "../consts";
import { slugify } from "../utils";

export async function GET(context) {
  const posts = (await getCollection("posts", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  const items = [];
  for (const post of posts) {
    const slug = slugify(post.data.title);
    const file = path.join(process.cwd(), "public", "audio", `${slug}.mp3`);
    let size;
    try {
      size = fs.statSync(file).size;
    } catch {
      continue; // chưa có bản đọc -> không đưa vào podcast
    }
    items.push({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/bai-viet/${slug}/`,
      enclosure: {
        url: new URL(`/audio/${slug}.mp3`, context.site).href,
        length: size,
        type: "audio/mpeg",
      },
    });
  }

  return rss({
    title: `${SITE_NAME} — Podcast`,
    description: `Audio narrations of posts on ${SITE_NAME}. ${SITE_DESCRIPTION}`,
    site: context.site,
    xmlns: { itunes: "http://www.itunes.com/dtds/podcast-1.0.dtd" },
    customData: [
      `<language>en</language>`,
      `<itunes:author>${SITE_NAME}</itunes:author>`,
      `<itunes:category text="Education"/>`,
      `<itunes:explicit>false</itunes:explicit>`,
    ].join(""),
    items,
  });
}
