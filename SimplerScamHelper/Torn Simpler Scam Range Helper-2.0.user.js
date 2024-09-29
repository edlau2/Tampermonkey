// ==UserScript==
// @name         Torn Simpler Scam Range Helper
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Misc scamming add-ons
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @match        https://torn.com/loader.php?sid=crimes*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @xrequire      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.5.js
// @require      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers-2.45.5.js
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

    if (isAttackPage()) return logt("Won't run on attack page!");

    const xedxDevMode = GM_getValue("xDevMode", true);
    const optDrawDivSurrounds = GM_getValue("optDrawDivSurrounds",false);

    const DevMode = true;
    const optDisplaySkill = GM_getValue("optDisplaySkill", true);
    GM_setValue("optDisplaySkill", optDisplaySkill);

    var cachedCrimeData;
    var cachedAfterState;

    // ===================================================

    var isScammingPage = false;
    function pushStateChanged(e) {
        debug("pushStateChanged: ", e);

         if (location.hash.indexOf("scamming") > -1 || location.href.indexOf("crimes#/scamming") > -1) {
            isScammingPage = true;
            setTimeout(handlePageLoad, 500);
        } else {
            isScammingPage = false;
        }
    }

    // ======================== important global vars  =============================
    //var beforeTargetState;
    //var afterTargetState;

    const cellWidth = 7;
    const cellHeight = 10;

    var currentAccel = 0;             // Row in table (column is currentArrayIndex from clicked btn)
    var currResponseTableIndex;       // Index into entry for range (0, 1, 2) - the column
    var currVirtItemIdx;              // Index into list of crimes, used to index into 'currentCrimesByType' list.
    var currentAccelMod = 0;          // For blue outline, accel before commit
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

    // ============================================================================================================

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
    const lvl60arr = ["advance-fee", "job", "advance", "fee"];        // Unknown ATM...
    const idxMoveArray60 = { 0: [[6,11], [2,4],[-2,-4]],
                           1: [[9,17], [3,6], [-4,-6]],
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

    // ================================== Handlers to do everything =============================
    var globalActiveTarget;

    var currResponseTarget;        // Target of last response, may not need?
    var accelActive = false;       // True if accel clicked, reset on next click
    var capitalizeActive = false;  // true if capitalize clicked.

    // Vars for active response mail area
    var currCrimeOptSection;
    var currVirtItemDiv;        // The position of this, i.e., n-th child, is index in info from server
    var currPipPositionDiv;
    var currPipRangeDiv;
    var currTargetPipPos;
    var currPersuasionBar;
    var currCells;

    // Used to index into crime resonses, to get correct pip info
    function getVirtItemIndex(node) {
        let list = $(currVirtItemDiv).parent().find(".virtual-item");
        let len = $(list).length;
        if (len <= 2) return;
        for (let idx = 0; idx < len-2; idx++) {
            let elem = list[idx+2];
            if ($(elem).is(node)) return idx;
        }
    }

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

    function updatePipInfo(target) {
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
        let arrayIdx = getRespBtnArrayIdx(target);

        updatePipInfo(target);
        if (!currentScamMethod) {
            let elem = $(currCrimeOptSection).find("[class*='scamMethod_']")[0];
            currentScamMethod = $(elem).text();
        }

        // Check for 2nd click, remove range?
        if (arrayIdx == lastIdx && arrayIdx < 3) {
            eraseRangeEstimates();
            currResponseTableIndex = undefined;
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

                applyCellHighlights2();
                break;

            case 1: // slow forward
                accelActive = false;
                capitalizeActive = false;
                currResponseTableIndex = arrayIdx;
                globalActiveTarget = $(target);

                applyCellHighlights2();
                break;

            case 2: // backwards
                accelActive = false;
                capitalizeActive = false;
                currResponseTableIndex = arrayIdx;
                globalActiveTarget = $(target);

                applyCellHighlights2();
                break;

            case 3: // accelerate
                accelActive = true;
                capitalizeActive = false;
                updateDivSurround();
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

    function handleCommit(e) {
        log("handleCommit, e: ", e);

        log("currResponseTableIndex: ", currResponseTableIndex);
        log("currAcel: ", currentAccel);

        if (capitalizeActive == true) currentAccel = 0;

        setTimeout(updateSkillDisplay, 250);
        eraseRangeEstimates();
    }

    // This is prob wrong, nned commit vs response...
    function fixupHandlers(btn) {
        let commitTargets = $(".commit-button:not(.xedx-commit):not(.disabled)");
        if ($(commitTargets).length > 0) {
            installCommitBtnHandlers();
        }

        let respTargets = $(".response-type-button:not(.xedx-resp)");
        if ($(commitTargets).length > 0) {
            installResponseBtnHandlers();
        }
    }

    function applyCellHighlights2() {
        logt("[[drawDivSurround ch]] currentRangeArray: ", currentRangeArray, " currentScamMethod: ", currentScamMethod);

        if (!currentRangeArray) {
            currentRangeArray = getRangeArray(currentScamMethod);
            log("[[drawDivSurround ch]] currentRangeArray: ", currentRangeArray);
        }

        let pipStart = currTargetPipPos;
        let entry = currentRangeArray[currentAccel][currResponseTableIndex];

        let btnIdx = currResponseTableIndex;
        if (btnIdx != -1 && entry) {
            let start = entry[0];
            let stop = entry[1];

            eraseRangeEstimates();
            $("#x-acc-div").remove();

            let begin = 0;
            let end = 0;
            if (btnIdx == 2) {    // Special case to go backwards.
                begin = Math.round(+pipStart + +start);
                end = Math.round(+pipStart + +stop);
                logt("[[drawDivSurround ch]] begin: ", begin, " end: ", end);
                drawDivSurround(begin, end, btnIdx);
            } else {
                begin = Math.round(+pipStart + +start);
                end = Math.round(+pipStart + (+stop > 0 ? +stop : 50));
                logt("[[drawDivSurround ch]] pipStart: ", pipStart, " begin: ", begin, " end: ", end);
                drawDivSurround(begin, end, btnIdx);
            }
        }  // if entry && idx != -1

    }

    // =========================================================
    //
    // Draw single div/border around all cells in range at once
    //
    function drawDivSurround(begin, end, btnIdx) {

        let numCells = Math.abs(end - begin) + 1;
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
    function updateDivSurround() {

        log("updateDivSurround, accel: ", currentAccel);
        log("updateDivSurround, array: ", currentRangeArray);
        log("updateDivSurround, idx: ", currResponseTableIndex);
        log("currentRangeArray[currentAccel]: ", currentRangeArray[currentAccel]);
        log("currentRangeArray[currentAccel+1]: ", currentRangeArray[+currentAccel + 1]);


        if (!currentRangeArray) {
            debugger;
            currentRangeArray = getRangeArray(currentScamMethod);
            log("[[drawDivSurround ch]] currentRangeArray: ", currentRangeArray);
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

        logt("[updateDivSurround] New accel div: ", $("#x-acc-div"));
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
        let targets = $(".commit-button");
        if ($(targets).length == 0) {
            if (retries++ > maxCommitRetries) return setTimeout(checkCommitBtns, 5000);
            return setTimeout(installCommitBtnHandlers, (250+(10*retries)), retries, fromCap);
        }

        for (let idx=0; idx < $(targets).length; idx++) {
            let btn = $(targets)[idx];
            if (!$(btn).hasClass('xedx-commit')) {
                $(btn).on('click', handleCommit);
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

    function installResponseBtnHandlers(retries=0) {
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
                $(target).on('click', handleResponseClick);
            }
        }
        setTimeout(checkRespBtns, 2000);
    }

    function handlePageLoad() {
        log("handlePageLoad");

        if (location.hash.indexOf("scamming") > -1 || location.href.indexOf("crimes#/scamming") > -1) {
            isScammingPage = true;
        } else {
            isScammingPage = false;
            return;
        }

        installObservers();
        addHelpBtn();

        if (isScammingPage == true)
            setTimeout(updateAvailable, 2000);
    }

    function handleHelpBtn() {
        const helpURL = "https://www.torn.com/forums.php#/p=threads&f=61&t=16418415&b=0&a=0";
        openInNewTab(helpURL);
    }

    const helpIcon = `<i class="info-icon"></i>`;
    const helpBtnRight = `<input id="x-scam-help-btn" type="button" class="xscamhlp xedx-torn-btn" value="?">`;
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
        }

        if (optDisplaySkill == true) addSkillDisplay();
    }

    function hashChangeHandler() {
        logt("Hash change detected...");
        if (location.hash.indexOf("scamming") > -1 || location.href.indexOf("crimes#/scamming") > -1) {
            isScammingPage = true;
            setTimeout(handlePageLoad, 500);
        } else {
            isScammingPage = false;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (isAttackPage()) return logt("Won't run on attack page!");

    //validateApiKey();
    versionCheck();

    // TEMP class to track what I added handler to...
    // Note: Think I like this, prob gonna leave...
    if (DevMode) GM_addStyle(".xedx {border: 1px solid blue !important;}");

    addScammingStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    // Need hash/push state handlers installed though, first?

    if (location.hash.indexOf("scamming") < 0) {
        isScammingPage = false;
        return logt("Not on scamming...");
    }
    if (location.href.indexOf("crimes#/scamming") < 0) {
        isScammingPage = false;
        return logt("Not on scamming...");
    }
    isScammingPage = true;

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
        `);
    }

})();



