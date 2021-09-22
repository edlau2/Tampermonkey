function writeReceiptAsPDF() {

  // This is hard-coded to pull from the worksheet 'Receipt Generation'
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rgs = ss.getSheetByName('Receipt Generation');

  // Get the data you want to export. For us, A1:E<last row>, no blank rows.
  let lastRow = rgs.getLastRow();
  let rangeStr = 'A1:E' + lastRow;
  let sourceRange = rgs.getRange(rangeStr);
  let sourceValues = sourceRange.getValues();

  // Get the Drive folder you want to store your PDF to. 
  // Otherwise use root folder (if you dont mind about this)
  let root = DriveApp.getRootFolder();
  let folderID = root.getId();
  let folder = DriveApp.getFolderById(folderID);
  
  // Create a blank spreadsheet and worksheet to be able to export just the range
  let destSpreadsheet = SpreadsheetApp.create('Temp PDF');

  // Create the temp sheet to hold our data
  let sheet2 = destSpreadsheet.getSheetByName('Temp');
  if (sheet2) {ss.deleteSheet(sheet2)};
  sheet2 = destSpreadsheet.insertSheet('Temp');

  // Copy data. The calls to 'flush()' are for my peace of mind, during debugging.
  let destRange = sheet2.getRange(rangeStr);
  destRange.setValues(sourceValues);

  // Copy formatting
  destRange.setTextStyles(sourceRange.getTextStyles());
  destRange.setBackgrounds(sourceRange.getBackgrounds());
  destRange.setFontColors(sourceRange.getFontColors());
  destRange.setFontFamilies(sourceRange.getFontFamilies());
  destRange.setFontLines(sourceRange.getFontLines());
  destRange.setFontStyles(sourceRange.getFontStyles());
  destRange.setFontWeights(sourceRange.getFontWeights());
  destRange.setHorizontalAlignments(sourceRange.getHorizontalAlignments());
  destRange.setNumberFormats(sourceRange.getNumberFormats());
  destRange.setTextDirections(sourceRange.getTextDirections());
  destRange.setTextRotations(sourceRange.getTextRotations());
  destRange.setVerticalAlignments(sourceRange.getVerticalAlignments());
  destRange.setWrapStrategies(sourceRange.getWrapStrategies());
  SpreadsheetApp.flush();

  // Remove blank rows
  removeEmptyLines(sheet2);
  SpreadsheetApp.flush();
  
  // Hide all the rows and columns that do not have content 
  let endRow = sheet2.getLastRow()+1, numRow = sheet2.getMaxRows()-sheet2.getLastRow();
  if (numRow > 0) {sheet2.hideRows(sheet2.getLastRow()+1, sheet2.getMaxRows()-sheet2.getLastRow());}
  
  let endCol = sheet2.getLastColumn()+1, numCol = sheet2.getMaxColumns()-sheet2.getLastColumn();
  if (numCol > 0) {sheet2.hideColumns(sheet2.getLastColumn()+1, sheet2.getMaxColumns()-sheet2.getLastColumn());}
  
  SpreadsheetApp.flush();

  // Delete the first sheet that is automatically created when you create a new spreadsheet
  destSpreadsheet.deleteSheet(destSpreadsheet.getSheetByName('Sheet1'));
  
  // Export our new spreadsheet to PDF
  let theBlob = destSpreadsheet.getBlob().getAs('application/pdf').setName('receipt.pdf');
  let newFile = folder.createFile(theBlob);
  
  //Delete the spreadsheet we created to export this range. 
  DriveApp.getFileById(destSpreadsheet.getId()).setTrashed(true);

  launchOpenDialog(newFile);
}

function launchOpenDialog(file) {
  let url = file.getUrl();
  let name = file.getName();
  let html=Utilities.formatString('The receipt has been generated as "%s" in the root of your Google Drive.<br><br>Right-click this link:<br><br><a href="%s">%s</a><br><br>and chose "Open Link in New Tab" to view.', name, url, name);

  let ui=HtmlService.createHtmlOutput(html);
  SpreadsheetApp.getUi().showModelessDialog(ui, "Xanet's Trade Helper");
}

function isEmptyRow(row){
  for (let columnIndex = 0; columnIndex < row.length; columnIndex++){
    let cell = row[columnIndex];
    if (cell){
      return false;
    }
  }
  return true;
}

function removeEmptyLines(sheet) {
  let lastRowIndex = sheet.getLastRow();
  let lastColumnIndex = sheet.getLastColumn();
  let maxRowIndex = sheet.getMaxRows(); 
  let range = sheet.getRange(1, 1, lastRowIndex, lastColumnIndex);
  let data = range.getValues();
  sheet.deleteRows(lastRowIndex+1, maxRowIndex-lastRowIndex);

  for (let rowIndex = data.length - 1; rowIndex >= 0; rowIndex--){
    let row = data[rowIndex];

    if (isEmptyRow(row)){
      sheet.deleteRow(rowIndex + 1);
    }
  }
}
