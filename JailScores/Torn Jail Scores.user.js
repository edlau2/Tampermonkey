// ==UserScript==
// @name         Torn Jail Scores
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Add 'difficulty' to jailed people list
// @author       xedx [2100735]
// @include      https://www.torn.com/jailview.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @connect      www.tornstats.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

// The formulas used in here are taken from this forum post:
// https://www.torn.com/forums.php#/p=threads&f=61&t=16192039&b=0&a=0

(function($) {
    'use strict';

    debugLoggingEnabled = false;
    loggingEnabled = true;

    // Global vars
    var targetNode = null;
    var observer = null;
    var perks = {"bustChanceIncrease": 0, "bustSkillIncrease": 0, "lawPerk": false};
    const config = { attributes: false, childList: true, subtree: true };

    /////////////////////////////////////////////////////////////////////////
    // Helper to parse a time string (33h 14m format), converting to minutes
    /////////////////////////////////////////////////////////////////////////

    function parseJailTimeStr(timeStr) {
        var hour = 0;
        var minute = 0;
        var minuteStart = 0;
        var end = timeStr.indexOf("h");
        if (end != -1) {
            hour = timeStr.slice(0, end);
            minuteStart = end + 2;
        }

        end = timeStr.indexOf("m");
        if (end != -1) {
            minute = timeStr.slice(minuteStart, end);
        }

        var minutes = parseInt(hour) * 60 + parseInt(minute);
        return minutes;
    }

    //////////////////////////////////////////////////////////////////////
    // This adds the 'score' to the level column in the Jail view
    //////////////////////////////////////////////////////////////////////

    function addJailScores() {
        log('[addJailScores]');
        // Get the <UL> and list of <li>'s
        var elemList = document.getElementsByClassName('user-info-list-wrap icons users-list bottom-round');
        var items = elemList[0].getElementsByTagName("li");
        if (items.length <= 1) {return setTimeout(addJailScores, 250);}

        for (var i = 0; i < items.length; ++i) {
            // Get the wrapper around the time and level (and reason)
            let wrapper = items[i].getElementsByClassName("info-wrap")[0];
            if (!validPointer(wrapper)) {continue;}

            var timeStr = wrapper.children[0].innerText;
            var lvlStr = wrapper.children[1].innerText;
            if (lvlStr.indexOf("(") != -1) {return;} // Don't do this more than once!

            var minutes = parseJailTimeStr(timeStr);
            var score = (minutes + 180) * parseInt(lvlStr);

            // Write out the 'difficulty', append to the level.
            var scoreStr = score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            wrapper.children[1].innerText = lvlStr + " (" + scoreStr + ") ";
         }
    }

    // Get data used to calc success chance via the Torn API
    function personalStatsQuery() {
        log('Calling xedx_TornUserQuery');
        xedx_TornUserQuery(null, 'personalstats,perks,basic', personalStatsQueryCB);
    }

    // Callback for above
    function personalStatsQueryCB(responseText, ID) {
        log('[personalStatsQueryCB] ');
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            log('Response error!');
            return handleError(responseText);
        }

        let personalstats = jsonResp.personalstats;
        let facPerks = jsonResp.faction_perks;
        let eduPerks = jsonResp.education_perks;
        let jobPerks = jsonResp.job_perks;
        let userLvl = jsonResp.level;

        debug('personalstats: ', personalstats);
        debug('facPerks: ', facPerks);
        debug('eduPerks: ', eduPerks);
        debug('level: ', userLvl);

        // From fac perks, see what (if any) 'bust success' increase there is
        for (let i=0; i<facPerks.length; i++) {
            if (facPerks[i].toLowerCase().indexOf('bust success') > -1) {
                perks.bustChanceIncrease = Number(facPerks[i].match(/(\d+)/)[0].trim());
                break;
            }
        }

        // Same from eduPerks: 'Busting skill'
        for (let i=0; i<eduPerks.length; i++) {
            if (eduPerks[i].toLowerCase().indexOf('busting skill') > -1) {
                perks.bustSkillIncrease = Number(eduPerks[i].match(/(\d+)/)[0].trim());
                break;
            }
        }

        log('Perks: ', perks);

        // Add jail scores to the page, and install an observer to monitor for page changes.
        addJailScores();
    }

    // Start a mutation observer to run on page changes (unused)
    function installObserver() {
        targetNode = document.getElementById('mainContainer');
        const callback = function(mutationsList, observer) {
            observer.disconnect();
            addJailScores();
            observer.observe(targetNode, config);
        };
        observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    // Start by kicking off a few API calls.
    personalStatsQuery();

})();

