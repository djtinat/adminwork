/**
 * Camp Spin Off – Camper Registration Form Script
 *
 * Handles form submissions and writes all data to a Google Sheet and
 * a formatted Google Doc entry. Optionally sends a confirmation email
 * to the parent/guardian.
 *
 * SETUP
 * ─────
 * 1. Open your Google Form → Extensions › Apps Script.
 * 2. Replace SHEET_ID, DOC_ID, and (optionally) turn SEND_CONFIRM on.
 * 3. Save, then add a trigger:
 *      onFormSubmit  ›  From form  ›  On form submit
 *
 * IMPORTANT – FIELD ORDER / INDICES
 * ───────────────────────────────────
 * Google Forms returns answers in the exact order questions appear on
 * the form. Because several questions share the same title (e.g.
 * "Social Media", "Address", "Relationship to Camper") we key every
 * field by its 0-based position instead of its title, so nothing ever
 * silently overwrites a duplicate.
 *
 * If you add, remove, or reorder any question in the form you MUST
 * update the matching IDX value below.
 */

// ── Configuration ─────────────────────────────────────────────────────────────
var SHEET_ID     = "YOUR_GOOGLE_SHEET_ID_HERE"; // Google Sheet ID
var DOC_ID       = "YOUR_GOOGLE_DOC_ID_HERE";   // Google Doc ID (set "" to skip)
var SEND_CONFIRM = false;                        // Set true to email parent on submit
// ──────────────────────────────────────────────────────────────────────────────


