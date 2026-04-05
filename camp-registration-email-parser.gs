/**
 * Camp Spin-Off Registration Form - Email to Google Sheet Parser
 *
 * This Google Apps Script automatically parses incoming
 * "New Camp Spin-Off Registration Form Submission" emails
 * and populates a Google Sheet with the extracted data.
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets and create a new spreadsheet (or use an existing one).
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this entire script into the editor (replace any existing code).
 * 4. Update SHEET_ID below with your spreadsheet's ID
 *    (found in the URL: https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit).
 * 5. Run setupHeaders() once to create column headers.
 * 6. Run processRegistrationEmails() manually to test.
 * 7. Set up a time-driven trigger:
 *    - Click the clock icon (Triggers) in the left sidebar.
 *    - Click "+ Add Trigger".
 *    - Choose processRegistrationEmails, Time-driven, Minutes timer, Every 5 or 15 minutes.
 * 8. Authorize the script when prompted.
 */

// ============================================================
// CONFIGURATION - Update these values
// ============================================================

// Your Google Sheet ID (from the spreadsheet URL)
var SHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

// Sheet (tab) name where data will be written
var SHEET_NAME = 'Registrations';

// Gmail search query to find registration emails
var EMAIL_SUBJECT = 'New Camp Spin-Off Registration Form Submission';

// Gmail label to mark processed emails (will be created automatically)
var PROCESSED_LABEL = 'CSO-Processed';

// ============================================================
// COLUMN HEADERS - All fields from the registration form
// These match the bold field names in the email exactly.
// ============================================================

var HEADERS = [
  'Date Processed',
  // Page 1 - Camper Information
  'Camper First Name',
  'Camper Last Name',
  'Camper Gender',
  'Camper Phone Number',
  'Camper Email',
  'Camper Date of Birth',
  'How old is the Camper?',
  'School Grade',
  'What is the name of the middle or high school the camper attends?',
  'Cohort Type',
  'Camper T-Shirt Size',
  // Page 2 - Camper Food Allergies & Social Media
  'Camper Food Allergies',
  'Social Media',
  'Parent or Guardian Email for Social Media',
  'How did you hear about Camp Spin Off?',
  // Page 2 - Parent or Guardian Information
  'Parent First Name',
  'Parent Last Name',
  'Parent Cell Phone Number',
  'Parent Work Phone Number',
  'Parent Email',
  // Page 3 - Emergency Contact Information
  'Emergency Contact Name',
  'Emergency Contact Cell Phone',
  'Relationship to Camper',
  // Page 3 - Pickup Authorization
  'Pickup Authorization Name',
  // Page 4 - Physician Information
  'First Name of Family Physician',
  'Last Name of Family Physician',
  'Family Physician Phone Number',
  'First Name of Family Dentist',
  'Last Name of Family Dentist',
  'Family Dentist Information',
  // Page 5 - Camper Medical Conditions & Dietary Needs
  'Camper Special Dietary Needs',
  'Medical Conditions',
  'Allergies',
  // Page 6 - Medications & Chronic Conditions
  'Medications',
  'Chronic Conditions',
  // Page 6 - General Health Reporting History
  'Has been hospitalized?',
  'Has had surgery?',
  'Has had Chronic Illness?',
  'Has diabetes?',
  'Had seizures?',
  'Had glasses, contacts, or hearing aids?',
  'Had fainting or dizziness?',
  'Recent bad back pain during activity?',
  'Had menstrual/genital issues?',
  'Had allergies, hives or eczema?',
  'Had problems with kidney or bladder?',
  'Has had an accident?',
  'Had frequent headaches?',
  'Had problems with heart?',
  'Wears any dental appliances?',
  'Traveled outside the country?',
  'If yes to any, please explain',
  // Page 8 - Camper Vaccination Records
  'Polio DPT or DPTa Date',
  'DPT/DPTa/DT/Td Date',
  'MMR Date',
  'Hepatitis B Date',
  'Varicella (Chicken Pox) Date',
  'Immunization Notes',
  // Page 9 - Consent & Signatures
  'Medical Consent Authorization',
  'Parent or Guardian Digital Signature for Medical',
  'Parent or Guardian Confirmation for Medical',
  // Pages 10-11 - Media Consent
  'Media Consent',
  'Parent or Guardian Digital Signature for Media',
  'Parent or Guardian Confirmation for Media Release',
  // Page 11 - Zero Tolerance Policy
  'Zero Tolerance Policy Acknowledgment',
  'Parent or Guardian Digital Signature for Zero Tolerance',
  'Parent or Guardian Confirmation for Zero Tolerance',
  'Camper Digital Signature for Zero Tolerance',
  'Camper Confirmation for Zero Tolerance',
  // Page 11 - Parental Registration Permissions
  'Parental Registration Permissions',
  'Parent or Guardian Digital Signature for Registration',
  'Parent or Guardian Confirmation for Registration',
  // Page 12 - Release of Responsibility
  'Release of Responsibility',
  'Parent or Guardian Digital Signature for Release',
  'Parent or Guardian Confirmation for Release'
];


