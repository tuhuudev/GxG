# Hướng dẫn: Đăng bài tự động từ Telegram → Gemini → Google Sheet → Blog

Luồng hoạt động:

```
Tin nhắn Telegram → bot + Gemini viết bài → ghi 1 dòng vào Google Sheet
   → bot gọi Cloudflare Deploy Hook → blog build lại → bài lên web (~1-2 phút)
```

Blog đọc Google Sheet lúc build, mỗi dòng = 1 bài viết. Cần làm 4 việc một lần:

---

## 1. Chuẩn bị Google Sheet

Tạo 1 sheet (tab) tên ví dụ `Posts`, **hàng đầu tiên là tên cột** (đúng tên sau):

| Cột | Bắt buộc | Ý nghĩa |
|---|---|---|
| `title` | ✅ | Tiêu đề bài |
| `description` |  | Mô tả ngắn (SEO + thẻ). Bỏ trống → tự lấy tóm tắt từ body |
| `category` |  | Chuyên mục (vd: Công nghệ). Bỏ trống → "Khác" |
| `tags` |  | Các thẻ, ngăn cách bằng dấu phẩy: `AI, công nghệ` |
| `pubDate` |  | Ngày đăng `YYYY-MM-DD`. Bỏ trống → ngày hôm nay |
| `body` | ✅ | Nội dung bài viết dạng **Markdown** (Gemini xuất ra đây) |
| `ogImage` |  | URL ảnh đại diện thật (nếu có). Bỏ trống → dùng ảnh tự sinh |
| `status` |  | `published` để đăng; `draft` thì bỏ qua; để trống = đăng |

> Gợi ý prompt cho Gemini: yêu cầu trả về Markdown cho `body` (dùng `##` cho mục, `-` cho danh sách), và một dòng `description` ngắn ~150 ký tự.

## 2. Lấy link CSV của Sheet

1. Chia sẻ Sheet: **Share → General access → "Anyone with the link" → Viewer**.
2. Link CSV có dạng (thay `<ID>` và tên sheet):
   ```
   https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=Posts
   ```
   `<ID>` là phần trong URL Sheet giữa `/d/` và `/edit`.

## 3. Khai báo link trên Cloudflare Pages

Vào **Cloudflare Pages → project → Settings → Environment variables → Production**:
- Thêm biến: `SHEET_CSV_URL` = link CSV ở bước 2.
- Lưu lại.

> Không đặt biến này thì blog vẫn chạy bình thường, chỉ là bỏ qua phần Sheet.

## 4. Tạo Deploy Hook + cho bot gọi

1. **Cloudflare Pages → Settings → Builds & deployments → Deploy hooks → Create**.
   - Đặt tên (vd `from-telegram`), chọn nhánh `main` → tạo → copy URL (dạng `https://api.cloudflare.com/.../hooks/...`).
2. Trong bot (sau khi ghi xong dòng vào Sheet), gọi 1 HTTP POST tới URL đó:

   **Python:**
   ```python
   import requests
   requests.post("DEPLOY_HOOK_URL")
   ```
   **Google Apps Script:**
   ```js
   UrlFetchApp.fetch("DEPLOY_HOOK_URL", { method: "post" });
   ```
   **n8n:** thêm node HTTP Request (POST) tới URL.

Xong! Mỗi khi có dòng mới + gọi hook → blog tự build và đăng bài.

---

## Kiểm tra thử tại máy (tùy chọn)

```powershell
$env:SHEET_CSV_URL = "https://docs.google.com/.../gviz/tq?tqx=out:csv&sheet=Posts"
npm run build
npm run preview
```
Mở địa chỉ preview để xem bài từ Sheet.

## Lưu ý
- Link CSV công khai = nội dung Sheet ai có link đều xem được (blog vốn công khai nên không sao). Nếu cần riêng tư, có thể nâng cấp lên Google Sheets API + service account sau.
- Endpoint `gviz` cập nhật gần như tức thì; bản "Publish to web" có thể trễ ~5 phút.
- Bài lấy từ Sheet được tạo thành file `sheet-*.md` lúc build (không lưu trong git, build tạo lại mỗi lần).
