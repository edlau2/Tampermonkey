// ==UserScript==
// @name         Torn Scroll on Attack
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Modify the attack page to suit my needs.
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=attack&user2ID*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/

/*
 * This script is useful to me as when I am attacking, I can't see the bottom of the attack window
 * (where damage done is displayed) and the top (shows stats such as time left/attacks so far/etc.)
 * at the same time on my MacBook Pro due to the screen size and resoltion, as well as chat icons
 * minimized at the bottom of the screen. I can if I scroll up a bit, until the header is not visible.
 * This is 66px on my machine.
*/
(function($) {
    'use strict';

    logScriptStart();
    versionCheck();

    // This is from 'See the Temps', just makes any temps still in effect more visible...
    GM_addStyle ( `
        .defender___2q-P6 {
            background:none !important;
        }
    }`);

    // Make these configurable options one day.
    // 74 is exactly at the bottom of the header, on my MacBook Pro.
    // To compensate for the clock hiding time left, make it a bit less -
    // 66 seems to work for me. One mouse scroll click = 4 px on my Mac.
    var y = 66; //74;
    var delay = 2000;

    console.log("Torn Scroll on Attack script started!");
    setTimeout(function() {window.scrollTo(0, y);}, delay);
    console.log("Torn Scroll on Attack script finished - scrolled to 0, " + y);

})();
