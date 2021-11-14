/////////////////////////////////////////////////////////////////////////////
// Helpers/Utilities
/////////////////////////////////////////////////////////////////////////////

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
         'XANET_TRADE_HELPER_VERSION_INTERNAL = "' + XANET_TRADE_HELPER_VERSION_INTERNAL + '"';
}

// Perform an array deep copy
function deepCopy(copyArray) {
    return JSON.parse(JSON.stringify(copyArray));
}

// Helper to optionally log.
function log(data) {
  if (opts.opt_consoleLogging) console.log(data);
}

// Get handles to various worksheets in the spreadsheet
function getDocById() {
  return SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
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
