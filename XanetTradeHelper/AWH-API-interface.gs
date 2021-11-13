/////////////////////////////////////////////////////////////////////////////
// File: AWH-API-interface.gs
/////////////////////////////////////////////////////////////////////////////

// Versioning, internal
var HEJBRO_API_INTERFACE_VERSION_INTERNAL = '1.0';
function getVersion() {
  return 'HEJBRO_API_INTERFACE_VERSION_INTERNAL = "' + HEJBRO_API_INTERFACE_VERSION_INTERNAL + '"';
}

// Function that calls the main unit test, here so I can set breakpoints here and not step in.
// function doIt() {doMainTest();}

//
// This must be run before using this script. Select 'Run->Run Function->Setup' to do so.
// It saves the script ID so it doesn't have to be hard-coded manually.
//
// Alternatively, you can set the ID as ssID, below, and use that instead. 
// (above the function 'getDocById()') In that case, 'useSavedId' should be
// false. Setting it to true requires setup to be run and it iwll automatically
// determine and save the spreadsheet ID.
//
let useSavedId = false; // Using a hard-coded spreadsheet ID...
function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}

/////////////////////////////////////////////////////////////////////////////
// Globals
/////////////////////////////////////////////////////////////////////////////

var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service
var options = {
  opt_useSavedID: false, // Set to TRUE to dynamically determine SSID, must run 'setup()' in that case.
  opt_SSID: '1KCksGG5CIvA4aMwsq1SMqyPIDRq6HVpXgPvE2q7AP8A',
  opt_consoleLogging: true,  // true to enable logging (need to call log() intead of console.log()) 
  opt_useLocks: false,       // true to lock processing path.
  opt_awhKey: '',
  opt_awhBaseURL: '',
  opt_getItemBids: false
}

const psStartRow = 8; // Start of data on the price sheet
const idCol = 2;  // Column with ID's ('B') (both sheets)
const priceCol = 4; // Column for prices ('D') (price sheet)
const nameCol = 1; // Column for name, (both sheets)
//var statusRange = null; 

/////////////////////////////////////////////////////////////////////////////
// Main entry point
/////////////////////////////////////////////////////////////////////////////

function main() {
  let success = true;
  const startTime = new Date().getTime(); // Used for profiling
  loadScriptOptions();
  console.log(getVersion()); // ALWAYS logged.
  statusRange = priceSheet().getRange('G19');

  // Safely lock access to this path concurrently.
  const lock = LockService.getPublicLock();
  if (options.opt_useLocks) {
    success = lock.tryLock(30000); 
    if (!success) { 
      let output = 'Error: Unable to obtain exclusive lock after ' + timeout + ' seconds.';
      log(output); 
      return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
      }
  }

  try {
    // Read in a JSON object populated with prices/IDs. 
    let obj = readPriceList();
    let itemsJSON = obj.JSON;
    let itemsArr = obj.retArray;

    console.log('itemsJSON: ', itemsJSON);

    log('Uploading JSON pricing to AWH...');
    let baseURL = options.awhBaseURL;
    let username = options.awhKey;
    let flowersURL = baseURL + 'museum-sets/exotic-flowers/bids';
    let plushiesURL = baseURL + 'museum-sets/plushies/bids';
    let password = '';
    let auth = {"Authorization": "Basic " + Utilities.base64Encode(username + ":" + password)};

    // POST all prices
    let result = '';
    setStatus('POSTing data to AWH...');
    var postOptions = {
      'method' : 'post',
      'headers': auth,
      'muteHttpExceptions': false,
      'contentType': 'application/json',
      'payload' : JSON.stringify(itemsJSON)
    };
    log('POST URL: ' + baseURL + 'bids');
    console.log('postOptions: ', postOptions);
    try {
      result = UrlFetchApp.fetch(baseURL + 'bids', postOptions);
    } catch(e) {
      console.log('POST exception: ', e);
      alert('POST exception: ', e);
      success = false;
      return;
    }
    log('Uploaded ' + itemsJSON.items.length + ' items.');

    // Now (optionally) get each item's price, log it.
    if (options.opt_getItemBids) {
      getItemBids(itemsJSON);
    }
    
    // All done.
  } catch(e) {
    console.log('Exception caught in main(): ', e);
    console.log(e.stack);
    success = false;
  } finally {
    const endTime = new Date().getTime();
    log((success ? 'Success! ' : 'Error - ') + 'Execution complete. Elapsed time: ' + 
      (endTime - startTime)/1000 + ' seconds.');
    
    if (options.opt_useLocks) {
      log('Releasing lock.');
      lock.releaseLock();
      }
  }
}

