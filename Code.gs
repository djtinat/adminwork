var SHEET_ID = '1dMuMGwZT9lHADxREJBXgqaZQb2cw4VRfpYnZrEBvbBs';
var SHEET_NAME = 'Registrations';
var EMAIL_SUBJECT = 'New Camp Spin-Off Registration Form Submission';
var PROCESSED_LABEL = 'Registration-Processed';

var HEADERS = [
  'Date Processed',
  'Camper First Name',
  'Camper Last Name',
  'Camper Gender',
  'Cabin Mate Request',
  'Shuttle Reservations',
  'Camper Phone Number',
  'Camper Email',
  'Camper Date of Birth',
  'How old is the Camper?',
  'School Grade',
  'Cohort Type',
  'Camper T-Shirt Size',
  'Camper Food Allergies',
  'Social Media',
  'How did you hear about Camp Spin Off?',
  'Parent First Name',
  'Parent Last Name',
  'Parent Cell Phone Number',
  'Parent Work Phone Number',
  'Parent Email',
  'Emergency Contact Name',
  'Emergency Contact Cell Phone',
  'Relationship to Camper',
  'Pickup Authorization Name',
  'First Name of Family Physician',
  'Last Name of Family Physician',
  'Family Physician Phone Number',
  'Camper Special Dietary Needs',
  'Medical Conditions',
  'Allergies',
  'Medications',
  'Chronic Conditions',
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
  'Polio DPT or DPTa Date',
  'DPT/DPTa/DT/Td Date',
  'MMR Date',
  'Hepatitis B Date',
  'Varicella (Chicken Pox) Date',
  'Immunization Notes',
  'Medical Consent Authorization',
  'Parent or Guardian Digital Signature for Medical',
  'Parent or Guardian Confirmation for Medical',
  'Parent or Guardian Digital Signature for Media',
  'Parent or Guardian Confirmation for Media Release',
  'Zero Tolerance Policy Acknowledgment',
  'Parent or Guardian Digital Signature for Zero Tolerance',
  'Parent or Guardian Confirmation for Zero Tolerance',
  'Camper Digital Signature for Zero Tolerance',
  'Camper Confirmation for Zero Tolerance',
  'Parental Registration Permissions',
  'Parent or Guardian Digital Signature for Registration',
  'Parent or Guardian Confirmation for Registration',
  'Release of Responsibility',
  'Parent or Guardian Digital Signature for Release',
  'Parent or Guardian Confirmation for Release'
];

var FIELD_MAP = {
  'Cohort Type': 'Camper Type',
  'Emergency Contact Cell Phone': 'Emergency Contact Cell Phone Number',
  'Pickup Authorization Name': 'Pickup Authorization Names',
  'Chronic Conditions': 'Recurrent/Chronic Illness?',
  'Has been hospitalized?': 'Ever been hospitalized?',
  'Has had surgery?': 'Ever had surgery?',
  'Has had Chronic Illness?': 'Recurrent/Chronic Illness?',
  'Has diabetes?': 'Have diabetes?',
  'Had glasses, contacts, or hearing aids?': 'Wear glasses, contacts, or protective eye wear?',
  'Recent bad back pain during activity?': 'Ever had back/joint problems?',
  'Had menstrual/genital issues?': 'If female, have problems with periods/menstruation?',
  'Had allergies, hives or eczema?': 'Have any skin problems?',
  'Had problems with kidney or bladder?': 'Have problems with diarrhea/constipation?',
  'Has had an accident?': 'Had a recent injury?',
  'Had frequent headaches?': 'Had mononucleosis ("mono") during the past 12 months?',
  'Had problems with heart?': 'Passed out/had chest pain during exercise?',
  'Wears any dental appliances?': 'Had a recent infectious disease?',
  'Traveled outside the country?': 'Traveled outside the country in the past 9 months?',
  'If yes to any, please explain': 'If you answered "Yes" to any of the above...',
  'Polio DPT or DPTa Date': 'Polio (OPV or IPV) Date',
  'DPT/DPTa/DT/Td Date': 'DTP/DTap/DT/TD Date:',
  'MMR Date': 'MMR Date:',
  'Hepatitis B Date': 'Hepatitis B Date:',
  'Varicella (Chicken Pox) Date': 'Varicella (Chicken Pox) Date:',
  'Immunization Notes': 'Camper Vaccination History',
  'Parent or Guardian Digital Signature for Medical': 'Parent or Guardian Digital Signature',
  'Parent or Guardian Confirmation for Medical': 'Parent or Guardians Digital Signature Confirmation for Medical',
  'Parent or Guardian Digital Signature for Media': 'Parent or Guardian Digital Signature for Media',
  'Parent or Guardian Confirmation for Media Release': 'Parent or Guardians Digital Signature Confirmation for Media Release:',
  'Zero Tolerance Policy Acknowledgment': 'Parent or Guardians Digital Signature Confirmation for Zero Tolerance Policy & Code of Conduct',
  'Parent or Guardian Digital Signature for Zero Tolerance': 'Parent or Guardian Digital Signature for Zero Tolerance Policy & Code of Conduct',
  'Parent or Guardian Confirmation for Zero Tolerance': 'Parent or Guardians Digital Signature Confirmation for Zero Tolerance Policy & Code of Conduct',
  'Camper Digital Signature for Zero Tolerance': 'Camper Digital Signature for Zero Tolerance Policy & Code of Conduct',
  'Camper Confirmation for Zero Tolerance': 'Camper Digital Signature Confirmation for Zero Tolerance Policy & Code of Conduct',
  'Parental Registration Permissions': 'Parent or Guardian Digital Signature for Registration Permission:',
  'Parent or Guardian Digital Signature for Registration': 'Parent or Guardian Digital Signature for Registration Permission:',
  'Parent or Guardian Confirmation for Registration': 'Parent or Guardian Digital Signature for Registration Permission:',
  'Release of Responsibility': 'Parent or Guardian Digital Signature for Release of Responsibility',
  'Parent or Guardian Digital Signature for Release': 'Parent or Guardian Digital Signature for Release of Responsibility',
  'Parent or Guardian Confirmation for Release': 'Parent or Guardian Digital Signature for Release of Responsibility'
};

