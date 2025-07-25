// ==UserScript==
// @name         Torn Dollar Bazaars
// @namespace    http://tampermonkey.net/
// @version      1.2
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

    var openBazaars = [];
    var bazaarIdx = 0;
    var bazaarsLen = 0;

    //var isUserPage = (location.pathname == '/bazaar.php');

    log("User page? ", isUserPage(), location.pathname);

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

        log("[isUserPage]: ", isUser, user, referer);

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
        log("Open bazaars: ", openBazaars, " index: ", bazaarIdx);
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

    var selfScroll = false;
    function handleWindowScroll() {
        if (selfScroll == true) return;
        var scrollTimer;
        if (scrollTimer) clearTimeout(scrollTimer);
        scrollTimer = setTimeout(getPageItems, 500);
    }

    // when scrolling, go up from last $1 item to its grandparent,
    // rowItems_* thne up to row_*, and stop when the are <3 $1
    // items in that row, or it is the last row
    function doScroll(pages, callback) {
        selfScroll = true;
        let currentScroll = $(window).scrollTop();
        let newScroll = currentScroll + $(window).height();
        $("html, body").scrollTop(newScroll);
        setTimeout(function() {selfScroll = false;}, 100);

        /*
        pages = pages - 1;
        if (pages <= 0) {
            log("autoscroll complete!!! ", totalScrolledPages);
            callback();
        } else {
            totalScrolledPages++;
            setTimeout(handleAutoScroll, 250, pages, callback);
        }
        */
    }

    function handleNextBazaar() {
        let href = getNextBazaarHref();
        log("[handleNextBazaar]: ", href);
        location.href = href;
    }

    // Click to sort by cost...
    var costBtnClicked = false;
    function clickCostBtn(retries=0) {
        if (costBtnClicked == true) return;
        let costBtn = $("[class^='searchBar_']").find("[aria-label='Search bar button: Cost']");
        //log("cost btn: ", $(costBtn));
        if (!$(costBtn).length) {
            if (retries++ < 30) return setTimeout(clickCostBtn, 250, retries);
            return log("clickCostBtn timed out.");
        }
        //$(costBtn).attr("style", "border: 2px solid red;");
        $(costBtn)[0].click();
        costBtnClicked = true;
    }

    /*
    $("#scroll-content").each(function() {
        let currentElement = $(this);
        let nextSibling = currentElement.next();
        $(this).append(nextSibling);
    });
    */

    function addScrollWrap(retries=0) {

        let wrapper = $(".wrapper")[0];
        let allSibs = $(wrapper).nextAll();

        if (!$(allSibs).length < 4) {
            if (retries++ < 50) return setTimeout(addScrollWrap, 250, retries);
            log("Timed out installing scroll wrap, count: ", $(allSibs).length);
        }

        $(wrapper).addClass('hdr-wrap'); //attr("style", "position: sticky; top: 0px; z-index: 999;");
        let scrollWrap =
            `<div id='scroll-outer' class='sticky-wrap'>
                <div id='scroll-content'></div>
            </div>`;
        $(wrapper).append(scrollWrap);
        log("New Scroll Wrapper: ", $("#scroll-outer"));
        log("Sibs: ", $(allSibs));

        for (let idx=0; idx<$(allSibs).length; idx++) {
            let sib = $(allSibs)[idx];
            $(sib).css("position", "relative");
            $("#scroll-content").append($(allSibs)[idx]);
        }

        clickCostBtn();

        // Need scroll to see all
        getPageItems();
    }

    function handleUserPageLoad(retries=0) {
        let hdr = $($(".wrapper")[0]).find("[class*='messageWrap']");
        if (!$(hdr).length) {
            if (retries++ < 30) return setTimeout(handleUserPageLoad, 250, retries);
        }

        let myBtn = `
            <span class="xrt-btn btn">
                <input id="xdb-next" type="submit" class="xedx-torn-btn-raw"
                    style="padding: 0px 10px 0px 10px; margin-left: 10px;" value="Next">
            </span>`;

        $(hdr).append(myBtn);
        log("myBtn: ", $("#xdb-next"));
        $("#xdb-next").on('click', handleNextBazaar);
        $("#xdb-next").parent().parent().find(".right-round").removeClass("right-round");

        addScrollWrap();

        /*
        let wrapper = $(".wrapper")[0];
        $(wrapper).attr("style", "position: sticky; top: 0px; z-index: 999;");
        let scrollWrap = `<div id='scroll-content' class='sticky-wrap'></div>`;
        $(wrapper).after(scrollWrap);
        log("New Scroll Wrapper: ", $("#scroll-content"));
        let allSibs = $("#scroll-content").nextAll();
        log("Sibs: ", $(allSibs));
        for (let idx=0; idx<$(allSibs).length; idx++) {
            $("#scroll-content").append($(allSibs)[idx]);
        }

        clickCostBtn();

        // Need scroll to see all
        getPageItems();
        */

        $(window).scroll(function() {
            handleWindowScroll();
        });
    }

    function handlePageLoad(retries=0) {
        log("[handlePageLoad] isUserPage: ", isUserPage());
        if (isUserPage() == true) {
            log("User page, bazaars: ", openBazaars);
            return handleUserPageLoad();
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

    callOnContentComplete(handlePageLoad);


    // Add any styles here
    function addStyles() {
        addTornButtonExStyles();
        loadCommonMarginStyles();
        addFlexStyles();

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
                max-height: 90vh;
                overflow-y: auto;
                top: 0;
                left: 0;
                /* position: sticky; */
                position: fixed;
                display: flex;
                /* flex-direction: column;
            }

            .hdr-wrap {
                display: flex;
                /* flex-flow: row wrap; */
                flex-direction: column;
                position: sticky;
                top: 0px;
                z-index: 999;
            }

            #scroll-content {
                max-height: 100%;
                overflow-y: scroll;
            }
        `);
    }

})();