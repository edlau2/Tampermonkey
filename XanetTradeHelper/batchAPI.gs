/** ==============================================================================================================*
  batchAPI by 0xHemlock [2662912]
  =================================================================================================================
  Version:      0.1
  License:      GNU General Public License, version 3 (GPL-3.0) 
                http://www.opensource.org/licenses/gpl-3.0.html
  -----------------------------------------------------------------------------------------------------------------
  A library for calling a number of Torn API functions in one call. 
  This script is designed to be used inside of "Xanet's Price List".  It runs on a time-based trigger (?)

  TBD - verify the trigger! Where is it, what triggers it?
  
  Publi functions:

     batchAPI()      @desc For use by end users to import a bulk JSON feed from URLs 
                     @param none
                     @returns nothing (modifies the Trade Helper sheets directly)
     
================================================================================================================*/

function batchAPI() { 
  
  try {
    var importJSON_calls = 0; // counter for logging
    console.log('batchAPI() called.');
  
  //Define the working sheets
  var ss = important_getSSID();

  var bazaar_prices_tab = ss.getSheetByName("bazaar prices");
  var item_list_tab = ss.getSheetByName("item list");
  var price_calc_tab = ss.getSheetByName("Price Calc");
  var points_tab = ss.getSheetByName("points");

  //Pull in values from ranges
  var item_id_arr = item_list_tab.getRange("A2:B").getValues();
  var active_items_arr = bazaar_prices_tab.getRange("B1:1").getValues()[0];
  var batch_max = bazaar_prices_tab.getRange("A4").getValue();
  var cycle_max = bazaar_prices_tab.getRange("A6").getValue();
  var cycle_iter = bazaar_prices_tab.getRange("A8").getValue();
  var api_key = price_calc_tab.getRange("B5").getValue();

  //Maintenance
  if (isNaN(batch_max) || isNaN(cycle_max) || isNaN(cycle_iter)) {   //make sure functional variables are numbers
    bazaar_prices_tab.getRange("A9").setValue("ERROR - Above metrics are not numbers");
    return 1;
  }
  if (api_key == "") { //check for empty api_key
    bazaar_prices_tab.getRange("A9").setValue("ERROR - API key is blank");
    return 1;
  }
  if (cycle_iter > cycle_max || cycle_iter < 1) {  //in case of sheet changes, make sure the iterator is within the max cycle range
    cycle_iter = 1;
  }
  active_items_arr = active_items_arr.filter(element => element);  //cleanse the empty values from the active item list

  //Run the batch API call
  var start = (batch_max * cycle_iter) - batch_max;
  var end = Math.min(batch_max * cycle_iter, active_items_arr.length);
  console.log('batchAPI entering loop: start = ' + start + ' end = ' + end);
  console.log('Using API key: ' + api_key);
  for (var i = (batch_max * cycle_iter) - batch_max; i < Math.min(batch_max * cycle_iter, active_items_arr.length); i++) {
    var thisItem = active_items_arr[i];
    var itemId = item_id_arr.findIndex((element) => element[0] == thisItem);
    var printIndex = ((i + 1) * 2) + i; //this is translating the item position in "bazaar prices" in row 1 to the column number that the JSON report starts on.  If the sheet is restructured, edit this.
    if (itemId == -1 && active_items_arr[i] != "Points") {
      bazaar_prices_tab.getRange(2, printIndex).setValue("ERROR - Item ID not found");
      bazaar_prices_tab.getRange(2, printIndex + 1, 1, 2).clearContent();
      bazaar_prices_tab.getRange(3, printIndex, 102, 3).clearContent();
    }
    else {
      var apiCall;
      var bazaarListings;
      console.log('Called importJSON, importJSON_calls = ' + (++importJSON_calls));
      if (active_items_arr[i] == "Points") {
        apiCall = "https://api.torn.com/market/?comment=batchAPI&selections=pointsmarket&key=" + api_key;
        bazaarListings = ImportJSON(apiCall);
        points_tab.getRange("A1:2").clearContent();
        points_tab.getRange(1, 1, 2, bazaarListings[0].length).setValues(bazaarListings);
        //points_tab.getRange("A3").setValue(bazaarListings[0].length);
      }
      else {
        apiCall = "https://api.torn.com/market/" + item_id_arr[itemId][1] + "?comment=batchAPI&selections=bazaar&key=" + api_key;
        bazaarListings = ImportJSON(apiCall);
        bazaar_prices_tab.getRange(2, printIndex, 102, 3).clearContent();
        if (bazaarListings[0].length == 3){
        bazaar_prices_tab.getRange(2, printIndex, bazaarListings.length, 3).setValues(bazaarListings);
        }
      }
      bazaar_prices_tab.getRange("A11").setValue(timenow());
      if (bazaarListings[0][2] == "Error") {
        bazaar_prices_tab.getRange("A9").setValue("ERROR - API call returned an error.  View column " + printIndex + ".");
        return 1;
      }
    }
  }

  //Update the cycle iterator and remove error messages
  cycle_iter = cycle_iter + 1;
  if (cycle_iter > cycle_max) {
    cycle_iter = 1;
  }
  bazaar_prices_tab.getRange("A8").setValue(cycle_iter);
  bazaar_prices_tab.getRange("A9").setValue("Success!");

  } catch (e) {
    console.log('batchAPI: ' + e.stack);
  } finally {
    console.log('batchAPI completed, importJSON calls: ' + importJSON_calls);
    return 'Success';
  }
}

