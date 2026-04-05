/**
 * Camp Spin Off - Camper Registration Form Script
 *
 * This script handles form submissions from the camper registration form
 * and appends the data to a Google Sheet, then generates a formatted
 * summary in a linked Google Doc.
 *
 * Setup:
 *  1. Open your Google Form → Script Editor (Extensions > Apps Script).
 *  2. Paste this file's contents.
 *  3. Set SHEET_ID to the ID of your destination Google Sheet.
 *  4. Set DOC_ID to the ID of your destination Google Doc (optional).
 *  5. Create a trigger: onFormSubmit → "From form" → "On form submit".
 */

// ── Configuration ────────────────────────────────────────────────────────────
var SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE"; // Replace with your Sheet ID
var DOC_ID   = "YOUR_GOOGLE_DOC_ID_HERE";   // Replace with your Doc ID (optional)
// ─────────────────────────────────────────────────────────────────────────────


/**
 * Main trigger – fires when the form is submitted.
 * @param {GoogleAppsScript.Events.FormsOnFormSubmit} e
 */
function onFormSubmit(e) {
  var response = e.response;
  var data     = parseResponse(response);

  writeToSheet(data);
  writeToDoc(data);
}


/**
 * Parses a FormResponse into a plain object keyed by question title.
 */
function parseResponse(response) {
  var data = {
    timestamp: response.getTimestamp()
  };

  var itemResponses = response.getItemResponses();
  for (var i = 0; i < itemResponses.length; i++) {
    var item  = itemResponses[i];
    var title = item.getItem().getTitle().trim();
    var value = item.getResponse();

    // File-upload questions return an array of IDs; join them.
    if (Array.isArray(value)) {
      value = value.join(", ");
    }

    data[title] = value || "";
  }

  return data;
}


/**
 * Appends one row to the destination Google Sheet.
 * The header row is created automatically on the first submission.
 */
