// ==UserScript==
// @name         Torn Item Market Assist
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Makes Item Market sections independently scrollable - and more!
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=ItemMarket*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    var cashOnHand = 0;

    function log(...data) {console.log(GM_info.script.name + ': ', ...data);}
    log(" script Started");

    const isBuy = function () {return location.hash.indexOf("market") > -1;}
    const isSell = function () {return location.hash.indexOf("addListing") > -1;}
    const isItemMarket = function () {return location.href.indexOf("sid=ItemMarket") > -1;}

    function simulateKeyboardEntry(e, canGet) {
        let input = e.currentTarget;
        input.select();
        $(input).val(canGet);
        input.dispatchEvent(new Event("input"));
    }

    function processMarketBuy(e) {
        let target = e.currentTarget;
        let sellRow = $(target).closest("div [class^='sellerRow_']");
        let price = $(sellRow).find("[class^='price_']");
        let cost = $(price).text();
        if (cost) cost = cost.replace("$", '').replaceAll(',', '');
        let costNum = cost? parseInt(cost) : "not found";
        let canGet = Math.floor(cashOnHand / costNum);
        let avail = $(sellRow).find("[class^='available_']");
        let qtyStr = $(avail).text();
        if (qtyStr) qtyStr = qtyStr.split(' ')[0];
        let qty = parseInt(qtyStr);
        if (canGet > qty) canGet = qty;


        target.select();
        $(target).val(canGet);
        target.dispatchEvent(new Event("input"));

        return false;  // Don't propogate
    }

    function processMarketSell(e) {
        let target = e.currentTarget;
        let nickname = $(target).attr("placeholder");
        if (nickname != "Price")return;

        let infoDiv = $(target).closest("div [class^='info_']");
        let itemRow = $(target).closest("div [class^='itemRow_']");
        let priceSpan = $(infoDiv).find("[class^='price_'] > span")[0];
        let price = $(priceSpan).text();
        if (price) price = price.replace("$", '').replaceAll(',', '');

        target.select();
        $(target).val(price);
        target.dispatchEvent(new Event("input"));

        return false;  // Don't propogate
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
        $(".input-money:not([type='hidden'])").off('dblclick.xedx');
        $(".input-money:not([type='hidden'])").on('dblclick.xedx', handleDblClick);
    }

    function handlePageLoad(retries=0) {
        let cash = $("#user-money");
        if ($(cash).length < 1) {
            if (retries++ < 20) return setTimeout(handlePageLoad, 200, retries++);
            return log("Too many retries");
        }
        cashOnHand = $(cash).attr('data-money');

        // Need observer to see when these pop up....
        $(".input-money:not([type='hidden'])").on('dblclick.xedx', handleDblClick);
        setInterval(addClickHandlers, 500);
    }

    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoad);
    } else {
        handlePageLoad();
    }

    GM_addStyle(`
        [class^='categoryGroups_'] {
            position: sticky;
            top: 0;
            max-height: 80vh;
            overflow-y: scroll;
            overflow-x: hidden;
        }
    `);

})();