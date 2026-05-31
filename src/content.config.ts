import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Content Collection cho bài viết — đọc tất cả file .md trong src/content/posts
const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // Ảnh OG/thumbnail — nên 1200x630 để Facebook hiển thị đẹp
    ogImage: z.string().optional(),
    category: z.string().default("Khác"),
    tags: z.array(z.string()).default([]),
    author: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
