// ==UserScript==
// @name         Torn OC Assist
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Sort crimes, show missing members, etc
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    // Constants used, some to load options..hence first.
    const userId = getThisUserId();    // Used to highlight yourself in list
    const keepLastStateKey = "keepLastState";
    const hideLvlKey = "hideLvl";
    const hideLvlValKey = "hideLvlVal";
    const warnMinLvlKey = "warnMinLvl";
    const warnMinLvlValKey = "warnMinLvlVal";
    const lastStateKey = "lastState";
    const stateOpen = "visible";
    const stateClosed = "hidden";
    const sortKey = 'data-sort';

    // ======================== Configurable Options =======================
    //
    // Extra debug logging, for development
    const logFullApiResponses = GM_getValue("logFullApiResponses", false);
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    // Dev/debug...
    var debugNoOcFound = GM_getValue("debugNoOcFound", false);
    GM_setValue("debugNoOcFound", debugNoOcFound);

    // Can edit this, but there's a hidden checkbox for it.
    var keepLastState = GM_getValue(keepLastStateKey, false);
    var hideLvl = GM_getValue(hideLvlKey, false);
    var hideLvlVal = GM_getValue(hideLvlValKey, 5);
    var hideLvlPaused = false;

    var warnMinLvl = GM_getValue(warnMinLvlKey, false);
    var warnMinLvlVal = GM_getValue(warnMinLvlValKey, 5);

    var warnOnNoOc = GM_getValue("warnOnNoOc", true);
    var notifyOcSoon = GM_getValue("notifyOcSoon", false);
    var keepOnTop = GM_getValue("keepOnTop", false);
    var disableToolTips = GM_getValue('disableToolTips', false);

    // Monitor and display when an OC you are in is due
    var trackMyOc = GM_getValue("trackMyOc", true);

    var blinkingPaused = false;    // Set via an option, temp disable blinking...
    var blinkingNoOc = false;      // Set when alerting re: no OC

    // ====================== End Configurable Options ======================

    var lastState = GM_getValue(lastStateKey, stateClosed);

    // Can run the OC watcher, to track when yours is due,
    // independently. Just start it and return if not on fac page.
    //
    // Change of heart: just set to 0 and get every page refresh?
    //
    var myCrimeId; // = GM_getValue("myCrimeId", null);
    var myCrimeStartTime; // = GM_getValue("myCrimeStartTime", 0);
    var myCrimeStatus = ""; // = GM_getValue("myCrimeStatus", "");

    const NO_OC_TIME = "No OC found.";
    const secsInDay = 24 * 60 * 60;
    const secsInHr = 60 * 60;

    const membersTextClosed = "Available Members (click to show)";
    const membersTextOpen = "Available Members (click to hide)";

    // I can turn this on for dev-only stuff, only I will see -
    // and if I forget it won't be enabled without someone
    // doing so on purpose. I sometimes leave in defaults set
    // the wrong way....
    const xedxDevMode = GM_getValue("xedxDevMode", false) && (userId == 2100735);
    const enableReadyAlert = false;          // Not implemented yet...
    var displayCompletedTimeDate = GM_getValue("displayCompletedTimeDate", false);
    var useNewOptsPane = GM_getValue("useNewOptsPane", true); //false) && (xedxDevMode == true);

    const recruitingIdx = 0;
    const planningIdx = 1;
    const completedIdx = 2;

    var scenarios;
    var listRoot;        // root div above scenarios
    var scrollTimer;
    var sortTimer;

    const getBtnSel = function (btnIdx){ return `#faction-crimes [class^='buttonsContainer_'] button:nth-child(${(btnIdx+1)})`;}
    const getRecruitingTab = function () { return $(getBtnSel(recruitingIdx));}
    const getPlanningTab = function () { return $(getBtnSel(planningIdx));}
    const getCompletedTab = function () { return $(getBtnSel(completedIdx));}
    //const isOcPage = function () {return location.hash ? (location.hash.indexOf("tab=crimes") > -1) : false;}
    const hashChangeHandler = function () {handlePageLoad();}
    const btnIndex = function () {return $("#faction-crimes [class^='buttonsContainer_'] > [class*='active_']").index();}
    const pageBtnsList = function () {return $("#faction-crimes [class^='buttonsContainer_'] button");}
    const isSortablePage = function () {return (btnIndex() == recruitingIdx || btnIndex() == planningIdx);}
    const sortPage = function (c=sortByTime) {tagAndSortScenarios(c);}
    const getAvailableCrimes = function () { doFacOcQuery('available'); }
    const getPlannedCrimes = function () { doFacOcQuery('planning'); }
    const getRecruitingCrimes = function () { doFacOcQuery('recruiting'); }
    const onRecruitingPage = function () {return (btnIndex() == recruitingIdx);}
    const onPlanningPage = function () {return (btnIndex() == planningIdx);}
    const onCompletedPage = function () {return (btnIndex() == completedIdx);}
    const onCrimesPage = function () {return (location.hash ? location.hash.indexOf("tab=crimes") > -1 : false);}

    // Sorting criteria
    const sortByTime = 1;
    const sortByLevel = 2;

    const toggleBtn = `<span class="x-toggle-sort"><i class="fas fa-caret-down"></i></span>`;

    // Make sure opts and new ones I add are in storage...just a convenience for editing...
    writeOptions();

    const menuItems = [
        {name: "-- Options --",                                               type: "title", enabled: true,  validOn: "full"},

        {name: "Keep Last State", id: "oc-last-state", key: keepLastStateKey, type: "cb",    enabled: false, validOn: "full"},

        {name: "Hide Levels",     id: "oc-hide",       key: hideLvlKey,       type: "cb",                    validOn: "context"},
        {name: "Min Level",       id: "oc-hide-lvl",   key: hideLvlValKey,    type: "input",                 validOn: "context", min: 1, max: 10},
        {name: "Hide rec. lvls beneath #",
             id: {cb: "oc-hide", input: "oc-hide-lvl"}, key: {cb: hideLvlKey, input: hideLvlValKey},
             type: "combo",                                                                                  validOn: "full",  min: 1, max: 10,
             tooltip: "This will hide crimes<br>on the recruitment page<br>that are less than the<br>specified level. You can show<br>" +
                      "then again temporarily<br>with the 'Show Hidden<br>Recruits option"},
        {name: "Show hidden recruits",     id: "show-hidden",                 type: "ctrl",    enabled: true, validOn: "full",
             fnName: "show-hidden",
             tooltip: "Show recruits hidden due to<br>" +
                      "being less than the level<br>" +
                      "configured above, until next refresh."},
        {name: "Go To Crimes",    id: "oc-goto-crimes",                       type: "href",
             href:"/factions.php?step=your&type=1#/tab=crimes", validOn: "context",
             tooltip: "Opens the OC page"},
        {name: "Refresh",         id: "oc-refresh",                           type: "ctrl",
             fnName: "refresh", validOn: "both",
             tooltip: "Refreshes the table of<br>members not in an OC."},
        {name: "Stop Alerts",     id: "stop-alert",                           type: "ctrl",     enabled: true, validOn: "both",
             fnName: "stop-alert",
             tooltip: "Stop the blinking alerts that<br>" +
                      "indicate you are not in an OC,<br>" +
                      "or that yours is due to start soon."},

        // Test entries...
        {name: "XedX Test Fn",    id: "xedx-oc-test",                         type: "ctrl",     enabled: xedxDevMode, validOn: "both",
             fnName: "xedx-test"},
        {name: "XedX Test href",    id: "xedx-href-test",                     type: "href",
             href:"/factions.php?step=your&type=1#/tab=info",                                   enabled: xedxDevMode, validOn: "full"},

        {name: "OC time on sidebar", id: "track-my-oc",    key: "trackMyOc",   type: "cb",    enabled: true, validOn: "both",
             fnName: "track-my-oc",
             tooltip: "Display a small counter on<br>" +
                      "the sidebar indicating how long<br>" +
                      "until your OC, or a warning if<br>" +
                      "you are not in one (if enabled)."},
        {name: "Disable Tool Tips", id: "disable-tool-tips",key: "disableToolTips", type: "cb", enabled: true, validOn: "full",
             tooltip: "Disables these tooltips.<br>" +
                      "Takes effect after a refresh<br>" +
                      "or reload, and only affects<br>" +
                      "the tooltips on this menu."},
        {name: "Warn if not in an OC", id: "warn-no-oc",    key: "warnOnNoOc",   type: "cb",    enabled: true, validOn: "both",
             tooltip: "Flashes the sidebar display<br>" +
                      "if not in an OC yet."},
        {name: "Flash when OC is near", id: "notify-soon",  key: "notifyOcSoon", type: "cb",    enabled: true, validOn: "both",
             tooltip: "TBD TBD TBD<br>" +
                      "The sidebar display will<br>" +
                      "flash hen you crime is due<br>" +
                      "to start soon."},
        {name: "Your crime on top", id: "keep-on-top", key: "keepOnTop",    type: "cb",    enabled: true, validOn: "full",
             tooltip: "On the Planning page, puts<br>" +
                      "your crime on top, then the<br>" +
                      "remaining ones are sorted."},
        {name: "Notify if lvl > # is avail",
             id: {cb: "oc-min-avail", input: "oc-min-lvl"}, key: {cb: warnMinLvlKey, input: warnMinLvlValKey},
             type: "combo",                 validOn: "full",  min: 1, max: 10,
             tooltip: "TBD TBD TBD<br>" +
                      "If a crime above the specified<br>" +
                      "level becomes available on the<br>" +
                      "recruiting page, a notification<br>" +
                      "is sent."},

        // TBD: "show hidden" context opt, recruit, see "hide beneath"...
    ];

    function writeOptions() {
        GM_setValue(keepLastStateKey, keepLastState);
        GM_setValue(hideLvlKey, hideLvl);
        GM_setValue(hideLvlValKey, hideLvlVal);

        GM_setValue("warnOnNoOc", warnOnNoOc);
        GM_setValue("notifyOcSoon", notifyOcSoon);
        GM_setValue("keepOnTop", keepOnTop);
        GM_setValue('disableToolTips', disableToolTips);

        GM_setValue(warnMinLvlKey, warnMinLvl);
        GM_setValue(warnMinLvlValKey, warnMinLvlVal);
        GM_setValue("trackMyOc", trackMyOc);

        GM_setValue("useNewOptsPane", useNewOptsPane);
    }

    function updateOptions(doWriteOpts=true) {
        keepLastState = GM_getValue(keepLastStateKey, keepLastState);
        hideLvl = GM_getValue(hideLvlKey, hideLvl);
        hideLvlVal = GM_getValue(hideLvlValKey, hideLvlVal);

        warnOnNoOc = GM_getValue("warnOnNoOc", warnOnNoOc);
        notifyOcSoon = GM_getValue("notifyOcSoon", notifyOcSoon);
        keepOnTop = GM_getValue("keepOnTop", keepOnTop);
        disableToolTips = GM_getValue('disableToolTips', disableToolTips);

        warnMinLvl = GM_getValue(warnMinLvlKey, warnMinLvl);
        warnMinLvlVal = GM_getValue(warnMinLvlValKey, warnMinLvlVal);
        trackMyOc = GM_getValue("trackMyOc", trackMyOc);

        // TBD: add new ones here
        $("#oc-last-state").prop('checked', keepLastState);
        $("#oc-hide").prop('checked', hideLvl);
        $("#oc-hide-lvl").val(hideLvlVal);

        $("#warn-no-oc").prop("checked", warnOnNoOc);
        $("#notify-soon").prop("checked", notifyOcSoon);
        $("#keep-on-top").prop("checked", keepOnTop);
        $("#disable-tool-tips").prop("checked", disableToolTips);

        $("#oc-min-avail").prop("checked", warnMinLvl);
        $("#oc-min-lvl").val(warnMinLvlVal);
        $("#track-my-oc").prop("checked", trackMyOc);

        // TBD: add the rest
        if (doWriteOpts) { writeOptions(); }

        // TBD: add here too...
        debug("updateOptions: keepLastState: ", keepLastState, " hideLvl: ", hideLvl, hideLvlVal, "\n",
              " warnOnNoOc: ps", warnOnNoOc, " notifyOcSoon: ", notifyOcSoon, " keepOnTop: ", keepOnTop, "\n",
              " warnMinLvl: ", warnMinLvl, warnMinLvlVal, " trackMyOc: ", trackMyOc);
    }

    // Will reset at page refresh, not permanent cache
    const cacheCompletedCrimes = true;

    if (trackMyOc == true) {
        logScriptStart();
        validateApiKey();
        startMyOcTracking();
        if (!isFactionPage()) {
            addStyles();
            return;
        }
    }

    function logCurrPage() {
        let idx = btnIndex();
        let page = (idx == 0 ? "Recruiting" : idx == 1 ? "Planning" : idx == 2 ? "Completed": "Unknown");
        debug("On index ", idx, " page is '", page, "'", " sortable? ", isSortablePage());
    }

    // ======================= My OC Tracking, see when due ========================

    function isOcPage() {
        return location.hash ? (location.hash.indexOf("tab=crimes") > -1) : false;
    }

    // Save cached crime data
    function saveMyCrimeData() {
        GM_setValue("myCrimeId", myCrimeId);
        GM_setValue("myCrimeStartTime", myCrimeStartTime);
        GM_setValue("myCrimeStatus", myCrimeStatus);
    }

    function setTrackerTime(time) {
        $("#oc-tracker-time").removeClass("blink182");
        $("#oc-tracker-time").text(time);
        if (myCrimeStatus == 'Recruiting') {
            $("#oc-tracker-time").addClass("def-yellow");
        } else {
            $("#oc-tracker-time").removeClass("def-yellow");
        }
    }

    function nn(t) {return t == 0? '00' : t < 10 ? '0' + t : t;}
    function getTimeUntilOc() {
        if (!myCrimeStartTime || !validateSavedCrime()) {
            getMyNextOcTime('available');
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

    function enableNoOcAlert() {
        if (!$("#oc-tracker-time").hasClass("blinkOcWarn") && !blinkingPaused) {
            $("#oc-tracker-time").toggleClass("blinkOcWarn");
            blinkingNoOc = true;
        }
    }

    // See if the cached crime has expired/completed.
    // Return false if invalid/expired/not set, true otherwise.
    function validateSavedCrime(crimes) {
        if (!myCrimeStartTime || !myCrimeId) return false;

        let now = new Date();
        let crimeTime = new Date(myCrimeStartTime * 1000);

        // If now is after the start time, expired...
        if (now.getTime() > myCrimeStartTime * 1000) {
            myCrimeId = null;
            myCrimeStartTime = 0;
            myCrimeStatus = "";
            saveMyCrimeData();
            debug("validateSavedCrime Expired crimeTime");
            return false;
        }

        return true;
    }

    // Give some sort of indication when no OC is selected
    function toggleNoOcWarning() {
        if (blinkingPaused) return stopAllAlerts();
        $("#oc-tracker-time").toggleClass("blinkOcWarn");
        blinkingNoOc = $("#oc-tracker-time").hasClass("blinkOcWarn");
    }
    function toggleOcSoon() {
        if (blinkingPaused) return stopAllAlerts();
        $("#oc-tracker-time").toggleClass("blinkOcGreen");
    }
    function stopAllAlerts() {
        $("#oc-tracker-time").removeClass("blinkOcWarn");
        $("#oc-tracker-time").removeClass("blinkOcGreen");
        blinkingPaused = true;
        blinkingNoOc = false;
    }

    function myOcTrackingCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        if (jsonObj.error) {
            handleError(responseText);
            return setTimeout(getMyNextOcTime, 60000, 'available');    // Try again in a minute...
        }
        let crimes = jsonObj.crimes;
        let myCrime, readyAt;

        debug("myOcTrackingCb: ", jsonObj, param);

        // Check to see if we can use cached crime time....
        if (validateSavedCrime(crimes) == true) {
            debug("Found valid cached start time!");
        } else {
            debug("Searching for my crime...");
            for (let crimeIdx=0; crimes && crimeIdx < crimes.length; crimeIdx++) {
                let crime = crimes[crimeIdx];
                let slots = crime.slots;
                for (let slotIdx=0; slotIdx<slots.length; slotIdx++) {
                    let slot = slots[slotIdx];
                    if (slot.user_id == userId) {
                        if (debugNoOcFound == true) {
                            log("DEBUG: pretend no OC found");
                            continue;
                        }
                        debug("Found match: ", crime);
                        myCrime = crime;
                        readyAt = crime.ready_at;
                        break;
                    }
                }
                if (myCrime) break;
            }

            debug("myCrime: ", myCrime);

            if (myCrime && readyAt) {
                myCrimeId = myCrime.id;
                myCrimeStartTime = readyAt;
                myCrimeStatus = myCrime.status;
                saveMyCrimeData();
            } else if (!blinkingPaused) {
                enableNoOcAlert();
                setTrackerTime(NO_OC_TIME);
                debug("Didn't locate my own OC!");
                setTimeout(getMyNextOcTime, 60000, 'available');    // Try again in a minute...
            }
        }

        if (myCrimeStartTime) {
            let dt = new Date(myCrimeStartTime * 1000);
            setTrackerTime(getTimeUntilOc());
            setInterval(updateTrackerTime, 31000);
        }

        function updateTrackerTime() {
            setTrackerTime(getTimeUntilOc());
        }
    }

    function getMyNextOcTime(category) {
        debug("getMyNextOcTime: ", category);
        let cat = category ? category : "available";
        var options = {cat: cat, offset: "0", param: {source: 'ocTracking', cat: cat}};
        xedx_TornFactionQueryv2("", "crimes", myOcTrackingCb, options);
    }

    function startMyOcTracking() {
        // Add necessary UI components
        debug("Adding UI components for OC tracking");
        if ($("#ocTracker").length) {
            return log("Warning: another instace of the OC Tracker is running!");
        }

        let elem = getMyOcTrackerDiv();
        let parentSelector = makeXedxSidebarContentDiv('oc-tracker');

        $(parentSelector).append(elem);
        $(parentSelector).css("padding", "0px");

        // Don't need the context menu on the fac crimes page,
        // we have the regular options menu. Fix it so same
        // calbacks are used?
        if (!isOcPage())
            installOcTrackerContextMenu();
        else {
            // maybe install tracker, but disable context menu...?
            debug("startMyOcTracking, on OC page, not installing CM...");
        }

        // On fac page - we will be doing this call anyways,
        // and the callback will call the above callback as well.
        // So just return.
        if (isFactionPage()) {
            debug("startMyOcTracking: on fac page, will check later...");
            return;
        }

        getMyNextOcTime('available');
    }

    // ============================== context menu ===============================

    // Run a function from context menu
    function doOptionMenuRunFunc(runFunc) {
        log("doOptionMenuRunFunc: ", runFunc);
        switch (runFunc) {
            case "refresh": {  // Refresh OC time ready, from context menu
                $("#oc-tracker-time").text("Please wait...");
                $("#oc-tracker-time").addClass("blink182");
                myCrimeId = 0;
                myCrimeStartTime = 0;
                setTimeout(getMyNextOcTime, 2500, 'available');
                break;
            }
            case "xedx-test": { // Whatever I feel like testing...
                toggleOcSoon();
                break;
            }
            case "stop-alert": {
                stopAllAlerts();
                break;
            }
            case "show-hidden":
                // TBD
                log("Show hidden crimes TBD... ~482!");
                showHiddenRecruits();
                break;

            case "track-my-oc":
                onOcTrackerChange();
                break;

            default:
                debug("ERROR: Run func ", runFunc, " not recognized!");
                break;
        }

    }

    function showMenu() {
        let offset = $("#ocTracker").offset();
        $("#ocTracker-cm").removeClass("oc-offscreen");
        $("#ocTracker-cm").offset({top: offset.top - 10, left: offset.left + 50});
        $("#ocTracker-cm").animate({opacity: 1}, 100);
    }

    function hideMenu() {
        $("#ocTracker-cm").attr("style", "opacity: 0;");
        $("#ocTracker-cm").addClass("oc-offscreen");
    }

    function removeOcTracker() {
        log("removeOcTracker");
        $("#ocTracker").remove();
        $("#ocTracker-cm").remove();

        // TBD - any timed funcs to stop??
    }

    function onOcTrackerChange() {
        debug("onOcTrackerChange: ", trackMyOc, " saved: ", GM_getValue("trackMyOc", "not found"));
        if (trackMyOc == true) {
            removeOcTracker();
            installOcTrackerContextMenu();
        } else {
            removeOcTracker();
        }
    }

    function handleTrackerContextClick(event) {
        let target = $(event.currentTarget);
        let menuId = $(target).attr("id");

        debug("handleTrackerContextClick, target ID: ", menuId, " target: ", $(target));

        if (onCrimesPage()) {
            return log("On crimes page, suppressing context");
        }

        let parent = $(target).parent();
        let runFunc = $(parent).find(".xeval");

        if ($(runFunc).length) {
            let fnName = $(runFunc).attr("data-run");
            if (fnName) {
                doOptionMenuRunFunc(fnName);
                hideMenu();
                return;
            }
        }

        let anchor = $(parent).find("a");
        debug("handleTrackerContextClick: ", $(target), $(target).parent(), $(anchor));
        if ($(anchor).length) {
            let href = $(anchor).attr("href");
            if (href) {
                window.location.href = href;
                hideMenu();
            }
            return;
        }

        if (menuId == "ocTracker") {
            showMenu();
            return false;
        }

        setTimeout(hideMenu, 1500);
        return false;
    }

    function installOcTrackerContextMenu() {
        debug("installOcTrackerContextMenu");

        let myMenu = `<div id="ocTracker-cm" class="context-menu xopts-border-89 oc-offscreen" style="opacity: 0;">
                          <ul ></ul>
                      </div>`;


        $('body').append(myMenu);
        $('#ocTracker').on('contextmenu', handleTrackerContextClick);
        $("#ocTracker").css("cursor", "pointer");

        for (let idx=0; idx<menuItems.length; idx++) {
            let opt = menuItems[idx];
            if (opt.enabled == false) continue;
            if (opt.validOn != "context" && opt.validOn != "both") continue;

            let sel = '#' + opt.id;
            let optionalClass = (idx == 0) ?
                "opt-first-li" :
            (idx == menuItems.length - 1) ? "opt-last-li" : "";

            let inputLine = (opt.type == "cb") ?
               `<input type="checkbox" data-index="${idx}" name="${opt.key}">` :
               (opt.type == 'input') ?
               `<input type="number"   id="oc-opt-lvl" min="1" max="15">` :
               (opt.type == 'href') ?
                `<a href="${opt.href}"></a>` :
               (opt.type == 'ctrl') ?
                `<span class="xeval" data-run="${opt.fnName}"></span>` :
                null;

            if (!inputLine) {
                debugger;
                continue;
            }

            let ocTrackerLi = `<li id="${opt.id}" class="xmed-li-rad ${optionalClass}">${inputLine}<span>${opt.name}</span></li>`;
            $("#ocTracker-cm > ul").append(ocTrackerLi);

            if (opt.type == "input") $(sel).find("input").css("margin-right", "8px");
        }

        $("#oc-opt-last-pos").prop('checked', keepLastState);
        $("#oc-opt-hide").prop('checked', hideLvl);
        $("#oc-opt-lvl").val(hideLvlVal);

        $("#warn-no-oc").prop('checked', warnOnNoOc);
        $("#notify-soon").prop('checked', notifyOcSoon);
        //$("#keep-on-top").prop('checked', keepOnTop);

        $("#ocTracker-cm > ul > li > span").on('click', handleTrackerContextClick);
        $("#ocTracker-cm > ul > li > input").on('change', processMiniOpCb);

        $(document).click(function(event) {
            if (!$(event.target).closest('#ocTracker-cm').length) {
                hideMenu();
            }
        });
    }

    // ============================ end context stuff ============================

    var ocTrackerStylesInstalled = false;
    function getMyOcTrackerDiv() {
        if (!ocTrackerStylesInstalled) {
            installTrackerStyles();
        }

        let myDiv = `
            <div id="ocTracker">
               <span id="oc-tracker-time">00:00:00</span>
           </div>
        `;

        return myDiv;
    }

    // ======================== Sorting portion of script ===========================

    function setSortCaret(order) {

        let newClass = sortOrders[order] == 'asc' ? "fa-caret-up" : "fa-caret-down";
        let oldClass = sortOrders[order] == 'asc' ? "fa-caret-down" : "fa-caret-up";
        $($("#xocsort").find("i")).addClass(newClass).removeClass(oldClass);
    }

    function handlePageChange() {
        logCurrPage();
        switch (btnIndex()) {
            case recruitingIdx:
                setSortCaret(recruitSortOrder);
                sortPage(sortByLevel);
                $("#oc-opt-wrap").addClass("recruit-tab");
                $("#show-hidden").removeClass("xhide");
                return;
            case planningIdx:
                setSortCaret(planningSortOrder);
                $("#oc-opt-wrap").removeClass("recruit-tab");
                $("#show-hidden").addClass("xhide");
                sortPage(sortByTime);
                return;
            case completedIdx:
                setSortCaret(completedSortOrder);
                $("#oc-opt-wrap").removeClass("recruit-tab");
                $("#show-hidden").addClass("xhide");
                getCompletedCrimes();
                installCompletedPageButton(true);
                return;
        }

        debug("ERROR: Unknown page, idx = ", btnIndex(), " sortable? ", isSortablePage(), " (",
           recruitingIdx, "|", planningIdx, "|", completedIdx);
    }

    // Map sort order to easily toggle...
    const sortOrders = ['asc', 'desc'];
    var recruitSortOrder = 1;
    var planningSortOrder = 0;
    var completedSortOrder = 0;

    function toggleSort(e) {
        let target = $(e.target);
        //$($(target).find("i")).toggleClass("fa-caret-down fa-caret-up");
        $($("#xocsort").find("i")).toggleClass("fa-caret-down fa-caret-up");
        recruitSortOrder = !recruitSortOrder ? 1 : 0;
        planningSortOrder = !planningSortOrder ? 1 : 0;
        completedSortOrder = !completedSortOrder ? 1 : 0;
        sortList();
    }

    function sortList() {
        let scenario1 = $(scenarios)[0];
        let grandparent = $(scenario1).parent().parent();
        let list = $(grandparent).children("[class^='wrapper_']");

        let sortOrder = sortOrders[0];
        if (onRecruitingPage()) sortOrder = sortOrders[recruitSortOrder];
        else if (onPlanningPage()) sortOrder = sortOrders[planningSortOrder];
        else if (onCompletedPage()) sortOrder = sortOrders[completedSortOrder];

        tinysort($(list), {attr: sortKey, order: sortOrder});

        if (keepOnTop == true && onPlanningPage()) {
            let me = $(".xoc-static");
            let parent = $(me).parent();
            let newMe = $(me).detach();
            $(parent).prepend(newMe);
        }
    }

    function pageBtnClicked(e) {
        debug("pageBtnClicked, idx: ", btnIndex(), "|", e);
        if (btnIndex() != completedIdx) {
            $("#xcsvbtn").addClass("vhide");
        }
        if (btnIndex() != recruitingIdx)
            $("#show-hidden").addClass("xhide");
        else
            $("#show-hidden").removeClass("xhide");

        logCurrPage();
        handlePageChange();
    }

    function addPageBtnHandlers() {
        let list = pageBtnsList();
        $(pageBtnsList).on('click', pageBtnClicked);
    }

    // Compare two arrays: see what is in array1 but not in array2
    function arrayDiff(array1, array2) {
        const result = array1.filter(obj1 =>
          !array2.some(obj2 => obj1 === obj2)
        );
        return result;
    }

    // Make yourself easier to spot on the page.
    function highlightSelf() {
        if (debugNoOcFound == true) {
            log("DEBUG: pretend no OC found");
            return;
        }
        let me = $(`a[class^="slotMenu"][href*="XID=${userId}"]`);
        let wrapper = $(me).closest("[class^='wrapper_']");
        $(wrapper).addClass("xoc-myself");
        $(wrapper).parent().parent().addClass("xoc-static");
    }

    function secsFromeTimeStr(text) {
        let tmp = text.slice(0, 11);
        let parts = tmp.split(":");
        let totalSecs = (+parts[0] * 24 * 60 * 60) + (+parts[1] * 60 * 60) + (+parts[2] * 60) + (+parts[3]);

        return totalSecs;
    }

    function hideShowByLevel() {
        let lvlList = $(".sort-lvl");
        if (hideLvl == false || hideLvlPaused == true) {
            $(lvlList).css("display", "");  //"block");
            tagAndSortScenarios(sortByLevel);
            return;
        }

        if (!hideLvlVal || hideLvlVal < 1) return log("hideShowByLevel Error: no level set to hide...");
        let countHidden = 0;
        for (let idx=0; idx<$(lvlList).length; idx++) {
            let panel = $(lvlList)[idx];
            let lvl = $(panel).attr("data-sort");
            if (lvl < hideLvlVal) {
                if (hideLvlPaused != true)
                    $(panel).css("display", "none");
                $(panel).addClass("xhidden");
                countHidden++;
            } else
                $(panel).css("display", "");
            tagAndSortScenarios(sortByLevel);
        }

        let tab = getRecruitingTab();
        let text = "Recruiting";
        if (countHidden > 0) text = text + " (" + countHidden + " hidden)";
        $(tab).text(text);
    }

    // Do the sorting. On Planning page, by time. Recruiting page, by level.
    // sortCriteria over-rides....OOPS I don't think it does!!!!
    // Set by page in sort() fn!!!!
    //
    function tagAndSortScenarios(sortCriteria) {
        if (!isSortablePage()) {
            debug("This page isn't sortable (by definition)");
            logCurrPage();
            return;
        }

        if (!sortCriteria) {
            sortCriteria = sortByTime;
            if (onRecruitingPage()) sortCriteria = sortByLevel;
            //else if (onPlanningPage()) sortCriteria = sortByTime;
            //else if (onCompletedPage()) sortCriteria = sortByTime;
        }

        scenarios = $("[class^='scenario_']");
        let listRoot = $($(scenarios)[0]).parent().parent();

        let countHidden = 0;
        for (let idx=0; idx<$(scenarios).length; idx++) {
            let scenario = $(scenarios)[idx];
            let sortVal = -1; // -1 means invalid
            switch (sortCriteria) {
                case sortByTime: {
                    let elem = $(scenario).find("[class^='wrapper_'] > div > p")[0];
                    let text = $(elem).text();
                    if (text) sortVal = secsFromeTimeStr(text);
                    break;
                }
                case sortByLevel: {
                    let elem = $(scenario).find("[class^='wrapper_'] > div > div > div > [class^='textLevel_'] [class^='levelValue_']");
                    if ($(elem).length) {
                        sortVal = parseInt($(elem).text());
                        $(scenario).parent().addClass("sort-lvl");

                        if (hideLvl == true && hideLvlVal > 0) {
                            if (hideLvlVal > sortVal) {
                                countHidden++;
                                $(scenario).parent().css("display", "none");
                                $(scenario).parent().addClass("xhidden");
                            }
                        }
                        else
                            $(scenario).parent().css("display", "");
                    }
                    break;
                }
                default: {
                    console.error("ERROR: invalid sort criteria!");
                    debugger;
                    return;
                }
            }
            $(scenario).parent().attr(sortKey, sortVal);
        }

        if (sortCriteria == sortByLevel) {
            let tab = getRecruitingTab();
            let text = "Recruiting";
            if (countHidden > 0) text = text + " (" + countHidden + " hidden)";
            $(tab).text(text);
        }

        if (!$(".xoc-myself").length) highlightSelf();
        sortList();
    }

    // ======= Experimental - 'show hidden' option
    /*
    function showHiddenRecruits() {
        log("showHiddenRecruits");
        let tab = getRecruitingTab();
        let lvlList = $(".sort-lvl");
        $(lvlList).css("display", "");
        $(tab).text("Recruiting");
        return false;
    }
    */

    function showHiddenRecruits() {
        debug("showHiddenRecruits: ", $(".xhidden"));
        if (hideLvlPaused == false) {
            debug("Showing...");
            $(".xhidden").css('display', '');
            hideLvlPaused = false;
            $("#show-hidden").text("Hide hidden recruits");
        } else {
            debug("Hiding...");
            $(".xhidden").css('display', 'none');
            hideLvlPaused = true;
            $("#show-hidden").text("Show hidden recruits");
        }
        hideShowByLevel();
    }

    function addRecruitTabHandler() {
        // TBD ...
        return;

        let tab = getRecruitingTab();
        $(tab).on('contextmenu', showHiddenRecruits);

        displayHtmlToolTip($(tab), "Right click to show<br>hidden crimes. Refresh<br>to hide again.", "tooltip4");
    }

    // ==============================================

    function initialScenarioLoad(retries=0) {
        let rootSelector = "#factions";
        if ($("#faction-crimes-root").length)
            rootSelector = "#faction-crimes-root";
        else if ($("#faction-crimes").length)
            rootSelector = "#faction-crimes-root";

        callWhenElementExistsEx(rootSelector, "[class^='scenario_']:nth-child(1)", localLoadCb);

        function localLoadCb(node) {
            scenarios = $("[class^='scenario_']");
            if ($(scenarios).length == 0) {
                console.error("ERROR: Scenarios not found!");
                debugger;
                //if (retries++ < 20) return setTimeout(initialScenarioLoad, 250, retries);
                //return debug("Didn't find any scenarios!");
            }

            tagAndSortScenarios(onRecruitingPage() ? sortByLevel : sortByTime);

            addRecruitTabHandler();
        }
    }

    // Build a CSV to download, as well as an HTML table to display
    const crimesTable = "<div><table id='comp-crimes'><tbody></tbody></table></div>";
    const filter = function(t) {let tmp = t.toString().replace(/(\r\n|\n|\r)/gm, "");return tmp.trim();}

    function writeCompletedCrimesAsCsv(e) {
        if (e) e.preventDefault();
        if (!completedCrimesArray) return false;

        // Find max # "slots" before making header
        let numSlots = 0;
        completedCrimesArray.forEach(function (crime, index) {
            let tmp = crime.slots.length;
            if (tmp > numSlots) numSlots = tmp;
        });

        let csvHdr = "CrimeID, Name, Difficulty, Status, CreatedAt, InitiatedAt, ReadyAt, ExpiredAt, " +
                  "Money, Items, Respect";
        let csvHdrHtml = csvHdr;
        for (let idx=0; idx<numSlots; idx++) {
            csvHdr += ", Slot" + (idx+1) + ", Position, Success ";
            csvHdrHtml += ", Slot" + (idx+1);
        }

        let fullCsvText = csvHdr + "\r\n";

        let theTable = $(crimesTable);
        crimesAddHdr(theTable, csvHdrHtml);

        completedCrimesArray.forEach(function (crime, index) {
            let rewards = crime.rewards;

            let textLine =
                `${crime.id},'${filter(crime.name)}',${filter(crime.difficulty)},${filter(crime.status.trim())},` +
                `${filter(toCsvDateStr(crime.created_at * 1000))},${filter(toCsvDateStr(crime.initiated_at * 1000))},` +
                `${filter(toCsvDateStr(crime.ready_at * 1000))},${filter(toCsvDateStr(crime.expired_at * 1000))},` +
                `${filter(rewards.money)},${filter(rewards.items.length)},${filter(rewards.respect)}`;

            let slots = crime.slots;
            slots.forEach(function (slot, index) {
                let name = facMembersJson[slot.user_id];
                let slotTxt = `,  ${name} [${slot.user_id}], ${filter(slot.position)}, ${slot.success_chance}%`;
                textLine += slotTxt;
            });

            crimesAddRow(theTable, textLine);
            fullCsvText += (textLine + "\r\n");
        });

        // Display/download
        var newWin = open("", "_blank",
                  "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=760,height=450");

        const style = newWin.document.createElement("style");
        style.textContent = `
            #comp-crimes {
                border-collapse: collapse;
                tr:nth-child(even) {background-color: #f2f2f2;}
            }
            #comp-crimes th {
                padding: 2px 15px 2px 15px;
                text-align: center;
                border: 2px solid black;
                background-color: #04AA6D;
                color: white;
            }
            #comp-crimes td {
                padding: 2px 15px 2px 15px;
                text-align: left;
                border: 1px solid black;
            }
        `;

        newWin.document.head.appendChild(style);
        newWin.document.body.innerHTML = $(theTable).html();

        downloadCsvData(fullCsvText, newWin);
        newWin.focus();

        return false;

        // =============================== local functions ======================
        function closeMiniWin(win) {
            win.close()
        }

        function toCsvDateStr(date) {
            const mediumTime = new Intl.DateTimeFormat("en-GB", {
              timeStyle: "medium",
              hourCycle: "h24",
            });
            const shortDate = new Intl.DateTimeFormat("en-GB", {
              dateStyle: "short",
            });
            const formattedDate = mediumTime.format(date) + "-" + shortDate.format(date);
            return formattedDate;
        }

        function getFilename() {
            let now = new Date();
            const formattedDate = toCsvDateStr(now);

            let filename = "CompletedCrimes_" + formattedDate + ".csv";
            filename.replaceAll(' ', '%20');

            debug("formattedDate: ", formattedDate, " filename: ", filename);
            return filename;
        }

        function downloadCsvData(data, theWin) {
            let blobx = new Blob([data], { type: 'text/plain' }); // ! Blob
            let elemx = theWin.document.createElement('a');
            elemx.href = theWin.URL.createObjectURL(blobx); // ! createObjectURL
            let filename = getFilename();
            elemx.download = filename;
            elemx.style.display = 'none';
            document.body.appendChild(elemx);
            elemx.click();
            document.body.removeChild(elemx);
        }

        function crimesAddRow(table, data) {
            let cells = data.split(',');
            let row = '<tr>';
            cells.forEach(function (cellText, idx) {
                row += `<td>${cellText}</td>`;
            });
            row += "</tr>";
            let body = $(table).find("tbody");
            $(table).find("tbody").append(row);
        }

        function crimesAddHdr(table, data) {
            let cells = data.split(',');
            let row = '<tr>';
            cells.forEach(function (cellText, idx) {
                if (cellText.indexOf("Slot") > -1)
                    row += `<th colspan="3">${cellText}</th>`;
                else
                    row += `<th>${cellText}</th>`;
            });
            row += "</tr>";
            let body = $(table).find("tbody");
            $(table).find("tbody").append(row);
        }
    }

    // =================================

    function handlePageLoad(node) {

        debug("handlePageLoad");
        if (!isOcPage()) {
            //if (trackMyOc == true) { getTimeUntilOc(); }
            return log("Not on crimes page, going home");
        }

        let root = $("#faction-crimes");
        if ($(root).length == 0) {
            debug("Root not found, started observer...");

            callWhenElementExistsEx("document", "#faction-crimes", handlePageLoad);
            return;
        }

        $(window).on('scroll', function() {
            clearTimeout(sortTimer);
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
                sortTimer = setTimeout(onScrollTimer, 250);
            }, 250);
        });

        if (!$("#x-no-oc-members").length) {
            buildMissingMembersUI('load');
        }

        addPageBtnHandlers();
        installCompletedPageButton();
        logCurrPage();

        if (trackMyOc == true) { getTimeUntilOc(); }

        setTimeout(initialScenarioLoad, 500);

        function onScrollTimer() {
            switch (btnIndex()) {
                case recruitingIdx:
                    tagAndSortScenarios(sortByLevel);
                    break;
                case planningIdx:
                    tagAndSortScenarios(sortByTime);
                    break;
                case completedIdx:
                    getCompletedCrimes();
                    break;
                default:
                    break;
            }
        }
    }

    // ============================ New options menu ============================

    function handleOptsMenuCb(e) {
        let target = $(e.currentTarget);
        let varName = $(this).attr('name');
        let fnName = $(this).attr("data-run");
        let checked = $(this)[0].checked;
        debug("handleOptsMenuCb, varName: ", varName, " checked: ", checked, "fnNme: '", fnName, "'");

        GM_setValue(varName, checked);

        updateOptions();

        // Check for optional function...
        if (fnName) doOptionMenuRunFunc(fnName);

        return false;
    }

    function handleCtrlFuncs(e) {
        let target = $(e.currentTarget);
        let node = $(target).find(".oc-type-ctrl");
        if ($(node).length) {
            let fnName = $(node).attr("data-run");
            if (fnName) doOptionMenuRunFunc(fnName);
        }
    }

    function handleOptHrefClick(e) {
        let target = $(e.currentTarget);
        let href = $(target).attr("href");
        if (href) window.location.href = href;
    }

    function handleOptInput(e) {
        let target = $(e.currentTarget);
        let key = $(target).attr("name");
        let value = $(target).val();
    }

    function installOptionsPane() {
        if (useNewOptsPane != true) return;

        let addSelectActive = true;
        let countLi = 0;
        for (let idx=0; idx<menuItems.length; idx++) {
            let entry = menuItems[idx];
            if (entry.enabled == false) continue;
            if (entry.validOn != "both" && entry.validOn != "full") {
                continue;
            }

            let xttCl = "xtt-" + countLi;
            let content;
            switch (entry.type) {
                case "title": {
                    content = `<span id="pane-test" class="oc-type-title">${entry.name}</span>`;
                    break;
                }
                case "href": {
                    content = `<span class="oc-type-href ${xttCl}" href="${entry.href}">${entry.name}</span>`;
                    break;
                }
                case "cb": {
                    content = `<span class="cb-wrap"><input id="${entry.id}" class="oc-type-cb ${xttCl}" data-run="${entry.fnName}"
                                     type="checkbox" data-index="${idx}" name="${entry.key}">
                               <span class="oc-cb-text ${xttCl}">${entry.name}</span></span>`;
                    break;
                }
                case "input": {
                    content = `<input class="oc-type-input ${xttCl}" data-run="${entry.fnName}"
                                      type="number" id="${entry.id}" min="${entry.min}" max="${entry.min}" name="${entry.key}">`
                    break;
                }
                case "ctrl": {
                    content = `<span class="ctrl-wrap ${xttCl}"><span class="oc-type-ctrl" data-run="${entry.fnName}">${entry.name}</span></span>`;
                    break;
                }
                case "combo": {
                    let parts = entry.name.split("#");
                    content = `<span class="oc-type-combo" data-run="${entry.fnName}">
                                   <input id="${entry.id.cb}" type="checkbox" class="oc-type-cb ${xttCl}" name="${entry.key.cb}">
                                   <span class="oc-input-text">${parts[0]}</span>
                                   <input id="${entry.id.input}" type="number" class="oc-type-input" min="0" name="${entry.key.input}">
                                   <span class="oc-input-text xml10">${parts[1]}</span>
                               </span>
                    `;
                    break;
                }
                default: {
                    log("Internal error: unknown enty type '", entry.type, "'");
                    debugger;
                    continue;
                }
            }

            let newNode = $(`
                    <li class="title-black " data-title="${entry.name}">
                        <div class="title-wrap"><div class="opt-content-wrap">
                            ${content}
                        </div></div>
                    </li>
                `);

            let ttNode;
            if (!disableToolTips && entry.tooltip) {
                ttNode = $(newNode).find(`.${xttCl}`);
                displayHtmlToolTip($(ttNode), entry.tooltip, "tooltip6");
                $(ttNode).css("z-index", 125);
            }

            $("#x-select > ul").append(newNode);
            countLi++;
        }

        // Add styles
        let size = (countLi * 35) > 175 ? 175 : (countLi * 35);
        let menuSize = size + "px";
        addOptsMenuStyles(menuSize);

        // Add handlers and current settings
        $("#oc-last-state").prop('checked', keepLastState);
        $("#oc-hide").prop('checked', hideLvl);
        $("#oc-hide-lvl").val(hideLvlVal);
        $("#oc-min-avail").prop('checked', warnMinLvl);
        $("#oc-min-lvl").val(warnMinLvlVal);

        $("#warn-no-oc").prop('checked', warnOnNoOc);
        $("#notify-soon").prop('checked', notifyOcSoon);
        $("#keep-on-top").prop('checked', keepOnTop);
        $("#disable-tool-tips").prop('checked', disableToolTips);

        $("#track-my-oc").prop('checked', trackMyOc);

        $(".ctrl-wrap").parent().on('click', handleCtrlFuncs);
        $(".oc-type-href").on('click', handleOptHrefClick);
        $(".oc-type-input").on('change', handleOptInput);
        $(".oc-type-cb").on('change', handleOptsMenuCb);

        if (!onRecruitingPage())
            $("#show-hidden").addClass("xhide");

        function addOptsMenuStyles(scrollHeight) {
            if (!scrollHeight) scrollHeight = "175px";

            GM_addStyle(`.tooltip6 {
                position: relative;
                top: 225px !important;
                left: 728px !important;
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
                }`);

            GM_addStyle(`
                .x-rt-btn {
                    display: flex;
                    justify-content: center;
                    width: 30px;
                    aspect-ratio: 1 / 1;
                    border-radius: 50%;
                    cursor: pointer;
                    background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
                }
                .x-round-btn {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    align-content: center;
                    cursor: pointer;
                    background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
                    width: 20px;
                    aspect-ratio: 1 / 1;
                    border-radius: 50%;
                }
                .opt-content-wrap {
                    display: flex;
                    flex-flow: row wrap;
                }
                .oc-type-input {
                    margin: 7px 0px 8px 10px;
                    height: 16px;
                    width: 34px;
                    align-content: center;
                    display: inline-flex;
                    flex-flow: row wrap;
                    padding-left: 5px;
                 }
                .oc-type-title {
                    justify-content: center;
                    display: inline-flex;
                    width: 100%;
                }
                .title-wrap {width: 100%;}
                .cb-wrap {
                    display: flex;
                    flex-flow: row wrap;
                    justify-content: left;
                }
                .oc-type-cb {
                    display: inline-flex;
                    flex-flow: row wrap;
                    margin-right: 8px;
                    align-items: center;
                    height: 30px;
                }
                .ctrl-wrap, .oc-type-href {
                    display: flex;
                    flex-flow: row wrap;
                    /*justify-content: center;*/
                    padding-left: 22px;
                    width: 100%;
                }
                .oc-type-ctrl { }
                .oc-type-combo {
                    display: flex;
                    flex-flow: row wrap;
                 }

                .xoc-navbar {
                    overflow: hidden;
                    background-color: transparent;
                    position: absolute;
                    width: 784px;
                }
                #x-select {
                    height: 34px;
                    max-height:34px;
                    border-radius: 10px;
                    width:228px;
                    background: transparent;
                    float: right;
                    margin-right: 40px;
                }
                #x-select:hover:not(.dark-mode) {
                    border: 3px solid darkgray;
                }
                #x-select:hover {
                    z-index: 99;
                    max-height: ${scrollHeight};
                    height: 8000px;
                    overflow-y: scroll;
                    position: sticky;
                    border: 3px solid;
                    cursor: grab;
                }
                #x-select:hover ul {
                    min-height: ${scrollHeight};
                    opacity: 1;
                }
                #x-select ul {
                    height: 28px;
                    max-height: 28px;
                    overflow-y: scroll;
                    opacity: 0;
                    transition: 0.5s;
                }

                #x-select ul li {
                    height: 32px;
                    border-top: 1px solid black;
                    padding: 0px 10px 0px 10px;
                    background: linear-gradient(180deg, #999999 0%, #333333 100%);
                    justify-content: center;
                    display: flex;
                }
                #x-select ul li:first-child {
                    background: var(--title-black-gradient);
                }
                #x-select:hover  li {
                    height: 34px;
                    z-index: 9;
                }
                #x-select  li:hover {
                    filter: brightness(1.2);
                    color: limegreen;
                }

                #x-select:hover ul li:first-child {
                    position: sticky;
                    padding-left: 0px;
                    z-index: 10;
                    display: flex;
                    flex-flow: row wrap;
                    justify-content: center;
                    filter: none;
                }

            `);
        }

        if (addSelectActive == true) {
            GM_addStyle(`
                 #x-select  li:active {
                     background-image: linear-gradient(180deg, #999999 0%, #333333 100%);
                }

                #x-select  li:after {
                      position: absolute;
                      content: '';
                      top: 0;
                      left: 0;
                      width: 100%;
                      height: 100%;
                      border-radius: 0.3em;
                      background-image: linear-gradient(0deg, #999999 0%, #333333 100%);
                      transition: opacity 0.5s ease-out;
                      z-index: 2;
                      opacity: 0;
                    }

                #x-select  li:active:after {
                  opacity: 1;
                }
           `);
        }

    }

    //============================== API calls ===================================
    //
    var missingMembers = [];
    var facMembersJson = {};
    var plannedCrimeMembers = [];
    var facMembersArray = [];
    var missingMembersReady = false;

    var completedCrimesSynced = false;
    var completedScenarios;
    var completedScenariosLastLen = 0;
    var completedCrimesArray;          // Array of completed crimes, will only get once per page visit

    var facMembersDone = false;
    var crimeMembersDone = false;

    function getCompletedCrimes() {
        if (cacheCompletedCrimes == true && completedCrimesArray) {
            debug("using cached version..."); //, completedCrimesArray);
            completedCrimesCb(completedCrimesArray);
        } else {
            doFacOcQuery('completed');
        }
    }

    // 'crimes' is parsed array of JSON crime objects
    function completedCrimesCb(crimes) {
        completedCrimesArray = crimes;
        debug("Completed crimes CB: ", crimes ? crimes.length : 0);

        if (!crimes) {
            console.error("No crimes array!");
            debugger;
            return;
        }

        if (logFullApiResponses == true) {
            crimes.forEach(function (crime, index) {
                logCompletedCrime(crime);
            });
        } else {
            //debug("Not logging details, 'logFullApiResponses' is off.");
        }

        if (btnIndex() == completedIdx) {
            syncCompletedCrimeData();
        }

        // Local functions..
        function syncCompletedCrimeData(retries=0) {
            completedScenarios = $("[class^='scenario_']");
            debug("syncCompletedCrimeData, count: ",
                  $(completedScenarios).length,
                  " retries: ", retries);

            // Scroll will call us anyways, don't retry too much.
            if (!$(completedScenarios).length) {
                if (retries++ < 10) return setTimeout(syncCompletedCrimeData, 250, retries);
                return debug("Too many sync retries");
            }

            if (displayCompletedTimeDate == true) {
                for (let idx=0; idx < $(completedScenarios).length; idx++) {
                    let scenario = $(completedScenarios)[idx];
                    let desc = getCompCrimeDesc(idx);
                    let rewardDiv = $(scenario).find("[class^='rewardContainer_'] [class^='reward_'] ");
                    let prevDiv = $(rewardDiv).find(".xsort");
                    if ($(prevDiv).length) continue;

                    let item = $(rewardDiv).find("[class^='rewardItem_']")[0];
                    let className = "";
                    let classListRaw = $(item).attr('class');
                    if (!classListRaw) {
                        debug("Error: missing class list! ", $(item));
                        debugger;
                    }
                    let classList = classListRaw ? classListRaw.split(/\s+/) : null;
                    if (classList) className = classList[0];
                    let newDiv = `<div class="${className} xsort">${desc}</div>`;
                    $(rewardDiv).append(newDiv);
                }
            }
        }

        // Format time/date however we want
        function tm_str(tm) {
            let dt = new Date(tm*1000);
            const mediumTime = new Intl.DateTimeFormat("en-GB", {
              timeStyle: "medium",
              hourCycle: "h24",
            });
            const shortDate = new Intl.DateTimeFormat("en-GB", {
              dateStyle: "short",
            });
            const formattedDate = mediumTime.format(dt) + " - " + shortDate.format(dt);
            return formattedDate;
        }

        // Just for logging to dev console
        function logCompletedCrime(crime) {
            log("Completed crime, id: ", crime.id, " status: ", crime.status,
                " created: ", tm_str(crime.created_at), " initiated: ", tm_str(crime.initiated_at),
                " ready at: ", tm_str(crime.ready_at), " expired_at: ", tm_str(crime.expired_at));
        }

        // Build the span to display in a div on completed crime panel
        function getCompCrimeDesc(idx) {
            let crime = completedCrimesArray[idx];
            let payout = asCurrency(crime.rewards.money);
            let ready = tm_str(crime.ready_at);
            let span = `<span class="oc-comp-span1">Ready:</span><span class="oc-comp-span2">${ready}</span>`;
            return span;
        }
    }

    function plannedCrimesCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        let crimes = jsonObj.crimes;

        if (jsonObj.error) {
            console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
            return;
        }

        if (param == 'completed') {
            return completedCrimesCb(crimes);
        }

        if (trackMyOc == true && param == "planning") {
            myOcTrackingCb(responseText, ID, param);
        }

        crimes.forEach(function (crime, index) {
            crime.slots.forEach(function (slot, index) {
                if (slot.user_id) plannedCrimeMembers.push(slot.user_id);
            });
        });

        debug("Members in crimes: ", plannedCrimeMembers.length);

        if (param == "planning") {
            getRecruitingCrimes();
        } else {
            crimeMembersDone = true;
            if (facMembersDone == true) {
                missingMembers = arrayDiff(facMembersArray, plannedCrimeMembers);
                missingMembersReady = true;
                buildMissingMembersUI('plannedcb');
            }
        }
    }

    function doFacOcQuery(category) {
        var options = {"cat": category, "offset": "0", "param": category};
        xedx_TornFactionQueryv2("", "crimes", plannedCrimesCb, options);
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
                if (state.toLowerCase() != "fallen" && member.position != "Recruit") {
                    facMembersArray.push(member.id);
                    facMembersJson[member.id] = member.name;
                }
            }
        });

        facMembersDone = true;
        if (crimeMembersDone == true) {
            missingMembers = arrayDiff(facMembersArray, plannedCrimeMembers);
            missingMembersReady = true;
            buildMissingMembersUI('faccb');
        }
    }

    function getFacMembers() {
        xedx_TornFactionQueryv2("", "members", facMemberCb);
    }

    // ============= experiment, refresh and warning CSS ====

    function finishRefresh() {
        $("#x-oc-tbl-wrap").remove();
        getFacMembers();
    }

    var int = 0;
    function removeInt() {clearInterval(int); int = null;}

    function doBlink() { // can just add animate class....
        $("#x-no-oc-table").toggleClass("gb bb");
        setTimeout(removeInt, 500);
    }

    function refreshMissingMembers() {
        int = setInterval(doBlink, 500);
        $("#x-no-oc-table").addClass("gb");

        facMembersArray.length = 0;
        plannedCrimeMembers.length = 0;

        missingMembersReady = false;
        crimeMembersDone = false;
        facMembersDone = false;

        getAvailableCrimes();
        $("#x-oc-tbl-wrap").animate({opacity: 0}, 2500);
        setTimeout(finishRefresh, 3000);
        return false;
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    if (trackMyOc != true) logScriptStart();
    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    if (trackMyOc != true) validateApiKey();

    if (xedxDevMode) log("Dev Mode enabled");
    if (debugLoggingEnabled) log("Debug Logging enabled");

    versionCheck();
    addStyles();

    // Kick off calls to get fac members in an OC as well
    // as all our current members, diff is those not in an OC.
    debug("Making API calls");
    getFacMembers();
    getAvailableCrimes();
    getCompletedCrimes();

    callOnHashChange(hashChangeHandler);

    if (!isOcPage()) {
        if (trackMyOc == true) {
            getTimeUntilOc();
        }
        return log("Not on crimes page, going home");
    }

    callOnContentComplete(handlePageLoad);

    // ========================= UI stuff ===============================

    function installCompletedPageButton(visible=false, retries=0) {
        const csvBtn = `<span id="xcsvbtn" class="csv-btn">CSV</span>`;

        if ($("#xcsvbtn").length == 0) {
            // Should just start a mutation observer...
            // Added callWhenElementExistsEx() for just that purpose
            let cBtn = getCompletedTab();
            if (!$(cBtn).length) {
                if (retries++ < 20) return setTimeout(installCompletedPageButton, 200, visible, retries);
                return log("ERROR: didn't find the Completed button!");
            }
            $(cBtn).append(csvBtn);
            $("#xcsvbtn").on('click', writeCompletedCrimesAsCsv);
            displayHtmlToolTip($("#xcsvbtn"),
                           "Click here to view and save data<br>" +
                           "in CSV format, to import into any<br>" +
                           "spreadsheet program later.", "tooltip4");
        }

        if (visible == true)
            $("#xcsvbtn").removeClass("vhide");
        else
            $("#xcsvbtn").addClass("vhide");
    }

    // Helper to save (in order to restore at start) state
    function writeCurrState(state) {
        if (state) {
            GM_setValue(lastStateKey, state);
            return;
        }
        if ($("#x-oc-tbl-wrap").length > 0)
            GM_setValue(lastStateKey, stateOpen);
        else
            GM_setValue(lastStateKey, stateClosed);
    }

    // If opening, the tabl needs to be installed...if it is not installed
    // right away, it will be later - the install will return 'pended',
    // this will be recalled ith the first param null, the second to
    // 'install'. Should instead make that call a promise....
    var animatePending = false;
    function doAnimateTable(e, from) {
        animatePending = true;
        if ($("#x-oc-tbl-wrap").length && from != 'install') {
            $("#x-oc-tbl-wrap").animate({height: "0px"}, 500);
            $("#x-oc-tbl-wrap").animate({opacity: 0}, 200, function () {
                $("#x-oc-tbl-wrap").remove();
                $("#x-oc-click").text(membersTextClosed);
                writeCurrState(stateClosed);
                animatePending = false;
            });
        } else {
            if ($("#x-oc-tbl-wrap").length == 0 || from != 'install') {
                if (installTableWrap("animate") == 'pended') return;
            }

            $("#x-oc-tbl-wrap").animate({opacity: 1}, 200, function () {
                $("#x-oc-click").text(membersTextOpen);
                writeCurrState(stateOpen);
                animatePending = false;
            });
        }
    }

    // Should make this a promise...
    var retryingTableInstall = false;
    function installTableWrap(from, retries=0) {
        if (retries == 0 && retryingTableInstall == true) {
            return;
        }

        if (!crimeMembersDone || !facMembersDone || !missingMembers.length) {
            if (retries++ < 20) {
                retryingTableInstall = true;
                setTimeout(installTableWrap, 250, "install", retries);
                return 'pended';
            }
            // fall through, even if empty ???
        }

        let tblWrap = `
            <div id='x-oc-tbl-wrap' class="x-oc-wrap cont-gray bottom-round" style="opacity: 0.2;">
                  <table id="x-no-oc-table" style="width: 782px;">
                      <tbody>

                      </tbody>
                  </table>
             </div>
        `;

        $("#x-oc-can-click").after(tblWrap);

        let done = false;
        let tr = "<tr class='xoctr'>";
        for (let idx=0; idx < missingMembers.length || done == true;) {
            for (let j=idx; j < idx+5; j++) {
                let id = missingMembers[j];
                let name = "";
                if (!id) {
                    done = true;
                    tr += "<td><span></span></td>";
                } else {
                    let addedStyle = (id == userId) ? `style='color: limegreen;'` : ``;
                    name = facMembersJson[id];
                    tr += "<td data-id='" + id + "' class='xoctd'><span " + addedStyle + ">" + name + " [" + id + "]</span></td>";
                }
            }
            tr += "</tr>"
            $("#x-no-oc-table > tbody").append($(tr));
            tr = "<tr>";
            idx += 5;
            if (done == true || idx >= missingMembers.length) break;
        };

        // Set cell borders
        $("#x-no-oc-table tr:first td:first").css("border-top-left-radius", "10px");
        $("#x-no-oc-table tr:first td:last").css("border-top-right-radius", "10px");
        $("#x-no-oc-table tr:last td:first").css("border-bottom-left-radius", "10px");
        $("#x-no-oc-table tr:last td:last").css("border-bottom-right-radius", "10px");

        // On click,  open profile in new tab
        $(".xoctd").on('click', function (e) {
            let target = $(e.currentTarget);
            let id = $(target).attr("data-id");
            let href="/profiles.php?XID=" + id;
            window.open(href, "_blank");
        });

        if (retryingTableInstall == true && !animatePending) {
            retryingTableInstall = false;
            doAnimateTable(null, 'install');
        }
    }

    function getOptfromTarget(target) {
        let id = $(target).attr("id");
    }

    function processMiniOpCb(e) {
        e.stopPropagation();
        let node = $(e.currentTarget);
        let idx = $(node).attr("data-index");
        let opt = menuItems[idx];
        let sel = "#" + opt.id + " > input";
        if (opt.type == 'cb') {
            let val = $(sel)[0].checked;
            GM_setValue(opt.key, val);
        } else if (opt.type == 'input') {
            let val = $(sel).val()
            GM_setValue(opt.key, val);
        }

        updateOptions();
        if (opt.id == 'oc-opt-hide' || opt.id == 'oc-opt-lvl') hideShowByLevel();
    }

    function processMiniOpInput(e) {
        e.stopPropagation();
        let node = $(e.currentTarget);
        hideLvlVal = $("#oc-opt-lvl").val();
        GM_setValue(hideLvlValKey, hideLvlVal);
        hideShowByLevel();
    }

    function buildMissingMembersUI(from) {

        if (!isOcPage()) return;

        // A couple of options...
        const ocMiniOptions = `
            <span id='oc-opt-wrap'>
                <input type="checkbox" id="oc-opt-hide">
                <input type="number"   id="oc-opt-lvl" min="1" max="15">
                <input type="checkbox" id="oc-opt-last-pos" style="display: none; opacity: 0;">
            </span>`;

        //const toggleBtn = `<div><span class="x-toggle-sort"><i class="fas fa-caret-down"></i></span></div>`

        let membersDivNew = `
            <div id="x-no-oc-members" class="sortable-box t-blue-cont h">
                <!-- div class="x-oc-special-wrap" -->
                    <div id="x-oc-can-click" class="hospital-dark top-round scroll-dark" role="table" aria-level="5">
                        <div class="box"><span id='x-oc-click'>${membersTextClosed}</span></div>
                        <div class="xoc-navbar">
                            <div id="x-select"><ul></ul></div>
                        </div>
                    </div>
                <!-- /div -->
            </div>
         `;

        let membersDiv = `
            <div id="x-no-oc-members" class="sortable-box t-blue-cont h">
              <div id="x-oc-can-click" class="hospital-dark top-round scroll-dark" role="table" aria-level="5">
                  <div class="box"><span id='x-oc-click'>${membersTextClosed}</span></div>
              </div>
          </div>
         `;

        if ($("#x-no-oc-members").length || animatePending) {
        //    doAnimateTable(null, (from + '-buildui'));
            return;
        }

        $("#faction-crimes").before((useNewOptsPane == true) ? membersDivNew : membersDiv);
        $("#x-oc-can-click").append(ocMiniOptions);

        $("#oc-opt-last-pos").prop('checked', keepLastState);
        $("#oc-opt-hide").prop('checked', hideLvl);
        $("#oc-opt-lvl").val(hideLvlVal);

        let sortBtn = $(toggleBtn);
        $(sortBtn).attr("id", "xocsort");
        $("#x-oc-can-click").append($(sortBtn)[0]);
        $("#xocsort").on('click', toggleSort);

        displayHtmlToolTip($("#xocsort"), "Sort direction", "tooltip5");
        displayHtmlToolTip($("#x-oc-can-click > .box"), "Right click to refresh", "tooltip5");

        displayHtmlToolTip($("#oc-opt-hide"),
                           "Checking this will hide avaiable<br>" +
                           "crimes under the level entered in<br>" +
                           "the box to the right. This<br>" +
                           "applies only to the recruiting page.", "tooltip5");

        displayHtmlToolTip($("#oc-opt-lvl"),
                           "Crimes lower than this level<br>" +
                           "will be hidden if the checkbox<br>" +
                           "to the left is selected. This<br>" +
                           "applies only to the recruiting page.", "tooltip5");

        displayHtmlToolTip($("#oc-opt-last-pos"),
                           "Checking this will cause this<br>" +
                           "script to keep this window in<br>" +
                           "the last state you left it in,<br>" +
                           "either open or hidden.", "tooltip5");

        $("#oc-opt-hide").on('click', function (e) {
            debug("opt-hide click");
            e.stopPropagation();
            let node = $(e.currentTarget);
            let tmp = hideLvl;
            hideLvl = $("#oc-opt-hide")[0].checked;
            GM_setValue(hideLvlKey, hideLvl);
            if (tmp != hideLvl)
                updateOptions();
            hideShowByLevel();
        });

        $("#oc-opt-lvl").on('change', function (e) {
            debug("opt-lvl change");
            e.stopPropagation();
            let node = $(e.currentTarget);
            let tmp = hideLvlVal;
            hideLvlVal = $("#oc-opt-lvl").val();
            GM_setValue(hideLvlValKey, hideLvlVal);
            if (tmp != hideLvlVal)
                updateOptions();
            hideShowByLevel();
        });

        $("#x-oc-can-click > .box").on('click', function (e) {doAnimateTable(e, 'btn');});
        $("#x-oc-can-click > .box").on('contextmenu', refreshMissingMembers);

        //if (keepLastState == true && lastState == stateOpen && !animatePending)
        //    doAnimateTable('missmembers');    // Can call direct, event is unused

        // New options panel
        if (useNewOptsPane == true) installOptionsPane();
    }

    // ============================= Styles, mostly =================================

    // Styles just stuck at the end, out of the way
    var genStylesAdded= false;
    function addStyles() {
        if (genStylesAdded == true) return;
        genStylesAdded = true;

        debug("Adding OC styles");
        let shadowColor = darkMode() ? "#555" : "#ccc";
        addToolTipStyle();
        loadMiscStyles();

        GM_addStyle(`

           .gb { border: 2px solid limegreen; }
           .bb { border: 2px solid red; }

           .def-red {color: var(--default-red-color);}
           .def-yellow {color: var(--default-yellow-color);}

           .blinkOcWarn {
               color: var(--default-red-color);
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
        `);

        // OC tracking

        addContextStyles();

        GM_addStyle(".oc-offscreen {position: absolute; top: -2000px; left: -2000px;}");

        // Alot of other stuff, the good stuff...
        GM_addStyle(`
            .oc-comp-span1 {
                 color: var(--oc-respect-reward-text-color);
                 font-family: Arial;
                 font-size: 12px;
                 padding-top: 2px;
                 margin-left: 150px;
             }
             .oc-comp-span2 {
                 font-family: Fjalla One;
                 margin-left: 5px;
                 padding-top: 2px;
             }
            .csv-btn {
               color: green;
               border-radius: 14px;
               padding: 0px 8px 0px 8px;
               position: absolute;
               display: flex;
               flex-wrap: wrap;
               justify-content: center;
               align-content: center;
               top: 0;
               left: 82%;
               height: 34px;
            }
            .csv-btn:hover  {
                color: limegreen;
                box-shadow: inset 6px 4px 2px 1px ${shadowColor};
            }

            .x-toggle-sort {
                position: relative;
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                /* aspect-ratio: 1; */
                /* border-radius: 15px; */
                /* border: 1px solid black; */
                cursor: pointer;
                /* padding-top: 3px; */
                /* margin-left: 3px; */
                /* background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%); */
                /* height: 20px; */
                width: 30px;
                opacity: 1;
                visibility: visible;
                transition: all .2s ease-in-out;
                /* margin-right: 10px; */
                float: right;
                vertical-align: bottom;
                align-content: center;
            }
            body:not(.dark-mode) .x-toggle-sort {
                background-image: radial-gradient(rgba(255, 255, 255, 0.2) 0%, rgba(50, 50, 50, 0.6) 100%);
                border: none;
                color: #666l
            }

            .x-oc-special-wrap {
                display: flex;
                flex-flow: row wrap;
                width: 100%;
            }

            .xoc-myself {
                border: 1px solid green;
                filter: brightness(1.5);
                z-index: 9;
            }
            .x-oc-wrap {
                padding: 10px 0px 10px 0px;
            }
            #x-no-oc-members {
                margin-top: 8px;
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
            }
            #x-no-oc-table {

            }
            #x-no-oc-table tr {
                display: flex;
                flex-direction: row;
                width: 90%;
                height: 30px;
                margin: 0px auto 0px auto;
            }
            #x-no-oc-table tr:first-child {
                border-radius: 10px 0px 0px 0px;
            }
            #x-no-oc-table td {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                text-align: center;
                color: var(--default-color);
                width: 20%;
                border: 1px solid #666;
                cursor: pointer;
            }
            #x-no-oc-table td:hover {
                color: var(--default-blue-color);
            }
            #x-no-oc-table td span {
                display: flex;
                align-items: center;
            }
            #x-oc-can-click {
                height: 38px;
                width: 100%;
                display: flex;
                align-content: center;
                flex-wrap: wrap;
                background: var(--tabs-bg-gradient);
                border: none;
                color: var(--tabs-color);
                font-weight: 700;
                font-size: 14px;
                justify-content: space-between;
            }
            #x-oc-can-click > div > span {
                cursor: pointer;
            }
            #x-oc-can-click .box {
                display: flex;
                z-index: 9;
            }
            #x-oc-click {
                border-radius: 4px;
                padding: 10px 30px 10px 20px;
            }
            #x-oc-click:hover {
                box-shadow: 0 12px 16px 0 rgba(0,0,0,0.24), 0 17px 50px 0 rgba(0,0,0,0.19);
            }
            #oc-opt-last-pos {
                margin: 0px 20px 0px 20px;
                cursor: pointer;
                opacity: 0;
                z-index: 9999999;
            }
            #oc-opt-wrap {
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                align-content: center;
                border-radius: 4px;
                height: 100%;
                margin-left: auto;
                margin-right: 20px;
            }
            #oc-opt-wrap.recruit-tab:hover {
                filter: brightness(1.2);
            }
            #oc-opt-wrap.recruit-tab:hover input {
                opacity: 1;
            }
            #oc-opt-wrap input {
                opacity: 0;
            }

            .vhide {visibility: hidden;}
            .vshow {visibility: visible;}

            #oc-opt-hide {
                /*opacity: 0;*/
            }
            #oc-opt-lvl {
                border-radius: 4px;
                height: 14px;
                width: 20px;

                font-size: 12px;

                padding: 1px 0px 0px 4px;
                margin-left: 5px;
                margin-right: 10px;

                display: inline-flex;
                flex-flow: row wrap;
                align-items: center;
                /*opacity: 0;*/
            }
        `);
    }

    function installTrackerStyles() {
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
                margin-left: 5px;
                align-items: center;
                font-size: 10pt;
            }
            #ocTracker-cm ul {
                border-radius: 5px;
            }
            #ocTracker-cm li {
                height: 24px;
                padding: 4px 0px 4px 0px;
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                align-content: center;
                color: var(--tabs-color);

                background: var(--tabs-bg-gradient);
            }
            #ocTracker-cm li:hover {
                background: var(--tabs-active-bg-gradient);
                /*background: var(--tabs-hover-bg-gradient);*/
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
                margin-left: 10px;
                width: fit-content;
                margin-right: auto;
                border-right: 1px solid black;
                text-align: center;
            }
            #ocTracker-cm span {
                margin-right: auto;
            }
            #ocTracker-cm a {
                display: inline-flex;
                width: fit-content;
                margin-right: auto;
            }

        `);

        ocTrackerStylesInstalled = true;
    }


})();