// ============================================================
// MAIN FUNCTION - Process unprocessed registration emails
// ============================================================

function processRegistrationEmails() {
  var sheet = getOrCreateSheet();
  var label = getOrCreateLabel(PROCESSED_LABEL);

  // Search for emails that match the subject and haven't been processed
  var query = 'subject:"' + EMAIL_SUBJECT + '" -label:' + PROCESSED_LABEL;
  var threads = GmailApp.search(query);

  if (threads.length === 0) {
    Logger.log('No new registration emails found.');
    return;
  }

  Logger.log('Found ' + threads.length + ' new registration email(s).');

  for (var t = 0; t < threads.length; t++) {
    var messages = threads[t].getMessages();

    for (var m = 0; m < messages.length; m++) {
      var message = messages[m];
      var subject = message.getSubject();

      // Only process messages that match our subject
      if (subject.indexOf(EMAIL_SUBJECT) === -1) continue;

      try {
        var htmlBody = message.getBody();
        var data = parseRegistrationEmail(htmlBody);
        data['Date Processed'] = Utilities.formatDate(
          message.getDate(),
          Session.getScriptTimeZone(),
          'MM/dd/yyyy HH:mm:ss'
        );

        // Write to sheet
        appendRowToSheet(sheet, data);
        Logger.log('Processed registration for: ' + (data['Camper First Name'] || '') + ' ' + (data['Camper Last Name'] || ''));

      } catch (e) {
        Logger.log('Error processing message: ' + e.message);
        Logger.log('Stack: ' + e.stack);
      }
    }

    // Mark the thread as processed
    threads[t].addLabel(label);
  }
}


// ============================================================
// EMAIL PARSER - Extracts field/value pairs from HTML email
// ============================================================

function parseRegistrationEmail(html) {
  var data = {};

  // The email format uses a table with alternating header rows (bold field names
  // on colored backgrounds) and value rows. We extract them using regex patterns.

  // Strategy 1: Match table rows where a bold tag contains the field name
  // followed by the value in the next row/cell.
  // The email structure looks like:
  //   <tr><td style="background:..."><strong>Field Name</strong></td></tr>
  //   <tr><td>   Value   </td></tr>

  // First, let's try matching the pattern of header cell followed by value cell
  var patterns = [
    // Pattern: <td> with background color containing <strong>FIELD</strong>, then next <td> with value
    /<td[^>]*style="[^"]*background[^"]*"[^>]*>\s*<(?:strong|b)>([^<]+)<\/(?:strong|b)>\s*<\/td>[\s\S]*?<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi,
    // Pattern: <th> or header-style cells
    /<t[hd][^>]*>\s*<(?:strong|b)>([^<]+)<\/(?:strong|b)>\s*<\/t[hd]>\s*<\/tr>\s*<tr[^>]*>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi
  ];

  // Try each pattern
  for (var p = 0; p < patterns.length; p++) {
    var regex = patterns[p];
    var match;
    while ((match = regex.exec(html)) !== null) {
      var fieldName = cleanText(match[1]);
      var fieldValue = cleanText(match[2]);

      if (fieldName && fieldName.length > 0) {
        data[fieldName] = fieldValue;
      }
    }
  }

  // Strategy 2: Parse the HTML more structurally if Strategy 1 didn't get everything
  // Look for the alternating row pattern with background colors
  if (Object.keys(data).length < 5) {
    Logger.log('Strategy 1 found few fields (' + Object.keys(data).length + '), trying Strategy 2...');
    data = parseEmailStructural(html);
  }

  // Strategy 3: Simple bold-text extraction as fallback
  if (Object.keys(data).length < 5) {
    Logger.log('Strategy 2 found few fields (' + Object.keys(data).length + '), trying Strategy 3...');
    var fallbackData = parseEmailBoldFields(html);
    // Merge fallback data (don't overwrite existing)
    for (var key in fallbackData) {
      if (!data[key]) {
        data[key] = fallbackData[key];
      }
    }
  }

  Logger.log('Total fields extracted: ' + Object.keys(data).length);
  return data;
}


