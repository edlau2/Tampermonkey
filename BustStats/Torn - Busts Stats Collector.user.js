// ==UserScript==
// @name         Torn - Busts Stats Collector
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Collects busting info in real-time to analyze in a spreadsheet
// @author       xedx [2100735]
// @include      https://www.torn.com/jailview.php
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// This is just easier to read this way, instead of one line.
// Could also have be @required from a separate .js....
const xedx_main_div =
  '<div class="t-blue-cont h" id="xedx-main-div">' +
      '<div id="xedx-header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
          'Bust Stat Collector</div>' +
      '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: auto; overflow: auto">' +
          /*
          '<div style="text-align: center; vertical-align: middle;">' +
              '<span id="button-span">' +
                  '<button id="xedx-submit-btn" class="enabled-btn">Submit</button>' +
                  '<button id="xedx-view-btn" class="enabled-btn">View All</button>' +
                  '<button id="xedx-clear-btn" class="enabled-btn">Clear</button>' +
              '</span>' +
          */
          '</div><div style="text-align: center; vertical-align: middle;>' +
              '<span id="input-span">Google Sheets URL: ' +
                  '<input id="xedx-google-key" type="text" style="font-size: 14px;' + // height: 24px;' +
                  'border-radius: 5px; margin: 0px 10px 10px 10px; border: 1px solid black; width: 450px;">' +
                  '<button id="xedx-save-btn" class="enabled-btn">Save</button>' +
              '</span>' +
          '</div>' +
      '</div>' +
  '</div>';

const enabledBtnStyle = '.enabled-btn {font-size: 14px; ' +
      'height: 24px;' +
      'text-align: center;' +
      'border-radius: 5px;' +
      'margin: 15px 40px;' +
      'background: LightGrey;' +
      'border: 1px solid black;' +
      '}';

const blueBtnStyle = '.blue-btn {font-size: 14px; ' +
      'height: 24px;' +
      'text-align: center;' +
      'border-radius: 5px;' +
      'margin: 15px 40px;' +
      'background: dodgerblue;' +
      'border: 1px solid black;' +
      '}';

const disabledBtnStyle = '.disabled-btn {font-size: 14px; ' +
      'height: 24px;' +
      'text-align: center;' +
      'border-radius: 5px;' +
      'margin: 15px 40px;' +
      'background: white;' +
      'border: 1px solid black;' +
      '}';