/////////////////////////////////////////////////////////////////////////////
//
// This reads in the data from the spreadsheet, and puts it into a JSON object
// suitable for POST'ing to AWH. The simple format, without bulk pricing, is this:
//
// { "items": [ { "id": 180, "price": 785 }, { "id": 215, "price": 750} ], 
// "museum_sets": [ { "type": "exotic-flowers", "price": 470000 }, { "type": "plushies", "price": 470000} ] }
//
/////////////////////////////////////////////////////////////////////////////

function readPriceList() {
  log('readPriceList');
  var sheetRange = priceSheet().getDataRange();
  var dataRange = priceSheet().getRange(psStartRow, nameCol, sheetRange.getLastRow(), 1);
  var lastRow = dataRange.getLastRow(); // May be less than the sheet's last row 

  // dataRangeArr will be a 2D array of [name][ignore][ignore][price]
  dataRange = priceSheet().getRange(psStartRow, nameCol, lastRow, 4);
  var dataRangeArr = dataRange.getValues();

  // Now get range for [name][ID], as vlookup range
  var itemRange = itemSheet().getRange(2, nameCol, 1159, 2);
  var itemRangeArr = itemRange.getValues();

  // Now insert the price from the dataRange, and the ID found via a
  // vlookup from the itemRange, into a new array
  let retArray = [];
  let namedArray = [];
  for (let i = 0; i < lastRow; i++) {
    if (i == 13 || i == 25) continue;
    if (!dataRangeArr[i][0]) break;
    let name = dataRangeArr[i][0];
    let price = dataRangeArr[i][3];
    if (!Number.isInteger(price) || !price) continue;
    let id = vlookupscript(dataRangeArr[i][0], itemRangeArr, 1, 2);
    if (!id) {
      console.error('ID not found for ' + name + '! (row = ' + (i+8) + ')');
      continue;
    }
    console.log('ID, Price for ' + dataRangeArr[i][0] + ': ' + id + ', ' + price);
    retArray.push([id, price, name]);
  }

  console.log('retArray: ', retArray);

  // 'retArray' is now a 2D array of [ID][price], convert to JSON.
  var retJSON = {"items": [], "museum_sets": []};
  for (let i = 0; i < retArray.length; i++) {
    if (!retArray[i]) break; // Shouldn't need anymore

    let item = {"id": retArray[i][0], "price": retArray[i][1]};
    if (item.id && item.price) { // Test this with blank rows! // Shouldn't need anymore!
      retJSON.items.push(item);
    }
  }

  // Now add the set prices.
  retJSON.museum_sets.push({"type": "exotic-flowers", "price": priceSheet().getRange('B33').getValue()});
  retJSON.museum_sets.push({"type": "plushies", "price": priceSheet().getRange('B21').getValue()});

  return {"JSON": retJSON, "arr": retArray};
}

/////////////////////////////////////////////////////////////////////////////
// Helpers
/////////////////////////////////////////////////////////////////////////////