// ── Field index map (0-based, matches form question order) ────────────────────
var IDX = {

  // ── CAMPER INFORMATION ──────────────────────────────────────────────── 0-12
  CAMPER_FIRST_NAME        :  0,
  CAMPER_LAST_NAME         :  1,
  CAMPER_GENDER            :  2,
  CAMPER_PHONE             :  3,
  CAMPER_EMAIL             :  4,
  CAMPER_DOB               :  5,
  CAMPER_AGE               :  6,
  SCHOOL_GRADE             :  7,
  SCHOOL_NAME              :  8,   // "What is the name of the middle or high school..."
  CAMPER_TYPE              :  9,
  CAMPER_SHIRT_SIZE        : 10,
  CAMPER_SOCIAL_MEDIA      : 11,
  HEARD_ABOUT              : 12,   // "How did you hear about Camp Spin Off?"

  // ── PARENT / GUARDIAN ─────────────────────────────────────────────── 13-19
  PARENT_FIRST_NAME        : 13,
  PARENT_LAST_NAME         : 14,
  PARENT_CELL              : 15,
  PARENT_WORK_PHONE        : 16,
  PARENT_EMAIL             : 17,
  PARENT_SOCIAL_MEDIA      : 18,
  PARENT_ADDRESS           : 19,   // Full address (street, city, state, zip, country)

  // ── EMERGENCY CONTACT ─────────────────────────────────────────────── 20-22
  EMERG_NAME               : 20,
  EMERG_PHONE              : 21,
  EMERG_RELATIONSHIP       : 22,

  // ── PICKUP AUTHORIZATION ──────────────────────────────────────────────── 23
  PICKUP_NAMES             : 23,

  // ── INSURANCE INFORMATION ─────────────────────────────────────────── 24-29
  INS_CARRIER              : 24,
  INS_POLICY_NUM           : 25,
  RESP_FIRST_NAME          : 26,
  RESP_LAST_NAME           : 27,
  RESP_RELATIONSHIP        : 28,
  RESP_ADDRESS             : 29,   // Responsible party full address

  // ── MEDICAL PROVIDERS ─────────────────────────────────────────────── 30-35
  PHYSICIAN_FIRST          : 30,
  PHYSICIAN_LAST           : 31,
  PHYSICIAN_PHONE          : 32,
  DENTIST_FIRST            : 33,
  DENTIST_LAST             : 34,
  DENTIST_PHONE            : 35,

  // ── CAMPER MEDICAL CONDITIONS & DIETARY NEEDS ─────────────────────── 36-40
  DIETARY_NEEDS            : 36,
  MEDICAL_CONDITIONS       : 37,   // "List all medical conditions: physical, emotional, behavioral..."
  ALLERGIES                : 38,   // "Please list ALL drug, food, and/or other dietary sensitivities"
  MEDICATIONS              : 39,   // Current medications the camper takes
  CHRONIC_CONDITIONS       : 40,   // Checkboxes: Bleeding/Clotting, Kidney, Diabetes, Emotional
                                   //   Disorder, Autism, Nervous Disorder, Sickle Cell, Other

  // ── GENERAL HEALTH HISTORY (Yes / No) ─────────────────────────────── 41-59
  MED_HOSPITALIZED         : 41,
  MED_SURGERY              : 42,
  MED_CHRONIC_ILLNESS      : 43,
  MED_INFECTIOUS           : 44,
  MED_INJURY               : 45,
  MED_ASTHMA               : 46,
  MED_DIABETES             : 47,
  MED_SEIZURES             : 48,
  MED_EYEWEAR              : 49,
  MED_FAINTING             : 50,
  MED_CHEST_PAIN           : 51,
  MED_MONO                 : 52,
  MED_MENSTRUATION         : 53,
  MED_SLEEP                : 54,
  MED_BACK_JOINT           : 55,
  MED_BEDWETTING           : 56,
  MED_DIGESTION            : 57,
  MED_SKIN                 : 58,
  MED_TRAVEL               : 59,
  MED_EXPLAIN              : 60,   // "If yes to any of the above, please explain"

  // ── VACCINATION RECORDS ───────────────────────────────────────────── 61-67
  VAX_POLIO                : 61,
  VAX_DTP                  : 62,
  VAX_MMR                  : 63,
  VAX_HEP_B                : 64,
  VAX_VARICELLA            : 65,
  VAX_NO_VACCINATE         : 66,   // "I do not vaccinate my child for religious/personal reasons"
  VAX_NOTES                : 67,   // Additional vaccination notes / exemption explanation
  VAX_RECORDS_FILE         : 68,   // File upload (Drive ID)

  // ── CONSENTS & SIGNATURES ─────────────────────────────────────────── 69-80
  SIG_MEDICAL_PARENT       : 69,
  SIG_MEDICAL_CONFIRM      : 70,

  SIG_MEDIA_PARENT         : 71,
  SIG_MEDIA_CONFIRM        : 72,

  SIG_ZEROTOL_PARENT       : 73,
  SIG_ZEROTOL_PARENT_CONF  : 74,
  SIG_ZEROTOL_CAMPER       : 75,
  SIG_ZEROTOL_CAMPER_CONF  : 76,

  SIG_REG_PERM_PARENT      : 77,
  SIG_REG_PERM_CONFIRM     : 78,

  SIG_RELEASE_PARENT       : 79,
  SIG_RELEASE_CONFIRM      : 80,

  // ── SHUTTLE / PAYMENT ─────────────────────────────────────────────────── 81
  SHUTTLE                  : 81
};
// ──────────────────────────────────────────────────────────────────────────────


/**
 * Trigger entry point – fires on every form submission.
 */
function onFormSubmit(e) {
  var vals = parseResponse(e.response);
  var ts   = e.response.getTimestamp();

  writeToSheet(vals, ts);

  if (DOC_ID && DOC_ID !== "YOUR_GOOGLE_DOC_ID_HERE") {
    writeToDoc(vals, ts);
  }

  if (SEND_CONFIRM && vals[IDX.PARENT_EMAIL]) {
    sendConfirmation(vals, ts);
  }
}


/**
 * Returns an array of response values indexed by question position.
 * Checkbox / multi-select questions return arrays – we join them with
 * a comma so they store cleanly in a spreadsheet cell.
 * File-upload questions return arrays of Drive file IDs.
 */
function parseResponse(response) {
  return response.getItemResponses().map(function(ir) {
    var v = ir.getResponse();
    if (Array.isArray(v)) { return v.join(", "); }
    return v != null ? String(v) : "";
  });
}


