// File: service-provider.js.gs

// Versioning, internal
var XANETS_TRADE_HELPER_VERSION_INTERNAL = '1.5';
function getVersion() {
  return 'XANETS_TRADE_HELPER_VERSION_INTERNAL = "' + XANETS_TRADE_HELPER_VERSION_INTERNAL + '"';
}

//
// This must be run before using this script. Select 'Run->Run Function->Setup' to do so.
// It saves the script ID so it doesn't have to be hard-coded manually.
//
// Alternatively, you can set the ID as ssID, below, and use that instead. 
// In the function 'getDocById()', you can swap the coment marks between the two lines to 
// determine if the ID is dynamically saved and loaded, or hard-coded.
//
function setup() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    SCRIPT_PROP.setProperty("key", doc.getId());
}

// Set to false to use hard-coded ID (ssID), otherwise,
// run setup as per the note above.
const useSavedId = true; 
const ssID = "1cMDWkDPZmDGBHTXBCoUsybH0h3lf6ND-VJSoh8Df09k";
function getDocById() {
  if (useSavedId) {
    return SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
  } else {
    return SpreadsheetApp.openById(ssID);
  }
}

// Globals
var SCRIPT_PROP = PropertiesService.getScriptProperties(); // new property service
var itemsInserted = 0; // Count of logged entries

// Global options
var opt_detectDuplicates = false; // Prevent duplicate ID's from being logged.
var opt_maxTransactions = 5; // Unrealistic value, set to maybe 200?
var opt_consoleLogging = true; // true to enable logging (need to call myLogger() intead of myLogger())
var opt_colorDataCells = false; // 'true' to color cells on the data sheet Red if not found, Yellow if no price found, and Green for OK. 
var opt_useLocks = false;

//
// Moved 'doc = openById()' and 'sheet = getSheetByName()' calls
// to functions, for easier debugging, and if they are sepcified
// as global vars (e.g. var datasheet = getDocById().getSheetByName('Data');")
// in global scope, it will be evaluated when other scripts in this project
// are run, and may cause permission errors.
//
function datasheet() {
  return getDocById().getSheetByName('Data');
}

