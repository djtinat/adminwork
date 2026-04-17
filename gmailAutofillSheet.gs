/**
 * Gmail → Google Sheet autofill.
 *
 * Setup:
 *   1. Open the target Google Sheet, Extensions → Apps Script.
 *   2. Paste this file.
 *   3. Set SHEET_ID and SHEET_NAME below (or leave SHEET_ID empty to use the
 *      bound spreadsheet).
 *   4. Adjust SEARCH_QUERY and PROCESSED_LABEL to match the emails you want.
 *   5. Run installTrigger() once to schedule hourly polling.
 */

const SHEET_ID = '';                         // '' = use active spreadsheet
const SHEET_NAME = 'Inbox';
const SEARCH_QUERY = 'label:inbox newer_than:7d -label:sheet-logged';
const PROCESSED_LABEL = 'sheet-logged';
const HEADERS = ['Timestamp', 'From', 'Subject', 'Date', 'Snippet', 'Thread URL'];

function autofillFromGmail() {
  const sheet = getSheet_();
  ensureHeaders_(sheet);

  const label = getOrCreateLabel_(PROCESSED_LABEL);
  const threads = GmailApp.search(SEARCH_QUERY, 0, 50);
  if (!threads.length) return;

  const rows = [];
  for (const thread of threads) {
    for (const msg of thread.getMessages()) {
      rows.push(extractRow_(msg, thread));
    }
    thread.addLabel(label);
  }

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length)
         .setValues(rows);
  }
}

function extractRow_(msg, thread) {
  return [
    new Date(),
    msg.getFrom(),
    msg.getSubject(),
    msg.getDate(),
    msg.getPlainBody().slice(0, 500),
    thread.getPermalink(),
  ];
}

function getSheet_() {
  const ss = SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function installTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'autofillFromGmail')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autofillFromGmail').timeBased().everyHours(1).create();
}