function processRegistrationEmails() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    Logger.log('Another instance is already running. Skipping this run.');
    return;
  }

  try {
    var sheet = getOrCreateSheet();
    var label = getOrCreateLabel(PROCESSED_LABEL);
    var existingCampers = getExistingCampers(sheet);
    Logger.log('Existing campers found in sheet: ' + Object.keys(existingCampers).length);

    var query = 'subject:"' + EMAIL_SUBJECT + '" -label:' + PROCESSED_LABEL + ' after:2026/01/01 before:2027/01/01';
    var threads = GmailApp.search(query);
    Logger.log('Found ' + threads.length + ' unprocessed thread(s)');
    if (threads.length === 0) return;

    for (var t = 0; t < threads.length; t++) {
      var messages = threads[t].getMessages();
      for (var m = 0; m < messages.length; m++) {
        var message = messages[m];
        var subject = message.getSubject();
        if (subject.indexOf(EMAIL_SUBJECT) === -1) continue;

        try {
          var htmlBody = message.getBody();
          var data = parseRegistrationEmail(htmlBody);
          data['Date Processed'] = Utilities.formatDate(message.getDate(), Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');
          Logger.log('Parsed ' + Object.keys(data).length + ' fields from email');

          var camperKey = buildCamperKey(data);
          Logger.log('Camper key: ' + camperKey);

          if (camperKey && existingCampers[camperKey]) {
            Logger.log('SKIPPING duplicate camper: ' + camperKey);
            continue;
          }

          appendRowToSheet(sheet, data);
          Logger.log('ADDED new camper: ' + camperKey);

          if (camperKey) {
            existingCampers[camperKey] = true;
          }
        } catch (e) {
          Logger.log('Error processing message: ' + e.message);
        }
      }
      threads[t].addLabel(label);
    }
  } finally {
    lock.releaseLock();
  }
}

function buildCamperKey(data) {
  var first = findFieldValue(data, 'Camper First Name').trim().toLowerCase();
  var last = findFieldValue(data, 'Camper Last Name').trim().toLowerCase();
  if (!first && !last) return null;
  return first + '|' + last;
}

function findFieldValue(data, headerName) {
  if (data[headerName] !== undefined) return data[headerName];
  var normalizedHeader = headerName.replace(/[^a-z0-9]/gi, '').toLowerCase();
  for (var key in data) {
    var normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (normalizedKey === normalizedHeader) {
      return data[key];
    }
  }
  return '';
}

function getExistingCampers(sheet) {
  var campers = {};
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return campers;

  var headers = getSheetHeaders(sheet);
  var firstIdx = headers.indexOf('Camper First Name');
  var lastIdx = headers.indexOf('Camper Last Name');

  if (firstIdx === -1 || lastIdx === -1) {
    Logger.log('WARNING: Could not find dedup columns.');
    return campers;
  }

  var data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var key = String(data[i][firstIdx]).trim().toLowerCase() + '|' +
              String(data[i][lastIdx]).trim().toLowerCase();
    campers[key] = true;
  }
  return campers;
}

