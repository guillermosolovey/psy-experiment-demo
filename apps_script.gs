const SHEET_NAME = "responses";

function doGet(e) {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  const header = rows.shift();
  const limit = Number(e.parameter.limit || 200);
  const sessionCode = (e.parameter.session_code || "").trim();
  let data = rows.map((row) => toObject_(header, row));

  if (sessionCode) {
    data = data.filter((row) => row.session_code === sessionCode);
  }

  data.sort((a, b) => new Date(b.timestamp_iso) - new Date(a.timestamp_iso));
  data = data.slice(0, limit);

  return ContentService.createTextOutput(JSON.stringify({ rows: data }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function doPost(e) {
  const sheet = getSheet_();
  const payload = JSON.parse(e.postData.contents);
  const header = getHeader_();
  const row = header.map((key) => payload[key] ?? "");
  sheet.appendRow(row);

  return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function doOptions() {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader("Access-Control-Allow-Origin", "*")
    .setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    .setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  const header = getHeader_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(header);
  }
  return sheet;
}

function getHeader_() {
  return [
    "timestamp_iso",
    "session_code",
    "participant_id",
    "condition",
    "n_trials",
    "n_correct",
    "accuracy",
    "mean_rt_correct_excl",
    "median_rt_correct_excl",
    "device_type",
    "user_agent",
  ];
}

function toObject_(header, row) {
  const obj = {};
  header.forEach((key, index) => {
    obj[key] = row[index];
  });
  return obj;
}
