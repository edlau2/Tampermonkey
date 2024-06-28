// ==UserScript==
// @name         Torn War Timer
// @namespace    http://tampermonkey.net/
// @version      0.3
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

(function() {
    'use strict';

    // Enable for debug logging...
    debugLoggingEnabled = true;

    // 'Mode' of operation - tooltip, or click to toggle to local start time.
    const doToolTip = true;           // Display local start time as tool tip.
    const doDisplayStart = true;      // Toggle display type on right click, time until or local start time
    const useLongDate = false;        // For display in window, use long or short format

    var retries = 0;
    const retryTime = 500;
    const maxRetries = 5;

    var formattedDate = "War starts on ";
    var shortFormattedDate = '';
    var warList;
    var timer;
    var timeSpans;

    function handleHashChange() {
        debug("hashChangeHandler: ", location.hash);
        retries = 0;
        addLocalTime();
    }

    function handlePageLoad() {
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

        log("Looking for DIV, retries: ", retries, " found: ", $(warList).length);
        if ($(warList).length == 0) {retries++; return setTimeout(addLocalTime, retryTime);}

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

        formattedDate += //"War starts on " +
            startTime.toLocaleString(undefined, {weekday: 'long'}) + ", at " +
            startTime.toLocaleString(undefined, {timeStyle: 'medium'});

        shortFormattedDate = startTime.toLocaleString(undefined, {weekday: 'long'}) + ", " +
            startTime.toLocaleString(undefined, {timeStyle: 'medium'});

        debug("start: ", formattedDate);

        if (doToolTip) addToolTip();
        if (doDisplayStart) addTimeDisplay();
    }

    function addTimeDisplay() {
        if ($("#xtime").length) return;
        $("#faction_war_list_id").on('contextmenu', handleTimeFormatChange);
        GM_addStyle(".xnone {display: none !important; width: 0px !important;} .xblock {display: block !important; width: auto !important;}");
        GM_addStyle(".snone {display: none !important;} .sblock {display: inline-block !important;}");
        let timeSpan = '<span id="xtime" class="xnone">' + (useLongDate ? formattedDate : shortFormattedDate) + '</span>';
        $(timer).append(timeSpan);
    }

    function handleTimeFormatChange() {
        log("handleTimeFormatChange");
        if ($("#xtime").hasClass("xnone")) {
            log("Turning ON");
            $(timeSpans).addClass("snone").removeClass("sblock");
            $("#xtime").addClass("xblock").removeClass("xnone");
        } else {
            log("Turning OFF");
            $(timeSpans).addClass("sblock").removeClass("snone");
            $("#xtime").addClass("xnone").removeClass("xblock");
        }
        //log("xtime: ", $("#xtime"));
        return false;
    }

    function addToolTip() {
        addToolTipStyle();
        displayToolTip2(timer, formattedDate);
    }

    function displayToolTip2(node, text, cl) {
    $(document).ready(function() {
        $(node).attr("title", "original");
        $(node).tooltip({
            content: text,
            classes: {
                "ui-tooltip": "xedx-tooltip"
            }
        });
    })
}


    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

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