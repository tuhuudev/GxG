/**
 * GxG Blog - Apps Script Web App: nhận JSON từ script Node và thêm 1 dòng vào Sheet.
 *
 * CÁCH DÙNG (làm 1 lần):
 *  1. Mở Google Sheet chứa bài viết.
 *  2. Menu: Extensions (Tiện ích mở rộng) -> Apps Script.
 *  3. Xóa code mẫu, dán TOÀN BỘ file này vào.
 *  4. Sửa SHEET_NAME bên dưới cho đúng tên tab (mặc định "Posts").
 *  5. Bấm Deploy (Triển khai) -> New deployment -> chọn type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *  6. Copy "Web app URL" (dạng .../exec) -> dán vào .env: SHEET_WRITE_URL=...
 *
 * Hàng 1 của Sheet phải là tên cột. Script tự khớp theo tên cột, không phụ thuộc thứ tự.
 * Cột nên có: title | description | category | tags | pubDate | body | ogImage | status
 */

var SHEET_NAME = "Posts"; // <-- đổi cho đúng tên tab nếu khác

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    // Đọc tên cột ở hàng 1.
    var lastCol = Math.max(1, sheet.getLastColumn());
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Nếu Sheet trống (chưa có header) thì tạo header mặc định.
    var defaultHeaders = ["title", "description", "category", "tags", "pubDate", "body", "ogImage", "status"];
    var hasHeader = headers.join("").trim() !== "";
    if (!hasHeader) {
      sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
      headers = defaultHeaders;
    }

    // Xếp giá trị theo đúng cột dựa trên tên cột (không phân biệt hoa thường).
    var row = headers.map(function (h) {
      var key = String(h).trim();
      var lower = key.toLowerCase();
      for (var k in data) {
        if (k.toLowerCase() === lower) return data[k];
      }
      return "";
    });

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Cho phép mở URL bằng trình duyệt để kiểm tra (GET).
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, msg: "GxG sheet writer is alive" }))
    .setMimeType(ContentService.MimeType.JSON);
}
