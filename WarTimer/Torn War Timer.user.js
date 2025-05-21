// ==UserScript==
// @name         Torn War Timer
// @namespace    http://tampermonkey.net/
// @version      1.13
// @description  Add tooltip with local RW start time to war countdown timer
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

// Maybe incorporate War Score Watcher into this?

(function() {
    'use strict';

    // Enable for debug logging...
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    // 'Mode' of operation - tooltip, or click to toggle to local start time.
    const doToolTip = true;           // Display local start time as tool tip.
    const doDisplayStart = true;      // Toggle display type on right click, time until or local start time
    const useLongDate = true;         // For display in window, use long or short format

    const retryTime = 500;
    const maxRetries = 20;

    var warStart;
    var warId;
    var formattedDate; // = "War starts on ";
    var shortFormattedDate = '';
    var warList;
    var timer;
    var timeSpans;
    var hasInitialized = false;

    var atWar;  // undefined until API call complete!
    var enlisted = false;
    var myFacId = GM_getValue("myFacId", null);
    if (myFacId) getWarStatus(myFacId);
    getFacId(); // In case it's changed

    function getFacId(retries=0) {
        let oldFacId = myFacId;
        let facChatBtn = $("[id^='channel_panel_button:faction']");
        if ($(facChatBtn).length == 0) {
            if (retries++ < 30) return setTimeout(getFacId, 250, retries);
            return log("[getFacId] timed ot");
        }
        let id = $(facChatBtn).attr("id");
        let parts;
        if (id) {
            parts = id.split('-');
            myFacId = parts[1];
            if (myFacId) GM_setValue("myFacId", myFacId)
        }
        if (!atWar || oldFacId != myFacId && myFacId) getWarStatus(myFacId);
    }

    var clickState = GM_getValue("clickState", 0);

    // TBD: Get time from API2 instead!!! See attack better?
    // xedx_TornFactionQueryv2(facId, "rankedwars", rwReqCb);

    function addLocalTime(retries=0) {
        let war = $("[class*='rankBox_']");
        timer = $(war).find("[class*='timer_']");
        timeSpans = $(timer).find("span");
        //debug("timer: ", $(timer), " spans: ", timeSpans);
        if ($(timer).length == 0 || $(timeSpans).length == 0)  {
            if (retries++ < maxRetries) return setTimeout(addLocalTime, retryTime, retries);
            return debug("[addLocalTime] Too many retries, timer not found.");
        }

        let startTime = new Date(Number(warStart)*1000);

        formattedDate = "War starts on " +
            startTime.toLocaleString(undefined, {weekday: 'long'}) + ", at " +
            startTime.toLocaleString(undefined, {timeStyle: 'medium'});

        shortFormattedDate = startTime.toLocaleString(undefined, {weekday: 'long'}) + ", " +
            startTime.toLocaleString(undefined, {timeStyle: 'medium'});

        debug("start: ", formattedDate, " clickState: ", clickState);

        if (doToolTip) displayToolTip(timer, formattedDate, "tooltip4");
        if (doDisplayStart) addTimeDisplay();

        if (clickState > 0) { // && (hasInitialized == false)) {
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
    //
    // xnone, <nothing>
    // xflex, <nothing>
    // xflex xedx-bgblack1,  xedx-bgblack
    // xedx-bgblack1 xnone,  xedx-bgblack
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
        return false;
    }

    var warStartStr;
    function rwReqCb(responseText, ID, options) {
        let jsonObj = JSON.parse(responseText);
        if (jsonObj.error) {
            console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
            return;
        }
        let warsArray = jsonObj.rankedwars;
        let war0 = warsArray[0];

        if (war0) {
            debug("War: ", war0);
            let now = parseInt(new Date().getTime() / 1000);
            warStart = war0.start;
            warId = war0.id;
            if (war0.end == 0 || war0.winner == null) {
                enlisted = true;
                atWar = (warStart < now);
            } else {
                atWar = false;
            }
        }

        debug("Faction ", ID, " at war? ", atWar, " enlisted? ", enlisted);
        debug("War start: ", new Date(Number(warStart*1000)).toString());
        //GM_setValue("activeWar", atWar);
    }

    function getWarStatus(facId) {
        if (getApiKey() && facId)
            xedx_TornFactionQueryv2(facId, "rankedwars", rwReqCb);
    }

    function handlePageLoad(retries=0) {
        debug("[handlePageLoad] clickState: ", clickState);
        if (location.href.indexOf('step=your') < 0 || location.hash.indexOf("tab=") > -1) {
            return log("Not on right fac page! (", location.href, ")");
        }

        let titleBarText = $("#react-root > div > div.f-msg > span").text();
        if (!titleBarText) {
            if (retries++ < maxRetries) return setTimeout(handlePageLoad, retryTime, retries);
            debug("handlePageLoad, too many retries. Adding anyways...");
            retries = 0;
        }

        if (atWar == undefined && myFacId && getApiKey()) {
            getWarStatus(myFacId);
            if (retries++ < maxRetries) return setTimeout(handlePageLoad, retryTime, retries);
            debug("handlePageLoad, too many retries. Adding anyways...");
        }

        if (atWar == true) {
            return log("Already warring, ignoring...");
        }

        addLocalTime();
        hasInitialized = true;
    }

    function handleHashChange() {
        debug("[handleHashChange] clickState: ", clickState,
              " hasInitialized: ", hasInitialized, " xtime: ", $("#xtime").length);
        //if (hasInitialized == false)
            handlePageLoad();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey('ltd',
       "Your key is only required to get your current war status.");  // Required to get war status

    addStyles();

    installHashChangeHandler(handleHashChange);
    //installPushStateHandler(handlePageLoad);

    callOnContentLoaded(handlePageLoad);

    function addStyles() {
        addToolTipStyle();
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
            .xedx-tooltip {
                  radius: 4px !important;
                  background-color: #000000 !important;
                  filter: alpha(opacity=80);
                  opacity: 0.80;
                  padding: 5px 20px;
                  border: 2px solid gray;
                  border-radius: 10px;
                  width: auto;
                  margin: 50px;
                  text-align: left;
                  font: bold 14px ;
                  font-stretch: condensed;
                  text-decoration: none;
                  color: #FFF;
                  font-size: 1em;
              }
        `);
    }

})();