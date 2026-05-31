import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_NAME, SITE_DESCRIPTION } from "../consts";
import { slugify } from "../utils";

export async function GET(context) {
  const posts = (await getCollection("posts", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/bai-viet/${slugify(post.data.title)}/`,
    })),
  });
}
