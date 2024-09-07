// ==UserScript==
// @name         Torn Scamming Helper
// @namespace    http://tampermonkey.net/
// @version      0.8
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

    const DevMode = true;

    const idxMoveArray = { 0: [[10,19], [3,7],[-2,-4]],
                           1: [[14,26.6], [4.2,9.8], [-2.8,-5.6]],
                           2: [[18,34.2], [5.4,12.6], [-3.6,-7.2]],
                           3: [[22,41.8], [6.6,15.4], [-4.4,-8.8]],
                           4: [[26,49.4], [7.8,18.2], [-5.2,-10.4]],
                           5: [ [30,57],  [9,21],  [-6,-12]]
                      };

    // ================================== helper functions ==========================================
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
        //log("cells: ", $(cells));
        return $(cells);
    }

    // Get the aria-label from an element
    function getElemLabel(elem) {
        return $(elem).attr("aria-label");
    }

    // Clear our persuasion bar cell classes
    function clearCellStyles(cells) {
        let begin = "xcell";
        $(cells).removeClass (function (index, className) {
            return (className.match ( new RegExp("\\b"+begin+"\\S+", "g") ) || []).join(' ');
        });
    }

    function clearCellsFromTarget(target) {
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

        if (callback) callback(btn, param, cl);
    }

    // ================================== Handlers to do everything =============================

    var lastTarget;
    var lastStart = 0;
    var lastResp = undefined;
    var retried = false;
    var currAccel = -1;
    var accelBtnActive = false;

    var activeBtn;
    var activeIdx;
    function clearXclick(target) {
        $(target).removeClass("xclick");
        activeBtn = undefined;
        activeIdx = undefined;
    }

    function handleResponseClick(e, param) {
        log("***** xyz handleResponseClick, e: ", e);
        log("xyz handleResponseClick, param: ", param);
        let target;
        if (e) target = $(e.currentTarget);
        if ($(target).length == 0) return log("Error: inalid target ", $(target));

        let activeTarget = ($(activeBtn)[0] == $(target)[0]);
        let hasClickClass = $(target).hasClass("xclick");
        if (!param && (hasClickClass || activeTarget)) {
            log("xyz already active: ", activeTarget, " | has click class: ", hasClickClass);
            return;
        }

        $(target).addClass("xclick");
        activeBtn = $(target);
        setTimeout(clearXclick, 1500, $(target));

        // Check for the capitalization btn first...
        let arrayIdx = getRespBtnArrayIdx(target);
        let lastIdx = getRespBtnArrayIdx(lastResp);
        let label = getElemLabel(target);
        let isCommit = $(target).hasClass("commit-button");

        log("xyz Check if active/pressed: ");
        //log("xyz target: ", $(target));
        log("xyz aria-pressed: ", $(target).attr("aria-pressed"));
        log("xyz has xpress class? ", $(target).hasClass("xpress"));
        let hasPressClass = $(target).hasClass("xpress");
        let isPressed = $(target).attr("aria-pressed");

        log("handleResponseClick idx: ", arrayIdx, " label: ", label,
            " isCommit: ", isCommit, " is pressed? ", isPressed);

        // Capitalize btn, clear the rest
        if (arrayIdx == 4) return clearCellsFromTarget(target);

        // Clear accel on commit
        if (isCommit) { //label.toLowerCase().indexOf('respon') > -1) {
            log("Response btn: ", $(target));
            // Increment to what will be after the click is processed.
            if (accelBtnActive == true) {
                currAccel += 1;
            } else {
                currAccel = 0;
            }
            accelBtnActive = false;
            lastResp = undefined;
            log("Clearing cells");
            clearCellsFromTarget(target);
            if (lastIdx == 4) {
                installCommitBtnHandlers();
                setTimeout(installObservers, 250);
            }
        }

        // This will update current responses w/proposed acceleration
        if (arrayIdx == 3) {
            // Init acceleration, will update if clicked again
            accelBtnActive = true;
            if (!param) { // Not called from getAccel...
                log("No accel, start lookup...");
                getAcceleration(e, target, handleResponseClick);
                return;
            } else {
                log("Have accel!!!: ", currAccel);
            }

            if (currAccel == -1) debugger;

            let accel = (+currAccel+1);

            log("Going to update ", $(lastResp));
            log("currAccel: ", currAccel, " accel: ", accel);
            applyCellHighlights(lastResp, accel);
            return;
        }
        else if (!isCommit) {
            accelBtnActive = false;

            /*
            log("xyz last label: ", getElemLabel(lastResp), " this: ", label);
            if ($(lastResp)[0] == $(target)[0] && hasPressClass) {
                log("xyz clearing response?");
            } else {
                log("xyz activating response");
            }

            if ($(lastResp)[0] == $(target)[0] && hasPressClass) {
            //if (!isPressed) {
                log("NOT PRESSED, would be clearing");
                //clearCellsFromTarget(target);
            } else {
                log("xyz PRESSED, would be applying");
                //applyCellHighlights(target, currAccel);
            }
            */

            applyCellHighlights(target, currAccel);
            lastResp = $(target);
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

    // We need to get the start position of the 'pip', which we get from it's
    // class list. May not be available right away, so we may call ourselves a few times.
    //
    //var savedStart = 0;
    function applyCellHighlights(btn, accel, cl) {

        log("applyCellHighlights: accel: ", accel, " cl: ", cl);
        if (accel == -1) accel = 0;
        if (!cl) return getPipClFromBtn(btn, accel, applyCellHighlights); // 'accel' is generic CB param

        let cells = getCellsFromBtn(btn);
        let startAndSize = parseClassList(cl);
        let pipStart = startAndSize.start;

        let btnIdx = getRespBtnArrayIdx(btn);
        let respType = getElemLabel(btn);
        log("Apply cell highlights for ", respType);
        if (btnIdx == -1) {
            log("Error: unable to find entry for ", $(btn));
            return;
        }

        // clear first? (done below)
        // clearCellsFromTarget(btn);

        log("applyCellHighlights: ", accel, " | ", btnIdx);
        let entry = idxMoveArray[parseInt(accel)][parseInt(btnIdx)];
        log("entry for [",accel,"][",btnIdx,"] is: ", entry);

        if (btnIdx != -1 && entry) {
            let start = entry[0];
            let end = entry[1];
            log("start: ", start, " end: ", end);
            //savedStart = start;

            if( start && end) clearCellsFromTarget(btn);

            if (btnIdx == 2) {    // Special case to go backwards.
                let begin = Math.round(+pipStart + +start);
                let stop = Math.round(+pipStart + +end);
                debug("begin: ", begin, " stop: ", stop);
                let type = "R";
                for (let idx = +pipStart + +start; idx > +pipStart + +end; idx--) {
                    debug("adding class for idx ", idx, " to ", $(cells)[idx]);
                    let tcell = $(cells)[idx];
                    addColorClass(tcell, type, accel, btnIdx);
                    if (type == "R" && idx != stop) type = "C";
                    if (idx == stop) type = "L";
                }
            } else {
                let begin = Math.round(+pipStart + +start);
                let stop = Math.round(+pipStart + (+end > 0 ? +end : 50));
                debug("begin: ", begin, " stop: ", stop);
                let type = "L";                               // Left, Center, Right
                for (let idx = begin; idx < stop; idx++) {
                    debug("adding class for idx ", idx, " to ", $(cells)[idx]);
                    let tcell = $(cells)[idx];
                    addColorClass(tcell, type, accel, btnIdx);
                    if (type == "L" && idx != stop) type = "C";
                    if (idx == stop) type = "R";
                }
            }

            $(btn).addClass("xpress");
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
            if (retries++ > 20) return ("installCommitBtnHandlers too many retries.");
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
        log("addRespBtnHandler btn label: ", label);
        log("addRespBtnHandler btn: ", $(btn));
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

            if (!$(target).hasClass("xedx")) {
                $(target).addClass("xedx");
                log("adding resp handler to: ", $(target));
                $(target).on('click', handleResponseClick);
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

    addScammingStyles();

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



