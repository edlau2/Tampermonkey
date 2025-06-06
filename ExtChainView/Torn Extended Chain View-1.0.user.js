// ==UserScript==
// @name         Torn Extended Chain View
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script lets the chain view on the fac page grow up to 30 attacks.
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php?step=your*
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

    var rootUL;

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        //callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        //callOnContentLoaded(handlePageLoad);
    }

    function installExtendedUI(retries=0) {
        let rootUL = $(".chain-attacks-list.recent-attacks");
        log("[installExtendedUI] root: ", $(rootUL));
        if (!$(rootUL).length) {
            if (retries++ < 30) return setTimeout(installExtendedUI, 250, retries);
            return log("[installExtendedUI] timed out");
        }

        // Add observer to see when LI's are added/removed.
        // When removed, insert into our own UL beneath this one.
        // When added, clone and keep on a list until removed - then
        // put in our UL. Track our UL length, emove last ones when limit reached.
        let rootClone = $(rootUL).clone();
        $(rootClone).attr('id', 'ext-chain-view');
        $(rootClone).empty();
        $(rootUL).after($(rootClone));

        // quick test...
        let testLi = $(rootUL).first("li");
        let myLi = $(testLi).clone();
        $('#ext-chain-view').append(myLi);

        log("root: ". $(rootUL), " clone: ", $('#ext-chain-view'));
    }

    function handlePageLoad(retries=0) {
        //type=1#/war/chain
        if (location.href.indexOf("type=1") < 0) return log("Wrong page: ", location.href);
        installExtendedUI();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey('FULL');
    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {

    }

})();