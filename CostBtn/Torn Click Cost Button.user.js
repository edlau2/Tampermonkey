// ==UserScript==
// @name         Torn Click Cost Button
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @include      https://www.torn.com/bazaar.php?userId*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    function clickCost() {
        log('clickCost');
        let costBtn = document.querySelector("#react-root > div > div.searchBar___usfAr > button:nth-child(4)");
        if (!costBtn) {
            return setTimeout(clickCost, 100);
        } else {
            costBtn.click();
        }
    }

 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    clickCost();

})();