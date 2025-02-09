// ==UserScript==
// @name         Torn OC 2.0 Tracker
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Keep track of when your OC v2 will be ready
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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

    const userId = getThisUserId();

    var myOcTracker;
    //var myCrimeId = GM_getValue("myCrimeId", null);
    //var myCrimeStartTime = GM_getValue("myCrimeStartTime", 0);
    var myCrimeId; // = GM_getValue("myCrimeId", null);
    var myCrimeStartTime; // = GM_getValue("myCrimeStartTime", 0);
    var myCrimeStatus = ""; // = GM_getValue("myCrimeStatus", "");

    // Logging levels
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);
    const xedxDevMode = false;
    const showExperimental = false;

    const secsInDay = 24 * 60 * 60;
    const secsInHr = 60 * 60;

    var blinkingPaused = false;    // Set via an option, temp disable blinking...
    var blinkingNoOc = false;      // Set when alerting re: no OC
    const setAlertsPaused = function() {blinkingPaused = true;}

    // Options that are expeimental/unused
    const hideLvlKey = "hideLvl";
    const hideLvlValKey = "hideLvlVal";
    const warnMinLvlKey = "warnMinLvl";
    const warnMinLvlValKey = "warnMinLvlVal";

    var hideLvl = GM_getValue(hideLvlKey, false);
    var hideLvlVal = GM_getValue(hideLvlValKey, 5);
    var hideLvlPaused = false;

    var warnMinLvl = GM_getValue(warnMinLvlKey, false);
    var warnMinLvlVal = GM_getValue(warnMinLvlValKey, 5);

    var warnOnNoOc = GM_getValue("warnOnNoOc", true);
    var notifyOcSoon = GM_getValue("notifyOcSoon", true);
    var notifyOcSoonMin = GM_getValue("notifyOcSoonMin", 15);
    var disableToolTips = GM_getValue('disableToolTips', false);
    var scrollLock = GM_getValue('scrollLock', true);

    function writeOptions() {
        if (showExperimental == true) {
            GM_setValue(hideLvlKey, hideLvl);
            GM_setValue(hideLvlValKey, hideLvlVal);
            GM_setValue('disableToolTips', disableToolTips);
            GM_setValue(warnMinLvlKey, warnMinLvl);
            GM_setValue(warnMinLvlValKey, warnMinLvlVal);
        }

        GM_setValue("warnOnNoOc", warnOnNoOc);
        GM_setValue("notifyOcSoon", notifyOcSoon);
        GM_setValue("notifyOcSoonMin", notifyOcSoonMin);
        GM_setValue('scrollLock', scrollLock);
    }

    function updateOptions(doWriteOpts=true) {
        if (showExperimental == true) {
            hideLvl = GM_getValue(hideLvlKey, hideLvl);
            hideLvlVal = GM_getValue(hideLvlValKey, hideLvlVal);
            disableToolTips = GM_getValue('disableToolTips', disableToolTips);
            warnMinLvl = GM_getValue(warnMinLvlKey, warnMinLvl);
            warnMinLvlVal = GM_getValue(warnMinLvlValKey, warnMinLvlVal);

            $("#oc-hide").prop('checked', hideLvl);
            $("#oc-hide-lvl").val(hideLvlVal);
            $("#warn-no-oc").prop("checked", warnOnNoOc);
            $("#notify-soon").prop("checked", notifyOcSoon);
            $("#soon-min").val(notifyOcSoonMin);
            $("#disable-tool-tips").prop("checked", disableToolTips);
            $("#oc-min-avail").prop("checked", warnMinLvl);
            $("#oc-min-lvl").val(warnMinLvlVal);
        }

        warnOnNoOc = GM_getValue("warnOnNoOc", warnOnNoOc);
        notifyOcSoon = GM_getValue("notifyOcSoon", notifyOcSoon);
        notifyOcSoonMin = GM_getValue("notifyOcSoonMin", notifyOcSoonMin);
        scrollLock = GM_getValue('scrollLock', scrollLock);
        $("#scroll-lock").prop("checked", scrollLock);

        if (doWriteOpts) { writeOptions(); }

    }

    const hashChangeHandler = function () {handlePageLoad();}

    function isOcPage() {
        return location.hash ? (location.hash.indexOf("tab=crimes") > -1) : false;
    }

    const NO_OC_TIME = "No OC found.";
    function nn(t) {return t == 0? '00' : t < 10 ? '0' + t : t;}

    function myOcTrackingCb(responseText, ID, param) {
        if (myOcTracker)
            myOcTracker.handleOcResponse(responseText, ID, param);
    }

    // ================ OC Tracker class and it's context menu related functions ===============
    class OcTracker {
        // Since there is only one OcTracker object (a singleton), "myOcTracker" and
        // "this" are used somewhat interchangably here, the singleton would need to
        // be used or the object passed into some functions, namely callbacks.
        constructor() {

        }

        contextMenuItems = [
            {name: "Refresh OC Start Time",   id: "oc-refresh", type: "ctrl", fnName: "refresh",
                 tooltip: "Refreshes your OC start time."},
            {name: "Pause Flashing Alerts", id: "stop-alert", type: "ctrl", enabled: true, fnName: "stop-alert",
                 tooltip: "Stop the blinking alerts that<br>" +
                          "indicate you are not in an OC,<br>" +
                          "or that yours is due to start soon."},
            {name: "Go To Crimes Page", id: "oc-goto-crimes", type: "href",
                 href:"/factions.php?step=your&type=1#/tab=crimes",
                 tooltip: "Opens the OC page"},
            {name: "Enable Scroll Lock", id: "scroll-lock", key: "scrollLock", type: "cb", enabled: true, fnName: "toggleScroll",
                 tooltip: "Allows the OC's on each<br>" +
                          "page to scroll independently<br>" +
                          "of the page headers."},
            {name: "Hide low level crimes", id: "oc-hide", key: hideLvlKey, type: "cb", enabled: showExperimental},
            {name: "Min Level", id: "oc-hide-lvl", key: hideLvlValKey, type: "input",  min: 1, max: 10, enabled: showExperimental},

            {name: "Notify on level avail", id: "oc-min-avail", key: warnMinLvlKey,  type: "cb", enabled: showExperimental, min: 1, max: 10,
                 tooltip: "If a crime above the specified<br>" +
                          "level becomes available on the<br>" +
                          "recruiting page, a notification<br>" +
                          "is sent."},
            {name: "Min avail Level", id: "oc-min-lvl", key: warnMinLvlValKey, type: "input", min: 1, max: 10, enabled: showExperimental},

            // TBD: "show hidden" context opt, recruit, see "hide beneath"...
        ];

        missingReqItem = false;
        missingReqItemId = 0;
        missingReqItemName = null;

        setTrackerTime(time) {
            $("#oc-tracker-time").removeClass("blink182");
            $("#oc-tracker-time").text(time);
            if (time == NO_OC_TIME) return;
            if (myCrimeStatus == 'Recruiting') {
                $("#oc-tracker-time").addClass("def-yellow");
            } else {
                $("#oc-tracker-time").removeClass("def-yellow");
            }

            if (blinkingPaused) return;
            if (this.timeMin(time) < 1) this.stopAllAlerts();

            if (this.missingReqItem == true) {
                $("#missing-item").addClass("blinkOcWarnBtn");
                $("#missing-item").css("display", "flex");
            } else if (this.missingReqItem == false) {
                $("#missing-item").removeClass("blinkOcWarnBtn");
                $("#missing-item").css("display", "none");
            }

            if (notifyOcSoon == true && +notifyOcSoonMin > 0) {
                let untilMin = this.timeMin(time);
                if (untilMin && untilMin < +notifyOcSoonMin)
                    this.enableOcSoon();
            }
        }

        getTimeUntilOc() {
            if (!myCrimeStartTime || !this.validateSavedCrime()) {
                this.scheduleOcCheck(5000);
                return NO_OC_TIME;
            }

            let now = new Date();
            let dt = new Date(myCrimeStartTime * 1000);

            let diffSecs = +myCrimeStartTime - now.getTime()/1000;
            let days = Math.floor(diffSecs / secsInDay);
            let remains = (diffSecs - (days * secsInDay));
            let hrs = Math.floor(remains / secsInHr);
            remains = remains - (hrs * secsInHr);
            let mins = Math.floor(remains/60);
            let timeStr = "OC in: " + days + "d " + nn(hrs) + "h " + nn(mins) + "m";

            return timeStr;
        }

        enableNoOcAlert() {
            if (!$("#oc-tracker-time").hasClass("blinkOcWarn") && !blinkingPaused) {
                $("#oc-tracker-time").toggleClass("blinkOcWarn");
                blinkingNoOc = true;
            }
        }

        enableOcSoon() {
            if (!blinkingPaused && !$("#oc-tracker-time").hasClass("blinkOcGreen")) {
                $("#oc-tracker-time").addClass("blinkOcGreen");
            }
        }

        // See if the cached crime has expired/completed.
        // Return false if invalid/expired/not set, true otherwise.
        validateSavedCrime(crimes) {
            if (!myCrimeStartTime || !myCrimeId) return false;

            let now = new Date();
            let crimeTime = new Date(myCrimeStartTime * 1000);

            // If now is after the start time, expired...
            if (now.getTime() > myCrimeStartTime * 1000) {
                myCrimeId = null;
                myCrimeStartTime = 0;
                myCrimeStatus = "";
                this.saveMyCrimeData();
                debug("validateSavedCrime Expired crimeTime");
                return false;
            }

            return true;
        }

        // Give some sort of indication when no OC is selected
        toggleNoOcWarning() {
            if (blinkingPaused) return this.stopAllAlerts();
            $("#oc-tracker-time").toggleClass("blinkOcWarn");
            blinkingNoOc = $("#oc-tracker-time").hasClass("blinkOcWarn");
        }

        toggleOcSoon() {
            if (blinkingPaused) return this.stopAllAlerts();
            $("#oc-tracker-time").toggleClass("blinkOcGreen");
        }

        stopAllAlerts() {
            $("#oc-tracker-time").removeClass("blinkOcWarn");
            $("#oc-tracker-time").removeClass("blinkOcGreen");

            $("#missing-item").removeClass("blinkOcWarnBtn");
            $("#missing-item").css("display", "none");

            blinkingNoOc = false;
        }

        missingReqItemCb(responseText, ID, param) {
            let jsonResp = JSON.parse(responseText);
            if (jsonResp.error) {
                if (jsonResp.error.code == 6) return;
                return handleError(responseText);
            }
            let item = jsonResp.items[ID];
            myOcTracker.missingReqItemName = item.name;
            let key = "missingItemId-" + ID;
            myOcTracker.missingReqItemName = GM_setValue(key, item.name);
            let ttText = "Missing required item!<br>A " +
                myOcTracker.missingReqItemName + " is needed!";
            $("#missing-item").tooltip( "option", "content", ttText );
        }

        handleOcResponse(responseText, ID, param) {
            myOcTracker.ocCallPending = false;
            let jsonObj = JSON.parse(responseText);
            if (jsonObj.error) {
                myOcTracker.scheduleOcCheck(60000);
                return handleError(responseText);
            }

            let myCrime = jsonObj.organizedCrime;
            if (!myCrime) {
                myOcTracker.enableNoOcAlert();
                myOcTracker.setTrackerTime(NO_OC_TIME);
                myOcTracker.scheduleOcCheck(60000);
                return;
            }
            let readyAt = myCrime.ready_at;

            if (myCrime && readyAt) {
                myCrimeId = myCrime.id;
                myCrimeStartTime = readyAt;
                myCrimeStatus = myCrime.status;
                myOcTracker.saveMyCrimeData();
                myOcTracker.stopAllAlerts();
            } else if (!blinkingPaused) {
                myOcTracker.enableNoOcAlert();
                myOcTracker.setTrackerTime(NO_OC_TIME);
                debug("Didn't locate my own OC!");
                myOcTracker.scheduleOcCheck(60000);    // Try again in a minute...
                return;
            }

            // See if there is a required item, and if so, do we have it?
            let slots = myCrime.slots;
            this.missingReqItem = false;
            for (let idx=0; idx<slots.length; idx++) {
                let slot = slots[idx];
                if (slot.user_id == userId) {
                    if (slot.item_requirement != null) {
                        if (slot.item_requirement.is_available == false) {
                            this.missingReqItem = true;
                            this.missingReqItemId = slot.item_requirement.id;
                            let key = "missingItemId-" + this.missingReqItemId;
                            this.missingReqItemName = GM_getValue(key, null);
                            if (!this.missingReqItemName) {
                                xedx_TornTornQuery(this.missingReqItemId, "items",
                                                   myOcTracker.missingReqItemCb);
                            } else {
                                let ttText = "Missing required item!<br>A " +
                                    this.missingReqItemName + " is needed!";
                                $("#missing-item").tooltip( "option", "content", ttText );
                            }
                        }
                    }
                    break;
                }
            }

            if (myCrimeStartTime) {
                let dt = new Date(myCrimeStartTime * 1000);
                myOcTracker.setTrackerTime(this.getTimeUntilOc());
                setInterval(myOcTracker.updateTrackerTime, 31000, this);
            }

            function updateTrackerTime(obj) {
                myOcTracker.setTrackerTime(myOcTracker.getTimeUntilOc());
            }
        }

        // Do not call too often!
        ocCallPending = false;
        lastTimeReq = 0;
        collisions= 0;

        getMyNextOcTime() {
            if (myOcTracker.ocCallPending == true) {
                return;
            }
            myOcTracker.ocCallPending = true;
            xedx_TornUserQueryv2("", "organizedcrime", myOcTrackingCb);
        }

        scheduleOcCheck(time, param) {
            if (myOcTracker.ocCallPending == true) {
                myOcTracker.collisions++;
                debug("Collided with pending request! Time: ", myOcTracker.lastTimeReq,
                      " req time: ", time, " collisions: ", myOcTracker.collisions);
                return;
            }
            myOcTracker.lastTimeReq = time;
            setTimeout(myOcTracker.getMyNextOcTime, time, param);
        }

        startMyOcTracking() {
            if ($("#ocTracker").length) {
                return log("Warning: another instace of the OC Tracker is running!");
            }

            $("#oc2Timer").remove();
            let elem = this.getMyOcTrackerDiv();
            let parentSelector = makeXedxSidebarContentDiv('oc-tracker');

            $(parentSelector).append(elem);
            $(parentSelector).css("padding", "0px");
            let ttText  = "Missing required item!";
            if (myOcTracker.missingReqItemDesc) {
                ttText = "Missing required item!<br>A " +
                                    this.missingReqItemName + " is needed!";
            }
            displayHtmlToolTip($("#missing-item"), ttText, "tooltip5");

            if (scrollLock)
                this.addScrollLock();

            this.installOcTrackerContextMenu();
            this.scheduleOcCheck(250, 'available');
        }

        // Handles input changes on context menu (checkboxes, fields)
        processMiniOpCb(e) {
            log("processMiniOpCb");
            e.stopPropagation();
            let node = $(e.currentTarget);
            let idx = $(node).attr("data-index");
            let opt = myOcTracker.contextMenuItems[idx];
            let sel = "#" + opt.id + " > input";

            log("Saving opt");
            if (opt.type == 'cb') {
                let val = $(sel)[0].checked;
                GM_setValue(opt.key, val);
            } else if (opt.type == 'input') {
                let val = $(sel).val()
                GM_setValue(opt.key, val);
            }

            log("Updating opts");
            updateOptions();

            //if (opt.id == 'oc-opt-hide' || opt.id == 'oc-opt-lvl')
            //    hideShowByLevel();
        }

        showMenu() {
            let offset = $("#ocTracker").offset();
            $("#ocTracker-cm").removeClass("oc-offscreen");
            $("#ocTracker-cm").offset({top: offset.top - 10, left: offset.left + 50});
            $("#ocTracker-cm").animate({opacity: 1}, 100);
        }

        hideMenu() {
            $("#ocTracker-cm").attr("style", "opacity: 0;");
            $("#ocTracker-cm").addClass("oc-offscreen");
        }

        removeOcTracker() {
            debug("removeOcTracker");
            $("#ocTracker").remove();
            $("#ocTracker-cm").remove();

            // TBD - any timed funcs to stop??
        }

        // Save cached crime data
        saveMyCrimeData() {
            GM_setValue("myCrimeId", myCrimeId);
            GM_setValue("myCrimeStartTime", myCrimeStartTime);
            GM_setValue("myCrimeStatus", myCrimeStatus);
        }

        parseOcTime(time) {
            // OC in: 2d 12h 45m
            let parts = time.split(' ');
            if (parts.length < 5) return;
            let d = parseInt(parts[2]);
            let h = parseInt(parts[3]);
            let m = parseInt(parts[4]);

            return {d: d, h: h, m: m};
        }

        timeMin(time) {
            let timeUntil = myOcTracker.parseOcTime(time);
            return timeUntil ? (+timeUntil.d * 24 * 60 + +timeUntil.h * 60 + +timeUntil.m) : 0;
        }

        // Called to enable/disable the sidebar tracker
        onOcTrackerChange() {
            debug("onOcTrackerChange: ", trackMyOc, " saved: ", GM_getValue("trackMyOc", "not found"));
            if (trackMyOc == true) {
                myOcTracker.removeOcTracker();
                myOcTracker.installOcTrackerContextMenu();
            } else {
                myOcTracker.removeOcTracker();
            }
        }

        // Called when context menu list item clicked, like an href or function link
        handleTrackerContextClick(event) {
            let target = $(event.currentTarget);
            let menuId = $(target).attr("id");

            debug("handleTrackerContextClick, target ID: ", menuId, " target: ", $(target));

            let parent = $(target).parent();
            let runFunc = $(parent).find(".xeval");

            if ($(runFunc).length) {
                let fnName = $(runFunc).attr("data-run");
                if (fnName) {
                    doOptionMenuRunFunc(fnName);
                    myOcTracker.hideMenu();
                    return;
                }
            }

            let anchor = $(parent).find("a");
            debug("handleTrackerContextClick: ", $(target), $(target).parent(), $(anchor));
            if ($(anchor).length) {
                let href = $(anchor).attr("href");
                if (href) {
                    window.location.href = href;
                    myOcTracker.hideMenu();
                }
                return;
            }

            if (menuId == "ocTracker") {
                myOcTracker.showMenu();
                return false;
            }

            setTimeout(myOcTracker.hideMenu, 1500);
            return false;

        }

        // Install sidebar OcTracker only options
        installOcTrackerContextMenu() {
            let myMenu =
                `<div id="ocTracker-cm" class="context-menu xopts-border-89 oc-offscreen" style="opacity: 0;"><ul ></ul></div>`;

            $('body').append(myMenu);
            $('#ocTracker').on('contextmenu', myOcTracker.handleTrackerContextClick);
            $("#ocTracker").css("cursor", "pointer");

            for (let idx=0; idx<this.contextMenuItems.length; idx++) {
                let opt = this.contextMenuItems[idx];
                if (opt.enabled == false) continue;

                let sel = '#' + opt.id;
                let optionalClass =
                    (idx == 0) ? "opt-first-li" :
                    (idx == this.contextMenuItems.length - 1) ? "opt-last-li" : "";

                let inputLine;
                switch (opt.type) {
                    case "cb":
                        inputLine = `<input type="checkbox" data-index="${idx}" name="${opt.key}">`;
                        break;
                    case "input":
                        inputLine = `<input type="number" id="oc-opt-lvl" min="1" max="15">`;
                        break;
                    case "href":
                        inputLine = `<a href="${opt.href}"></a>`;
                        break;
                    case "ctrl":
                        inputLine = `<span class="xeval" data-run="${opt.fnName}"></span>`;
                        break;
                    default:
                        continue;
                }

                let ocTrackerLi = `<li id="${opt.id}" class="xmed-li-rad ${optionalClass}">
                                      ${inputLine}
                                      <span>${opt.name}</span>
                                  </li>`;
                $("#ocTracker-cm > ul").append(ocTrackerLi);
            }

            $("#oc-opt-hide").prop('checked', hideLvl);
            $("#oc-opt-lvl").val(hideLvlVal);
            $("#warn-no-oc").prop('checked', this.warnOnNoOc);

            $("#ocTracker-cm > ul > li > span").on('click', myOcTracker.handleTrackerContextClick);
            $("#ocTracker-cm > ul > li > input").on('change', myOcTracker.processMiniOpCb);

            // Close on click outside of menu
            $(document).click(function(event) {
                if (!$(event.target).closest('#ocTracker-cm').length) {
                    myOcTracker.hideMenu();
                }
            });
        }

         // Run a function from context menu/options pane
        doOptionMenuRunFunc(runFunc) {
            switch (runFunc) {
                case "refresh": {  // Refresh OC time ready, from context menu
                    $("#oc-tracker-time").text("Please wait...");
                    $("#oc-tracker-time").addClass("blink182");
                    myCrimeId = 0;
                    myCrimeStartTime = 0;
                    myOcTracker.scheduleOcCheck(2500, 'available');
                    break;
                }
                case "stop-alert": {
                    myOcTracker.stopAllAlerts();
                    setAlertsPaused();
                    break;
                }
                case "track-my-oc":
                    myOcTracker.onOcTrackerChange();
                    break;
                case "toggleScroll":
                    myOcTracker.toggleScrollLock();
                    break;
                default:
                    debug("ERROR: Run func ", runFunc, " not recognized!");
                    break;
            }

        }

        toggleScrollLock() {
            let wrap = $($("#faction-crimes-root > div [class^='wrapper_']")[0]).parent();
            if (!$(wrap).length)
                myOcTracker.addScrollLock();
            else
                $(wrap).toggleClass("xscrollLock");
        }

        slAdded = false;
        addScrollLock(retries=0) {
            let wrap = $($("#faction-crimes-root > div [class^='wrapper_']")[0]).parent();
            if (!$(wrap).length) {
                if (retries++ < 20) return setTimeout(myOcTracker.addScrollLock, 250, retries);
                return log("Couldn't add scroll lock!");
            }

            $(wrap).addClass("xscrollLock");
        }

        getMyOcTrackerDiv() {
            installTrackerStyles();
            return `<div id="ocTracker">
                        <span id="oc-tracker-time">00:00:00</span>
                        <span id="missing-item" class="x-round-btn xmr5" style="display: none;">!</span>
                    </div>`;
        }
    }

    function handlePageLoad() {
        if (!myOcTracker) {
            myOcTracker = new OcTracker();
            myOcTracker.startMyOcTracking();
        }

        if (isOcPage() && scrollLock)
            myOcTracker.addScrollLock();

        myOcTracker.getTimeUntilOc();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    callOnHashChange(hashChangeHandler);
    callOnContentLoaded(handlePageLoad);

    GM_addStyle(`#oc2Timer {display: none;}`);

    var ocTrackerStylesInstalled = false;
    function installTrackerStyles() {
        if (ocTrackerStylesInstalled == true) return;

        addToolTipStyle();
        addButtonStyles();
        loadCommonMarginStyles();

        GM_addStyle(`
            #ocTracker {
                display: flex;
                position: relative;
            }

            #ocTracker .context-menu {
                position: absolute;
            }

            #ocTracker span {
                align-content: center;
                justify-content: center;
                display: flex;
                flex-flow: row wrap;
                padding: 3px;
                font-size: 14px;
                width: 90%;
            }
            .ocTracker-cb {
                display: inline-flex;
                flex-flow: row wrap;
                /*margin-left: 5px;*/
                align-items: center;
                font-size: 10pt;
            }
            #ocTracker-cm ul {
                border-radius: 5px;
            }
            #ocTracker-cm li {
                height: 24px;
                padding: 4px 10px 4px 10px;
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                align-content: center;
                color: var(--tabs-color);

                background: var(--tabs-bg-gradient);
            }
            #ocTracker-cm li:hover {
                background: var(--tabs-active-bg-gradient);
            }

            #ocTracker-cm ul li span:hover {color: limegreen; }

            #ocTracker-cm li:last-child, .opt-last-li  {
                -webkit-border-radius: 0px 0px 5px 5px;
                border-radius: 0px 0px 5px 5px;
            }
            #ocTracker-cm li:first-child, .opt-first-li  {
                -webkit-border-radius: 5px 5px 0px 0px;
                border-radius: 5px 5px 0px 0px;
            }
            #ocTracker-cm input {
                display: inline-flex;
                width: fit-content;
                margin-right: 5px;
                border-right: 1px solid black;
                text-align: center;
            }
            #ocTracker-cm a {
                display: inline-flex;
                width: fit-content;
            }
            #missing-item {
                width: 16px !important;
                margin: 4px;
            }
            .xscrollLock {
               max-height: 90vh;
               overflow-y: auto;
               top: 0px;
               position: sticky;
           }

           .gb { border: 2px solid limegreen; }
           .bb { border: 2px solid red; }

           .def-red {color: var(--default-red-color);}
           .def-yellow {color: var(--default-yellow-color);}

           .blinkOcWarn {
               color: var(--default-red-color);
               animation: blinker 1.8s linear infinite;
           }
           .blinkOcWarnBtn {
               background: var(--default-red-color);
               animation: blinker 1.8s linear infinite;
           }
           .blinkOcGreen {
               color: var(--default-green-color);
               animation: blinker 1.8s linear infinite;
           }

           .blink182 {
               animation: blinker 1.8s linear infinite;
           }

           @keyframes blinker {
               0%, 100% {opacity: 1;}
               50%, 70% {opacity: .3;}
            }

           .tooltip6 {
                position: relative;
                top: 225px !important;
                left: 480px !important;
                transform: translateX(-110%);
                background-color: #000000 !important;
                filter: alpha(opacity=80);
                opacity: 0.80;
                padding: 5px 20px;
                border: 2px solid gray;
                border-radius: 10px;
                width: fit-content;
                margin: 10px;
                text-align: left;
                font-weight: bold !important;
                font-stretch: condensed;
                text-decoration: none;
                color: #FFF;
                font-size: 13px;
                line-height: 1.5;
                z-index: 999;
                }
        `);

        ocTrackerStylesInstalled = true;
    }

})();