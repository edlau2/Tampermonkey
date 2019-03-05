/*
Copyright 2019+, Ed Lau, xedx [2100735]

xedx-torn-config is distributed under the terms of the GNU Lesser General Public License.
    GM_config is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.
    You should have received a copy of the GNU Lesser General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// ==UserScript==
// @exclude       *
// @author        edlau

// ==UserLibrary==
// @name          xedx-torn-common
// @author        edlau
// @description   A collection of utilities and structures for inclusion in Torn user scripts.
// @copyright     2019+, xedx [2100735]
// @license       LGPL-3.0-or-later; http://www.gnu.org/licenses

// ==/UserScript==

// ==/UserLibrary==

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

