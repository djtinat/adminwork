var SHEET_ID = '1dMuMGwZT9lHADxREJBXgqaZQb2cw4VRfpYnZrEBvbBs';
var SHEET_NAME = 'Scholarship Applications';
var EMAIL_SUBJECT = 'New Scholarship Application';
var PROCESSED_LABEL = 'Scholarship-Processed';

var HEADERS = [
  'Date Processed',
  'Camper Name',
  'Date of Birth',
  'Gender',
  'Camper Phone',
  'Camper Email',
  'Camper Address',
  'Skill Level',
  'Scholarship Type',
  'Attend Without Scholarship',
  'TikTok',
  'Instagram',
  'Twitter / X',
  'Facebook',
  'SoundCloud',
  'Parent / Guardian Name',
  'Relationship',
  'Parent Phone',
  'Parent Email',
  'Parent Address',
  'Foster / Group Home',
  'Video Diary Consent',
  'Why This Scholarship',
  'How They Heard',
  'Music Titles / Roles',
  'Instrument(s)',
  'Music Style',
  'Projects (Last 12 Mo)',
  'Hobbies / Interests',
  'Favorite DJ & Why',
  'Inspiration',
  'Overcome a Failure',
  'Expectations for Camp',
  'Parent Support',
  'DJ Goals',
  'Household Income',
  'Additional Info',
  'Uploaded Documents',
  'Has Attachment'
];

/**
 * Parses the scholarship email by splitting it into sections first,
 * then extracting label/value pairs from each section's table rows.
 * This handles duplicate field names (Name, Phone, Email, Address)
 * that appear in both CAMPER INFORMATION and PARENT / GUARDIAN sections.
 */
function parseScholarshipEmail(html) {
  var data = {};

  // Split by section headers (the h2 tags with gold underline)
  var sections = html.split(/<h2[^>]*>/i);

  for (var s = 0; s < sections.length; s++) {
    var section = sections[s];

    // Determine which section we're in
    var sectionName = '';
    var sectionMatch = section.match(/^([^<]*)</);
    if (sectionMatch) {
      sectionName = cleanText(sectionMatch[1]).toUpperCase();
    }

    // Determine prefix for duplicate field names
    var prefix = '';
    if (sectionName.indexOf('CAMPER') > -1) prefix = 'Camper ';
    if (sectionName.indexOf('PARENT') > -1) prefix = 'Parent ';

    // Extract all label/value pairs from table rows
    // Pattern: <td style="color: #888...">Label</td> ... <td style="color: #222...">Value</td>
    var rowRegex = /<tr[^>]*>\s*<td[^>]*color:\s*#888[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
    var match;
    while ((match = rowRegex.exec(section)) !== null) {
      var fieldName = cleanText(match[1]);
      var fieldValue = cleanText(match[2]);

      if (!fieldName || fieldName.length === 0) continue;

      // For fields that appear in multiple sections, add section prefix
      if ((fieldName === 'Name' || fieldName === 'Phone' || fieldName === 'Email' || fieldName === 'Address') && prefix) {
        data[prefix + fieldName] = fieldValue;
      } else {
        data[fieldName] = fieldValue;
      }
    }

    // Handle the UPLOADED DOCUMENTS section (uses <p> tag, not table rows)
    if (sectionName.indexOf('UPLOADED') > -1) {
      var docMatch = section.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (docMatch) {
        data['Uploaded Documents'] = cleanText(docMatch[1]);
      }
    }
  }

  // Fallback: if section-based parsing found very few fields, try generic row parsing
  if (Object.keys(data).length < 5) {
    data = parseScholarshipEmailFallback(html);
  }

  return data;
}

/**
 * Fallback parser: extracts all label/value pairs from two-column table rows.
 */
function parseScholarshipEmailFallback(html) {
  var data = {};
  var rowRegex = /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  var match;
  while ((match = rowRegex.exec(html)) !== null) {
    var fieldName = cleanText(match[1]);
    var fieldValue = cleanText(match[2]);
    if (fieldName && fieldName.length > 0 && fieldName.length < 100) {
      data[fieldName] = fieldValue;
    }
  }
  return data;
}

