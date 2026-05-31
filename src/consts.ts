// =============================================================
//  CẤU HÌNH TRANG WEB — chỉnh các giá trị dưới đây cho phù hợp
// =============================================================

/** Tên miền chính thức (KHÔNG có dấu / ở cuối). Dùng cho canonical, OG, sitemap. */
export const SITE_URL = "https://gxg-3un.pages.dev";

/** Tên thương hiệu / tên trang — hiển thị ở header và og:site_name */
export const SITE_NAME = "GxG Blog";

/** Mô tả mặc định của trang (dùng khi bài viết không có description) */
export const SITE_DESCRIPTION =
  "Chia sẻ bài viết, ý tưởng và kiến thức hữu ích — tốc độ nhanh, đọc mượt.";

/** Ngôn ngữ trang */
export const SITE_LANG = "vi";

/** Tác giả mặc định (dùng cho JSON-LD) */
export const DEFAULT_AUTHOR = "GxG";

/** Ảnh OG mặc định khi bài viết không khai báo ogImage (đặt trong /public)
 *  LƯU Ý: Facebook KHÔNG render ảnh SVG cho thẻ preview.
 *  Trước khi lên production, hãy thay bằng ảnh .jpg/.png kích thước 1200×630. */
export const DEFAULT_OG_IMAGE = "/og-default.svg";
