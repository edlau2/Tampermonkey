// ==UserScript==
// @name         Torn Clock
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/*
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

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    function addClock(target) {
        if ($(".addlClock").length > 0) return log("Clock already exists.");
        let clock = `<div class="tc-clock-tooltip addlClock" style=""><p><span class="server-date-time">00:00:00 - 00/00/00</span></p></div>`;
        $(target).append(clock);
        log("Appended clock: ", $(".addlClock"));
    }

//     function hashChangeHandler() {
//         debug("[hashChangeHandler]: ", location.href);
//         callOnContentLoaded(handlePageLoad);
//     }

//     function pushStateChanged(e) {
//         debug("[pushStateChanged]: ", location.href);
//         callOnContentLoaded(handlePageLoad);
//     }

    function handlePageLoad(retries=0) {
        let target = $("#topHeaderBanner > div.header-wrapper-top > div");
        if (!$(target).length) {
            if (retries++ < 50) return setTimeout(handlePageLoad, 100, retries);
            return log("Timed out...");
        }
        addClock(target);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    // if (checkCloudFlare()) return log("Won't run while challenge active!");

    // validateApiKey();
    // versionCheck();

    addStyles();

    // callOnHashChange(hashChangeHandler);
    // installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {

    }

})();