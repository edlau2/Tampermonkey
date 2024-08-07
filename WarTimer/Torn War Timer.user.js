// ==UserScript==
// @name         Torn War Timer
// @namespace    http://tampermonkey.net/
// @version      0.6
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
    const useLongDate = true;        // For display in window, use long or short format

    var retries = 0;
    var titleRetries = 0;
    const retryTime = 500;
    const maxRetries = 20;

    var formattedDate; // = "War starts on ";
    var shortFormattedDate = '';
    var warList;
    var timer;
    var timeSpans;

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

        // #react-root > div > div > div.f-msg.m-top10 > span
        // During war, ".red" class is there... I'm just comparing text.
        //let titleBarText = $("#react-root > div > div > div.f-msg.m-top10.red > span").text();
        // When matched (note "waiting"):
        //
        // #faction_war_list_id > li:nth-child(2) > div > ul
        // <ul class="statsBox___zH9Ai waiting___CKbCz">

        // This is when war ended, so not in war and not enlisted.
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

        // Test these two:
        // $('#faction_war_list_id').attr('class').split(/\s+/);
        // $("#react-root > div > div > div.f-msg.m-top10").attr('class').split(/\s+/);

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

        debug("start: ", formattedDate);

        if (doToolTip) addToolTip();
        if (doDisplayStart) addTimeDisplay();
    }

    function addTimeDisplay() {
        if ($("#xtime").length) return;
        $(timer).on('contextmenu', handleTimeFormatChange);
        GM_addStyle(".xnone {display: none !important; width: 0px !important;} .xblock {display: block !important; width: auto !important;}");
        GM_addStyle(".snone {display: none !important;} .sblock {display: inline-block !important;}");
        let timeSpan = '<span id="xtime" class="xnone">' + (useLongDate ? formattedDate : shortFormattedDate) + '</span>';
        $(timer).append(timeSpan);
    }

    function handleTimeFormatChange() {
        debug("handleTimeFormatChange");
        if ($("#xtime").hasClass("xnone")) {
            $(timeSpans).addClass("snone").removeClass("sblock");
            $("#xtime").addClass("xblock").removeClass("xnone");
        } else {
            $(timeSpans).addClass("sblock").removeClass("snone");
            $("#xtime").addClass("xnone").removeClass("xblock");
        }
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