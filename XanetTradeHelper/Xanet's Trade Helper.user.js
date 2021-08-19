// ==UserScript==
// @name         Xanet's Trade Helper
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Records accepted trades and item values
// @author       xedx [2100735]
// @include      https://www.torn.com/trade.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // DIV inserted at top of trade  page, to enter Sheets URL if not already saved.
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
          // This is the content that we want to hide when '[hide] | [show]' is clicked.
          '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: auto; overflow: auto display: block";>' +
              // Google Sheets published URL, can be edited
              '<div style="text-align: center; vertical-align: middle;>' +
                  '<span id="input-span">Google Sheets URL: ' +
                  '<input id="xedx-google-key" type="text" style="font-size: 14px;' + // height: 24px;' +
                  'border-radius: 5px; margin: 0px 10px 10px 10px; border: 1px solid black; width: 450px;">' +
                      '<button id="xedx-save-btn" class="enabled-btn">Save</button>' +
                  '</span>' +
              '</div>' +
              // Buttons for testing (development) - Submit, View, ...
              '<div id="button-div" style="text-align: center; vertical-align: middle; display: block;">' +
                  '<span id="button-span">Development Tools: ' +
                      '<button id="xedx-submit-btn" class="enabled-btn">Submit</button>' +
                      '<button id="xedx-view-btn" class="enabled-btn">View</button>' +
                      //'<button id="xedx-clear-btn" class="enabled-btn">Clear</button>' +
                  '</span>' +
              '</div>' +
          '</div>';

    // Globals - the googleURL from comes from the script - Publish->Deploy as Web App. This allows us to POST
    // to the sheet's script.
    var googleURL = null;

    const hash = location.hash; // ex., '#step=view&ID=6372852'
    const step = hash.split(/=|#|&/)[2]; // 'view'
    const tradeID = hash.split(/=|#|&/)[4]; // '6372852'
    var dataArray = []; // Data we are uploading per trade
    var activeFlag = false;

    // These can be modified as you see fit.
    // xedxDevMode currently only allows the UI to display when travelling
    const xedxDevMode = true; // true to enable any special dev mode code.
    const loggingEnabled = true; // true to log to console, false otherwise

    ////////////////////////////////////////////////////
    // Process each item in the trade. This is where we
    // do stuff - build the array we will be uploading.
    //
    // Uploading is done by calling 'uploadDataArray()'
    ////////////////////////////////////////////////////

    function processItem(item) {
        let title = item.innerText;
        let parsed = title.split(/x|\n/);
        let name = parsed[0];
        let qty = parsed[1];

        let data = getDataItem(name, qty);
        log('New data item: ' + JSON.stringify(data));
        dataArray.push(data);
    }

    // Helper to build an item (element of trade) to push onto a data array for upload
    function getDataItem(name, qty) {
        return {id: tradeID,  // OUT trade ID, from URL
                name: name,           // OUT eg, "African Violet"
                qty: qty,             // OUT amount in trade
                price: "0",           // IN Unit price
                total: "0"            // IN Total price (qty * price)
                };
    }

    // Upload data to the sheet
    function uploadDataArray() {
        let url = document.getElementById('xedx-google-key').value;
        if (url == '') {
            url = GM_getValue('xedx-google-key');
            if (url == '' || typeof url == 'undefined') {
                alert('You must enter the Google Sheets URL!');
                return;
            }
        }

        let data = JSON.stringify(dataArray);
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
                console.log(GM_info.script.name + ': submitFunctionCB: ' + response.responseText);
                uploadFunctionCB(response.responseText);
            },
            onerror: function(response) {
                console.log(GM_info.script.name + ': onerror');
                handleScriptError(response);
            },
            onabort: function(response) {
                console.log(GM_info.script.name + ': onabort');
                handleSysError(response);
            },
            ontimeout: function(response) {
                console.log(GM_info.script.name +': ontimeout');
                handleScriptError(response);
            }
        });
    }

    // Called when upload completes
    function uploadFunctionCB(responseText) {
        log('Upload Response:\n' + responseText);
        if (responseText.indexOf('<!DOCTYPE html>') != -1) {
            var newWindow = window.open();
            newWindow.document.body.innerHTML = responseText;
            return;
        }
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

    ///////////////////////////////////////////////////////
    // UI stuff, such as it is.
    ///////////////////////////////////////////////////////

    // View contents of data array to be uploaded, called via the 'View' link
    function viewDataArray() {
        log('Displaying dataArray contents: Active ? ' + (activeFlag ? 'YES' : 'NO') + ' Data ? ' + (dataAray.length ? 'YES' : 'NO'));
        let displayText = '';
        if (!activeFlag) {
            displayText = "There is no data to display when inactive!";
        } else if (dataAray.length == 0) {
            displayText = "No data has been collected! Try refreshing the page.";
        } else {
            var formatter = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0
                });
            displayText = 'Items ready to be uploaded for trade:';
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let text = '\t\n' + item.name + ' x' + item.qty + ' ' + formatter.format(item.price);
                displayText += text;
            }

        log(displayText);
        alert(displayText);
    }

    // Show/hide opts page
    function hideOpts(hide=true) {
        console.log(GM_info.script.name + (hide ? ": hiding " : ": showing " + "options page."));
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
            uploadDataArray();
        });

        // View data ready to be uploaded - View link, TBD
        myButton = document.getElementById('xedx-view-btn'); // Dev only
        myButton.addEventListener('click',function () {
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
    }

    // Toggle active/inactive status
    function indicateActive(active) {
        log('Toggling active status: ' + (active ? 'active' : 'inactive'));
        var str = `[${active ? 'Active' : 'Inactive'}]`;
        $('#xedx-active-light').text(str);
        $('#xedx-active-light')[0].style.color = active ? "green" : "red";
        activeFlag = active;
    }

    // Build our UI
    function buildUI() {
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
            log('UI installed.');
        } else {
            log('Unable to find parent div!');
        }

        // Display the options page as needed.
        if (validPointer(document.getElementById('xedx-main-div'))) {
            let url = document.getElementById('xedx-google-key').value;
            if (url != '' && url != null) {
              hideOpts();
            }
        }
    }

    ///////////////////////////////////////////////////////////////////
    // Triggered on page load. Start the show.
    ///////////////////////////////////////////////////////////////////

    function handlePageLoad() {
        
        buildUI();

        // Get data from trade grid, if active.
        const ulRoot = document.querySelector("#trade-container > div.trade-cont > div.user.right > ul > li > ul");
        if (validPointer(ulRoot)) {
            const names = ulRoot.querySelectorAll("div.name.left");
            log('Processing trade items:');
            names.forEach(element => processItem(element));

            // Indicate that we are 'active' - data saved
            indicateActive(true);

            // TBD: decide when to upload.
            uploadDataArray();
        }
        // No items in trade, or not on an active trade page
        else {
            indicateActive(false);
            log('Not on a trade page, or no items in trade!'); // Also hit when I initiate a trade.
        }
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