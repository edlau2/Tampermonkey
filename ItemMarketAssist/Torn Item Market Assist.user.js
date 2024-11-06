// ==UserScript==
// @name         Torn Item Market Assist
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Makes Item Market sections independently scrollable - and more!
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=ItemMarket*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    var cashOnHand = 0;

    function log(...data) {console.log(GM_info.script.name + ': ', ...data);}
    log(" script Started");

    function handleDblClick(e) {
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
        $(target).val(canGet);
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
        log("Cash: ", cashOnHand);

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