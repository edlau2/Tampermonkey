// ==UserScript==
// @name         Torn Dollar Bazaars
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  This script jumps to the $1 bazaars, in order, and notifies you if anything available
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=bazaar*
// @match        https://www.torn.com/bazaar.php*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @exclude      https://www.torn.com/recaptcha.php*
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

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    const enableScrollLock = GM_getValue("enableScrollLock", false);

    GM_setValue("enableScrollLock", enableScrollLock);

    var openBazaars = [];
    var bazaarIdx = 0;
    var bazaarsLen = 0;
    var itemObserver;
    var orgItemObserver;
    var obsConnected = false;
    const itemObsCfg = {attributes: false, childList: true, characterData: false, subtree:true};

    const dollarIcon = `<path d="M541.7 768v-45.3c46.3-2.4 81.5-15 108.7-37.8 27.2-22.8 40.8-53.1 40.8-88.2 ` +
          `0-37.8-11-65.7-35.3-83.4-24.6-20.1-59.8-35.4-111.6-45.3h-2.6V351.8c35.3 5.1 65.3 15 95.1 ` +
          `35.4l43.6-55.5c-43.6-27.9-89.9-42.9-138.8-45.3V256h-40.8v30.3c-40.8 2.4-76.3 15-103.5 37.8-27.2 22.8-40.8 53.1-40.8 ` +
          `88.2s11 63 35.3 80.7c21.7 17.7 59.8 32.7 108.7 42.9v118.5c-38.2-5.1-76.3-22.8-114.2-53.1l-48.9 53.1c48.9 40.5 103.5 ` +
          `63 163.3 68.1V768h41zm2.6-219.6c27.2 7.5 43.6 15 54.4 22.8 8.1 10.2 13.6 20.1 13.6 35.4s-5.5 25.2-19.1 35.4c-13.6 ` +
          `10.2-30.1 15-48.9 17.7V548.4zM449.2 440c-8.1-7.5-13.6-20.1-13.6-32.7 0-15 5.5-25.2 16.2-35.4 13.6-10.2 27.2-15 ` +
          `48.9-17.7v108.6c-27.2-7.8-43.4-15.3-51.5-22.8z"/>`;

    function isUserPage() {
        let params = new URLSearchParams(document.location.search);
        let user = params.get('userId');
        let referer = params.get('referer');
        let isUser = (location.pathname == '/bazaar.php');
        return isUser;
    }

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function scrollTo(node) {
        log("**** scrollTo: ", $(node));
        if ($(node).length) {
            var targetScrollPosition = $(node).offset().top - ($(window).height() / 2) + ($(node).outerHeight() / 2);
            $('html, body').animate({scrollTop: targetScrollPosition}, 800);
        }
    }

    function getNextBazaarHref() {
        bazaarIdx++;
        if (bazaarIdx >= bazaarsLen) bazaarIdx = 0;
        GM_setValue("bazaarIdx", bazaarIdx);
        let href = openBazaars[bazaarIdx];
        if (!href) return log("Bad href! idx: ", bazaarIdx);

        href = href.replace('#/', "&referer=tdb");
        log("[handleMainBtnClick] href: ", href);

        return href;
    }

    function handleMainBtnClick(e) {
        if (!bazaarsLen) return log("[handleMainBtnClick] No open bazaars!");
        let href = getNextBazaarHref();
        openInNewTab(href);
    }

    function installUserPageUi() {
        log("[installUserPageUi]");
        openBazaars = JSON.parse(GM_getValue("openBazaars", JSON.stringify([])));
        bazaarIdx = GM_getValue("bazaarIdx", 0);
        bazaarsLen = openBazaars.length;
        //log("Open bazaars: ", openBazaars, " index: ", bazaarIdx);
    }

    function startUiInstall(retries=0) {
        log("[startUiInstall] isUserPage: ", isUserPage());
        if (isUserPage() == true) return installUserPageUi();

        let root = $("#bazaar-directory-root > div > section > div[class*='header_'][class*='withIcon_'] > span > div");
        if (!$(root).length) {
            if (retries++ < 50) return setTimeout(startUiInstall, 250, retries);
            return log("[startUiInstall] timed out.");
        }

        let firstBtn = $(root).find("button")[0];
        let clone = $(firstBtn).clone();

        //let path = $(clone).find("path")[0];
        //log("Path: ", $(path));
        //$(path).replaceWith($(dollarIcon));

        let newSvg = `<span style='font-size: 14px;'>$1</span>`;
        let svg = $(clone).find("svg")[0];
        $(svg).replaceWith(newSvg);

        $(clone).attr("id", "x-bazaar-hdr-btn");
        //$(clone).attr("style", "border: 1px solid blue");

        $(root).prepend($(clone));

        //let myButton = `<span class="xflexr"><input id="x-bazaar-hdr-btn" type="submit"
        //            style="width: 90px; margin-top: -6px;" class="xedx-torn-btn xml15" value="$1 Bazaars!"></span>`;
        //$(root).parent().addClass("xflexr");
        //$(root).after(myButton);

        //log("[startUiInstall] retries: ", retries, " myButton: ", $("#x-bazaar-hdr-btn"));

        let path = $("#x-bazaar-hdr-btn").find("path")[0];
        //log("Path: ", $(path), " pos: ", $(path).position());

        $("#x-bazaar-hdr-btn").on('click', handleMainBtnClick);
    }

    function filterElementsWithoutClassInChild(elements, partialClassName) {
        return Array.from(elements).filter(element => {
            return !$(element).find(`[class*='${partialClassName}']`).length;
        });
    }

    /*
    var pageItems;
    var itemRows;
    var lastItem;
    var endOfPages = false;
    var prevLen = 0;
    var currLen = 0;
    var maxLen = 0;
    var prevRowsLen = 0;
    var currRowsLen = 0;
    var maxRowsLen = 0;
    function getPageItems() {
        pageItems = $("div.ReactVirtualized__Grid.ReactVirtualized__List > div [class*='row_'] [class*='rowItems_'] [class*='item_']");
        //log("getPageItems, end: ", endOfPages, " pageItems: ",  $(pageItems).length); //, $(pageItems));
        //if (!$(pageItems).length || endOfPages == true)
        //    log("No length, or at end: ", $(pageItems).length, endOfPages, $(lastItem));

        let dollarItems = $("div.ReactVirtualized__Grid.ReactVirtualized__List > div [class*='row_'] [class*='rowItems_'] [class*='item_']")
        .filter(function(index){ return $(this).find('[class^="price_"]').text() == '$1';});

        let unlockedDollarItems = $(dollarItems).find('canvas').filter(function(index){ return !$(this).hasClass('isBlockedForBuying___dv7DR')});

        //log("$1 items: ", $(dollarItems));
        log("Unlocked $1 items: ", $(unlockedDollarItems).length);

        for (let idx=0; idx<$(unlockedDollarItems).length; idx++) {
            $($(unlockedDollarItems)[idx]).parent().attr("style", "border: 2px solid blue !important;");
            let buyBtn = $($(unlockedDollarItems)[idx]).parent().find("button")[1];
            log("Buy btn: ", $(buyBtn), " list: ", $(unlockedDollarItems));
            $(buyBtn).attr("style", "border: 2px solid red !important;");
            $(buyBtn).on('click', function(e) { log("Buy btn clicked", $(this)); });

            let root = $($(unlockedDollarItems)[idx]).closest("[class^='itemDescription_']").parent();
            let row = $(root).parent().parent();
            $(root).addClass("xo-neg xout");
            $(row).addClass("xo-neg");
        }

        // see if we have reached the end of $! items
        currLen = $(dollarItems).length;
        if (currLen > maxLen) maxLen = currLen;
        currRowsLen = getItemRows();
        if (currRowsLen > maxRowsLen) maxRowsLen = currRowsLen;
        //log("dollarItems lengths: ", currLen, prevLen, maxLen);
        //log("Row counts: ", currRowsLen, prevRowsLen, maxRowsLen);
        if (currLen) {
            //log("typeof: ", typeof dollarItems, typeof $(dollarItems));
            lastItem = $(dollarItems)[currLen - 1];
            //log("Last item: ", $(lastItem));
            let itemRow = $(lastItem).parent().parent();
            //log("itemRow: ", $(itemRow));
            let nextRow = $(itemRow).next();
            if ($(nextRow).length) {
                let items = $(nextRow).find("[class*='rowItems_'] [class*='item_']")
                      .filter(function(index){ return $(this).find('[class^="price_"]').text() == '$1';});
                //log("All row items: ", $(nextRow).find("[class*='rowItems_'] [class*='item_']"));
                //log("$! row Items: ", $(items));
                if (!$(items).length) endOfPages = true;
            }
        } else if (prevLen == 0 && maxLen) {
            endOfPages = true;
        }

        prevLen = currLen;
        prevRowsLen = currRowsLen;

        if (endOfPages == true)
            log("**** End of $1 items! **** (last is ", $(lastItem), ")");
    }

    function getItemRows() {
        itemRows = $("div.ReactVirtualized__Grid.ReactVirtualized__List > div [class*='row_']");
        //log("getItemRows: ", $(itemRows));

        return $(itemRows).length;
    }
    */

    // =====================================================================================

    var unlockedDollarItems;
    var clonedItems = {};

    // Get list of all items- unused
    function refreshAllItems() {
        allItems = $(".editor-content [class^='item_']");
        return allItems;
    }

    // Find unlocked $! items
    function refreshUnlockedItems() {
        unlockedDollarItems = $(".editor-content:last-child [class^='item_']").filter(function() {
            //let dnodes = $(this).find(':contains("$1"):not(".xunlocked")');
            if ($(this).attr("data-cloned") == "true" || $(this).hasClass("cloned")) return false;
            let dnodes = $(this).find(':contains("$1")');
            for (let idx=0; idx <$(dnodes).length; idx++) {
                if (($($(dnodes)[idx]).text().trim() == '$1')
                && ($(this).find("[class^='lockedOverlay']").length == 0)) {
                    return true;
                }
            }
            return false;
        });

        return unlockedDollarItems;
    }

    function scrollIntoViewWithOffset(element, offset) {
        //const element = document.querySelector(selector);
        if (element) {
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    }

    function cloneDivContents(src, dst) {
        let $clonedContents = $(src).contents().clone(true);
        $(dst).append($clonedContents);
        log("[cloneDivContents]: ", $(src), $(dst));
    }

    GM_addStyle(`.oi-o { outline: 2px solid limegreen; outline-osset: -3px; }`);

    /*
    function handleCloneCloseBtn(e) {
        e.stopPropagation();
        e.preventDefault();
        log("[handleCloneCloseBtn]: ", $(this));
        let clone = $(this).closest('.dollar-clone');
        let myId = $(clone).attr('id');
        log("clone: ", $(clone), " id: ", myId);
        let orgId = myId.replace('cloned', 'org');
        let orgItem = $(`.editor-content #${orgId}`);
        log("org item: ", $(orgItem));
        let orgCloseBtn = $(orgItem).find("button[class^='close']");
        log("org btn: ", $(orgCloseBtn));
        if ($(orgCloseBtn).length)
            $(orgCloseBtn).click();
    }
    */

    function handleCloneNewBtns(e) {
        e.stopPropagation();
        e.preventDefault();
        log("[handleCloneNewBtns]: ", $(this));
        let btnIdx = $(this).index();
        let btnClass = $(this).attr("class");
        log("[handleCloneNewBtns], index: ", btnIdx, " class: ", btnClass);
        let clone = $(this).closest('.dollar-clone');
        let myId = $(clone).attr('id');
        log("clone: ", $(clone), " id: ", myId);
        let btns = $(clone).find("button");
        log("btns: ", $(btns));
        //$($(btns)[btnIdx]).css("border", "1px solid red");
        let isCtrlPanel = $(this).attr("class").indexOf("controlPanelButton") > -1;

        let orgId = myId.replace('cloned', 'org');
        let orgItem = $(`.editor-content #${orgId}`);
        log("org item: ", $(orgItem));
        //$(orgItem).css("opacity", 0.4);
        if (!$(orgItem).length) {
            log("Original node not found! Removing clone.: ", $(clone));
            $(clone).remove();

            if (!$('.dollar-clone').length) { // No more nodes, remove border
                $("#dollarDiv").addClass("hidden");
            }
            return;
        }

        let orgBtn = $(orgItem).find(`[class='${btnClass}']`);
        log("orgBtn: ", $(orgBtn));
        //$(orgBtn).css("border", "1px solid green");
        $(orgBtn).click();

        if (isCtrlPanel == true && btnIdx == 0) {
            log("[handleCloneNewBtns] scrollIntoViewWithOffset, off 80");
            scrollIntoViewWithOffset($(orgItem)[0], 80);
        } else {
            log("[handleCloneNewBtns], no scroll");
        }

        // only for buy, not close...check class...
        //reCloneElement(clone, orgItem, "[id^='buy-confirmation-msg']");
    }

    function reCloneElement(clone, orgItem) {
        log("[recloneElement]: ", $(clone), $(orgItem));
        $(clone).empty();
        cloneDivContents($(orgItem), $(clone));
        $(clone).css("opacity", 1.0)

        let btns = $(clone).find("button");
        $(btns).on("click", handleCloneNewBtns);
        log("[recloneElement] success, btns: ", $(btns));

        reconnectObservers();
    }

    function handleCloneClick(e) {
        e.stopPropagation();
        e.preventDefault();
        log("[handleCloneClick]: ", $(this));
        let btnIdx = $(this).index();
        log("[handleCloneClick], index: ", btnIdx);
        let clone = $(this).closest('.dollar-clone');
        let myId = $(clone).attr('id');
        log("clone: ", $(clone), " id: ", myId);
        let orgId = myId.replace('cloned', 'org');
        let orgItem = $(`.editor-content #${orgId}`);
        log("org item: ", $(orgItem));
        let boughtNode = $(clone).find("[id^='bought-msg']").length > 0;
        let closeBtn = $(this).attr("class").indexOf("close") > -1;

        if ($(orgItem).length) {
            $(".oi-o").removeClass("oi-o");
            $(orgItem).addClass("oi-o");
            //$(orgItem).css("opacity", 0.4);
            //$(orgItem)[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
            //scrollIntoViewWithOffset(`.editor-content #${orgId}`, 80);
            if (btnIdx == 0) {
                //let scrollOpts = { behavior: 'smooth', block: 'start' };
                let scrollOpts = { behavior: 'instant', block: 'start', container: 'nearest' };
                //$(orgItem)[0].scrollIntoView(scrollOpts);
                log("[handleCloneClick] scrollIntoViewWithOffset, off 80");
                scrollIntoViewWithOffset($(orgItem)[0], 80); // 105?
            }
        } else if (boughtNode == true && closeBtn == true) {
            log("Original node not found! Removing clone.: ", $(clone));
            $(clone).remove();
            return;
        }

        let orgBtns = $(orgItem).find("[class*='controlPanelButton']");
        log("orgBtns: ", orgBtns);
        $($(orgBtns)[btnIdx]).click();

        //setTimeout(reCloneElement, 250, $(clone), $(orgItem), "button[class^='close']");
    }


    // Create a table with unlocked elements
    function newRow() { return `<tr class="tr-next"><td class="td-next"></td><td></td><td></td></tr>`; }
    function getDollarDiv() { return `<div id="dollarDiv"><table><tbody><div>${newRow()}<div id='xtab-left'><span></span><span></span></div></div></tbody></table></div>`; }
    //function getDollarDiv() { return `<div id="dollarDiv"><table><tbody>${newRow()}</tbody></table></div>`; }

    function getNextCell() {
        let cell = $(".td-next");
        let row = $(cell).parent();
        if ($(row).hasClass("tr-next")) $(row).removeClass("tr-next");
        $(cell).removeClass("td-next");
        if ($(cell).index() == 2) {
            $(row).after(newRow());
        } else {
            $(cell).next().addClass("td-next");
        }
        return $(cell);
    }

    function insertCell(cell) {
        log("Inserting cell: ", $(cell));
        $("#dollarDiv").removeClass("hidden");
        let emptyTd = getNextCell();
        $(emptyTd).append($(cell));
    }

    // Decide what to do with the unlocked items
    var clonedCnt = 0;
    function handleUnlockedItems() {
        for (let idx=0; idx<$(unlockedDollarItems).length; idx++) {
            let item = $(unlockedDollarItems)[idx];
            log("Item: ", $(item));
            let itemLoc = "row-" + $(item).index() + "-col-" + $(item).index();
            if ($(item).attr('data-cloned') == "true" || $(item).hasClass("cloned")) {
                log("Failed ests: ", ($(item).attr('data-cloned') == "true"),  $(item).hasClass("cloned"));
                continue;
            }
            if (clonedItems[itemLoc] != undefined) {
                log("Failed item loc test: ", clonedItems[itemLoc]);
                continue;
            }

            $(item).addClass("cloned");
            $(item).attr('data-cloned', "true");
            clonedItems[itemLoc] = 'true';

            let cloned = $(item).clone(true, true);
            let id = 'cloned-' + clonedCnt;
            let itemId = 'org-' + clonedCnt;
            $(cloned).attr("id", id);
            $(item).attr('id', itemId);
            $(item).css("opacity", 0.1);    // Set visibility to "hidden" or opacity to 0?
            clonedCnt++;

            log("cloned item: ", $(cloned));
            log("Item attr: ", $(item).attr('data-cloned'));
            log("Item class: ", $(item).attr('class'));
            log("Item loc: ", itemLoc, " index: ", $(item).index(), " parent row: ", $(item).parent().parent().index());
            log("cloned items: ", clonedItems);
            insertCell($(cloned));

            itemObserver.observe($(item)[0], itemObsCfg);
            obsConnected = true;

            $(`#${id}`).addClass('dollar-clone');
            $(`#${id}`).find("[class*='controlPanelButton']").on('click', handleCloneClick);

            log("My btns: ", $(`#${id}`).find("[class*='controlPanelButton']"));
        }
    }

    // Refresh, look for new items. Change to observer?
    function getPageItems(retries=0) {
        if (!$("#dollarDiv").length) {
            if (retries++ < 50) return settimeout(getPageItems, 250);
            return log("dollarDiv not found!");
        }

        //refreshAllItems();
        refreshUnlockedItems();

        //log("itemList: ", $(allItems).length); //, allItems);
        log("unlockedDollarItems: ", $(unlockedDollarItems).length); //, unlockedDollarItems);

        handleUnlockedItems();
    }

    // =========================================

    var scrollTimer;
    var elementOffset;
    function handleWindowScroll() {
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(getPageItems, 1000);
    }

    // ===============================================================================

    /*
    var selfScroll = false;
    var scrollTimer;
    function handleWindowScroll() {
        if (selfScroll == true) return;
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(getPageItems, 500);
    }
    */

    // when scrolling, go up from last $1 item to its grandparent,
    // rowItems_* thne up to row_*, and stop when the are <3 $1
    // items in that row, or it is the last row
    function doScroll(pages, callback) {
        selfScroll = true;
        let currentScroll = $(window).scrollTop();
        let newScroll = currentScroll + $(window).height();
        $("html, body").scrollTop(newScroll);
        setTimeout(function() {selfScroll = false;}, 100);
    }

    function handleNextBazaar() { location.href = getNextBazaarHref(); }

    // Click to sort by cost...
    var costBtnClicked = false;
    function clickCostBtn(retries=0) {
        if (costBtnClicked == true) return;
        let costBtn = $("[class^='searchBar_']").find("[aria-label='Search bar button: Cost']");
        if (!$(costBtn).length) {
            if (retries++ < 50) return setTimeout(clickCostBtn, 250, retries);
            return log("clickCostBtn timed out.");
        }
        $(costBtn)[0].click();
        costBtnClicked = true;
    }

    function addScrollWrap(retries=0) {
        let wrapper = $(".wrapper")[0]; //$("[class*='searchBar_']");
        let allSibs = $(wrapper).nextAll();

        if (!$(allSibs).length < 4) {
            if (retries++ < 50) return setTimeout(addScrollWrap, 250, retries);
            log("Timed out installing scroll wrap, count: ", $(allSibs).length);
        }

        $(wrapper).addClass('hdr-wrap');

        let scrollWrap =
            `<div id='scroll-outer' class=''>
                <div id='scroll-content'></div>
            </div>`;


        $(wrapper).append(scrollWrap);
        //$(wrapper).before(scrollWrap);
        $("[class*='searchBar']").addClass("stickySearch");

        for (let idx=0; idx<$(allSibs).length; idx++) {
            let sib = $(allSibs)[idx];
            if (!$(sib).hasClass("stickySearch"))
                $(sib).css("position", "relative");

            $("#scroll-content").append($(allSibs)[idx]);
        }

        //$("[class*='searchBar']").before($("#scroll-content"));
        //$("#scroll-content").append($("[class*='searchBar']"));

        //if ($("#scroll-outer").prev().hasClass("page-head-delimiter"))

        //$("[class*='searchBar']").addClass("stickySearch");
        //$("[class*='searchBar']").attr("style", "");

        scrollTo($("#scroll-content"));
        clickCostBtn();
        getPageItems();
    }

    function addHdrBtn(retries=0) {
        let hdr = $($(".wrapper")[0]).find("[class*='messageWrap']");
        if (!$(hdr).length) {
            if (retries++ < 30) return setTimeout(addHdrBtn, 250, retries);
            return log("Timed out adding header btn");
        }

        let myBtn = `
            <span class="xrt-btn btn">
                <input id="xdb-next" type="submit" class="xedx-torn-btn-raw"
                    style="padding: 0px 10px 0px 10px; margin-left: 10px;" value="Next">
            </span>`;

        $(hdr).append(myBtn);
        $("#xdb-next").on('click', handleNextBazaar);
        $("#xdb-next").parent().parent().find(".right-round").removeClass("right-round");
    }

    function handleUserPageLoad(retries=0) {
        if (retries == 0) log("[handleUserPageLoad] first attempt");

        if (!$("#xdb-next").length)
            addHdrBtn();

        let msgs = $("#bazaarRoot [class*='messageContent_']");
        if ($(msgs).text() && $(msgs).text().indexOf('currently closed') > -1) {
            log("msgs: ", $(msgs).text());
            return log("Bazaar is closed!");
        }

        let target = $($(".editor-content")[1]); // [class^='loadingSame_']");
        if (!$(target).length) {
            target = $($(".editor-content")[0]);
        }
        if (!$(target).length) {
            if (retries++ < 30) return setTimeout(handlePageLoad, 100, retries);
            return log("[handlePageLoad] timed out");
        }

        if (enableScrollLock == true)
            addScrollWrap();

        log("[handleUserPageLoad] retries: ", retries);
        $(target).css("margin-top", "0px");
        $(target).before(getDollarDiv());
        elementOffset = $('#dollarDiv').position().top - 80;
        $('#dollarDiv').addClass("sticky");

        // TEMP - add back!
        //$('#dollarDiv').addClass("hidden");


        log("**** Starting orgItemObserver: ", $(target));
        orgItemObserver.observe($(target)[0], { attributes: false, childList: true, subtree:true});

        //if (enableScrollLock == true)
        //    addScrollWrap();
        //clickCostBtn();

        setTimeout(getPageItems, 1000);
        log("[handlePageLoad] ", $("#dollarDiv"), "\nOffset: ", elementOffset);

        $(window).scroll(function() {
            handleWindowScroll();
        });
    }

    function handlePageLoad(retries=0) {
        if (isUserPage() == true) {
            return handleUserPageLoad(retries);
        }

        let bazaarList = $("#bazaar-directory-root > div > div[class*='container_'] > section:nth-child(8) > div[class*='content_'] > ul > li");
        if (!$(bazaarList).length) {
            if (retries++ < 30) return setTimeout(handlePageLoad, 250, retries);
            return log("[handlePageLoad] timed out.");
        }
        let filteredElements = filterElementsWithoutClassInChild($(bazaarList), 'notAvailable');
        log("filtered: ", $(filteredElements));

        for (let idx=0; idx<$(filteredElements).length; idx++) {
            let bazaar = $(filteredElements)[idx];
            let href = $(bazaar).find('a').attr('href');
            if (href) {
                log("Bazaar #", idx, ": ", href);
                openBazaars.push(href);
            }
        }

        bazaarsLen = openBazaars.length;
        GM_setValue("openBazaars", JSON.stringify(openBazaars));
    }

    function reconnectObservers() {
        log("[reconnectObservers]");
        let cnt = 0;
        let list = $("[id^='org-'][data-cloned='true']");
        log("List: ", $(list), list);
        $.each(list, function(index, element) {
        //list.forEach(element => {
            cnt++;
            itemObserver.observe(element, itemObsCfg);
        });
        log("Added ", cnt, " observers");
    }

    function installObservers() {
        const handleChangedNodes = function(mutationsList, observer) {
            for (const mutation of mutationsList) {
                let orgItem = $(mutation.target).closest("[data-cloned='true']");
                log("mutation, type: ", mutation.type, " target: ", $(mutation.target));
                log("org item: ", $(orgItem));
                if ($(orgItem).length) {
                    let id = $(orgItem).attr("id");
                    let cloneId = id ? id.replace("org", "cloned") : null;
                    log("id: ", id, " cloneId: ", cloneId);

                    let clone = $(`#${cloneId}`);
                    log("Clone: ", $(clone));

                    // Set timeout to do in a bit
                    // Disocnnect observer, will remove from all
                    // so after cloning, add to all ".cloned"
                    if ($(clone).length) {
                        log("Disconnecting observer");
                        itemObserver.disconnect();
                        obsConnected = false;
                        let timerId = $(clone).attr("data-tid");
                        if (timerId) clearTimeout(timerId);
                        timerId = setTimeout(reCloneElement, 250, $(clone), $(orgItem));
                        $(clone).attr("data-tid", timerId);
                    }

                }
            }
        };
        itemObserver = new MutationObserver(handleChangedNodes);

        orgItemObserver = new MutationObserver(function(mutationsList, observer) {
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                    mutation.removedNodes.forEach(function(removedNode) {
                        let nodeId = $(removedNode).attr("id");
                        log("**** orgItemObserver node removed! ID: ", nodeId);
                        if (nodeId && nodeId.startsWith("org-")) {
                            log("**** orgItemObserver cloned node removed! ", $(removedNode));
                            let cloneId = nodeId.replace("org-", "cloned-");
                            $(`#${cloneId}`).remove();
                            if (!$('.dollar-clone').length) { // No more nodes, remove border
                                $("#dollarDiv").addClass("hidden");
                            }
                        }
                    });
                }
            }
        });

        //orgItemObserver.observe($(".editor-content:last-child"), { childList: true });
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    //validateApiKey();
    versionCheck();

    addStyles();

    //callOnHashChange(hashChangeHandler);
    //installPushStateHandler(pushStateChanged);

    // https://www.torn.com/bazaar.php?userId=3485561#/

    startUiInstall();

    installObservers();

    callOnContentComplete(handlePageLoad);


    // Add any styles here
    function addStyles() {
        addTornButtonExStyles();
        loadCommonMarginStyles();
        addFlexStyles();

        GM_addStyle(`

            #dollarDiv {
                box-sizing: border-box;
                height: 95vh;;
                position: relative;
                width: 804px;
                overflow: hidden auto;
            }
            .sticky {
                position: fixed !important;
                top: 74px;
                z-index: 9999;
                /* left: 0px; */
                margin-left: -20px;
                /* width: 804px;*/
            }

            .sticky .tt-sub-vendor-highlight {
                /*outline: 2px solid red;
                outline-offset: -5px;*/
                background-color: rgba(0, 165, 0, 1.0) !important;
            }
            .dollar-clone {
                */outline: 2px solid yellow;
                outline-offset: -3px;*/
                background-color: rgba(0, 185, 0, 0.8) !important;
            }

            #dollarDiv table {
                width: 100%;
            }
            #dollarDiv tbody {
                /* border: 2px solid lightgray; */
                padding-left: 20px;
                display: grid;
            }
            #dollarDiv table tr {
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-wrap: wrap;
                height: 78px;
                position: relative;
                border-left: 1px solid lightgray;
                border-right: 1px solid lightgray;
            }
            #dollarDiv table td {
                width: 33%;
                color: var(--default-color);
            }
            #dollarDiv table tr:first-child {
                border-top: 1px solid lightgray;
            }
            #dollarDiv table tr:last-child {
                border-bottom: 1px solid lightgray;
            }
            #xtab-left {
                outline-offset: -1px;
                outline: 1px solid limegreen;
                width: 20px;
                height: 78px;
                display: block;
                position: absolute;
                /* left: -20px; */
                background: lightcoral;
                z-index: 9999999;
                cursor: pointer;
                display: flex;
                flex-direction: column;
            }

            .tr-next, .hidden {display: none;}
        `);

        GM_addStyle(`
            .xrt-btn {
                margin-left: auto;
                margin-right: 10px;
                float: right;
            }

            .xout {
                outline-offset: -6px;
                outline: 4px solid #444;
                outline-style: inset;
             }
            .xo-neg { order: -1; }

            .sticky-wrap {
                max-height: 98vh;
                overflow-y: auto;
                top: 0;
                left: 0;
                position: sticky;
                display: flex;
                /* flex-direction: column; */
            }

            .hdr-wrap {
                display: flex;
                /* flex-flow: row wrap; */
                flex-direction: column;
                position: sticky;
                top: 0px;
                z-index: 999999;
            }

            #scroll-content {
                max-height: 100%;
                overflow-y: scroll;
            }
            .stickySearch {
                position: sticky !important;
                top: 0;
                left: 0;
                z-index: 99999;
            }
        `);
    }

})();