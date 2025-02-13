// ==UserScript==
// @name         Torn Item Market Assist
// @namespace    http://tampermonkey.net/
// @version      1.17
// @description  Makes Item Market slightly better, for buyers and sellers
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
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

// Original:
// @match        https://www.torn.com/page.php?sid=ItemMarket*

(function() {
    'use strict';

    debugLoggingEnabled = true;

    const xedxDevMode = true;
    const pageId = getRandomIntEx(1000, 9999);

    logScriptStart();
    if (xedxDevMode == true)
        log("Page ID: ", pageId);

    // If not in the item market, but have 'market watch' enabled,
    // just run that portion of the script...
    var tabVisible = true;

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            tabVisible = true;
            log('visibilitychange: Tab is active');
        } else {
            tabVisible = false;
            log('visibilitychange: Tab is inactive');
        }
    });

    const isItemMarket = function () {return location.href.indexOf("sid=ItemMarket") > -1;}
    const searchBaseURL = "https://api.torn.com/v2/market/?selections=itemmarket&id=";
    var marketWatch = GM_getValue("marketWatch", false);
    var marketWatchAnyPage = GM_getValue("marketWatchAnyPage", false);
    var marketWatchRunning = false;

    var letMWRun = true;
    if (!isItemMarket() && marketWatch != true) letMWRun = false;
    if (!isItemMarket() && marketWatch == true && marketWatchAnyPage != true) letMWRun = false;

    if (letMWRun == false) {
        log("Not at market, not watching...goodbye.");
        return;
    }

    // Keys for flags indicating changes possibly made by
    // other instances...
    const mwItemsKey = "mwItemsChanged";
    const favesKey = "favesItemsChanged";
    const priceKey = "priceListChanged";
    const optionsKey = "optionsChanged";

    // Registered change listeners
    var mwItemsListener;
    var favesListener;
    var priceListener;
    var optionsListener;

    const currPriceVer = 3;
    var mwNotifyTimeSecs = GM_getValue("mwNotifyTimeSecs", 30);                // Time in secs for notification to timeout
    var mwNotifyTimeBetweenSecs = GM_getValue("mwNotifyTimeBetweenSecs", 120); // Min time between dup notifications
    var mwItemCheckInterval = GM_getValue("mwItemCheckInterval", 15);          // Time between checking list of watch items
                                                                               // Note it starts after LAST item request, so num items
                                                                               // * the call delay plus this
    var mwBetweenCallDelay = GM_getValue("mwBetweenCallDelay", 2);             // Time between calls for each item
    var mwMaxWatchListLength = GM_getValue("mwMaxWatchListLength", 12);        // Maximum items you can watch at once

    let tmp = GM_getValue("watchList", undefined);
    var watchList = tmp ? JSON.parse(tmp) : {};

    if (!isItemMarket() && marketWatch == true) {
        log("Not at market, running market watch only!");
        validateApiKey();
        //installStorageChangeListeners();
        startMarketWatch();

        mwItemsListener = GM_addValueChangeListener(mwItemsKey, storageChangeCallback);
        log("market watch only, storage listener installed: ", mwItemsListener);

        return;
    }

    var needsSave = GM_getValue("needsSave", true);
    var rememberLastPrice = GM_getValue("rememberLastPrice", false);
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

    if (enableScrollLock == true) addScrollStyle();

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
        log("saveMarketWatchOpts");
        GM_setValue("mwNotifyTimeSecs", mwNotifyTimeSecs);
        GM_setValue("mwNotifyTimeBetweenSecs", mwNotifyTimeBetweenSecs);
        GM_setValue("mwItemCheckInterval", mwItemCheckInterval);
        GM_setValue("mwBetweenCallDelay", mwBetweenCallDelay);
        GM_setValue("mwMaxWatchListLength", mwMaxWatchListLength);

        //if (!init) GM_setValue(mwItemsKey, true);
        //logMarketWatchOpts();
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
    }

    // disconnect the listener for a bit so we don't respond to
    // other tabs making changes.
    function toggleStorageKey(key, val) {

        if (tabVisible == false) return;
        GM_setValue(key, val);
        if (val == true) setTimeout(toggleStorageKey, 250, key, false);

        log("storageChange changed key ", key, " to ", val, " by: ", pageId);
    }

    function saveCbOpts(init) {
        GM_setValue("rememberLastPrice", rememberLastPrice);
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

        saveMarketWatchOpts(init);
        if (!init) toggleStorageKey(optionsKey, true);

        needsSave = false;
        GM_setValue("needsSave", needsSave);
        GM_setValue("savedVer", GM_info.script.version);
    }

    function updateCbOpts() {
        rememberLastPrice = GM_getValue("rememberLastPrice", rememberLastPrice);
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
            $("#xwatches").empty();
            let keys = Object.keys(watchList);
            debug("restoreWatchList, len:  ", keys.length);
            for (let idx=0; idx<keys.length; idx++) {
                let key = keys[idx];
                let item = watchList[key];
                log("Adding watch list itm: ", item);
                addWatchObjToUI(item, fromStgHandler);
            }
        }
    }

    // ======================== callback to handle all storage changes ===============================

    function storageChangeCallback(key, oldValue, newValue, remote) {
        // Don't process if changed to 'undefined', isn't a remote
        // tab (meaning it's us), or we are the visible tab/page.
        log("storageChangeCallback: ", key, " old: ", oldValue, " new: ", newValue, " remote: ", remote, " visible: ", tabVisible);
        if (!newValue || remote == false || tabVisible == true) return;

        //log("storageChangeCallback: ", key, "|", oldValue, "|", newValue, "|", remote);

        // Ignore resetting the value or local change
        if (newValue == undefined || remote == false) return;

        log("storageChange processing key '", key, "'");
        let processed = false;
        switch (key) {
            case mwItemsKey: {
                log("storageChange found key '", key, "'");
                removeStorageListener(mwItemsListener);

                tmp = GM_getValue("watchList", undefined);
                watchList = tmp ? JSON.parse(tmp) : {};
                updateMarketWatchOpts();
                restoreWatchList(true);
                processed = true;
                break;
            }
            case favesKey: {
                log("storageChange found key '", key, "'");
                removeStorageListener(favesListener);
                tmp = GM_getValue("favorites", undefined);
                favorites = tmp ? JSON.parse(tmp) : {};
                restoreSavedFaves(true);
                processed = true;
                break;
            }
            case priceKey: {
                log("storageChange found key '", key, "'");
                removeStorageListener(priceListener);
                tmp = GM_getValue("previousPriceList", undefined);
                previousPriceList = tmp ? JSON.parse(tmp) : {};
                restorePriceList(true);
                processed = true;
                break;
            }
            case optionsKey: {
                log("storageChange found key '", key, "'");
                removeStorageListener(optionsListener);
                updateCbOpts();
                processed = true;
                break;
            }
            default:
                log("storageChange key not found! key: ", key);
                return;
        }

        log("storageChange Setting ", key, " to false? ", processed);
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

        log("storageChange listener removed for ", key, " timeout set");
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
        log("storageChange listener restored: ", key, " timer? ", timer);
    }

    // Install storage change listeners
    function installStorageChangeListeners() {
        log("storageChange adding listeners");
        mwItemsListener = GM_addValueChangeListener(mwItemsKey, storageChangeCallback);
        favesListener = GM_addValueChangeListener(favesKey, storageChangeCallback);
        priceListener = GM_addValueChangeListener(priceKey, storageChangeCallback);
        optionsListener = GM_addValueChangeListener(optionsKey, storageChangeCallback);
        log("storageChange install listeners: ", mwItemsListener, "|", favesListener, "|", priceListener, "|", optionsListener);
    }

    // ============================================================================

    var cashOnHand = 0;

    const isBuy = function () {return location.hash.indexOf("market") > -1;}
    const isSell = function () {return location.hash.indexOf("addListing") > -1;}

    // Result procssing for low price query, similar to but separate
    // from the market watch version. Th UniqueId portion of the key
    // will be 0 in this case.
    function processResult(jsonObj, status, xhr, target) {
        debug("processResult: ", $(target));

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
        } else {
            fillSellPrice(target, 0, itemId, 0);
        }
    }

    // target is required to fill price on success...
    var inAjax = false; // prevent dbl-click from firing twice
    function clearAjax(){inAjax = false;}

    function findLowPriceOnMarket(itemId, target, callback) {
        logt("findLowPriceOnMarket");
        if (inAjax == true) return;
        inAjax = true;
        setTimeout(clearAjax, 500);
        let url = searchBaseURL + itemId + "&key=" + api_key;

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
        if (key == 'autoPriceRSP' && checked == true) {
            autoPriceLowest = false;
            $("[value='autoPriceLowest']").prop("checked", false);
            GM_setValue("autoPriceLowest", false);
        }
        if (key == 'autoPriceLowest' && checked == true) {
            autoPriceRSP = false;
            $("[value='autoPriceRSP']").prop("checked", false);
            GM_setValue("autoPriceRSP", false);
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

        return false;
    }

    function handleOptInputChange(e) {
        e.stopPropagation();
        e.preventDefault();

        let node = $(e.currentTarget);
        let key = $(node).attr("name");
        let value = $(node).val();
        GM_setValue(key, value);

        updateMarketWatchOpts();

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

        /*
        $(target).tooltip("open");
        */
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

        writePrice(price, id, uniqueId);
    }

    function subtractMargin(price) {
        debug("subtractMargin, price: ", price, " amt? ", autoPriceAmtLess, " pct? ", autoPricePctLess);
        if (autoPriceAmtLess == true) {
            let newPrice = price - autoPriceAmtLessValue;
            debug("subtractMargin amt price: ", price, " minus ", autoPriceAmtLessValue, " return: ", newPrice);
            return newPrice;
        } else if (autoPricePctLess == true) {
            let pctOff = (+autoPricePctLessValue/100)*price;
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
            log("xxx parts: ", parts);
            itemId = parts[3];
            log("xxx id: ", itemId);
            uniqueId = parts[4];
            log("xxx unique id: ", uniqueId);
        }
        debug("ID: ", itemId, " unique: ", uniqueId);

        if (!itemId || !uniqueId)
            debugger;

        return {id: itemId, unique: uniqueId};
    }

    var inSell = false;
    function resetSellFlag(){inSell = false;}

    function processMarketSell(e) {
        if (inSell) return false;
        inSell = true;
        setTimeout(resetSellFlag, 500);

        let target = e.currentTarget;

        let nickname = $(target).attr("placeholder");
        if (nickname != "Price")return;

        let infoDiv = $(target).closest("div [class^='info_']");
        let itemRow = $(target).closest("div [class^='itemRow_']");
        let controlNode = $(itemRow).find("button");
        let controls = $(controlNode).attr('aria-controls');
        debug("itemRow: ", $(itemRow), " controlNode: ", $(controlNode), " controls: ", controls);

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

        // Need to append 'unique' for new price list format...
        if (rememberLastPrice == true) {
            let newKey = itemId + '-' + uniqueId;
            let obj = previousPriceList[newKey];
            usePrice = obj ? obj.price : 0;
            log("Reading price for ", itemId, "-", uniqueId, " got ", obj);
            if (usePrice != 0) {
                fillSellPrice(target, usePrice, itemId, uniqueId);
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
        if (isSell() == true) {
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
                   "display '0'.",
             disabled: false, page: "sell"},
        {value: "autoPriceRSP", type: "cb", label: "Use RSP", listItemId: "rspPrice",
             help: "Auto-fill with shown RSP.",
             disabled: false, page: "sell"},
        {value: "autoPriceLowest", type: "cb", label: "Use Lowest (needs API)", listItemId: "lowPrice",
             help: "TBD: Auto-fill with lowest current<br>" +
                   "TBD: price. Requires an API key and<br>"+
                   "TBD: will be slightly slower than the<br>" +
                   "TBD: other options.",
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
        log("Tooltips: ", $(ttList));
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
    const getHelpBtnElement = function () {return `<div id="xma-help-btn"><span>Market Assist</span></div>`;}

    function installItemContextMenus(retries=0) {
        //log("installItemContextMenus: ", marketWatch, "|", enableFavs);
        if (marketWatch != true && enableFavs != true) return;

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
                //log("installItemContextMenus, adding handler to ", $(element));
                $(element).on("contextmenu", function(e) {
                    let target = e.currentTarget;
                    e.preventDefault(); // Prevent default right-click menu

                    //debug("Right-click target: ", $(target));

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

    function installUi(retries = 0) {
        let page = 'unknown';
        if (location.hash.indexOf("market/view") > -1) page = 'buy';
        else if (location.hash.indexOf("addListing") > -1) page = 'sell';
        else return log("not on buy or sell! ", location.hash);

        debug("installUI: ", page, "|", $("#xma-help-btn").length);

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

                log("Read value for ", key, ": ", value);
                $(element).val(value);
            });

            // Checkbox AND value
            $(".xma-combo").each(function(index, element) {
                $(element).on("change", handleOptComboChange);
                let key = $(element).attr("name") + "Value";
                let value = GM_getValue(key, 0);

                log("Read value for ", key, ": ", value);
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
        debug("addFavorite: ", id, "|", name, "|", type, "|", encName);
        let favList = $("#xfaves-list .xfav-item");

        //debugger;

        favorites[id] = {name: name, type: type};

        if ($("#xfaves").find("[data-id='" + id + "']").length) {
            log("Can't add id ", id, " again!");
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

    function restoreSavedFaves(fromStgHandler) {
        $("#xfaves-list").empty();
        let keys = Object.keys(favorites);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            debug("Key: ", key, " find: ",  $("#xfaves").find("[data-id='" + key + "']"));
            if ($("#xfaves").find("[data-id='" + key + "']").length)
                continue;
            addFavorite(key, favorites[key].name, favorites[key].type, fromStgHandler);
        }
    }

    function installFavorites() {
        if ($("#xfaves").length == 0) {
            let target = $("[class^='marketWrapper_'] [class^='itemListWrapper_'] [class^='itemsHeader_']")[0];
            $(target).before(getFavsDiv());
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

    const watchNameW1 = "45%";
    const watchPriceW1 = "25%";
    const watchNameW2 = "45%";
    const watchPriceW2 = "25%";

    function removeWatch(e) {
        let target = e.currentTarget;
        let li = $(target).closest("li");
        let id = $(li).attr("data-id");
        delete watchList[id];
        $(li).remove();

        saveWatchList();
    }

    function onChangeWatchLimit(e) {
        let target = $(e.currentTarget);
        let id = $(target).attr('name');
        let value = $(target).val();
        let limit = priceAsNum(value); //.replaceAll('$', '').replaceAll(',', '');
        debug("onChangeWatchLimit, id: ", id, " value: ", value, " target: ", $(target));

        watchList[id].limit = limit;
        $(target).val(asCurrency(limit));

        saveWatchList();
    }

    function disableWatchItem(e) {
        let target = e.currentTarget;
        let itemId = $(target).attr("data-id");
        let checked = $(target)[0].checked;

        log("disableWatchItem id: ", itemId, " checked: ", checked);

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

    function addWatchObjToUI(item, fromStgHandler) {
        debug("addWatchObjToUI, obj: ", item);

        if (!item || !item.id) debugger;

        if ($("#xwatches").find("[data-item='" + item.id + "']").length) {
            log("Item ID ", item.id, ", ", item.name, " already in watch list!");
            return;
        }

        let li = $(buildItemWatchLi(item.id, item.name, item.limit));

        $("#xwatches").append(li);
        $(li).find(".x-watch-remove").on('click', removeWatch);

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
        log("Enabled watches: ", countEnabled, "|", countLi, "|", countDisabled);
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
        debug("addWatch, id: ", id, " name: ", name, " type:", type, " price limit: ", price, " timeout: ", timeout);
        let obj = {id: id, name: name, limit: price, currLow: 0,
                   lastNotify: 0, type: type, timeout: (timeout ? timeout : 30), disabled: false};
        debug("Obj: ", obj);
        watchList[id] = obj;

        // If already in the UI, we're done.
        if ($("#xwatches").find("[data-item='" + id + "']").length) {
            log("Item ID ", id, ", ", name, " already in watch list!");
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
        debug("handleAddWatch, target: ", $(target));
        let img = $(target).find("img");
        let name = $(img).attr("alt");
        let src = $(img).attr('src');
        let id;
        if (src) id = src.replace(/\D/g, "");

        //debugger;

        debug("handleAddWatch, img: ", $(img), " name: ", name, " src:", src, " id: ", id);
        if (!id) {
            log("ERROR: Missing id: ", $(img));
            return;
        }

        let priceNode = $(target).parent().find("[class^='priceAndTotal_'] > span");
        log("priceNode: ", $(priceNode));
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
    function startMarketWatch() {
        log("startMarketWatch, running: ", marketWatchRunning);
        if (marketWatchRunning == true) return;

        logMarketWatchOpts();

        const notifyOpenKey = "notifyOpen";
        var doNotShowAgain = false;
        var canShowAfterMinutes = 10;

        marketWatchRunning = true;
        refreshWatchList();

        function refreshWatchList() {
            if (GM_getValue("watchListDisabled", false) == true) {
                log("watchlist disabled");
                setTimeout(refreshWatchList, 10000);
                return;
            }
            logt("refreshWatchList");
            let delay = mwBetweenCallDelay * 1000;
            let keys = Object.keys(watchList);

            log("Refreshing ", keys.length, " watched items");

            for (let idx=0; idx < keys.length; idx++) {
                let itemId = keys[idx];
                let item = watchList[itemId];
                if (item.disabled == true) continue;
                //findLowPriceOnMarket(itemId, null, processMwResult);
                delay = (mwBetweenCallDelay * 1000) * (idx + 1);
                setTimeout(findLowPriceOnMarket, delay, itemId, null, processMwResult);
            }
            setTimeout(refreshWatchList, (mwItemCheckInterval * 1000) + delay);
        }

        // Process ajax result, similar to low price finder
        function processMwResult(jsonObj, status, xhr) {
            logt("processMwResult");
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

            log("processMwResult: ", name, " id: ", itemId, " cheapest: ", cheapest.price);
            if (cheapest && itemId) {
                let price = cheapest.price;
                watchList[itemId].currLow = price;
                let limit = watchList[itemId].limit;
                let priceStr = asCurrency(price);

                log("processMwResult: ", price, "|", limit, "|", doNotShowAgain, "|", (price <= limit));

                if (price <= limit) {
                    //if (doNotShowAgain == false)
                    //debugger;
                    doBrowserNotify(item, price); //name, price, itemId);
                }
            }
        }

        function isNotifyOpen() {
            let ret = GM_getValue(notifyOpenKey, false);
            log ("isNotifyOpen: ", ret);

            return ret;
        }
        function setNotifyOpen() {
            GM_setValue(notifyOpenKey, true);
            GM_setValue("notifyLastOpenedBy", pageId);
        }
        const resetShowAgain = function() {doNotShowAgain = false;}

        // Browser notification
        function resetNotify() {
            GM_setValue(notifyOpenKey, false);
        }

        function doBrowserNotify(item, cost) {
            debug("doBrowserNotify, open: ", isNotifyOpen(), " do not show:", doNotShowAgain);

            if (isNotifyOpen() == true) {
                log("doBrowserNotify: not showing, open or quit");
                return; // || doNotShowAgain == true) return;
            }

            let now = new Date().getTime();
            let diff = (now - item.lastNotify) / 1000;
            if (diff < mwNotifyTimeBetweenSecs) {
                log("doBrowserNotify: not showing, diff: ", diff, " time between: ", mwNotifyTimeBetweenSecs);
                return;
            }

            setNotifyOpen();

            item.lastNotify = now;
            saveWatchList();

            let msgText = "The price of " + item.name + " is available " +
                "at under " + cost + "!\n\nClick to go to market...";

            let smMsgText = item.name + " available now for " + asCurrency(cost);
            if (xedxDevMode == true)
                smMsgText = "[" + pageId + "]" + item.name + ": " + asCurrency(cost);

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
                    setTimeout(resetNotify, 10000); // ??? not needed???
                    handleNotifyClick(context);
                }, ondone: () => {
                    setTimeout(resetNotify, 5000);
                }
            };

            let noTO = false;
            if (+item.id == 330) {
                log("****  Boxing gloves!  No timeout! ****");
            } else {
                log(" Setting timout");
                opts.timeout = mwNotifyTimeSecs * 1000;
            }


            GM_notification ( opts );

            // This is supposed to keep multiple tabs from opening...
            // maybe multiple windows causes this to happen?
            const notifyReset = function(){logt("handleNotifyClick: notifyReset"); GM_setValue("inNotify", false);}

            function handleNotifyClick(context) {
                let inNotify = GM_getValue("inNotify", false);
                logt("handleNotifyClick: ", inNotify, "|", context );

                if (inNotify == true) return;
                logt("handleNotifyClick: inNotify is false!");
                //if (GM_getValue("inNotify", false) == true) return;
                GM_setValue("inNotify", true);

                let id = context.tag;
                setTimeout(notifyReset, 5000);
                let url = "https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=" + id + "&impw=1";
                logt("handleNotifyClick: opening tab");
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

    // Callback for item list API call. If faves list, add type?
    function itemsQueryCB(responseText, ID) {
        debug("itemsQueryCB");
        let jsonResp = JSON.parse(responseText);
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

        // If directed from a favorite, need to click the dislayed item...
        let urlParams = new URLSearchParams(window.location.hash);
        let myVal = urlParams.get("fromTima");
        if (myVal == "true") setTimeout(clickSearchResult, 250);

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
        resetNotify();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    //logScriptStart();

    addStyles();
    validateApiKey();
    versionCheck();

    if (useCachedItems == false) {
        xedx_TornTornQuery("", "items", itemsQueryCB);
    }

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

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

        let imgDiv = `<div class="xfav-item" data-id="${id}" data-type="${type}">
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

    function buildPricingLi(key, name, price, uniqueId) {
        let tmp = price.toString().replaceAll(',', '').replaceAll('$', '');
        let usePrice = parseInt(tmp);
        let obj = previousPriceList[key];
        let id = obj.id;
        let fmtPrice = asCurrency(usePrice);
        let li2 = `<li data-id="${key}">
                      <div class="xwatch-item">
                          <img src="/images/items/${id}/small.png">
                      </div>
                      <span class='xwatchsp xml10' style="width: ${watchNameW1};">${name}</span>
                      <span class='w35p'>
                          <input class='xpinput' type='text' value='${fmtPrice}' name='${key}'>
                      </span>
                      <div class="watch4" style="position: absolute; left: 93%; display:flex;">
                          <span class="x-round-btn x-sellprice-remove" style="width: 20px;">X</span>
                      </div>
                  </li>`;

        return li2;
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
                      <span class='xwatchsp' style="width: ${watchPriceW1};">
                          <input id="xwi-${id}" class='xwatch-input' type='text' value='${limit}' name='${key}'>
                      </span>
                      <div class="watch4" style="position: absolute; left: 93%; display:none;">
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

        $("#xleft-opts").animate({width: newWidthL}, 500);
        $("#xright-opts").animate(
            {width: newWidthR},
            500,
            function () {
                $("#xpand-rt-opts").val(newVal);
                if (shrink == true) {
                    log("Setting LIs to flex");
                    $("#xwatches > li .watch0").css("display", "flex");
                    $("#xwatches > li .watch4").css("display", "flex");
                } else {
                    log("Setting LIs to none");
                    $("#xwatches > li .watch0").css("display", "none");
                    $("#xwatches > li .watch4").css("display", "none");
                }
        });
    }

    function restorePriceList() {
        // Populate the editable saved price list
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

            if (obj.price == 0) {
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
            resetNotify();

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
                width: 15px;
                height: 15px;
                border-radius: 15px;
                border: 1px solid black;
                cursor: pointer;
                padding-top: 3px;
                margin-left: 3px;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
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

})();