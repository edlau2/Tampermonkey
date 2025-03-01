// ==UserScript==
// @name         Torn Hospital Timer
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/*
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

    const hideWhenOK = GM_getValue("hideWhenOK", false);
    const blinkWhiteWhenOk = GM_getValue("blinkWhiteWhenOk", false);
    const transparentBackground = GM_getValue("transparentBackground", false);

    // ====== Leave the rest alone, manipulated dynamically ======

    var updateOpts = GM_getValue("updateOpts", true);
    if (updateOpts == true) {
        GM_setValue("hideWhenOK", hideWhenOK);
        GM_setValue("blinkWhiteWhenOk", blinkWhiteWhenOk);
        GM_setValue("transparentBackground", transparentBackground);
        GM_setValue("updateOpts", false);
    }

    var intTimer = 0;    
    var inHospital = false;
    var hidden = false;
    var minimized = false;
    var lastStateRestored = false;
    var lastDisplaySize = GM_getValue("lastDisplaySize", undefined);

    function getHospTimerDiv() {
        const bgClass = (transparentBackground == true) ? "xbgt" : "xbgb-var";
        const hospTimerDiv = `
            <div class="xsticky-bottom">
            <div id="x-hosp-watch" class="x-hosp-wrap x-drag ` + bgClass + `">
                <div id="x-hosp-sec-wrap">
                    <div id="x-hosp-watchheader" class="grab x-hosp-hdr title-black hospital-dark top-round">
                        <div role="heading" aria-level="5">Hosp Timer</div>
                        <div class="x-hosp-hdr">
                            <span id="x-hsp-hide" class="x-rt-btn x-inner-span xml10">M</span>
                            <!-- span id="x-hsp-refresh" class="x-rt-btn x-inner-span xml5">R</span -->
                            <span id="x-hsp-close" class="x-rt-btn x-inner-span xml5 xmr5">X</span>
                        </div>
                    </div>
                    <div id="x-hosp-inner" class="x-hosp-inner-flex xresizeable-vert">
                    <!-- div id="x-hosp-inner" class="x-hosp-inner-flex" -->
                        <span id="hosptime" class="flash-grn hosp-txt">00:00:00</span>
                    </div>
                </div>
            </div>
            </div>
        `;

        return hospTimerDiv;
    }

    function getSidebar() {
        let key = Object.keys(sessionStorage).find(key => /sidebarData\d+/.test(key));
        let sidebarData = JSON.parse(sessionStorage.getItem(key));
        return sidebarData;
    }

    function amIinHosp() {
        let data = getSidebar();
        let icons = data.statusIcons.icons;
        let hosp = icons.hospital;

        inHospital = hosp ? true : false;
        return inHospital;
    }

    function checkHospStatus() {
        inHospital = amIinHosp();
        log("checkHospStatus: ", inHospital, hideWhenOK);
        if (inHospital == false && hideWhenOK == true && hidden == false) {
            if ($("#x-hosp-watch").length > 0) {
                if (!hidden) handleHide();
            }
        }

        if (inHospital == true) {
            // Handle hiding, minimizing. May want to allow this -
            // but user could just close. If we hid when the minimize
            // button was clicked, no way to re-open.
            if ($("#x-hosp-watch").height() == 32)
                handleMaximizeClick();

            if (hidden == true) handleShow();
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

    function getSecsUntilOut() {
        let data = getSidebar();
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

    function updateHospClock() {
        let altSecs = getSecsUntilOut();
        if (inHospital == true) {
            let date2 = new Date(null);
            date2.setSeconds(altSecs);
            let secDiffStr2 = date2.toISOString().slice(11, 19);
            $("#hosptime").text(secDiffStr2);
        } else {
            $("#hosptime").text("00:00:00");
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

        // Make the window
        let hospTimerDiv = getHospTimerDiv();
        let hospDiv = $(hospTimerDiv);
        $("#mainContainer").append(hospDiv);

        // Button handlers
        $("#x-hsp-close").on('click', closeHospDiv);
        //$("#x-hsp-refresh").on('click', handleRefreshClick);
        $("#x-hsp-hide").on('click', handleMinimize);

        // Tool tip help
        displayHtmlToolTip($("#x-hsp-close"), "Close", "tooltip4");
        //displayHtmlToolTip($("#x-hsp-refresh"), "Refresh", "tooltip4");
        displayHtmlToolTip($("#x-hsp-hide"), "Minimize/Maximize", "tooltip4");

        // Make draggable
        dragElement(document.getElementById("x-hosp-watch"));

        // Assume if we no longer have a hosp icon, we are OK
        // Can always double check...
        startCheckingIcon();

        // Apply last known state of the window...this isn't position
        if (lastStateRestored == false) {
            restoreLastKnownState();
            lastStateRestored = true;
        }

        // And optionally hide.
        inHospital = amIinHosp();
        if (inHospital == false && hideWhenOK == true && hidden == false) {
            if (!hidden) handleHide();
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
            handleMaximizeClick();
        } else {
            handleMinimizeClick();
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
        debug("handleHide: ", hidden);
        $("#x-hosp-watch").css("display", "none");
        hidden = true;
    }

    function handleShow() {
        $("#x-hosp-watch").css("display", "flex");
        hidden = false;
    }

    function handleMinimizeClick() {
        $("#x-hosp-watch").css("height", "32px");
        $("#x-hosp-watch").addClass("x91");
        GM_setValue("lastDisplaySize", "32px");
        minimized = true;
    }

    function handleMaximizeClick() {
        $("#x-hosp-watch").css("height", "134px");
        $("#x-hosp-watch").removeClass("x91");
        GM_setValue("lastDisplaySize", "134px");
        minimized = false;
    }

    /*
    function handleRefreshClick() {
        flashGreen();
        //queryTornApi();
    }
    */

    function restoreLastKnownState() {
        if (lastDisplaySize) {
            if (lastDisplaySize == "32px") handleMinimizeClick();
        }
    }

    function addStyles() {

        loadMiscStyles();
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
                /*top: 32%;*/
                top: 45%;
                left: 84%;
            }
            .x-hosp-wrap-min {
                left: 0;
            }
            .x91 {top: 91% !important;}
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

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    versionCheck();

    addStyles();

    checkHospStatus();

    installHashChangeHandler(checkHospStatus);
    installPushStateHandler(checkHospStatus);


})();