/**
 * Writes one data row to the first sheet tab.
 * Creates a styled header row automatically on first use.
 */
function writeToSheet(v, ts) {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

  var HEADERS = [
    "Timestamp",
    // Camper
    "Camper First Name", "Camper Last Name", "Camper Gender",
    "Camper Phone Number", "Camper Email", "Camper Date of Birth",
    "Camper Age", "School Grade", "School Name",
    "Camper Type", "T-Shirt Size", "Camper Social Media",
    "How Did You Hear About Us",
    // Parent / Guardian
    "Parent First Name", "Parent Last Name", "Parent Cell Phone",
    "Parent Work Phone", "Parent Email", "Parent Social Media",
    "Parent Address",
    // Emergency Contact
    "Emergency Contact Name", "Emergency Contact Phone",
    "Emergency Contact Relationship",
    // Pickup
    "Pickup Authorization Names",
    // Insurance
    "Insurance Carrier", "Insurance Policy Number",
    "Responsible Party First Name", "Responsible Party Last Name",
    "Responsible Party Relationship", "Responsible Party Address",
    // Medical Providers
    "Family Physician First Name", "Family Physician Last Name",
    "Family Physician Phone",
    "Family Dentist/Ortho First Name", "Family Dentist/Ortho Last Name",
    "Family Dentist/Ortho Phone",
    // Medical Conditions & Dietary
    "Special Dietary Needs",
    "Medical Conditions",
    "Allergies",
    "Medications",
    "Chronic Conditions",
    // General Health History
    "Hospitalized?", "Surgery?", "Chronic Illness?",
    "Recent Infectious Disease?", "Recent Injury?",
    "Asthma/Wheezing/SOB?", "Diabetes?", "Seizures?",
    "Glasses/Contacts/Eye Wear?", "Fainting/Dizziness?",
    "Passed Out/Chest Pain During Exercise?",
    "Mononucleosis (Past 12 Months)?",
    "Menstruation Problems?", "Sleep Problems/Sleepwalking?",
    "Back/Joint Problems?", "Bedwetting?",
    "Diarrhea/Constipation?", "Skin Problems?",
    "Traveled Outside Country (Past 9 Months)?",
    "Health History Explanation",
    // Vaccinations
    "Polio Date", "DTP/DTap/DT/TD Date", "MMR Date",
    "Hepatitis B Date", "Varicella Date",
    "No Vaccination Reason", "Vaccination Notes",
    "Immunization Records (File ID)",
    // Signatures
    "Medical Consent – Parent Signature",
    "Medical Consent – Confirmation",
    "Media Consent – Parent Signature",
    "Media Consent – Confirmation",
    "Zero Tolerance – Parent Signature",
    "Zero Tolerance – Parent Confirmation",
    "Zero Tolerance – Camper Signature",
    "Zero Tolerance – Camper Confirmation",
    "Registration Permission – Parent Signature",
    "Registration Permission – Confirmation",
    "Release of Responsibility – Parent Signature",
    "Release of Responsibility – Confirmation",
    // Shuttle
    "Shuttle Reservations"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
         .setFontWeight("bold")
         .setBackground("#4a90d9")
         .setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }

  // Timestamp goes first, then the 82 indexed values (IDX 0-81)
  var row = [ts].concat(v);
  sheet.appendRow(row);
}


/**
 * Appends a fully formatted camper entry to the Google Doc.
 */
