// ==UserScript==
// @name         Torn Simpler Scam Range Helper
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Misc scamming add-ons
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @match        https://torn.com/loader.php?sid=crimes*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.5.js
// @xrequire      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers-2.45.6.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    if (isAttackPage()) return log("Won't run on attack page!");

    const writeMissedPredictions = true;  // Logs missed predictions in local storage

    const isScammingPage = function () {return (location.hash.indexOf("scamming") < 0) ? false : true;}
    const DevMode = true;                 // Flag for enabling certain things during delopment/testing
    const optDisplaySkill = GM_getValue("optDisplaySkill", true);

    // ================================== Globals to maintain 'state' =============================

    var globalActiveTarget;

    var currResponseTarget;        // Target of last response - last btn clicked that causes movement
    var accelActive = false;       // True if accel clicked, reset on next click
    var capitalizeActive = false;  // true if capitalize clicked.

    // Vars for active response mail area
    var currCrimeOptSection;       // Location of e-mail we are actively responding to
    var currVirtItemDiv;           // ...
    var currPipPositionDiv;        // And it's associated pip and persuasion bar
    var currPipRangeDiv;
    var currTargetPipPos;
    var currPersuasionBar;
    var currCells;

    const cellWidth = 7;
    const cellHeight = 10;

    var currentAccel = 0;             // Row in table (column is currentArrayIndex from clicked btn)
    var currResponseTableIndex;       // Index into entry for range (0, 1, 2) - the column
    var currVirtItemIdx;              // Index into list of crimes, used to index into 'currentCrimesByType' list.
    var currentScamMethod;            // Used to get table
    var currentRangeArray;            // The table
    var currArrayName;                // For debugging

    // Gets stats from top statistics panel.
    function getStat(name) {
        let allStatisticButtons = Array.from(document.querySelectorAll('button[class^="statistic___"]'));

        let statButton = allStatisticButtons.find(button => {
            return Array.from(button.querySelectorAll('span')).some(span => span.textContent.trim() === name);
        });

        if (statButton) {
            let valueSpan = statButton.querySelector('span[class^="value___"]');
            if (valueSpan) {
                return valueSpan.textContent;
            }
        }
    }

    // ============================= Tables that define range estimates ===========================
    // Taken from the scamming guide. I've found not very accurate, mostly with
    // acceleration, at CS60+

    // Much of this is estimated, will change as more data comes in.
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
                           5: [ [18,35],  [7,16],  [-5,-9]]       // back isn't known?
                      };

    // 40: vacation, tax
    const lvl40arr = ["vacation", "tax"];
    const idxMoveArray40 = { 0: [[6,12], [3,7], [-2,-4]],          // back isn't knownn for any of these?
                           1: [[11,21], [5,9], [-3,-6]],
                           2: [[13,25], [6,11], [-4,-7]],
                           3: [[14,28], [6,12], [-4,-8]],
                           4: [[15,30], [7,13], [-4,-9]],
                           5: [[16,31],  [7,14],  [-5,-9]]
                      };

    // 60: advance-fee, job
    const lvl60arr = ["advance-fee", "job", "advance", "fee"];        // Unknown ATM...
    const idxMoveArray60 = { 0: [[6,11], [2,4],[-2,-4]],
                           1: [[11,21], [3,6], [-4,-6]],
                           2: [[11,20], [4,7], [-4,-7]],         // These are all just guesses
                           3: [[12,20], [5,8], [-4,-8]],
                           4: [[13,20], [6,9], [-4,-9]],
                           5: [ [14,21],  [7,10],  [-5,-9]]
                      };

    // 80: romance, investment
    const lvl80arr = ["romance", "investment"];     // Unknown ATM...
    const idxMoveArray80 = idxMoveArray60;

    function getRangeArray(method) {
        if (!method) return;
        method = method.toLowerCase().split(" ")[0];

        if (lvl0arr.includes(method)) {
            currArrayName = "idxMoveArray"; return idxMoveArray;
        } else if(lvl20arr.includes(method)) {
            currArrayName = "idxMoveArray20"; return idxMoveArray20;
        } else if (lvl40arr.includes(method)) {
            currArrayName = "idxMoveArray40"; return idxMoveArray40;
        } else if (lvl60arr.includes(method)) {
            currArrayName = "idxMoveArray60"; return idxMoveArray60;
        } else if (lvl80arr.includes(method)) {
            currArrayName = "idxMoveArray80"; return idxMoveArray80;
        } else {
            logt("ERROR: method ", method, " not found!");
            debugger;
        }
    }

    // =========================== Misc helper functions ==========================================

    /*
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
    */

    // Erase what we have drawn
    function eraseRangeEstimates() {
        $("#x-test-div").remove();
        $("#x-acc-div").remove();
    }

    // Track how many are available to do, display on top bar.
    // Three extra for headers and footer.
    var availableScams = 0;
    function updateAvailable() {
        if (isScammingPage == false) return;
        availableScams = $("[class^='virtualList__'] > [class^='virtualItem__']").length;
        if (availableScams >= 3) availableScams = availableScams - 3;
        if (availableScams < 0) availableScams = 0;
        setTimeout(updateAvailable, 3000);
    }

    // ==================== Functions to update the global state on btn clicks =============================

    // Used to index into crime responses, to get correct pip info
    // Need to be sure we are referencing the corrct, active one
    // when we may have several opened.
    //
    function getVirtItemIndex(node) {
        let list = $(currVirtItemDiv).parent().find(".virtual-item");
        let len = $(list).length;
        if (len <= 2) return;
        for (let idx = 0; idx < len-2; idx++) {
            let elem = list[idx+2];
            if ($(elem).is(node)) return idx;
        }
    }

    // This get current acceleration level from the response icons,
    // only reliable way I sem to be able to get it. Hooking the
    // server responses doesn't seem to be 'on time' enough...
    //
    function getCurrentAccel() {
        let list = $(currPipPositionDiv).find("[class*='pulsing']");
        if (!list) return;
        let pulseNum;
        for (let idx=1; idx < list.length; idx++) {
            let item = list[idx];
            let cl = getClassList(item);
            if (!cl) continue;
            for (let j=0; j < cl.length; j++) {
                let cname = cl[j].split("_")[0];
                let matches = cname.match(/\d+/g);
                if (matches) pulseNum = matches[0];
            }
        }
        if (pulseNum)  currentAccel = pulseNum;
    }

    // Look up and update the globals definig where we are.
    // Used to get most of these from server responses. A direct
    // lookup on the page seems much more reliable, and hooking
    // fetch responses causes it's own problems. But may still
    // add that back, in order to validate my predictions.
    function updateGlobalStateInfo(target) {
        currCrimeOptSection = $(target).closest(".crime-option");
        currVirtItemDiv = $(currCrimeOptSection).closest(".virtual-item");
        currVirtItemIdx = getVirtItemIndex(currVirtItemDiv);
        currPipPositionDiv = $(currCrimeOptSection).find("[class^='pipPosition_']")[0];
        currPipRangeDiv = $(currCrimeOptSection).find("[class^='pipRange_']")[0];
        currPersuasionBar = $(currPipPositionDiv).parent();
        currCells = $(currPersuasionBar).find("[class^='cell__']");
        let cn = $(currPipPositionDiv).prop("className").split(" ")[1];
        currTargetPipPos = cn ? cn.match(/\d+/g)[0] : 0;
        getCurrentAccel();
    }

    // For debugging - dump state of all globals to console
    function dumpState() {
        log("[dumpState ============================================== dumpState]");
        log("[dumpState] globalActiveTarget: ", $(globalActiveTarget));
        log("[dumpState] currResponseTarget: ", $(currResponseTarget));
        log("[dumpState] accelActive: ", accelActive);
        log("[dumpState] currentAccel: ", currentAccel);
        log("[dumpState] capitalizeActive: ", capitalizeActive);
        log("[dumpState] currCrimeOptSection: ", $(currCrimeOptSection));
        log("[dumpState] currVirtItemDiv: ", $(currVirtItemDiv));
        log("[dumpState] currPipPositionDiv: ", $(currPipPositionDiv));
        log("[dumpState] currPipRangeDiv: ", $(currPipRangeDiv));
        log("[dumpState] currTargetPipPos: ", currTargetPipPos);
        log("[dumpState] currPersuasionBar: ", $(currPersuasionBar));
        log("[dumpState] currCells: ", $(currCells));
        log("[dumpState] currResponseTableIndex: ", currResponseTableIndex);
        log("[dumpState] currArrayName: ", currArrayName);
        log("[dumpState] currentRangeArray: ", currentRangeArray);
        log("[dumpState] currVirtItemIdx: ", currVirtItemIdx);
        log("[dumpState] currentScamMethod: ", currentScamMethod);
        log("[dumpState ============================================== dumpState]");
    }

    // =========================== Handle clicking a 'response' button =============================
    // These are fast forward, slow forward, reverse, accelerate, and capitalize

    // I get dups, maybe dup event listeners?
    var inRespHandler = false;
    function clearRespFlag(){inRespHandler=false;}

    var lastIdx;
    function handleResponseClick(e, param) {     
        logt("handleResponseClick: ", inRespHandler);
        if (inRespHandler == true) return;
        inRespHandler = true;
        setTimeout(clearRespFlag, 300);

        if (!e || !$(e.currentTarget).length) return console.error("No click target: ", e);

        let target = $(e.currentTarget);              
        let arrayIdx = $(target).index();

        updateGlobalStateInfo(target);
        if (!currentScamMethod) {
            let elem = $(currCrimeOptSection).find("[class*='scamMethod_']")[0];
            currentScamMethod = $(elem).text();
        }

        // Check for 2nd click, remove range?
        if (arrayIdx == lastIdx && arrayIdx < 3) {
            log("*** DBL CLICK! ", arrayIdx, " - ", lastIdx);
            eraseRangeEstimates();
            //currResponseTableIndex = undefined;
            return;
        }
        lastIdx = arrayIdx;

        // Determine target type and handle based on that
        // Although only applicable for the first 3 buttons,
        // the table index for rangelookup is the same as
        // the button indice.
        switch (arrayIdx) {
            case 0: // fast forward
                accelActive = false;
                capitalizeActive = false;
                currResponseTableIndex = arrayIdx;
                globalActiveTarget = $(target);

                drawPredictedRangeBars();
                break;

            case 1: // slow forward
                accelActive = false;
                capitalizeActive = false;
                currResponseTableIndex = arrayIdx;
                globalActiveTarget = $(target);

                drawPredictedRangeBars();
                break;

            case 2: // backwards
                accelActive = false;
                capitalizeActive = false;
                currResponseTableIndex = arrayIdx;
                globalActiveTarget = $(target);

                drawPredictedRangeBars();
                break;

            case 3: // accelerate
                accelActive = true;
                capitalizeActive = false;
                drawAcceleratedRangeBars();
                break;

            case 4: // capitalize (no drawing)
                accelActive = false;
                capitalizeActive = true;
                currResponseTableIndex = undefined;
                break;

        }

        // Fixup callbacks,if btns change
        fixupHandlers(target);
    }

    // =========== Handle a right-click on accel - select # to apply =============================
    //
    // ========================= TBD TBD TBD -- pass desired accel to draw fn....????
    //
    function handleOkCancelClick(e) {
        log("[handleOkClick]");

        $("#acc-test").animate({
            height: "0px",
        }, 1000, function() {
            $("#acc-test").remove();
        });
    }

    var tempStyleAdded = false;
    function doAccelRightClick(e) {
        log("[doAccelRightClick] e: ", e);

        if (tempStyleAdded == false) {
            tempStyleAdded = true;
            GM_addStyle(`
                .acc-prompt {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: center;
                    align-content: center;
                    /*border: 1px solid limegreen;*/

                    height: 0px;
                    width: auto;

                    margin-top: -5px;
                }
                .acc-cb {
                    height: 20px;
                    width: 20px;

                    margin-top: -5px;
                    margin-bottom: 5px;
                    margin-left: 20px;
                }
                .acc-ok {
                    margin-left: 10px;
                    margin-top: -5px;
                    margin-bottom: 5px;
                }
                .acc-cancel {
                    margin-left: 20px;
                    margin-top: -5px;
                    margin-bottom: 5px;
                }
            `);
        }

        let accelPromptDiv = `
                <div id="acc-test" class="acc-prompt">
                    <label for="quantity">Desired acceleration, currently ` + currentAccel + ` (between 1 and 5):</label>
                    <input type="number" id="quantity" class="acc-cb" name="quantity" min="1" max="5">
                    <input id="xedx-cancel-btn" type="submit" class="xedx-torn-btn acc-cancel" value="Cancel">
                    <input id="xedx-ok-btn" type="submit" class="xedx-torn-btn acc-ok" value="OK">
                </div>
            `;

        let root = $(this).closest(".crime-option").parent();
        log("[doAccelRightClick] $(root): ", $(root));
        $(root).before(accelPromptDiv);

        //log("[doAccelRightClick] $(currCrimeOptSection): ", $(currCrimeOptSection));
        //$(currCrimeOptSection).before(accelPromptDiv);

        $("#acc-test").animate({
            height: "36px",
        }, 1000, function() {
            log("Animate done!");
        });

        log("Added: ", $("#acc-test"));
        $("#xedx-ok-btn").on('click', handleOkCancelClick);
        $("#xedx-cancel-btn").on('click', handleOkCancelClick);

        return false;
    }

    // ================================== Handle a 'commit' btn click =============================
    // Read, Respond, ...
    function handleCommit(e) {
        log("handleCommit, e: ", e);
        log("handleCommit: ", $(e.currentTarget).attr('aria-label'));
        log("currResponseTableIndex: ", currResponseTableIndex);
        log("currAcel: ", currentAccel);
        log("capitalizeActive: ", capitalizeActive);

        if (accelActive == false) currentAccel = 0;

        if (capitalizeActive == true) {
            capitalizeActive = false;
            accelActive = false;
            currentAccel = 0;
        }

        setTimeout(updateSkillDisplay, 250);
        eraseRangeEstimates();
    }

    // After a commit, check for changes to the commit or response
    // buttons. May be better to add a mutation observer?
    function fixupHandlers(btn) {
        log("[fixupHandlers]");
        let commitTargets = $(".commit-button:not(.xedx-commit):not(.disabled)");
        if ($(commitTargets).length > 0) {
            installCommitBtnHandlers();
        }

        let respTargets = $(".response-type-button:not(.xedx-resp)");
        if ($(commitTargets).length > 0) {
            installResponseBtnHandlers();
        }
    }

    // =============================== verify prediction is correct ==============================
    var currPrediction = {pip: 0, scam: currentScamMethod, btnIdx: 0, accel: currentAccel, myStart: 0, myEnd: 0,
                          actualStart: 0, actualEnd: 0};

    function notifyPredictionError() {
        console.error("*** Prediction failed!! ", currPrediction);
        //alert("Scam Range Helper Failed Prediction!");
        if (writeMissedPredictions == true) {
            let lastIdx = GM_getValue("lastWriteIdx", 0);
            lastIdx = +lastIdx + 1;
            let key = "miss_" + lastIdx;
            GM_setValue(key, JSON.stringify(currPrediction));
            GM_setValue("lastWriteIdx", lastIdx);
        }
    }

    function getClassVal(cl) {
        let cname = cl.split("_")[0];
        let matches = cname.match(/\d+/g);
        if (matches) return matches[0];
    }

    function verifyPrediction(retries=0) {
        currPipRangeDiv = $(currCrimeOptSection).find("[class^='pipRange_']")[0];
        let cl = getClassList(currPipRangeDiv);
        if (!cl) {
             if (retries++ < 5) return setTimeout(verifyPrediction, 250, retries);
            return;
        }

        let fromClass, sizeClass;
        for (let i=0; i < cl.length; i++) {
            if (cl[i].indexOf("from") > -1) fromClass = cl[i];
            if (cl[i].indexOf("size") > -1) sizeClass = cl[i];
        }

        let actStart = fromClass? getClassVal(fromClass) : 0;
        let size = sizeClass? getClassVal(sizeClass) : 0;

        log("fromClass: ",fromClass, "  sizeClass: ", sizeClass);
        log("actStart: ", actStart, " size: ", size);

        if (size && actStart) {
            currPrediction.actualStart = +actStart;
            currPrediction.actualEnd = +actStart + +size;

            log("actualStart: ", currPrediction.actualStart, " mine: ", currPrediction.myStart);
            log("actualEnd: ", currPrediction.actualEnd, " mine: ", currPrediction.myEnd);

            if (currPrediction.actualStart != currPrediction.myStart ||
                currPrediction.actualEnd != currPrediction.myEnd) {
                notifyPredictionError();
            }
        }
    }

    // ================================== Draw the predicted range =============================

    function drawPredictedRangeBars() {
        logt("[[drawPredictedRangeBars]] currentRangeArray: ", currentRangeArray, " currentScamMethod: ", currentScamMethod);

        if (!currentRangeArray) {
            currentRangeArray = getRangeArray(currentScamMethod);
            log("[[drawPredictedRangeBars]] currentRangeArray: ", currentRangeArray);
        }

        if (!currentRangeArray) {
            dumpState();
            console.error("Invalid prediction table!");
            debugger;
            return;
        }

        let pipStart = currTargetPipPos;
        let entry = currentRangeArray[currentAccel][currResponseTableIndex];

        log("[[drawPredictedRangeBars] idx: ", currResponseTableIndex, " accel: ", currentAccel, " entry: ", entry);
        if (currResponseTableIndex > -1 && entry) {
            let start = entry[0];
            let stop = entry[1];

            eraseRangeEstimates();

            let begin = 0;
            let end = 0;
            if (currResponseTableIndex == 2) {    // Special case to go backwards.
                begin = Math.round(+pipStart + +start);
                end = Math.round(+pipStart + +stop);
                logt("[[drawPredictedRangeBars]] begin: ", begin, " end: ", end);
                drawDivSurround(begin, end, currResponseTableIndex);
            } else {
                begin = Math.round(+pipStart + +start);
                end = Math.round(+pipStart + (+stop > 0 ? +stop : 50));
                logt("[[drawPredictedRangeBars]] pipStart: ", pipStart, " begin: ", begin, " end: ", end);
                drawDivSurround(begin, end, currResponseTableIndex);
            }

            // Only do this if have edu, or just fail.
            currPrediction = {pip: currTargetPipPos, scam: currentScamMethod, btnIdx: currResponseTableIndex, accel: currentAccel, myStart: begin, myEnd: end,
                          actualStart: 0, actualEnd: 0};
            setTimeout(verifyPrediction, 500);

        } else {
            dumpState();
            console.error("Missing vars!");
            debugger;
            return;
        }
    }

    // =========================================================
    //
    // Draw single div/border around all cells in range at once
    //
    function drawDivSurround(begin, end, btnIdx) {

        let numCells = Math.abs(end - begin);
        let L = (+begin * cellWidth - 2) + "px";
        let W = (+numCells * cellWidth) + "px";
        let newDiv = "<div id='x-test-div' style='left: " + L + "; width: " + W + ";' ></div>";
        let target = $(currPipPositionDiv).parent();

        $(target).after(newDiv);
        $("#x-test-div").addClass("x-surround");
        $("#x-test-div").attr("data-l", (+begin * cellWidth - 2));
        $("#x-test-div").attr("data-w", (+numCells * cellWidth));

    }

    // Called when accel clicked...creates id='x-acc-div
    function drawAcceleratedRangeBars() {

        log("drawAcceleratedRangeBars, accel: ", currentAccel);
        log("drawAcceleratedRangeBars, array: ", currentRangeArray);
        log("drawAcceleratedRangeBars, idx: ", currResponseTableIndex);
        log("currentRangeArray[currentAccel]: ", currentRangeArray[currentAccel]);
        log("currentRangeArray[currentAccel+1]: ", currentRangeArray[+currentAccel + 1]);


        if (!currentRangeArray) {
            debugger;
            currentRangeArray = getRangeArray(currentScamMethod);
            log("[drawAcceleratedRangeBars]] currentRangeArray: ", currentRangeArray);
        }

        let entry1 = currentRangeArray[currentAccel][currResponseTableIndex];
        let entry2 = currentRangeArray[+currentAccel + 1][currResponseTableIndex];

        let startDiff = entry2[0] - entry1[0];
        let endDiff = entry2[1] - entry1[1];
        let numCells = entry2[1] - entry2[0];
        let newW = cellWidth * numCells + "px";

        let lOrg = $("#x-test-div").attr("data-l");
        let newL = (parseInt(lOrg) + (startDiff * cellWidth)) + "px";
        let newDiv = "<div id='x-acc-div' style='left: " + newL + "; width: " + newW + ";' class='x-accel'></div>";
        $("#x-test-div").after(newDiv);

        logt("[drawAcceleratedRangeBars] New accel div: ", $("#x-acc-div"));
        logt("[drawAcceleratedRangeBars] new myStart: ", (currTargetPipPos + entry2[0]),
             " new myEnd: ", (currTargetPipPos + entry2[1]), " *** should match next range on commit ***");
    }

    // ================ Install all the handlers to trap clicks. ================
    
    function installObservers(retries=0) {
        installResponseBtnHandlers();
        installCommitBtnHandlers();
    }

    const maxCommitRetries = 20;
    function checkCommitBtns() {
        installCommitBtnHandlers(maxCommitRetries-3);
    }

    function installCommitBtnHandlers(retries=0, fromCap) {
        if (isScammingPage() == false) {
            return log("Not on scamming!");
        }

        let targets = $(".commit-button");
        if ($(targets).length == 0) {
            if (retries++ > maxCommitRetries) return setTimeout(checkCommitBtns, 5000);
            return setTimeout(installCommitBtnHandlers, (250+(10*retries)), retries, fromCap);
        }

        for (let idx=0; idx < $(targets).length; idx++) {
            let btn = $(targets)[idx];
            if (!$(btn).hasClass('xedx-commit')) {
                $(btn).on('click.xedx', handleCommit);
                $(btn).addClass('xedx-commit');
            }
        }

        setTimeout(checkCommitBtns, 10000);
    }

    // Periodically check to see if a scroll down has
    // broght new buttons into view. Could hook scroll -
    // or have a global mutation observer for all changes...
    const maxRespRetries = 20;

    function checkRespBtns() {
        installResponseBtnHandlers(maxRespRetries-3);
    }

    function isAccelBtn(target) {
        let parent = $(target).parent();
    }

    function installResponseBtnHandlers(retries=0) {
        if (isScammingPage() == false) {
            return log("Not on scamming!");
        }

        let targets = $(".response-type-button");
        if ($(targets).length == 0)  {
            if (retries++ > maxRespRetries) {
                setTimeout(checkRespBtns, 250);
                return;
            }
            return setTimeout(installResponseBtnHandlers, (400 + (retries*20)), retries);
        }

        for (let idx=0; idx < $(targets).length; idx++) {
            let target = $(targets)[idx];
            if (!$(target).hasClass("xedx-resp")) {
                $(target).addClass("xedx-resp");
                $(target).on('click.xedx', handleResponseClick);

                // Check for accel btn, add right-click handler
                if ($(target).index() == 3) {
                    log("Found accel resp. btn: ", $(target));
                    $(target).on('contextmenu', doAccelRightClick);
                }
            }
        }
        setTimeout(checkRespBtns, 2000);
    }

    // ======================= Handle the skill display on top header. =======================

    const skillSpan = `<div id="xskill" style="display: inline-block">
                           <span id="xskill2" class="srh" style="display:inline-block; margin-left: 64px;">skill</span>
                           <span id="xskpct"><mark id="xskmark" class="xskill-white" style="background-color: transparent;">  </mark></span>
                           <span id="xavail" class="xml10">avail</span>
                       </div>`;

    var skillInt = 0;
    function addSkillDisplay(retries=0) {
        if ($("#xskill").length == 0) {
            $("#x-scam-help-btn").after(skillSpan);

            if ($("#xskill").length == 0) {
                $("#x-help-btn").after(skillSpan);
                if ($("#xskill").length > 0) {
                    $("#xskill").css("margin-left", "20px");
                }
            }

            if ($("#xskill").length == 0) {
                if (retries++ < 10) return addSkillDisplay(addHelpBtn, 250, retries);
                return;
            }
        }

        updateSkillDisplay(0, true);
    }

    var skillInit = false;
    function updateSkillDisplay(retries=0, fromInst=false) {
        log("**** Add logging here! Esp for loss! ***");

        if (!$("#xskill").length && optDisplaySkill && !fromInst) {
            if (retries++ < 3) return setTimeout(addSkillDisplay, 250, retries);
            return;
        }
        let curr = parseFloat($("#xskill2").text());
        let skill = getStat("Skill");

        let skillNew = parseFloat(skill);
        let skillDiff  = (!skillNew || !curr) ? 0 : (skillNew - curr).toFixed(2);
        if (skillDiff == 0 && skillInit == true) return;

        if ($("#xskill2").hasClass("srh")) {
            $("#xskill2").text(skill);
            $("#xskmark").text(" (" + skillDiff + ") ");

            $("#xskmark").removeClass("xskill-green").removeClass("xskill-red").removeClass("xskill-white");
            if ((+skillDiff > 0) == true)
                $("#xskmark").addClass("xskill-green");
            else if ((+skillDiff < 0) == true)
                $("#xskmark").addClass("xskill-red");
            else if ((+skillDiff == 0) == true)
                $("#xskmark").addClass("xskill-white");
        }

        if (curr && skillNew) {
            if (curr == skillNew) {
                if (retries++ < 5) return setTimeout(updateSkillDisplay, 500, retries);
                return;
            }
        }
        if (!$("#xskill2").hasClass("srh")) {
            $("#xskill2").text(skill + " (" + skillDiff + ")");
        }

        skillInit = true;
    }

    // ========================= handle saved missed predictions, clear storage=============

    function handleClearButton() {
        log("handleClearButton");
        let lastIdx = GM_getValue("lastWriteIdx", 0);
        if (lastIdx < 1) return;
        let idx;
        for (idx=1; idx <= lastIdx; idx++) {
            let key = "miss_" + idx;
            GM_deleteValue(key);
        }
        GM_setValue("lastWriteIdx", 0);
        log("handleClearButton cleared ", idx, " entries");
    }

    function handleSaveButton() {
        log("handleSaveButton");
        let dataObj = {};

        function logTheObj(obj) {
            var ret = "{";
            let c = 0;
            for (var o in obj) {
                var data = obj[o];
                if (c > 0) ret += ", ";
                ret += o + " : " + data;
                c++;
            }
            ret += "}";
            return "<li>" + ret + "</li>";
        }

        function displayTheData() {
            let lastIdx = GM_getValue("lastWriteIdx", 0);
            if (lastIdx < 1) return;

            let div = "<div id='myTest'><ul>";
            for (let idx=1; idx <= lastIdx; idx++) {
                let key = "miss_" + idx;
                let val = GM_getValue(key, "");
                dataObj[key] = val;
                div += logTheObj(JSON.parse(val));
            }
            div += "</ul></div>";

            var newWin = open("", "_blank",
                  "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=780,height=200");
            newWin.document.body.innerHTML = `
                        <h1>Test Result</h1><br><input id="btn1" type="button" value="save">` + div;

            log("Saved data: ", dataObj);
        }

        displayTheData();
    }

    // ======================= Handle the help button on top header. =======================

    const helpIcon = `<i class="info-icon"></i>`;
    const helpBtnRight = `<input id="x-scam-help-btn" type="button" class="xscamhlp xedx-torn-btn" value="?">`;
    const saveBtnRight = `<input id="x-scam-save-btn" type="button" class="xscamsave xedx-torn-btn" value="S">`;
    const clearBtnRight = `<input id="x-scam-clear-btn" type="button" class="xscamclear xedx-torn-btn" value="C">`;

    function handleHelpBtn() {
        const helpURL = "https://www.torn.com/forums.php#/p=threads&f=61&t=16418415&b=0&a=0";
        openInNewTab(helpURL);
    }

    function addHelpBtn(retries=0) {
        if ($("#x-help-btn").length < 1) {
            let root = $("#react-root").find(".crime-root.scamming-root");
            let curr = $(root).find("[class^='currentCrime_']");
            if ($(curr).length == 0) {
                if (retries++ < 20) return setTimeout(addHelpBtn, 250, retries);
                return;
            }
            let title = $(curr).find("div[class^='title__']");
            $(title).after(helpBtnRight);
            $("#x-scam-help-btn").on('click', handleHelpBtn);
            displayHtmlToolTip($("#x-scam-help-btn"), "Help (forum guide)", "tooltip4");

            if (writeMissedPredictions == true) {
                $("#x-scam-help-btn").after(saveBtnRight);
                $("#x-scam-save-btn").on('click', handleSaveButton);
                $("#x-scam-save-btn").after(clearBtnRight);
                $("#x-scam-clear-btn").on('click', handleClearButton);

                displayHtmlToolTip($("#x-scam-save-btn"), "Save bad range predictions,<br>for devs to fix", "tooltip4");
                displayHtmlToolTip($("#x-scam-clear-btn"), "Clear saved range prediction data", "tooltip4");
            }
        }

        if (optDisplaySkill == true) addSkillDisplay();
    }

    // ============================ Handle page changes =======================

    function handlePageLoad() {
        log("handlePageLoad");

        if (isScammingPage() == false) {  // should never get here...
            return log("handlePageLoad, not on scamming: ", location.hash);
        }

        installObservers();
        addHelpBtn();

        setTimeout(updateAvailable, 2000);
    }

    function removeCommitHandlers() {
        log("[removeCommitHandlers] ", $(".commit-button"));

        $(".commit-button").removeClass("xedx-commit");
        $(".commit-button").off('click.xedx');
    }

    function removeResponseHandlers() {
        log("[removeResponseHandlers] ", $(".response-type-button"));

        $(".response-type-button").removeClass("xedx-resp");
        $(".response-type-button").off('click.xedx');
    }

    function removeHandlers() {
        log("[removeHandlers]");

        // Remove btn handler, borders
        //removeCommitHandlers();
        //removeResponseHandlers();
    }

    var hashChanged = false;
    function hashChangeHandler() {
        log("Hash change detected: ", location.hash);
        if (isScammingPage() == false) {
            //setTimeout(removeHandlers, 500);
            return log("hashChangeHandler, not on scamming: ", location.hash);
        }
        setTimeout(handlePageLoad, 500);
    }

    function pushStateChanged(e) {
        log("pushStateChanged: ", e);
        if (isScammingPage() == false) {
            return log("pushStateChanged, not on scamming: ", location.hash);
        }
        setTimeout(handlePageLoad, 500);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();
    addScammingStyles();
    addTornButtonExStyles();
    addToolTipStyle();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    if (isScammingPage() == false) {return log("Not on scamming: ", location.hash);}

    callOnContentComplete(handlePageLoad);

    // ============================ styles =========================================

    function addScammingStyles() {
         GM_addStyle(`
            .xskill-green {color: limegreen;}
            .xskill-red {color: green;}
            .xskill-white {color: white;}

            .xedx {border: 1px solid blue !important;}
            .xedx-resp {border: 1px solid blue !important;}
            .xedx-commit {border: 1px solid blue !important;}
            .x-surround {
                position: absolute;
                border-bottom: 0 !important;
                border: 1px solid #ff00ff;
                height: 14px;
                top: -6px;
            }
            .x-accel {
                position: absolute;
                border-top: 0 !important;
                border: 1px solid #00ccff;
                height: 10px;
                top: 4px;
            }

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
            .xscamsave {
                width: 22px !important;
                height: 22px !important;
                border-radius: 22px !important;
                cursor: pointer !important;
                padding: 0px !important;
                line-height: 0px !important;
                font-size: 12px !important;
                margin-left: 10px;
                position: absolute;
                left: 100px;
            }
            .xscamclear {
                width: 22px !important;
                height: 22px !important;
                border-radius: 22px !important;
                cursor: pointer !important;
                padding: 0px !important;
                line-height: 0px !important;
                font-size: 12px !important;
                margin-left: 10px;
                position: absolute;
                left: 125px;
            }
        `);
    }

})();



