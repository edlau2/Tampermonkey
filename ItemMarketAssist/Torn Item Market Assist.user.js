// ==UserScript==
// @name         Torn Item Market Assist
// @namespace    http://tampermonkey.net/
// @version      1.29
// @description  Makes Item Market slightly better, for buyers and sellers
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @xrequire      file://///Users/edlau/Documents/Documents - Ed’s MacBook Pro/Tampermonkey Scripts/Helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/


(function() {
    'use strict';

    logScriptStart();
    const userId = getThisUserId();

    if (isAttackPage()) return log("Won't run on attack page!");

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);
    var logWatchList = GM_getValue("logWatchList", false);
    var logStorage = GM_getValue("logStorage", false);

    const getShortTornTitle =
          function () {return $("title").text() ? $('title').text().split('|')[0].trim() : "";}
    const xedxDevMode = (userId == "2100735");
    const pageId = getRandomIntEx(1000, 9999);
    const title = getShortTornTitle();

    if (xedxDevMode == true) {
        //log("Page ID: ", pageId);
        let t = $("title").text();
        $("title").text(t + " | " + pageId);
        log("On page: ", $("title").text());
    }

    var tabVisible = true;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            tabVisible = true;
        } else {
            tabVisible = false;
        }
    });

    addToolTipStyle();

    // ===================================== experimental lock icons ==================================

    function addLockStyles() {
        GM_addStyle(`
            .x-lock-icon {
                background: url(/images/v2/gym-rebuild/gym_selection_bg.png) -9px -134px no-repeat;
                background-image: var(--gym-button-locked-bg-image);
            }

            .xlock-wrapper {
                align-items: center;
                border-left: 1px solid #fff;
                border-left: 1px solid var(--item-row-color-border-light);
                border-right: 1px solid #ccc;
                border-right: 1px solid var(--item-row-color-border-dark);
                box-sizing: border-box;
                display: flex;
                justify-content: center;
                position: relative;
                width: 34px;
            }
            .x-lock-svg {
                width: 20px;
            }
        `);
    }

    const securedSvg = `
        <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106.11 122.88">
            <defs><style>.cls-1{fill:#333;}.cls-1,.cls-2,.cls-3{fill-rule:evenodd;}.cls-2{fill:#fff;}.cls-3{fill:#3aaf3c;}</style></defs>
            <title>safe</title>
            <path class="cls-1" d="M56.36,2.44A104.34,104.34,0,0,0,79.77,13.9a48.25,48.25,0,0,0,19.08,2.57l6.71-.61.33,6.74c1.23,24.79-2.77,46.33-11.16,63.33C86,103.6,72.58,116.37,55.35,122.86l-4.48,0c-16.85-6.15-30.16-18.57-39-36.47C3.63,69.58-.61,47.88.07,22l.17-6.65,6.62.34A64.65,64.65,0,0,0,28.23,13.5,60.41,60.41,0,0,0,48.92,2.79L52.51,0l3.85,2.44Z"/>
            <path class="cls-2" d="M52.89,7.91c17.38,11,33.07,16.22,46.55,15,2.35,47.59-15.22,82.18-46.37,93.9C23,105.83,5.21,72.45,6.53,22.18,22.34,23,37.86,19.59,52.89,7.91Z"/>
            <path class="cls-3" d="M52.92,16.31C67.39,25.48,80.46,29.82,91.68,28.8c2,39.63-12.68,69.83-38.61,79.6C28,99.26,13.2,70.06,14.3,28.2c13.17.69,26.1-2.16,38.62-11.89Z"/>
            <path class="cls-2" d="M37.13,49.73H40v-2a13.73,13.73,0,0,1,3.82-9.54,12.7,12.7,0,0,1,18.52,0,13.77,13.77,0,0,1,3.82,9.54v2H69a2.14,2.14,0,0,1,2.14,2.13V78.77A2.14,2.14,0,0,1,69,80.9H37.13A2.13,2.13,0,0,1,35,78.77V51.86a2.13,2.13,0,0,1,2.13-2.13ZM48.76,64.89a14.8,14.8,0,0,1,1.51,1.46A59.7,59.7,0,0,1,55,59.81c4.68-5.66,2.56-4.57,9.06-4.57l-.91,1a64.73,64.73,0,0,0-6,8A94.44,94.44,0,0,0,51,74.38l-.56,1.09-.52-1.11a26.94,26.94,0,0,0-3.46-5.6,18.68,18.68,0,0,0-4.4-4c.85-2.78,4.88-1.36,6.68.17ZM44,49.73H62.09v-2A9.73,9.73,0,0,0,59.41,41a8.69,8.69,0,0,0-12.72,0A9.73,9.73,0,0,0,44,47.74v2Z"/>
        </svg>`;

    const unlockedSvg = `
        <svg id="Layer_1" class="x-lock-svg" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86.5 122.88">
            <defs><style>.cls-1{fill:#fbd734;}.cls-1,.cls-2{fill-rule:evenodd;}.cls-2{fill:#36464e;}</style></defs>
            <title>unlocked</title>
            <path class="cls-1" d="M5.54,53.25H81a5.57,5.57,0,0,1,5.54,5.54v58.55A5.56,5.56,0,0,1,81,122.88H5.54A5.55,5.55,0,0,1,0,117.34V58.79a5.56,5.56,0,0,1,5.54-5.54Z"/>
            <path class="cls-2" d="M38.7,91.82l-6,15.66H53.77L48.23,91.6a10.9,10.9,0,1,0-9.53.22Z"/>
            <path class="cls-2" d="M66.69,34.16a25.17,25.17,0,0,0-6.94-16.49,22.56,22.56,0,0,0-33,0,25.22,25.22,0,0,0-7,17.52V53.25H9.29V35.19A35.76,35.76,0,0,1,19.2,10.42a33,33,0,0,1,48.09,0,35.69,35.69,0,0,1,9.9,23.74Z"/>
        </svg>`;

    const unlockedSvg2 = `
        <svg id="Layer_1" class="x-lock-svg" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86.5 122.88"><defs><style>.cls-1{fill:#fbd734;}.cls-1,.cls-2{fill-rule:evenodd;}.cls-2{fill:#36464e;}</style></defs><title>unlocked</title><path class="cls-1" d="M5.54,53.25H81a5.57,5.57,0,0,1,5.54,5.54v58.55A5.56,5.56,0,0,1,81,122.88H5.54A5.55,5.55,0,0,1,0,117.34V58.79a5.56,5.56,0,0,1,5.54-5.54Z"/><path class="cls-2" d="M38.7,91.82l-6,15.66H53.77L48.23,91.6a10.9,10.9,0,1,0-9.53.22Z"/><path class="cls-2" d="M66.69,34.16a25.17,25.17,0,0,0-6.94-16.49,22.56,22.56,0,0,0-33,0,25.22,25.22,0,0,0-7,17.52V53.25H9.29V35.19A35.76,35.76,0,0,1,19.2,10.42a33,33,0,0,1,48.09,0,35.69,35.69,0,0,1,9.9,23.74Z"/></svg>
    `;

    const lockedSvg = `
        <svg id="Layer_1" class="x-lock-svg" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 93.63 122.88">
            <defs><style>.cls-1{fill:#fbd734;}.cls-1,.cls-2{fill-rule:evenodd;}.cls-2{fill:#36464e;}</style></defs>
            <title>padlock</title>
            <path class="cls-1" d="M6,47.51H87.64a6,6,0,0,1,6,6v63.38a6,6,0,0,1-6,6H6a6,6,0,0,1-6-6V53.5a6,6,0,0,1,6-6Z"/>
            <path class="cls-2" d="M41.89,89.26l-6.47,16.95H58.21L52.21,89a11.79,11.79,0,1,0-10.32.24Z"/>
            <path class="cls-2" d="M83.57,47.51H72.22V38.09a27.32,27.32,0,0,0-7.54-19,24.4,24.4,0,0,0-35.73,0,27.32,27.32,0,0,0-7.54,19v9.42H10.06V38.09A38.73,38.73,0,0,1,20.78,11.28a35.69,35.69,0,0,1,52.07,0A38.67,38.67,0,0,1,83.57,38.09v9.42Z"/>
        </svg>`;

    var locked = true;
    function addItemLocks(retries=0) {
        log("addItemLocks, retries: ", retries);

        //let list = $("div[data-headlessui-state='selected'] [class^='additionalInfo_']");
        let list = $("div[data-headlessui-state='selected'] [class^='additionalInfo_']").not('xtst');
        if (!$(list).length) {
            if (retries++ < 30) return setTimeout(addItemLocks, 500, retries);
            log("Too many lock retries");
        }

        // #headlessui-tabs-panel-\:rb0\: > div:nth-child(4) > div > div > div.checkboxWrapper___YnT5u

        let lockWrap = `<div class="xlock-wrapper">${unlockedSvg2}</div>`;
        let lockWrap2 = `<div class="xlock-wrapper">${lockedSvg}</div>`;

        log("List: ", $(list));

        let count = 0;
        for (let idx=0; idx<$(list).length; idx++) {
            let node = $(list)[idx];
            if ($(node).hasClass('xtst')) continue;
            count++;
            log("adding node after: ", $(node), " name: ", (locked == true) ? "lockwrap" : "lockwrap2");
            $(node).after((locked == true) ? $(lockWrap) : $(lockWrap2));
            $(node).addClass('xtst');

            locked = !locked;
        }

        log("Added ", count, "locks");

        setTimeout(addItemLocks, 2000);

        //$("div[data-headlessui-state='selected']").after();

        //$("[class^='info_'] ['class^='']")
        //$("div[data-headlessui-state='selected'] [class^='additionalInfo_']").after(lockWrap);
    }

    // ============================= Browser notifications ==============================
    const notifyOpenKey = "notifyOpen";

    function isNotifyOpen() {
        let ret = GM_getValue(notifyOpenKey, false);
        if (logWatchList == true) log ("isNotifyOpen: ", ret);
        return ret;
    }
    function setNotifyOpen() {
        GM_setValue(notifyOpenKey, true);
        GM_setValue("notifyLastOpenedBy", pageId);
    }
    const notifyReset = function(){logt("handleNotifyClick: notifyReset"); GM_setValue(notifyOpenKey, false);}

    // MW stuff that must be declared early
    const watchNameW1 = "45%";
    const watchPriceW1 = "35%";
    const watchNameW2 = "35%";
    const watchPriceW2 = "30%";

    const isItemMarket = function () {return location.href.toLowerCase().indexOf("itemmarket") > -1;}
    const searchBaseURL = "https://api.torn.com/v2/market/?selections=itemmarket&id=";
    var marketWatch = GM_getValue("marketWatch", false);
    var marketWatchAnyPage = GM_getValue("marketWatchAnyPage", false);
    var marketWatchRunning = false;

    // Energy cost calculator
    var eCostCalc = GM_getValue("eCostCalc", false);

    // If not in the item market, but have 'market watch' enabled,
    // just run that portion of the script...
    var letMWRun = true;
    if (!isItemMarket() && marketWatch != true) letMWRun = false;
    if (!isItemMarket() && marketWatch == true && marketWatchAnyPage != true) letMWRun = false;

    if (logWatchList == true) log("isNotifyOpen? ", isNotifyOpen());
    notifyReset();

    // Keys for flags indicating changes possibly made by
    // other instances...
    const mwItemsKey = "mwItemsChanged";
    const favesKey = "favesItemsChanged";
    const priceKey = "priceListChanged";
    const optionsKey = "optionsChanged";

    // Registered storage change listeners
    var mwItemsListener;
    var favesListener;
    var priceListener;
    var optionsListener;

    // Options
    const currPriceVer = 3;
    var mwNotifyTimeSecs = GM_getValue("mwNotifyTimeSecs", 30);                // Time in secs for notification to timeout
    var mwNotifyTimeBetweenSecs = GM_getValue("mwNotifyTimeBetweenSecs", 120); // Min time between dup notifications
    var mwItemCheckInterval = GM_getValue("mwItemCheckInterval", 30);          // Time between checking list of watch items
                                                                               // Note it starts after LAST item request, so num items
                                                                               // * the call delay plus this
    var mwBetweenCallDelay = GM_getValue("mwBetweenCallDelay", 30);             // Time between calls for each item
    var mwMaxWatchListLength = GM_getValue("mwMaxWatchListLength", 12);        // Maximum items you can watch at once

    let tmp = GM_getValue("watchList", undefined);
    var watchList = tmp ? JSON.parse(tmp) : {};

    if (!isItemMarket() && marketWatch == true) {
        if (checkCloudFlare()) return log("Won't run while challenge active!");
        if (logWatchList == true) log("Not at market, running market watch only!");
        validateApiKey();
        startMarketWatch();
        mwItemsListener = GM_addValueChangeListener(mwItemsKey, storageChangeCallback);
        if (logWatchList == true) log("market watch only, storage listener installed: ", mwItemsListener);

        return;
    }

    var needsSave = GM_getValue("needsSave", true);
    var rememberLastPrice = GM_getValue("rememberLastPrice", false);
    var lastPriceOnlyWandA = GM_getValue("lastPriceOnlyWandA", false);
    var lastPriceExpireHrs = GM_getValue("lastPriceExpireHrs", 48);
    var autoPricePctLess = GM_getValue("autoPricePctLess", false);
    var autoPricePctLessValue = GM_getValue("autoPricePctLessValue", 0);
    var autoPriceAmtLess = GM_getValue("autoPriceAmtLess", false);
    var autoPriceAmtLessValue = GM_getValue("autoPriceAmtLessValue", 0);
    var enableFavs = GM_getValue("enableFavs", false);
    var autoPriceRSP = GM_getValue("autoPriceRSP", true);
    var autoPriceLowest = GM_getValue("autoPriceLowest", false);
    var fillMaxCanGet = GM_getValue("fillMaxCanGet", true);
    var quickBuy = GM_getValue("quickBuy", false);
    var enableScrollLock = GM_getValue("enableScrollLock", true);
    var logOptions = GM_getValue("logOptions", false);

    // TBD: not an editable option ATM
    const savedPriceColor = "yellow";
    const lowestPriceColor = "green";

    tmp = GM_getValue("itemCategories", undefined);
    var itemCategories = tmp ? JSON.parse(tmp) : [];

    if (enableScrollLock == true) addScrollStyle();

    if (logOptions == true) logOpts();

    // Selector for cash on hand
    const cash = $("#user-money");

    // Just make new list in this release.
    var previousPriceList = {};
    if (GM_getValue("pricesChecked", null) != true) {
        GM_setValue("previousPriceList", {});
        GM_setValue("pricesChecked", true);
        previousPriceList = {};
    } else {
        let tmp = GM_getValue("previousPriceList", undefined);
        previousPriceList = tmp ? JSON.parse(tmp) : {};
    }

    debug("previousPriceList loaded: ", previousPriceList);

    // Load favorites
    tmp = GM_getValue("favorites", undefined);
    var favorites = tmp ? JSON.parse(tmp) : {};

    // For the favorites list we need the item type, so get item list
    // from the API, will cache that if enabled.
    // This is set automatically once the items are retrieved.
    const useCachedItems = GM_getValue("useCachedItems", false);
    var tornItemsList = {};
    var itemsListValid = false;

    // Instead of getting the whole item list each time,
    // we may cache - if enabled, load now before the
    // script even starts.
    if (useCachedItems == true) {
        let val = GM_getValue("tornItemsList", "{}");
        tornItemsList = JSON.parse(val);
        if (tornItemsList) {
            let keys = Object.keys(tornItemsList);
            let expected = GM_getValue("CachedItemsCount", 0);
            if (expected != keys.length) {
                console.error("Invalid items cache!");
                GM_setValue("useCachedItems", false);
                useCachedItems = false;
            } else {
                debug("Using cached item list");
                itemsListValid = true;
            }
        }
    }

    const armorAnWeaponTypes = ['melee', 'secondary', 'primary', 'defensive'];
    const iswa = function(id) {return isItemWeaponOrArmorType(id);}  //shorthand
    function isItemWeaponOrArmorType(itemId) {
        let item = tornItemsList[itemId];
        if (!item) return false;

        let type = item.type ? item.type.toLowerCase() : null;
        if (!type) return false;

        armorAnWeaponTypes.forEach(function(itemType, idx) {
            if (itemType == type) return true;
        });

        return false;
    }

    // Move to shared lib...
    function isVersionOlder(savedVer) {
        const currVer = GM_info.script.version;

        let cParts = currVer.split('.');
        let sParts = savedVer.split('.');
        let cLen = cParts.length;
        let sLen = sParts.length;

        if (cLen != sLen) {
            debugger;
            console.error("versions are very mismatched!");
            return false;
        }
        for (let idx = 0; idx < cLen; idx++) {
            if (parseInt(sParts[idx]) < parseInt(cParts[idx])) return true;
            if (parseInt(sParts[idx]) > parseInt(cParts[idx])) return false;
        }
        return false;
    }

    const savedVer = GM_getValue("savedVer", 0);
    const currVer = GM_info.script.version;

    if (isVersionOlder(savedVer)) needsSave = true;
    if (needsSave) {
        saveCbOpts();
        saveMarketWatchOpts(true);
    }
    GM_setValue("savedVer", currVer);

    function saveMarketWatchOpts(init) {
        GM_setValue("mwNotifyTimeSecs", mwNotifyTimeSecs);
        GM_setValue("mwNotifyTimeBetweenSecs", mwNotifyTimeBetweenSecs);
        GM_setValue("mwItemCheckInterval", mwItemCheckInterval);
        GM_setValue("mwBetweenCallDelay", mwBetweenCallDelay);
        GM_setValue("mwMaxWatchListLength", mwMaxWatchListLength);
    }

    function updateMarketWatchOpts() {
        mwNotifyTimeSecs = GM_getValue("mwNotifyTimeSecs", mwNotifyTimeSecs);
        mwNotifyTimeBetweenSecs = GM_getValue("mwNotifyTimeBetweenSecs", mwNotifyTimeBetweenSecs);
        mwItemCheckInterval = GM_getValue("mwItemCheckInterval", mwItemCheckInterval);
        mwBetweenCallDelay = GM_getValue("mwBetweenCallDelay", mwBetweenCallDelay);
        mwMaxWatchListLength = GM_getValue("mwMaxWatchListLength", mwMaxWatchListLength);
    }

    function logMarketWatchOpts() {
        log("mwNotifyTimeSecs: ", mwNotifyTimeSecs,
        " mwNotifyTimeBetweenSecs: ", mwNotifyTimeBetweenSecs,
        " mwItemCheckInterval: ", mwItemCheckInterval,
        " mwBetweenCallDelay: ", mwBetweenCallDelay,
        " mwMaxWatchListLength: ", mwMaxWatchListLength);
    }

    function logOpts() {
        log("rememberLastPrice: ", rememberLastPrice);
        log("lastPriceOnlyWandA: ", lastPriceOnlyWandA);
        log("lastPriceExpireHrs: ", lastPriceExpireHrs);
        log("autoPricePctLess: ", autoPricePctLess);
        log("autoPricePctLessValue: ", autoPricePctLessValue);
        log("autoPriceAmtLess: ", autoPriceAmtLess);
        log("autoPriceAmtLessValue: ", autoPriceAmtLessValue);
        log("marketWatch: ", marketWatch);
        log("marketWatchAnyPage: ", marketWatchAnyPage);
        log("enableFavs: ", enableFavs);
        log("autoPriceRSP: ", autoPriceRSP);
        log("autoPriceLowest: ", autoPriceLowest);
        log("fillMaxCanGet: ", fillMaxCanGet);
        log("quickBuy: ", quickBuy);
        log("enableScrollLock: ", enableScrollLock);
        log("eCostCalc: ", eCostCalc);
    }

    // disconnect the listener for a bit so we don't respond to
    // other tabs making changes.
    function toggleStorageKey(key, val) {
        if (tabVisible == false) return;
        GM_setValue(key, val);
        if (val == true) setTimeout(toggleStorageKey, 250, key, false);
        if (logStorage == true) log("storageChange changed key ", key, " to ", val, " by: ", pageId);
    }

    function saveCbOpts(init) {
        GM_setValue("rememberLastPrice", rememberLastPrice);
        GM_setValue("lastPriceOnlyWandA", lastPriceOnlyWandA);
        GM_setValue("lastPriceExpireHrs", lastPriceExpireHrs);
        GM_setValue("autoPricePctLess", autoPricePctLess);
        GM_setValue("autoPricePctLessValue", autoPricePctLessValue);
        GM_setValue("autoPriceAmtLess", autoPriceAmtLess);
        GM_setValue("autoPriceAmtLessValue", autoPriceAmtLessValue);
        GM_setValue("marketWatch", marketWatch);
        GM_setValue("enableFavs", enableFavs);
        GM_setValue("autoPriceRSP", autoPriceRSP);
        GM_setValue("autoPriceLowest", autoPriceLowest);
        GM_setValue("fillMaxCanGet", fillMaxCanGet);
        GM_setValue("quickBuy", quickBuy);
        GM_setValue("enableScrollLock", enableScrollLock);
        GM_setValue("marketWatchAnyPage", marketWatchAnyPage);
        GM_setValue("logOptions", logOptions);
        GM_setValue("logWatchList", logWatchList);
        GM_setValue("logStorage", logStorage);
        GM_setValue("eCostCalc", eCostCalc);

        saveMarketWatchOpts(init);
        if (!init) toggleStorageKey(optionsKey, true);

        needsSave = false;
        GM_setValue("needsSave", needsSave);
        GM_setValue("savedVer", GM_info.script.version);
    }

    function updateCbOpts() {
        rememberLastPrice = GM_getValue("rememberLastPrice", rememberLastPrice);
        lastPriceOnlyWandA = GM_getValue("lastPriceOnlyWandA", lastPriceOnlyWandA);
        lastPriceExpireHrs = GM_getValue("lastPriceExpireHrs", lastPriceExpireHrs);
        autoPricePctLess = GM_getValue("autoPricePctLess", autoPricePctLess);
        marketWatch = GM_getValue("marketWatch", marketWatch);
        enableFavs = GM_getValue("enableFavs", enableFavs);

        autoPricePctLessValue = GM_getValue("autoPricePctLessValue", autoPricePctLessValue);
        autoPriceAmtLess = GM_getValue("autoPriceAmtLess", autoPriceAmtLess);
        autoPriceAmtLessValue = GM_getValue("autoPriceAmtLessValue", autoPriceAmtLessValue);
        autoPriceRSP = GM_getValue("autoPriceRSP", autoPriceRSP);
        autoPriceLowest = GM_getValue("autoPriceLowest", autoPriceLowest);
        fillMaxCanGet = GM_getValue("fillMaxCanGet", fillMaxCanGet);
        quickBuy = GM_getValue("quickBuy", quickBuy);
        enableScrollLock = GM_getValue("enableScrollLock", enableScrollLock);
        marketWatchAnyPage = GM_getValue("marketWatchAnyPage", marketWatchAnyPage);
        eCostCalc = GM_getValue("eCostCalc", eCostCalc);

        updateMarketWatchOpts();
    }

    function writePriceList(fromStgHandler) {
        debug("writePriceList");
        GM_setValue("previousPriceList", JSON.stringify(previousPriceList));
        if (!fromStgHandler) toggleStorageKey(priceKey, true);
    }

    function saveWatchList(fromStgHandler) {
        debug("saveWatchList");
        GM_setValue("watchList", JSON.stringify(watchList));
        if (!fromStgHandler) toggleStorageKey(mwItemsKey, true);
    }

    function saveFavorites(fromStgHandler) {
        debug("saveFavorites");
        GM_setValue("favorites", JSON.stringify(favorites));

        if (!fromStgHandler) toggleStorageKey(favesKey, true);
    }

    function restoreWatchList(fromStgHandler) {
        if (marketWatch == true) {
            let expanded = (parseInt($("#xleft-opts").width()) < 10) ? true : false;

            $("#xwatches").empty();
            let keys = Object.keys(watchList);
            if (logWatchList == true) log("restoreWatchList, len:  ", keys.length);
            for (let idx=0; idx<keys.length; idx++) {
                let key = keys[idx];
                let item = watchList[key];
                if (logWatchList == true) log("Adding watch list itm: ", item);
                addWatchObjToUI(item, fromStgHandler);
            }

            if (expanded) fixupExpandedWatches();
        }
    }

    // ======================== callback to handle all storage changes ===============================

    // When some options, namely market watch prices, are changed in the
    // visible/active page, need to be propogated to any pages also
    // running this script in the background, otherwise notifications
    // may be for invalid prices...
    function storageChangeCallback(key, oldValue, newValue, remote) {
        // Don't process if changed to 'undefined', isn't a remote
        // tab (meaning it's us), or we are the visible tab/page.
        if (logStorage == true) log("storageChangeCallback: ", key, " old: ", oldValue, " new: ", newValue, " remote: ", remote, " visible: ", tabVisible);

        // Ignore resetting the value or local change
        if (newValue == undefined || remote == false) return;

        let processed = false;
        switch (key) {
            case mwItemsKey: {
                if (logWatchList) log("WatchList changed: updating");
                removeStorageListener(mwItemsListener);
                tmp = GM_getValue("watchList", undefined);
                watchList = tmp ? JSON.parse(tmp) : {};
                updateMarketWatchOpts();
                restoreWatchList(true);
                processed = true;
                break;
            }
            case favesKey: {
                removeStorageListener(favesListener);
                tmp = GM_getValue("favorites", undefined);
                favorites = tmp ? JSON.parse(tmp) : {};
                restoreSavedFaves(true);
                processed = true;
                break;
            }
            case priceKey: {
                removeStorageListener(priceListener);
                tmp = GM_getValue("previousPriceList", undefined);
                previousPriceList = tmp ? JSON.parse(tmp) : {};
                restorePriceList(true);
                processed = true;
                break;
            }
            case optionsKey: {
                removeStorageListener(optionsListener);
                updateCbOpts();
                processed = true;
                break;
            }
            default:
                debug("storageChange key not found! key: ", key);
                return;
        }

        if (logStorage == true) log("storageChange Setting ", key, " to false? ", processed);
        if (processed == true)
            GM_setValue(key, false);
    }

    function removeStorageListener(key) {
        switch (key) {
            case mwItemsKey: {
                GM_removeValueChangeListener(mwItemsListener);
                mwItemsListener = null;
                break;
            }
            case favesKey: {
                GM_removeValueChangeListener(favesListener);
                favesListener = null;
                break;
            }
            case priceKey: {
                GM_removeValueChangeListener(priceListener);
                priceListener = null;
                break;
            }
            case optionsKey: {
                GM_removeValueChangeListener(optionsListener);
                optionsListener = null;
                break;
            }
            default:
                return;
        }

        setTimeout(restoreStorageListener, 2000, key, true);

        if (logStorage == true) log("storageChange listener removed for ", key, " timeout set");
    }

    function restoreStorageListener(key, timer) {
        switch (key) {
            case mwItemsKey: {
                if (!mwItemsListener)
                    mwItemsListener = GM_addValueChangeListener(mwItemsKey, storageChangeCallback);
                break;
            }
            case favesKey: {
                if (!favesListener)
                    favesListener = GM_addValueChangeListener(favesKey, storageChangeCallback);
                break;
            }
            case priceKey: {
                if (!priceListener)
                    priceListener = GM_addValueChangeListener(priceKey, storageChangeCallback);
                break;
            }
            case optionsKey: {
                if (!optionsListener)
                    optionsListener = GM_addValueChangeListener(optionsKey, storageChangeCallback);
                break;
            }
            default:
                return;
        }
        if (logStorage == true) log("storageChange listener restored: ", key, " timer? ", timer);
    }

    // Install storage change listeners
    function installStorageChangeListeners() {
        mwItemsListener = GM_addValueChangeListener(mwItemsKey, storageChangeCallback);
        favesListener = GM_addValueChangeListener(favesKey, storageChangeCallback);
        priceListener = GM_addValueChangeListener(priceKey, storageChangeCallback);
        optionsListener = GM_addValueChangeListener(optionsKey, storageChangeCallback);
        if (logStorage == true) log("storageChange added listeners: ", mwItemsListener, "|", favesListener, "|", priceListener, "|", optionsListener);
    }

    // ============================================================================

    var cashOnHand = 0;

    const isBuy = function () {return location.hash.indexOf("market") > -1;}
    const isSell = function () {return location.hash.indexOf("addListing") > -1;}
    const isView = function () {return location.hash.indexOf("viewListing") > -1;}

    // Result procssing for low price query, similar to but separate
    // from the market watch version. The UniqueId portion of the key
    // will be 0 in this case.
    function processResult(jsonObj, status, xhr, target) {
        debug("processResult: ", $(target));
        if (jsonObj.error) {
            console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
            if (jsonObj.error.code == 5) {
                if (lookupsPaused == false) {
                    lookupsPaused = true;
                    setTimeout(resetLookups, 60000);
                }
            }
            return;
        }

        //let listings, item, cheapest, name, itemId, myLi;
        let market = jsonObj.itemmarket;
        if (!market) return log("ERROR: bad API response! ", jsonObj);

        let item = market.item;
        if (!item) return log("ERROR: Item not found in API response (maybe none for sale?)");

        let name = item.name;
        let itemId = item.id;
        let listings = market.listings;
        let cheapest;
        if (listings) cheapest = listings[0];


        if (cheapest && itemId) {
            let price = cheapest.price;
            debug("processResult for ID ", itemId, " name: ", name, " is ", asCurrency(price));
            let usePrice = subtractMargin(price);
            fillSellPrice(target, usePrice, itemId, 0);
            if (xedxDevMode == true)
                $(target).css("color", lowestPriceColor);
        } else {
            fillSellPrice(target, 0, itemId, 0);
        }
    }

    // target is required to fill price on success...
    var inAjax = false; // prevent dbl-click from firing twice
    function clearAjax(){inAjax = false;}

    // API call to get curr lowest price of one item
    // Never allow more than 30 a minute. Amongst ALL instances.
    // Hard to synchronize access to storage..
    function findLowPriceOnMarket(itemId, target, callback) {
        const maxLowPricePerMin = 20;
        if (inAjax == true) return;
        //if (checkCloudFlare()) return;
        let priceChecks = GM_getValue("priceChecks", -1);
        if (priceChecks == -1) {
            priceChecks = 0;
            GM_setValue("priceChecks", 0);
        }
        if (priceChecks++ > maxLowPricePerMin) {
            log("ERROR: exceeded ", maxLowPricePerMin, " calls!");
            return;
        }
        GM_setValue("priceChecks", priceChecks);
        inAjax = true;

        setTimeout(clearAjax, 500);
        let comment = GM_info.script.name.replace('Torn', '');
        let url = searchBaseURL + itemId + "&key=" + api_key + "&comment=" + comment;

        $.ajax({
            url: url,
            type: 'GET',
            success: function (response, status, xhr) {
                if (callback)
                    callback(response, status, xhr, target);
                else
                    processResult(response, status, xhr, target);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                log("Error in doAjaxPost: ", textStatus);
                log("Error thrown: ", errorThrown);
            }
        });
    }

    // Options handlers
    function handleOptCbChange(e) {
        e.stopPropagation();
        e.preventDefault();

        let node = $(e.currentTarget);
        let checked = $(node)[0].checked;
        let key = $(node).val();
        GM_setValue(key, checked);
        debug("Setting opt ", key, " to '", checked, "'");

        // Both price by % and by $ less can't be selected.
        // Both lowest and RSP can't be selected
        // -or- let lowest have precedence (it would as is),
        // -or- make radio buttons :-)
        if (key == 'autoPricePctLess' && checked == true) {
            autoPriceAmtLess = false;
            $("[value='autoPriceAmtLess']").prop("checked", false);
            GM_setValue("autoPriceAmtLess", false);
        }
        if (key == 'autoPriceAmtLess' && checked == true) {
            autoPricePctLess = false;
            $("[value='autoPricePctLess']").prop("checked", false);
            GM_setValue("autoPricePctLess", false);
        }

        updateCbOpts();
        debug("Set option ", key, " to ", checked);

        // Always install favs, just hide if not enabled. Makes
        // it easier to get a consistent UI
        if (key == 'enableFavs') {
            if (enableFavs == true) {
                $("#xfaves").removeClass("xfaveshidden");
            } else {
                $("#xfaves").addClass("xfaveshidden");
            }
        }

        if (!autoPriceLowest || !rememberLastPrice)
            removeSellPageCtrls();
        else if (autoPriceLowest && rememberLastPrice && xedxDevMode)
            installSellPageCtrls($(controlsSel));

        return false;
    }

    function handleOptInputChange(e) {
        e.stopPropagation();
        e.preventDefault();

        let node = $(e.currentTarget);
        let key = $(node).attr("name");
        let value = $(node).val();

        let lastVal = GM_getValue(key, null);
        GM_setValue(key, value);

        if (key == "lastPriceExpireHrs") {
            if (lastVal != value) {
                lastPriceExpireHrs = value;
                resetAllExpireTimes();
            }
        }

        updateCbOpts();

        debug("change input, key: ", key, " value: ", value);
        return false;
    }

    function handleOptComboChange(e) {
        e.stopPropagation();
        e.preventDefault();

        let node = $(e.currentTarget);
        let key = $(node).attr("name") + "Value";
        let value = $(node).val();
        GM_setValue(key, value);
        updateCbOpts();

        debug("change combo, key: ", key, " value: ", value);
        return false;
    }

    // Market element handlers
    function handleQtyChange(e) {
        let target = e.currentTarget;
        let qty = $(target).val();
        let cost = $(target).attr('data-xcost');
        if (!cost || !qty) return;

        let msg = qty + " @ " + asCurrency(cost) + ":<br>" + asCurrency(qty * cost);
        $(target).tooltip("option", "content", msg);
        $(target).tooltip("open");
    }

    function processMarketBuy(e) {
        getCash();
        let target = e.currentTarget;
        let sellRow = $(target).closest("div [class^='sellerRow_']");
        let price = $(sellRow).find("[class^='price_']");
        let cost = $(price).text();
        let costStr = cost;
        if (cost) cost = cost.replace("$", '').replaceAll(',', '');
        let costNum = cost? parseInt(cost) : "not found";
        debug("Target: ", $(target));
        debug("price: '", price, "' cost: '", cost, "' str: '", costStr, "' num: '", costNum, "' cash: '", cashOnHand, "'");

        let canGet = Math.floor(cashOnHand / costNum);
        let avail = $(sellRow).find("[class^='available_']");
        let qtyStr = $(avail).text();
        if (qtyStr) {
            qtyStr = qtyStr.split(' ')[0];
            qtyStr = qtyStr.replaceAll(',', '');
        }
        let qty = parseInt(qtyStr);
        if (canGet > qty) canGet = qty;

        debug("Cost: '", costNum, "' can get: '", canGet, "' avail: '", avail, "' qtyStr: '", qtyStr, "' qty: '", qty, "'");

        // Save cost to use later if qty changes
        $(target).attr('data-xcost', cost);

        let uPay = asCurrency(canGet * cost);
        let msg = canGet + " @ " + costStr + ":<br>" + uPay;
        displayHtmlToolTip($(target), msg, "xma-tt");

        // Trigger new value
        target.select();
        $(target).val(canGet);
        target.dispatchEvent(new Event("input"));
        $(target).on('input', handleQtyChange);

        return false;  // Don't propogate
    }

    function changeHandler(e) {
        let target = e.currentTarget;
        let obj = idFromSellNode(target);
        let id = obj ? obj.id : null;
        let uniqueId = obj ? obj.unique : null;
        let value = $(target).val();
        if (value && id) writePrice(value, id, uniqueId);

        debug("change, ID: ", id, " value: ", value, " target: ", $(target));
    }

    function blurHandler(e) {
        let target = e.currentTarget;
        let obj = idFromSellNode(target);
        let id = obj ? obj.id : null;
        let uniqueId = obj ? obj.unique : null;
        let value = $(target).val();
        if (value && id) writePrice(value, id, uniqueId);

        debug("blur, ID: ", id, " value: ", value, " target: ", $(target));
    }

    function onRemoveFromPriceList(e) {
        log("onRemoveFromPriceList");
        let target = $(e.currentTarget);
        let root = $(target).closest("li");
        let key = $(root).attr("data-id");

        log("onRemoveFromPriceList, target: ", $(target), " root: ", $(root), " key: ", key);
        delete previousPriceList[key];
        writePriceList();

        $(root).remove();
    }

    // Separate fn so can be a callback if need to query lowest price
    // Save price with ID for later use.
    //
    // To accomodate unique weapons/armor, need additional unique id
    // So key can't just be itemId, maybe itemId-uniqueId ?
    // Need to clean/replace old list...
    //
    function writePrice(price, id, uniqueId) {
        debug("Write price for id: ", id, " unique:", uniqueId, " price: ", price);
        if (parseInt(price) == 0 || !id) return log("Skipped write: ", id, "|", price);

        let item = tornItemsList[id];
        let newObj = {id: id, price: price, unique: uniqueId, type: item.type};
        let newKey = id + '-' + uniqueId;

        // Calculate expire time
        // See if old obj exists, save exp. time?
        let oldObj = previousPriceList[newKey];
        if (oldObj) debug("has old object: ", oldObj);

        if (lastPriceExpireHrs == 0)
            newObj.expDate = 0;
        else
           setExpireDate(newObj, false);

        previousPriceList[newKey] = newObj;
        writePriceList();

        debug("Writing saved price obj, key: ", newKey, " obj: ", newObj);

        // Update the editable list
        let li = buildPricingLi(newKey, item.name, price, uniqueId);
        let sel = "#xprices input[name='" + newKey + "']";
        let elem = $(sel);
        if ($(elem).length) {
            $(elem).closest("li").replaceWith($(li));
        } else {
            $("#xprices").append($(li));
        }

        $("li .x-sellprice-remove").off('click.xedx');
        $("li .x-sellprice-remove").on('click.xedx', onRemoveFromPriceList);
    }

    function fillSellPrice(target, price, id, uniqueId=0) {
        debug("fillSellPrice for ID: ", id, " price: ", price, " unique: ", uniqueId);
        target.select();
        $(target).val(price);
        target.dispatchEvent(new Event("input"));

        // Only write to list if the option is enabled!!
        let isTypeOk = (lastPriceOnlyWandA == true) ? iswa(id) : true; // For 'weapons/armor only' opt
        if (rememberLastPrice == true && isTypeOk == true)
            writePrice(price, id, uniqueId);
    }

    function subtractMargin(price) {
        debug("subtractMargin, price: ", price, " amt? ", autoPriceAmtLess, " pct? ", autoPricePctLess);
        if (autoPriceAmtLess == true) {
            let newPrice = price - autoPriceAmtLessValue;
            debug("subtractMargin amt price: ", price, " minus ", autoPriceAmtLessValue, " return: ", newPrice);
            return newPrice;
        } else if (autoPricePctLess == true) {
            let pctOff = parseInt((+autoPricePctLessValue/100)*price);
            let newPrice = price - pctOff;
            debug("subtractMargin pct price: ", price, " minus pct ", autoPricePctLessValue, " (", pctOff, ") return: ", newPrice);
            return newPrice;
        }
        if (autoPriceAmtLess == true || autoPricePctLess == true)
            log("No price adjust set!");

        return price;
    }

    function idFromSellNode(target) {
        let infoDiv = $(target).closest("div [class^='info_']");
        let itemRow = $(target).closest("div [class^='itemRow_']");
        let controlNode = $(itemRow).find("button");
        let controls = $(controlNode).attr('aria-controls');
        debug("idFromSellNode, itemRow: ", $(itemRow), " controlNode: ", $(controlNode), " controls: ", controls);

        let itemId;       // Required to get lowest price, and save last price.
        let uniqueId;
        if (controls) {
            let parts = controls.split('-');
            itemId = parts[3];
            uniqueId = parts[4];
        }
        debug("ID: ", itemId, " unique: ", uniqueId);

        if (!itemId || !uniqueId)
            debugger;

        return {id: itemId, unique: uniqueId};
    }

    function setExpireDate(item, write=true) {
        debug("setExpireDate: ", lastPriceExpireHrs, "|", item);
        if (lastPriceExpireHrs == 0) {
            item.expDate = 0;
            log("The last sell price won't expire, hrs set to 0");
            return;
        }

        let expDate = new Date();
        let newHrs = +expDate.getHours() + +lastPriceExpireHrs;
        expDate.setHours(newHrs);
        item.expDate = expDate.getTime();

        // And write back
        if (write == true) writePriceList();
    }

    function resetAllExpireTimes() {
        let keys = Object.keys(previousPriceList);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            let item = previousPriceList[key];
            setExpireDate(item, false);
        }
        writePriceList();
        restorePriceList();
    }

    // See if a sell price for an item has expired. If so,
    // return true, otherwise false. If no exp time is set,
    // one is added. If 0, never expires.
    function isExpiredItem(item, write=true) {
        if (!item) {
            debug("isExpiredItem: invalid item, null");
            return false;
        }

        if (lastPriceExpireHrs == 0) {
            log("The last sell price won't expire, hrs set to 0");
            item.expDate = 0; // set in item also, just in case
            return false;
        }

        let now = new Date();
        let nowTime = now.getTime();

        debug("isExpiredItem: ", item, " item exp date: ", item.expDate,
              " now: ", nowTime, " exp hrs: ", lastPriceExpireHrs, " expired? ", (nowTime > item.expDate), " write: ", write);

        if (item.expDate == 0) return false;
        if (!item.expDate) {
            setExpireDate(item, write);
            debug("isExpiredItem: set date");
            return false;
        }
        if (nowTime > item.expDate) {
            debug("isExpiredItem: expired!", nowTime, item.expDate);
            return true;
        }

        return false;
    }

    var inSell = false;
    function resetSellFlag(){inSell = false;}

    function processMarketSell(e) {
        if (inSell) return false;
        inSell = true;
        setTimeout(resetSellFlag, 500);

        let target = e.currentTarget;
        let nickname = $(target).attr("placeholder");

        let infoDiv = $(target).closest("div [class^='info_']");
        let itemRow = $(target).closest("div [class^='itemRow_']");
        let controlNode = $(itemRow).find("button");
        let controls = $(controlNode).attr('aria-controls');
        debug("itemRow: ", $(itemRow), " controlNode: ", $(controlNode), " controls: ", controls);

        if (nickname == 'Qty') {
            let tmp = $(controlNode).find("[class^='title_'] [class^='name_']");
            let nameSpan = $(tmp).next();
            let useQty = 1;
            let qtyText = $(nameSpan).text();
            if (qtyText && qtyText.length)
                useQty = qtyText.replace('x', '');

            target.select();
            $(target).val(useQty);
            target.dispatchEvent(new Event("input"));
            return;
        }

        if (nickname != "Price") return;

        let itemId;       // Required to get lowest price, and save last price.
        let uniqueId = 0;
        if (controls) {
            let parts = controls.split('-');
            itemId = parts[3];
            uniqueId = parts[4];
            log("Parts: ", parts, " itemId: ", itemId, " unique: ", uniqueId);
        }

        debug("ID: ", itemId, " unique ID: ", uniqueId);

        let usePrice = 0;    // Will be price to fill in, could be low, RSP, last sale

        // If the "SellPageCtrls" option to let lowest price have precedence over
        // sell price is enabled, perhaps because the option for last sell price
        // on only armor and weapons is NOT set, need to look for lowest first.
        var lowPricePrecedence = false;
        if (xedxDevMode && lowPricePrecedence == true) {
            if (usePrice == 0 && autoPriceLowest == true) {
                findLowPriceOnMarket(itemId, target); // Fills price in resp. handler
                return false;   // What happens if no price found???
            }
        }

        let isTypeOk = (lastPriceOnlyWandA == true) ? iswa(itemId) : true; // For 'weapons/armor only' opt
        if (rememberLastPrice == true && isTypeOk == true) {
            let newKey = itemId + '-' + uniqueId;
            let obj = previousPriceList[newKey];

            // Check for an expired price
            debug("processMarketSell: check expired: ", obj);
            if (obj && isExpiredItem(obj) == true) {
                // remove object
                delete previousPriceList[newKey];
                writePriceList();
                obj = null;
            }

            usePrice = obj ? obj.price : 0;
            debug("Reading price for ", itemId, "-", uniqueId, " got ", obj);
            if (usePrice != 0) {
                fillSellPrice(target, usePrice, itemId, uniqueId);
                if (xedxDevMode == true)
                    $(target).css("color", savedPriceColor);
                return false;
            }
        }

        if (usePrice == 0 && autoPriceLowest == true) {
            findLowPriceOnMarket(itemId, target); // Fills price in resp. handler
            return false;
        }

        if (usePrice == 0 && autoPriceRSP == true) {
            let priceSpan = $(infoDiv).find("[class^='price_'] > span")[0];
            let rsp = $(priceSpan).text();
            if (rsp) {
                rsp = rsp.replace("$", '').replaceAll(',', '');
                usePrice = subtractMargin(rsp);
            }
        }

        fillSellPrice(target, usePrice, itemId, uniqueId);

        return false;  // Don't propogate
    }

    function handleSellItemSelect(e) {
        if (inSell) return;

        let thisTarget = $(e.currentTarget);
        let parent3 = $(thisTarget).closest("[class^='info_']");
        let moneyNode = $(parent3).find(".input-money-group input")[0];
        debug("handleSellItemSelect: ", $(thisTarget), $(parent3), $(moneyNode));

        let newE = {};  // e;
        newE.currentTarget = moneyNode;
        processMarketSell(newE);
    }

    function waitForBtnsAndClick(retries=0) {
        let btns = $("[class^='confirmButton_']");
        if ($(btns).length == 0) {
            if (retries++ < 20) return setTimeout(waitForBtnsAndClick, 50, retries);
            return log("Too many retries!");
        }
        if ($(btns).length > 1) {
            let buyBtn = $(btns)[0];
            $(buyBtn).click();
        }
    }

    function handleBuyBtn(e) {
        if (!quickBuy) return log("quickBuy not enabled!");
        waitForBtnsAndClick();
    }

    function handleDblClick(e) {
        if (isBuy() == true) {
            return processMarketBuy(e);
        }
        if (isSell() == true || isView() == true) {
            return processMarketSell(e);
        }
        console.error("Market Assist: unknown page?");
    }

    function addClickHandlers() {
        let btnList = $(".input-money:not([type='hidden'])");
        for (let idx=0; idx < $(btnList).length; idx++) {
            let btn = $(btnList)[idx];
            if (!$(btn).hasClass('xqb')) {
                $(btn).on('dblclick.xedx', handleDblClick);
                $(btn).addClass('xqb');

                // Add blur and/or change for sell page,
                // to always save sell price
                if (isSell()) {
                    $(btn).change(changeHandler);
                    //$(btn).blur(blurHandler);
                }
            }
        }

        $("[id^=itemRow-selectCheckbox]").on('click', handleSellItemSelect);

        if (quickBuy == true) {
            btnList = $("[class*='buyButton_']:not(.xqb)");
            for (let idx=0; idx < $(btnList).length; idx++) {
                let btn = $(btnList)[idx];
                if (!$(btn).hasClass('xqb')) {
                    $(btn).on('click.xedx', handleBuyBtn);
                    $(btn).addClass('xqb')
                }
            }
        }
    }

    function doViewPageInstall() {
        // Handlers for sell price
        addClickHandlers();

        // Add right-click to go to buy page for item? To check price?
    }

    // ============== UI installation and handlers ===================

    // Remember to add variables for new opts!
    const cbOptsArray = [
        {value: "fillMaxCanGet", type: "cb", label: "Fill max affordable", listItemId: "maxAffordable",
             help: "When double-click 'buy' quantity,<br>" +
                   "ony enter what you can afford<br>" +
                   "with cash on hand. Otherwise, <br>" +
                   "will fill with available quantity.",
             disabled: false, page: "buy"},
        {value: "quickBuy", type: "cb", label: "No buy confirmation", listItemId: "quickBuy",
             help: "When clicking 'buy', will<br>" +
                   "suppress the confirmation<br>" +
                   "prompt.",
             disabled: false, page: "buy"},
        {value: "eCostCalc", type: "cb", label: "Enable Energy Calculator (tbd)", listItemId: "eCostCalc",
             help: "When enabled, a table is available<br>" +
                   "thats calculates the best source<br>" +
                   "of energy, namely cans and FHCs,<br>" +
                   "based on current cost and cost<br>" +
                   "per e, e per cooldown, cooldown<br>" +
                   "per $, etc.",
             disabled: false, page: "buy"},
        {value: "enableScrollLock", type: "cb", label: "Enable scroll-lock", listItemId: "scrollLock",
             help: "When enabled, the right-hand<br>" +
                   "sidebar can scroll independently<br>" +
                   "of the central section.<br>" +
                   "Requires refresh to enable.",
             disabled: false, page: "both"},
        {value: "rememberLastPrice", type: "cb", label: "Use Last Sell Price", listItemId: "lastPrice",
             help: "Remember and fill in<br>" +
                   "the last price you sold<br>" +
                   "this type of item for.<br>" +
                   "If never priced before will<br>" +
                   "display '0'. If 0, low price<br>" +
                   "and then RSP are used if enabled",
             disabled: false, page: "sell"},
        {value: "lastPriceOnlyWandA", type: "cb", label: "...but only for weapons/armor", listItemId: "lastPriceOnlyWandA",
             help: "Only fill in the last<br>" +
                   "price for weapons and armor.<br>" +
                   "This is intended for special<br>" +
                   "RW bonus items.",
             disabled: false, page: "sell"},
        {value: "lastPriceExpireHrs", type: "input", label: "Price expires after # hours", listItemId: "expireHrs",
             help: "After so many hours, the<br>" +
                   "last sell price becomes<br>" +
                   "invalid, and won't be used.",
             disabled: false, page: "sell"},
        {value: "autoPriceLowest", type: "cb", label: "Use Lowest (needs API)", listItemId: "lowPrice",
             help: "Auto-fill with lowest current<br>" +
                   "price. Requires an API key and<br>"+
                   "will be slightly slower than the<br>" +
                   "other options. The 'Last Sell<br>" +
                   "Price' option takes precedence<br>"+
                   "over this if enabled.",
             disabled: false, page: "sell"},
        {value: "autoPriceRSP", type: "cb", label: "Use RSP", listItemId: "rspPrice",
             help: "Auto-fill with shown RSP.<br>" +
                   "Last sell price and lowest<br>" +
                   "price options take precedence<br>" +
                   "if enabled.",
             disabled: false, page: "sell"},
        {value: "autoPricePctLess", type: "combo", label: "Price # % Less", listItemId: "pctPricing",
             help: "Make the price X percent<br>" +
                   "less than current lowest",
             disabled: false, page: "sell"},
        {value: "autoPriceAmtLess", type: "combo", label: "Price # $ Less", listItemId: "amtPricing",
             help: "Make the price X dollars<br>" +
                   "less than current lowest",
             disabled: false, page: "sell"},
        {value: "enableFavs", type: "cb", label: "Enable Favorites List", listItemId: "favList",
             help: "Enables saving favorite items<br>" +
                   "to a window for quick access.",
             disabled: false, page: "buy"},
        {value: "marketWatch", type: "cb", label: "Enable Market Watch (MW)", listItemId: "mktWatch",
             help: "Get notified when selected items<br>" +
                   "hit a low price that you set",
             disabled: false, page: "both"},
        {value: "marketWatchAnyPage", type: "cb", label: "Market Watch Any Page", listItemId: "mktWatchAll",
             help: "Run Market Watch no matter<br>" +
                   "what page you are on, not<br>" +
                   "just when at the Item Market",
             disabled: false, page: "both"},
        {value: "mwNotifyTimeSecs", type: "input", label: "Notification timeout: #", listItemId: "mwTimeout",
             help: "A Market Watch notification<br>" +
                   "will stay on screen this many<br>" +
                   "seconds at most, or until clicked.",
             disabled: false, page: "both"},
        {value: "mwNotifyTimeBetweenSecs", type: "input", label: "Time between: #", listItemId: "mwTimeBetween",
             help: "The time in secs until another<br>" +
                   "notification may be displayed<br>" +
                   "since the last was closed.",
             disabled: false, page: "both"},
        {value: "mwBetweenCallDelay", type: "input", label: "Item call delay: #", listItemId: "mwCallDelay",
             help: "The time between price checks for<br>" +
                   "an individual item, in seconds.",
             disabled: false, page: "both"},
        {value: "mwItemCheckInterval", type: "input", label: "List call delay: #", listItemId: "mwCallInterval",
             help: "The time between restarting checks<br>" +
                   "for all items in your list. It will<br>" +
                   "start a new check after the LAST item<br>" +
                   "in the list has been checked, so total<br>" +
                   "delay is the item delay times list size<br>" +
                   "plus this value, which is in seconds.",
             disabled: false, page: "both"},
        {value: "mwMaxWatchListLength", type: "input", label: "Max list length: #", listItemId: "mxMaxListLen",
             help: "The maximum number of things<br>" +
                   "that can be selected to watch at<br>" +
                   "once. Too many may hit API call<br>" +
                   "limits. If you exceed this, list<br>" +
                   "entries can be deleted or disbaled<br>" +
                   "on the options page.",
             disabled: false, page: "both"},
    ];

    var inAnimate = false;
    const resetAnimate = function () {inAnimate = false;}

    var countBuyOpts = cbOptsArray.length;
    function handleOptsClick(e) {
        let classy = $("#xma-opts-wrap").hasClass('xmahidden');
        if (inAnimate == true) return;
        inAnimate = true;
        let closing = true;
        if (classy) {
            closing = false;
            $("#xma-opts-wrap").removeClass('xmahidden');
        } else {
            $("#xma-opts-wrap").addClass('xmahidden');
        }

        // close any tooll tips floating around
        closeAnyTooltips();


        let height = $("#xma-opts-wrap").height();

        let size = isSell() ? (8 * 24 + 10) : (countBuyOpts * 24 + 10);
        let newWrapHeight = (closing == false) ? (size + "px") : "0px";
        let newSpanHeight = (closing == false) ? "24px" : "0px";
        let newInputHeight = (closing == false) ? "14px" : "0px";
        let newHdrHeight = (closing == false) ? "34px" : "0px";
        let newHdrDivHeight = (closing == false) ? "100%" : "0px";
        let op = (closing == false) ? 1 : 0;

        debug("animate: ", newWrapHeight, " | ", newSpanHeight, " | ", op);

        $("#xma-opts-wrap").animate({
            height: newWrapHeight,
            opacity: op
        }, 500, function () {
            debug("Set #xma-opts-wrap to: ", $("#xma-opts-wrap").height());
            inAnimate = false;
        });

        $("#xoptshdr").animate({height: newHdrHeight, opacity: op}, 500);
        $("#xoptshdr > div").animate({height: newHdrDivHeight, opacity: op}, 500);
        $(".xma-opts-nh").animate({height: newSpanHeight}, 500);
        $(".numInput-nh").animate({height: newInputHeight}, 500);
        $("#xprices > li").animate({height: newSpanHeight}, 500);

        if (closing == true) updateCbOpts();

        return false;
    }

    function closeAnyTooltips() {
        // close any tooll tips floating around
        let ttList = $("[id^='ui-id-'][role='tooltip']");
        debug("Tooltips: ", $(ttList));
        for (let idx=0; idx<$(ttList).length; idx++) {
            log("Removing tool tip: ", $(ttList)[idx], "|", $($(ttList)[idx]));
            $($(ttList)[idx]).remove();
        }
    }

    function getCash() {
        let tmp = $(cash).attr('data-money');
        if (tmp) cashOnHand = tmp;
        return cashOnHand;
    }

    function getCashOnHand(retries=0) {
        if ($(cash).length < 1) {
            if (retries++ < 20) return setTimeout(getCashOnHand, 200);
            return log("Didn't find cash node! (retires = ", retries, ")");
        }

        cashOnHand = $(cash).attr('data-money');
        debug("Cash on hand: ", cashOnHand);
    }

    // =================================== UI components ===================================
    //

    function callWhenElementExistsEx(closestRoot, selector, callback) {
        if (!$(closestRoot).length)
            return console.error("ERROR: observer root does not exist!");

        const context = { sel: selector, cb: callback, found: false };
        const observer = new MutationObserver((mutations, observer) => {
           localMutationCb(mutations, observer, context)
        });

        observer.observe($(closestRoot)[0], { attributes: false, childList: true, subtree: true });

        function localMutationCb(mutations, observer, context) {
            if ($(context.sel).length > 0) {
                observer.disconnect();
                context.cb($(context.sel));
            }
        }
    }

    function installItemContextMenus(retries=0) {
        //log("installItemContextMenus: ", marketWatch, "|", enableFavs);
        if (marketWatch != true && enableFavs != true) return;
        if (isSell()) return;

        let selector = "div[class^='imageWrapper_']";

        //log("installItemContextMenus: ", retries, " len: ", $("div[class^='imageWrapper_']").length);
        if ($("div[class^='imageWrapper_']").length == 0) {
            if (retries++ < 30) return setTimeout(installItemContextMenus, 200, retries);
            return log("installItemContextMenus : Too many retries: ", retries);
        }

        debug("installItemContextMenus, installing: ", $("div[class^='imageWrapper_']"));
        $("div[class^='imageWrapper_']").each(function(index, element) {
            if (!$(element).hasClass("xf")) {
                $(element).addClass("xf");
                $(element).on("contextmenu", function(e) {
                    let target = e.currentTarget;
                    e.preventDefault(); // Prevent default right-click menu

                    let menuHtml = getItemsContextMenu();
                    let menu = $(menuHtml);
                    $(menu).css({top: e.pageY,left: e.pageX});
                    $("body").append(menu);
                    menu.show();

                    $(".custom-menu li").click(function() {
                        var choice = $(this).attr("data-action");
                        // Do something based on the choice. But really is no choice...
                        //debug("Menu choice: ", choice);
                        if (choice == 'addFavorite')
                            handleAddFavorite(target);
                        if (choice == 'addWatch')
                            handleAddWatch(target);
                        menu.remove(); // Remove the menu
                    });

                    // Hide menu when clicking outside
                    $(document).on("click", function(e) {
                        if (!$(e.target).closest(".context-menu").length) {
                            menu.remove();
                        }
                    });
                });
            }
        });
    }

    function removeUI() {
        $("#xma-help-btn").remove();
        $("#xfaves").remove();
        $("#xma-outer-opts").remove();
        $("#xoptshdr").remove();
        //$("#xma-opts-div").remove();

    }

    // On the seller's (add listing) page, categories, tabs, etc to allow us
    // to put current low prices by items.
    //
    // Selector for list of tabs/buttons
    const tabButtonsSel = "#item-market-root [class^='addListingWrapper_'] [class^='tabsWrapper_'] > div > button";
    const tabBtnChildSel = "#item-market-root [class^='addListingWrapper_'] [class^='tabsWrapper_'] > div > button > i";
    const tabWrapSel = "#item-market-root [class^='addListingWrapper_'] [class^='tabsWrapper_']";
    const activeBtnSel = "#item-market-root [class^='addListingWrapper_'] [class^='tabsWrapper_'] > div > [aria-selected='true']";
    const itemListRootSel = "#item-market-root [class^='addListingWrapper_'] [class^='panels_'] > div";
    const controlsSel = "[class^='addListingWrapper_'] > div > [class^='controls_']";

    var activeCategoryBtn;

    // Categories, index by tab position
    //var categoriesIndexed = [];

    // Add curr lowest price to items on sell page
    function getLowPricesForSellItems() {

    }

    // Handle changing category via top row of tabs
    function handleSellCatSelect(e) {
        let target = $(e.currentTarget);
        let index = $(target).index();
        let category = itemCategories[index];

        if (xedxDevMode == true) {
            log("handleSellCatSelect: ", $(target),
                " index: ", $(target).index(), " category: ", category);
        }
    }

    // Wait until the item category tabs exist before continuing
    function installSellTabHandlersEx() {
        log("installSellTabHandlersEx");
        callWhenElementExistsEx("#item-market-root", activeBtnSel, itemTabsCb);
        callWhenElementExistsEx("#item-market-root", controlsSel, controlsCb);

        // The option to select last price/low price has precedence.
        // If both enabled, last sell is first, then lowest. What if
        // this is used but neither (or just one) option is enabled?
        // ..just don't offer, in that case. If Last Price is chosen,
        // don't need to do anything, otherwise, check low price first...
        function controlsCb(node) {
            log("controlsCb: ", rememberLastPrice, autoPriceLowest);
            if (xedxDevMode && rememberLastPrice && autoPriceLowest)
                installSellPageCtrls(node);
        }

        function itemTabsCb(node) {
            activeCategoryBtn = $(node);
            addLowPriceSellPageHandlers();
        }
    }

    // Move to addStyles()
    GM_addStyle(`
        #x-sell-cbs {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            margin-left: auto;
            float: right;
        }
        #x-sell-cbs span, input {
                display: inline-flex;
                flex-flow: row wrap;
                margin-left: 5px;
                align-items: center;
                font-size: 10pt;
            }
    `);

    function removeSellPageCtrls() {
        $("#x-sell-cbs").remove();
    }

    function installSellPageCtrls(node) {
        if ($("#x-sell-cbs").length == 0) {
            let helpText = "Select what price to put into<br>" +
                           "the price box on double-click.<br>" +
                           "This over-rides the global options,<br>"
                           "where the last price takes precedence.";

            let sellOptsSpan = `
                <span id='x-sell-cbs'>
                    <span class="xma-opts-nh">Double-Click fills with: </span>
                    <input type="radio" class="xma-opts-nh xma-cb" name="sellPriceOpt" value="useLowPrice">
                    <span class="xma-opts-nh">Lowest or </span>
                    <input type="radio" class="xma-opts-nh xma-cb" name="sellPriceOpt" value="useLastPrice">
                    <span class="xma-opts-nh">Last price</span>
                </span>`;

            $(node).append(sellOptsSpan);

            displayToolTip($("#x-sell-cbs"), helpText, "tooltip4");
        }
    }

    function addLowPriceSellPageHandlers(retries=0) {
        let sellPgCategoryBtns = $(tabButtonsSel);
        if ($(sellPgCategoryBtns).length < 20) {// should have 25...
            if (retries++ < 20) return setTimeout(addLowPriceSellPageHandlers, 200, retries);
            return debug("Too many retries: ", retries, $(sellPgCategoryBtns));
        }

        $(sellPgCategoryBtns).on('click', handleSellCatSelect);

        // Classes/categories. Cache for later? in storage...
        if (!itemCategories.length) {
            let sellPgCatBtnsClasses = $(tabBtnChildSel);
            for (let idx=0; idx < $(sellPgCatBtnsClasses).length; idx++) {
                let node = $(sellPgCatBtnsClasses)[idx];
                if (!node) {
                    debug("ERROR: Missing node! ", idx, $(sellPgCatBtnsClasses));
                    debugger;
                }
                let className = node.classList[0];
                let parts = className ? className.split("_") : null;
                itemCategories[idx] = parts ? parts[0] : "unknown";
            }
            //itemCategories = categoriesIndexed;
        }

        if (xedxDevMode == true) log("Categories: ", itemCategories);

        let activeIdx = $(activeCategoryBtn).index();
        let activeCat = itemCategories[activeIdx];
        if (xedxDevMode == true) log("Active Btn: ", $(activeCategoryBtn), " idx: ", activeIdx, " cat: ", activeCat);

        // items panel
        let itemsListRoot = $(itemListRootSel);
        if (xedxDevMode == true) log("Items list Root: ", $(itemsListRoot));

        let itemList = $(itemsListRoot).children("div");
        if (xedxDevMode == true) log("Item list: ", $(itemList));

    }

    const getHelpBtnElement = function () {return `<div id="xma-help-btn"><span>Market Assist</span></div>`;}

    function installUi(retries = 0) {
        let page = 'unknown';
        if (location.hash.indexOf("market/view") > -1) page = 'buy';
        else if (location.hash.indexOf("addListing") > -1) page = 'sell';
        else if (location.hash.indexOf("viewListing") > -1) page = 'view';
        else return log("not on a known page. ", location.hash);

        debug("installUI: ", page, "|", $("#xma-help-btn").length);

        if (page == "view") {
            doViewPageInstall();
            return;
        }

        if ($("#xma-help-btn").length == 0) {
            if (page == 'buy') {
                let wrapper = $("[class^='searchWrapper_']");
                if (!$(wrapper).length) {
                    if (retries++ < 20) return setTimeout(installUi, 250, retries);
                    return log("Too many retries!");
                }

                $(wrapper).after(getHelpBtnElement());
                callOnContentComplete(getCashOnHand);

                // Always install favs but hide if not enabled, to keep opts div consistent
                // Same with watch list? If no watch list, go back to old Buy menu style?
                // Watch List is part of reg opts menu now...
                installFavorites();
                if (enableFavs == false)
                    $("#xfaves").addClass("xfaveshidden");
            }

            if (page == 'sell') {
                let target = $("[class^='addListingWrapper_'] [class^='itemsHeader_']");
                debug("On sell: ", $(target));
                if ($(target).length = 0) return log("Couldn't find sell target");
                $(target).css("flex-direction", "row");
                $(target).append(getHelpBtnElement());
            }
        }

        if ($("#xma-help-btn").length > 0) {
            buildOptsDiv();

            installItemContextMenus();

            // Options w/just a checkbox
            $(".xma-cb").each(function(index, element) {
                $(element).on("change", handleOptCbChange);
                let key = $(element).val();
                $(element)[0].checked = GM_getValue(key, false);
            });

            // Input value only.
            $(".xma-input").each(function(index, element) {
                $(element).on("change", handleOptInputChange);
                let key = $(element).attr("name");
                let value = GM_getValue(key, 0);
                $(element).val(value);
            });

            // Checkbox AND value
            $(".xma-combo").each(function(index, element) {
                $(element).on("change", handleOptComboChange);
                let key = $(element).attr("name") + "Value";
                let value = GM_getValue(key, 0);
                $(element).val(value);
            });

            $("#xma-opts-wrap").next().css("margin-top", "-10px");
            $(".xma-opts-nh").css("height", "0px");
            $(".numInput-nh").css("height", "0px");

            $("#xma-help-btn").on('click.xedx', handleOptsClick);
        } else {
            debugger;
            console.error("Problem installing UI!");
        }

        if (page == 'sell') {
            installSellTabHandlersEx();
            addLockStyles();
            addItemLocks();
        }

    }

    // =================================== Favorites ===================================
    //
    function  uninstFavesMenus() {
        //$("[class^='imageWrapper_']").off("contextmenu.xedx");
    }

    function getItemsContextMenu() {
        if (marketWatch != true && enableFavs != true) return;

        let fullMenu = `
            <ul class='custom-menu'>
                <li data-action="addFavorite">Add To Favorite</li>
                <li data-action="addWatch">Add To Watch List</li>
            </ul>
        `;
        let noWatchMenu = `
            <ul class='custom-menu'>
                <li data-action="addFavorite">Add To Favorite</li>
            </ul>
        `;
        let noFavsMenu = `
            <ul class='custom-menu'>
                <li data-action="addWatch">Add To Watch List</li>
            </ul>
        `;

        if (marketWatch != true) return noWatchMenu;
        if (enableFavs != true) return noFavsMenu;

        return fullMenu;
    }

    function removeFavorite(elem) {
        let id = $(elem).attr("data-id");
        debug("removeFavorite: ", id);
        $(elem).remove();
        delete favorites[id];
        saveFavorites();
    }

    function handleClickRemove(e) {
        let target = $(e.target);
        let node = $(target).closest(".xfav-item");
        removeFavorite(node);
    }

    const maxFaves = 8;

    function addFavorite(id, name, type, fromStgHandler) {
        let encName = name.trim().replaceAll(' ', '%20');
        let favList = $("#xfaves-list .xfav-item");

        favorites[id] = {name: name, type: type};
        if ($("#xfaves").find("[data-id='" + id + "']").length) {
            return;
        }

        if ($(favList).length == maxFaves) {
            let first = $(favList)[0];
            removeFavorite(first);
        }

        let newFav = $(getImgDiv(id, type));
        let xbtn = $(newFav).find(".x-remove-fav")[0];
        $(xbtn).on('click', handleClickRemove);
        displayToolTip($(newFav), name, "tooltip4");
        displayHtmlToolTip($(xbtn), "Click to remove<br>from favorites", "tooltip4");

        $(newFav).on('click', function () {
            closeAnyTooltips();
            const URL = "https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&" +
                      "itemID=" + id  + "&itemName=" + encName +
                      (type ? ("&type=" + type) : "") +
                      "&fromTima=true";
            location.href = URL;
        });

        $("#xfaves-list").append(newFav);
        saveFavorites(fromStgHandler);
    }

    function handleAddFavorite(target) {
        let img = $(target).find("img");
        let name = $(img).attr("alt");
        let src = $(img).attr('src');
        let id;
        if (src) id = src.replace(/\D/g, "");
        if (!id) {
            log("ERROR: Missing id: ", $(img));
            return;
        }

        let item = tornItemsList[id];
        let type = item ? item.type : undefined;
        addFavorite(id, name, type);
    }

    var updateTtInterval = xedxDevMode ? 30000 : 120000; // two minutes
    var getPriceInterval = 5000;
    var favsTimer;

    // Have max 8 faves, just space out say 5 secs
    // This is called every updateTtInterval ms
    function updateFavsToolTips() {
        let keys = Object.keys(favorites);
        let timeout = getPriceInterval;
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx]; // key is item id
            let fav = favorites[key];
            let sel = "#fav-" + key;

            setTimeout(findLowPriceOnMarket, timeout, key, $(sel), updateTtCb);
            timeout += getPriceInterval;
            // callback(response, status, xhr, target);
        }

        function updateTtCb(jsonObj, status, xhr, target) {
            let listings, item, cheapest, name, itemId;
            let market = jsonObj.itemmarket;
            if (market) item = market.item;
            if (item) {
                name = item.name;
                itemId = item.id;
            }

            debug("updateTtCb, item: ", item);

            if (market) listings = market.listings;
            if (listings) cheapest = listings[0];

            if (cheapest) {
                let newText = name + ": " + asCurrency(cheapest.price);
                changeTtText(itemId, newText);
                debug("updateTtCb: changed text to: ", newText);
            }
        }

        function changeTtText(id, text) {
            let sel = "#fav-" + id;
            $(sel).tooltip('option', 'content', text);
        }
    }

    function restoreSavedFaves(fromStgHandler) {
        $("#xfaves-list").empty();
        let keys = Object.keys(favorites);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            if ($("#xfaves").find("[data-id='" + key + "']").length)
                continue;
            addFavorite(key, favorites[key].name, favorites[key].type, fromStgHandler);
        }

        // Periodicall get the low price for the favorite, to add to tooltip.
        if (favsTimer) clearInterval(favsTimer);
        favsTimer = null;
        if (keys.length) {
            updateFavsToolTips();
            favsTimer = setInterval(updateFavsToolTips, updateTtInterval); // every 2 minutes
        }
    }

    function installFavorites() {
        if ($("#xfaves").length == 0) {
            let target = $("[class^='marketWrapper_'] [class^='itemListWrapper_'] [class^='itemsHeader_']")[0];
            $(target).before(getFavsDiv());

            // If enabled, periodically get fav low price, put in tooltip?
        }

        restoreSavedFaves();
    }

    // =============================== Watch list UI, similar to faves =========================

    function priceAsNum(price) {
        if (!price) return 0;
        let str = price.toString().trim();
        str = str.replaceAll(',', '').replaceAll('$', '').replaceAll(' ', '');
        return parseInt(str);
    }

    // also not working.. must be being re-drawn,
    function fixupExpandedWatches() {
        debug("fixupExpandedWatches");
        $("#xwatches > li .watch0").css("display", "flex");
        $("#xwatches > li .watch4").css("display", "flex");
        $("#xwatches .xprice-price").css("width", watchPriceW2);
    }

    // When I remove, table gets changed, for the worse.
    // So hide and remove from list - won't get added later
    function removeWatch(e) {
        let expanded = (parseInt($("#xleft-opts").width()) < 10) ? true : false;
        let target = e.currentTarget;
        let li = $(target).closest("li");
        let id = $(li).attr("data-id");
        delete watchList[id];
        $(li).remove();

        saveWatchList();

        if (expanded == true)
            fixupExpandedWatches();
    }

    function onChangeWatchLimit(e) {
        let target = $(e.currentTarget);
        let id = $(target).attr('name');
        let value = $(target).val();
        let limit = priceAsNum(value); //.replaceAll('$', '').replaceAll(',', '');
        if (logWatchList == true) log("onChangeWatchLimit, id: ", id, " value: ", value, " target: ", $(target));

        watchList[id].limit = limit;
        $(target).val(asCurrency(limit));

        saveWatchList();
    }

    function disableWatchItem(e) {
        let target = e.currentTarget;
        let itemId = $(target).attr("data-id");
        let checked = $(target)[0].checked;

        if (logWatchList == true) log("disableWatchItem id: ", itemId, " checked: ", checked);

        let obj = watchList[itemId];
        obj.disabled = checked;
        saveWatchList();
    }

    function disableWatchList(e) {
        let target = e.currentTarget;
        let checked = $(target)[0].checked;
        GM_setValue("watchListDisabled", checked);

        /*
        if (checked == true)
            GM_setValue("watchListDisabled", true);
        else {
            GM_setValue("watchListDisabled", false);
            refreshWatchList();
        }
        */
    }

    function handleWatchImgClick(e) {
        let target = $(e.currentTarget);
        let key = $(target).closest("li").attr("data-id");
        let obj = watchList[key];
        let encName = obj.name.trim().replaceAll(' ', '%20');
        let URL = "https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&" +
                      "itemID=" + obj.id  + "&itemName=" + encName +
                      (obj.type ? ("&type=" + obj.type) : "") +
                      "&fromTima=true";
        location.href = URL;
        //window.open(URL, '_blank');
    }

    function addWatchObjToUI(item, fromStgHandler) {
        if (logWatchList == true) log("addWatchObjToUI, obj: ", item);

        if (!item || !item.id) debugger;

        if ($("#xwatches").find("[data-item='" + item.id + "']").length) {
            if (logWatchList == true) log("Item ID ", item.id, ", ", item.name, " already in watch list!");
            return;
        }

        let li = $(buildItemWatchLi(item.id, item.name, item.limit));

        $("#xwatches").append(li);
        $(li).find(".x-watch-remove").on('click', removeWatch);

        $(li).find("img").on('click', handleWatchImgClick);
        /*
        // Add click handler to image....
        $(newFav).on('click', function () {
            closeAnyTooltips();
            const URL = "https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&" +
                      "itemID=" + id  + "&itemName=" + encName +
                      (type ? ("&type=" + type) : "") +
                      "&fromTima=true";
            location.href = URL;
        });
        */

        let cb = $(li).find(".xma-disable-cb");
        $(cb).change(disableWatchItem);

        if (!item.disabled) item.disabled = false;
        $(cb).prop("checked", item.disabled);

        let sel = "#xwi-" + item.id;
        if (!item.limit || Number(item.limit) == 0) {
            findLowPriceOnMarket(item.id, $(sel));
        }
        $(sel).change(onChangeWatchLimit);
    }

    function exceedsWatchLimit() {
        let countLi = $("#xwatches li").length;
        let countDisabled = $("#xwatches").find("input[type='checkbox']:checked").length;
        let countEnabled = countLi - countDisabled;
        let exceedslimit = countEnabled >= mwMaxWatchListLength;
        if (logWatchList == true) log("Enabled watches: ", countEnabled, "|", countLi, "|", countDisabled);
        if (exceedslimit && GM_getValue("suppressWatchLimit", false) != true) {
            if (!confirm("The maximum allowed number of items are already in the list!\n" +
                         "You can set the limit higher, disable some, or remove some.\n" +
                         "To prevent this from appearing again, press Cancel, otherwise, OK.\n\n" +
                         "Press 'OK' to continue to show this message."))
            {
                GM_setValue("suppressWatchLimit", true);
            }
        }

        return exceedslimit;
    }

    function addWatch(id, name, type, price=0, timeout) {
        if (logWatchList == true) log("addWatch, id: ", id, " name: ", name, " type:", type, " price limit: ", price, " timeout: ", timeout);
        let obj = {id: id, name: name, limit: price, currLow: 0,
                   lastNotify: 0, type: type, timeout: (timeout ? timeout : 30), disabled: false};
        if (logWatchList == true) log("Obj: ", obj);
        watchList[id] = obj;

        // If already in the UI, we're done.
        if ($("#xwatches").find("[data-item='" + id + "']").length) {
            if (logWatchList == true) log("Item ID ", id, ", ", name, " already in watch list!");
            return;
        }

        if (exceedsWatchLimit()) {
            log("Exceeded set limit of enabled watches: ", mwMaxWatchListLength);
            return;
        }

        addWatchObjToUI(obj);

        saveWatchList();
    }

    function handleAddWatch(target) {
        if (marketWatch != true) return;
        if (logWatchList == true) log("handleAddWatch, target: ", $(target));
        let img = $(target).find("img");
        let name = $(img).attr("alt");
        let src = $(img).attr('src');
        let id;
        if (src) id = src.replace(/\D/g, "");

        if (logWatchList == true) log("handleAddWatch, img: ", $(img), " name: ", name, " src:", src, " id: ", id);
        if (!id) {
            if (logWatchList == true) log("ERROR: Missing id: ", $(img));
            return;
        }

        let priceNode = $(target).parent().find("[class^='priceAndTotal_'] > span");
        if (logWatchList == true) log("priceNode: ", $(priceNode));
        let price = $(priceNode).text();
        if (price) {
            price = price.replaceAll('$', '').replaceAll(',', '').replaceAll(' ', '').trim();
        } else {
            price = 0;
        }

        let item = tornItemsList[id];
        let type = item ? item.type : undefined;
        addWatch(id, name, type, price);

        if ($("#xma-opts-wrap").hasClass('xmahidden')) handleOptsClick();
        $(`#xwi-${id}`).focus();
    }

    // ========================= Market Watch, can run independently ===============
    //
    function resetPriceChecks() {
        GM_setValue("priceChecks", 0);
    }

    function startMarketWatch() {
        if (checkCloudFlare()) return log("Won't run while challenge active!");
        log("startMarketWatch, running: ", marketWatchRunning);
        if (marketWatchRunning == true) return;

        setInterval(resetPriceChecks, 60000);

        if (logOptions) logMarketWatchOpts();

        var doNotShowAgain = false;
        var canShowAfterMinutes = 10;

        marketWatchRunning = true;
        refreshWatchList();

        function refreshWatchList() {
            if (GM_getValue("watchListDisabled", false) == true) {
                if (logWatchList == true) log("watchlist disabled");
                setTimeout(refreshWatchList, 10000);
                return;
            }
            if (logWatchList == true) log("refreshWatchList");
            let delay = mwBetweenCallDelay * 1000;
            let keys = Object.keys(watchList);

            if (logWatchList == true) log("Refreshing ", keys.length, " watched items");

            for (let idx=0; idx < keys.length; idx++) {
                let itemId = keys[idx];
                let item = watchList[itemId];
                if (item.disabled == true) continue;
                //findLowPriceOnMarket(itemId, null, processMwResult);
                delay = (mwBetweenCallDelay * 1000) * (idx + 1);
                setTimeout(findLowPriceOnMarket, delay, itemId, null, processMwResult);
                //schedulePriceLookup(delay, itemId);
            }
            setTimeout(refreshWatchList, (mwItemCheckInterval * 1000) + delay);
        }


        var lookupTasks = [];
        var lookupsInProgress = 0;
        const maxLookups = 5;
        const lookupInterval = 3; // time between, seconds....

        // Never allow low price lookups closer than 'n' seconds apart...
        /*
        function schedulePriceLookup(delay, itemId, p1, callback) {
            if (lookupsInProgress == 0) {
                setTimeout(findLowPriceOnMarket, delay, itemId, p1, callback);
                lookupsInProgress;
            }

            function localLookupCb(jsonObj, status, xhr) {

            }
        }
        */

        // Process ajax result, similar to low price finder
        var lookupsPaused = false;
        function resetLookups() {lookupsPaused = false;}

        function processMwResult(jsonObj, status, xhr) {
            if (jsonObj.error) {
                console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
                if (jsonObj.error.code == 5) {
                    if (lookupsPaused == false) {
                        lookupsPaused = true;
                        setTimeout(resetLookups, 60000);
                    }
                }
                return;
            }
            if (logWatchList == true) {
                log("processMwResult");
                log("isNotifyOpen? ", isNotifyOpen());
            }
            let listings, item, cheapest, name, itemId;
            let market = jsonObj.itemmarket;
            if (market) item = market.item;
            if (item) {
                name = item.name;
                itemId = item.id;
            }
            if (!watchList[itemId]) return log("ERROR: no item found for id ", itemId, " item: ", item);

            if (market) listings = market.listings;
            if (listings) cheapest = listings[0];

            if (logWatchList == true) {
                log("processMwResult: ", name, " id: ", itemId, " cheapest: ", cheapest.price);
            }
            if (cheapest && itemId) {
                let price = cheapest.price;
                watchList[itemId].currLow = price;
                let limit = watchList[itemId].limit;
                let priceStr = asCurrency(price);

                if (logWatchList == true) log("processMwResult: ", price, "|", limit, "|", doNotShowAgain, "|", (price <= limit));
                if (logWatchList == true) log("isNotifyOpen? ", isNotifyOpen());

                if (price <= limit) {
                    //if (doNotShowAgain == false)
                    //debugger;
                    doBrowserNotify(item, price); //name, price, itemId);
                }
            }
        }

        const resetShowAgain = function() {doNotShowAgain = false;}

        function doBrowserNotify(item, cost) {
            if (logWatchList == true) log("doBrowserNotify, isNotifyOpen: ", isNotifyOpen(), " do not show:", doNotShowAgain);

            if (isNotifyOpen() == true) {
                if (logWatchList == true) log("doBrowserNotify: not showing, is open");
                return; // || doNotShowAgain == true) return;
            }

            let now = new Date().getTime();
            let diff = (now - item.lastNotify) / 1000;
            if (diff < mwNotifyTimeBetweenSecs) {
                if (logWatchList == true) log("doBrowserNotify: not showing, diff: ", diff, " time between: ", mwNotifyTimeBetweenSecs);
                return;
            }

            setNotifyOpen();

            item.lastNotify = now;
            saveWatchList();

            let msgText = "The price of " + item.name + " is available " +
                "at under " + cost + "!\n\nClick to go to market...";

            let smMsgText = item.name + " available now for " + asCurrency(cost);
            if (xedxDevMode == true)
                smMsgText = item.name + ": " + asCurrency(cost) + " [" + pageId + "-" + title + "]";

            // For now just show once. Make an option later
            /*
            doNotShowAgain = true;
            if (canShowAfterMinutes > 0) {
                let afterMs = canShowAfterMinutes * 60 * 1000;
                setTimeout(resetShowAgain, afterMs);
            }
            */

            let opts = {
                title: 'Item Market Alert',
                text: smMsgText, //msgText,
                tag: item.id,      // Prevent multiple msgs if it sneaks by my checks.
                image: 'https://imgur.com/QgEtwu3.png',
                //timeout: item.timeout ? item.timeout * 1000 : mwNotifyTimeSecs * 1000,
                onclick: (context) => {
                    setTimeout(notifyReset, mwItemCheckInterval*1000); // ??? not needed???
                    handleNotifyClick(context);
                }, ondone: () => {
                    setTimeout(notifyReset, mwItemCheckInterval*1000);
                }
            };

            /*
            let noTO = false;
            if (+item.id == 330 && noTO == true) {   // was a test, forgot result...
                log("****  Boxing gloves!  No timeout! ****");
            } else {
                //log(" Setting timout");
                opts.timeout = mwNotifyTimeSecs * 1000;
            }
            */
            opts.timeout = mwNotifyTimeSecs * 1000;


            GM_notification ( opts );

            // This is supposed to keep multiple tabs from opening...
            // maybe multiple windows causes this to happen?
            //const notifyReset = function(){logt("handleNotifyClick: notifyReset"); GM_setValue("inNotify", false);}

            function handleNotifyClick(context) {
                //let inNotify = GM_getValue("inNotify", false);
                //if (logWatchList == true) log("handleNotifyClick: ", inNotify, "|", context );

                //if (inNotify == true) return;
                //if (logWatchList == true) log("handleNotifyClick: inNotify is false!");
                //GM_setValue("inNotify", true);
                //setTimeout(notifyReset, 5000);

                let id = context ? context.tag : pageId;
                let url = "https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=" + id + "&impw=1";
                if (logWatchList == true) log("handleNotifyClick: opening tab");
                window.open(url, '_blank').focus();
            }
        }
    }

    // ==============================================================
    // Click button on search result to expand results
    function clickSearchResult(retries=0) {
        let btn = $("[class^='itemTile_'] [class^='actionsWrapper_'] > button:nth-child(2)");
        if (!$(btn).length) {
            if (retries++ < 20) return setTimeout(clickSearchResult, 250, retries);
            return log("too many retries...");
        }
        $(btn).click();
    }

    // ========================= Energy cost calculator ==============================

    // Table of items to put in the ... table...

    function installEnergyCostCalc() {

    }

    function removeECostTable() {

    }

    function updateECostTable() {

    }

    function priceCheckCb(jsonObj, status, xhr, target) {
        debug("priceCheckCb");

        //let listings, item, cheapest, name, itemId, myLi;
        let market = jsonObj.itemmarket;
        if (!market) return log("ERROR: bad API response! ", jsonObj);

        let item = market.item;
        if (!item) return log("ERROR: Item not found in API response (maybe none for sale?)");

        let name = item.name;
        let itemId = item.id;
        let listings = market.listings;
        let cheapest;
        if (listings) cheapest = listings[0];
    }

    function runECostPriceCheck () {
        // Get ID's from table/list...
        //findLowPriceOnMarket(itemId, target, callback);
    }

    // ===============================================================================

    // Callback for item list API call. If faves list, add type?
    function itemsQueryCB(responseText, ID) {
        debug("itemsQueryCB");
        let jsonResp = JSON.parse(responseText);

        // temp
        if (jsonResp.error) {
            console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
        }

        if (jsonResp.error) {
            if (jsonResp.error.code == 6) return;
            return handleError(responseText);
        }

        let itemsJson = jsonResp.items;
        let itemIds = Object.keys(itemsJson);

        for (let idx=0; idx<itemIds.length; idx++) {
            let itemId = itemIds[idx];
            let item = itemsJson[itemId];
            let obj = {name: item.name, type: item.type};
            tornItemsList[itemId] = obj;
        }

        let itemKeys = Object.keys(tornItemsList);
        GM_setValue("tornItemsList", JSON.stringify(tornItemsList));
        GM_setValue("useCachedItems", true);
        GM_setValue("CachedItemsCount", itemKeys.length);
        itemsListValid = true;
    }

    // Experimental test
    //
    // url: page.php?sid=iMarket&step=buyItems&rfcv=678b3405d586d
    // form data:
    // listingID: 6508440
    // itemID: 1293
    // amount: 1
    // price: 8500000
    var testDone = true;
    function doBlacklistTest() {
        if (testDone == true) return;
        testDone = true;
        log("xxx Doing test");

        // Can do low price query with CB to get item list...
        // findLowPriceOnMarket(itemId, target, callback)
        // Then that POST for each, to see if blocked ?
        /*
        listingID: 9142987   beer
        itemID: 180
        amount: 1
        price: 660
        */
        let rfcv = $.cookie('rfc_id'); //$.cookie('rfc_id');
        let url = "page.php?sid=iMarket&step=buyItems&rfcv=" + rfcv;
        //let postData = {listingID: 6508440, itemID: 1293, amount: 1, price: 850}; // blocked cache
        let postData = {listingID: 9142987, itemID: 180, amount: 1, price: 660};
        $.ajax({
            url: url,
            type: 'POST',
            data: postData,
            success: function (response, status, xhr) {
                processTestResult(response, status, xhr);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                log("Error in doAjaxPost: ", textStatus);
                log("Error thrown: ", errorThrown);
            }
        });

        function processTestResult(response, status, xhr) {
            log("xxx Test result: ", response);
        }
    }

    // =============== Called on page load ============================

    function handlePageLoad(retries=0) {
        let cash = $("#user-money");
        if ($(cash).length < 1) {
            if (retries++ < 20) return setTimeout(handlePageLoad, 200, retries++);
            return log("Too many retries");
        }
        cashOnHand = $(cash).attr('data-money');
        debug("Cash on hand: ", cashOnHand);

        // Install help/options
        installUi();

        // If directed from a favorite, (or browser notify click!) need to click the dislayed item...
        let urlParams = new URLSearchParams(window.location.hash);
        let myVal = urlParams.get("fromTima");
        let fromImpw = urlParams.get("impw");

        let view = urlParams.get("#/market/view");
        log("View: ", view);
        if (view == "search" && xedxDevMode)
            doBlacklistTest();

        if (myVal == "true" || fromImpw == '1') {
            setTimeout(clickSearchResult, 250);
        }

        installStorageChangeListeners();

        // Need observer to see when these pop up....
        $(".input-money:not([type='hidden'])").on('dblclick.xedx', handleDblClick);
        setInterval(addClickHandlers, 1000);
    }

    function hashChangeHandler() {
        debug("Hash change: ", location.hash);
        removeUI();
        handlePageLoad();
    }

    function pushStateChanged(e) {
        debug("pushStateChanged: ", e, " | ", location.hash);
        removeUI();
        handlePageLoad();
    }

    function handlePageUnload() {
        log("Handle page unload, resetting notify flag");
        notifyReset();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    //logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    addStyles();
    validateApiKey();
    versionCheck();

    if (useCachedItems == false) {
        xedx_TornTornQuery("", "items", itemsQueryCB);
    }

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    if (!isItemMarket()) {
        log("Not at market, not running...goodbye.");
        log("Seem to be at this location: ", location.href);
        return;
    }

    callOnContentLoaded(handlePageLoad);

    $(window).on("unload", handlePageUnload);

    if (marketWatch == true)
        startMarketWatch();

    // ================== UI stuff, just placed at the end out of the way ================

    function getCbOptsSpan(option) {
        return `
            <span style='display: flex;' id='${option.listItemId}'>
                <input type="checkbox" class="xma-opts-nh xma-cb" name="xma-key" value="${option.value}">
                <span class="xma-opts-nh">${option.label}</span>
            </span>
        `;
    }

    function getInputOptsSpan(option) {
        let parts = option.label.split('#');
        let partsLen = parts.length;
        let strLen = option.label.length;
        let pos = option.label.indexOf('#');
        let span = "";
        if (partsLen == 2) {
            span = `
                <span style='display: flex;' id='${option.listItemId}'>
                    <span class="xma-opts-nh">${parts[0]}</span>
                    <input type="number" class="numInput-nh xma-input" min="0" name="${option.value}">
                    <span class="xma-opts-nh">${parts[1]}</span>
                </span>
            `;
        } else if (pos > 1) {
            span = `
                <span style='display: flex;' id='${option.listItemId}'>
                    <span class="xma-opts-nh">${parts[0]}</span>
                    <input type="number" class="numInput-nh xma-input" min="0" name="${option.value}">
                </span>
            `;
        } else {
            span = `
                <span style='display: flex;' id='${option.listItemId}'>
                    <input type="number" class="numInput-nh xma-input" min="0" name="${option.value}">
                    <span class="xma-opts-nh">${parts[0]}</span>
                </span>
            `;
        }

        return span;
    }

    function getComboOptsSpan(option) {
        let parts = option.label.split('#');
        let span = `
            <span style='display: flex;' id='${option.listItemId}'>
                <input type="checkbox" class="xma-opts-nh xma-cb" name="xma-key" value="${option.value}">
                <span class="xma-opts-nh">${parts[0]}</span>
                <input type="number" class="numInput-nh xma-combo" min="0" name="${option.value}">
                <span class="xma-opts-nh">${parts[1]}</span>
            </span>
        `;
        return span;
    }

    function getImgDiv(id, type) {

        if (!id || id.indexOf('-') > -1) {
            debugger;
            if (id) {
                let parts = id.split('-');
                id = parts[0];
            }
        }

        let imgDiv = `<div id="fav-${id}" class="xfav-item" data-id="${id}" data-type="${type}">
                          <section class="xcontainer">
                              <img src="/images/items/${id}/medium.png">
                              <span class="x-remove-fav">X</span>
                          </section>
                     </div>`;

        return imgDiv;
    }

    function getFavsDiv() {
        const favesDiv = `
            <div id='xfaves' class="xfaves-wrap">
                <div id="xfaves-list" class="xfaves-inner"></div>
            </div>
        `;

        return favesDiv;
    }

    function toShortDateStr(date) {
        const mediumTime = new Intl.DateTimeFormat("en-GB", {
          timeStyle: "medium",
          hourCycle: "h24",
        });
        const shortDate = new Intl.DateTimeFormat("en-GB", {
          dateStyle: "short",
        });

        let dt = shortDate.format(date);
        let parts = dt.split('/');
        let yr = parts[2].slice(2);
        dt = parts[0] + "/" + parts[1] + "/" + yr;

        const formattedDate = dt + ", " + mediumTime.format(date);
        return formattedDate;
    }

    function buildPricingLi(key, name, price, uniqueId) {
        let tmp = price.toString().replaceAll(',', '').replaceAll('$', '');
        let usePrice = parseInt(tmp);
        let obj = previousPriceList[key];
        let id = obj.id;
        let fmtPrice = asCurrency(usePrice);

        let expDate = new Date(obj.expDate);  // do short date!!!
        debug("buildPricingLi: ", obj.expDate, "|", expDate.toString, "|", toShortDateStr(expDate));
        let expires = obj.expDate ? toShortDateStr(expDate) : "N/A";

        let li2 = `<li data-id="${key}">
                      <div class="xwatch-item">
                          <img src="/images/items/${id}/small.png">
                      </div>
                      <span class='xprice-name xwatchsp xml10' style="width: ${watchNameW1};">${name}</span>
                      <span class='xprice-price' style="width: ${watchPriceW1}">
                          <input class='xpinput' type='text' value='${fmtPrice}' name='${key}'>
                      </span>
                      <span class="xexpires xhide">${expires}</span>
                      <div class="watch4" style="position: absolute; left: 93%; display:flex;">
                          <span class="x-round-btn x-sellprice-remove" style="width: 20px;">X</span>
                      </div>
                  </li>`;

        return li2;
    }

    // Move to addStyles...
    GM_addStyle(`
        #xprice-list-hdr {
            display: flex;
            flex-direction: row;
        }
        #xprice-list-hdr span {
            display: flex;
            flex-wrap: wrap;
            justify-content: left;
            border-bottom: 2px solid var(--default-color);
        }

    `);

    function insertPricingHdr() {
        let hdr = `<li id="xprice-list-hdr" style="margin-bottom: 10px;">
                      <span style="min-width: 56px;"></span>
                      <span id="iph-1" style="width: 268px;">Item Name</span>
                      <span id="iph-2" style="width: 30%;">Last Price</span>
                      <span id="iph-3" style="width: 142px;">Expires</span>
                      <span id="iph-4" style="margin-right: 10px;">Remove</span>
                  </li>`;

        $("#xprices").prepend(hdr);

        displayHtmlToolTip($("#iph-1"), "Name of this item.", "tooltip4");
        displayHtmlToolTip($("#iph-2"), "Last price entered for this item.", "tooltip4");
        displayHtmlToolTip($("#iph-3"),
                           "The saved price is removed<br>" +
                           "this date. Mainly used when<br>" +
                           "using the lowest market price,<br>" +
                           "so that it will reset.<br>" +
                           "Removing the entry has the<br>" +
                           "same effect.", "tooltip4");
        displayHtmlToolTip($("#iph-4"),
                           "Remove from list.<br>" +
                           "Does not remove listing,<br>" +
                           "just saved price.", "tooltip4");
    }

    function buildItemWatchLi(key, name, price) {
        let parts = key.split('-');
        let id = parts[0];
        let usePrice = priceAsNum(price);
        let limit = asCurrency(usePrice);

        if (!id || id.indexOf('-') > -1)
            debugger;

        let li = `<li data-id="${key}">
                      <span class="watch0" style="display: none; margin-right: 15px;">
                          <span style="align-content: center; display: flex; flex-wrap: wrap;">Disable:</span>
                          <input type="checkbox" class="xma-disable-cb xma-opts-nh" data-id="${id}" name="xma-disable">
                      </span>
                      <div class="xwatch-item">
                          <img src="/images/items/${id}/small.png">
                      </div>
                      <span class='xwatchsp xml10' style="width: ${watchNameW1};">${name}</span>
                      <span class='xwatchsp xprice-price' style="width: ${watchPriceW1};">
                          <input id="xwi-${id}" class='xwatch-input' type='text' value='${limit}' name='${key}'>
                      </span>
                      <div class="watch-parent watch4" style="position: absolute; left: 93%; display:none;">
                          <span class="x-round-btn x-watch-remove" style="width: 20px;">X</span>
                      </div>
                  </li>`;

        return li;
    }

    function onBlurPrice(e) {
        debugger;
        // Doesnt handle unique IDs yet
        return;

        let target = $(e.currentTarget);
        let id = $(target).attr('name');
        let value = $(target).val();
        debug("onBlur, id: ", id, " value: ", value, " target: ", $(target));
    }

    function onChangePrice(e) {
        let target = $(e.currentTarget);
        let liParent = $(target).closest("li");
        let key = $(liParent).attr('data-id');
        let value = $(target).val();
        value = value.replaceAll('$', '').replaceAll(',', '');

        previousPriceList[key].price = value;

        writePriceList();
    }

    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function doSlideOpts(e) {
        let newWidthL = "40%";
        let newWidthR = "60%";
        let newVal = "<<";
        let shrink = false;
        if (parseInt($("#xleft-opts").width()) > 0) {
            newWidthL = "0px";
            newWidthR = "100%";
            newVal = ">>";
            shrink = true;
        }

        //let target = e ? $(e.currentTarget) : undefined;

        let isPrices = isSell(); //$("#xprices").length > -1;
        let isWatches = isBuy(); //$("#xwatches").length > -1;
        debug("doSlideOpts, prices? ", isPrices, " watches? ", isWatches);

        $("#xleft-opts").animate({width: newWidthL}, 500);
        $("#xright-opts").animate(
            {width: newWidthR},
            500,
            function () {
                $("#xpand-rt-opts").val(newVal);
                if (shrink == true) {
                    if (isWatches == true) {
                        log("Setting LIs to flex");
                        $("#xwatches > li .watch0").css("display", "flex");
                        $("#xwatches > li .watch4").css("display", "flex");

                        //$("#xwatches .xprice-name").css("width", watchNameW2);
                        $("#xwatches .xprice-price").css("width", watchPriceW2);
                    } else {
                        $(".xexpires").removeClass("xhide");
                        insertPricingHdr();
                        $("#xprices .xprice-name").css("width", watchNameW2);
                        $("#xprices .xprice-price").css("width", watchPriceW2);
                    }
                } else {
                    if (isWatches == true) {
                        log("Setting LIs to none");
                        $("#xwatches > li .watch0").css("display", "none");
                        $("#xwatches > li .watch4").css("display", "none");
                    } else {
                        $("#xprice-list-hdr").remove();
                        $(".xexpires").addClass("xhide");
                        $("#xprices .xprice-name").css("width", watchNameW1);
                        $("#xprices .xprice-price").css("width", watchPriceW1);
                    }
                }
        });
    }

    function restorePriceList() {
        // Populate the editable saved price list
        // Remove expired ones while at it...
        $("#xprices").empty();
        let keys = Object.keys(previousPriceList);
        let delKeys = [];
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            let obj = previousPriceList[key];
            if (!obj) continue;
            let id = obj.id;
            let uniqueId = obj.unique;

            if (key.indexOf('-') < 0) {
                delKeys.push(key);
                key = id + '-' + uniqueId;
            }

            obj.price = priceAsNum(obj.price);
            previousPriceList[key] = obj;

            debug("restorePriceList: check expire: ", obj);
            if (obj.price == 0 || isExpiredItem(obj, false) == true) {
                debug("Deleting object: ", obj);
                delKeys.push(key);
                continue;
            }

            let item = tornItemsList[id];
            let li = buildPricingLi(key, item.name, obj.price, uniqueId);
            $("#xprices").append(li);
        }

        $(".xpinput").change(onChangePrice);

        delKeys.forEach((x, i) => delete previousPriceList[x]);
        writePriceList();

        $("li .x-sellprice-remove").off('click.xedx');
        $("li .x-sellprice-remove").on('click.xedx', onRemoveFromPriceList);
    }

    function buildOptsDiv() {
        // Add a new div which has a list options beneath the opt button,
        // and fill. Will start hidden and expand on btn click.
        let page = 'unknown';
        if (location.hash.indexOf("market/view") > -1) page = 'buy';
        else if (location.hash.indexOf("addListing") > -1) page = 'sell';
        else return log("not on buy or sell! ", location.hash);

        if (!$("#xma-help-btn").length > 0) return;
        if ($("#xma-opts-wrap").length > 0) $("#xma-opts-wrap").remove();

        let outerWrap = "<div id='xma-outer-opts' class='xma-outer'></div>";

        let optsDivSell = `<div id='xma-opts-wrap' class='xmahidden xma-locked' style='height: 0px; opacity: 0;'>
                               <div id="xleft-opts" class="column-hdr-wrap w40p" style="display: flex; flex-direction: column;">
                                   <div class="xoptshdr2" style="flex-direction: row; height: 34px; opacity: 1;">
                                       <div class="xoptstitle xopt-inner-hdr" style=''>Seller's Market options</div>
                                   </div>
                                   <div id='xinner-opts' class='x-outer-scroll-wrap xma-opts-inner-div-sell'></div>
                               </div>
                               <div id="xright-opts" class="column-hdr-wrap w60p" style="display: flex; flex-direction: column;">
                                   <div class="xoptshdr2" style="flex-direction: row; height: 34px; opacity: 1;">
                                       <div class="xoptstitle xopt-inner-hdr" style=''>Saved Price List</div>
                                       <span class="xrt-btn btn">
                                           <input id="xpand-rt-opts" type="submit" class="xedx-torn-btn-raw" style="padding: 0px 10px 0px 10px;" value="<<">
                                       </span>
                                   </div>
                                   <div id='xprice-edit' class='x-outer-scroll-wrap'><ul id='xprices' class='xinner-list'></ul></div>
                               </div>
                           </div>`;

        let optsDiv = `<div id='xma-opts-wrap' class='xmahidden xma-locked' style='height: 0px; opacity: 0;'>
                          <div id="xleft-opts" class="column-hdr-wrap w40p" style="display: flex; flex-direction: column;">
                              <div class="xoptshdr2" style="flex-direction: row; height: 34px; opacity: 1;">
                                  <div class="xoptstitle xopt-inner-hdr" style=''>Buyers's Market options</div>
                              </div>
                              <div id='xinner-opts' class='x-outer-scroll-wrap xma-opts-inner-div-sell'></div>
                          </div>
                          <div id="xright-opts" class="column-hdr-wrap w60p" style="display: flex; flex-direction: column;">
                              <div class="xoptshdr2" style="flex-direction: row; height: 34px; opacity: 1;">
                                  <span class="w-disable-all" style="margin-left: 15px;">
                                      <!-- span style="align-content: center; display: flex; flex-wrap: wrap;">Disable:</span -->
                                      <input id='x-disable-all' type="checkbox" class="xma-disable-cb xma-opts-nh" name="xma-all-disable">
                                  </span>
                                  <div class="xoptstitle xopt-inner-hdr" style=''>Market Watch items</div>
                                  <span class="xrt-btn btn">
                                      <input id="xpand-rt-opts" type="submit" class="xedx-torn-btn-raw" style="padding: 0px 10px 0px 10px;" value="<<">
                                  </span>
                              </div>
                              <div id='xprice-watch' class='x-outer-scroll-wrap'><ul id='xwatches' class='xinner-list'></ul></div>
                          </div>
                      </div>`;

        $("#xma-help-btn").css({"flex-direction": "column",
                                "position": "relative",
                                "padding": "0px",
                                "background": "var(--btn-background"});
        if (page == 'sell') $("#xma-help-btn").css({"margin-right": "10px"});
        $("#xma-help-btn > span").css("padding",  "0px 10px 0px 10px");
        $("#xma-opts-wrap").css("padding-bottom", "10px");

        if (page == 'sell') {
            $("[class*='addListingWrapper_']").before($(outerWrap));
            $("#xma-outer-opts").append($(optsDivSell));

            restorePriceList();

        } else {
            $("#xfaves").after($(outerWrap));
            $("#xma-outer-opts").append($(optsDiv));

            $("#x-disable-all").change(disableWatchList);
            displayHtmlToolTip($("#x-disable-all"), "Check to disable all", "tooltip4");

            restoreWatchList();
        }

        $("#xpand-rt-opts").on('click', doSlideOpts);

        countBuyOpts = 0;
        for (let idx=0; idx<cbOptsArray.length; idx++) {
            let opt = cbOptsArray[idx];
            let span = getCbOptsSpan(opt);
            switch (opt.type) {
                case "cb": span = getCbOptsSpan(opt); break;
                case "combo": span = getComboOptsSpan(opt); break;
                case 'input': span = getInputOptsSpan(opt); break;
                default: break;
            }
            
            if (isBuy() && opt.page == "sell") continue;
            if (isSell() && opt.page == "buy") continue;
            if (isBuy()) countBuyOpts++;
            $("#xinner-opts").append($(span));

            if (opt.listItemId && opt.help) {
                let sel = "#" + opt.listItemId + " > input";
                displayHtmlToolTip($(sel), opt.help, "tooltip4");
            }

            if (opt.type == 'cb' && opt.disabled && opt.disabled == true) {
                let sel = "#" + opt.listItemId + " > input";
                $(sel).attr("disabled", "disabled");
            }
        }

        // Add the "reset all data" entry
        addResetDataSpan();
    }

    function addResetDataSpan() {
        GM_addStyle(`
            .xreset-data {
                padding: 0px 20px 0px 20px;
                border-radius: 10px;
                border: 2px solid white;
                margin-top: 5px;
                justify-content: center;
                width: 100%;
                margin-right: 10px;
                transition: background 0.25s linear;
                cursor: pointer;
            }
            .xreset-data:hover {
                background: #444;
            }
        `);

         let span = `
             <span style='display: flex; justify-content: center;' id='ResetOptsData'>
                    <span class="xma-opts-nh xreset-data">Reset All Data</span>
            </span>`;

        $("#xinner-opts").append($(span));
        $("#ResetOptsData").on('click', function() {
            notifyReset();

            // Clear lists....
            // Reset ll the "favesItemsChanged" etc
            // Maybe make constants (in array?) of default options, set all back?
        });
    }

    function addScrollStyle() {
        GM_addStyle(`
            [class^='categoryGroups_'] {
                position: sticky;
                top: 0;
                max-height: 80vh;
                overflow-y: scroll;
                overflow-x: hidden;
            }
        `);
    }

    function addStyles() {
        addTornButtonExStyles();

        GM_addStyle(`
            .x-round-btn {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-content: center;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
                width: 20px;
                aspect-ratio: 1 / 1;
                border-radius: 50%;
            }
            .xrt-btn {
                margin-left: auto;
                margin-right: 10px;
                float: right;
            }
        `);

        // Favorites
        GM_addStyle(`
            #xfaves {
                background-color: var(--default-bg-panel-color);
                border-radius: 5px;
                border-radius: var(--item-market-border-radius);
                box-shadow: 0 1px 0 #fff;
                box-shadow: var(--item-market-shadow);
                height: 38px;
                overflow: visible;
                padding: 8px 10px 8px 10px;
                margin-bottom: 10px;
            }
            .xfaveshidden {
                height: 0;
                display: none;
                z-order: -1;
                opacity: 0;
            }
            body:not(.dark-mode) #xfaves {
                background: var(--default-panel-gradient);
            }
            #xfaves .xfaves-inner {
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: row;
                border-radius: 5px;
                background: black;
                justify-content: flex-start;
                gap: 5px;
            }
            body:not(.dark-mode) #xfaves .xfaves-inner {
                background-color: var(--default-bg-panel-color);
                background: var(--default-panel-gradient);
            }

        `);

        // Options styles, 'xma' == xedx market assist
        GM_addStyle(`
            .xopt-inner-hdr {
                justify-content: center;
                display: flex;

                height: 100%;
                align-content: center;
                flex-wrap: wrap;
            }
            #xoptshdr, .xoptshdr2 {
                align-items: center;
                background: var(--default-panel-gradient);
                border-bottom: var(--item-market-border-dark);
                border-top: var(--item-market-border-light);
                border-top-left-radius: 5px;
                border-top-right-radius: 5px;
                border: 1px solid black;
                box-sizing: border-box;
                color: #666;
                color: var(--item-market-category-title-color);
                display: flex;
                font-weight: 700;
                min-height: 34px;
            }
            .xoptstitle {
                flex: 1;
                padding: 0 10px;
            }
            .xwatchsp {
                display: flex;
                flex-wrap: wrap;
                align-content: center;
            }
            .xwatchsp > input {
                width: 100%;
            }
            #xwatches > li {
                position: relative;
                border-radius: 5px;
                background: #222;
                padding: 2px 0px 2px 10px;
                width: 100%;
            }
            #xma-outer-opts {
                display: flex;
                flex-direction: column;
                width: 100%;
            }
            .x-outer-scroll-wrap {
                position: relative;
                overflow: scroll;
                display: flex;
                flex-direction: column;
                top: 0;
                cursor: grab;
                max-height: 202px;
                padding-top: 10px;
                padding-bottom: 10px;
                margin-bottom: 16px;
            }

            div.x-outer-scroll-wrap::-webkit-scrollbar {
                -webkit-appearance: none;
                width: 7px;
                height: 0px;
            }

            div.x-outer-scroll-wrap::-webkit-scrollbar-thumb {
                border-radius: 4px;
                background-color: rgba(200, 200, 200, .5);
                box-shadow: 0 0 1px rgba(255, 255, 255, .5);
            }
            .xinner-list {
                display: flex;
                flex-direction: column;
            }

            .xinner-list input {
                outline: none;
                border: none;
                background: transparent;
                color: white;
            }
            .xinner-list input:hover  {
                background: white;
                color: black;
            }
            .xinner-list input:focus  {

            }
            .xinner-list > li {
                display: flex;
                flex-direction: row;
                padding-left: 10px;
                align-content: center;
                flex-wrap: wrap;
            }
            .xinner-list > li > span {
                font-size: 10pt;
                padding: 5px 0px 5px 0px;
            }

            .w20p {width: 20%;}
            .w25p {width: 25%;}
            .w30p {width: 30%;}
            .w35p {width: 35%;}
            .w40p {width: 40%;}
            .w45p {width: 45%;}
            .w50p {width: 50%;}
            .w60p {width: 60%;}
            .w70p {width: 70%;}
            .w80p {width: 80%;}

            #xma-opts-wrap {
                width: 100%;
                display: flex;
                flex-direction: row;
            }
            .xma-locked {
               max-height: 250px;
               top: 0;
               position: sticky;
            }

            .numInput-nh {
                border-radius: 6px;
                margin-left: 5px;
                height: 14px;
                width: 60px;
                font-size: 1.2em;
                padding-left: 4px;
                padding-top: 1px;

                display: inline-flex;
                flex-flow: row wrap;
                margin-left: 5px;
                align-items: center;
                margin-top: 5px;
            }
            #xma-opts-wrap label {
                align-content: center;
            }
            .xma-opts-inner-div {
                display: flex;
                flex-direction: column;
            }
            .xma-opts-inner-div-sell {
                position: relative;
                display: flex;
                flex-direction: column;
                top: 0;
                overflow-y: scroll;
                cursor: grab;
                max-height: 202px;
                /*width: 40%;*/
                padding-top: 10px;
                padding-bottom: 10px;
                margin-bottom: 16px;
            }
            .xma-opts-inner-div-sell > span {
                margin-left: 10px;
            }
            .xma-opts-inner-div > span {
                display: flex;
            }
            .xma-opts-nh {
                display: inline-flex;
                flex-flow: row wrap;
                margin-left: 5px;
                align-items: center;
                font-size: 10pt;
            }
            #xma-help-btn {
                background: var(--default-panel-gradient);
                border-top: var(--item-market-border-light);
                border-radius: var(--item-market-border-radius);
                box-shadow: var(--item-market-shadow);
                height: 24px;
                padding: 2px;
                display: flex;
                justify-content: center;
                align-content: center;
                cursor: pointer;
                flex-wrap: wrap;
            }
            .xsell-hlp-btn {
                 margin-right: 20px;
                 flex-direction: column;
                 margin-right: 20px;
                 position: relative;
                 padding: 0px;
                 background: var(--btn-background);
            }

            #xma-help-btn .xsell-span {
                padding: 0px 10px 0px 10px;
            }

            #xma-help-btn:hover {filter: brightness(140%);}
        `);

        // Context menu choices
        GM_addStyle(`
            .xcontainer {
                max-width: 60px;
                max-height: 30px;
            }
            .xcontainer > img {
                overflow-x: hidden;
                padding-left: 5px;
            }
            body:not(.dark-mode) .xcontainer {
                background: linear-gradient(0deg,#ebebeb,#ddd);
                box-shadow: inset 0 2px 4px #00000040,0 1px 0 #fff;
            }
            .x-remove-fav {
                position: relative;
                top: -30px;
                display: flex;
                justify-content: center;

                /*width: 15px;*/
                /*height: 15px;*/
                aspect-ratio: 1;

                border-radius: 15px;
                border: 1px solid black;
                cursor: pointer;
                padding-top: 3px;
                margin-left: 3px;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);

                height: 0px;
                opacity: 0;
                visibility: hidden;
                transition: all .2s ease-in-out;
            }
            body:not(.dark-mode) .x-remove-fav {
                background-image: radial-gradient(rgba(255, 255, 255, 0.2) 0%, rgba(50, 50, 50, 0.6) 100%);
                border: none;
                color: #666l
            }
            .xfav-item {
               border: var(--item-tile-image-border);
               cursor: pointer;
               border-radius: 5px;
               border-width: 2px;
               padding: 2px;
               margin: 0px 1px 0px 1px;
            }
            .xfav-item:hover {
                filter: brightness(1.6);
            }

            .xfav-item:hover .x-remove-fav {
                height: 15px;
                opacity: 1;
                visibility: visible;
            }

            .xwatch-item {
               border: var(--item-tile-image-border);
               cursor: pointer;
               border-radius: 10px;
               border-width: 1px;
               padding: 2px;
               margin: 0px 1px 0px 1px;
            }
            .xwatch-item:hover {
                filter: brightness(1.6);
            }

            .watch0 {
                align-content: center;
                flex-wrap: wrap;
            }

            .custom-menu {
                display: none;
                z-index: 1000;
                position: absolute;
                overflow: hidden;
                border: 1px solid green;
                white-space: nowrap;
                font-family: sans-serif;
                background: #ddd;
                color: #333;
                border-radius: 5px;
                padding: 0;
            }

            .custom-menu li {
                padding: 8px 12px;
                cursor: pointer;
                list-style-type: none;
                transition: all .3s ease;
                user-select: none;
            }

            .custom-menu li:hover {
                background-color: #DEF;
            }
            .xexpire {
                display: none;
            }
        `);

        // Tooltips
        GM_addStyle(`
            .xma-tt {
                radius: 4px !important;
                background-color: #000000 !important;
                filter: alpha(opacity=80);
                opacity: 0.80;
                padding: 5px 20px;
                border: 2px solid gray;
                border-radius: 10px;
                width: fit-content;
                margin: 50px;
                text-align: left;
                font: bold 14px ;
                font-stretch: condensed;
                text-decoration: none;
                color: #FFF;
                font-size: 1em;
                line-height: 1.5;
                z-index: 999999;
             }
        `);
    }

    // Addl lock icons to be added

