// ==UserScript==
// @name         Torn Revive Skill Tracker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Records accepted trades and item values
// @author       xedx [2100735]
// @include      https://www.torn.com/hospitalview.php
// @blah      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      file://///Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers.js
// @connect      *.torncity.com
// @connect      *.torn.com
// @connect      api.torn.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Main <div> for the minimalist UI displayed at the top of
    // the Hospital page, so we know we're running and can show
    // some simple development tools, for debugging.
    //////////////////////////////////////////////////////////////////////

    const xedx_main_div =
          '<div class="t-blue-cont h" id="xedx-main-div">' +

              // Header and title.
              '<div id="xedx-header-div" class="title main-title title-black top-round active" role="table" aria-level="5">' +
                  "<span>Revive Skill Tracker</span>" +
                  '<span id="current-rs" style="margin-left: 20px;"></span>' +

                  // This displays the [hide] | [show] link
                  '<div class="right" style="margin-right: 10px">' +
                      '<a role="button" id="xedx-show-hide-btn" class="t-blue show-hide">[hide]</a>' +
                  '</div>' +
              '</div>' +

              '<div id="xedx-2nd-header-div" class="title main-title title-black top-round bottom-round active" role="table" aria-level="5">' +
                  '<span id="xedx-status-line" style="display:hide; color: green; float: right; margin-right: 10px;">Please Wait...</span>' +
              '</div>' +

          // This is the content that we want to hide when '[hide] | [show]' is clicked.
          '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: auto; overflow: auto display: none";>' +

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
                      '<button id="xedx-upd-btn" class="enabled-btn">Update RS</button>' +
                  '</span>' +
              '</div>' +
          '</div>'; // End xedx-content-div

    //////////////////////////////////////////////////////////////////////
    // Global variables
    //////////////////////////////////////////////////////////////////////

    // The googleURL from comes from the script - Publish->Deploy as Web App. This allows us to POST
    // to the sheet's script.
    var googleURL = null;

    debugLoggingEnabled = true; // Define log output, used by Torn-JS-Helpers
    loggingEnabled = true;      // 'log()' and 'debug()' functions.

    var opt_suppressRevive = false; // If true, presing 'yes' submits a fake revive for testing. Does not actually try to revive
    var opt_debugAlerts = true; // If true, display periodic notices of upload progress (for dignostics)

    var currentReviveSkill = 0;
    var activeDataItem = {reviver_id: '',
                          target: '',
                          time: '',
                          level: '',
                          chance: '',
                          cost: '',
                          success: 'false',
                          rs_start: '0',
                          rs_end: '0'
                         };

    //////////////////////////////////////////////////////////////////////
    // Main processing
    //////////////////////////////////////////////////////////////////////

    // Step 1: Start things off, handle page loading.
    function handlePageLoad() {
        // Add a listener to be triggered when we scroll through the pages
        window.addEventListener('hashchange', function() {
            debug('Hash change detected: ' + location.hash + ' State: ' + document.readyState);
            processUserList();
        }, false);

        queryUserId();
        queryReviveSkill();
    }

    // Step 2: Query skills function (async, could use promises)
    function queryReviveSkill(callback=null, param=null) {
        debug('queryReviveSkill');
        xedx_TornUserQuery(null, 'skills', callback ? callback : skillsQueryCB, param);
    }

    // Callback to parse returned JSON for skills query
    function skillsQueryCB(responseText, uiOnly=false) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        currentReviveSkill = jsonResp.reviving;
        debug('Current Revive Skill: ' + currentReviveSkill);
        if (uiOnly == true) {
            setCurrentRS(currentReviveSkill);
            return;
        }
        buildUI();
        setCurrentRS(currentReviveSkill);
        processUserList();
    }

    // Step 3: Once the page is loaded and we have our own RS, see who's in the list.
    // We grab all the available people to be revived, and set handlers to
    // fire events when clicked.
    function processUserList() {
        debug('processUserList');

        // We want to trigger on the 'revive' icon click.
        var mainWrapperSel = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper.hospital-list-wrapper");
        var mainLIList = mainWrapperSel.querySelectorAll('ul > li'); // List of top-level LI's
        log('Found ' + mainLIList.length +' people in the hosp.');

        if (mainLIList.length == 1) {
            debug('cough, cough...(come back later)');
            /*hack*/ setTimeout(processUserList, 50);
            return;
        }

        // Cull out the non-reviveable ones. Save a list of the "<a class="revive " href="..." links.
        let validRevList = [];
        let foundIcons = 0;
        for (let i = 0; i < mainLIList.length; i++) {
            let childLi = mainLIList[i];
            let revIcon = childLi.getElementsByClassName('revive')[0];
            if (validPointer(revIcon)) {
                foundIcons++;
                if (!revIcon.classList.contains('reviveNotAvailable')) {
                    validRevList.push(revIcon);
                    myAddlickHandler(revIcon, handleRevive);
                }
            }
        }
        debug('Found ' + foundIcons + ' total icons, ' + validRevList.length + ' available icons');
        // Handlers will do the rest of the work.
    }

    // Step 4: Function triggered when the 'revive' icon is clicked. The choices 'Yes/No' become available.
    var config = { attributes: true, childList: true, subtree: true };
    function handleRevive() {
        var parent = this.parentNode; // Should be the <li>

        // Wait for next <div> to pop up, via a mutation observer
        let targetNode = parent.children[5]; // 'confirm-revive'
        let callback = function(mutationsList, observer) {
            handleReviveOpts(observer, parent);
        };
        let observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    // Step 5: Function called async when the <div> under the revive icon is available
    function handleReviveOpts(observer, parent) {
        log('handleReviveOpts: ' + parent);
        var confirmRevive = null;
        var ajaxAction = null;
        if (parent.children.length < 5) {return;} // Still waiting for DOM...
        else {
            confirmRevive = parent.children[5]; // 'confirm-revive'
            ajaxAction = confirmRevive.children[0]; // class 'ajax-action', firstChild
        }

        if (ajaxAction.children.length <= 1) {return;}  // Still waiting for DOM...
        else {
            observer.disconnect();
            myAddlickHandler(ajaxAction.children[2], handleReviveYesClicked); // Child 2 is the yes-action link
        }
    }

    // Step 6: Handler when 'YES' is clicked to revive. This is when we save the data we'll
    // send up after getting a result.
    function handleReviveYesClicked(ev) {
        log('handleReviveYeslicked: ' + this); // 'this' is the 'yes' link, so parentNode is 'ajax-action'

        var ajaxAction = this.parentNode; // Class = 'ajax-action'
        var confirmRevive = ajaxAction.parentNode; // 'confirm-revive'
        var parent = confirmRevive.parentNode; // <li>

        var infoTimeSpan = parent.querySelector('span > span.time');
        var infoLevelSpan = parent.querySelector('span > span.level');
        var nameSpan = parent.querySelector("a.user.name > span");

        activeDataItem.target = nameSpan.getAttribute('title');
        activeDataItem.time = infoTimeSpan.innerText;
        activeDataItem.level = infoLevelSpan.innerText;
        activeDataItem.chance = ajaxAction.children[0].innerText;
        activeDataItem.cost = ajaxAction.children[1].innerText;
        activeDataItem.rs_start = currentReviveSkill;

        // Temporary debugging
        log('Yes pressed for ' + activeDataItem.target + ', ' + activeDataItem.chance + ' chance of success.');

        if (opt_suppressRevive) {
            log('Trying to swallow the event!');
            ev.preventDefault();
            ev.stopPropagation();
        }

        /* HACK */
        if (opt_suppressRevive) {
            setTimeout(function() {waitOnYesResponse(parent);}, 2000);
        } else {
            setTimeout(function() {waitOnYesResponse(parent);}, 50);
        }
    }

    // Intermediary step - wait, if needed, for result before
    // posting a query for new RS.
    // If we suppressed event propogation, above, this will
    // never finish!
    function waitOnYesResponse(parent) {
        log('waitOnYesResponse');

        if (!opt_suppressRevive) {
            var confirmRevive = parent.children[5];
            var ajaxAction = confirmRevive.children[0];
            if (!validPointer(ajaxAction)) {
                setTimeout(function(){waitOnYesResponse(parent);}, 50);
                return;
            }

            var msg = ajaxAction.innerText;
            if (msg.indexOf('successfully') == -1 && msg.indexOf('failed') == -1) {
                setTimeout(function(){waitOnYesResponse(parent);}, 50);
                return;
            }

            if (msg.indexOf('successfully') > 0) {activeDataItem.success = 'true';}
            log('waitOnYesResponse: ' + msg);
        }

        queryReviveSkill(processYesResponse, parent);
    }

    // Step 7: Called when we have the result of
    // the Torn API query for new RS.
    function processYesResponse(responseText, ID, param) {
        // responseText is obvious, ID is null, param is parent <li>
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        if (opt_suppressRevive) {
            activeDataItem.success = 'false'; // Doesn't really matter
        }

        // On Success, check 'reviving' - if the same, re-submit until
        // it changes. Database may not have updated.
        if (activeDataItem.success == 'true' || activeDataItem.success == 'TRUE') {
            if (currentReviveSkill == jsonResp.reviving) {
                queryReviveSkill(processYesResponse, parent);
                log('Player DB not yet updated - querying RS again');
                return;
            }
        }
        currentReviveSkill = jsonResp.reviving;
        activeDataItem.rs_end = currentReviveSkill;

        debug('processYesResponse: ' + JSON.stringify(activeDataItem));

        // Upload the data, and we're outta here.

        // Temp: before submitting, show an alert. Suppress propogation.
        if (opt_debugAlerts) {
            viewDataArray();
        }
        uploadDataArray();
    }

    //////////////////////////////////////////////////////////////////////
    // Connection to the Sheets API - upload our data.
    // Eventually, make a wrapper for this in Torn-JS-Helpers...
    //////////////////////////////////////////////////////////////////////

    // Perform an array deep copy. Not *really* needed here as of now.
    function deepCopy(copyArray) {
        return JSON.parse(JSON.stringify(copyArray));
    }

    // Upload data to the sheet
    function uploadDataArray(altArray = null) {
        let url = document.getElementById('xedx-google-key').value;
        if (url == '') {
            url = GM_getValue('xedx-google-key');
            if (url == '' || typeof url == 'undefined') {
                alert('You must enter the Google Sheets URL!');
                return;
            }
        }

        // For testing, can use 'altArray' - the testArray defined above.
        let useArray = altArray ? deepCopy(altArray) : deepCopy(activeDataItem);
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

        log('Details: "' + details + '"');
    }

    //////////////////////////////////////////////////////////////////////
    // Sheet upload result processing
    //////////////////////////////////////////////////////////////////////

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

        hideStatus();
        log(errorText);
        alert(errorText + '\n\nPress OK to continue.');
    }

    // Handle the response on success
    function processResponse(resp) {
        hideStatus();
        log('processResponse: ' + resp);

        // TBD...
        if (true) {
            let output = 'Success! Response:\n\n' + resp;
            if (opt_debugAlerts) { // Debugging
                alert(output);
            }
            let newOutput = parseResponse(resp);
            if (newOutput != "") { // TBD...
                alert(newOutput);
            }
        }
    }

    // Parse the response into legible text (TBD...)
    function parseResponse(resp) {
        hideStatus();
        return '';
    }

    //////////////////////////////////////////////////////////////////////
    // UI stuff, helpers for the most part. Used for debugging, mostly.
    //////////////////////////////////////////////////////////////////////

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

    // View contents of data array to be uploaded, called via the 'View' link
    // Mostly a debugging aid.
    function viewDataArray() {
        log('viewDataArray');
        let alertText =
            'Reviver ID: ' + activeDataItem.reviver_id +
            '\nTarget: ' + activeDataItem.target +
            '\nTime: ' + activeDataItem.time +
            '\nLevel: ' + activeDataItem.level +
            '\nChance: ' + activeDataItem.chance +
            '\nCost: ' + activeDataItem.cost +
            '\nSuccess: ' + activeDataItem.success +
            '\nRS Start: ' + activeDataItem.rs_start +
            '\nRS End: ' + activeDataItem.rs_end;

        alert(alertText);
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

        // Show/Hide options link
        const savedHide = GM_getValue('xedxHideOpts', false);
        hideOpts(savedHide);
        $('#xedx-show-hide-btn').on('click', function () {
            const hide = $('#xedx-show-hide-btn').text() == '[hide]';
            GM_setValue('xedxHideOpts', hide);
            hideOpts(hide);
        });

        // Submit data to Google Sheets (Submit link)
        myButton = document.getElementById('xedx-submit-btn');
        myButton.addEventListener('click',function () {
            hideStatus(false);
            log('SUBMIT clicked');
            uploadDataArray();
        });

        // View data ready to be uploaded - View link
        myButton = document.getElementById('xedx-view-btn');
        myButton.addEventListener('click',function () {
            log('VIEW clicked');
            viewDataArray();
        });

        // Update the current RS in the code and the UI
        myButton = document.getElementById('xedx-upd-btn');
        myButton.addEventListener('click',function () {
            log('UPDATE clicked');
            queryReviveSkill(skillsQueryCB, true);
        });

    }

    // Helper to add a 'click' handler
    function myAddlickHandler(target, handler) {
        if (typeof window.addEventListener != "undefined") {
           target.addEventListener("click", handler, false);
        } else {
           target.attachEvent("onclick", handler);
        }
    }

    // Show/hide status line
    function hideStatus(hide=true) {
        log('Hiding status line: ' + (hide? 'true' : 'false'));
        $('#xedx-status-line')[0].style.display = hide ? 'none' : 'block';
    }

    // Display current RS
    function setCurrentRS(rs) {
        if (validPointer(document.getElementById('xedx-main-div'))) {
            //$(xedx_main_div).innerText = "Revive Skill: " + rs;
            let rsSpan = document.querySelector("#current-rs");
            rsSpan.innerText = "Revive Skill: " + rs;
            //$('#current-rs').innerText = "Revive Skill: " + rs;
        }
    }

    // Build our UI
    function buildUI() {
        log('buildUI');
        if (validPointer(document.getElementById('xedx-main-div'))) {
            log('UI already installed!');
            return;
        }
        let parentDiv = document.querySelector("#mainContainer > div.content-wrapper > div.msg-info-wrap");
        $(xedx_main_div).insertAfter(parentDiv);

        let urlInput = document.getElementById('xedx-google-key');
        let value = GM_getValue('xedx-google-key');
        if (typeof value != 'undefined' && value != null && value != '') {
            urlInput.value = value;
        }

        setCurrentRS(currentReviveSkill);
        installHandlers();
        hideStatus();
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    // Full URL we trigger on https://www.torn.com/trade.php*
    logScriptStart();
    validateApiKey();

    // Note: this is async, hope it returns before we need it.
    queryUserId(function(id){
        activeDataItem.reviver_id = id.toString();
        log("User's ID: " + id);
     });

    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoad);
    } else {
        handlePageLoad();
    }

})();