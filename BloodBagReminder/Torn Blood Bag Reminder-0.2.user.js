// ==UserScript==
// @name         Torn Blood Bag Reminder
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Alert when med CD is over and health full.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.5.js
// @grant        GM_addStyle
// @grant        GM_notification
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

    // Some editable options
    const notificationSecs1 = GM_getValue("notificationSecs1", 30);
    const notificationSecs2 = GM_getValue("notificationSecs2", 90);
    const notificationSecs3 = GM_getValue("notificationSecs3", 300);
    const alertAt0 = GM_getValue("alertAt0", true);
    const showBrowserNotifications = GM_getValue("showBrowserNotifications", true);
    const notificationTimeoutMs = GM_getValue("notificationTimeoutMs", 20000);
    const showFloatingWindowAlerts = GM_getValue("showFloatingWindowAlerts", true);
    const displayFloatingWindow = GM_getValue("displayFloatingWindow", true);
    const transparentBackground = GM_getValue("transparentBackground", false);
    const startWindowHidden = GM_getValue("startWindowHidden", false);
    const hideFloatWinAfterAlert = GM_getValue("hideFloatWinAfterAlert", true);

    GM_setValue("displayFloatingWindow", displayFloatingWindow);
    GM_setValue("transparentBackground", transparentBackground);
    GM_setValue("alertAt0", alertAt0);
    GM_setValue("showFloatingWindowAlerts", showFloatingWindowAlerts);
    GM_setValue("showBrowserNotifications", showBrowserNotifications);
    GM_setValue("notificationTimeoutMs", notificationTimeoutMs);
    GM_setValue("startWindowHidden", startWindowHidden);
    GM_setValue("hideFloatWinAfterAlert", hideFloatWinAfterAlert);

    let alertTimes = [notificationSecs1, notificationSecs2, notificationSecs3];
    alertTimes.sort((a, b) => (a - b));

    log("Alert times: ", alertTimes);

    GM_setValue("notificationSecs1", alertTimes[0]);
    GM_setValue("notificationSecs2", alertTimes[1]);
    GM_setValue("notificationSecs3", alertTimes[2]);

    // Enables debugging stuff for development
    const xedxDevMode = GM_getValue("xedxDevMode", false);;

    // Some globals
    var currentState = GM_getValue("currentState", "normal");
    GM_setValue("currentState", currentState);

    var pageLoaded = false;
    var hidden = false;
    var winTimer;
    var cooldowns;
    var lifebar;
    var nervebar;
    var status;

    var lastAlertShown = GM_getValue("lastAlertShown", undefined);
    var firstAlertShown = GM_getValue("firstAlertShown", false);
    var secondAlertShown = GM_getValue("secondAlertShown", false);
    var thirdAlertShown = GM_getValue("thirdAlertShown", false);

    if (lastAlertShown == undefined) {
        resetAllAlertsShown();
    }

    var drugCdTime = {untilSecs: 0, timeAt: "", timeEpoch: 0, dateTimeAt: ""};
    var boosterCdTime = {untilSecs: 0, timeAt: "", timeEpoch: 0, dateTimeAt: ""};
    var medCdTime = {untilSecs: 0, timeAt: "", timeEpoch: 0, dateTimeAt: ""};
    var lifeBarTime = {untilSecs: 0, timeAt: "", timeEpoch: 0, dateTimeAt: ""};
    var nerveBarTime = {untilSecs: 0, timeAt: "", timeEpoch: 0, dateTimeAt: ""};
    var hospTime = {untilSecs: 0, timeAt: "", timeEpoch: 0, dateTimeAt: ""};

    var displayTime = {untilSecs: 0, timeAt: "", timeEpoch: 0, dateTimeAt: ""};

    function saveAlertsShown() {
        GM_setValue("lastAlertShown", lastAlertShown);
        GM_setValue("firstAlertShown", firstAlertShown);
        GM_setValue("secondAlertShown", secondAlertShown);
        GM_setValue("thirdAlertShown", thirdAlertShown);
    }

    function resetAllAlertsShown() {
        lastAlertShown = firstAlertShown =
        secondAlertShown = thirdAlertShown = false;
        saveAlertsShown()
    }

    function resetAlertsShown() {
        // Don't set to false, set to true to prevent displaying again?
        if ((+displayTime.untilSecs <= 0) == true) {
            resetAllAlertsShown();
            return;
        }

        // These are in ascending order...
        if (displayTime.untilSecs > alertTimes[0]) {
            firstAlertShown = false;
        }
        if (displayTime.untilSecs > alertTimes[1]) {
            secondAlertShown = false;
        }
        if (displayTime.untilSecs > alertTimes[2]) {
            thirdAlertShown = false;
        }

        saveAlertsShown();
        //resetAllAlertsShown();
    }

    function timeNow() {
        let now = new Date().getTime();
        let date = new Date(now);
        let  timestr = date.toLocaleTimeString();
        return timestr;
    }

    function getLifeFullNoMed() {
        let maxSecs = Math.max(lifeBarTime.untilSecs, medCdTime.untilSecs);
        displayTime = (maxSecs == lifeBarTime.untilSecs) ?
            lifeBarTime : medCdTime;

        log("Med gone and Life full at: ", displayTime.dateTimeAt);
        return displayTime.dateTimeAt;
    }

    function fillMyTimeVar(myVar, theirVar) {
        let now = new Date().getTime();

        myVar.untilSecs = theirVar;
        let date = new Date(now + (+theirVar * 1000));
        myVar.timeEpoch = date.getTime();
        myVar.timeAt = date.toLocaleTimeString();
        myVar.dateTimeAt = date.toLocaleString();
    }

    // Get time until/time at the CDs and bars
    function parseTimes() {
        fillMyTimeVar(medCdTime, cooldowns.medical);
        fillMyTimeVar(drugCdTime, cooldowns.drug);
        fillMyTimeVar(boosterCdTime, cooldowns.booster);
        fillMyTimeVar(lifeBarTime, lifebar.fulltime);
        fillMyTimeVar(nerveBarTime, nervebar.fulltime);

        if (status.state == "Hospital") {
            fillMyTimeVar(hospTime, status.until / 1000);
        } else {
            fillMyTimeVar(hospTime, 0);
        }

        if (xedxDevMode) {
            log("drugCdTime: ", drugCdTime);
            log("boosterCdTime: ", boosterCdTime);
            log("medCdTime: ", medCdTime);
            log("lifeBarTime: ", lifeBarTime);
            log("nerveBarTime: ", nerveBarTime);
            log("hospTime: ", hospTime);
            log("displayTime: ", displayTime);

            getLifeFullNoMed();
        }

        if (pageLoaded == false)
            callOnContentLoaded(handlePageLoad);

        if (!winTimer) {
            log("Starting timer: ", timeNow());
            winTimer = setInterval(updateWin, winTimerInt);
        }

        resetAlertsShown();
    }

    // Parse the cooldowns/bars query
    function userQueryCB(responseText, ID) {
        log("userQueryCB");
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            debug('Response error! ', jsonResp.error);
            return handleError(responseText);
        }

        cooldowns = jsonResp.cooldowns;
        lifebar = jsonResp.life;
        nervebar = jsonResp.nerve;
        status = jsonResp.status;
        parseTimes();
    }

    function doUserQuery() {
        log("doUserQuery");
        xedx_TornUserQuery(null, 'cooldowns,bars,basic', userQueryCB);
    }

    var notifyOpen = false;
    function doBrowserNotify() {
        if (notifyOpen == true) return;

        log("Browser alert: ", timeNow());

        let date = new Date(null);
        date.setSeconds(displayTime.untilSecs);
        let secDiffStr = date.toISOString().slice(11, 19);
        let msgText = 'No med CD and full life in:\n' + secDiffStr;
        if ((+displayTime.untilSecs <= 0) == true) {
            msgText = "You have no med CD, and full life!";
        }

        GM_notification ( {
            title: 'Med/Life Alert',
            text: msgText,
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: notificationTimeoutMs,
            onclick: () => {
                log ("My notice was clicked.");
                window.focus ();
            },
            ondone: () => {notifyOpen = false;}
        } );
    }

    function removeWinAlert() {
        log("Removing Floating alert: ", timeNow());
        $(".xblood-span").removeClass("blood-flash");
        if (hideFloatWinAfterAlert == true) handleHide();
    }

    function doFloatingWinAlert() {
        log("Floating alert, now: ", timeNow());
        log("Floating alert, until: ", +displayTime.untilSecs, " +untilSecs <= 0? ", (+displayTime.untilSecs <= 0));
        if ((+displayTime.untilSecs <= 0) == true) {
            $("#blood-msg-at").text("No med CD, full life!!");
            $("#blood-msg-until").text("-");
            //$("#blood-msg-until").addClass("xblood-hide");
            log("Floating alert - removing hide");
            $("#blood-msg-close").text("(click to close)");
            $("#blood-msg-close").removeClass("xblood-hide");
        }
        
        handleShow();
        $(".xblood-span").addClass("blood-flash");
        setTimeout(removeWinAlert, notificationTimeoutMs);
    }

    function doAlert() {
        log("Showing alert! ", timeNow());
        if (showBrowserNotifications)
            doBrowserNotify();
        if (showFloatingWindowAlerts) {
            doFloatingWinAlert();
        }
    }

    function handleAlertCheck() {
        if ((+displayTime.untilSecs <= 0) == true) {
            if (alertAt0 == true && lastAlertShown == false) {
                lastAlertShown = true;
                saveAlertsShown();
                doAlert();
            }
            return;
        }

        // These are in ascending order...
        if (displayTime.untilSecs < alertTimes[0] && firstAlertShown == false) {
            firstAlertShown = true;
            doAlert();
        } else if (displayTime.untilSecs < alertTimes[1] && secondAlertShown == false) {
            secondAlertShown = true;
            doAlert();
        } else if (displayTime.untilSecs < alertTimes[2] && thirdAlertShown == false) {
            thirdAlertShown = true;
            doAlert();
        }

        saveAlertsShown();
    }

    const winTimerInt = 1000;
    function updateWin() {
        //log("[updateWin] displayTime: ", displayTime);

        if (displayTime.untilSecs > 0)
            displayTime.untilSecs -= (winTimerInt / 1000);

        if (displayTime.untilSecs <= 0) {
            if (winTimer) {
                clearInterval(winTimer);
                winTimer = undefined;
                log("Timer cleared, will check again in 20 secs: ", timeNow());
            }
            setTimeout(doUserQuery, 20000);
            return;
        }

        let date = new Date(null);
        date.setSeconds(displayTime.untilSecs);
        let secDiffStr = date.toISOString().slice(11, 19);

        $("#blood-msg-at").text(displayTime.dateTimeAt);
        $("#blood-msg-until").text(secDiffStr);

        handleAlertCheck();
    }

    // Do I really want to stop the timer??? No!
    function closeBloodDiv(e) {
        //if (winTimer) clearInterval(winTimer);
        //winTimer = undefined;
        $("#x-blood-bags").remove();
    }

    function handleRefreshClick(e) {
        doUserQuery();

        //log("Testing alert!");
        //doFloatingWinAlert();
        //doAlert();
    }

    function handleHide(e) {
        log("handleHide: ", $("#x-blood-bags").hasClass("xblood-hide"), " ", GM_getValue("currentState", "unknown"));
        $("#x-blood-bags").addClass("xblood-hide");
        hidden = true;
        GM_setValue("currentState", "hidden");
    }

    function handleShow(e) {
        log("handleShow: ", $("#x-blood-bags").hasClass("xblood-hide"), " ", GM_getValue("currentState", "unknown"));
        $("#x-blood-bags").removeClass("xblood-hide");
        hidden = false;
        GM_setValue("currentState", "showing");
    }

    function handleMinimizeClick() {
        $("#x-blood-bags").css("height", "32px");
        GM_setValue("lastDisplaySize", "32px");
        minimized = true;
        GM_setValue("currentState", "minimized");
    }

    function handleMaximizeClick() {
        $("#x-blood-bags").css("height", "134px");
        GM_setValue("lastDisplaySize", "134px");
        minimized = false;
        GM_setValue("currentState", "normal");
    }

    function handleMinimize() {
        log("handleMinimize: ", $("#x-hosp-watch").height(), " ", GM_getValue("currentState", "unknown"));

        if ($("#x-hosp-watch").height() == 32) {
            handleMaximizeClick();
        } else {
            handleMinimizeClick();
        }
    }

    function createFloatingWin() {
        if ($("#x-blood-bags").length > 0) {
            log("Floating window exists!");
            return;
        }

        let myDiv = getWindowDiv();
        $("#mainContainer").append(myDiv);

        log("UI apended: ", $("#x-blood-bags"));

        $("#x-blood-close").on('click', closeBloodDiv);
        $("#x-blood-refresh").on('click', handleRefreshClick);
        $("#x-blood-hide").on('click', handleMinimize);

        displayHtmlToolTip($("#x-blood-close"), "Close", "tooltip4");
        displayHtmlToolTip($("#x-blood-refresh"), "Refresh", "tooltip4");
        displayHtmlToolTip($("#x-blood-hide"), "Minimize/Maximize", "tooltip4");

        dragElement(document.getElementById("x-blood-bags"));

        if (startWindowHidden == true) { // || currentState == "hidden")
            handleHide();
        } else if (currentState == "minimized") {
            handleMinimize();
        } else {
            handleShow();
        }
    }

    function installUI(retries=0) {
        log("[installUI]");

        if (showFloatingWindowAlerts == true || displayFloatingWindow == true) {
            createFloatingWin();
        }

        getLifeFullNoMed();

        if (!winTimer) {
            log("Starting timer: ", timeNow());
            winTimer = setInterval(updateWin, winTimerInt);
        }

        if (xedxDevMode) log("UI installed: ", $("#x-blood-bags"));
    }

    function getWindowDiv() {
        const bgClass = (transparentBackground == true) ? "xbgt" : "xbgb";
        const floatingDiv = `
            <div id="x-blood-bags" class="x-blood-wrap x-drag xbgreen ` + bgClass + `">
                <div id="x-blood-bagsheader">
                    <div class="x-blood-hdr title-black top-round">
                        <div role="heading" aria-level="5">Blood Bag Alerts</div>
                        <div class="x-blood-hdr">
                            <span id="x-blood-disable" class="x-rt-btn x-inner-span xml10">D</span>
                            <span id="x-blood-hide" class="x-rt-btn x-inner-span xml10">M</span>
                            <span id="x-blood-refresh" class="x-rt-btn x-inner-span xml5">R</span>
                            <span id="x-blood-close" class="x-rt-btn x-inner-span xml5 xmr5">X</span>
                        </div>
                    </div>
                    <div id="x-blood-inner" class="x-blood-inner-flex">
                        <span id="blood-msg-at" class="xblood-span">00:00:00</span>
                        <span id="blood-msg-until" class="xblood-span">00:00:00</span>
                        <span id="blood-msg-close" class="xblood-hide xblood-span">Close</span>
                    </div>
                </div>
            </div>
        `;

        return floatingDiv;
    }

    function addWindowStyles() {
        GM_addStyle(`
            .xbgb {background: black !important;}
            .xbgt {background: transparent !important;}

            .xblood-span {font-size: 16px; text-align: center; margin: 5px;}

            .x-rt-btn {
                display: flex;
                justify-content: center;
                width: 30px;
                border-radius: 30px;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }
            .x-blood-hdr {
                /*border: 1px solid limegreen;*/
                border-radius: 5px;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            }
            .x-blood-inner-flex {
                border-radius: 5px;
                width: 200px;
                height: 100px;
                align-content: center;
                justify-content: center;
                display: flex;
                flex-direction: column;
                flex-wrap: wrap;
            }
            .x-drag {
                position: absolute;
                display: flex;
                z-index: 999998;
                overflow: scroll;
                border: 1px solid steelblue;
                border-radius: 10px;
                background: var(--default-bg-panel-color) none repeat scroll 0% 0% / auto padding-box border-box;
                cursor: grab;
            }

            .blood-flash {
                animation-name: bloodflash;
                animation-duration: 0.8s;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                animation-direction: alternate;
                animation-play-state: running;
            }

            @keyframes bloodflash-var {
                --bloodon: #00ff00;
                --bloodoff: #eeeeee;
                from {color: var(--bloodon);}
                to {color: var(--bloodoff);}
            }

            @keyframes bloodflash {
                from {color: #00ff00;}
                to {color: #eeeeee;}
            }
        `);
    }

    function bbHashChangeHandler() {

    }

    function bbPushStateChanged(e) {

    }

    function handlePageLoad() {
        if (currentState == "disabled")
            return log("Script manually disabled!");

        if (displayFloatingWindow || showFloatingWindowAlerts) {
            loadCommonMarginStyles();
            addToolTipStyle();
            addBorderStyles();
            addWindowStyles();
            GM_addStyle(".xblood-hide {display: none !important;}");
        }

        pageLoaded = true;
        installUI();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    if (currentState == "disabled")
        return log("Script manually disabled!");

    validateApiKey();
    versionCheck();

    callOnHashChange(bbHashChangeHandler);
    installPushStateHandler(bbPushStateChanged);

    // Query current cooldowns, interested in medical,
    // lifebar. I save booster, drug, etc just in case...
    // Prob should include hosp. Or don't do anything
    // until out of hosp.
    doUserQuery();

})();




