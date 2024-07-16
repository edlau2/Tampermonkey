// ==UserScript==
// @name         Torn Jail Scores v2.0
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Add 'difficulty' to jailed people list
// @author       xedx [2100735]
// @match        https://www.torn.com/jailview.php*
// @run-at       document-start
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
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
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

// The formulas used in here are taken from this forum post:
// https://www.torn.com/forums.php#/p=threads&f=61&t=16192039&b=0&a=0

(async function() {
    'use strict';

    const DEV_MODE = true;             // Without this, scores only, no % chance etc...

    // Since tthis is a work in progress, may need to clean up old, unusd
    // or changed stuff in storage on verion change. Need to do first
    // before the version check, which writes out this version number.
    cleanOldVersionIfo();

    // Used to turn on and off stuff not really tested, or just trying out
    // as proof of concept.
    var enablePreRelease = GM_getValue("enablePreRelease", false);
    var bustMin = GM_getValue("bustMin", 90);             // Will highlight in green at or above this %, yellow for this - 10%, and orange for that - 10%.
    var quickBustBtn = GM_getValue("quickBustBtn", true); // Change 'reload' to a bust/reload or somesuch
    var quickBustYlw = GM_getValue("quickBustYlw", false);// Also on yellows
    //const dispOptsScreen = true;                          // true to enable the experimental option bar

    // "uiless", if true, doesn't add the minimal UI - the 'save log',
    // 'hide/show' button (which will hide the un-needed UI pieces
    // unil needed), and 'fast reload' buttons.
    // The 'record stats' is mostly a dev tool, it profiles (records
    // the times and displays in the debug console) to do certain things,
    // like load/reload a page.
    var dispPenalty = GM_getValue("dispPenalty", false);   // Only if pre-releaseenabled
    var livePenaltyUpdate = true;                          // Update penalty calc immediately on bust, if in pre-release.
    const uiless = false;
    const recordStats = true;

    // ms between calls to the API to check/recalculate penalty.
    // Eventually refine and recalc on any new bust w/o an API call, but
    // will be tricky to factor in decay (I think....)
    var penaltyCalcOnIdleInt = 5000;

    GM_setValue("enablePreRelease", enablePreRelease);
    GM_setValue("bustMin", bustMin);
    GM_setValue("quickBustBtn", quickBustBtn);
    GM_setValue("quickBustYlw", quickBustYlw);
    GM_setValue("dispPenalty", dispPenalty);

    // Console logging levels
    debugLoggingEnabled = false;
    loggingEnabled = true;

    // DO NOT EDIT!
    const MAIN_DIV_ID = "xd1";
    const MAIN_DIV_SEL = "#" + MAIN_DIV_ID;

    // Little helpers for profiling. ex: let start = _start(); .... debug("elapsed: ", elapsed(start));
    const nowInSecs = ()=>{return Math.floor(Date.now() / 1000);}
    const _start = ()=>{return nowInSecs();}
    const _end = ()=>{return nowInSecs();}
    const elapsed = (startTime)=>{return _end()-startTime;}

    // Global vars
    var intervalId = null;
    var savedSortId = '';
    var lLvlOrder = 'asc', lTimeOrder = 'asc', lScoreOrder = 'asc';
    var targetNode = null;
    var observer = null;
    const reloadURL = "https://www.torn.com/jailview.php";

    // Used to determine if should use saved stats or go get
    const cacheExpHrs = 48;                            // 2 days time before recheck
    const cachedStatExpire = cacheExpHrs * 60 * 60;    // in secs
    var lastStatsCheck = GM_getValue("lastStatsCheck", 0);
    var sinceLastStats = lastStatsCheck ? nowInSecs() - lastStatsCheck : 0;
    var doStatsCheck = true; // sinceLastStats ? sinceLastStats > cachedStatExpire : true;

    log("doStatsCheck: ", doStatsCheck, " sinceLastStats: ", sinceLastStats, " cachedStatExpire: ", cachedStatExpire );

    // Cached personal stats
    var perks = {"bustChanceIncrease": 0, "bustSkillIncrease": 0, "lawPerk": false, 'totalBusts': 0};
    var userLvl = 0;
    var inLawFirm = false;

    var pastBustsStats = [];

    var skill = 1; // TBD
    var totalPenalty = 1; // TBD
    const config = { attributes: false, childList: true, subtree: true };
    const round2 = function(e) {return Number(e).toFixed(2)}

    // Time script starts
    const ScriptStartTime = _start();

    // Logging helpers
    var logEntries = {}; // TBD: add header?
    var logQueue = [];

    // Add header to log entries
    /*
    function addLogHeader() {
        // Do I need to bother?
        addLogEntry(...);
    }
    addLogheader();
    */

    function cleanOldVersionIfo() {
        let curr_ver = GM_getValue('curr_ver', GM_info.script.version);
        if (Number(curr_ver) < 2.5) {
            log("Cleaning up version older than 2.5");
            GM_setValue("p0low", "-1");
            GM_setValue("p0hi", "-1");
        }
    }

    setInterval(function() {_addLogEntry(logQueue.pop())}, 250); // Process log queue

    function addLogEntry(obj, type) {
        logQueue.push({'obj': obj, 'type': type});
    }

    function _addLogEntry(data) {
        if (!data) return;
        let obj = data.obj, type = data.type;
        const timenow = Date.now();
        const tornTimenow = Math.floor(timenow / 1000);
        const timestamp = getTimeWithMilliseconds(new Date(timenow));
        let entry = {'timestamp': timestamp, 'torntime': tornTimenow, 'type': type, 'data': obj};
        logEntries[timenow] = entry;
    }

    // Helper to format a Date() object as time with milliseconds, to 3 digits
    const getTimeWithMilliseconds = date => {
        return `${date.toLocaleTimeString('it-US')}.${date.getMilliseconds()}`;
    }

    // Helper to parse a time string (33h 14m format), converting to minutes
    // On mobile: "TIME\n33h 14m"
    function parseJailTimeStr(timeStr) {
        debug("timeStr: ", timeStr, " index: ", timeStr.indexOf("TIME"));

        if (timeStr.indexOf("TIME") > -1) {
            timeStr = timeStr.replace("TIME\n", '');
            timeStr = timeStr.replace("TIME :", '');
            timeStr.trim();
        }
        debug("Parsed timeStr: ", timeStr);

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

    // Determine the penaly score for one bust, given time since (in hours)
    const c = 0.1;
    function getPenalty(p0, t) {
        let penalty_t =  (t >= 72) ? 0 : (p0 / (1 + (c * t)));
        debug('[getPenalty] p0: ', p0, ' t: ', t, ' Penalty: ', penalty_t);
        return penalty_t;
    }

    // Determine p0, based on ... (TBD)
    function getP0(level=0) {
        return 17;
    }

    // Determine skill, based on perks, BS, and level (??? - TBD)
    function getSkill() {
        return userLvl;
    }

    // Helper to calculate chance of success a = 266.6 [-] , b = 0.427 [- / minute]
    //const a = 266.6, b = 0.427;
    function getSuccessRate(difficulty, skill, penalty) {
        debug('[getSuccessRate]');
        const a = 266.6, b = 0.427;
        let successRate = Math.floor(a - (b * (difficulty/skill)) - penalty);

        if (successRate > 100) successRate = 100;
        if (successRate < 0) successRate = 0;

        debug('Difficulty: ', difficulty, ' Skill: ', skill, ' Penalty: ', penalty);
        debug('Success rate: ', successRate);

        return successRate;
    }

    // Helper to get max success rate, assuming max perks and over 1,000 bust (max bustXP)
    // SR = -.286(diff/lvl) + 271.43 - my calcs from his graph
    function getMaxSuccessRate(difficulty, buster_level, penalty) {
        debug('[getMaxSuccessRate]');
        const a = -0.286, b = 271.43;
        let successRate = Math.ceil((a * (difficulty/buster_level) + b) - penalty);

        if (successRate > 100) successRate = 100;
        if (successRate < 0) successRate = 0;

        debug('Difficulty: ', difficulty, ' buster_level: ', buster_level, ' Penalty: ', penalty);
        debug('Max Success rate: ', successRate);

        return successRate;
    }

    //////////////////////////////////////////////////////////////////////
    // This adds the 'score' to the level column in the Jail view
    //////////////////////////////////////////////////////////////////////

    var startAddJailScores;
    var clickYesRetries = 0;
    var busted = false;

    function addJailScores() {
        debug('[addJailScores]');
        if (!startAddJailScores) startAddJailScores = _start();
        // Get the <UL> and list of <li>'s
        var elemList = document.getElementsByClassName('user-info-list-wrap icons users-list bottom-round');
        if (elemList.length == 0) return setTimeout(addJailScores, 100);
        var items = elemList[0].getElementsByTagName("li");
        if (items.length <= 1) {return setTimeout(addJailScores, 100);}

        // Header
        let titleBar = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper > div.users-list-title.title-black");
        let levelNode = titleBar.querySelector("span.level");
        debug('Title Bar: ', titleBar, ' Score: ', document.querySelector("#score"));
        if (!document.querySelector("#score")) {
            $(levelNode).after('<span id="score" class="level">Score</span>');

            titleBar.querySelector("span.time").setAttribute('id', 'time');
            titleBar.querySelector("span.level").setAttribute('id', 'level');

            $('#score').on('click', handleTitleClick);
            $('#level').on('click', handleTitleClick);
            $('#time').on('click', handleTitleClick);
        }

        for (var i = 0; i < items.length; ++i) {
            // Get the wrapper around the time and level (and reason)
            let wrapper = items[i].getElementsByClassName("info-wrap")[0];
            if (!validPointer(wrapper)) {continue;}
            let name = $(wrapper.parentNode.querySelector("a.user.name > span")).attr('title');

            var timeStr = wrapper.children[0].innerText;
            debug("timeStr: ", timeStr);

            let theString = wrapper.children[1].innerText;
            debug("theString: ", theString);

            let lvlStr = theString.replace(/^\D+/g, '');
            debug("lvlStr: ", lvlStr);

            if (lvlStr.indexOf("(") != -1) {return;} // Don't do this more than once!

            let minutes = parseJailTimeStr(timeStr);
            debug("minutes: ", minutes);

            wrapper.children[0].setAttribute('time', minutes); // For sorting
            let score = (minutes + 180) * parseInt(lvlStr);
            debug("score: ", score);

            // Calc success rate
            let sr = getSuccessRate(score, getSkill(), totalPenalty);
            let maxSR = getMaxSuccessRate(score, userLvl, totalPenalty);

            debug('name: ', name, ' Time: ', timeStr, ' Level: ', lvlStr, 'Difficulty: ', score);
            debug('SuccessRate: ', sr, '%', ', MaxSuccessRate: ', maxSR, '%');

            // Write out the 'difficulty', append to the level.
            var scoreStr = score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

            let newLi;
            if (DEV_MODE) {
                newLi = '<span class="score level" score="' + scoreStr.replace(',', '') + '" sr="' + maxSR + '">' +
                        '<span class="title bold"> Score <span>:</span></span>' + scoreStr + ' ' + maxSR + '% </span>';
            } else {
                newLi = '<span class="score level" score="' + scoreStr.replace(',', '') + '" sr="' + maxSR + '">' +
                        '<span class="title bold"> Score <span>:</span></span>' + scoreStr + '</span>';
            }

            debug("Wrapper: ", $(wrapper));
            debug("SR:", maxSR);

            if (DEV_MODE && autoBustOn) {
                let bustNode = $(wrapper).siblings(".bust")[0];
                log("bustNode: ", $(bustNode));
                if (maxSR >= bustMin && !busted) { // just do once
                    log("Auto-Bust!");

                    // I think this flag needs to be set here...
                    // otherwise, we click everyone who matches!
                    // Maybe reset if we click "yes"?
                    busted = true;
                    $(bustNode).click();

                    // Now need to click "yes" ....
                    clickYesRetries = 0;
                    findAndClickYes(bustNode);
                }
            }

            $(wrapper.children[1]).next().css('width', '200px');
            $(wrapper.children[1]).after(newLi);

            let saveData = {'name': name, 'time': timeStr, 'min': minutes, 'level':lvlStr, 'diff': score, 'sr': sr, 'msr': maxSR};
            addLogEntry(saveData, 'SCORE');

         }

        savedSortId = GM_getValue('savedSortId', savedSortId);
        if (savedSortId) {
            lLvlOrder = GM_getValue('lLvlOrder', lLvlOrder);
            lTimeOrder = GM_getValue('lTimeOrder', lTimeOrder);
            lScoreOrder = GM_getValue('lScoreOrder', lScoreOrder);
            handleTitleClick({target: {'id': savedSortId}});
        }
    }

    const maxYesRetries = 25;    // vary big to try and find worst-case
    const retryInterval = 50;
    function findAndClickYes(bustNode) {
        if (clickYesRetries++ > maxYesRetries) return;

        forceReloadBtn();

        let yesNode = $(bustNode).parent().find(".confirm-bust > div > .action-yes");
        let noNode = $(bustNode).parent().find(".confirm-bust > .ajax-action > .action-no");
        log("Finding yes (retries: ", clickYesRetries, ") ", $(yesNode));

        // Just pretend if retries == 6
        let loggedYesNo = false;
        if (recordStats && clickYesRetries == 6) {
            // Save stats to get averages
            let yesnoAttempts = GM_getValue("yesnoAttempts", 0);
            yesnoAttempts = +yesnoAttempts + 1;
            GM_setValue("yesnoAttempts", yesnoAttempts);

            let yesnoTime = GM_getValue("yesnoTime", 0);
            yesnoTime = +yesnoTime + elapsed(ScriptStartTime);
            GM_setValue("yesnoTime", yesnoTime);

            let yesnoAvg = yesnoTime / yesnoAttempts;
            GM_setValue("yesnoAvg", yesnoAvg);

            log("yesnoAttempts: ", yesnoAttempts, " Average time: ", yesnoAvg);
            loggedYesNo = true;
        }

        if ($(yesNode).length == 0) {
            log("node: ", $(bustNode));
            log("parent: ", $(bustNode).parent());
            return setTimeout(function() {findAndClickYes(bustNode);}, retryInterval);
        }

        log("Yes node found! time: ", (clickYesRetries - 1) * retryInterval, " ms");
        log("node text: '", $(yesNode).text(), "'");
        log("parent text: '", $(yesNode).parent().text(), "'");

        log("Clicked! Time to get yes/no: ", elapsed(ScriptStartTime), " seconds from doc start.");

        // Save stats to get averages
        if (recordStats && !loggedYesNo) {
            let yesnoAttempts = GM_getValue("yesnoAttempts", 0);
            yesnoAttempts = +yesnoAttempts + 1;
            GM_setValue("yesnoAttempts", yesnoAttempts);

            let yesnoTime = GM_getValue("yesnoTime", 0);
            yesnoTime = +yesnoTime + elapsed(ScriptStartTime);
            GM_setValue("yesnoTime", yesnoTime);

            let yesnoAvg = yesnoTime / yesnoAttempts;
            GM_setValue("yesnoAvg", yesnoAvg);

            log("yesnoAttempts: ", yesnoAttempts, " Average time: ", yesnoAvg);
        }

        if ($(yesNode).text() === "Yes" && $(yesNode).parent().text().indexOf("try and break") > 0) {
            log("Clicking Yes....");
            //busted = true;
            if (doClickYes) {
                $(yesNode).click();
                log("Clicked! Time to bust: ", elapsed(ScriptStartTime), " seconds from doc start.");
            } else {
                $(noNode).click();
                log("Clicked! Time to click NO: ", elapsed(ScriptStartTime), " seconds from doc start.");
            }
        }
    }

    function clearBustStats() {
        GM_setValue("yesnoAttempts", 0);
        GM_setValue("yesnoTime", 0);
        GM_setValue("yesnoAvg", 0);

        GM_setValue("totalLoads", 0);
        GM_setValue("loadTime", 0);
        GM_setValue("loadTimeAvg", 0);

        //GM_setValue("ClearBustStats", false);
    }

    // Handle clicking Time, Level or Score on the title bar
    // Sort, descending or ascending
    //var lLvlOrder = 'asc', lTimeOrder = 'asc', lScoreOrder = 'asc';
    function handleTitleClick(ev) {
        debug('[handleTitleClick] ev: ', ev);
        debug('[handleTitleClick] target ID: ', ev.target.id);

        let ID = ev.target.id;
        GM_setValue('savedSortId', ID);
        GM_setValue('lLvlOrder', lLvlOrder);
        GM_setValue('lTimeOrder', lTimeOrder);
        GM_setValue('lScoreOrder', lScoreOrder);

        if (ID == 'level') {
            lLvlOrder = (lLvlOrder == 'asc') ? 'desc' : 'asc';
            debug('Sorting page by level, ', lLvlOrder);
            sortPage("span > span.level", null, lLvlOrder);
        }
        if (ID == 'time') {
            lTimeOrder = (lTimeOrder == 'asc') ? 'desc' : 'asc';
            debug('Sorting page by time, ', lTimeOrder);
            sortPage("span > span.time", "time", lTimeOrder);
        }
        if (ID == 'score') {
            lScoreOrder = (lScoreOrder == 'asc') ? 'desc' : 'asc';
            debug('Sorting page by score, ', lScoreOrder);
            sortPage("span > span.score.level", "score", lScoreOrder);
        }
    }

    // Sort jail list, by 'sel' (time, level, or score) and attr
    function sortPage(sel, attr, ord) {
        debug('[sortPage]');
        let sortStart = _start();
        let jailList = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul");
        let matches = $(jailList).children("li");

        debug("matches: ", matches);
        debug("selector: ", sel);
        debug("attr: ", attr);
        tinysort(matches, {selector: sel, attr: attr, order: ord});

        // This should be last log entry on initial load-
        // page complete.

        // This is WRONG if doing reload!
        if (!doingReload) {
            log("startAddJailScores took ", elapsed(startAddJailScores), " secs");
            log("Sort complete, took ", elapsed(sortStart), " secs");
            log("Script load time: ", elapsed(ScriptStartTime), " secs");

            // Save stats to get averages
            if (recordStats) {
                let totalLoads = GM_getValue("totalLoads", 0);
                totalLoads = +totalLoads + 1;
                GM_setValue("totalLoads", totalLoads);

                let loadTime = GM_getValue("loadTime", 0);
                loadTime = +loadTime + elapsed(ScriptStartTime);
                GM_setValue("loadTime", loadTime);

                let loadTimeAvg = loadTime / totalLoads;
                GM_setValue("loadTimeAvg", loadTimeAvg);

                log("totalLoads: ", totalLoads, " Average time: ", loadTimeAvg, " avg to bust: ", GM_getValue("yesnoAvg", -1));
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Get data used to calc success chance via the Torn API
    //////////////////////////////////////////////////////////////////////

    // Query the log for past busts
    var queryPastBustsStart;
    function queryPastBusts(queryStats=true) {
        debug('[queryPastBusts]');
        queryPastBustsStart = _start();
        let queryStr = 'timestamp,log&log=5360';
        xedx_TornUserQuery(null, queryStr, queryPastBustsCB, queryStats);
    }

    // Callback for above
    function queryPastBustsCB(responseText, ID, param) {
        log('[queryPastBustsCB] took ', elapsed(queryPastBustsStart), " secs");
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            debug('Response error! ', jsonResp.error);
            return handleError(responseText);
        }

        // Process past busts
        let pastBustsStart = _start();
        processPastBusts(jsonResp);
        log("processPastBusts took ", elapsed(pastBustsStart), " secs");

        // Now get personal stats, perks, level. Could do as one call.
        // Logically easier to do in two, easier to debug also.
        if (param) personalStatsQuery();

        if (!intervalId) startPastBustTimer();
    }

    // Query personal stats (unused?), perks, basic info (for level)
    var personalStatsQueryStart;
    function personalStatsQuery() {
        debug('[personalStatsQuery] doStatsCheck? ', doStatsCheck);
        if (!doStatsCheck) {
            personalStatsQueryCB(null, null, true);
            return;
        }

        personalStatsQueryStart = _start();
        GM_setValue("lastStatsCheck", personalStatsQueryStart);
        xedx_TornUserQuery(null, 'personalstats,perks,basic,profile', personalStatsQueryCB, false);
    }

    // Callback for above
    function personalStatsQueryCB(responseText, ID, useCached) {

        let jobType;
        if (!useCached) {
            log('[personalStatsQueryCB] took ', elapsed(personalStatsQueryStart), " secs");
            let jsonResp;
            let personalstats;

            jsonResp = JSON.parse(responseText);
            if (jsonResp.error) {
                debug('Response error!');
                return handleError(responseText);
            }

            personalstats = jsonResp.personalstats;
            perks.totalBusts = personalstats.peoplebusted;

            debug('personalstats: ', personalstats);

            jobType = jsonResp.job.company_type;
            userLvl = jsonResp.level;

            // From fac perks, see what (if any) 'bust success' increase there is
            let facPerks = jsonResp.faction_perks;
            debug('facPerks: ', facPerks);
            for (let i=0; i<facPerks.length; i++) {
                if (facPerks[i].toLowerCase().indexOf('bust success') > -1) {
                    perks.bustChanceIncrease = Number(facPerks[i].match(/(\d+)/)[0].trim());
                    break;
                }
            }

            // Same from eduPerks: 'Busting skill'
            let eduPerks = jsonResp.education_perks;
            debug('eduPerks: ', eduPerks);
            for (let i=0; i<eduPerks.length; i++) {
                if (eduPerks[i].toLowerCase().indexOf('busting skill') > -1) {
                    perks.bustSkillIncrease = Number(eduPerks[i].match(/(\d+)/)[0].trim());
                    break;
                }
            }

            GM_setValue("jobType", jobType);
            GM_setValue("userLvl", userLvl);
            GM_setValue("bustChanceIncrease", perks.bustChanceIncrease);
            GM_setValue("bustSkillIncrease", perks.bustSkillIncrease);

            // Not yet used...
            //let jobPerks = jsonResp.job_perks;
            //log('jobPerks: ', jobPerks);

        } else {  // get from cache!
            log("[personalStatsQueryCB], cached");
            jobType = GM_getValue("jobType", jobType);
            userLvl = GM_getValue("userLvl", userLvl);
            perks.bustChanceIncrease = GM_getValue("bustChanceIncrease", perks.bustChanceIncrease);
            perks.bustSkillIncrease = GM_getValue("bustSkillIncrease", perks.bustSkillIncrease);
        }

        inLawFirm = (jobType == 2);
        debug('company_type: ', jobType, ' In Law Firm? ', inLawFirm); // '2' is in Law Firm.
        debug('user level: ', userLvl);
        debug('Perks: ', perks);

        let saveData = {"perks": perks, 'level': userLvl, 'ID': ID};
        addLogEntry(saveData, 'PERKS');

        // Add jail scores to the page, and install an observer to monitor for page changes.
        addJailScores();
    }

    //////////////////////////////////////////////////////////////////////
    // Parse past busts from the log
    //////////////////////////////////////////////////////////////////////

    const oldestTimeMinutes = 72 * 60; // 72 hours, in minutes.
    function processPastBusts(obj) {
        pastBustsStats.length = 0;
        debug('[processPastBusts]');
        let timeNow = obj.timestamp; // In seconds since epoch
        let bustLog = obj.log;
        let keys = Object.keys(bustLog);
        totalPenalty = 0;

        for (let i=0; i<keys.length; i++) {
            let key = keys[i];
            let entry = bustLog[key];
            let ageMinutes = Math.ceil((timeNow - entry.timestamp) / 60); // Minutes
            if (ageMinutes > oldestTimeMinutes) break; // Older than 72 hours, doesn't matter.
            debug('Entry: ', entry);
            debug('Time: ', ageMinutes + ' minutes ago.');

            let indPenalty = getPenalty(getP0(), ageMinutes/60);
            totalPenalty += indPenalty;

            pastBustsStats.push({'timestamp': entry.timestamp, 'ageHrs': round2(ageMinutes/60), 'penalty': round2(indPenalty)});
        } // end for loop


        if (recordStats) {
            let low = GM_getValue("p0low", -1);
            if (totalPenalty < low || (low == -1)) {
                GM_setValue("p0low", round2(totalPenalty));
            }
            let hi = GM_getValue("p0hi", -1);
            if (totalPenalty > hi || hi == -1) GM_setValue("p0hi", round2(totalPenalty));
        }

        debug('Total penalty: ', round2(totalPenalty), ' p0:', getP0());
        debug('pastBustsStats: ', pastBustsStats);

        addLogEntry(pastBustsStats, 'OLDBUST');

        let pData = {'p0': getP0(), 'totalP': round2(totalPenalty)};
        addLogEntry(pData, 'PENALTY');
    }

    //////////////////////////////////////////////////////////////////////
    // Start a mutation observer to run on page changes
    //////////////////////////////////////////////////////////////////////

    const observerCallback = function(mutationsList, observer) {
            debug('Observer CB');
            observerOff();
            if ($("#xedx-save-btn").length == 0) installUI();
            for (let mutation of mutationsList) {
                //debug('mutation.type: ', mutation.type);
                if (mutation.type === 'childList') {
                    debug('Mutation Detected: A child node has been added or removed.');
                    for (let i=0; i<mutation.addedNodes.length; i++) {
                        let node = mutation.addedNodes[i];
                        debug('Added node: ', node);
                        if ($(node).hasClass('ajax-action')) {
                            let text = node.textContent;
                            log('Bust action: ', text);

                            // Need to get info from parent node - level, name, time, etc...
                            let li = node.parentNode.parentNode;
                            let wrapper = li.getElementsByClassName("info-wrap")[0]; // 'li' is items[i]
                            let name = $(wrapper.parentNode.querySelector("a.user.name > span")).attr('title');
                            var timeStr = wrapper.children[0].innerText;
                            var lvlStr = wrapper.children[1].innerText;
                            let minutes = parseJailTimeStr(timeStr);

                            let busteeData = {'name': name, 'time': timeStr, 'min': minutes, 'level':lvlStr};
                            addLogEntry(busteeData, 'BUSTEE');

                            if (text.toLowerCase().indexOf('you busted') > -1) {

                                // Display how many busts done today...
                                // To save a date: localStorage['key'] = ''+myDate.getTime();
                                // To restore: var myDate = new Date(parseInt(localStorage['key'], 10));
                                let dateOlderThanDay = false;
                                let temp = GM_getValue("lastBust", undefined);
                                let now = new Date();
                                let lastBust;
                                if (temp) {
                                    lastBust = new Date(parseInt(temp, 10));
                                    log("last bust: ", lastBust.toLocaleString());
                                    if (!isToday(lastBust)) {
                                        dateOlderThanDay = true;
                                    }
                                }

                                GM_setValue("lastBust", ''+now.getTime());

                                temp = GM_getValue("lastBust", undefined);
                                lastBust = new Date(parseInt(temp, 10));
                                log("Set lastBust to: ", lastBust.toLocaleString());

                                let currBustsToday = 0;
                                if (dateOlderThanDay) {
                                    log("Set busts todat to 1");
                                    currBustsToday = 1;
                                } else {
                                    log("cuBusts: ", GM_getValue("currBusts", 0));
                                    currBustsToday = GM_getValue("currBusts", 0) + 1;
                                    log("cuBustsToday: ", currBustsToday);
                                }

                                GM_setValue("currBusts", currBustsToday);
                                setTodaysBusts(currBustsToday);

                                // Try to adjust add'l penalty on the fly....
                                if (enablePreRelease && livePenaltyUpdate) {
                                    let indPenalty = getPenalty(getP0(), minutes/60);
                                    let tmp = totalPenalty;
                                    let sep = " | ";
                                    totalPenalty += indPenalty;
                                    log("Live penalty update, wrapper: ", $(wrapper));
                                    log("penalties: ", tmp, sep, totalPenalty, sep, indPenalty, sep, minutes);
                                } else {
                                    setTimeout(queryPastBusts, 1000, false);
                                }

                                addLogEntry(text, 'OUT');
                            } else {
                                addLogEntry(text, 'CHECK');
                            }
                        }
                    }
                }
            }
            targetNode = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul")
            observerOn();
        };

    function startPastBustTimer() {
        if (!intervalId) {
            intervalId = setInterval(queryPastBusts, penaltyCalcOnIdleInt, false);
        }
    }

    function installObserver() {
        targetNode = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul");
        observer = new MutationObserver(observerCallback);
        debug('Starting mutation observer: ', targetNode);
        observerOn();
    }

    const observerOn = function () {
        debug('[observerOn]');
        if (observer) observer.observe(targetNode, config);
    }

    const observerOff = function () {
        debug('[observerOff]');
        if (observer) observer.disconnect();
    }

    function isToday(date) {
        const now = new Date();
        const yearDate = date.getYear();
        const monthDate = date.getMonth();
        const dayDate = date.getDate();
        const yearNow = now.getYear();
        const monthNow = now.getMonth();
        const dayNow = now.getDate();
        //debug("isToday, date: ", date.toLocaleString());
        let rc = false;
        if (yearDate === yearNow && monthDate === monthNow && dayDate === dayNow) {
            rc = true;
        }

        //debug("result: ", rc);
        return rc;
    }

    function handleSaveButton() {
        // Build data to save here:
        //let saveData = {"perks": perks, 'level': userLvl};

        log("handleSaveButton");
        const a = document.createElement("a");

        log("Adding log entries: ", logEntries);

        a.href = URL.createObjectURL(new Blob([JSON.stringify(logEntries, null, 2)], {
            type: "text/plain"
          }));

        log("href: ", a.href);

        a.setAttribute("download", "data.txt");
        document.body.appendChild(a);

        log("a: ", a);

        a.click();
        document.body.removeChild(a);
    }

    // Adding "style="float:right;"" to the xcaret span looks kinda cool: "<span style="float:right;"><i id="xcaret" ..."
    const saveBtnDiv3 = `
            <div id="` + MAIN_DIV_ID + `" class="xdwrap xshow xnb title-black border-round m-top10">
                <span class="xspleft">XedX Jail Scores</span>
                <span id="busts-today" class="xml10"></span>
                <span id="xedx-msg" class="xml5"></span>
                <span class="xr xedx-span btn xfr">
                    <span><i id="xcaret" class="icon fas fa-caret-right xedx-caret"></i></span>
                    <span id="xswap" class="swap-span">
                    <input id="xedx-reload-btn" type="submit" class="xedx-torn-btn xmt3" value="Reload">
                    </span>
                </span>
            </div>
        `;

    const reloadBtnHtml = `<input id="xedx-reload-btn" type="submit" class="xedx-torn-btn xmt3" value="Reload">`;
    const quickBustBtnHtml = `<input id="xedx-reload-btn2" style="width: 38px !important;"
                               type="submit" class="xedx-torn-btn xmt3" value="R">
                               <input id="xedx-quick-bust-btn"
                               type="submit" class="qbust-green xedx-torn-btn xmt3" value="B">`;

    function addSwapBtnHandlers() {
        if ($("#xedx-reload-btn").length) {
            $("#xedx-reload-btn").on('click', reloadUserList);
        } else {
            $("#xedx-quick-bust-btn").on("click", doQuickBust);
            $("#xedx-reload-btn2").on('click', reloadUserList);
        }
    }

    function forceReloadBtn() {
        log("forceReloadBtn");
        //log("reload-btn: ", $("#xedx-reload-btn"));
        //log("reload-btn2: ", $("#xedx-reload-btn2"));
        //log("quick bust btn: ", $("#xedx-quick-bust-btn"));

        if ($("#xedx-reload-btn").length) {
            return;
        } else {
            $("#xedx-quick-bust-btn").remove();
            $("#xedx-reload-btn2").replaceWith(reloadBtnHtml);
        }
        addSwapBtnHandlers();
    }

    function forceBustButton() {
        log("forceBustButton");
        if ($("#xedx-reload-btn").length) {
            $("#xedx-reload-btn").replaceWith(quickBustBtnHtml);
        } else if (!$("#xedx-reload-btn2").length) {
            log("Error: btn2 not installed!")
        }
        addSwapBtnHandlers();
    }

    // 'force', if true, goes to reg. reload btn
    function swapReloadBtn(force) {
        log("swapReloadBtn, force: ", force);
        log("reload-btn: ", $("#xedx-reload-btn"));
        log("reload-btn2: ", $("#xedx-reload-btn2"));
        log("quick bust btn: ", $("#xedx-quick-bust-btn"));

        if (force) {
            if ($("#xedx-reload-btn").length) {
                return;
            } else {
                $("#xedx-quick-bust-btn").remove();
                $("#xedx-reload-btn2").replaceWith(reloadBtnHtml);
            }
        } else {
            if ($("#xedx-reload-btn").length) {
                $("#xedx-reload-btn").replaceWith(quickBustBtnHtml);
            } else {
                $("#xedx-quick-bust-btn").remove();
                $("#xedx-reload-btn2").replaceWith(reloadBtnHtml);
            }
        }

        addSwapBtnHandlers();
    }

    const hideBtn2= `<span id="xhide-btn-span" class="xhbtn">
                         <input id="xhide-btn" type="submit" class="torn-btn" value="Hide">
                     </span>`;

    const caretNode = `<span style="float:right;"><i id="xcaret" class="icon fas fa-caret-down xedx-caret"></i></span>`;
    const optsBtn = `<button id="x-opts-btn" class="xhlpbtn xmt5"><span class="copts">*</span></button>`;

    //const origUI = false;
    var mainUiBtnsInstalled = false;
    var hideBtnInstalled = false;
    var lastShowState = GM_getValue("lastShow", "show");
    if (lastShowState == "hide") setTimeout(doHide, 10);

    function installUI(forceShow=false) {
        debug('[installUI]: ', uiless, " lastShowState: ", lastShowState,
            " forceShow: ", forceShow);
        if ($("#xedx-reload-btn").length || $("#xedx-save-btn").length || $(MAIN_DIV_SEL).length ) {
            //log("Exit installUI, main div exists.");
            return;
        }

        if (uiless) return;

        if (!hideBtnInstalled) {
            addHideButton();
        }

        if (lastShowState == "hide" && !forceShow) {
            debug("was hidden and not forced, not installing");
            return;
        }

        if ($("#xedx-save-btn").length || $("#xedx-reload-btn").length) { // || waitingOnDivInst) {
            debug("Exit installUI, button exists.");
            return;
        }

        if (!$(MAIN_DIV_SEL).length)
            $("#mainContainer > div.content-wrapper > div.msg-info-wrap > hr").before(saveBtnDiv3);

        setTitleColor();

        if (lastShowState && forceShow) {
            $(MAIN_DIV_SEL).addClass("xhide");
        }

        // When we roll over, maybe keep a daily record?
        // such as date|busts|date|busts|date....etc. ?
        let temp = GM_getValue("lastBust", undefined);
        if (temp) {
            let lastBust = new Date(parseInt(temp, 10));
            if (!isToday(lastBust))
                setTodaysBusts(0);
            else
                setTodaysBusts(GM_getValue("currBusts", 0));
        } else {
            setTodaysBusts(0);
        }

        // TEMP: set timer to update text for penalty/busts, won't need later
        setInterval(updateBustsAndPenaltyText, 1000);

        // Add the options panel
        if (/*dispOptsScreen &&*/ $("#xedx-jail-opts").length == 0) {
            // Suppress the spinner/scroll
            /* Chrome, Safari, Edge, Opera */
            GM_addStyle( `
                input::-webkit-outer-spin-button,
                    input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }`);

            /* Firefox */
            GM_addStyle( `
                input[type=number] {
                    padding-left: 5px;
                    -moz-appearance: textfield;
                }`);

            addOptsDiv();

            if (!$("#xcaret").hasClass("xtemp")) {
                $("#xcaret").addClass("xtemp");
                $("#xcaret").on('click', handleOptsBtn);
                log("#x-opts-btn added");
            }
        }

        mainUiBtnsInstalled = true;

        $("#xedx-save-btn").on('click', handleSaveButton);
        $("#xedx-reload-btn").on('click', reloadUserList);

        addSwapBtnHandlers();

        // Add a right-click handler to the fake div, for misc custom stuff
        $(MAIN_DIV_SEL).on('contextmenu', handleRightClick);

        // TEMP
        //addSortIcon();

        debug("Exit installUI");
    }

    function addOptsDiv() {
        log("Adding options panel to: ", $(MAIN_DIV_SEL));
        if ($("#xedx-jail-opts").length) $("#xedx-jail-opts").remove();
        let optsDiv = getOptionsDiv();
        $(MAIN_DIV_SEL).after(optsDiv);
        log("opts panel: ", $("#xedx-jail-opts"));

        $("#xedx-jail-opts").css("height", 0);
        $("#xedx-jail-opts").css("min-width", $(MAIN_DIV_SEL).css("width"));
        $("#bust-limit").val(bustMin);
        $("#quick-bust-btn").prop('checked', true);
        //$("#quick-bust-ylw").prop('checked', false);
        $("#pre-release-btn").prop('checked', enablePreRelease);
        $("#penalty-btn").prop('checked', dispPenalty);
        $("#xedx-save-opt-btn").on("click", handleSaveOptsBtn);
    }

    // ========== Options button and panel animation and click handlers ==========
    function handleSaveOptsBtn() {
        let savedPR = enablePreRelease;

        bustMin = $("#bust-limit").val();
        quickBustBtn = $("#quick-bust-btn").is(":checked");
        quickBustYlw = $("#quick-bust-ylw").is(":checked");
        enablePreRelease = $("#pre-release-btn").is(":checked");
        dispPenalty = $("#penalty-btn").is(":checked");

        GM_setValue("bustMin", bustMin);
        GM_setValue("quickBustBtn", quickBustBtn);
        GM_setValue("quickBustYlw", quickBustYlw);
        GM_setValue("enablePreRelease", enablePreRelease);
        GM_setValue("dispPenalty", dispPenalty);

        if (savedPR != enablePreRelease) {
            addOptsDiv();
            handleOptsBtn();
        }

        $("#xedx-msg").text(" **** Options Saved! ****");
        setTimeout(optsAnimate, 500, 0);
        setTimeout(clearMsg, 3000);

        debug("handleSaveOptsBtn: ", bustMin, " quick btn? ", quickBustBtn,
              " quick ylw? ", quickBustYlw,
             " enablePreRelease? ", enablePreRelease, " dispPenalty? ", dispPenalty);
    }

    function clearMsg() { $("#xedx-msg").text("");}

    var inAnimation = false;

    function optsAnimate(size) {
        log("optsAnimate, inAnimation: ", inAnimation, " size: ", size);
        inAnimation = true;

        if (size == 0) {
            $(MAIN_DIV_SEL).removeClass("top-round").addClass("border-round");
            $("#xcaret").removeClass("fa-caret-down").addClass("fa-caret-right");
        } else {
            $(MAIN_DIV_SEL).removeClass("border-round").addClass("top-round");
            $("#xcaret").removeClass("fa-caret-right").addClass("fa-caret-down");
        }

        log("Do animate, size: ", size);
        $( "#xedx-jail-opts" ).animate({
            height: size,
        }, 1500, function() {
            optsHideShow();
            inAnimation = false;
        });
    }

    // Callback when animation completes
    function optsHideShow() {
        // Don't think I need this anymore....

    }

    function handleOptsBtn() {
        let cssHeight = parseInt($("#xedx-jail-opts").css("height"), 10);
        if (inAnimation) {
            log("in animate, ret");
            return;
        }

        if (cssHeight > 0)
            optsAnimate(0);
        else
            optsAnimate(optsDivHeight);
    }
    // ========== End Options button and panel handlers ==========

    function setTitleColor() {
        if (autoBustOn)
            $(MAIN_DIV_SEL + " > .xspleft").addClass("xgr");
        else
            $(MAIN_DIV_SEL +" > .xspleft").removeClass("xgr");
    }

    function handleRightClick() {
        debug("Handle right click");
        autoBustOn = !autoBustOn;
        setTitleColor();
        debug("auto: ", autoBustOn);
        return false;
    }

    function updateBustsAndPenaltyText() {
        setTodaysBusts(GM_getValue("currBusts", 0));
    }

    function setTodaysBusts(numBusts) {
        let msg = "(Today: " + numBusts +  ")";
        if (enablePreRelease && dispPenalty)
            msg = "(Today: " + numBusts + " Penalty: " + round2(totalPenalty) + ")";

        $("#busts-today").text(msg);
     }

    function addHideButton() {
        debug("addHideButton");
        if ($("#xhide-btn").length == 0) {
            $("#skip-to-content").append(hideBtn2);
            $("#xhide-btn").on("click", handleHideBtn);

            if (lastShowState == "hide") setTimeout(doHide, 10);
            else setTimeout(doShow, 10);
        }
        if ($("#xhide-btn").length) hideBtnInstalled = true;
    }

    const criminalList = ['miscreant', 'imp', 'hooligan', 'bad-asses', 'no-goodkin', 'malefactor',
                          'vagabond', 'transgressor', 'black-hat', 'evil-doer', 'criminal',
                          'malfeasant', 'sinner', 'wrong-doer', 'degenerate', 'reprobate',
                          'rascal', 'hoodlum', 'delinquent', 'scallywag', 'scoundrel', 'ruffian',
                          'outlaw', 'hooligan', 'heathen', 'liars and thief', 'ner-do-well',
                          'ingrate', 'lawbreaker', 'culprit', 'felon', 'felonius sort',
                          'nefarious type', 'fraudster', 'yardbird', 'infractor', 'offender',
                          'perp', 'scumbag', 'vandal', 'ruffian', 'crook', 'felon', 'delinquent',
                          'bruiser', 'mug', 'troublemaker', 'misguided youth', 'shyster',
                          'scofflaw', 'rapscallion'];

    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function getCriminalName(playerCount) {
        let idx = getRandomInt(0, criminalList.length - 1);
        let name = criminalList[idx];
        if (playerCount > 1) name = name + "s";
        return name;
    }

    // ========= Handlers for Fast Reloading ========================
    // Move response handling to separate fn at some point....
    var doingReload = false;
    function reloadUserList() {

        log("reloadUserList");

        // No matter result, go back to normal reload btn?
        forceReloadBtn();

        if (doingReload) {
            doingReload = false;
            return;
        }

        let reloadStart = _start();
        observerOff();

        doingReload = true;
        $.post(
            reloadURL,
            {
                action: "jail",
                start: "0"
            },

            // Move to not inline!
            function (response) {
                let playerCount = 0;
                let displayMsg = false;
                log("Handling reloadUserList response");
                let targetUl = $("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul");
                let jsonObj = JSON.parse(response);

                let countNode = $("div.users-list-title > span.title > span.total");
                log("countNode: ", $(countNode));

                log("jsonObj: ", jsonObj);
                if (jsonObj.success == true) {

                    let players = jsonObj.data.players;
                    if (!players) {  // Turns ou this happens when no one is in jail
                        log("Error: 'players' is undefined: ", players);
                        log("jsonObj.data: ", jsonObj.data);

                        let msg = "There is no one in jail at this time.";

                         let et = elapsed(reloadStart);
                        if (+et == 0)
                            msg += " (under 1 sec)";
                        else
                            msg += " (" + et + " secs)";

                        $("#xedx-msg").text(msg);
                        $(countNode).text("0");      // TBD: change text also
                        return;

                    }

                    $(targetUl).empty();

                    let player = players[0];
                    playerCount = players.length;

                    debug("Players: ", players);
                    debug("Player[0]: ", players[0]);

                    $(countNode).text(playerCount);

                    for (let idx=0; idx < players.length; idx++) {
                        let innerHTML = buildPlayerLi(players[idx]);
                        $(targetUl).append(innerHTML);
                    }

                    // Now sort...
                    savedSortId = GM_getValue('savedSortId', savedSortId);
                    if (savedSortId) {
                        lLvlOrder = GM_getValue('lLvlOrder', lLvlOrder);
                        lTimeOrder = GM_getValue('lTimeOrder', lTimeOrder);
                        lScoreOrder = GM_getValue('lScoreOrder', lScoreOrder);
                        handleTitleClick({target: {'id': savedSortId}});
                    }

                    let bustable = $(targetUl).find(".xbust");
                    debug("bustable: ", $(bustable));

                    if (DEV_MODE && autoBustOn && $(bustable).length) {
                        // Just bust the first one...
                        let wrapper = $(bustable)[0];
                        let bustNode = $(wrapper).siblings(".bust")[0];
                        debug("Auto Bust! bustNode: ", $(bustNode));

                        $(bustNode).click();
                        clickYesRetries = 0;
                        findAndClickYes(bustNode);
                    }

                }

                let et = elapsed(reloadStart);
                log("reloadUserList took ", elapsed(reloadStart), " secs");

                let msg = "Reload complete, took ";
                if (+et == 0)
                    msg += "under 1 sec.";
                else
                    msg += et + " secs.";

                msg += " Got " + playerCount + " " + getCriminalName(playerCount) + ".";

                $("#xedx-msg").text(msg);
                if (recordStats) {
                    let totalFastReloads = GM_getValue("totalFastReloads", 0);
                    totalFastReloads = +totalFastReloads + 1;
                    GM_setValue("totalFastReloads", totalFastReloads);

                    let fastReloadTime = GM_getValue("fastReloadTime", 0);
                    fastReloadTime = +fastReloadTime + et;
                    GM_setValue("fastReloadTime", fastReloadTime);

                    let fastReloadTimeAvg = fastReloadTime / totalFastReloads;
                    GM_setValue("fastReloadTimeAvg", fastReloadTimeAvg);

                    log("totalFastReloads: ", totalFastReloads, " Average time: ", fastReloadTimeAvg);
                }

                doingReload = false;
                observerOn();
            }
        );

    }

    // Unused !
    // Type: Function( String responseText, String textStatus, jqXHR jqXHR )
    function reloadUserListCB(responseText, textStatus, jqXHR) {
        log("reloadUserListCB");
        log("resp: ", responseText);
        log("status: ", textStatus);
        log("jqXHR: ", jqXHR);

        observerOn();
    }

    // Make this a helper script fn....
    function getClassList(element) {
        return $(element).attr("class").split(/\s+/);
    }

    function doQuickBust() {
        let targetUl = $("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul");
        let bustable = $(targetUl).find(".xbust");

        log("**** doQuickBust ****");
        /*
        log("Bustable: ", $(bustable));
        let cl = getClassList(bustable);
        log("Classlist: ", $(cl));
        log("Parent: ", $(($bustable)[0]).parent());
        log("**** doQuickBust ****");
        */

        if ($(bustable).hasClass("qbust-yellow") && !quickBustYlw) return;
        debug("bustable: ", $(bustable));

        setTimeout(forceReloadBtn, 500);

        if ($(bustable).length) {
            // Just bust the first one...
            let wrapper = $(bustable)[0];
            let bustNode = $(wrapper).siblings(".bust")[0];
            debug("Quick Bust! bustNode: ", $(bustNode));

            $(bustNode).click();
            clickYesRetries = 0;
            findAndClickYes(bustNode);
        }
    }

    // These are likely ILLEGAL! Do not enable!
    var   autoBustOn = false;
    const doClickYes = true;         // Only applicable if above option is on
    // End ILLEGAL

    // ========= End handlers for Fast Reloading ========================

    // ========= HTML element building..... ========================
    function buildPlayerLi(player) {

        let infoWrap = buildInfoWrap(player);
        let buyDiv = buildBuyDiv(player);
        let bustDiv = buildBustDiv(player);

        let innerHTML = "<li class='gray'>" +
            player.print_tag +
            player.online_offline +
            player.print_name +
            infoWrap +
            buyDiv +
            bustDiv +
            '<div class="confirm-bye"></div>' +
            '<div class="confirm-bust"></div>' +
            '<div class="bottom-white"></div>' +
            "</li>";

        return innerHTML;
    }

    const tenPct = function (x) { x - (x * .01); }

    function buildInfoWrap(player) {
        let minutes = parseJailTimeStr(player.time);

        let score = (minutes + 180) * parseInt(player.level);
        let scoreStr = score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        let sr = getSuccessRate(score, getSkill(), totalPenalty);
        let maxSR = getMaxSuccessRate(score, userLvl, totalPenalty);

        // Flag, via a dummy class, if 'bustable'...
        let classStr = "info-wrap";
        let scoreAddlClass = "";

        // Adjust by 10% of value
        let diff = 10; //100 - bustMin;
        let planB = bustMin - diff;
        let planC = planB - diff;

        let separator = " | ";

        let hasGreen = false;
        if (maxSR >= bustMin) {
            classStr += " xbust xbgreen";
            scoreAddlClass = "xgr";
            hasGreen = true;

            if (quickBustBtn) { // && $("#xedx-reload-btn").length) {
                forceBustButton();
                log("Adding GREEN button");
                $(".xbyellow").removeClass("xbust").removeClass("xbyellow");
                $("#xedx-quick-bust-btn").removeClass('qbust-yellow').addClass('qbust-green');
            }

        } else if (maxSR >= planB && maxSR < bustMin && !hasGreen) { // 10% of initial min
            scoreAddlClass = "xylw";
            log("Adding YELLOW class, ",
                maxSR, separator, bustMin, separator, diff, separator, planB. separator, planC);
            //  Adding YELLOW class,  0  |  50  |  50  |  undefined -50
            if (quickBustYlw && quickBustBtn && $("#xedx-reload-btn").length && !hasGreen) {
                forceBustButton();
                log("Adding YELLOW button, ", maxSR, separator, bustMin, separator, diff, separator, planB. separator, planC);
                classStr += " xbust xbyellow";
                $("#xedx-quick-bust-btn").removeClass('qbust-green').addClass('qbust-yellow');
            }
        } else if (maxSR >= planC && maxSR < planB) { // 10% less than above
            scoreAddlClass = "xog";
        }

        let infoWrap = '<span class="' + classStr +'">' +
                '<span class="time" time="' + minutes + '">' +                // For sorting
                    '<span class="title bold">TIME<span>:</span></span>' +
                         player.time +
                     '</span>' +
                     '<span class="level"><span class="title bold">LEVEL<span>:</span></span>' +
                             player.level +
                     '</span>' +

                      // around line 250, to calc score
                      '<span class="score level ' + scoreAddlClass + '" score="' + scoreStr.replace(',', '') + '" sr="' + maxSR + '">' +
                             '<span class="title bold"> Score <span>:</span></span>' +
                              scoreStr + ' ' + maxSR + '%' +
                      '</span>' +

                      '<span class="reason" style="width: 200px;">' +
                          player.jailreason +
                      '</span>' +
                  '</span>';

        return infoWrap;
    }

    function buildBuyDiv(player) {
        let buyDiv = '<a class="bye t-gray-3" href="jailview.php?XID=' + player.user_id +'&amp;action=rescue&amp;step=buy">' +
                     '<span class="bye-icon"></span>' +
                     '<span class="title bold">BUY</span>' +
                     '</a>';
        return buyDiv;
    }

    function buildBustDiv(player) {
        let bustDiv = '<a class="bust t-gray-3" href="jailview.php?XID=' + player.user_id +'&amp;action=rescue&amp;step=breakout1">' +
                      '<span class="bust-icon"></span>' +
                      '<span class="title bold">BUST</span>' +
                      '<span class="tt-quick-q">Q</span></a>';
        return bustDiv;
    }

    // =========== Handle hiding our UI elements, via the main "Hide" button ===============
    var bannerHidden = false;
    function handleHideBtn() {
        debug("handleHideBtn, ", MAIN_DIV_ID, ": ", $(MAIN_DIV_SEL), " mainUiBtnsInstalled: ", mainUiBtnsInstalled);
        if (!mainUiBtnsInstalled) {
            log("Main UI not installed, installing now");
            installUI(true);
            doShow();
            return;
        }

        if ($(MAIN_DIV_SEL).hasClass("xshow")) doHide();
        else if ($(MAIN_DIV_SEL).hasClass("xhide")) doShow();
    }

    function doHide() {
        log("doHide");
        try {
            if ($("#jailFilter").length == 0) return setTimeout(doHide, 250);
        } catch (e) {
            log("Exception, prob JQuery not yet loaded: ", e);
            let jf = document.querySelector("#jailFilte");
            log("jf: ", jf);
            if (!jf) return setTimeout(doHide, 250);    // Hopefully loaded next time through...
        }
        $("#jailFilter").addClass("xhide").removeClass("xshow");
        $("#mainContainer > div.content-wrapper > div.msg-info-wrap > hr").addClass("xhide").removeClass("xshow");
        $(MAIN_DIV_SEL).addClass("xhide").removeClass("xshow");
        $("#xhide-btn").prop('value', 'Show');
        GM_setValue("lastShow", "hide");
    }

    function doShow() {
        if($("#jailFilter").length == 0) return setTimeout(doShow, 250);

        $("#jailFilter").addClass("xshow").removeClass("xhide");
        $("#mainContainer > div.content-wrapper > div.msg-info-wrap > hr").addClass("xshow").removeClass("xhide");
        $(MAIN_DIV_SEL).addClass("xshow").removeClass("xhide");
        $("#xhide-btn").prop('value', 'Hide');
        GM_setValue("lastShow", "show");
    }
    // =========== End handle hiding our UI elements, via the main "Hide" button ===============

    // =========== Div for script options panel/dashboard,down here just  to keep ot of above code.
    var optsDivHeight = 35;    // 30 per inner div
    function getOptionsDiv() {

        let optsDiv;
        if (enablePreRelease) {
            optsDivHeight = 70;
            optsDiv = `
                <div id="xedx-jail-opts"  class="xoptwrap flexwrap title-black xnb bottom-round">
                    <span style="width: 75%;">
                         <label for="limit">Lower limit, %:</label>
                         <input type="number" id="bust-limit" class="xlimit xml10" name="limit" min="0" max="100">
                         <input type="checkbox" id="quick-bust-btn" data-type="sample3" class="xedx-cb-opts xml20">
                             <span>Quick Bust</span>
                         <input type="checkbox" id="pre-release-btn" class="xedx-cb-opts xml10">
                             <span>Pre Release</span>
                     </span>
                     <span class="xopt-span">
                         <input id="xedx-save-opt-btn" type="submit" class="xedx-torn-btn xmt3" value="Apply">
                         <input id="xedx-save-btn2" type="submit" class="xedx-torn-btn xml10 xmt3 xmr10" value="Save Log">
                     </span>

                     <span class="break"></span>

                     <input type="checkbox" id="penalty-btn" class="xedx-cb-opts xmr10 xmb30">
                         <span>Show p0</span>
                     <input type="checkbox" id="quick-bust-ylw" data-type="sample3" class="xedx-cb-opts xmb20 xmr10 xml10 xmb30">
                         <span>QB on Yellow</span>
                     <!-- input type="checkbox" id="penalty-btn" class="xedx-cb-opts xmb20 xmr10 xml10 xmb30">
                         <span>Test 2</span -->
                 </div>
                 `;
        } else {
            optsDivHeight = 35;
            optsDiv = `
                <div id="xedx-jail-opts"  class="xoptwrap title-black xnb bottom-round">
                <span style="width: 75%;">
                     <label for="limit">Lower limit, %:</label>
                     <input type="number" id="bust-limit" class="xlimit xml10" name="limit" min="0" max="100">
                     <input type="checkbox" id="quick-bust-btn" data-type="sample3" class="xedx-cb-opts xml20">
                         <span>Quick Bust</span>
                     <input type="checkbox" id="pre-release-btn" class="xedx-cb-opts xml10">
                         <span>Pre Release</span>
                 </span>
                 <!-- span style="float: right; width: 68px; max-width: 68px; min-width: 68px;" -->
                 <!-- span style="width: auto; min-width: 68px;" class="xfr" -->
                 <span class="xopt-span">
                     <input id="xedx-save-opt-btn" type="submit" class="xedx-torn-btn xmt3" value="Apply">
                     <input id="xedx-save-btn2" type="submit" class="xedx-torn-btn xml10 xmt3 xmr10" value="Save Log">
                 </span>
             </div>
                 `;
        }



        return optsDiv;
    }

    /*

             </div>

             <div class="break"></div>

             <div>
                <span style="width: 75%;">
                    <input type="checkbox" id="quick-bust-btn" data-type="sample3" class="xedx-cb-opts xml20">
                         <span>test</span>
                     <input type="checkbox" id="penalty-btn" class="xedx-cb-opts xml10">
                         <span class="xmr20">test2</span>
                </span>
             </div>

             </div>
    */

    // ================ Styles used throughout this. Not that a lot of my styles are defined
    // in other scripts as well,need to consolidate...... ==================================

    // tmp, doesn't work...
    function addSortIcon() {
        if (!$("#score").length) return setTimeout(addSortIcon, 100);
        $("#score").append('<div class="sortIcon___ALgdi desc___bb84w finally-bs-activeIcon activeIcon___h2CBt finally-bs-desc"></div>');
        log("addSortIcon: ", $("#score"));
    }

    function addStyles() {
      GM_addStyle(`
            .xod {
                min-width: 784px;
            }
            .xopt-btn {
                width: 68px;
                height: 22px;
                margin-top: 3px;
            }
            .xlimit {
               height: 20px;
               width: 26px;
               border: 1px solid black;
               border-radius: 2px;
               margin-top: 5px;
            }
            .torn-btn-override {
                border: 2px solid transparent !important;
                height: 22px !important;
                line-height: 22px !important;
            }
            .xedx-cb-opts {
                display: inline-block;
                vertical-align: top;
                margin-top: 10px;
            }
            .break {
              flex-basis: 100%;
              height: 0;
            }
            .flexwrap {
                flex-wrap: wrap;
            }
            .xdwrap {
                display: flex;
                flex-direction: row;
                height: 34px !important;
            }
            .xoptwrap {
                display: flex;
                flex-direction: row;
                overflow: hidden;
                padding: 0px;
                min-width: 784px;
            }
            .xopt-span {
                width: auto;
                min-width: 68px;
                float: right;
                margin-left: auto;
            }
            .xnb:before {
                content: none !important;
            }
            .xhbtn {
                margin-left: 10px;
                height: 22px;
            }
            .xmb30 {
                margin-bottom: 30px;
            }
            .xml5 {
                margin-left: 5px;
            }
            .xml10 {
                margin-left: 10px;
            }
            .xmr10 {
                margin-right: 10px;
            }
            .xml20 {
                margin-left: 20px;
            }
            .xmr20 {
                margin-right: 20px;
            }
            .xmt3 {
                margin-top: 3px;
            }
            .xmt5 {
                margin-top: 5px;
            }
            .xmt10 {
                margin-top: 10px;
            }
            .xfr {
                float: right;
            }
            .xfr2 {
                margin-left: auto;
            }
            .flex-container {
                padding: 0 10px;
                margin: 0 auto;
                border: 2px solid red;
                width: 90%;
                height: 60%;
                display: flex !important;
                align-items: center;
                justify-content: space-between;
            }
            .xr {
                margin-left: auto;
                margin-right: 10px;
            }
            .xbr {
                border: 1px solid red;
            }
            .xbg {
                border: 1px solid green;
            }
            .xspleft {left: 0}
            .xedx-box {
                float: right;
                display: flex;
            }
            .score { }
            .xedx-span {
                margin-bottom: 5px;
                margin-left: 20px;
            }
            .xhide {
                display: none;
            }
            .xshow {
                display: block;
            }
            .xshowi {
                display: inline-block;
            }
            .xgr {
                color: green;
            }
            .xylw {
                color: #e1c919;
            }
            .xog {
                color: #F08C00;
            }
            .xedx-caret {
                padding-top:5px;
                padding-bottom:5px;
                padding-left:20px;
                padding-right:10px;
             }
            .xedx-torn-btn {
                height: 22px !important;
                width: 74px;
                line-height: 22px;
                font-family: "Fjalla One", Arial, serif;
                font-size: 14px;
                font-weight: normal;
                text-align: center;
                text-transform: uppercase;
                border-radius: 5px;
                padding: 0 10px;
                cursor: pointer;
                color: #555;
                color: var(--btn-color);
                text-shadow: 0 1px 0 #FFFFFF40;
                text-shadow: var(--btn-text-shadow);
                background: linear-gradient(180deg, #DEDEDE 0%, #F7F7F7 25%, #CFCFCF 60%, #E7E7E7 78%, #D9D9D9 100%);
                background: var(--btn-background);
                border: 1px solid #aaa;
                border: var(--btn-border);
                display: inline-block;
                vertical-align: middle;
             }
             .qreload {

             }
             .qbust-green {
                 height: 28px !important;
                 width: 40px !important;
                 color: green;
                 border: 1px solid #0D4A09;
             }
             .qbust-yellow {
                 height: 28px !important;
                 width: 40px !important;
                 color: yellow;
                 border: 1px solid yellow;
             }
             .swap-span {
                height: 34px;
                width: 76px;
             }
        `);
    }

    function contentLoadHandler() {
        installHashChangeHandler(addJailScores);
        installObserver();
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey(DEV_MODE ? 'FULL' : 'LIMITED');
    versionCheck();

    // New way:
    callOnContentLoaded(contentLoadHandler);

    addStyles();

    if (GM_getValue("ClearBustStats", false) == true) {
        clearBustStats();
    }
    GM_setValue("ClearBustStats", false);

    // Idea: start adding scores ASAP, add % as API results come in?
    // Suppress some doc load if possib;e?
    // Want fastest load time, least delay...

    // Only query and process past busts after min one minute, or
    // start this script on every page and just do past busts when not
    // on jail page? Save in storage, for 72 hours?

    // Install the UI
    if (DEV_MODE) callOnContentComplete(installUI);

    // Start by kicking off a few API calls.
    if (DEV_MODE) {
        queryPastBusts();
    } else {
        personalStatsQuery();
    }

})();

