// ==UserScript==
// @name         Torn Hosp Timer vRR2
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict'

    // ======   These values can be changed via the Tampermonkey editor, =======
    // ======   the Storage tab. One day I'll make an Options dialog...  =======

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);
    GM_setValue("debugLoggingEnabled", debugLoggingEnabled);

    const enableDevTests = true;
    var alertsEnabled = enableDevTests;
    var secsUntilAlert = GM_getValue("secsUntilAlert", 120);
    GM_setValue("secsUntilAlert", secsUntilAlert);

    var hideWhenOK = GM_getValue("hideWhenOK", true);
    var blinkWhiteWhenOk = GM_getValue("blinkWhiteWhenOk", false);
    var transparentBackground = GM_getValue("transparentBackground", false);
    var displayOnSidebar = GM_getValue("displayOnSidebar", false);

    // ====== Leave the rest alone, manipulated dynamically ======

    var updateOpts = GM_getValue("updateOpts", true);
    if (updateOpts == true) {
        GM_setValue("hideWhenOK", hideWhenOK);
        GM_setValue("blinkWhiteWhenOk", blinkWhiteWhenOk);
        GM_setValue("transparentBackground", transparentBackground);
        GM_setValue("displayOnSidebar", displayOnSidebar);

        GM_setValue("updateOpts", false);
    }

    const secsInDay = 60 * 60 * 24;
    const innerFlexHeight = 60;
    var intTimer = 0;
    var inHospital = false;
    var hidden = false;
    var minimized = false;
    var lastStateRestored = false;
    var lastDisplaySize = GM_getValue("lastDisplaySize", undefined);
    const fmt_nn = function(x) {if (x < 10) return ("0" + x + ":"); else return (x + ":");}

    function getHospTimerDiv() {
        const bgClass = (transparentBackground == true) ? "xbgt" : "xbgb-var";
        const hospTimerDiv = `
            <div id='x-hw-wrap' class="xsticky-bottom">
                <div id="x-hosp-watch" class="x-hosp-wrap x-drag ${bgClass}">
                    <div id="x-hosp-sec-wrap">
                        <div id="x-hosp-watchheader" class="grab x-hosp-hdr title-black hospital-dark top-round">
                            <div id='xdev' role="heading" aria-level="5">Hosp Timer</div>
                            <div class="x-hosp-hdr">
                                <span id="x-hsp-min" class="x-rt-btn x-inner-span xml10">M</span>
                                <span id="x-hsp-hide" class="x-rt-btn x-inner-span xml5">H</span>
                                <span id="x-hsp-close" class="x-rt-btn x-inner-span xml5 xmr5">X</span>
                            </div>
                        </div>
                        <div id="x-hosp-inner" class="x-hosp-inner-flex xresizeable-vert">
                            <span id="hosptime" class="xht flash-grn hosp-txt">00:00:00</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return hospTimerDiv;
    }

    // Should be able to remove this now, in library...
    function getSidebarData() {
        let key = Object.keys(sessionStorage).find(key => /sidebarData\d+/.test(key));
        let sidebarData = JSON.parse(sessionStorage.getItem(key));
        return sidebarData;
    }

    function amIinHosp() {
        let data = getSidebarData();
        let icons = data.statusIcons.icons;
        let hosp = icons.hospital;

        inHospital = hosp ? true : false;
        return inHospital;
    }

    function checkHospStatus() {
        inHospital = amIinHosp();
        debug("checkHospStatus: ", inHospital, hideWhenOK);
        if (inHospital == false && hideWhenOK == true && hidden == false) {
            if ($("#x-hosp-watch").length > 0 || $("#hospTimer").length > 0) {
                if (!hidden) handleHide();
            }
        }

        if (inHospital == true) {
            if ($("#x-hosp-watch").height() == 32)
                handleMaximizeClick();
            if (hidden == true) handleShow();
        }

        if (intTimer == 0)
            intTimer = setInterval(updateHospClock, 1000);

        // Don't forget sidebar...
        if ($("#x-hosp-watch").length == 0 ||
           (displayOnSidebar == true && $("#hospTimer").length == 0))
            installUI();

        setTimeout(removeFlash, 1000);
    }

    function removeFlash() {
        $(".xht").removeClass("flash-grn");
        $(".xht").removeClass("flash-white");
    }

    function getSecsUntilOut() {
        let data = getSidebarData();
        let icons = data.statusIcons.icons;
        let hosp = icons.hospital;
        if (!hosp) {
            inHospital = false;
            return 0;
        }

        let nowSecs = new Date().getTime() / 1000;
        let diff = +hosp.timerExpiresAt - nowSecs;
        if (diff > 0) inHospital = true;
        return diff;
    }

    var alertsOn = false;
    function checkAlerts(secs) {
        if (alertsEnabled == false) return;
        if (alertsOn == true) return;
        if (secs <= secsUntilAlert) {
            if (hasInteracted == true && audioLoaded == true) {
                log("Playing audio");
                alertsOn = true;
                audio.play();
                flashGreen();
            } else {
                log("Error: can't play alert!", hasInteracted, audioLoaded);
            }
        }
    }

    function stopAlerts() {
        if (audio) audio.pause();
        removeFlash();
        alertsOn = false;
    }

    function cancelAlerts() {
        secsUntilAlert = 0;
        if (audio) audio.pause();
        removeFlash();
        alertsOn = false;
    }

    function updateHospClock() {
        let altSecs = getSecsUntilOut();

        checkAlerts(altSecs);

        if (inHospital == true) {
            let date2 = new Date(null);
            date2.setSeconds(altSecs);
            let days = parseInt(altSecs / secsInDay);
            let secDiffStr2 = date2.toISOString().slice(11, 19);
            if (days > 0) secDiffStr2 = fmt_nn(days) + secDiffStr2;
            $(".xht").text(secDiffStr2);
        } else {
            $(".xht").text("00:00:00");
            if (blinkWhiteWhenOk == true) flashWhite();
        }
    }

    function closeHospDiv(e) {$("#x-hosp-watch").remove();}

    var chkIconTimer = 0;
    function iconCallback(name, params, icon) {
        let inHosp = amIinHosp();
        if (!inHosp && hideWhenOK && !hidden) {
            handleHide();
        }
        if (inHosp && hidden ) {
            handleShow();
        }
    }

    function startCheckingIcon() {
        if (chkIconTimer) clearInterval(chkIconTimer);
        chkIconTimer = setInterval(iconCallback, 5000);
    }

    function installUI(retries) {
        debug("[installUI]");

        if (displayOnSidebar == true) {
            if ($("#hospTimer").length == 0) {
                let parentSelector = makeXedxSidebarContentDiv('hospTimer');
                $(parentSelector).append(getHospSidebarDiv());
                $(parentSelector).css("padding", "0px");
            }
        }

        // Make the window
        let hospTimerDiv = getHospTimerDiv();
        let hospDiv = $(hospTimerDiv);
        $("#mainContainer").append(hospDiv);

        $("#x-hsp-close").on('click', closeHospDiv);
        $("#x-hsp-min").on('click', handleMinimize);
        $("#x-hsp-hide").on('click', handleHide);

        displayHtmlToolTip($("#x-hsp-close"), "Close", "tooltip4");
        displayHtmlToolTip($("#x-hsp-min"), "Minimize/Maximize", "tooltip4");
        displayHtmlToolTip($("#x-hsp-hide"), "Hide", "tooltip4");

        dragElement(document.getElementById("x-hosp-watch"));

        startCheckingIcon();

        if (lastStateRestored == false) {
            restoreLastKnownState();
            lastStateRestored = true;
        }

        inHospital = amIinHosp();
        if (inHospital == false && hideWhenOK == true && hidden == false) {
            if (!hidden) handleHide();
        }

        if (enableDevTests == true) {
            installDevModeOpts();
        }

        function getHospSidebarDiv() {
            return `<div id="hospTimer">
                        <span>Hosp: </span><span class="xht">00:00:00</span>
                    </div>`;
        }
    }

    // Let these take a selector, and move to lib....
    function flashGreen() {
        removeFlash();
        $(".xht").addClass("flash-grn");
    }

    function flashWhite() {
        removeFlash();
        $(".xht").addClass("flash-wht");
    }

    function handleMinimize() {
        if ($("#x-hosp-watch").height() == 32) {
            handleMaximizeClick();
        } else {
            handleMinimizeClick();
            cancelAlerts();
        }
    }

    function handleHide() {
        debug("handleHide: ", hidden);
        $("#x-hosp-watch").css("display", "none");
        $("#hospTimer").css("display", "none");
        hidden = true;
        cancelAlerts();
    }

    function handleShow() {
        $("#x-hosp-watch").css("display", "flex");
        $("#hospTimer").css("display", "flex");
        hidden = false;
    }

    function addMinimizeStyles() {
        GM_addStyle(`
            .x-hosp-min {
                position: static !important;
                overflow: hidden !important;
                height: 32px;
                pointer-events: auto;
            }
        `);
    }

    var savedPos;
    function handleMinimizeClick() {
        GM_setValue("lastDisplaySize", "32px");
        let wrapper = $($("[class^='group-chat-box_']")[0]);
        savedPos = $("#x-hosp-watch").offset();

        $("#x-hosp-watch").detach().prependTo(wrapper);
        $("#x-hosp-watch").toggleClass("x-hosp-min");
        $("#x-hosp-watch").toggleClass("x-hosp-wrap");
        minimized = true;
    }

    function handleMaximizeClick() {
        GM_setValue("lastDisplaySize", "134px");
        $("#x-hosp-watch").detach().appendTo($("#x-hw-wrap"));
        $("#x-hosp-watch").toggleClass("x-hosp-min");
        $("#x-hosp-watch").toggleClass("x-hosp-wrap");
        if (savedPos)
            $("#x-hosp-watch").offset({top: savedPos.top, left: savedPos.left});
        minimized = false;
    }

    function restoreLastKnownState() {
        if (lastDisplaySize) {
            if (lastDisplaySize == "32px") handleMinimizeClick();
        }
    }

    // ================= Experimental dev mode stuff =====================

    var audio;
    var audioPlaying = false;
    var audioLoaded = false;
    var hasInteracted = false;

    function playAudio() {
        log("[playAudio] ", audio);
        audio.play();
    }
    function pauseAudio() {
        log("[pauseAudio] ", audio);
        audio.pause();
     }

    function addDevModeStyles() {
        GM_addStyle(`
            .xhdr-btn {
                border-radius: 5px;
                z-index: 9999999;
                cursor: pointer;
                padding: 0px 10px 0px 10px;
                background: var(--btn-background) !important;
            }
            .x-hosp-wrap-dev {
                /*-ms-transform: translateX(-20%) translateY(-95%)  !important;
                -webkit-transform: translate(-20%,-95%) !important;*/
                transform: translate(-50%,-50%) !important;
                background: transparent;
                top: 50%;
                left: 54%;
            }
            .xhdr-btn:hover { filter: brightness(1.6); }
        `);
    }

    function handleDevHdrClick(e) {
        log("[handleDevHdrClick] ", audioPlaying);

        if (audioPlaying == false) {
            audioPlaying = true;
            audio.play();
        } else {
            audioPlaying = false;
            audio.pause();
        }
    }

    function installAudio() {
        audio = new Audio('https://github.com/edlau2/Tampermonkey/raw/refs/heads/master/HospTimer/RickRoll.mp3');
        audio.loop = true;

        audio.addEventListener('ended', (e) => {
            audioPlaying = false;
            log('Audio ended. ', e);
        });
        audio.addEventListener('play', (e) => {
            audioPlaying = true;
            log('Audio play. ', e);
        });
        audio.addEventListener('pause', (e) => {
            audioPlaying = false;
            log('Audio paused. ', e);
        });
        audio.addEventListener('loadeddata', (e) => {
            audioPlaying = false;
            audioLoaded = true;
            log('Audio loaded. ', e);
        });
        audio.addEventListener('error', (e) => {
            audioPlaying = false;
            log('Audio error. ', e);
        });
    }

    var disableCount = 0;
    function enableAudio(e) {
        log("Interaction enabled!");
        $("#audio-enable").remove();
        log("audio-enable removed: ", $("#audio-enable"));
        $("#hosptime").attr('style', '');
        log("hosptime attr removed: ", $("#hosptime"));
        hasInteracted = true;

        secsUntilAlert = getSecsUntilOut() - 30;

        $("#x-hosp-inner").off();
        $("#x-hosp-inner").on('click.xedx', function () {
            disableCount++;
            secsUntilAlert = GM_getValue("secsUntilAlert", 120);
            stopAlerts();
            return false;
        });

    }

    function installDevModeOpts() {

        let hdr = $("#xdev");
        if ($(hdr).length == 0) return debug("UI not visible");

        addDevModeStyles();
        installAudio();

         let audioOnSpan = `<span id="audio-enable" class="hosp-txt" style="cursor: pointer;">Click to enable alerts!</span>`;
        $("#hosptime").after(audioOnSpan);

        $("#x-hosp-watch").removeClass("x-hosp-wrap").addClass("x-hosp-wrap-dev");
        $("#hosptime").attr("style", "display: none;");

        //$(hdr).addClass("xhdr-btn");
        //$(hdr).on('click', handleDevHdrClick);

        $("#x-hosp-inner").on('click.xedx', enableAudio);
        $("#audio-enable").on('click.xedx', enableAudio);
    }

    // ========================== Styles =================================
    function addStyles() {
        loadMiscStyles();
        loadCommonMarginStyles();
        addToolTipStyle();
        addCursorMovingStyles();
        addCursorStyles();
        addMinimizeStyles();

        // Sidebar div
        GM_addStyle(`
            #hospTimer { display: flex; position: relative; }

            #hospTimer span {
                align-content: center;
                display: flex;
                flex-flow: row wrap;
                padding: 3px;
                font-size: 14px;
                width: 90%;
            }
            #hospTimer span:first-child { justify-content: center;}
            #hospTimer span:nth-child(2) { justify-content: left;}
        `);

        GM_addStyle(`
             .x-hosp-wrap {
                -ms-transform: translateX(-20%) translateY(-95%)  !important;
                -webkit-transform: translate(-20%,-95%) !important;
                transform: translate(-20%,-95%) !important;
                background: transparent;
                top: 30%;
                left: 84%;
            }
            .x-hosp-inner-flex {
                border-radius: 5px;
                width: 200px;
                height: ${innerFlexHeight}px;
                align-content: center;
                justify-content: center;
                display: flex;
                flex-direction: column;
                flex-wrap: wrap;
            }
            .xresizeable-vert {
                resize: vertical;
                overflow: hidden;
                cursor: ns-resize;
            }
            .hosp-txt {
                font-size: 20px;
            }

            .xbgb-var {background: var(--page-background-color) !important;}
            .xbgb {background: black !important;}
            .xbgb2 {background: rgba(0, 0, 0, .2) !important;}
            .xbgb4 {background: black; opacity: 0.4 !important;}
            .xbgb6 {background: black; opacity: 0.6 !important;}
            .xbgb8 {background: black; opacity: 0.8 !important;}
            .xbgt {background: transparent !important;}

            .x-rt-btn {
                display: flex;
                justify-content: center;
                width: 30px;
                border-radius: 30px;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }
            .x-hosp-hdr {
                border-radius: 5px;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
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
            .xsticky-bottom {
                align-items: flex-end;
                bottom: 0px;
                left:0px;
                display: flex;
                position: fixed;
                right: 1px;
            }
        `);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    versionCheck();

    addStyles();
    checkHospStatus();

    installHashChangeHandler(checkHospStatus);
    installPushStateHandler(checkHospStatus);

})();