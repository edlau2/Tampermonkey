// ==UserScript==
// @name         Torn Item Market Assist
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Makes Item Market sections independently scrollable - and more!
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=ItemMarket*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
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
    const formatter = new Intl.NumberFormat('en-US', {style: 'currency',
        currency: 'USD', maximumFractionDigits: 0,});
    const asCurrency = function(num) {return formatter.format(num);}

    function processMarketBuy(e) {
        let target = e.currentTarget;
        let sellRow = $(target).closest("div [class^='sellerRow_']");
        let price = $(sellRow).find("[class^='price_']");
        let cost = $(price).text();
        let costStr = cost;
        if (cost) cost = cost.replace("$", '').replaceAll(',', '');
        let costNum = cost? parseInt(cost) : "not found";
        let canGet = Math.floor(cashOnHand / costNum);
        let avail = $(sellRow).find("[class^='available_']");
        let qtyStr = $(avail).text();
        if (qtyStr) qtyStr = qtyStr.split(' ')[0];
        let qty = parseInt(qtyStr);
        if (canGet > qty) canGet = qty;

        let uPay = asCurrency(canGet * cost);
        let msg = canGet + " @ " + costStr + ":<br>" + uPay;
        displayHtmlToolTip($(target), msg);

        target.select();
        $(target).val(canGet);
        target.dispatchEvent(new Event("input"));

        $(target).tooltip("open");

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

    function displayHtmlToolTip(node, text) {
        //$(document).ready(function() {
            $(node).attr("title", "original");
            $(node).attr("data-html", "true");
            $(node).attr("style", "white-space: pre-line;");
            $(node).tooltip({
                content: text,
                classes: {
                    "ui-tooltip": "xma-tt"
                }
            });
        //})
    }

    GM_addStyle(`
        [class^='categoryGroups_'] {
            position: sticky;
            top: 0;
            max-height: 80vh;
            overflow-y: scroll;
            overflow-x: hidden;
        }
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

    GM_addStyle(".tooltip4 {" +
                "radius: 4px !important;" +
                "background-color: #000000 !important;" +
                "filter: alpha(opacity=80);" +
                "opacity: 0.80;" +
                "padding: 5px 20px;" +
                "border: 2px solid gray;" +
                "border-radius: 10px;" +
                "width: fit-content;" +
                "margin: 50px;" +
                "text-align: left;" +
                "font: bold 14px ;" +
                "font-stretch: condensed;" +
                "text-decoration: none;" +
                "color: #FFF;" +
                "font-size: 1em;" +
                "line-height: 1.5;" +
                "z-index: 999999;" +
                "}");

})();