function priceSheet() {
  return getDocById().getSheetByName('Price Calc');
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

//
// Stuff to test without the Tampermonkey script side of things.
//
var params = { parameters: { '[{"command":"data"},{"id":"786444001","name":"Hammer","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"African Violet ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Banana Orchid ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Dahlia ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Single Red Rose ","qty":"2","price":"0","total":"0"}]': [ '' ] },
  contextPath: '',
  parameter: { '[{"command":"data"},{"id":"786444001","name":"Hammer","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"African Violet ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Banana Orchid ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Dahlia ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Single Red Rose ","qty":"2","price":"0","total":"0"}]': '' },
  queryString: '',
  postData: 
   { contents: '[{"command":"data"},{"id":"786444001","name":"Hammer","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"African Violet ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Banana Orchid ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Dahlia ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Single Red Rose ","qty":"2","price":"0","total":"0"}]',
     length: 373,
     name: 'postData',
     type: 'application/x-www-form-urlencoded' },
  contentLength: 373 };  // 281?

/////////////////////////////////////////////////////////////////////////////
// Default entry points to handle POST or GET requests
/////////////////////////////////////////////////////////////////////////////

function doGet(e) {
  loadScriptOptions();
  return handleRequest(e);
}

function doPost(e){
  loadScriptOptions();
  console.log(getVersion()); // ALWAYS logged.
  myLogger("Xanet's Trade helper, doPost. e = '" + e +"'");
  return handleRequest(e);
}

/////////////////////////////////////////////////////////////////////////
// Entry point called when POST data is received. Where processing 
// occurs.
/////////////////////////////////////////////////////////////////////////

function handleRequest(e) {
  const timeout = 30; // seconds
  const lock = LockService.getPublicLock();
  
  // Safely lock access to this path concurrently.
  if (opt_useLocks) {
    let success = lock.tryLock(30000); 
    if (!success) { 
      let output = 'Error: Unable to obtain exclusive lock after ' + timeout + ' seconds.';
      myLogger(output); 
      return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
      }
  }
    
  /////////////////////////////////////////////////////////////////////////
  //Parse the data and log it, in exception handler.
  /////////////////////////////////////////////////////////////////////////

  try {
    let jsonResp = e.parameter; // Object
    let stringified = '';
    var retArray = null;
    var cmd = '';
    var Success = false;
    var tradeID = 0; // Current trade
    
    if (Object.keys(jsonResp).length) {
      stringified = JSON.stringify(Object.keys(jsonResp));
      myLogger('Stringified data: ' + stringified);
      myLogger('Stringified data length=' + stringified.length);
    }
    
    // Before parsing, strip out the command. The parser ignores it,
    // it will not be in retArray.
    let start = stringified.indexOf(':');
    let end = stringified.indexOf('}');
    cmd = stringified.substring(start+1, end).replace(/['"\\]+/g, '')
    
    // TBD: modify to accept comma-separated commands.
    //
    // data: get the data (price data) into the array,
    //       write to the trade log, and update running averages.
    // price: get ad return price info only.
    // clear_avg: clear running averages
    // 

    if (cmd == 'data' || cmd == 'price') {
      if (!stringified.length) {
        myLogger('Not parsing: no data!');
      } else { 
        myLogger('Preparing to parse JSON data: ' + stringified);
        var retArray = parseJsonObject(stringified); 
        tradeID = retArray[0].id;
        myLogger('Done parsing stringified JSON, trade ID = ' + tradeID + ', ' + retArray.length + ' Objects found');
      }   
    
      // Now we have data to act upon...search for items in col A by name, prices
      // in matching row in col d. Then log the event. Before doing that, make sure 
      // this trade han't already been entered. Check for dup ID's
      //
      if (!opt_detectDuplicates) { // Checked in 'isDuplicate()'
        myLogger('Not checking for duplicate log entries.');
      }      

      myLogger('Filling in prices and preparing to log.');
      if (cmd == 'price') {myLogger('Price info only requested, not logging.');}
      
      // fillPrices reads from the 'price data' spreadsheet.
      // If the command is 'data', it will also write to the
      // Running Averages spreadsheet. The call to logTransaction
      // writes it the Data spreadsheet.
      
      let calcAvgs = (cmd == 'data') ? true : false; // Don't write avgs if just getting price info
      var totalCost = fillPrices(retArray, calcAvgs); // Also updates running averages (second param).
      
      myLogger('After filling prices: ' + JSON.stringify(retArray));
      myLogger('Total price of all items: ' + asCurrency(totalCost));
      
      if (!isDuplicate(tradeID) && cmd == 'data') { // Only need to check one ID...
        let newRange = logTransaction(retArray);
        copyLastTrade(newRange); // Copy the latest trade to the 'Last Trade' worksheet
        
        // Check to see if we have exceed our max # logged trades, and if so, clean up.
        if (opt_maxTransactions) {
          while (countTransactions() > opt_maxTransactions) {
            deleteFirstTrade();
          }
        }
      }  
    }
    
    /////////////////////////////////////////////////////////////////////////
    // Result creating/returning. 
    /////////////////////////////////////////////////////////////////////////
    
    var XanetResult = [{code: 200,    // Define success/failure codes. Stole HTTP 200 OK for now.
                       command: cmd, // data, price, etc. Matches the request.
                       id: tradeID,
                       totalTrade: totalCost, // Cost of ALL items in trade.
                       itemsProcessed: retArray.length, // Items we received to process
                       itemsAdded: itemsInserted // Items actually logged.
                       }];
    
    return provideResult(e, XanetResult, retArray);
    
  } catch(e) {
    myLogger('handleRequest (catch, no callback): ', e);
    console.log(e.stack);
    let output = JSON.stringify({"exception":e});
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  } finally {
    myLogger('handleRequest Finally: releasing lock.');
    if (opt_useLocks) {lock.releaseLock();}
  }
}

// Provide a result back to the requestor.
function provideResult(ev, XanetResult, retArray) {
  let fullRetArray = XanetResult.concat(retArray);
  let output = JSON.stringify(fullRetArray);
  myLogger('provideResult output: ' + output);
  
  // return jsonp success results
  if (ev.parameter.callback){
    myLogger('provideResult returning, with callback.');
    return ContentService.createTextOutput(ev.parameter.callback+"("+ output + ");")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  }
}

// Load script options
function loadScriptOptions() {
  opt_detectDuplicates = optsSheet().getRange("B3").getValue();
  opt_maxTransactions = optsSheet().getRange("B4").getValue();
  opt_consoleLogging = optsSheet().getRange("B5").getValue();
  opt_colorDataCells = optsSheet().getRange("B6").getValue();
  
  myLogger('Read options: detect dups = "' + opt_detectDuplicates +
           '" max Xactions = "' + opt_maxTransactions +
           '" console logging= "' + opt_consoleLogging + '"');
}

/////////////////////////////////////////////////////////////////////////
// Helpers for above.    
/////////////////////////////////////////////////////////////////////////

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

// See if this trade ID has already been logged.
// If so, return true.
function isDuplicate(id) {
  if (!opt_detectDuplicates) return false;
  
  var sheetRange = datasheet().getDataRange();
  var idRange = datasheet().getRange(2, 2, sheetRange.getLastRow());
  var tradeIDs = idRange.getValues();
  for (let i = 0; i < tradeIDs.length; i++) {
    if (tradeIDs[i] == "") {continue;}
    myLogger('isDuplicate, comparing: "' + id + '" to "' + tradeIDs[i] + '"');
    if (tradeIDs[i] == '') {continue;}
    if (isNaN(tradeIDs[i])) {continue;}
    if (!(Number(tradeIDs[i]) > 0)) {continue;}    
    if (id == tradeIDs[i]) {
      myLogger('ID match: "' + id + '" to "' + tradeIDs[i] + '" !!!');
      myLogger('Duplicate ID ' + id + 'found! Not logging to sheet.');
      return true;
    }
  }
  return false;
}

// Find the items in our 'Price Calc' sheet, and add prices to our array
// Don't get confuesd by the fact that sheet indices are 1-based, while
// our Java arrays are 0 based.
//
// This also updates the running average, if 'updateAverages' is true.
//
// @param: array - array of items to get prices for.
// @param: updateAverages - true to update running averages on sheet
//
// @return - total price of all object in data array
//
// This handles 3 case:
//
//    1. Item is in price list and has a price. Is added
//       to the data sheet and running averages.
//    2. Item is in price list with no price. The price
//       is set to '0', and the item is added to the data
//       sheet and running averages, but in RA only the qty
//       is logged.
//    3. Item is not in the price list. Price is flagged as
//       -1, logged in Data with price 0, and does NOT get
//       added to the RA sheet.
//
//    In cases 2 and 3, a warning is optionally given to the end user.
//
function fillPrices(array, updateAverages) { // A8:<last row>
  let sheetRange = priceSheet().getDataRange();
  let nameRange = priceSheet().getRange(8, 1, sheetRange.getLastRow());
  let names = nameRange.getValues();
  let nameFound = false;
  
  var transTotal = 0;
  for (let i = 0; i < array.length; i++) { // Iterate names we got from trade grid
    
    for (let j = 0; j < names.length; j++) { // to compare to all known names.     
      if (array[i].name == names[j]) {
        nameFound = true;
        // Found row - j + 8. Column is 4. Both are 1-indexed, not 0.
        // Will Pay price is col. 4,
        let price = priceSheet().getRange(j+8, 4).getValue();
        if (isNaN(price)) { // Not numeric, could be 'Ask Me!', for example. Case 2.
          array[i].price = '0';
          array[i].total = '0';
          if (updateAverages) {
            cleanRunningAverages(); // Check for rows to be cleared.
            updateRunningAverage(array[i]);
          }
          break;
        }
        array[i].price = price; // Case 1.
        array[i].total = price * array[i].qty; 
        transTotal += price * array[i].qty;
        if (updateAverages) {
          cleanRunningAverages(); // Check for rows to be cleared.
          updateRunningAverage(array[i]);
        }
        break;
      }
    } // End for loop, name list.
    if (!nameFound) { //case 3.
      array[i].price = '-1';
      array[i].total = '-1';
    }
    nameFound = false;
  } // End for loop, grid name list
  return transTotal;
}

// Fundtion used to get time formatted for the running averages sheet
// Formatted as: mm/dd/yyyy 00:00:00 TCT
function timenow() {
  return Utilities.formatDate(new Date(), "GMT", "MM/dd/yyy HH:mm:ss");
}

// Clean up the Running Averages worksheet, if needed.
// If the column H2 is empty, clear (or set to '0') 
// cells (columns) B-F. Set cell H to 'cleared;. When 
// average data is filled in for that row, the status 
// will be set to 'active'
function cleanRunningAverages() {
  let sheetRange = avgSheet().getDataRange();
  let rows = sheetRange.getLastRow();
  
  for (let row = 2; row <= rows; row++) {
    var status = avgSheet().getRange(row, 8).getValue(); // 8 == 'H'
    if (status == '') { 
      let dataRange = avgSheet().getRange(row, 2, 1, 7);
      let values = [[0, timenow(), 0, 0, 0, 0, 'cleared']];
      dataRange.setValues(values);            
    }
  }
}

// Handle calculating the running average - this is dynamically calculated
// using data stored as 'scratch data' on the 'Running Averages' sheet - the
// avarages per item are also stored there.
//
// TBD: Handle missing items!!
//
function updateRunningAverage(item) {
  // Locate column (create range) in the 'Running Averages' sheet (avgSheet)
  // D:row is last price, E:row last qty. Running avg: (last price total + new price total)/(last qty + new qty)
  let sheetRange = avgSheet().getDataRange();
  let rows = sheetRange.getLastRow();
  // let nameRange = avgSheet().getRange(3, 1, rows); // A3:end of column (last row)
  // ^^ could use getValues() to get array of all values .. or get values cell by cell.
  for (let row = 3; row < rows; row++) {
    let name = avgSheet().getRange(row, 1).getValue(); // Make visible to the debugger
    if (item.name == name) {
      // Get a new range for just this item, covering the row.
      let itemRange = avgSheet().getRange(row, 2, 1, 7); 
      // let itemRange = ss.getRange("Running Averages!D" + row + ":G" + row);
      let data = itemRange.getValues(); // (Last Price Total) | (Last Count Total) | Avg
      
      // timestamp is [0] in range, [1] is last price, [2] last count, [3] current RA
      // [4] is RA, [5] is status
      let prevPrice = isNaN(data[0][2]) ? 0 : data[0][2];
      let prevCount = isNaN(data[0][3]) ? 0 : data[0][3];
      let prevAvg = isNaN(data[0][4]) ? 0 : data[0][4];
      
      // Done for clarity, could do all this in one line.
      let newPrice = Number(prevPrice) + (Number(item.price) * Number(item.qty)); // Goes into D:<row>, used next time through
      let newQty = Number(prevCount) + Number(item.qty); // Goes into E:<row>, used next time through
      let avg = Number(newPrice)/Number(newQty); // Running median average --> goes into F:<row>
      itemRange.setValues([[avg, timenow(), newPrice, newQty, avg, prevAvg, 'active']]); 
      
      /*
      myLogger('Calculated running average for ' + item.name + ': \nprev price: ' + prevPrice + 
                  '\nNew price and qty: ' + item.qty + ' at $' + item.price + ' = $' + newPrice +
                  '\nNew qty = ' + prevCount + ' + ' + item.qty + ', = ' + newQty +
                  '\nSo running avg for ' + item.name + ' = ' + newPrice + '/' + newQty + ' = ' + avg);
      */
      break;
    }
  }
}

// Return a count of the number of transactions that have been logged.
function countTransactions() {
  let count = 0;
  var sheetRange = datasheet().getDataRange();
  var lastRow = sheetRange.getLastRow();
  //var idRange = datasheet().getRange("B0:B" + lastRow);
  for (let i = 3; i < lastRow; i++) { // Start at 3 to skip header
    let id = datasheet().getRange(i, 2).getValue();
    if (id != "") {count++;}
  }
  
  return count;
}

// Function to delete the first trade in the sheet.
// This could be changed to delete 'x' transactions.
function deleteFirstTrade() {
  let startRow = findXactionRow(1); 
  let nextXAction = findXactionRow(2); // Find 2nd transaction
  let numRows = nextXAction - startRow; 
  datasheet().deleteRows(startRow, numRows);
}

// Function to locate the starting row of the indexed logged transaction.
// This is used to keep a 'rolling log', if we exceed the max # of transactions,
// delete logged transactions one at a time until we no longr exceed that limit.
// To find the indexed one, iterate rows in col. B (Trade ID) until we hit the indexed
// non-empty cell. Then delete from row 1 to found row - 1.
function findXactionRow(index) {
  if (index > countTransactions()) {
    return 0;
  }
  
  let count = 0;
  let row = 0;
  let cellValue = "";
  var sheetRange = datasheet().getDataRange();
  var lastRow = sheetRange.getLastRow();
  for (row = 3; row < lastRow; row++) { // Start at 3 to skip header
    cellValue = datasheet().getRange(row, 2).getValue();
    if (cellValue != "") {count++;}
    if (count == index) {break;}
  }
  
  return row;
}

// Load script options

// Log the data we've accumulated to the spreadsheet.
// Format: |Timestamp|Trade ID|Item|Quantity|Price Paid|Total Paid	|Item Avg. Price|
// This return the range where the data was inserted, for use in copying
// to the 'latest trade' sheet
//
// See the function fillPrices() for the cases that are logged and those that aren't.
//
function logTransaction(array) { 
  var sheetRange = datasheet().getDataRange();
  var lastRow = sheetRange.getLastRow();
  
  // Header - 
  var row = lastRow + 2;
  var startRow = row; // Save for later...
  var dateRange = datasheet().getRange("A" + row + ":B" + row);
  var timeRange = datasheet().getRange("A" + (row+1));
  let date = new Date().toDateString();
  let values = [[date, array[0].id]];
  dateRange.setValues(values);
  //let time = new Date().toTimeString(); // 22:26:42 GMT+0100 (British Summer Time)
  let time = new Date().toGMTString(); // Get as TCT instead.
  let parts = time.split(" ");
  timeRange.setValue(parts[4] + ' TCT');
  
  // Data
  myLogger('logTransaction: checking ' + array.length + ' items.');
  let counter = 0;
  for (let i = 0; i < array.length; i++) {
    values = [[array[i].name, 
               array[i].qty, 
               array[i].price,
               array[i].total]];
    row = lastRow + 2 + (counter++); // New change - shifts up data row by 1. MAKE SURE does not affect running averages or last XAction
    range = datasheet().getRange("C" + row + ":F" + row);
    range.setValues(values);
    myLogger('inserted values: ' + values);
    
    // If the price/total is '-1', set as red; if '0', set as yellow
    // See https://developers.google.com/apps-script/reference/calendar/color
    // for color enumerations, or use RGB
    if (opt_colorDataCells == true) {
      let cells = datasheet().getRange('C' + row + ':F' + row);
      if (array[i].price == '0' || array[i].price == '-1') {
        cells.setBackground(array[i].price == '-1' ? 'red' : 'yellow');
      } else {
        cells.setBackground('lime');
      }
    }
    itemsInserted++;
  }
  myLogger("Finished logging transaction - " + itemsInserted + ' items logged.');
  
  let newRange = 'A' + startRow + ':F' + (startRow + itemsInserted);
  return newRange;
}

// This function copies the latest trade to the 'Last Trade' worksheet
function copyLastTrade(src) {
  // Clear old data
  let sheetRange = lastTradeSheet().getDataRange();
  let lastRow = sheetRange.getLastRow();
  if (lastRow >= 3) { // Allow for empty sheet
    let numRows = lastRow - 2; // lastRow - 2, +1 as it is inclusive
    lastTradeSheet().deleteRows(3, numRows);
  }
    
  // Copy
  let srcRange = datasheet().getRange(src);
  let dstRange = lastTradeSheet().getRange('A3');
  srcRange.copyTo(dstRange);
  
  myLogger('Copied last trade ("' + src +'") to Last Trade sheet, range "A3"');
}

//  Parse this input, See 'getNewItem()' for format of JSON in result array.
// 'keys' must match what is defined in the Tampermonkey script that
//  POSTs to this - "Xanet's Trade Helper.user.js"
function parseJsonObject(objString) {
  let keys = ['id', 'name', 'qty', 'price', 'total'];
  let checkStr = objString;
  let retArray = [];
  
  let counter = 0;
  myLogger('parseJsonObject: ' + objString);
  while (checkStr != '') {
    let temp = '';
    let newItem = getNewItem();
    for (let i=0; i < keys.length; i++) {
      let pAt = checkStr.indexOf(keys[i]);
      temp = checkStr.slice(pAt+ keys[i].length + 5);
      let pEnd = temp.indexOf('"'); 
      let temp2 = temp.slice(0, pEnd-1);
      newItem[keys[i]] = temp2.trim();
      myLogger('parseJsonObject: key = ' + keys[i] + '\npAt: ' + pAt +
               '\ntemp: ' + temp +
               '\npEnd: ' + pEnd + 
               '\ntemp2: ' + temp2 +
               '\ntemp2.trim(): ' + temp2.trim());
      } // find next key.
    myLogger('New Item = "' + JSON.stringify(newItem) + '"');
    
    counter++;
    retArray.push(newItem);
    if ((pAt = temp.indexOf('},{')) != -1) {checkStr = temp.slice(pAt+3);
    } else {checkStr = '';} // Trigger as completed.
  } 
  
  return retArray;
}

// Expected object format of what we receive - an array of these.
// Must match what is defined in the Tampermonkey script that
// writes to this - "Xanet's Trade Helper.user.js"
function getNewItem() {
  return {id: 'TBD',       
          name: 'TBD',       
          qty: 'TBD',        
          price: 'TBD',
          total: 'TBD'
          };
}

// TBD: replace all myLogger(data) with this function.
// THen , we can optionally turn it on and off.
function myLogger(data) {
  if (opt_consoleLogging) console.log(data);
}