/**  
 * Validates the layout of 'Sheet10', if not in correct format,
 * sets a random value in C9 that I presume is checked somewhere
 * to trigger a full refresh of the sheet.
*/
function checkSheet10() {
  var ss = important_getSSID();
  var sheet10 = ss.getSheetByName("Sheet10");
  var status = sheet10.getRange("A7").getValue();
  if (status != "1 Buy Price") {
    up2();
  }
}

function up2(){
  var ss = important_getSSID();
  ss.getRange('Sheet10!C9').setValue(Math.random());
}

function up3(){ // Unused (?)
  var ss = important_getSSID();
  ss.getRange('Last trade!g2').setValue(Math.random());
}

function ClearCells() { // Unused (?)
  var sheet = SpreadsheetApp.getActive().getSheetByName('Trade Calc');
  sheet.getRange('A2:A100').clearContent();
}

/** Unused functions, left for legacy purposes.
 * 
function up() {
  var ss = important_getSSID();
  ss.getRange('Sheet10!F8').setValue(Math.random());
}

function up4() {
  SpreadsheetApp.openById('1cMDWkDPZmDGBHTXBCoUsybH0h3lf6ND-VJSoh8Df09k').getRange('bazaar prices!a2').setValue(Math.random());
}

function up5() {
  SpreadsheetApp.openById('1cMDWkDPZmDGBHTXBCoUsybH0h3lf6ND-VJSoh8Df09k').getRange('bazaar prices!a3').setValue(Math.random());
}

function up6() {
  SpreadsheetApp.openById('1cMDWkDPZmDGBHTXBCoUsybH0h3lf6ND-VJSoh8Df09k').getRange('bazaar prices!a4').setValue(Math.random());
}

function up7() {
  SpreadsheetApp.openById('1cMDWkDPZmDGBHTXBCoUsybH0h3lf6ND-VJSoh8Df09k').getRange('bazaar prices!a5').setValue(Math.random());
}

function up8() {
  SpreadsheetApp.openById('1cMDWkDPZmDGBHTXBCoUsybH0h3lf6ND-VJSoh8Df09k').getRange('bazaar prices!a6').setValue(Math.random());
}

function up9(){
  SpreadsheetApp.openById('1cMDWkDPZmDGBHTXBCoUsybH0h3lf6ND-VJSoh8Df09k').getRange('bazaar prices!a7').setValue(Math.random());
}

function up10(){
  SpreadsheetApp.openById('1cMDWkDPZmDGBHTXBCoUsybH0h3lf6ND-VJSoh8Df09k').getRange('bazaar prices!a8').setValue(Math.random());
}
*/


