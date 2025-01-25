// ==UserScript==
// @name         Torn NPC Attack Watcher
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Get NPC times from Loot Rangers
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @connect      api.lzpt.io
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
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

    const debugAlerts = false;
    debugLoggingEnabled = false;

    var local = false;
    const format = 24;
    const dbgBorders = false;

    // Various (mostly display) options
    var atOrUntil = GM_getValue("showUntilOrAt", "timeuntil");
    var timeFormat = "24";                                    // 12 or 24
    var timeZone = GM_getValue("timeZone", "fmt-local");      // local, TCT
    var showAlert = GM_getValue("showAlert", false);
    var minBefore = GM_getValue("minBefore", 30);
    var alertFormat = "highlight";                            // blink, notification, Discord....
    var hideUntil = GM_getValue("hideUntil", false);
    var hideMinUntil = GM_getValue("hideMinUntil",60);        // minutes
    var showUntilMsg = GM_getValue("showUntilMsg", true);
    var showBrowserNotifications = GM_getValue("showBrowserNotifications", true);
    var notificationTimeoutMs = GM_getValue("notificationTimeoutMs", 20000);
    var notifyOnce = GM_getValue("notifyOnce", false);
    var notifyBefore = GM_getValue("notifyBefore", 15);
    var showNpcLinksWin = GM_getValue("showNpcLinksWin", true);

    function saveCurrentOptions() {
        GM_setValue("showUntilOrAt", atOrUntil);
        GM_setValue("timeZone", timeZone);
        GM_setValue("showAlert", showAlert)
        GM_setValue("minBefore", minBefore);
        GM_setValue("hideUntil", hideUntil);
        GM_setValue("hideMinUntil", hideMinUntil);
        GM_setValue("showUntilMsg", showUntilMsg);
        GM_setValue("showBrowserNotifications", showBrowserNotifications);
        GM_setValue("notificationTimeoutMs", notificationTimeoutMs);
        GM_setValue("notifyOnce", notifyOnce);
        GM_setValue("notifyBefore", notifyBefore);
        GM_setValue("showNpcLinksWin", showNpcLinksWin);
    }

    function restoreSavedOpts() {
        timeFormat = "24";                                 // 12 or 24
        timeZone = GM_getValue("timeZone", timeZone);      // local, TCT
        showAlert = GM_getValue("showAlert", showAlert);
        minBefore = GM_getValue("minBefore", minBefore);
        alertFormat = "highlight";                         // blink, notification, Discord?
        hideUntil = GM_getValue("hideUntil", hideUntil);
        hideMinUntil = GM_getValue("hideMinUntil", hideMinUntil);       
        showUntilMsg = GM_getValue("showUntilMsg", showUntilMsg);
        showBrowserNotifications = GM_getValue("showBrowserNotifications", showBrowserNotifications);
        notificationTimeoutMs = GM_getValue("notificationTimeoutMs", notificationTimeoutMs);
        notifyOnce = GM_getValue("notifyOnce", notifyOnce);
        notifyBefore = GM_getValue("notifyBefore", notifyBefore);
        showNpcLinksWin = GM_getValue("showNpcLinksWin", showNpcLinksWin);
    }

    var startTimes = {
        until: {hrs: 0, mins: 0, secs: 0},
        atLocal: "12:12:12",
        atTCT: "12:12:12",
        valid: false
    }

    function timeNow() {
        let now = new Date().getTime();
        let date = new Date(now);
        return date.toLocaleTimeString();
    }


    addToolTipStyle();

    // =============== NPC info ================
    const npcIds = {
        "Fernando": 20, "Tiny": 21, "Duke": 4, "Jimmy": 19, "Leslie": 15, "Scrooge": 10,
        "Easter Bunny": 17 };
    const baseAttackUrl = "https://www.torn.com/loader.php?sid=attack&user2ID=";

    // ============================= Called on push state change ================
    function pushStateChanged(e) {
        debug("pushStateChanged: ", e);
        setTimeout(handlePageLoad, 250);
    }

    //
    // ============================== Loot Ranger functions =====================
    //
    var startTimeRaw;
    var starTimeDate;
    var startTimeUTC;
    var timesAreGood = false;
    var timesNoGoodReason;
    var intervalTimer = 0;
    var attackOrder = '';

    function queryLootRangers() {
        const request_url = `https://api.lzpt.io/loot`;
        GM_xmlhttpRequest ({
            method:     "GET",
            url:        request_url,
            headers:    {
                "Content-Type": "application/json"
            },
            onload: response => {
                try {
                    const data = JSON.parse(response.responseText);
                    if(!data) {
                        log('Error: No response from Loot Rangers');
                    } else {
                        processLootRangerResult(data);
                    }
                }
                catch (e) {
                    console.error(e);
                }

            },
            onerror: (e) => {
                console.error(e);
            }
        });

        function processLootRangerResult(result) {
            attackOrder = '';
            var attackString = '';
            var attackLink = '';
            var attackTarget = 0;
            attackOrder = '';
            timesAreGood = false;

            debug("processLootRangerResult: ", result);

            // If there's no clear time set
            if(result.time.clear == 0  && result.time.attack === false) {
                attackString = result.time.reason ? 'NPC attacking will resume after '+result.time.reason : 'No attack currently set.';
                debug("attackString: ", attackString);
                timesNoGoodReason = result.time.reason;
                debug("timesNoGoodReason: ", timesNoGoodReason);
            } else {
                // Build the string for the attack order
                $.each(result.order, function(key, value) {
                    if(result.npcs[value].next){
                        // If there's an attack happening right now, cross out NPCs that are in the hospital
                        if(result.time.attack === true) {
                            if(result.npcs[value].hosp_out >= result.time.current) {
                                attackOrder += '<span style="text-decoration: line-through">'+result.npcs[value].name+'</span>, ';
                            } else {
                                attackOrder += result.npcs[value].name+', ';
                            }
                        } else {
                            attackOrder += result.npcs[value].name+', ';
                        }
                    }
                    // Adjust the current target based on if an attack is going and who isn't in the hospital yet
                    if(result.time.attack === true) {
                        if(result.npcs[value].hosp_out <= result.time.current) { // Check if the NPC is currently out of the hospital
                            if(attackTarget == 0) {
                                attackTarget = value;
                            }
                        }
                    }
                });

                // Check if target has been set, otherwise default to first in attack order
                if(attackTarget == 0) {
                    attackTarget = result.order[0];
                }

                // Clean up the attack order string
                attackOrder = attackOrder.slice(0, -2)+'.';

                // Update list in UI, if present
                updateAttackLinks();

                // Check if an attack is currently happening and adjust the message accordingly
                if(result.time.attack === true) {
                    attackString = 'NPC attack is underway! Get in there and get some loot!';
                    attackLink = 'loader.php?sid=attack&user2ID='+attackTarget;
                } else {
                    timesAreGood = true;
                    startTimeRaw = result.time.clear;
                    starTimeDate = Date(+result.time.clear * 1000);

                    local = false;
                    startTimeUTC = utcformat(result.time.clear);

                    startTimes.atUTC = startTimeUTC;

                    attackString = 'NPC attack set for '+
                        utcformat(result.time.clear) + ' or ' +
                        new Date(+result.time.clear * 1000).toLocaleString() +
                        '. Order is: '+attackOrder;
                    attackLink = 'loader.php?sid=attack&user2ID='+attackTarget;
                }
            }

            if (timesAreGood== true && intervalTimer == 0)
                intervalTimer = setInterval(handleIntTimer, 1000);

            let now = new Date();
            let epoch = now.getTime();
            timesNoGoodReason = result.time.reason;

            let startsAt = new Date(+startTimeRaw * 1000);

            // Fills in the 'timeuntil' part of start times.
            timeDifference(startsAt);

            startTimes.startsAt = startsAt;
            startTimes.atLocal = new Date(+startTimeRaw * 1000).toLocaleString();
            startTimes.atTCT = new Date(+startTimeRaw * 1000).toString();
            startTimes.atUTC = startTimeUTC;
            startTimes.valid = timesAreGood;
        }

        callOnContentLoaded(handlePageLoad);

        if ($("#refreshSpin").length > 0) {
            setTimeout(function () {$("#refreshSpin").remove();}, 2000);
        }

        GM_setValue("lastUpdate", new Date().getTime());

        // Test
        let lastUpdate = new Date(GM_getValue("lastUpdate"));
        debug("**** lastUpdate: ", lastUpdate, " | ", lastUpdate.toLocaleString());

    }

    function timeDifference(date) {
        let now = new Date();
        var difference =  date.getTime() - now.getTime();

        var daysDifference = Math.floor(difference/1000/60/60/24);
        difference -= daysDifference*1000*60*60*24

        var hoursDifference = Math.floor(difference/1000/60/60);
        difference -= hoursDifference*1000*60*60

        var minutesDifference = Math.floor(difference/1000/60);
        difference -= minutesDifference*1000*60

        var secondsDifference = Math.floor(difference/1000);

        startTimes.until.hrs = hoursDifference;
        startTimes.until.mins = minutesDifference;
        startTimes.until.secs = secondsDifference;

        if (timesAreGood && intervalTimer == 0)
            intervalTimer = setInterval(handleIntTimer, 1000);
        else {
            debug("Times no good: ", timesNoGoodReason);
            // Set longer timer?
            setTimeDisplay();
            setTimeout(handleIntTimer, 30000);
        }

        debug("until: ",  startTimes.until);
    }

    function utcformat(d){
        d= new Date(d * 1000);
        if(local) {
            var tail= ' LT', D= [d.getFullYear(), d.getMonth()+1, d.getDate()],
                T= [d.getHours(), d.getMinutes(), d.getSeconds()];
        } else {
            var tail= ' TCT', D= [d.getUTCFullYear(), d.getUTCMonth()+1, d.getUTCDate()],
                T= [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];
        }
        if(format == 12) {
            /* 12 hour format */
            if(+T[0]> 12){
                T[0]-= 12;
                tail= 'PM '+tail;
            }
            else tail= 'AM '+tail;
        }
        var i= 3;
        while(i){
            --i;
            if(D[i]<10) D[i]= '0'+D[i];
            if(T[i]<10) T[i]= '0'+T[i];
        }
        return T.join(':')+ tail;
    }

    //
    // ============================== UI and options, display functions =====================
    //
    function addAlignmentStyles() {
        GM_addStyle(`
            .xfixed-vert {
                position: fixed;
                top: 50%;
                transform: translate(-50%, -50%);
            }
            .xfixed-horiz {
                position: fixed;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            .xfixed-both {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
        `);
    }

    // TBD: figure out which ones I'm actually using, coalesce, see
    // what I can use or put into core lib,,,
    function addNpcStyles() {
        addContextStyles();
        loadMiscStyles();
        addBorderStyles();
        addFloatingOptionsStyles();
        addTornButtonExStyles();
        loadCommonMarginStyles();
        addAlignmentStyles();

        // Added just for this...
         GM_addStyle(`
                div.xnpc {
                    padding-bottom: 0px;
                    padding-top: 0px;
                    display: flex;
                    justify-content: center;
                    flex-direction: row;
                }
                .xnpcs {
                     font-weight: 700;
                     justify-content: left;
                     display: flex;
                }
                .xhide-show2 {
                     font-weight: 700;
                     justify-content: center;
                }
                div.xnpc-inner {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                }
                .xtime {
                     justify-content: center;
                     font-size: 14px;
                     width: 90%;
                     cursor: pointer;
                }
                .xtime:hover {
                    filter: brightness(1.7);
                    background-image: radial-gradient(rgba(93, 248, 0, 0.4) 40%, transparent 60%);
                }
                .xnpc-inner span {
                    width: auto;
                    justify-content: center;
                }
                .xnpc-inner a {
                    color: white;
                }
                .xtouch {
                   cursor: pointer;
                }
                .xtouch:hover {
                    color: green;
                }
                .df {display: flex;}

                .npc-caret {
                     margin-left: auto;
                     cursor: pointer;
                }
                .xcrt {
                    width: 23px;
                    height: 23px;
                    float: left;
                }
                .flash-red {
                   animation-name: flash-red;
                    animation-duration: 0.8s;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    animation-direction: alternate;
                    animation-play-state: running;
                    font-size: 18px !important;
                }
                .flash-red-at {
                   animation-name: flash-red;
                    animation-duration: 0.8s;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    animation-direction: alternate;
                    animation-play-state: running;
                    font-size: 14px !important;
                }
                .alert-red {
                    border: 1px solid red;
                }
                @keyframes flash-red {
                    from {color: #FF0000;}
                    to {color: #700000;}
                }
                .flash-ylw {
                   animation-name: flash-ylw;
                    animation-duration: 0.8s;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    animation-direction: alternate;
                    animation-play-state: running;
                }

                @keyframes flash-ylw {
                    from {color: yellow;}
                    to {color: black;}
                }
            `);

        GM_addStyle(`
            .xjc {
                 justify-content: center;
                 display: inline-flex;
             }
         `);
    }

    // The elems with class 'xhide-show' toggle between xhide and df (display flex) when
    // the elem with class 'xtouch' is clicked. These are the mini-options section.
    //
    // The elems with class "xhide-show2" toggle when the caret is clicked, between class 'xhide'
    // and not having that class...worked at one point.
    //
    // May change to displaying the pop-up options menu instead and have a caret to hide/show the alert
    // div. Can show time time, time when (TCT or local), have alerts, when to alert, etc.
    //
    function getNPCDiv() {

        GM_addStyle(`
            .xtest1 {
                padding-bottom: 3px;
                margin-top: -4px;
                height: 28px;
            }
            .xtest2 {
                align-content: center;
                justify-content: center;
                flex-wrap: wrap;
                padding: 3px;
            }
        `);

        GM_addStyle(`
                .xopacity {
                    opacity: 0;
                }
                .uber {
                    background: transparent;
                    border: 1px solid green;
                    border-radius: 0px;
                    height=22px;
                    min-height: 22px;
                    cursor: pointer;
                }
                .uber-nb {
                    background: transparent;
                    border-radius: 0px;
                    height=22px;
                    min-height: 22px;
                    cursor: pointer;
                    position: sticky;
                    z-index: 99;
                }
        `);

        // <hr id="xnpcdelim" class="delimiter___neME6">
        const div1 =  `
               <div id="xedxNPCAlert" class="xnpc">
                   <span class="xtouch xnpcs xtest1">NPC - click to open</span>
                   <span class="xncpi">
                   <span class="break"></span>` +

                  `<hr class="xhide-show2 xhide delimiter___neME6">
                   <div id="xnpc-aw-2" class="xnpc xhide xhide-show2">
                       <span id="xmenu1" class="xtime xhide-show2 xhide">menu 1</span>
                   </div>
               </div>`;

        const div2 =  `
               <div id="xedxNPCAlert" class="xnpc">
                   <div id="xnpc-aw-1" class="df">
                       <span class="xtouch xnpcs xtest1">NPC - click to open</span>
                       <span class="xncpi">
                       <span class="break"></span>
                   </div>

                   <hr class="xhide-show2 xhide delimiter___neME6">

                   <div id="xnpc-aw-2" class="xnpc xhide xhide-show2">
                       <span id="xmenu1" class="xtime xhide-show2 xtest1 xhide">time</span>
                   </div>
               </div>`;

         const div3 =  `
               <div id="xedxNPCAlert" class="xnpc faraway">` +
                   npcLinksButton() +
                   `<span id="xmenu1" class="xtime xtest2 xhide">menu 1</span>
               </div>`;


        return div3;
    }

    // ======================= Browser Notification =========================

    var notifyOpen = false;
    const resetNotifyFlag = function () {notifyOpen = false;}
    function doBrowserNotify() {
        if (awayFromHome()) return;
        if (notifyOpen == true) return;
        debug("Browser alert: ", timeNow());

        notifyOpen = true;
        let msgText = "NPCs coming soon!\n\n" +
            startTimes.until.hrs + ":" + startTimes.until.mins + ":" + startTimes.until.secs +
            " until start!";

        GM_notification ( {
            title: 'NPC Alert!',
            text: msgText,
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: notificationTimeoutMs,
            onclick: () => {
                setTimeout(resetNotifyFlag, 30000);
                window.focus ();
            },
            ondone: () => {setTimeout(resetNotifyFlag, 30000);}
        } );
    }

    // ======================= Alerts =========================

    var alertClickDone = false;  // I think I use this to let me know I displayed a hidden time window

    function disableAlert() {
        $("#xmenu1").removeClass("flash-red").removeClass("flash-red-at");
        $("#xnpx-t2").removeClass("flash-red-at");
        $("#uber-alert > div").removeClass("alert-red");
        $("#xedxNPCAlert").parent().removeClass("alert-red");
        alertActive = false;
    }

    var notifyShown = false;
    function enableAlert(disable) {
        if (alertActive == false) alertClickDone = false;

        if (manuallyHidAlerts) {
            // remind that manually hidden? or show anyways?
            //log("manuallyHidAlerts !!!!!!");
        }

        if (disable != true && showBrowserNotifications && notifyOpen == false) {
            if ((notifyOnce && !notifyShown) || !notifyOnce) {
                doBrowserNotify();
                notifyShown = true;
            }
        }

        if (manuallyHidAlerts || disable || showAlert == false || alertActive == false) {
            disableAlert();
            return;
        }

        if (alertActive == true) {
            if ($("#xedxNPCAlert").height() == 0) {
                setTimeout(turnOnAlerts, 1100);    // Animate is for 1000
                doAnimate("#xedxNPCAlert", 22);
            }

            turnOnAlerts();
        }

        // Private to here...
        function turnOnAlerts() {
            // If hidden and not going to unhide, don't ant to do this...
            // But check time first?
            if ($("#xedxNPCAlert").hasClass("xopacity") || $("#uber-alert").css('margin-top').indexOf('-') > -1) {
                if (debugAlerts == true) debugger;
                disableAlert();
                return;
            }
            let classToAdd = (atOrUntil == "timeuntil") ? "flash-red" : "flash-red-at";
            $("#xmenu1").addClass(classToAdd).addClass("df");
            $("#xnpx-t2").addClass(classToAdd);
            $("#xedxNPCAlert").parent().addClass("alert-red");
            if (alertClickDone == false && $("#xclick").hasClass("df")) {
                $("#xclick")[0].click();
                alertClickDone = true;
            }
        }
    }

    // Get diff in secs between two times in 24 hour format
    // May span a day boundary.
    const secsmin = 60;
    const secshr = secsmin * 60;
    const secsday = secshr * 24;

    function diffSecs(t1, t2) {
        if (timesAreGood == false) return 0;

        let h1 = t1.getUTCHours();
        let m1 = t1.getUTCMinutes();
        let s1 = t1.getUTCSeconds();
        let t1secs = s1 + m1*secsmin + h1*secshr;

        let h2 = t2.getUTCHours();
        let m2 = t2.getUTCMinutes();
        let s2 = t2.getUTCSeconds();
        let t2secs = s2 + m2*secsmin + h2*secshr;

        // Tomorrow: add t2 secs + (fullDaySecs - t1 secs)
        // Same day: t2 secs - t1 secs
        let ist2tomorrow = h2 < h1;
        let secsdiff;
        if (ist2tomorrow == true) {
            secsdiff = t2secs + (secsday - t1secs);
        } else {
            secsdiff = t2secs - t1secs;
        }

        let d = new Date(secsdiff * 1000);
        let fmtdiff = new Date(secsdiff * 1000).toISOString().slice(11, 19);

        return secsdiff;
    }

    function fmtSecsDiff(secsdiff) {
        if (timesAreGood == false) {
            debug("timesNoGoodReason: ", timesNoGoodReason);
            return timesNoGoodReason ? timesNoGoodReason : "00:00:00";
        }
        return new Date(secsdiff * 1000).toISOString().slice(11, 19);
    }

    // Debug/test/refine interval timer
    function doTimeUntilFromNow() {
        let now = new Date();
        let when = startTimes.startsAt;

        let secsdiff = diffSecs(now, when);
        startTimes.minutesUntil = secsdiff/60;
        let fmted = fmtSecsDiff(secsdiff);
        let timeParts = fmted.split(":");

        startTimes.until.hrs = timeParts[0];
        startTimes.until.mins = timeParts[1];
        startTimes.until.secs = timeParts[2];
    }

    function invalidate() {
        debug("[invalidate] startTimes: ", startTimes);
        startTimes.valid = false;
        startTimes.until.hrs =
            startTimes.until.mins =
            startTimes.until.secs = 0;
        setTimeDisplay();
        clearInterval(intervalTimer);
        intervalTimer = 0;
        enableAlert(true);
        alertActive = false;
        queryLootRangers();
    }

    // xopts-ctr-screen
    const loaderDiv = "<div id='refreshSpin' class='xedx-loader'></div>"
    function doTimeRefresh(e) {
        let target = $(e.currentTarget);
        $(target).before(loaderDiv);
        invalidate();
    }

    // Handle the one-sec timer. Updates the "Time Until" display, among other things,
    var intCount = 0;
    var alertActive = false;
    var secCounter = 0;

    function handleIntTimer() {
        if (awayFromHome()) return;
        if (timesAreGood == false) {
            return invalidate();
        }

        doTimeUntilFromNow();

        let minsUntil = startTimes.minutesUntil;
        let doLog = false;
        if (secCounter++ == 30) {
            debug("handleIntTimer valid? ", startTimes.valid, " ", atOrUntil);
            debug("[handleIntTimer] times: ", startTimes, " minsUntil: ", minsUntil);
            secCounter = 0;
            //doLog = true;
        }

        // Make sure times are valid.
        let hrs = startTimes.until.hrs;
        let mins = startTimes.until.mins;
        let secs = startTimes.until.secs;
        if (hrs < 0 || hrs > 22 || mins < 0 || secs < 0) return invalidate();
        if (startTimes.valid != true) return invalidate();

        // Handle alerts. Enable if threshold set and hit
        alertActive =
            (showAlert == true && minsUntil >= 0 && minsUntil < minBefore);

        // Handle re-enabling if hidden until x minutes prior
        let didUnhide = false;
        let didHide = false;

        if (!manuallyHidAlerts && hideUntil && $("#xedxNPCAlert").height() == 0 &&
            minsUntil < hideMinUntil && hiddenAtStart == true)
        {
            hiddenAtStart = false;
            didUnhide = true;
            redisplayAndAlert();
        }

        if (doLog == true)
            debug("[handleIntTimer] Display alerts? ", showAlert, " until: ", minsUntil, " before: ", minBefore);

        if (atOrUntil == "timeuntil")
            setTimeDisplay();

        if (didUnhide == false && !manuallyHidAlerts && alertActive == true)
            enableAlert();
    }

    // Not working so well. Possible alternative - clone, and remove existing
    // div. On restore, re-add and restore click handlers?
    function doHideAll(instantly) {
        enableAlert(true);
        if ($("#xedxNPCAlert").height() == 0) {
            $("#uber-alert > div").removeClass("alert-red");
            animateDone("#xedxNPCAlert", 0);

            $("#xmenu1").addClass("xhide").removeClass("df");
            $("#xclick").addClass("xhide").removeClass("df");
            return;
        }
        doAnimate("#xedxNPCAlert", 0, instantly);
    }

    function redisplayAndAlert(alsoAlert) {
        debug("[redisplayAndAlert]");
        doAnimate("#xedxNPCAlert", 22);

        // Set active here?
        if (alsoAlert == true) {
            enableAlert();
        }
    }

    // 2 second slide, will call animateDone at end.
    function doAnimate(sel, size, instantly) {
        if (size > 0) {
            $(".xhide-show2").removeClass("xhide");
            $(".xtouch").removeClass("xhide").addClass("xnpcs");
            $(".xtime").addClass("df");
            $("#xnpcdelim").removeClass("xhide");
        }

        if (instantly == true) {
            $(sel).toggleClass("xopacity");
            $(sel).css("height", (size + "px"));
            animateDone(sel, size);
        } else {
            $(sel).animate({
                height: (size + "px"),
            }, 1000, function() {
                animateDone(sel, size);
                $(sel).toggleClass("xopacity");
            });
        }

        let margin = (size == 0) ? "-22px" : "0px"; //(-1 * size) + "px";
        if (instantly == true) {
            $("#uber-alert").css("margin-top", margin);
        } else {
            $("#uber-alert").animate({
                marginTop: margin,
            }, 250);
        }
    }

    function animateDone(sel, size) {
        if (size == 0) {
            $(".xhide-show2").addClass("xhide");
            $(".xhide-show").addClass("xhide");
            $(".xtouch").addClass("xhide").removeClass("xnpcs");
            $(".xtime").removeClass("df");
            $("#xnpcdelim").addClass("xhide");
            $("#uber-alert > div").removeClass("alert-red");
        } else {
            $("#xedxNPCAlert").css("height", "auto");
            enableAlert();
        }
    }

    const hideSidebarNpcTimers = function () {
        $("#sidebarNpcTimers").attr("style", "display: none;");
        $("#sidebarNpcTimers").prev().attr("style", "display: none;");
        setTimeout(hideSidebarNpcTimers, 500);
    }

    const toggleClass = function(sel, classA, classB) {
        if ($(sel).hasClass(classA)) {$(sel).removeClass(classA).addClass(classB);} else {$(sel).removeClass(classB).addClass(classA);}}

    //const caretNode = `<span style="float:right;"><i id="npccaret" class="icon fas fa-caret-down xedx-caret"></i></span>`;
    var installRetries = 0;
    var useTestDiv = true;
    const showOpts = function () {$(".xrflex").removeClass("ctxhide").addClass("xshow-flex");}
    const hideOpts = function () {$(".xrflex").removeClass("xshow-flex").addClass("ctxhide");}

    // Outermost wrapper. 
    const uberDiv2 = `<div id="uber-alert" class="uber-nb faraway"></div>`;
    var hiddenAtStart = false;

    // Div for dbl-click, list of NPC hyper-links
    const npcList = `
        <div id="npcList" class="xfixed-vert"><ul></ul></div>
    `;

    function getLinksDiv() {
        // inner see x-hosp-inner-flex?
        const linksDiv = `
            <div id="x-npc-links" class="x-float-outer xfixed-vert x-drag xbgb-var">
                <div class="xflexc-center" style="width: 100%;">
                    <div id="x-npc-linksheader" class="grab title-black hospital-dark top-round">
                        <div class="xhding-flex" role="heading">
                            <span>NPC Links</span>
                            <span id="x-npc-links-close" class="x-rt-btn r20 x-inner-span xml5 xmr5">X</span>
                        </div>
                    </div>
                    <div id="x-npc-links-inner" class="">
                        <ul id="x-npc-links-ul">
                        </ul>
                    </div>
                </div>
            </div>
        `;

        return linksDiv;
    }

    function handleLiBtnClick(e) {
        e.preventDefault();
        let target = $(e.currentTarget);
        let url = $(target).attr("href");

        window.open(url, '_blank').focus();
        return false;
    }

    function buildAttackUrl(npcName) {
        let id = npcIds[npcName];
        if (!id) return;
        return baseAttackUrl + id;
    }

    function buildAttackLi(npcName) {
        let href = buildAttackUrl(npcName);
        debug("HREF for ", npcName, ": ", href);
        if (!href) return;
        let li = "<li href='" + href + "'>" + npcName + "</li>";
        return li;
    }

    function updateAttackLinks() {
        debug("updateAttackLinks: ", attackOrder, " UL: ", $("#x-npc-links-ul"));
        if (!$("#x-npc-links-ul").length) return;
        if (!attackOrder || !attackOrder.length)
            attackOrder = "Fernando, Tiny, Duke, Jimmy, Leslie";

        let npcs = attackOrder.split(',');
        let ulClone = $("#x-npc-links-ul").clone(true);
        $(ulClone).find("li").remove();

        // Temp li for time to go...
        let testLi = "<li id='xnpx-t2'>00:00:00</li>";
        $(ulClone).append(testLi);

        for (let idx=0; idx<npcs.length; idx++) {
            let npcName = npcs[idx].trim().replace('.', '');
            let li = buildAttackLi(npcName);
            $(ulClone).append(li);
        }
        $("#x-npc-links-ul").replaceWith($(ulClone));
        $("#x-npc-links-ul > li").on('click', handleLiBtnClick);
    }

    function installLinkHandlers() {
        dragElement(document.getElementById("x-npc-links"));
        $("#x-npc-links-close").on('click.xedx', function(){
            $("#x-npc-links").remove();
        });
    }

    function installLinksUi() {
        if ($("#x-npc-links").length > 0) return;
        let linksDiv = getLinksDiv();
        $('body').append(linksDiv);

        let t = $("#x-npc-links").position().top;
        if (t < 0) {
            log("Adjusting top: ", t);
            $("#x-npc-links").css("top", ("240px"));
        }

        displayHtmlToolTip($("#x-npc-links-close"), "Click to close.", "tooltip4");

        updateAttackLinks();
        installLinkHandlers();
    }

    // =====================================================================================

    // Propogating is kinda neat, also closes tiny window...
    function handleLinksBtn(e) {
        installLinksUi();
        return false;
    }

    function removeFarAway() {
        $("#uber-alert").removeClass("faraway");
        $("#xedxNPCAlert").removeClass("faraway");
    }

    function installUI() {
        debug("NPC Alert installUI");
        if ($('#xedxNPCAlert').length) {
            return log("NPC Alert Already installed!");
        }

        let node = $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]');
        if ($(node).length == 0) {
            if (installRetries++ > 5) {
                return log("NPC Alert install failed, too many retries!");
            }
            return setTimeout(installUI, 250);
        }

        GM_addStyle(".faraway {position: absolute; top: -2000px; left: -2000px;}");
        addNpcListStyles();
        addFloatStyles();

        $("#sidebarNpcTimers").attr("style", "display: none;");
        $("#sidebarNpcTimers").prev().attr("style", "display: none;");
        // Temp hack
        setTimeout(hideSidebarNpcTimers, 250);

        let elem = getNPCDiv();
        let parentSelector = makeXedxSidebarContentDiv('npc-watch');

        $(parentSelector).append(elem);
        $(parentSelector).css("padding", "0px");

        // This allow us to hide and show the div, unobtrusively
        $(parentSelector).before($(uberDiv2));
        let tmp = $(parentSelector).detach();
        $("#uber-alert").append($(tmp));

        $("#uber-alert").on('click', handleBtnClick);

        // Handler/help for the 'links' button
        $("#xnpc-links").on('click', handleLinksBtn);
        displayHtmlToolTip($("#xnpc-links"), "Left-click to get<br>target attack links", "tooltip4");

        // Display if not set to 'hide-until'
        //if (hideUntil == false)
            doNpcHideShow();

        $("#xedxNPCAlert > span.xtouch").on('contextmenu', handleRightClick);
        $("#xmenu1").on('contextmenu', handleRightClick);

        displayToolTip($("#uber-alert"), "Click to open the NPC Alert display.");
        displayHtmlToolTip($("#xedxNPCAlert"), "Left-click to show/hide.<br>Right-click for options.", "tooltip4");
        setOptionsState();

        if (hideUntil == true && alertActive == false) {
            if (showUntilMsg == true) {
                let msgText = "The NPC Attack Watcher is running but hidden.\n" +
                      "Will become visible at " + hideMinUntil +
                      " minutes prior to attack time.\nCan alway display by clicking....";

                displayShowAgainMsg(msgText, saOkHandler);
            }

            // Maybe do this once we get initial resp. from loot rangers?
            handleBtnClick(true);
            hiddenAtStart = true;
        }

        setTimeout(removeFarAway, 1100);

        function saOkHandler(checked) {
            showUntilMsg = !checked;
            GM_setValue("showUntilMsg", showUntilMsg);
        }

        // ============ options dlg ============

        installOptsDialog();

        if ($('#xedxNPCAlert').length) {
            return true;
        } else {
            log("NPC Alert UI install failed!");
        }
    }

    // This handles clicking the "NPC Alert - Click Me" span (class 'xtouch')
    // Displays simple options
    function doNpcHideShow() {
        if (!useTestDiv) {
            toggleTimeDisplay();
        } else {
            toggleClass($("#xmenu1"), "xhide", "df");
            toggleClass($("#xclick"), "xhide", "df");

            setTimeDisplay();
        }
    }

    // right-click - show options
    function handleRightClick(e) {
        e.preventDefault();
        if ($("#xedx-sa-alert").length > 0)
            $("#xedx-sa-alert").remove();
        showOpts();
        return false;
    }

    function hideShowOpts() {
        toggleClass(".xhide-show", "xhide", "df");
    }

    var doHide = true;
    var manuallyHidden = false;
    var manuallyHidAlerts = false;
    function handleBtnClick(e) {
        if (doHide) {
            if (e) {        // Indicates not called internally
                manuallyHidden = true;  // Only if closed when alerts active!!!
                if (alertActive) {
                    manuallyHidAlerts = true;
                    disableAlert();
                }
            }
            doHideAll();
        } else {
            redisplayAndAlert();
        }
        doHide = !doHide;
    }

    function toggleTimeDisplay() {
        let list = $(".xhide-show2");
        for (let idx=0; idx < $(list).length; idx++) {
            let elem = $(list)[idx];
            if ($(elem).hasClass("xhide")) {
                $(elem).removeClass("xhide");
                if ($(elem).hasClass("xtime")) $(elem).addClass("df");

                // ????
                setTimeDisplay();
            } else {
                $(elem).addClass("xhide").removeClass("df");
            }
        }
    }

    // No longer required!
    //function n(n){return n > 9 ? "" + n: "0" + n;}
    function n(x){return x;}

    var sepOn = true;
    function setTimeDisplay() {
        //let timeText = "00:00:00";
        let timeText = timesNoGoodReason ? timesNoGoodReason : "00:00:00";
        if (startTimes.valid == true) {
            let sep = sepOn ? ":" : " ";

            // To blink the colon:
            //sepOn = !sepOn;

            if (atOrUntil == "timeuntil") {
                timeText = n(startTimes.until.hrs) + sep + n(startTimes.until.mins) + sep + n(startTimes.until.secs);
            } else {
                timeText = (timeZone == "fmt-local") ? startTimes.atLocal : startTimes.atUTC;
            }
        }

        $("#xmenu1").text(timeText);

        // Testing...
        $("#xnpx-t2").text(timeText);
    }

    function setOptionsState() {
        let untilOrAt = GM_getValue("showUntilOrAt", "timeuntil");
        atOrUntil = untilOrAt;
        if (untilOrAt == "timeat") $("#xat").prop('checked', true);
        if (untilOrAt == "timeuntil") $("#xuntil").prop('checked', true);

        $('input:radio[name=opt-when]').click(function() {
            let value = $(this).val();
            atOrUntil = value;
            GM_setValue("showUntilOrAt", value);
            setTimeDisplay();
        });
    }

    //
    // ================= Function to display a pop-up with a checkbox ==================

    var saAlertSel = "#xedx-sa-alert";

    function displayShowAgainMsg(msgText, callback) {
        let alertBox = getShowAgainDiv();

        $("body").prepend(alertBox);
        $("#x-doNotShow").text(msgText);

        $("#xedx-sa-ok").on('click', function (e) {
            let ck = $("input[name=doNotShow]").prop("checked");
            if (callback) callback(ck);
            $(saAlertSel).remove();
        });
    }

    // ==================================================================

    function handlePageLoad() {
        installUI();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    //versionCheck();
    if (awayFromHome()) return log("Not alerting while abroad.");

    queryLootRangers();

    addToolTipStyle();
    addFloatingOptionsStyles();
    addContextStyles();
    loadMiscStyles();
    addNpcStyles();

    addGenOptStyles();

    // Just need for test btn...
    //addTornButtonExStyles();

    installPushStateHandler(pushStateChanged);

     // ================================== Options dialog ================================

    var myOptsSel = "#xedx-npc-opts";

    function installOptsDialog() {
        let optsDiv = getGeneralOptsDiv();

        $("body").prepend(optsDiv);

        initDialogWithSavedOpts();
        addGeneralHandlers();
        closeOnOutsideClicks();
    }

    // No need to re-read here! Should have been done on load.
    function initDialogWithSavedOpts() {
        debug("[initDialogWithSavedOpts] ");

        let isChecked = (atOrUntil == "timeuntil");
        $("input[name=opt-when][value=timeuntil]").prop('checked', isChecked);
        $("input[name=opt-when][value=timeat]").prop('checked', !isChecked);

        isChecked = (timeZone == "fmt-local");
        $("input[name=opt-fmt][value=fmt-local]").prop('checked', isChecked);
        $("input[name=opt-fmt][value=fmt-tct]").prop('checked', !isChecked);

        isChecked = (hideUntil == true);
        $("input[name=hideUntil]").prop('checked', isChecked);

        $("input[name=hideMinUntil]").val(hideMinUntil);

        isChecked = (showAlert == true);
        $("input[name=showAlert]").prop('checked', isChecked);

        $("input[name='minBefore']").val(minBefore);

        isChecked = (showBrowserNotifications == true);
        $("input[name=showBrowserNotifications]").prop('checked', isChecked);

        $("input[name=notificationTimeoutMs]").val(notificationTimeoutMs / 1000);

        isChecked = (notifyOnce == true);
        $("input[name=notifyOnce]").prop('checked', isChecked);

        $("input[name=notifyBefore]").val(notifyBefore);
    }

    function addGeneralHandlers() {
        $("#opts-refresh").on('click', doTimeRefresh);

        $("#opts-save").on('click', function () {
            saveOptions();
            hideOpts();
        });

        $("#opts-cancel").on('click', function() {
            restoreSavedOpts();
            hideOpts();
        });

        $(".gen-cb").on('click', handleGeneralCbClick);
        $(".gen-inp").on('change', handleGenInpChange);

        $("#opts-tst").on('click', doBrowserNotify);
    }

    function closeOnOutsideClicks() {
        $("html").click(function (e) {
            let target = e.target;
            let menu = $("#xedx-npc-opts");
            let dlgWidth = $(menu).outerWidth();
            let dlgHeight = $(menu).outerHeight();
            let targetPos = $(target).position();

            let xOK = false, yOK = false;
            if (targetPos.left > 0 && targetPos.left < dlgWidth) xOK = true;
            if (targetPos.top > 0 && targetPos.top < dlgHeight) yOK = true;

            let closest = $(target).closest("#xedx-npc-opts");

            if ((xOK && yOK) || ($(closest).length > 0)) {
                return;
            }
            hideOpts();
        });
    }

    function saveOpt(name, modFn) {
        let sel = '[name="' + name + '"]';
        let node = $(sel);
        let val = modFn ? modFn($(node).val()) : $(node).val();
        GM_setValue(name, val);
    }

    function saveOptions() {
        saveOpt("minBefore");
        saveOpt("hideMinUntil");
        saveOpt("notificationTimeoutMs", function(x){return x*1000;});
        saveOpt("notifyBefore");
    }

    function handleGenInpChange(e) {
        let node = $(e.currentTarget);
        let val = $(node).attr("value");
        let entered = $(node).val();
        let name = $(node).attr("name");

        // Show alert X min before option
        if (name == "minBefore") {
            minBefore = entered;
            GM_setValue("minBefore", entered);
        }

        // Hide alerts until X min before
        if (name == "hideMinUntil") {
            hideMinUntil = entered;
            GM_setValue("hideMinUntil", entered);
        }

        // Browser notifications
        if (name == "notificationTimeoutMs") {
            notificationTimeoutMs = entered * 1000;
            GM_setValue("notificationTimeoutMs", notificationTimeoutMs);
        }

        // Browser notify X min before
        if (name == "notifyBefore") {
            notifyBefore = entered;
            GM_setValue("notifyBefore", notifyBefore);
        }

    }

    // Handle any CB on the general page..
    function handleGeneralCbClick(e) {
        let node = $(e.currentTarget);
        let val = $(node).attr("value");
        let entered = $(node).val();
        let checked = $(node)[0].checked;
        let name = $(node).attr("name");

        if (name == 'opt-when') {
            atOrUntil = val;
            GM_setValue("showUntilOrAt", val);
            setTimeDisplay();
        }

        if (name == 'opt-fmt') {
            timeZone = val;
            GM_setValue("timeZone", val);
            setTimeDisplay();
        }

        if (name == "hideUntil") {
            hideUntil = checked;
            GM_setValue("hideUntil", checked);
        }

        if (name == "showAlert") {
            showAlert = checked;
            GM_setValue("showAlert", checked);
        }

        if (name == "hideUntil") {
            hideUntil = checked;
            GM_setValue("hideUntil", checked);
        }

        if (name == "showBrowserNotifications") {
            showBrowserNotifications = checked;
            GM_setValue("showBrowserNotifications", checked);
        }

        if (name == "notifyOnce") {
            notifyOnce = checked;
            GM_setValue("notifyOnce", checked);
        }
    }

    function addNpcListStyles() {
        const sidebarWidth = $("#sidebarroot").width();
        const leftPos = $(window).width() - sidebarWidth;
        GM_addStyle(`
            .npc-link-btn {
                align-items: center;
                cursor: pointer;
                display: flex;
                flex-shrink: 0;
                justify-content: center;
                background-color: transparent;
                border-color: transparent;
                vertical-align: middle;
                position: relative;
                left: 0;
                margin-top: -5px;
            }
            .npc-link-btn:hover {
                filter: brightness(1.7);
                background-image: radial-gradient(rgba(93, 248, 0, 0.4) 40%, transparent 60%);
            }
            #x-npc-links {
                width: ${sidebarWidth}px;
                height: auto;
                left: ${leftPos}px;
                top: 240px;
            }
            #x-npc-links ul {
                border-radius: 10px;
                width: 100%;
                /*margin-top: 30px;*/
            }
            #x-npc-links li {
                display: flex;
                flex-wrap: wrap;
                height: 22px;
                width: 100%;
                align-items: center;
                justify-content: center;
                border-top: 1px solid darkblue;
                cursor: pointer;
            }
            #x-npc-links ul li:first-child {
                height: 24px !important;
                margin-top: 2px;
                font-size: 16px;
                border: 1px solid green !important;
            }

            .xhding-flex {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                width: 100%;
            }

            .xlinks-scroll {
                overflow-y: scroll;
                max-height: 80px;
            }

            #x-npc-links-inner {
                border-radius: 5px;
                width: 100%;
                align-content: center;
                justify-content: center;
                display: flex;
                flex-direction: column;
                flex-wrap: wrap;
            }
        `);
    }

    function addGenOptStyles() {
        // Note: the xrflex is a dummy class used to remove the !impotant flex claas so it can be
        // over-ridden by the display: none class (ctxhide)
        //
        // xlb-opts-bg: life bar background, border, z-order
        // xedx-ctr-screen: position, transforms - to center outer div
        GM_addStyle(`
            .xfmt-font-blk input {
                margin-right: 10px;
            }
            .xbig-border {
                border: 3px solid darkslategray;
            }
            .custborder1 {
                border-radius: 0px 6px 6px 6px;
                border: 1px solid black;
            }
            .xbtn-wrap {
                position: absolute;
                bottom: 0;
                margin-bottom: 15px;
                width:100%;
                margin-left: -10px;
            }
            .hide-until {
                flex-wrap: wrap;
                width: 360px;
                display: flex;
                flex-direction: row;
                align-content: center;
            }
            .show-alert {
                flex-wrap: wrap;
                width: 360px;
                display: flex;
                flex-direction: row;
                align-content: center;
            }
            .xopts-cust-size {
                width: 360px !important;
                height: 300px !important;
            }
            #opts-tst {
                width: 14px;
                height: 14px;
                margin-left: -20px;
                margin-top: 5px;
                margin-right: 6px;
                background: green;
            }
        `);

        // Used by left, right table cells on opts pages
        GM_addStyle(`
            .xntcl {
                padding: 6px 0px 6px 28px !important;
                width: 58%;
            }
            .xntcr {
                padding: 6px 2px 6px 12px !important;
            }
            .xntcg {
                padding: 6px 12px 6px 12px !important;
            }
            .inp-minute {
                width: 40px;
                margin-left: 8px;
                border-radius: 5px;
                border: 1px solid;
            }
            .row-two {
                flex-direction: row;
                display: flex;
                width: 360px;
            }

            .x-groupbox-p20 {
                margin-top: 10px;
                padding: 0px 20px 0px 20px;
                border-radius: 15px;
                width: auto;
                border: 1px solid #383838;
            }
            .flex-start {
                flex-direction: column;
                align-content: flex-start;
            }
            .flex-center {
                flex-direction: column;
                align-content: center;
                flex-wrap: wrap;
            }
            .x-groupbox {
                border-radius: 15px;
                width: auto;
                border: 1px solid #383838;
            }
            .x-attk-hdr {
                align-items: center;
                display: flex;
                vertical-align: middle;
                min-height: 24px;
                justify-content: center;
            }
            .x-attk-test-bdr {
                border-radius: 15px;
                box-shadow: inset 0px 0px 15px 5px rgba(0,0,0,.5);
            }
            .x-attk-test-bdr2 {
                border-radius: 15px;
                box-shadow: inset 0px 0px 15px 5px rgba(0,0,0,.5), 0 60px 80px rgba(0,0,0,0.60), 0 45px 26px rgba(0,0,0,0.14);
            }
            .xpt10 {
                padding-top: 10px;
            }
            .xpt20 {
                padding-top: 20px;
            }
            .xpb10 {
                padding-bottom: 10px;
            }
            .xpb20 {
                padding-bottom: 20px;
            }
        `);

        // Spinning loader for refresh
        GM_addStyle(`
            .xedx-loader {
              border: 16px solid #f3f3f3; /* Light grey */
              border-top: 16px solid #3498db; /* Blue */
              border-radius: 50%;
              width: 120px;
              height: 120px;
              animation: xedx-spin 2s linear infinite;

              position: fixed !important;
              top: 50%  !important;
              left: 50% !important;

            }

            @keyframes xedx-spin {
              0% { transform:  translate(-50%,-50%) rotate(0deg); }
              100% { transform:  translate(-50%,-50%) rotate(360deg); }
            }
        `);
    }

    function getGeneralOptsDiv() {
        const alignLeft = ` align-content: flex-start !important; `;
        const alignCenter = ` align-content: center; `;
        const justifyCenter = ` justify-content: center; `;
        const flexCol = ` flex-direction: column; width: 100%; `;
        const flexRow = ` flex-direction: row; `;

        const bBlue = " border: 2px solid blue;";
        const bGreen = " border: 2px solid green;";
        const bRed = " border: 2px solid red;";
        const bYellow = " border: 2px solid yellow;";

        const flexRowStyle = ` minimum-height: 24px !important; padding-top: 15px !important; `;

        //    box-shadow: 0 60px 80px rgba(0,0,0,0.60), 0 45px 26px rgba(0,0,0,0.14);

        // If we are going to display a tabbed dialog, need to get rid of the top padding
        const displayTabs = true;

        var paddingTop = "";
        if (displayTabs) paddingTop = " padding-top: 8px !important; ";

        // Prob don't need ID's...
        // <span class="xfmt-span xopts-black"><input name="tab-select" type="radio" value="tab">Open med items page in new tab</span>
        // xopt-border-ml8
        const generalOptsDiv = `
             <div id="xedx-npc-opts"
                 class="x-attk-test-bdr2 xopts-ctr-screen xfmt-font-blk x-ez-scroll xopts-bg xopts-cust-size xrflex ctxhide"
                 style="height: 384px !important; ` + paddingTop + `">

                 <div class="xshow-flex lb-flex xrflex" style="` + flexCol + `">

                     <div id="x-tab-gen" class="" name="general">
                         <div class="xshow-flex xrflex" style="` + flexCol + alignLeft + `">
                             <span class="x-attk-hdr xpt10">
                                 Select how you'd like times to be displayed:
                             </span>

                             <div class="xshow-flex xrflex x-groupbox-p20 flex-start">
                                 <table class="gen-table-wt xmt5 xml14">
                                     <tr>
                                         <td class="xntcl">
                                             <span class="xfmt-span">
                                                 <input class="gen-cb" type="radio" name="opt-when" value="timeat">Time At
                                             </span>
                                         </td>
                                         <td class="xntcr">
                                             <span class="xfmt-span">
                                                 <input class="gen-cb" type="radio" name="opt-when" value="timeuntil">Time Until
                                             </span>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td class="xntcl">
                                             <span class="xfmt-span">
                                                 <input class="gen-cb" type="radio" name="opt-fmt" value="fmt-tct">Time in TCT
                                             </span>
                                         </td>
                                         <td class="xntcr">
                                             <span class="xfmt-span">
                                                 <input class="gen-cb" type="radio" name="opt-fmt" value="fmt-local">Local Time
                                             </span>
                                         </td>
                                     </tr>
                                 </table>
                             </div>

                             <span class="x-attk-hdr xpt10">
                                 Select which alerts, if any, to enable:
                             </span>

                             <div class="xshow-flex xrflex x-groupbox-p20 flex-start">
                                 <table class="gen-table-cds xmt5 xml20">
                                     <tr>
                                         <td class="xntcg">
                                             <span class="xfmt-span hide-until">
                                                 <input class="gen-cb" type="checkbox" name="showAlert" value="show-alerts">
                                                     Show alerts
                                                 <input class="gen-inp inp-minute" type="number" name="minBefore" value=${minBefore}>
                                                     minutes before.
                                             </span>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td class="xntcg">
                                             <span class="xfmt-span show-alert">
                                                 <input class="gen-cb" type="checkbox" name="hideUntil" value="hide-until">
                                                     Hide until
                                                 <input class="gen-inp inp-minute" type="number"name="hideMinUntil" value=${hideMinUntil}>
                                                     minutes before.
                                             </span>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td class="xntcg">
                                             <span class="xfmt-span show-alert">
                                                 <input class="gen-cb" type="checkbox" name="showBrowserNotifications" value="browser-alert">
                                                     Browser Notifications
                                                 <input class="gen-inp inp-minute" type="number" name="notifyBefore" value=${notifyBefore}>
                                                     min before.
                                             </span>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td class="xntcg">
                                             <span class="xfmt-span show-alert">
                                                 <input class="gen-inp inp-minute" type="number" name="notificationTimeoutMs" value=${notificationTimeoutMs}>
                                                    second notification timeout.
                                             </span>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td class="xntcg">
                                             <span class="xfmt-span show-alert">
                                                 <input class="gen-cb" type="checkbox" name="notifyOnce" value=${notifyOnce}>
                                                     Only show notification once
                                             </span>
                                         </td>
                                     </tr>
                                  </table>
                             </div>

                         </div>

                     <div class="xbtn-wrap xshow-flex xrflex" style="` + flexRowStyle + flexRow + alignCenter + justifyCenter + `">
                         <button id="opts-tst" style="width:14px; height:14px; margin-left: -14px;"></button>
                         <button id="opts-refresh" class="xedx-torn-btn">Refresh</button>
                         <button id="opts-save" class="xedx-torn-btn xml10 xmr10">Save</button>
                         <button id="opts-cancel" class="xedx-torn-btn">Cancel</button>
                     </div>



                 </div>
             </div>
             `;

        return generalOptsDiv;
    }

    var saOptsStyleAdded = false;
    function addSaOptsStyles() {
        if (saOptsStyleAdded == true) return;
        saOptsStyleAdded = true;

        GM_addStyle(`
            .x-ontoptop {
                background: lightgray !important;
                z-index: 999999;
            }
            .x-saopts-size {
                width: 360px;
                height: 206px;
            }
            .x-no-ask {
                flex-wrap: wrap;
                display: flex;
                flex-direction: row;
                align-content: center;
                padding: 10px;
            }

        `);

    }

    function addInsetBoxShadowStyles() {
        GM_addStyle(`
            .hard-shadow-2px {
                  /* top, right, bottom, left */
                  box-shadow: inset 0px 3px 0px -1px #000,
                              inset -3px 0px 0px -1px #fff,
                              inset 0px -3px 0px -1px #fff,
                              inset 3px 0px 0px -1px #000;
                  /* or merged top-left, bottom-right */
                  box-shadow: inset 3px 3px 0px -1px #000,
                              inset -3px -3px 0px -1px #fff;
                }
                .hard-shadow-5px {
                  /* top, right, bottom, left */
                  box-shadow: inset 0px 10px 0px -5px #000,
                              inset -10px 0px 0px -5px #fff,
                              inset 0px -10px 0px -5px #fff,
                              inset 10px 0px 0px -5px #000;
                  /* or merged top-left, bottom-right */
                  box-shadow: inset 10px 10px 0px -5px #000,
                              inset -10px -10px 0px -5px #fff;
                }
                .soft-shadow-2px {
                  /* top, right, bottom, left */
                  box-shadow: inset 0px 2px 3px -2px #000,
                              inset -2px 0px 3px -2px #fff,
                              inset 0px -2px 3px -2px #fff,
                              inset 2px 0px 3px -2px #000;
                  /* or merged top-left, bottom-right */
                  box-shadow: inset 2px 2px 3px -2px #000,
                              inset -2px -2px 3px -2px #fff;
                }
                .soft-shadow-4px {
                  /* top, right, bottom, left */
                  box-shadow: inset 0px 4px 3px -2px #000,
                              inset -4px 0px 3px -2px #fff,
                              inset 0px -4px 3px -2px #fff,
                              inset 4px 0px 3px -2px #000;
                  /* or merged top-left, bottom-right */
                  box-shadow: inset 4px 4px 3px -2px #000,
                              inset -4px -4px 3px -2px #fff;
                }
                .soft-shadow-5px {
                  /* top, right, bottom, left */
                  box-shadow: inset 0px 10px 3px -5px #000,
                              inset -10px 0px 3px -5px #fff,
                              inset 0px -10px 3px -5px #fff,
                              inset 10px 0px 3px -5px #000;
                  /* or merged top-left, bottom-right */
                  box-shadow: inset 10px 10px 3px -5px #000,
                              inset -10px -10px 3px -5px #fff;
                }
        `);
    }

    function npcLinksButton() {
        let linksBtn = `
            <button type="button" id="xnpc-links" class="npc-link-btn" i-data="i_827_4456_34_34">
                <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <clipPath id="link_svg__a">
                            <path d="M0 0h24v24H0z">
                            </path>
                        </clipPath>
                        <filter id="link_svg__b" width="16" height="17" x="4" y="4" filterUnits="userSpaceOnUse">
                            <feOffset dy="1"></feOffset>
                            <feGaussianBlur result="blur"></feGaussianBlur>
                            <feFlood flood-color="#fff"></feFlood>
                            <feComposite in2="blur" operator="in"></feComposite>
                            <feComposite in="SourceGraphic"></feComposite>
                        </filter>
                    </defs>
                    <g clip-path="url(#link_svg__a)" filter="url(#link_svg__b)">
                        <path d="M1675.13 987.812a4.127 4.127 0 0 1 .96-.725 4.282 4.282 0 0 1 5.63 1.38l-1.5 1.5a2.257 2.257 0 0 0-2.56-1.3 2.234 2.234 0 0 0-1.08.6l-2.87 2.87a2.235 2.235 0 0 0 3.16 3.161l.88-.885a5.7 5.7 0 0 0 2.52.383l-1.95 1.953a4.286 4.286 0 0 1-6.06-6.062Zm4.55-4.557-1.95 1.953a5.715 5.715 0 0 1 2.52.382l.88-.884a2.234 2.234 0 0 1 3.16 3.16l-2.87 2.87a2.239 2.239 0 0 1-3.16 0 2.428 2.428 0 0 1-.48-.7l-1.5 1.5a4.145 4.145 0 0 0 .53.655 4.3 4.3 0 0 0 5.1.724 4.1 4.1 0 0 0 .96-.724l2.87-2.87a4.286 4.286 0 0 0-6.06-6.062Z"
                        data-name="Path 4" transform="translate(-1667 -978)">
                        </path>
                    </g>
                </svg>
            </button>
            `;

        return linksBtn;
    }

    function getShowAgainDiv() {

        addSaOptsStyles();
        addInsetBoxShadowStyles();

        const showAgainDiv = `
             <div id="xedx-sa-alert"
                 class="x-attk-test-bdr2 xopts-ctr-screen xfmt-font-blk x-ez-scroll x-ontoptop x-saopts-size xrflex">

                 <div class="xshow-flex lb-flex xrflex">

                         <div class="xshow-flex xrflex flex-start" style="flex-direction: column; width: 100%;">

                             <div class="xshow-flex xrflex x-groupbox-p20 flex-start soft-shadow-2px">
                                 <span id="x-doNotShow"></span>
                             </div>

                             <div class="xshow-flex xrflex x-groupbox soft-shadow-2px xmt20 flex-center" style="justify-content: center;">
                                 <span class="xfmt-span x-no-ask">
                                     <input class="" type="checkbox" name="doNotShow" value="doNotShow">
                                     Do not show this again
                                 </span>
                             </div>

                         </div>

                     <div class="xbtn-wrap xshow-flex xrflex"
                         style="minimum-height: 24px; padding-top: 15px; flex-direction: row; align-content: center; justify-content: center;">
                         <button id="xedx-sa-ok" class="xedx-torn-btn xml10">OK</button>
                     </div>

                 </div>
             </div>
             `;

        return showAgainDiv;
    }

})();





