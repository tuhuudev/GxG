// =============================================================
//  CẤU HÌNH TRANG WEB — chỉnh các giá trị dưới đây cho phù hợp
// =============================================================

/** Tên miền chính thức (KHÔNG có dấu / ở cuối). Dùng cho canonical, OG, sitemap. */
export const SITE_URL = "https://gxg-3un.pages.dev";

/** Tên thương hiệu / tên trang — hiển thị ở header và og:site_name */
export const SITE_NAME = "Mystery Box";

/** Mô tả mặc định của trang (dùng khi bài viết không có description) */
export const SITE_DESCRIPTION =
  "Mind-blowing facts and unsolved mysteries — about space, the human body, history, animals, psychology, and the universe — told with a dark, cinematic twist in under a minute.";

/** Ngôn ngữ trang */
export const SITE_LANG = "en";

/** Tác giả mặc định (dùng cho JSON-LD) */
export const DEFAULT_AUTHOR = "Mystery Box";

/** Link Fanpage Facebook (dùng cho nút "Theo dõi" và footer). Đổi thành trang của bạn. */
export const FACEBOOK_URL = "https://www.facebook.com/mysteryboxfacts";

/** Kênh YouTube liên kết (dùng cho sameAs + cross-promote). Để trống nếu chưa có. */
export const YOUTUBE_URL = "https://www.youtube.com/@mysteryboxfacts";

/** @username Twitter/X cho thẻ twitter:site (vd "@gxgblog"). Để trống nếu chưa có. */
export const TWITTER_HANDLE = "";

/** Hồ sơ mạng xã hội của trang -> JSON-LD Organization.sameAs (giúp Google liên kết thực thể). */
export const SOCIAL_LINKS = [FACEBOOK_URL, YOUTUBE_URL].filter(
  (u) => u && !u.endsWith("facebook.com/")
);

/** Logo trang (PNG, dùng cho JSON-LD publisher). Đặt trong /public. */
export const SITE_LOGO = "/logo.png";

/** Analytics (để trống = tắt). Plausible: điền domain (vd "gxg.com").
 *  GA4: điền Measurement ID (vd "G-XXXXXXX"). Có thể bật cả hai. */
export const PLAUSIBLE_DOMAIN = "";
export const GA4_ID = "";

/** Bình luận giscus (GitHub Discussions). Để trống repo = tắt.
 *  Lấy thông số tại https://giscus.app (repo phải bật Discussions + cài app giscus). */
export const GISCUS = {
  repo: "", // "tuhuudev/GxG"
  repoId: "",
  category: "Announcements",
  categoryId: "",
};

/** Ảnh OG mặc định khi bài viết không khai báo ogImage (PNG 1200×630, tự sinh ở build).
 *  KHÔNG dùng SVG: Facebook không render SVG cho thẻ preview. */
export const DEFAULT_OG_IMAGE = "/og-default.png";
