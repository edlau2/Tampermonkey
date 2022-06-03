// ==UserScript==
// @name         Torn Test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/points.php*
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
    'use strict'

    logScriptStart();

    GM_addStyle(".xshow {display: block;} .xhide {display: none;}");

  $('.tt-points-value').mousedown (function() {
       log('Setting .myPopups to "show" in one sec');
       setTimeout (function () {
           log("myPopups: ", $('.myPopups'));
           $('.myPopups').addClass('xshow').removeClass('xhide');
       }, 1000);});

    // Get a copy of the e-bar.
    let eBar = document.querySelector("#refill-energy-bar");
    let orgEnergyBar = $(eBar).clone();
    $(orgEnergyBar).addClass('myPopups xhide'); // Set class so I can find it, and to hide it.
    log('orgEnergyBar: ', orgEnergyBar);

    // Saved for now
    let myFrameContent = "<div style='position: fixed; width:1000px; height:500px; top:200px; left:775px; z-index:999;'" +
       "class='myPopups xhide'> <iframe id='pointspopup' style='width: 1000px; height: 500px;'" +
       "src='https://www.torn.com/points.php'> </iframe> </div>"

    let iframe = $("body").prepend(orgEnergyBar);

    // Not dong this ATM...
    //
    // Note sure why this is here, but hides everything, so need to unhide everything if you want to see it.
    // If this is what I think it is, this is what I meant about needing to be sure your parent divs aren't hidden.
    if (window.top === window.self) {
        let res = $("#pointspopup").contents().find("body");
        log('res: ', res);
        //$("#pointspopup").contents().find("body").hide(); // Comment this out, and you'll see stuff again
  }


})();
