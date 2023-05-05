/////////////////////////////////////////////////////////////////////////////
// File: service-provider.js.gs
/////////////////////////////////////////////////////////////////////////////

// Versioning, internal
var XANET_TRADE_HELPER_VERSION_INTERNAL = '3.5';

// Function that calls the main unit test, here so I can set breakpoints here and not step in.
function doIt() {doMainTest();}

/////////////////////////////////////////////////////////////////////////////
// Globals
/////////////////////////////////////////////////////////////////////////////

var itemsInserted = 0; // Count of logged entries
var opts = {};

// Commonly used ranges
var dataSheetRange = null;

////////////////////////////////////////////////////////////////////////////////////////////////////
// Stuff to test without the Tampermonkey script side of things. (moved to the bottom of the script)
////////////////////////////////////////////////////////////////////////////////////////////////////

/* moved to the end of this file */

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
  log("Xanet's Trade helper, doPost. e = '" + e +"'");
  return handleRequest(e);
}

/////////////////////////////////////////////////////////////////////////
// Entry point called when POST data is received. Where processing 
// occurs.
/////////////////////////////////////////////////////////////////////////

function handleRequest(e) {
  const startTime = new Date().getTime();
  const timeout = 30; // seconds
  const lock = LockService.getPublicLock();
  const sheetVersion = getSpreadsheetVersion();
  console.log('Spreadsheet version: ' + sheetVersion);
  
  // Safely lock access to this path concurrently.
  if (opts.opt_useLocks) {
    let success = lock.tryLock(30000); 
    if (!success) { 
      let output = 'Error: Unable to obtain exclusive lock after ' + timeout + ' seconds.';
      log(output); 
      return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
      }
  }
    
  /////////////////////////////////////////////////////////////////////////
  // Parse the data and log it, in exception handler.
  /////////////////////////////////////////////////////////////////////////

  try {
    let jsonResp = e.parameter; // Object
    var Success = false;
    var retArray = JSON.parse(Object.keys(jsonResp)[0]);
    var commandObj = retArray.shift();
    var cmd = commandObj.command;
    var tradeID = retArray[0].id;

    if (!itemUpdateRan) handleNewItems();
    
    // data: get the data (price data) into the array, write to the trade log, and update running averages.
    // price: get ad return price info only.    
    if (cmd == 'data' || cmd == 'price') {
      if (!retArray.length) {
        log('Trade ID = ' + tradeID + ' No items found!');
      } else {
        log('Trade ID = ' + tradeID + ', ' + retArray.length + ' Objects found');  
      }
    
      // Now we have data to act upon...search for items in col A by name, prices
      // in matching row in col d. Then log the event. Before doing that, make sure 
      // this trade han't already been entered. Check for dup ID's
      //
      if (!opts.opt_detectDuplicates) { // Checked in 'isDuplicate()'
        log('Not checking for duplicate log entries.');
      }      

      log('Filling in prices and preparing to log.');
      if (cmd == 'price') {log('Price info only requested, not logging.');}
      
      // If looking for sets, modify the array accordingly.
      // Count items that belong in sets, and how many full sets.
      // If we have full sets, add a new item entry to the array ('Flower Set (item price)', for example.
      // "", reduce qty of items in sets from array entries, if 0 (all are in a set), remove that entry.
      if (opts.opt_calcSetItemPrices || opts.opt_calcSetPointPrices) {
        retArray = deepCopy(processSetItemPrices(retArray));
      }
      
      // fillPrices reads from the 'price data' spreadsheet.
      // If the command is 'data', it will also write to the
      // Running Averages and Data worksheets. (the call to logTransaction
      // writes it the Data worksheet).      
      let calcAvgs = (cmd == 'data') ? true : false; // Don't write avgs if just getting price info
      profile();
      if ( /*calcAvgs &&*/ opts.opt_clearRunningAverages) {cleanRunningAverages();}
      profile();
      var totalCost = fillPrices(retArray, calcAvgs); // Also updates running averages (second param).
      
      log('After filling prices: ' + JSON.stringify(retArray));
      log('Total price of all items: ' + asCurrency(totalCost));
      
      if (!isDuplicate(tradeID) && cmd == 'data') { // Only need to check one ID...
        let newRange = logTransaction(retArray); // Actually writes to the 'Data' worksheet.
        copyLastTrade(newRange); // Copy the latest trade to the 'Last Trade' worksheet
        
        // Check to see if we have exceed our max # logged trades, and if so, clean up.
        profile();
        if (opts.opt_maxTransactions) {
          let xactionCount = countTransactions();
          console.log('Checking transaction count: at ' + xactionCount + 
              ', allowing ' + opts.opt_maxTransactions);
          //while (xactionCount > opts.opt_maxTransactions) {
          if (xactionCount > opts.opt_maxTransactions) {
            xactionCount = deleteTrades(xactionCount, opts.opt_maxTransactions);
          }
          SpreadsheetApp.flush();
          profile();
        }

        // Export the trade to a PDF receipt
        if (opts.opt_autoReceipts) writeReceiptAsPDF(ss=null);
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
    log('handleRequest (catch, no callback): ', e);
    console.log(e.stack);
    let output = JSON.stringify({"exception":e});
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  } finally {
    const endTime = new Date().getTime();
    log('Execution complete. Elapsed time: ' + (endTime - startTime)/1000 + ' seconds.');
    if (opts.opt_useLocks) {
      log('Releasing lock.');
      lock.releaseLock();
      }
      log('Exiting.');
  }
}

/////////////////////////////////////////////////////////////////////////////
// If looking for sets, modify the array accordingly.
// Count items that belong in sets, and how many full sets.
// If we have full sets, add a new item entry to the array ('Flower Set (item price)', for example.
// "", reduce qty of items in sets from array entries, if 0 (all are in a set), remove that entry
/////////////////////////////////////////////////////////////////////////////

const flowerSetName = (opts.opt_calcSetPointPrices) ? 
  'Flower Set (item based)' : 'Set Price (points based)';
const plushieSetName = opts.opt_calcSetPointPrices ? 
  'Plushie Set Price (item based)' : 'Set Price (points based)';

function processSetItemPrices(retArray) {
  let myFlowerSet = deepCopy(flowersInSet);
  let myPlushieSet = deepCopy(plushiesInSet);
  var tradeID = retArray[0].id;
  
  // For each retArray element, see if it is in a set array.
  // If so, modify qty. in the set array.
  // If the set array is full, add a set item to retArray, 
  // and reduce the qty of items in retArray appropriatelyremoving if qty drops to 0.
  // Do for all sets we are interested in.
  
  for (var i = 0; i < retArray.length; i++) {
    Object.assign(retArray[i], {inFlowerSet: false});
    Object.assign(retArray[i], {inPlushieSet: false});
    
    if (myFlowerSet) myFlowerSet.forEach((element, index, array) => { // Scan flower sets.
      if (element.name == retArray[i].name.trim()) {
        myFlowerSet[index].quantity = retArray[i].qty;
        retArray[i].inFlowerSet = true;
      }
    });
  
    if (myPlushieSet) myPlushieSet.forEach((element, index, array) => { // Scan plushie sets.
      if (element.name == retArray[i].name.trim()) {
        myPlushieSet[index].quantity = retArray[i].qty;
        retArray[i].inPlushieSet = true;
      }
    });
  } // end retArray for loop.

  // See how many sets we have, if any.
  let flowerSets = countCompleteSets(myFlowerSet);
  let plushieSets = countCompleteSets(myPlushieSet);

  log('processSetItemPrices: \nmyFlowerSet = ' + JSON.stringify(myFlowerSet) + '\nmyPlushieSet = ' + JSON.stringify(myPlushieSet));

  if (!flowerSets && !plushieSets) {return retArray;}

  // If we have full sets, create an object for them and push onto our array
  if (flowerSets) {
    log('Found ' + flowerSets + ' flower sets.');
    let obj = newSetItem(tradeID, flowerSetName, flowerSets);
    retArray.push(obj);
  }

  if (plushieSets) {
    log('Found ' + plushieSets + ' plushie sets.');
    let obj = newSetItem(tradeID, plushieSetName, plushieSets);
    retArray.push(obj);
  }

  log('processSetItemPrices: retArray\n' + JSON.stringify(retArray));

  // Filter the items in the array, that are in the sets.
  // Note: to remove, use array.splice(start, deleteCount);
  // Can't do that - if qty > 0, push onto new array.
  let newArray = [];
  for (let i = 0; i < retArray.length; i++) {
    if (retArray[i].inFlowerSet == true) {
      retArray[i].qty -=  flowerSets;
      if (retArray[i].qty > 0) {
        newArray.push(retArray[i]);
      }
    } else if (retArray[i].inPlushieSet == true) {
      retArray[i].qty -=  plushieSets;
      if (retArray[i].qty > 0) {newArray.push(retArray[i]);}
    } else {
      newArray.push(retArray[i]);
    }
  }

  log('processSetItemPrices: newArray\n' + JSON.stringify(newArray));
  return newArray;
}

// Helper to count complete sets
function countCompleteSets(itemArray) {
  if (!itemArray) return 0;
    
  let totalSets = 99999999;
  for (let i = 0; i < itemArray.length; i++) {              
    let amt = Number(itemArray[i].quantity);
    if (!amt || amt == null) {
      return 0;
    }
    if (amt < totalSets) {totalSets = amt;}
  }
  return totalSets;
}

// Helper to create a new set item
function newSetItem(ID, name, qty) {
  return {id: ID.toString(),       
          name: name,       
          qty: qty.toString(),        
          price: '0',
          total: '0'
          };
}

/////////////////////////////////////////////////////////////////////////////
// Provide a result back to the requestor.
/////////////////////////////////////////////////////////////////////////////

function provideResult(ev, XanetResult, retArray) {
  let fullRetArray = XanetResult.concat(retArray);
  let output = JSON.stringify(fullRetArray);
  log('provideResult output: ' + output);
  
  // return jsonp success results
  if (ev.parameter.callback){
    log('provideResult returning, with callback.');
    return ContentService.createTextOutput(ev.parameter.callback+"("+ output + ");")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  }
}

/////////////////////////////////////////////////////////////////////////////
// See if this trade ID has already been logged.
// If so, return true.
/////////////////////////////////////////////////////////////////////////////
function isDuplicate(id) {
  if (!opts.opt_detectDuplicates) return false;
  
  if (!dataSheetRange) dataSheetRange = datasheet().getDataRange();
  var idRange = datasheet().getRange(2, 2, dataSheetRange.getLastRow());
  var tradeIDs = idRange.getValues();
  for (let i = 0; i < tradeIDs.length; i++) {
    if (tradeIDs[i] == "") {continue;}
    if (tradeIDs[i] == '' || isNaN(tradeIDs[i]) || !(Number(tradeIDs[i]) > 0)) {continue;}  
    if (id == tradeIDs[i]) {
      log('ID match: "' + id + '" to "' + tradeIDs[i] + '" !!!');
      log('Duplicate ID ' + id + 'found! Not logging to sheet.');
      return true;
    }
  }
  return false;
}

/////////////////////////////////////////////////////////////////////////////
//
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
// Added 2 new cases:
//
//    1. Quran scripts
//    2. Positive blood bags.
//
//    In cases 2 and 3, a warning is optionally given to the end user.
//
/////////////////////////////////////////////////////////////////////////////

var transTotal = 0; // null global indicates demand loaded.
var priceRows = null;
var typeRows = null;
var bulkPriceRows = null;

function fillPrices(array, updateAverages) { // A8:<last row>

  log('[fillPrices] will update running averages: ' + updateAverages ? 'TRUE' : "FALSE");

  // For values on the price list...
  const startRow = 7;
  let sheetRange = priceSheet().getDataRange();
  let lastRow = sheetRange.getLastRow();
  let nameRange = priceSheet().getRange(startRow, 1, lastRow-1);
  let names = nameRange.getValues();
  let nameFound = false;
  
  // Filter here: Quran scripts have diff names in the browser vs the API,
  // for example, "Quran Script : Ibn Masud" in the browser is "Script from 
  // the Quran: Ibn Masud" in the API (and price sheet).
  for (let i = 0; i < array.length; i++) { // Iterate names we got from trade grid
    array[i].bulkPrice = false;
    array[i].priceAskMe = false;
    array[i].priceNotFound = false;
    array[i].type = '';
    let searchWord = array[i].name.trim();

    // Handle the blod bags with a '+' in them...(A+, B+, O+, AB+)
    if ((array[i].name.toString()).indexOf('Blood Bag') != -1) {
      let test = (array[i].name.toString()).replace('AP', 'A+');
      array[i].name = array[i].name.toString().replace('AP', 'A+').toString();
      array[i].name = array[i].name.toString().replace('BP', 'B+').toString();
      array[i].name = array[i].name.toString().replace('OP', 'O+').toString();
      array[i].name = array[i].name.toString().replace('ABP', 'AB+').toString();
      searchWord = array[i].name;
    }

    for (let j = 0; j < names.length; j++) { // to compare to all known names. 
      nameFound = false;
      if (names[j] == '') {continue;}
      let priceListWord = names[j].toString().trim();
          
      nameFound = (searchWord == priceListWord);
      if (nameFound) {
        // Found row - j + 8. Column is 4. Both are 1-indexed, not 0.
        // Will Pay price is col. 4,
        if (!priceRows) {
          log('loading priceRows');

          let typeCol = opts.opt_bulkPricing ? 27 : 25; // 'AA' or 'Y'
          priceRows = priceSheet().getRange(startRow, 4, lastRow-1).getValues();
          typeRows = priceSheet().getRange(startRow, typeCol, lastRow-1).getValues();
          if (opts.opt_bulkPricing) {
            log('loading bulk prices'); // [0] = qty, [1] = markdown
            bulkPriceRows = priceSheet().getRange(startRow, 5, lastRow-1, 2).getValues();
          }
        }
        let price = priceRows[j];
        array[i].type = typeRows[j];

        // Set the 'type' or later sorting
        let typeCol = opts.opt_bulkPricing ? 'AA' : 'Y';

        // Bulk pricing, if supported.
        // Hmmm - what if already in sets? Can't count then!
        let inSet = !!(array[i].inFlowerSet || array[i].inPlushieSet);
        if (opts.opt_bulkPricing) { // Support bulk pricing
          if (array[i].qty > bulkPriceRows[j][0] && bulkPriceRows[j][0]) {
            log('Using bulk pricing. Normal price: ' + price + ' Bulk Price: ' + 
            (Number(bulkPriceRows[j][1]) + Number(price)) + ' each.');
            price = Number(bulkPriceRows[j][1]) + Number(price);
            array[i].bulkPrice = true;
          }
        }
        
        if (isNaN(price)) { // Not numeric, could be 'Ask Me!', for example. Case 2.  
          array[i].priceAskMe = true;
          array[i].price = '0';
          array[i].total = '0';
          if (updateAverages) {
            log("Going to update running averages...");
            updateRunningAverages(array[i]);
            }
          log('Found match (but no price) for ' + searchWord + ',\nPrice = ' + price + '\nTotal for items (' + 
            array[i].qty + ') is ' + array[i].total);
          break;
        }
        
        array[i].price = price; // Case 1.
        array[i].total = price * array[i].qty; 
        transTotal += price * array[i].qty;
        if (updateAverages) {
          log("Going to update running averages...");
          updateRunningAverages(array[i]);
          } // SLOW call

        //inSet = !!(array[i].inFlowerSet || array[i].inPlushieSet);
        //if (inSet == undefined) inSet = false;
        log('Found match for ' + searchWord + 
            '\nBulk: ' + array[i].bulkPrice +
            '\nIn Set: ' + inSet +
            '\nType: ' + array[i].type +
            ',\nPrice = ' + price + '\nTotal for items (' + 
            array[i].qty + ') is ' + array[i].total);
        break;
      }
    } // End for loop, known name list.

    //case 3. Look up the market value in 'item list'
    if (!nameFound) {
    log('Item ' + searchWord + ' not in price list, scanning item list');
    nameFound = findItemInItemList(array[i]);

      // Worst case: not found anywhere
      if (!nameFound) {
        array[i].price = '-1';
        array[i].total = '-1';
      }
    } // end !nameFound
  } // End for loop, grid name list

  // Sort the 'running averages' sheet
  sortRunningAverages();
  return transTotal;
}

function sortRunningAverages() {
  console.log('sortRunningAverages ==>');
  let sheetRange = avgSheet().getDataRange();
  let lastCol = sheetRange.getLastColumn();
  let startRow = 3;
  let startCol = 1;
  let colN = 15;
  let colR = 19;
  let numRows = sheetRange.getLastRow() - startRow;
  console.log("sortRange, startRow: " + startRow + " startCol:" + startCol + " numRows: " + numRows + " lastCol: " + lastCol);
  let sortRange = avgSheet().getRange(startRow, startCol, numRows, (lastCol+1));
  sortRange.sort([{column: colN, ascending: true}, {column: colR, ascending: true}]);
  console.log('<== sortRunningAverages');
}

/**
 * Function to locate item price in the 'item list' sheet
 */
let itemListNames = null; // null global indicates demand loaded.
var itemListPrices = null;
function findItemInItemList(item) {
  let nameFound = false;
  let itemRange = itemSheet().getDataRange();
  let itemsLastRow = itemRange.getLastRow();
  let itemNameRange = itemSheet().getRange(2, 1, itemsLastRow-1);

  let searchWord = item.name.trim();
  item.priceNotFound = true;
  if (!itemListNames) {
    log('Loading Item List');
    itemListNames = itemNameRange.getValues();
    } 
  profile();
  for (let j = 0; j < itemListNames.length; j++) { // to compare to all known names. 
    if (itemListNames[j] == '') {break;}
    let compareWord = itemListNames[j].toString().trim();
    if (searchWord == compareWord) {
      nameFound = true;
      if (!itemListPrices) {
        log('Loading Item List prices');
        itemListPrices = itemSheet().getRange(2, 4, itemsLastRow-1).getValues();
        }
      let price2 = itemListPrices[j];
      item.price = Math.round(price2 * opts.opt_markdown); 
      item.total = item.price * item.qty; 
      transTotal += item.total;
      log('Found match for ' + searchWord + ' in items list,\nPrice = ' + price2 + 
      '\nMarkdown = ' + opts.opt_markdown + 
      '\nCalculated Price = ' +  item.price + ' each.\nTotal for items (' + 
      item.qty + ') is ' + item.total);
      break;
    } // end if (searchWord == compareWord ...
  } // end for (j-0;... loop
  profile();
  return nameFound;
}

/////////////////////////////////////////////////////////////////////////////
// Function to clear the running averages sheet.
// Intended to be called from the sheet via a button.
/////////////////////////////////////////////////////////////////////////////

function clearAllRunningAverages() {
  let sheetRange = avgSheet().getDataRange();
  let rows = sheetRange.getLastRow();
  
  let startRow = 2, startColumn = 2, numRows = rows-1, numCols = 7;
  let dataRange = avgSheet().getRange(startRow, startColumn, numRows, numCols);
  let data = [];
  let time = timenow();
  for (let i = 0; i < numRows; i++) {
    data.push([0, time, 0, 0, 0, 0, 'cleared']);
  }
  dataRange.setValues(data); 
}

// Clean up the Running Averages worksheet, if needed.
function cleanRunningAverages() {
  let sheetRange = avgSheet().getDataRange();
  let rows = sheetRange.getLastRow();
  let statusRows = avgSheet().getRange(2, 8, rows-1).getValues(); // 8 == 'H'
  
  for (let row = 2; row <= rows; row++) {
    let status = statusRows[row-2];
    if (status == '') { 
      let dataRange = avgSheet().getRange(row, 2, 1, 7);
      let values = [[0, timenow(), 0, 0, 0, 0, 'cleared']];
      dataRange.setValues(values);   
    }
  }
}

/////////////////////////////////////////////////////////////////////////////
//
// Handle calculating the running average - this is dynamically calculated
// using data stored as 'scratch data' on the 'Running Averages' sheet - the
// avarages per item are also stored there.
//
/////////////////////////////////////////////////////////////////////////////

var names = null;
function updateRunningAverages(item) 
{
  console.log('[updateRunningAverages] ==>');

  // Locate column (create range) in the 'Running Averages' sheet (avgSheet)
  // D:row is last price, E:row last qty. Running avg: (last price total + new price total)/(last qty + new qty)
  let sheetRange = avgSheet().getDataRange();
  let rows = sheetRange.getLastRow();
  
  //let rows = avgSheet.getLastRow();
  if (!names) {names = avgSheet().getRange(3, 1, rows-1).getValues();}

  profile();
  console.log('[updateRunningAverages] rows: ' + rows);
  console.log('[updateRunningAverages] item = ' + JSON.stringify(item));
  let found = false;
  for (let row = 3; row < rows; row++) {
    let name = names[row-3].toString();
    if (item.name.trim() == name.trim()) {
      found = true;
      // Get a new range for just this item, covering the row.
      let itemRange = avgSheet().getRange(row, 2, 1, 7); 
      // let itemRange = ss.getRange("Running Averages!D" + row + ":G" + row); // alt method
      let data = itemRange.getValues(); // (Last Price Total) | (Last Count Total) | Avg
      
      // timestamp is [0] in range, [1] is last price, [2] last count, [3] current RA
      // [4] is RA, [5] is status
      let prevPrice = isNaN(data[0][2]) ? 0 : data[0][2];
      let prevCount = isNaN(data[0][3]) ? 0 : data[0][3];
      let prevAvg = isNaN(data[0][4]) ? 0 : data[0][4];

      log('updateRunningAverages using' + (item.bulkPrice ? 'BULK' : '') + ' price: ' + item.price + ' and qty ' + item.qty);
      
      // Done for clarity, could do all this in one line.
      let newPrice = Number(prevPrice) + (Number(item.price) * Number(item.qty)); // Goes into D:<row>, used next time through
      let newQty = Number(prevCount) + Number(item.qty); // Goes into E:<row>, used next time through
      let avg = Number(newPrice)/Number(newQty); // Running median average --> goes into F:<row>
      itemRange.setValues([[avg, timenow(), newPrice, newQty, avg, prevAvg, 'active']]);
      break;
    }
  }

  // Item not there. Add it dynamically?
  if (!found && false) {
    let itemRange = avgSheet().getRange(rows, 2, 1, 7);
    let newPrice = (Number(item.price) * Number(item.qty)); // Goes into D:<row>, used next time through
    let newQty = Number(item.qty); // Goes into E:<row>, used next time through
    let avg = Number(newPrice)/Number(newQty); // Running median average --> goes into F:<row>
    itemRange.setValues([[avg, timenow(), newPrice, newQty, avg, 0, 'active']]);
  }

  SpreadsheetApp.flush();
  profile();

  console.log('<== [updateRunningAverages]');
}

/////////////////////////////////////////////////////////////////////////////
// Helper functions
/////////////////////////////////////////////////////////////////////////////

// Helper: Return a count of the number of transactions that have been logged.
function countTransactions() {
  let count = 0;
  if (!dataSheetRange) dataSheetRange = datasheet().getDataRange();
  var lastRow = dataSheetRange.getLastRow();
  for (let i = 3; i < lastRow; i++) { // Start at 3 to skip header
    let id = datasheet().getRange(i, 2).getValue();
    if (id != "") {count++;}
  }
  
  return count;
}

// Helper: Function to delete trades in the sheet.
// 'remains' is how many to leave.'
function deleteTrades(countXactions, remains) {
  let toDelete = countXactions - remains;
  if (toDelete < 1) return countXactions;

  let startRow = findXactionRow(1, countXactions); 
  let nextXAction = findXactionRow(toDelete+1, countXactions); // Find toDelete+1 transaction
  let numRows = nextXAction - startRow; 
  datasheet().deleteRows(startRow, numRows);
  // Test: verify!
  let leftOver = countTransactions();
  console.log('Deleted ' + toDelete + ' trades out of ' + countXactions + ', leaving ' + leftOver +
  ' (intended to leave ' + remains + ')');
  return remains;
}

// Helper: Function to locate the starting row of the indexed logged transaction.
// This is used to keep a 'rolling log', if we exceed the max # of transactions,
// delete logged transactions one at a time until we no longer exceed that limit.
// To find the indexed one, iterate rows in col. B (Trade ID) until we hit the indexed
// non-empty cell. Then delete from row 1 to found row - 1.
function findXactionRow(index, countXactions) {
  if (index > countXactions) {
    return 0;
  }
  
  let count = 0, row = 0, cellValue = "";
  if (!dataSheetRange) dataSheetRange = datasheet().getDataRange();
  var lastRow = dataSheetRange.getLastRow();
  for (row = 3; row < lastRow; row++) { // Start at 3 to skip header
    cellValue = datasheet().getRange(row, 2).getValue();
    if (cellValue != "") {count++;}
    if (count == index) {break;}
  }
  
  return row;
}

/////////////////////////////////////////////////////////////////////////////
//
// Log the data we've accumulated to the spreadsheet.
// Format: |Timestamp|Trade ID|Item|Quantity|Price Paid|Total Paid	|Item Avg. Price|
// This return the range where the data was inserted, for use in copying
// to the 'latest trade' sheet
//
// See the function fillPrices() for the cases that are logged and those that aren't.
//
/////////////////////////////////////////////////////////////////////////////

function logTransaction(array) { 
  if (!dataSheetRange) dataSheetRange = datasheet().getDataRange();
  var lastRow = dataSheetRange.getLastRow();
  
  // Header - 
  var row = lastRow + 2;
  const startRow = row; // Save for later...
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
  log('logTransaction: checking ' + array.length + ' items.');
  let counter = 0;
  profile();
  for (let i = 0; i < array.length; i++) {
    let values = [[array[i].name, 
              array[i].qty, 
              array[i].price,
              array[i].total]];
    let row = lastRow + 2 + (counter++); // New change - shifts up data row by 1. MAKE SURE does not affect running averages or last XAction
    let range = datasheet().getRange("C" + row + ":F" + row);
    range.setValues(values);
    /* For sorting, leter
    let typeRange = datasheet().getRange("Z" + row);
    typeRange.setValue(array[i].type);
    */
    log('Row ' + row + ' inserted values: ' + values);
    console.log('array: ', array[i]);
    
    // If the price/total is '-1', set as red; if '0', set as yellow
    // See https://developers.google.com/apps-script/reference/calendar/color
    // for color enumerations, or use RGB
    if (opts.opt_colorDataCells == true) {
      let cells = datasheet().getRange('C' + row + ':F' + row);
      let color = 'lime';
      if (array[i].bulkPrice == true) {color = 'orange';}
      else if (array[i].priceAskMe == true) {color = 'yellow';}
      else if (array[i].priceNotFound == true) {color = 'red';}
      cells.setBackground(color);
    }
    itemsInserted++;
  }

  // Now sort by item type. Range is start row to lastRow, columns C to item type row (Z)
  /*
  let sortRange = datasheet().getRange(startRow, 3, datasheet().getLastRow() - startRow, 24);
  console.log('Sorting data range by col ' + sortRange.getLastColumn());
  sortRange.sort([sortRange.getLastColumn(), 5]); // 'Z' then 'E'
  */

  profile();
  log("Finished logging transaction - " + itemsInserted + ' items logged.');
  
  let newRange = 'A' + startRow + ':F' + (startRow + itemsInserted);
  return newRange;
}

/////////////////////////////////////////////////////////////////////////////
// This function copies the latest trade to the 'Last Trade' worksheet
/////////////////////////////////////////////////////////////////////////////

function copyLastTrade(src) {
  let sheetRange = lastTradeSheet().getDataRange();
  let lastRow = sheetRange.getLastRow();
  if (lastRow >= 3) { // Allow for empty sheet
    let numRows = lastRow - 2; // lastRow - 2, +1 as it is inclusive
    lastTradeSheet().deleteRows(3, numRows);
  }
    
  let srcRange = datasheet().getRange(src);
  let dstRange = lastTradeSheet().getRange('A3');
  srcRange.copyTo(dstRange);
  
  log('Copied last trade ("' + src +'") to Last Trade sheet, range "A3"');
}

/////////////////////////////////////////////////////////////////////////////
// Names of items in various sets. 
/////////////////////////////////////////////////////////////////////////////

const flowersInSet = [{"name":"Dahlia", "id": 260, "quantity": 0},
                      {"name":"Orchid", "id": 264, "quantity": 0},
                      {"name":"African Violet", "id": 282, "quantity": 0},
                      {"name":"Cherry Blossom", "id": 277, "quantity": 0},
                      {"name":"Peony", "id": 276, "quantity": 0},
                      {"name":"Ceibo Flower", "id": 271, "quantity": 0},
                      {"name":"Edelweiss", "id": 272, "quantity": 0},
                      {"name":"Crocus", "id": 263, "quantity": 0},
                      {"name":"Heather", "id": 267, "quantity": 0},
                      {"name":"Tribulus Omanense","id": 385, "quantity": 0},
                      {"name":"Banana Orchid", "id": 617, "quantity": 0}];

const plushiesInSet = [{"name":"Jaguar Plushie", "id": 258, "quantity": 0},
                      {"name":"Lion Plushie", "id": 281, "quantity": 0},
                      {"name":"Panda Plushie", "id": 274, "quantity": 0},
                      {"name":"Monkey Plushie", "id": 269, "quantity": 0},
                      {"name":"Chamois Plushie", "id": 273, "quantity": 0},
                      {"name":"Wolverine Plushie", "id": 261, "quantity": 0},
                      {"name":"Nessie Plushie", "id": 266, "quantity": 0},
                      {"name":"Red Fox Plushie", "id": 268, "quantity": 0},
                      {"name":"Camel Plushie", "id": 384, "quantity": 0},
                      {"name":"Kitten Plushie", "id": 215, "quantity": 0},
                      {"name":"Teddy Bear Plushie", "id": 187, "quantity": 0},
                      {"name":"Sheep Plushie", "id": 186, "quantity": 0},
                      {"name":"Stingray Plushie", "id": 618, "quantity": 0}];

////////////////////////////////////////////////////////////////////////////////////////////////////
// Stuff to test without the Tampermonkey script side of things. (moved to the bottom of the script)
////////////////////////////////////////////////////////////////////////////////////////////////////

// Unused, for testing. Can't concat inside the 'params' declaration, for some reason.
let str_parameters = '[{"command":"data"},{"id":"786444001","name":"Blood Bag : AP","qty":"1","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Quran Script : Ubay Ibn Kab ","qty":"2","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Blood Bag : B+","qty":"1","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Hammer","qty":"1","price":"0","total":"0"},' + 
                            '{"id":"786444001","name":"African Violet ","qty":"2","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Banana Orchid ","qty":"4","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Orchid ","qty":"12","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Dahlia ","qty":"12","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Cherry Blossom ","qty":"7","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Peony ","qty":"8","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Ceibo Flower ","qty":"3","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Edelweiss ","qty":"2","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Crocus ","qty":"112","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Heather ","qty":"32","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Tribulus Omanense ","qty":"42","price":"0","total":"0"},' +
                            '{"id":"786444001","name":"Single Red Rose ","qty":"2","price":"0","total":"0"}]';


var params = { parameters: { '[{"command":"data"},{"id":"786444001","name":"Bottle of Sake","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Wind Proof Lighter","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Beretta Pico","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Blood Bag : AP","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"Quran Script : Ubay Ibn Kab ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Blood Bag : B+","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"Hammer","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"African Violet ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Banana Orchid ","qty":"4","price":"0","total":"0"},{"id":"786444001","name":"Orchid ","qty":"12","price":"0","total":"0"},{"id":"786444001","name":"Dahlia ","qty":"12","price":"0","total":"0"},{"id":"786444001","name":"Cherry Blossom ","qty":"7","price":"0","total":"0"},{"id":"786444001","name":"Peony ","qty":"8","price":"0","total":"0"},{"id":"786444001","name":"Ceibo Flower ","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Edelweiss ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Crocus ","qty":"112","price":"0","total":"0"},{"id":"786444001","name":"Heather ","qty":"32","price":"0","total":"0"},{"id":"786444001","name":"Tribulus Omanense ","qty":"42","price":"0","total":"0"},{"id":"786444001","name":"Crowbar","qty":"42","price":"0","total":"0"},{"id":"786444001","name":"ArmaLite M-15A4","qty":"42","price":"0","total":"0"},{"id":"786444001","name":"Single Red Rose ","qty":"2","price":"0","total":"0"}]': [ '' ] },
  contextPath: '',
  parameter: { '[{"command":"data"},{"id":"786444001","name":"Bottle of Sake","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Wind Proof Lighter","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Beretta Pico","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Flea Collar","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Blood Bag : AP","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"Quran Script : Ubay Ibn Kab ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Blood Bag : B+","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"Hammer","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"African Violet ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Banana Orchid ","qty":"4","price":"0","total":"0"},{"id":"786444001","name":"Orchid ","qty":"12","price":"0","total":"0"},{"id":"786444001","name":"Dahlia ","qty":"12","price":"0","total":"0"},{"id":"786444001","name":"Cherry Blossom ","qty":"7","price":"0","total":"0"},{"id":"786444001","name":"Peony ","qty":"8","price":"0","total":"0"},{"id":"786444001","name":"Ceibo Flower ","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Edelweiss ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Crocus ","qty":"112","price":"0","total":"0"},{"id":"786444001","name":"Heather ","qty":"32","price":"0","total":"0"},{"id":"786444001","name":"Tribulus Omanense ","qty":"42","price":"0","total":"0"},{"id":"786444001","name":"Crowbar","qty":"42","price":"0","total":"0"},{"id":"786444001","name":"ArmaLite M-15A4","qty":"42","price":"0","total":"0"},{"id":"786444001","name":"Single Red Rose ","qty":"2","price":"0","total":"0"}]': '' },
  queryString: '',
  postData: 
  { contents: [{"command":"data"},{"id":"786444001","name":"Bottle of Sake","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Wind Proof Lighter","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Beretta Pico","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Flea Collar","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Blood Bag : AP","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"Quran Script : Ubay Ibn Kab ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Blood Bag : B+","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"Hammer","qty":"1","price":"0","total":"0"},{"id":"786444001","name":"African Violet ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Banana Orchid ","qty":"4","price":"0","total":"0"},{"id":"786444001","name":"Orchid ","qty":"12","price":"0","total":"0"},{"id":"786444001","name":"Dahlia ","qty":"12","price":"0","total":"0"},{"id":"786444001","name":"Cherry Blossom ","qty":"7","price":"0","total":"0"},{"id":"786444001","name":"Peony ","qty":"8","price":"0","total":"0"},{"id":"786444001","name":"Ceibo Flower ","qty":"3","price":"0","total":"0"},{"id":"786444001","name":"Edelweiss ","qty":"2","price":"0","total":"0"},{"id":"786444001","name":"Crocus ","qty":"112","price":"0","total":"0"},{"id":"786444001","name":"Heather ","qty":"32","price":"0","total":"0"},{"id":"786444001","name":"Tribulus Omanense ","qty":"42","price":"0","total":"0"},{"id":"786444001","name":"Crowbar","qty":"42","price":"0","total":"0"},{"id":"786444001","name":"ArmaLite M-15A4","qty":"42","price":"0","total":"0"},{"id":"786444001","name":"Single Red Rose ","qty":"2","price":"0","total":"0"}],
    length: 373,
    name: 'postData',
    type: 'application/x-www-form-urlencoded' },
  contentLength: 373 };
