// ==UserScript==
// @name         Bazaar Opener
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Dynamically open available bazaar pages
// @author       Kontamuse and XedX
// @match        https://www.torn.com/imarket.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

(function() {
    'use strict';

    // Globals and constants...

    // set this to 'true' to auto-open top three
    const autoOpen = false;

    const openBazaarValue = "Open Bazaars";
    const openBazaarBtn = `<span id="bobtn" class="btn"><input type="button" class="torn-btn lm10" value="` + openBazaarValue + `"></span>`;
    const openInNewTab = (url) => {log("newtab: ", url); window.open(url, '_blank').focus();}
    const getTopThreeBazaars = () => {return $(".buy-item-info-wrap").find(".private-bazaar");}
    const addStyles = () => {GM_addStyle(`.lm10 {margin-left: 10px;}`);}
    //const handleBtnClick = () => {openThreeTabs(getTopThreeBazaarURLs());}

    logScriptStart();
    addStyles();
    callOnContentComplete(contentCompleteCB);

    // Install the "Open Bazaars" button and add a handler. The button
    // is initially disabled, clicking an item enables it, it does
    // nothing until something is there to go to (for now...)
    // May not need retires here...
    //var retries = 0;
    function installOpenBazaarBtn() {
        if ($("#bobtn").length > 0) return;
        if ($('input[value="SEARCH"]').length <= 0)
            return setTimeout(installOpenBazaarBtn, 250);
        $('input[value="SEARCH"]').after(openBazaarBtn);
        $('input[value="' + openBazaarValue + '"]').on('click', handleBtnClick);

        //$('input[value="' + openBazaarValue + '"]').on('contextmenu', handleBRightClick);
    }

    // Dev function, used to test code.
    function handleBRightClick() {

    }

    function getActiveItemId() {
        let parent = $(".buy-item-info-wrap").parent();
        let active = $(parent).find(".act");
        return $(active).attr("data-item");
    }

    // This handles clicking the button. It opens the top 3 bazaars
    // in new tabs, and uses a slightly different method if on a
    // search result page or results of clicking item category.
    function handleBtnClick() {
        const hash = window.location.hash.substr(1);
        log("[handleBtnClick] hash: ", hash);
        if (hash && hash.indexOf("p=shop") > -1) {
            return openThreeTabsFromHash();
        }

        openThreeTabs(getTopThreeBazaarURLs());
    }

    var hoverRetries = 0;    // Defneeded here, I've seen it fail a few times.
    function addHoverClick() {
        if (hoverRetries++ > 3) return;
        if ($(".hover").length <= 1) return setTimeout(addHoverClick, 500);

        $(".hover").on('click', function () {$('input[value="' + openBazaarValue + '"]').prop('disabled', false);});
        hoverRetries = 0;
    }


    function getTopThreeBazaarURLs() {
        let nodeList = getTopThreeBazaars();
        log("[getTopThreeBazaarURLs]nodes: ", nodeList);
        let hrefList = [];
        if (nodeList.length) {
            log("nodelist: ", $(nodeList));
            for (let i=0; i < nodeList.length; i++) {
                let href = $(nodeList[i]).find(".buy > a");
                log("href: ", href);
                if (!href.length) {
                    href = $(nodeList[i]).find(".view-link");
                    log("href2: ", href);
                }
                if (href.length) {
                    log("href attr: ", $(href).attr('href'));
                    hrefList.push($(href).attr('href'));
                }
                else {
                    log("href not found!! node: ", nodeList[i]);
                }
                if (i == 2) break;
            }
        }
        log("[getTopThreeBazaarURLs] list: ", hrefList);
        return hrefList;
    }

    // May need to delay slightly before calling the setup fn,
    // or it can retry. Page won't have loaded quick enough.
    function onHashChange() {
        const hash = window.location.hash.substr(1);
        log("[onHashChange] hash: ", hash);
        contentCompleteCB(true);
    }

    // Really the main entry point, called when the DOM
    // content has completely loaded.
    function contentCompleteCB(fromHash=false) {
        log("[contentCompleteCB]");

        // This is the case where we are called from the museum script or an item search.
        // In this case, determined by the hash, the page layout will be different but the
        // approach is the same - grab the top 3 bazaar URLs and call openThreeTabs()
        const hash = window.location.hash.substr(1);
        log("hash= ", hash);
        if (autoOpen && hash && hash.indexOf("p=shop") > -1) {
            setTimeout(openThreeTabsFromHash, 2000);  // 2 secs is arbitrary, need better way here...
            if (fromHash) return;
        }

        installHashChangeHandler(onHashChange);
        installOpenBazaarBtn();
    }

    // From an item search or getting here from museum, parse bazaar hrefs
    function openThreeTabsFromHash() {
        let nodeList = $(".item-hover");
        log("[openThreeTabsFromHash] nodes: ", nodeList);
        for (let i=0; i < nodeList.length; i++) {
            let node = nodeList[i];
            let href = $(node).attr("href");
            openInNewTab(href);
        }
    }

    // New 'openThreeTabs()' - take a list of base bazaar URLs and opens in new tabs.
    // May add more later, such as item ID, etc. These are added by Torn Tools, so
    // don't add if not installed. For example, fullURL + "&tt_itemid=2&tt_itemprice=100"
    function openThreeTabs(hrefList) {
        log("[openThreeTabs] list: ", hrefList);
        if (!hrefList || hrefList.length == 0) return;
        let itemId = getActiveItemId();
        for (let url of hrefList) {
            if (!url || url == undefined) {
                log("Error: bad URL parsed!");
                continue;
            }
            openInNewTab("https://www.torn.com/" + url + "&tt_itemid=" + itemId);
        }
    }

})();



