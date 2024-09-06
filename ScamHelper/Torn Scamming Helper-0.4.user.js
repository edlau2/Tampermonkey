// ==UserScript==
// @name         Torn Scamming Helper
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Misc scamming add-ons
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
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
    'use strict';

    const DevMode = false;

    var progressBars;
    var progressZones = [];
    var progressCells = [];
    var parsedZones = [];

    // Add new names as I come across them.
    const moveArray = { 0: {Congratulatory: [10,19], Considerate: [3,7], Realistic: [-2,-4],
                            Professional: [10,19], Terse: [3,7], Reassuring: [-2,-4]
                           },
                        1: {Congratulatory: [14,26.6], Considerate: [4.2,9.8], Realistic: [-2.8,-5.6],
                            Professional: [14,26.6], Terse: [4.2,9.8], Reassuring: [-2.8,-5.6]
                           },
                        2: {Congratulatory: [18,34.2], Considerate: [5.4,12.6], Realistic: [-3.6,-7.2],
                            Professional: [18,34.2], Terse: [5.4,12.6], Reassuring: [-3.6,-7.2]
                           },
                        3: {Congratulatory: [22,41.8], Considerate: [6.6,15.4], Realistic: [-4.4,-8.8],
                            Professional: [22,41.8], Terse: [6.6,15.4], Reassuring: [-4.4,-8.8]
                           },
                        4: {Congratulatory: [26,49.4], Considerate: [7.8,18.2], Realistic: [-5.2,-10.4],
                            Professional: [26,49.4], Terse: [7.8,18.2], Reassuring: [-5.2,-10.4]
                           },
                        5: {Congratulatory: [30,57], Considerate: [9,21], Realistic: [-6,-12],
                            Professional: [30,57], Terse: [9,21], Reassuring: [-6,-12]
                           }
                      };

    function getProgressBars(retries=0) {
        progressBars = $("[class^='persuasionBar__']");
        if ($(progressBars).length == 0) {
            if (retries++ < 20) return setTimeout(getProgressBars, 500, retries);
            else return debug("Too mat retries: ", retries);
        }
        debug("Progress bars: ", $(progressBars));
        getZonesAndCells();
    }

    function getZonesAndCells() {
        for (let idx=0; idx < $(progressBars).length; idx++) {
            let bar = $(progressBars)[idx];
            let zones = $(bar).find("[class^='zone_']");
            if ($(zones).length) {
                progressZones.push({zones: zones});
                debug("getZones, bar #", idx, " has ", $(zones).length, " zones");
            }

            let cells = $(bar).find("[class^='cell__']");
            progressCells.push({cells: cells});
            debug("progessCells: count: ", progressCells[0].cells.length, " obj: ", progressCells[0].cells);
        }
        parseZones();
    }

    function parseZones() {
        for (let idx=0; idx < $(progressBars).length; idx++) {
            //parsedZones.push(idx);
            let zoneObj = progressZones[idx];
            let numZones = zoneObj.zones.length;
            debug("Zones for bar #", idx,"numZones: ", numZones, ": ", zoneObj);
            let allMyZones = zoneObj.zones;
            let keys = Object.keys(allMyZones);
            debug("keys: ", keys);
            let len = keys.length;
            debug("length: ", len);
            let thisBar = {};
            for (let idx2=0; idx2 < numZones; idx2++) {
                let thisZone = allMyZones[keys[idx2]];
                debug("thisZone,  #", idx2, ", len: ", $(thisZone).length, ": ",  $(thisZone));
                if ($(thisZone).length > 0) {
                    let cl = getClassList($(thisZone));
                    debug("cl: ", cl);
                    let startAndSize = parseClassList(cl);
                    debug("startAndSize: ", startAndSize);
                    let insertionObj = {idx: idx2, start: startAndSize.start, size: startAndSize.size};
                    debug("parsedZones: ", parsedZones);
                    thisBar[idx2] = (insertionObj);
                }
            }
            parsedZones.push(thisBar);
            debug("parsedZones: ", parsedZones);
        }
    }

    function parseClassList(cl) {
        const r = /\d+/;
        let startAndSize = {start: 0, size: 0};
        for (let idx=0; idx < cl.length; idx++) {
            let className = cl[idx];
            debug("Class #", idx, ": ", className);
            if (className.indexOf("start") > -1) startAndSize.start = className.match(r)[0];
            if (className.indexOf("from") > -1) startAndSize.start = className.match(r)[0];
            if (className.indexOf("size") > -1) startAndSize.size = className.match(r)[0];
        }

        return startAndSize;
    }

    // wildcard remove class
    function removeClassStartingWith(node, begin) {
        debug("removing class starts: ", begin, " node: ", $(node));
        $(node).removeClass (function (index, className) {
            return (className.match ( new RegExp("\\b"+begin+"\\S+", "g") ) || []).join(' ');
        });
    }

    function clearCellStyles(cells) {
        let begin = "xcell";
        $(cells).removeClass (function (index, className) {
            return (className.match ( new RegExp("\\b"+begin+"\\S+", "g") ) || []).join(' ');
        });
    }

    var lastTarget;
    var lastStart = 0;
    var lastResp = undefined;
    var retried = false;
    function handleResponseClick(e, optTarget) {
        log("handleResponseClick, e: ", e);
        log("handleResponseClick, opt: ", $(optTarget));
        let target;
        if (e && e != 42) {
            log("curr arget: ",  $(e.currentTarget));
            target = $(e.currentTarget);
            log("Target: ",  $(target));
        }

        let label = $(target).attr("aria-label");
        let isCommit = $(target).hasClass("commit-button");
        log("label: ", label, " isCommit: ", isCommit);
        if (!isCommit) {
            lastResp = $(target);
        }

        if (label == "Capitalize") {
            log("Capitalize - no need to check accel!");
            let cells = getCells(target);
            clearCellStyles(cells);
            return;
        }

        // moved...
        let btn;
        if (isCommit) {
            //currAccel = 0;
            if (lastResp)
                btn = $(lastResp);
            else {
                let btns = $(optsSec).find("button");
                log("response btns: ", $(btns));
                for (let idx=0; idx<$(btns).length; idx++) {
                    btn = $(btns)[idx];
                    let pressed = $(btn).attr("aria-pressed");
                    log("pressed: ", pressed, " btn: ", $(btn));
                    if (pressed == "true") break;
                }
            }
        } else {
            btn = $(target);
        }

        // See if any acceleration should be applied
        // Do I need this retry anymore? Also, need the target????
        let accel = getAcceleration(btn, target);
        // end moved
        if (retried == false) {
            retried = true;
            setTimeout(handleResponseClick, 500, e);
            return; // false;
        }
        retried = false;
        //return false;
    }

    function getCells(target) {
        let optsSec = $(target).closest("[class*='crime-option-sections']");
        let pBar = $(optsSec).find("[class^='persuasionBarContainer_']");
        let cells = $(pBar).find("[class^='cell__']");
        log("# cells: ", $(cells).length);
        log("cells: ", $(cells));
        return $(cells);
    }

    var savedStart = 0;
    function handleResponseClick2(btn, target, accel, retries=0) {
        log("handleResponseClick2, target: ", $(target));
        log("handleResponseClick2, btn: ", $(btn));
        log("handleResponseClick2, accel: ", accel);

        let optsSec = $(target).closest("[class*='crime-option-sections']");
        let pBar = $(optsSec).find("[class^='persuasionBarContainer_']");
        log("pBar: ", $(pBar));

        let pip = $(pBar).find("[class^='pipRange_']")[0]; //__TUu4E from-0___hE8a_ size-1___zgR_S
        debug("pip: ", $(pip));

        let cl = getClassList($(pip));
        log("cl: ", cl);
        if (!cl) {
            // find selected target and re-click!
            if (retries++ > 4) return setTimeout(handleResponseClick, 500, btn, target, accel, retries);
            retries = 0;
            return;
        }

        let startAndSize = parseClassList(cl);
        let pipStart = startAndSize.start;
        log("pip start index: ", startAndSize.start, " last: ", lastStart);

        // temp - should have already cached...
        let cells = $(pBar).find("[class^='cell__']");
        log("# cells: ", $(cells).length);
        log("cells: ", $(cells));

        let respType = $(btn).attr("aria-label");
        log("*** resp type : ", respType, " ****");
        GM_setValue("respType_" + respType, true);
        log("Btn type: ", respType);

        if (respType == "Capitalize") {
            clearCellStyles(cells);
            /*
            let begin = "xcell";
            $(cells).removeClass (function (index, className) {
                return (className.match ( new RegExp("\\b"+begin+"\\S+", "g") ) || []).join(' ');
            });
            */
            return;
        }

        log("Acceleration: ", accel);
        let idx = accel && accel > 0 ? accel : 0;
        let entry = moveArray[idx][respType];
        log("Entry at ", idx, ": ", entry);
        let start=0, end=0;
        if (entry) {
            start = entry[0]; end = entry[1];
        } 
        log("start: ", start, " end: ", end);
        savedStart = start;

        // Move this to a "clearXcellStyles" fn?
        if( start && end) {
            let begin = "xcell";
            $(cells).removeClass (function (index, className) {
                return (className.match ( new RegExp("\\b"+begin+"\\S+", "g") ) || []).join(' ');
            });
        }

        if (respType == "Realistic" || respType == "Reassuring") {
            let begin = Math.round(+pipStart + +start);
            let stop = Math.round(+pipStart + +end);
            log("begin: ", begin, " stop: ", stop);
            let type = "R";
            for (let idx = +pipStart + +start; idx > +pipStart + +end; idx--) {
                log("adding class for idx ", idx, " to ", $(cells)[idx]);
                let tcell = $(cells)[idx];
                //removeClassStartingWith(tcell, "xcell");
                addColorClass(tcell, respType, type, accel);
                if (type == "R" && idx != stop) type = "C";
                if (idx == stop) type = "L";
            }
        } else {
            let begin = Math.round(+pipStart + +start);
            let stop = Math.round(+pipStart + (+end > 0 ? +end : 50));
            log("begin: ", begin, " stop: ", stop);
            let type = "L";                               // Left, Center, Right
            for (let idx = begin; idx < stop; idx++) {
                log("adding class for idx ", idx, " to ", $(cells)[idx]);
                let tcell = $(cells)[idx];
                //removeClassStartingWith(tcell, "xcell");
                addColorClass(tcell, respType, type, accel);
                if (type == "L" && idx != stop) type = "C";
                if (idx == stop) type = "R";
            }
        }

        // Add the click handler back if this btn is redrawn.
        let allBtns = $(btn).parent().find("button");
        log("btn list: ", $(allBtns));
        for (let idx=0; idx < $(allBtns).length; idx++) {
            setTimeout(addRespBtnHandler, 500, $(allBtns)[idx]);
        }

        let secSib = $(btn).parent().next().next();
        let commitBtn = $(secSib).children().first();
        log("*** Finding Commit ****");
        log("parent: ", $($(btn).parent()));
        log("secSib: ", $(secSib));
        log("children: ", $($(secSib).children()));
        log("commitBtn : ", $(commitBtn));
        addRespBtnHandler(commitBtn);
    }

    //var currAccel = 0;
    function getAcceleration(btn, target, retries=0) {
        log("getAcceleration, retries: ", retries, " btn: ", $(btn));
        let first = $(btn).children().first()[0];
        log("first: ", $(first));
        log("divs: ", $(first).find("div"));
        //log("divs0: ", $($(first)[0]).find("div"));

        let node = $($(first).context).find("[class*='accelerated__']"); // linesAnimation___Ya8_I accelerated___DgNhO forStrongForward___Enhb4
        //let node = $(btn).find("div > [class*='accelerated__']")[0];
        log("getAcceleration found node: ", $(node));

        // Takes a while after btn click to update...
        if ($(node).length == 0) {
            log("will retry");
            if (++retries < 10) return setTimeout(getAcceleration, 100, btn, target, retries);
        }

        let acc = 0;
        let style = $(node).attr("style");
        log("getAcceleration found Style: ", style);
        if (style) { //return 0;
            acc = style.match(/\d+/)[0];
            log("acc: ", acc);
            log("getAcceleration found: ", acc);
        }
        handleResponseClick2(btn, target, acc);
    }

    // Make lookup table! JSON onjects, maybe array.contains...
    function addColorClass(tcell, respType, type, acc) {
        debug("Adding color class, type: ", type);
        if (respType == "Congratulatory" || respType == "Professional") {
            $(tcell).addClass("xcellC" + type);
            if (acc > 0) $(tcell).addClass("xcell-fastC");
        }

        if (respType == "Considerate" ||respType == "Terse") {
            $(tcell).addClass("xcellD" + type);
            if (acc > 0) $(tcell).addClass("xcell-fastD");
        }

        if (respType == "Realistic" || respType == "Reassuring") {
            $(tcell).addClass("xcellR" + type);
            if (acc > 0) $(tcell).addClass("xcell-fastC");
        }
    }

    // Don't need observers - just need to know what button is selected.
    // Maybe need to know dynamically when changed. Hook "onClick",
    // but pass through?
    var installRespBtnHandlers = false;
    function installObservers(retries=0) {
        log("installObservers, retries: ", retries);

        installResponseBtnHandlers();

        installCommitBtnHandlers();
    }

    function installCommitBtnHandlers(retries=0) {
        log("installCommitBtnHandlers, retries: ",retries);

        // Better to figure out when done AND if success
        let targets = $("[class*='commitButtonSection___'] > button");
        if ($(targets).length == 0) {
            if (retries++ > 20) return ("installCommitBtnHandlers too many retries.");
            return setTimeout(installCommitBtnHandlers, 250, retries);
        }

        log("commit btns: ", $(targets));
        for (let idx=0; idx < $(targets).length; idx++) {
            let btn = $(targets)[idx];
            let label = $(btn).attr("aria-label");

            log("btn: ", $(btn), " label: ", label);
            if (!label) {
                log("No label!!!");
                continue;
            }

            // "Read" button. On click, search for new response btns.
            if (label.indexOf("Read") > -1) {
                log("Read btn: ", $(btn));
                if (!$(btn).hasClass("xedx")) {
                    $(btn).addClass("xedx");
                    log("Detected read, installing on ", $($(btn)[0]));
                    $($(btn)[0]).on("click", function () {
                        setTimeout(installObservers, 500);
                    });
                }
            }

            // Response button - re-draw color bars
            if (label.toLowerCase().indexOf('respon') > -1) {
                log("Response btn: ", $(btn));
                addRespBtnHandler(btn);
            }
        }
    }

    function addRespBtnHandler(btn) {
        log("addRespBtnHandler btn: ", $(btn));
        let label = $(btn).attr("aria-label");
        log("label: ", label);
        if (!$(btn).hasClass("xedx")) {
            $(btn).addClass("xedx");
            log("Detected 'response', installing on: ", $($(btn)[0]));
            $($(btn)[0]).on("click", function (e) {
                setTimeout(handleResponseClick, 750, e);
            });
        }
    }

    // Periodically check to see if a scroll down has
    // broght new buttons into view. Could hook scroll -
    // or have a global mutation observer for all changes...
    var lastRespEventsCount = 0;
    function checkRespBtns() {
        let targets = $(".response-type-button");
        let len = $(targets).length;
        if (len > lastRespEventsCount) {
            lastRespEventsCount = len;
            installResponseBtnHandlers();
        } else
            setTimeout(checkRespBtns, 2000);
    }

    function installResponseBtnHandlers(retries=0) {
        log("installResponseBtnHandlers, retries: ", retries);
        let targets = $(".response-type-button");
        if ($(targets).length == 0)  {
            if (retries++ > 20) {
                setTimeout(checkRespBtns, 2000);
                return log("Too many retries, prob nothing to do!");
            }
            return setTimeout(installResponseBtnHandlers, 400, retries);
        }

        log("response btn targets: ", $(targets));
        lastRespEventsCount = $(targets).length;
        for (let idx=0; idx < $(targets).length; idx++) {
            let target = $(targets)[idx];
            log("target: ", $(target));
            let label = $(target).attr("aria-label");
            log("label: ", label);

            if (!$(target).hasClass("xedx")) {
                $(target).addClass("xedx");
                log("adding resp handler to: ", $(target));
                $(target).on('click', handleResponseClick);
            }
        }
        setTimeout(checkRespBtns, 2000);
    }

    function handlePageLoad() {
        getProgressBars();
        installObservers();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    if (location.hash.indexOf("scamming") < 0) return log("Not on scamming...");
    if (location.href.indexOf("crimes#/scamming") < 0) return log("Not on scamming...");

    // TEMP class to track what I added handler to...
    if (DevMode) GM_addStyle(".xedx {border: 1px solid blue !important;}");

    GM_addStyle(`
        .xcellCC{
            height: 12px;
            border-top: 2px solid limegreen;
            border-bottom: 2px solid limegreen;

            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: green;
            opacity: .6;
        }
        .xcellCL{
            height: 12px;
            border-top: 2px solid limegreen;
            border-left: 2px solid limegreen;
            border-bottom: 2px solid limegreen;

            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: green;
            opacity: .6;
        }
        .xcellCR{
            height: 12px;
            border-top: 2px solid limegreen;
            border-right: 2px solid limegreen;
            border-bottom: 2px solid limegreen;
            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: green;
            opacity: .6;
        }

        .xcellDC {
            height: 12px;
            border-top: 2px solid blue;
            border-bottom: 2px solid blue;
            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: #8585e0;
            opacity: .6;
        }
        .xcellDL {
            height: 12px;
            border-top: 2px solid blue;
            border-left: 2px solid blue;
            border-bottom: 2px solid blue;
            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: #8585e0;
            opacity: .6;
        }
         .xcellDR {
            height: 12px;
            border-top: 2px solid blue;
            border-right: 2px solid blue;
            border-bottom: 2px solid blue;
            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: #8585e0;
            opacity: .6;
        }

       .xcellRC {
            height: 12px;
            border-top: 2px solid red;
            border-bottom: 2px solid red;
            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: #ff4d4d;
            opacity: .6;
        }
        .xcellRL {
            height: 12px;
            border-top: 2px solid red;
            border-left: 2px solid red;
            border-bottom: 2px solid red;
            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: #ff4d4d;
            opacity: .6;
        }
        .xcellRR {
            height: 12px;
            border-top: 2px solid red;
            border-right: 2px solid red;
            border-bottom: 2px solid red;
            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: #ff4d4d;
            opacity: .6;
        }
        @keyframes blinkC {50% { border-color: #0000ff; }}
        @keyframes blinkD {50% { border-color: #00FF00; }}
        @keyframes blinkR {50% { border-color: #ff0000; }}

        .xcell-fastC { animation: blinkC .5s step-end infinite alternate; }
        .xcell-fastD { animation: blinkD .5s step-end infinite alternate; }
        .xcell-fastR { animation: blinkR .5s step-end infinite alternate; }
        `);

    callOnContentComplete(handlePageLoad);

})();