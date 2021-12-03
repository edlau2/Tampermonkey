/////////////////////////////////////////////////////////////////////////////
// Helpers/Utilities
/////////////////////////////////////////////////////////////////////////////

const UTILITIES_VERSION_INTERNAL = '2.5';
const defSSID = '1QvFInWMcSiAk_cYNEFwDMRjT8qxXqPhJSgPOCrqyzVg';

//const custItemStartRow = 214; // Where new items may be added onto price sheet
const custItemStartRow = 8; // Change to ANY row
var idColumnLetter = 'V';
var idColumnNumber = 0; // Dynamically adjusted by findIdColumnNum()
var itemUpdateRan = false;

// The onOpen() function, when defined, is automatically invoked whenever the
// spreadsheet is opened. For more information on using the Spreadsheet API, see
// https://developers.google.com/apps-script/service_spreadsheet
// See 'https://developers.google.com/apps-script/guides/triggers' for more details

var SCRIPT_PROP = PropertiesService.getScriptProperties();
function onOpen(e) {
  let ss = important_getSSID();
  console.log(getVersion());
  loadScriptOptions(ss);
  syncPriceCalcWithSheet26(ss);
  // checkForUpdates();
};

// The onEdit(e) trigger runs automatically when a user changes the value of any cell in a spreadsheet.
// See 'https://developers.google.com/apps-script/guides/triggers' for more details
function onEdit(e) {
  let modified = true;
  let ss = e.source;
  console.log(getVersion(ss));
  loadScriptOptions(ss);
  
  let sheet = e.range.getSheet();
  let sheetName = sheet.getName();
  if (!idColumnNumber) idColumnNumber = findIdColumnNum(ss);

  console.log('==> onEdit sheet: "', sheetName , '" rsnge: ', e.range,  ' Old value: ', e.oldValue);

  // Look for changes in column 1, rows > 217
  let isInterestingColumn = (e.range.columnStart <= 1 <= e.range.columnnEnd) ||
                            (e.range.columnStart <= idColumnNumber <= e.range.columnEnd) ||
                            (e.range.columnStart <= e.range.columnEnd <= e.range.columnEnd);
  if (sheetName == 'Price Calc' && isInterestingColumn) {
    console.log('Detected change in names range or ID range! Verifying ID`s...');

    // Migrate changes to Sheet26...
    if (isRangeSingleCell(e.range) && e.range.columnStart == 1) {
      if (opts.opt_fixup26) fixSheet26(e.range, e.oldValue, ss)
    }
    syncPriceCalcWithSheet26(ss);
  }

  priceSheet().getRange('A4').setValue(timenow());
  priceSheet().getRange('A4').setFontFamily('Arial');
  priceSheet().getRange('A4').setFontSize('10');
}

function syncPriceCalcWithSheet26(ss=null) {
  markDupsInPriceList(ss);
  handleNewItems(ss);
  if (opts.opt_autoSort) sortPriceCalc(ss);
}

// Determine the type of common objects
function getObjType(obj) {
  var type = typeof(obj);
  if (type === "object") {
    try {
      // Try a dummy method, catch the error
      type = obj.getObjTypeXYZZY();
    } catch (error) {
      // Should be a TypeError - parse the object type from error message
      type = error.message.split(" object ")[1].replace('.','');
    }
  }
  return type;
}

// Determine the main spreadsheet version, as a number
function getSpreadsheetVersion(ss=null) {
  let verStr = priceSheet(ss).getRange('A2').getValue();
  let verArray = verStr.split(' ');
  let version = +verArray[1]; // The '+' casts the string to a number
  //console.log(version + ' ' + getObjType(version));

  return version;
}

// Load script options
function loadScriptOptions(ss) {
  opts.opt_detectDuplicates = optsSheet(ss).getRange("B3").getValue();
  opts.opt_maxTransactions = optsSheet(ss).getRange("B4").getValue();
  opts.opt_consoleLogging = optsSheet(ss).getRange("B5").getValue();
  opts.opt_colorDataCells = optsSheet(ss).getRange("B6").getValue();
  opts.opt_logRemote = optsSheet(ss).getRange("B7").getValue();
  opts.opt_calcSetItemPrices = optsSheet(ss).getRange("B8").getValue();
  opts.opt_calcSetPointPrices = optsSheet(ss).getRange("B9").getValue();
  opts.opt_clearRunningAverages = optsSheet(ss).getRange("B10").getValue();
  opts.opt_markdown = Number(optsSheet(ss).getRange("B11").getValue());
  opts.opt_useLocks = optsSheet(ss).getRange("B12").getValue();
  opts.opt_allowUI = optsSheet(ss).getRange("B13").getValue();
  opts.opt_profile = optsSheet(ss).getRange("B14").getValue();
  opts.opt_autoSort = optsSheet(ss).getRange("B15").getValue();
  opts.opt_fixup26 = optsSheet(ss).getRange("B16").getValue();

  // AWH options
  opts.awhBaseURL = optsSheet(ss).getRange("B23").getValue();
  opts.awhKey = optsSheet(ss).getRange("B24").getValue();
  opts.opt_getItemBids = optsSheet(ss).getRange("B25").getValue();

  if (opts.opt_calcSetItemPrices && opts.opt_calcSetPointPrices) {
    log('ALERT: Can`t have both set item prices and ' + 
    'set point prices enabled, point prices will take precedence!');
    opts.opt_calcSetItemPrices = false;
    optsSheet(ss).getRange("B8").setValue(false);
  }

  console.log('loadScriptOptions: ', opts);
}

