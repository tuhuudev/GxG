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
  return `${minutes} phút đọc`;
}

/** Đường dẫn bài viết từ tiêu đề. */
export function postUrl(title: string): string {
  return `/bai-viet/${slugify(title)}`;
}

/** Đường dẫn trang chuyên mục từ tên chuyên mục. */
export function categoryUrl(category: string): string {
  return `/danh-muc/${slugify(category)}`;
}
