// ==UserScript==
// @name         Torn Trade Test Script
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Auto-fill the 'add money' part of a trade
// @author       xedx [2100735]
// @include      https://www.torn.com/trade.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    // Called once the page has loaded.
    function handlePageLoad() {
        log('[handlePageLoad]');

        // Wait for correct hash
        if (location.hash.indexOf('addmoney') == -1) return;
        log('On the Add Money page.');

        // Get the amount input fields
        let inputArray = document.getElementsByClassName('input-money');
        if (inputArray.length < 2) return setTimeout(handlePageLoad, 250); // In case not there yet...
        log('Input Array: ', inputArray);

        inputArray[0].value = '123'; // Set the text field
        inputArray[1].value = '123'; // And the hidden field.
        log('Input Array: ', inputArray);

        let btn = document.querySelector("#trade-container > div.init-trade.add-money > div.cont-gray.bottom-round > form > span > span > input");
        $(btn).removeClass('disabled'); // Enable the button, visually
        $(btn).removeAttr('disabled');  // And functionally.
    }

    //////////////////////////////////////////////////////////////////////
    // Main. Everything above here are functions I call, below here
    // is what I typically use as a general purpose template. The
    // 'callOnContentLoaded' function waits for the page to be available
    // before starting things off, not always needed. Depending on the
    // script, it may still be necessary, or I'll do it to be on the
    // safe side, to check for an element you're interested in - and
    // if it's not there, use a setTimeout to come back after a short time.
    //////////////////////////////////////////////////////////////////////

    logScriptStart(); // Just logs the fact the script is starting
    //validateApiKey(); // Only used if an API key is needed, promts for and saves it.
    versionCheck();   // Just so I can tell when it updates. Not required

    // This is used for pages that change the hash, not the root URL, when changing
    // Need to wait for the 'addmoney' page. The Tampermonkey '@include' directive
    // doesn't account for hashed URLs. so
    // @include https://www.torn.com/trade.php* will trigger correctly,
    // @include https://www.torn.com/trade.php#step=addmoney* won't.
    window.addEventListener('hashchange', function() {
        log('The hash has changed! new hash: ' + location.hash);
        handlePageLoad();}, false);

    // Handles waiting for the page to load, then calls the function. We do this
    // as well as triggering on hash change in case already on that page (on a
    // refresh, for example)
    callOnContentLoaded(handlePageLoad); 

})();