function writeToDoc(v, ts) {
  var doc  = DocumentApp.openById(DOC_ID);
  var body = doc.getBody();

  var camperName  = trim_(v[IDX.CAMPER_FIRST_NAME]) + " " + trim_(v[IDX.CAMPER_LAST_NAME]);
  var parentName  = trim_(v[IDX.PARENT_FIRST_NAME])  + " " + trim_(v[IDX.PARENT_LAST_NAME]);
  var tsFormatted = Utilities.formatDate(ts, Session.getScriptTimeZone(), "MMMM d, yyyy 'at' h:mm a");

  body.appendHorizontalRule();

  heading1_(body, "Camp Spin Off Registration — " + camperName);
  italic_(body, "Submitted: " + tsFormatted);

  // ── CAMPER INFORMATION ─────────────────────────────────────────────────────
  heading2_(body, "Camper Information");
  field_(body, "First Name",      v[IDX.CAMPER_FIRST_NAME]);
  field_(body, "Last Name",       v[IDX.CAMPER_LAST_NAME]);
  field_(body, "Gender",          v[IDX.CAMPER_GENDER]);
  field_(body, "Phone Number",    v[IDX.CAMPER_PHONE]);
  field_(body, "Email",           v[IDX.CAMPER_EMAIL]);
  field_(body, "Date of Birth",   v[IDX.CAMPER_DOB]);
  field_(body, "Age",             v[IDX.CAMPER_AGE]);
  field_(body, "School Grade",    v[IDX.SCHOOL_GRADE]);
  field_(body, "School Name",     v[IDX.SCHOOL_NAME]);
  field_(body, "Camper Type",     v[IDX.CAMPER_TYPE]);
  field_(body, "T-Shirt Size",    v[IDX.CAMPER_SHIRT_SIZE]);
  field_(body, "Social Media",    v[IDX.CAMPER_SOCIAL_MEDIA]);
  field_(body, "How They Heard",  v[IDX.HEARD_ABOUT]);

  // ── PARENT / GUARDIAN ──────────────────────────────────────────────────────
  heading2_(body, "Parent or Guardian Information");
  field_(body, "First Name",      v[IDX.PARENT_FIRST_NAME]);
  field_(body, "Last Name",       v[IDX.PARENT_LAST_NAME]);
  field_(body, "Cell Phone",      v[IDX.PARENT_CELL]);
  field_(body, "Work Phone",      v[IDX.PARENT_WORK_PHONE]);
  field_(body, "Email",           v[IDX.PARENT_EMAIL]);
  field_(body, "Social Media",    v[IDX.PARENT_SOCIAL_MEDIA]);
  field_(body, "Address",         v[IDX.PARENT_ADDRESS]);

  // ── EMERGENCY CONTACT ──────────────────────────────────────────────────────
  heading2_(body, "Emergency Contact Information");
  field_(body, "Name",            v[IDX.EMERG_NAME]);
  field_(body, "Cell Phone",      v[IDX.EMERG_PHONE]);
  field_(body, "Relationship",    v[IDX.EMERG_RELATIONSHIP]);

  // ── PICKUP AUTHORIZATION ───────────────────────────────────────────────────
  heading2_(body, "Pickup Authorization");
  field_(body, "Authorized Names", v[IDX.PICKUP_NAMES]);

  // ── INSURANCE INFORMATION ──────────────────────────────────────────────────
  heading2_(body, "Insurance Information");
  field_(body, "Insurance Carrier",           v[IDX.INS_CARRIER]);
  field_(body, "Policy Number",               v[IDX.INS_POLICY_NUM]);
  field_(body, "Responsible Party",           trim_(v[IDX.RESP_FIRST_NAME]) + " " + trim_(v[IDX.RESP_LAST_NAME]));
  field_(body, "Relationship to Camper",      v[IDX.RESP_RELATIONSHIP]);
  field_(body, "Responsible Party Address",   v[IDX.RESP_ADDRESS]);

  // ── MEDICAL PROVIDERS ──────────────────────────────────────────────────────
  heading2_(body, "Medical Providers");
  field_(body, "Family Physician",
    trim_(v[IDX.PHYSICIAN_FIRST]) + " " + trim_(v[IDX.PHYSICIAN_LAST]));
  field_(body, "Physician Phone",             v[IDX.PHYSICIAN_PHONE]);
  field_(body, "Family Dentist / Orthodontist",
    trim_(v[IDX.DENTIST_FIRST]) + " " + trim_(v[IDX.DENTIST_LAST]));
  field_(body, "Dentist / Ortho Phone",       v[IDX.DENTIST_PHONE]);

  // ── MEDICAL CONDITIONS & DIETARY NEEDS ────────────────────────────────────
  heading2_(body, "Camper Medical Conditions & Dietary Needs");
  field_(body, "Special Dietary Needs",       v[IDX.DIETARY_NEEDS]);
  field_(body, "Medical Conditions",          v[IDX.MEDICAL_CONDITIONS]);
  field_(body, "Allergies",                   v[IDX.ALLERGIES]);
  field_(body, "Current Medications",         v[IDX.MEDICATIONS]);
  field_(body, "Chronic Conditions",          v[IDX.CHRONIC_CONDITIONS]);

  // ── GENERAL HEALTH HISTORY ────────────────────────────────────────────────
  heading2_(body, "General Health History");
  field_(body, "Ever been hospitalized?",                    v[IDX.MED_HOSPITALIZED]);
  field_(body, "Ever had surgery?",                          v[IDX.MED_SURGERY]);
  field_(body, "Recurrent / chronic illness?",               v[IDX.MED_CHRONIC_ILLNESS]);
  field_(body, "Recent infectious disease?",                 v[IDX.MED_INFECTIOUS]);
  field_(body, "Recent injury?",                             v[IDX.MED_INJURY]);
  field_(body, "Asthma / wheezing / shortness of breath?",   v[IDX.MED_ASTHMA]);
  field_(body, "Diabetes?",                                  v[IDX.MED_DIABETES]);
  field_(body, "Seizures?",                                  v[IDX.MED_SEIZURES]);
  field_(body, "Glasses / contacts / protective eye wear?",  v[IDX.MED_EYEWEAR]);
  field_(body, "Fainting or dizziness?",                     v[IDX.MED_FAINTING]);
  field_(body, "Passed out / chest pain during exercise?",   v[IDX.MED_CHEST_PAIN]);
  field_(body, "Mononucleosis in past 12 months?",           v[IDX.MED_MONO]);
  field_(body, "Menstruation problems?",                     v[IDX.MED_MENSTRUATION]);
  field_(body, "Sleep problems / sleepwalking?",             v[IDX.MED_SLEEP]);
  field_(body, "Back / joint problems?",                     v[IDX.MED_BACK_JOINT]);
  field_(body, "History of bedwetting?",                     v[IDX.MED_BEDWETTING]);
  field_(body, "Diarrhea / constipation?",                   v[IDX.MED_DIGESTION]);
  field_(body, "Skin problems?",                             v[IDX.MED_SKIN]);
  field_(body, "Traveled outside country (past 9 months)?",  v[IDX.MED_TRAVEL]);
  field_(body, "Explanation (if any answer above is Yes)",   v[IDX.MED_EXPLAIN]);

  // ── VACCINATION RECORDS ────────────────────────────────────────────────────
  heading2_(body, "Camper Vaccination Records");
  field_(body, "Polio (OPV or IPV)",           v[IDX.VAX_POLIO]);
  field_(body, "DTP / DTap / DT / TD",         v[IDX.VAX_DTP]);
  field_(body, "MMR",                          v[IDX.VAX_MMR]);
  field_(body, "Hepatitis B",                  v[IDX.VAX_HEP_B]);
  field_(body, "Varicella (Chicken Pox)",      v[IDX.VAX_VARICELLA]);
  field_(body, "No-Vaccination Declaration",   v[IDX.VAX_NO_VACCINATE]);
  field_(body, "Vaccination Notes",            v[IDX.VAX_NOTES]);
  field_(body, "Immunization Records",
    v[IDX.VAX_RECORDS_FILE]
      ? "File uploaded (Drive ID: " + v[IDX.VAX_RECORDS_FILE] + ")"
      : "None uploaded");

  // ── CONSENTS & SIGNATURES ──────────────────────────────────────────────────
  heading2_(body, "Consents & Signatures");

  heading3_(body, "Medical Consent Authorization");
  field_(body, "Parent / Guardian Signature",  v[IDX.SIG_MEDICAL_PARENT]);
  field_(body, "Confirmation",                 v[IDX.SIG_MEDICAL_CONFIRM]);

  heading3_(body, "Media Consent");
  field_(body, "Parent / Guardian Signature",  v[IDX.SIG_MEDIA_PARENT]);
  field_(body, "Confirmation",                 v[IDX.SIG_MEDIA_CONFIRM]);

  heading3_(body, "Zero Tolerance Policy & Code of Conduct");
  field_(body, "Parent / Guardian Signature",  v[IDX.SIG_ZEROTOL_PARENT]);
  field_(body, "Parent Confirmation",          v[IDX.SIG_ZEROTOL_PARENT_CONF]);
  field_(body, "Camper Signature",             v[IDX.SIG_ZEROTOL_CAMPER]);
  field_(body, "Camper Confirmation",          v[IDX.SIG_ZEROTOL_CAMPER_CONF]);

  heading3_(body, "Parental Registration Permissions");
  field_(body, "Parent / Guardian Signature",  v[IDX.SIG_REG_PERM_PARENT]);
  field_(body, "Confirmation",                 v[IDX.SIG_REG_PERM_CONFIRM]);

  heading3_(body, "Release of Responsibility");
  field_(body, "Parent / Guardian Signature",  v[IDX.SIG_RELEASE_PARENT]);
  field_(body, "Confirmation",                 v[IDX.SIG_RELEASE_CONFIRM]);

  // ── SHUTTLE / PAYMENT ─────────────────────────────────────────────────────
  heading2_(body, "Registration Payment & Shuttle");
  field_(body, "Shuttle Reservation",          v[IDX.SHUTTLE]);

  doc.saveAndClose();
}


