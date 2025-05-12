// ==UserScript==
// @name         Torn Armory Search
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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

    // https://www.torn.com/factions.php?step=your&type=1#/tab=armoury&start=250&sub=weapons

    /*
    POST: https://www.torn.com/factions.php?rfcv=67f8539ba340d
    step: armouryTabContent
    type: weapons
    start: 0
    */

    const verboseLogging = true;
    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false) || verboseLogging;    // Extra debug logging

    // ========== Item list caching, to associate item IDs with names ==========
    var useCachedItems = GM_getValue("useCachedItems", false);
    var tornItemsList = {};
    var itemsListValid = false;

    if (useCachedItems == true) {
        let val = GM_getValue("tornItemsList", "{}");
        tornItemsList = JSON.parse(val);
        if (tornItemsList) {
            let keys = Object.keys(tornItemsList);
            let expected = GM_getValue("CachedItemsCount", 0);
            if (!expected || expected == 0 || expected != keys.length || keys.length == 0) {
                console.error("Invalid items cache!");
                GM_setValue("useCachedItems", false);
                useCachedItems = false;
            } else {
                debug("Using cached item list");
                itemsListValid = true;
            }
        }
    }

    // ====================================================================

    const rfcv = getRfcv();
    const queryUrl = `https://www.torn.com/factions.php?rfcv=${rfcv}`;

    var armoryWeapons = [];
    var availBonuses = {};
    var paginated = false;
    var currPage = 0;
    var lastPage = 0;
    var totalItems = 0;
    var armoryLoadComplete = false;

    var currTab;
    var currSub;
    var currStart;
    var currParamPage;

    function checkPageParams() {
        debug("hash: ", location.hash);
        let params = new URLSearchParams(location.search);
        if (params.get('step') != 'your') return log("Not your armory page!");

        let params2 = location.hash.length ? new URLSearchParams(location.hash.replace("#/", "?")) : null;
        if (params2) {
            currSub = params2.get('sub');
            currTab = params2.get('tab');
            currStart = params2.get('start');
            if (currStart) {
                currParamPage = parseInt(+currStart / 50 + 1);
            }
            if (Number.isNaN(currParamPage)) {
                currStart = 0;
                currParamPage = 1;
            }
        }

        debug("checkPageParams, tab: ", currTab, " sub: ",  currSub, " start: ", currStart, " paramPage: ", currParamPage);
    }

    function thisPageNum() {
        checkPageParams();
        return parseInt(currParamPage);
    }

    function goToPage(num) {
        let btn = $(`.pagination [page="${num}"]:not('.first')`)[0];
        $(btn).click();
    }

    // Debugging fn,
    function openLiInWindow(li) {
        let ul = $("<ul></ul>");
        ul.append(li);

        var newWindow = window.open("", "New Window", "width=400,height=300");
        newWindow.document.write("<html><head><title>New Window</title></head><body>");
        newWindow.document.write(ul.prop('outerHTML'));
        newWindow.document.write("</body></html>");
    }

    // ================= Sort array of JSON by value =========================
    // ex: myArray = [{a:.., b:..., c:...}, {...}]
    function itemListSortByKeyVal(jsonArray, key) {
        return jsonArray.sort(function(a, b) {
            if (a[key] < b[key]) {
               return -1; // a comes before b
            }
            if (a[key] > b[key]) {
                return 1; // a comes after b
            }
            return 0; // a and b are equal
        });
    }

    // Returns all objects with key/value matching
    function findObjectsByKey(arr, key, value) {
        return arr.filter(obj => obj[key] === value);
    }

    // Move 'count' items from front to end of array
    function moveItemsToEnd(arr, count) {
        if (count <= 0 || count >= arr.length) {
            return; // Nothing to move or invalid count
        }

        const itemsToMove = arr.splice(0, count); // Remove from the front
        arr.push(...itemsToMove); // Add to the end
    }

    // ================ Parse the item's bonuses from the HTML ================
    function parseBonus(bonus) {
        if (!bonus.title) return '';
        let tmp = bonus.title.replaceAll("<b>", ":").replaceAll("</b>", ":");
        let parts = tmp.split(":");
        if (parts.length > 0) {
            return parts[1];
        }
        return '';
    }

    // =============== Get armory contents (weapons only ATM) ================================
    // This builds an object with every weapon, keyed by armory ID
    //
    // Keep our array of entries in memory to use for sorting/searching.
    // Write full item to localstorage to get item for building LI's
    // It will update when we do this again.
    // Save and lookup by armory ID

    function processPageQueryResult(response, status, xhr) {

        debug("status: ", status, (status == 'success'));
        //debug("Response: \n", response);

        let jsonObj = JSON.parse(response);

        if (paginated == false) {
            let newDiv = $("<div id='junk' style='opacity:0; top: -5000; right: 5000;'></div>");
            $(body).after(newDiv);
            $("#junk").html(jsonObj.pagination);
            paginated = true;
            let lastPg = $("#junk .page-number.last");
            debug("Last pg: ", $(lastPg));
            debug("Page: ", $(lastPg).attr("page"));
            if (parseInt($(lastPg).attr("page")) > 0)
                lastPage = $(lastPg).attr("page");
        }

        let items = jsonObj.items;

        totalItems += items.length;
        for (let idx=0; idx<items.length; idx++) {
            let item = items[idx];

            let b = item.bonuses;
            //debug("Getting bonuses: ", b, b[0], b[1]);
            let bonus1 = parseBonus(b[0]);
            let bonus2 = parseBonus(b[1]);

            if (bonus1 && bonus1 != '') availBonuses[bonus1] = true;
            if (bonus2 && bonus2 != '') availBonuses[bonus2] = true;

            let id = item.itemID;
            let name = tornItemsList[id] ? tornItemsList[id].name : "";
            let newEntry = { armoryID: item.armoryID, itemID: id, name: name,
                            page: currPage, index: idx,
                            type: item.type,  loaned: item.loaned,
                            glowClass: item.glowClass, acc: item.acc, dmg: item.dmg,
                            bonus1: bonus1, bonus2: bonus2};

            localStorage.setItem(item.armoryID, JSON.stringify(item));

            armoryWeapons.push(newEntry);
        }

        // Get last page from $("#junk"), has in the dom...
        if (items.length == 50 && (+currPage + 1) < lastPage) {
            debug("Retrieving next page: ", (+currPage + 1));
            getArmoryPage(++currPage);
        } else {
            //debug("armoryWeapons: ", armoryWeapons);
            checkPageParams();
            debug("Total items: ", totalItems, " pages: ", lastPage);

            armoryLoadComplete = true;
            fillBonusOpts();
        }
    }

    var forcedPageChange = false;
    var forcedPageChangeCb = null;
    var forcedPageChangeArray = null;

    function replacePageEntriesFromArray(pageNum, srcArray) {
        log("[replacePageEntriesFromArray]: ", pageNum, forcedPageChange);

        let thisPage = thisPageNum();
        log("This page: ", thisPage, " change page? ",
            (thisPageNum() != pageNum), forcedPageChange);

        if (forcedPageChange == false && thisPage != pageNum) {
            log("[replacePageEntriesFromArray], changing to page ", pageNum, " from page ", thisPage);
            forcedPageChange = true;
            forcedPageChangeCb = replacePageEntriesFromArray;
            forcedPageChangeArray = srcArray;
            goToPage(pageNum);
            return;
        }


        log("[replacePageEntriesFromArray] cont: ", forcedPageChangeArray);

        let ul = $(`#armoury-weapons > ul.item-list`);
        let liList = $(`#armoury-weapons > ul.item-list > li`);
        log("ul: ", $(ul), " li list: ", $(liList));
        if (!$(liList).length) return setTimeout(replacePageEntriesFromArray, 250, pageNum, srcArray);

        $(ul).empty();

        if (!srcArray) srcArray = forcedPageChangeArray;
        if (!srcArray) {
            console.error("ERROR: bad params!");
            return;
        }

        for (let idx=0; idx<50 && idx<srcArray.length; idx++) {
            let entry = srcArray[idx];
            let newLi = getItemLi(entry.armoryID);
            $(ul).append(newLi);
        }

        disableUnusedPages(srcArray);

        forcedPageChange = false;
        forcedPageChangeCb = null;
        forcedPageChangeArray = null;

        function pagesInArray(arr) {
            let num = parseInt(arr.length / 50);
            let rem = arr.length % 50;
            return rem > 0 ? num + 1 : num;
        }

        function disableUnusedPages(arr) {
            let pageList = $(".pagination-wrap .pagination > .page-number:not('.first'):not('.last')");
            let pagesUsed = pagesInArray(arr);
            for (let idx=0; idx<pageList.length; idx++) {
                // add class
                // ad handler ... wait, add handler to ALL if > 1 page, to handle pagination ourselves

                let btn = $(pageList)[idx];
                if (idx >= pagesUsed) {
                    $(btn).css("opacity", .2);

                    $(btn).on('click.xedx', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    });
                }
            }
        }
    }

    // Page starts at 0, 50 per page so next page is start = 50, if less than 50 results at end
    function getArmoryPage(pageNum) {
        if (pageNum == 0) totalItems = 0;
        let url = queryUrl;
        let postData = {step: "armouryTabContent", type: "weapons", start: `${pageNum * 50}`}
        $.ajax({
            url: url,
            type: 'POST',
            data: postData,
            success: function (response, status, xhr) {
                processPageQueryResult(response, status, xhr);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                log("Error in doAjaxPost: ", textStatus);
                log("Error thrown: ", errorThrown);
            }
        });
    }

    // =============== End get armory contents (weapons only ATM) ================================

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", forcedPageChange, location.href);
        checkPageParams();

        if (forcedPageChangeCb)
            forcedPageChangeCb();
        else
            installUI();
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        checkPageParams();
        //callOnContentLoaded(handlePageLoad);
    }

    var selectedBonusItems = [];
    function handleBonusSelect() {
        let bonus = $(this).val();
        let l1 = findObjectsByKey(armoryWeapons, 'bonus1', bonus);
        let l2 = findObjectsByKey(armoryWeapons, 'bonus2', bonus);
        selectedBonusItems = [...l1, ...l2];
        log("[handleBonusSelect] new array: ", selectedBonusItems);
    }

    function doBonusSearch() {
        log("[doBonusSearch] enter");
        //goToPage(1);
        replacePageEntriesFromArray(1, selectedBonusItems);
        log("[doBonusSearch] continued");
    }

    function fillBonusOpts() {

        let currOpts = $("#search-for > options");
        if (armoryLoadComplete == false || $(currOpts).length > 0) {
            if (armoryLoadComplete == false) return log("Armory not yet loaded, will return");
            if ($(currOpts).length > 0) return log("Already filled select");
        }

        let bonuses = Object.keys(availBonuses);
        bonuses.sort();

        $("#search-for").empty();
        for (let idx=0; idx<bonuses.length; idx++) {
            let bonus = bonuses[idx];
            let opt = `<option value="${bonus}">${bonus}</option>`;
            $("#search-for").append(opt);
        }

        $("#search-for").change(handleBonusSelect);
    }

    function installUI(retries=0) {
        log("[installUI]");
        if (currSub != 'weapons') {
            $("#xarmory").remove();
            return;
        }
        let mainTarget = $("#faction-armoury-tabs");
        if ($(mainTarget).length == 0) {
            if (retries++ < 20) return setTimeout(installUI, 250, retries);
            return("installUI: timeout.");
        }
        if ($("#xarmory").length > 0) return;

        let newDiv = getMainDiv();
        $(mainTarget).before(newDiv);

        fillBonusOpts();

        $("#xarmory-test").on('click', function () {
            doBonusSearch();
        });
    }

    function handleCbClick(e) {
        let name = $(this).attr('name');
        log("Clicked on '", name, "'");
    }

    function handlePageComplete(retries = 0) {
        log("handlePageComplete");

        //installUI();

        // TEST replacing LI's
        /*
        let list = $(`#armoury-weapons > ul.item-list.t-blue-cont.h.cont-gray > li`);
        if ($(list).length < 20) {
            if (retries++ < 20) return setTimeout(handlePageComplete, 500, retries);
            return log("handlePageComplete timeout");
        }

        for (let idx=0; idx<50; idx++) {
            let entry = armoryWeapons[idx+10];
            let newLi = getItemLi(entry.armoryID); //buildLiForItem(tempSavedItem);
            log("Replacing LI # ", idx, " with ", entry.name, " li: ", $(newLi));
            let target = $($(list)[idx]);
            if ($(target).length == 0) {
                log("Error: missing target!");
                continue;
            }

            //log("org li: ", $($(list)[idx]));
            $(target).replaceWith($(newLi));
            //log("new LI: ", $($(list)[idx]));
            log("LI replaced");
        }
        */

        $(".xcb").on('click', handleCbClick);
    }

    function handlePageLoad(retries=0) {
        log("[handlePageLoad]");
        checkPageParams();
        installUI();

    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    //versionCheck();

    addStyles();

    checkPageParams();

    // One time API call
    log("useCachedItems: ", useCachedItems, " list: ", tornItemsList);
    if (useCachedItems == false) {
        log("Querying Torn items");
        xedx_TornTornQuery("", "items", itemsQueryCB);
    } else {
        log("Querying armory");
        getArmoryPage(currPage);
    }



    callOnHashChange(hashChangeHandler);
    //installPushStateHandler(pushStateChanged);
    callOnContentLoaded(handlePageLoad);
    callOnContentComplete(handlePageComplete);

    function getMainDiv() {

        /*
        <span><select id="search-for" class="xmr10">
            <option value="name">Name</option>
            <option value="bonus1">Bonus</option>
            <option value="acc">Accuracy</option>
            <option value="dmg">Damage</option>
            <option value="glowClass">Class</option>
        </select></span>
        */

        let myDiv = `
            <div id="xarmory">
                <span class="xflexr">
                    <span>Sort by:</span>
                    <span><select id="sort-by" class="xmr10">
                        <option value="name">Name</option>
                        <option value="bonus1">Bonus</option>
                        <option value="acc">Accuracy</option>
                        <option value="dmg">Damage</option>
                        <option value="glowClass">Class</option>
                    </select></span>
                    <label>Available Only<input type="checkbox" class="xacb" name="search" value="Bonus"></label>
                    <span>Search</span>
                    <span><select id="search-for" class="xmr10">

                    </select></span>
                    <input id="xarmory-test" class="xedx-torn-btn" value="Test">
                </span>
            </div>
        `;

        /*
        let bonuses = Object.keys(availBonuses);
        for (let idx=0; idx<bonuses.length; idx++) {
            let bonus = bonuses[idx];
            let opt = `<option value="${bonus}">${bonus}</option>`;
            $(myDiv).find("#search-for").append(opt);
        }
        */

        return myDiv;
    }


    // Add any styles here
    function addStyles() {
        addFlexStyles();
        loadCommonMarginStyles();

        GM_addStyle(`
            #xarmory {
                width: 100%;
            }
            #xarmory span, label {
                display: flex;
                flex-flow: row wrap;
                align-content: center;
                margin-right: 10px;
            }
            #xarmory input {
                margin: 0px 20px 0px 10px;
                border-radius: 4px;
                padding-left: 4px;
            }
        `);

    }

    // One time functions to get the Torn item list, will be cached for later
    const armorWeaponTypes = ['Melee', 'Secondary', 'Primary', 'Defensive'];
    function itemsQueryCB(responseText, ID) {
        debug("itemsQueryCB");
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            log("Error: items list");
            if (jsonResp.error.code == 6) return;
            return handleError(responseText);
        }

        let itemsJson = jsonResp.items;
        let itemIds = Object.keys(itemsJson);

        for (let idx=0; idx<itemIds.length; idx++) {
            let itemId = itemIds[idx];
            let item = itemsJson[itemId];
            if (!armorWeaponTypes.includes(item.type)) continue;
            let obj = {name: item.name, type: item.type};
            tornItemsList[itemId] = obj;
        }

        let itemKeys = Object.keys(tornItemsList);
        GM_setValue("tornItemsList", JSON.stringify(tornItemsList));
        GM_setValue("useCachedItems", true);
        GM_setValue("CachedItemsCount", itemKeys.length);

        log("Torn items count: ", itemKeys.length);
        itemsListValid = true;

        getArmoryPage(currPage);
    }


    // From an item entry, build a UI list item

    /* LI Test-
    if (currPage == 0 && idx == 0) {
        log("Trying to build LI for ", item);
        let newLi = buildLiForItem(item);
        openLiInWindow(newLi);
    }
    */

    function getItemLi(armoryID) {
        let item;
        let tmp = localStorage.getItem(armoryID);
        if (tmp) item = JSON.parse(tmp);
        else return;

        return buildLiForItem(item);
    }

    function buildLiForItem(item) {

        let newLi =
            `<li>
                <div class="img-wrap" data-loaded="0" data-id="${item.itemID}" data-armoury="${item.armourID}">
                    <img class="torn-item medium ${item.glowClass}"
                        src="${item.image}"
                        srcset="${item.imageSrcSetName}${item.imageSrcSetExt} 1x, ${item.imageSrcSetName}@2x${item.imageSrcSetExt} 2x,
                        ${item.imageSrcSetName}@3x${item.imageSrcSetExt} 3x, ${item.imageSrcSetName}@4x${item.imageSrcSetExt} 4x"
                        ${item.glow}
                    />
                </div>
                <div class="name bold t-overflow">${item.name}</div>
                <div class="options-wrap t-show">
                    <div class="view icon-h torn-divider divider-vertical">
                        <i class="view-info-icon"></i>
                    </div>
                    <div class="options icon-h torn-divider divider-vertical">
                        <i class="show-option-icon"></i>
                    </div>
                    <div class="clear"></div>
                </div>
                <ul class="bonuses">
                    ${item.itemBonuses}
                </ul>
                <div class="type">${item.type}</div>
                <div class="loaned t-overflow">
                    <span class="t-show bold">Loaned:</span>` +

                    (`$(item.user)` ?
                        `<a href="/profiles.php?XID=${item.user.userID}" class="h t-blue">${item.user.playername}</a>` : `Available`)

             + `</div>
                <div class="item-action">` +

                      (`${item.itemActions.retrieve}` ?
                        `<a href="#" aria-label="${item.name}. Action: Retrieve" class="retrieve active" data-role="retrieve">Retrieve</a>` :

                        (`${item.itemActions.loan}` ?
                            `<a href="#" aria-label="${item.name}. Action: Loan" class="retrieve active" data-role="loan">Loan</a>` :
                            `<div class="retrieve" data-role="loan">Loan</div>`))

                  +  (`${item.itemActions.give}` ?
                        `<a href="#" aria-label="${item.name}. Action: Give" class="give active" data-role="give">Give</a>` :
                        `<div class="give" data-role="give">Give</div>`)

                  + `<div class="checkbox-container ">` +

                    (`${item.itemActions.give}` ?
                    `<div class="choice-container">
                        <input id="${item.name}-${item.armourID}" class="checkbox-css without-label" type="checkbox" />
                        <label for="${item.name}-${item.armourID}" class="marker-css"><span>Check ${item.name}</span></label>
                    </div>` :
                    `<div class="choice-container">
                        <input id="${item.name}-${item.armourID}" class="checkbox-css without-label" type="checkbox" disabled="disabled" />
                        <label for="${item.name}-${item.armourID}" class="marker-css"><span>${item.name} is disabled</span></label>
                    </div>`)

                  + `</div>

                    <div class="clear"></div>
                </div>` +


                (`${item.itemActions.give}` ?

                `<div class="give-cont action-cont" data-id="${item.armourID}">
                    <div class="member-wrap" style="float: none">
                            <span class="member-cont">
                            <span class="t-hide">Please select faction member:</span>
                            <span class="t-show">Member:</span>
                            <input class="ac-search m-left5 m-right10" data-action="autocompleteUserAjaxAction" value=""
                                   name="user"/>
                            </span>
                            <span class="btn-wrap silver m-right10">
                                <span class="btn">
                                    <button class="torn-btn">GIVE</button>
                                </span>
                            </span>
                        <span class="cancel c-pointer">
                            <a href="#" class="wai-support t-blue h">Cancel</a>
                        </span>
                    </div>
                    <input name="quantity" type="hidden" value="1"/>

                    <div class="clear"></div>
                </div>` : ``) +

                (`${item.itemActions.loan}` ?

                `<div class="loan-cont action-cont" data-id="${item.armourID}">
                    <div class="member-wrap">
                            <span class="member-cont">
                            <span class="t-hide">Please select faction member:</span>
                            <span class="t-show">Member:</span>
                            <input class="ac-search m-left5 m-right10" data-action="autocompleteUserAjaxAction" value=""
                                   name="user"/>
                            </span>
                            <span class="btn-wrap silver m-right10">
                                <span class="btn">
                                    <button class="torn-btn">LOAN</button>
                                </span>
                            </span>
                        <span class="cancel c-pointer">
                            <a href="#" class="wai-support t-blue h">Cancel</a>
                        </span>
                    </div>
                    <input name="quantity" type="hidden" value="1"/>

                    <div class="clear"></div>
                </div>` : ``) +

                (`${item.itemActions.retrieve}` ?
                `<div class="retrieve-cont action-cont" data-id="${item.armourID}">
                    <div class="confirm-wrap msg">
                        <input type="hidden" value="${item.user.playername} [${item.user.userID}]"
                               name="user"/>
                        <span class="confirm">Are you sure you want to retrieve faction's ${item.name} from ${item.user.playername}?</span>
                            <span class="link-wrap">
                                <a class="t-blue h retrieve-yes bold m-left20" href="#">Yes</a>
                                <span class="use-no bold m-left10 c-pointer">
                                    <a href="#" class="wai-support t-blue h">No</a>
                                </span>
                            </span>
                    </div>
                    <div class="clear"></div>
                </div>` : ``) +

                `<div class="view-item-info">
                    <div class="item-cont">
                        <div class="item-wrap">
                                <span class="info-msg">
                                    <span class="ajax-preloader"></span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="clear"></div>
                </li>`;

        return newLi;
    }




    /*
    function buildLiForItem(item) {
        // Builds this li:
        // #armoury-weapons > ul.item-list.t-blue-cont.h.cont-gray > li:nth-child(1)

            `<ul class="list-title white-grad">
                <li class="item-title">Item</li>
                <li class="bonuses">Details</li>
                <li class="type">Type</li>
                <li class="loaned">Loaned</li>
                <li class="item-action">Action</li>
                <li class="clear"></li>
            </ul>
            <ul class="item-list t-blue-cont h cont-gray">

            </ul>
            <div class="give-all cont-gray bottom-round">
                <span class="member-send-to p10">
                    <span class="member-cont">
                        <span class="label">Please select faction member:</span>
                        <input class="ac-search m-left5 m-right10" data-action="autocompleteUserAjaxAction" value=""
                               name="user"/>
                    </span>
                </span>
                <span class="act-wrap">
                    <span class="select right">
                        <i class="select-all-icon"></i>
                        <span role="button">Select All</span>
                    </span>
                    <span class="btn-wrap silver m-right10">
                        <span class="btn">
                            <button class="torn-btn">GIVE</button>
                        </span>
                    </span>
                    <span class="cancel c-pointer">
                        <a href="#" class="wai-support t-blue h">Cancel</a>
                    </span>
                    <div class="clear"></div>
                </span>
            </div>

            <div class="pagination-wrap {{#if isset_pagination}}hide{{/if}}">
                {{{pagination}}}
            </div>
            {{else}}
            <div class="p10">
                The faction has no items in this category.
            </div>
            {{/if}}
        </script>

        `;
    }
    */






})();




