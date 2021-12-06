/////////////////////////////////////////////////////////////////////////////
// File to dynamically edit the spreadsheet itself on upgrades, yet maintain
// current data.
/////////////////////////////////////////////////////////////////////////////

const SS_CHANGES_VERSION_INTERNAL = '1.1';

/**
 * Checks for any updates that may be added and supported
 * by the spreadsheet vesion, but not actually in the sheets.
 * Installs them if possible.
 */
function checkForUpdates() {
  let ver = getSpreadsheetVersion();
  if (ver <= 2.6) {
    addBulkPricing(); // Added in 2.6
  }
}

/**
 * Removes the Bulk Pricing columns fom the Price Calc sheet
 */
function removeBulkPricing(ss=null) {
  log('removeBulkPricing ==>');
  let ver = getSpreadsheetVersion();
  let sheet = priceSheet(ss);
  let val = sheet.getRange('E4').getValue();
  if (val == 'Security Sensitvity' || val != 'Bulk Pricing') {
    console.log('Price Calc cell E4 contains: ' + val);
    console.log('<== removeBulkPricing: not installed!');
    return;
  } else {
    console.log('removeBulkPricing: removing ==>');
  }
  sheet.deleteColumns(5, 2);
  console.log('<== removeBulkPricing: complete.');
}

/**
 * If required and the spreadsheet version is 2.6 or above, adds the 
 * two bulk pricing columns, completely formatted.
 */
function addBulkPricing(ss=null) {
  console.log('addBulkPricing ==>');
  // See if already there...
  let ver = getSpreadsheetVersion();
  let sheet = priceSheet(ss);
  let val = sheet.getRange('E4').getValue();
  if (val == 'Security Sensitvity' || val != 'Bulk Pricing') {
    console.log('Cell E4 contains: ' + val);
    console.log('Current version ' + ver + ' supports Bulk Pricing upgrade!');
  } else {
    console.log('<== Bulk pricing already in place on the "Price Calc" sheet.');
    return;
  }

  let sheetRange = sheet.getDataRange();
  let lastRow = sheetRange.getLastRow();

  sheet.insertColumnsAfter(4,2);
  sheet.getRange('E4').setValue('Bulk Pricing');
  sheet.getRange('E4').setFontFamily('Arial');
  sheet.getRange('E4').setFontWeight('bold');
  sheet.getRange('E4').setFontSize('10');
  sheet.getRange('E4:F4').mergeAcross();
  sheet.getRange('E4:F4').setBorder(true, true, true, true, null, null);
  sheet.getRange('E6:F6').setValues([['Min Qty', 'Markup ($)']]);
  sheet.getRange('E6:F6').setFontFamily('Arial');
  sheet.getRange('E6:F6').setFontSize('10');
  sheet.getRange('E6:F6').setFontWeights([['bold', 'bold']]);
  sheet.getRange('E4:F4').setBackground('#FF9901');
  sheet.getRange('E5:F5').setBackground('#337AB7');
  sheet.getRange('E6:F6').setBackground('#B6D7A8');
  sheet.getRange('E6').setBorder(true, true, true, null, null, null);
  sheet.getRange('F6').setBorder(true, null, true, true, null, null);
  sheet.getRange(7, 5, lastRow-7, 2).setBackground('#B6D7A8');
  sheet.getRange(7, 5, lastRow-7, 2).setFontFamily('Arial');
  sheet.getRange(7, 5, lastRow-7, 2).setFontSize('10');
  sheet.getRange(7, 5, 800, 1).setNumberFormat('#0');
  sheet.getRange(7, 6, 800, 1).setNumberFormat("[$S/.]#,##0"); 

  console.log('<== addBulkPricing success.');
}
