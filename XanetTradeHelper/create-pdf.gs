/**
 * function writeReceiptAsPDF()
 * 
 * Creates a receipt, using data from the Last Trade worksheet,
 * in PDF format
 */
var opts = {};
var TEMPLATE_LAST_ROW = 10; // Last row of valid template data

function writeReceiptAsPDF(ss=null) {
  console.log('[writeReceiptAsPDF] ==>');

  // This is hard-coded to pull from the worksheet 'Receipt Generation'
  if (!ss) ss = important_getSSID();
  loadScriptOptions(ss);
  const rgs = ss.getSheetByName('Receipt Generation');

  // Get the data you want to export. For us, A1:E<last row>, no blank rows.
  let lastRow = TEMPLATE_LAST_ROW; //rgs.getLastRow();
  let rangeStr = 'A1:E' + (lastRow + 1).toString();
  let sourceRange = rgs.getRange(rangeStr);
  let sourceValues = sourceRange.getValues();

  console.log('RGS: last row ', lastRow);
  console.log('RGS: rangeStr ', rangeStr);

  // Get the Drive folder you want to store your PDF to. 
  // Otherwise use root folder (if you don't mind about this)
  let root = DriveApp.getRootFolder();
  let folderID = root.getId();
  let folder = DriveApp.getFolderById(folderID);
  
  // Create a blank spreadsheet and worksheet to be able to export just the range
  let destSpreadsheet = SpreadsheetApp.create('Temp PDF');

  // Create the temp sheet to hold our data
  let sheet2 = destSpreadsheet.getSheetByName('Temp');
  if (sheet2) {ss.deleteSheet(sheet2)};
  sheet2 = destSpreadsheet.insertSheet('Temp');

  // Copy template data. The calls to 'flush()' are for my peace of mind, during debugging.
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

  // Gridlines...
  sheet2.getRange('B1:E4').setBorder(true, true, true, true, true, true, "white", null);
  sheet2.getRange('B5:E6').setBorder(true, true, true, true, true, true, "black", null);
  sheet2.getRange('B7:E9').setBorder(null, true, null, true, true, true, "white", null);
  sheet2.getRange('B10:E10').setBorder(true, true, true, true, true, true, "black", null);

  // Set width and height of columns and rows
  for (let i = 1; i <= lastRow; i++) {sheet2.setRowHeight(i, rgs.getRowHeight(i));}
  for (let i = 1; i <= 5; i++) {sheet2.setColumnWidth(i, rgs.getColumnWidth(i));}

  // Remove blank rows
  //removeEmptyLines(sheet2);

  // Get the data from the 'Last Trade' sheet - trade ID, total cost & quantity,
  // itemized data and date/timestamps.
  let rowObj = getLastTrade(ss);
  let lastID = rowObj.id;
  let firstTradeRow = rowObj.firstRow;
  let lastTradeRow = rowObj.lastRow;
  let tradeDate = lastTradeSheet(ss).getRange('A' + firstTradeRow).getValue();
  let tradeTime = lastTradeSheet(ss).getRange('A' + (firstTradeRow+1).toString()).getValue();
  let tradeData = lastTradeSheet(ss).getRange('C' + firstTradeRow + ':F' + lastTradeRow).getValues();
  let qtyData = lastTradeSheet(ss).getRange('D' + firstTradeRow + ':D' + lastTradeRow).getValues();
  let costData = lastTradeSheet(ss).getRange('F' + firstTradeRow + ':F' + lastTradeRow).getValues();

  console.log('qtyData: ', qtyData);
  console.log('costData: ', costData);

  // Calc total qty and cost.
  let totQty = 0;
  let totCost = 0;
  for (let i=0; i<qtyData.length; i++) {
    totQty += qtyData[i][0];
    totCost += costData[i][0];
  }
  console.log('totQty: ', totQty, ' totCost: ', totCost);
  sheet2.getRange('B6:E6').setValues([[asCurrency(totCost), totQty, tradeDate, tradeTime]]);
  rgs.getRange('B6:E6').setValues([[asCurrency(totCost), totQty, tradeDate, tradeTime]]);

  // Copy trade data. Also copy to template, for a visual representation
  console.log('Copying trade data');
  let destFirstRow = TEMPLATE_LAST_ROW + 1;
  sheet2.getRange(destFirstRow, 2, tradeData.length, 4).setValues(tradeData);
  rgs.getRange(destFirstRow, 2, tradeData.length, 4).setValues(tradeData);

  // Set number formats (last 2 columns)
  sheet2.getRange(destFirstRow, 4, tradeData.length, 2).setNumberFormats(rgs.getRange(destFirstRow, 4, tradeData.length, 2).getNumberFormats());

  SpreadsheetApp.flush();
  // Hide all the rows and columns that do not have content 
  let endRow = sheet2.getLastRow()+1, numRow = sheet2.getMaxRows()-sheet2.getLastRow();
  if (numRow > 0) {sheet2.hideRows(endRow, numRow);}
  
  let endCol = sheet2.getLastColumn()+1, numCol = sheet2.getMaxColumns()-sheet2.getLastColumn();
  if (numCol > 0) {
    if (numCol > 1) {sheet2.hideColumn(sheet2.getRange("A1"));}
    sheet2.hideColumns(endCol, numCol);
    }

  SpreadsheetApp.flush();
  console.log('Copy complete.');

  // Delete the first sheet that is automatically created when you create a new spreadsheet
  destSpreadsheet.deleteSheet(destSpreadsheet.getSheetByName('Sheet1'));
  
  // Export our new spreadsheet to PDF
  console.log('Writing PDF.');
  let pdfName = 'receipt-' + lastID.toString() + '.pdf';
  let theBlob = destSpreadsheet.getBlob().getAs('application/pdf').setName(pdfName);
  let newFile = folder.createFile(theBlob);
  
  //Delete the spreadsheet we created to export this range. 
  DriveApp.getFileById(destSpreadsheet.getId()).setTrashed(true);

  launchOpenDialog(newFile);
  console.log('<== [writeReceiptAsPDF]');
}

