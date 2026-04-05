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
 *
 * TO REUSE FOR A NEW FORM:
 * 1. Copy this file
 * 2. Update SHEET_ID and SHEET_NAME
 * 3. Update the section names (CAMPER FIELDS, SOCIAL FIELDS, etc.)
 *    to match the ALL CAPS section headers in your new email
 * 4. Update the field name arrays to match the labels in your email
 * 5. Update the HEADERS array and the return[] block in parseApplication
 * 6. Run debugEmail() first to verify section headers before going live
 */

var SHEET_ID = "1dMuMGwZT9lHADxREJBXgqaZQb2cw4VRfpYnZrEBvbBs";
var SHEET_NAME = "Scholarship Applications 2026";
var PROCESSED_LABEL = "scholarship-processed";

// Field names must match exactly what appears in the plain text email body
var CAMPER_FIELDS   = ["Name","Date of Birth","Gender","Phone","Email","Address","Skill Level","Scholarship Type","Attend Without Scholarship"];
var SOCIAL_FIELDS   = ["TikTok","Instagram","Twitter / X","Facebook","SoundCloud"];
var GUARDIAN_FIELDS = ["Name","Relationship","Phone","Email","Address","Foster / Group Home","Video Diary Consent","Why This Scholarship"];
var MUSIC_FIELDS    = ["How They Heard","Music Titles / Roles","Instrument(s)","Music Style","Projects (Last 12 Mo)","Hobbies / Interests"];
var ESSAY_FIELDS      = ["Favorite DJ & Why","Inspiration","Overcame a Failure","Expectations for Camp","Parent Support","DJ Goals"];
var FINANCIAL_FIELDS  = ["Household Income","Additional Info"];

function setupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("processApplications").timeBased().everyHours(1).create();
  Logger.log("Trigger set.");
  processApplications();
}

function processApplications() {
  var sheet = getOrCreateSheet();
  var label = getOrCreateLabel(PROCESSED_LABEL);
  var threads = GmailApp.search('subject:"Scholarship Application:" -label:' + PROCESSED_LABEL);
  if (threads.length === 0) { Logger.log("No new applications."); return; }
  Logger.log("Found " + threads.length + " application(s).");
  threads.forEach(function(thread) {
    thread.getMessages().forEach(function(message) {
      try {
        var row = parseApplication(message);
        if (row) { sheet.appendRow(row); Logger.log("Added: " + row[1]); }
      } catch(e) { Logger.log("Error: " + e.message); }
    });
    thread.addLabel(label);
  });
}

function parseApplication(message) {
  var body = message.getPlainBody();
  if (!body) return null;
  var date = message.getDate();

  var camper    = parseByKnownFields(extractSection(body, "CAMPER INFORMATION",  "SOCIAL MEDIA"),           CAMPER_FIELDS);
  var social    = parseByKnownFields(extractSection(body, "SOCIAL MEDIA",        "PARENT / GUARDIAN"),      SOCIAL_FIELDS);
  var guardian  = parseByKnownFields(extractSection(body, "PARENT / GUARDIAN",   "MUSIC BACKGROUND"),       GUARDIAN_FIELDS);
  var music     = parseByKnownFields(extractSection(body, "MUSIC BACKGROUND",    "ESSAY RESPONSES"),        MUSIC_FIELDS);
  var essay     = parseByKnownFields(extractSection(body, "ESSAY RESPONSES",     "FINANCIAL INFORMATION"),  ESSAY_FIELDS);
  var financial = parseByKnownFields(extractSection(body, "FINANCIAL INFORMATION", "UPLOADED DOCUMENTS"),   FINANCIAL_FIELDS);

  return [
    Utilities.formatDate(date, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm"),
    camper["Name"], camper["Date of Birth"], camper["Gender"], camper["Phone"], camper["Email"],
    camper["Address"], camper["Skill Level"], camper["Scholarship Type"], camper["Attend Without Scholarship"],
    social["TikTok"], social["Instagram"], social["Twitter / X"], social["Facebook"], social["SoundCloud"],
    guardian["Name"], guardian["Relationship"], guardian["Phone"], guardian["Email"], guardian["Address"],
    guardian["Foster / Group Home"], guardian["Video Diary Consent"], guardian["Why This Scholarship"],
    music["How They Heard"], music["Music Titles / Roles"], music["Instrument(s)"], music["Music Style"],
    music["Projects (Last 12 Mo)"], music["Hobbies / Interests"],
    essay["Favorite DJ & Why"], essay["Inspiration"], essay["Overcame a Failure"],
    essay["Expectations for Camp"], essay["Parent Support"], essay["DJ Goals"],
    financial["Household Income"], financial["Additional Info"]
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
    if (idx !== -1) positions.push({ name: field, idx: idx, valueStart: idx + field.length });
  });
  positions.sort(function(a, b) { return a.idx - b.idx; });
  for (var i = 0; i < positions.length; i++) {
    var end = i < positions.length - 1 ? positions[i+1].idx : text.length;
    result[positions[i].name] = text.substring(positions[i].valueStart, end).trim();
  }
  return result;
}

// Run this first on any new form to verify section headers before going live
function debugEmail() {
  var threads = GmailApp.search('subject:"Scholarship Application:"');
  if (threads.length === 0) { Logger.log("No emails found."); return; }
  Logger.log(threads[0].getMessages()[0].getPlainBody());
}

function getOrCreateSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    var headers = [
      "Received At","Camper Name","Date of Birth","Gender","Phone","Email","Address",
      "Skill Level","Scholarship Type","Attend Without Scholarship",
      "TikTok","Instagram","Twitter / X","Facebook","SoundCloud",
      "Guardian Name","Relationship","Guardian Phone","Guardian Email","Guardian Address",
      "Foster / Group Home","Video Diary Consent","Why This Scholarship",
      "How They Heard","Music Titles / Roles","Instrument(s)","Music Style",
      "Projects (Last 12 Mo)","Hobbies / Interests",
      "Favorite DJ & Why","Inspiration","Overcame a Failure",
      "Expectations for Camp","Parent Support","DJ Goals",
      "Household Income","Additional Info"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1,1,1,headers.length).setFontWeight("bold").setBackground("#1a1a2e").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOrCreateLabel(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) label = GmailApp.createLabel(name);
  return label;
}