/**
 * Sends a brief confirmation email to the parent/guardian.
 */
function sendConfirmation(v, ts) {
  var parentEmail = v[IDX.PARENT_EMAIL];
  var camperName  = trim_(v[IDX.CAMPER_FIRST_NAME]) + " " + trim_(v[IDX.CAMPER_LAST_NAME]);
  var parentName  = trim_(v[IDX.PARENT_FIRST_NAME]);

  var subject = "Camp Spin Off – Registration Received for " + camperName;

  var body = [
    "Hi " + parentName + ",",
    "",
    "We've received the registration form for " + camperName + ". Thank you!",
    "",
    "Registration summary:",
    "  Camper:      " + camperName,
    "  Grade:       " + v[IDX.SCHOOL_GRADE],
    "  School:      " + v[IDX.SCHOOL_NAME],
    "  Camper Type: " + v[IDX.CAMPER_TYPE],
    "  T-Shirt:     " + v[IDX.CAMPER_SHIRT_SIZE],
    "  Shuttle:     " + v[IDX.SHUTTLE],
    "",
    "If you have any questions please reply to this email.",
    "",
    "See you at camp!",
    "Camp Spin Off"
  ].join("\n");

  MailApp.sendEmail(parentEmail, subject, body);
}


// ── Private formatting helpers ────────────────────────────────────────────────

function trim_(s) {
  return s ? String(s).trim() : "";
}

function heading1_(body, text) {
  body.appendParagraph(text).setHeading(DocumentApp.ParagraphHeading.HEADING1);
}

function heading2_(body, text) {
  body.appendParagraph(text).setHeading(DocumentApp.ParagraphHeading.HEADING2);
}

function heading3_(body, text) {
  body.appendParagraph(text).setHeading(DocumentApp.ParagraphHeading.HEADING3);
}

function italic_(body, text) {
  body.appendParagraph(text).setItalic(true);
}

/**
 * Appends "Label: value" with the label bolded.
 * Skips the line entirely if value is blank.
 */
function field_(body, label, value) {
  if (!value || !String(value).trim()) return;
  var p = body.appendParagraph("");
  p.appendText(label + ": ").setBold(true);
  p.appendText(String(value)).setBold(false);
}
