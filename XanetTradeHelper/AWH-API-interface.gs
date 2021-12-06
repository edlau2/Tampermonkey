/////////////////////////////////////////////////////////////////////////////
// File: AWH-API-interface.gs
/////////////////////////////////////////////////////////////////////////////

// Versioning, internal
var XANET_API_INTERFACE_VERSION_INTERNAL = '1.6';

/////////////////////////////////////////////////////////////////////////////
// Globalsa
/////////////////////////////////////////////////////////////////////////////

var opts = {};
const psStartRow = 8; // Start of data on the price sheet
const idCol = 2;  // Column with ID's ('B') (both sheets)
const priceCol = 4; // Column for prices ('D') (price sheet)
const nameCol = 1; // Column for name, (both sheets)

/////////////////////////////////////////////////////////////////////////////
// Main entry point
/////////////////////////////////////////////////////////////////////////////

function main() {
  var ss = important_getSSID();
  let success = true;
  let savedExceptions  = [];
  const startTime = new Date().getTime(); // Used for profiling
  loadScriptOptions();
  console.log(getVersion()); // ALWAYS logged.
  statusRange = priceSheet().getRange('G19');

  // Look for dups in the price sheet
  markDupsInPriceList();

  // Safely lock access to this path concurrently (optionally)
  const lock = LockService.getPublicLock();
  if (opts.opt_useLocks) {
    success = lock.tryLock(30000); 
    if (!success) { 
      let output = 'Error: Unable to obtain exclusive lock after 30 seconds.';
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
    console.log('itemsJSON, # of items: ', itemsJSON.items.length);

    log('Uploading JSON pricing to AWH...');
    let baseURL = opts.awhBaseURL;
    let username = opts.awhKey;
    let flowersURL = baseURL + 'museum-sets/exotic-flowers/bids';
    let plushiesURL = baseURL + 'museum-sets/plushies/bids';
    let password = '';
    let auth = {"Authorization": "Basic " + Utilities.base64Encode(username + ":" + password)};

    // POST all prices
    var postOptions = {
      'method' : 'post',
      'headers': auth,
      'muteHttpExceptions': false,
      'contentType': 'application/json',
      'payload' : JSON.stringify(itemsJSON)
    };
    log('POST URL: ' + baseURL + 'bids');
    console.log('postOptions: ', postOptions);
    var httpResp = null;
    try {
      httpResp = UrlFetchApp.fetch(baseURL + 'bids', postOptions);
    } catch(e) {
      savedExceptions.push(e);
      log('Would have uploaded ' + itemsJSON.items.length + ' items.'); // Temp, testing
      console.log('POST exception: ', e);
      safeAlert('POST exception: ', e);
      success = false;
      return;
    }
    log('Uploaded ' + itemsJSON.items.length + ' items.');
    console.log('Result: ' + httpResp.getResponseCode() + ' ' + httpResp.getContentText());

    // Now (optionally) get each item's price, log it.
    if (opts.opt_getItemBids) {
      getItemBids(itemsJSON);
    }
    
    // All done.
  } catch(e) {
    console.log('Exception caught in main(): ', e);
    console.log(e.stack);
    success = false;
    savedExceptions.push(e);
    console.log('Exception saved: length = ' + savedExceptions.length);
  } finally {
    const endTime = new Date().getTime();
    log((success ? 'Success! ' : 'Error - ') + 'Execution complete. Elapsed time: ' + 
      (endTime - startTime)/1000 + ' seconds.');
      if (!success && savedExceptions.length) {
        console.log(`Error details, ${savedExceptions.length} saved exceptions:`, savedExceptions);
      }
      safeAlert('All done!\nTook ' + (endTime - startTime)/1000 + ' seconds.');
    
    if (opts.opt_useLocks) {
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
// With bulk prices:
// "items": [ { "id": 215, "price": 750, "bulk": [{ "minimum_quantity": 250, "price": 700}]],...
//
/////////////////////////////////////////////////////////////////////////////

function readPriceList() {
  log('readPriceList');
  var sheetRange = priceSheet().getDataRange();
  var dataRange = priceSheet().getRange(psStartRow, nameCol, sheetRange.getLastRow(), 1);
  var lastRow = dataRange.getLastRow(); // May be less than the sheet's last row 

  // dataRangeArr will be a 2D array of [name][ignore][ignore][price]
  dataRange = priceSheet().getRange(psStartRow, nameCol, lastRow, 6); // Extended 4 to 6 for bulk
  var dataRangeArr = dataRange.getValues();

  // Now get range for [name][ID], as vlookup range
  var itemRange = itemSheet().getRange(2, nameCol, 1159, 2);
  var itemRangeArr = itemRange.getValues();

  // Now insert the price from the dataRange, and the ID found via a
  // vlookup from the itemRange, into a new array
  let retArray = [];
  let noPrices = 0;
  for (let i = 0; i < lastRow; i++) {
    if (i == 13 || i == 25) continue;
    if (!dataRangeArr[i][0]) {
      console.log('Invalid data at row ' + i);
      break;
    }
    let name = dataRangeArr[i][0];
    let price = dataRangeArr[i][3];
    let bulkQty = opts.opt_bulkPricing ? dataRangeArr[i][4] : 0;
    let bulkPrice = opts.opt_bulkPricing ? dataRangeArr[i][5] : 0;
    if (!Number.isInteger(price) || !price) {
      if (noPrices++ > 25) throw('Far too many prices of $0, is the "Prie Calc" sheet invalid?');
      console.log('Price for "' + name +'" appears invalid: ' + price);
      continue;
    }
    let id = vlookupscript(dataRangeArr[i][0], itemRangeArr, 1, 2);
    if (!id) {
      console.error('ID not found for ' + name + '! (row = ' + (i+8) + ')');
      continue;
    }
    console.log('ID, Price for ' + dataRangeArr[i][0] + ': ' + id + ', ' + price);
    retArray.push([id, price, name, bulkQty? bulkQty : 0, bulkPrice]);
  }

  console.log('retArray: ', retArray);
  console.log('retArray, items: ' + retArray.length);
  if (retArray.length < 1) {
    console.log('Something went wrong! Check the "Item Sheet" and "Bazaar Prices" to be sure' +
                ' that they are filled in correctly.');
    throw('No items found or incorrectly priced!');
  }

  // 'retArray' is now a 2D array of [ID, price, name, bulkQty, bulkPrice], convert to JSON.
  // ex: [ 187, 800, 'Teddy Bear Plushie', 100, 750],
  // Convert to required JSON:
  // "items": [ { "id": 215, "price": 750, "bulk": [{ "minimum_quantity": 250, "price": 700}]],...
  var retJSON = {"items": [], "museum_sets": []}; 
  for (let i = 0; i < retArray.length; i++) {
    if (!retArray[i]) break; // Shouldn't need anymore

    let item = {"id": retArray[i][0], "price": retArray[i][1]};
    if (retArray[i][3] && opts.opt_bulkPricing) { // Bulk qty
      item.bulk = [{"minimum_quantity": retArray[i][3], "price": retArray[i][4]}];
    }
    if (item.id && item.price) { // Test this with blank rows! // Shouldn't need anymore!
      let result = retJSON.items.filter(elem => elem.id == item.id); // Dup check...
      if (!result.length) retJSON.items.push(item);
    }
  }

  // Now add the set prices.
  if (opts.opt_calcSetPointPrices) {
    retJSON.museum_sets.push({"type": "exotic-flowers", "price": priceSheet().getRange('D7').getValue()});
    retJSON.museum_sets.push({"type": "plushies", "price": priceSheet().getRange('D7').getValue()});
  } else {
    retJSON.museum_sets.push({"type": "exotic-flowers", "price": priceSheet().getRange('D33').getValue()});
    retJSON.museum_sets.push({"type": "plushies", "price": priceSheet().getRange('D21').getValue()});
  }

  return {"JSON": retJSON, "arr": retArray};
}

/////////////////////////////////////////////////////////////////////////////
// Helpers
/////////////////////////////////////////////////////////////////////////////

/* ----- MOVED TO UTILITIES ----- */

/////////////////////////////////////////////////////////////////////////////
// Test the upload: get all item bids
/////////////////////////////////////////////////////////////////////////////

function getItemBids(itemsJSON) {
    let baseURL = opts.awhBaseURL;
    let username = opts.awhKey;
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
      //log('GET URL: ' + useURL);
      result = UrlFetchApp.fetch(useURL, getOptions);
      let text = result.getContentText();
      let bid = JSON.parse(text).bids;
      let id = items[i].id;
      let name = vlookupscript(id, itemRangeArr, 2, 1);
      let tmp = 'Item: ' + name + ' [' + id + '], price = ' + asCurrency(bid[0].price);

      // Support 1 bulk price
      tmp += bid[1] ? ', price = ' + asCurrency(bid[1].price) 
        + ' for min ' + bid[1].minimum_quantity + '\n' : '\n';

      alertText += tmp;
      //log('GET response: ' + text);
      log('AWH pricing: ' + tmp);
    }

    //log('GET URL: ' + flowersURL);
    result = UrlFetchApp.fetch(flowersURL, getOptions);
    console.log('GET response (exotic-flowers): ', result.getContentText());
    alertText += result.getContentText() + '\n';

    //log('GET URL: ' + plushiesURL);
    result = UrlFetchApp.fetch(plushiesURL, getOptions);
    console.log('GET response (plushies): ', result.getContentText());
    alertText += result.getContentText() + '\n';

    safeAlert('Finished downloading prices!\n\n' + alertText);
}

