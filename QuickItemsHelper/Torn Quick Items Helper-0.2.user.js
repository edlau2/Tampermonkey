// ==UserScript==
// @name         Torn Quick Items Helper
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add quantity to TT Quick Items
// @author       xedx [2100735]
// @match        https://www.torn.com/item.php*
// @connect      api.torn.com
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.43.js
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
        log("getItemCategory: ", category);

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

    function parseItemList(items) {
        debug("Item list: ", $(quickItemsList));

        for (let idx=0; idx < $(quickItemsList).length; idx++) {
            let elem = $(quickItemsList)[idx];
            let itemId = $(elem).attr("data-id");
            let textNode = $(elem).find(".text")[0];
            let text = $(textNode).text();
            let itemInList = allItemList[itemId];
            if (itemInList) $(textNode).text(text + " (x" + itemInList.qty + ")");
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

    callOnContentLoaded(handlePageLoad);

})();