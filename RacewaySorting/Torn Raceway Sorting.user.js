// ==UserScript==
// @name         Torn Raceway Sorting
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Allows sorting of custom races by start time
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
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

    if (location.href.indexOf('racing') < 0) return;

    const getCustRaceWrap = function () {return $(".custom-events-wrap");}
    const hasCustRaceWrap = function () {return $(".custom-events-wrap").length > 0;}

    var currentCat;

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    var prevOrder = 0;
    function doSort() {
        let matches = $(".events-list > li");
        let attr = 'data-startTime';
        let order = (prevOrder == 0) ? 'asc' : 'desc';
        prevOrder = (prevOrder == 0) ? 1 : 0;

        debug("doSort: ", $(matches));
        tinysort(matches, {attr: attr, order: order});
    }

    var inClick = false;
    function resetClickFlag() {inClick = false;}
    function handleStartTimeClick(e) {
        debug("handleStartTimeClick");
        if (inClick == true) return false;
        inClick = true;
        doSort();
        setTimeout(resetClickFlag, 500);
        return false;
    }

    function handleCatClick(e) {
        debug("handleCatClick");
        setTimeout(handlePageLoad, 250);
    }

    function parseTextTime(timeText) {
        // format: 'x h y m", "y m", "waiting"
        let hrs = 0, min = 0;
        if (timeText.indexOf('waiting') > -1) return 0;

        let hasMin = (timeText.indexOf('m') > -1);
        timeText = timeText.replaceAll('\n', '').trim();
        if (timeText.indexOf('h') > -1) {
            let parts = timeText.split('h');
            hrs = parseInt(parts[0]);
            if (hasMin) min = parseInt(parts[1]);
        } else if (timeText.indexOf('m') > -1) {
            let parts = timeText.split('m');
            min = parseInt(parts[0]);
        }

        return hrs * 3600 + min * 60;
    }

    function addSortAttrs() {
        let rootLis = $(".events-list > li");
        for (let idx=0; idx<$(rootLis).length; idx++) {
            let li = $(rootLis)[idx];
            let startTimeNode = $(li).find(".startTime");
            let timeText = $(startTimeNode).text();
            let timeSecs = parseTextTime(timeText);

            if (isNaN(timeSecs)) {
                debug("NaN!!! '", timeText, "' ", $(li), $(startTimeNode));
                debugger;
            }
            $(li).attr("data-startTime", timeSecs);
        }
    }

    function handlePageLoad(retries=0) {
        if (retries == 0) debug("[handlePageLoad]");
        if (location.href.indexOf('racing') < 0) return;

        $("ul.categories > li").on('click', handleCatClick);

        // Find active button/category
        let active = $("ul.categories > li.active");
        if (!$(active).length) { // on main page?
            if (retries++ < 20) return setTimeout(handlePageLoad, 250, retries);
            return debug("Didn't find active button?");
        }

        currentCat = $($(active).find('a')[0]).attr('tab-value');
        if (currentCat) {
            if (currentCat != 'customrace') return log("Only sorting on the custom race page now.");
        }

        // Get the start time col header
        let startTimeBtn = $("li.startTime.title-divider");
        $(startTimeBtn).addClass("xsrtbtn");
        $(startTimeBtn).on('click', handleStartTimeClick);

        addSortAttrs();

    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    //validateApiKey();
    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {
        GM_addStyle(`
            .xsrtbtn {
                cursor: pointer;
            }
            .xsrtbtn:hover {
                background: linear-gradient(180deg,#333,#000);
            }
        `);

    }

})();