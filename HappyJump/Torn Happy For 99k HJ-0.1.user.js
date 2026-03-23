// ==UserScript==
// @name         Torn Happy For 99k HJ
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
        GM_getValue("debugLoggingEnabled", true);    // Extra debug logging
    GM_setValue("debugLoggingEnabled", true);

    function getHappyCb(response, status, xhr) {
        debug("[getHappyCb] res: ", response, " status: ", status);

        // calc happy needed, / by 50 for pts
        let bars;
        let happyNow;
        if (response && response.bars) bars = response.bars;
        if (bars && bars.happy) happyNow = bars.happy.current;
        if (!happyNow) return log("Error in bars response");

        let jpNeeded = 0;
        let happyNeeded = 50000 - parseInt(happyNow);
        if (happyNeeded > 0) jpNeeded = happyNeeded / 50;

        let msg = `Happy: ${numberWithCommas(happyNow)}\nNeeded: ${numberWithCommas(happyNeeded)}\nJPs needed: ${jpNeeded}`;

        alert(msg);
    }

    function getHappy() {
        const url = `https://api.torn.com/v2/user/bars?key=${api_key}`;

        $.ajax({
            url: url,
            headers: {'Authorization': ('ApiKey ' + api_key)},
            type: 'GET',
            success: getHappyCb,
            error: function (jqXHR, textStatus, errorThrown) {
                console.debug(GM_info.script.name + ": Error in ajax GET: ", textStatus, errorThrown, jqXHR);
            }
        });
    }

    function handleHappyClick(e) {
        e.stopPropagation();
        e.preventDefault();
        getHappy();
    }


    function handlePageLoad(retries=0) {
        // Can check for any required DIV here and setTimeout() if not available,
        // or trigger any required API calls...
        let happyBar = $("#sidebar  a[class*='happy_']");
        $(happyBar).on('click', handleHappyClick);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();

    addStyles();

    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {

    }

})();