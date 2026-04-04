/**
 * Camp Spinoff - Scholarship Application Intake
 *
 * Watches Gmail for "Scholarship Application: [Name]" emails,
 * parses each application, and appends a row to a Google Sheet.
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to script.google.com and create a new project
 * 2. Paste this entire file into the editor
 * 3. Replace SHEET_ID below with your Google Sheet ID
 *    (the long string in the Sheet URL between /d/ and /edit)
 * 4. Click Run > setupTrigger once to authorize and activate
 * 5. Done. The script will check for new applications every hour.
 */

var SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
var SHEET_NAME = "Applications";
var PROCESSED_LABEL = "scholarship-processed";

// Column headers for the sheet (matches the application form fields)
var HEADERS = [
  "Received At",
  "Camper Name",
  "Date of Birth",
  "Gender",
  "Experience Level",
  "Phone",
  "Email",
  "Parent/Guardian Name",
  "Parent Phone",
  "Parent Email",
  "Address",
  "City",
  "State",
  "Zip",
  "Why They Want to Attend",
  "Additional Notes",
  "Raw Submission Date"
];

/**
 * Run this once to set up the hourly trigger.
 * After running, you can delete this function or leave it.
 */
function setupTrigger() {
  // Remove any existing triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });

  // Run processApplications every hour
  ScriptApp.newTrigger("processApplications")
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log("Trigger created. Script will run every hour.");

  // Run once immediately to catch anything already in the inbox
  processApplications();
}

/**
 * Main function. Finds unprocessed scholarship application emails,
 * parses them, and writes each one to the sheet.
 */
function processApplications() {
  var sheet = getOrCreateSheet();
  var label = getOrCreateLabel(PROCESSED_LABEL);

  // Search for scholarship application emails that have not been processed yet
  var threads = GmailApp.search(
    'subject:"Scholarship Application:" -label:' + PROCESSED_LABEL
  );

  if (threads.length === 0) {
    Logger.log("No new applications found.");
    return;
  }

  Logger.log("Found " + threads.length + " new application(s).");

  threads.forEach(function(thread) {
    var messages = thread.getMessages();
    messages.forEach(function(message) {
      try {
        var row = parseApplication(message);
        if (row) {
          sheet.appendRow(row);
          Logger.log("Added application: " + row[1]);
        }
      } catch (e) {
        Logger.log("Error parsing message " + message.getId() + ": " + e.message);
      }
    });

    // Mark thread as processed so we do not pick it up again
    thread.addLabel(label);
  });
}

/**
 * Parses an application email message into a row array.
 * Uses the plain text body which has "Field: Value" pairs.
 */
function parseApplication(message) {
  var body = message.getPlainBody();
  var date = message.getDate();

  if (!body) return null;

  // Pull all "Field: Value" pairs from the plain text body
  var fields = extractFields(body);

  return [
    Utilities.formatDate(date, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm"),
    fields["Name"] || "",
    fields["DOB"] || fields["Date of Birth"] || "",
    fields["Gender"] || "",
    fields["Experience Level"] || fields["Experience"] || "",
    fields["Phone"] || "",
    fields["Email"] || "",
    fields["Parent Name"] || fields["Parent/Guardian Name"] || fields["Guardian Name"] || "",
    fields["Parent Phone"] || fields["Guardian Phone"] || "",
    fields["Parent Email"] || fields["Guardian Email"] || "",
    fields["Address"] || fields["Street"] || "",
    fields["City"] || "",
    fields["State"] || "",
    fields["Zip"] || fields["Zip Code"] || fields["Postal Code"] || "",
    fields["Why"] || fields["Why They Want to Attend"] || fields["Essay"] || fields["Statement"] || "",
    fields["Notes"] || fields["Additional Notes"] || fields["Comments"] || "",
    fields["Submitted"] || fields["Submitted At"] || ""
  ];
}

/**
 * Extracts all "Label: Value" pairs from the plain text body.
 * Returns a plain object with field names as keys.
 */
function extractFields(body) {
  var fields = {};
  var lines = body.split("\n");

  lines.forEach(function(line) {
    line = line.trim();
    var colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      var key = line.substring(0, colonIndex).trim();
      var value = line.substring(colonIndex + 1).trim();
      // Skip lines that look like decorators or separators
      if (key && value && !key.match(/^[-=]+$/) && key.length < 60) {
        fields[key] = value;
      }
    }
  });

  return fields;
}

/**
 * Returns the sheet, creating it with headers if it does not exist.
 */
function getOrCreateSheet() {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);

    // Bold the header row
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");

    Logger.log("Created sheet: " + SHEET_NAME);
  }

  return sheet;
}

/**
 * Returns a Gmail label by name, creating it if it does not exist.
 */
function getOrCreateLabel(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
    Logger.log("Created Gmail label: " + name);
  }
  return label;
}
