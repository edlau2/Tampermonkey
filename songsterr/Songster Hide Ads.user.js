// ==UserScript==
// @name         Songster Hide Ads
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Hide ads on Songster
// @author       xedx [2100735]
// @include      https://www.songsterr.com/*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    function handlePageLoad() {
        // Can check for any required DIV here and setTimeout() if not available,
        // or trigger any required API calls...
        let target = document.querySelector("#showroom");
        if (!target) {
            log("Didn't find target #showroon");
            return setTimeout(handlePageLoad, 500);
        }
        target.setAttribute('style', 'display: none;');

        // Periodicaly check for refresh
        setTimeout(handlePageLoad, 500);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    callOnContentComplete(handlePageLoad);

})();