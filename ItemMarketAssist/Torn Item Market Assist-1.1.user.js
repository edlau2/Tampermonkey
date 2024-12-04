// ==UserScript==
// @name         Torn Item Market Assist
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Makes Item Market sections independently scrollable - and more!
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=ItemMarket*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

// Maybe add favorites? Drag and drop like Quick Items? Or list
// akin to bookmarks?

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

    if (enableScrollLock == true)
        addScrollStyle();

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
    //const formatter = new Intl.NumberFormat('en-US', {style: 'currency',
    //    currency: 'USD', maximumFractionDigits: 0,});
    //const asCurrency = function(num) {return formatter.format(num);}

    // Options handlers
    function handleOptCbChange(e) {
        e.stopPropagation();
        e.preventDefault();

        let node = $(e.currentTarget);
        let checked = $(node)[0].checked;
        let key = $(node).val();
        GM_setValue(key, checked);
        log("Setting opt ", key, " to '", checked, "'");

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

    // Separate fn so can be a callback if need to query lowest price
    // Save price with ID for later use.
    function fillSellPrice(target, price, id) {
        debug("Fill sell price for ID: ", id, " price: ", price);
        target.select();
        $(target).val(price);
        target.dispatchEvent(new Event("input"));

        let key = "lastPrice-" + id;
        if (price && price > 0) GM_setValue(key, price);
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
        log("No price adjust set!");
        return price;
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

        let usePrice = 0;    // Will be price to fill in, could be low, RSP, last sale

        if (autoPriceRSP == true) {
            let priceSpan = $(infoDiv).find("[class^='price_'] > span")[0];
            let rsp = $(priceSpan).text();
            if (rsp) rsp = rsp.replace("$", '').replaceAll(',', '');
            usePrice = subtractMargin(rsp);
        } else if (autoPriceLowest == true) {
            // Need to query to get it.....
            // Will need to call back with price.

            // Do query and callback...after subtractMargin...
        } else if (rememberLastPrice == true) {
            let key = "lastPrice-" + itemId;
            usePrice = GM_getValue(key, undefined);
            if (!usePrice) usePrice = 0;
        }

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
                   "TBD: other options.", disabled: true},
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
             help: "TBD: Enables saving favorite<br>" +
                   "TBD: items to a list for quick access.", disabled: true},
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

        let size = cbOptsArray.length * 24 + 10;
        let newWrapHeight = (closing == false) ? (size + "px") : "0px";
        let newSpanHeight = (closing == false) ? "24px" : "0px";
        let newInputHeight = (closing == false) ? "14px" : "0px";
        let op = (closing == false) ? 1 : 0;

        log("animate: ", newWrapHeight, " | ", newSpanHeight, " | ", op);

        $("#xma-opts-wrap").animate({
            height: newWrapHeight,
            opacity: op
        }, 500, function () {
            log("Set #xma-opts-wrap to: ", $("#xma-opts-wrap").height());
            inAnimate = false;
        });

        $(".xma-opts-nh").animate({height: newSpanHeight}, 500);
        $(".numInput-nh").animate({height: newInputHeight}, 500);

        if (closing == true) updateCbOpts();

        return false;
    }

    function getCashOnHand() {
        let cash = $("#user-money");
        if (!$(cash).length < 1) return log("Didn't find cash node!");

        cashOnHand = $(cash).attr('data-money');
        debug("Cash on hand: ", cashOnHand);
    }

    const getHelpBtnElement = function () {return `<div id="xma-help-btn"><span>Market Assist</span></div>`;}

    function installUi(retries = 0) {
        if ($("#xma-help-btn").length > 0) return;

        let page = 'unknown';
        if (location.hash.indexOf("market/view") > -1) page = 'buy';
        else if (location.hash.indexOf("addListing") > -1) page = 'sell';
        else return log("not on buy or sell! ", location.hash);

        if (page == 'buy') {
            let wrapper = $("[class^='searchWrapper_']");
            if (!$(wrapper).length) {
                if (retries++ < 20) return setTimeout(installUi, 250, retries);
                return log("Too many retries!");
            }

            $(wrapper).after(getHelpBtnElement());
            setTimeout(getCashOnHand, 2000);
        }

        if (page == 'sell') {
            let target = $("[class^='addListingWrapper_'] [class^='itemsHeader_']");
            log("On sell: ", $(target));
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

        // Need observer to see when these pop up....
        $(".input-money:not([type='hidden'])").on('dblclick.xedx', handleDblClick);
        setInterval(addClickHandlers, 1000);
    }

    // Called when page changes

    function hashChangeHandler() {
        log("Hash change: ", location.hash);
        handlePageLoad();
    }

    function pushStateChanged(e) {
        log("pushStateChanged: ", e, " | ", location.hash);
        handlePageLoad();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    addStyles();

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

    function buildOptsDiv() {
        // Add a new div which has a list options beneath the opt button,
        // and fill. Will start hidden and expand on btn click.
        let page = 'unknown';
        if (location.hash.indexOf("market/view") > -1) page = 'buy';
        else if (location.hash.indexOf("addListing") > -1) page = 'sell';
        else return log("not on buy or sell! ", location.hash);

        if (!$("#xma-help-btn").length > 0) return;
        if ($("#xma-opts-wrap").length > 0) $("#xma-opts-wrap").remove();

        let optsDiv = "<div id='xma-opts-wrap' class='xmahidden' style='height: 0px; opacity: 0;'><div class='xma-opts-inner-div'></div></div>";
        if (page == 'sell') {
            $("#xma-help-btn").css({"flex-direction": "column",
                                    "margin-right": "20px",
                                    "position": "relative",
                                    "padding": "0px",
                                    "background": "var(--btn-background"});
            $("#xma-help-btn").css("margin-right", "20px");
            $("#xma-help-btn > span").css("padding",  "0px 10px 0px 10px");
            $("#item-market-root div.wrapper").after($(optsDiv));
            $("#xma-opts-wrap").css({"padding-bottom": "10px", "width": "50%"});
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
            
            $("#xma-opts-wrap > div").append($(span));
            if (opt.listItemId && opt.help) {
                let sel = "#" + opt.listItemId;
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
            }
            #xma-opts-wrap label {
                align-content: center;
            }
            .xma-opts-inner-div {
                display: flex;
                flex-direction: column;
            }
            .xma-opts-inner-div > span {
                display: flex;
            }
            .xma-opts-nh {
                display: inline-flex;
                flex-flow: row wrap;
                margin-left: 5px;
                align-items: center;
            }
            #xma-help-btn {
                background: var(--default-panel-gradient);
                /*border-bottom: var(--item-market-border-dark);*/
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