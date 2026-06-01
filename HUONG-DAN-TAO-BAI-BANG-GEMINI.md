# Huong dan: Tao bai blog tu dong bang Gemini (theo trend)

Tai lieu nay mo ta 3 cong cu, tu thu cong den ban tu dong:

| Lenh | Lam gi |
| --- | --- |
| `npm run ai:trends` | Do tin dang nong tu nhieu nguon, goi y chu de hay |
| `npm run ai:auto` | Tu do trend -> chon chu de tot nhat -> tao bai NHAP (+ anh) |
| `npm run ai:post -- "chu de"` | Tao bai tu mot chu de ban tu nghi ra |

Quy trinh: **do trend (mien phi, khong can key) -> Gemini chon loc & viet bai -> ban duyet -> deploy.**

> **Luu tru lau dai:** Mac dinh, bai moi duoc ghi thanh 1 dong trong **Google Sheet** (database) va
> anh duoc day len **Cloudflare R2**. Cach setup R2 + Sheet xem `HUONG-DAN-LUU-TRU-R2-SHEET.md`.
> Neu chua cau hinh, script tu dong ghi file `.md` + anh local nhu cu (hoac them co `--local`).

## 1. Dat API key (1 lan)

Tao file `.env` o thu muc goc project:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_TEXT_MODEL=gemini-3.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

- `GEMINI_TEXT_MODEL` (tuy chon): mac dinh `gemini-3.5-flash` (ban Flash moi, on dinh).
  Muon dung dung "Flash 3.0" ban preview thi dat `gemini-3-flash-preview`.
- `GEMINI_IMAGE_MODEL` (tuy chon): mac dinh `gemini-2.5-flash-image` (Nano Banana, nhanh + re).
  Muon anh dep hon co the doi sang `gemini-3.1-flash-image` hoac `gemini-3-pro-image`.

Lay key mien phi tai Google AI Studio: https://aistudio.google.com/apikey

De luu anh len R2 va ghi bai vao Google Sheet, dien them cac bien `R2_*`, `SHEET_WRITE_URL`,
`SHEET_CSV_URL`, `DEPLOY_HOOK_URL` (xem `.env.example` va `HUONG-DAN-LUU-TRU-R2-SHEET.md`).

## 2. Xem tin dang nong + goi y chu de

```powershell
npm run ai:trends
```

Lenh nay lay tin tu cac nguon **mien phi, khong can API key**:
- Google Trends VN (tu khoa dang hot)
- Google News VN (tong hop / cong nghe / kinh doanh)
- Hacker News (tin cong nghe, AI tieng Anh)

Sau do Gemini loc bo tin giat gan/nhay cam va goi y 8 chu de blog hay nhat, kem **goc viet**, **chuyen muc**, **tags**, **diem so**.

Cac tuy chon:

```powershell
npm run ai:trends -- --count 10   # lay nhieu chu de hon
npm run ai:trends -- --raw        # chi xem tin tho, KHONG dung Gemini (khong ton key)
npm run ai:trends -- --json       # ghi ket qua ra file trends.json
```

## 3. Ban tu dong: tao bai nhap tu trend (khuyen dung)

```powershell
npm run ai:auto
```

- Tu do trend -> **tra Google lay su that (grounding)** -> viet bai + them muc "Nguon tham khao".
- Lay **anh that co giay phep** (Pexels/Pixabay/Wikimedia) lam cover, va **nhung 1 video YouTube** lien quan.
- Bai luu **dang NHAP** (status=draft) trong Sheet (hoac file `.md` neu chua cau hinh Sheet).
- Ban duyet trong Sheet, doi status=published roi deploy.

Cac tuy chon:

```powershell
npm run ai:auto -- --count 3       # tao 3 bai nhap
npm run ai:auto -- --no-image      # khong lay anh (dung anh gradient tu dong)
npm run ai:auto -- --no-grounding  # khong tra Google (viet nhanh nhung kem chinh xac)
npm run ai:auto -- --no-youtube    # khong nhung video
npm run ai:auto -- --ai-image      # dung anh AI Gemini (can bat billing)
npm run ai:auto -- --publish       # dang thang, KHONG de nhap (can than!)
npm run ai:auto -- --local         # ghi file .md thay vi Sheet (test offline)
```

> Chat luong: noi dung bam nguon that + trich dan, anh/video tu nguon hop phap. Vi la ban nhap,
> nho **xem lai** nguon, anh va video co dung y truoc khi dang.

## 4. Thu cong: tao bai tu chu de tu chon

```powershell
npm run ai:post -- "AI giup chu shop viet noi dung Facebook nhu the nao" --category "Marketing" --tags "AI, marketing, ban hang"
```

Cac tuy chon hay dung:

```powershell
npm run ai:post -- "Checklist SEO cho blog moi" --draft      # tao ban nhap
npm run ai:post -- "Cach lap ke hoach noi dung 30 ngay" --no-image
npm run ai:post -- "Chu de" --model "gemini-3-flash-preview" --image-model "gemini-3.1-flash-image"
```

## 5. Duyet va dang bai

Bai (va anh) tao ra nam o:
- Bai viet: `src/content/posts/*.md`
- Anh cover: `public/ai-images/*.png`

Kiem tra truoc khi deploy:

```powershell
npm run build
npm run preview
```

Bai dang `draft: true` se **khong** xuat hien tren web. Khi da ung y, xoa dong do roi commit/deploy (Cloudflare Pages se tu build).

## 6. Goi y: chay dinh ky (tu dong moi ngay)

Vi `ai:auto` tao ban NHAP an toan, ban co the dat lich chay moi ngay (vd Windows Task Scheduler) de moi sang co san vai bai nhap cho duyet:

```powershell
# Vi du chay luc 7h sang moi ngay (tao 2 bai nhap)
# Tao task trong Task Scheduler, Action chay:
#   cmd /c "cd /d C:\Users\nguye\Documents\GxG && npm run ai:auto -- --count 2"
```

## Khac phuc su co

- **Khong tao duoc anh**: model image co the chua bat o tai khoan/khu vuc cua ban. Chay voi `--no-image`, hoac doi `GEMINI_IMAGE_MODEL` sang model khac.
- **`Missing GEMINI_API_KEY`**: chua co file `.env` hoac thieu dong `GEMINI_API_KEY=...`.
- **`ai:trends` bao loi mang**: mot nguon RSS co the tam loi, script se tu bo qua nguon do. Neu tat ca loi, kiem tra ket noi mang.
- **Model bao loi ten**: ten model co the doi theo thoi gian. Cap nhat `GEMINI_TEXT_MODEL` / `GEMINI_IMAGE_MODEL` trong `.env` cho dung ten API hien hanh.
