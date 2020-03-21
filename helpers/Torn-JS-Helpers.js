// ==UserScript==
// @exclude     *
// @namespace   https://github.com/edlau2

// ==UserLibrary==
// @name        Torn-JS-Helpers
// @description Commonly used functions in my Torn scripts.
// @version     0.1
// @license     MIT
// @require     https://github.com/edlau2/Tampermonkey/blob/master/helpers/Torn-JS-Helpers.js
// ==/UserLibrary==

// ==/UserScript==

// Validate an API key and prompt if misssing
var api_key = GM_getValue('gm_api_key');
function validateApiKey() {
if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
    api_key = prompt("Please enter your API key.\n" +
                     "Your key will be saved locally so you won't have to be asked again.\n" +
                     "Your key is kept private and not shared with anyone.", "");
    GM_setValue('gm_api_key', api_key);
}
}

var date_formats = ["YYYY-MM-DD",
                "YYYY-MONTH-DD DDD",
                "YYYY-MM-DD HH:MM:SS",
                "DAY MONTH DD YYYY HH:MM:SS",
                "FULL (DAY MONTH DD YYYY HH:MM:SS TZ)"];

var months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
var days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

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

// Wildcard version of getElementsByClassName()
function myGetElementsByClassName2(anode, className) {
var elems = anode.getElementsByTagName("*");
var matches = [];
for (var i=0, m=elems.length; i<m; i++) {
    if (elems[i].className && elems[i].className.indexOf(className) != -1) {
        matches.push(elems[i]);
    }
}

return matches;
}

// Backwards compatibility:
function myGetElementsByClassName(anode, className) {
return myGetElementsByClassName2(anode, className);
}
