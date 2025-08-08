// ==UserScript==
// @name         Torn OC Helper
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @exclude      https://www.torn.com/recaptcha.php*
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
    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging
    const trackMyOc = GM_getValue("trackMyOc", true);

    if (trackMyOc == true)
        GM_addStyle(`#oc2Timer {display: none;}`);


    function isOcPage() { return location.hash ? (location.hash.indexOf("tab=crimes") > -1) : false; }
    if (trackMyOc != true && isOcPage() == false)
        return log("Not on OC page and not tracking");

    var notifyOcSoon = GM_getValue("notifyOcSoon", false);
    var notifyOcSoonMin = GM_getValue("notifyOcSoonMin", 15);

    var blinkingPaused = false;    // Set via an option, temp disable blinking...
    var blinkingNoOc = false;      // Set when alerting re: no OC
    const setAlertsPaused = function() {blinkingPaused = true;}

    GM_setValue("trackMyOc", trackMyOc);
    GM_setValue("debugLoggingEnabled", debugLoggingEnabled);

    // format helper for time strings
    const nn = function(t) {return t == 0? '00' : t < 10 ? '0' + t : t;}
    addToolTipStyle();

    var myOcTracker;
    var ocTrackerStylesInstalled = false;

    var myCrimeId; // = GM_getValue("myCrimeId", null);
    var myCrimeStartTime; // = GM_getValue("myCrimeStartTime", 0);
    var myCrimeStartDate;
    var myCrimeStartTimeModifier;
    var myCrimeStatus = ""; // = GM_getValue("myCrimeStatus", "");

    const NO_OC_TIME = "No OC found.";
    const secsInDay = 24 * 60 * 60;
    const secsInHr = 60 * 60;
    const showExperimental = false;

    const onCrimesPage = function () {return (location.hash ? location.hash.indexOf("tab=crimes") > -1 : false);}
    //function isOcPage() { return location.hash ? (location.hash.indexOf("tab=crimes") > -1) : false; }

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function handlePageLoad(retries=0) {
        // Can check for any required DIV here and setTimeout() if not available,
        // or trigger any required API calls...
    }

    // ================ OC Tracker and it's context menu related functions ===============

    // Run a function from context menu/options pane
    function doOptionMenuRunFunc(runFunc) {
        switch (runFunc) {
            case "refresh": {  // Refresh OC time ready, from context menu
                $("#oc-tracker-time").text("Please wait...");
                $("#oc-tracker-time").addClass("blink182");
                myCrimeId = 0;
                myCrimeStartTime = 0;
                if (myOcTracker) {
                    myOcTracker.getMyNextOcTime(true);
                }
                break;
            }
            case "stop-alert": {
                if (myOcTracker)
                    myOcTracker.stopAllAlerts();
                setAlertsPaused();
                break;
            }
            default:
                debug("ERROR: Run func ", runFunc, " not recognized!");
                break;
        }

    }

    class OcTracker {
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
                 tooltip: "Opens the OC page"}
        ];

        missingReqItem = false;
        missingReqItemId = 0;
        missingReqItemName = null;

        setTrackerTime(time) {
            debug("[setTrackerTime]:", time);
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

        getParts(when) {

        }

        getDisplayTimeUntilOc() {
            if (!myCrimeStartTime) {
                this.scheduleOcCheck(5000);
                return NO_OC_TIME;
            }

            let now = new Date();
            let dt = myCrimeStartDate; //new Date(myCrimeStartTime * 1000);
            /*debug("*** Got myCrimeStartDate as: ", myCrimeStartDate.toString());
            debug("*** As secs, now: ", now.getTime(), " crime: ", myCrimeStartDate.getTime());
            debug("*** diff: ", (myCrimeStartDate.getTime() - now.getTime()));
            debug("*** diff as days: ", parseInt((myCrimeStartDate.getTime() - now.getTime()) / secsInDay));
            log("*** [getDisplayTimeUntilOc] dates: ", now.getDate(), dt.getDate());*/
            let diffSecs = +myCrimeStartTime - now.getTime()/1000;
            let days = Math.floor(diffSecs / secsInDay);
            let remains = (diffSecs - (days * secsInDay));
            let hrs = Math.floor(remains / secsInHr);
            //log("[getDisplayTimeUntilOc] diff: ", diffSecs, " secs in day: ", secsInDay, " days: ", days, " rem: ", remains, " hrs:", hrs);
            remains = remains - (hrs * secsInHr);
            let mins = Math.floor(remains/60);

            //let nowParsed = getParts(now);

            return ("OC in: " + days + "d " + nn(hrs) + "h " + nn(mins) + "m");
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
            let planningAt = myCrime.planning_at;
            let expiredAt = myCrime.expired_at;

            myOcTracker.scheduleOcCheck(58000);

            if (myCrime && readyAt) {
                myCrimeId = myCrime.id;
                myCrimeStartTime = planningAt;
                let dt = new Date(myCrimeStartTime * 1000);
                myCrimeStartDate = dt;
                //debug("Set myCrimeStartTime to: ", new Date(myCrimeStartTime * 1000).toString());
                //debug("Set myCrimeStartDate to: ", myCrimeStartDate.toString());
                //debug("As secs: ", new Date(myCrimeStartTime * 1000).getTime());
                myCrimeStatus = myCrime.status;
                myOcTracker.saveMyCrimeData();
                myOcTracker.stopAllAlerts();
            } else if (!blinkingPaused) {
                myOcTracker.enableNoOcAlert();
                myOcTracker.setTrackerTime(NO_OC_TIME);
                debug("Didn't locate my own OC!");
                return;
            }

            // See if there is a required item, and if so, do we have it?
            let slots = myCrime.slots;
            this.missingReqItem = false;
            for (let idx=0; idx<slots.length; idx++) {
                let slot = slots[idx];
                // Empty slots add 24 hours to time...
                if (!slot.user_id && myCrime.status != 'Planning') myCrimeStartTime += secsInDay;
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

        myOcTrackingCb(responseText, ID, param) {
            debug("myOcTrackingCb: ", myOcTracker);
            if (myOcTracker)
                myOcTracker.handleOcResponse(responseText, ID, param);
        }

        getMyNextOcTime(force) {
            if (force == true) {
                debug(" xxx myOcTracker sending forced request");
                xedx_TornUserQueryv2("", "organizedcrime", myOcTracker.myOcTrackingCb);
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
            xedx_TornUserQueryv2("", "organizedcrime", myOcTracker.myOcTrackingCb);
        }

        scheduleOcCheck(time, param) {
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

        startMyOcTracking() {
            log("[startMyOcTracking] ", $("#ocTracker"));
            if ($("#ocTracker").length) {
                this.installOcTrackerContextMenu();
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
            this.installOcTrackerContextMenu();
            this.scheduleOcCheck(250, 'available');
            setInterval(myOcTracker.clearPending, 10000);

            displayHtmlToolTip($("#ocTracker")[0], "Right-Click for options", "tooltip4" );
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

            debug("[parseOcTime]:", parts, time, d, h, m);

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
            event.stopPropagation();
            event.preventDefault();
            let target = $(event.currentTarget);
            let menuId = $(target).attr("id");
            let parent = $(target).parent();
            let runFunc = $(parent).find(".xeval");

            if ($(runFunc).length) {
                let fnName = $(runFunc).attr("data-run");
                if (fnName) {
                    doOptionMenuRunFunc(fnName);
                    myOcTracker.hideMenu();
                    return false;
                }
            }

            let anchor = $(parent).find("a");
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

            $("#ocTracker-cm > ul > li > span").on('click', myOcTracker.handleTrackerContextClick);

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

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (trackMyOc != true && isOcPage() == false)
        return log("Not on OC page and not tracking");

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);

    if (trackMyOc == true) {
        myOcTracker = new OcTracker();
        myOcTracker.startMyOcTracking();
    }

    // Add any styles here
    function addStyles() {
        addToolTipStyle();
    }

    function installTrackerStyles() {
        if (ocTrackerStylesInstalled == true) return;
        GM_addStyle(".oc-offscreen {position: absolute; top: -2000px; left: -2000px;}");
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
                cursor: pointer;

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

        ocTrackerStylesInstalled = true;
    }


})();