function writeToSheet(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheets()[0]; // Uses the first sheet tab

  var HEADERS = [
    "Timestamp",
    // ── Camper Information ──────────────────────────────────────────────────
    "Camper First Name",
    "Camper Last Name",
    "Camper Gender",
    "Camper Phone Number",
    "Camper Email",
    "Camper Date of Birth",
    "How old is the Camper?",
    "School Grade",
    "What is the name of the middle or high school the camper attends?",
    "Camper Type",
    "Camper T-Shirt Size",
    "Social Media",                           // Camper social media
    "How did you hear about Camp Spin Off?",
    // ── Parent / Guardian ───────────────────────────────────────────────────
    "Parent First Name",
    "Parent Last Name",
    "Parent Cell Phone Number",
    "Parent Work Phone Number",
    "Parent Email",
    "Social Media_parent",                    // Parent social media (de-duped key)
    "Address",                                // Parent address
    // ── Emergency Contact ───────────────────────────────────────────────────
    "Emergency Contact Name",
    "Emergency Contact Cell Phone Number",
    "Relationship to Camper",                 // Emergency contact relationship
    // ── Pickup Authorization ────────────────────────────────────────────────
    "Pickup Authorization Names",
    // ── Insurance ───────────────────────────────────────────────────────────
    "Insurance Carrier",
    "Insurance Policy Number",
    "First Name of Responsible Party",
    "Last Name of Responsible Party",
    "Relationship to Camper_insurance",       // Responsible party relationship
    "Address_insurance",                      // Responsible party address
    // ── Physicians ──────────────────────────────────────────────────────────
    "First Name of Family Physician",
    "Last Name of Family Physician",
    "Family Physician Phone Number",
    "First Name of Family Dentist/Orthodontist",
    "Last Name of Family Dentist/Orthodontist",
    "Family Dentist/Orthodontist Phone Number",
    // ── Medical / Dietary ───────────────────────────────────────────────────
    "Camper Special Dietary Needs",
    "Ever been hospitalized?",
    "Ever had surgery?",
    "Recurrent/Chronic Illness?",
    "Had a recent infectious disease?",
    "Had a recent injury?",
    "Had asthma/wheezing/shortness of breath?",
    "Have diabetes?",
    "Had seizures?",
    "Wear glasses, contacts, or protective eye wear?",
    "Had fainting or dizziness?",
    "Passed out/had chest pain during exercise?",
    "Had mononucleosis (\"mono\") during the past 12 months?",
    "If female, have problems with periods/menstruation?",
    "Have problems with falling asleep/sleepwalking?",
    "Ever had back/joint problems?",
    "Have a history of bedwetting?",
    "Have problems with diarrhea/constipation?",
    "Have any skin problems?",
    "Traveled outside the country in the past 9 months?",
    // ── Vaccinations ────────────────────────────────────────────────────────
    "Polio (OPV or IPV) Date",
    "DTP/DTap/DT/TD Date:",
    "MMR Date:",
    "Hepatitis B Date:",
    "Varicella (Chicken Pox) Date:",
    "Immunization Records",
    // ── Signatures / Consents ───────────────────────────────────────────────
    "Parent or Guardian Digital Signature",
    "Parent or Guardians Digital Signature Confirmation for Medical",
    "Parent or Guardian Digital Signature for Media",
    "Parent or Guardians Digital Signature Confirmation for Media Release:",
    "Parent or Guardian Digital Signature for Zero Tolerance Policy & Code of Conduct",
    "Parent or Guardians Digital Signature Confirmation for Zero Tolerance Policy & Code of Conduct",
    "Camper Digital Signature for Zero Tolerance Policy & Code of Conduct",
    "Camper Digital Signature Confirmation for Zero Tolerance Policy & Code of Conduct",
    "Parent or Guardian Digital Signature for Registration Permission:",
    "Parent or Guardian Digital Signature for Registration Permission: (Confirmation)",
    "Parent or Guardian Digital Signature for Release of Responsibility",
    "Parent or Guardian Digital Signature for Release of Responsibility (Confirmation)",
    // ── Payment / Shuttle ───────────────────────────────────────────────────
    "Shuttle Reservations"
  ];

  // Write headers if the sheet is empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }

  // Build the row in the same order as HEADERS
  var row = [
    data["timestamp"],
    data["Camper First Name"],
    data["Camper Last Name"],
    data["Camper Gender"],
    data["Camper Phone Number"],
    data["Camper Email"],
    data["Camper Date of Birth"],
    data["How old is the Camper?"],
    data["School Grade"],
    data["What is the name of the middle or high school the camper attends?"],
    data["Camper Type"],
    data["Camper T-Shirt Size"],
    data["Social Media"],
    data["How did you hear about Camp Spin Off?"],
    data["Parent First Name"],
    data["Parent Last Name"],
    data["Parent Cell Phone Number"],
    data["Parent Work Phone Number"],
    data["Parent Email"],
    data["Social Media"],                    // same field title – second occurrence
    data["Address"],
    data["Emergency Contact Name"],
    data["Emergency Contact Cell Phone Number"],
    data["Relationship to Camper"],
    data["Pickup Authorization Names"],
    data["Insurance Carrier"],
    data["Insurance Policy Number"],
    data["First Name of Responsible Party"],
    data["Last Name of Responsible Party"],
    data["Relationship to Camper"],          // second occurrence
    data["Address"],                         // second occurrence
    data["First Name of Family Physician"],
    data["Last Name of Family Physician"],
    data["Family Physician Phone Number"],
    data["First Name of Family Dentist/Orthodontist"],
    data["Last Name of Family Dentist/Orthodontist"],
    data["Family Dentist/Orthodontist Phone Number"],
    data["Camper Special Dietary Needs"],
    data["Ever been hospitalized?"],
    data["Ever had surgery?"],
    data["Recurrent/Chronic Illness?"],
    data["Had a recent infectious disease?"],
    data["Had a recent injury?"],
    data["Had asthma/wheezing/shortness of breath?"],
    data["Have diabetes?"],
    data["Had seizures?"],
    data["Wear glasses, contacts, or protective eye wear?"],
    data["Had fainting or dizziness?"],
    data["Passed out/had chest pain during exercise?"],
    data["Had mononucleosis (\"mono\") during the past 12 months?"],
    data["If female, have problems with periods/menstruation?"],
    data["Have problems with falling asleep/sleepwalking?"],
    data["Ever had back/joint problems?"],
    data["Have a history of bedwetting?"],
    data["Have problems with diarrhea/constipation?"],
    data["Have any skin problems?"],
    data["Traveled outside the country in the past 9 months?"],
    data["Polio (OPV or IPV) Date"],
    data["DTP/DTap/DT/TD Date:"],
    data["MMR Date:"],
    data["Hepatitis B Date:"],
    data["Varicella (Chicken Pox) Date:"],
    data["Immunization Records"],
    data["Parent or Guardian Digital Signature"],
    data["Parent or Guardians Digital Signature Confirmation for Medical"],
    data["Parent or Guardian Digital Signature for Media"],
    data["Parent or Guardians Digital Signature Confirmation for Media Release:"],
    data["Parent or Guardian Digital Signature for Zero Tolerance Policy & Code of Conduct"],
    data["Parent or Guardians Digital Signature Confirmation for Zero Tolerance Policy & Code of Conduct"],
    data["Camper Digital Signature for Zero Tolerance Policy & Code of Conduct"],
    data["Camper Digital Signature Confirmation for Zero Tolerance Policy & Code of Conduct"],
    data["Parent or Guardian Digital Signature for Registration Permission:"],
    data["Parent or Guardian Digital Signature for Registration Permission:"], // confirmation
    data["Parent or Guardian Digital Signature for Release of Responsibility"],
    data["Parent or Guardian Digital Signature for Release of Responsibility"], // confirmation
    data["Shuttle Reservations"]
  ];

  sheet.appendRow(row);
}


