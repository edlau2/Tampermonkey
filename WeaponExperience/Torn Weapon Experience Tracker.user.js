// ==UserScript==
// @name         Torn Weapon Experience Tracker
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Displays a weapon's WE on the Itms page.
// @author       xedx [2100735]
// @include      https://www.torn.com/item.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Selectors
    const pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
    const pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black";

    // Global vars
    var loggingEnabled = true; // TRUE to enable console logging
    var weArray = null; // Weapons Experience array, returned from API call.
    var pageName = ''; // Items page we are on
    var pageDiv = null;
    var pageObserver = null; // Mutation observer for the page
    var observing = false; // Observer is active
    const observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };

    // Called once page is fully loaded
    function handlePageLoad() {
        log('handlePageLoaded.'); 

        // Query weapons experience - once that completes,
        // we will call the function to modify the page.
        xedx_TornUserQuery(null, 'weaponexp', userQueryCB);

    }

    // Response handler for Torn API 'user' query
    function userQueryCB(responseText, ID, param) {
        log('User query callback.');
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        weArray = jsonResp.weaponexp; // Array of 'weaponexperience' objects: {"itemID", "name", "Exp"}
        modifyPage(weArray);
    }

    // Write out WE onto the page
    function modifyPage(array, pageChange = false) {
        let lastPage = pageName;
        pageName = getPageName();
        log('modifyPage: array = "' + array + '" pageChange = "' + pageChange + '"');
        if ((lastPage != '') && (pageName.indexOf(lastPage) == -1) && (pageChange == false)) {
            log('Went from page "' + lastPage + '" to "' + pageName +'"');
        } else if (array && pageChange) {
            log('pageChange (observer): ' + lastPage + ' --> ' + pageName);
        } else if (array == null) {
            log('pageChange (timeout): ' + lastPage + ' --> ' + pageName);
            array = weArray;
        }
        var itemUL = null;

        if (pageName == 'Primary') {
            //itemUL = document.querySelector("#primary-items");
            itemUL = $("#primary-items")[0];
        } else if (pageName == 'Secondary') {
            //itemUL = document.querySelector("#secondary-items");
            itemUL = $("#secondary-items")[0];
        } else if (pageName == 'Melee') {
            //itemUL = document.querySelector("#temporary-items");
            itemUL = $("#melee-items")[0];
        } else if (pageName == 'Temporary') {
            //itemUL = document.querySelector("#melee-items");
            itemUL = $("#temporary-items")[0];
        } else {
            return; // Not on a weapons page
        }

        let items = itemUL.getElementsByTagName("li");
        let itemLen = items.length;
        log(pageName + ' Items length: ' + itemUL.getElementsByTagName("li").length);
        if (itemLen <= 1) {
            setTimeout(function(){ modifyPage(null, true); }, 1000);
            return;
        }

        observeOff(); // Don't call ourselves while editing.

        log('modifyPage scanning <li>s');
        for (let i = 0; i < items.length; ++i) {
            let itemLi = items[i]; // <li> selector
            let itemID = itemLi.getAttribute('data-item');
            if (itemID == null) {continue;} // Not an item

            //let info = items[i].getAttribute('data-weaponinfo');
            //if (!items[i].getAttribute('data-weaponinfo')) {continue;} // Child elem.
            let category = itemLi.getAttribute('data-category');
            if (category == null) {continue;} // Child elem.

            //log('Item ID: ' + itemID + ' Category: ' + category);

            let nameSel = itemLi.querySelector('div.title-wrap > div > span.name-wrap > span.name');
            if (!validPointer(nameSel)) {continue;} // Child elem.
            let name = nameSel.innerHTML;
            //log('Name: ' + name);

            //log('Finding "' + name + '" by ID ' + itemID);
            let item = getItemByItemID(array, Number(itemID));
            //log('item found? -->' + item);
            let WE = 0;
            if (validPointer(item)) {
                WE = item.exp;
                //log('Weapon Exp.: ' + WE);
            } else {
                //log('Assuming 0 WE.');
            }

            let bonusUL = itemLi.querySelector('div.cont-wrap > div.bonuses.left > ul');
            let ttPriceSel = bonusUL.querySelector('li.bonus.left.tt-item-price');
            if (validPointer(ttPriceSel)) {ttPriceSel.remove();}
            let weSel = bonusUL.querySelector('li.left.we');
            if (validPointer(weSel)) {weSel.remove();}
            bonusUL.prepend(buildExpLi(itemLi, WE));


        } // End 'for' loop. iterating LI's

        // Watch for active page changes.
        if (pageObserver == null) {
            pageDiv = document.querySelector(pageDivSelector);
            var callback = function(mutationsList, observer) {
                log('Observer triggered - page change!');
                log('Setting onload function.');
                modifyPage(weArray, true);
            };
            pageObserver = new MutationObserver(callback);
        }

        observeOn();
    }

    //////////////////////////////////////////////////////////////////////
    // Helpers
    //////////////////////////////////////////////////////////////////////

    // Get 1st object for item ID
    // @param data - data array to search
    // @param itemID - ID to look for
    // @return first JSON object with matching ID
    function getItemByItemID(data, itemID) {
        let objs = getItemsByItemID(data, itemID);
        return objs[0];
    }

    // Helper for above, get array of objects that match requested ID
    function getItemsByItemID(data, itemID) {
      return data.filter(
          function(data){ return data.itemID == itemID }
      );
    }

    // Build an <li> to display the WE
    function buildExpLi(itemLi, WE) {
        let newLi = document.createElement("li");
        newLi.className = 'left we';
        let weSpan = document.createElement('span')
        weSpan.innerHTML = WE + '%';
        newLi.appendChild(weSpan);
        return newLi;
    }

    // Simple logging helper
    // @param data - What to log.
    function log(data) {
        if (loggingEnabled) {
            console.log(GM_info.script.name + ': ' + data);
        }
    }

    // Returns the page name of current page
    function getPageName() {
        let pageSpan = document.querySelector(pageSpanSelector);
        let pageName = pageSpan.innerText;
        log("On page '" + pageName + "'");
        return pageName;
    }

    // Helpers to turn on and off the observer
    function observeOff() {
        if (observing && pageObserver) {
            pageObserver.disconnect();
            console.log(GM_info.script.name + ' disconnected observer.');
            observing = false;
        }
    }

    function observeOn() {
        if (pageObserver) {
            pageObserver.observe(pageDiv, observerConfig);
            console.log(GM_info.script.name + ' observing page.');
            observing = true;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    // Full URL we trigger on https://www.torn.com/trade.php*
    logScriptStart(); // Logs even if logging disabled.
    log('Prompting for API key');
    validateApiKey();
    log('Prompted (I hope...)');

    // Need to wait for full page load.
    window.onload = function(e){handlePageLoad();}


})();