// Original:
// @match        https://www.torn.com/page.php?sid=ItemMarket*

// ideas: https://www.torn.com/forums.php#/p=threads&f=67&t=16428822&b=0&a=0

/*
<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 93.63 122.88">
<defs><style>.cls-1{fill:#fbd734;}.cls-1,.cls-2{fill-rule:evenodd;}.cls-2{fill:#36464e;}</style></defs>
<title>padlock</title>
<path class="cls-1" d="M6,47.51H87.64a6,6,0,0,1,6,6v63.38a6,6,0,0,1-6,6H6a6,6,0,0,1-6-6V53.5a6,6,0,0,1,6-6Z"/>
<path class="cls-2" d="M41.89,89.26l-6.47,16.95H58.21L52.21,89a11.79,11.79,0,1,0-10.32.24Z"/>
<path class="cls-2" d="M83.57,47.51H72.22V38.09a27.32,27.32,0,0,0-7.54-19,24.4,24.4,0,0,0-35.73,0,27.32,27.32,0,0,0-7.54,19v9.42H10.06V38.09A38.73,38.73,0,0,1,20.78,11.28a35.69,35.69,0,0,1,52.07,0A38.67,38.67,0,0,1,83.57,38.09v9.42Z"/>
</svg>
*/

/* Unlocked, yellow:
<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 86.5 122.88"><defs><style>.cls-1{fill:#fbd734;}.cls-1,.cls-2{fill-rule:evenodd;}.cls-2{fill:#36464e;}</style></defs><title>unlocked</title><path class="cls-1" d="M5.54,53.25H81a5.57,5.57,0,0,1,5.54,5.54v58.55A5.56,5.56,0,0,1,81,122.88H5.54A5.55,5.55,0,0,1,0,117.34V58.79a5.56,5.56,0,0,1,5.54-5.54Z"/><path class="cls-2" d="M38.7,91.82l-6,15.66H53.77L48.23,91.6a10.9,10.9,0,1,0-9.53.22Z"/><path class="cls-2" d="M66.69,34.16a25.17,25.17,0,0,0-6.94-16.49,22.56,22.56,0,0,0-33,0,25.22,25.22,0,0,0-7,17.52V53.25H9.29V35.19A35.76,35.76,0,0,1,19.2,10.42a33,33,0,0,1,48.09,0,35.69,35.69,0,0,1,9.9,23.74Z"/></svg>
*/

