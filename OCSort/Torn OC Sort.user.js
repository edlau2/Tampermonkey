// ==UserScript==
// @name         Torn OC Sort
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Sort crimes in planning by time remaining
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @grant        GM_addStyle
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

    debugLoggingEnabled = false;

    const isOcPage = function () {return location.hash ? (location.hash.indexOf("tab=crimes") > -1) : false;}
    const hashChangeHandler = function () {handlePageLoad();}
    const sortList = function () {tinysort($(scenarios), {attr:'data-time'});}
    const btnIndex = function () {return $("#faction-crimes [class^='buttonsContainer_'] > [class*='active_']").index();}

    var userId;
    var scenarios;
    var scrollTimer;
    var sortTimer;

    function highlightSelf() {
        let me = $(`a[class^="slotMenu"][href*="XID=${userId}"]`);
        let wrapper = $(me).closest("[class^='wrapper_']");
        $(wrapper).addClass("xoc-myself");
    }

    function tagAndSortScenarios() {
        scenarios = $("[class^='scenario_']");
        debug("tagAndSortScenarios, count: ", $(scenarios).length);

        let listRoot = $($(scenarios)[0]).parent().parent();

        for (let idx=0; idx<$(scenarios).length; idx++) {
            let scenario = $(scenarios)[idx];
            let elem = $(scenario).find("[class^='wrapper_'] > div > p");
            let text = $(elem).text();
            if (text) {
                text = text.slice(0, 11);
                let parts = text.split(":");
                let totalSecs = (parts[0] * 24 * 60 * 60) + (parts[1] * 60 * 60) +
                    (parts[2] * 60) + parts[3];

                $(scenario).attr("data-time", totalSecs);
            }
        }
        sortList();

        if (!$(".xoc-myself").length) highlightSelf();
    }

    function initialScenarioLoad(retries=0) {
        scenarios = $("[class^='scenario_']");
        if ($(scenarios).length == 0) {
            if (retries++ < 20) return setTimeout(initialScenarioLoad, 250, retries);
            return debug("Didn't find any scenarios!");
        }

        tagAndSortScenarios();

        $(window).on('scroll', function() {
            clearTimeout(sortTimer);
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
                sortTimer = setTimeout(tagAndSortScenarios, 250);
            }, 250);
        });
    }

    function handlePageLoad(retries=0) {
        debug("handlePageLoad");
        if (!isOcPage()) return log("Not on crimes page, going home");

        let root = $("#faction-crimes");
        if ($(root).length == 0) {
            if (retries++ < 20) return setTimeout(handlePageLoad, 250, retries);
            return log("Didn't find root!");
        }
        setTimeout(initialScenarioLoad, 500);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    userId = getThisUserId();
    debug("User ID: ", userId);
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    versionCheck();
    addStyles();

    callOnHashChange(hashChangeHandler);

    if (!isOcPage()) return log("Not on crimes page, going home");

    callOnContentComplete(handlePageLoad);

    // Styles just stuck at the end, out of the way
    function addStyles() {
        GM_addStyle(`
            .xoc-myself {
                border: 1px solid green;
                filter: brightness(1.5);
            }
        `);
    }


})();