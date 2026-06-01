# Huong dan: Luu tru lau dai (Google Sheet = database, Cloudflare R2 = anh/video)

Tai lieu nay giup ban setup quy trinh chua duoc **nhieu bai viet, anh, video** ma van **mien phi**
va de van hanh. Lam theo thu tu, moi muc chi can lam 1 lan.

## Tong quan

```
Do trend (ai:trends) -> AI viet bai (Gemini) -> Anh/Video len R2 -> Ghi 1 dong vao Google Sheet
   -> Ban duyet trong Sheet (status=published) -> Build -> Cloudflare Pages
```

- **Google Sheet** = noi luu MOI bai viet (1 dong = 1 bai). Ban sua/duyet ngay tren bang tinh.
- **Cloudflare R2** = noi luu file anh + video. Sheet chi giu *duong link* R2 (repo luon nhe).
- **status** trong Sheet: `draft` = chua dang, `published` (hoac de trong) = dang.

---

## A. Cloudflare R2 (kho anh/video)

1. Dang nhap Cloudflare > **R2** > **Create bucket**, dat ten vd `gxg-media`.
2. Vao bucket > **Settings** > **Public access**: bat **r2.dev subdomain** (hoac gan custom domain).
   Copy domain dang `https://pub-xxxxxxxx.r2.dev`.
3. R2 > **Manage R2 API Tokens** > **Create API Token**:
   - Permissions: **Object Read & Write**
   - Tao xong copy: **Access Key ID**, **Secret Access Key**, va **Account ID** (o trang R2).
4. Dien vao `.env`:
   ```env
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=gxg-media
   R2_PUBLIC_BASE=https://pub-xxxxxxxx.r2.dev
   ```
5. Kiem tra: `npm run media:up -- duong-dan/anh-test.png` -> mo link in ra, thay anh = OK.

> Mien phi: 10GB luu tru + bang thong ra **mien phi**. Vuot 10GB chi ~$0.015/GB/thang.

---

## B. Google Sheet lam database

1. Mo Sheet chua bai. Hang 1 la ten cot, can co:
   `title | description | category | tags | pubDate | body | ogImage | status`
2. Doc bai luc build: chia se Sheet "Bat ky ai co link: Nguoi xem", lay link CSV dang
   `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=Posts` -> `.env`:
   ```env
   SHEET_CSV_URL=...
   ```
3. Ghi bai moi (de AI/bot tu them dong): trong Sheet vao **Extensions > Apps Script**, dan toan bo
   file `apps-script-doPost.gs` (co san trong repo), sua `SHEET_NAME` cho dung tab, roi
   **Deploy > New deployment > Web app** (Execute as: Me, Who has access: Anyone). Copy URL `.../exec`:
   ```env
   SHEET_WRITE_URL=https://script.google.com/.../exec
   ```

---

## B2. Anh cover

Mac dinh `IMAGE_SOURCE=source`:

1. **Anh tu bai NGUON** (og:image cua bai bao tim duoc khi grounding) + tu ghi nguon ("Anh: ten-bao")
   o cuoi bai. Sat noi dung nhat.
   > **LUU Y BAN QUYEN:** anh bao chi co the co ban quyen; ghi nguon KHONG tu dong = duoc phep.
   > Uu tien chu de tu nguon cho dung lai; voi blog ca nhan nho rui ro thuong thap nhung khong = 0.
2. Khong lay duoc anh nguon -> tu dong ve **anh co giay phep**: Pexels/Pixabay (neu co
   `PEXELS_API_KEY`/`PIXABAY_API_KEY`, free, khong can ghi nguon) -> Wikimedia (khong can key).

Cac che do khac (dat `IMAGE_SOURCE=` hoac co khi chay):
- `stock` (`--stock`): chi dung anh co giay phep, KHONG lay anh bao -> an toan ban quyen nhat.
- `gemini` (`--ai-image`): anh AI, can bat billing.
- `--no-image`: khong lay anh, dung anh cover gradient tu dong (generate-og.mjs).
- `--source-image`: ep dung che do "source".

> Moi anh deu duoc tu dong **chuyen sang WebP** (nhe hon) va thu nho toi da 1600px truoc khi day R2.
> Ap dung ca cho `npm run media:up` (anh -> WebP, video giu nguyen).

> Moi anh deu duoc tu dong **chuyen sang WebP** (nhe hon, tai nhanh) va thu nho toi da 1600px truoc
> khi day len R2. Ap dung ca cho `npm run media:up` (anh -> WebP, video giu nguyen).

## B3. Chat luong noi dung (grounding) + video

- **Noi dung bam nguon that (BAT BUOC):** truoc khi viet, Gemini **tra Google (grounding)** lay su
  that + so lieu, va them muc "Nguon tham khao" (link) o cuoi bai. **Khong lay duoc nguon -> BO bai**
  (tranh bja). Dung chung `GEMINI_API_KEY`. Muon viet chay (khong can nguon) thi them `--no-grounding`.
- **Video YouTube:** can `YOUTUBE_API_KEY` (free) de tim video VUA lien quan VUA cho phep nhung
  (`videoEmbeddable=true`) - tranh video bi tat nhung (khong mo duoc). Lay key:
  console.cloud.google.com -> bat "YouTube Data API v3" -> Create API key -> dat `YOUTUBE_API_KEY` trong `.env`.
  **Khong co key -> bo qua video** (an toan hon la nhung video hong/sai chu de). Tat hoan toan bang `--no-youtube`.

## C. Tu dong build lai (tuy chon)

Cloudflare Pages > project > **Settings > Builds & deployments > Deploy hooks** > tao hook, copy URL:
```env
DEPLOY_HOOK_URL=https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...
```
Khi tao bai voi `--publish`, script se tu goi hook nay de build lai.

---

## D. Chay hang ngay

```powershell
# 1) Tao bai nhap tu trend (ghi vao Sheet, status=draft)
npm run ai:auto -- --count 2

# 2) Mo Sheet, doc lai, sua neu can, doi status -> published

# 3) Build se chay (tu dong neu co Deploy Hook, hoac chay tay):
npm run build
```

Tao bai tu chu de tu chon (cung ghi vao Sheet):
```powershell
npm run ai:post -- "Chu de cua ban" --draft
```

Muon test offline, KHONG dung Sheet/R2:
```powershell
npm run ai:auto -- --local --local-image
```

---

## E. Video

```powershell
npm run media:up -- duong-dan/video.mp4
```
Lenh in ra link R2 + doan nhung. Dan doan sau vao cot `body` cua dong bai trong Sheet:
```html
<video controls width="100%" src="https://pub-xxxx.r2.dev/videos/2026/06/ten.mp4"></video>
```

> Neu sau nay video nhieu va can phat muot/nhieu do phan giai, co the nang cap sang **Cloudflare
> Stream** (co tinh phi). Hien tai luu thang tren R2 la du va mien phi.

---

## Gioi han mien phi (yen tam lau dai)

- **R2:** 10GB + egress free (~5.000-10.000 anh, hoac vai chuc video ngan).
- **Google Sheet:** ~10 trieu o/bang -> thua cho hang nghin bai.
- **Cloudflare Pages free:** 20.000 file/lan deploy (con rat xa).