/* Locked:
<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 93.63 122.88"><defs><style>.cls-1{fill:#fbd734;}.cls-1,.cls-2{fill-rule:evenodd;}.cls-2{fill:#36464e;}</style></defs><title>padlock</title><path class="cls-1" d="M6,47.51H87.64a6,6,0,0,1,6,6v63.38a6,6,0,0,1-6,6H6a6,6,0,0,1-6-6V53.5a6,6,0,0,1,6-6Z"/><path class="cls-2" d="M41.89,89.26l-6.47,16.95H58.21L52.21,89a11.79,11.79,0,1,0-10.32.24Z"/><path class="cls-2" d="M83.57,47.51H72.22V38.09a27.32,27.32,0,0,0-7.54-19,24.4,24.4,0,0,0-35.73,0,27.32,27.32,0,0,0-7.54,19v9.42H10.06V38.09A38.73,38.73,0,0,1,20.78,11.28a35.69,35.69,0,0,1,52.07,0A38.67,38.67,0,0,1,83.57,38.09v9.42Z"/></svg>
*/

/* green 'secured' icon
<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106.11 122.88"><defs><style>.cls-1{fill:#333;}.cls-1,.cls-2,.cls-3{fill-rule:evenodd;}.cls-2{fill:#fff;}.cls-3{fill:#3aaf3c;}</style></defs><title>safe</title><path class="cls-1" d="M56.36,2.44A104.34,104.34,0,0,0,79.77,13.9a48.25,48.25,0,0,0,19.08,2.57l6.71-.61.33,6.74c1.23,24.79-2.77,46.33-11.16,63.33C86,103.6,72.58,116.37,55.35,122.86l-4.48,0c-16.85-6.15-30.16-18.57-39-36.47C3.63,69.58-.61,47.88.07,22l.17-6.65,6.62.34A64.65,64.65,0,0,0,28.23,13.5,60.41,60.41,0,0,0,48.92,2.79L52.51,0l3.85,2.44Z"/><path class="cls-2" d="M52.89,7.91c17.38,11,33.07,16.22,46.55,15,2.35,47.59-15.22,82.18-46.37,93.9C23,105.83,5.21,72.45,6.53,22.18,22.34,23,37.86,19.59,52.89,7.91Z"/><path class="cls-3" d="M52.92,16.31C67.39,25.48,80.46,29.82,91.68,28.8c2,39.63-12.68,69.83-38.61,79.6C28,99.26,13.2,70.06,14.3,28.2c13.17.69,26.1-2.16,38.62-11.89Z"/><path class="cls-2" d="M37.13,49.73H40v-2a13.73,13.73,0,0,1,3.82-9.54,12.7,12.7,0,0,1,18.52,0,13.77,13.77,0,0,1,3.82,9.54v2H69a2.14,2.14,0,0,1,2.14,2.13V78.77A2.14,2.14,0,0,1,69,80.9H37.13A2.13,2.13,0,0,1,35,78.77V51.86a2.13,2.13,0,0,1,2.13-2.13ZM48.76,64.89a14.8,14.8,0,0,1,1.51,1.46A59.7,59.7,0,0,1,55,59.81c4.68-5.66,2.56-4.57,9.06-4.57l-.91,1a64.73,64.73,0,0,0-6,8A94.44,94.44,0,0,0,51,74.38l-.56,1.09-.52-1.11a26.94,26.94,0,0,0-3.46-5.6,18.68,18.68,0,0,0-4.4-4c.85-2.78,4.88-1.36,6.68.17ZM44,49.73H62.09v-2A9.73,9.73,0,0,0,59.41,41a8.69,8.69,0,0,0-12.72,0A9.73,9.73,0,0,0,44,47.74v2Z"/></svg>
*/

})();