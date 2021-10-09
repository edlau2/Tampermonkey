// ==UserScript==
// @name         Torn Item Hints
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Adds useful info onto the items page, so you don't have to expand the item.
// @author       xedx [2100735]
// @include      https://www.torn.com/item.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @remote      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-Hints-Helper.js
// @require      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-Hints-Helper.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Globals
    //////////////////////////////////////////////////////////////////////

    // Page names, spans, divs, mutation observer stuff, etc.
    var pageObserver = null;
    const observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };
    const pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
    const pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black";
    const pageDiv = document.querySelector(pageDivSelector);
    const mainItemsDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap";
    var pageName = null;
    var pageSpan = null;

    //////////////////////////////////////////////////////////////////////
    // Handle page loaded event, hash change events
    //////////////////////////////////////////////////////////////////////

    var modified = false;
    function handlePageLoaded() {
        let state = document.readyState;
        if (state != 'complete') {setTimeout(handlePageLoaded, 1000);return;}
        let tmpPageName = getCurrentPageName();
        if (pageName == tmpPageName && modified) {
            log('Same name, already modified.');
            return;
        }
        pageName = tmpPageName;
        modified = false;
        observeOff();
        log("handlePageLoaded: On page '" + pageName + "'");

        if (pageName == 'Flowers') {
            let liList = $('#flowers-items > li');
            if (liList.length <= 1) {setTimeout(handlePageLoaded, 1000); return;}
            let hints = fillHints(liList, flowerHints);
            log('Added hints to ' + hints + ' items.');
        } else if (pageName == 'Plushies') {
            let liList = $('#plushies-items > li');
            if (liList.length <= 1) {setTimeout(handlePageLoaded, 1000); return;}
            let hints = fillHints(liList, plushieHints);
            log('Added hints to ' + hints + ' items.');
        } else if (pageName == 'Temporary') {
            let liList = $('#temporary-items > li');
            if (liList.length <= 1) {setTimeout(handlePageLoaded, 1000); return;}
            let hints = fillHints(liList, temporaryHints);
            log('Added hints to ' + hints + ' items.');
        }

        // Watch for active page changes.
        if (pageObserver == null) {
            var callback = function(mutationsList, observer) {
                handlePageLoaded();
            };
            pageObserver = new MutationObserver(callback);
        }

        modified = true;
        observeOn();
    }

    //////////////////////////////////////////////////////////////////////
    // Miscellaneous helper functions
    //////////////////////////////////////////////////////////////////////

    // Return the name of page we're on, type of item
    function getCurrentPageName() {
        pageSpan = document.querySelector(pageSpanSelector);
        return pageSpan.innerText;
    }

    // Helpers to turn on and off the observer
    function observeOff() {
        if (pageObserver) {
            pageObserver.disconnect();
            log('Disconnected observer.');
        }
    }

    function observeOn() {
        if (pageObserver) {
            pageObserver.observe(pageDiv, observerConfig);
            log('Observing page.');
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    handlePageLoaded();

})();