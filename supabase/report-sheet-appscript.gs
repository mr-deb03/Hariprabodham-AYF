/**
 * Google Apps Script — mirror finalized attendance reports into a Google Sheet.
 *
 * SETUP (one time):
 *   1. Create/open a Google Sheet.
 *   2. Extensions → Apps Script. Delete any code, paste this, Save.
 *   3. Deploy → New deployment → gear icon → "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      → Deploy → copy the Web app URL (ends in /exec).
 *   4. Put that URL in .env.local and in the host's env vars as:
 *        REACT_APP_REPORT_SHEET_WEBHOOK=<the /exec url>
 *
 * The portal POSTs JSON like:
 *   { date, day, savedBy, rows: [{ mandal, mandalName, present, absent, total,
 *                                  presentNames: [...], absentNames: [...] }] }
 *
 * A row is KEYED on (Date, Mandal) and overwritten in place. This matters
 * because the portal now finalizes reports on its own as attendance is marked,
 * so the same day arrives more than once — re-sending a day has to correct it,
 * not stack another copy underneath. Re-deploy this script after updating it,
 * or the old append-only version will duplicate rows.
 */

var SHEET_NAME = "Reports";
var HEADER = [
  "Saved At", "Date", "Day", "Mandal",
  "Present", "Absent", "Total",
  "Present Names", "Absent Names", "Saved By",
];

// The Date column comes back as a Date or a string depending on how Sheets
// decided to parse it, so both sides get normalised before they're compared.
function ymd(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value == null ? "" : value).trim().slice(0, 10);
}

function rowKey(date, mandal) {
  return ymd(date) + "|" + String(mandal == null ? "" : mandal).trim();
}

function jsonOut(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADER);

    // Automatic pushes can overlap; without this two of them can both decide a
    // row doesn't exist yet and each append one.
    lock.waitLock(30000);

    var last = sheet.getLastRow();
    var index = {};
    if (last > 1) {
      // Columns B..D — Date, Day, Mandal.
      var existing = sheet.getRange(2, 2, last - 1, 3).getValues();
      for (var i = 0; i < existing.length; i++) {
        index[rowKey(existing[i][0], existing[i][2])] = i + 2;
      }
    }

    var now = new Date();
    var written = 0;
    (data.rows || []).forEach(function (r) {
      var mandal = r.mandalName || r.mandal;
      var row = [
        now, data.date, data.day, mandal,
        r.present, r.absent, r.total,
        (r.presentNames || []).join(", "),
        (r.absentNames || []).join(", "),
        data.savedBy || "",
      ];
      var key = rowKey(data.date, mandal);
      var at = index[key];
      if (at) {
        sheet.getRange(at, 1, 1, row.length).setValues([row]);
      } else {
        sheet.appendRow(row);
        index[key] = sheet.getLastRow();
      }
      written++;
    });

    return jsonOut({ ok: true, written: written });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {
      /* never held */
    }
  }
}
