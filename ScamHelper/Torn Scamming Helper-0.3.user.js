// ==UserScript==
// @name         Torn Scamming Helper
// @namespace    http://tampermonkey.net/
// @version      0.3
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

    var progressBars;
    var progressZones = [];
    var progressCells = [];
    var parsedZones = [];

    const aheadFastArr = ["Congratulatory","Professional"]; /// to be continued

    // Add terse, professional, reassuring, etc
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

    var lastTarget;
    function handleResponseClick(e, optTarget) {
        log("handleResponseClick, e: ", e);
        let target = optTarget ? optTarget : e.currentTarget;
        lastTarget = target;
        log("Target: ",  $(target));

        let optsSec = $(target).closest("[class*='crime-option-sections']");
        log("optsSec: ", $(optsSec));
        let pBar = $(optsSec).find("[class^='persuasionBarContainer_']");
        log("pBar: ", $(pBar));

        let pip = $(pBar).find("[class^='pipRange_']")[0]; //__TUu4E from-0___hE8a_ size-1___zgR_S
        debug("pip: ", $(pip));

        let cl = getClassList($(pip));
        log("cl: ", cl);
        let startAndSize = parseClassList(cl);
        let pipStart = startAndSize.start;
        log("pip start index: ", startAndSize.start);

        // temp - should have already cached...
        let cells = $(pBar).find("[class^='cell__']");
        debug("# cells: ", $(cells).length);
        debug("cells: ", $(cells));


        let respType = $(target).attr("aria-label");
        debug("*** resp type : ", respType, " ****");
        GM_setValue("respType_" + respType, true);
        log("Btn type: ", respType);
        let entry = moveArray[0][respType];
        log("Entry: ", entry);
        let start=0, end=0;
        if (entry) {
            start = entry[0]; end = entry[1];
        } else {
            //start = 5; end = 10;
        }
        log("start: ", start, " end: ", end);
        if( start && end) {
            let begin = "xcell";
            $(cells).removeClass (function (index, className) {
                return (className.match ( new RegExp("\\b"+begin+"\\S+", "g") ) || []).join(' ');
            });
        }
        if (respType == "Realistic" || respType == "Reassuring") {
            let begin = +pipStart + +start;
            let stop = +pipStart + +end;
            let type = "R";
            for (let idx = +pipStart + +start; idx > +pipStart + +end; idx--) {
                debug("adding class for idx ", idx, " to ", $(cells)[idx]);
                let tcell = $(cells)[idx];
                //removeClassStartingWith(tcell, "xcell");
                addColorClass(tcell, respType, type);
                if (type == "R" && idx != stop) type = "C";
                if (idx == stop) type = "L";
            }
        } else {
            let begin = +pipStart + +start;
            let stop = +pipStart + +end;
            let type = "L";                               // Left, Center, Right
            for (let idx = begin; idx < stop; idx++) {
                debug("adding class for idx ", idx, " to ", $(cells)[idx]);
                let tcell = $(cells)[idx];
                //removeClassStartingWith(tcell, "xcell");
                addColorClass(tcell, respType, type);
                if (type == "L" && idx != stop) type = "C";
                if (idx == stop) type = "R";
            }
        }
    }

    // Make lookup table! JSON onjects, maybe array.contains...
    function addColorClass(tcell, respType, type) {
        debug("Adding color class, type: ", type);
        if (respType == "Congratulatory") $(tcell).addClass("xcellC" + type);
        if (respType == "Professional") $(tcell).addClass("xcellC" + type);

        if (respType == "Considerate") $(tcell).addClass("xcellD" + type);
        if (respType == "Terse") $(tcell).addClass("xcellD" + type);

        if (respType == "Realistic") $(tcell).addClass("xcellR" + type);
        if (respType == "Reassuring") $(tcell).addClass("xcellR" + type);
    }

    // Don't need observers - just need to know what button is selected.
    // Maybe need to know dynamically when changed. Hook "onClick",
    // but pass through?
    function installObservers(retries=0) {
        let doRetry = false;
        log("installObservers");
        let targets = $("[class*='responseTypeButton_']");
        if ($(targets).length == 0) targets = $(".response-type-button");
        log("targets: ", $(targets).length, " | ", $(targets)[0] ? $(targets)[0].length : 0);
        if ($(targets).length == 0)  {
            if (retries++ > 20) return log("Too many retries, prob nothing to do!");
            doRetry = true;
        }
        log("targets: ", $(targets));
        for (let idx=0; idx < $(targets).length; idx++) {
            let target = $(targets)[idx];
            let btnList = $(target).find("button.response-type-button");
            log("btnList: ", btnList);
            log("target: ", $(target));
            $(btnList).on('click', handleResponseClick);
            $(target).on('click', handleResponseClick);
        }

        $("[class*='noNerveCost__']").on("click", function() {
            log("Will install new observers!");
            setTimeout(installObservers, 500);
        });

        // Better to figure out when done AND if success
        $("[class*='commitButtonSection___'] > button").on("click", function (e) {
            let label = $(e.currentTarget).attr("aria-label");
            log("commit btn click, label: ", label);
            if (label && label.indexOf("Respond") > -1)
                setTimeout(handleResponseClick, 2000, 42, lastTarget);
        });

        if (doRetry)
            return setTimeout(installObservers, 1000, retries);
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
        `);

    callOnContentComplete(handlePageLoad);

})();