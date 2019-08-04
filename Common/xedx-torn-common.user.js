// ==UserScript==
// @exclude       *
// @author        Ed Lau (xedx [2100735])
// @namespace     http://tampermonkey.net/
// ==UserLibrary==
// @name          xedx-torn-common
// @author        Ed Lau (xedx [2100735])
// @description   A collection of utilities and structures for inclusion in Torn user scripts.
// @copyright     2019+, Ed Lau (xedx [2100735])
// @license       LGPL-3.0-or-later; http://www.gnu.org/copyleft/lgpl.html
// @version       0.1
// ==/UserLibrary==
// @include       *
// @grant         GM_addStyle
// @grant         GM_getValue
// @grant         GM_setValue
// ==/UserScript==

// Create a timestamp string for current time (YY-MM-DD HH:MM:SS)
function timestamp() {
    var dateobj = new Date();
    var year = dateobj.getFullYear();
    var month= ("0" + (dateobj.getMonth()+1)).slice(-2);
    var date = ("0" + dateobj.getDate()).slice(-2);
    var hours = ("0" + dateobj.getHours()).slice(-2);
    var minutes = ("0" + dateobj.getMinutes()).slice(-2);
    var seconds = ("0" + dateobj.getSeconds()).slice(-2);
    var day = dateobj.getDay();

    var converted_date = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

    return converted_date;
}

// Log an event to the console, prepended with a timestamp
function logEvent(event) {
    console.log(timestamp() + "- " + event);
}

// Map textual rank names to numeric, via array index
var ranks = ['Absolute beginner',
             'Beginner',
             'Inexperienced',
             'Rookie',
             'Novice',
             'Below Average',
             'Average',
             'Reasonable',
             'Above Average',
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
             'Idolised',
             'Champion',
             'Heroic',
             'Legendary',
             'Elite',
             'Invincible'];
