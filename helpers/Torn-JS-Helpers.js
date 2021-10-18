// ==UserScript==
// @exclude     *
// @namespace   https://github.com/edlau2

// ==UserLibrary==
// @name        Torn-JS-Helpers
// @description Commonly used functions in my Torn scripts.
// @author      xedx [2100735]
// @updateURL   https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect     api.torn.com
// @connect     www.tornstats.com
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @version     2.22
// @license     MIT
// ==/UserLibrary==

// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////////
// Validate an API key and prompt if misssing
///////////////////////////////////////////////////////////////////////////////////

var api_key = GM_getValue('gm_api_key');
function validateApiKey() {
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt(GM_info.script.name + "Says:\n\nPlease enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }
}

function getApiKey() {
    return api_key;
}

///////////////////////////////////////////////////////////////////////////////////
// Get the user's ID
///////////////////////////////////////////////////////////////////////////////////

function queryUserId(callback) {
    xedx_TornUserQuery(null, 'basic', function(responseText, id, callback) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        try {
          return callback(jsonResp.player_id);
        } catch (e) {
          debugger;
        }
    }, callback);
}

///////////////////////////////////////////////////////////////////////////////////
// Miscellaneous utilities
///////////////////////////////////////////////////////////////////////////////////

// Just spit out the name of the script at startup
function logScriptStart() {
    console.log(GM_info.script.name + ' version ' + GM_info.script.version + ' script started!');
}

function logScriptComplete() {
    console.log(GM_info.script.name + ' script complete!');
}

// Get rid of this - returns hosting script version, not this library's version
function getHelperVersion() {
    console.log('**** Please notify xedx [2100735], deprecated function call - ' +
                '"getHelperVersion()" in script "' + GM_info.script.name +'"');
    return '0.2';
}

// Store latest version info and notify if updated.
var silentUpdates = false;
function versionCheck() {
    let curr_ver = GM_getValue('curr_ver', GM_info.script.version);
    if  (Number(GM_info.script.version) > Number(curr_ver)) {
        let msg = 'Your version of ' + GM_info.script.name + ' has been updated to version ' + GM_info.script.version +
              ' ! Press OK to continue.';
        if (!silentUpdates) {alert(msg);}
        console.log(msg);
    }
    GM_setValue('curr_ver', GM_info.script.version);
}

// Simple logging helpers. Log regular events or debug-only events.
// Set these two vars as appropriate in your script.
var debugLoggingEnabled = true;
var loggingEnabled = true;

function log(data) {
    if (loggingEnabled) {
        console.log(GM_info.script.name + ': ' + data);
    }
}

function debug(data) {
    if (debugLoggingEnabled) {
        console.log(GM_info.script.name + ': ' + data);
    }
}

// All arguments are optional:
//   duration of the tone in milliseconds. Default is 500
//   frequency of the tone in hertz. default is 440
//   volume of the tone. Default is 1, off is 0.
//   type of tone. Possible values are sine, square, sawtooth, triangle, and custom. Default is sine.
//   callback to use on end of tone
var audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
function beep(duration, frequency, volume, type, callback) {
    log('Beeping speaker!');
    var oscillator = audioCtx.createOscillator();
    var gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (volume){gainNode.gain.value = volume;}
    if (frequency){oscillator.frequency.value = frequency;}
    if (type){oscillator.type = type;}
    if (callback){oscillator.onended = callback;}

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + ((duration || 500) / 1000));
};

// Date formatting 'constants'
const date_formats = ["YYYY-MM-DD",
                      "YYYY-MONTH-DD DDD",
                      "YYYY-MM-DD HH:MM:SS",
                      "DAY MONTH DD YYYY HH:MM:SS",
                      "FULL (DAY MONTH DD YYYY HH:MM:SS TZ)"];

const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

// HTML constants
const CRLF = '<br/>';
const TAB = '&emsp;';
const separator = '<hr class = "delimiter-999 m-top10 m-bottom10">';


