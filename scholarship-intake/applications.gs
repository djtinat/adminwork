/**
 * Camp Spinoff - Scholarship Application Intake
 *
 * Watches Gmail for "Scholarship Application: [Name]" emails,
 * parses each application, and appends a row to a Google Sheet.
 */

var SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
var SHEET_NAME = "Scholarship Applications 2026";
var PROCESSED_LABEL = "scholarship-processed";

var HEADERS = [
  // Camper
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
  // Social Media
  "TikTok",
  "Instagram",
  "Twitter / X",
  "Facebook",
  "SoundCloud",
  // Parent / Guardian
  "Guardian Name",
  "Relationship",
  "Guardian Phone",
  "Guardian Email",
  "Guardian Address",
  "Foster / Group Home",
  "Video Diary Consent",
  "Why This Scholarship",
  // Music Background
  "How They Heard",
  "Music Titles / Roles",
  "Instrument(s)",
  "Music Style",
  "Projects (Last 12 Mo)",
  "Hobbies / Interests",
  // Essay Responses
  "Favorite DJ & Why",
  "Inspiration",
  "Overcame a Failure",
  "Dream as a DJ / Producer",
  "What You Will Bring to Camp"
];

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

var GUARDIAN_FIELDS = [
  "Name",
  "Relationship",
  "Phone",
  "Email",
  "Address",
  "Foster / Group Home",
  "Video Diary Consent",
  "Why This Scholarship"
];

var MUSIC_FIELDS = [
  "How They Heard",
  "Music Titles / Roles",
  "Instrument(s)",
  "Music Style",
  "Projects (Last 12 Mo)",
  "Hobbies / Interests"
];

var ESSAY_FIELDS = [
  "Favorite DJ & Why",
  "Inspiration",
  "Overcame a Failure",
  "Dream as a DJ / Producer",
  "What You Will Bring to Camp"
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

  var camperText   = extractSection(body, "CAMPER INFORMATION",  "SOCIAL MEDIA");
  var socialText   = extractSection(body, "SOCIAL MEDIA",        "PARENT / GUARDIAN");
  var guardianText = extractSection(body, "PARENT / GUARDIAN",   "MUSIC BACKGROUND");
  var musicText    = extractSection(body, "MUSIC BACKGROUND",    "ESSAY RESPONSES");
  var essayText    = extractSection(body, "ESSAY RESPONSES",     null);

  var camper   = parseByKnownFields(camperText,   CAMPER_FIELDS);
  var social   = parseByKnownFields(socialText,   SOCIAL_FIELDS);
  var guardian = parseByKnownFields(guardianText, GUARDIAN_FIELDS);
  var music    = parseByKnownFields(musicText,    MUSIC_FIELDS);
  var essay    = parseByKnownFields(essayText,    ESSAY_FIELDS);

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
    social["SoundCloud"]                  || "",
    guardian["Name"]                      || "",
    guardian["Relationship"]              || "",
    guardian["Phone"]                     || "",
    guardian["Email"]                     || "",
    guardian["Address"]                   || "",
    guardian["Foster / Group Home"]       || "",
    guardian["Video Diary Consent"]       || "",
    guardian["Why This Scholarship"]      || "",
    music["How They Heard"]               || "",
    music["Music Titles / Roles"]         || "",
    music["Instrument(s)"]                || "",
    music["Music Style"]                  || "",
    music["Projects (Last 12 Mo)"]        || "",
    music["Hobbies / Interests"]          || "",
    essay["Favorite DJ & Why"]            || "",
    essay["Inspiration"]                  || "",
    essay["Overcame a Failure"]           || "",
    essay["Dream as a DJ / Producer"]     || "",
    essay["What You Will Bring to Camp"]  || ""
  ];
}

function extractSection(body, startLabel, endLabel) {
  var startIdx = body.indexOf(startLabel);
  if (startIdx === -1) return "";
  startIdx += startLabel.length;

  var endIdx = endLabel ? body.indexOf(endLabel, startIdx) : body.length;
  if (endIdx === -1) endIdx = body.length;

  return body.substring(startIdx, endIdx).trim();
}

function parseByKnownFields(text, fieldNames) {
  var result = {};
  if (!text) return result;

  var positions = [];
  fieldNames.forEach(function(field) {
    var idx = text.indexOf(field);
    if (idx !== -1) {
      positions.push({ name: field, idx: idx, valueStart: idx + field.length });
    }
  });

  positions.sort(function(a, b) { return a.idx - b.idx; });

  for (var i = 0; i < positions.length; i++) {
    var valueStart = positions[i].valueStart;
    var valueEnd = i < positions.length - 1 ? positions[i + 1].idx : text.length;
    result[positions[i].name] = text.substring(valueStart, valueEnd).trim();
  }

  return result;
}

function formatSheet() {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  sheet.getDataRange().setWrap(true).setVerticalAlignment("top");
  sheet.setFrozenRows(1);

  // Set column widths
  var widths = [
    160, 160, 120, 100, 130, 200, 220, 180, 150, 200,
    130, 160, 130, 130, 200,
    160, 140, 130, 200, 220, 150, 180, 300,
    150, 180, 150, 200, 250, 200,
    300, 300, 300, 300, 300
  ];

  widths.forEach(function(width, i) {
    sheet.setColumnWidth(i + 1, width);
  });

  // Set header row background color
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground("#1a1a2e")
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  Logger.log("Sheet formatted.");
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
