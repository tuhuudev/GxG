/** Chuyển chuỗi tiếng Việt có dấu -> slug URL không dấu, an toàn cho SEO. */
export function slugify(input: string): string {
  return input
    .normalize("NFD") // tách dấu ra khỏi ký tự
    .replace(/[̀-ͯ]/g, "") // xóa dấu thanh
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // bỏ ký tự đặc biệt
    .trim()
    .replace(/\s+/g, "-") // khoảng trắng -> gạch ngang
    .replace(/-+/g, "-"); // gộp nhiều gạch liền nhau
}

/** Định dạng ngày kiểu tiếng Việt: 01 tháng 6, 2026 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Định dạng ngày ISO cho thuộc tính datetime / JSON-LD */
export function isoDate(date: Date): string {
  return date.toISOString();
}

/** Chọn ảnh OG cho 1 bài: ưu tiên ảnh người dùng đặt (ogImage),
 *  nếu không có thì dùng ảnh tự sinh ở /og/<slug>.png */
export function ogImageFor(title: string, explicit?: string): string {
  return explicit ?? `/og/${slugify(title)}.png`;
}

/** Ước lượng thời gian đọc (tiếng Việt ~200 từ/phút) từ nội dung markdown. */
export function readingTime(body: string): string {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

/** Đường dẫn bài viết từ tiêu đề. */
export function postUrl(title: string): string {
  return `/bai-viet/${slugify(title)}`;
}

/** Đường dẫn trang chuyên mục từ tên chuyên mục. */
export function categoryUrl(category: string): string {
  return `/danh-muc/${slugify(category)}`;
}

/** Bảng màu gradient cho chuyên mục (chữ trắng đọc tốt trên mọi màu). */
export const CATEGORY_PALETTE: [string, string][] = [
  ["#3b82f6", "#1e3a8a"], // xanh dương
  ["#10b981", "#065f46"], // xanh lá
  ["#f43f5e", "#9f1239"], // hồng đỏ
  ["#f59e0b", "#92400e"], // cam
  ["#8b5cf6", "#5b21b6"], // tím
  ["#06b6d4", "#155e75"], // xanh ngọc
];

/** Chọn cặp màu gradient ổn định theo tên chuyên mục (cùng tên → cùng màu). */
export function categoryGradient(category: string): { from: string; to: string } {
  let h = 0;
  for (let i = 0; i < category.length; i++) {
    h = (h * 31 + category.charCodeAt(i)) >>> 0;
  }
  const [from, to] = CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
  return { from, to };
}

/** Chuỗi CSS linear-gradient cho chuyên mục. */
export function categoryGradientCss(category: string): string {
  const { from, to } = categoryGradient(category);
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}