/**
 * Structural parser - splits HTML into table rows and pairs headers with values
 */
function parseEmailStructural(html) {
  var data = {};

  // Split into table rows
  var rows = html.split(/<tr[^>]*>/i);

  for (var i = 0; i < rows.length - 1; i++) {
    var row = rows[i];

    // Check if this row contains a bold field name (header row)
    var headerMatch = row.match(/<(?:strong|b)>\s*([^<]+?)\s*<\/(?:strong|b)>/i);

    if (headerMatch) {
      var fieldName = cleanText(headerMatch[1]);

      // Skip section headers (like "Camper Information", "Parent or Guardian Information")
      if (isSectionHeader(fieldName)) continue;

      // Look at the next row for the value
      if (i + 1 < rows.length) {
        var nextRow = rows[i + 1];
        // Extract text content from the next row
        var valueText = cleanText(nextRow.replace(/<[^>]+>/g, ''));

        if (fieldName && fieldName.length > 0) {
          data[fieldName] = valueText;
        }
      }
    }
  }

  return data;
}


/**
 * Fallback parser - finds all bold text and treats the text after it as the value
 */
function parseEmailBoldFields(html) {
  var data = {};

  // Remove style and script tags
  var cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Find bold fields: <strong>Field Name</strong> ... value text
  var boldRegex = /<(?:strong|b)>\s*([^<]+?)\s*<\/(?:strong|b)>/gi;
  var match;
  var fields = [];

  while ((match = boldRegex.exec(cleaned)) !== null) {
    fields.push({
      name: cleanText(match[1]),
      index: match.index + match[0].length
    });
  }

  // For each field, extract the text between this field and the next
  for (var i = 0; i < fields.length; i++) {
    var fieldName = fields[i].name;
    if (isSectionHeader(fieldName)) continue;

    var startIdx = fields[i].index;
    var endIdx = (i + 1 < fields.length) ? fields[i + 1].index - fields[i + 1].name.length - 17 : startIdx + 500;
    endIdx = Math.min(endIdx, cleaned.length);

    var segment = cleaned.substring(startIdx, endIdx);
    var value = cleanText(segment.replace(/<[^>]+>/g, ''));

    // Only store if we got a reasonable value
    if (fieldName && value && value.length < 1000) {
      data[fieldName] = value;
    }
  }

  return data;
}


// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Clean HTML tags and whitespace from text
 */
function cleanText(text) {
  if (!text) return '';
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&#\d+;/g, '');
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}


/**
 * Check if a field name is a section header (not a data field)
 */
function isSectionHeader(name) {
  var sectionHeaders = [
    'Camper Information',
    'Parent or Guardian Information',
    'Emergency Contact Information',
    'Pickup Authorization',
    'Camper Medical Conditions & Dietary Needs',
    'Camper Medical Conditions',
    'Dietary Needs',
    'Camper Vaccination Records',
    'Medical Consent Authorization',
    'Media Consent',
    'Zero Tolerance Policy',
    'Camp Spin Off Zero Tolerance Policy & Code of Conduct',
    'Parental Registration Permissions',
    'Release of Responsibility',
    'General Health Reporting History',
    'Chronic Conditions',
    'Medications',
    'Registration Form',
    'Immunization Records'
  ];

  for (var i = 0; i < sectionHeaders.length; i++) {
    if (name.toLowerCase() === sectionHeaders[i].toLowerCase()) {
      return true;
    }
  }
  return false;
}


/**
 * Get or create the target sheet
 */
function getOrCreateSheet() {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    // Write headers
    for (var i = 0; i < HEADERS.length; i++) {
      sheet.getRange(1, i + 1).setValue(HEADERS[i]);
    }
    // Format header row
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    Logger.log('Created new sheet: ' + SHEET_NAME);
  }

  return sheet;
}


/**
 * Get or create a Gmail label
 */
