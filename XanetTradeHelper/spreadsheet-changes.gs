/////////////////////////////////////////////////////////////////////////////
// File to dynamically edit the spreadshhet itself on upgrades, yet maintain
// current data.
/////////////////////////////////////////////////////////////////////////////

const SS_CHANGES_VERSION_INTERNAL = '1.0';

// These are currently in Utilities
/*
const custItemStartRow = 214; // Where new items may be added onto price sheet
var idColumnLetter = 'V';
var idColumnNumber = 22;
var itemUpdateRan = false;
*/

// The onOpen() function, when defined, is automatically invoked whenever the
// spreadsheet is opened. For more information on using the Spreadsheet API, see
// https://developers.google.com/apps-script/service_spreadsheet
function onOpen() {
  SCRIPT_PROP = PropertiesService.getScriptProperties();
  let ss = important_getSSID();
  // checkForUpdates();
};

function checkForUpdates() {
  let ver = getSpreadsheetVersion();
  if (ver <= 2.6) {
    addBulkPricing(); // Added in 2.6
  }
}

function addBulkPricing() {
  // See if already there...
  let ver = getSpreadsheetVersion();
  let val = priceSheet().getRange('E4').getValue();
  if (val == 'Security Sensitvity' || val != 'Bulk Pricing') {
    console.log('Cell E4 contains: ' + val);
    console.log('Current version ' + ver + ' Requires Bulk Pricing upgrade!');
  } else {
    console.log('Bulk pricing already in place on the "Price Calc" sheet.');
    return;
  }

  let sheetRange = priceSheet().getDataRange();
  let lastRow = sheetRange.getLastRow();

  priceSheet().insertColumnsAfter(4,2);
  priceSheet().getRange('E4').setValue('Bulk Pricing');
  priceSheet().getRange('E4').setFontFamily('Arial');
  priceSheet().getRange('E4').setFontWeight('bold');
  priceSheet().getRange('E4').setFontSize('10');
  priceSheet().getRange('E4:F4').mergeAcross();
  priceSheet().getRange('E4:F4').setBorder(true, true, true, true, null, null);
  priceSheet().getRange('E6:F6').setValues([['Min Qty', 'Markup (%)']]);
  priceSheet().getRange('E6:F6').setFontFamily('Arial');
  priceSheet().getRange('E6:F6').setFontSize('10');
  priceSheet().getRange('E6:F6').setFontWeights([['bold', 'bold']]);
  priceSheet().getRange('E4:F4').setBackground('#FF9901');
  priceSheet().getRange('E5:F5').setBackground('#337AB7');
  priceSheet().getRange('E6:F6').setBackground('#B6D7A8');
  priceSheet().getRange('E6').setBorder(true, true, true, null, null, null);
  priceSheet().getRange('F6').setBorder(true, null, true, true, null, null);
  priceSheet().getRange(7, 5, lastRow-7, 2).setBackground('#B6D7A8');
  priceSheet().getRange(7, 5, lastRow-7, 2).setFontFamily('Arial');
  priceSheet().getRange(7, 5, lastRow-7, 2).setFontSize('10');
  priceSheet().getRange(7, 5, 800, 1).setNumberFormat('#0');
  priceSheet().getRange(7, 6, 800, 1).setNumberFormat('0.00%'); 

  console.log('Bulk Pricing worksheet update successful!');
}





