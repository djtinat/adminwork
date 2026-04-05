var SHEET_ID = '1dMuMGwZT9lHADxREJBXgqaZQb2cw4VRfpYnZrEBvbBs';
var SHEET_NAME = 'Scholarship Applications';
var EMAIL_SUBJECT = 'New Camp Spin-Off Scholarship Application';
var PROCESSED_LABEL = 'Scholarship-Processed';

var HEADERS = [
  'Date Processed',
  'Name',
  'Date of Birth',
  'Gender',
  'Phone',
  'Email',
  'Address',
  'Skill Level',
  'Scholarship Type',
  'Attend Without Scholarship',
  'TikTok',
  'Instagram',
  'Twitter / X',
  'Facebook',
  'SoundCloud',
  'Parent / Guardian Name',
  'Parent / Guardian Role',
  'Parent / Guardian Phone',
  'Parent / Guardian Address',
  'Parent / Guardian Consent',
  'Why should your child participate?',
  'Projects (Last 5)',
  'DJ Style',
  'Musical Influences',
  'DJ Routine or Mix',
  'Community Service',
  'Parent Support',
  'DJ Goals',
  'Household Income',
  'Additional Info',
  'Has Attachment'
];

var FIELD_MAP = {
  'Parent / Guardian Name': 'Name',
  'Parent / Guardian Role': 'Mother/Father',
  'Parent / Guardian Phone': 'Phone',
  'Parent / Guardian Address': 'Address',
  'Parent / Guardian Consent': 'I understand and my child is willing to participate',
  'Why should your child participate?': 'Why should your child participate',
  'DJ Routine or Mix': 'Dj Routine or Mix',
  'Projects (Last 5)': 'Projects (Last 5)',
  'DJ Style': 'DJ Style',
  'Musical Influences': 'Musical Influences',
  'Community Service': 'Community Service',
  'Parent Support': 'Parent Support',
  'DJ Goals': 'DJ Goals',
  'Household Income': 'Household Income',
  'Additional Info': 'Additional Info'
};

function processScholarshipEmails() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    Logger.log('Could not obtain lock.');
    return;
  }

  try {
    var sheet = getOrCreateScholarshipSheet();
    var label = getOrCreateLabel(PROCESSED_LABEL);
    var processedIds = getProcessedScholarshipIds();
    var existingApplicants = getExistingApplicants(sheet);

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

          // Check for attachments
          var attachments = message.getAttachments();
          data['Has Attachment'] = (attachments && attachments.length > 0) ? 'Yes' : 'No';

          // Build dedup key from name + email
          var applicantKey = buildApplicantKey(data);
          Logger.log('Applicant key: ' + applicantKey);

          if (applicantKey && existingApplicants[applicantKey]) {
            Logger.log('Skipping duplicate applicant: ' + applicantKey);
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
  var name = (data['Name'] || '').trim().toLowerCase();
  var email = (data['Email'] || '').trim().toLowerCase();
  if (!name && !email) return null;
  return name + '|' + email;
}

function getExistingApplicants(sheet) {
  var applicants = {};
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return applicants;

  var headers = getScholarshipHeaders(sheet);
  var nameIdx = headers.indexOf('Name');
  var emailIdx = headers.indexOf('Email');

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

function parseScholarshipEmail(html) {
  var data = {};
  var patterns = [
    /<td[^>]*style="[^"]*background[^"]*"[^>]*>\s*<(?:strong|b)>([^<]+)<\/(?:strong|b)>\s*<\/td>[\s\S]*?<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi,
    /<t[hd][^>]*>\s*<(?:strong|b)>([^<]+)<\/(?:strong|b)>\s*<\/t[hd]>\s*<\/tr>\s*<tr[^>]*>\s*<td[^>]*>\s*([\s\S]*?)\s*<\/td>/gi
  ];
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
  if (Object.keys(data).length < 5) {
    data = parseScholarshipEmailStructural(html);
  }
  if (Object.keys(data).length < 5) {
    var fallbackData = parseScholarshipEmailBoldFields(html);
    for (var key in fallbackData) {
      if (!data[key]) {
        data[key] = fallbackData[key];
      }
    }
  }
  return data;
}

function parseScholarshipEmailStructural(html) {
  var data = {};
  var rows = html.split(/<tr[^>]*>/i);
  for (var i = 0; i < rows.length - 1; i++) {
    var row = rows[i];
    var headerMatch = row.match(/<(?:strong|b)>\s*([^<]+?)\s*<\/(?:strong|b)>/i);
    if (headerMatch) {
      var fieldName = cleanText(headerMatch[1]);
      if (isScholarshipSectionHeader(fieldName)) continue;
      if (i + 1 < rows.length) {
        var nextRow = rows[i + 1];
        var valueText = cleanText(nextRow.replace(/<[^>]+>/g, ''));
        if (fieldName && fieldName.length > 0) {
          data[fieldName] = valueText;
        }
      }
    }
  }
  return data;
}

function parseScholarshipEmailBoldFields(html) {
  var data = {};
  var cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  var boldRegex = /<(?:strong|b)>\s*([^<]+?)\s*<\/(?:strong|b)>/gi;
  var match;
  var fields = [];
  while ((match = boldRegex.exec(cleaned)) !== null) {
    fields.push({ name: cleanText(match[1]), index: match.index + match[0].length });
  }
  for (var i = 0; i < fields.length; i++) {
    var fieldName = fields[i].name;
    if (isScholarshipSectionHeader(fieldName)) continue;
    var startIdx = fields[i].index;
    var endIdx = (i + 1 < fields.length) ? fields[i + 1].index - fields[i + 1].name.length - 17 : startIdx + 500;
    endIdx = Math.min(endIdx, cleaned.length);
    var segment = cleaned.substring(startIdx, endIdx);
    var value = cleanText(segment.replace(/<[^>]+>/g, ''));
    if (fieldName && value && value.length < 2000) {
      data[fieldName] = value;
    }
  }
  return data;
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
  text = text.replace(/&#\d+;/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function isScholarshipSectionHeader(name) {
  var sectionHeaders = [
    'Camper Information',
    'Social Media',
    'Parent / Guardian',
    'Music Background',
    'Essay Responses',
    'Financial Information',
    'Uploaded Documents',
    'Scholarship Application',
    'Scholarship Application Form'
  ];
  for (var i = 0; i < sectionHeaders.length; i++) {
    if (name.toLowerCase() === sectionHeaders[i].toLowerCase()) return true;
  }
  return false;
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
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
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
    var mappedField = FIELD_MAP[header];
    if (mappedField && data[mappedField] !== undefined) {
      row.push(data[mappedField]);
    } else if (data[header] !== undefined) {
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

  var nameIdx = headers.indexOf('Name');
  var emailIdx = headers.indexOf('Email');

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
