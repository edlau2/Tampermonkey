// ==UserScript==
// @name         Torn Quick Items Helper
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add quantity to TT Quick Items
// @author       xedx [2100735]
// @match        https://www.torn.com/item.php*
// @connect      api.torn.com
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    var quickItemsList = undefined;
    var allItemList = {};
    var categories = ["Alcohol", "Drug", "Energy Drink", "Medical"];
    const catTotal = categories.length;
    var catComplete = 0;

    function getItemCategory(category) {
        debug("getItemCategory: ", category);

        if (!$("#xedx-fake").length) {
            let fakeDiv = "<div id='xedx-fake' style='display: none;'><ul id='fake-ul'></ul></div>";
            $("body").after(fakeDiv);
        }

        let URL = "https://www.torn.com/item.php?rfcv=66c24f2e7a892 #quickItems";
        let postData = {step: "getCategoryList",
                        itemName: category,
                        start: 0,
                        test: true,
                        prevtotal: 0};

        $.post( URL, postData, processLoadResponse);
    }

    function hashChangeHandler(e) {
        log("hashChangeHandler e: ", e);
    }

    function pushStateChanged(e) {
        log("hashChangeHandler e: ", e);
    }

    function processLoadResponse(response, status, xhr) {
        log("Process Response: ", status);
        let data = JSON.parse(response);
        let html = data.html;
        catComplete++;

        $("#xedx-fake > ul > li").remove();
        $("#xedx-fake > ul").html(html);
        let list = $("#xedx-fake > ul > li");
        for (let idx=0; idx < list.length; idx++) {
            let li = list[idx];
            let category = $(li).attr("data-category");
            let qty = $(li).attr("data-qty");
            let itemId = $(li).attr("data-item");

            allItemList[itemId] = {qty: qty, category: category};
        }

        if (catComplete == catTotal) {
            $("#xedx-fake > ul > li").remove();
            debug("allItemlist: ", allItemList);
            parseItemList();
        }
    }

    function updateQty(e) {
        let target = e.currentTarget;
        let textNode = $(target).find(".text")[0];

        let qty = $(textNode).attr("data-qty");
        let txt = $(textNode).text();

        let parts = txt.split('(');
        let newQty = parseInt(qty) - 1;
        let newTxt = parts[0] + " (x" + newQty + ")";

        $(textNode).attr("data-qty", newQty);
        $(textNode).text(newTxt);

    }

    // Just keep list of ID's for cat:
    // UL, id="energy-d-items", medical-items, drugs-items, alcohol-items
    // find LI, data-item == itemId
    // Find "button" class = option-use wai-btn
    function addHandlerForUse(itemId, category) {
        log("[addHandlerForUse] item: ", itemId, " cat: ", category);
        let node2;

        // Can use switch in JS on text!
        if (category == "Energy Drink")
            node2 = $("#energy-d-items");
        if (category == "Medical")
            node2 = $("#medical-items");
        if (category == "Alcohol")
            node2 = $("#alcohol-items");
        if (category == "Drug")
            node2 = $("#drugs-items");

        let elem2 = $($(node2)[0]).find("[data-item='" + itemId + "']")[0];
        if ($(elem2).length > 0) log("[addHandlerForUse] found elem2");
        let elem3 = $(elem2).find("[data-action='use']");
        if ($(elem3).length > 0) log("[addHandlerForUse] found elem3: ", $(elem3));

        //$(elem3).attr("style", "box-shadow: inset 1px 0px 0px 2px #0eb30e;");
    }

    function updateHandlersForUse() {
        // called on hash change/push state to add the above?
    }

    function parseItemList(items) {
        debug("Item list: ", $(quickItemsList));

        for (let idx=0; idx < $(quickItemsList).length; idx++) {
            let elem = $(quickItemsList)[idx];
            $(elem).on('click', updateQty);
            let itemId = $(elem).attr("data-id");
            let textNode = $(elem).find(".text")[0];
            let text = $(textNode).text();
            let itemInList = allItemList[itemId];
            if (itemInList) {
                $(elem).attr("data-category", itemInList.category);
                $(textNode).text(text + " (x" + itemInList.qty + ")");
                $(textNode).attr("data-qty", itemInList.qty);
                //$(textNode).on('click', updateQty);

                // If we are on the correct category page, add a handler
                // to the items 'use' btn to updatethen, as well.
                addHandlerForUse(itemId, itemInList.category);
            }
        }
    }

    function getAllItemCategories() {
        for (let idx=0; idx<categories.length; idx++) {
            getItemCategory(categories[idx]);
        }
    }

    // We can prob figure out for sure if TT Quick Items is installed,
    // but instead just try a few times for it's ID...
    var retries = 0;
    const maxRetries = 10;

    function handlePageLoad() {
        quickItemsList = $("#quickItems > main > div.inner-content > div.item");
        if (!$(quickItemsList).length) {
            if (retries++ > maxRetries) {
                return log("Too many retries! (", retries, ")");
            } else {
                return setTimeout(handlePageLoad, 250);
            }
        }

        getAllItemCategories();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();
    addBorderStyles();

    installPushStateHandler(pushStateChanged);
    callOnHashChange(hashChangeHandler);
    callOnContentLoaded(handlePageLoad);

})();