// Set to false to use hard-coded ID (ssID), otherwise,
// run setup as per the note above.
function getDocById() {
  try {
    if (options.opt_useSavedID) {
      return SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    } else {
    return SpreadsheetApp.openById(options.opt_SSID);
    }
  } catch(e) {
    SpreadsheetApp.getUi().alert('An error ocurred opening the spreadsheet app. Did you run "setup" first?\n' +
        '"', e);
  }
}

// Replacement for Google Sheet's vlookup fn, for use in JS
// In order to match vlookup, 'index' is 1-based (col number)
// 'range' is an array, use range.getValues.
function vlookupscript(search_key, range, matchIndex, returnIndex) {
  var returnVal = null;
  for (var i in range) {
    if (range[i][matchIndex - 1] == search_key) {
      returnVal = range[i][returnIndex - 1];
      break;
    }
  }
  return returnVal;
}

// Set the status cell (unused)
function setStatus(text) {
  //statusRange.setValue(text);
  log('Not setting status: ' + text);
}

// Load options
function loadScriptOptions() {
  options.opt_consoleLogging = optsSheet().getRange("B5").getValue();
  options.opt_useLocks = optsSheet().getRange("B12").getValue();
  options.awhKey = optsSheet().getRange("B19").getValue();
  options.awhBaseURL = optsSheet().getRange("B18").getValue();
  options.opt_getItemBids = optsSheet().getRange("B20").getValue();

  console.log('loadScriptOptions: ', options);
}

// Get handle to the 'Options' sheet.
function optsSheet() {
  return getDocById().getSheetByName('Options');
}

// Get handle to the 'Prices' sheet.
function priceSheet() {
  return getDocById().getSheetByName('Price Calc');
}

// Get handle to the 'Items' sheet.
function itemSheet() {
  return getDocById().getSheetByName('Item List');
}

// Helper to optionally log.
function log(data) {
  if (options.opt_consoleLogging) console.log(data);
}

// Helper: Perform an array deep copy
function deepCopy(copyArray) {
    return JSON.parse(JSON.stringify(copyArray));
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
// Test the upload: gwt al litem bids
/////////////////////////////////////////////////////////////////////////////

function getItemBids(itemsJSON) {
    let baseURL = options.awhBaseURL;
    let username = options.awhKey;
    let flowersURL = baseURL + 'museum-sets/exotic-flowers/bids';
    let plushiesURL = baseURL + 'museum-sets/plushies/bids';
    let password = '';
    let auth = {"Authorization": "Basic " + Utilities.base64Encode(username + ":" + password)};
    let itemRange = itemSheet().getRange(2, nameCol, 1159, 2);
    let itemRangeArr = itemRange.getValues();

    log('GETting item bids.');
    let items = itemsJSON.items;
    let getOptions = {
        'method': 'get',
        'headers': auth
      };
    console.log('GET options: ', getOptions);
    let alertText = '';
    for (let i = 0; i < items.length; i++) {
      let useURL = baseURL + 'items/' + items[i].id + '/bids';
      log('GET URL: ' + useURL);
      result = UrlFetchApp.fetch(useURL, getOptions);
      let text = result.getContentText();
      let bid = JSON.parse(text).bids;
      let id = items[i].id;
      let name = vlookupscript(id, itemRangeArr, 2, 1);
      let tmp = 'Item: ' + name + ' [' + id + '], price = ' + asCurrency(bid[0].price) + '\n';
      alertText += tmp;
      log('GET response: ' + text);
      log('parsed: ' + tmp);
    }

    log('GET URL: ' + flowersURL);
    result = UrlFetchApp.fetch(flowersURL, getOptions);
    console.log('GET response (exotic-flowers): ', result.getContentText());
    alertText += result.getContentText() + '\n';

    log('GET URL: ' + plushiesURL);
    result = UrlFetchApp.fetch(plushiesURL, getOptions);
    console.log('GET response (plushies): ', result.getContentText());
    alertText += result.getContentText() + '\n';

    SpreadsheetApp.getUi().alert('Finished downloading prices!\n\n' + alertText);
}

