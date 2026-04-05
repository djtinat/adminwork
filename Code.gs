/**
 * Pulls scholarship application data from Gmail into the Google Sheet.
 * Uses a "Processed IDs" sheet to track which emails have already been added,
 * preventing duplicate rows.
 *
 * Setup:
 *   1. Open your Google Sheet -> Extensions -> Apps Script
 *   2. Paste this code into Code.gs
 *   3. Update GMAIL_QUERY below to match the emails you want to process
 *   4. Run processEmails() manually or set a time-driven trigger
 */

// ── Configuration ──────────────────────────────────────────────────────────────
var GMAIL_QUERY = 'subject:"Scholarship applications 2026"'; // adjust to match your emails
var DATA_SHEET_NAME = 'Sheet1';          // name of the sheet where data goes
var PROCESSED_SHEET_NAME = 'Processed IDs'; // hidden tracking sheet

// ── Main entry point ───────────────────────────────────────────────────────────
function processEmails() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dataSheet = ss.getSheetByName(DATA_SHEET_NAME);
  var processedSheet = getOrCreateProcessedSheet(ss);

  // Load the set of already-processed message IDs
  var processedIds = loadProcessedIds(processedSheet);

  var threads = GmailApp.search(GMAIL_QUERY);

  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();

    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      var messageId = message.getId();

      // Skip emails we have already processed
      if (processedIds[messageId]) {
        continue;
      }

      var rowData = extractDataFromMessage(message);

      if (rowData) {
        dataSheet.appendRow(rowData);

        // Record the message ID so we never process it again
        processedSheet.appendRow([messageId, new Date()]);
        processedIds[messageId] = true;
      }
    }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Returns (or creates) the hidden sheet that stores processed message IDs.
 */
function getOrCreateProcessedSheet(ss) {
  var sheet = ss.getSheetByName(PROCESSED_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(PROCESSED_SHEET_NAME);
    sheet.appendRow(['Message ID', 'Processed At']);
    // Hide the tracking sheet so it stays out of the way
    sheet.hideSheet();
  }
  return sheet;
}

/**
 * Loads all previously processed message IDs into a lookup object.
 */
function loadProcessedIds(processedSheet) {
  var ids = {};
  var data = processedSheet.getDataRange().getValues();
  // Skip header row (index 0)
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      ids[data[i][0]] = true;
    }
  }
  return ids;
}

/**
 * Extracts scholarship application fields from an email message.
 *
 * Adjust the field names below to match the exact labels in your
 * form-notification emails.  The current list matches the columns
 * visible in the spreadsheet screenshot.
 */
function extractDataFromMessage(message) {
  var body = message.getPlainBody();
  if (!body) return null;

  var fields = {
    'Camper First Name': '',
    'Camper Last Name': '',
    'Camper Gender': '',
    'Camper Phone': '',
    'Camper Email': '',
    'Camper Date of Birth': '',
    'How old is the camper': '',
    'School Grade': '',
    'What is the name of the school': '',
    'Cohort Type': '',
    'Camper T-Shirt Size': ''
  };

  for (var label in fields) {
    // Matches patterns like "Field Label: value" in the email body
    var regex = new RegExp(label + '\\s*[:=]\\s*(.+)', 'i');
    var match = body.match(regex);
    if (match) {
      fields[label] = match[1].trim();
    }
  }

  var dateProcessed = message.getDate();

  return [
    dateProcessed,
    fields['Camper First Name'],
    fields['Camper Last Name'],
    fields['Camper Gender'],
    fields['Camper Phone'],
    fields['Camper Email'],
    fields['Camper Date of Birth'],
    fields['How old is the camper'],
    fields['School Grade'],
    fields['What is the name of the school'],
    fields['Cohort Type'],
    fields['Camper T-Shirt Size']
  ];
}

/**
 * One-time utility: removes duplicate rows already in the sheet.
 * Keeps the first occurrence based on Camper Email + Camper First Name + Camper Last Name.
 * Run this once to clean up existing duplicates, then rely on processEmails()
 * to prevent new ones.
 */
function removeDuplicates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DATA_SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  var seen = {};
  var rowsToDelete = [];

  // Start at row index 1 to skip the header
  for (var i = 1; i < data.length; i++) {
    // Build a unique key from name + email columns (B, C, F → indices 1, 2, 5)
    var key = String(data[i][1]).trim().toLowerCase() + '|' +
              String(data[i][2]).trim().toLowerCase() + '|' +
              String(data[i][5]).trim().toLowerCase();

    if (seen[key]) {
      rowsToDelete.push(i + 1); // sheet rows are 1-indexed
    } else {
      seen[key] = true;
    }
  }

  // Delete from bottom to top so row indices stay valid
  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  SpreadsheetApp.getUi().alert('Removed ' + rowsToDelete.length + ' duplicate row(s).');
}
