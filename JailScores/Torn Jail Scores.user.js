// ==UserScript==
// @name         Torn Jail Scores
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Add 'difficulty' to jailed people list
// @author       xedx [2100735]
// @match        https://www.torn.com/jailview.php*
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
/*eslint no-multi-spaces: 0*/

// The formulas used in here are taken from this forum post:
// https://www.torn.com/forums.php#/p=threads&f=61&t=16192039&b=0&a=0

(async function() {
    'use strict';

    const DEV_MODE = true;

    debugLoggingEnabled = false;
    loggingEnabled = true;

    // Global vars
    var savedSortId = '';
    var lLvlOrder = 'asc', lTimeOrder = 'asc', lScoreOrder = 'asc';
    var targetNode = null;
    var observer = null;
    var perks = {"bustChanceIncrease": 0, "bustSkillIncrease": 0, "lawPerk": false, 'totalBusts': 0};
    var pastBustsStats = [];
    var userLvl = 0;
    var inLawFirm = false;
    var skill = 1; // TBD
    var totalPenalty = 1; // TBD
    const config = { attributes: false, childList: true, subtree: true };
    const round2 = function(e) {return Number(e).toFixed(2)}

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

    function addJailScores() {
        log('[addJailScores]');
        // Get the <UL> and list of <li>'s
        var elemList = document.getElementsByClassName('user-info-list-wrap icons users-list bottom-round');
        var items = elemList[0].getElementsByTagName("li");
        if (items.length <= 1) {return setTimeout(addJailScores, 250);}

        // Header
        let titleBar = document.querySelector("#mainContainer > div.content-wrapper.m-left20 > div.userlist-wrapper > div.users-list-title.title-black");
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
            var lvlStr = wrapper.children[1].innerText;
            if (lvlStr.indexOf("(") != -1) {return;} // Don't do this more than once!

            let minutes = parseJailTimeStr(timeStr);
            wrapper.children[0].setAttribute('time', minutes); // For sorting
            let score = (minutes + 180) * parseInt(lvlStr);

            // Calc success rate
            let sr = getSuccessRate(score, getSkill(), totalPenalty);
            let maxSR = getMaxSuccessRate(score, userLvl, totalPenalty);

            log('name: ', name, ' Time: ', timeStr, ' Level: ', lvlStr, 'Difficulty: ', score);
            log('SuccessRate: ', sr, '%', ', MaxSuccessRate: ', maxSR, '%');

            // Write out the 'difficulty', append to the level.
            var scoreStr = score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

            let newLi;
            if (DEV_MODE) {
                newLi = '<span class="level" score="' + scoreStr.replace(',', '') + '" sr="' + maxSR + '">' +
                        '<span class="title bold"> Score <span>:</span></span>' + scoreStr + ' ' + maxSR + '% </span>';
            } else {
                newLi = '<span class="level" score="' + scoreStr.replace(',', '') + '" sr="' + maxSR + '">' +
                        '<span class="title bold"> Score <span>:</span></span>' + scoreStr + '</span>';
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

    // Handle clicking Time, Level or Score on the title bar
    // Sort, descending or ascending
    //var lLvlOrder = 'asc', lTimeOrder = 'asc', lScoreOrder = 'asc';
    function handleTitleClick(ev) {
        log('[handleTitleClick] ev: ', ev);
        log('[handleTitleClick] target ID: ', ev.target.id);

        let ID = ev.target.id;
        GM_setValue('savedSortId', ID);
        GM_setValue('lLvlOrder', lLvlOrder);
        GM_setValue('lTimeOrder', lTimeOrder);
        GM_setValue('lScoreOrder', lScoreOrder);

        if (ID == 'level') {
            lLvlOrder = (lLvlOrder == 'asc') ? 'desc' : 'asc';
            log('Sorting page by level, ', lLvlOrder);
            sortPage("span > span:nth-child(2)", null, lLvlOrder);
        }
        if (ID == 'time') {
            lTimeOrder = (lTimeOrder == 'asc') ? 'desc' : 'asc';
            log('Sorting page by time, ', lTimeOrder);
            sortPage("span > span:nth-child(1)", "time", lTimeOrder);
        }
        if (ID == 'score') {
            lScoreOrder = (lScoreOrder == 'asc') ? 'desc' : 'asc';
            log('Sorting page by score, ', lScoreOrder);
            sortPage("span > span:nth-child(3)", "score", lScoreOrder);
        }
    }

    // Sort jail list, by 'sel' (time, level, or score) and attr
    function sortPage(sel, attr, ord) {
        log('[sortPage]');
        let jailList = document.querySelector("#mainContainer > div.content-wrapper.m-left20 > div.userlist-wrapper > ul");
        let matches = $(jailList).children("li");
        tinysort(matches, {selector: sel, attr: attr, order: ord});
    }

    //////////////////////////////////////////////////////////////////////
    // Get data used to calc success chance via the Torn API
    //////////////////////////////////////////////////////////////////////

    // Query the log for past busts
    function queryPastBusts(queryStats=true) {
        log('[queryPastBusts]');
        let queryStr = 'timestamp,log&log=5360';
        xedx_TornUserQuery(null, queryStr, queryPastBustsCB, queryStats);
    }

    // Callback for above
    function queryPastBustsCB(responseText, ID, param) {
        log('[queryPastBustsCB] ');
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            log('Response error! ', jsonResp.error);
            return handleError(responseText);
        }

        // Process past busts
        processPastBusts(jsonResp);

        // Now get personal stats, perks, level. Could do as one call.
        // Logically easier to do in two, easier to debug also.
        if (param) personalStatsQuery();
    }

    // Query personal stats (unused?), perks, basic info (for level)
    function personalStatsQuery() {
        log('[personalStatsQuery]');
        xedx_TornUserQuery(null, 'personalstats,perks,basic,profile', personalStatsQueryCB);
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
        let jobType = jsonResp.job.company_type;
        userLvl = jsonResp.level;
        inLawFirm = (jobType == 2);
        perks.totalBusts = personalstats.peoplebusted;

        debug('personalstats: ', personalstats);
        debug('facPerks: ', facPerks);
        debug('eduPerks: ', eduPerks);
        debug('jobPerks: ', jobPerks);
        log('company_type: ', jobType, ' In Law Firm? ', inLawFirm); // '2' is in Law Firm.
        log('user level: ', userLvl);

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
        log('[processPastBusts]');
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
        }
        log('Total penalty: ', round2(totalPenalty), ' p0:', getP0());
        log('pastBustsStats: ', pastBustsStats);

        addLogEntry(pastBustsStats, 'OLDBUST');

        let pData = {'p0': getP0(), 'totalP': round2(totalPenalty)};
        addLogEntry(pData, 'PENALTY');
    }

    //////////////////////////////////////////////////////////////////////
    // Start a mutation observer to run on page changes
    //////////////////////////////////////////////////////////////////////

    var intervalId = null;
    const observerCallback = function(mutationsList, observer) {
            debug('Observer CB');
            observerOff();
            if (!document.getElementById("xedx-save-btn")) installUI();
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

                            // Need to get info from parent node - level, anme, time, etc...
                            let li = node.parentNode.parentNode;
                            let wrapper = li.getElementsByClassName("info-wrap")[0]; // 'li' is items[i]
                            let name = $(wrapper.parentNode.querySelector("a.user.name > span")).attr('title');
                            var timeStr = wrapper.children[0].innerText;
                            var lvlStr = wrapper.children[1].innerText;
                            let minutes = parseJailTimeStr(timeStr);

                            let busteeData = {'name': name, 'time': timeStr, 'min': minutes, 'level':lvlStr};
                            addLogEntry(busteeData, 'BUSTEE');

                            if (text.toLowerCase().indexOf('you busted') > -1) {
                                // Not long enough... (the 2 second wait)
                                // Instead, manually add a new bust w/0 time elapsed,
                                // and recalc penalty. And re-call 'addJailStats'...
                                /*
                                let indPenalty = getPenalty(getP0(), ageMinutes/60);
                                totalPenalty += indPenalty;
                                // Maybe .load() and refill just this?
                                // var elemList = document.getElementsByClassName('user-info-list-wrap icons users-list bottom-round');
                                // Add an ID to that? See the Hi/Lo script...
                                //setTimeout(function() {queryPastBusts(false)}, 2000);
                                */

                                // TBD //
                                if (!intervalId) intervalId = setInterval(() => {queryPastBusts(false)}, 5000);
                                addLogEntry(text, 'OUT');
                            } else {
                                addLogEntry(text, 'CHECK');
                            }
                        }
                    }
                }
            }
            targetNode = document.querySelector("#mainContainer > div.content-wrapper.m-left20 > div.userlist-wrapper > ul")
            observerOn();
        };

    function installObserver() {
        targetNode = document.querySelector("#mainContainer > div.content-wrapper.m-left20 > div.userlist-wrapper > ul");
        observer = new MutationObserver(observerCallback);
        log('Starting mutation observer: ', targetNode);
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

    function handleSaveButton() {
        // Build data to save here:
        //let saveData = {"perks": perks, 'level': userLvl};

        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([JSON.stringify(logEntries, null, 2)], {
            type: "text/plain"
          }));
        a.setAttribute("download", "data.txt");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    const saveBtnDiv = `<div class="btn-wrap silver xedx-box">
                            <div id="xedx-save-btn"><span class="btn"><input type="submit" class="torn-btn xedx-span" value="Save Log"></span></div>
                        </div>`;
    function installUI() {
        log('[installUI]');
        let btn = document.getElementById("xedx-save-btn");
        if (btn) return;

        let parent = document.querySelector("#mainContainer > div.content-wrapper.m-left20 > div.msg-info-wrap > div > div > div > div");
        $(parent).append(saveBtnDiv);
        $("#xedx-save-btn").on('click', handleSaveButton);
    }

    function addStyles() {
        GM_addStyle(`
            .xedx-box {float: right; display: flex;}
            .score {width: 57px;}
            .xedx-span {margin-bottom: 5px; margin-left: 20px;}
        `);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey('FULL');
    versionCheck();

    addStyles();

    // Install the 'save' button
    if (DEV_MODE) callOnContentComplete(installUI);

    installHashChangeHandler(addJailScores);
    installObserver();

    // Start by kicking off a few API calls.
    queryPastBusts();

})();