/**
 * Appends a formatted camper summary to the destination Google Doc.
 */
function writeToDoc(data) {
  if (DOC_ID === "YOUR_GOOGLE_DOC_ID_HERE") return; // Skip if not configured

  var doc  = DocumentApp.openById(DOC_ID);
  var body = doc.getBody();

  var camperName = (data["Camper First Name"] || "") + " " + (data["Camper Last Name"] || "");
  var ts         = data["timestamp"] ? Utilities.formatDate(
    new Date(data["timestamp"]),
    Session.getScriptTimeZone(),
    "MM/dd/yyyy hh:mm a"
  ) : "";

  body.appendHorizontalRule();

  // Title
  var title = body.appendParagraph("Camper Registration: " + camperName);
  title.setHeading(DocumentApp.ParagraphHeading.HEADING1);

  body.appendParagraph("Submitted: " + ts).setItalic(true);

  // ── Helper to append a section heading ──────────────────────────────────
  function section(label) {
    var p = body.appendParagraph(label);
    p.setHeading(DocumentApp.ParagraphHeading.HEADING2);
  }

  // ── Helper to append a labelled field ───────────────────────────────────
  function field(label, value) {
    if (!value) return;
    var p    = body.appendParagraph("");
    var bold = p.appendText(label + ": ");
    bold.setBold(true);
    p.appendText(value);
  }

  // ── Camper Information ───────────────────────────────────────────────────
  section("Camper Information");
  field("First Name",        data["Camper First Name"]);
  field("Last Name",         data["Camper Last Name"]);
  field("Gender",            data["Camper Gender"]);
  field("Phone Number",      data["Camper Phone Number"]);
  field("Email",             data["Camper Email"]);
  field("Date of Birth",     data["Camper Date of Birth"]);
  field("Age",               data["How old is the Camper?"]);
  field("School Grade",      data["School Grade"]);
  field("School Name",       data["What is the name of the middle or high school the camper attends?"]);
  field("Camper Type",       data["Camper Type"]);
  field("T-Shirt Size",      data["Camper T-Shirt Size"]);
  field("Social Media",      data["Social Media"]);
  field("Heard About Us",    data["How did you hear about Camp Spin Off?"]);

  // ── Parent / Guardian ────────────────────────────────────────────────────
  section("Parent or Guardian Information");
  field("First Name",        data["Parent First Name"]);
  field("Last Name",         data["Parent Last Name"]);
  field("Cell Phone",        data["Parent Cell Phone Number"]);
  field("Work Phone",        data["Parent Work Phone Number"]);
  field("Email",             data["Parent Email"]);
  field("Social Media",      data["Social Media"]);
  field("Address",           data["Address"]);

  // ── Emergency Contact ────────────────────────────────────────────────────
  section("Emergency Contact Information");
  field("Name",              data["Emergency Contact Name"]);
  field("Cell Phone",        data["Emergency Contact Cell Phone Number"]);
  field("Relationship",      data["Relationship to Camper"]);

  // ── Pickup Authorization ─────────────────────────────────────────────────
  section("Pickup Authorization");
  field("Authorized Names",  data["Pickup Authorization Names"]);

  // ── Insurance ────────────────────────────────────────────────────────────
  section("Insurance Information");
  field("Carrier",           data["Insurance Carrier"]);
  field("Policy Number",     data["Insurance Policy Number"]);
  field("Responsible Party First Name", data["First Name of Responsible Party"]);
  field("Responsible Party Last Name",  data["Last Name of Responsible Party"]);
  field("Relationship",      data["Relationship to Camper"]);
  field("Address",           data["Address"]);
  field("Family Physician",  (data["First Name of Family Physician"] || "") + " " +
                             (data["Last Name of Family Physician"] || ""));
  field("Physician Phone",   data["Family Physician Phone Number"]);
  field("Family Dentist/Orthodontist",
                             (data["First Name of Family Dentist/Orthodontist"] || "") + " " +
                             (data["Last Name of Family Dentist/Orthodontist"] || ""));
  field("Dentist Phone",     data["Family Dentist/Orthodontist Phone Number"]);

  // ── Medical / Dietary ────────────────────────────────────────────────────
  section("Camper Medical Conditions & Dietary Needs");
  field("Special Dietary Needs",              data["Camper Special Dietary Needs"]);
  field("Ever been hospitalized?",            data["Ever been hospitalized?"]);
  field("Ever had surgery?",                  data["Ever had surgery?"]);
  field("Recurrent/Chronic Illness?",         data["Recurrent/Chronic Illness?"]);
  field("Recent infectious disease?",         data["Had a recent infectious disease?"]);
  field("Recent injury?",                     data["Had a recent injury?"]);
  field("Asthma/wheezing/shortness of breath?", data["Had asthma/wheezing/shortness of breath?"]);
  field("Diabetes?",                          data["Have diabetes?"]);
  field("Seizures?",                          data["Had seizures?"]);
  field("Glasses/contacts/eye wear?",         data["Wear glasses, contacts, or protective eye wear?"]);
  field("Fainting or dizziness?",             data["Had fainting or dizziness?"]);
  field("Passed out/chest pain during exercise?", data["Passed out/had chest pain during exercise?"]);
  field("Mononucleosis (past 12 months)?",    data["Had mononucleosis (\"mono\") during the past 12 months?"]);
  field("Menstruation problems?",             data["If female, have problems with periods/menstruation?"]);
  field("Sleep problems/sleepwalking?",       data["Have problems with falling asleep/sleepwalking?"]);
  field("Back/joint problems?",               data["Ever had back/joint problems?"]);
  field("Bedwetting?",                        data["Have a history of bedwetting?"]);
  field("Diarrhea/constipation?",             data["Have problems with diarrhea/constipation?"]);
  field("Skin problems?",                     data["Have any skin problems?"]);
  field("Traveled outside country (9 months)?", data["Traveled outside the country in the past 9 months?"]);

  // ── Vaccinations ─────────────────────────────────────────────────────────
  section("Camper Vaccination Records");
  field("Polio (OPV or IPV)",       data["Polio (OPV or IPV) Date"]);
  field("DTP/DTap/DT/TD",           data["DTP/DTap/DT/TD Date:"]);
  field("MMR",                      data["MMR Date:"]);
  field("Hepatitis B",              data["Hepatitis B Date:"]);
  field("Varicella (Chicken Pox)",  data["Varicella (Chicken Pox) Date:"]);
  field("Immunization Records",     data["Immunization Records"]);

  // ── Consents & Signatures ─────────────────────────────────────────────────
  section("Consents & Signatures");
  field("Medical Consent – Parent Signature",         data["Parent or Guardian Digital Signature"]);
  field("Medical Consent – Confirmation",             data["Parent or Guardians Digital Signature Confirmation for Medical"]);
  field("Media Consent – Parent Signature",           data["Parent or Guardian Digital Signature for Media"]);
  field("Media Consent – Confirmation",               data["Parent or Guardians Digital Signature Confirmation for Media Release:"]);
  field("Zero Tolerance – Parent Signature",          data["Parent or Guardian Digital Signature for Zero Tolerance Policy & Code of Conduct"]);
  field("Zero Tolerance – Parent Confirmation",       data["Parent or Guardians Digital Signature Confirmation for Zero Tolerance Policy & Code of Conduct"]);
  field("Zero Tolerance – Camper Signature",          data["Camper Digital Signature for Zero Tolerance Policy & Code of Conduct"]);
  field("Zero Tolerance – Camper Confirmation",       data["Camper Digital Signature Confirmation for Zero Tolerance Policy & Code of Conduct"]);
  field("Registration Permission – Parent Signature", data["Parent or Guardian Digital Signature for Registration Permission:"]);
  field("Release of Responsibility – Parent Signature", data["Parent or Guardian Digital Signature for Release of Responsibility"]);

  // ── Payment / Shuttle ─────────────────────────────────────────────────────
  section("Registration Payment");
  field("Shuttle Reservations", data["Shuttle Reservations"]);

  doc.saveAndClose();
}