// Convert a date object into a readable format
// Note: use 'Utilities.formatDate' instead.
function dateConverter(dateobj, format){
    var year = dateobj.getFullYear();
    var month= ("0" + (dateobj.getMonth()+1)).slice(-2);
    var date = ("0" + dateobj.getDate()).slice(-2);
    var hours = ("0" + dateobj.getHours()).slice(-2);
    var minutes = ("0" + dateobj.getMinutes()).slice(-2);
    var seconds = ("0" + dateobj.getSeconds()).slice(-2);
    var day = dateobj.getDay();
    var converted_date = dateobj.toString();

    switch(format){
        case "YYYY-MM-DD":
            converted_date = year + "-" + month + "-" + date;
            break;
        case "YYYY-MONTH-DD DDD":
            converted_date = year + "-" + months[parseInt(month)-1] + "-" + date + " " + days[parseInt(day)];
            break;
        case "YYYY-MM-DD HH:MM:SS":
            converted_date = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
            break;
        case "DAY MONTH DD YYYY HH:MM:SS":
            converted_date = days[parseInt(day)] + " " + months[parseInt(month)-1] + " " + date + " " + year + " " +
                hours + ":" + minutes + ":" + seconds;
            break;
        case "FULL (DAY MONTH DD YYYY HH:MM:SS TZ)":
            converted_date = dateobj.toString();
            break;
    }

    return converted_date;
}

// Check if a var is numeric
function isaNumber(x)
{
    /*
    var regex=/^[0-9]+$/;
    if (!validPointer) {return false;}
    if (x.match(regex)) { // Will crash on undefined, null, etc. The above checks for that
        return true;
    }
    return false;
    */
    return !isNaN(x);
}

// Format a number as currency.
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

// Function used to get time formatted for the running averages sheet
// Formatted as: mm/dd/yyyy 00:00:00 TCT
// This is stolenn from one of my Google Sheets App Scripts, never
// tried in pure Javascript. This is in TCT, which is the same as UTC/GMT
function timenow() {
  return Utilities.formatDate(new Date(), "GMT", "MM/dd/yyy HH:mm:ss");
}


// Add commas at thousand place - works with decimal numbers
function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

// Check to see if a pointer is valid
// Note: "val == undefined" is the same as the coercion, "val == null", and 'val'.
function validPointer(val, dbg = false) {
    if (typeof val !== undefined && val) {return true;}
    if (dbg) {debugger;}
    return false;
    /*
    if (val == 'undefined' || typeof val == 'undefined' || val == null) {
        if (dbg) {
            debugger;
        }
        return false;
    }
    return true;
    */
}

//////////////////////////////////////////////////////////////////
// Function to create a hash for a string. Returns a positive
// 32 bit int.
//////////////////////////////////////////////////////////////////

