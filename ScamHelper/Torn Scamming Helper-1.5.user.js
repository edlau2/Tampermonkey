// ==UserScript==
// @name         Torn Scamming Helper
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Misc scamming add-ons
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
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
    'use strict';

    const DevMode = true;
    const dispToolTips = false;

    // These need updating:
    // https://lh3.googleusercontent.com/d/1BvBRn0vFg3gGC2Zme4jATNKz4GOhn0vx=w2000?authuser=0

    // Much of this is estimated, will change as more data comes in.
    //
    // delivery, family, prize:
    const lvl0arr = ["delivery", "family", "prize"];
    const idxMoveArray = { 0: [[10,19], [3,7],[-2,-4]],
                           1: [[15,29], [5,11], [-3,-6]],
                           2: [[18,35], [6,13], [-4,-7]],
                           3: [[21,39], [6,14], [-4,-8]],
                           4: [[22,42], [7,15], [-5,-9]],         // back isn't known?
                           5: [ [23,44],  [7,16],  [-5,-10]]      // back isn't known?
                      };

    // 20: charity, tech support
    const lvl20arr = ["charity", "tech"];
    const idxMoveArray20 = { 0: [[8,15], [3,7],[-2,-4]],
                           1: [[12,23], [5,11], [-3,-6]],         // back isn't known?
                           2: [[15,28], [5,13], [-4,-7]],         // back isn't known?
                           3: [[16,31], [6,14], [-4,-8]],         // back isn't known?
                           4: [[18,33], [7,15], [-4,-9]],         // back isn't known?
                           5: [ [18,35],  [7,16],  [-5,-9]]      // back isn't known?
                      };

    // 40: vacation, tax
    const lvl40arr = ["vacation", "tax"];
    const idxMoveArray40 = { 0: [[7,13], [3,6],[-2,-4]],          // back isn't knownn for any of these?
                           1: [[11,20], [5,9], [-3,-6]],
                           2: [[13,24], [6,11], [-4,-7]],
                           3: [[14,27], [6,12], [-4,-8]],
                           4: [[15,29], [7,13], [-4,-9]],
                           5: [ [16,30],  [7,14],  [-5,-9]]
                      };

    // 60: advance-fee, job
    const lvl60arr = ["advance-fee", "job"];        // Unknown ATM...
    const idxMoveArray60 = { 0: [[6,11], [2,4],[-2,-4]],
                           1: [[9,17], [3,6], [-3,-6]],
                           2: [[10,18], [4,7], [-4,-7]],         // These are all just guesses
                           3: [[11,19], [5,8], [-4,-8]],
                           4: [[12,20], [6,9], [-4,-9]],
                           5: [ [13,21],  [7,10],  [-5,-9]]
                      };

    // 80: romance, investment
    const lvl80arr = ["romance", "investment"];     // Unknown ATM...
    const idxMoveArray80 = idxMoveArray60;

    // ===================================================

    function pushStateChanged(e) {
        log("pushStateChanged: ", e);
        setTimeout(handlePageLoad, 500);
    }

    /*
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
    */

    //
    // ======== Borrowed/stolen from Lazerpent/Hemicoptor, spoke to Lazer but not Hemi
    // From OutputDB 2.0.5, everyone should use to help collect data!
    //
    // Get correct window, dependent on TM running. And save original fetch.
    const isTampermonkeyEnabled = typeof unsafeWindow !== 'undefined';
    const win = isTampermonkeyEnabled ? unsafeWindow : window;

    // Currently unused
    const {fetch: originalFetch} = win;
    let currentCrimesByTypeData;

    // Gets stats from top statistics panel.
    function getStat(name) {
        let allStatisticButtons = Array.from(win.document.querySelectorAll('button[class^="statistic___"]'));

        let statButton = allStatisticButtons.find(button => {
            return Array.from(button.querySelectorAll('span')).some(span => span.textContent.trim() === name);
        });

        if (statButton) {
            let valueSpan = statButton.querySelector('span[class^="value___"]');
            if (valueSpan) {
                console.log(`[OutcomeDB] Found stat (${name}): '${valueSpan.textContent}'`);
                return valueSpan.textContent;
            }
        }
        console.error(`[OutcomeDB] Could not find stat ${name}`);
    }


    // =========================== My misc helper functions, some unused ==========================================
    function getRespBtnArrayIdx(btn) {
        let parent = $(btn).parent();
        let childs = $(parent).children();
        let idx = 0;
        for (idx=0; idx < $(childs).length; idx++) {
            let kid = $(childs)[idx];
            if ($(btn)[0] == $(kid)[0]) return idx;
        }
        return -1;
    }

    function clearAllTooltips(btn) {
        log("clearAllTooltips");
        $(".cbqc1").remove();
        /*
        let parent = $(btn).parent();
        let childs = $(parent).children();
        let idx = 0;
        for (idx=0; idx < $(childs).length; idx++) {
            let kid = $(childs)[idx];
            disableTooltip(kid);
            //if ($(btn)[0] == $(kid)[0]) return idx;
        }
        //return -1;
        */
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
        $(node).removeClass (function (index, className) {
            return (className.match ( new RegExp("\\b"+begin+"\\S+", "g") ) || []).join(' ');
        });
    }

    // Gets the bar we are going to draw the ranges on
    function getPersuasionBar(target) {
        let optsSec = $(target).closest("[class*='crime-option-sections']");
        let pBar = $(optsSec).find("[class^='persuasionBarContainer_']");
        debug("pBar: ", $(pBar));

        return $(pBar);
    }

    // 'methodAndLevel defined as:
    // {method: method, level: -1, useArray: idxMoveArray};
    // 'method' is name, 'prize', 'charity', etc. Level
    // is CS level found at. 'useArray' is which array to
    // use to lookup range values in.
    function levelFromMethod(method) {
        // Return value
        let methodAndLevel = {method: method, level: -1, useArray: idxMoveArray};

        if (!method) return methodAndLevel;

        method = method.toLowerCase();
        methodAndLevel.method = method = method.split(" ")[0];

        if (lvl0arr.includes(method)) {
            methodAndLevel.level = 0; methodAndLevel.useArray = idxMoveArray;
        } else if(lvl20arr.includes(method)) {
            methodAndLevel.level = 20; methodAndLevel.useArray = idxMoveArray20;
        } else if (lvl40arr.includes(method)) {
            methodAndLevel.level = 40; methodAndLevel.useArray = idxMoveArray40;
        } else if (lvl60arr.includes(method)) {
            methodAndLevel.level = 60; methodAndLevel.useArray = idxMoveArray60;
        } else if (lvl80arr.includes(method)) {
            methodAndLevel.level = 80; methodAndLevel.useArray = idxMoveArray80;
        } else {
            log("ERROR: method ", method, " not found!");
            debugger;
        }

        log("[levelFromMethod] methodAndLevel: ", methodAndLevel);

        // If not found, could try alternate methods here....
        //if (method == "delivery" || method.indexOf('deliv') > -1)

        return methodAndLevel;
    }

    // Get CS level from method
    function getMethodAndLevel(target) {
        let optsSec = $(target).closest("[class*='crime-option-sections']");
        let methodDiv = $(optsSec).find("[class^='emailAndMethod_']");
        log("methodDiv: ", $(methodDiv));
        let methodSpan = $($(methodDiv)[0]).find("[class^='scamMethod_']");
        log("methodSpan: ", $(methodSpan));

        let method = $(methodSpan).text();
        if (method) method = method.toLowerCase();
        log("method: ", method);

        let methodAndLevel = levelFromMethod(method);
        log("levelFromMethod returned: ", methodAndLevel);

        if (methodAndLevel.level == -1) {
            debugger;
        }

        return methodAndLevel;

    }


    // Get the 'pip' element, need to see where it is
    function getPipFromPbar(pBar) {
        let pip = $(pBar).find("[class^='pipRange_']")[0];
        return $(pip);
    }

    // Get cell array from a persuasion bar
    function getCellsFromPbar(pBar) {
        let cells = $(pBar).find("[class^='cell__']");
        return $(cells);
    }

    // Get cell array from target element (button)
    function getCellsFromBtn(target) {
        let pBar = getPersuasionBar(target);
        let cells = $(pBar).find("[class^='cell__']");
        log("# cells: ", $(cells).length);
        return $(cells);
    }

    // Get the aria-label from an element
    function getElemLabel(elem) {
        return $(elem).attr("aria-label");
    }

    function disableTooltip(target) {
        //$(target).tooltip('disable');
        $(target).tooltip({disabled: true});
    }

    // Clear our persuasion bar cell classes
    function clearCellStyles(cells) {
        let begin = "xcell";
        $(cells).removeClass (function (index, className) {
            return (className.match ( new RegExp("\\b"+begin+"\\S+", "g") ) || []).join(' ');
        });
    }

    function clearCellsFromTarget(target) {
        disableTooltip(target);
        let cells = getCellsFromBtn(target);
        clearCellStyles(cells);
        $(target).removeClass("xpress");
    }

    // callback is: callback(btn, param, cl);
    function getPipClFromBtn(btn, param, callback, retries=0) {
        log("getPipClFromBtn: ", getElemLabel(btn));
        let pBar = getPersuasionBar($(btn));
        let pip = getPipFromPbar($(pBar));

        let cl = getClassList($(pip));
        log("cl: ", cl);
        if (!cl && retries++ < 10) {
            log("No class list, retrying");
            return setTimeout(getPipClFromBtn, 250, btn, param, callback, retries);
        } else if (!cl) {
            return log("Too many retries, giving  up.");
        }

        if (callback) callback(btn, param, cl, "getPipClFromBtn");
    }

    // ================================== Handlers to do everything =============================

    var lastTarget;
    var lastStart = 0;
    var lastResp;
    var retried = false;
    var currAccel = -1;
    var accelBtnActive = false;
    var capitalizeActive = false;
    var processResultActive = false;

    var currLabel;
    var prevLabel;

    var activeBtn;
    var activeIdx;
    function clearXclick(target) {
        $(target).removeClass("xclick");
        activeBtn = undefined;
        activeIdx = undefined;
    }

    // TBD - see below. Target is commit btn just clicked
    // "Not accurate - find button with "aria-pressed" = true." (from below)
    function getActiveResponseBtn(target) {

    }

    // ========================== Get response stats, see how accurate we are ==================

    function processCommit(btn, param, cl) {
        log("processCommit, cl: ", cl, " param: ", param, " btn: ", $(btn));

        // Not accurate - find button with "aria-pressed" = true.
        log("currLabel: ", currLabel, " prevLabel: ", prevLabel);

        if (param == true) {
            log("param is true, indicates capitalize or accel response, no movement!");
            return;
        }
        if (!cl) return setTimeout(getPipClFromBtn, 250, btn, 0, processCommit);

        //let cells = getCellsFromBtn(btn);
        let startAndSize = parseClassList(cl);
        let pipStart = startAndSize.start;

        afterResRangePrediction.pipAfter = pipStart;
        afterResRangePrediction.accel = currAccel;
        afterResRangePrediction.type = afterResRangePrediction.type + "(" + prevLabel + ")";
        log("currentRangePrediction: ", currentRangePrediction);
        log("afterResRangePrediction: ", afterResRangePrediction);

        // Make sure it's updated already!
        // Note I do not yet use the callback, the caller keep going...
        // wasn't sure if the underlying event will still process, if
        // I need to woory, maybe best if event does process and my handling
        // is delayed! For now will just log.
        if (pipStart == afterResRangePrediction.pipBefore) {
            return setTimeout(getPipClFromBtn, 250, btn, 0, processCommit);
        }

        if (pipStart < afterResRangePrediction.start || pipStart > afterResRangePrediction.end) {
            log("Pip didn't land in range!");
            console.error("Torn Scamming Helper: Pip didn't land in range! predicted: ",
                         currentRangePrediction, " actual: ", afterResRangePrediction);
            //debugger;
        }
        processResultActive = false;
    }

    // ==================== Most work done here - process click on response button ===================
    //function handleResponseClick(e, param) {
    const handleResponseClick = function(e, param) {        // Try to prevent sentry wrapping
        log("[handleResponseClick] e: ", e);
        log("[handleResponseClick] param: ", param, " processResultActive: ", processResultActive);
        if(processResultActive == true) {
            log("Result processing active! - should I come back later?");
            // prob no, as will interfer with def processing?
        }
        let target;
        if (e) target = $(e.currentTarget);
        if ($(target).length == 0) {
            log("Error: inalid target ", $(target));
            return;
        }

        let activeTarget = ($(activeBtn)[0] == $(target)[0]);
        let hasClickClass = $(target).hasClass("xclick");
        if (!param && (hasClickClass || activeTarget)) {
            log("[handleResponseClick]  already active: ", activeTarget, " | has click class: ", hasClickClass);
            return;
        }

        $(target).addClass("xclick");
        activeBtn = $(target);
        setTimeout(clearXclick, 1500, $(target));

        //$(".cbqc1").remove();
        clearAllTooltips();

        let label = getElemLabel(target);
        let isCommit = $(target).hasClass("commit-button");


        // Check for the capitalization btn first...
        let arrayIdx = getRespBtnArrayIdx(target);
        let lastIdx = getRespBtnArrayIdx(lastResp);

        log("prev target: ", $(lastResp));
        log("Array index for target ", label, ": ", arrayIdx);
        log("Array index for previous target ", getElemLabel(lastResp), ": ", lastIdx);

        log("[handleResponseClick]  Check if active/pressed: ");
        //log("xyz target: ", $(target));
        log("[handleResponseClick]  aria-pressed: ", $(target).attr("aria-pressed"));
        log("[handleResponseClick]  has xpress class? ", $(target).hasClass("xpress"));
        let hasPressClass = $(target).hasClass("xpress");
        let isPressed = $(target).attr("aria-pressed");

        log("[handleResponseClick]  idx: ", arrayIdx, " label: ", label,
            " isCommit: ", isCommit, " is pressed? ", isPressed);

        prevLabel = currLabel;
        currLabel = label;

        // Capitalize btn, clear the rest.
        // Maybe just save "last was capitaliz", like we do for accel?
        // More reliable...

        if (arrayIdx == 4 || label == 'Capitalize') {
            capitalizeActive = true;
            clearCellsFromTarget(target);

            lastResp = $(target);
            lastIdx = arrayIdx;
            return;
        }

        // Clear accel on commit
        if (isCommit) { //label.toLowerCase().indexOf('respon') > -1) {
            log("Response btn: ", $(target));
            // Increment to what will be after the click is processed.
            if (accelBtnActive == true) {
                currAccel += 1;
            } else {
                currAccel = 0;
            }

            // Don't want to do this on a non-moving commit!
            // Or send param to not retry?
            let staticCommit =  (accelBtnActive == true || capitalizeActive == true);
            if (processResultActive == false) {
                processResultActive = true;
                processCommit(target, staticCommit);
            }

            log("Commit (", label, "): Clearing cells. Last IDX: ", lastIdx, " capitalize: ", capitalizeActive);
            clearCellsFromTarget(target);
            if (lastIdx == 4 || capitalizeActive == true) {
                capitalizeActive = false;
                setTimeout(installCommitBtnHandlers, 250);
                setTimeout(installObservers, 300);
            }

            accelBtnActive = false;
            capitalizeActive = false;
            lastResp = undefined;
        }

        // This will update current responses w/proposed acceleration
        if (arrayIdx == 3) {
            // Init acceleration, will update if clicked again
            accelBtnActive = true;
            capitalizeActive = false;
            //log("[handleResponseClick] Going to update ", $(lastResp));
            log("[handleResponseClick] currAccel: ", currAccel);
            applyCellHighlights(lastResp, 1, undefined, "handleResponseClick231");
            return;
        }
        else if (!isCommit) {
            let accMod = 0;
            if (accelBtnActive == true) accMod = 1;
            applyCellHighlights(target, accMod, undefined, "handleResponseClick257");
            accelBtnActive = false;

            lastResp = $(target);
            lastIdx = arrayIdx;
        }

        // Fixup callbacks,if btns change
        fixupHandlers(target);
    }

    function fixupHandlers(btn) {
        log("fixupHandlers");
        let allBtns = $(btn).parent().find("button");
        debug("btn list: ", $(allBtns));
        for (let idx=0; idx < $(allBtns).length; idx++) {
            setTimeout(addRespBtnHandler, 500, $(allBtns)[idx]);
        }

        let secSib = $(btn).parent().next().next();
        let commitBtn = $(secSib).children().first();
        addRespBtnHandler(commitBtn);
    }


    // ================== Highlight cells with estimated range =======================

    // hesitation, sensitivity, neutral,
    // concern, temptation, failure, low/medium/high reward...
    const neutralType = 1;
    const hesitationType = 2;
    const sensitivityType = 3;
    const concernType = 4;
    const temptationType = 5;
    const failureType = 6;
    const lowRewardType = 7;
    const mediumRewardType = 8;
    const highRewardType = 9;

    const keywordArray = ["no_type", "neutral", "hesit", "sensiti", "concern", "tempt", "fail",
                          "low rew", "medium rew", "high rew"];
    const keywordDisp = ["", "Neutral", "Hesitation", "Sensitivity", "Concern", "Temptation",
                         "Critical Failure", "Low Reward", "Medium Reward", "High Reward"];

    function getTypeForCell(tcell) {
        let parent = $(tcell).parent();
        let label = getElemLabel(parent);
        label = label ? label.toLowerCase() : "unknown";
        if (label == "unknown") debugger;
        log("type for cell, label: ", label);

        for (let idx=1; idx<keywordArray.length; idx++) {
            let word = keywordArray[idx];
            if (label.indexOf(word) > -1) return idx;
        }
        return 0;
    }

    // ============================ Apply range indicators ===================================
    // We need to get the start position of the 'pip', which we get from it's
    // class list. May not be available right away, so we may call ourselves a few times.
    //
    // Could get % chance of each result? Have total possible range (pip start to end),
    // and from cell.parent, get aria label, look for hesitation, sensitivity, neutral,
    // concern, temptation, failure, low/medium/high reward...
    //
    var achTest = false;    // Test to see if a delay helps getting acc accel,
                            // icon not updated yet when my click handler called
    var afterResRangePrediction = {type: 0, start: 0, end: 0, pipBefore: 0, pipAfter: 0, accel: 0, accMod: 0, methodlvl: {}, cs: 0};
    var previousRangePrediction = {type: 0, start: 0, end: 0, pipBefore: 0, pipAfter: 0, accel: 0, accMod: 0, methodlvl: {}, cs: 0};
    var currentRangePrediction = {type: 0, start: 0, end: 0, pipBefore: 0, pipAfter: 0, accel: 0, accMod: 0, methodlvl: {}, cs: 0};

    function applyCellHighlights(btn, accelMod, cl, retry) {
        log("[applyCellHighlights] enter, retry: ", retry);
        // Testing: add delay
        if (achTest == false  && !cl) {
            achTest = true;
            setTimeout(applyCellHighlights, 250, btn, accelMod, cl, "delay test");
            return;
        }
        achTest = false;


        log("[applyCellHighlights] accelMod: ", accelMod, " curr: ", currAccel, " cl: ", cl);
        //if (accel == -1) accel = 0;
        if (!cl) return getPipClFromBtn(btn, accelMod, applyCellHighlights); // 'accel' is generic CB param

        let cells = getCellsFromBtn(btn);
        let startAndSize = parseClassList(cl);
        let pipStart = startAndSize.start;

        let btnIdx = getRespBtnArrayIdx(btn);
        let respType = getElemLabel(btn);
        log("[applyCellHighlights] Apply cell highlights for ", respType);
        if (btnIdx == -1) {
            log("[applyCellHighlights] Error: unable to find entry for ", $(btn));
            return;
        }

        // Get accel from btn itself
        let accDiv = $(btn).find("[class*='accelerated_']");
        log("accDiv: " , $(accDiv));
        let style = $(accDiv).attr("style");
        let accel = currAccel;
        if (style) {
            let thisAccel = parseInt(style.match(/\d+/)[0]);
            log("[applyCellHighlights]  thisAccel: ", thisAccel, " passed in: ", accel);
            if (thisAccel > accel) accel = thisAccel;
            currAccel = thisAccel;
        }
        accel += accelMod;
        log("[applyCellHighlights] mod: ", accelMod, " use: ", accel, " curr: ", currAccel);
        log("[applyCellHighlights] accel: ", accel, " btn idx: ", btnIdx);

        // returns: let methodAndLevel = {method: method, level: -1, useArray: idxMoveArray};
        let methodAndLevel = getMethodAndLevel(btn);
        log("[applyCellHighlights] method/level: ", methodAndLevel);

        let entry = methodAndLevel.useArray[parseInt(accel)][parseInt(btnIdx)];
        log("[applyCellHighlights] entry for [",accel,"][",btnIdx,"] is: ", entry);

        if (btnIdx != -1 && entry) {
            let start = entry[0];
            let end = entry[1];
            log("[applyCellHighlights] start: ", start, " end: ", end);

            if( true) { //start && end) {
                log("[applyCellHighlights]  clearing highlights");
                clearCellsFromTarget(btn);
            }

            let distrib = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            let count = 0;
            let begin = 0;
            let stop = 0;
            if (btnIdx == 2) {    // Special case to go backwards.
                begin = Math.round(+pipStart + +start);
                stop = Math.round(+pipStart + +end);
                log("[applyCellHighlights] begin: ", begin, " stop: ", stop);
                let type = "R";
                for (let idx = +pipStart + +start; idx > +pipStart + +end; idx--) {
                    debug("[applyCellHighlights] adding class for idx ", idx, " to ", $(cells)[idx]);
                    let tcell = $(cells)[idx];

                    let dtype = getTypeForCell(tcell);
                    debug("[applyCellHighlights] Type is: ", dtype, " (", keywordArray[dtype], ")");
                    log("[applyCellHighlights] curr count: ", distrib[+dtype]);
                    distrib[+dtype] = distrib[+dtype] + 1;
                    debug("[applyCellHighlights] new count: ", distrib[+dtype]);
                    count++;

                    addColorClass(tcell, type, accel, btnIdx);
                    if (type == "R" && idx != stop) type = "C";
                    if (idx == stop) type = "L";
                }
            } else {
                begin = Math.round(+pipStart + +start);
                stop = Math.round(+pipStart + (+end > 0 ? +end : 50));
                log("[applyCellHighlights] begin: ", begin, " stop: ", stop);
                let type = "L";                               // Left, Center, Right
                for (let idx = begin; idx < stop; idx++) {
                    debug("[applyCellHighlights] adding class for idx ", idx, " to ", $(cells)[idx]);
                    let tcell = $(cells)[idx];

                    let dtype = getTypeForCell(tcell);
                    debug("[applyCellHighlights] Type is: ", dtype, " (", keywordArray[dtype], ")");
                    debug("[applyCellHighlights] curr count: ", distrib[+dtype]);
                    distrib[+dtype] = distrib[+dtype] + 1;
                    debug("[applyCellHighlights] new count: ", distrib[+dtype]);
                    count++;

                    addColorClass(tcell, type, accel, btnIdx);
                    if (type == "L" && idx != stop) type = "C";
                    if (idx == stop) type = "R";
                }
            }

            previousRangePrediction = currentRangePrediction;
            currentRangePrediction = {type: btnIdx, start: begin, end: stop, pipBefore: pipStart,
                                      accel: currAccel, accMod: 0, methodlvl: methodAndLevel, cs: getStat("Skill")};
            afterResRangePrediction = currentRangePrediction;

            log("previousRangePrediction: ", previousRangePrediction);
            log("currentRangePrediction: ", currentRangePrediction);

            log("[applyCellHighlights] calling clearAllTooltips");
            clearAllTooltips(btn);

            log("[applyCellHighlights] Type distribution: ", distrib);
            log("[applyCellHighlights] Should have ", count, " entries");

            let resultMsg = "<p>";
            let haveResults = false;
            for (let idx = 1; idx < distrib.length; idx++) {
                if (distrib[idx] > 0) {
                    haveResults = true;
                    let pct = (distrib[idx]/count) * 100;
                    pct = pct.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0];
                    let msg = pct + "% chance of landing on a " + keywordDisp[idx] + " result.";
                    log(msg);
                    resultMsg = resultMsg + "<br>" + msg;
                }
            }
            resultMsg += "</p>";

            // Put in tool tip? pop-up?
            if (haveResults == true && dispToolTips == true) {
                log("[applyCellHighlights] displayHtmlTooltip to: ", $(btn));
                $(btn).tooltip({disabled: false});
                displayHtmlToolTip(btn, resultMsg, "tooltip4 cbqc1");
            }

            $(btn).addClass("xpress");
            log("[applyCellHighlights] complete, accel was: ", accel, " curr: ", currAccel);
        }  // if entry && idx != -1

    }

    // ===================== Gets curr accel - add one to get acc if applied ==================
    // The callback has the form callback(event e, param) where param will be
    // {acc: <accel>, event: e, retries: <num> success: true/false} Target is used
    // as the accel btn. e could be null, depending on callback. currAcel is set if found.
    //
    // Change this - we know the btn's idx so just go get it from target's parent?
    function getAcceleration(e, btn, callback, retries=0) {
        log("getAcceleration, retries: ", retries, " btn: ", $(btn));

        if (!btn) {
            let tg = $(e.currentTarget);
            let p = $(tg).parent();
            let kids = $(p).children();
            btn = kids[3];
            log("Got new button! :", $(btn));
        }

        let node = $(btn).find("[class*='rippleContainer']");
        // Takes a while after btn click to update...
        if ($(node).length == 0) {
            log("will retry");
            if (++retries < 10) return setTimeout(getAcceleration, 100, e, btn, callback, retries);
            // Fallthrough with 0 accel
            currAccel = 0;
        } else {
            log("ripple node: ", $(node));
            let style = $(node).attr("style");
            log("style: ", style);

            if (style) {
                //let acc = style.match(/\d+/)[0];
                currAccel = parseInt(style.match(/\d+/)[0]);
            }
        }

        if (callback) {
            log("Success! notifying callback.");
            let param = {acc: currAccel, event: e, retries: retries, success: true}
            callback(e, param);
        }
    }

    // Color the bars depending on the response
    function addColorClass(tcell, type, acc, idx) {
        debug("Adding color class, type: ", type);
        if (idx == 0) {
            $(tcell).addClass("xcellC" + type);
            if (acc > 0) $(tcell).addClass("xcell-fastC");
        }

        if (idx == 1) {
            $(tcell).addClass("xcellD" + type);
            if (acc > 0) $(tcell).addClass("xcell-fastD");
        }

        if (idx == 2) {
            $(tcell).addClass("xcellR" + type);
            if (acc > 0) $(tcell).addClass("xcell-fastC");
        }
    }

    // ================ Install all the handlers to trap clicks. ================
    var installRespBtnHandlers = false;
    var getAcc = true;
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
            if (retries++ > 20) return log("installCommitBtnHandlers too many retries.");
            return setTimeout(installCommitBtnHandlers, 250, retries);
        }

        log("commit btns len: ", $(targets).length);
        for (let idx=0; idx < $(targets).length; idx++) {
            let btn = $(targets)[idx];
            let label = $(btn).attr("aria-label");

            log("btn label: ", label);
            if (!label) {
                log("No label!!!");
                continue;
            }

            // "Read" button. On click, search for new response btns.
            if (label.indexOf("Read") > -1) {
                log("Read btn: ", $(btn).attr("aria-label"));
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
                log("Response btn: ", $(btn).attr("aria-label"));
                addRespBtnHandler(btn);
            }
        }
    }

    function addRespBtnHandler(btn) {
        let label = $(btn).attr("aria-label");
        if (!$(btn).hasClass("xedx")) {
            $(btn).addClass("xedx");
            //log("Detected 'response', installing on: ", $($(btn)[0]));
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

            // Won't work if have multiple ones open.
            // Need current one - maybe first resp. click?
            log("FIX ME FIX ME FIX ME");
            if (idx == 0 && getAcc) {
                getAcceleration(target);
                getAcc = false;
            }

            // Test, this isn't a public API:
            let handlers = jQuery._data( target, "events" );
            log("Currently installed handlers: ", handlers);

            if (!$(target).hasClass("xedx")) {
                $(target).addClass("xedx");
                log("adding resp handler to: ", $(target));

                $(target).on('click', handleResponseClick);

                handlers = jQuery._data( target, "events" );
                log("Currently installed handlers after: ", handlers);
            }
        }
        setTimeout(checkRespBtns, 2000);
    }

    function handlePageLoad() {
        //getProgressBars();
        installObservers();
        addHelpBtn();
    }

    function handleHelpBtn() {
        const helpURL = "https://www.torn.com/forums.php#/p=threads&f=61&t=16418415&b=0&a=0";
        openInNewTab(helpURL);
    }

    const helpIcon = `<i class="info-icon"></i>`;
    const helpBtnRight = `<input id="x-scam-help-btn" type="button" class="xscamhlp xedx-torn-btn" value="?">`;

    function addHelpBtn(retries=0) {
        if ($("#x-help-btn").length > 0) return;

        let root = $("#react-root").find(".crime-root.scamming-root");
        let curr = $(root).find("[class^='currentCrime_']");
        if ($(curr).length == 0) {
            if (retries++ < 20) return setTimeout(addHelpBtn, 250, retries);
            return;
        }

        let title = $(curr).find("div[class^='title__']");
        $(title).after(helpBtnRight);
        $("#x-scam-help-btn").on('click', handleHelpBtn);
    }

    function hashChangeHandler() {
        log("Hash change detected...");
        if (location.hash.indexOf("scamming") > -1 || location.href.indexOf("crimes#/scamming") > -1)
            setTimeout(handlePageLoad, 500);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    // TEMP class to track what I added handler to...
    if (DevMode) GM_addStyle(".xedx {border: 1px solid blue !important;}");

    addScammingStyles();
    addToolTipStyle();

    callOnHashChange(hashChangeHandler);

    installPushStateHandler(pushStateChanged);

    /*
    history.pushState = bindEventListener("pushState");
    window.addEventListener("pushState", function (e) {
        pushStateChanged(e);  // Could directly call handlePageLoad() instead
    });
    */

    if (location.hash.indexOf("scamming") < 0) return log("Not on scamming...");
    if (location.href.indexOf("crimes#/scamming") < 0) return log("Not on scamming...");

    callOnContentComplete(handlePageLoad);

    // ============================ styles =========================================

    function addScammingStyles() {
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


            GM_addStyle(`
                .xscamhlp {
                    width: 22px !important;
                    height: 22px !important;
                    border-radius: 22px !important;
                    cursor: pointer !important;
                    padding: 0px !important;
                    line-height: 0px !important;
                    font-size: 12px !important;
                    margin-left: 10px;
                    position: absolute;
                    left: 75px;
                }
            `);
    }

})();



