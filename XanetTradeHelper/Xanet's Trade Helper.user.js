// ==UserScript==
// @name         Xanet's Trade Helper
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Records accepted trades and item values
// @author       xedx [2100735]
// @include      https://www.torn.com/trade.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/XanetTradeHelper/Xanet's%20Trade%20Helper.user.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // DIV inserted at top of trade  page, to enter Sheets URL if not already saved.
    // Eventually, separate into separate file to make this neater. The <div> will go into this file:
    // @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/XanetTradeHelper/Xanet-Trade-Helper-Div.js
    // Leaving here for now to make it easier to edit, in the Tampermonkey editor.
    const xedx_main_div =
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
                  '<span>Trade ID:</span><span id="xedx-trade-id" style="color: green; margin-left: 10px;">0</span>' +
                  '<span id="xedx-status-line" style="display:hide; color: green; float: right; margin-right: 10px;">Please Wait...</span>' +
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
                      '<button id="xedx-prices-btn" class="enabled-btn">Prices (live)</button>' +
                      '<button id="xedx-test-btn" class="enabled-btn">Prices (test)</button>' +
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
                  '<label for="autoUpload"><span style="margin-left: 15px">Auto-Upload</span></label>' +
              '</div>' +
              '<div>' +
                  '<input type="checkbox" id="xedx-iteminfo-opt" name="itemInfo" style="margin-left: 200px;">' +
                  '<label for="itemInfo"><span style="margin-left: 15px">Display Item Info</span></label>' +
              '</div>' +
              '<div>' +
                  '<input type="checkbox" id="xedx-baditeminfo-opt" name="baditemInfo" style="margin-left: 200px; margin-bottom: 10px;">' +
                  '<label for="baditemInfo"><span style="margin-left: 15px">Only missing items/prices</span></label>' +
              '</div>' +

          '</div>'; // End xedx-content-div

    // Globals - the googleURL from comes from the script - Publish->Deploy as Web App. This allows us to POST
    // to the sheet's script.
    var googleURL = null;

    // Array to push up for testing.
    const testArray = [{"id":"786444001","name":"African Violet ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Banana Orchid ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Dahlia ","qty":"2","price":"0","total":"0"},
                       {"id":"786444001","name":"Single Red Rose ","qty":"2","price":"0","total":"0"}];

    var hash = location.hash; // ex., '#step=view&ID=6372852'
    //const step = hash.split(/=|#|&/)[2]; // 'view'
    var tradeID = hash.split(/=|#|&/)[4]; // '6372852'
    var totalPrice = 0;
    var dataArray = []; // Data we are uploading per trade
    var activeFlag = false;
    var observer = null; // Mutation observer

    // These can be modified as you see fit.
    // xedxDevMode currently does the following:
    //   Allows the UI to display when travelling.
    //   Suppresses the 'Accept' button from being propogated. (commented out)
    var xedxDevMode = true; // true to enable any special dev mode code.
    var loggingEnabled = true; // true to log to console, false otherwise
    var autoUpload = false; // true to auto-upload when we have data - for pricing info.
    var dispItemInfo = true; // true to display alert on missing items or 0 price, also on success.
    var dispBadItemInfoOnly = true; // true to ONLY disp alert when missing data

    ////////////////////////////////////////////////////
    // Process each item in the trade. This is where we
    // do stuff - build the array we will be uploading.
    //
    // Uploading is done by calling 'uploadDataArray()'
    ////////////////////////////////////////////////////

    // Reverse a string
    function reverseString(str) {
        return (str + '').split("").reverse().join("");
    }

    // Parse "red fox x2\n"
    function processItem(item) {
        // Compensate for TornTools, it may add pricing to the grid. So,
        // 'title' may be something like 'Dahlia x2    $9,930.00'. Scrap
        // everything after the '$', and trim.
        let title = item.innerText.split('$')[0];
        let qty = 0;
        let name = '';
        let found = false;

        // The string reversal is to handle cases like Xanax x43 or Red Fox Plushie x2.
        // There i another case, where ther may not be 'x#', for example with weapons.
        //
        // So, those may also have an 'x' in the name, such as neutrolux. But, if what is
        // after the 'x' is non-numeric, we can assume that the quantity is 1.

        // First case - no 'x's at all. qty = 1, name is title.
        if (title.indexOf('x') == -1) {
            qty = '1';
            name = title.trim();
            if (name == '') { // Nothing in trade
                log('No items in trade!');
                return;
            }
            found = true;
            log('Parsed, case 1: name = ' + name + ', qty = ' + qty);
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
                    log('Parsed, case 2: name = ' + name + ', qty = ' + qty);
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

        return {id: tradeID,  // OUT trade ID, from URL
                name: name,   // OUT eg, "African Violet"
                qty: qty,     // OUT amount in trade
                price: "0",   // IN Unit price
                total: "0"    // IN Total price (qty * price)
                };
    }

    // Ensure there is a valid trade ID, if we are not on a page with a hash, this may fail.
    function validateTradeIDs(useArray) {
        let badHash = false;
        let valid = true;

        log('validateTradeIDs: tradeID = "' + tradeID + '" array length: ' + useArray.length);

        tradeID = Number(tradeID);
        if (isNaN(tradeID)) {
            log('Invalid trade ID: ' + tradeID + ' Getting from URL.');
            hash = location.hash;
            tradeID = Number(hash.split(/=|#|&/)[4]);
            log('New trade ID: ' + tradeID);
            if (!isNaN(tradeID)) {valid = true;}
        }

        return valid;
    }

    // Prform an array deep copy
    function deepCopy(copyArray) {
        return JSON.parse(JSON.stringify(copyArray));
    }

    // Upload data to the sheet
    function uploadDataArray(cmd='data', altArray = null) {
        let url = document.getElementById('xedx-google-key').value;
        if (url == '') {
            url = GM_getValue('xedx-google-key');
            if (url == '' || typeof url == 'undefined') {
                alert('You must enter the Google Sheets URL!');
                return;
            }
        }

        // For testing, can use 'altArray' - the testArray defined above.
        let useArray = altArray ? deepCopy(altArray) : deepCopy(dataArray);

        // Nothing in trade, don't do this.
        if (!useArray.length) {
            log('No data in trade, ignoring');
            return;
        }

        // Validate the trade ID
        if (!validateTradeIDs(useArray)) {
            log('Invalid trade ID!');
            log('tradeID = ' + tradeID);
            if (!isNaN(tradeID)) {
                log(tradeID + ' looks valid to me, ignoring.');
            } else {
                log('Ignoring for now!!!');
            }
            //return;
        }

        // Insert a command into the beginning of the array, as required.
        var command = {command: cmd}; // Defaults to 'data'
        useArray.unshift(command);
        log('Adding command: ' + JSON.stringify(command));

        let data = JSON.stringify(useArray);
        log('Posting data to ' + url);
        log('data = ' + data);

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

    // Handle clicking the 'Accept' button (ev is the event)
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
                uploadDataArray();
            } else {
                log('Not uploading, autoUpload is not enabled!');
            }
        }
    }

    // Handle clicking the 'Cancel' button (ev is the event)
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

        tradeID = 0;
        totalPrice = 0;
    }

    // Called when upload completes
    function uploadFunctionCB(responseText) {
        log('Upload Response:\n' + responseText);
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

    // Handle the response on success
    function processResponse(resp) {
        log('processResponse: ' + resp);

        if (true) {
            let output = 'Success! Response:\n\n' + resp;
            // Parse the response into a ensible output.
            // What we like to see is either complete success,
            // 'All x items logged and Running Averages updated!'
            // or
            // 'The following items are not in the price sheet, or
            // do not have pricing information:'
            // <nice list>
            //
            let newOutput = parseResponse(resp);
            if (newOutput != "") {
                alert(newOutput);
            }
        }

    }

    // Format a number as currency. Move to my helper lib?
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

    // Parse the response into legible text
    function parseResponse(resp) {
        let obj = JSON.parse(resp);
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
        log('Setting total price to ' + asCurrency(dispPrice).replace('$', ''));
        $('#xedx-total-price')[0].innerText = asCurrency(dispPrice).replace('$', '');
        $('#xedx-trade-id')[0].innerText = tradeID;

        log('parseResponse: Result: ' + JSON.stringify(cmdObj) + ' Length: ' + len);
        log('parseResponse: Command: ' + cmd);
        log('parseResponse: Total Trade: ' + total);
        log('parseResponse: dataArray = ' + dataArray + ' Length: ' + dataArray.length);
        log('parseResponse: array data: ' + JSON.stringify(dataArray));

        if (cmd == 'price' && dispItemInfo) {
            let noPrice = countPricesAt(dataArray, 0);
            let notInData = countPricesAt(dataArray, -1);
            log('Items missing prices: ' + noPrice + ' Items not in sheet: ' + notInData);
            if ((noPrice > 0 || notInData > 0)) {
                output += 'Warning: the following items are not in the list or missing prices.\n';

                len = dataArray.length;
                for (let i = 0; i < len; i++) {
                    let item = dataArray[i];
                    log('Processing item: ' + JSON.stringify(item));
                    if (item.price > 0) {continue;}
                    output += '\t' + item.name + ((item.price == 0) ? ' (no price)\n' : ' (missing)\n');
                }
            } else {
                if (dispBadItemInfoOnly) {
                    output = "";
                } else {
                    output = 'Success! ' + cmdObj.itemsProcessed + ' items processed for ' + asCurrency(cmdObj.totalTrade);
                }
            }
        }

        return output;
    }

    // Helper to count items in an array at a given price
    function countPricesAt(arr, price) {
        let counter = 0;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].price == price) {counter++;}
        }
        return counter;
    }

    ///////////////////////////////////////////////////////
    // UI stuff, such as it is.
    ///////////////////////////////////////////////////////

    // View contents of data array to be uploaded, called via the 'View' link
    function viewDataArray() {
        log('Displaying dataArray contents: Active ? ' + (activeFlag ? 'YES' : 'NO') + ' Data ? ' + (dataArray.length ? 'YES' : 'NO'));
        let displayText = '';
        if (!activeFlag) {
            displayText = "There is no data to display when inactive!";
        } else if (dataArray.length == 0) {
            displayText = "No data has been collected! Try refreshing the page.";
        } else {
            displayText = 'Items ready to be uploaded for trade:\n\n';
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let text = '\t' + item.name + ' x' + item.qty + '\n';
                displayText += text;
            }
        }

        log(displayText);
        alert(displayText);
    }

    // Handle the selected options
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
                break;
            case "xedx-baditeminfo-opt":
                dispBadItemInfoOnly = this.checked;
                GM_setValue("dispBadItemInfoOnly", dispBadItemInfoOnly);
                log('Saved value for dispBadItemInfoOnly');
                break;
            default:
                log('Checkbox ID not found!');

        }
    }

    // Check checkboxes to default.
    function setDefaultCheckboxes() {
        log('Setting default state of checkboxes.');
        $("#xedx-logging-opt")[0].checked = GM_getValue("loggingEnabled", loggingEnabled);
        $("#xedx-autoupload-opt")[0].checked = GM_getValue("autoUpload", autoUpload);
        $("#xedx-devmode-opt")[0].checked = GM_getValue("xedxDevMode", xedxDevMode);
        $("#xedx-iteminfo-opt")[0].checked = GM_getValue("dispItemInfo", dispItemInfo);
        $("#xedx-baditeminfo-opt")[0].checked = GM_getValue("dispBadItemInfoOnly", dispBadItemInfoOnly);
    }

    // Read saved options values
    function getSavedOptions() {
        log('Getting saved options.');
        loggingEnabled = GM_getValue("loggingEnabled", loggingEnabled);
        autoUpload = GM_getValue("autoUpload", autoUpload);
        xedxDevMode = GM_getValue("xedxDevMode", xedxDevMode);
        dispItemInfo = GM_getValue("dispItemInfo", dispItemInfo);
    }

    // Write saved options values
    function setSavedOptions() {
        log('Getting saved options.');
        GM_setValue("loggingEnabled", loggingEnabled);
        GM_setValue("autoUpload", autoUpload);
        GM_setValue("xedxDevMode", xedxDevMode);
        GM_setValue("dispItemInfo", dispItemInfo);
    }

    // Show/hide opts page
    function hideOpts(hide=true) {
        log((hide ? "hiding " : "showing ") + "options page.");
        $('#xedx-show-hide-btn').text(`[${hide ? 'show' : 'hide'}]`);
        document.querySelector("#xedx-content-div").style.display = hide ? 'none' : 'block';
    }

    // Add button handler(s).
    function installHandlers() {
        let myButton = document.getElementById('xedx-save-btn');
        myButton.addEventListener('click',function () {
            saveSheetsUrl();
        });

        // Submit data to Google Sheets (Submit link)
        myButton = document.getElementById('xedx-submit-btn'); // Dev only
        myButton.addEventListener('click',function () {
            hideStatus(false);
            log('SUBMIT clicked');
            uploadDataArray('data');
        });

        // Submit data to Google Sheets for pricing info only (Prices link)
        myButton = document.getElementById('xedx-prices-btn'); // Dev only
        myButton.addEventListener('click',function () {
            hideStatus(false);
            log('PRICE (live) clicked');
            uploadDataArray('price');
        });

        // Submit data to Google Sheets for pricing info only (Prices link)
        // Uses the test data array, so no need for live data. For debugging.
        myButton = document.getElementById('xedx-test-btn'); // Dev only
        myButton.addEventListener('click',function () {
            hideStatus(false);
            log('PRICE (test) clicked');
            uploadDataArray('price', testArray);
        });

        // View data ready to be uploaded - View link
        myButton = document.getElementById('xedx-view-btn'); // Dev only
        myButton.addEventListener('click',function () {
            log('VIEW clicked');
            viewDataArray();
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

        // Accept/cancel button handler
        trapAcceptButton();
        trapCancelButton();
    }

    // Add a listener to handle clicking the 'Accept' button
    function trapAcceptButton() {
        let link =
            document.querySelector("#trade-container > div.trade-cancel > div.cancel > div.cancel-btn-wrap > div.btn-wrap.green > span > a");
        log('Trapping "Accept", link = ' + link + ' Text = "' + (validPointer(link) ? link.innerText : 'N/A'));
        if (validPointer(link)) {
            if (typeof window.addEventListener != "undefined") {
                link.addEventListener("click",handleAccept,false);
            } else {
                link.attachEvent("onclick",handleAccept);
            }
        }
    }

    // Add a listener for the 'Cancel' button, may be different on diff pages.
    function trapCancelButton() {
        let link =
            document.querySelector("#trade-container > div.trade-cancel > div.cancel > div.cancel-btn-wrap > div > div > button");
        log('Trapping "Cancel", Link = ' + link + ' Text = "' + (validPointer(link) ? link.innerText : 'N/A'));
        if (validPointer(link)) {
            if (typeof window.addEventListener != "undefined") {
                link.addEventListener("click",handleCancel,false);
            } else {
                link.attachEvent("onclick",handleCancel);
            }
        }
    }

    // Toggle active/inactive status
    function indicateActive(active) {
        log('Toggling active status: ' + (active ? 'active' : 'inactive'));
        if (validPointer($('#xedx-active-light')[0])) {
            var str = `[${active ? 'Active' : 'Inactive'}]`;
            $('#xedx-active-light').text(str);
            $('#xedx-active-light')[0].style.color = active ? "green" : "red";
            activeFlag = active;
        } else {
            log('Active indicator not found!');
        }
    }

    // Show/hide status line
    function hideStatus(hide=true) {
        log('Hiding status line: ' + (hide? 'true' : 'false'));
        $('#xedx-status-line')[0].style.display = hide ? 'none' : 'block';
    }

    // Show/hide the Dev Tools links
    function hideDevLinks(hide) {
        log('Hiding dev tools: ' + (hide? 'true' : 'false'));
        $('#devtools-div')[0].style.display = hide ? 'none' : 'block';
    }

    // Build our UI
    function buildUI() {
        getSavedOptions();
        if (validPointer(document.getElementById('xedx-main-div'))) {
            log('UI already installed!');
            return;
        }

        let parentDiv = document.querySelector("#trade-container > div.content-title");

        // For testing, if travelling, display anyways.
        if (xedxDevMode && awayFromHome() && !validPointer(parentDiv)) {
            log('Away from home, forcing UI for dev mode.');
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
            log('UI installed.');
        } else {
            log('Unable to find parent div!');
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
        log('Prev Sib: ' + prevSib + ' Type: ' + (validPointer(prevSib) ? prevSib.nodeType : 'undefined'));
        if (validPointer(prevSib)) {
            if (prevSib.nodeType == Node.ELEMENT_NODE) {
                log('Removing node.');
                prevSib.remove();
            }
        }
    }

    ///////////////////////////////////////////////////////////////////
    // Triggered on page load. Start the show.
    ///////////////////////////////////////////////////////////////////

    function handlePageLoad() {

        window.addEventListener('hashchange', function() {
            log('The hash has changed! Trade ID: ' + tradeID + ' Total Price: ' + totalPrice);
            //buildUI();
            //getGridData();
            addObserver();
        }, false);
        
        buildUI();
        getGridData();
    }

    // Get the data from the right-hand trade grid, if available
    function getGridData() {
        const ulRoot = document.querySelector("#trade-container > div.trade-cont > div.user.right > ul > li > ul");
        if (validPointer(ulRoot)) {
            // Clear the array first, if needed.
            dataArray = [];
            dataArray.length = 0;

            const names = ulRoot.querySelectorAll("div.name.left");
            log('Processing trade items:');
            names.forEach(element => processItem(element));

            // Indicate that we are 'active' - data saved
            indicateActive(true);

            // Here, just upload for pricing info.
            // Actually logged remotely when the param is 'data' (the default)
            if (autoUpload) {uploadDataArray('price');}
        }
        // No items in trade, or not on an active trade page TBD - dev mode, maybe display UI anyways?
        else {
            indicateActive(false);
            log('Not on a trade page, or no items in trade!'); // Also hit when I initiate a trade.
            log('ulRoot: ' + ulRoot);
            log('div.user.right: ' + document.querySelector("#trade-container > div.trade-cont > div.user.right"));
            log('div.trade-cont: ' + document.querySelector("#trade-container > div.trade-cont"));
        }

        if (!isNaN(totalPrice) && !isNaN(tradeID)) {
            log('Setting total price to ' + asCurrency(totalPrice).replace('$', ''));
            $('#xedx-total-price')[0].innerText = asCurrency(totalPrice).replace('$', '');
            $('#xedx-trade-id')[0].innerText = tradeID;
        } else {
            log('Failed to set price: total = "' + totalPrice + '" tradeID = "' + tradeID + '"');
        }
    }

    // Add an mutation observer
    function addObserver() {
        var targetNode = document.querySelector("#trade-container");
        var config = { attributes: false, childList: true, subtree: true };
        var callback = function(mutationsList, observer) {
            log('Mutation observer triggered!');
            observer.disconnect();
            buildUI();
            getGridData();
        };
        observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    // Simple logging helper
    function log(data) {
        if (loggingEnabled) {
            console.log(GM_info.script.name + ': ' + data);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    // Full URL we trigger on https://www.torn.com/trade.php*
    logScriptStart();
    validateApiKey();

    // Need to wait for full page load.
    window.onload = function(e){handlePageLoad();}


})();