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

var HEADERS = [
  "Received At",
  "Camper Name",
  "Date of Birth",
  "Gender",
  "Phone",
  "Email",
  "Address",
  "Skill Level",
  "Scholarship Type",
  "Attend Without Scholarship",
  "TikTok",
  "Instagram",
  "Twitter / X",
  "Facebook",
  "SoundCloud"
];

// Known field names per section — order matters, used as delimiters
var CAMPER_FIELDS = [
  "Name",
  "Date of Birth",
  "Gender",
  "Phone",
  "Email",
  "Address",
  "Skill Level",
  "Scholarship Type",
  "Attend Without Scholarship"
];

var SOCIAL_FIELDS = [
  "TikTok",
  "Instagram",
  "Twitter / X",
  "Facebook",
  "SoundCloud"
];

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });

  ScriptApp.newTrigger("processApplications")
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log("Trigger created. Script will run every hour.");
  processApplications();
}

function processApplications() {
  var sheet = getOrCreateSheet();
  var label = getOrCreateLabel(PROCESSED_LABEL);

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
    thread.addLabel(label);
  });
}

function parseApplication(message) {
  var body = message.getPlainBody();
  var date = message.getDate();

  if (!body) return null;

  // Extract each section by its ALL CAPS header
  var camperText = extractSection(body, "CAMPER INFORMATION", "SOCIAL MEDIA");
  var socialText = extractSection(body, "SOCIAL MEDIA", null);

  var camper = parseByKnownFields(camperText, CAMPER_FIELDS);
  var social = parseByKnownFields(socialText, SOCIAL_FIELDS);

  return [
    Utilities.formatDate(date, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm"),
    camper["Name"]                        || "",
    camper["Date of Birth"]               || "",
    camper["Gender"]                      || "",
    camper["Phone"]                       || "",
    camper["Email"]                       || "",
    camper["Address"]                     || "",
    camper["Skill Level"]                 || "",
    camper["Scholarship Type"]            || "",
    camper["Attend Without Scholarship"]  || "",
    social["TikTok"]                      || "",
    social["Instagram"]                   || "",
    social["Twitter / X"]                 || "",
    social["Facebook"]                    || "",
    social["SoundCloud"]                  || ""
  ];
}

/**
 * Pulls out the text between two section headers.
 * If endLabel is null, reads to the end of the body.
 */
function extractSection(body, startLabel, endLabel) {
  var startIdx = body.indexOf(startLabel);
  if (startIdx === -1) return "";
  startIdx += startLabel.length;

  var endIdx = endLabel ? body.indexOf(endLabel, startIdx) : body.length;
  if (endIdx === -1) endIdx = body.length;

  return body.substring(startIdx, endIdx).trim();
}

/**
 * Parses a block of text using known field names as delimiters.
 * Each field value runs from the end of the field name up to the
 * start of the next field name.
 */
function parseByKnownFields(text, fieldNames) {
  var result = {};
  if (!text) return result;

  // Find the position of each known field name in the text
  var positions = [];
  fieldNames.forEach(function(field) {
    var idx = text.indexOf(field);
    if (idx !== -1) {
      positions.push({ name: field, idx: idx, valueStart: idx + field.length });
    }
  });

  // Sort by position so we know where each value ends
  positions.sort(function(a, b) { return a.idx - b.idx; });

  for (var i = 0; i < positions.length; i++) {
    var valueStart = positions[i].valueStart;
    var valueEnd = i < positions.length - 1 ? positions[i + 1].idx : text.length;
    result[positions[i].name] = text.substring(valueStart, valueEnd).trim();
  }

  return result;
}

function getOrCreateSheet() {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    Logger.log("Created sheet: " + SHEET_NAME);
  }

  return sheet;
}

function getOrCreateLabel(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
    Logger.log("Created Gmail label: " + name);
  }
  return label;
}