(function() {
    'use strict';

    var google_sheets_key = "";
    //var profileId = "";
    var spreadsheetURL = '';
        //'https://script.google.com/macros/s/AKfycbxqfJ2FZcCvPvzvvJO-AupTq-mzTyX819589iBg-OYhbLKy_LY/exec';

    /////////////////////////////////////////////////////////////////
    // Look for an item that has been expanded, and grab it's info
    /////////////////////////////////////////////////////////////////

    //var lastHash = 0;
    function trapBustDetails(e) { // Triggered on pressing the 'bust' button
        buildUI(); // If needed...

        let target = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul > li.active");
        let confBust = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul > li.active " +
                                              " > div.confirm-bust > div");
        if (!target) {return;}
        if (!confBust) {return;}

        //$(targetNode).unbind('DOMNodeInserted');

        let time = $(target).find('span > span.time')[0].innerText;
        let level = $(target).find('span > span.level')[0].innerText;
        let user = $(target).find('a.user.name > span')[0].title;
        let action = $(confBust).text();

        // Look for 'chance of success is', then move up to +2 past that for %number...
        let search = 'chance of success is ';
        let at = action.indexOf(search);
        let chance = 'unknown';
        if (at > 0) {
            let end = action.indexOf('%');
            chance = action.slice(at + search.length, end);
            chance = chance + '%'; // Don't send this to sheets, just for temporary logging...
        }

        //console.log('Action: "' + action + '"');
        console.log('Target: ' + user + ' Level: ' + level + ' Time: ' + time + ' Chance: ' + chance);

        // {action: 'info', name: 'TBD', level: 'TBD', time: 'TBD', chance: 'TBD', hash: 0};
        let newItem = getNewItem();
        newItem.action = 'Info';
        newItem.name = user;
        newItem.level = level;
        newItem.time = time;
        newItem.chance = chance;

        let jsonData = JSON.stringify(newItem);
        let hash = jsonData.hashCode();

        //console.log('Hashcode for ' + newItem.name + ': ' + hash);
        //console.log('Last hashcode: ' + lastHash);
        //if (hash == lastHash) {return;}
        //lastHash = hash;
        newItem.hash = hash.toString();
        console.log(newItem);

        jsonData = JSON.stringify(newItem);
        submit(jsonData);

        // Rebind
        /*
        $(targetNode).bind('DOMNodeInserted', function(e) {
            console.log(e.type + ' ==> trapBustDetails');
            trapBustDetails(e);
        });
        */
    }

    /////////////////////////////////////////////////////////////////
    // Functions to pick apart various nodes to get info we want
    /////////////////////////////////////////////////////////////////

    // Note: 'action' is 'info' (just info) or 'result', once a bust has been attempted.
    function getNewItem() {
        return {action: 'info', name: 'TBD', level: 'TBD', time: 'TBD', chance: 'TBD', hash: 0};
    }

    /////////////////////////////////////////////////////////////////
    // Initializing the UI - display, install handlers, etc.
    /////////////////////////////////////////////////////////////////

    function buildUI() {

        GM_addStyle(enabledBtnStyle);
        GM_addStyle(disabledBtnStyle);
        GM_addStyle(blueBtnStyle);

        if (validPointer(document.getElementById('xedx-main-div'))) {return;}    // Do only once
        let parentDiv = $(targetNode).find('div.content-wrapper > div.tutorial-cont').get();
        let nextDiv = $(targetNode).find('div.content-wrapper > div.msg-info-wrap').get();

        if (!validPointer(parentDiv) || parentDiv.length < 1) {return;}          // Wait until enough is loaded
        if (!validPointer(nextDiv) || parentDiv.length < 1) {nextDiv;}           // Wait until enough is loaded

        $(xedx_main_div).insertAfter(parentDiv);

        let myButton = document.getElementById('xedx-save-btn');
        myButton.addEventListener('click',function () {
            saveSheetsUrl();
        });

        let urlInput = document.getElementById('xedx-google-key');
        let value = GM_getValue('xedx-google-key');
        if (typeof value != 'undefined' && value != null && value != '') {
            urlInput.value = value;
        }
    }

    /////////////////////////////////////////////////////////////////
    // Send to our content service provider
    //
    // This POSTS to the entered Google Sheets Content Service provider.
    // Response TBD...
    /////////////////////////////////////////////////////////////////

    function submit(data) {
        let url = document.getElementById('xedx-google-key').value;
        if (url == '') {
            url = GM_getValue('xedx-google-key');
            if (url == '' || typeof url == 'undefined') {
                alert('You must enter the Google Sheets URL!');
                return;
            }
        }
        saveSheetsUrl(url);

        //let data = JSON.stringify(detectedItemsArray);
        console.log(GM_info.script.name + ' Posting data to ' + url);
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
                submitFunctionCB(response.responseText);
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

    // Callback for above...
    function submitFunctionCB(responseText) {
        if (responseText.indexOf('<!DOCTYPE html>') != -1) {
            var newWindow = window.open();
            newWindow.document.body.innerHTML = responseText;
            return;
        }

        let jsonResp = JSON.parse(responseText); // Only needed is response is expected as stringified JSON
        if (jsonResp.error) {return handleError(responseText);}

        let result = jsonResp.result;
        let output = GM_info.script.name + ': ' + result;
        if (result.indexOf('Success') == -1) {
            output = GM_info.script.name + ': An error has occurred!\nDetails:\n\n' + responseText;
        }

        console.log(output);
    }

    function handleScriptError(response) {
        let errorText = GM_info.script.name + ': An error has occurred submitting data:\n\n' +
            response.error;

        console.log(errorText);
        alert(errorText + '\n\nPress OK to continue.');
    }

    /////////////////////////////////////////////////////////////////////////
    // Save the URL to our Google Sheets script (content service provider).
    // Could do inline.
    /////////////////////////////////////////////////////////////////////////

    function saveSheetsUrl(useUrl=null) {
        let url = useUrl;
        if (url == null) {
            url = document.getElementById('xedx-google-key').value;
        }
        if (url == '' || url == null) {
            alert('You must enter the Google Sheets URL!');
            return;
        }
        spreadsheetURL = url;
        GM_setValue('xedx-google-key', url);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    // Monitor for mutations - when 'Bust' is pressed, for example :-)
    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        console.log('mutation observed ==> trapBustDetails');
        trapBustDetails();
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    // Wait for the DOM to be loaded, need the 'user-wrapper'
    // Prob don't need this on top of the mutation observer...
    /*
    window.onload = function () {
        console.log('onLoad ==> buildUI');
        buildUI();
    };
    */

})();