String.prototype.hashCode = function(){
    var hash = 0;
    for (var i = 0; i < this.length; i++) {
        var character = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

//
// Wildcard version of getElementsByClassName()
// Note: easier to use $(selector).find(...); instead.
//
// Only used by 'Torn Racing - Car Order' and 'Torn Gym Gains'
function myGetElementsByClassName2(anode, className) {
    var elems = anode.getElementsByTagName("*");
    var matches = [];
    for (var i=0, m=elems.length; i<m; i++) {
        if (validPointer(elems[i].className) && elems[i].className.indexOf(className) != -1) {
            matches.push(elems[i]);
        }
    }

    return matches;
}

// Backwards compatibility:
function myGetElementsByClassName(anode, className) {
    return myGetElementsByClassName2(anode, className);
}

// The URL expected is in the form "https://www.torn.com/profiles.php?XID=1162022#/"
// More accurately, "XID=" must be present :-)
// We need the XID; the trailing '#' may not be present.
function xidFromProfileURL(URL) {
    var n = URL.indexOf('XID='); // Find the 'XID=' token
    if (n == -1) {return null;}
    var n2 = URL.indexOf('#'); // Find the '#' sign (removed in some patch, may not exist)
    var ID = 0;
    if (n2 != -1) {
        ID = URL.slice(n+4, n2); // Extract just the ID from the URL, between the '=' and '#'
    } else {
        ID = URL.slice(n+4);
    }
    return ID;
}

// Another version of above, except search for 'userid='
// Should combine these...
function useridFromProfileURL(URL) {
    var n = URL.indexOf('userId='); // Find the 'userId=' token
    if (n == -1) {return null;}
    var n2 = URL.indexOf('#'); // Find the '#' sign (removed in some patch, may not exist)
    var ID = 0;
    if (n2 != -1) {
        ID = URL.slice(n+7, n2); // Extract just the ID from the URL, between the '=' and '#'
    } else {
        ID = URL.slice(n+7);
    }
    return ID;
}

// Return the numeric equivalent of the full rank returned by the 'profie' selection
// Torn 'user' API query.
function numericRankFromFullRank(fullRank) {
    let parts = fullRank.split(' ');
    let rank = parts[0];
    if (parts.length >= 3 &&
        (rank == 'Absolute' || rank == 'Below' || rank == 'Above' || rank == 'Highly')) {
        rank = rank + ' ' + parts[1];
    }

    // Lookup name in our table (array) to convert to number
    let numeric_rank = 0;
    for (let i = 0; i < ranks.length; i++) {
        if (rank == ranks[i]) {
            numeric_rank = i;
            break;
        }
    }

    return numeric_rank;
}

// Add the style(s) I use for tool-tips
// tooltip3 is the correct one, with an opaque gray background
function addToolTipStyle() {
    GM_addStyle(".tooltip2 {" +
              "radius: 4px !important;" +
              "background-color: #ddd !important;" +
              "padding: 5px 20px;" +
              "border: 2px solid white;" +
              "border-radius: 10px;" +
              "width: 300px;" +
              "margin: 50px;" +
              "text-align: left;" +
              "font: bold 14px ;" +
              "font-stretch: condensed;" +
              "text-decoration: none;" +
              "}");

    GM_addStyle(".tooltip3 {" +
              "radius: 4px !important;" +
              "background-color: #000000 !important;" +
              "filter: alpha(opacity=80);" +
              "opacity: 0.80;" +
              "padding: 5px 20px;" +
              "border: 2px solid gray;" +
              "border-radius: 10px;" +
              "width: 300px;" +
              "margin: 50px;" +
              "text-align: left;" +
              "font: bold 14px ;" +
              "font-stretch: condensed;" +
              "text-decoration: none;" +
              "color: #FFF;" +
              "font-size: 1em;" +
              "}");
}

// Adds a tool tip to a DIV
function displayToolTip(div, text) {
    $(document).ready(function() {
        $(div.parentNode).attr("title", "original");
        $(div.parentNode).tooltip({
            content: text,
            classes: {
                "ui-tooltip": "tooltip3"
            }
        });
    })
}

//////////////////////////////////////////////////////////////////////
// Map textual rank names to numeric, via array index
//////////////////////////////////////////////////////////////////////

var ranks = ['Absolute beginner',
             'Beginner',
             'Inexperienced',
             'Rookie',
             'Novice',
             'Below average',
             'Average',
             'Reasonable',
             'Above average',
             'Competent',
             'Highly competent',
             'Veteran',
             'Distinguished',
             'Highly distinguished',
             'Professional',
             'Star',
             'Master',
             'Outstanding',
             'Celebrity',
             'Supreme',
             'Idolized',
             'Champion',
             'Heroic',
             'Legendary',
             'Elite',
             'Invincible'];

/////////////////////////////////////////////////////////////////////////////////
// Functions to query the Torn API
/////////////////////////////////////////////////////////////////////////////////

//
// Callback should have the following signature: callback(responseText, ID, (optional)param)
//
function xedx_TornUserQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('user', ID, selection, callback, param);
}

function xedx_TornPropertyQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('property', ID, selection, callback, param);
}

function xedx_TornFactionQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('faction', ID, selection, callback, param);
}

function xedx_TornCompanyQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('company', ID, selection, callback, param);
}

function xedx_TornMarketQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('market', ID, selection, callback, param);
}

