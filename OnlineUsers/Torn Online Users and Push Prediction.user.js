// ==UserScript==
// @name         Torn Online Users and Push Prediction
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Simply counts users online for other facs
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
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

    // Turns on much more logging
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    const enablePushPrediction = GM_getValue("enablePushPrediction", true);

    var predictIntervalSecs = GM_getValue("predictIntervalSecs", 2);   // How often to check status, may change dynamically

    // Push detect triggers.. Each is checked if present, so can have a short time trigger
    // perhaps with a larger value, maybe a longer time with a smaller value..any with a time or count
    // difference of 0 are not checked. Each needs a unique ID, they are checked each triggerSecs
    // seconds and if the diff in onliners is >= triggerDiff, you are alerted.

    let defTriggers = { 1: {triggerDiff: 3, triggerSecs: 5, pending: false, max: 0, checkVal: 0},
                        2: {triggerDiff: 3, triggerSecs: 10, pending: false, max: 0, checkVal: 0},
                        3: {triggerDiff: 6, triggerSecs: 11, pending: false, max: 0, checkVal: 0}
                      };
    let tmp = GM_getValue("triggers", null);
    const triggers = tmp ? JSON.parse(tmp) : defTriggers;
    const triggerKeys = Object.keys(triggers);

    //var triggerDiff = GM_getValue("triggerDiff", 5);     // Online must increase by this many...
    //var triggerSecs = GM_getValue("triggerSecs", 5);     // in this many seconds

    // Temp - move to fn
    GM_setValue("enablePushPrediction", enablePushPrediction);
    GM_setValue("predictIntervalSecs", predictIntervalSecs);
    GM_setValue("triggers", JSON.stringify(triggers));
    //GM_setValue("triggerDiff", triggerDiff);
    //GM_setValue("triggerSecs", triggerSecs);

    // ================= Options for the user status counts =====================

    const updateIntervalSecs = GM_getValue("updateIntervalSecs", 10);    // How many secs between each check
    GM_setValue("updateIntervalSecs", updateIntervalSecs);

    // =============================== Some globals =============================

    var searchParams = new URLSearchParams(location.search);
    var hashParams = new URLSearchParams(location.hash);
    const iconSel = "[class*='userStatusWrap_'] > svg";

    const usersOk = function () {return $(".table-cell.status > span.okay").length;}
    const usersFallen = function () {return $(".table-cell.status > span.fallen").length;}
    const usersAway = function () { return $(".table-cell.status > span.traveling").length +
                                           $(".table-cell.status > span.abroad").length;}
    const usersInHosp = function () { return $(".table-cell.status > span.hospital").length +
                                           $(".table-cell.status:not(:has(*))").length;}
    // Status/state vars
    var online = 0;
    var offline = 0;
    var idle = 0;
    var userCount = 0;

    var totalFallen = 0;
    var totalRecruit = 0;

    // Push prediction vars
    var facId = 0;
    var facMembersArray = [];
    var predictTimer = 0;

    // ===================== Handle page chaanges, that aren't reloads ===============
    function hashChangeHandler() {
        debug("hashChangeHandler");
        handlePageLoad();
    }

    function pushStateChanged(e) {
        debug("pushStateChanged");
        handlePageLoad();
    }

    // ================================= Push Prediction =====================

    //const predictCallback = function () { getStatusForUserArray(facMembersArray, statusReqCb); }

    var pushPredictionOn = false;
    var onOurFacPage = false;

    function stopPushPrediction() {
        log("Stoppng push prediction: ", predictTimer);
        if (!predictTimer) return;

        clearInterval(predictTimer);
        predictTimer = 0;
        pushPredictionOn = false;
        $("#xedx-startp-btn").val("Start");
    }

    function startPushPrediction(e) {
        for (let idx=0; idx<triggerKeys.length; idx++) {
            let key = triggerKeys[idx];
            let t = triggers[triggerKeys[idx]];
            t.key = key;
        }

        log("startPushPrediction: ", triggers);
        if (!enablePushPrediction) return;

        if (onMainFacPage()) {
            debug("On main page, get fac members");
            facId = 8151;
            getFacMembers(facId);
            return;
        }

        // Don't do on our own page...
        if (!onFacProfilePage(true)) {
            log("Not on valid fac page: ", location.href);
            return;
        }

        if (pushPredictionOn == true) {
            log("Stoppng push prediction");
            clearInterval(predictTimer);
            predictTimer = 0;
            pushPredictionOn = false;
            $("#xedx-startp-btn").val("Start");
            if (updateUserCountsTimer) clearInterval(updateUserCountsTimer);
            updateUserCountsTimer = setInterval(updateUserCounts, updateIntervalSecs*1000);
            return;
        }

        if (updateUserCountsTimer) {
            clearInterval(updateUserCountsTimer);
            updateUserCountsTimer = null;
        }

        facId = searchParams.get("ID");
        debug("Fac ID: ", facId);
        if (!facId) return;

        getFacMembers(facId);


        // =============

        function predictCallback() {
            //debug("predictCallback");
            getStatusForUserArray(facMembersArray, statusReqCb);
        }

        function facMemberCb(responseText, ID, options) {
            let jsonObj = JSON.parse(responseText);
            let membersArray = jsonObj.members;

            if (jsonObj.error) {
                console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
                return;
            }

            membersArray.forEach(function (member, index) {
                if (member.id) {
                    let state = member.status.state;
                    if (state.toLowerCase() != "fallen") {
                        facMembersArray.push(member.id);
                        //facMembersJson[member.id] = member.name;
                    }
                }
            });

            debug("Fac members: ", facMembersArray.length);

            log("Doing status query...");

            predictCallback();

            clearInterval(predictTimer);
            predictTimer = setInterval(predictCallback, predictIntervalSecs*1000);

            pushPredictionOn = true;
            $("#xedx-startp-btn").val("Stop");
        }

        function getFacMembers(facId) {
            xedx_TornFactionQueryv2(facId, "members", facMemberCb);
        }

        var lastCountOnline = 0;
        var thisCountOnline = 0;

        var thisCountOffline = 0;
        var thisCountIdle = 0;
        var statusCheckPending = false;

        var statusCheckValue = 0;

        // {triggerDiff: 3, triggerSecs: 5, pending: false, checkVal: 0}
        function statusCheck(trigger) {
            let diff = (+thisCountOnline - +trigger.checkVal);
            let maxDiff = (+trigger.max - +trigger.checkVal);
            let lastDiff = (+lastCountOnline - +trigger.checkVal);

            debug("Status check: ", shortTimeStamp(), " trigger: ", trigger.key,  trigger, " last: ", lastCountOnline, " now: ",
                thisCountOnline, " max: ", trigger.max, " diff: ", diff, " maxDiff: ", maxDiff, " last: ", lastDiff);

            if (trigger.checkVal == 0) return;

            debug("Comp: Number(diff) >= Number(triggerDiff): ", Number(diff), " >= ", Number(trigger.triggerDiff),
                " ? ", Number(diff) >= Number(trigger.triggerDiff));

            if (Number(diff) >= Number(trigger.triggerDiff)) {
                debug("Triggered! ", diff, trigger.triggerDiff);
                doBrowserNotify(diff);
            }

            trigger.max = 0;
            trigger.pending = false;
        }

        function statusReqCb(response) {
            if (!response) return log("Error: no response!");

            lastCountOnline = thisCountOnline;
            thisCountOnline = 0;
            thisCountOffline = 0;
            thisCountIdle = 0;
            online = 0;
            offline = 0;
            idle = 0;

            let keys = Object.keys(response);
            //log("statusReqCb, keys.len: ", keys.length);

            for (let idx=0; idx < keys.length; idx++) {
                let userId = keys[idx];
                let status = response[userId];

                if (status == 'online') {thisCountOnline++; online++;}
                if (status == 'offline') {thisCountOffline++; offline++;}
                if (status == 'idle') {thisCountIdle++; idle++;}
            }

            idle -= totalFallen;
            updateUserCountUI();

            if (!onMainFacPage()) {
                for (let idx=0; idx<triggerKeys.length; idx++) {
                    let t = triggers[triggerKeys[idx]];
                    if (thisCountOnline > t.max) t.max = thisCountOnline;
                    if (!t.pending) {
                        t.pending = true;
                        t.checkVal = thisCountOnline;

                        setTimeout(statusCheck, t.triggerSecs*1000, t);
                    }
                }
            }
        }

        function getFacStatus() {
            getStatusForUserArray(facMembersArray, statusReqCb);
        }

    }

    var notifyActive = false;
    function resetActive() {notifyActive = false;}

    function doBrowserNotify(diff) {

        if (notifyActive == true) log("*** Notify Active, is it reallly? ****");

        if (notifyActive == true) return;

        notifyActive = true;

        let msgText = "Push may be coming! " + diff + " more online in " + triggerSecs + " secs!";
        let opts = {
            title: 'Push Predictor',
            text: msgText,
            tag: "xedx-predict",      // Prevent multiple msgs if it sneaks by my checks.
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: 30000,
            onclick: (context) => {
                setTimeout(resetActive, 30000); // ??? not needed???
                //handleNotifyClick(context);
            }, ondone: () => {
                //handleNotifyDone(context);
                setTimeout(resetActive, 30000);
            }
        };

        GM_notification ( opts );
    }

    // ======================= API calls, get fac member IDs =========================

    var doNotCount = false;
    function facMemberCb(responseText, ID, options) {
        let jsonObj = JSON.parse(responseText);
        let membersArray = jsonObj.members;
        debug("facMemberCb: ", jsonObj);

        if (jsonObj.error) {
            console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
            return;
        }

        membersArray.forEach(function (member, index) {
            if (member.id) {
                let state = member.status.state;
                if (state.toLowerCase() != "fallen" && member.position != "Recruit") {
                    facMembersArray.push(member.id);
                    //facMembersJson[member.id] = member.name;
                } else if (!doNotCount) {
                    if (state.toLowerCase() == "fallen") totalFallen++;
                    if (member.position == "Recruit" == "fallen") totalRecruit++;
                }
                doNotCount = true;
            }
        });

        debug("Fac members: ", facMembersArray.length);
    }

    function getFacMembers(facId) {
        if (facMembersArray.length > 0) {
            // Shouldn't happen!
            // debugger;
            return;
        }

        xedx_TornFactionQueryv2(facId, "members", facMemberCb);
    }


    // =================== Misc helpers ===================

    function logParams() {

        // temp disable...
        return;

        let msgText = "Search Params:\n";
        searchParams.forEach(function(value, key) {
            msgText += ` key: ${key} value: ${value}\n`;
        });
        debug(msgText);
        msgText = "Hash Params:\n";
        hashParams.forEach(function(value, key) {
            msgText += ` key: ${key} value: ${value}\n`;
        });
        debug(msgText);
    }

    function onMainFacPage() {
        searchParams = new URLSearchParams(location.search);
        hashParams = new URLSearchParams(location.hash);

        let step = searchParams.get('step');
        let tab = hashParams.get('#/tab');

        let rc = (step == 'your' && !tab);
        if (rc == true) onOurFacPage = true;
        return rc;
    }

    function onFacProfilePage(otherOnly=false) {
        searchParams = new URLSearchParams(location.search);
        hashParams = new URLSearchParams(location.hash);

        let step = searchParams.get('step');
        let type = searchParams.get('type');
        let tab = hashParams.get('#/tab');

        if (step == 'profile') {
            onOurFacPage = false;
            return true;
        }
        if (otherOnly == false && step == 'your' && /*type == '1' &&*/ tab == 'info') {
            onOurFacPage = true;
            return true;
        }

        return false;
    }

    function shortTimeStamp(date) {
        if (!date) date = new Date();
        const timeOnly = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        return timeOnly.format(date);
    }

    // =================== User counts and status ===================
    function updateUserCountUI() {
        //debug("updateUserCountUI");

        $("#xcnt-online").text(online);
        $("#xcnt-offline").text(offline);
        $("#xcnt-idle").text(idle);

        $("#xcnt-ok").text(usersOk());
        $("#xcnt-away").text(usersAway());
        $("#xcnt-hosp").text(usersInHosp());

        $("#xcnt-time").text(shortTimeStamp());
    }

    function updateUserCounts(retries=0) {
        let userIconList = $(iconSel);
        let len = $(userIconList).length;
        if (userIconList && len > 0) {
            online = offline = idle = userCount = 0;
            for (let idx=0; idx<len; idx++) {
                let node = userIconList[idx];
                userCount++;
                let fill = $(node).attr('fill');
                if (fill) {
                    if (fill.indexOf('offline') > -1) offline++;
                    else if (fill.indexOf('online') > -1) online++;
                    else if (fill.indexOf('idle') > -1) idle++;
                }
            }
            if (idle > 0) idle = idle - usersFallen();

            updateUserCountUI();
            //debug("User count: ", userCount, " online: ", online, " offline: ", offline, " idle: ", idle);
        } else {
            if (retries++ < 20) return setTimeout(handlePageLoad, 250, retries);
        }
    }

    // ========================= Simple UI installation ==================
    function installTitleBar(retries=0) {
        if ($("#xonline-title").length != 0) return;

        let facwrap = onMainFacPage() ? $("#faction_war_list_id") : $(".faction-info-wrap");
        if (!$(facwrap).length) {
            if (retries++ < 20) return setTimeout(installTitleBar, 250, retries);
            return log("installTitleBar: Too many retries!");
        }

        let target = ($(facwrap).length > 1) ? $(facwrap)[1] : $(facwrap);
        let titleBarDiv = getTitleBarDiv();
        $(target).before(titleBarDiv);

        log("Install UI, enablePushPrediction? ", enablePushPrediction, $("#xedx-startp-btn"));
        // #xedx-startp-btn\ xml10

        if (enablePushPrediction == true) {
            $("#xedx-startp-btn").removeClass("xhide");
            $("#xedx-refresh-btn").addClass("xhide");
        }

        $("#xedx-startp-btn").on('click', startPushPrediction);
        $("#xedx-refresh-btn").on('click', updateUserCounts);

    }

    // ======================== Kicked off at page load =================
    var updateUserCountsTimer = null;
    function handlePageLoad(retries=0) {

        stopPushPrediction();

        if (!onFacProfilePage() && !onMainFacPage()) {
            let step = searchParams.get('step');
            let tab = hashParams.get('#/tab');
            return log("Not on fac profile page!");
        }

        if ($("#xonline-title").length == 0) {
            installTitleBar();
        }

        if (onMainFacPage()) {
            return;
        }

        updateUserCounts();
        if (updateUserCountsTimer) clearInterval(updateUserCountsTimer);
        updateUserCountsTimer = setInterval(updateUserCounts, updateIntervalSecs*1000);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    if (enablePushPrediction == true)
        validateApiKey();

    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    if (!onFacProfilePage() && !onMainFacPage()) {
        let step = searchParams.get('step');
        let tab = hashParams.get('#/tab');
        return log("Not on fac profile page! step: ", step, " tab: ", tab);
    }

    callOnContentLoaded(handlePageLoad);

    // ========================= More UI stuff =========================

    // <div id="xonline-title" class="title-black m-top10" data-title="user-counts" role="heading" aria-level="5">
    function getTitleBarDiv() {
        let titleBarDiv = `
            <div id="xonline-title" class="title-black m-top10">
                <div class="counts-wrap">
                    <div class="counts-wrap xmr20">
                        <span class="count-span xmr20">
                            <span class="xmr5">Online: </span>
                            <span id="xcnt-online" class="count-text"></span>
                        </span>
                        <span class="count-span xmr20">
                            <span class="xmr5">Offline: </span>
                            <span id="xcnt-offline" class="count-text"></span>
                        </span>
                        <span class="count-span xmr20">
                            <span class="xmr5">Idle: </span>
                            <span id="xcnt-idle" class="count-text"></span>
                        </span>
                    </div>

                    <div class="counts-wrap xml20">
                        <span class="count-span xmr20">
                            <span class="xmr5">OK: </span>
                            <span id="xcnt-ok" class="count-text"></span>
                        </span>
                        <span class="count-span xmr20">
                            <span class="xmr5">Hosp: </span>
                            <span id="xcnt-hosp" class="count-text"></span>
                        </span>
                        <span class="count-span xmr20">
                            <span class="xmr5">Away: </span>
                            <span id="xcnt-away" class="count-text"></span>
                        </span>
                    </div>

                        <span class="count-span" style="margin-left: auto;">
                            <span class="xmr5">Updated: </span>
                            <span id="xcnt-time"></span>
                        </span>
                        <input id="xedx-refresh-btn" type="submit" class="xedx-torn-btn xmr10 xmt3" value="Refresh">
                        <input id="xedx-startp-btn" type="submit" class="xedx-torn-btn xmr10 xmt3 xhide" value="Start">
                    </div>
                </div>
            </div>
        `;

        return titleBarDiv;
    }

    function addStyles() {

    addTornButtonExStyles();
    loadCommonMarginStyles();
    loadMiscStyles();

    GM_addStyle(`
        .counts-wrap {
            display: flex;
            flex-flow: row wrap;
            align-content: center;
        }

        .count-span {
            display: flex;
            flex-flow: row wrap;
            justify-content: space-between;
        }

        .count-text {
            font-size: 15px;
        }

        .counts-wrap input {
            position: relative;
            margin-left: 10px;
        }
    `);
    }



})();


