// ==UserScript==
// @name         Torn NPC Attack Watcher
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Experiment, for now...
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @connect      api.lzpt.io
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.4.js
// @xrequire      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers-2.45.4.js
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

    var local = false;
    const format = 24;
    const dbgBorders = false;

    // Various (mostly display) options
    var options = {
        atOrUntil: GM_getValue("showUntilOrAt", "timeuntil"),
        timeFormat: "24",   // 12 or 24
        timeZone: GM_getValue("timeZone", "fmt-local"),  // local, TCT
        showAlert: GM_getValue("showAlert", false),
        minBefore:  GM_getValue("minBefore", 30),
        alertFormat: "highlight", // blink, notification, Discord....
        hideUntil: GM_getValue("hideUntil", false),
        hideMinUntil: GM_getValue("hideMinUntil",60),        // minutes
    };

    GM_setValue("showUntilOrAt", options.atOrUntil);
    GM_setValue("timeZone", options.timeZone);
    GM_setValue("showAlert", options.showAlert)
    GM_setValue("minBefore", options.minBefore);
    GM_setValue("hideUntil", options.hideUntil);
    GM_setValue("hideMinUntil", options.hideMinUntil);

    var startTimes = {
        until: {hrs: 0, mins: 0, secs: 0},
        atLocal: "12:12:12",
        atTCT: "12:12:12",
        valid: false
    }

    // ============================= Called on push state change ================

    // Verify I don't get two copies!!!!
    function pushStateChanged(e) {
        log("pushStateChanged: ", e);
        setTimeout(handlePageLoad, 250);
    }

    //
    // ============================== Loot Ranger functions =====================
    //

    var startTimeRaw;
    var starTimeDate;
    var startTimeUTC;
    var timesAreGood = false;
    var intervalTimer = 0;

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
    //}


        function processLootRangerResult(result) {
            var attackOrder = '';
            var attackString = '';
            var attackLink = '';
            var attackTarget = 0;
            timesAreGood = false;

            log("processLootRangerResult: ", result);

            // If there's no clear time set
            if(result.time.clear == 0  && result.time.attack === false) {
                attackString = result.time.reason ? 'NPC attacking will resume after '+result.time.reason : 'No attack currently set.';
                log("attackString: ", attackString);
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

            let now = new Date();
            let epoch = now.getTime();

            log("Start Time: ", new Date(+startTimeRaw * 1000));
            log("Start Time, local: ", new Date(+startTimeRaw * 1000).toLocaleString());
            log("timesAreGood: ", timesAreGood);

            log("Now time: ", new Date(+epoch).toLocaleString());
            let startsAt = new Date(+startTimeRaw * 1000);
            log("startsAt: ", startsAt);

            // Fills in the 'timeuntil' part of start times.
            timeDifference(startsAt);

            startTimes.startsAt = startsAt;
            startTimes.atLocal = new Date(+startTimeRaw * 1000).toLocaleString();
            startTimes.atTCT = new Date(+startTimeRaw * 1000).toString();
            startTimes.atUTC = startTimeUTC;
            startTimes.valid = timesAreGood;
            log("startTimes: ", startTimes);
        }


        if ($("#refreshSpin").length > 0) {
            setTimeout(function () {$("#refreshSpin").remove();}, 2000);
        }

        GM_setValue("lastUpdate", new Date().getTime());

        // Test
        let lastUpdate = new Date(GM_getValue("lastUpdate"));
        log("**** lastUpdate: ", lastUpdate, " | ", lastUpdate.toLocaleString());

    }


        // Returns HH:MM:SS from now...
        //function fromNowFormatted(date) {
        //    let now = new Date();
       // }

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

            if (intervalTimer == 0)
                intervalTimer = setInterval(handleIntTimer, 1000);

            log("until: ",  startTimes.until);
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

    // TBD: figure out which ones I'm actually using, coalesce, see
    // what I canuse or put into core lib,,,
    function addNpcStyles() {

        // For the options dialog?

        addContextStyles();
        loadMiscStyles();
        addBorderStyles();
        addFloatingOptionsStyles();
        addTornButtonExStyles();
        loadCommonMarginStyles();

        // Added just for this...
         GM_addStyle(`
                div.xnpc {
                    padding-bottom: 0px;
                    padding-top: 0px;
                    display: flex;
                    justify-content: center;
                    flex-direction: column;
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
                    border: 2px solid red;
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

        function getMiniOpts() {
            const miniOptsSection = `
               <hr class="xhide-show xhide delimiter___neME6">
               <div class="xhide-show xnpc-inner xhide">
                   <span class="xhide-show xhide">
                       <input id="xuntil" name="def-go" type="radio" value="until" checked>Until
                   </span>
                   <span class="xhide-show xhide">
                       <input id="xat" name="def-go" type="radio" value="at">At
                   </span>
                   <span class="xhide-show xhide">
                       <input type="checkbox" id="xchk-box" class="">Alert
                   </span>
                   <span class="xhide-show xhide" style="float:right;">
                       <i id="npccaret" class="icon fas fa-caret-down npc-caret"></i>
                   </span>
               </div>
               `;
            return miniOptsSection;
        }

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
                }
        `);

        // <hr id="xnpcdelim" class="delimiter___neME6">
        const div1 =  `
               <div id="xedxNPCAlert" class="xnpc">
                   <span class="xtouch xnpcs xtest1">NPC - click to open</span>
                   <span class="xncpi">
                   <span class="break"></span>` +

                  // getMiniOpts()

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
               <div id="xedxNPCAlert" class="xnpc">
                   <!-- span id="xclick" class="xtouch xtest2 df">NPC - click to open</span -->
                   <span id="xmenu1" class="xtime xtest2 xhide">menu 1</span>
                   <!-- span class="xncpi"><span class="break"></span -->
               </div>`;


        return div3;
    }

    var alertClickDone = false;
    function enableAlert(disable) {
        if (alertActive == false) alertClickDone = false;
        if (disable || options.showAlert == false || alertActive == false) {
            $("#xmenu1").removeClass("flash-red").removeClass("flash-red-at");
            $("#xedxNPCAlert").parent().removeClass("alert-red");
            alertActive = false;
            return;
        }

        if (alertActive == true) {
            let classToAdd = (options.atOrUntil == "timeuntil") ? "flash-red" : "flash-red-at";
            $("#xmenu1").addClass(classToAdd).addClass("df");
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
        let h1 = t1.getUTCHours();
        let m1 = t1.getUTCMinutes();
        let s1 = t1.getUTCSeconds();
        let t1secs = s1 + m1*secsmin + h1*secshr;
        debug("[debugIntTimer] h1: ", h1, " m1: ", m1, " s1: ", s1, " t1secs: ", t1secs);

        let h2 = t2.getUTCHours();
        let m2 = t2.getUTCMinutes();
        let s2 = t2.getUTCSeconds();
        let t2secs = s2 + m2*secsmin + h2*secshr;
        debug("[debugIntTimer] h2: ", h2, " m2: ", m2, " s2: ", s2, " t2secs: ", t2secs);

        // Tomorrow: add t2 secs + (fullDaySecs - t1 secs)
        // Same day: t2 secs - t1 secs
        let ist2tomorrow = h2 < h1;
        let secsdiff;
        if (ist2tomorrow == true) {
            secsdiff = t2secs + (secsday - t1secs);
        } else {
            secsdiff = t2secs - t1secs;
        }
        debug("[debugIntTimer] istomorrow: ", ist2tomorrow, " diff: ", secsdiff);

        let fmtdiff = new Date(secsdiff * 1000).toISOString().slice(11, 19);
        debug("[debugIntTimer] fmt: ", fmtdiff);

        return secsdiff;
    }

    function fmtSecsDiff(secsdiff) {
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

        debug("[debugIntTimer] hrs: ", startTimes.until.hrs,
            " mins: ", startTimes.until.mins, " secs: ", startTimes.until.secs, " min until: ", startTimes.minutesUntil);
    }

    function invalidate() {
        log("[invalidate] startTimes: ", startTimes);
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
    const loaderDiv = "<div id='refreshSpin' class='loader'></div>"
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

        doTimeUntilFromNow();

        let minsUntil = startTimes.minutesUntil;
        let doLog = false;
        if (secCounter++ == 30) {
            debug("handleIntTimer valid? ", startTimes.valid, " ", options.atOrUntil);
            debug("[handleIntTimer] times: ", startTimes, " minsUntil: ", minsUntil);
            secCounter = 0;
            //doLog = true;
        }

        // Make sure times are valid.
        let hrs = startTimes.until.hrs;
        let mins = startTimes.until.mins;
        let secs = startTimes.until.secs;
        if (hrs < 0 || mins < 0 || secs < 0) return invalidate();
        if (startTimes.valid != true) return invalidate();

        // Handle alerts. Enable if threshold set and hit
        alertActive =
            (options.showAlert == true && minsUntil >= 0 && minsUntil < options.minBefore);

        // Handle re-enabling if hidden until x minutes prior
        if (options.hideUntil && $("#xedxNPCAlert").height() == 0 && minsUntil < options.hideMinUntil) {
                redisplayAndAlert();
        }

        if (doLog == true)
            log("[handleIntTimer] Display alerts? ", options.showAlert, " until: ", minsUntil, " before: ", options.minBefore);

        if (options.atOrUntil == "timeuntil") {setTimeDisplay();}

        enableAlert();
    }

    // Not working so well. Possible alternative - clone, and remove existing
    // div. On restore, re-add and restore click handlers?
    function doHideAll() {
        if ($("#xedxNPCAlert").height() == 0) {
            log("doHideAll: already hidden");
            return;
        }
        doAnimate("#xedxNPCAlert", 0);
    }

    function redisplayAndAlert() {
        log("[redisplayAndAlert]");
        doAnimate("#xedxNPCAlert", 22);
    }

    // 2 second slide, will call animateDone at end.
    function doAnimate(sel, size) {
        log("doAnimate: ", size);
        if (size > 0) {
            $(".xhide-show2").removeClass("xhide");
            $(".xtouch").removeClass("xhide").addClass("xnpcs");
            $(".xtime").addClass("df");
            $("#xnpcdelim").removeClass("xhide");
        }

        $(sel).animate({
            height: size,
            opacity: (size==0) ? 0 : 1,
        }, 1000, function() {
            animateDone(sel, size);
        });

        let margin = (size == 0) ? "-22px" : "0px"; //(-1 * size) + "px";
        $("#uber-alert").animate({
            marginTop: margin,
        });
    }

    function animateDone(sel, size) {
        log("Animation complete: ", $(sel), " size: ", size);
        if (size == 0) {
            $(".xhide-show2").addClass("xhide");
            $(".xhide-show").addClass("xhide");
            $(".xtouch").addClass("xhide").removeClass("xnpcs");
            $(".xtime").removeClass("df");
            $("#xnpcdelim").addClass("xhide");
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

    const showOpts = function () {log("showOpts"); $(".xrflex").removeClass("ctxhide").addClass("xshow-flex");}
    const hideOpts = function () {log("hideOpts"); $(".xrflex").removeClass("xshow-flex").addClass("ctxhide");}

    const uberDiv = `<div id="uber-alert" class="uber"></div>`;
    const uberDiv2 = `<div id="uber-alert" class="uber-nb"></div>`;
        //style="background: transparent; border: 1px solid green;border-radius: 0px;height=22px;min-height: 22px;"></div>`;

    function installUI() {
        log("NPC Alert installUI");
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


        $("#sidebarNpcTimers").attr("style", "display: none;");
        $("#sidebarNpcTimers").prev().attr("style", "display: none;");
        // Temp hack
        setTimeout(hideSidebarNpcTimers, 250);

        let elem = getNPCDiv();
        makeXedxSidebarContentDiv();
        $("#x-scrollbar-content").append(elem);
        $("#x-scrollbar-content").css("padding-top", "0px");

        // This allow us to hide and show the div, unobtrusively
        let uber = dbgBorders ? $(uberDiv) : $(uberDiv2);
        $("#xedxNPCAlert").parent().wrap(uber);
        $("#uber-alert").on('click', handleBtnClick);

        // Display if not set to 'hide-until'
        //if (options.hideUntil == false)
            doNpcHideShow();

        // Right click: TBD, display options menu!
        $("#xedxNPCAlert > span.xtouch").on('contextmenu', handleRightClick);
        $("#xmenu1").on('contextmenu', handleRightClick);

        displayHtmlToolTip($("#xedxNPCAlert"), "Left-click to hide.<br>Right-click for options.", "tooltip4");
        setOptionsState();

        // TBD: show, blink a few times,and fade away.
        // Prob need to be sure all xhide-show are hidden...
        if (options.hideUntil == true) {
            alert("The NPC Attack Watcher is running but hidden.\n" +
                  "Will become visible at " + options.hideMinUntil +
                  " minutes prior to attack time.\nCan alway display by clicking....");
            //doHideAll();
            handleBtnClick();
        }

        // ============ optons dlg ============

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
        showOpts();
        return false;
    }

    function hideShowOpts() {
        toggleClass(".xhide-show", "xhide", "df");
    }

    var doHide = true;
    function handleBtnClick(e) {
        if (doHide)
            doHideAll();
        else
            redisplayAndAlert();
        doHide = !doHide;
    }


    // This handles the caret click, opens the alert area.
    function handleCaretClick(e) {
        let node = e.currentTarget;
        log("caret click: ", $(node));

        if ($(node).hasClass('fa-caret-down')) {
            $(node).removeClass("fa-caret-down").addClass("fa-caret-right");
        } else {
            $(node).removeClass("fa-caret-right").addClass("fa-caret-down");
        }

        toggleTimeDisplay();
    }

    function toggleTimeDisplay() {
        let list = $(".xhide-show2");
        log("list: ", $(list));
        for (let idx=0; idx < $(list).length; idx++) {
            let elem = $(list)[idx];
            log("elem: ", $(elem));
            if ($(elem).hasClass("xhide")) {
                log("Removing class");
                $(elem).removeClass("xhide");
                if ($(elem).hasClass("xtime")) $(elem).addClass("df");

                // ????
                setTimeDisplay();
            } else {
                log("Adding class");
                $(elem).addClass("xhide").removeClass("df");
            }
        }
    }

    // No longer required!
    //function n(n){return n > 9 ? "" + n: "0" + n;}
    function n(x){return x;}

    var sepOn = true;
    function setTimeDisplay() {
        let timeText = "00:00:00";
        if (startTimes.valid == true) {
            let sep = sepOn ? ":" : " ";

            // To blink the colon:
            //sepOn = !sepOn;

            if (options.atOrUntil == "timeuntil") {
                timeText = n(startTimes.until.hrs) + sep + n(startTimes.until.mins) + sep + n(startTimes.until.secs);
            } else {
                timeText = (options.timeZone == "fmt-local") ? startTimes.atLocal : startTimes.atUTC;
            }
        }

        $("#xmenu1").text(timeText);
    }

    function setOptionsState() {
        let untilOrAt = GM_getValue("showUntilOrAt", "timeuntil");
        options.atOrUntil = untilOrAt;
        if (untilOrAt == "timeat") $("#xat").prop('checked', true);
        if (untilOrAt == "timeuntil") $("#xuntil").prop('checked', true);

        $('input:radio[name=opt-when]').click(function() {
            let value = $(this).val();
            options.atOrUntil = value;
            GM_setValue("showUntilOrAt", value);
            setTimeDisplay();
            //$("#xmenu1").text(value);
            log("radio clicked, value = ", value);
        });
    }

    // ==================================================================

    function handlePageLoad() {
        installUI();
        queryLootRangers();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    //versionCheck();

    addFloatingOptionsStyles();
    addContextStyles();
    loadMiscStyles();
    addNpcStyles();
    addToolTipStyle();

    // Just need for test btn...
    //addTornButtonExStyles();

    installPushStateHandler(pushStateChanged);

    //GM_addStyle("#mainContainer div {border-radius: 15px; background-color: #0a0a0a;}");

    callOnContentLoaded(handlePageLoad);

     // ================================== Options dialog ================================

    var myOptsSel = "#xedx-npc-opts";

    function installOptsDialog() {
        let optsDiv = getGeneralOptsDiv();

        $("body").prepend(optsDiv);
        log("Prepended: ", $(myOptsSel));

        initSavedOpts();
        addGeneralHandlers();
        closeOnOutsideClicks();
    }

    function initSavedOpts() {

        log("[initSavedOpts] ");
        options.atOrUntil = GM_getValue("showUntilOrAt", "timeuntil");
        let isChecked = (options.atOrUntil == "timeuntil");
        log("[initSavedOpts] showUntilOrAt val: ", options.atOrUntil, " isChecked: ", isChecked);
        $("input[name=opt-when][value=timeuntil]").prop('checked', isChecked);
        $("input[name=opt-when][value=timeat]").prop('checked', !isChecked);
        GM_setValue("showUntilOrAt", options.atOrUntil);

        options.timeZone = GM_getValue("timeZone", "fmt-local");
        isChecked = (options.timeZone == "fmt-local");
        log("[initSavedOpts] timeZone val: ", options.timeZone, " isChecked: ", isChecked);
        $("input[name=opt-fmt][value=fmt-local]").prop('checked', isChecked);
        $("input[name=opt-fmt][value=fmt-tct]").prop('checked', !isChecked);
        GM_setValue("timeZone", options.timeZone);

        options.hideUntil = GM_getValue("hideUntil", false);
        isChecked = (options.hideUntil == true);
        log("[initSavedOpts] hideUntil val: ", options.hideUntil, " isChecked: ", isChecked);
        $("input[name=hideUntil]").prop('checked', isChecked);
        GM_setValue("hideUntil", options.hideUntil);

        options.hideMinUntil = GM_getValue("hideMinUntil", 60);
        log("[initSavedOpts] minBefore val: ", options.hideMinUntil);
        $("input[name=minBefore]").val(options.hideMinUntil);
        GM_setValue("minBefore", options.hideMinUntil);

        options.showAlert = GM_getValue("showAlert", false);
        isChecked = (options.showAlert == true);
        log("[initSavedOpts] showAlert val: ", options.showAlert, " isChecked: ", isChecked);
        $("input[name=showAlert]").prop('checked', isChecked);
        GM_setValue("showAlert", options.showAlert);
    }

    function addGeneralHandlers() {
        log("addGeneralHandlers: ",$(myOptsSel));

        // Cancel and save buttons save: doSave, cancel: doSwap
        /*
        $("#opts-save").on('click', function() {
            log("onSave");
            //doSave(activeCtxMenuSel);
            hideOpts();
        });
        */

        $("#opts-refresh").on('click', doTimeRefresh);

        $("#opts-cancel").on('click', function() {
            log("[onCancel] (close button) opts: ", options);

            let entered = $("input[name=minBefore]").val();
            GM_setValue("minBefore", entered);
            options.minBefore  = entered;
            hideOpts();
        });

        $(".gen-cb").on("click", handleGeneralCbClick);
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

    // Handle anything on the general page..
    function handleGeneralCbClick(e) {
        let node = $(e.currentTarget);
        let val = $(node).attr("value");
        let entered = $(node).val();
        let checked = $(node)[0].checked;
        let name = $(node).attr("name");

        if (name == 'opt-when') {
            log("handleGeneralCbClick opt-when clicked, val: ", val);
            options.atOrUntil = val;
            GM_setValue("showUntilOrAt", val);
            setTimeDisplay();
        }

        if (name == 'opt-fmt') {
            log("handleGeneralCbClick opt-fmt clicked, val: ", val);
            options.timeZone = val;
            GM_setValue("timeZone", val);
            setTimeDisplay();
        }

        if (name == "hideUntil") {
            log("handleGeneralCbClick hideUntil clicked, val: ", val);
            options.hideUntil = checked;
            GM_setValue("hideUntil", checked);
        }

        // Either add event listener for "blur" or save when close clicked...
        if (name == "minBefore") {
            log("handleGeneralCbClick minBefore clicked, val: ", entered);
            options.minBefore = entered;
            GM_setValue("minBefore", entered);
        }

        if (name == "showAlert") {
            log("handleGeneralCbClick showAlert clicked, val: ", val);
            options.showAlert = checked;
            GM_setValue("showAlert", checked);
        }

        log("handleGeneralCbClick options: ", options);
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

        let flexRowStyle = ` minimum-height: 24px !important; `;
        flexRowStyle += ` padding-top: 15px !important; `;

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
                width: 50px;
                margin-left: 10px;
                border-radius: 5px;
                border: 1px solid;
            }
            .row-two {
                flex-direction: row;
                display: flex;
                width: 360px;
            }

            .x-test-groupbox {
                margin-top: 10px;
                padding: 20px;
                border-radius: 15px;
                width: auto;
                border: 1px solid #383838;
                flex-direction: column;
                align-content: flex-start;
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
            .loader {
              border: 16px solid #f3f3f3; /* Light grey */
              border-top: 16px solid #3498db; /* Blue */
              border-radius: 50%;
              width: 120px;
              height: 120px;
              animation: spin 2s linear infinite;

              position: fixed !important;
              top: 50%  !important;
              left: 50% !important;

            }

            @keyframes spin {
              0% { transform:  translate(-50%,-50%) rotate(0deg); }
              100% { transform:  translate(-50%,-50%) rotate(360deg); }
            }
        `);

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
                 class=" xx-xopt-border-ml8 x-attk-test-bdr2 xopts-ctr-screen xfmt-font-blk x-ez-scroll xopts-bg xopts-cust-size xrflex ctxhide"
                 style="height: 360px !important; ` + paddingTop + `">

                 <div class="xshow-flex lb-flex xrflex" style="` + flexCol + `">

                     <div id="x-tab-gen" class="" name="general">
                         <div class="xshow-flex xrflex" style="` + flexCol + alignLeft + `">
                             <span class="x-attk-hdr xpt10">
                                 Select how you'd like times to be displayed:
                             </span>

                             <div class="xshow-flex xrflex x-test-groupbox">
                                 <table class="gen-table-wt xmt5 xml14">
                                     <tr>
                                         <td class="xntcl"><span class="xfmt-span">
                                             <input class="gen-cb" type="radio" name="opt-when" value="timeat">Time At
                                         </span></td>
                                         <td class="xntcr"><span class="xfmt-span">
                                             <input class="gen-cb" type="radio" name="opt-when" value="timeuntil">Time Until
                                         </span></td>
                                     </tr>
                                     <tr>
                                         <td class="xntcl"><span class="xfmt-span">
                                             <input class="gen-cb" type="radio" name="opt-fmt" value="fmt-tct">Time in TCT
                                         </span></td>
                                         <td class="xntcr"><span class="xfmt-span">
                                             <input class="gen-cb" type="radio" name="opt-fmt" value="fmt-local">Local Time
                                         </span></td>
                                     </tr>
                                 </table>
                             </div>

                             <span class="x-attk-hdr xpb10 xpt10">
                                 Select which alerts, if any, to enable:
                             </span>

                             <div class="xshow-flex xrflex x-test-groupbox">
                                 <table class="gen-table-cds xmt5 xml20">
                                     <tr>
                                         <td class="xntcg"><span class="xfmt-span hide-until">
                                             <input class="gen-cb" type="checkbox" name="showAlert" value="show-alerts">Show alerts
                                             <input class="gen-cb inp-minute" type="number" name="minBefore" value="min-before">minutes before.
                                         </span></td>
                                     </tr>
                                     <tr>
                                         <td class="xntcg"><span class="xfmt-span show-alert">
                                             <input class="gen-cb" type="checkbox" name="hideUntil" value="hide-until">Hide until
                                             <input class="gen-cb inp-minute" type="number"
                                                name="hideMinBefore" value=hide-"min-before">minutes before.
                                         </span></td>
                                     </tr>
                                  </table>
                             </div>

                         </div>

                     <div class="xbtn-wrap xshow-flex xrflex" style="` + flexRowStyle + flexRow + alignCenter + justifyCenter + `">

                         <button id="opts-refresh" class="xedx-torn-btn xmr10">Refresh</button>
                         <button id="opts-cancel" class="xedx-torn-btn xml10">Close</button>
                     </div>



                 </div>
             </div>
             `;

        return generalOptsDiv;
    }

})();