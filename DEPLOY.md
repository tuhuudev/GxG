# Hướng dẫn Deploy

Trang web build ra **HTML tĩnh** (thư mục `dist/`) nên deploy được lên bất kỳ static host nào. Dưới đây là 3 lựa chọn phổ biến.

## ⚙️ Thông số build chung

| Mục | Giá trị |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 18 trở lên |

> ⚠️ Trước khi deploy: mở `src/consts.ts` đặt đúng `SITE_URL` (tên miền thật), và sửa dòng `Sitemap:` trong `public/robots.txt` cho khớp.

---

## 1. Cloudflare Pages (khuyến nghị — nhanh nhất ở VN, miễn phí)

1. Đẩy code lên GitHub (xem phần cuối).
2. Vào **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Chọn repo, cấu hình:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Output directory: `dist`
4. **Save and Deploy**. Sau ~1 phút có URL `*.pages.dev`.
5. **Custom domains** → thêm tên miền riêng, trỏ DNS theo hướng dẫn.

File `public/_headers` đã cấu hình sẵn cache cho Cloudflare → không cần làm gì thêm.

---

## 2. Vercel

1. Đẩy code lên GitHub.
2. Vào **vercel.com** → **Add New** → **Project** → import repo.
3. Vercel tự nhận Astro. Build command `npm run build`, output `dist`.
4. **Deploy** → thêm domain ở **Settings → Domains**.

---

## 3. Netlify

1. Đẩy code lên GitHub.
2. **app.netlify.com** → **Add new site** → **Import from Git**.
3. Build command `npm run build`, publish directory `dist`.
4. **Deploy** → đổi domain ở **Domain settings**.

File `public/_headers` cũng được Netlify đọc.

---

## 📤 Đẩy code lên GitHub (lần đầu)

```bash
git init
git add .
git commit -m "Khởi tạo trang blog SEO bằng Astro"
git branch -M main
git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git
git push -u origin main
```

Mỗi lần `git push` sau đó, host sẽ tự build & deploy lại.

---

## ✅ Sau khi deploy

1. **Google Search Console** (search.google.com/search-console): thêm domain → submit `https://tenmien.com/sitemap-index.xml`.
2. **Facebook Sharing Debugger** (developers.facebook.com/tools/debug): dán link bài viết → **Scrape Again** để Facebook cập nhật ảnh + tiêu đề preview.
3. Kiểm tra tốc độ bằng **PageSpeed Insights** (pagespeed.web.dev) — mục tiêu 95+ điểm.
