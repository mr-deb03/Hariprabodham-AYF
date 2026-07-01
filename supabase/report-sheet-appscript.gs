/**
 * Google Apps Script — append finalized attendance reports to a Google Sheet.
 *
 * SETUP (one time):
 *   1. Create/open a Google Sheet.
 *   2. Extensions → Apps Script. Delete any code, paste this, Save.
 *   3. Deploy → New deployment → gear icon → "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      → Deploy → copy the Web app URL (ends in /exec).
 *   4. Put that URL in .env.local and Vercel as:
 *        REACT_APP_REPORT_SHEET_WEBHOOK=<the /exec url>
 *
 * The portal POSTs JSON like:
 *   { date, day, savedBy, rows: [{ mandal, mandalName, present, absent, total,
 *                                  presentNames: [...], absentNames: [...] }] }
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Reports") || ss.insertSheet("Reports");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Saved At", "Date", "Day", "Mandal",
        "Present", "Absent", "Total",
        "Present Names", "Absent Names", "Saved By",
      ]);
    }
    var now = new Date();
    (data.rows || []).forEach(function (r) {
      sheet.appendRow([
        now, data.date, data.day, r.mandalName || r.mandal,
        r.present, r.absent, r.total,
        (r.presentNames || []).join(", "),
        (r.absentNames || []).join(", "),
        data.savedBy || "",
      ]);
    });
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