function getOrCreateLabel(labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
    Logger.log('Created Gmail label: ' + labelName);
  }
  return label;
}


/**
 * Append a data row to the sheet, matching columns to headers
 */
function appendRowToSheet(sheet, data) {
  var headers = getSheetHeaders(sheet);
  var row = [];

  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    row.push(data[header] || '');
  }

  sheet.appendRow(row);
}


/**
 * Read existing headers from the sheet
 */
function getSheetHeaders(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return HEADERS;

  var headerRange = sheet.getRange(1, 1, 1, lastCol);
  var headers = headerRange.getValues()[0];
  return headers;
}


// ============================================================
// SETUP & UTILITY FUNCTIONS
// ============================================================

/**
 * Run this once to set up column headers in your sheet
 */
function setupHeaders() {
  var sheet = getOrCreateSheet();
  Logger.log('Headers set up successfully. ' + HEADERS.length + ' columns created.');
  Logger.log('Sheet URL: https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit');
}


/**
 * Test function - process a single email to verify parsing works.
 * Run this manually to test before setting up the trigger.
 */
function testWithLatestEmail() {
  var threads = GmailApp.search('subject:"' + EMAIL_SUBJECT + '"', 0, 1);

  if (threads.length === 0) {
    Logger.log('No registration emails found. Check the EMAIL_SUBJECT variable.');
    return;
  }

  var message = threads[0].getMessages()[0];
  var html = message.getBody();

  Logger.log('=== EMAIL SUBJECT ===');
  Logger.log(message.getSubject());
  Logger.log('=== EMAIL DATE ===');
  Logger.log(message.getDate());

  var data = parseRegistrationEmail(html);

  Logger.log('=== EXTRACTED FIELDS ===');
  var keys = Object.keys(data);
  keys.sort();
  for (var i = 0; i < keys.length; i++) {
    Logger.log(keys[i] + ': ' + data[keys[i]]);
  }

  Logger.log('=== TOTAL FIELDS: ' + keys.length + ' ===');
}


/**
 * Utility: View the raw HTML of the latest registration email.
 * Useful for debugging the parser.
 */
function viewEmailHTML() {
  var threads = GmailApp.search('subject:"' + EMAIL_SUBJECT + '"', 0, 1);

  if (threads.length === 0) {
    Logger.log('No registration emails found.');
    return;
  }

  var message = threads[0].getMessages()[0];
  Logger.log(message.getBody());
}


/**
 * Utility: Reset processing - remove the processed label from all emails.
 * Use this if you want to re-process all emails.
 */
function resetProcessedEmails() {
  var label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
  if (!label) {
    Logger.log('No processed label found. Nothing to reset.');
    return;
  }

  var threads = label.getThreads();
  for (var i = 0; i < threads.length; i++) {
    threads[i].removeLabel(label);
  }
  Logger.log('Removed processed label from ' + threads.length + ' thread(s).');
}


/**
 * Utility: Add any new fields found in emails that aren't in the headers yet.
 * Run this if the registration form has been updated with new fields.
 */
function addMissingHeaders() {
  var sheet = getOrCreateSheet();
  var existingHeaders = getSheetHeaders(sheet);

  // Process a sample email to find all fields
  var threads = GmailApp.search('subject:"' + EMAIL_SUBJECT + '"', 0, 1);
  if (threads.length === 0) {
    Logger.log('No emails found to check for new fields.');
    return;
  }

  var message = threads[0].getMessages()[0];
  var data = parseRegistrationEmail(message.getBody());
  var newFields = [];

  for (var key in data) {
    if (existingHeaders.indexOf(key) === -1) {
      newFields.push(key);
    }
  }

  if (newFields.length === 0) {
    Logger.log('No new fields found. All fields are already in the sheet.');
    return;
  }

  // Add new headers
  var lastCol = sheet.getLastColumn();
  for (var i = 0; i < newFields.length; i++) {
    sheet.getRange(1, lastCol + i + 1).setValue(newFields[i]);
    Logger.log('Added new column: ' + newFields[i]);
  }

  // Format new headers
  var newHeaderRange = sheet.getRange(1, lastCol + 1, 1, newFields.length);
  newHeaderRange.setFontWeight('bold');
  newHeaderRange.setBackground('#4285f4');
  newHeaderRange.setFontColor('#ffffff');

  Logger.log('Added ' + newFields.length + ' new column(s).');
}