function xedx_TornTornQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('torn', ID, selection, callback, param);
}

function xedx_TornGenericQuery(section, ID, selection, callback, param=null) {
    if (ID == null) ID = '';
    let url = "https://api.torn.com/" + section + "/" + ID + "?selections=" + selection + "&key=" + api_key;
    console.debug('(JS-Helper) ' + GM_info.script.name + ' Querying ' + section + ':' + selection);
    let details = GM_xmlhttpRequest({
        method:"POST",
        url:url,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        onload: function(response) {
            callback(response.responseText, ID, param);
        },
        onerror: function(response) {
            handleSysError(response);
        },
        onabort: function(response) {
            console.debug('(JS-Helper) ' + GM_info.script.name + ': onabort');
            handleSysError(response.responseText);
        },
        ontimeout: function(response) {
            console.debug('(JS-Helper) ' + GM_info.script.name +': ontimeout');
            handleSysError(response.responseText);
        }
    });
}

//////////////////////////////////////////////////////////////////
// Function to do a TornStats bat stats spy
//////////////////////////////////////////////////////////////////

function xedx_TornStatsSpy(ID, callback, param=null) {
    if (!ID) ID = '';
    let url = 'https://www.tornstats.com/api/v1/' + api_key + '/spy/' + ID;
    console.debug('(JS-Helper) ' + GM_info.script.name + ' Spying ' + ID + ' via TornStats');
    console.debug('(JS-Helper) ' + GM_info.script.name + 'url: ' + url);
    GM_xmlhttpRequest({
        method:"GET",
        url:url,
        headers: {
            'Accept': '*/*'
        },
        onload: function(response) {
            console.log('**** Response: ', response.responseText);
            callback(response.responseText, ID, param);
        },
        onerror: function(response) {
            console.debug('(JS-Helper) ' + GM_info.script.name + ': onerror');
            handleSysError(response.responseText);
        },
        onabort: function(response) {
            console.debug('(JS-Helper) ' + GM_info.script.name + ': onabort');
            handleSysError(response.responseText);
        },
        ontimeout: function(response) {
            console.debug('(JS-Helper) ' + GM_info.script.name +': ontimeout');
            handleSysError(response.responseText);
        }
    });
}

//////////////////////////////////////////////////////////////////
// Function to create a hash for a string. Returns a positive
// 32 bit int.
//////////////////////////////////////////////////////////////////