/**
 * Function getLastTrade()
 * 
 * Get the first row of the last trade, from the Last Trade sheet
 * 
 * @param ss - active spreadsheet
 * 
 * @return object {id, firstRow, lastRow}
 */
function getLastTrade(ss) {
  console.log('[lastTradeFirstRow] ==>')
  let tds = lastTradeSheet(ss);
  let lastRow = tds.getDataRange().getLastRow();
  let idValues = tds.getRange('B2:B' + lastRow).getValues();
  let endIndex = idValues.length - 1;
  let lastIndex = 0;
  for (let lastIndex=endIndex; lastIndex >=0; lastIndex--) {
    if (idValues[lastIndex][0] != '') break;
  }
  console.log('lastIndex: ', lastIndex+1, ' ID: ', idValues[lastIndex+1][0], ' row: ', lastIndex+3);
  let rvalue = {'id': idValues[lastIndex+1][0], 'firstRow': lastIndex+3, 'lastRow': lastRow};
  console.log('rvalue: ', rvalue);
  return rvalue;
}

/**
 * Function launchOpenDialog(file)
 * 
 * Launches a modal dialog offering to open the generated PDF
 * 
 * @param file - name of file to open on 'OK'
 */
function launchOpenDialog(file) {
  console.log('[launchOpenDialog] ==>');
  console.log('Options: ', opts);
  if (!opts.opt_allowUI) return;

  let url = file.getUrl();
  let name = file.getName();
  let html=Utilities.formatString('The receipt has been generated as "%s" in the root of your Google Drive.<br><br>Right-click this link:<br><br><a href="%s">%s</a><br><br>and chose "Open Link in New Tab" to view.', name, url, name);

  try {
    let ui=HtmlService.createHtmlOutput(html);
    SpreadsheetApp.getUi().showModelessDialog(ui, "Xanet's Trade Helper");
  } catch (e) {
    e.from = 'launchOpenDialog()';
    console.log('Exception: ', e);
  }
}

/**
 * Function isEmptyRow()
 * 
 * Determines if a row has any data in it.
 */
function isEmptyRow(row){
  for (let columnIndex = 0; columnIndex < row.length; columnIndex++){
    let cell = row[columnIndex];
    if (cell){
      return false;
    }
  }
  return true;
}

/**
 * Function removeEmptyLines(sheet)
 * 
 * @param sheet - Spreadsheet object to scan
 */
function removeEmptyLines(sheet) {
  let lastRowIndex = sheet.getLastRow();
  let lastColumnIndex = sheet.getLastColumn();
  let maxRowIndex = sheet.getMaxRows(); 
  let range = sheet.getRange(1, 1, lastRowIndex, lastColumnIndex);
  let data = range.getValues();
  sheet.deleteRows(lastRowIndex+1, maxRowIndex-lastRowIndex);

  // Change: ignore entire template
  for (let rowIndex = data.length - 1; rowIndex >= 10; rowIndex--) {
    let row = data[rowIndex];

    // Skip rows 7, 8, and 9
    if (rowIndex >= 7 && rowIndex <=9) continue;

    if (isEmptyRow(row)){
      sheet.deleteRow(rowIndex + 1);
    }
  }
}
