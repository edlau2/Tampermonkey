// ==UserScript==
// @exclude     *
// @namespace   https://github.com/edlau2

// ==UserLibrary==
// @name        Torn-JS-Helpers
// @description Commonly used functions in my Torn scripts.
// @require     https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @updateURL   https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect     api.torn.com
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @version     1.2
// @license     MIT
// ==/UserLibrary==

// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////////
// Validate an API key and prompt if misssing
///////////////////////////////////////////////////////////////////////////////////

var api_key = GM_getValue('gm_api_key');
function validateApiKey() {
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt("Please enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }
}

///////////////////////////////////////////////////////////////////////////////////
// Miscellaneous utilities
///////////////////////////////////////////////////////////////////////////////////

// Just spit out the name of the script at startup
function logScriptStart() {
    console.log(GM_info.script.name + ' script started!');
}

// Get rid of this - returns hosting script version, not this library's version
function getHelperVersion() {
    //return GM_info.script.version;
    return '0.2';
}

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
    var regex=/^[0-9]+$/;
    if (x.match(regex)) {
        return true;
    }
    return false;
}

// Add commas at thousand place - works with decimal numbers
function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

// Check to see if a pointer is valid
function validPointer(val, dbg = false) {
    if (val == 'undefined' || typeof val == 'undefined' || val == null) {
        if (dbg) {
            debugger;
        }
        return false;
    }
    return true;
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
            numeric_rank = i+1;
            break;
        }
    }

    return numeric_rank;
}

// Add the style I use for tool-tips
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
    console.log(GM_info.script.name + ' Querying ' + section + ':' + selection);
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
            console.log(GM_info.script.name + ': onabort');
            handleSysError(response.responseText);
        },
        ontimeout: function(response) {
            console.log(GM_info.script.name +': ontimeout');
            handleSysError(response.responseText);
        }
    });
}

//////////////////////////////////////////////////////////////////////
// Functions to query the Torn API for travel stats.
//
// Use this if the @include or @match is https://www.torn.com/index.php
// It checks to see if travelling, which refreshes the page constantly,
// so the 'main' enrty point, if triggered using an observer, will
// constantly get called. Instead, call this function:
//
// checkTravelling(callback); where 'callback' is the actual function
// you'd normally call.
//
// The following vars. must be set and globally accessible:
// var observer, var targetNode, and var config.
// Used as follows: observer.observe(targetNode, config);
//
// The code either executes the callback immediately, if not
// travelling, with the observer disconnected, and reconnects after
// the call.
//
// If travelling, the observer is reconnected on landing, and
// hence this will be called again.
//////////////////////////////////////////////////////////////////////

function checkTravelling(callback) {
    xedx_TornUserQuery('', 'travel', xedx_travelCB, callback);
}

function xedx_travelCB(responseText, ID, callback) {
    let jsonResp = JSON.parse(responseText);
    if (jsonResp.error) {return handleError(responseText);}

    let stats = jsonResp.travel;
    observer.disconnect();
    if (stats.time_left == 0 && stats.destination == 'Torn') {
        if (callback != null) {
            callback(); // Calls whatever work needs to be done, with observer disconnected
            observer.observe(targetNode, config);
        }
    } else {
        // If travelling, set timeout to re-connect the observer when we are scheduled to land.
        console.log(GM_info.script.name + ' Destination: "' + stats.destination +
                '" time_left: ' + stats.time_left + ' seconds.');
        setTimeout(function(){observer.observe(targetNode, config); }, stats.time_left * 1000);
    }
}

/////////////////////////////////////////////////////////////////////////////////
// Very simple error handler; only displayed (and logged) once <== this is a lie.
/////////////////////////////////////////////////////////////////////////////////

// TBD: Change this to a self-closing message.
var errorLogged = false;
function handleError(responseText) {
    if (!errorLogged) {
        let jsonResp = JSON.parse(responseText);
        let errorText = GM_info.script.name + ': An error has occurred querying TornStats.\n' +
            '\nCode: ' + jsonResp.error.code +
            '\nError: ' + jsonResp.error.error;

        if (jsonResp.error.code == 5) {
            errorText += '\n\n The Torn API only allows so many requests per minute. ' +
                'If this limit is exceeded, this error will occur. It will clear itself' +
                'up shortly, or you may try refreshing the page.\n';
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
