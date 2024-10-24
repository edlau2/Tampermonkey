// ==UserScript==
// @name         Museum Filler
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  try to take over the world!
// @author       Kontamusse, xedx
// @connect      api.torn.com
// @match        https://www.torn.com/museum.php*
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==


/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
//    'use strict';

    // Need API key, I get and save using that 'validateApiKey()' function
    const api_key = "<your API key here";

    // Globals to indicate handlers installed
    var handlersInstalled = false;
    var fromClick = false;

    // Caching stuff - do not edit, automatically manageged
    const useCachedItems = GM_getValue("useCachedItems", false);
    var tornItemsList = {};
    var itemsListValid = false;

    // This is where we start to do stuff, call the API (once only, it will
    // be cached) but delay until page content has loaded for the rest.
    if (useCachedItems == true) {
        console.log("Using cached items");
        loadCache();
    } else {
        console.log("Getting item list from Torn");
        queryItemsApi("items", itemsQueryCB);
    }

    function queryItemsApi(selection, callback) {
        let url = "https://api.torn.com/torn/?selections=items&key=" + api_key;
        GM_xmlhttpRequest({
            method:"POST",
            url:url,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                callback(response.responseText);
            },
            onerror: function(response) {
                console.erroe("ERROR calling API: ", response);
        }});
    }

    function callOnContentLoaded(callback) {
        if (document.readyState == 'loading') {
            document.addEventListener('DOMContentLoaded', handlePageLoad);
        } else {
            handlePageLoad();
        }
    }

    function loadCache() {
        let val = GM_getValue("tornItemsList", "{}");
        tornItemsList = JSON.parse(val);
        if (tornItemsList) {
            let keys = Object.keys(tornItemsList);
            let expected = GM_getValue("CachedItemsCount", 0);
            if (expected != keys.length) {
                console.error("Invalid items cache!");
                GM_setValue("useCachedItems", false);
                useCachedItems = false;

                queryItemsApi("items", itemsQueryCB);

            } else {
                console.log("Using cached item list");
                itemsListValid = true;
                callOnContentLoaded(handlePageLoad);
            }
        }
    }

    function handleItemClick(e) {
        let target = $(e.currentTarget);
        setTimeout(handlePageLoad, 500);
    }

    function installHandlers() {
        console.log("[installHandlers]: ", handlersInstalled);
        if (handlersInstalled) return;

        let boxesList = $("#tabs > ul > li");
        console.log("Boxes: ", boxesList);

        $(boxesList).on('click', handleItemClick);
        $(".torn-btn.exchange-btn").on('click', handleItemClick);
        handlersInstalled = true;
    }

    function escapeName(name) {
        if (!name) return;
        name = name.trim().replaceAll(" ", "%20");
        return name;
    }

    function urlFromItemName(name) {
        let key = keyFromName(name);
        console.log("urlFromItemName name: ", name, " key: ", key);
        let item = tornItemsList[key];
        console.log("urlFromItemName item: ", item);

        let url = "https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=" + item.id +
            "&itemName=" + escapeName(item.name) + "&itemType=" + escapeName(item.type);

        console.log("urlFromItemName url: ", url);

        return url;
    }

    function keyFromName(itemName) {
        return itemName ? itemName.replace(/\s/g,'').toLowerCase() : "";
    }

    // This build the cached items list. Only needs to happen
    // once and is quick.
    function itemsQueryCB(responseText, ID) {
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
            let name = item.name;
            let type = item.type;

            // This is key id ==> value name.
            //tornItemsList[itemId] = name;

            // This will be key name ==> value { item ID, name }
            let key = keyFromName(name);
            tornItemsList[key] = {id: itemId, name: name, type: type};
        }

        let itemKeys = Object.keys(tornItemsList);
        GM_setValue("tornItemsList", JSON.stringify(tornItemsList));
        GM_setValue("useCachedItems", true);
        GM_setValue("CachedItemsCount", itemKeys.length);
        itemsListValid = true;
        callOnContentLoaded(handlePageLoad);
    }

    // Called once page DOM has loaded. Could change to callOnContentComplete,
    // which triggers when readyState == complete
    function handlePageLoad() {
        let wasFromClick = fromClick;
        fromClick = false;

        if (!handlersInstalled) installHandlers();

        let itemsToBuy = $(".coll-item-header.t-overflow");
        if ($(itemsToBuy).length < 1)
        {
            setTimeout(handlePageLoad, 500);
            return;
        }

        for (let i = 0; i < $(itemsToBuy).length; i++) {
            let itemName = $(itemsToBuy[i]).text();
            console.log("name for node ", $(itemsToBuy[i]), " is ", itemName);
            if (itemName.indexOf("wanttobuy") > 0) continue;

            console.log("Getting URL for ", itemName);
            let url = urlFromItemName(itemName);
            itemsToBuy[i].innerHTML = '<a href="' + url + '" target="set_target">' + itemName + '</a>';
        }

        // Every now and then the item list will still be previous page
        // (took more than 1 second), so as a safety net call again to
        // be sure. If correct page won't do anything, and there won't be
        // any UI lag if it isn't.
        if (wasFromClick) setTimeout(handlePageLoad, 500);
    }


})();