/////////////////////////////////////////////////////////////////////////////
// Helpers/Utilities
/////////////////////////////////////////////////////////////////////////////

const UTILITIES_VERSION_INTERNAL = '1.0';
const defSSID = '1QvFInWMcSiAk_cYNEFwDMRjT8qxXqPhJSgPOCrqyzVg';

// The onOpen() function, when defined, is automatically invoked whenever the
// spreadsheet is opened. For more information on using the Spreadsheet API, see
// https://developers.google.com/apps-script/service_spreadsheet
function onOpen() {
  SCRIPT_PROP = PropertiesService.getScriptProperties();
  let ss = important_getSSID();
};

// Load script options
function loadScriptOptions() {
  opts.opt_detectDuplicates = optsSheet().getRange("B3").getValue();
  opts.opt_maxTransactions = optsSheet().getRange("B4").getValue();
  opts.opt_consoleLogging = optsSheet().getRange("B5").getValue();
  opts.opt_colorDataCells = optsSheet().getRange("B6").getValue();
  opts.opt_logRemote = optsSheet().getRange("B7").getValue();
  opts.opt_calcSetItemPrices = optsSheet().getRange("B8").getValue();
  opts.opt_calcSetPointPrices = optsSheet().getRange("B9").getValue();
  opts.opt_clearRunningAverages = optsSheet().getRange("B10").getValue();
  opts.opt_markdown = Number(optsSheet().getRange("B11").getValue());
  opts.opt_useLocks = optsSheet().getRange("B12").getValue();
  opts.awhKey = optsSheet().getRange("B19").getValue();
  opts.awhBaseURL = optsSheet().getRange("B18").getValue();
  opts.opt_getItemBids = optsSheet().getRange("B20").getValue();
  opts.opt_allowUI = optsSheet().getRange("B13").getValue();
  opts.opt_profile = optsSheet().getRange("B14").getValue();

  if (opts.opt_calcSetItemPrices && opts.opt_calcSetPointPrices) {
    log('ALERT: Can`t have both set item prices and ' + 
    'set point prices enabled, point prices will take precedence!');
    opts.opt_calcSetItemPrices = false;
    optsSheet().getRange("B8").setValue(false);
  }

  console.log('loadScriptOptions: ', opts);
}

// Versioning info
function getVersion() {
  return 'XANET_API_INTERFACE_VERSION_INTERNAL = "' + XANET_API_INTERFACE_VERSION_INTERNAL + '"\n' +
         'XANET_TRADE_HELPER_VERSION_INTERNAL = "' + XANET_TRADE_HELPER_VERSION_INTERNAL + '"\n' +
         'UTILITIES_VERSION_INTERNAL = "' + UTILITIES_VERSION_INTERNAL + '"\n' +
         'SSID: ' + important_getSSID().getKey();
}

// Function to get the spredsheet handle by SSID
// See also ssidTest() in 'unitTests.gs'
var SCRIPT_PROP = PropertiesService.getScriptProperties();
function important_getSSID() {
  let ss = null;
  let savedKey = SCRIPT_PROP.getProperty("key");
  if (!savedKey) {
    let doc = SpreadsheetApp.getActiveSpreadsheet();
    if (doc) {
      console.log('Saved SSID not found, using current SSID:', doc.getId())
      SCRIPT_PROP.setProperty("key", doc.getId());
      console.log('Saved SSID: ' + doc.getId());
    }
  }

  try {
    ss = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    if (ss) console.log('Used saved SSID: ', ss.getKey());
  } catch (e) {
    console.log('Error: ' , e + '\nWill retry with default SSID (' + defSSID + ')');
    ss = SpreadsheetApp.openById(defSSID);
    if (ss) {
      SCRIPT_PROP.setProperty("key", ss.getKey());
      console.log('Saved SSID: ', ss.getKey());
    }
  } finally {
    return ss;
  }
}

// Delete any saved spreadsheet key - debuggin utility only.
function deleteSSID() {
  SCRIPT_PROP.deleteProperty("key");
  console.log('Deleted saved SSID');
}

// Prevents the exception 'Cannot call SpreadsheetApp.getUi() from this context.'
// from being propogated if called from a triggered function.
//
// Used as a replacement for 'if (opts.opt_allowUI) SpreadsheetApp.getUi().alert(...)'
function safeAlert(...args) {
  if (!opts.opt_allowUI) return;
  try {
    let ui = SpreadsheetApp.getUi();
    let output = '';
    args.forEach(arg => {output += (arg + '\n')});
    ui.alert(output);
  } catch (e) {
    e.from = 'safeAlert()';
    console.log('Exception: ', e);
  }
}

// Get handles to various worksheets in the spreadsheet
function getDocById() {
  if (!SCRIPT_PROP.getProperty("key")) {
    important_getSSID();
  }
  return SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
}

// Helper function used to get time formatted for the running averages sheet
// Formatted as: mm/dd/yyyy 00:00:00 TCT
function timenow() {
  return Utilities.formatDate(new Date(), "GMT", "MM/dd/yyy HH:mm:ss");
}

// Perform an array deep copy
function deepCopy(copyArray) {
    return JSON.parse(JSON.stringify(copyArray));
}

// Helper to optionally log.
function log(data) {
  if (opts.opt_consoleLogging) console.log(data);
}

function datasheet() {
  return getDocById().getSheetByName('Data');
}

function priceSheet() {
  return getDocById().getSheetByName('Price Calc');
}

function priceSheet2() {
  return getDocById().getSheetByName('Item List');
}

// Get handle to the 'Items' sheet.
function itemSheet() {
  return getDocById().getSheetByName('Item List');
}

function avgSheet() {
  return getDocById().getSheetByName('Running Averages');
}

function optsSheet() {
  return getDocById().getSheetByName('Options');
}

function lastTradeSheet() {
  return getDocById().getSheetByName('Last Trade');
}

// Format a number as currency
function asCurrency(num) {
  var formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',

  // These options are needed to round to whole numbers if that's what you want.
  //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  });

  return formatter.format(num);
}
