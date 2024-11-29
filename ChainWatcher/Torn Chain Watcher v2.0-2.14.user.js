// ==UserScript==
// @name         Torn Chain Watcher v2.0
// @namespace    http://tampermonkey.net/
// @version      2.14
// @description  Make the chain timeout/count blatantly obvious.
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    // Global, editable options
    debugLoggingEnabled = false;                    // Special debug logging, used during development
    loggingEnabled = true;                          // regular logging

    var flashOn = GM_getValue('flashOn', true);
    var muted = GM_getValue('muted', false);
    var beepOpt = GM_getValue('beepOpt', '$');       // Time before audio alert in sec
    var blinkOpt = GM_getValue('blinkOpt', '$');     // Time before visual in sec
    var notifyOpt = GM_getValue('notifyOpt', '$');   // Time before notificatiob alert in sec
    var volume = GM_getValue('volume', .5);
    var beepType = GM_getValue('beepType', "sine");  // "sine", "square", "sawtooth", "triangle" (or 'custom', but then need a periodic wave function)
    var hideOpts = GM_getValue('hideOpts', false);
    var notifyOn = GM_getValue('notifyOn', true);    // true if notifications enabled
    var minChainCount = GM_getValue("minChainCount", 5);      // Don't track until the chain is this long
    var runOnAnyPage = GM_getValue("runOnAnyPage", false);    // Keep track no matter page you are on, not just fac page
    var optsHitList = GM_getValue("optsHitList", false);      // Experimental: personal hit list
    var warnBonusNear = GM_getValue("warnBonusNear", false);  // Warn if bonus hit close
    var bonusWarnBefore = GM_getValue("bonusWarnBefore", 10); // Warn if this many hits till bonus hit

    // Editable via storage - time in secs before notification times out
    const notifyTimeSecs = GM_getValue("notifyTimeSecs", 120);
    const notificationTimeoutMs = notifyTimeSecs * 1000;
    const notifyWaitTime = GM_getValue("notifyWaitTime", 30000);
    GM_setValue("notifyTimeSecs", notifyTimeSecs);
    GM_setValue("notifyWaitTime", notifyWaitTime);

    saveOptions();

    const chainTimeSelect = "[class*='chain-bar__'] [class*='bar-stats__'] [class*='bar-timeleft__']";
    const chainCountSelect = "[class*='chain-bar__'] [class*='bar-stats__'] [class*='bar-value__']";
    const chainTime = function () { return $(chainTimeSelect).text();}
    const chainCountFull = function () { return $(chainCountSelect).text();}
    const chainCount = function () {
        let full = chainCountFull();
        let parts = full.split('/');
        return Number(parts[0]);
    }

    // Number(chainCount().split('/')[0]);

    // Non-editable globals, dynamically adjusted
    const notifyTag = "tcw";
    var timerId = 0;
    var lastState = GM_getValue("lastState", "open");         // open or collapsed
    var chainInCd = false;
    const beepFrequency = 440; // In hertz, 440 is middle A
    var targetNode = null;
    var chainNode = null;
    var beeping = false;
    var beepInt = 0;
    var testBeepInt = 0;
    var testingVideo = false;
    var intTimer = null;

    // Debug/dev stuff
    const xedxDevMode = GM_getValue("xedxDevMode", false);
    const instTestBtn = false;

    if (xedxDevMode == false) {
        optsHitList = false;
    }

    // Some misc UI stuff that needs to be declared first
    const emptyTd = `<span class="xpg3-btn2">Edit</span>
                     <div class="xstat-icon" style="min-width: 16px;"></div>
                     <div class="x200min honor-text-wrap default big" style="min-width: 200px;"></div>`;
    const editBtn = `<span class="xpg3-btn2">Edit</span>`;

    function secsLeft() {
        let parts = chainTime() ? chainTime().split(':') : [0, 0];
        return Number(parts[0]) * 60 + Number(parts[1]);
    }

    var audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
    function beep(duration=500, frequency=440, volume=1, type='sine', callback) {
        var oscillator = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (volume){gainNode.gain.value = volume;}
        if (frequency){oscillator.frequency.value = frequency;}
        if (type){oscillator.type = type;}
        if (callback){oscillator.onended = callback;}

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + ((duration || 500) / 1000));
    };

    function handleInputChange(e) {
        let target = e.target
        if (e.target.type !== 'range') {
            target = document.getElementById('range')
        }
        const min = target.min
        const max = target.max
        const val = target.value
        $("#rangevalue")[0].textContent = val;
        debug('min: ' + min + ' max: ' + max + ' val: ' + val + ' background size: ' + target.style.backgroundSize);

        target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%'
        volume = val/100;
        saveOptions();
    }

    function doBeep() {
        beep(null, beepFrequency, volume, beepType);
    }

    function beepingOn() {
        if (!muted && !beeping && !beepInt) {
            beepInt = setInterval(doBeep, 1000);
            beeping = true;
        }
    }

    function beepingOff() {
        if (beepInt) clearInterval(beepInt);
        beeping = false;
        beepInt = 0;
    }

    function mute(value) { // TRUE to mute
        log('Muting');
        muted = value;
        if (value) beepingOff();
    }

    function doMute() {
        mute(!muted);
        $('#xtoggle-mute').css('color', muted ? '#FF0033' : '');
        $('#xtoggle-mute').css('filter', muted ? 'brightness(1.2)' : '');
    }

    function checkBeep(seconds) {
        if (!beepOpt || beepOpt == '$' || muted || beepOpt < seconds) return false;
        return true;
    }

    function checkBlink(seconds) {
        if (!blinkOpt || blinkOpt == '$' || blinkOpt < seconds) return false;
        return true;
    }

    function checkNotify(seconds) {
        if (!notifyOpt || notifyOpt == '$' || notifyOpt < seconds) return false;
        return true;
    }

    var notifyOpen = false;   // We have opened, but this flag is cleared after a delay
    var notifyActive = false; // Same but cleared immediately
    var stopUpdating = false;
    var updateTimer = 0;
    const clearNotifyFlag = function(){
        debug("clearNotifyFlag: ", stopUpdating, " | ", notifyActive, " | ", notifyOpen);
        notifyOpen = false;
        stopUpdating = false;
    }

    // If timed out, not clicked, maybe we do want to re-open....
    const onNotifyDone = function(){
        debug("onNotifyDone: ", stopUpdating, " | ", notifyActive, " | ", notifyOpen);
        notifyActive = false;
        if (!stopUpdating && updateTimer) return;

        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = 0;
        setTimeout(clearNotifyFlag, notifyWaitTime);
    }

    const onNotifyClick = function() {
        debug("onNotifyClick: ", stopUpdating);
        notifyActive = false;
        stopUpdating = true;
    }

    function updateNotification(reset) {
        debug("updateNotification: ", reset, " | ", stopUpdating, " | ", notifyActive, " | ", notifyOpen);
        let timeRemains = secsLeft();
        debug("timeRemains: ", timeRemains);
        if (!timeRemains) return;
        if (stopUpdating == true) return;

        let msgText = "The chain will time out in " + chainTime() + "!";

        GM_notification ({
            title: 'Chain Watcher Alert!',
            text: msgText,
            tag: notifyTag,
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: notificationTimeoutMs,
            onclick: onNotifyClick,
            ondone: onNotifyDone,
        });

        if (reset == true) setNotifyUpdate();
    }

    function setNotifyUpdate() {
        debug("setNotifyUpdate: ", stopUpdating);
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = 0;
        if (stopUpdating) return;
        updateTimer = setTimeout(updateNotification, 10000, true);
    }

    function doBrowserTimerNotify() {
        debug("doBrowserTimerNotify: ", stopUpdating, " | ", notifyActive, " | ", notifyOpen);
        if (notifyOpen == true || stopUpdating == true) return;
        notifyOpen = true;
        notifyActive = true;
        let timeRemains = secsLeft();
        let msgText = "The chain will time out in " + chainTime() + "!";

        GM_notification ({
            title: 'Chain Watcher Alert!',
            text: msgText,
            tag: notifyTag,
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: notificationTimeoutMs,
            onclick: onNotifyClick,
            ondone: onNotifyDone
        });
    }

    // Track how often we notify for a given bonus level
    var lastBonusNotify = {bonus: 0, count: 0};
    function updateLastBonusNotify() {
        let bonus = getNextBonus();
        //log("updateLastBonusNotify, next at:  ", bonus, " now: ", lastBonusNotify);

        if (lastBonusNotify.bonus != bonus) {
            lastBonusNotify.bonus = bonus;
            lastBonusNotify.count = 1;
        } else {
            lastBonusNotify.count++;
        }

        //log("updateLastBonusNotify, now:  ", lastBonusNotify);
    }

    function getBonusNotifyCount() {
        let nextBonus = getNextBonus();
        //log("getBonusNotifyCount, next: ", nextBonus, " now: ", lastBonusNotify.count);
        if (nextBonus != lastBonusNotify.bonus)
            return 0;
        else
            return lastBonusNotify.count;
    }

    var maxBonusNotifies = 3;           // Make option later
    var timeBetweenBonusNotify = 30000; // 30 secs, make option later?
    var bonusNotifyActive = false;

    function resetBonusFlag() {bonusNotifyActive = false;}

    function bonusNotifyDone() {
        //log("bonusNotifyDone, time until next warning: ", timeBetweenBonusNotify/1000, " secs.");
        setTimeout(resetBonusFlag, timeBetweenBonusNotify);
    }

    function doBrowserBonusNotify() {
        let nextBonus = getNextBonus();
        debug("doBrowserBonusNotify, fullCount ", chainCountFull(),
              " bonus at: ", nextBonus, " bonusWarnBefore: ", bonusWarnBefore,
              " active: ", bonusNotifyActive);

        if (bonusNotifyActive == true) return;
        bonusNotifyActive = true;

        let hitsToBonus = nextBonus - chainCount();
        let msgText = "Bonus hit coming up (" + nextBonus + ") in " + hitsToBonus + " hits!";

        GM_notification ({
            title: 'Chain Watcher Alert!',
            text: msgText,
            tag: "chainBonus",
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: notificationTimeoutMs,
            //onclick: bonusNotifyDone,
            ondone: bonusNotifyDone
        });
        updateLastBonusNotify();
    }

    var bonusHits = [10, 25, 50, 100, 250, 500, 1000, 2500,
                     5000, 10000, 25000, 50000, 100000];
    function getNextBonus() {
        let count = chainCount();
        for (let idx=0; idx<bonusHits.length; idx++) {
            if (count > bonusHits[idx]) continue;
            return bonusHits[idx];
        }
        return 0;
    }

    var tempCnt = 0;
    function checkBonusCount() {
        if (!warnBonusNear || bonusNotifyActive == true) {
            //if (tempCnt++ % 60 == 0) log("bonusNotifyActive: ", bonusNotifyActive);
            return;
        }

        // Only notify so many times, the number can be an option later.
        let notifyCount = getBonusNotifyCount();
        let hitsToBonus = getNextBonus() - chainCount();

        //log("checkBonusCount: hitsToBonus: ", hitsToBonus,
        //    ", warn before: ", bonusWarnBefore, " count so far: ", notifyCount);

        if (notifyCount == maxBonusNotifies) return;

        if (hitsToBonus <= bonusWarnBefore) {
            doBrowserBonusNotify();
        }
    }

    var lastVideoAlertState = false;    // true if in flashing/alert state

    function stopAllAlerts() {
        beepingOff();
        if ($("#xedx-chain-span").hasClass("xedx-chain-alert"))
            $("#xedx-chain-span").toggleClass("xedx-chain-alert xedx-chain");
        lastVideoAlertState = false;
    }

    var cdHandled = false;
    var dropHandled = false;
    function timerProc() {
        if (chainInCd == true && !cdHandled) {
            $($("#xedx-chain-span")[0]).text("Cooldown");
            stopAllAlerts();
            clearNotifyFlag();
            cdHandled = true;
            return;
        }
        
        let seconds = secsLeft();
        let speed = 1;
        if (seconds < 20 && seconds >= 15) speed = 0.8;
        else if (seconds < 15 && seconds >= 10) speed = 0.6;
        else if (seconds < 10 && seconds >= 5) speed = 0.3;
        if (speed != 1)
            $("#xedx-chain-alert").css("animation-duration", speed + "s");

        // Check for chain drop/end
        let count = chainCount(); //Number(chainCount().split('/')[0]);
        if (count == 0 || seconds == 0) {
            if (dropHandled == true) return;
            $($("#xedx-chain-span")[0]).text("00:00");
            clearNotifyFlag();
            stopAllAlerts();
            dropHandled = true;
            return;
        }

        dropHandled = false;
        cdHandled = false;

        // Check for min chain count option
        if (count < minChainCount) {
            $($("#xedx-chain-span")[0]).text(chainTime());
            stopAllAlerts();
            return;
        }

        // Handle audio
        if (checkBeep(seconds)) {
            beepingOn();
        } else {
            beepingOff();
        }

        // Handle browser notifications
        if (notifyOn && !notifyOpen && checkNotify(seconds))
            doBrowserTimerNotify();

        let alertState = (checkBlink(seconds) && flashOn);
        if (alertState != lastVideoAlertState) {
            $("#xedx-chain-span").toggleClass("xedx-chain-alert xedx-chain");
        }
        lastVideoAlertState = alertState;

        $($("#xedx-chain-span")[0]).text(chainTime());

        // Finally check chain count for bonus hit if enabled
        if (warnBonusNear == true) {
            checkBonusCount();
        }
    };

    function saveOptions() {
        GM_setValue('flashOn', flashOn);
        GM_setValue('muted', muted);
        GM_setValue('beepOpt', beepOpt);
        GM_setValue('blinkOpt', blinkOpt);
        GM_setValue('notifyOpt', notifyOpt);
        GM_setValue('volume', volume);
        GM_setValue('beepType', beepType);
        GM_setValue('hideOpts', hideOpts);
        GM_setValue('notifyOn', notifyOn);
        GM_setValue("minChainCount", minChainCount);
        GM_setValue("runOnAnyPage", runOnAnyPage);
        GM_setValue("optsHitList", optsHitList);
        GM_setValue("warnBonusNear", warnBonusNear);
        GM_setValue("bonusWarnBefore", bonusWarnBefore);
    }

    function setOptions() {
        let val = volume * 100;
        let min = $('#rangeslider')[0].min;
        let max = $('#rangeslider')[0].min;
        $('#rangeslider')[0].value = volume * 100;
        $('#rangeslider')[0].style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%'
        $("#rangevalue")[0].textContent = volume * 100;
        $('#audible-select')[0].value = beepOpt;
        $('#visible-select')[0].value = blinkOpt;
        $('#notify-select')[0].value = notifyOpt;
        $('#xedx-audible-opt').prop('checked', !muted);
        $('#xedx-visual-opt').prop('checked', flashOn);
        $('#xedx-notify-opt').prop('checked', notifyOn);
        $("#minChainCount").val(minChainCount);
        $("#optsHitList").prop('checked', optsHitList);
        $("#xedx-anypage-opt").prop('checked', runOnAnyPage);
        $("#warnBonusNear").prop('checked', warnBonusNear);
        $("#bonusWarnBefore")[0].value = bonusWarnBefore;
    }

    function startTimer() {
        targetNode = document.querySelector("[class*='bar-timeleft__']");
        chainNode = document.querySelector("[class*='bar-value__']");
        if (!targetNode || !chainNode) {
            log('Unable to find target nodes! ', targetNode, chainNode);
            return setTimeout(startTimer, 1000);
        }

        intTimer = setInterval(timerProc, 1000);
    }

    const hideInnerAnimateSpeed = 750;
    const hideAnimateSpeed = 750;
    function hideInnerDiv(e) {
        let heightInner = parseInt($("#xchain-inner").css("height"));
        let doShrink = (heightInner > 0);

        if (doShrink) {
            lastState = "collapsed";
            doHideOpts(true);
        } else {
            lastState = "open";
        }
        GM_setValue("lastState", lastState);

        $("#xchain-inner").animate({
            opacity: doShrink ? 0 : 1,
            height: doShrink ? "0px" : "69px",
        }, hideAnimateSpeed, function () {

        });

        $("#xchain-tabl").animate({
            height: doShrink ? "27px" : "84px",
        }, hideAnimateSpeed, function () {
            $("#xchain-tabl").toggleClass("xopen xcollapsed");
        });

        $("#xchain-tabr").animate({
            height: doShrink ? "27px" : "84px",
        }, hideAnimateSpeed, function () {
            $("#xchain-tabr").toggleClass("xopen xcollapsed");
        });
    }

    function doNotifyTest() {

    }

    function doAudioTest() {
        let enabled = ($('#test-audio')[0].value == 'on') ? true : false;
        if (enabled) {
            log('Turning off');
            $('#test-audio')[0].value = 'off';
            $('#test-audio').removeClass('button-on');
            $('#test-audio').addClass('button-off');
            clearInterval(testBeepInt);
            testBeepInt = 0;
        } else {
            if (testBeepInt) return;
            log('Turning on');
            $('#test-audio')[0].value = 'on';
            $('#test-audio').addClass('button-on');
            $('#test-audio').removeClass('button-off');
            testBeepInt = setInterval(doBeep, 1000);
        }
    }

    function doVideoTest() {
        testingVideo = !testingVideo;
        $("#xedx-chain-span").toggleClass("xedx-chain-alert xedx-chain");
        $('#test-video').toggleClass("button-on");
    }

    const hideOptsSpeed = 750;
    function doHideOpts(forceClose) {
        let size = 0;
        let tabHeight = "84px";
        let opts = {};
        if (parseInt($('#xedx-chainwatch-opts').css("height")) > 0) {
            opts.height = "0px";
            opts.opacity = 0;
        } else {
            if (forceClose == true) return;
            $('#xedx-chainwatch-opts').css("left", "");
            opts.opacity = 1;
            opts.height = "125px";
            tabHeight = "209px";
        }

        $('#xedx-chainwatch-opts').animate(opts, hideOptsSpeed, function() {
            $('#xedx-chainwatch-opts').css("left", ((size == "0px") ? -5000 : ""));
        });

        $("#xchain-tabl").animate({
            height: tabHeight,
        }, hideOptsSpeed, function () {
            //$("#xchain-tabl").toggleClass("xopen xcollapsed");
        });

        $("#xchain-tabr").animate({
            height: tabHeight,
        }, hideOptsSpeed, function () {
            //$("#xchain-tabr").toggleClass("xopen xcollapsed");
        });

        $("#xtoggle-more").delay(500).animate({opacity: opts.opacity}, 1000);
    }

    var currOptsPg = 1;
    const optsMoreSpeed = 500;
    function handleOptsMore() {

        let smOptsSel, bigOptsSel, smPageSel, bigPageSel;
        let smSize = "0px", smOpac = 0;
        let bigSize = "145px", bigOpac = 1;

        log("handleOptsMore, hitlist enabled? ", optsHitList);
        if (optsHitList == true) {
            switch (currOptsPg) {
                case 1:
                    smOptsSel = "#xchain-topts1"; bigOptsSel = "#xchain-topts2";
                    smPageSel = "#xopts-page1"; bigPageSel = "#xopts-page2";
                    break;
                case 2:
                    smOptsSel = "#xchain-topts2"; bigOptsSel = "#xchain-topts3";
                    smPageSel = "#xopts-page2"; bigPageSel = "#xopts-page3";
                    break;
                case 3:
                    smOptsSel = "#xchain-topts3"; bigOptsSel = "#xchain-topts1";
                    smPageSel = "#xopts-page3"; bigPageSel = "#xopts-page1";
                    break;
                default:
                    console.error("Internal error, wrong page: ", currOptsPg);
                    debugger;
                    return;
            }

            log("handleOptsMore, page: ", currOptsPg);
            log("handleOptsMore, small opts: ", smOptsSel, " big opts: ", bigOptsSel);
            log("handleOptsMore, small page: ", smPageSel, " big page: ", bigPageSel);

            if (++currOptsPg == 4) currOptsPg = 1;

            $(bigOptsSel).css("left", "");
            $(smPageSel).animate({height: smSize}, optsMoreSpeed);
            $(smOptsSel).animate({opacity: smOpac}, optsMoreSpeed, function() {
                $(smOptsSel).css("left", "-1000px");});
            $(bigPageSel).animate({height: bigSize}, optsMoreSpeed);
            $(bigOptsSel).animate({opacity: bigOpac}, optsMoreSpeed);

        } else {
            let refSize = parseInt($("#xopts-page1").css("height"));
            if (refSize > 0) {
                $("#xchain-topts2").css("left", "");
                $("#xopts-page1").animate({height: smSize}, optsMoreSpeed);
                $("#xchain-topts1").animate({opacity: smOpac}, optsMoreSpeed, function() {
                    $("#xchain-topts1").css("left", "-1000px");});
                $("#xopts-page2").animate({height: bigSize}, optsMoreSpeed);
                $("#xchain-topts2").animate({opacity: bigOpac}, optsMoreSpeed);
            } else {
                $("#xchain-topts1").css("left", "");
                $("#xopts-page2").animate({height: smSize}, optsMoreSpeed);
                $("#xchain-topts2").animate({opacity: smOpac}, optsMoreSpeed, function() {
                    $("#xchain-topts2").css("left", "-1000px");});
                $("#xopts-page1").animate({height: bigSize}, optsMoreSpeed);
                $("#xchain-topts1").animate({opacity: bigOpac}, optsMoreSpeed);
            }
        }
    }

    function installUiHandlers() {

        instTabHandlers();          // 'Tab' on left, to open/close,
        instBtnHandlers();          // Buttons along top right
        instAudioVideoCtrls();      // Options for audio/video
        installToolips();           // Install simple help
        instPageTwoHandlers();
        if (xedxDevMode == true && optsHitList == true)
            instPageThreeHandlers();

        // Local functions...
        function installToolips() {
            GM_addStyle(".lh15 {line-height: 1.5;}");
            let tt4 = "tooltip4 lh15";
            const minimizeTxt = "Collapse main window.<br>Tab on left restores.";
            const optionsTxt = "Show various alerting options";
            const audioAlertTxt = "Select this to beep when the chain counter<br>" +
                                  "is getting low. You will need to press 'Test Audio'<br>" +
                                  "to enable beeping to work.";
            const videoAlertTxt = "Select this to flash the time<br>" +
                                   "remaining when running low.";
            const timeUntilTxt = "Display alert when the chain<br>" +
                                 "timer reaches this time left.";
            const audioTestTxt = "You must press this button at<br>" +
                                 "once to enable audio support.<br>" +
                                 "It will beep your speaker until<br>" +
                                 "you press it again. The volume<br>" +
                                 "can be set to work independently<br>" +
                                 "of normal speaker volume.";
            const videoTestTxt = "Pressing this should cause<br>" +
                                 "the display to flash. Press<br>" +
                                 "again to stop.";
            const notifyTxt = "Select this to display browser alerts<br>" +
                              "when the timer is getting low. They will<br>" +
                              "show up no matter what tab you happen to be<br>" +
                              "viewing, Torn or not.";
            const notifyTestTxt = "This will briefly display a<br>" +
                                  "browser notification alert; it<br>" +
                                  "automatically close in 5 seconds<br>" +
                                  "or if clicked, or 'close' is pressed.";
            const tabTxt = "Click here to hide/show<br>the main chain watcher window.";
            const muteTxt = "Mute the damn beeping!<br>Can also turn off the option...";
            const minCntTxt = "Set this to prevent alerts<br>" +
                              "when not really chaining.<br>" +
                              "Alerts will not be shown until<br>" +
                              "the chain reaches this number.";
            const anyPgTxt = "This will allow running on any<br>" +
                             "page, no just faction page. There<br>" +
                             "will not be any UI on those pages,<br>" +
                             "but browser notifications will still<br>" +
                             "be shown when the timer is running low.";
            const bonusWarnTxt = "This will display a browser notification<br>" +
                             "if selected. It will display at most 3 times,<br>" +
                             "at 30 seconds from when the first one is either<br>" +
                             "clicked or times out (default 120 seconds).";
            const bonusNumberTxt = "You will be notified when there are<br>" +
                              "this many hits until the next chain bonus.";

            displayHtmlToolTip($("#xtoggle-main"), minimizeTxt, tt4);
            displayHtmlToolTip($("#xtoggle-opts"), optionsTxt, tt4);
            displayHtmlToolTip($("#xtoggle-mute"), muteTxt, tt4);

            displayHtmlToolTip($("#xedx-audible-opt").parent(), audioAlertTxt, tt4);
            displayHtmlToolTip($("#xedx-visual-opt").closest("td"), videoAlertTxt, tt4);
            displayHtmlToolTip($("#audible-select"), timeUntilTxt, tt4);
            displayHtmlToolTip($("#visible-select"), timeUntilTxt, tt4);
            displayHtmlToolTip($("#notify-select"), timeUntilTxt, tt4);
            displayHtmlToolTip($("#test-audio").parent(), audioTestTxt, tt4);
            displayHtmlToolTip($("#test-video"), videoTestTxt, tt4);
            displayHtmlToolTip($("#test-notify"), notifyTestTxt, tt4);
            displayHtmlToolTip($("#xedx-notify-opt").closest("td"), notifyTxt, tt4);
            displayHtmlToolTip($("#xchain-tabl"), tabTxt, tt4);
            displayHtmlToolTip($("#xchain-tabr"), tabTxt, tt4);
            displayHtmlToolTip($("#minChainCount").parent(), minCntTxt, tt4);
            displayHtmlToolTip($("#xedx-anypage-opt").parent(), anyPgTxt, tt4);

            displayHtmlToolTip($("#warnBonusNear").parent(), bonusWarnTxt, tt4);
            displayHtmlToolTip($("#bonusWarnBefore").parent(), bonusNumberTxt, tt4);

        }

        function instPageTwoHandlers() {
            $("#xopts-page2").css("left", "-1000px");
            $('#xedx-anypage-opt').change(function() {
                runOnAnyPage = this.checked;
                saveOptions();
            });

            $('#minChainCount').change(function() {
                minChainCount = $(this).val();
                saveOptions();
            });

            $('#optsHitList').change(function() {
                optsHitList = this.checked;
                saveOptions();
            });

            $('#bonusWarnBefore').change(function() {
                bonusWarnBefore = $(this).val();
                log("bonusWarnBefore changed: ", bonusWarnBefore);
                saveOptions();
            });
            $('#warnBonusNear').change(function() {
                warnBonusNear = this.checked;
                saveOptions();
            });
        }

        function instPageThreeHandlers() {
            $("#xopts-page3").css("left", "-1000px");
            
        }

        function handleSelect(e) {
            let id = $(this).attr("id");
            let val = $(this).val();

            log("handle select: ", id, " | ", val);
            switch (id) {
                case 'audible-select': beepOpt = val; break;
                case 'visible-select': blinkOpt = val; break;
                case 'notify-select': notifyOpt = val; break;
                case 'type-select': beepType = val; break;
            }
            saveOptions();
        }

        function instBtnHandlers() {
            // Buttons on top - after minimize is clicked, tab on left can re-open
            $("#xtoggle-main").on('click', hideInnerDiv);
            $('#xtoggle-opts').on('click', doHideOpts);
            $('#xtoggle-mute').on('click', doMute);
            $("#xtoggle-more").on('click', handleOptsMore);
        }

        function instTabHandlers() {
            $("#xchain-tabl").on('click', hideInnerDiv);
            $("#xchain-tabl").addClass("xopen");
            $("#xchain-tabr").on('click', hideInnerDiv);
            $("#xchain-tabr").addClass("xopen");
        }

        function instAudioVideoCtrls() {
            // Testing buttons and 'select' options
            $('#test-audio').on('click', doAudioTest);
            $('#test-video').on('click', doVideoTest);
            $('#test-notify').on('click', doNotifyTest);
            $("#xchain-topts1 select").on('change', handleSelect);

            // Hook up volume control
            let rangeInputs = document.querySelectorAll('input[type="range"]');
            rangeInputs.forEach(input => {
                $("#rangevalue")[0].textContent = input.value;
                input.style.backgroundSize = (input.value - input.min) * 100 / (input.max - input.min) + '% 100%';
                input.addEventListener('input', handleInputChange);
            });

            // Hook up audio/visual enable checkboxes
            $('#xedx-audible-opt').change(function() {
                mute(!this.checked);
                saveOptions();
            });

            $('#xedx-notify-opt').change(function() {
                notifyOn = this.checked;
                saveOptions();
            });

            $('#xedx-visual-opt').change(function() {
                flashOn = this.checked;
                saveOptions();
            });
        }
    }

    function runTest() {   // Dev hook
        doBrowserTimerNotify();
    }

    function handlePageLoad(retries=0) {
        let cd = $("#xedx-chain-div");
        if ($(cd).length > 0) return log("Already installed!");

        // Install UI
        let parent = document.querySelector("#react-root > div > div > hr");
        if (!parent) {
            if (retries++ < 50) return setTimeout(handlePageLoad, 250);
            return log("Too many retries, giving up");
        }
        $(parent).after(getChainDiv());

        if (optsHitList == true) {
            log("building hit list");
            buildPage3HitList();
            log("done building hit list");
        }

        // Hide waveform type unless in dev mode
        //if (true || xedxDevMode == false) $("#type-select").css("display", "none");

        if (xedxDevMode == true) {
            if (instTestBtn == true) {
                $("#xbtn-row").prepend(getTestBtn());
                $("#xedxDevMode-btn").on('click', runTest);
            }
        }

        setOptions();
        installUiHandlers();

        // Hide options screen by default
        if (hideOpts) {
            $('#xedx-chainwatch-opts').css("height","0px");
            $('#xedx-chainwatch-opts').css("opacity",0);
            $('#xedx-chainwatch-opts').css("left", -5000);
            $('#xbtn-row').addClass('top-margin20');
        } else {
            $('#xbtn-row').removeClass('top-margin20');
        }

        // prserve last state
        if (lastState == "collapsed") hideInnerDiv();

        startTimer();
    }

    function setChainInCd(retries=0) {
        if (chainInCd == false) return;
        if ($($("#xedx-chain-span")[0]).length < 1) {
            if (retries++ < 30) return setTimeout(setChainInCd, 250, retries);
            return log("too many retries!");
        }
        $($("#xedx-chain-span")[0]).text("Cooldown");
    }

    function chainQueryCb(responseText, ID, param) {
        log("chainQueryCb");
        let jsonResp = JSON.parse(responseText);
        log("responseText: ", responseText);
        if (jsonResp.error) {
            if (jsonResp.error.code == 6)
                return;
            return handleError(responseText);
        }
        let chain = jsonResp.chain;
        log("chain: ", chain);
        if (chain.cooldown > 0) {
            chainInCd = true;
            setChainInCd();
        }
    }

    function doChainApiCall() {
        debug("doChainApiCall");
        xedx_TornFactionQuery("", "chain", chainQueryCb) ;
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (runOnAnyPage == false && location.href.indexOf("factions") < 0) {
        debug("Not on fac page and not configured for any page, exiting.");
        return;
    }

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();
    addStyles();

    doChainApiCall();

    callOnHashChange(handlePageLoad);
    installPushStateHandler(handlePageLoad);

    callOnContentLoaded(handlePageLoad);

    // =============== UI stuff, HTML and CSS, here to be out of the way ===================


    function getTestBtn() {
        return `<span id="xedxDevMode-btn" class="xchwtch-btn-min" style="width: 50px; margin-right: auto;">TEST</span>`;
    }

    function getChainDiv() {
        const chainDiv = `
            <div id="xchain-wrap">
            <div id="xchain-tabl" class="xopen"></div>
            <div id="xedx-chain-div" class="xflexc-center xshow-flex">

                 <div class="title-black border-round xdiv"></div>

                 <div id="xchain-inner">
                     <div id="xbtn-row"  class="xbtn-rowR">
                         <span id="xtoggle-more" class="xchwtch-btn-min"
                             style="width: 50px; margin-right: auto; opacity: 0;">More</span>
                         <span id="xtoggle-mute" class="xchwtch-btn-min" style="width: 50px;">Mute</span>
                         <span id="xtoggle-opts" class="xchwtch-btn">?</span>
                         <span id="xtoggle-main" class="xchwtch-btn">_</span>
                     </div>
                     <div>
                         <span id="xedx-chain-span" class="xedx-chain">--:--</span>
                     </div>
                 <!-- comment 5 --></div>`

                 + getChainOptsDiv() +    // Lower panel options table.

                 `<!-- comment 6 --><div class="title-black border-round m-top10 xdiv"></div>
             </div>
             <div id="xchain-tabr" class="xopen"></div>
             </div>
             `;

        return chainDiv;
    }

    function getChainOptsDiv() {
        let optsTable = `
             <div id="xedx-chainwatch-opts" class="xflexc-center xshow-flex">` +
            pageOneDiv() +
            pageTwoDiv() +
            (optsHitList==true ? pageThreeDiv() : '') +
           `<!-- comment 1 --></div>
        `;

        return optsTable;
    }

    function pageOneDiv() {
        let pg1 = `
            <div id="xopts-page1">
                 <table id="xchain-topts1" class="xchain-topts">
                     <tbody>

                         <tr>
                             <td class="xtdx xcb1"><div>
                                 <input type="checkbox" class="xcbx" id="xedx-audible-opt" name="audible" checked>
                                 <label for="audible"><span class="xedx-span">Enable Audible Alerts</span></label>
                             </div></td>
                             <td class="xtdx">
                                 <select id="audible-select" class="xedx-select">
                                      <option value="$">--Please Select--</option>
                                      <option value="60">1:00</option>
                                      <option value="75">1:!5</option>
                                      <option value="90">1:30</option>
                                      <option value="120">2:00</option>
                                      <option value="150">2:30</option>
                                      <option value="180">3:00</option>
                                      <option value="210">3:30</option>
                                      <option value="240">4:00</option>
                                      <option value="270">4:30</option>
                                </select>
                             </td>
                             <td class="audio-cell">
                                 <Button class="xwa xedx-torn-btn-raw xbtn-size" id="test-audio" value="off">Test Audio</Button>
                                 <input id="rangeslider" class="xwa" type="range" min="0" max="100" value="50" oninput="rangevalue.value=value"/>
                                 <output id="rangevalue">100</output>
                             </td>
                             </td>
                        </tr>

                        <tr>
                             <td class="xtdx xcb1"><div>
                                 <input type="checkbox" class="xcbx" id="xedx-visual-opt" name="visual" checked>
                                 <label for="visual"><span class="xedx-span">Enable Visual Alerts</span></label>
                             </div></td>
                             <td class="xtdx">
                                 <select id="visible-select" class="xedx-select">
                                      <option value="$">--Please Select--</option>
                                      <option value="60">1:00</option>
                                      <option value="75">1:!5</option>
                                      <option value="90">1:30</option>
                                      <option value="120">2:00</option>
                                      <option value="150">2:30</option>
                                      <option value="180">3:00</option>
                                      <option value="210">3:30</option>
                                      <option value="240">4:00</option>
                                      <option value="270">4:30</option>
                                </select>
                             </td>
                             <td>
                                 <Button class="xedx-torn-btn-raw xbtn-size xw168" id="test-video" value="off">Test Video</Button>
                             </td>
                         </tr>

                         <tr id="xchain-last">
                             <td class="xtdx xcb1"><div>
                                 <input type="checkbox" class="xcbx" id="xedx-notify-opt" name="notify" checked>
                                 <label for="notify"><span class="xedx-span">Enable Notifications</span></label>
                             </div></td>
                             <td class="xtdx">
                                 <select id="notify-select" class="xedx-select">
                                      <option value="$">--Please Select--</option>
                                      <option value="60">1:00</option>
                                      <option value="75">1:!5</option>
                                      <option value="90">1:30</option>
                                      <option value="120">2:00</option>
                                      <option value="150">2:30</option>
                                      <option value="180">3:00</option>
                                      <option value="210">3:30</option>
                                      <option value="240">4:00</option>
                                      <option value="270">4:30</option>
                                </select>
                             </td>
                             <td>
                                 <Button class="xedx-torn-btn-raw xbtn-size xw168" id="test-notify" value="off">Test Notification</Button>
                             </td>
                         </tr>
                     </tbody>
                 </table>
             </div>
        `;

        return pg1;
    }

    function addDevTblBorders() {
         GM_addStyle(`
            .xdev-tbl {
                border: 1px solid blue;
            }
            .xdev-tbl tr {
                border: 1px solid green;
            }
            .xdev-tbl td {
                box-shadow: 0 0 0 2px #606060;
            }
        `);
    }

    function pageTwoDiv() {
        //if (xedxDevMode == true) addDevTblBorders();

        let hitListCell = (xedxDevMode == true) ?
                `<td class="xtdx xcb1" style="margin-left: -4px;">
                     <div>
                         <input type="checkbox" class="xcbx" id="optsHitList" name="optsHitList" checked>
                         <label for="optsHitList"><span class="xedx-span">Support Quick Hit List (experimental)</span></label>
                     </div>
                 </td>` : `<td></td>`;

        let pg2 = `
            <div id="xopts-page2"  style="height: 0;">
                 <table id="xchain-topts2" class="xchain-topts xdev-tbl" style="opacity: 0;">
                     <tbody>

                     <tr>
                         <td class="xtdx xcb1"><div>
                             <label for="quantity">Don't run until chain at: </label>
                             <input type="number" id="minChainCount" class="numInput60" name="minChainCount" min="0" max="99999">
                         </div></td>
                         <td class="xtdx">
                             <input type="checkbox" class="xcbx" id="warnBonusNear" name="warnBonusNear" checked>
                             <label for="warnBonusNear"><span class="xedx-span">Notify when close to bonus</span></label>
                         </td>
                         <td class="xtdx xcb1"><div>
                             <label for="quantity">Hits before bonus warn: </label>
                             <input type="number" id="bonusWarnBefore" class="numInput60" name="bonusWarnBefore" min="1" max="100">
                         </div></td>
                    </tr>

                    <tr>
                         <td class="xtdx xcb1" style="margin-left: -4px;"><div>
                             <input type="checkbox" class="xcbx" id="xedx-anypage-opt" name="runOnAnyPage" checked>
                             <label for="runOnAnyPage"><span class="xedx-span">Run on Any Page</span></label>
                         </div></td>
                         <td class="xtdx"></td>
                         <td></td>
                     </tr>


                     <tr id="xchain-last">
                         ${hitListCell}
                         <td class="xtdx"></td>
                         <td></td>
                     </tr>
                     </tbody>
                 </table>
             <!-- comment 2 --></div>
        `;

        return pg2;
    }

    // ============== Experimental, hit list, status icons ====================

    // ----------- unused -------------------
    // 'state' is idle, online, offline
    const idleUrl = 'url(&quot;#svg_status_idle&quot;)';
    const onlineUrl = 'url(&quot;#svg_status_online&quot;)';
    const offlineUrl = 'url(&quot;#svg_status_offline&quot;)';

    function setUserIconState(iconWrapElem, state) {
        let useUrl = idleUrl;
        if (state == 'online') useUrl = onlineUrl;
        if (state == 'offline') useUrl = offlineUrl;
        $($(iconWrapElem).find('svg')[0]).attr("fill", useUrl);
    }

    // state can be empty string here, as long as set later.
    // Maybe default to idle instead? This sorta worked -
    // missing a style? If I went to user's fac page then
    // back, icons showed - otherwise, displayed incorrect.
    function getIconElement(state) {
        let useUrl = idleUrl;
        if (state == 'online') useUrl = onlineUrl;
        if (state == 'offline') useUrl = offlineUrl;
        let element =`
            <div class="myUserIconWrap">
                <svg xmlns="http://www.w3.org/2000/svg" style="pointer-events: none;" filter="" fill="` +
                    useUrl + `" stroke="#fff" stroke-width="0" width="13" height="13" viewBox="-1.5 -1.2 14 14">
                    <g xmlns="http://www.w3.org/2000/svg">
                        <path d="M0,6a6,6,0,1,1,6,6A6,6,0,0,1,0,6Z"></path>
                        <path d="M5,3V7H9V6H6V3Z" fill="#f2f2f2"></path>
                    </g>
                </svg>
            </div>
        `;

        return element;
    }
    // ------------- end unused ------------------

    var iconStylesAdded = false;
    function addIconStyles() {
        if (iconStylesAdded == true) return;
        // Not sure what is over-riding position....
        GM_addStyle(`
            .xoffline {background-position: -18px 0 !important;}
            .xonline {background-position: 0 0 !important;}
            .xidle {background-position: -1098px 0 !important;}
            .xuser-status {
                background: url(/images/v2/icons/user_status_icons.svg) 0 0 no-repeat;
                width: 16px;
                height: 16px;
            }
        `);
        iconStylesAdded = true;
    }

    function buldDataCharSpans(name) {
        let output = "";
        for (let i = 0; i < name.length; i++) {
            let char = name.charAt(i);
            output = output + '<span data-char="' + char + '"></span>';
        }
        return output;
    }

    // Temp, need actual data
    function getHonorWrap(honor, name) {
        let charBlock = buldDataCharSpans(name);
        return `
            <div class="x200min honor-text-wrap default big">
                <img src="/images/honors/${honor}/f.png"
                    srcset="/images/honors/${honor}/f.png 1x, /images/honors/${honor}/f@2x.png 2x, /images/honors/${honor}/f@3x.png 3x, /images/honors/${honor}/f@4x.png 4x"
                    alt="${name}">
                <span class="honor-text honor-text-svg">
                    ${charBlock}
                </span>
                <span class="honor-text">${name}</span>
             </div>
         `;
    }

    // Have classes to set status icon state, or, torn bases on ID, with styles
    // based on those CSS selectors...just toggles 'background-position' in the
    // sprite list
    function getIconElement2(id, state) {
        log("getIconElement2: ", id, ", ", state);
        let useClass = "xoffline";
        if (state == 'online') useClass = "xonline";
        if (state == 'idle' || state == 'away') useClass = "xidle";
        useClass = useClass + " xuser-status";

        let myElement =`
            <div class="xstat-icon myUserIconWrap">
                <ul class="big tt-profile-icon">
                    <li id="xicon-profile-` + id + `" class="` + useClass + `"></li>
                </ul>
            </div>
        `;

        return myElement;
    }

    // ====================== experimental =======================
    //


    //const emptyTd = `<span class="xpg3-btn2">Edit</span>
    //                 <div class="xstat-icon" style="min-width: 16px;"></div>
    //                 <div class="x200min honor-text-wrap default big" style="min-width: 200px;"></div>`;
    //const editBtn = `<span class="xpg3-btn2">Edit</span>`;

    // If enabled, this is called to build  the 'hit list'
    // portion of the opts screen. Normally would have a screen
    // to edit the list....
    // List is RN max 6, could be larger but have 3 rows two cells ATM
    // Can get 'honor' and name from API, 'user->profile'.
    // 'status' is idle, online, offline. Can get from same 'profile'
    // api call, or periodically use 'getStatusForUserArray()'
    //
    // Table is now vertically scrollable, so could dynamically add
    // as many rows as you want.
    const numRows = 3;
    const numCols = 2;
    const myHitList = [
        {name: "xedx", id: 2100735, honor: 611, status: 'idle'},
        {name: "peteTHEwolve", id: 889384, honor: 169, status: 'online'},
        {name: "JL64", id: 1760094, honor: 206, status: 'offline'}
    ];

    // We could dynamically query table size, but made it 3 rows
    // by two columns. So insert users from hit list a row at a
    // time.
    function buildPage3HitList() {
        addIconStyles();
        let numTargets = myHitList.length;
        if (!numTargets) return;
        let targetIdx = 0;
        //let target = myHitList[targetIdx];

        for (let row=0; row<numRows; row++) {
            for (let col=0; col<numCols; col++) {
                let target = myHitList[targetIdx++];
                if (!target) return;
                let cellSel = "#xchain-topts3 tr:eq(" + row + ") td:eq(" + col + ")";
                let cell = $(cellSel);
                log("cell: ", $(cell));
                $(cell).empty();
                $(cell).append(editBtn);
                log("target: ", target);
                let iconNode = getIconElement2(target.id, target.status);
                log("iconNode: ", iconNode);
                log("iconNode2: ", $(iconNode));
                $(cell).append(iconNode);
                log("cell: ", $(cell));
                $(cell).append(getHonorWrap(target.honor, target.name));
                log("cell2: ", $(cell));
            }
        }

    }

    function pageThreeDiv() {

        let pg3v2 = `
            <div id="xopts-page3" style="height: 0;">
                <table id="xchain-topts3" class="xchain-topts3 xdev-tbl" style="margin-top: 0px; opacity: 0;">
                    <tbody>

                     <tr>
                         <td>` + emptyTd +`</td>
                         <td>` + emptyTd +`</td>
                    </tr>

                    <tr>
                         <td>` + emptyTd +`</td>
                         <td>` + emptyTd +`</td>
                    </tr>

                    <tr id="xchain-last">
                         <td>` + emptyTd +`</td>
                         <td>` + emptyTd +`</td>
                    </tr>

                 </tbody>
             </table>
         </div>
        `;

        return pg3v2;
    }

    // TBD: Pretty sure I have styles in here I'm not using, and also possibly ones
    // I can steal from the helper lib...
    function addStyles() {
        const btnRadius = 24;

        loadMiscStyles();
        addFlexStyles();

        // Page 3 including funky button styles
        GM_addStyle(`
            .x200min {min-width: 200px;}
            .xchain-topts3 {
                position: relative;
                width: 100%;
                color: white;
                max-height: 145px;
                overflow: auto;
            }
            .xchain-topts3 tbody {
                flex-direction: column;
                display: flex;
                margin-left: 50px;
                margin-right: 0px;
            }
            .xchain-topts3 tr {
                display: flex;
                justify-content: space-between;
                width: 100%;
                flex-direction: row;
                align-content: center;
                flex-wrap: wrap;
                margin-bottom: 5px;
                height: 32px;
            }
            .xchain-topts3 td {
                width: 50%;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                justify-content: space-evenly;
                color: var(--default-full-text-color);
            }
            .xpg3-btn {
                position: absolute;
                display: flex;
                flex-wrap: wrap;
                align-content: center;
                justify-content: center;
                width: 32px;
                height: 20px;
                padding: 2px 12px 2px 12px;
                border-radius: 12px;
                cursor: pointer;
                border: 1px solid gray;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }
            .xpg3-btn2 {
                position: relative;
                display: flex;
                flex-wrap: wrap;
                align-content: center;
                justify-content: center;
                width: 32px;
                height: 20px;
                padding: 2px 12px 2px 12px;
                border-radius: 12px;
                cursor: pointer;
                border: 1px solid gray;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }
            .xpg3-btn:hover {filter: brightness(.6)}
            .xpg3-left {left: 6%;}
            .xpg3-right {left: 62%;}
            .xpg3-top {top: 2%;}
            .xpg3-mid {top: 40%;}
            .xpg3-bot {top: 75%;}

            .honor-text-wrap {
                position: relative;
                top: -10px;
                left: 34%;
                display: inline-block;
                vertical-align: middle;
                height: 20px;
                line-height: 20px;
            }
        `);

        /*


            #minChainCount {
                border-radius: 10px;
                margin-left: 10px;
                height: 19px;
                width: 80px;
                font-size: 1.2em;
                padding-left: 4px;
                padding-top: 1px;
            }
            */

        GM_addStyle(`
            #xopts-tbl-wrap2 {
                width: 66%;
            }
            #xopts-tbl-wrap2 td {
                width: 50%;
            }
            .xcb1 div {
                display: inline-flex;
            }
            .xcb1 label {
                padding-top: 2px;
                margin-left: 5px;
            }
            #xchain-wrap {
                display: flex;
                flex-direction: row;
            }
            #xedx-chain-div {
                width: 100%;
            }
            #xchain-tabl {
                width: 8px;
                background: #050;
                margin-left: -8px;
                border-radius: 5px 0px 0px 5px;
                height: 84px;
                margin-right: 0px;
                position: absolute;
                cursor: pointer;
            }
            #xchain-tabr {
                width: 8px;
                background: #050;
                border-radius: 0px 5px 5px 0px;
                height: 84px;
                position: relative;
                cursor: pointer;
            }
            #xchain-inner {
                display: flex;
                flex-direction: column;
            }
            .xbtn-rowR {
                display: flex;
                flex-direction: row;
                justify-content: flex-end;
                align-items: center;
                z-index: 22;
            }
            .xbtn-rowL {
                display: flex;
                flex-direction: row;
                justify-content: flex-begin;
                align-items: center;
                z-index: 22;
            }
            .xdiv {height: 4px !important; width: 99%;}

            .numInput80 {
                border-radius: 10px;
                margin-left: 10px;
                height: 19px;
                width: 80px;
                font-size: 1.2em;
                padding-left: 4px;
                padding-top: 1px;
            }
            .numInput60 {
                border-radius: 10px;
                margin-left: 10px;
                height: 19px;
                width: 60px;
                font-size: 1.2em;
                padding-left: 4px;
                padding-top: 1px;
            }
            .numInput40 {
                border-radius: 10px;
                margin-left: 10px;
                height: 19px;
                width: 40px;
                font-size: 1.2em;
                padding-left: 4px;
                padding-top: 1px;
            }

            .xchwtch-btn {
                position: relative;
                display: flex;
                flex-wrap: wrap;
                align-content: center;
                justify-content: center;
                align-self: flex-end;
                margin: 0px 5px 0px 5px;
                top: -10px;
                height: ${btnRadius}px;
                width: ${btnRadius}px;
                border-radius: ${btnRadius}px;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }

            .xchwtch-btn-min {
                position: relative;
                display: flex;
                flex-wrap: wrap;
                align-content: center;
                justify-content: center;
                align-self: flex-end;
                width: 50px;
                margin: 0px 5px 0px 5px;
                top: -10px;
                height: ${btnRadius}px;
                border-radius: ${btnRadius}px;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }

            #xtoggle-main:hover, #xtoggle-opts:hover, #xtoggle-mute:hover, #xtoggle-more:hover {
                filter: brightness(1.5);
            }

            #xedx-chain-span {
                text-align: center;
                font-size: 56px;
                color: red;
                width: 100%;
                margin-top: -34px;
                justify-content: center;
                display: flex;
            }

            #xedx-chainwatch-opts {
                position: relative;
                height: auto;
            }
            .xchain-topts {
                position: relative;
                width: 100%;
                color: white;
            }
            .xchain-topts tbody {
                flex-direction: column;
                display: flex;
                margin-left: 50px;
                margin-right: 50px;
                margin-top: 10px;
            }
            .xchain-topts tr {
                display: flex;
                justify-content: space-between;
                width: 100%;
                flex-direction: row;
                align-content: center;
                flex-wrap: wrap;
                margin-bottom: 5px;
                height: 32px;
            }
            .xchain-topts td {
                width: 33%;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
            }
            .audio-cell {
                flex-direction: row;
                justify-content: space-between;
            }
            .xwa {
                width: auto;
            }
            .xw168 {
                 width: 168px;
            }
            body:not(.dark-mode) .xedx-table {
                 background: #3D3D3D;
                 border-radius: 10px;
            }

            body.dark-mode .xedx-chain-alert {
                text-align: center;
                font-size: 56px; color: lime; width: auto; margin-top: 10px; /*margin-left: 60px;*/
                -webkit-animation: highlight-active 1s linear 0s infinite normal;
                animation: highlight-active 1s linear 0s infinite normal;}

            body:not(.dark-mode) .xedx-chain-alert {text-align: center;
                font-size: 56px; color: #0CB814; width: auto; margin-top: 10px; /*margin-left: 60px;*/
                -webkit-animation: highlight-active 1s linear 0s infinite normal;
                animation: highlight-active 1s linear 0s infinite normal;}

            .xcbx {margin-left: 10px; margin-top: 0px; border-radius: 50%; vertical-align: middle;
                width: 1.1em; height: 1.1em; background-color: white;
                border: 1px solid #ddd; appearance: none; -webkit-appearance: none;}

            .xcbx:checked {background-color: #0032E0;}

            .xtdx {color: var(--default-white-color);}

            .xedx-select {
                margin-left: 10px;
                border-radius: 10px;
                align-items: center;
                display: flex;
            }

            .top-margin10 {margin-top: 10px;}
            .top-margin20 {margin-top: 20px;}
            .xxx-box-div {width: 100%;}
            .box-col {flex-direction: column;}
            .box {display: flex !important; align-items: center;}

            .chain-btn {
                 display: table-cell;
                 border-radius: 10px;
                 border: 1px solid black;
                 color:black;
                 background: white;
                 height: 22px;
                 width: 168px;
                 margin-left: 10px;
                 margin-right: 5px;
             }

             .xbtn-size {
                 height: 26px;
                 margin-left: 10px;
                 margin-right: 5px;
                 border-radius: 10px;
             }

             .chain-btn-x {
                line-height: 22px;
                font-family: "Fjalla One", Arial, serif;
                font-size: 14px;
                font-weight: normal;
                text-align: center;
                text-transform: uppercase;
                border-radius: 5px;
                padding: 0 10px;
                cursor: pointer;
                color: #555;
                color: var(--btn-color);
                text-shadow: 0 1px 0 #FFFFFF40;
                text-shadow: var(--btn-text-shadow);
                background: linear-gradient(180deg, #DEDEDE 0%, #F7F7F7 25%, #CFCFCF 60%, #E7E7E7 78%, #D9D9D9 100%);
                background: var(--btn-background);
                border: 1px solid #aaa;
                border: var(--btn-border);
                display: inline-block;
                vertical-align: middle;
             }

             #xedx-chain-div .button-on {background: lime;}

             .body:not(.dark-mode) .xedx-span {margin-left: 5px; color: white;}
             .body.dark-mode .xedx-span {margin-left: 5px; color: white;}
             .xedx-vol-span {margin-left: 20px !important; padding-left: 10px !important;}
             #rangevalue {
                 display: none;
             }

             input[type="range"] {
                  -webkit-appearance: none;
                  height: 7px;
                  background: rgba(255, 255, 255, 0.6);
                  border-radius: 5px;
                  background-image: linear-gradient(#0032E0, #0032E0);
                  background-size: 70% 100%;
                  background-repeat: no-repeat;
            }

            input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  height: 20px;
                  width: 10px;
                  border-radius: 20%;
                  background: white;
                  cursor: ew-resize;
                  box-shadow: 0 0 2px 0 #555;
                  transition: background .3s ease-in-out;
             }

             input[type=range]::-webkit-slider-runnable-track  {
                  -webkit-appearance: none;
                  box-shadow: none;
                  border: none;
                  background: transparent;
             }
        `);
    }

})();