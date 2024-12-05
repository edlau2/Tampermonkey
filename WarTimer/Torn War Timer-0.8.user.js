// ==UserScript==
// @name         Torn War Timer
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Add tooltip with local RW start time to war countdown timer
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
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
/*eslint no-multi-spaces: 0*/

// Maybe incorporate War Score Watcher into this?

(function() {
    'use strict';

    // Enable for debug logging...
    debugLoggingEnabled = false;

    // 'Mode' of operation - tooltip, or click to toggle to local start time.
    const doToolTip = true;           // Display local start time as tool tip.
    const doDisplayStart = true;      // Toggle display type on right click, time until or local start time
    const useLongDate = true;         // For display in window, use long or short format

    var retries = 0;
    var titleRetries = 0;
    const retryTime = 500;
    const maxRetries = 20;

    var formattedDate; // = "War starts on ";
    var shortFormattedDate = '';
    var warList;
    var timer;
    var timeSpans;

    var clickState = GM_getValue("clickState", 0);

    function pushStateChanged(e) {
        log("pushStateChanged: ", e);
        log("hash: ", window.location.hash);
        handlePageLoad();
    }

    const bindEventListener = function (type) {
        const historyEvent = history[type];
        return function () {
            const newEvent = historyEvent.apply(this, arguments);
            const e = new Event(type);
            e.arguments = arguments;
            window.dispatchEvent(e);
            return newEvent;
        };
    };

    function handleHashChange() {
        debug("hashChangeHandler: ", location.hash);
        retries = 0;
        titleRetries = 0;
        addLocalTime();
    }

    function handlePageLoad() {
        if (titleRetries >= maxRetries) {
            log("[handlePageLoad] max retries met!");
            return false;
        }

        let titleBarText = $("#react-root > div > div > div.f-msg.m-top10 > span").text();

        debug("titleBarText, retries: ", titleRetries, " text: ", titleBarText);
        if (!titleBarText) {titleRetries++; return setTimeout(handlePageLoad, retryTime);}

        titleRetries = 0;
        if (titleBarText && titleBarText.indexOf("IS IN A WAR") > 0) {
            log("Already warring, ignoring...");
            return;
        }

        installHashChangeHandler(handleHashChange);
        addLocalTime();
    }

    function addLocalTime() {
        if (retries >= maxRetries) {
            log("[addLocalTime] max retries met!");
            return;
        }

        warList = $("#faction_war_list_id");
        debug("warList: ", $(warList));

        debug("Looking for DIV, retries: ", retries, " found: ", $(warList).length);
        if ($(warList).length == 0) {retries++; return setTimeout(addLocalTime, retryTime);}

        // When war ended, warList had a class, "war-new", not sure during or enlisted...check!
        var classList = $('#faction_war_list_id').attr('class').split(/\s+/);
        if ($(warList).hasClass("war-new")) {
            debug("has 'war-new' class!");
        }

        timer = $(warList).find("[class*='timer_']");
        debug("timer: ", $(timer));
        if ($(timer).length == 0) {retries++; return setTimeout(addLocalTime, retryTime);}

        timeSpans = $(timer).find("span");
        debug("timespans: ", $(timeSpans));
        if ($(timeSpans).length == 0) {retries++; return setTimeout(addLocalTime, retryTime);}

        retries = 0;
        let startTime = new Date();

        let day = timeSpans[0].innerText + timeSpans[1].innerText;
        let hour = timeSpans[3].innerText + timeSpans[4].innerText;
        let min = timeSpans[6].innerText + timeSpans[7].innerText;
        let sec = timeSpans[9].innerText + timeSpans[10].innerText;

        debug("day: ", day, " hr: ", hour, " min: ", min, " sec: ", sec);

        startTime.setDate(startTime.getDate() + +day);
        startTime.setHours(startTime.getHours() + +hour);
        startTime.setMinutes(startTime.getMinutes() + +min);
        startTime.setSeconds(startTime.getSeconds() + +sec);

        formattedDate = "War starts on " +
            startTime.toLocaleString(undefined, {weekday: 'long'}) + ", at " +
            startTime.toLocaleString(undefined, {timeStyle: 'medium'});

        shortFormattedDate = startTime.toLocaleString(undefined, {weekday: 'long'}) + ", " +
            startTime.toLocaleString(undefined, {timeStyle: 'medium'});

        debug("start: ", formattedDate, " clickState: ", clickState);

        if (doToolTip) addToolTip();
        if (doDisplayStart) addTimeDisplay();

        if (clickState > 0) {
            let tmp = clickState;
            clickState = 0;
            for (let idx=0; idx < tmp; idx++) {
                handleTimeFormatChange(true);
            }
        }
    }

    function addTimeDisplay() {
        if ($("#xtime").length) return;
        $(timer).parent().parent().on('contextmenu', handleTimeFormatChange);
        GM_addStyle(".xnone {display: none !important; width: 0px !important;}" +
                    ".xflex {display: flex !important; flex-wrap: wrap; width: 232px !important; " +
                    "justify-content: center; position: absolute; margin-top: 2px; margin-left: 10px;}");
        GM_addStyle(".snone {display: none !important;} .sblock {display: inline-block !important;}");
        let timeSpan = '<div id="xtime" class="xnone">' + (useLongDate ? formattedDate : shortFormattedDate) + '</div>';
        $(timer).parent().after(timeSpan);
    }

    // First click: time only.
    // 2nd: color.
    // 3rd: time back.
    // 4th: color back.
    function handleTimeFormatChange(onInit=false) {
        debug("handleTimeFormatChange");
        if (clickState == 0 || clickState == 2) {
            if ($("#xtime").hasClass("xnone")) {
                $(timeSpans).addClass("snone").removeClass("sblock");
                $("#xtime").addClass("xflex").removeClass("xnone");
            } else {
                $(timeSpans).addClass("sblock").removeClass("snone");
                $("#xtime").addClass("xnone").removeClass("xflex");
            }
        }
        if (clickState == 1 || clickState == 3) {
            if (!$(timer).parent().parent().parent().hasClass("xedx-bgblack")) {
                $("#xtime").addClass("xedx-bgblack1");
                $(timer).parent().parent().parent().addClass("xedx-bgblack");
            } else {
                $("#xtime").removeClass("xedx-bgblack1");
                $(timer).parent().parent().parent().removeClass("xedx-bgblack");
            }
        }

        clickState++;
        if (clickState == 4) clickState = 0;

        GM_setValue("clickState", clickState);
        debug("clickState: ", clickState);
        return false;
    }

    function addToolTip() {
        addToolTipStyle();
        displayToolTip(timer, formattedDate, "tooltip4");
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    history.pushState = bindEventListener("pushState");

    GM_addStyle(`
        .xedx-bgblack {
            background: black !important;
            box-shadow: inset 0 0 5px #ff3333;
            border-radius: 10px;
        }
        body:not(.dark-mode) .xedx-bgblack {
            background: #666 !important;
            box-shadow: inset 0 0 5px #ff3333;
            border-radius: 10px;
        }

        #xtime {
            color: white;
        }
        body:not(.dark-mode) #xtime {
            color: black !important;
        }
        body:not(.dark-mode) #xtime .xedx-bgblack1{
            background: #666 !important;
            color: black;
        }
        .xedx-bgblack1 {
            background: black !important;
        }
        body:not(.dark-mode) .xedx-bgblack1 {
            background: #666 !important;
        }
        .xedx-bgblack2 {
            background: black !important;
            border: 1px solid #ff3333;
            border-radius: 10px;
        }
        body:not(.dark-mode) [class^='bottomBox_'] {
            color: black !important;
        }
    `);

    GM_addStyle(".xedx-tooltip {" +
              "radius: 4px !important;" +
              "background-color: #000000 !important;" +
              "filter: alpha(opacity=80);" +
              "opacity: 0.80;" +
              "padding: 5px 20px;" +
              "border: 2px solid gray;" +
              "border-radius: 10px;" +
              "width: auto;" +
              "margin: 50px;" +
              "text-align: left;" +
              "font: bold 14px ;" +
              "font-stretch: condensed;" +
              "text-decoration: none;" +
              "color: #FFF;" +
              "font-size: 1em;" +
              "}");

    callOnContentLoaded(handlePageLoad);

})();