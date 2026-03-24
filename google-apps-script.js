// ==============================================================
// GOOGLE APPS SCRIPT — Deploy this from your Google Sheet
// ==============================================================
// 
// HOW TO SET UP:
// 1. Open your Google Sheet: 
//    https://docs.google.com/spreadsheets/d/1-mIaEpP6cDh8BbBuGnjqfbcsF35a1VUENx8mILJrgxQ
// 
// 2. Go to Extensions → Apps Script
// 
// 3. Delete any existing code and paste ALL the code below
// 
// 4. Click "Deploy" → "New deployment"
//    - Type: Web app
//    - Execute as: Me
//    - Who has access: Anyone
//    - Click "Deploy"
// 
// 5. Click "Authorize access" and allow permissions
// 
// 6. Copy the Web App URL
// 
// 7. Paste that URL into your server.js file (GOOGLE_SCRIPT_URL variable)
// 
// ==============================================================

var SHEET_ID = '1-mIaEpP6cDh8BbBuGnjqfbcsF35a1VUENx8mILJrgxQ';

function getSheet() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Sheet1');
  if (!sheet) sheet = ss.getSheets()[0];
  return sheet;
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet();
    
    // Create headers if first row is empty
    if (sheet.getRange('A1').getValue() === '') {
      sheet.getRange('A1:G1').setValues([['ID', 'Name', 'Email', 'Phone', 'Interest', 'Submitted At', 'Status']]);
      var headerRange = sheet.getRange('A1:G1');
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#0F1B2D');
      headerRange.setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(1, 120);
      sheet.setColumnWidth(2, 160);
      sheet.setColumnWidth(3, 220);
      sheet.setColumnWidth(4, 140);
      sheet.setColumnWidth(5, 300);
      sheet.setColumnWidth(6, 180);
      sheet.setColumnWidth(7, 100);
    }
    
    // Generate ID
    var id = new Date().getTime().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Append row
    var timestamp = new Date().toISOString();
    sheet.appendRow([id, data.name, data.email, data.phone, data.interest, timestamp, data.status || 'pending']);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Application received!',
      id: id
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var sheet = getSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({
        total: 0,
        submissions: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var headers = data[0];
    var submissions = [];
    
    for (var i = 1; i < data.length; i++) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j].toString().toLowerCase().replace(/ /g, '');
        row[key] = data[i][j];
      }
      submissions.push(row);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      total: submissions.length,
      submissions: submissions.reverse()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
