// ==UserScript==
// @name         Torn Test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';
    // Note in this one - 'id' is *inside* the style attribute. Messing up everything.
    let div1 = "<div style=' display: none ; position:fixed ; width:1000px ; height:500px ; top:200px ; left:775px ; z-index:999 ;" +
               "' class='myPopups' > <iframe style=' id='pointspopup'; width: 100%;height: 100%;' src='https://www.torn.com/points.php'>" +
               " </iframe> </div> ";

    // Fixed, using back ticks.
    let div2 = `<div style=' display: none ; position:fixed ; width:1000px ; height:500px ; top:200px ; left:775px ; z-index:999 ;
               ' class='myPopups' > <iframe id='poinstpopup' style='width: 100%;height: 100%;' src='https://www.torn.com/points.php'>
               </iframe> </div>`;

    // Fixed, backticks and double quotes
    let div3 = `<div style="display: none ; position:fixed ; width:1000px ; height:500px ; top:200px ; left:775px ; z-index:999 ;
               " class="myPopups" > <iframe id="pointspopup" style="width: 100%;height: 100%;" src="https://www.torn.com/points.php">
               </iframe> </div>`;

    // Fixed without back ticks, need line continuation.
    let div4 = '<div style="display: none ; position:fixed ; width:1000px ; height:500px ; top:200px ; left:775px ; z-index:999 ;"' +
               ' class="myPopups" > <iframe id="pointspopup" style="width: 100%;height: 100%;" src="https://www.torn.com/points.php">' +
               '</iframe> </div>';

    let iframe = $("body").prepend(div4); // or div2 or div3
})();
