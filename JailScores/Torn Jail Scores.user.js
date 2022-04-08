// ==UserScript==
// @name         Torn Jail Scores
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Add 'difficulty' to jailed people list
// @author       xedx [2100735]
// @include      https://www.torn.com/jailview.php*
// @remote      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      file:///Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers.js
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

(async function($) {
    'use strict';

    debugLoggingEnabled = false;
    loggingEnabled = true;

    // Global vars
    var targetNode = null;
    var observer = null;
    var perks = {"bustChanceIncrease": 0, "bustSkillIncrease": 0, "lawPerk": false};
    var skill = 1; // TBD
    var penalty = 1; // TBD
    const config = { attributes: false, childList: true, subtree: true };

    // Helper to parse a time string (33h 14m format), converting to minutes
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

    // Helper to calculate chance of success a = 266.6 [-] , b = 0.427 [- / minute]
    const a = 266.6, b = 0.427;
    function getSuccessRate(difficulty, skill, penalty) {
        let successRate = a - (b * (difficulty/skill)) - penalty;
        debug('Difficulty: ', difficulty, ' Skill: ', skill, ' Penalty: ', penalty);
        debug('Success rate: ', successRate);
        return successRate;
    }

    function getSkill() {

        return 1;
    }

    // c = 0.1 [-/h]
    const c = 0.1;
    function getPenalty() {

        let penalty_t = p0 / (1 + c * t);
        return 1;
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

            let minutes = parseJailTimeStr(timeStr);
            let score = (minutes + 180) * parseInt(lvlStr);
            debug('Score: ', score); // Log ID also

            // Calc success rate
            let sr = getSuccessRate(score, skill, penalty);

            // Write out the 'difficulty', append to the level.
            var scoreStr = score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            wrapper.children[1].innerText = lvlStr + " (" + scoreStr + ") "; //" - " + sr + ") ";
         }
    }

    // https://api.torn.com/user/?selections=log&log=5360,5362&key=6Mz2yBmCG0frJQAf

    //////////////////////////////////////////////////////////////////////
    // Get data used to calc success chance via the Torn API
    //////////////////////////////////////////////////////////////////////

    // Query the log for past busts
    function queryPastBusts() {
        log('[queryPastBusts]');
        xedx_TornUserQuery(null, 'timestamp,log&log=5360,5362', queryPastBustsCB);
    }

    // Callback for above
    function queryPastBustsCB(responseText, ID) {
        log('[queryPastBustsCB] ');
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            log('Response error! ', jsonResp.error);
            return handleError(responseText);
        }

        // Process past busts
        processPastBusts(jsonResp);

        // Now get personal stats, perks, level
        personalStatsQuery();
    }

    // Query personal stats (unused?), perks, basic info (for level)
    function personalStatsQuery() {
        log('[personalStatsQuery]');
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
        debug('jobPerks: ', jobPerks);
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

    //////////////////////////////////////////////////////////////////////
    // Parse past busts from the log
    //////////////////////////////////////////////////////////////////////

    const oldestTimeMinutes = 72 * 60; // 72 hours, in minutes.
    function processPastBusts(obj) {
        log('[processPastBusts]');
        let timeNow = obj.timestamp; // In seconds since epoch
        let bustLog = obj.log;
        let keys = Object.keys(bustLog);

        for (let i=0; i<keys.length; i++) {
            let key = keys[i];
            let entry = bustLog[key];
            let ageMinutes = Math.ceil((timeNow - entry.timestamp) / 60); // Minutes
            if (ageMinutes > oldestTimeMinutes) break; // Older than 72 hours, doesn't matter.
            log('Entry: ', entry);
            log('Time: ', ageMinutes + ' minutes ago.');
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Start a mutation observer to run on page changes (unused)
    //////////////////////////////////////////////////////////////////////

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
    validateApiKey('FULL');
    versionCheck();

    installHashChangeHandler(addJailScores);

    // Start by kicking off a few API calls.
    queryPastBusts(); // Callback then queries stats, perks, basic. Could do all in one call.
    //personalStatsQuery();

})();

