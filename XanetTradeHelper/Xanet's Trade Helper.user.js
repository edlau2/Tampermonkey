// ==UserScript==
// @name         Xanet's Trade Helper
// @namespace    http://tampermonkey.net/
// @version      0.5
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

              // Links for testing (development) - Submit, View, ...
              //'<div id="button-div" style="text-align: center; vertical-align: middle; display: block;">' +
              '<div id="button-div" style="margin-left: 200px; vertical-align: middle; display: block;">' +
                  '<span id="button-span">Development Tools: ' +
                      '<button id="xedx-submit-btn" class="enabled-btn">Submit</button>' +
                      '<button id="xedx-view-btn" class="enabled-btn">View</button>' +
                      //'<button id="xedx-clear-btn" class="enabled-btn">Clear</button>' +
                  '</span>' +
              '</div>' +

              // Checkboxes for various options
              '<div>' +
                  '<input type="checkbox" id="xedx-devmode-opt" name="devmode" style="margin-left: 200px; margin-top: 10px;">' +
                  '<label for="devmode"><span style="margin-left: 15px;">Development Mode</span></label>' +
              '</div>' +
              '<div>' +
                  '<input type="checkbox" id="xedx-logging-opt" name="loggingEnabled" style="margin-left: 200px;">' +
                  '<label for="loggingEnabled"><span style="margin-left: 15px;">Logging Enabled</span></label>' +
              '</div>' +

              '<div>' +
                  '<input type="checkbox" id="xedx-autoupload-opt" name="autoUpload" style="margin-left: 200px; margin-bottom: 10px;">' +
                  '<label for="autoUpload"><span style="margin-left: 15px">Auto-Upload</span></label>' +
              '</div>' +

          '</div>'; // End xedx-content-div

    // Globals - the googleURL from comes from the script - Publish->Deploy as Web App. This allows us to POST
    // to the sheet's script.
    var googleURL = null;

    var hash = location.hash; // ex., '#step=view&ID=6372852'
    //const step = hash.split(/=|#|&/)[2]; // 'view'
    var tradeID = hash.split(/=|#|&/)[4]; // '6372852'
    var dataArray = []; // Data we are uploading per trade
    var activeFlag = false;
    var observer = null; // Mutation observer

    // These can be modified as you see fit.
    // xedxDevMode currently does the following:
    //   Allows the UI to display when travelling.
    //   Suppresses the 'Accept' button from being propogated. (commented out)
    var xedxDevMode = true; // true to enable any special dev mode code.
    var loggingEnabled = true; // true to log to console, false otherwise
    var autoUpload = false;

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
        let title = item.innerText;
        let reversed = reverseString(title); // '\n2x xof der'
        let parsed = reversed.replace(/\x/,'&').split('&');
        let qty = reverseString(parsed[0]);
        let name = reverseString(parsed[1]).trim();
        log('processItem: parsed = "' + parsed + '" name = "' + name + '" qty = "' + qty + '"');

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
                price: "0",           // IN Unit price
                total: "0"            // IN Total price (qty * price)
                };
    }

    // Ensure there is a valid trade ID, if we are not on a page with a hash, this may fail.
    function validateTradeIDs() {
        let badHash = false;
        if (!validPointer(tradeID)) {
            hash = location.hash;
            tradeID = hash.split(/=|#|&/)[4];
        }
        if (!validPointer(tradeID)) {
            log('Error getting trade ID! location: ' + location + ' Hash: ' + hash);
            badHash = true;
        }
        if (!validPointer(dataArray[0].id)) {
            for (let i = 0; i < dataArray.length; i++) {
                dataArray[i].id = badHash ? 'unknown' : tradeID;
            }
        }
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

        // Validate the trade ID
        validateTradeIDs();

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
        log('Displaying dataArray contents: Active ? ' + (activeFlag ? 'YES' : 'NO') + ' Data ? ' + (dataArray.length ? 'YES' : 'NO'));
        let displayText = '';
        if (!activeFlag) {
            displayText = "There is no data to display when inactive!";
        } else if (dataArray.length == 0) {
            displayText = "No data has been collected! Try refreshing the page.";
        } else {
            displayText = 'Items ready to be uploaded for trade:\n';
            for (let i = 0; i < dataArray.length; i++) {
                let item = dataArray[i];
                let text = '\t\n' + item.name + ' x' + item.qty;
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
                break;
            case "xedx-autoupload-opt":
                autoUpload = this.checked;
                GM_setValue("autoUpload", autoUpload);
                break;
            case "xedx-devmode-opt":
                xedxDevMode = this.checked;
                GM_setValue("xedxDevMode", xedxDevMode);
                break;
        }
    }

    // Check checkboxes to default.
    function setDefaultCheckboxes() {
        log('Setting default state of checkboxes.');
        $("#xedx-logging-opt")[0].checked = GM_getValue("loggingEnabled", loggingEnabled);
        $("#xedx-autoupload-opt")[0].checked = GM_getValue("autoUpload", autoUpload);
        $("#xedx-devmode-opt")[0].checked = GM_getValue("xedxDevMode", xedxDevMode);
    }

    // Read saved options values
    function getSavedOptions() {
        log('Getting saved options.');
        loggingEnabled = GM_getValue("loggingEnabled", loggingEnabled);
        autoUpload = GM_getValue("autoUpload", autoUpload);
        xedxDevMode = GM_getValue("xedxDevMode", xedxDevMode);
    }

    // ReaWrited saved options values
    function setSavedOptions() {
        log('Getting saved options.');
        GM_setValue("loggingEnabled", loggingEnabled);
        GM_setValue("autoUpload", autoUpload);
        GM_setValue("xedxDevMode", xedxDevMode);
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

        // Options checkboxes
        $("#xedx-logging-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-autoupload-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-devmode-opt")[0].addEventListener("click", handleOptsClick);

        // Accept button handler
        trapAcceptButton();
    }

    // Add a listener to handle clicking the 'Accept' button
    function trapAcceptButton() {
        let link =
            document.querySelector("#trade-container > div.trade-cancel > div.cancel > div.cancel-btn-wrap > div.btn-wrap.green > span > a");
        log('Trapping "Accept", link = ' + link);
        if (validPointer(link)) {
            if (typeof window.addEventListener != "undefined") {
                link.addEventListener("click",handleAccept,false);
            } else {
                link.attachEvent("onclick",handleAccept);
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

        // Display the options page as needed.
        if (validPointer(document.getElementById('xedx-main-div'))) {
            let url = document.getElementById('xedx-google-key').value;
            if (url != '' && url != null) {
              hideOpts();
            }
        }

        let mainDiv = document.getElementById('xedx-main-div');
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
            log('The hash has changed!');
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

            // TBD: decide when to upload. (moved to Accept button handler)
            // if (autoUpload) {uploadDataArray();}
        }
        // No items in trade, or not on an active trade page TBD - dev mode, maybe display UI anyways?
        else {
            indicateActive(false);
            log('Not on a trade page, or no items in trade!'); // Also hit when I initiate a trade.
            log('ulRoot: ' + ulRoot);
            log('div.user.right: ' + document.querySelector("#trade-container > div.trade-cont > div.user.right"));
            log('div.trade-cont: ' + document.querySelector("#trade-container > div.trade-cont"));
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