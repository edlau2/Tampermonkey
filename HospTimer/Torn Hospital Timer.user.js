// ==UserScript==
// @name         Torn Hospital Timer
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  try to take over the world!
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
    'use strict'

    // TBD - after closing if timerr has hit 0, don't re-alert or re-open...
    // unless in hosp again.

    // ======   These values can be changed via the Tampermonkey editor, =======
    // ======   the Storage tab. One day I'll make an Options dialog...  =======

    const hideWhenOK = GM_getValue("hideWhenOK", undefined);
    const blinkWhiteWhenOk = GM_getValue("blinkWhiteWhenOk", false);
    const transparentBackground = GM_getValue("transparentBackground", false);

    // ====== Leave the rest alone, manipulated dynamically ======

    if (hideWhenOK == undefined) {
        GM_setValue("hideWhenOK", false);
        GM_setValue("blinkWhiteWhenOk", blinkWhiteWhenOk);
        GM_setValue("transparentBackground", transparentBackground);
    }

    var SecsUntilOut;
    var intTimer = 0;        // Time update interval timer
    var minCounter = 0;

    var currState;
    var currDesc;
    var inHospital = false;

    var hidden = false;
    var minimized = false;

    const secsmin = 60;
    const secshr = secsmin * 60;
    const secsday = secshr * 24;

    var lastStateRestored = false;
    var lastDisplaySize = GM_getValue("lastDisplaySize", undefined);

    // ============================== Time stuff ===================================

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

        return secsdiff;
    }

    function getHospTimerDiv() {
        const bgClass = (transparentBackground == true) ? "xbgt" : "xbgb-var";
        const hospTimerDiv = `
            <div id="x-hosp-watch" class="x-hosp-wrap x-drag ` + bgClass + `">
                <div id="x-hosp-sec-wrap">
                    <div id="x-hosp-watchheader" class="grab x-hosp-hdr title-black hospital-dark top-round">
                        <div role="heading" aria-level="5">Hosp Timer</div>
                        <div class="x-hosp-hdr">
                            <span id="x-hsp-hide" class="x-rt-btn x-inner-span xml10">M</span>
                            <span id="x-hsp-refresh" class="x-rt-btn x-inner-span xml5">R</span>
                            <span id="x-hsp-close" class="x-rt-btn x-inner-span xml5 xmr5">X</span>
                        </div>
                    </div>
                    <div id="x-hosp-inner" class="x-hosp-inner-flex xresizeable-vert">
                    <!-- div id="x-hosp-inner" class="x-hosp-inner-flex" -->
                        <span id="hosptime" class="flash-grn hosp-txt">00:00:00</span>
                    </div>
                </div>
            </div>
        `;

        return hospTimerDiv;
    }

    function queryTornApi() {
        xedx_TornUserQuery(0, 'profile', queryCB);
    }

    function queryCB(responseText) {
        if (responseText == undefined) {
            debug("Error query user stats - no result!");
            return;
        }

        // Maybe make global to access in other places, namely the new
        // custom user stats stuff....for now jst pass to fn.
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            if (jsonResp.error.code == 6)
                return;
            return handleError(responseText);
        }

        let status = jsonResp.status;
        debug("Status: ", status);

        currState = status.state;
        currDesc = status.description;
        debug("state: ", currState);

        if (currState == "Hospital" && inHospital == false) {
            removeFlash();
            inHospital = true;
        }

        if (inHospital == false && hideWhenOK == true && hidden == false) {
            // On startup, have to delay this until the UI
            // has actually been installed.
            if ($("#x-hosp-watch").length > 0) {
                log("Hiding - not in hosp! ", $("#x-hosp-watch"));
                handleHide();
            }
        }

        if (inHospital == true) {

            // Handle hiding, minimizing. May want to allow this -
            // but user could just close. If we hid when the minimize
            // button was clicked, no way to re-open.
            if ($("#x-hosp-watch").height() == 32)
                handleMaximizeClick();

            if (hidden == true) handleShow();

            let allStates = jsonResp.states;
            log("allStates: ", allStates);

            let hosptime = allStates.hospital_timestamp;
            log("hosptime: ", hosptime);

            let hospEnd = new Date(hosptime);
            log("hosp end: ", hospEnd.toString(), " or ==> ", currDesc);

            SecsUntilOut = diffSecs(new Date(), new Date(hospEnd * 1000));
            log("diff secs: ", SecsUntilOut);

            let date = new Date(null);
            date.setSeconds(SecsUntilOut);
            let secDiffStr = date.toISOString().slice(11, 19);

            log("secDiffStr: ", secDiffStr);
        }

        if (intTimer == 0)
            intTimer = setInterval(updateHospClock, 1000);

        if ($("#x-hosp-watch").length == 0)
            installUI();

        setTimeout(removeFlash, 1000);
    }

    function removeFlash() {
        if ($("#hosptime").hasClass("flash-grn"))
            $("#hosptime").removeClass("flash-grn");
        if ($("#hosptime").hasClass("flash-wht"))
            $("#hosptime").removeClass("flash-wht");
    }

    function updateHospClock() {
        SecsUntilOut--;
        minCounter++;

        if (inHospital == true) {
            let date = new Date(null);
            date.setSeconds(SecsUntilOut);
            let secDiffStr = date.toISOString().slice(11, 19);

            debug("secDiffStr: ", secDiffStr);
            $("#hosptime").text(secDiffStr);
        } else {
            $("#hosptime").text(currDesc);
            if (blinkWhiteWhenOk == true) flashWhite();
        }

        if (minCounter == 60) {
            minCounter = 0;
            queryTornApi();
        }
    }

    function closeHospDiv(e) {
        $("#x-hosp-watch").remove();
    }

    // Keep checking to see if hosp icon goes away
    function iconCallback(name, params, icon) {
        log("iconCallback: ", name, " ", params, " ", $(icon));
    }

    function startCheckingIcon() {
        getSidebarIcon("hosp", iconCallback);
    }

    function installUI(retries) {
        debug("[installUI]");

        // Make the window
        let hospTimerDiv = getHospTimerDiv();
        let hospDiv = $(hospTimerDiv);
        $("#mainContainer").append(hospDiv);

        // Button handlers
        $("#x-hsp-close").on('click', closeHospDiv);
        $("#x-hsp-refresh").on('click', handleRefreshClick);
        $("#x-hsp-hide").on('click', handleMinimize);

        // Tool tip help
        displayHtmlToolTip($("#x-hsp-close"), "Close", "tooltip4");
        displayHtmlToolTip($("#x-hsp-refresh"), "Refresh", "tooltip4");
        displayHtmlToolTip($("#x-hsp-hide"), "Minimize/Maximize", "tooltip4");

        // Make draggable
        dragElement(document.getElementById("x-hosp-watch"));

        // This is the new way to save/restore position. Not state.

        // Handle position auto-save and restore
        startSavingPos(1500, "x-hosp-watch", true);

        startCheckingIcon();

        // Apply last known state of the window...this isn't position
        if (lastStateRestored == false) {
            restoreLastKnownState();
            lastStateRestored = true;
        }

        // And optionally hide.
        if (inHospital == false && hideWhenOK == true && hidden == false) {
            log("Hiding - not in hosp! ", $("#x-hosp-watch"));
            handleHide();
        }
    }

    // Let these take a selector, and move to lib....
    function flashGreen() {
        removeFlash();
        $("#hosptime").addClass("flash-grn");
    }

    function flashWhite() {
        removeFlash();
        $("#hosptime").addClass("flash-wht");
    }

    function handleMinimize() {
        if ($("#x-hosp-watch").height() == 32) {
            //moveToBody();
            handleMaximizeClick();
        } else {
            //moveToFooter();
            handleMinimizeClick();
        }
    }

    // alternat method of minimizing - move to footer. Didn't quite work...
    function moveToFooter() {
        let footer = $("#chatRoot").find("[class^='group-minimized-chat-box_']")[0];
        if ($(footer).length > 0) {
            $("#x-hosp-watch").removeClass("x-hosp-wrap").addClass("x-hosp-wrap-min");
            $("#x-hosp-watch").detach().appendTo(footer);
        }
    }

    function moveToBody() {
        let hospDiv = $("#x-hosp-watch");
        $("#x-hosp-watch").detach().appendTo("#mainContainer");
        $("#x-hosp-watch").addClass("x-hosp-wrap").removeClass("x-hosp-wrap-min");
    }

    // Could also togle between xhide/xshow, or xshowf (?)
    // Need to be careful of 'display: block' vs 'display: flex'
    // and other variants. Could make fns. to save the display:
    // when swapping...
    function handleHide() {
        $("#x-hosp-watch").addClass("xhide");
        hidden = true;
    }

    function handleShow() {
        $("#x-hosp-watch").removeClass("xhide");
        hidden = false;
    }

    function handleMinimizeClick() {
        $("#x-hosp-watch").css("height", "32px");
        GM_setValue("lastDisplaySize", "32px");
        minimized = true;
    }

    function handleMaximizeClick() {
        $("#x-hosp-watch").css("height", "134px");
        GM_setValue("lastDisplaySize", "134px");
        minimized = false;
    }

    function handleRefreshClick() {
            flashGreen();
            queryTornApi();
        }

    function restoreLastKnownState() {
        if (lastDisplaySize) {
            if (lastDisplaySize == "32px") handleMinimizeClick();
        }
    }

    function addStyles() {

        loadCommonMarginStyles();
        addToolTipStyle();
        addCursorMovingStyles();
        addCursorStyles();

        GM_addStyle(`
             .x-hosp-wrap {
                -ms-transform: translateX(-20%) translateY(-95%)  !important;
                -webkit-transform: translate(-20%,-95%) !important;
                transform: translate(-20%,-95%) !important;
                background: transparent;
                top: 32%;
                left: 84%;
            }
            .x-hosp-wrap-min {
                left: 0;
            }
            .x-hosp-inner-flex {
                border-radius: 5px;
                width: 200px;
                height: 100px;
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
            .xresizeable-both {
                resize: both;
                overflow: auto;
                cursor: se-resize;
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

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    addStyles();

    queryTornApi();

    installHashChangeHandler(queryTornApi);
    installPushStateHandler(queryTornApi);


})();