function processScholarshipEmails() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log('Another instance is already running. Skipping this run.');
    return;
  }

  try {
    var sheet = getOrCreateScholarshipSheet();
    var label = getOrCreateLabel(PROCESSED_LABEL);
    var processedIds = getProcessedScholarshipIds();
    var existingApplicants = getExistingApplicants(sheet);
    Logger.log('Existing applicants found in sheet: ' + Object.keys(existingApplicants).length);

    var query = 'subject:"' + EMAIL_SUBJECT + '" -label:' + PROCESSED_LABEL + ' after:2026/01/01 before:2027/01/01';
    var threads = GmailApp.search(query);
    Logger.log('Found ' + threads.length + ' unprocessed scholarship thread(s)');
    if (threads.length === 0) return;

    for (var t = 0; t < threads.length; t++) {
      var messages = threads[t].getMessages();
      for (var m = 0; m < messages.length; m++) {
        var message = messages[m];
        var messageId = message.getId();
        var subject = message.getSubject();

        if (subject.indexOf(EMAIL_SUBJECT) === -1) continue;
        if (processedIds[messageId]) continue;

        try {
          var htmlBody = message.getBody();
          var data = parseScholarshipEmail(htmlBody);
          data['Date Processed'] = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');
          Logger.log('Parsed ' + Object.keys(data).length + ' fields from email');

          // Check for attachments
          var attachments = message.getAttachments();
          data['Has Attachment'] = (attachments && attachments.length > 0) ? 'Yes' : 'No';

          // Build dedup key from camper name + email
          var applicantKey = buildApplicantKey(data);
          Logger.log('Applicant key: ' + applicantKey);

          if (applicantKey && existingApplicants[applicantKey]) {
            Logger.log('SKIPPING duplicate applicant: ' + applicantKey);
            markScholarshipProcessed(messageId, processedIds);
            continue;
          }

          appendRowToScholarshipSheet(sheet, data);
          markScholarshipProcessed(messageId, processedIds);
          Logger.log('ADDED new applicant: ' + applicantKey);

          if (applicantKey) {
            existingApplicants[applicantKey] = true;
          }
        } catch (e) {
          Logger.log('Error processing message ' + messageId + ': ' + e.message);
        }
      }
      threads[t].addLabel(label);
    }
  } finally {
    lock.releaseLock();
  }
}

function buildApplicantKey(data) {
  var name = (data['Camper Name'] || data['Name'] || '').trim().toLowerCase();
  var email = (data['Camper Email'] || data['Email'] || '').trim().toLowerCase();
  if (!name && !email) return null;
  return name + '|' + email;
}

function getExistingApplicants(sheet) {
  var applicants = {};
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return applicants;

  var headers = getScholarshipHeaders(sheet);
  var nameIdx = headers.indexOf('Camper Name');
  var emailIdx = headers.indexOf('Camper Email');

  if (nameIdx === -1 || emailIdx === -1) return applicants;

  var data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var key = String(data[i][nameIdx]).trim().toLowerCase() + '|' +
              String(data[i][emailIdx]).trim().toLowerCase();
    applicants[key] = true;
  }
  return applicants;
}

function getProcessedScholarshipIds() {
  var props = PropertiesService.getScriptProperties();
  var stored = props.getProperty('processedScholarshipIds');
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch (e) {
    return {};
  }
}

function markScholarshipProcessed(messageId, processedIds) {
  processedIds[messageId] = true;
  var props = PropertiesService.getScriptProperties();
  props.setProperty('processedScholarshipIds', JSON.stringify(processedIds));
}

function cleanText(text) {
  if (!text) return '';
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&bull;/g, '');
  text = text.replace(/&#\d+;/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function getOrCreateScholarshipSheet() {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    for (var i = 0; i < HEADERS.length; i++) {
      sheet.getRange(1, i + 1).setValue(HEADERS[i]);
    }
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#1a2744');
    headerRange.setFontColor('#d4a843');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getOrCreateLabel(labelName) {
  var label = GmailApp.getUserLabelByName(labelName);
  if (!label) label = GmailApp.createLabel(labelName);
  return label;
}

function appendRowToScholarshipSheet(sheet, data) {
  var headers = getScholarshipHeaders(sheet);
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var header = headers[i];
    if (data[header] !== undefined) {
      row.push(data[header]);
    } else {
      row.push('');
    }
  }
  sheet.appendRow(row);
}

function getScholarshipHeaders(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return HEADERS;
  var headerRange = sheet.getRange(1, 1, 1, lastCol);
  return headerRange.getValues()[0];
}

function setupScholarshipHeaders() {
  getOrCreateScholarshipSheet();
}

function testWithLatestScholarshipEmail() {
  var threads = GmailApp.search('subject:"' + EMAIL_SUBJECT + '"', 0, 1);
  if (threads.length === 0) {
    Logger.log('No scholarship emails found.');
    return;
  }
  var message = threads[0].getMessages()[0];
  var data = parseScholarshipEmail(message.getBody());
  var attachments = message.getAttachments();
  data['Has Attachment'] = (attachments && attachments.length > 0) ? 'Yes' : 'No';
  Logger.log('--- All parsed fields ---');
  var keys = Object.keys(data).sort();
  for (var i = 0; i < keys.length; i++) {
    Logger.log(keys[i] + ': ' + data[keys[i]]);
  }
}

function resetScholarshipProcessedEmails() {
  var label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
  if (!label) return;
  var threads = label.getThreads();
  for (var i = 0; i < threads.length; i++) {
    threads[i].removeLabel(label);
  }
  PropertiesService.getScriptProperties().deleteProperty('processedScholarshipIds');
  Logger.log('Reset complete. Removed label from ' + threads.length + ' thread(s).');
}

function removeScholarshipDuplicates() {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  var headers = getScholarshipHeaders(sheet);
  var data = sheet.getDataRange().getValues();
  var seen = {};
  var rowsToDelete = [];

  var nameIdx = headers.indexOf('Camper Name');
  var emailIdx = headers.indexOf('Camper Email');

  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][nameIdx]).trim().toLowerCase() + '|' +
              String(data[i][emailIdx]).trim().toLowerCase();

    if (seen[key]) {
      rowsToDelete.push(i + 1);
    } else {
      seen[key] = true;
    }
  }

  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  SpreadsheetApp.getUi().alert('Removed ' + rowsToDelete.length + ' duplicate row(s).');
}
