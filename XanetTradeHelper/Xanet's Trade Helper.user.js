// ==UserScript==
// @name         Xanet's Trade Helper
// @namespace    http://tampermonkey.net/
// @version      3.12
// @description  Records accepted trades and item values
// @author       xedx [2100735]
// @match        https://www.torn.com/trade.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// Per kontamusse: optionally display pricing details in version 3.9

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

(function() {
    'use strict';

    logScriptStart();

    // DIV inserted at top of trade  page, to enter Sheets URL if not already saved.
    // This is done as a function - at the bottom of this page - so it can be code collapsed.
    const xedx_main_div = createMainDiv();

    //////////////////////////////////////////////////////////////////////
    // These can be modified as you see fit.
    //////////////////////////////////////////////////////////////////////

    loggingEnabled = true;           // Declared in Torn-JS-helpers, true to log to console, false otherwise
    debugLoggingEnabled = true;      // Declared in Torn-JS-helpers, turn of to disable debug() output

    const uiDelay = 500;             // Delay, in ms, before loading the mini UI. Needed if the script runs too quickly.

    var autoUpload = true;           // true to auto-upload when we have data - for pricing info.
    var dispItemInfo = false;        // true to display alert on missing items or 0 price, also on success.
    var dispBadItemInfoOnly = false; // true to ONLY disp alert when missing data
    var testData = false;            // true to emulate using test data
    var priceDetails = false;        // true to display price details

    // New option, used to disable the "auto add money" step
    var autoAddMoney = true;

    //////////////////////////////////////////////////////////////////////
    // Development tools/variables
    //////////////////////////////////////////////////////////////////////

    //
    // xedxDevMode currently does the following:
    // Allows the UI to display when travelling (for testing while I'm not in Torn)
    // Suppresses the 'Accept' button from being propogated. (commented out)
    //
    var xedxDevMode = true;

    //
    // Test data to upload when there is no active trade
    //
    const testArray = [{"id":"6424407","name":"Blood Bag : BP","qty":"1","price":"0","total":"0"}, // Script changes 'B+' to 'BP'...
                       {"id":"6424407","name":"Blood Bag : A-","qty":"1","price":"0","total":"0"},
                       {"id":"786444001","name":"African Violet ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Banana Orchid ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Dahlia ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Orchid ","qty":"12","price":"0","total":"0"},
                       {"id":"786444001","name":"Cherry Blossom ","qty":"7","price":"0","total":"0"},
                       {"id":"786444001","name":"Peony ","qty":"8","price":"0","total":"0"},
                       {"id":"786444001","name":"Ceibo Flower ","qty":"3","price":"0","total":"0"},
                       {"id":"786444001","name":"Edelweiss ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Crocus ","qty":"112","price":"0","total":"0"},
                       {"id":"786444001","name":"Heather ","qty":"32","price":"0","total":"0"},
                       {"id":"786444001","name":"Tribulus Omanense ","qty":"42","price":"0","total":"0"},
                       {"id":"786444001","name":"Some Crap ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Snow Cannon ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Spear ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Quran Script : Ubay Ibn Kab ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Single Red Rose ","qty":"2","price":"0","total":"0"}];

    // Globals - the googleURL from comes from the script - Publish->Deploy as Web App. This allows us to POST
    // to the sheet's script.
    var googleURL = null;

    var hash = location.hash; // ex., '#step=view&ID=6372852'
    var tradeID = getTradeIDFromHash();
    var totalPrice = 0;
    var totalSets = 0;
    var dataArray = []; // Data we are uploading per trade
    var activeFlag = false;
    var observer = null; // Mutation observer

    // Some HTML crap
    const ten_spaces = "&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp";

    ////////////////////////////////////////////////////////////////////////////////
    // Process each item in the trade. This is where we do stuff - build the aray
    // array we will be uploading. Uploading is done by calling 'uploadDataArray()'
    // This is called from getGridData() for each item. This mostly handles
    // sanitizing the data, one item at a time.
    ///////////////////////////////////////////////////////////////////////////////

    function processItem(item) {
        // Compensate for TornTools, it may add pricing to the grid. So,
        // 'title' may be something like 'Dahlia x2    $9,930.00'. Scrap
        // everything after the '$', and trim.
        debug('processItem: ' + item.innerText);
        let title = item.innerText.split('$')[0];
        let qty = 0;
        let name = '';
        let found = false;

        // The string reversal is to handle cases like Xanax x43 or Red Fox Plushie x2.
        // There is another case, where there may not be 'x#', for example with weapons.
        //
        // So, those may also have an 'x' in the name, such as neutrolux. But, if what is
        // after the 'x' is non-numeric, we can assume that the quantity is 1.

        // First case - no 'x's at all. qty = 1, name is title.
        if (title.indexOf('x') == -1) {
            qty = '1';
            name = title.trim();
            if (name == '') { // Invalid trade item, prob. cash
                log('Invalid trade item, probably cash.');
                return;
            }
            found = true;
            debug('Parsed, case 1: name = ' + name + ', qty = ' + qty);
        }
        // Second case - Search reversed string for 'x', preceeding char
        // not numeric, same as above.
        if (!found) {
            let reversed = reverseString(title); // '\n2x xof der'
            let at = reversed.indexOf('x');
            if (at > 0) {
                let char = reversed.charAt((at-1));
                if (isNaN(char)) {
                    qty = '1';
                    name = title.trim();
                    found = true;
                    debug('Parsed, case 2: name = ' + name + ', qty = ' + qty);
                }
            }
        }
        // Final case, normal 'item x2' (for example), but compensate for
        // 'x's in the name itself.
        if (!found) {
            let reversed = reverseString(title); // '\n2x xof der'
            let parsed = reversed.replace(/\x/,'&').split('&');
            qty = reverseString(parsed[0]).trim();
            name = reverseString(parsed[1]).trim();
            log('Parsed, case 3: name = ' + name + ', qty = ' + qty);
        }

        let data = getDataItem(name, qty);
        log('New data item: ' + JSON.stringify(data));
        log('ID: ' + (validPointer(data.id) ? data.id : 'undefined'));
        dataArray.push(data);
    }

    // Helper to build an item (element of trade) to push onto a data array for upload
    function getDataItem(name, qty) {
        // Handle the blood bags with a '+' in them...(A+, B+, O+, AB+)
        if (name.indexOf('Blood Bag :') != -1) {
          name = name.replace('A+', 'AP');
          name = name.replace('B+', 'BP');
          name = name.replace('O+', 'OP');
          name = name.replace('AB+', 'ABP');
        }

        let useID = validPointer(tradeID) ? tradeID.toString() : '';
        return {id: useID,    // OUT trade ID, from URL
                name: name,   // OUT eg, "African Violet"
                qty: qty,     // OUT amount in trade
                price: "0",   // IN Unit price
                total: "0"    // IN Total price (qty * price)
                };
    }

    // Upload data to the sheet
    function uploadDataArray(cmd='data') {
        log('[uploadDataArray]');
        let url = document.getElementById('xedx-google-key').value;
        if (url == '') {
            url = GM_getValue('xedx-google-key');
            if (url == '' || typeof url == 'undefined') {
                alert('You must enter the Google Sheets URL!');
                return;
            }
        }

        // For testing, can use 'altArray' - the testArray defined above.
        //let useArray = testData ? deepCopy(testArray) : deepCopy(dataArray);
        let useArray = deepCopy(testData ? testArray : dataArray);

        // Nothing in trade, don't do this.
        if (!useArray.length) {
            hideStatus();
            let msg = 'No ' + (testData ? 'test' : 'live') + ' data in trade, unable to upload!';
            log('[uploadDataArray] ' + msg);
            devAlert(msg);
            return;
        }

        // Validate the trade ID
        if (!validateTradeIDs(useArray)) {
            log('[uploadDataArray] Invalid trade ID!');
            log('[uploadDataArray] tradeID = ' + tradeID);
            if (!isNaN(tradeID)) {
                log('[uploadDataArray] ' + tradeID + ' looks valid to me, ignoring.');
            } else {
                log('[uploadDataArray] Ignoring for now!!!');
            }
            //return;
        }

        hideStatus(false);

        // Insert a command into the beginning of the array, as required.
        var command = {command: cmd}; // Defaults to 'data'
        useArray.unshift(command);
        log('Adding command: ' + JSON.stringify(command));

        let data = JSON.stringify(useArray);
        log('Posting data to ' + url);
        log('data = ' + data);
        if (cmd == 'data') {clearTradeID();}

        let details = GM_xmlhttpRequest({
            method:"POST",
            url:url,
            data:data,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                hideStatus();
                console.log(GM_info.script.name + ': submitFunctionCB: ' + response.responseText);
                uploadFunctionCB(response.responseText);
            },
            onerror: function(response) {
                hideStatus();
                console.log(GM_info.script.name + ': onerror');
                handleScriptError(response);
            },
            onabort: function(response) {
                hideStatus();
                console.log(GM_info.script.name + ': onabort');
                handleSysError(response);
            },
            ontimeout: function(response) {
                hideStatus();
                console.log(GM_info.script.name +': ontimeout');
                handleScriptError(response);
            }
        });
    }

    /**************************************************************************
    / Response processing
    /**************************************************************************/

    // Called when upload completes
    function uploadFunctionCB(responseText) {
        log('[uploadFunctionCB]\n' + responseText);
        if (responseText.indexOf('<!DOCTYPE html>') != -1) {
            var newWindow = window.open();
            newWindow.document.body.innerHTML = responseText;
            return;
        }

        processResponse(responseText);
    }

    // Called on script error
    function handleScriptError(response) {
        let errorText = GM_info.script.name + ': An error has occurred submitting data:\n\n' +
            response.error;

        log(errorText);
        alert(errorText + '\n\nPress OK to continue.');
    }

    // Handle the response on success
    function processResponse(resp) {
        log('[processResponse] ' + resp);

        // TBD...
        if (true) {
            let output = 'Success! Response:\n\n' + resp;
            // Parse the response into a sensible output.
            // What we like to see is either complete success, 'All x items logged and Running Averages updated!'
            //  - or -
            // 'The following items are not in the price sheet, or do not have pricing information: <nice list>'
            //
            // Partial prettied - if  'priceDetails' is enabled, successfull results display nicely.
            // Haven't tested failures...
            //
            let newOutput = parseResponse(resp);
            log("[newOutput] " + newOutput);
            if (newOutput != "") {
                if (!priceDetails) {
                    alert(newOutput);
                } else {
                    $('#xedx-pricing-text')[0].innerHTML = newOutput;
                }
                log(newOutput);
            }
        }
    }

    // Parse the response into legible text
    function parseResponse(resp) {
        let obj = JSON.parse(resp);
        log('[parseResponse] obj', obj);
        log('[parseResponse] resp: ', resp);
        if (obj.exception) {
            log('[parseResponse] Exception: ', obj.exception);
            return "An exception occured during processing. Please see the console log for details";
        }
        let len = obj.length;
        let cmdObj = obj[0];
        let dataArray = obj.splice(1, len-1);
        let output = '';
        let cmd = cmdObj.command;
        let total = cmdObj.totalTrade;

        // Set the 'Total Price' in the UI, unless 0.
        let dispPrice = totalPrice; // totalPrice is global
        if (total > 0) {
            totalPrice = total;
            dispPrice = total;
        }
        log('[parseResponse] Setting total sets to ' + totalSets);
        processDataSets(dataArray);

        if (Number(tradeID) == 0) {tradeID = dataArray[0].id;}

        log('Setting total price to ' + asCurrency(dispPrice).replace('$', ''));
        $('#xedx-total-price')[0].innerText = asCurrency(dispPrice).replace('$', '');
        $('#xedx-trade-id')[0].innerText = tradeID;

        log('[parseResponse]  Result: ' + JSON.stringify(cmdObj) + ' Length: ' + len);
        log('[parseResponse]  Command: ' + cmd);
        log('[parseResponse]  Total Trade: ' + total);
        log('[parseResponse]  dataArray = ' + dataArray + ' Length: ' + dataArray.length);
        debug('[parseResponse]  array data: ' + JSON.stringify(dataArray));

        let detailsText = "<br><br>";
        let missingPriceWarning = "";
        let dataReceived = 'Result data:\n';
        let fullDataReceived = dataReceived;
        let successText = 'Success! ' + cmdObj.itemsProcessed + ' items processed for ' + asCurrency(cmdObj.totalTrade) +'.';
        if (totalSets) {
            successText += '\nFound ' + totalSets + ' full sets!';
        }
        if (dispItemInfo || dispBadItemInfoOnly || priceDetails) {

            // Text for received data array
            // When displaying details on the main UI, format a little nicer.
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                if (item.price <= 0) {continue;}
                let text = '\t' + item.name + ' x' + item.qty;
                let fullText = text + ' - ' + asCurrency(item.price) +
                    ' each, ' + asCurrency(item.total) + ' total.';
                detailsText += ten_spaces + fullText + '<br>';
                dataReceived += (text + '\n');
                fullDataReceived += fullText;
            }

            // Text for missing items.
            let noPrice = countPricesAt(dataArray, 0);
            let notInData = countPricesAt(dataArray, -1);
            let doneOnce = false;
            log('[parseResponse] Items missing prices: ' + noPrice + ' Items not in sheet: ' + notInData);
            if ((noPrice > 0 || notInData > 0)) {
                missingPriceWarning += 'Warning: the following items are not in the list or missing prices.\n';
                for (let i = 0; i < dataArray.length; i++) {
                    let item = dataArray[i];
                    debug('[parseResponse] Processing item: ' + JSON.stringify(item));
                    if (item.price > 0) {continue;}
                    if (!doneOnce) {
                        detailsText += "<br>" + ten_spaces + "The following items are missing, or have no price:<br>";
                        doneOnce = true;
                    }
                    detailsText += "<br>" + ten_spaces + item.name + ((item.price == 0) ? ' (no price)' : ' (missing)');
                    missingPriceWarning += '\t' + item.name + ((item.price == 0) ? ' (no price)\n' : ' (missing)\n');
                }
                if (doneOnce) detailsText += "<br>";
            }
        }

        if (priceDetails) {
            return detailsText + "<br>";
        } else if (dispBadItemInfoOnly && cmd == 'price' && missingPriceWarning != "") {
           return successText + '\n\n'+ missingPriceWarning;
        } else if (dispBadItemInfoOnly) {
            return '';
        } else if (dispItemInfo  && missingPriceWarning != "") {
            output = successText + '\n\n'+ missingPriceWarning + '\n' + fullDataReceived;
        } else if (dispItemInfo) {
            output = successText + '\n\n' + fullDataReceived;
        }

    return output;
    }

    /**************************************************************************
    / misc. helpers
    /**************************************************************************/

    // Helper: Ensure there is a valid trade ID, if we are not on a page with a hash, this may fail.
    function validateTradeIDs(useArray) {
        let badHash = false;
        let valid = true;

        log('[validateTradeIDs] tradeID = "' + tradeID + '" array length: ' + useArray.length);

        tradeID = Number(tradeID);
        if (isNaN(tradeID)) {
            valid = false;
            log('[validateTradeIDs] Invalid trade ID: ' + tradeID + ' Getting from URL.');
            getTradeIDFromHash();
            if (!isNaN(tradeID)) {valid = true;}
        }

        return true; // valid; // TEMPORARY - for debugging
    }

    // Helper: Perform an array deep copy
    function deepCopy(copyArray) {
        return JSON.parse(JSON.stringify(copyArray));
    }

    // Helper to clear some globals, and log this event.
    function clearTradeID() {
        log('[clearTradeID] TID = ' + tradeID + ' Price = ' + totalPrice);
        //tradeID = '0';
        totalPrice = '0';
        log('Cleared total price, left TID alone: TID = ' + tradeID + ' Price = ' + totalPrice);
    }

    // Helper to get TradeID from hash
    function getTradeIDFromHash() {
        log('[getTradeIDFromHash]');
        hash = location.hash;
        debug('[getTradeIDFromHash] hash = ' + hash);
        debug('[getTradeIDFromHash] hash split, stringified: ' + JSON.stringify(hash.split(/=|#|&/)));
        let tempArray = hash.split(/=|#|&/); //[4];
        let temp = '0'
        for (let i = 0; i < tempArray.length; i++) {
            if (tempArray[i] == 'ID') {
                temp = tempArray[i+1];
                break;
            }
        }
        log('[getTradeIDFromHash] ID = "' + temp + '"');
        if (validPointer(temp)) {
            log('[getTradeIDFromHash] Setting tradeID to "' + temp + '"');
            tradeID = temp;
        }
        return tradeID;
    }

    // Helper for 'parseResponse() to count items in an array at a given price ('0' or '-1')
    function countPricesAt(arr, price) {
        let counter = 0;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].price == price) {counter++;}
        }
        return counter;
    }

    // Helper: Reverse a string
    function reverseString(str) {
        return (str + '').split("").reverse().join("");
    }

    /**************************************************************************
    / UI helpers
    /**************************************************************************/

    // Save the Sheets URL in permanent storage (from the 'Save' link)
    function saveSheetsUrl(useUrl=null) {
        let url = useUrl;
        if (url == null) {
            url = document.getElementById('xedx-google-key').value;
        }
        if (url == '' || url == null) {
            alert('You must enter the Google Sheets URL!');
            return;
        }
        googleURL = url;
        GM_setValue('xedx-google-key', url);
        alert(GM_info.script.name + ': URL saved!');
    }

    // Helper: Handle clicking the 'Accept' button
    function handleAccept(ev) {
        getSavedOptions();
        log('Accept button handler: ' + ev);

        /* Uncomment to prevent the trade from actually propogating
        // (when xedxDevMode selected). Just as easy to press 'Cancel'.
        if (xedxDevMode) {
            log('Stopping event propogation.');
            ev.stopPropagation();
        }
        */
        if (!activeFlag || !dataArray.length) {
            log('No data to POST, or inactive!');
        } else {
            if (autoUpload) {
                log('Uploading data, ' + dataArray.length + ' items.');
                uploadDataArray('data');
            } else {
                log('Not uploading, autoUpload is not enabled!');
            }
        }
    }

    // Helper: Handle clicking the 'Cancel' button
    function handleCancel(ev) {
        getSavedOptions();
        log('Cancel button handler: ' + ev);

        /* Uncomment to prevent the trade from actually propogating
        // (when xedxDevMode selected). Just as easy to press 'Cancel'.
        if (xedxDevMode) {
            log('Stopping event propogation.');
            ev.stopPropagation();
        }
        */

        clearTradeID();
    }

    // Helper: View contents of data array to be uploaded, called via the 'View' link
    function viewDataArray() {
        let useArray = testData ? testArray : dataArray;
        log('Displaying dataArray contents: Active ? ' + (activeFlag ? 'YES' : 'NO') + ' Data ? ' + (useArray.length ? 'YES' : 'NO'));
        let displayText = '';
        if (!activeFlag && !testData) {
            displayText = "There is no data to display when inactive!";
        } else if (useArray.length == 0) {
            displayText = "No data has been collected! Try refreshing the page.";
        } else {
            displayText = 'Items ready to be uploaded for trade:\n\n';
            for (let i = 0; i < useArray.length; i++) {
                let item = useArray[i];
                let text = '\t' + item.name + ' x' + item.qty + '\n';
                displayText += text;
            }
        }

        log(displayText);
        devAlert(displayText);
    }

    // Helper: Handle the selected options
    function handleOptsClick() {
        let option = this.id;
        log('Handling checkbox change for ' + option);
        switch (option) {
            case "xedx-logging-opt":
                loggingEnabled = this.checked;
                GM_setValue("loggingEnabled", loggingEnabled);
                log('Saved value for loggingEnabled');
                break;
            case "xedx-autoupload-opt":
                autoUpload = this.checked;
                GM_setValue("autoUpload", autoUpload);
                log('Saved value for autoUpload');
                break;
            case "xedx-devmode-opt":
                xedxDevMode = this.checked;
                GM_setValue("xedxDevMode", xedxDevMode);
                log('Saved value for xedxDevMode');
                hideDevLinks(!xedxDevMode);
                break;
            case "xedx-iteminfo-opt":
                dispItemInfo = this.checked;
                GM_setValue("dispItemInfo", dispItemInfo);
                log('Saved value for dispItemInfo');
                if (dispItemInfo)
                    $( "#xedx-pricedetails-opt" ).prop( "checked", false );
                break;
            case "xedx-baditeminfo-opt":
                dispBadItemInfoOnly = this.checked;
                GM_setValue("dispBadItemInfoOnly", dispBadItemInfoOnly);
                log('Saved value for dispBadItemInfoOnly');
                if (dispBadItemInfoOnly)
                    $( "#xedx-pricedetails-opt" ).prop( "checked", false );
                break;
            case "xedx-testdata-opt":
                testData = this.checked;
                GM_setValue("testData", testData);
                log('Saved value for testData');
                indicateActive(activeFlag);
                break;
            case "xedx-pricedetails-opt":
                priceDetails = this.checked;
                GM_setValue("priceDetails", priceDetails);
                log('Saved value for priceDetails');
                if (priceDetails) {
                    $( "#xedx-baditeminfo-opt" ).prop( "checked", false );
                    $( "#xedx-iteminfo-opt" ).prop( "checked", false );
                    $("#xedx-price-detail-div").addClass('xedx-show').removeClass('xedx-hide');
                } else {
                    $("#xedx-price-detail-div").addClass('xedx-hide').removeClass('xedx-show');
                }
                break;
            default:
                log('Checkbox ID not found!');
        }
    }

    // Helper: Check checkboxes to default.
    function setDefaultCheckboxes() {
         debug('[setDefaultCheckboxes');
        $("#xedx-logging-opt")[0].checked = GM_getValue("loggingEnabled", loggingEnabled);
        $("#xedx-autoupload-opt")[0].checked = GM_getValue("autoUpload", autoUpload);
        $("#xedx-devmode-opt")[0].checked = GM_getValue("xedxDevMode", xedxDevMode);
        $("#xedx-iteminfo-opt")[0].checked = GM_getValue("dispItemInfo", dispItemInfo);
        $("#xedx-baditeminfo-opt")[0].checked = GM_getValue("dispBadItemInfoOnly", dispBadItemInfoOnly);
        $("#xedx-testdata-opt")[0].checked = GM_getValue("testData", testData);
        $("#xedx-pricedetails-opt")[0].checked = GM_getValue("priceDetails", priceDetails);

    }

    // Helper: Read saved options values
    function getSavedOptions() {
        debug('[getSavedOptions]');
        loggingEnabled = GM_getValue("loggingEnabled", loggingEnabled);
        autoUpload = GM_getValue("autoUpload", autoUpload);
        xedxDevMode = GM_getValue("xedxDevMode", xedxDevMode);
        dispItemInfo = GM_getValue("dispItemInfo", dispItemInfo);
        dispBadItemInfoOnly = GM_getValue("dispBadItemInfoOnly", dispBadItemInfoOnly);
        testData = GM_getValue("testData", testData);
        priceDetails = GM_getValue("priceDetails", priceDetails);

        if (priceDetails) {
            $("#xedx-price-detail-div").addClass('xedx-show').removeClass('xedx-hide');
        } else {
            $("#xedx-price-detail-div").addClass('xedx-hide').removeClass('xedx-show');
        }
    }

    function logSavedOptions() {
        log('[logSavedOptions]');
        log('loggingEnabled: ' + GM_getValue("loggingEnabled", loggingEnabled));
        log('autoUpload: ' + GM_getValue("autoUpload", autoUpload));
        log('xedxDevMode: ' + GM_getValue("xedxDevMode", xedxDevMode));
        log('dispItemInfo: ' + GM_getValue("dispItemInfo", dispItemInfo));
        log('dispBadItemInfoOnly: ' + GM_getValue("dispBadItemInfoOnly", dispBadItemInfoOnly));
        log('testData: ' + GM_getValue("testData", testData));
    }

    // Helper: Write saved options values
    function setSavedOptions() {
        log('[setSavedOptions]');
        GM_setValue("loggingEnabled", loggingEnabled);
        GM_setValue("autoUpload", autoUpload);
        GM_setValue("xedxDevMode", xedxDevMode);
        GM_setValue("dispItemInfo", dispItemInfo);
        GM_setValue("testData", testData);
    }

    // Helper: Show/hide opts page
    function hideOpts(hide=true) {
        log('[hideOpts] ' + (hide ? "hiding " : "showing ") + "options page.");
        $('#xedx-show-hide-btn').text(`[${hide ? 'show' : 'hide'}]`);
        document.querySelector("#xedx-content-div").style.display = hide ? 'none' : 'block';
    }

    // Helper: Add button handler(s).
    function installHandlers() {
        let myButton = document.getElementById('xedx-save-btn');
        myButton.addEventListener('click',function () {
            saveSheetsUrl();
        });

        // Submit data to Google Sheets (Submit link)
        myButton = document.getElementById('xedx-submit-btn'); // Dev only
        myButton.addEventListener('click',function () {
            hideStatus(false);
            log('SUBMIT clicked, testData = ' + testData);
            uploadDataArray('data');
        });

        // Submit data to Google Sheets for pricing info only (Prices link)
        myButton = document.getElementById('xedx-prices-btn'); // Dev only
        myButton.addEventListener('click',function () {
            hideStatus(false);
            log('PRICE clicked, testData = ' + testData);
            uploadDataArray('price');
        });

        // View data ready to be uploaded - View link
        myButton = document.getElementById('xedx-view-btn'); // Dev only
        myButton.addEventListener('click',function () {
            log('VIEW clicked, testData = ' + testData);
            viewDataArray('live');
        });

        // Show/Hide options link
        const savedHide = GM_getValue('xedxHideOpts', false);
        hideOpts(savedHide);
        $('#xedx-show-hide-btn').on('click', function () {
            const hide = $('#xedx-show-hide-btn').text() == '[hide]';
            GM_setValue('xedxHideOpts', hide);
            hideOpts(hide);
        });

        // Options checkboxes
        $("#xedx-logging-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-autoupload-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-devmode-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-iteminfo-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-baditeminfo-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-testdata-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-pricedetails-opt")[0].addEventListener("click", handleOptsClick);

        // Accept/cancel button handler
        trapAcceptButton();
        trapCancelButton();
    }

    // Helper: Add a listener to handle clicking the 'Accept' button
    function trapAcceptButton() {
        let link =
            document.querySelector("#trade-container > div.trade-cancel > div.cancel > div.cancel-btn-wrap > div.btn-wrap.green > span > a");
        log('[trapAcceptButton] link = ' + link + ' Text = "' + (validPointer(link) ? link.innerText : 'N/A'));
        if (validPointer(link)) {
            if (typeof window.addEventListener != "undefined") {
                link.addEventListener("click",handleAccept,false);
            } else {
                link.attachEvent("onclick",handleAccept);
            }
        }
    }

    // Helper: Add a listener for the 'Cancel' button, may be different on diff pages.
    function trapCancelButton() {
        let link =
            document.querySelector("#trade-container > div.trade-cancel > div.cancel > div.cancel-btn-wrap > div > div > button");
        log('[trapCancelButton] Link = ' + link + ' Text = "' + (validPointer(link) ? link.innerText : 'N/A'));
        if (validPointer(link)) {
            if (typeof window.addEventListener != "undefined") {
                link.addEventListener("click",handleCancel,false);
            } else {
                link.attachEvent("onclick",handleCancel);
            }
        }
    }

    // Helper: Toggle active/inactive status
    function indicateActive(active) {
        log('[indicateActive] ' + (testData ? 'Using Test Data' : active ? 'active' :  'inactive'));
        if (validPointer($('#xedx-active-light')[0])) {
            var str = `[${testData ? 'Using Test Data' : active ? 'Active' : 'Inactive'}]`;
            $('#xedx-active-light').text(str);
            $('#xedx-active-light')[0].style.color = active ? "green" : "red";
            activeFlag = active;
        } else {
            log('[indicateActive] Active indicator not found!');
        }
    }

    // Helper: Show/hide status line
    function hideStatus(hide=true) {
        log('[hideStatus] ' + (hide? 'true' : 'false'));
        $('#xedx-status-line')[0].style.display = hide ? 'none' : 'block';
    }

    // Helper: Show/hide the Dev Tools links
    function hideDevLinks(hide) {
        log('[hideDevLinks] ' + (hide? 'true' : 'false'));
        $('#devtools-div')[0].style.display = hide ? 'none' : 'block';
        $('#xedx-testdata-div')[0].display = hide ? 'none' : 'block';
        if (hide) {testData = false;}
    }

    //////////////////////////////////////////////////////////////////////
    // Fill the money field with current price. This happens when yo click
    // in the field, and uses the price sent back from the spreadsheet.
    //////////////////////////////////////////////////////////////////////

    // Helper to handle the page asking for how much $$ to add to the trade.
    // This basically adds a listener.
    function handleAddMoneyPage() {

        if (!autoAddMoney)
        {
            log("[handleAddMoneyPage] autoAddMoney disabled, not installing handler");
            return;
        }

        let hash = location.hash;
        let step = hash.split(/=|#|&/)[2];
        log('[handleAddMoneyPage] step = ' + step);
        if (step == 'addmoney') {
            let moneySel = document.querySelector("#trade-container > div.init-trade.add-money > div.cont-gray.bottom-round > " +
                                                  "form > ul > li > div.input-money-group > input:nth-child(2)");

            let moneyInput = document.querySelector("#trade-container > div.init-trade.add-money > div.cont-gray.bottom-round > " +
                                                    "form > ul > li > div.input-money-group > input:nth-child(3)");

            // Add a handler for when the money field is clicked
            moneySel.addEventListener('click',function () {
                addMoney(moneySel, moneyInput);
            });
        }
    }

    // Helper for above, actually fills the field.
    function addMoney(target1, target2) {
        if (!autoAddMoney)
        {
            log("[addMoney] autoAddMoney disabled, not updating");
            return;
        }

        log('[addMoney]');
        let value = target2.getAttribute('value');
        if (value == '' || value == null || value == undefined) {
            log('[addMoney] Setting value to "' + totalPrice);
            target1.setAttribute('value', totalPrice);
            target2.setAttribute('value', totalPrice);

            let group = document.querySelector("#trade-container > div.init-trade.add-money > div.cont-gray.bottom-round > form > ul > li > div.input-money-group");
            group.classList.add("success");

            // Enable the 'Change' button
            let btn = document.querySelector("#trade-container > div.init-trade.add-money > " +
                                             "div.cont-gray.bottom-round > form > span > span > input");
            btn.removeAttribute('disabled');
            btn.classList.remove('disabled');
        }
    }

    /**************************************************************************
    * Build our UI
    **************************************************************************/

    function buildUI(fromInit=false) {
        log('[buildUI]');
        addStyles();
        getSavedOptions();
        if (validPointer(document.getElementById('xedx-main-div'))) {
            log('UI already installed!');
            if (fromInit) buildUiComplete();
            return;
        }

        let parentDiv = document.querySelector("#trade-container > div.content-title");

        // For testing, if travelling, display anyways.
        if (xedxDevMode && awayFromHome() && !validPointer(parentDiv)) {
            log('[buildUI] Away from home, forcing UI for dev mode.');
            parentDiv = document.querySelector("#mainContainer > div.content-wrapper > div.content-title");
        }

        if (validPointer(parentDiv)) {
            $(xedx_main_div).insertAfter(parentDiv);
            $(separator).insertAfter(parentDiv);
            $('#xedx-content-div')[0].style.width = $('#xedx-header-div')[0].clientWidth + 'px';
            let urlInput = document.getElementById('xedx-google-key');
            let value = GM_getValue('xedx-google-key');
            if (typeof value != 'undefined' && value != null && value != '') {
                urlInput.value = value;
            }

            installHandlers();
            setDefaultCheckboxes();
            log('[buildUI] UI installed.');
        } else {
            log('[buildUI] Unable to find parent div!');
        }

        // Display the options page and status as needed.
        let mainDiv = document.getElementById('xedx-main-div');
        if (validPointer(mainDiv)) {
            hideStatus();
            let url = document.getElementById('xedx-google-key').value;
            if (url != '' && url != null) {
              hideOpts();
            }
        }

        let prevSib = validPointer(mainDiv) ? mainDiv.previousSibling : null;
        debug('[buildUI] Prev Sib: ' + prevSib + ' Type: ' + (validPointer(prevSib) ? prevSib.nodeType : 'undefined'));
        if (validPointer(prevSib)) {
            if (prevSib.nodeType == Node.ELEMENT_NODE) {
                log('[buildUI] Removing node: ', prevSib);
                prevSib.remove();
            }
        }

        if (fromInit) buildUiComplete();
    }

    /**************************************************************************
    * Triggered on page load. Start the show.
    /*************************************************************************/

    function handlePageLoad() {
        log('[handlePageLoad]');
        window.addEventListener('hashchange', function() {
            log('The hash has changed! Trade ID: ' + tradeID + ' Total Price: ' + totalPrice);
            log('new hash: ' + location.hash);
            getTradeIDFromHash(); // New!
            addObserver();
        }, false);

        setTimeout(function () {buildUI(true)}, uiDelay);
    }

    function buildUiComplete() {
        log('[buildUiComplete]');
        pageRetries = 0;
        getGridData();
        handleAddMoneyPage();
    }

    /**************************************************************************
    * Determine what sets, if any, are in the trade.
    /*************************************************************************/

    function processDataSets(useArray) {
        log('[processDataSets]');
        try {
        totalSets = 0;
        for (let i = 0; i < useArray.length; i++) {
            let item = useArray[i];
            let name = item.name.toString();
            if (name.includes('Plushie Set') || name.includes('Flower Set') || name.includes('Set Price')) {
                let oldSets = Number(totalSets);
                oldSets += Number(item.qty);
                totalSets = oldSets;
            }
        }
        $('#xedx-total-sets')[0].innerText = Number(totalSets).toString();
        } catch(e) {
            log('[processDataSets] Exception: ' + e.stack);
            log('[processDataSets] useArray: ' + useArray);
        }

        log('[processDataSets] total sets: ' + totalSets);
    }

    /**************************************************************************
    * Get the data from the right-hand trade grid, if available.
    * This buids the dataArray that will be uloaded later, for either
    * pricing info, or insertion into the spreadsheet, or both.
    **************************************************************************/

    var pageRetries = 0;
    function getGridData() {
        var names = null;
        const ulRoot = document.querySelector("#trade-container > div.trade-cont > div.user.right > ul");
        //const ulRoot = document.querySelector("#trade-container > div.trade-cont > div.user.right > ul > li > ul");
        try {
        if (validPointer(ulRoot)) {
            // Clear the array first, if needed.
            totalPrice = 0;
            dataArray = [];
            dataArray.length = 0;

            names = ulRoot.querySelectorAll("div.name.left");
            log('[getGridData] Processing trade items. There are ' + names.length + ' elements');
            names.forEach(element => processItem(element));

            // Data array is all set - process any sets that may or may not be in it.
            log('[getGridData] Preparing to processDataSets. dataArray = ' + dataArray + ' length: ' + dataArray.length);
            processDataSets(dataArray);

            // Indicate that we are 'active' - data saved
            indicateActive(true);

            // Here, just upload for pricing info.
            // Actually stored remotely when the param is 'data' (the default)
            if (autoUpload) {
                log('[getGridData] Preparing to upload for "price" data.');
                uploadDataArray('price');
            } else {
                log('[getGridData] Not auto uploading for price check, not enabled!');
            }
        }
        // No items in trade, or not on an active trade page TBD - dev mode, maybe display UI anyways?
        // Or the page hasn't fully loaded. Dammit. Adding an observer here seems overkill.
        else {
            indicateActive(false);
            log('[getGridData] Not on a trade page, or no items in trade!'); // Also hit when I initiate a trade.
            debug('[getGridData] ulRoot: ' + ulRoot);
            debug('[getGridData] div.user.right: ' + document.querySelector("#trade-container > div.trade-cont > div.user.right"));
            debug('[getGridData] div.trade-cont: ' + document.querySelector("#trade-container > div.trade-cont"));
            if (ulRoot == null && pageRetries <= 3) {
                pageRetries++;
                setTimeout(getGridData, 500);
                return;
            }
        }
        } catch(e) {
            log('[getGridData] Exception detected! names = ' + names + ' Call stack: ' + e.stack);
        }

        pageRetries = 0;
        if (!isNaN(totalPrice) && !isNaN(tradeID)) {
            log('[getGridData] Setting total price to ' + asCurrency(totalPrice).replace('$', ''));
            $('#xedx-total-price')[0].innerText = asCurrency(totalPrice).replace('$', '');
            $('#xedx-trade-id')[0].innerText = tradeID;
            $('#xedx-total-sets')[0].innerText = totalSets;
        } else {
            log('[getGridData] Failed to set price: total = "' + totalPrice + '" tradeID = "' + tradeID + '"');
        }
    }

    // Add a mutation observer
    function addObserver() {
        log('[addObserver]');
        var targetNode = document.querySelector("#trade-container");
        var config = { attributes: false, childList: true, subtree: true };
        var callback = function(mutationsList, observer) {
            log('Mutation observer triggered!');
            observer.disconnect();
            buildUI();
            pageRetries = 0;
            getGridData();
            handleAddMoneyPage();
        };
        observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    // Simple helper to display an alert - but only in dev mode
    function devAlert(msg) {
        if (xedxDevMode) {alert(msg);}
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    validateApiKey();

    logSavedOptions(); // For debugging

    callOnContentComplete(handlePageLoad);

    //////////////////////////////////////////////////////////////////////
    //
    // Some 'hidden' functions, stuck here to be code-collapsed to
    // make the code easier to read.
    //
    // TBD: finish making everything CSS styles
    //
    //////////////////////////////////////////////////////////////////////

    function addStyles() {
        GM_addStyle(`
          .xedx-hide {display: none;}
          .xedx-show {display: block;}

          .xedx-price-details {
              margin-left: 10px;
              margin-right: 20px;
              font-weight: bold;
              font-size: 12px;}

          .xedx-pad10 {
              padding-top: 5px;
              padding-bottom: 5px;
          }
          `);
    }

    function createMainDiv() {
        let retDiv =
          '<div class="t-blue-cont h" id="xedx-main-div">' +

              // Header and title.
              '<div id="xedx-header-div" class="title main-title title-black top-round active" role="table" aria-level="5">' +
                  "<span>Xanet's Trade Helper</span>" +

                  // This displays the active/inactive status - active when data array is populated.
                  '<div id="xedx-active-light" style="float: left; margin-right: 10px; margin-left: 10px;">' +
                      '<span>Active</span>' +
                  '</div>' +

                  // This displays the [hide] | [show] link
                  '<div class="right" style="margin-right: 10px">' +
                      '<a role="button" id="xedx-show-hide-btn" class="t-blue show-hide">[hide]</a>' +
                  '</div>' +
              '</div>' +

              '<div id="xedx-2nd-header-div" class="title main-title title-black top-round bottom-round active" role="table" aria-level="5">' +
                  '<span>Total Cost:</span><span id="xedx-total-price" style="color: green; margin-left: 10px; margin-right: 30px;">0</span>' +
                  '<span>Trade ID:</span><span id="xedx-trade-id" style="color: green; margin-left: 10px; margin-right: 30px;">0</span>' +
                  '<span>Total Sets:</span><span id="xedx-total-sets" style="color: green; margin-left: 10px;">0</span>' +
                  '<span id="xedx-status-line" style="display:hide; color: green; float: right; margin-right: 10px;">Please Wait...</span>' +
              '</div>' +

              // Per kontamusse: optionally display pricing details
              '<div id="xedx-price-detail-div" class="xedx-pad10 cont-gray top-round bottom-round active xedx-show" role="table" aria-level="5">' +
                '<span class="xedx-price-details">Detailed pricing:</span>' +
                '<span id="xedx-pricing-text"></span>' +
              '</div>' +

          // This is the content that we want to hide when '[hide] | [show]' is clicked.
          '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: auto; overflow: auto display: block";>' +

              // Google Sheets published URL, can be edited
              '<div style="text-align: center; vertical-align: middle;">' +
                  '<br>' +
                  '<span id="input-span" style="margin-top: 30px;">Google Sheets URL: ' +
                  '<input id="xedx-google-key" type="text" style="font-size: 14px;' + // height: 24px;' +
                  'border-radius: 5px; margin: 0px 10px 10px 10px; border: 1px solid black; width: 450px;">' +
                      '<button id="xedx-save-btn" class="enabled-btn">Save URL</button>' +
                  '</span>' +
              '</div>' +

              // Links for testing (development) - Submit, View, ...
              '<div id="devtools-div" style="margin-left: 200px; vertical-align: middle; display: block;">' +
                  '<span id="button-span">Development Tools: ' +
                      '<button id="xedx-submit-btn" class="enabled-btn">Submit</button>' +
                      '<button id="xedx-view-btn" class="enabled-btn">View</button>' +
                      '<button id="xedx-prices-btn" class="enabled-btn">Prices</button>' +
                      //'<button id="xedx-test-btn" class="enabled-btn">Prices (test)</button>' +
                      //'<button id="xedx-clear-btn" class="enabled-btn">Clear</button>' +
                      '<p>(This also allows the UI to display on the travel page, for testing.)</p>' +

                  '</span>' +
              '</div>' +
              '<p style="text-align: left; margin-left: 82px;">Options:</p>' +
              '<div>' +
                  '<input type="checkbox" id="xedx-devmode-opt" name="devmode" style="margin-left: 200px; margin-top: 10px;">' +
                  '<label for="devmode"><span style="margin-left: 15px;">Development Mode</span></label>' +
              '</div>' +
              '<div>' +
                  '<input type="checkbox" id="xedx-logging-opt" name="loggingEnabled" style="margin-left: 200px;">' +
                  '<label for="loggingEnabled"><span style="margin-left: 15px;">Logging Enabled</span></label>' +
              '</div>' +
              '<div>' +
                  '<input type="checkbox" id="xedx-autoupload-opt" name="autoUpload" style="margin-left: 200px;">' +
                  '<label for="autoUpload"><span style="margin-left: 15px;">Auto-Upload</span></label>' +
              '</div>' +
              '<div>' +
                  '<input type="checkbox" id="xedx-iteminfo-opt" name="itemInfo" style="margin-left: 200px;">' +
                  '<label for="itemInfo"><span style="margin-left: 15px;">Display Item Info</span></label>' +
              '</div>' +
              '<div>' +
                  '<input type="checkbox" id="xedx-baditeminfo-opt" name="baditemInfo" style="margin-left: 200px;">' +
                  '<label for="baditemInfo"><span style="margin-left: 15px;">Only missing items/prices</span></label>' +
              '</div>' +
              '<div id="xedx-testdata-div" style="display: block;">' +
                  '<input type="checkbox" id="xedx-testdata-opt" name="testData" style="margin-left: 200px;">' +
                  '<label for="testData"><span style="margin-left: 15px;">Use test data</span></label>' +
              '</div>' +
              '<div id="xedx-price-details-div" style="display: block;">' +
                  '<input type="checkbox" id="xedx-pricedetails-opt" name="priceDetails" style="margin-left: 200px; margin-bottom: 10px;">' +
                  '<label for="priceDetails"><span style="margin-left: 15px;">Display price details</span></label>' +
              '</div>' +



          '</div>';

        return retDiv;
    }

})();