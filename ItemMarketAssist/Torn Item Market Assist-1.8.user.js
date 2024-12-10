// ==UserScript==
// @name         Torn Item Market Assist
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Makes Item Market slightly better, for buyers and sellers
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=ItemMarket*
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
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

(function() {
    'use strict';

    debugLoggingEnabled = false;

    var needsSave = GM_getValue("needsSave", true);
    var rememberLastPrice = GM_getValue("rememberLastPrice", false);
    var autoPricePctLess = GM_getValue("autoPricePctLess", false);
    var autoPricePctLessValue = GM_getValue("autoPricePctLessValue", 0);
    var autoPriceAmtLess = GM_getValue("autoPriceAmtLess", false);
    var autoPriceAmtLessValue = GM_getValue("autoPriceAmtLessValue", 0);
    var marketWatch = GM_getValue("marketWatch", false);
    var enableFavs = GM_getValue("enableFavs", false);
    var autoPriceRSP = GM_getValue("autoPriceRSP", true);
    var autoPriceLowest = GM_getValue("autoPriceLowest", false);
    var fillMaxCanGet = GM_getValue("fillMaxCanGet", true);
    var quickBuy = GM_getValue("quickBuy", false);
    var enableScrollLock = GM_getValue("enableScrollLock", true);

    if (enableScrollLock == true) addScrollStyle();

    // Load previous sell prices, migrate older version if needed
    var needPriceMigration = GM_getValue("needPriceMigration", true);
    var tmp = GM_getValue("previousPriceList", undefined);
    var previousPriceList = tmp ? JSON.parse(tmp) : {};

    if (needPriceMigration == true) migrateOldPriceFormat();

    function migrateOldPriceFormat() {
        let prices = GM_listValues();
        debug("Migrating price info: ", prices);
        for (let idx=0; idx<prices.length; idx++) {
            let key = prices[idx];
            if (key.indexOf("lastPrice-") < 0) continue;
            let parts = key.split('-');
            let id = parts[1];
            let price = GM_getValue(key, 0);
            if (!price) continue;
            price = price.toString().replaceAll(',', '');
            let obj = {price: price};
            previousPriceList[id] = obj;
            GM_deleteValue(key);
        }

        GM_setValue("previousPriceList", JSON.stringify(previousPriceList));
        GM_setValue("needPriceMigration", false);

        debug("Saved migrated prices: ", previousPriceList);
    }

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

    const savedVer = GM_getValue("savedVer", 0);
    if (GM_info.script.version > savedVer) needsSave = true;
    debug("savedVer: ", savedVer, " current: ", GM_info.script.version, " need save: ", needsSave);

    if (needsSave) saveCbOpts();

    function logOpts() {
        log("rememberLastPrice: ", rememberLastPrice);
        log("autoPricePctLess: ", autoPricePctLess);
        log("autoPricePctLessValue: ", autoPricePctLessValue);
        log("autoPriceAmtLess: ", autoPriceAmtLess);
        log("autoPriceAmtLessValue: ", autoPriceAmtLessValue);
        log("marketWatch: ", marketWatch);
        log("enableFavs: ", enableFavs);
        log("autoPriceRSP: ", autoPriceRSP);
        log("autoPriceLowest: ", autoPriceLowest);
        log("fillMaxCanGet: ", fillMaxCanGet);
        log("quickBuy: ", quickBuy);
        log("enableScrollLock: ", enableScrollLock);
    }

    function saveCbOpts() {
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
    }

    var cashOnHand = 0;

    const isBuy = function () {return location.hash.indexOf("market") > -1;}
    const isSell = function () {return location.hash.indexOf("addListing") > -1;}
    const isItemMarket = function () {return location.href.indexOf("sid=ItemMarket") > -1;}

    const searchBaseURL = "https://api.torn.com/v2/market/?selections=itemmarket&id=";

    function processResult(jsonObj, status, xhr, target) {
        log("processResult: ", $(target));

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
            log("processResult for ID ", itemId, " name: ", name, " is ", asCurrency(price));
            let usePrice = subtractMargin(price);
            fillSellPrice(target, usePrice, itemId);
        } else {
            fillSellPrice(target, 0, itemId);
        }
    }

    // target is required to fill price on success...
    var inAjax = false; // prevent dbl-click from firing twice
    function clearAjax(){inAjax = false;}

    function findLowPriceOnMarket(itemId, target) {
        if (inAjax == true) return;
        inAjax = true;
        setTimeout(clearAjax, 500);
         let url = searchBaseURL + itemId + "&key=" + api_key;

        $.ajax({
            url: url,
            type: 'GET',
            success: function (response, status, xhr) {
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

          // Can dynamically add/remove faves. Don't remove any faves in storage...
        if (key == 'enableFavs') {
            if (enableFavs == true)
                installFavorites();
            else
                $("#xfaves").remove();
        }

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
        let id = idFromSellNode(target);
        let value = $(target).val();
        if (value && id) writePrice(value, id);

        debug("change, ID: ", id, " value: ", value, " target: ", $(target));
    }

    function blurHandler(e) {
        let target = e.currentTarget;
        let id = idFromSellNode(target);
        let value = $(target).val();
        if (value && id) writePrice(value, id);

        debug("blur, ID: ", id, " value: ", value, " target: ", $(target));
    }

    // Separate fn so can be a callback if need to query lowest price
    // Save price with ID for later use.
    function writePrice(price, id) {
        debug("Write price for id: ", id, " price: ", price);

        if (parseInt(price) == 0) return;
        if (price && id) {
            let obj = {price: price};
            previousPriceList[id] = obj;
            GM_setValue("previousPriceList", JSON.stringify(previousPriceList));
        } else {
            log("Error: missing price info! id: '", id, "' price: '", price, "'");
        }

        // Update the editable list
        let item = tornItemsList[id];
        debug("Build LI: ", id, " | ", item.name, " | ", price);
        let li = buildPricingLi(id, item.name, price);
        let sel = "#xprices input[name='" + id + "']";
        let elem = $(sel);
        if ($(elem).length) {
            $(elem).closest("li").replaceWith($(li));
        } else {
            $("#xprices").append($(li));
        }
    }

    function fillSellPrice(target, price, id) {
        debug("Fill sell price for ID: ", id, " price: ", price);
        target.select();
        $(target).val(price);
        target.dispatchEvent(new Event("input"));

        writePrice(price, id);
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
        debug("itemRow: ", $(itemRow), " controlNode: ", $(controlNode), " controls: ", controls);

        let itemId;       // Required to get lowest price, and save last price.
        if (controls) {
            let parts = controls.split('-');
            itemId = parts[3];
        }
        debug("ID: ", itemId);

        return itemId;
    }

    function processMarketSell(e) {
        let target = e.currentTarget;

        let nickname = $(target).attr("placeholder");
        if (nickname != "Price")return;

        let infoDiv = $(target).closest("div [class^='info_']");
        let itemRow = $(target).closest("div [class^='itemRow_']");
        let controlNode = $(itemRow).find("button");
        let controls = $(controlNode).attr('aria-controls');
        debug("itemRow: ", $(itemRow), " controlNode: ", $(controlNode), " controls: ", controls);

        let itemId;       // Required to get lowest price, and save last price.
        if (controls) {
            let parts = controls.split('-');
            itemId = parts[3];
        }
        debug("ID: ", itemId);

        if (itemId) {
            log("Getting lowest price...");
            findLowPriceOnMarket(itemId, target);
        }

        let usePrice = 0;    // Will be price to fill in, could be low, RSP, last sale

        if (rememberLastPrice == true) {
            let obj = previousPriceList[itemId];
            usePrice = obj ? obj.price : 0;
            log("Reading price for ", itemId, " got ", obj);
            if (!usePrice) usePrice = 0;
        }

        if (usePrice == 0 && autoPriceLowest == true) {
            findLowPriceOnMarket(itemId, target);
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

        //if (usePrice == 0 && autoPriceLowest == true) {
        //    findLowPriceOnMarket(itemId, target);
        //    return false;
        //}

        fillSellPrice(target, usePrice, itemId);

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
        {value: "fillMaxCanGet", type: "cb", label: "Buy: max affordable", listItemId: "maxAffordable",
             help: "When double-click 'buy' quantity,<br>" +
                   "ony enter what you can afford<br>" +
                   "with cash on hand. Otherwise, <br>" +
                   "will fill with available quantity."},
        {value: "quickBuy", type: "cb", label: "Buy: no confirmation", listItemId: "quickBuy",
             help: "When clicking 'buy', will<br>" +
                   "suppress the confirmation<br>" +
                   "prompt."},
        {value: "enableScrollLock", type: "cb", label: "Enable scroll-lock", listItemId: "scrollLock",
             help: "When enabled, the right-hand<br>" +
                   "sidebar can scroll independently<br>" +
                   "of the central section.<br>" +
                   "Requires refresh to enable."},
        {value: "rememberLastPrice", type: "cb", label: "Use Last Sell Price", listItemId: "lastPrice",
             help: "Remember and fill in<br>" +
                   "the last price you sold<br>" +
                   "this type of item for.<br>" +
                   "If never priced before will<br>" +
                   "display '0'."},
        {value: "autoPriceRSP", type: "cb", label: "Use RSP", listItemId: "rspPrice",
             help: "Auto-fill with shown RSP."},
        {value: "autoPriceLowest", type: "cb", label: "Use Lowest (needs API)", listItemId: "lowPrice",
             help: "TBD: Auto-fill with lowest current<br>" +
                   "TBD: price. Requires an API key and<br>"+
                   "TBD: will be slightly slower than the<br>" +
                   "TBD: other options.", disabled: false},
        {value: "autoPricePctLess", type: "combo", label: "Price # % Less", listItemId: "pctPricing",
             help: "Make the price X percent<br>" +
                   "less than current lowest"},
        {value: "autoPriceAmtLess", type: "combo", label: "Price # $ Less", listItemId: "amtPricing",
             help: "Make the price X dollars<br>" +
                   "less than current lowest"},
        {value: "marketWatch", type: "cb", label: "Enable Market Watch", listItemId: "mktWatch",
             help: "TBD: Get notified when selected items<br>" +
                   "TBD: hit a low price that you set,<br>" +
                   "(is available now as a separate script)", disabled: true},
        {value: "enableFavs", type: "cb", label: "Enable Favorites List", listItemId: "favList",
             help: "Enables saving favorite items<br>" +
                   "to a window for quick access."},
    ];

    var inAnimate = false;
    const resetAnimate = function () {inAnimate = false;}

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

        let height = $("#xma-opts-wrap").height();

        let size = isSell() ? (8 * 24 + 10) : (cbOptsArray.length * 24 + 10);
        let newWrapHeight = (closing == false) ? (size + "px") : "0px";
        let newSpanHeight = (closing == false) ? "24px" : "0px";
        let newInputHeight = (closing == false) ? "14px" : "0px";
        let op = (closing == false) ? 1 : 0;

        debug("animate: ", newWrapHeight, " | ", newSpanHeight, " | ", op);

        $("#xma-opts-wrap").animate({
            height: newWrapHeight,
            opacity: op
        }, 500, function () {
            debug("Set #xma-opts-wrap to: ", $("#xma-opts-wrap").height());
            inAnimate = false;
        });

        $(".xma-opts-nh").animate({height: newSpanHeight}, 500);
        $(".numInput-nh").animate({height: newInputHeight}, 500);
        $("#xprices > li").animate({height: newSpanHeight}, 500);

        if (closing == true) updateCbOpts();

        return false;
    }

    function getCashOnHand(retries=0) {
        let cash = $("#user-money");
        if ($(cash).length < 1) {
            if (retries++ < 20) return setTimeout(getCashOnHand, 200);
            return log("Didn't find cash node! (retires = ", retries, ")");
        }

        cashOnHand = $(cash).attr('data-money');
        debug("Cash on hand: ", cashOnHand);
    }

    const getHelpBtnElement = function () {return `<div id="xma-help-btn"><span>Market Assist</span></div>`;}

    function installUi(retries = 0) {
        let page = 'unknown';
        if (location.hash.indexOf("market/view") > -1) page = 'buy';
        else if (location.hash.indexOf("addListing") > -1) page = 'sell';
        else return log("not on buy or sell! ", location.hash);

        debug("installUI: ", page);

        if ($("#xma-help-btn").length == 0) {
            if (page == 'buy') {
                let wrapper = $("[class^='searchWrapper_']");
                if (!$(wrapper).length) {
                    if (retries++ < 20) return setTimeout(installUi, 250, retries);
                    return log("Too many retries!");
                }

                $(wrapper).after(getHelpBtnElement());
                callOnContentComplete(getCashOnHand);
            }

            if (page == 'sell') {
                let target = $("[class^='addListingWrapper_'] [class^='itemsHeader_']");
                debug("On sell: ", $(target));
                if ($(target).length = 0) return log("Couldn't find sell target");
                $(target).css("flex-direction", "row");
                $(target).append(getHelpBtnElement());
            }

            buildOptsDiv();

            $(".xma-cb").each(function(index, element) {
                $(element).on("change", handleOptCbChange);
                let key = $(element).val();
                $(element)[0].checked = GM_getValue(key, false);
            });

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
        }

        if (enableFavs == true && page == 'buy') {
            installFavorites();
        }
    }

    function  uninstFavesMenus() {
        //$("[class^='imageWrapper_']").off("contextmenu.xedx");
    }

    function getFavesContextMenu() {
        let menu = `
            <ul class='custom-menu'>
                <li data-action="addFavorite">Add Favorite</li>
            </ul>
        `;

        return menu;
    }

    function saveFavorites() {
        GM_setValue("favorites", JSON.stringify(favorites));
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

    function addFavorite(id, name, type) {
        let encName = name.trim().replaceAll(' ', '%20');
        debug("addFavorite: ", id, "|", name, "|", type, "|", encName);
        let favList = $("#xfaves-list .xfav-item");

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
            const URL = "https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&" +
                      "itemID=" + id  + "&itemName=" + encName +
                      (type ? ("&type=" + type) : "") +
                      "&fromTima=true";
            location.href = URL;
        });

        $("#xfaves-list").append(newFav);
        saveFavorites();
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

    function installFavesMenus(retries=0) {
        let selector = "[class^='imageWrapper_']";
        if (retries < 4) {
            debug("installFavesMenus, selector: ", selector, " retries: ", retries);
            debug("installFavesMenus: ", $("[class^='imageWrapper_']"));
        }

        if ($("[class^='imageWrapper_']").length == 0) {
            if (retries++ < 30) return setTimeout(installFavesMenus, 200, retries);
            return log("Too many retries: ", retries);
        }

        $("[class^='imageWrapper_']").each(function(index, element) {
            if (!$(element).hasClass("xf")) {
                $(element).addClass("xf");
                $(element).on("contextmenu", function(e) {
                    let target = e.currentTarget;
                    e.preventDefault(); // Prevent default right-click menu

                    let menuHtml = getFavesContextMenu();
                    let menu = $(menuHtml);
                    $(menu).css({top: e.pageY,left: e.pageX});
                    $("body").append(menu);
                    menu.show();

                    $(".custom-menu li").click(function() {
                        var choice = $(this).attr("data-action");
                        // Do something based on the choice. But really is no choice...
                        debug("Menu choice: ", choice);
                        if (choice == 'addFavorite')
                            handleAddFavorite(target);
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

    function restoreSavedFaves() {
        let keys = Object.keys(favorites);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            debug("Key: ", key, " find: ",  $("#xfaves").find("[data-id='" + key + "']"));
            if ($("#xfaves").find("[data-id='" + key + "']").length)
                continue;
            addFavorite(key, favorites[key].name, favorites[key].type);
        }
    }

    function installFavorites() {
        if ($("#xfaves").length == 0) {
            addFavesStyles();
            let target = $("[class^='marketWrapper_'] [class^='itemListWrapper_'] [class^='itemsHeader_']")[0];
            $(target).before(getFavsDiv());
        }

        restoreSavedFaves();

        installFavesMenus();
    }

    // Click button on search result to expand rsults
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

        // Need observer to see when these pop up....
        $(".input-money:not([type='hidden'])").on('dblclick.xedx', handleDblClick);
        setInterval(addClickHandlers, 1000);
    }

    function hashChangeHandler() {
        debug("Hash change: ", location.hash);
        handlePageLoad();
    }

    function pushStateChanged(e) {
        debug("pushStateChanged: ", e, " | ", location.hash);
        handlePageLoad();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    addStyles();

    validateApiKey();
    versionCheck();

    if (useCachedItems == false) {
        xedx_TornTornQuery("", "items", itemsQueryCB);
    }

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);

    // ================== UI stuff, just placed at the end out of the way ================

    // <span class="xma-opts-nh" style='display: none;'>${option.label}</span>
    // 'value' is used for CB's to ket key to save state.
    // 'name' is used for number inputs
    function getCbOptsSpan(option) {
        return `
            <span style='display: flex;' id='${option.listItemId}'>
                <input type="checkbox" class="xma-opts-nh xma-cb" name="xma-key" value="${option.value}">
                <span class="xma-opts-nh">${option.label}</span>
            </span>
        `;
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
        let imgDiv = `<div class="xfav-item" data-id="`+ id + `" data-type="` + type + `">
                          <section class="xcontainer">
                              <img src="/images/items/` + id + `/medium.png">
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

    function addFavesStyles() {
        // Context menu choices
        GM_addStyle(`
            .xcontainer {
                max-width: 60px;
                max-height: 30px;
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
            xxx-body .xxx-dark-mode .xxx-x-remove-fav {
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
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
    }

    function buildPricingLi(id, name, price) {
        let tmp = price.toString().replaceAll(',', '').replaceAll('$', '');
        let usePrice = parseInt(tmp);
        let li = "<li><span class='w50p'>" + name + "</span>" +
                     "<span class='w40p'>" +
                        "<input class='xpinput' type='text' value='" + asCurrency(usePrice) + "' name='" + id + "'>" +
                     "</span></li>";

        return li;
    }

    function onBlurPrice(e) {
        let target = $(e.currentTarget);
        let id = $(target).attr('name');
        let value = $(target).val();
        debug("onBlur, id: ", id, " value: ", value, " target: ", $(target));
    }
    function onChangePrice(e) {
        let target = $(e.currentTarget);
        let id = $(target).attr('name');
        let value = $(target).val();
        value = value.replaceAll('$', '').replaceAll(',', '');
        debug("onChange, id: ", id, " value: ", value, " target: ", $(target));

        previousPriceList[id].price = value;
        GM_setValue("previousPriceList", JSON.stringify(previousPriceList));
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
                           <div id='xinner-opts' class='xma-opts-inner-div-sell'></div>
                           <div id='xprice-edit'><ul id='xprices'></ul></div>
                       </div>`;
        let optsDiv = `<div id='xma-opts-wrap' class='xmahidden' style='height: 0px; opacity: 0;'>
                          <div class='xma-opts-inner-div'></div>
                      </div>`;
        if (page == 'sell') {
            $("#xma-help-btn").css({"flex-direction": "column",
                                    "margin-right": "20px",
                                    "position": "relative",
                                    "padding": "0px",
                                    "background": "var(--btn-background"});
            $("#xma-help-btn").css("margin-right", "20px");
            $("#xma-help-btn > span").css("padding",  "0px 10px 0px 10px");
            $("#xma-opts-wrap").css("padding-bottom", "10px");

            // These styles get over-ridden (some do), hence direct .css() above
            //$("#xma-help-btn").addClass("xsell-hlp-btn");
            //$("#xma-help-btn > span").addClass("xsell-span");

            $("[class*='addListingWrapper_']").before($(outerWrap));
            $("#xma-outer-opts").append($(optsDivSell));

            // Populate the editable saved price list
            let keys = Object.keys(previousPriceList);
            let delKeys = [];
            for (let idx=0; idx<keys.length; idx++) {
                let id = keys[idx];
                let obj = previousPriceList[id];

                // clean the saved data
                let tmp = obj.price;
                tmp = tmp.toString().trim();
                tmp = tmp.replaceAll(',', '').replaceAll('$', '').replaceAll('.', '');
                obj.price = tmp;
                previousPriceList[id] = obj;

                if (parseInt(obj.price) == 0) {
                    delKeys.push(id);
                    continue;
                }
                let item = tornItemsList[id];
                let li = buildPricingLi(id, item.name, obj.price);
                $("#xprices").append(li);
            }

            $(".xpinput").change(onChangePrice);

            delKeys.forEach((x, i) => delete previousPriceList[x]);
            GM_setValue("previousPriceList", JSON.stringify(previousPriceList));

        } else {
            $("#xma-help-btn").after($(optsDiv));
        }

        for (let idx=0; idx<cbOptsArray.length; idx++) {
            let opt = cbOptsArray[idx];
            let span = getCbOptsSpan(opt);
            switch (opt.type) {
                case "cb": span = getCbOptsSpan(opt); break;
                case "combo": span = getComboOptsSpan(opt); break;
                default: break;
            }
            
            if (isBuy()) $("#xma-opts-wrap > div").append($(span));
            if (isSell()) $("#xinner-opts").append($(span));

            if (opt.listItemId && opt.help) {
                let sel = isSell() ? ("#" + opt.listItemId + " > input") : ("#" + opt.listItemId);
                displayHtmlToolTip($(sel), opt.help, "tooltip4");
            }

            if (opt.type == 'cb' && opt.disabled && opt.disabled == true) {
                let sel = "#" + opt.listItemId + " > input";
                $(sel).attr("disabled", "disabled");
            }
        }
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
        // Options styles, 'xma' == xedx market assist
        GM_addStyle(`
            #xma-outer-opts {
                display: flex;
                flex-direction: row;
                width: 100%;
            }
            .xma-mark {
                font-weight: bold;
            }
            #xprice-edit {
                position: relative;
                width: 60%;
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

            #xprice-edit::-webkit-scrollbar, #xinner-opts::-webkit-scrollbar {
                -webkit-appearance: none;
                width: 7px;
                height: 0px;
            }
            #xprice-edit::-webkit-scrollbar-thumb, #xinner-opts::-webkit-scrollbar-thumb {
                border-radius: 4px;
                background-color: rgba(200, 200, 200, .5);
                box-shadow: 0 0 1px rgba(255, 255, 255, .5);
            }
            #xprices input {
                outline: none;
                border: none;
                background: transparent;
                color: white;
            }
            #xprices input:hover  {
                background: white;
                color: black;
            }
            #xprices input:focus  {

            }
            #xprices > li {
                display: flex;
                flex-direction: row;
                padding-left: 10px;
                align-content: center;
                flex-wrap: wrap;
            }
            #xprices > li > span {
                font-size: 10pt;
                padding: 5px 0px 5px 0px;
            }

            .w20p {width: 20%;}
            .w30p {width: 30%;}
            .w40p {width: 40%;}
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
                width: 40px;
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
                width: 40%;
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

        // Scrolling
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