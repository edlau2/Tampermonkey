// ==UserScript==
// @name         Torn Scamming Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Misc scamming add-ons
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
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
    'use strict';

    var progressBars;
    var progressZones = [];
    var progressCells = [];
    var parsedZones = [];

    const moveArray = { 0: {Congratulatory: [10,19], Considerate: [3,7], Realistic: [-2,-4]},
                        1: {Congratulatory: [14,26.6], Considerate: [4.2,9.8], Realistic: [-2.8,-5.6]},
                        2: {Congratulatory: [18,34.2], Considerate: [5.4,12.6], Realistic: [-3.6,-7.2]},
                        3: {Congratulatory: [22,41.8], Considerate: [6.6,15.4], Realistic: [-4.4,-8.8]},
                        4: {Congratulatory: [26,49.4], Considerate: [7.8,18.2], Realistic: [-5.2,-10.4]},
                        5: {Congratulatory: [30,57], Considerate: [9,21], Realistic: [-6,-12]}
                      };

    function getProgressBars(retries=0) {
        progressBars = $("[class^='persuasionBar__']");
        if ($(progressBars).length == 0) {
            if (retries++ < 20) return setTimeout(getProgressBars, 500, retries);
            else return log("Too mat retries: ", retries);
        }
        log("Progress bars: ", $(progressBars));
        getZonesAndCells();
    }

    function getZonesAndCells() {
        for (let idx=0; idx < $(progressBars).length; idx++) {
            let bar = $(progressBars)[idx];
            let zones = $(bar).find("[class^='zone_']");
            //log("Zones: ", $(zones));
            if ($(zones).length) {
                progressZones.push({zones: zones});
                log("getZones, bar #", idx, " has ", $(zones).length, " zones");
            }

            let cells = $(bar).find("[class^='cell__']");
            //progressCells.push({[idx]: {cells: cells}});
            progressCells.push({cells: cells});

            //log("progessCells: count: ", progressCells[0].length, " obj: ", progressCells[0]);
            log("progessCells: count: ", progressCells[0].cells.length, " obj: ", progressCells[0].cells);
        }

        //log("progressZones: ", progressZones);

        parseZones();
    }

    //
    // [0:{[idx: 0, start: 1, len: 4], },
    //  1:{}
    //
    function parseZones() {
        for (let idx=0; idx < $(progressBars).length; idx++) {
            //parsedZones.push(idx);
            let zoneObj = progressZones[idx];
            let numZones = zoneObj.zones.length;
            log("Zones for bar #", idx,"numZones: ", numZones, ": ", zoneObj);
            let allMyZones = zoneObj.zones;
            let keys = Object.keys(allMyZones);
            log("keys: ", keys);
            let len = keys.length;
            log("length: ", len);
            let thisBar = {};
            for (let idx2=0; idx2 < numZones; idx2++) {
                let thisZone = allMyZones[keys[idx2]];
                log("thisZone,  #", idx2, ", len: ", $(thisZone).length, ": ",  $(thisZone));
                if ($(thisZone).length > 0) {
                    let cl = getClassList($(thisZone));
                    log("cl: ", cl);
                    let startAndSize = parseClassList(cl);
                    log("startAndSize: ", startAndSize);
                    let insertionObj = {idx: idx2, start: startAndSize.start, size: startAndSize.size};
                    log("parsedZones: ", parsedZones);
                    thisBar[idx2] = (insertionObj);
                }
            }
            parsedZones.push(thisBar);
            log("parsedZones: ", parsedZones);
        }
    }

    function parseClassList(cl) {
        const r = /\d+/;
        let startAndSize = {start: 0, size: 0};
        for (let idx=0; idx < cl.length; idx++) {
            let className = cl[idx];
            log("Class #", idx, ": ", className);
            if (className.indexOf("start") > -1) startAndSize.start = className.match(r)[0];
            if (className.indexOf("from") > -1) startAndSize.start = className.match(r)[0];
            if (className.indexOf("size") > -1) startAndSize.size = className.match(r)[0];
        }

        return startAndSize;
    }

    function handleResponseClick(e) {
        log("handleResponseClick, e: ", e);
        let target = e.currentTarget;
        log("Target: ",  $(target));

        let optsSec = $(target).closest("[class*='crime-option-sections']");
        log("optsSec: ", $(optsSec));
        let pBar = $(optsSec).find("[class^='persuasionBarContainer_']");
        log("pBar: ", $(pBar));

        let pip = $(pBar).find("[class^='pipRange_']")[0]; //__TUu4E from-0___hE8a_ size-1___zgR_S
        log("pip: ", $(pip));

        let cl = getClassList($(pip));
        log("cl: ", cl);
        let startAndSize = parseClassList(cl);
        let pipStart = startAndSize.start;
        log("pip start index: ", startAndSize.start);

        // temp - should have already cached...
        let cells = $(pBar).find("[class^='cell__']");
        log("# cells: ", $(cells).length);
        log("cells: ", $(cells));
        let respType = $(target).attr("aria-label");
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
            $(cells).removeClass("xcellC").removeClass("xcellD").removeClass("xcellR");
        }
        if (respType == "Realistic") {
            for (let idx = +pipStart + +start; idx > +pipStart + +end; idx--) {
                log("adding class for idx ", idx, " to ", $(cells)[idx]);
                let tcell = $(cells)[idx];
                addColorClass(tcell, respType);
            }
        } else {
            for (let idx = +pipStart + +start; idx < +pipStart + +end; idx++) {
                log("adding class for idx ", idx, " to ", $(cells)[idx]);
                let tcell = $(cells)[idx];
                addColorClass(tcell, respType);
            }
        }
    }

    function addColorClass(tcell, respType) {
        //Congratulatory: [30,57], Considerate: [9,21], Realistic
        if (respType == "Congratulatory") $(tcell).addClass("xcellC").removeClass("xcellD").removeClass("xcellR");
        if (respType == "Professional") $(tcell).addClass("xcellC").removeClass("xcellD").removeClass("xcellR");
        if (respType == "Considerate") $(tcell).addClass("xcellD").removeClass("xcellC").removeClass("xcellR");
        if (respType == "Reassuring") $(tcell).addClass("xcellD").removeClass("xcellC").removeClass("xcellR");
        if (respType == "Realistic") $(tcell).addClass("xcellR").removeClass("xcellD").removeClass("xcellD");
    }

    // Don't need observers - just need to know what button is selected.
    // Maybe need to know dynamically when changed. Hook "onClick",
    // but pass through?
    function installObservers(retries=0) {
        log("installObservers");
        let targets = $("[class*='responseTypeButton_']");
        if ($(targets).length == 0) targets = $(".response-type-button");
        //responseTypeButton
        // response-type-button
        log("targets: ", $(targets).length, " | ", $(targets)[0] ? $(targets)[0].length : 0);
        if ($(targets).length == 0)  {
            if (retries++ > 20) return log("Too many retries, prob nothing to do!");
            return setTimeout(installObservers, 1000, retries);
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
        .xcellC{
            height: 12px;
            border: 2px solid limegreen;

            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: green;
            opacity: .6;
        }
        .xcellD {
            height: 12px;
            border: 2px solid blue;

            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: #8585e0;
            opacity: .6;
        }
        .xcellR {
            height: 12px;
            border: 2px solid red;

            height: 12px;
            margin-bottom: 2px;
            margin-top: -2px;
            background: #ff4d4d;
            opacity: .6;
        }
        `);

    callOnContentComplete(handlePageLoad);

})();