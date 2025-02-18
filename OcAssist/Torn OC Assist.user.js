// ==UserScript==
// @name         Torn OC Assist
// @namespace    http://tampermonkey.net/
// @version      2.21
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
/*eslint dot-notation: 0*/

(function() {
    'use strict';

    if (isAttackPage()) return log("Won't run on attack page!");

    // Constants used, some to load options..hence first.
    const userId = getThisUserId();    // Used to highlight yourself in list
    const hideLvlKey = "hideLvl";
    const hideLvlValKey = "hideLvlVal";
    const warnMinLvlKey = "warnMinLvl";
    const warnMinLvlValKey = "warnMinLvlVal";
    const stateOpen = "visible";
    const stateClosed = "hidden";
    const sortKey = 'data-sort';
    const csrListKey = "csrList";
    const lastCsrDateKey = "lastCsr";
    const initCsrDaysKey = "initCsrDays";

    const onCrimesPage = function () {return (location.hash ? location.hash.indexOf("tab=crimes") > -1 : false);}

    // format helper for time strings
    const nn = function(t) {return t == 0? '00' : t < 10 ? '0' + t : t;}
    addToolTipStyle();

    var myOcTracker;
    var ocTrackerStylesInstalled = false;

    var myCrimeId; // = GM_getValue("myCrimeId", null);
    var myCrimeStartTime; // = GM_getValue("myCrimeStartTime", 0);
    var myCrimeStartTimeModifier;
    var myCrimeStatus = ""; // = GM_getValue("myCrimeStatus", "");

    const NO_OC_TIME = "No OC found.";
    const secsInDay = 24 * 60 * 60;
    const secsInHr = 60 * 60;
    const showExperimental = false;

    function myOcTrackingCb(responseText, ID, param) {
        debug("myOcTrackingCb: ", myOcTracker);
        if (myOcTracker)
            myOcTracker.handleOcResponse(responseText, ID, param);
    }

    // ================ OC Tracker and it's context menu related functions ===============
    class OcTracker {
        // Since there is only one OcTracker object (a singleton), "myOcTracker" and
        // "this" are used somewhat interchangably here, the singleton would need to
        // be used or the object passed into some functions, namely callbacks.
        constructor() {}
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

        getDisplayTimeUntilOc() {
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
            GM_setValue(key, item.name);
            let ttText = "Missing required item!<br>A " +
                myOcTracker.missingReqItemName + " is needed!";

            if (!myOcTracker.missingReqItemName) {
                console.error("Missing name for required item! resp: ", jsonResp,
                              " items: ", jsonResp.items, " ID: ", ID,
                              " item: ", item);
            }
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
            let expiredAt = myCrime.expired_at;

            if (debugLoggingEnabled) {
                log("Found my crime: ", myCrime);
                log("ready at: ", new Date(readyAt * 1000).toString());
                log("expired at: ", new Date(expiredAt * 1000).toString());
                log("status: ", myCrime.status);
            }

            myOcTracker.scheduleOcCheck(58000);

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
                //myOcTracker.scheduleOcCheck(60000);    // Try again in a minute...
                return;
            }

            // See if there is a required item, and if so, do we have it?
            let slots = myCrime.slots;
            this.missingReqItem = false;
            for (let idx=0; idx<slots.length; idx++) {
                let slot = slots[idx];
                // Empty slots add 24 hours to time...
                if (!slot.user_id) myCrimeStartTime += secsInDay;
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
                    // Might as well see if csr needs updating
                    if (trackMemberCsr == true) {
                        log("My Slot, name: ", myCrime.name, " SR: ",slot.success_chance, " role: ", slot.position);
                    }
                    // break;
                }
            }

            if (myCrimeStartTime) {
                let dt = new Date(myCrimeStartTime * 1000);
                myOcTracker.setTrackerTime(this.getDisplayTimeUntilOc());
                setInterval(myOcTracker.updateTrackerTime, 31000, this);
            }

            function updateTrackerTime(obj) {
                myOcTracker.setTrackerTime(myOcTracker.getDisplayTimeUntilOc());
            }
        }

        // Do not call too often!
        ocCallPending = false;
        lastTimeReq = 0;
        collisions= 0;
        lastQueryTime = 0;
        pendingReqId = 0;

        clearPending() {myOcTracker.ocCallPending = false;}

        getMyNextOcTime(force) {
            if (force == true) {
                debug(" xxx myOcTracker sending forced request");
                xedx_TornUserQueryv2("", "organizedcrime", myOcTrackingCb);
                return;
            }
            let now = new Date().getTime();
            let diff = now - myOcTracker.lastQueryTime;
            debug("xxx getMyNextOcTime: ", diff, "|", document.visibilityState, "|", myOcTracker.ocCallPending);
            if (!force && diff < 20000) {
                debug("ERROR: xxx Last call was under 20 secs!", diff);
                return;
            }
            myOcTracker.lastQueryTime = now;
            if (!force && document.visibilityState != 'visible') {
                debug("xxx Document not visible, don't call the API");
                return;
            }
            if (!force && myOcTracker.ocCallPending == true) {
                //debug("xxx API call already pending, don't call again!");
                //return;
            }
            debug(" xxx myOcTracker sending request");
            //myOcTracker.ocCallPending = true;
            xedx_TornUserQueryv2("", "organizedcrime", myOcTrackingCb);
        }

        scheduleOcCheck(time, param) {
            //log("scheduleOcCheck, ", time);
            if (myOcTracker.ocCallPending == true) {
                myOcTracker.collisions++;
                debug("Collided with pending request! Time: ", myOcTracker.lastTimeReq,
                      " req time: ", time, " collisions: ", myOcTracker.collisions);
                if (time < myOcTracker.lastTimeReq) {
                    debug("Over-riding due to time");
                    clearTimeout(myOcTracker.pendingReqId);
                } else {
                    return;
                }
            }
            myOcTracker.ocCallPending = true;
            myOcTracker.lastTimeReq = time;
            myOcTracker.pendingReqId = setTimeout(myOcTracker.getMyNextOcTime, time, param);
        }

        addMenuToSidebar() {
            if (!isOcPage())
                this.installOcTrackerContextMenu();
            else {
                // Add refresh opt only
                // Remove first, just in case.
                $("#ocTracker").off("contextmenu");
                $("#ocTracker").on("contextmenu", function(e) {
                    let target = e.currentTarget;
                    e.preventDefault(); // Prevent default right-click menu

                    let menuHtml = `<ul class='custom-menu'><li data-action="refresh">Refresh</li></ul>`;
                    let menu = $(menuHtml);
                    $(menu).css({top: e.pageY, left: e.pageX});
                    $("body").append(menu);
                    menu.show();

                    $(".custom-menu li").click(function() {
                        var choice = $(this).attr("data-action");
                        doOptionMenuRunFunc(choice);
                        menu.remove(); // Remove the menu
                    });

                    // Hide menu when clicking outside
                    $(document).on("click", function(e) {
                        if (!$(e.target).closest(".context-menu").length) {
                            menu.remove();
                        }
                    });
                });
            }
        }

        startMyOcTracking() {
            if ($("#ocTracker").length) {
                myOcTracker.addMenuToSidebar();
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

            // Don't need the context menu on the fac crimes page,
            // we have the regular options menu. Fix it so same
            // calbacks are used?
            this.addMenuToSidebar();

            // On fac page - we will be doing this call anyways,
            // and the callback will call the above callback as well.
            // So just return.
            if (isFactionPage()) {
                debug("startMyOcTracking: on fac page, will check later...");
                return;
            }

            //getMyNextOcTime('available');
            this.scheduleOcCheck(250, 'available');
            setInterval(myOcTracker.clearPending, 10000);
        }

        // Handles input changes on context menu (checkboxes, fields)
        processMiniOpCb(e) {
            e.stopPropagation();
            let node = $(e.currentTarget);
            let idx = $(node).attr("data-index");
            let opt = myOcTracker.contextMenuItems[idx];
            let sel = "#" + opt.id + " > input";
            if (opt.type == 'cb') {
                let val = $(sel)[0].checked;
                GM_setValue(opt.key, val);
            } else if (opt.type == 'input') {
                let val = $(sel).val()
                GM_setValue(opt.key, val);
            }

            updateOptions();
            if (opt.id == 'oc-opt-hide' || opt.id == 'oc-opt-lvl')
                hideShowByLevel();
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

            if (onCrimesPage()) {
                return; // log("On crimes page, suppressing context");
            }

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

            if ($("#ocTracker-cm").length) return;

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

        getMyOcTrackerDiv() {
            installTrackerStyles();
            return `<div id="ocTracker">
                        <span id="oc-tracker-time">00:00:00</span>
                        <span id="missing-item" class="x-round-btn xmr5" style="display: none;">!</span>
                    </div>`;
        }
    }

    // ======================== Configurable Options. Use UI to change. =======================
    //
    // Extra debug logging, for development
    const logFullApiResponses = GM_getValue("logFullApiResponses", false);
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);
    const logCsrData = true;

    // Dev/debug...
    var debugNoOcFound = GM_getValue("debugNoOcFound", false);
    GM_setValue("debugNoOcFound", debugNoOcFound);

    var hideLvl = GM_getValue(hideLvlKey, false);
    var hideLvlVal = GM_getValue(hideLvlValKey, 5);
    var hideLvlPaused = false;

    var warnMinLvl = GM_getValue(warnMinLvlKey, false);
    var warnMinLvlVal = GM_getValue(warnMinLvlValKey, 5);

    var warnOnNoOc = GM_getValue("warnOnNoOc", true);
    var notifyOcSoon = GM_getValue("notifyOcSoon", false);
    var notifyOcSoonMin = GM_getValue("notifyOcSoonMin", 15);
    var keepOnTop = GM_getValue("keepOnTop", false);
    var disableToolTips = GM_getValue('disableToolTips', false);
    var scrollLock = GM_getValue('scrollLock', true);

    var facMamberRefreshMins = GM_getValue("facMamberRefreshMins", 15);    // Time minimum between fac member API calls. minutes
    var csrListRefreshMins = GM_getValue("csrListRefreshMins", 10);        // Time minimum between crimes API calls. minutes

    // CSR options
    var trackMemberCsr = GM_getValue("trackMemberCsr", true);
    var lowestCsrLevel = GM_getValue("lowestCsrLevel", 5);      // Lowest crime level to look at
    var initCsrDays    = GM_getValue(initCsrDaysKey, 14);       // How many days back to check for crimes during init

    var lastCsrCheckDate = GM_getValue(lastCsrDateKey, 0);    // Most recent date looked at, only go to here during updates
    var defCsrSelectVal = GM_getValue("csrSelectVal", "Blast From The Past");

    const csrSortOrders = ['desc', 'asc'];
    const csrDefSortOrder = 0;
    var   csrSort = csrDefSortOrder;
    var   csrCurrSortOrder = csrSortOrders[csrDefSortOrder];

    // Monitor and display when an OC you are in is due
    // See ~488, start sooner and exit if we can!!
    var trackMyOc = GM_getValue("trackMyOc", true);
    if (trackMyOc == true)
        GM_addStyle(`#oc2Timer {display: none;}`);

    var blinkingPaused = false;    // Set via an option, temp disable blinking...
    var blinkingNoOc = false;      // Set when alerting re: no OC
    const setAlertsPaused = function() {blinkingPaused = true;}


    // ====================== End Configurable Options ======================

    // Can run the OC watcher, to track when yours is due,
    // independently. Just start it and return if not on fac page.
    //

    // I can turn this on for dev-only stuff, only I will see -
    // and if I forget it won't be enabled without someone
    // doing so on purpose. I sometimes leave in defaults set
    // the wrong way....
    const xedxDevMode = GM_getValue("xedxDevMode", false) && (userId == 2100735);
    var timestampComplete = GM_getValue("timestampComplete", false);

    // Check to see if the OC tracker should be run independently...
    if (trackMyOc == true && !onCrimesPage()) {
        logScriptStart();
        validateApiKey();

        addStyles();

        myOcTracker = new OcTracker();
        myOcTracker.startMyOcTracking();
        myOcTracker.getMyNextOcTime(true);
        //myOcTracker.scheduleOcCheck(100);
        //return;

        // Don't return yet, other things may still run...
        //if (!isFactionPage()) {
        //    addStyles();
        //    return;
        //}

    }

    const recruitingIdx = 0;
    const planningIdx = 1;
    const completedIdx = 2;

    var scenarios;
    var listRoot;        // root div above scenarios
    var scrollTimer;
    var sortTimer;

    // These will be tables that can be detached and re-appended
    const membersTableName = "membersNotInOcTable";
    const optsTableName = "optsTable";
    const csrTableName = "csrTable";
    var membersNotInOcTable;
    var optionsTable;
    var csrTable;
    var activeTable;

    // ============================== CSR data =========================================

    // Data for the csr table. Stored as an object indexed by member ID, associated with
    // object that is a list of CSR per crime, per slot.
    // csrList = { id: {...TBD...

    const crimeDefsTable = {
        1: {
            "Mob Mentality": {enabled: false, level: 1, roles: ["?", "?", "?"], aka: "mm"},
            "Pet Project": {level: 1, roles: ["Kidnapper", "Muscle", "Picklock"], aka: "pp"}
        },
        2: {
            "Cash Me If You Can": {level: 2, roles: ["Lookout", "Thief", "Thief"], aka: "cm"}
        },
        3: {
            "Market Forces": {level: 3, roles: ["Enforcer", "Negotiator", "Lookout", "Arsonist", "Muscle"], aka: "mf"},
        },
        4: {
            "Stage Fright": {level: 4, roles: ["Lookout", "Enforcer", "Sniper", "Muscle", "Muscle", "Muscle"], aka: "sf"},
        },
        5: {
            "Leave No Trace": {level: 5, roles: ["Techie", "Impersonator", "Negotiator"], aka: "lt"},
        },
        6: {
            "Honey Trap": {level: 6, roles: ["Enforcer", "Muscle", "Muscle"], aka: "ht"},
        },
        7: {
            "Blast From The Past": {level: 7, roles: ["Picklock", "Picklock", "Hacker", "Engineer", "Bomber", "Muscle"], aka: "bp"},
        },
        8: {
            "Break The Bank": {level: 8, roles: ["Thief", "Thief", "Muscle", "Muscle", "Muscle", "Robber"], aka: "bb"},
        },
        9: {
            "Gaslight The Way": {enabled: false, level: 9, roles: ["?", "?", "?", "?", "?", "?"], aka: "gw"},
        },
        10: {
            "Smoke and Smoke and Wing Mirrors": {enabled: false, level: 10, roles: ["?", "?", "?", "?", "?", "?"], aka: "ss"},
            "Bidding on Chaos": {enabled: false, level: 10, roles: ["?", "?", "?", "?", "?", "?"], aka: "bc"},
        }
    };

    const nicknames = {"Mob Mentality": "mm", "Pet Project": "pp", "Cash Me If You Can": "cm", "Market Forces": "mf",
                       "Stage Fright": "sf", "Leave No Trace": "lt", "Honey Trap": "ht", "Blast From The Past": "bp",
                       "Break The Bank": "bb", "Gaslight The Way": "gw", "Smoke and Smoke and Wing Mirrors": "ss",
                       "Bidding on Chaos": "bc"};

    const roleLookup = {
        "Pet Project": ["Kidnapper", "Muscle", "Picklock"],
        "Cash Me If You Can": ["Lookout", "Thief", "Thief"],
        "Market Forces": ["Enforcer", "Negotiator", "Lookout", "Arsonist", "Muscle"],
        "Stage Fright": ["Lookout", "Enforcer", "Sniper", "Muscle", "Muscle", "Muscle"],
        "Leave No Trace": ["Techie", "Impersonator", "Negotiator"],
        "Honey Trap": ["Enforcer", "Muscle", "Muscle"],
        "Blast From The Past": ["Picklock", "Picklock", "Hacker", "Engineer", "Bomber", "Muscle"],
        "Break The Bank": ["Thief", "Thief", "Muscle", "Muscle", "Muscle", "Robber"],
    };

    const csrEntryTemplate = {name: "",
                               crimeCsr: {"mm": {},
                                          "pm": {"Kidnapper": 0, "Muscle": 0, "Picklock": 0},
                                          "cm": {"Lookout": 0, "Thief": 0},
                                          "mf": {"Enforcer": 0, "Negotiator": 0, "Lookout": 0, "Arsonist": 0, "Muscle": 0},
                                          "sf": {"Lookout": 0, "Enforcer": 0, "Sniper": 0, "Muscle": 0},
                                          "lt": {"Techie": 0, "Impersonator": 0, "Negotiator": 0},
                                          "ht": {"Enforcer": 0, "Muscle": 0},
                                          "bp": {"Picklock": 0, "Hacker": 0, "Engineer": 0, "Bomber": 0, "Muscle": 0},
                                          "bb": {"Thief": 0, "Muscle": 0, "Robber": 0},
                                          "gw": {},
                                          "ss": {},
                                          "bc": {}
                               }};

    // Our table of member and their csr for each crime type and role.
    // Organized as  id: {name, csr[crimeNickname][role], id2: {}, ...
    var csrList = {};

    function readCsrList() {
        let tmp = GM_getValue(csrListKey, null);
        if (tmp) {
            csrList = JSON.parse(tmp);
        }
    }

    function writeCsrList() {
        GM_setValue(csrListKey, JSON.stringify(csrList));
    }

    if (trackMemberCsr) readCsrList();

    // =========================== Little helper fns =================================
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

    //const getAvailableCrimes = function () { doFacOcQuery('available'); }
    //const getPlannedCrimes = function () { doFacOcQuery('planning'); }
    //const getRecruitingCrimes = function () { doFacOcQuery('recruiting'); }

    const onRecruitingPage = function () {return (btnIndex() == recruitingIdx);}
    const onPlanningPage = function () {return (btnIndex() == planningIdx);}
    const onCompletedPage = function () {return (btnIndex() == completedIdx);}
    //const setAlertsPaused = function() {blinkingPaused = true;}

    function timeDiff(checkTime) {
        let now = new Date().getTime();
        let timeDiff = {};
        let diff = now - +checkTime;
        timeDiff.ms = now - +checkTime;
        timeDiff.secs = timeDiff.ms / 1000;
        timeDiff.mins = timeDiff.secs / 60;
        timeDiff.hrs = timeDiff.mins / 60;
        return timeDiff;
    }

    function minutesAgo(time) {return timeDiff(time).mins;}
    function secondsAgo(time) {return timeDiff(time).secs;}
    function hoursAgo(time) {return timeDiff(time).hrs;}

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

    // Sorting criteria
    const sortByTime = 1;
    const sortByLevel = 2;

    const toggleBtn = `<span class="x-toggle-sort"><i class="fas fa-caret-down"></i></span>`;

    // Make sure opts and new ones I add are in storage...just a convenience for editing...
    writeOptions();

    // ================== Options available on the options pane ===================
    const menuItems = [
        {name: "-- Options --",                                               type: "title", enabled: true,  validOn: "full"},

        {name: "Hide recruiting levels beneath #",
             id: {cb: "oc-hide", input: "oc-hide-lvl"}, key: {cb: hideLvlKey, input: hideLvlValKey},
             type: "combo",                                                                                  validOn: "full",  min: 1, max: 10,
             tooltip: "This will hide crimes<br>" +
                      "on the recruitment page<br>" +
                      "that are less than the<br>" +
                      "specified level. You can show<br>" +
                      "then again temporarily<br>" +
                      "with the 'Show Hidden<br>" +
                      "Recruits option"},
        {name: "Show hidden recruits",     id: "show-recruits",                 type: "ctrl",    enabled: true, validOn: "full",
             fnName: "show-hidden",
             tooltip: "Show recruits hidden due to<br>" +
                      "being less than the level<br>" +
                      "configured above, until next refresh."},
        {name: "Refresh OC Start Time", id: "oc-refresh",                     type: "ctrl",      fnName: "refresh", validOn: "full",
             tooltip: "Refreshes your OC start time."},
        {name: "Refresh Members not in an OC", id: "oc-mem-refresh",          type: "ctrl",      fnName: "mem-refresh", validOn: "full",
             tooltip: "Refreshes the table of<br>members not in an OC."},

        {name: "Pause flashing Alerts",   id: "stop-alert",                   type: "ctrl",      enabled: true, validOn: "full",
             fnName: "stop-alert",
             tooltip: "Stop the blinking alerts that<br>" +
                      "indicate you are not in an OC,<br>" +
                      "or that yours is due to start soon."},

        {name: "Timestamp completed OCs", id: "ts-complete",                   type: "cb",    enabled: true, validOn: "full",
             key: "timestampComplete",
             /*fnName: "",*/
             tooltip: "Display the 'executed at' time<br>" +
                      "on the Completed page, which is<br>" +
                      "when the crime was actually<br>" +
                      "started (I think!)."},

        {name: "Display time until your OC on the sidebar",                     type: "cb", enabled: true, validOn: "full",
             id: "track-my-oc", key: "trackMyOc",
             fnName: "track-my-oc",
             tooltip: "Display a small counter on<br>" +
                      "the sidebar indicating how long<br>" +
                      "until your OC, or a warning if<br>" +
                      "you are not in one (if enabled)."},
        {name: "Disable Tool Tips", id: "disable-tool-tips",key: "disableToolTips",      type: "cb", enabled: true, validOn: "full",
             tooltip: "Disables these tooltips.<br>" +
                      "Takes effect after a refresh<br>" +
                      "or reload, and only affects<br>" +
                      "the tooltips on this menu."},
        {name: "Enable Scroll Lock", id: "scroll-lock",key: "scrollLock",                type: "cb", enabled: true, validOn: "full",
             fnName: "toggleScroll",
             tooltip: "Allows the OC's on each<br>" +
                      "page to scroll independently<br>" +
                      "of the page headers."},
        {name: "Flash if you are not in an OC", id: "warn-no-oc",    key: "warnOnNoOc",   type: "cb", enabled: true, validOn: "full",
             tooltip: "Flashes the sidebar display<br>" +
                      "if not in an OC yet."},
        {name: "Flash when your OC is almost ready, # minutes",
             id: {cb: "notify-soon", input: "soon-min"},
             key: {cb: "notifyOcSoon", input: "notifyOcSoonMin"},                         type: "combo", enabled: true, validOn: "full",
             tooltip: "The sidebar display will<br>" +
                      "flash hen you crime is due<br>" +
                      "to start soon."},
        {name: "Keep your crime on top when sorting", id: "keep-on-top", key: "keepOnTop", type: "cb",    enabled: true, validOn: "full",
             tooltip: "On the Planning page, puts<br>" +
                      "your crime on top, then the<br>" +
                      "remaining ones are sorted."},
        {name: "Notify if a crime at or above level # is available",                       type: "combo", enabled: true, validOn: "full",
             id: {cb: "oc-min-avail", input: "oc-min-lvl"},
             key: {cb: warnMinLvlKey, input: warnMinLvlValKey},
             min: 1, max: 10,
             tooltip: "TBD TBD TBD<br>" +
                      "If a crime above the specified<br>" +
                      "level becomes available on the<br>" +
                      "recruiting page, a notification<br>" +
                      "is sent."},
        ];

    // ======================= Right-hand side: CSR options =======================
    const csrMenuOptions = [
        {name: "Track Member CSR", id: "track-csr",key: "trackMemberCsr", type: "cb", enabled: true, validOn: "full", /*fnName: "toggleCsr",*/
             tooltip: "Maintains a list of each fac<br>" +
                      "members CSR (Crime Success Rate),<br>" +
                      "actually a % chance of success,<br>" +
                      "for each crime"},
        {name: "Only track crime CSR above level #",
             id: "csr-min-lvl", key: "lowestCsrLevel",
             type: "input", enabled: true,  validOn: "full",  min: 1, max: 10,
             tooltip: "Only track CSRs for crimes<br>" +
                      "at or above this level. The<br>" +
                      "more you track, the more data<br>" +
                      "has to be stored and processed."},
        {name: "(Re)initialize all CSR values, max # days ago",   id: "init-csr-days", key: initCsrDaysKey,  type: "input",
             enabled: true, validOn: "full", min: 1, max: 60,
             fnName: "init-csr",
             tooltip: "Goes through all crimes and initializes<br>" +
                      "the saved CSR values for all members. Not<br>" +
                      "every member will have data available for<br>" +
                      "every role in ever crime. Note that going<br>"+
                      "too far back may wind up with some innacurate<br>" +
                      "value, as they were much higher when OC 2.0 was<br>" +
                      "initially released."},
        {name: "Update CSR values",   id: "upd-csr",    type: "ctrl",     enabled: true, validOn: "full",
             fnName: "upd-csr",
             tooltip: "Updates CSR values since last update.<br>" +
                      "This is normally done automatically."},
        {name: "Clear all CSR values",   id: "clear-csr",    type: "ctrl",     enabled: true, validOn: "full",
             fnName: "clear-csr",
             tooltip: "Erases all saved CSR values.<br>"},
        ];

    function writeOptions() {
        //GM_setValue(keepLastStateKey, keepLastState);
        GM_setValue(hideLvlKey, hideLvl);
        GM_setValue(hideLvlValKey, hideLvlVal);

        GM_setValue("warnOnNoOc", warnOnNoOc);
        GM_setValue("notifyOcSoon", notifyOcSoon);
        GM_setValue("notifyOcSoonMin", notifyOcSoonMin);
        GM_setValue("keepOnTop", keepOnTop);
        GM_setValue('disableToolTips', disableToolTips);
        GM_setValue('scrollLock', scrollLock);

        GM_setValue(warnMinLvlKey, warnMinLvl);
        GM_setValue(warnMinLvlValKey, warnMinLvlVal);
        GM_setValue("trackMyOc", trackMyOc);

        GM_setValue("timestampComplete", timestampComplete);

        GM_setValue("trackMemberCsr", trackMemberCsr);
        GM_setValue("lowestCsrLevel", lowestCsrLevel);
    }

    function updateOptions(doWriteOpts=true) {
        hideLvl = GM_getValue(hideLvlKey, hideLvl);
        hideLvlVal = GM_getValue(hideLvlValKey, hideLvlVal);

        warnOnNoOc = GM_getValue("warnOnNoOc", warnOnNoOc);
        notifyOcSoon = GM_getValue("notifyOcSoon", notifyOcSoon);
        notifyOcSoonMin = GM_getValue("notifyOcSoonMin", notifyOcSoonMin);
        keepOnTop = GM_getValue("keepOnTop", keepOnTop);
        disableToolTips = GM_getValue('disableToolTips', disableToolTips);
        scrollLock = GM_getValue('scrollLock', scrollLock);

        warnMinLvl = GM_getValue(warnMinLvlKey, warnMinLvl);
        warnMinLvlVal = GM_getValue(warnMinLvlValKey, warnMinLvlVal);
        trackMyOc = GM_getValue("trackMyOc", trackMyOc);
        timestampComplete = GM_getValue("timestampComplete", timestampComplete);

        trackMemberCsr = GM_getValue("trackMemberCsr", trackMemberCsr);
        lowestCsrLevel = GM_getValue("lowestCsrLevel", lowestCsrLevel);
        initCsrDays    = GM_getValue(initCsrDaysKey, initCsrDays);

        $("#oc-hide").prop('checked', hideLvl);
        $("#oc-hide-lvl").val(hideLvlVal);

        $("#warn-no-oc").prop("checked", warnOnNoOc);
        $("#notify-soon").prop("checked", notifyOcSoon);
        $("#soon-min").val(notifyOcSoonMin);
        $("#keep-on-top").prop("checked", keepOnTop);
        $("#disable-tool-tips").prop("checked", disableToolTips);
        $("#scroll-lock").prop("checked", scrollLock);

        $("#oc-min-avail").prop("checked", warnMinLvl);
        $("#oc-min-lvl").val(warnMinLvlVal);
        $("#track-my-oc").prop("checked", trackMyOc);
        $("#ts-complete").prop("checked", timestampComplete);

        $("#track-csr").prop('checked', trackMemberCsr);
        $("#csr-min-lvl").val(lowestCsrLevel);
        $("#init-csr-days").val(initCsrDays);

        // TBD: add the rest
        if (doWriteOpts) { writeOptions(); }

    }

    // Will reset at page refresh, not permanent cache
    const cacheCompletedCrimes = true;


    // Start sooner if we can!
    if (trackMyOc == true) {
        logScriptStart();
        validateApiKey();

        myOcTracker = new OcTracker();
        myOcTracker.startMyOcTracking();

        //startMyOcTracking();

        // Don't return yet, other things may still run...
        //if (!isFactionPage()) {
        //    addStyles();
        //    return;
        //}
        
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

    /*
    // Save cached crime data
    function saveMyCrimeData() {
        GM_setValue("myCrimeId", myCrimeId);
        GM_setValue("myCrimeStartTime", myCrimeStartTime);
        GM_setValue("myCrimeStatus", myCrimeStatus);
    }

    function parseOcTime(time) {
        // OC in: 2d 12h 45m
        let parts = time.split(' ');
        if (parts.length < 5) return;
        let d = parseInt(parts[2]);
        let h = parseInt(parts[3]);
        let m = parseInt(parts[4]);

        return {d: d, h: h, m: m};
    }

    function timeMin(time) {
        let timeUntil = parseOcTime(time);
        return timeUntil ? (+timeUntil.d * 24 * 60 + +timeUntil.h * 60 + +timeUntil.m) : 0;
    }
    */

    // =================== context menu and options pane run funcs ===============================

    // Figure out what here is really needed...
    // simplify mini context menu....

    // Run a function from context menu/options pane
    function doOptionMenuRunFunc(runFunc) {
        switch (runFunc) {
            case "refresh": {  // Refresh OC time ready, from context menu
                $("#oc-tracker-time").text("Please wait...");
                $("#oc-tracker-time").addClass("blink182");
                myCrimeId = 0;
                myCrimeStartTime = 0;
                if (myOcTracker) {
                    //myOcTracker.scheduleOcCheck(2500, 'available');
                    myOcTracker.getMyNextOcTime(true);
                }
                break;
            }
            case "mem-refresh": {
                refreshmembersNotInOc();
                break;
            }
            case "xedx-test": { // Whatever I feel like testing...
                //toggleOcSoon();
                break;
            }
            case "stop-alert": {
                if (myOcTracker)
                    myOcTracker.stopAllAlerts();
                setAlertsPaused();
                break;
            }
            case "show-hidden":
                // TBD
                debug("Show hidden crimes TBD... ");
                showHiddenRecruits();
                break;

            case "track-my-oc":
                if (myOcTracker)
                    onOcTrackerChange();
                break;

            case "toggleScroll":
                toggleScrollLock();
                break;

            case "init-csr":
                // Flash "Busy..." in grre somewhere?
                clearCsrList();
                initializeMemberCsrValues();
                break;

            case "clear-csr":
                clearCsrList();
                break;

            case "upd-csr":
                updateMemberCsrList();
                break;

            default:
                debug("ERROR: Run func ", runFunc, " not recognized!");
                break;
        }

    }

    // ======================== Sorting portion of script ===========================

    function setSortCaret(order) {

        let newClass = sortOrders[order] == 'asc' ? "fa-caret-up" : "fa-caret-down";
        let oldClass = sortOrders[order] == 'asc' ? "fa-caret-down" : "fa-caret-up";
        $($("#xocsort").find("i")).addClass(newClass).removeClass(oldClass);
    }

    function handlePageChange() {
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
                //setSortCaret(completedSortOrder);
                $("#oc-opt-wrap").removeClass("recruit-tab");
                $("#show-hidden").addClass("xhide");
                //getCompletedCrimes();
                //installCompletedPageButton(true);
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
        if (btnIndex() != completedIdx) {
            $("#xcsvbtn").addClass("vhide");
        }
        if (btnIndex() != recruitingIdx)
            $("#show-hidden").addClass("xhide");
        else
            $("#show-hidden").removeClass("xhide");

        handlePageChange();
    }

    function addPageBtnHandlers() {
        let list = pageBtnsList();
        $(pageBtnsList).on('click', pageBtnClicked);
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
        let countHidden = 0;

        for (let idx=0; idx<$(lvlList).length; idx++) {
            let panel = $(lvlList)[idx];
            let lvl = $(panel).attr("data-sort");
            if (hideLvlVal > 0 && lvl < hideLvlVal && hideLvlPaused != true) {
                $(panel).css("display", "none");
                $(panel).addClass("xhidden");
                countHidden++;
            } else {
                $(panel).removeClass("xhidden");
                $(panel).css("display", "block");
            }
            tagAndSortScenarios(sortByLevel);
        }

        let tab = getRecruitingTab();
        let text = "Recruiting";
        if (hideLvlPaused != true)
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
            //logCurrPage();
            return;
        }

        if (!sortCriteria) {
            sortCriteria = sortByTime;
            if (onRecruitingPage()) sortCriteria = sortByLevel;
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
                    let unHide = (hideLvlPaused == true && onRecruitingPage());
                    let elem = $(scenario).find("[class^='wrapper_'] > div > div > div > [class^='textLevel_'] [class^='levelValue_']");
                    if ($(elem).length) {
                        sortVal = parseInt($(elem).text());
                        $(scenario).parent().addClass("sort-lvl");

                        if (!unHide && hideLvl == true && hideLvlVal > 0) {
                            if (hideLvlVal > sortVal) {
                                countHidden++;
                                $(scenario).parent().css("display", "none");
                                $(scenario).parent().addClass("xhidden");
                            }
                        }
                        else {
                            $(scenario).parent().removeClass("xhidden");
                            $(scenario).parent().css("display", "block");
                        }
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

    var inUnhideCb = false;
    function resetCbFlag() {inUnhideCb = false;}

    function showHiddenRecruits(e) {
        inUnhideCb = true;
        setTimeout(resetCbFlag, 1000);
        if (hideLvlPaused == false) {
            hideLvlPaused = true;
            $("#show-recruits").text("Hide hidden recruits");
        } else {
            hideLvlPaused = false;
            $("#show-recruits").text("Show hidden recruits");
        }
        hideShowByLevel();
        return false;
    }

    function addRecruitTabHandler() {
        // TBD ...
        return;

        let tab = getRecruitingTab();
        $(tab).on('contextmenu', showHiddenRecruits);

        displayHtmlToolTip($(tab), "Right click to show<br>hidden crimes. Refresh<br>to hide again.", "tooltip4");
    }

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

    // ========================== Entry point once page loaded ============================

    function handlePageLoad(node) {
        debug("handlePageLoad");

        // This won't add twice, but we can enter here for several reasons.
        addStyles();

        if (!isOcPage()) {
            if (trackMyOc == true) {
                myOcTracker.addMenuToSidebar();
                myOcTracker.getMyNextOcTime(true);
                //myOcTracker.scheduleOcCheck(100);
            }
            return log("Not on crimes page, going home");
        }

        // May or may not need updating, we have a 15 minute delay between checks
        // Make configurable
        getFacMembers();

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

        if (!$("#oc-assist-content-wrap").length) {
            installUI();
        }

        addPageBtnHandlers();

        // Save completed crimes as CSV, no longer enabled...
        //installCompletedPageButton();

        if (trackMyOc == true) {
            if (!myOcTracker) {
                myOcTracker = new OcTracker();
                myOcTracker.startMyOcTracking();
            }
            myOcTracker.addMenuToSidebar();
            myOcTracker.getMyNextOcTime(true);
            //myOcTracker.scheduleOcCheck(100);
        }

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
                    //getCompletedCrimes();
                    break;
                default:
                    break;
            }
        }
    }


    function pushStateChanged(e) {
        debug("pushStateChanged: ", e, " | ", location.hash);
        handlePageLoad();
    }

    function handleVisibilityChange(visible) {
        debug("handleVisibilityChange: ", visible, "|", trackMyOc, "|", myOcTracker);
        if (visible)
            if (trackMyOc == true && myOcTracker) {
                //myOcTracker.getMyNextOcTime();
                myOcTracker.scheduleOcCheck(100);
            } //getDisplayTimeUntilOc(); }
    }
   
    //============================== API calls ===================================
    //
    var membersNotInOc = {};
    var membersNotInOcReady = false;
    var completedCrimesArray;          // Array of completed crimes, will only get once per page visit

    // =================== Get fac members, update list of not in OC =============

    // Build list of members not in an OC, and if csr is enabled,
    // make sure the list is up to date. But just once...
    var membersArray = [];
    function facMemberCb(responseText, ID, options) {
        let jsonObj = JSON.parse(responseText);
        membersArray = jsonObj.members;

        if (jsonObj.error) {
            console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
            return;
        }

        membersNotInOc = {};
        for (let idx=0; idx<membersArray.length; idx++) {
            let member = membersArray[idx];
            if (member.id) {
                let state = member.status.state;
                if (state.toLowerCase() != "fallen" && member.position != "Recruit") {
                    if (member.is_in_oc != true) {
                        membersNotInOc[member.id] = member.name;
                    }
                }
            }
        }

        updateMembersTableData();

        if (trackMemberCsr && membersArray.length) {
            //log("What to do here?");
            //updateCsrMembersList(membersArray);
            //updateMemberCsrList();
        }
    }

    // Don't bother to do this if: not on a fac page,
    // or have done in past 15 minutes, unless forced.
    var lastFacMemberUpd = 0;
    function getFacMembers(forced=false) {
        if (forced == false) {
            if (!isFactionPage()) return debug("getFacMembers: not on fac page");
            if (lastFacMemberUpd > 0 && minutesAgo(lastFacMemberUpd) < facMamberRefreshMins)
                return debug("getFacMember: only ", minutesAgo(lastFacMemberUpd).toFixed(2), " minutes ago!");
        }
        xedx_TornFactionQueryv2("", "members", facMemberCb);
        lastFacMemberUpd = new Date().getTime(); // move to CB
    }

    var blinkInt;

    function removeBlinkInt() {
        clearInterval(blinkInt);
        blinkInt = null;
        $("#x-no-oc-table").removeClass("gb");
        $("#x-no-oc-table").removeClass("bb");
    }

    function refreshmembersNotInOc() {
        $("#x-no-oc-table").addClass("gb");
        const doBlink = function () { // could just add animate class....
            $("#x-no-oc-table").toggleClass("gb bb");
            setTimeout(removeBlinkInt, 500);
        }

        blinkInt = setInterval(doBlink, 500);

        setTimeout(getFacMembers, 3000, true);
        return false;
    }

    // =================== Handle crime parsing, for saving CSR data =================

    var csrInitializing = false;
    var csrUpdating = false;

    function handleCsrListUpdateComplete(last) {
        let now = new Date().getTime();
        if (csrInitializing == true)
            GM_setValue("lastInitialized", now);
        if (csrUpdating == true)
            GM_setValue("lastUpdated", now);

        csrInitializing = false;
        csrUpdating = false;

        writeCsrList();
        GM_setValue(lastCsrDateKey, last);

        removeSpinner("oc-csr-spinner");
    }

    function getCsrListEntry(id, crimeAka, role) {
        let csr = 0;
        let crime = csrList[id].crimeCsr[crimeAka];
        //log("looking for ", id, " aka: ", crimeAka, " role: ",  role, ", crime = ", crime);
        if (!crime) return 0;
        if (role in crime) {
            csr = crime[role];
            //log("Got csr for ", id, crimeAka, role, ": ", csr);
        } else {
            //log("role ", role, " not found in crime ", crimeAka, " for user ", id);
        }

        return csr;
    }

    function clearCsrList() {
        //log("clearCsrList");
        let ids = Object.keys(csrList);
        for (let i=0; i<ids.length; i++) {
            let id = ids[i];
            let entry = csrList[id].crimeCsr;
            let crimeKeys = Object.keys(entry);
            for (let j=0; j<crimeKeys.length; j++) {
                let crimeAka = crimeKeys[j];
                let crime = entry[crimeAka];
                let roleKeys = Object.keys(crime);
                for (let k=0; k<roleKeys.length; k++) {
                    let role = roleKeys[k];
                    crime[role] = 0;
                }
            }
        }
    }

    var lastTornTime = 0;
    function csrCrimesCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        let crimes = jsonObj.crimes;


        if (jsonObj.error) {
            console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
            return;
        }

        let allDone = false;
        let last = crimes[crimes.length-1];
        let first = crimes[0];
        let newestDate = last.created_at;

        if (logCsrData == true) {
            log("first: ", first.created_at, "|", new Date(+first.created_at*1000).toString());
            log("last: ", last.created_at, "|", new Date(+last.created_at*1000).toString());
            log("newest: ", newestDate, "|", new Date(+newestDate*1000).toString());
            log("crimes cb lastCsrCheckDate: ", lastCsrCheckDate, "|", lastTornTime, "|param: ", param);
            log("Num crimes: ", crimes.length);
        }

        // Iterate each crime
        //crimes.forEach(function (crime, idx) {
        var csrTimestamp = 0;
        var lastCsrTimestamp = 0;
        for (let idx=0; idx<crimes.length; idx++) {
            let crime = crimes[idx];
            csrTimestamp = crime.created_at;

            // ========= debugging ==========
            if (lastCsrTimestamp != 0) {
                if (lastCsrTimestamp > csrTimestamp) {
                    debug("Timestamps not in sequence? ", lastCsrTimestamp, "|", csrTimestamp);
                }
                lastCsrTimestamp = csrTimestamp;
            }

            if (csrTimestamp < lastTornTime) {
                log("ERROR: Crime older than from date? ",
                    csrTimestamp, "|", csrTimestamp);
                debugger;
            }
            // ==============================

            if (csrUpdating == true && lastCsrCheckDate > csrTimestamp) {
                debug("Hit older date, all done!");
                allDone = true;
                break;
            }

            if (csrTimestamp > newestDate) {
                debug("Found newer date!! : ", idx, csrTimestamp, newestDate);
                newestDate = csrTimestamp;
                debugger;
            }

            let aka = crimeDefsTable[crime.difficulty][crime.name] ?
                       crimeDefsTable[crime.difficulty][crime.name].aka :
                       (crime.name in nicknames) ? nicknames[crime.name] : null;

            if (!aka) debugger;

            let slots = crime.slots;

            // Won't be a csr if the  min level has been filtered...
            let missingCsr = 0;
            for (let idx = 0; idx < slots.length; idx++) {
                let slot = slots[idx];
                let id = slot.user_id; if (!id) {continue;}
                let entry = csrList[id]; if (!entry) {continue;}
                let userCsrs = entry.crimeCsr[aka];

                if (!userCsrs) {
                    missingCsr++;
                    entry.crimeCsr[aka] = 0;
                    debug("No csr! aka: '", aka, "' entry: ", entry, "' name: ", crime.name, "'");
                    continue;
                }

                let currChance = parseInt(csrList[id].crimeCsr[aka][slot.position]);
                let newChance = parseInt(slot.success_chance);
                if (newChance > currChance)
                    csrList[id].crimeCsr[aka][slot.position] = slot.success_chance;
            }
            if (missingCsr > 0) writeCsrList();
        }

        if (logCsrData) logt("after cb: ", csrList);

        // See if we need to continue, we only get max 100...
        // Do as a timeout so we don't recurse?
        if (allDone == false && csrUpdating == false && crimes.length == 100) {
            setTimeout(getMemberCsrValuesFrom, 250, newestDate);
            return;
        }

        lastCsrCheckDate = newestDate;
        handleCsrListUpdateComplete(newestDate);
    }

    function getMemberCsrValuesFrom(from) {
        if (logCsrData) logt("getMemberCsrValuesFrom from ", from, "|", from, new Date(Number(from)*1000).toString());

        var options = {"from": from, "offset": "0", "sort": "ASC", param: from};
        xedx_TornFactionQueryv2("", "crimes", csrCrimesCb, options);
    }

    function updateMemberCsrList() {
        debug("updateMemberCsrList");
        if (trackMemberCsr != true) {
            debug("Crime Succes Rate tracking not enabled!");
            return;
        }
        if (!isOcPage()) {
            return debug("Not on crimes page, going home");
        }
        if (csrInitializing == true) {
            console.error("Error: can't update while initializing!");
            return;
        }
        csrUpdating = true;
        lastCsrCheckDate = GM_getValue(lastCsrDateKey, lastCsrCheckDate);
        debug("updateMemberCsrList: ", lastCsrCheckDate);
        if (lastCsrCheckDate == 0) {
            if (confirm("The Crime Success Rate table hasn't been initialized. " +
                        "Initialize now?")) {
                debugger;
                initializeMemberCsrValues();
                return;
            }
        }
        getMemberCsrValuesFrom(lastCsrCheckDate);
    }

    function checkIfNeedCsrUpdate() {
        if (!isOcPage()) return;
        if (trackMemberCsr != true) return;
        let now = new Date().getTime();
        let lastUpd = GM_getValue("lastUpdated", 0);
        if (lastUpd == 0) {
            initializeMemberCsrValues();
        }

        let minAgo = minutesAgo(lastUpd);
        debug("min ago for csr update: ", minAgo.toFixed(2));
        if (minAgo > csrListRefreshMins)
            updateMemberCsrList();
    }

    // Reset list from X days back, default 14.
    // Will be notified when complete.
    function initializeMemberCsrValues() {
        if (trackMemberCsr != true) {
            alert("Crime Succes Rate tracking not enabled!");
            return;
        }
        if (csrUpdating == true) {
            console.error("Error: can't initialize while updating!");
            return;
        }

        displaySpinner($("#x-opts-click"), "oc-csr-spinner");

        csrInitializing = true;
        let daysToGet = (initCsrDays > 0 && initCsrDays < 60) ? initCsrDays : 14;
        let nowTime = new Date().getTime();
        let fromTime = nowTime - (daysToGet*24*60*60*1000);
        let tornTime = parseInt(fromTime/1000);

        logt("initializeMemberCsrValues past", daysToGet, " days, from ", new Date(fromTime).toString());

        // quick cheat as a test (test that the param matches the global)
        lastTornTime = tornTime;
        var options = {"from": tornTime, "offset": "0", "sort": "ASC", param: tornTime};
        xedx_TornFactionQueryv2("", "crimes", csrCrimesCb, options);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //if (isAttackPage()) return log("Won't run on attack page!");  // Moved to top
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();

    if (xedxDevMode) log("Dev Mode enabled");
    if (debugLoggingEnabled) log("Debug Logging enabled");

    versionCheck();
    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);
    callOnVisibilityChange(handleVisibilityChange);

    // This gets member list as well as "is in an OC" flag, no longer need recruit/planning
    // data for this. But, do need to find our own crime for time until info.
    getFacMembers();

    if (trackMemberCsr == true)
        checkIfNeedCsrUpdate();

    //if (!isOcPage()) {
    //    if (trackMyOc == true) {
    //        getDisplayTimeUntilOc();
    //    }
    //    return log("Not on crimes page, going home");
    //}

    callOnContentComplete(handlePageLoad);

    // ========================= UI stuff ===============================

    function handleOptsMenuCb(e) {
        GM_setValue($(this).attr('name'), $(this)[0].checked);
        updateOptions();
        if ($(this).attr("data-run"))
            doOptionMenuRunFunc($(this).attr("data-run"));

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

    function handleOptInputClick(e) {
        let target = $(e.currentTarget);
        let fnName = $(this).attr("data-run");

        if (!fnName) {
            let ip = $(target).find(".oc-type-input");
            fnName = $(this).attr("data-run");
        }

        if (fnName) doOptionMenuRunFunc(fnName);
    }

    function handleOptInput(e) {
        let target = $(e.currentTarget);
        let key = $(target).attr("name");
        let value = $(target).val();
        let fnName = $(this).attr("data-run");

        if (!key || !value) {
            debugger;
            let ip = $(target).find(".oc-type-input");
            if (!key) key = $(ip).attr("name");
            if (!value) value = $(ip).val();
            if (!fnName) fnName = $(this).attr("data-run");
        }

        GM_setValue(key, value);
        updateOptions();

        if (fnName) doOptionMenuRunFunc(fnName);
    }

    function addOptionsHandlers() {
        $(".ctrl-wrap").parent().on('click', handleCtrlFuncs);
        $(".oc-type-href").on('click', handleOptHrefClick);
        $(".oc-type-input").on('change', handleOptInput);
        $(".oc-type-input-has-fn").on('click', handleOptInputClick);
        $(".oc-type-cb").on('change', handleOptsMenuCb);
    }

    function getTableRowContent(entry, style) {
        let content;
        switch (entry.type) {
            case "title": {
                break;
            }
            case "href": {
                content = `<td class="${style}">
                               <span class="oc-type-href ctext ${entry.xttCl}" href="${entry.href}">${entry.name}</span>
                           </td>`;
                break;
            }
            case "cb": {
                content = `<td class="${style} cb-wrap" colspan="2">
                               <input id="${entry.id}" class="oc-type-cb ${entry.xttCl}"` +
                                  (entry.fnName ? ` data-run="${entry.fnName}" ` : ``) +
                                  ` type="checkbox" data-index="${entry.idx}" name="${entry.key}">
                                  <span>${entry.name}</span>
                           </td>`;
                break;
            }
            case "input": {
                let parts = entry.name.split("#");
                content = `<td class="${style} input-wrap oc-type-input-has-fn" data-run="${entry.fnName}" colspan="2">
                               <span class="oc-input-text ctext">${parts[0]}</span>
                               <input id="${entry.id}" type="number" class="oc-type-input ${entry.xttCl}"` +
                                  (entry.fnName ? ` data-run="${entry.fnName}" ` : ``) +
                              ` min="0" max="${entry.max}" name="${entry.key}">
                               <span class="oc-input-text2 ctext">${parts[1]}</span>
                          </td>`;
                break;
            }
            case "ctrl": {
                content = `<td class="${style}" colspan="2">
                               <span class="ctrl-wrap">
                                   <span id='${entry.id}' class="oc-type-ctrl ctext ${entry.xttCl}" data-run="${entry.fnName}">${entry.name}</span>
                               </span>
                           </td>`;
                break;
            }
            case "combo": {
                let parts = entry.name.split("#");
                content = `<td class="${style} oc-type-combo">
                               <input id="${entry.id.cb}" type="checkbox" class="oc-type-cb ${entry.xttCl}" name="${entry.key.cb}">
                               <span class="oc-input-text ctext">${parts[0]}</span>
                               <input id="${entry.id.input}" type="number" class="oc-type-input" min="0" name="${entry.key.input}">
                               <span class="oc-input-text2 ctext">${parts[1]}</span>
                           </td>`;
                break;
            }
            default: {
                log("Internal error: unknown enty type '", entry.type, "'");
                debugger;
                break;
            }
        }

        return content;
    }

    function installOptionsPane() {
        optionsTable = $(`
              <table id="x-opts-table"><tbody></tbody></table>
        `);

        let countLi = 0;
        for (let idx=0; idx<menuItems.length; idx++) {
            let entry = menuItems[idx];
            if (entry.enabled == false) continue;
            if (entry.validOn != "both" && entry.validOn != "full") {
                continue;
            }

            entry.xttCl = "xtt-" + countLi;
            entry.idx = idx;

            let content = getTableRowContent(entry, "c12");
            if (!content) continue;

            let tableRow = $(`<tr class="title-black ctext title-wrap">${content}</tr>`);

            let ttNode;
            if (!disableToolTips && entry.tooltip) {
                ttNode = $(tableRow).find(`.${entry.xttCl}`);
                displayHtmlToolTip($(ttNode), entry.tooltip, "tooltip6");
                $(ttNode).css("z-index", 125);
            }

            $(optionsTable).find("tbody").append($(tableRow));

            countLi++;
        }

        // Repeat for CSR opts on right side of table.
        let rowIdx = 1;
        for (let idx=0; idx<csrMenuOptions.length; idx++) {
            let entry = csrMenuOptions[idx];
            if (entry.enabled == false) continue;
            if (entry.validOn != "both" && entry.validOn != "full") {
                continue;
            }

            entry.xttCl = "xtt-" + countLi;
            entry.idx = idx;

            let content = getTableRowContent(entry, "c34");
            if (!content) continue;


            let sel = "tbody > tr:nth-child(" + rowIdx + ")";
            let row = $(optionsTable).find(sel);
            $(row).append($(content));
            rowIdx++;
        }

        //let remains = menuItems.length - csrMenuOptions.length;
        let dummyLi = `<td  class="c12" colspan="2"> </td>`;
        for (; rowIdx < menuItems.length; rowIdx++) {
            let sel = "tbody > tr:nth-child(" + rowIdx + ")";
            let row = $(optionsTable).find(sel);
            $(row).append($(dummyLi));
        }


        addOptsMenuStyles();

        $("#oc-hide").prop('checked', hideLvl);
        $("#oc-hide-lvl").val(hideLvlVal);
        $("#oc-min-avail").prop('checked', warnMinLvl);
        $("#oc-min-lvl").val(warnMinLvlVal);

        $("#warn-no-oc").prop('checked', warnOnNoOc);
        $("#notify-soon").prop('checked', notifyOcSoon);
        $("#soon-min").val(notifyOcSoonMin);
        $("#keep-on-top").prop('checked', keepOnTop);
        $("#disable-tool-tips").prop('checked', disableToolTips);
        $("#scroll-lock").prop('checked', scrollLock);

        $("#track-my-oc").prop('checked', trackMyOc);
        $("#ts-complete").prop("checked", timestampComplete);

        $("#track-csr").prop('checked', trackMemberCsr);
        $("#csr-min-lvl").val(lowestCsrLevel);
        $("#init-csr-days").val(initCsrDays);

        function addOptsMenuStyles() {

            GM_addStyle(`
                 #x-opts-table {
                     table-layout: fixed;
                     width: 100%;
                     opacity: 0;
                     border-collapse: collapse;

                 }
                 #x-opts-table tr {
                     background: linear-gradient(180deg, #999999 0%, #333333 100%);
                     width: 99%;
                     margin-left: auto;
                     height: 36px;
                     font-size: 14px;
                     font-family: arial;
                     color: white;
                     display: flex;
                     float: left;
                     padding: 0px;
                 }
                 #x-opts-table tr span,
                 #x-opts-table tr td {
                     color: white !important;
                 }

                 #x-opts-table tr:first-child {
                      margin-top: 4px;
                 }
                 #x-opts-table tr:last-child {
                     /*margin-bottom: 4px;*/
                 }

                 #x-opts-table tr td:hover {
                     filter: drop-shadow(2px 4px 6px black);
                 }
                 #x-opts-table tr td:active {
                     background: linear-gradient(180deg, #222222 0%, #333333 50%, #777777 100%);
                 }
                 #x-opts-table tr td {
                     /*border-right: 1px solid #333 !important;*/
                 }
                 #x-opts-table tr td:first-child {
                     display: block;
                     border-right: 1px solid #333 !important;
                 }
                 #x-opts-table tr td input[type='number'] {
                     background: #fff;
                     height: 20px;
                     width: 30px;
                     align-content: center;
                     display: inline-flex;
                     flex-wrap: wrap;
                     padding-left: 4px;
                     color: #333;
                 }
                 .oc-type-cb {
                     margin: 0px 10px 0px 10px;
                 }
                 td:first-child .oc-type-ctrl {
                     margin-left: 42px;
                 }
                 .oc-type-combo {
                     display: flex;
                 }

                 .c1{width: 50px; }
                 .c12{width: 400px; }
                 .c2{width: 372px; }
                 .c3{width: 120px; }
                 .c4{width: 200px; }
                 .c34{width: 400px; }

                 .c34 .ctrl-wrap,
                 .c34 .oc-type-href,
                 .c34.input-wrap .oc-input-text {
                     padding-left: 40px;
                 }
            `);

            GM_addStyle(`
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

                .title-wrap {
                   width: 100%;
                }
           `);
        }
    }

    // ================= Member Crime Success Rate (CSR) table ============

    var currentCrimeRoles;

    // Verify all these are used, move fn to end...
    function addCsrStyles() {
        GM_addStyle(`
            .csr-hdr-wrap {
                display: flex;
                flex-flow: row wrap;
                height: 38px;
                background: var(--tabs-bg-gradient);
            }
            .csr-hdr-wrap select {
                /*width: fit-content;*/
                width: 250px;
                border-radius: 5px;
                padding-left: 5px;
            }
            .xhw1 {
                align-content: center;
                justify-content: center;
                width: 100%;
            }
            .xhw2 {
                align-content: center;
                justify-content: center;
                width: 100%;
                padding-left: 15px;
            }
            .csr-hdr-span1, #sel-crime {
                flex-flow: row wrap;
                align-content: center;
                display: flex;
                padding-left: 15px;
                /*width: 100%;*/
                height: 36px;
            }
            .csr-hdr-span2 {
                flex-flow: row wrap;
                align-content: center;
                display: flex;
                /*padding-left: 15px;*/
                width: 799px;
                height: 36px;
            }
            .csr-hdr-span2 span {
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                align-content: center;
            }

            #x-csr-table {
                display: flex;
                flex-direction: column;
                opacity: 0;
                width: 100%;
            }
            #csr-tbody {
                overflow-x: hidden;
            }
            #x-csr-table tr, .hdr-span {
                width: 100%;
                display: flex;
                flex-flow: row wrap;
                border-collapse: collapse;
            }
            #x-csr-table tr {
                padding-left: 15px;
            }

            #x-csr-table tr td {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-content: center;
                text-align: center;
                color: var(--default-color);
                /*width: 110px;*/
                width: 13%;
                height: 34px;
                border-collapse: collapse;
                border: 1px solid #666;
                cursor: pointer;
                border-bottom: none;
            }
            #x-csr-table tr td span {
                color: var(--default-color);
                font=family: arial;
                font-size: 12px;
            }
            #x-csr-table tr:last-child td {
                border-bottom: 1px solid #666;
            }
            #x-csr-table tr td:first-child {
                justify-content: left;
                width: 16%;
            }
            .csr-name {
               padding-left: 5px;
            }
            .csr-name:hover {
                color: var(--default-blue-color) !important;
            }
            .cc1 {/*width: 120px;*/}
            .cc2, .cc3, .cc4, .cc5, .cc6, .cc7 {/*width: 110px;*/}
            .w13p {width: 13%;}
            .w16p {width: 16%;}
            .xpl15 {padding-left: 15px;}
            .xpl5 {padding-left: 5px;}

            tr.no-oc td, tr.no-oc span {color: yellow !important;}
            tr.my-id td, tr.my-id span {background-color: rgba(108,195,21,.07);}
        `);
    }

    function getMemberCsrArray(id, crimeSelect, roles) {
        const emptyCsrArr = [0, 0, 0, 0, 0, 0];
        let lastIdx = 0;
        let csrArray = [];
        let roleArray = roles;

        if (!(crimeSelect in nicknames)) {
            console.error("Selected crime ", crimeSelect, " nickname NOT found in ", nicknames);
            return emptyCsrArr;
        }
        let aka = nicknames[crimeSelect];

        if (!roles) {
            if (!(crimeSelect in roleLookup)) {
                console.error("Selected crime array not found!");
                return emptyCsrArr;
            }
            roleArray = roleLookup[crimeSelect];
        }

        roleArray.forEach(function(role, idx) {
            let csr = getCsrListEntry(id, aka, role);
            csrArray.push(csr);
            lastIdx = idx;
        });

        for (let idx=lastIdx+1; idx < 6; idx++) csrArray.push(0);
        return csrArray;
    }

    function getCsrMemberRow(id, crimeSelect) {
        let member = csrList[id];
        let notInOc = (membersNotInOc[id] != undefined);

        if (!member || !member.name) {
            log("ERROR!!!");
            debugger;
        }
        let aka = nicknames[crimeSelect];
        let name = member.name;

        let csrEntry = member.crimeCsr[aka];
        let csrArr = getMemberCsrArray(id, crimeSelect);
        let defCsr = '?';
        let addlClass = (notInOc == true) ? 'no-oc' : '';
        if (userId == id) addlClass = addlClass + " my-id";
        let newRow = `<tr id='${id}-tr' class='${addlClass}'>
                          <td class="cc1"><span class='csr-name' data-id="${id}" data-sort="${name}">${name} [${id}]</span></td>
                          <td class="cc2" data-sort="${csrArr[0]}">${csrArr[0]}</td>
                          <td class="cc3" data-sort="${csrArr[1]}">${csrArr[1]}</td>
                          <td class="cc4" data-sort="${csrArr[2]}">${csrArr[2]}</td>
                          <td class="cc5" data-sort="${csrArr[3]}">${csrArr[3]}</td>
                          <td class="cc6" data-sort="${csrArr[4]}">${csrArr[4]}</td>
                          <td class="cc7" data-sort="${csrArr[5]}">${csrArr[5]}</td>
                      </tr>`;

        return $(newRow);
    }

    // Need to set currentCrimeRoles...
    function updateCsrTable(table, crimeSelect) {
        let keys = Object.keys(csrList);
        let body = $(table).find("tbody");

        $(body).empty();
        for (let idx=0; idx < keys.length; idx++) {
            let id = keys[idx];
            let entry = csrList[id];
            let row = getCsrMemberRow(id, crimeSelect);

            $(body).append(row);

        }

        $(".csr-name").on('click', function(e) {
            let target = $(e.currentTarget);
            let id = $(target).attr("data-id");
            let url = `https://www.torn.com/profiles.php?XID=${id}`;
            openInNewTab(url);
        });
    }

    function handleCrimeSelect(e) {
        let sel = $("#sel-crime select").find("option:selected");
        GM_setValue("csrSelectVal", $(sel).val());

        let roleList = $(".csr-hdr-span2  [class*='csr-role']");
        let key1 = $(sel).attr("data-idx");
        let crimeName = $(sel).val();
        let entry = crimeDefsTable[key1];
        if (!entry) {
            debugger;
            return;
        }

        let crime = entry[crimeName];
        currentCrimeRoles = crime.roles;
        let lastIdx = 0;
        currentCrimeRoles.forEach(function(val, idx) {
            $(roleList[idx]).text(val);
            lastIdx = idx;
        });
        for (let idx=lastIdx+1; idx < $(roleList).length; idx++) $(roleList[idx]).text("---");

        // Now need to update table, change the cell values...
        // Are the values updated yet?
        debug("handleCrimeSelect, update table for ", crimeName, "|", $("#x-csr-table"));
        updateCsrTable($("#x-csr-table"), crimeName);
    }

    function handleCsrHdrSort(e) {
        let target = $(e.currentTarget);
        $(".role-btn").removeClass("active");
        $(target).addClass("active");
        let idx = $(target).index();
        sortAndSwapCsrTable(idx+1);
        return false;
    }

    function addCsrHandlers() {
        $("#sel-crime select").change(handleCrimeSelect);
        $("span[class*='role-btn']").on('click', handleCsrHdrSort);

    }

    function getCsrHdr() {
        let csrHdr =
            `<div id="csr-table-hdr">
                  <div class='csr-hdr-wrap xhw1'>
                      <span class='csr-hdr-span1'>Select crime:</span>
                      <div id="sel-crime">
                          <select>

                          </select>
                      </div>
                  </div>
                  <div class="csr-hdr-wrap2 xhw2">
                      <span class='csr-hdr-span2' style="width: 749px; border: 1px solid red;">
                          <span class="role-btn" style="width: 124px;">Roles:</span>
                          <span id="csr-role1" class="csr-role1 role-btn" style="width: 104px;">s13</span>
                          <span id="csr-role2" class="csr-role2 role-btn" style="width: 104px;"">s13</span>
                          <span id="csr-role3" class="csr-role3 role-btn" style="width: 104px;"">s13</span>
                          <span id="csr-role4" class="csr-role4 role-btn" style="width: 104px;"">s13</span>
                          <span id="csr-role5" class="csr-role5 role-btn" style="width: 104px;"">s13</span>
                          <span id="csr-role6" class="csr-role6 role-btn" style="width: 104px;"">s13</span>
                      </span>
                  </div>
              </div>
              `;

        let node = $(csrHdr);
        let select = $(node).find("select");

        let keys = Object.keys(crimeDefsTable);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            if (parseInt(key) < lowestCsrLevel) continue;
            let entry = crimeDefsTable[key];
            let keys2 = Object.keys(entry);
            for (let j=0; j<keys2.length; j++) {
                let key2 = keys2[j];
                let crime = entry[keys2[j]];
                if (!crime || crime.enabled == false) continue;
                let opt = `<option data-idx="${key}" value="${key2}">${key2}</option>`;
                $(select).append(opt);
            }
        }

        $(select).val(defCsrSelectVal);

        return node;
    }

    function installCsrTable() {
        addCsrStyles();
        let csrBody = `<tbody id="csr-tbody"></tbody>`;
        csrTable = $(`
              <table id="x-csr-table">
              </table>
        `);

        $(csrTable).append(getCsrHdr());
        $(csrTable).append(csrBody);
        updateCsrTable($(csrTable), defCsrSelectVal);
    }

    if (false) {
        // updateMemberCsrList
        function eraseCsrMembersList(membersArray) {
            if (logCsrData) log("eraseCsrMembersList: ", membersArray.length, csrList.length);

            for (let idx=0; idx<membersArray.length; idx++) {

                log("**** ERASING list! 1");
                let member = membersArray[idx];
                let id = member.id;
                let name = member.name;
                if (csrList.id) continue;
                csrList[id] = {name: name};
                csrList[id].crimeCsr = {};
                csrList[id].crimeCsr["mm"] = {};
                csrList[id].crimeCsr["pp"] = {"Kidnapper": 0, "Muscle": 0, "Picklock": 0};
                csrList[id].crimeCsr["cm"] = {"Lookout": 0, "Thief": 0};
                csrList[id].crimeCsr["pm"] = {"Kidnapper": 0, "Muscle": 0, "Picklock": 0};
                csrList[id].crimeCsr["mf"] = {"Enforcer": 0, "Negotiator": 0, "Lookout": 0, "Arsonist": 0, "Muscle": 0};
                csrList[id].crimeCsr["sf"] = {"Lookout": 0, "Enforcer": 0, "Sniper": 0, "Muscle": 0};
                csrList[id].crimeCsr["lt"] = {"Techie": 0, "Impersonator": 0, "Negotiator": 0};
                csrList[id].crimeCsr["ht"] = {"Enforcer": 0, "Muscle": 0};
                csrList[id].crimeCsr["bp"] = {"Picklock": 0, "Hacker": 0, "Engineer": 0, "Bomber": 0, "Muscle": 0};
                csrList[id].crimeCsr["bb"] = {"Thief": 0, "Muscle": 0, "Robber": 0};
                csrList[id].crimeCsr["gw"] = {};
                csrList[id].crimeCsr["ss"] = {};
                csrList[id].crimeCsr["bc"] = {};
            }

            if (logCsrData) log("eraseCsrMembersList, done: ", csrList.length, csrList);

            writeCsrList();
        }
    }

    // ========================= Table Management ==========================

    function detachTable(tableName) {
        //debug("Detach table: ", tableName, activeTable);
        var selector;
        switch (tableName)
        {
            case membersTableName: {
                if ($("#x-no-oc-table").length) membersNotInOcTable = $("#x-no-oc-table").detach();
                break;
            }
            case optsTableName: {
                if ($("#x-opts-table").length) optionsTable = $("#x-opts-table").detach();
                break;
            }
            case csrTableName: {
                if ($("#x-csr-table").length) csrTable = $("#x-csr-table").detach();
                break;
            }
            default: {
                console.error("Invalid table name ", tableName);
                return;
            }
        }
        activeTable = null;
    }

    // Funky sorting required for tables. Fake out with a UL & LI's instead
    function doPresort() {
        $("#x-temp-csr-div").remove();
        let sortableTable = $("<div  id='x-temp-csr-div' style='display: none; left: top: -8000;'><ul id='x-temp-csr'></ul></div>");
        $("body").after(sortableTable);

        let nodeList = $("#csr-tbody > tr");
        for (let idx=0; idx<nodeList.length; idx++) {
            let wrap = $("<li></li>");
            let tr = nodeList[idx];
            $(wrap).append($(tr).clone(true));
            $("#x-temp-csr").append($(wrap));

        }
    }

    var nameSortOrder = 1;
    function sortAndSwapCsrTable(index) {
        doPresort();

        let sel = (index == 1) ? "tr > td:first-child > span" : `tr td:nth-child(${index})`;

        if (index == 1) {
            tinysort($("#x-temp-csr > li"),
                 {selector: sel, order: csrSortOrders[nameSortOrder]});
            nameSortOrder = nameSortOrder ? 0 : 1;
        } else {
            tinysort($("#x-temp-csr > li"),
                 {selector: sel, attr: 'data-sort', order: csrSortOrders[csrSort]});
        }

        let newList = $("#x-temp-csr > li > tr");
        let currList = $("#csr-tbody > tr");

        for (let idx=0; idx<newList.length; idx++) {
            let trNew = $($(newList)[idx]).detach();
            $($(currList)[idx]).replaceWith($(trNew));
        }

        let keepOnTop = true;
        if (keepOnTop) {
            $("#csr-tbody").prepend($(`#${userId}-tr`).detach());
        }
    }

    function attachTable(tableName) {
        if (activeTable)
            detachTable(activeTable);

        switch (tableName) {
            case membersTableName: {
                $("#x-oc-tbl-wrap").append(membersNotInOcTable);
                $("#x-no-oc-table").animate({"opacity": 1}, 250);
                addMembersTableHandlers();
                break;
            }
            case optsTableName: {
                $("#x-oc-tbl-wrap").append(optionsTable);
                $("#x-opts-table").animate({"opacity": 1}, 250);
                updateOptions();
                addOptionsHandlers();
                break;
            }
            case csrTableName: {
                if (!csrTable)
                    debugger;
                $("#x-oc-tbl-wrap").append(csrTable);
                addCsrHandlers();
                handleCrimeSelect();
                updateCsrTable($("#x-csr-table"), defCsrSelectVal, currentCrimeRoles);

                $("#x-csr-table").animate({"opacity": 1}, 250);
                break;
            }
            default: {
                console.error("Unknown table!");
                return;
            }
        }
        activeTable = tableName;
    }

    var inOpen = false;
    function resetOpenFlag(){inOpen = false;}

    function closeTable(tableName) {
        if (tableName != activeTable) {
            debugger;
            return;
        }
        detachTable(tableName);
        return false;
    }

    // Also detaches any active table. If the active/open
    // table are the same, just close it.
    function openTable(tableName) {
        if (inOpen == true) return false;
        inOpen = true;
        setTimeout(resetOpenFlag, 500);

        if (activeTable == tableName)
            return closeTable(tableName);
        attachTable(tableName);
        return false;
    }

    // ============================ Misc UI components ====================

    // Main outer wrap - title bar plus table wrap beneath
    function addContentDiv() {
        if (!isOcPage()) return;

        addContentWrapStyles();

        let contentWrap = `
            <div id="oc-assist-content-wrap" class="sortable-box t-blue-cont h">
                <div id="x-oc-can-click" class="hospital-dark top-round scroll-dark" role="table" aria-level="5">
                    <div class="ocbox refresh"><span id='x-oc-click'>Available Members</span></div>
                    <div class="ocbox"><span id='x-opts-click'>Options</span></div>
                    <div class="ocbox"><span id='x-rates-click'>Success Rates</span></div>
                </div>
                <div id='x-oc-tbl-wrap' class="x-oc-wrap cont-gray bottom-round">

                </div>
            </div>
         `;

        $("#faction-crimes").before(contentWrap);

        $("#x-oc-can-click > .ocbox.refresh").on('contextmenu', refreshmembersNotInOc);

        var cwStyles = false;
        function addContentWrapStyles() {
            if (cwStyles == true) return;
            cwStyles = true;
            GM_addStyle(`
                #x-oc-tbl-wrap {
                    position: relative;
                    cursor: pointer;
                    overflow-y: scroll;
                    border-radius: 0px 0px 4px 4px;
                    padding: 0px;
                    width: 100%;
                    justify-content: center;
                    display: flex;
                }
                #x-oc-tbl-wrap tbody {
                    overflow-y: scroll;
                    max-height: 150px;
                    display: block;
                    width: 100%;
                }
                #x-oc-tbl-wrap tr {
                    height: 30px;
                    margin: 0px auto 0px auto;
                }
                #x-oc-tbl-wrap tr li {
                    width: 100%;
                }
           `);
        }
    }

    // Btn to toggle sort direction
    function installSortBtn() {
        let sortBtn = $(toggleBtn);
        $(sortBtn).attr("id", "xocsort");
        $("#x-oc-can-click").append($(sortBtn)[0]);
        $("#xocsort").on('click', toggleSort);

        displayHtmlToolTip($("#xocsort"), "Sort direction", "tooltip5");
        displayHtmlToolTip($("#x-oc-click").parent(), "Right click to refresh", "tooltip5");
    }

    // Main UI install entry point
    function installUI() {

        addContentDiv();
        installSortBtn();
        installMembersTable();
        installOptionsPane();

        installCsrTable();

        // Button handlers
        $("#x-opts-click").on("click", function () {
            if ($("#x-opts-click").parent().hasClass("active"))
                $("#x-opts-click").parent().removeClass("active");
            else {
                $(".ocbox").removeClass("active");
                $("#x-opts-click").parent().addClass("active");
            }
            openTable(optsTableName);
        });

        $("#x-oc-click").on("click", function() {
            if ($("#x-oc-click").parent().hasClass("active"))
                $("#x-oc-click").parent().removeClass("active");
            else {
                $(".ocbox").removeClass("active");
                $("#x-oc-click").parent().addClass("active");
            }
            openTable(membersTableName);
        });

        $("#x-rates-click").on('click',  function() {
            if ($("#x-rates-click").parent().hasClass("active"))
                $("#x-rates-click").parent().removeClass("active");
            else {
                $(".ocbox").removeClass("active");
                $("#x-rates-click").parent().addClass("active");
            }
            openTable(csrTableName);
        });

        if (scrollLock)
            addScrollLock();

    }

    // =================== Optional scroll lock on page ====================================
    function toggleScrollLock() {
        let wrap = $($("#faction-crimes-root > div [class^='wrapper_']")[0]).parent();
        $(wrap).toggleClass("xscrollLock");
    }

    var slAdded = false;
    function addScrollLock(retries=0) {
        let wrap = $($("#faction-crimes-root > div [class^='wrapper_']")[0]).parent();
        if (!$(wrap).length) {
            if (retries++ < 20) return setTimeout(addScrollLock, 250, retries);
            return log("Couldn't add scroll lock!");
        }

        if (!slAdded) addScrollLockStyles();
        $(wrap).addClass("xscrollLock");

        function addScrollLockStyles() {
            if (slAdded == true) return;
            slAdded = true;
            GM_addStyle(`
               .xscrollLock {
                   max-height: 90vh;
                   overflow-y: auto;
                   top: 0px;
                   position: sticky;
               }
            `);
        }
    }

    // ======================= Table of members not in an OC ========================

    function createMembersTable() {
        let membersTable = `
              <table id="x-no-oc-table" style="width: 782px; opacity: 0;">
                  <tbody>

                  </tbody>
              </table>
        `;

        membersNotInOcTable = $(membersTable);

    }

    var memHandlersAdded = false;
    function addMembersTableHandlers() {
        if (memHandlersAdded == true) return;  // just once
        memHandlersAdded = true;

        // On click,  open profile in new tab
        $(".xoctd").on('click', function (e) {
            let target = $(e.currentTarget);
            let id = $(target).attr("data-id");
            let href="/profiles.php?XID=" + id;
            window.open(href, "_blank");
        });
    }

    function updateMembersTableData() {
        $(membersNotInOcTable).find("tbody > tr").remove();

        let done = false;
        let tr = "<tr class='xoctr'>";
        let keys = Object.keys(membersNotInOc);
        for (let idx=0; idx < keys.length || done == true;) {
            for (let j=idx; j < idx+5; j++) {
                let id = keys[j];
                let name = membersNotInOc[id];
                if (!id) {
                    done = true;
                    tr += "<td><span></span></td>";
                } else {
                    let addedStyle = (id == userId) ? `style='color: limegreen;'` : ``;
                    tr += "<td data-id='" + id + "' class='xoctd'><span " + addedStyle + ">" + name + " [" + id + "]</span></td>";
                }
            }
            tr += "</tr>"
            $(membersNotInOcTable).find("tbody").append($(tr));
            tr = "<tr>";
            idx += 5;
            if (done == true || idx >= keys.length) break;
        };
    }

    // 'Available Members' table, those not in an OC
    function installMembersTable(from, retries=0) {
        addMembersTableStyles();
        createMembersTable();
        updateMembersTableData();

        // Local fn to add styles, once.
        var mtStyles = false;
        function addMembersTableStyles() {
            if (mtStyles == true) return;  // Safety net, don't want duplicate
            mtStyles = true;

            // Members missing OC's table styles
            GM_addStyle(`
                #x-no-oc-table {
                    margin: 15px 20px 15px 20px;
                }
                #x-no-oc-table tr {
                    display: flex;
                    flex-direction: row;
                    width: 100%;
                    height: 30px;
                    margin: 0px auto 0px auto;
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
            `);

            GM_addStyle(`#x-no-oc-table tr:first-child td:first-child {border-top-left-radius: 10px;}`);
            GM_addStyle(`#x-no-oc-table tr:first-child td:last-child {border-top-right-radius: 10px;}`);
            GM_addStyle(`#x-no-oc-table tr:last-child td:first-child {border-bottom-left-radius: 10px;}`);
            GM_addStyle(`#x-no-oc-table tr:last-child td:last-child {border-bottom-right-radius: 10px;}`);
        }
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
        addFlexStyles();
        addBorderStyles();
        addButtonStyles();

        // This  is for the right-click "Refresh" option....
        GM_addStyle(`
            .custom-menu {
                display: none;
                z-index: 1000;
                position: absolute;
                overflow: hidden;
                border: 1px solid green;
                white-space: nowrap;
                font-family: sans-serif;
                background: #ddd;
                color: #333;
                border-radius: 5px;
                padding: 0;
            }

            .custom-menu li {
                padding: 8px 12px;
                cursor: pointer;
                list-style-type: none;
                transition: all .3s ease;
                user-select: none;
            }

            .custom-menu li:hover {
                background-color: #DEF;
            }
        `);

        // 16% could be 124px ?? ... csr header
        GM_addStyle(`
            .csr-hdr-span2 {filter: brightness(.6);}

            .role-btn {
                display: flex;
                align-content: center;
                flex-wrap: wrap;
                background: var(--tabs-bg-gradient);
                border: none;
                color: var(--tabs-color);
                font-weight: 700;
                font-size: 14px;
                height: 36px;
            }
            .role-btn:hover {
                box-shadow: 0 12px 16px 0 rgba(0,0,0,0.24), 0 17px 50px 0 rgba(0,0,0,0.19);
            }
            .role-btn.active {
                background: var(--tabs-active-bg-gradient);
            }
        `);

        GM_addStyle(`

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
                cursor: pointer;
                width: 30px;
                opacity: 1;
                visibility: visible;
                transition: all .2s ease-in-out;
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
            #oc-assist-content-wrap {
                margin-top: 8px;
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
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
            #x-oc-click, #x-opts-click, #x-rates-click  {
                border-radius: 4px;
                padding: 10px 30px 10px 20px;
            }
            .ocbox {
                width: 32%;
                display: flex !important;
                justify-content: center;
                z-index: 9;
            }
            .ocbox:hover {
                box-shadow: 0 12px 16px 0 rgba(0,0,0,0.24), 0 17px 50px 0 rgba(0,0,0,0.19);
            }
            .ocbox span {
                justify-content: center;
                align-contet: center;
                display: flex;
                width: 100%;
            }
            .ocbox.active {
                background: var(--tabs-active-bg-gradient);
            }

        `);
    }

    function installTrackerStyles() {
        if (ocTrackerStylesInstalled == true) return;
        GM_addStyle(`
            /*#oc2Timer {display: none;}*/

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
        `);

        ocTrackerStylesInstalled = true;
    }


})();