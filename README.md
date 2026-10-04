# Mystery Box (gxg)

Blog tĩnh tiếng Anh về sự thật thú vị và bí ẩn chưa có lời giải (vũ trụ, cơ thể người, lịch sử, động vật, tâm lý), đi kèm kênh YouTube [@mysteryboxfacts](https://www.youtube.com/@mysteryboxfacts). Build bằng [Astro 5](https://astro.build), tìm kiếm bằng Pagefind, deploy Cloudflare Pages.

- Live: https://gxg-3un.pages.dev
- Nội dung: `src/content/posts/*.md` (schema ở `src/content.config.ts`)

## Chạy

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # sinh ảnh OG -> astro build -> index Pagefind vào dist/
npm run preview
```

## Tạo bài bằng AI

| Lệnh | Làm gì |
| --- | --- |
| `npm run ai:trends` | Dò trend, gợi ý chủ đề |
| `npm run ai:auto` | Trend → chọn chủ đề → tạo bài **nháp** (+ ảnh) |
| `npm run ai:post -- "chủ đề"` | Tạo bài từ chủ đề cho sẵn |
| `npm run media:up` | Đẩy ảnh/video lên Cloudflare R2 |
| `npm run index:ping` | Báo IndexNow sau khi đăng |

Cần `.env` (copy từ `.env.example`). Chi tiết: [HUONG-DAN-TAO-BAI-BANG-GEMINI.md](HUONG-DAN-TAO-BAI-BANG-GEMINI.md), [HUONG-DAN-LUU-TRU-R2-SHEET.md](HUONG-DAN-LUU-TRU-R2-SHEET.md), [DEPLOY.md](DEPLOY.md).

## Cấu hình

Tên miền, tên trang, mạng xã hội: `src/consts.ts`. Đổi domain thì sửa cả `SITE_URL` và dòng `Sitemap:` trong `public/robots.txt`.