// Versioning info
function getVersion(ss=null) {
  return 'XANET_API_INTERFACE_VERSION_INTERNAL = "' + XANET_API_INTERFACE_VERSION_INTERNAL + '"\n' +
         'XANET_TRADE_HELPER_VERSION_INTERNAL = "' + XANET_TRADE_HELPER_VERSION_INTERNAL + '"\n' +
         'UTILITIES_VERSION_INTERNAL = "' + UTILITIES_VERSION_INTERNAL + '"\n' +
         'BATCHAPI_VERSION_INTERNAL = "' + BATCHAPI_VERSION_INTERNAL + '"\n' +
         'SSID: ' + (ss ? ss.getKey() : important_getSSID().getKey());
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

// Delete any saved spreadsheet key - debugging utility only.
function deleteSSID() {
  SCRIPT_PROP.deleteProperty("key");
  console.log('Deleted saved SSID');
}

// Find any duplicate names in 'price calc' and highlight
function markDupsInPriceList() {
  log('markDupsInPriceList ==>');
  let dupsFound = 0;
  let psStartRow = 8; // Start of data on the price sheet
  let nameCol = 1; // Column for name, (both sheets)

  var sheetRange = priceSheet().getDataRange();
  var dataRange = priceSheet().getRange(psStartRow, nameCol, sheetRange.getLastRow(), 1);
  var lastRow = dataRange.getLastRow(); // May be less than the sheet's last row 

  // dataRangeArr will be an array of [name], with [0] being row 8
  dataRange = priceSheet().getRange(psStartRow, nameCol, lastRow, 1);
  var dataRangeArr = dataRange.getValues();

  for (let i=0; i < dataRangeArr.length; i++) {
    let checkName = dataRangeArr[i].toString().trim();
    if (!checkName) {
      break;
    }

    for (let j = i+1; j < dataRangeArr.length; j++) {
      let compareName = dataRangeArr[j].toString().trim();
      if (checkName == compareName) { // Duplicate row!
        console.log('Warning! Duplicate row found in "price calc" for "a "' + 
          checkName + '" at row ' + psStartRow + j + '!');
        dupsFound++;
        let maxColumns = sheetRange.getLastColumn();
        priceSheet().getRange(psStartRow + j, 1, 1, maxColumns).setBackground("yellow");
        break;
      }
    }
  }

  SpreadsheetApp.flush();
  log('<== markDupsInPriceList finished, found ' + dupsFound + ' duplicates');
  return dupsFound;
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

// Replacement for Google Sheet's vlookup fn, for use in JS
// In order to match vlookup, 'index' is 1-based (col number)
// 'range' is an array, use range.getValues.
//
// TBD: just pass in 'range', not 'rangeArr' !!!
function vlookupscript(search_key, rangeArr, matchIndex, returnIndex) {
  var returnVal = null;
  for (var i in rangeArr) {
    if (rangeArr[i][matchIndex - 1] == search_key) {
      returnVal = rangeArr[i][returnIndex - 1];
      break;
    }
  }
  return returnVal;
}

// Get a column letter from number
function numToSSColumn(num) {
  var s = '', t;
  while (num > 0) {
    t = (num - 1) % 26;
    s = String.fromCharCode(65 + t) + s;
    num = (num - t)/26 | 0;
  }
  return s || undefined;
}

// Get handles to various worksheets in the spreadsheet
function getDocById(ss=null) {
  if (ss) return ss;
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

// Helpers to get various sheets by name
var saved10 = null;
function sheet10(ss=null) {
  if (!saved10) saved10 = getDocById(ss).getSheetByName('Sheet10');
  return saved10;
}

var saved26 = null;
function sheet26(ss=null) {
  if (!saved26) saved26 = getDocById(ss).getSheetByName('Sheet26');
  return saved26;
}

var savedDS = null;
function datasheet(ss=null) {
  if (!savedDS) savedDS = getDocById(ss).getSheetByName('Data');
  return savedDS;
}

var savedPS = null;
function priceSheet(ss=null) {
  //getDocById(...).getSheetByName is not a function
  if (!savedPS) savedPS = getDocById(ss).getSheetByName('Price Calc');
  return savedPS;
}

function priceSheet2(ss=null) { // Backwards compatibility
  return itemSheet(ss);
}

var savedIS = null;
function itemSheet(ss=null) {
  if (!savedIS) savedIS = getDocById(ss).getSheetByName('Item List');
  return savedIS;
}

var savedAS = null;
function avgSheet(ss=null) {
  if (!savedAS) savedAS = getDocById(ss).getSheetByName('Running Averages');
  return savedAS;
}

var savedOS = null;
function optsSheet(ss=null) {
  if (!savedOS) savedOS = getDocById(ss).getSheetByName('Options');
  return savedOS;
}

var savedTS = null;
function lastTradeSheet(ss=null) {
  if (!savedTS) savedTS = getDocById(ss).getSheetByName('Last Trade');
  return savedTS;
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

/////////////////////////////////////////////////////////////////////////////
// This function handles any potential new items on the price sheet,
// insert after row 214 (custItemStartRow = 214). Their ID's need
// to be added to col 'V' (idColumnLetter, or idColumnNumber). As this column
// may change, detect it dynamicaly via row 7, search for 'ID'.
/////////////////////////////////////////////////////////////////////////////

function handleNewItems(ss=null) {
  if (getSpreadsheetVersion(ss) < 2.6) return;
  log('handleNewItems ==>');
  if (!idColumnNumber) idColumnNumber = findIdColumnNum(); // Make sure we know where ID's go
  let sheetRange = priceSheet(ss).getDataRange();
  let lastRow = sheetRange.getLastRow();
  let dataRange = priceSheet(ss).getRange(custItemStartRow, 1, lastRow - custItemStartRow, 1);
  let values = dataRange.getValues();
  var itemRange = itemSheet(ss).getRange(2, nameCol, 1159, 2);
  var itemRangeArr = itemRange.getValues();
  let newItems = 0;

  for (let i=0; i<values.length; i++) {
    let itemName = values[i];
    // skip '(points based)' and '(item based)'
    if (itemName.toString().includes('points based') || itemName.toString().includes('item based')) continue;
    if (itemName != '') {
      let row = (custItemStartRow + i);
      let cell = priceSheet(ss).getRange(idColumnLetter + row);
      let currentID = cell.getValue();
      if (!currentID) {
        console.log('Found new item "' + itemName + '" at row ' + row);
        console.log('New item: "' + itemName + '" at row ' + row + ' ID: ' + currentID);
      }
      let id = vlookupscript(itemName, itemRangeArr, 1, 2);
      //console.log(row + ': lookup for ' + itemName + ' returned ' + id + 
      //  ' Saved is ' + currentID);
      if (!id || isNaN(Number(id))) id = ''; // Account for 'undefined', NaN, etc.
      if (id != currentID) {
        console.log('Found mis-matched IDs at row ' + row +', "' + itemName + '"');
        newItems++;
        cell.setValue(id);
        console.log('Set new ID: ' + id + ' Old ID: ' + currentID);
      }
    }
  }
  console.log('Updated ' + newItems + ' item IDs.');
  itemUpdateRan = true;
  //if (newItems) markDupsInPriceList();

  SpreadsheetApp.flush();
  log('<== handleNewItems');
  return newItems;
}

// Find the column on 'Price Sheet' that stores Item ID's
function findIdColumnNum(ss=null) {
  log('  findIdColumnNum ==>');
  let sheetRange = priceSheet(ss).getDataRange();
  let lastColumn = sheetRange.getLastColumn();
  let dataRange = priceSheet(ss).getRange(7, 1, 1, lastColumn);
  let values = dataRange.getValues(); // all values, but index from 0, not 1.
  for (let i=1; i<values[0].length; i++) {
    if (values[0][i] == 'ID') {
      idColumnNumber = i+1;
      idColumnLetter = numToSSColumn(idColumnNumber);
      console.log('Found ID column at ' + (i+1) + ', '+ idColumnLetter);
      idColumnNumber = i+1;
      log('  <== findIdColumnNum (' + idColumnNumber + ')');
      return idColumnNumber;
    }
  }

  log('<== findIdColumnNum');
  return idColumnNumber;
}

// Sort 'Price Calc' by col AA (last column, item 'type') then col B (market price)
function sortPriceCalc(ss=null) {
  log('sortPriceCalc ==>');
  let sheetRange = priceSheet(ss).getDataRange();
  let lastRow = sheetRange.getLastRow();
  let lastColumn = sheetRange.getLastColumn();
  let dataRange = priceSheet(ss).getRange(8, 1, lastRow, lastColumn);
  log('Sorting Price Calc by col. ' + lastColumn + ' then by col 2');
  dataRange.sort([{column: lastColumn}, {column: 2}]);
  SpreadsheetApp.flush();
  log('<== Finished sorting Price Calc.');
}

function isRangeSingleCell(range) {
  if (range.columnEnd == range.columnStart && range.rowEnd == range.rowStart) {
    console.log('isRangeSingleCell: TRUE, value = ' + range.getValue());
    return true;
  }
  console.log('isRangeSingleCell: FALSE');
  return false;
}

function fixSheet26(range, oldValue, ss=null) {
  log('Fixing up Sheet 26 ==>');
  if (!isRangeSingleCell(range)) {
    console.log('==> fixSheet26: unable to fix up, not a single cell: ', range);
    return;
  }

  let sheetRange = sheet26(ss).getDataRange();
  let dataRange = sheet26(ss).getRange(1, 1, sheetRange.getLastRow(), 1);
  let valArray = dataRange.getValues(); // All values in Col A, Sheet 26
  let emptyCellRange = null;
  let emptyRow = 0;

  // 'range' seems to have the range, but isn't an actual range! Make a new range to get the value.
  // We know we are only called here if 'Price Calc' is edited, so get range (and value) from
  // there. This must be done before sorting!
  let newValue = range.getValue(); // New cell value

  // Find the row with the old value on Sheet26 (if any)
  // While there, try to find the first empty row.
  // Note: rows and array indices are off by one!!!
  let sheet26row = 0;
  log('fixSheet26: oldValue = "' + oldValue + '"');
  if (oldValue) { // Case 1: cell removed (or changed), set to '1' on Sheet26
    console.log('Deleting ID for "' + oldValue + '" in row ' + range.rowStart + ' on Price Calc');
    priceSheet(ss).getRange(range.rowStart, idColumnNumber, 1, 1).setValue('');
    
    console.log('Looking for ' + oldValue + ' on Sheet26 to remove.');
    for (let i=0; i<valArray.length; i++) {
      if (!emptyCellRange && (valArray[i] == '1' || !valArray[i])) {
        emptyRow = i+1;
        emptyCellRange = sheet26(ss).getRange(emptyRow, 1, 1, 1);
        console.log('Found first empty row at ' + emptyRow + ' on Sheet26');
      }
      if (oldValue.toLowerCase() == valArray[i].toString().toLowerCase()) {
        sheet26row = i+1;
        if (!emptyRow || ((i+1) < emptyRow)) {
          emptyRow = i+1;
          emptyCellRange = sheet26(ss).getRange(emptyRow, 1, 1, 1);
          console.log('First empty row now set to row ' + emptyRow + ' on Sheet26');
        }
        sheet26(ss).getRange(sheet26row, 1, 1, 1).setValue('1');
        console.log('Item ' + oldValue + ' removed, row ' + sheet26row + ' set to `1` on Sheet26.')
        if (!newValue) {
          SpreadsheetApp.flush();
          console.log('<== Finished fixing up Sheet26');
          return; 
        }
        break;
      }
    }
    console.log('Old value found at row ' + sheet26row + '. If 0, indicates not found.');
  }

  // Case 2: Cell added or changed, find first empty row on Sheet26, indicated
  // by a '1' (or blank), and insert the new name there.
  log('fixSheet26: newValue = "' + newValue + '"');
  if (newValue) {
    console.log('Looking for first empty row to insert ' + newValue);
    if (!emptyCellRange) {
      for (let i=sheet26row; i<valArray.length; i++) {
        if (!emptyCellRange && (valArray[i] == '1' || !valArray[i])) {
          emptyRow = i+1;
          emptyCellRange = sheet26(ss).getRange(emptyRow, 1, 1, 1);
          console.log('First empty row found at row ' + emptyRow);
          break;
        }
      }
    }
  }

  SpreadsheetApp.flush();
  log('<== Finished fixing up Sheet26');

  if (!emptyCellRange) return (console.log('fixSheet26: didn`t find an empty row!'));
  emptyCellRange.setValue(newValue);
  return (emptyRow ? console.log('New value successfully inserted at row ' + emptyRow + ' on Sheet26.') :
          console.log('Unable to find empty row on Sheet26!'));
}