function parseRegistrationEmail(html) {
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
    data = parseEmailStructural(html);
  }
  if (Object.keys(data).length < 5) {
    var fallbackData = parseEmailBoldFields(html);
    for (var key in fallbackData) {
      if (!data[key]) {
        data[key] = fallbackData[key];
      }
    }
  }
  return data;
}

function parseEmailStructural(html) {
  var data = {};
  var rows = html.split(/<tr[^>]*>/i);
  for (var i = 0; i < rows.length - 1; i++) {
    var row = rows[i];
    var headerMatch = row.match(/<(?:strong|b)>\s*([^<]+?)\s*<\/(?:strong|b)>/i);
    if (headerMatch) {
      var fieldName = cleanText(headerMatch[1]);
      if (isSectionHeader(fieldName)) continue;
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

function parseEmailBoldFields(html) {
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
    if (isSectionHeader(fieldName)) continue;
    var startIdx = fields[i].index;
    var endIdx = (i + 1 < fields.length) ? fields[i + 1].index - fields[i + 1].name.length - 17 : startIdx + 500;
    endIdx = Math.min(endIdx, cleaned.length);
    var segment = cleaned.substring(startIdx, endIdx);
    var value = cleanText(segment.replace(/<[^>]+>/g, ''));
    if (fieldName && value && value.length < 1000) {
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
    'Zero Tolerance Policy',
    'Camp Spin Off Zero Tolerance Policy & Code of Conduct',
    'General Health Reporting History',
    'Chronic Conditions',
    'Medications',
    'Registration Form',
    'Immunization Records',
    'Registration Payment'
  ];
  for (var i = 0; i < sectionHeaders.length; i++) {
    if (name.toLowerCase() === sectionHeaders[i].toLowerCase()) return true;
  }
  return false;
}

function getOrCreateSheet() {
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

function appendRowToSheet(sheet, data) {
  var headers = getSheetHeaders(sheet);
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

function getSheetHeaders(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return HEADERS;
  var headerRange = sheet.getRange(1, 1, 1, lastCol);
  return headerRange.getValues()[0];
}

function setupHeaders() {
  getOrCreateSheet();
}

function testWithLatestEmail() {
  var threads = GmailApp.search('subject:"' + EMAIL_SUBJECT + '"', 0, 1);
  if (threads.length === 0) {
    Logger.log('No emails found.');
    return;
  }
  var message = threads[0].getMessages()[0];
  var data = parseRegistrationEmail(message.getBody());
  Logger.log('--- All parsed fields ---');
  var keys = Object.keys(data).sort();
  for (var i = 0; i < keys.length; i++) {
    Logger.log(keys[i] + ': ' + data[keys[i]]);
  }
  Logger.log('--- Camper key would be: ' + buildCamperKey(data) + ' ---');
}

function resetProcessedEmails() {
  var label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
  if (!label) return;
  var threads = label.getThreads();
  for (var i = 0; i < threads.length; i++) {
    threads[i].removeLabel(label);
  }
  PropertiesService.getScriptProperties().deleteProperty('processedMessageIds');
  Logger.log('Reset complete. Removed label from ' + threads.length + ' thread(s).');
}

function addMissingHeaders() {
  var sheet = getOrCreateSheet();
  var existingHeaders = getSheetHeaders(sheet);
  var threads = GmailApp.search('subject:"' + EMAIL_SUBJECT + '"', 0, 1);
  if (threads.length === 0) return;
  var message = threads[0].getMessages()[0];
  var data = parseRegistrationEmail(message.getBody());
  var newFields = [];
  for (var key in data) {
    if (existingHeaders.indexOf(key) === -1) newFields.push(key);
  }
  if (newFields.length === 0) return;
  var lastCol = sheet.getLastColumn();
  for (var i = 0; i < newFields.length; i++) {
    sheet.getRange(1, lastCol + i + 1).setValue(newFields[i]);
  }
  var newHeaderRange = sheet.getRange(1, lastCol + 1, 1, newFields.length);
  newHeaderRange.setFontWeight('bold');
  newHeaderRange.setBackground('#4285f4');
  newHeaderRange.setFontColor('#ffffff');
}

function removeDuplicates() {
  var spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  var headers = getSheetHeaders(sheet);
  var data = sheet.getDataRange().getValues();
  var seen = {};
  var rowsToDelete = [];

  var firstIdx = headers.indexOf('Camper First Name');
  var lastIdx = headers.indexOf('Camper Last Name');

  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][firstIdx]).trim().toLowerCase() + '|' +
              String(data[i][lastIdx]).trim().toLowerCase();
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
