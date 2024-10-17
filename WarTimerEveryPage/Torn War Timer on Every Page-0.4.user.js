// ==UserScript==
// @name         Torn War Timer on Every Page
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Once enlisted, puts a war countdown on every page
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
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

    // If this script gives an error about not being able
    // to get your fac ID, set it here.
    const defFacId = undefined;

    var facId = GM_getValue("facId", defFacId);
    var warStart;

    // Save in storage?
    /*
    warStart = GM_getValue("warStart", undefined);
    var now = new Date().getTime();
    if (warStart) warStart = parseInt(warStart);
    if (warStart && warStart < now) warStart = undefined;
    */

    // Globals
    var timer = 0;               // display timer
    var secsDiff;
    var daysDiff = 0;
    const secsmin = 60;
    const secshr = secsmin * 60;
    const secsday = secshr * 24;

    //======================== Functions to handle the time =====================
    function diffSecs(t1, t2) {
        let h1 = t1.getUTCHours();
        let m1 = t1.getUTCMinutes();
        let s1 = t1.getUTCSeconds();
        let t1secs = s1 + m1*secsmin + h1*secshr;

        let h2 = t2.getUTCHours();
        let m2 = t2.getUTCMinutes();
        let s2 = t2.getUTCSeconds();
        let t2secs = s2 + m2*secsmin + h2*secshr;

        daysDiff = t2.getUTCDay() - t1.getUTCDay();

        // Tomorrow: add t2 secs + (fullDaySecs - t1 secs)
        // Same day: t2 secs - t1 secs
        let ist2tomorrow = h2 < h1;
        let secsdiff;
        if (ist2tomorrow == true) {
            secsdiff = t2secs + (secsday - t1secs);
        } else {
            secsdiff = t2secs - t1secs;
        }

        return secsdiff;
    }

    // Check for time is 0, or is greater than last, some of these
    // tmer scripts seem to get stuck at :01 For checking greater,
    // check every n 'ticks'.
    var lastDiff;
    var checkDiffCnt = 0;
    const checkDiffAt = 3;    // ~3 sec window
    var timeExceeded = false;

    function checkTimeExceeded() {
        if (secsDiff == 0) return true;           // 0 time left, we're done
        if (!lastDiff) lastDiff = secsDiff;
        if (++checkDiffCnt % checkDiffAt == 0) {  // Every "checkDiffAt" ticks...
            if (secsDiff > lastDiff) return true; // Wrapped?
            checkDiffCnt = 0
        }
        return false;
    }

    function getTimeUntil() {
        secsDiff = diffSecs(new Date(), new Date(warStart)); // * 1000));
        let done = checkTimeExceeded();
        if (done == true) {
            clearInterval(timer);
            timer = 0;
            timeExceeded = true;
            secsDiff = 0;
            return "00:00:00";
        }

        let date = new Date(null);
        date.setSeconds(secsDiff);
        let secDiffStr = date.toISOString().slice(11, 19);

        secDiffStr = "0" + daysDiff + ":" + secDiffStr;

        return secDiffStr;
    }

    // Fires every second to update the clock
    var tempCounter = 0;
    function handleInterval() {
        let timeLeft = getTimeUntil();
        $("#wartime").text(timeLeft);

        // Alerts
        if ((secsDiff < 15 * secsmin) && !$("#wartime").hasClass("flash-grn"))
            $("#wartime").addClass("flash-grn");
    }

    // ============================ Called once page DOM has loaded ================
    //
    function handlePageLoad(retries=0) {
        if (!warStart) { // it's possible the API call didn't return yet or errored out...
            if (retries++ < 10) return setTimeout(handlePageLoad, 250, retries);
            return log("Error: no start time!");
        }

        // Install UI
        if ($("#x-war-watch").length == 0) installUI();

        if (timer) clearInterval(timer);
        timer = setInterval(handleInterval, 1000);
    }

    // =================================== UI installation ==========================

    function handleRefresh(e) {
        if (timer) clearInterval(timer);
        warStart = undefined;
        $("#wartime").text("00:00:00");
        xedx_TornFactionQuery(facId, "rankedwars", tornQueryCB);
    }

    function handleClose(e) {
        if (timer) clearInterval(timer);
        timer = 0;
        $("#x-war-watch").remove();
    }

    function handleMinimize() {
        if ($("#x-war-watch").height() == 32) {
            handleMaximizeClick();
        } else {
            handleMinimizeClick();
        }
    }

    function handleMinimizeClick() {
        $("#x-war-watch").css("height", "32px");
        GM_setValue("lastDisplaySize", "32px");
        minimized = true;
    }

    function handleMaximizeClick() {
        $("#x-war-watch").css("height", "74px");
        GM_setValue("lastDisplaySize", "74px");
        minimized = false;
    }

    function installUI(retries) {
        log("[installUI]");

        // Make the window
        let warTimerDiv = getWarTimerDiv();
        let warDiv = $(warTimerDiv);
        $("#mainContainer").append(warDiv);

        log("Selector: $('#x-war-watch')");
        log("Installed: ", $("#x-war-watch"));

        // Handle position auto-save and restore
        startSavingPos(1500, "x-war-watch");

        // Button handlers
        $("#x-war-close").on('click', handleClose);
        $("#x-war-refresh").on('click', handleRefresh);
        $("#x-war-hide").on('click', handleMinimize);

        // Tool tip help
        displayHtmlToolTip($("#x-war-close"), "Close", "tooltip4");
        displayHtmlToolTip($("#x-war-refresh"), "Refresh", "tooltip4");
        displayHtmlToolTip($("#x-war-hide"), "Minimize/Maximize", "tooltip4");

        // Make draggable
        dragElement(document.getElementById("x-war-watch"));
    }

    // ====================== Kick things off one complete (API callbacks) ================
    //
    function tornQueryCB(responseText, ID, param) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            if (jsonResp.error.code == 6)
                return;
            return handleError(responseText);
        }

        let warList = jsonResp.rankedwars;
        if (!warList) {
            console.error("Error getting wars from the API! jsonResp: ", jsonResp);
            return;
        }

        // Iterate backwards, should be last entry.
        let keys = Object.keys(warList);

        let theWar;
        let count = keys.length;
        let idx = Number(count) - 1;
        var now = new Date().getTime();
        for (; idx >= 0; idx--) {
            let key = keys[idx];
            let thisWar = warList[key].war;
            let start = (+thisWar.start * 1000);
            if (thisWar.end == 0 && start > now) {
                theWar = thisWar;
                log("the war: ", theWar);
                break;
            }
        }

        if (!theWar) {
            log("Can't seem to find an active war, may not be matched.");
            return;
        }

        warStart = (+theWar.start * 1000);
        GM_setValue("warStart", warStart);
        log("Start time saved: ", warStart, ", ", new Date(warStart).toString());

        callOnContentLoaded(handlePageLoad);
    }

    function personalStatsQueryCB(responseText, ID, param) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            if (jsonResp.error.code == 6)
                return;
            return handleError(responseText);
        }

        if (jsonResp.faction && jsonResp.faction.faction_id) {
            facId = jsonResp.faction.faction_id;
            GM_setValue("facId", facId);
            xedx_TornFactionQuery(facId, "rankedwars", tornQueryCB);
        } else {
            console.error("Unable to get faction ID.\n" +
                          "You can set the 'defFacId' variable in the script to fix this.");
            return;
        }

    }

    //////////////////////////////////////////////////////////////////////
    // =====================  Main Entry Point. ==========================
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    addStyles();

    //callOnHashChange(hashChangeHandler);
    //installPushStateHandler(pushStateChanged);

    if (!facId) {
        xedx_TornUserQuery('', 'profile', personalStatsQueryCB);
    } else {
        xedx_TornFactionQuery(facId, "rankedwars", tornQueryCB);
    }

    /* TBD...
    if (!warStart || warStart == 0) {
        xedx_TornFactionQuery(8151, "rankedwars", tornQueryCB);
    } else {
        log("Using saved start time: ", warStart, ", ", new Date(warStart).toString()); //getTimeUntil());
        callOnContentLoaded(handlePageLoad);
    }
    */

    // ============================= Entry point ends here ==========================

    // =============== At the end to get out of the way ==============================
    function getWarTimerDiv() {
        const warTimerDiv = `
            <div id="x-war-watch" class="x-war-wrap x-drag xbgb-var">
                <div id="x-war-sec-hdr">
                    <div id="x-war-watchheader" class="x-war-hdr grab title-black hospital-dark top-round">
                        <div role="heading" aria-level="5">RW Timer</div>
                        <div class="x-war-hdr">
                            <span id="x-war-hide" class="x-rt-btn x-inner-span xml10">M</span>
                            <span id="x-war-refresh" class="x-rt-btn x-inner-span xml5">R</span>
                            <span id="x-war-close" class="x-rt-btn x-inner-span xml5 xmr5">X</span>
                        </div>
                    </div>
                    <div id="x-hosp-inner" class="x-war-inner-flex">
                        <span id="wartime" class="war-txt">00:00:00</span>
                    </div>
                </div>
            </div>
        `;

        return warTimerDiv;
    }

    function addStyles() {

        loadCommonMarginStyles();
        addToolTipStyle();

        addCursorMovingStyles();
        addCursorStyles();

        GM_addStyle(`
             .x-war-wrap {
                -ms-transform: translateX(-20%) translateY(-95%)  !important;
                -webkit-transform: translate(-20%,-95%) !important;
                transform: translate(-20%,-95%) !important;
                background: transparent;
                top: 32%;
                left: 84%;
            }
            .x-war-wrap-min {
                left: 0;
            }
            .x-war-inner-flex {
                border-radius: 5px;
                width: 200px;
                height: 40px;
                align-content: center;
                justify-content: center;
                display: flex;
                flex-direction: column;
                flex-wrap: wrap;
            }
            .war-txt {
                font-size: 20px;
            }

            .xbgb-var {background: var(--page-background-color) !important;}

            .x-rt-btn {
                display: flex;
                justify-content: center;
                width: 30px;
                border-radius: 30px;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }
            .x-war-hdr {
                /*border: 1px solid limegreen;*/
                border-radius: 5px;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            }
            .x-ontoptop {
                z-index: 999998;
            }
            .x-drag {
                position: fixed;
                display: flex;
                z-index: 999998;
                overflow: scroll;
                border: 1px solid steelblue;
                border-radius: 10px;
                background: var(--default-bg-panel-color) none repeat scroll 0% 0% / auto padding-box border-box;
            }
            .x-margin3 {
                border-left: 2px solid steelblue;
                border-right: 2px solid steelblue;
                border-bottom: 2px solid steelblue;
            }

            .flash-grn {
               animation-name: flash-green;
                animation-duration: 0.8s;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                animation-direction: alternate;
                animation-play-state: running;
            }

            @keyframes flash-green {
                from {color: #00ff00;}
                to {color: #eeeeee;}
            }

            .flash-wht {
                animation-name: flash-white;
                animation-duration: 0.8s;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                animation-direction: alternate;
                animation-play-state: running;
            }

            @keyframes flash-white {
                from {color: #ededed;}
                to {color: #888888;}
            }
        `);
    }


})();