String.prototype.hashCode = function(){
    var hash = 0;
    for (var i = 0; i < this.length; i++) {
        var character = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

//////////////////////////////////////////////////////////////////////
// ************************ Travel Related ***************************
//////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////
// Functions to query the Torn API for travel stats.
//
// Use this if the @include or @match is https://www.torn.com/index.php
// It checks to see if travelling, which refreshes the page constantly,
// so the 'main' enrty point, if triggered using an observer, will
// constantly get called. Instead, call this function:
//
// checkTravelling(callback, observer, targetNode, config);
// where 'callback' is the actual function you'd normally call.
//
// observer, targetNode, and config will be used as follows:
// observer.observe(targetNode, config);
//
// The code either executes the callback immediately, if not
// travelling, with the observer disconnected, and reconnects after
// the call.
//
// If travelling, the observer is reconnected on landing, and
// hence this will be called again.
//
// TBD: This could be re-written to use the new simplified travel funcs, from below.
//
//////////////////////////////////////////////////////////////////////

function checkTravelling(callback, observer, targetNode, config) {
    var cbStruct = {callback:callback, observer:observer,
                    targetNode:targetNode, config:config};
    xedx_TornUserQuery('', 'travel', xedx_travelCB, cbStruct);
}

function xedx_travelCB(responseText, ID, cbStruct) {
    let jsonResp = JSON.parse(responseText);
    if (jsonResp.error) {return handleError(responseText);}

    let stats = jsonResp.travel;
    let callback = cbStruct.callback;
    let observer = cbStruct.observer;
    let targetNode = cbStruct.targetNode;
    let config = cbStruct.config;
    observer.disconnect();
    if (stats.time_left == 0 && stats.destination == 'Torn') {
        if (callback != null) {
            callback(); // Calls whatever work needs to be done, with observer disconnected
            observer.observe(targetNode, config);
        }
    } else {
        // If travelling, set timeout to re-connect the observer when we are scheduled to land.
        console.log('(JS-Helper) ' + GM_info.script.name + ' Destination: "' + stats.destination +
                '" time_left: ' + stats.time_left + ' seconds.');
        setTimeout(function(){observer.observe(targetNode, config); }, stats.time_left * 1000);
    }
}

// Return TRUE if on the 'Traveling' screen
// Left here for backwards compatibility.
function areTraveling() {
    return travelling();
}

/*
This is in dark mode ('dark mode' will not be in the class otherwise), when in Torn:

<body id="body" class="d body webp-support r regular dark-mode" data-layout="regular"
data-country="torn" data-celebration="none" data-traveling="false" data-abroad="false" data-dark-mode-logo="regular">

While flying:

<body id="body" class="d body webp-support r regular dark-mode" data-layout="regular"
data-country="cayman-islands" data-celebration="none" data-traveling="true" data-abroad="true" data-dark-mode-logo="">

When landed:

<body id="body" class="d body webp-support r regular dark-mode" data-layout="regular"
data-country="cayman-islands" data-celebration="none" data-traveling="false" data-abroad="true" data-dark-mode-logo="">
*/

// Return what country we are in (or going to!)
function currentCountry() {
    return $('body')[0].getAttribute('data-country');
}

// Return TRUE if travelling or not in Torn
function awayFromHome() {
    return abroad() || travelling();
}

// Return true if abroad (in the air or landed)
function abroad() {
    return $('body')[0].getAttribute('data-abroad') == 'true';
}

// Return true if travelling (in the air)
function travelling() {
    return $('body')[0].getAttribute('data-traveling') == 'true';
}

// Return true if in dark mode
function darkMode() {
    return $('body')[0].classList.contains('dark-mode');
}

/*
// Function to register a callback if the 'body' tag changes, which can trigger on dark-mode change
function addDarkModeObserver(callback) {
    var observer = new MutationObserver(callback);
    observer.observe($('body')[0] ,{attributes: true, childList: false, subtree: false});
}
*/

/////////////////////////////////////////////////////////////////////////////////
// Very simple error handler; only displayed (and logged) once <== this is a lie.
/////////////////////////////////////////////////////////////////////////////////

// TBD: Change this to a self-closing message.
var errorLogged = false;
function handleError(responseText) {
    if (!errorLogged) {
        let jsonResp = JSON.parse(responseText);
        let errorText = GM_info.script.name + ': An error has occurred querying the Torn API.\n' +
            '\nCode: ' + jsonResp.error.code +
            '\nError: ' + jsonResp.error.error;

        if (jsonResp.error.code == 5) {
            errorText += '\n\n The Torn API only allows so many requests per minute. ' +
                'If this limit is exceeded, this error will occur. It will clear itself' +
                'up shortly, or you may try refreshing the page.\n';
        }

        if (jsonResp.error.code == 2) {
            errorText += '\n\n It appears that the API key entered or saved for you ' +
                'is incorrect. Please try refreshing the page, you will be prompted again for your API key.\n';
            GM_setValue('gm_api_key', '');
        }

        errorText += '\nPress OK to continue.';
        alert(errorText);
        console.log(errorText);
        errorLogged = true;
    }
}

function handleSysError(response) {
    let errorText = GM_info.script.name + ': An error has occurred querying data.\n\n' +
        response.error;

    errorText += '\n\nPress OK to continue.';
    alert(errorText);
    console.log(errorText);
}

///////////////////////////////////////////////////////////////////////////////////
// UI helpers. These are all being deprecated in favor of importing fully formed
// HTML via a @require, see 'Torn Drug Stats' or 'Torn Gym Gains' as examples.
///////////////////////////////////////////////////////////////////////////////////

function createExtendedDiv(extDivId) {
    var extendedDiv = document.createElement('div');
    extendedDiv.className = 'sortable-box t-blue-cont h';
    extendedDiv.id = extDivId;
    return extendedDiv;
}

function createBodyDiv(id=null) {
    var bodyDiv = document.createElement('div');
    bodyDiv.className = 'bottom-round';
    if (id) {bodyDiv.id = id;}
    return bodyDiv;
}

function extendedDivExists(extDivId) {
    var testDiv = document.getElementById(extDivId);
    if (validPointer(testDiv)) {
        return true;
    }
    return false;
}

function createHeaderDiv() {
    var headerDiv = document.createElement('div');
    headerDiv.id = 'xedx-header_div';
    headerDiv.className = 'title main-title title-black active top-round';
    headerDiv.setAttribute('role', 'heading');
    headerDiv.setAttribute('aria-level', '5');

    var arrowDiv = createArrowDiv();
    var moveDiv = createMoveDiv();
    headerDiv.appendChild(arrowDiv);
    headerDiv.appendChild(moveDiv);
    return headerDiv;
}

function createDividerSpan(item, name) {
    var dividerSpan = document.createElement('span');
    dividerSpan.className = ('divider');
    dividerSpan.id = 'xedx-div-span-' + item;
    var nameSpan = document.createElement('span');
    nameSpan.innerText = name;
    dividerSpan.appendChild(nameSpan);
    return dividerSpan;
}

function createArrowDiv() {
    var arrowDiv = document.createElement('div');
    arrowDiv.className = 'arrow-wrap';
    var a = document.createElement('i');
    a.className = 'accordion-header-arrow right';
    arrowDiv.appendChild(a);
    return arrowDiv;
}

function createHeaderDivEx(title=null, hdrId=null, bodyDiv=null, hidden=false) {
    var headerDiv = document.createElement('div');
    headerDiv.className = 'title main-title title-black border-round';
    headerDiv.setAttribute('role', 'table');
    headerDiv.setAttribute('aria-level', '5');
    if (hdrId) {headerDiv.id = hdrId;}
    if (bodyDiv && hdrId) {
        if (validPointer(bodyDiv)) {
            if (hidden) {bodyDiv.style.display = "none";}
            else {bodyDiv.style.display = "block";}
        }
        let arrowDiv = createArrowDivEx(bodyDiv.id, hdrId);
        headerDiv.appendChild(arrowDiv);
    }
    if (title != null) {headerDiv.appendChild(document.createTextNode(title));}
    return headerDiv;
}

function createArrowDivEx(bodyId, hdrId) {
    var arrowDiv = document.createElement('div');
    arrowDiv.className = 'arrow-wrap sortable-list';
    var a = document.createElement('a');
    a.setAttribute('role', 'button');
    a.setAttribute('href', '#/');
    a.className = 'accordion-header-arrow right';
    arrowDiv.appendChild(a);
    arrowDiv.addEventListener("click", function() {
        var bodyDiv = document.getElementById(bodyId);
        var headerDiv = document.getElementById(hdrId);
        if (bodyDiv.style.display === "block") {
            bodyDiv.style.display = "none";
            headerDiv.className = 'title main-title title-black border-round';
        } else {
            bodyDiv.style.display = "block";
            headerDiv.className = 'title main-title title-black top-round active';
        }
    });

    return arrowDiv;
}

function createMoveDiv() {
    var moveDiv = document.createElement('div');
    moveDiv.className = 'move-wrap';
    var b = document.createElement('i');
    b.className = 'accordion-header-move right';
    moveDiv.appendChild(b);
    return moveDiv;
}

function createSeparator() {
    var sepHr = document.createElement('hr');
    sepHr.className = 'delimiter-999 m-top10 m-bottom10';
    return sepHr;
}

function createSmallSeparator() {
    var sepHr = document.createElement('hr');
    sepHr.className = 'delimiter-999';
    sepHr.setAttribute('style', 'margin-top: 5px; margin-bottom: 5px;');
    return sepHr;
}
