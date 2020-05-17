// ==UserScript==
// @name         Torn - Busts Stats Collector
// @namespace    http://tampermonkey.net/
// @version      0.6
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
// Or imported as a pure CSS resource.
const xedx_main_div =
  '<div class="t-blue-cont h" id="xedx-main-div">' +
      '<div id="xedx-header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
          'Bust Stat Collector</div>' +
      '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: auto; overflow: auto">' +
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

let savedHashes = [];
(function() {
    'use strict';

    var google_sheets_key = "";
    var spreadsheetURL = '';

    /////////////////////////////////////////////////////////////////
    // Look for an item that has been expanded, and grab it's info
    /////////////////////////////////////////////////////////////////

    var lastHash = 0;
    function trapBustDetails(e) { // Triggered on pressing the 'bust' button
        buildUI(); // If needed...

        let target = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul > li.active");
        let confBust = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul > li.active " +
                                              " > div.confirm-bust > div");
        if (!target) {return;}
        if (!confBust) {return;}

        let time = $(target).find('span > span.time')[0].innerText;

        let level = $(target).find('span > span.level')[0].innerText;
        let at = level.indexOf('('); // When using my Torn Jail Scores script, strip out the score
        if (at > 0) {level = level.slice(0, at-1).trim();}
        let score = (parseJailTimeStr(time) * parseInt(level)).toString();;
        let user = $(target).find('a.user.name > span')[0].title;
        let action = $(confBust).text();

        // Parse the 'action' - can be one of several things,
        //
        // Info - Do you want to try and break Beuthener out of jail? It will cost you 2 nerve yes no
        //   -- may contain 'chance of success is n%'
        // Success - You busted sonofabeach out of jail.
        // Jail - While trying to bust Beuthener out, you were caught and put in jail yourself, maybe that will teach you for trying to break out your friends!
        // Info - "This person is no longer in jail."
        // ??? - failed (??? You failed - search failed? (haven't logged this yet, from memory)
        //
        console.log('Action: "' + action + '"');
        /*
        Action: "Do you want to try and break deadvermin97 out of jail? It will cost you 2 nerve. You determine that the chance of success is 79%.Yes No"
        */
        let chance = 'unknown';
        let laction = 'unknown';
        if (action.indexOf('You busted') == 0) {
            laction = 'Success';
        } else if (action.indexOf('no longer in jail') > 0) {
            laction = 'Info';
        } else if (action.indexOf('While trying to bust') != -1) {
            laction = 'Jail';
        } else if (action.indexOf('failed') != -1) {
            laction = 'Failed';
        } else {
            let search = 'chance of success is ';
            at = action.indexOf(search);
            if (at > 0) {
                let end = action.indexOf('%');
                chance = action.slice(at + search.length, end);
                chance = chance + '%'; // Added the '%' back just for logging
            }
            laction = 'Info';
        }

        //console.log('Action: ' + laction + ' Target: ' + user + ' Level: ' + level + ' Time: ' + time + ' Chance: ' + chance);

        let newItem = getNewItem();
        newItem.action = laction;
        newItem.name = user;
        newItem.level = level;
        newItem.time = time;
        newItem.score = score;
        newItem.chance = chance;

        let jsonData = JSON.stringify(newItem);
        let hash = jsonData.hashCode();

        if (savedHashes.includes(hash)) {
            console.log('Duplicate hash - not submitting.');
            return;
        }
        savedHashes.push(hash);

        //if (hash == lastHash) {return;}
        //lastHash = hash;

        newItem.hash = hash.toString();
        console.log(newItem);

        jsonData = JSON.stringify(newItem);
        submit(jsonData);
    }

    function getNewItem() {
        return {action: 'TBD', name: 'TBD', level: 'TBD', score:'TBD', time:'TBD', chance: 'TBD', hash: 0};
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

     /////////////////////////////////////////////////////////////////////////
    // Helper to parse a time string (33h 14m format), converting to minutes
    /////////////////////////////////////////////////////////////////////////

    function parseJailTimeStr(timeStr) {
        var hour = 0;
        var minute = 0;
        var minuteStart = 0;
        var end = timeStr.indexOf("h");
        if (end != -1) {
            hour = timeStr.slice(0, end);
            minuteStart = end + 2;
        }

        end = timeStr.indexOf("m");
        if (end != -1) {
            minute = timeStr.slice(minuteStart, end);
        }

        var minutes = parseInt(hour) * 60 + parseInt(minute);
        return minutes;
    }

    //////////////////////////////////////////////////////////////////////////////
    // Send to our content service provider (Google App Script, or GAS for short)
    // This POSTS to the entered Google Sheets Content Service provider.
    //////////////////////////////////////////////////////////////////////////////

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
        console.log(GM_info.script.name + ' Posting data to ' + url);
        console.log(GM_info.script.name + ' Data: ', data);
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
                submitCallback(response.responseText);
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

    function submitCallback(responseText) {
        // Check for Google generated errors supplied as HTML, dispay in a new tab.
        // May be for authentication, especially if using Advanced Protection (OAuth2?)
        // The button for 'Confirm Settings' doesn't seem to work in this case...
        if (responseText.indexOf('<!DOCTYPE html>') != -1 || responseText.indexOf('<html>') != -1) {
            var newWindow = window.open();
            newWindow.document.body.innerHTML = responseText;
            return;
        }

        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let result = jsonResp.result;
        let output = GM_info.script.name + ': ' + result;
        if (result.indexOf('Success') == -1) { // What we explicitly return from the GAS on success.
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
})();




