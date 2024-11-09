// ==UserScript==
// @name         Torn Simpler Scam Range Helper
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Misc scamming add-ons
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @match        https://torn.com/loader.php?sid=crimes*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
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

    loggingEnabled = true;          // Enables regular logging
    debugLoggingEnabled = false;    // Enables extra debug logging

    const centerx = window.innerWidth / 2;
    const centery = window.innerHeight / 2;

    // Editable globals, via Storage ATM, maybe options pane later.
    // Used to be consts, but now can change on the fly via an opts panel.
    var optsCommited = GM_getValue("optsCommited", undefined);
    var writeMissedPredictions = GM_getValue("writeMissedPredictions", false); // Logs missed predictions in local storage
    var autoCorrectPredictions = GM_getValue("autoCorrectPredictions", true);  // Fixes and saves corrections in local storage
    var writeSmallPrediction = GM_getValue("writeSmallPrediction", true);      // Write a shorter prediction entry to storage
    var optDisplaySkill = GM_getValue("optDisplaySkill", true);                // Display CS and changes on top bar
    var supportBannerBarHide = GM_getValue("supportBannerBarHide", true);      // Add hide banner button
    var autoHideBanner = GM_getValue("autoHideBanner", false);                 // Start with banner hidden
    var closeResultAfterDelay = GM_getValue("closeResultAfterDelay", true);    // After capitalize, auto close result window
    var closeResultDelayMs = GM_getValue("closeResultDelayMs", 3000);          // Delay in ms (3 seconds default)
    var redTideCheck = GM_getValue("redTideCheck", false);                      // If predicted range has red - warn on commit click.
    var funkyBubbles = GM_getValue("funkyBubbles", false);
    var enableScrollLock = GM_getValue("enableScrollLock", false);             // Scroll avail crimes separate from headers/banner area
    var hideScrollbars = GM_getValue("hideScrollbars", false);

    // Prob do not ant to change this. It is toggled to false after first run. It loads
    // the default tables, which are updated during execution to 'auto-correct' errors,
    // or bad predictions. Auto-correct only works if you have the psych edu.
    var loadDefaultTables = GM_getValue("loadDefaultTables", true);

    var rangeColor = GM_getValue("rangeColor", "#ff00ff");                     // Color of range where you will land
                                                                               // Setting to 'transparent' will only show accel range
    var accelColor = GM_getValue("accelColor", "#00ccff");                     // Color for accelerated range

    // ======================== Things below here prob shouldn't change =====================================
    const DevMode = true;                         // Flag for enabling certain things during delopment/testing
    const isXedx = GM_getValue("isXedx", false);  // Same...usually experimental crap or excessive logging.

    if (!optsCommited) {
        GM_setValue("optsCommited", true);
        GM_setValue("writeMissedPredictions", writeMissedPredictions);
        GM_setValue("autoCorrectPredictions", autoCorrectPredictions);
        GM_setValue("writeSmallPrediction", writeSmallPrediction);
        GM_setValue("optDisplaySkill", optDisplaySkill);
        GM_setValue("rangeColor", rangeColor);
        GM_setValue("accelColor", accelColor);
        GM_setValue("supportBannerBarHide", supportBannerBarHide);
        GM_setValue("autoHideBanner", autoHideBanner);
        GM_setValue("loadDefaultTables", loadDefaultTables);
        GM_setValue("closeResultAfterDelay", closeResultAfterDelay);
        GM_setValue("closeResultDelayMs", closeResultDelayMs);
        GM_setValue("funkyBubbles", funkyBubbles);
        GM_setValue("redTideCheck", redTideCheck);
        GM_setValue("enableScrollLock", enableScrollLock);
        GM_setValue("hideScrollbars", hideScrollbars);
    }

    function reloadOptions() {
        writeMissedPredictions = GM_getValue("writeMissedPredictions", false);
        autoCorrectPredictions = GM_getValue("autoCorrectPredictions", true);
        writeSmallPrediction = GM_getValue("writeSmallPrediction", true);
        optDisplaySkill = GM_getValue("optDisplaySkill", true);
        supportBannerBarHide = GM_getValue("supportBannerBarHide", true);
        autoHideBanner = GM_getValue("autoHideBanner", false);
        loadDefaultTables = GM_getValue("loadDefaultTables", true);
        rangeColor = GM_getValue("rangeColor", "#ff00ff");
        accelColor = GM_getValue("accelColor", "#00ccff");
        closeResultAfterDelay = GM_getValue("closeResultAfterDelay", true);
        closeResultDelayMs = GM_getValue("closeResultDelayMs", 3000);
        enableScrollLock = GM_getValue("enableScrollLock", false);
        hideScrollbars = GM_getValue("hideScrollbars", false);
    }

    // ======================================== Globals to maintain 'state' ===================================

    const isScammingPage = function () {return (location.hash.indexOf("scamming") < 0) ? false : true;}

    // Don't touch any of these, some prob rely on starting off as undefined,
    // all will get over-written eventually.
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
    var currInnerOutcome;

    // "Red Tide" check vars
    var currRedZones;
    var currRedZoneArray = [];
    var redTideDetected = false;
    var commitLocked = false;

    const cellWidth = 7;
    const cellHeight = 10;

    var currentAccel = 0;             // Row in table (column is currentArrayIndex from clicked btn)
    var currResponseTableIndex;       // Index into entry for range (0, 1, 2) - the column
    var currVirtItemIdx;              // Index into list of crimes, used to index into 'currentCrimesByType' list.
    var currentScamMethod;            // Used to get table
    var currentRangeArray;            // The table
    var currArrayName;                // For debugging

    var skillTimer = 0;
    var dblCurrSkill = 0;
    var prevCurrSkill = 0;
    var strCurrSkill = getSkill();

    // Gets stats from top statistics panel.
    function getStat(name) {
        let allStatisticButtons = Array.from(document.querySelectorAll('button[class^="statistic___"]'));

        let statButton = allStatisticButtons.find(button => {
            return Array.from(button.querySelectorAll('span')).some(span => span.textContent.trim() === name);
        });

        if (statButton) {
            let valueSpan = statButton.querySelector('span[class^="value___"]');
            if (valueSpan) {
                let stat = valueSpan.textContent;
                return stat;
            }
        }
    }

    function getSkill() {
        let stat =  getStat("Skill");

        strCurrSkill = stat;
        let tmp = dblCurrSkill;
        debug("updateSkill, get, ", stat, " tmp: ", tmp, " curr: ", dblCurrSkill, " prev: ", prevCurrSkill);
        dblCurrSkill = parseFloat(stat);
        if (tmp && tmp != dblCurrSkill) prevCurrSkill = tmp;

        return stat;
    }

    // ============================= Tables that define range estimates ===========================
    // Taken from the scamming guide. I've found not very accurate, mostly with
    // acceleration, at CS60+
    // Now I  load default arrays the first time, and as the predicted ranges do
    // not match actual, fix the tables (saved in storage) so as to make 'self-healing'
    //
    // Set once defaults have been read and saved.
    //const loadDefaultTables = GM_getValue("loadDefaultTables", true);

    // Arrays used to look up correct tables
    const lvl0arr = ["delivery", "family", "prize"];
    const lvl20arr = ["charity", "tech"];
    const lvl40arr = ["vacation", "tax"];
    const lvl60arr = ["advance-fee", "job", "advance", "fee"];
    const lvl80arr = ["romance", "investment"];

    // Initial default arrays (updated 10/11/2024, through CS 60)
    const defMoveArray =
          { name: "idxMoveArray", 0: [[10,19], [3,7],[-2,-4]], 1: [[15,29], [5,11], [-3,-6]], 2: [[18,35], [6,13], [-4,-7]],
            3: [[21,39], [6,14], [-4,-8]], 4: [[22,42], [7,15], [-5,-9]], 5: [ [23,44],  [7,16],  [-5,-10]]};
    const defMoveArray20 =
          { name: "idxMoveArray20", 0: [[8,15], [3,8],[-2,-4]], 1: [[12,24], [5,12], [-3,-6]], 2: [[15,28], [6,14], [-4,-7]],
            3: [[16,31], [6,15], [-4,-8]], 4: [[18,33], [7,15], [-4,-9]], 5: [ [18,35], [7,16], [-5,-9]]};
    const defMoveArray40 =
          { name: "idxMoveArray40", 0: [[7, 14], [3, 7], [-4, -1]], 1: [[12, 24], [5, 12], [-3, -6]], 2: [[13, 25], [6, 12], [-4, -7]],
            3: [[14, 28], [6, 13], [-4, -8]], 4: [[15, 30], [7, 14], [-4, -9]], 5: [[16, 31], [7, 15], [-5, -9]]}
    const defMoveArray60 =
          { name: "idxMoveArray60", 0: [[6, 12], [2, 5], [-2, -1]], 1: [[9, 18], [3, 7], [-6, -2]], 2: [[11, 21], [4, 8], [-4, -7]],
            3: [[12, 24], [4, 9], [-4, -8]], 4: [[13, 25], [4, 10], [-4, -9]], 5: [[14, 21], [7, 10], [-5, -9]]};
    const defMoveArray80 =
          { name: "idxMoveArray80", 0: [[6,12], [2,5],[-2,-4]], 1: [[8,15], [3,6], [-4,-6]], 2: [[9,18], [4,7], [-3,-6]],
            3: [[10,20], [5,8], [-4,-8]], 4: [[11,21], [6,9], [-4,-9]], 5: [ [12,22],  [7,10],  [-5,-9]]};

    // Arrays used for predictions.
    var idxMoveArray = loadArrayCs1();
    var idxMoveArray20 = loadArrayCs20();
    var idxMoveArray40 = loadArrayCs40();
    var idxMoveArray60 = loadArrayCs60();
    var idxMoveArray80 = loadArrayCs80();  // must be last

    // Load arrays, either default or saved versions
    function loadArray(key, defArray) {
        if (loadDefaultTables == true) {
            GM_setValue(key, JSON.stringify(defArray));
            loadDefaultTables = false;
            GM_setValue("loadDefaultTables", loadDefaultTables);
            return defArray;
        }
        return JSON.parse(GM_getValue(key, JSON.stringify(defArray)));
    }

    function loadArrayCs1() {return loadArray("idxMoveArray", defMoveArray);}
    function loadArrayCs20() {return loadArray("idxMoveArray20", defMoveArray20);}
    function loadArrayCs40() {return loadArray("idxMoveArray40", defMoveArray40);}
    function loadArrayCs60() {return loadArray("idxMoveArray60", defMoveArray60);}
    function loadArrayCs80() {
        GM_setValue("loadDefaultTables", false);
        return loadArray("idxMoveArray80", defMoveArray80);
    }

    function reloadArray(arrName) {
        switch (arrName) {
            case "idxMoveArray": currentRangeArray = idxMoveArray = loadArrayCs1(); break;
            case "idxMoveArray20": currentRangeArray = idxMoveArray20 = loadArrayCs20(); break;
            case "idxMoveArray40": currentRangeArray = idxMoveArray40 = loadArrayCs40(); break;
            case "idxMoveArray60": currentRangeArray = idxMoveArray60 = loadArrayCs60(); break;
            case "idxMoveArray80": currentRangeArray = idxMoveArray80 = loadArrayCs80(); break;
        }
    }

    // Update a saved array if prediction fails
    function updateArray(array, prediction) {
        let arrName = prediction.arrName;
        let accel = prediction.accel;
        let btnIdx = prediction.btnIdx;
        let newEntry = prediction.newE;

        array[accel][btnIdx] = newEntry;
        GM_setValue(arrName, JSON.stringify(array));
        reloadArray(arrName);

        let upd = GM_getValue("arrayUpdates", 0);
        GM_setValue("arrayUpdates", (+upd + 1));
    }

    function logArray(arrName) {
        let val = GM_getValue(arrName, undefined);
        if (!val) return log("Unable to load saved array: ", arrName);
        let arr = JSON.parse(val);
        //log("Saved array ", arrName, ": ", arr);
    }

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

    // Erase what we have drawn
    function eraseRangeEstimates() {
        $("#x-range-div").remove();
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
        $("#xavail").text("Avail: " + availableScams);
        if (availableScams) addAvatarPcts();
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
        currInnerOutcome = $(currVirtItemDiv).closest(".inner-outcome-wrapper")[0];

        currVirtItemIdx = getVirtItemIndex(currVirtItemDiv); // use index fn?

        currPipPositionDiv = $(currCrimeOptSection).find("[class^='pipPosition_']")[0];
        currPipRangeDiv = $(currCrimeOptSection).find("[class^='pipRange_']")[0];
        currPersuasionBar = $(currPipPositionDiv).parent();
        currCells = $(currPersuasionBar).find("[class^='cell__']");
        let cn = $(currPipPositionDiv).prop("className").split(" ")[1];
        currTargetPipPos = cn ? cn.match(/\d+/g)[0] : 0;
        getCurrentAccel();
        getSkill();
        currRedZones = getCurrentRedZones();
    }

    // ==================== "Red Tide" red zone stuff ====================

    function getNum(className) {
        let parts = className.split("-");
        let begin = parts[1];
        if (begin) {
            return Number(begin.split("_")[0]);
        }
        return className.match(/\d+/g)[0]
    }

    function getStartAndSize(cl) {
        const r = /\d+/g;
        let startAndSize = {start: 0, end: 0, size: 0};
        for (let idx=0; idx < cl.length; idx++) {
            let className = cl[idx];
            debug("RedTide Class #", idx, ": ", className);

            // Split on "-" and "_"
            if (className.indexOf("start") > -1) startAndSize.start = getNum(className); //.match(r)[0];
            if (className.indexOf("from") > -1) startAndSize.start = getNum(className); //.match(r)[0];
            if (className.indexOf("size") > -1) startAndSize.size = getNum(className); //.match(r)[0];
            startAndSize.end = (startAndSize.start + startAndSize.size) - 1;
        }
        return startAndSize;
    }

    function getStartSizeFromNode(node) {
        let cl = getClassList($(node));
        if (!cl) {
            debug("RedTide Error getting class list from ", $(node));
            return;
        }
        let startSize = getStartAndSize(cl);
        return startSize;
    }

    // Get red zones and array of start/size/end
    // Over-writes if already exists.
    function getCurrentRedZones() {
        currRedZones  = $(currPersuasionBar).parent().find("[class*='fail_']");
        if (!$(currPipRangeDiv).length) {
            currPipRangeDiv = $(currPersuasionBar).parent().find("[class^='pipRange_']")[0];
        }

        // Get start/end/size to populate as an array as well
        currRedZoneArray.length = 0;

        for (let idx=0; idx < $(currRedZones).length; idx++) {
            let node = $(currRedZones)[idx];
            let nodeSS = getStartSizeFromNode($(node));
            debug("RedTide Red zone #", idx, " startsize: ", nodeSS, " node: ", $(node));
            currRedZoneArray.push(nodeSS);
        }

        return currRedZones;
    }

    // See if a given start/end/size is in a red zone at all
    // If any of the following is true, then yes:
    // Let P be check zone (prediction) and R be a red zone.
    // Pe > Rs && Pe < Re (P end within) -or-
    // Ps > Rs && Ps < Re (p start within)
    // Re > Ps && Re < Pe (R end within)
    // Rs > Ps && Rs < Pe (R start within)
    function isInRedZone(startAndSize) {
        log("isInRedZone: ", startAndSize);

        if (!currRedZoneArray.length || !currRedZones)
            getCurrentRedZones();

        let Pe = Number(startAndSize.end);
        let Ps = Number(startAndSize.start);
        debug("RedTide pe: ", Pe, " Ps: ", Ps, " array: ", currRedZoneArray);
        for (let idx=0; idx < currRedZoneArray.length; idx++) {
            let zone = currRedZoneArray[idx];
            let Re = Number(zone.end);
            let Rs = Number(zone.start);
            debug("RedTide comparing Ps ", Ps, ", Pe ", Pe, " to Rs ", Rs, ", Re ", Re);

            if (Pe >= Rs && Pe <= Re) return {status: true, zone: zone};
            if (Ps >= Rs && Ps <= Re) return {status: true, zone: zone};
            if (Re >= Ps && Re <= Pe) return {status: true, zone: zone};
            if (Rs >= Ps && Rs <= Pe) return {status: true, zone: zone};
        }

        debug("RedTide found no zones!");
        return {status: false, zone: undefined};
    }

    // See if prediction has any red in it
    function checkRedTide(optRange) {
        let predictRange = $($(currPersuasionBar).parent().find("[class^='pipRange_']")[0]);
        let rangeStartSize = optRange ? optRange : getStartSizeFromNode($(predictRange));
        if (!rangeStartSize) return "retry";
        if (rangeStartSize.size <= 1) {
            debug("RedTide Error! pip range estimate seems invalid!!");
            return "retry";
        }

        let result = isInRedZone(rangeStartSize);
        debug("RedTide isInRedZone result: ", result);
        if (result.status == true) {
            debug("RedTide rss: ", rangeStartSize, " zone: ", result.zone);
            redTideDetected = true;
            return true;
        } else {
            return false;
        }
    }

    // ==================================================================

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
    
        if (inRespHandler == true) return;
        inRespHandler = true;
        setTimeout(clearRespFlag, 300);

        if (!e || !$(e.currentTarget).length) return console.error("No click target: ", e);

        let target = $(e.currentTarget);              
        let arrayIdx = $(target).index();

        // Clear Red Tide flags
        redTideDetected = false;
        commitLocked = false;

        // Check for mail target change...clear dbl click,
        // accell, etc 
        let lastSec = $(currCrimeOptSection);
        updateGlobalStateInfo(target);
        let elem = $(currCrimeOptSection).find("[class*='scamMethod_']")[0];
        currentScamMethod = $(elem).text();
        currentRangeArray = getRangeArray(currentScamMethod);

        if ($("#acc-quantity").length)
            $("#acc-quantity").val(parseInt(currentAccel));

        // prevent erroneous dbl-click detection
        if (!$(currCrimeOptSection).is(lastSec)) {lastIdx = -1;}

        // Check for 2nd click, remove range?
        if (arrayIdx == lastIdx && arrayIdx < 3) {
            eraseRangeEstimates();
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
    function doAccelRightClick(e) {
        debug("[doAccelRightClick] e: ", e);
        if ($("#acc-test").length > 0) return;
        if ($("#x-range-div").length < 1) return;

        let accelPromptDiv = `
                <div id="acc-test" class="acc-prompt">
                    <label class="acc-lbl" for="acc-quantity">Desired acceleration, currently ` + currentAccel + ` (between 1 and 5):</label>
                    <input type="number" id="acc-quantity" class="acc-cb" name="quantity" min="1" max="5">
                    <input id="xedx-cancel-btn" type="submit" class="xedx-torn-btn acc-cancel" value="Close">
                    <!-- input id="xedx-ok-btn" type="submit" class="xedx-torn-btn acc-ok" value="OK" -->
                </div>
            `;

        let root = $(this).closest(".crime-option").parent();
        debug("[doAccelRightClick] $(root): ", $(root));
        $(root).parent().addClass("acc-zdx");
        $(root).before(accelPromptDiv);

        //$("#acc-quantity").val(desiredAccel);
        $("#acc-quantity").val(currentAccel);

        $("#acc-quantity").change(handleAccelChange);

        $("#acc-test").animate({
            height: "51px",
        }, 1000, function() {
            //log("Animate done!");
        });

        debug("Added: ", $("#acc-test"));
        $("#xedx-ok-btn").on('click', handleOkCancelClick);
        $("#xedx-cancel-btn").on('click', handleOkCancelClick);

        return false;


        var okClicked = false;
        var desiredAccel = 0;
        function handleOkCancelClick(e) {
            desiredAccel = $("#acc-quantity").val();
            $("#acc-test").animate({
                height: "0px",
            }, 1000, function() {
                $("#acc-test").parent().removeClass("acc-zdx");
                $("#acc-test").remove();
                $("#x-acc-div").remove();
            });
        }


        function handleAccelChange(e) {
            let tmp = desiredAccel;
            desiredAccel = $("#acc-quantity").val();
            debug("[handleAccelChange] desired: ", desiredAccel, " was: ", tmp);
            if (desiredAccel != tmp) {
                $("#x-acc-div").remove();
                drawAcceleratedRangeBars(desiredAccel);
            }
        }
    }

    // =========================== Handle a 'capitalize' commit click =============================

    // Add an observer on an element
    function installNodeObserver(target, callback) {
        log("Install observer ", $(target));
        const options = {attributes: false, childList: true, characterData: false, subtree: true};
        if ($(target).length) {
            let observer = new MutationObserver(callback);
            observer.observe(target, options);
            return observer;
        }
    }

    function capitalizeCB(mutations, observer) {

        let filtered = mutations.filter((mutation) => mutation.addedNodes.length > 0);

        if (filtered) log("Nodes Added! ", filtered);
        for (let added of filtered) {
            let element = added.addedNodes[0];

            // Copy to my chat? Need to delete removed also!!!!!!
            log("Node added!! ", $(element));
        }
    }

    function closeResultPanel(btn, target) {
        if ($(btn).length == 0) return debug("Invalid close btn!");

        //$(btn).css("border", "1px solid green");
        $(target).animate({
                opacity: 0,
            }, 2000, function() {
                $(btn)[0].click();
            });
    }

    function handleCapitalize(retries=0) {
        // Grab the outcome wrapper
        let outcomeDiv = $(currVirtItemDiv).find("[class^='outcomeWrapper_']")[0];
        if (!outcomeDiv) return log("handleCapitalize didn't find wrapper!");
        let entered = $(currVirtItemDiv).find("[class*='entered_']");
        let btn = $(entered).find("button[class^='closeButton_']");
        //$(btn).css("border", "1px solid red");

        if (closeResultAfterDelay == true) {
            $(btn).css("border", "1px solid blue");
            setTimeout(closeResultPanel, closeResultDelayMs, btn, entered);
        }

        if (!$(btn).length) {
            if (retries++ < 10) return setTimeout(handleCapitalize, 200, retries);
            log("capitalize: never found it.");
        }
    }

    // ================================== Handle a 'commit' btn click =============================
    // 
    var lastCommit = {x: 0, y: 0, capitalize: false, valid: false, target: undefined}
    var skillAtCommit;
    var inCommitHandler = false;
    function resetCommitFlag() { inCommitHandler = false; }
    function handleCommit(e) {
        if (inCommitHandler == true) {
            return debug("Already in handler!");
        }
        inCommitHandler = true;
        let label = $(e.currentTarget).attr('aria-label');
        let title = $($(e.currentTarget).find("[class^='title_']")[0]).text();
        if (debugLoggingEnabled == true) {
            log("handleCommit, e: ", e);
            log("handleCommit, label: ", label, " title: ", title);
            log("currResponseTableIndex: ", currResponseTableIndex);
            log("currAcel: ", currentAccel);
            log("capitalizeActive: ", capitalizeActive);
        }

        // Don't do for read, capitalize active - only on 'move' events
        let dontWarn = (lastIdx > 2 || title != "Resolve" || capitalizeActive);
        if ((commitLocked == true || redTideDetected == true) && dontWarn == false) {
            debug("RedTide gonna warn, lastIdx: ", lastIdx, " cap: ", capitalizeActive, " label: ", label, " title: ", title);
            if (!confirm("You may land in a Red Zone!\nAre you sure?\n\nClick Cancel to change your mind...")) {
                setTimeout(resetCommitFlag, 250);
                redTideDetected = false;
                e.preventDefault();
                event.stopPropagation();
                return false;
            }
        }
        setTimeout(resetCommitFlag, 250);
        commitLocked = false;
        redTideDetected = false;

        if ((label && label.indexOf("Read") > -1) || (title && title.indexOf("Read") > -1)) {
            $("#acc-test").remove();
        }

        // Save click position, may use in a bit...
        lastCommit.x = e.clientX;
        lastCommit.y = e.clientY;
        lastCommit.capitalize = capitalizeActive;
        lastCommit.valid = true;
        lastCommit.target = $(e.currentTarget);

        if ($("#acc-quantity").length)
            $("#acc-quantity").val(parseInt(currentAccel));

        if (accelActive == false) {
            currentAccel = 0;
        }
        //else {
        //    $("#acc-quantity").val(parseInt(currentAccel) + 1); // accel hasn't updated yet
        //}

        // May want to auto-close the result


        if (capitalizeActive == true) {
            handleCapitalize();
            capitalizeActive = false;
            accelActive = false;
            currentAccel = 0;
            currRedZones = undefined;
        }

        //setTimeout(updateSkillDisplay, 250);
        eraseRangeEstimates();
    }

    // After a commit, check for changes to the commit or response
    // buttons. May be better to add a mutation observer?
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

    function handleAbandon() {
        $("#xedx-cancel-btn").click();
        //$("#acc-test").remove();
        //handleOkCancelClick(e);
    }

    // =============================== verify prediction is correct ==============================
    var currPrediction = {pip: 0, scam: currentScamMethod, arrName: currArrayName, btnIdx: 0,
                          accel: currentAccel, myStart: 0, myEnd: 0,
                          actualStart: 0, actualEnd: 0, entry: [0,0], newE: [0,0]};
    var currPredictionArray = currentRangeArray;

    function notifyPredictionError() {
        let c = currPrediction;
        let shortPrediction = {scam: c.scam, accel: c.accel, btnIdx: c.btnIdx, entry: c.entry, newEntry: c.newE};
        console.error("Prediction failed!! This isn't an error, just a notice...will auto-correct.", currPrediction);
        let lastIdx = GM_getValue("lastWriteIdx", 0);
        lastIdx = +lastIdx + 1;
        let key = "miss_" + lastIdx;
        GM_setValue(key, JSON.stringify((writeSmallPrediction == true) ? shortPrediction : currPrediction));
        GM_setValue("lastWriteIdx", lastIdx);
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

        if (size && actStart) {
            currPrediction.actualStart = +actStart;
            currPrediction.actualEnd = +actStart + +size;

            if (currPrediction.actualStart != currPrediction.myStart ||
                currPrediction.actualEnd != currPrediction.myEnd) {
                let news = currPrediction.entry[0] + (currPrediction.actualStart - currPrediction.myStart);
                let newe = currPrediction.entry[1] + (currPrediction.actualEnd - currPrediction.myEnd);
                currPrediction.newE = [news, newe, "UPD"];
                debug("Curr entry: ", currPrediction.entry, " New: ", currPrediction.newE);
                if (writeMissedPredictions == true) notifyPredictionError();
                if (autoCorrectPredictions == true) {
                    updateArray(currPredictionArray, currPrediction);
                    let tblTarget = currPredictionArray.name + "[" + currentAccel + "][" + currPrediction.btnIdx + "]";
                    log("Auto corrected " + tblTarget + " entry " + currPrediction.entry + " to " + currPrediction.newE);

                    /*
                    <div id="x-range-div" style="left: 124px;height: 40px;width: 119px;" class="x-surround" data-l="124" data-w="119">
                        <span style="
                            position: absolute;
                            bottom: 0;
                            justify-content: center;
                            display: inline-flex;
                            width: 102%;
                            border-left: 2px solid black;">
                        Auto Correct!</span>
                    </div>
                    */
                }
            }
        }
    }

    // ================================== Draw the predicted range =============================

    function drawPredictedRangeBars(retries=0) {

        if (!currentRangeArray) {
            currentRangeArray = getRangeArray(currentScamMethod);
        }

        if (!currentRangeArray) {
            dumpState();
            console.error("Invalid prediction table!");
            debugger;
            return;
        }

        debug("[[drawPredictedRangeBars]] currentRangeArray: ", currentRangeArray.name, " currentScamMethod: ", currentScamMethod);

        let pipStart = currTargetPipPos;
        let entry = currentRangeArray[currentAccel][currResponseTableIndex];

        debug("[[drawPredictedRangeBars]: ", currentRangeArray.name, " idx: ", currResponseTableIndex, " accel: ", currentAccel, " entry: ", entry);

        let begin = 0;
        let end = 0;
        if (currResponseTableIndex > -1 && entry) {
            let start = entry[0];
            let stop = entry[1];

            eraseRangeEstimates();

            if (currResponseTableIndex == 2) {    // Special case to go backwards.
                begin = Math.round(+pipStart + +start);
                end = Math.round(+pipStart + +stop);
                //logt("[[drawPredictedRangeBars]] begin: ", begin, " end: ", end);
                drawDivSurround(begin, end, currResponseTableIndex);
            } else {
                begin = Math.round(+pipStart + +start);
                end = Math.round(+pipStart + (+stop > 0 ? +stop : 50));
                //logt("[[drawPredictedRangeBars]] pipStart: ", pipStart, " begin: ", begin, " end: ", end);
                drawDivSurround(begin, end, currResponseTableIndex);
            }

            // Only do this if have edu, or just fail.
            currPredictionArray = currentRangeArray;
            currPrediction = {pip: currTargetPipPos, scam: currentScamMethod, btnIdx: currResponseTableIndex, arrName: currArrayName,
                              accel: currentAccel, myStart: begin, myEnd: end,
                              actualStart: 0, actualEnd: 0, entry: entry};
            setTimeout(verifyPrediction, 500);

        } else {
            dumpState();
            console.error("Missing vars!");
            debugger;
            return;
        }

        // If the Torn prediction bar is there, see if it spans any red.
        // If so, 'lock' (with warning) Commit (optionally)
        // If returns retry, maybe pass in our range????
        $("#x-range-div").attr("data-b", begin);
        $("#x-range-div").attr("data-e", end);
        if (redTideCheck == true) {
            let range = {start: begin, end: end, size: (end-begin+1)};
            debug("RedTide check red tide range: ", range);
            let res = checkRedTide(range);
            debug("RedTide check red tide ret: ", res);
            if (res == true) {
                debug("RedTide Red Tide detected, locking commit!!");
                commitLocked = true;
            }
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
        let newDiv = "<div id='x-range-div' style='left: " + L + "; width: " + W + ";' ></div>";
        let target = $(currPipPositionDiv).parent();

        $(target).after(newDiv);
        $("#x-range-div").addClass("x-surround");
        $("#x-range-div").attr("data-l", (+begin * cellWidth - 2));
        $("#x-range-div").attr("data-w", (+numCells * cellWidth));

    }

    // Called when accel clicked...creates id='x-acc-div
    function drawAcceleratedRangeBars(override=0) {
        debug("drawAcceleratedRangeBars, override: ", override);

        if ($("#x-range-div").length == 0) {
            debug("[[drawPredictedRangeBars]: ", currentRangeArray.name,
                  " idx: ", currResponseTableIndex, " accel: ", currentAccel);

            debugger;
            if (!currResponseTableIndex) currResponseTableIndex = 0;
        }

        if (!currentRangeArray) {
            debugger;
            currentRangeArray = getRangeArray(currentScamMethod);
        }

        //let nowAccel = (override > 0) ? (override - 1) : currentAccel;
        let entry1 = currentRangeArray[currentAccel][currResponseTableIndex];
        debug("entry1: ", entry1);

        let newAccel = (override > 0) ? override : (Number(currentAccel) + 1);
        let entry2 = currentRangeArray[newAccel][currResponseTableIndex];
        debug("entry2: ", entry2);

        let startDiff = entry2[0] - entry1[0];
        let endDiff = entry2[1] - entry1[1];
        let numCells = entry2[1] - entry2[0];
        let newW = cellWidth * numCells + "px";

        let lOrg = $("#x-range-div").attr("data-l");
        let newL = (parseInt(lOrg) + (startDiff * cellWidth)) + "px";
        let newDiv = "<div id='x-acc-div' style='left: " + newL + "; width: " + newW + ";' class='x-accel'></div>";
        $("#x-range-div").after(newDiv);

        log("lOrg: ", lOrg, " newL: ", newL, " startDiff: ", startDiff);
        if (redTideCheck == true) {
            debug("RedTide accel entry1: ", entry1, " entry: ", entry2);
            debug("RedTide lOrg: ", lOrg, " newL: ", newL, " newW: ", newW);

            let begin = $("#x-range-div").attr("data-b");
            let end = $("#x-range-div").attr("data-e");
            begin = Number(begin) + entry2[0];
            end = Number(end)  + entry2[1]
            let range = {start: begin, end: end, size: (end-begin+1)};
            debug("RedTide check accel red tide range: ", range);
            let res = checkRedTide(range);
            debug("RedTide check accel red tide ret: ", res);
            if (res == true) {
                debug("RedTide Red Tide detected, locking commit!!");
                commitLocked = true;
            }
        }
    }

    // ========================= scroll lock ===================================

    function doScrollLock(retries=0) {
        let sel ="[class*='crimeOptionGroup_']";
        //if (location.hash.indexOf("disposal") < 0)
        //    sel ="[class*='virtualList_']";

        let crimeSection = $(sel)[0];
        log("xxx crimeSection: ", $(crimeSection));
        log("xxx selector: ", sel);

        if(!$(crimeSection).length) {
            sel ="[class*='virtualList_']";
            crimeSection = $(sel)[0];
            log("xxx crimeSection: ", $(crimeSection));
            log("xxx selector: ", sel);
        }

        if(!$(crimeSection).length) {
            if (retries++ < 10) return setTimeout(doScrollLock, 250);
            log("Too many attempts...");
        } else {

            // ===================== Set crimeSection style ==========================
            if (hideScrollbars)
                $(crimeSection).addClass("disable-scrollbars");

            // Could just add these as styles to the 'crimeSection' element....
            $(crimeSection).css("max-height", "90vh"); // bottom margin for TTS footer.
            $(crimeSection).css("overflow-y", "auto");
            $(crimeSection).css("top", "0px");
            $(crimeSection).css("position", "sticky");

            //if (greenDivBorders) $(crimeSection).addClass("xbgreen");
        }
    }

    // ======================== Help/Options panel =============================

    const optsDiv = `
    <div id="xscam-opts" class="xscamopts xflexr-center" style="height: 0px;">
        <table class="xscam-table xmt5 xml14">
             <tr>
                 <td class="xxntcl">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="redTideCheck">
                         Warn if Red Possible
                     </span>
                 </td>
                 <td class="xxntcr">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="autoCorrectPredictions">
                         Auto-Correct Missed Predictions
                     </span>
                 </td>
                 <td class="xxntcl">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="loadDefaultTables">
                         Reload Default Range Tables
                     </span>
                 </td>
             </tr>

             <tr>
                 <td class="xxntcl">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="funkyBubbles">
                         Show the Funky Bubbles
                     </span>
                 </td>
                 <td class="xxntcr">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="optDisplaySkill">
                         Display Skill in Title Bar
                     </span>
                 </td>
                 <td class="xxntcr">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="closeResultAfterDelay">
                         Close Result After Capitalize (delayed)
                     </span>
                 </td>
             </tr>

             <tr>
                 <td class="xxntcl">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="supportBannerBarHide">
                         Enable Banner Bar Hiding
                     </span>
                 </td>
                 <td class="xxntcr">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="autoHideBanner">
                         Start With Banner Hidden
                     </span>
                 </td>
                 <td class="xxntcr">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="enableScrollLock">
                         Enable Scroll Lock
                     </span>
                 </td>
             </tr>

             <!-- tr>
                 <td class="xxntcl">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="loadDefaultTables">
                         Reload Default Range Tables
                     </span>
                 </td>
                 <td class="xxntcr">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="closeResultAfterDelay">
                         Close Result After Capitalize (delayed)
                     </span>
                 </td>
                 <td class="xxntcr">
                     <span class="xfmt-span">
                         <input class="scam-cb" type="checkbox" name="key" value="test">
                         test test test test
                     </span>
                 </td>
             </tr -->
         </table>
     </div>
        `;

    function testOutsideClick(e) {
        log("testOutsideClick, e: ", e);
    }

    function addOptionsScreen(retries=0) {
        if ($(bannerWrapper).length == 0) {
            if (retries++ < 10) return setTimeout(addOptionsScreen, 250, retries);
            return;
        }

        addOptsStyles();
        $(toggleBtn).before(optsDiv);

        $("#xscam-opts").on('click', testOutsideClick);

        $(".scam-cb").each(function(index, element) {
            $(element).on("change", handleScamOptsCbChange);
            let key = $(element).val();
            $(element)[0].checked = GM_getValue(key, false);
        });
    }

    function handleScamOptsCbChange(e) {
        e.stopPropagation();
        e.preventDefault();

        let node = $(e.currentTarget);
        let checked = $(node)[0].checked;
        let key = $(node).val();
        GM_setValue(key, checked);

        debug("Set option ", key, " to ", checked);

        return false;
    }

    function addOptsStyles() {
        addFlexStyles();
        addFloatingOptionsStyles();
        loadCommonMarginStyles();

        GM_addStyle(`
            .xscam-table {
                width: 90%;
                height: 90%;
                margin-top: 20px;
            }
            .xscamopts {
                display: flex;
                maxHeight: 150px;
            }
            #xscam-opts td {
                width: 33%;
            }
            #xscam-opts td span {
                /*margin-left: 25%;*/
                color: var(--crimes-baseText-color);
            }
            .xntcl {
                padding: 6px 0px 6px 28px !important;
                width: 58%;
            }
            .xntcr {
                padding: 6px 2px 6px 12px !important;
            }
            .xntcg {
                padding: 6px 12px 6px 12px !important;
            }
            .scam-cb {
                margin-right: 10px;
            }
        `);
    }

    var bannerWasHidden = false;
    function displayOptsWin(e) {
        e.preventDefault();

        let statsOpen = $(toggleBtn).attr("aria-expanded");
        log("stats open: ", statsOpen);

        let closeBtn = $("#crime-stats-panel").find("[class^='closeButton_']")[0];
        if (statsOpen == true || statsOpen == 'true') {
            log("clicking ", $(closeBtn));
            $(closeBtn)[0].click();
        }

        debug("displayOpts, opts height: ", $("#xscam-opts").css("height"));
        debug("displayOpts, banner height: ", $(bannerArea).css("height"), " (was hidden? ", bannerWasHidden, ")");

        if (parseInt($(bannerArea).css("height")) == 0) {
            //handleBannerBtn();
            $("#halo-div").click();
            bannerWasHidden = true;
        } else {
            if (bannerWasHidden == true) {
                //handleBannerBtn();
                $("#halo-div").click();
            }
        }

        if (!$(arrowBtns).hasClass("xhide")) {
            $(arrowBtns).addClass("xhide");
            $(arrowBtns).children().addClass("xhide");

            $(bannerWrapper).animate({
                opacity: 0,
            }, 750, function() {
                $(bannerWrapper).addClass("xhide");
                //$(bannerWrapper).css("opacity", "");
            });

            $("#xscam-opts").animate({
                height: "150px",
            }, 1000, function() {

            });
        } else {
            bannerWasHidden = false;
            $(arrowBtns).removeClass("xhide");
            $(arrowBtns).children().removeClass("xhide");
            $(bannerWrapper).removeClass("xhide");

            $(bannerWrapper).animate({
                opacity: 1,
            }, 1000, function() {
                $(bannerWrapper).css("opacity", "");
            });

            $("#xscam-opts").animate({
                height: "0px",
            }, 750, function() {

            });
        }

        return false;
    }

    // =================== Optional Banner Bar hiding ===========================
    var bannerHidden = false;
    var bannerHeight = 0;
    var initRetries = 0;
    const maxInitRetries = 50;

    // Elements/nodes
    var bannerArea;
    var toggleBtn;
    var bannerWrapper;
    var arrowBtns;

    function doHideBannerBar(retries=0) {
        bannerArea = $("[class^='currentCrime'] > [class^='bannerArea']");
        if (!$(bannerArea).length) {
            if (retries++ > 10) return;
            return setTimeout(doHideBannerBar, 250*retries, retries);
        }

        arrowBtns = $(bannerArea).find("[class*='arrowButtons__']")[0];
        toggleBtn = $(bannerArea).find("[class*='toggleStatsPanelButton__']")[0];
        bannerWrapper = $(toggleBtn).find("[class*='bannerWrapper__']")[0];

        if (bannerHeight == 0 && $(bannerArea).css("height") > 0) {
            bannerHeight = $(bannerArea).css("height");
        }
        if (bannerHeight == 0) bannerHeight = 150;

        addHideBannerBtn();

        // Functions local to 'doHideBannerBar()'

        function addHideBannerBtn(retries=0) {
            if ($("#halo-div").length == 0) {
                let haloDiv = `<div id="halo-div" class="center ctr44"></div>`;
                let haloDiv2 = `<div id="halo-div2" class="center halo ctr24"></div>`;
                let ctrBtn = $("[class^='currentCrime']").find("[class^='centerSlot']");
                if ($(ctrBtn).length == 0) {
                    if (retries++ < 10) return setTimeout(addHideBannerBtn, 500, retries);
                    return log("Failed to find center button");
                }
                $(ctrBtn).after(haloDiv);
                $(ctrBtn).after(haloDiv2);
            }
            displayHtmlToolTip($("#halo-div"),
                               "Click here to hide or show banner bar.<br>Right-click for options, " +
                               "right-click again to close.<br>Some options require a reload to take effect.",
                               "tooltip4 x-crime-tt");

            $("#halo-div").on('contextmenu', displayOptsWin);

            addClickHandlers();

            if (autoHideBanner) hideBanner(true);
        }

        var elInAnimation = false;
        function elementAnimate( element, size) {
            elInAnimation = true;
            $(element).animate({
                height: size,
            }, 1200, function() {
                elementHideShow(element);
                elInAnimation = false;
            });
        }

        function elementHideShow(element) {
            let dataval = $(element).attr("data-val");
            $(element).attr("data-val", "");
            if (dataval == "none") return;

            // Check for animate-specific data-val first
            if (dataval == "hide") {
                $(element).removeClass("xshow").addClass("xhide");
                return;
            }
            if (dataval == "show") {
                $(element).removeClass("xhide").addClass("xshow");
                return;
            }

            if ($(element).hasClass("xshow")) {
                $(element).removeClass("xshow").addClass("xhide");
            } else {
                $(element).removeClass("xhide").addClass("xshow");
            }
        }

        function handleHideBannerClick(e) {
            debug("click! e: ", e);
            e.preventDefault();
            hideBanner();
        }

        function addClickHandlers() {
            if (!$("#halo-div").hasClass("xtemp")) {
                $("#halo-div").addClass("xtemp");
                $("#halo-div").css("pointer-events", "auto");
                $("#halo-div").on('click', handleHideBannerClick);
            }
        }

        function handleBannerBtn(element, maxHeight) {
            if (elInAnimation) return;

            if ($(element).hasClass("xshow")) {
                $(element).attr("data-val", "hide");
                elementAnimate(element, 0);
            } else {
                $(element).removeClass("xhide").addClass("xshow");
                $(element).attr("data-val", "none");
                elementAnimate(element, maxHeight);
            }
        }

        function hideBanner(forceHide) {
            bannerArea = $("[class^='currentCrime'] > [class^='bannerArea']");
            if (forceHide && $(bannerArea).length == 0) return setTimeout(hideBanner, 250, true);

            if (bannerHeight == 0 && $(bannerArea).css("height") > 0) {
                bannerHeight = $(bannerArea).css("height");
            }

            if (forceHide) $(bannerArea).addClass("xshow");
            handleBannerBtn(bannerArea, bannerHeight);
        }
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

                // TEMPORARY
                $(btn).on('contextmenu', blowBubble2);
                $(btn).addClass('xedx-commit');
            }
        }

        // Abandon buttons: close accel window
        $("[class*='avatarButton_']").on('click.xedx', handleAbandon);

        function doBlowBubble(e) {
            log("doBlowBubble");
            blowBubble(0, e);
            return false;
        }

        setTimeout(checkCommitBtns, 10000);
    }

    function getAvatarPct(label) {
        if (label.indexOf('Young') > -1) return "1x";
        if (label.indexOf('Middle') > -1) return "1.25x";
        if (label.indexOf('Senior') > -1) return "1.50x";
        if (label.indexOf('Pro') > -1) return "3x";
        if (label.indexOf('Affluent') > -1) return "10x";
    }

    GM_addStyle(".xav-span {position: fixed; left: 50%; margin-left: -50%;top:50%;color:white;}");
    function addAvatarPcts() {
        let list = $("[class*='avatarButton_']");
        debug("Avatar list: ", list);
        if (!$(list).length) return;
        for (let idx=0; idx < $(list).length; idx++) {
            let btn = $(list)[idx];
            if ($(btn).hasClass("x-has-pct")) return;
            let label = $(btn).attr("aria-label");
            if (!label) return;
            let pct = getAvatarPct(label);
            if (!pct) return;
            let span = "<span class='xav-span'>" + pct + "</span>";
            $(btn).append(span);
            $(btn).addClass("x-has-pct");
        }
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
                if ($(target).index() == 3 || accelActive) {
                    $(target).on('contextmenu', doAccelRightClick);
                }
            }
        }
        setTimeout(checkRespBtns, 2000);
    }

    // ======================= Handle the skill display on top header. =======================

    const skillSpan = `<div id="xskill" style="display: inline-block">
                           <span id="xskill2" class="srh" style="display:inline-block; margin-left: 64px;">skill</span>
                           <span id="xskpct">&nbsp;(
                               <mark id="xskmark" class="xskill-white" style="background-color: transparent;">  </mark>
                           )</span>
                           <span id="xavail" class="xml10">avail</span>
                       </div>`;

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
    }

    function popBubble() {
        //return;

        log("Animate pop bubble");
        $("#bubble").animate(
            {
                height: "0px",
                width: "0px",
                opacity: 0
            }, 3000, function (){
                $("#bubble").remove();
            }
        );
    }

    var bubbleStyleLoaded = false;
    function loadBubbleStyleOnce() {
        if (bubbleStyleLoaded == true) return;
        GM_addStyle(`
            .bubble {
                position: fixed;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                top: 0;
                background-color: lightblue;
                z-index: 9999999;
            }
            #bubble span {
                display: flex;
                position: absolute;
                top: 50%;
                left: 50%;
                margin-left: -19px;
                margin-top: -6px;
                height: 30px;
                width: 30px;
                color: black;
                font-size: 11pt;
            }

            .bubble-an2 {
                animation-name: slide;
                animation-duration: 2s;
                animation-fill-mode: forwards;
                animation-iteration-count: 2;
                animation-direction: alternate;
            }
            @keyframes slide {
              from {
                left: 100%;
                opacity: .3;
                width: 0px;
                height: 0px;
                top: 0%;
              }
              to {
                left: 75%;
                opacity: 1.0;
                width: 50px;
                height: 50px;
                top: 35%;
              }
            }

            @keyframes slide2 {
              0% {
                left: 100%;
                opacity: .3;
                width: 0px;
                height: 0px;
                top: 0%;
              }
              80% {
                left: 70%;
                opacity: .6;
                width: 20px;
                height: 20px;
                top: 30%;
              }
              100% {
                left: 75%;
                opacity: 1.0;
                width: 50px;
                height: 50px;
                top: 35%;
              }
            }

            .bubble2 {
                left: 65%;
                width: 50px;
                height: 50px;
                top: 40%;
            }
        `);
        bubbleStyleLoaded = true;
    }

    /*
    @keyframes slide {
              from {
                left: 100%;
                opacity: .3;
                width: 0px;
                height: 0px;
                top: 0%;
              }
              to {
                left: 75%;
                opacity: 1.0;
                width: 50px;
                height: 50px;
                top: 35%;
              }
            }
    */

    function blowBubble(diff=0, e) {
        loadBubbleStyleOnce();
        lastCommit.valid = false;
        let bubble = $(`<div class="bubble bubble-an2" id="bubble"><span>+` + diff + `</span></div>`);

        $("body").append(bubble);
        log("Appended bubble: ", $(bubble));
        //$("#bubble").on('transitioned', function(){log("Remove bubble");$(this).remove()}); // didn't work...
        return; // setTimeout(popBubble, 4000);
    }

    function blowBubble2(diff=0, e) {
        loadBubbleStyleOnce();
        lastCommit.valid = false;
        let bubble = $(`<div class="bubble bubble2" id="bubble"><span>+` + diff + `</span></div>`);

        $(bubble).css("opacity", 0);
        $("body").append(bubble);
        log("Appended bubble: ", $(bubble));

        $("#bubble").animate({
            opacity: .4,
        }, 2000, function() {
            $("#bubble").animate({
                opacity: 1.0,
            }, 500, function() {
                setTimeout(popBubble, 4000);
            });
        });


        return setTimeout(popBubble, 4000);
    }

    var displayedSkill = 0;
    function updateSkillDisplay2() {
        if (!$("#xskill").length) return;

        let disp = parseFloat(displayedSkill) ? parseFloat(displayedSkill).toFixed(2) : 0;
        let curr = parseFloat(getStat("Skill")).toFixed(2);
        let diff = curr - disp;
        if (diff == curr) diff = 0;
        diff = diff.toFixed(2);
        if (disp == curr) return;

        // Experimental!
        if (funkyBubbles == true && lastCommit.valid == true) {
            log("Blowing bubble");
            blowBubble(diff);
            log("new bubble: ", $("#bubble"));
        setTimeout(function(){log("new bubble: ", $("#bubble"));}, 2000);
        }


        $("#xskill2").text(curr + '%');
        displayedSkill = curr;
        $("#xskmark").text(diff);

        if ((Number(diff) > 0) == true) {
            $("#xskmark").addClass("xskill-green").removeClass("xskill-red").removeClass("xskill-white");
        } else if ((Number(diff) < 0) == true) {
            $("#xskmark").addClass("xskill-red").removeClass("xskill-green").removeClass("xskill-white");
        }
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
        let dataObj = {};

        let html = buildTheData();
        displayTableData(html);

        // Functions local to this one....

        function displayTableData(html) {
            let doDownload = false;
            if (confirm("Save table data to file?\r\nOK to save and view,\r\nCancel to view only.")) doDownload = true;

            var newWin = open("", "_blank",
                  "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=760,height=450");

            newWin.document.body.innerHTML = html;
            if (doDownload == true) doTableSave(newWin);
            newWin.focus();
        }

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

        function buildTheData() {
            let missedPredictionsdiv = "";
            if (writeMissedPredictions == true) {
                missedPredictionsdiv = "<div id='myTest'><ul>";
                let lastIdx = GM_getValue("lastWriteIdx", 0);
                if (lastIdx < 1) return;

                // Build missed predictions. Prob no longer need,
                // since self-healing - just updated tables?
                for (let idx=1; idx <= lastIdx; idx++) {
                    let key = "miss_" + idx;
                    let val = GM_getValue(key, "");
                    dataObj[key] = val;
                    missedPredictionsdiv += logTheObj(JSON.parse(val));
                }
                missedPredictionsdiv += "</ul></div>";
            }

            // Build tables div
            let t1 = buildTableHtml(idxMoveArray);

            let result = `
                <h1>` + GM_info.script.name + ' version ' +
                GM_info.script.version + `</h1>` + //<br><input id="btn1" type="button" value="save">` +
                missedPredictionsdiv + `<br>` + t1 +
                buildTableHtml(idxMoveArray20) +
                buildTableHtml(idxMoveArray40) +
                buildTableHtml(idxMoveArray60) +
                buildTableHtml(idxMoveArray80);

            return result;
        }

        function doTableSave(newWin) {
            let sep = "\r\n";
            let tableStrs =
                buildTableDataStr(idxMoveArray) + sep +
                buildTableDataStr(idxMoveArray20) + sep +
                buildTableDataStr(idxMoveArray40) + sep +
                buildTableDataStr(idxMoveArray60) + sep +
                buildTableDataStr(idxMoveArray80);

            downloadTableData(tableStrs, newWin);
        }

        function buildTableDataStr(arr) {
            let result = arr.name + ' = { name: "' + arr.name + '", ';
            let row = "";
            for (let acc=0; acc<6; acc++) {
                row +=  acc + ": [";
                for (let btn=0; btn<3; btn++) {
                    let e = arr[acc][btn];
                    row += "[" + e[0] + ", " + e[1] + "]";
                    if (btn<2) {
                        row += ", ";
                    } else {
                        if (acc < 5) row += "], ";
                        else row += "]";
                    }
                }
                result += row;
                row = "";
            }
            result += "}";

            return result;
        }

        function buildTableHtml(arr) {
            let result = "<div><h3>" + arr.name + "</h3><ul>";
            let li = "";
            for (let acc=0; acc<6; acc++) {
                li += "<li>" + acc + ": [";
                for (let btn=0; btn<3; btn++) {
                    let e = arr[acc][btn];
                    li += "[" + e[0] + ", " + e[1] + "]";
                    if (btn<2) {
                        li += ", ";
                    } else {
                        if (acc < 5) {
                            li += "], ";
                        } else {
                            li += "]";
                        }
                    }
                }
                li += "</li>";
                result += li;
                li = "";
            }
            result += "</ul></div>";

            return result;
        }

        function downloadTableData(data, theWin) {
            let blobx = new Blob([data], { type: 'text/plain' }); // ! Blob
            let elemx = theWin.document.createElement('a');
            elemx.href = theWin.URL.createObjectURL(blobx); // ! createObjectURL
            elemx.download = "scamming-table-data.txt";
            elemx.style.display = 'none';
            document.body.appendChild(elemx);
            elemx.click();
            document.body.removeChild(elemx);
        }
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

            $("#x-scam-help-btn").after(saveBtnRight);
            $("#x-scam-save-btn").on('click', handleSaveButton);
            displayHtmlToolTip($("#x-scam-save-btn"), "View (and optionally save)<br>auto-corrected range predictions.", "tooltip4");

            if (writeMissedPredictions == true) {
                $("#x-scam-save-btn").after(clearBtnRight);
                $("#x-scam-clear-btn").on('click', handleClearButton);
                displayHtmlToolTip($("#x-scam-clear-btn"), "Clear saved range prediction data", "tooltip4");
            }
        }

        if (optDisplaySkill == true) {
            addSkillDisplay();
            skillTimer = setInterval(updateSkillDisplay2, 2000);
        }
    }

    // ============================ Handle page changes =======================

    function handlePageLoad() {
        if (isScammingPage() == false) {  // should never get here...
            return log("handlePageLoad, not on scamming: ", location.hash);
        }

        installObservers();
        addHelpBtn();
        if (supportBannerBarHide == true)
            doHideBannerBar();

        if (enableScrollLock == true)
            doScrollLock();

        addOptionsScreen();

        // could use observers...
        //setTimeout(addAvatarPcts, 2000);
        setTimeout(updateAvailable, 2000);
    }

    function removeCommitHandlers() {
        $(".commit-button").removeClass("xedx-commit");
        $(".commit-button").off('click.xedx');
    }

    function removeResponseHandlers() {
        $(".response-type-button").removeClass("xedx-resp");
        $(".response-type-button").off('click.xedx');
    }

    var hashChanged = false;
    function hashChangeHandler() {
        debug("Hash change detected: ", location.hash);
        if (isScammingPage() == false) {
            return log("hashChangeHandler, not on scamming: ", location.hash);
        }
        setTimeout(handlePageLoad, 500);
    }

    function pushStateChanged(e) {
        debug("pushStateChanged: ", e);
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
            .xskill-red {color: red;}
            .xskill-white {color: white;}

            .xedx {border: 1px solid blue !important;}
            .xedx-resp {border: 1px solid blue !important;}
            .xedx-commit {border: 1px solid blue !important;}
            .x-surround {
                position: absolute;
                border-bottom: 0 !important;
                border: 1px solid ` + rangeColor + `;
                height: 14px;
                top: -6px;
            }
            .x-accel {
                position: absolute;
                border-top: 0 !important;
                border: 1px solid ` + accelColor + `;
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

        // Hide banner bar/halo styles
        GM_addStyle(`
            .center {
                  position: absolute;
                  top:0;
                  bottom:0;
                  left: 44%;
                  right: 40%;
                  margin-top: -26px !important;
                  margin:15px;
                  padding:10px;
                  font-size: large;
                  z-index: 1;
                  color: white;
                  cursor: pointer;
             }
             .ctr44 {
                  height: 44px;
                  width: 44px;
                  border-radius: 44px;
                  border: 0px solid blue;
             }
             .ctr24 {
                  left: 47%;
                  right: 40%;
                  margin-top: -4px !important;
                  height: 2px;
                  width: 2px;
                  border-radius: 10px;
                  border: 0px solid green;
             }
             .halo {
                 box-shadow: 0 0 50px 8px #48abe0;
             }
        `);

        // New choose acceleration div styles
        GM_addStyle(`
            .acc-zdx {z-index: 9999999;}
            .acc-prompt {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-content: center;
                height: 0px;
                width: auto;
                background: #101010;
            }
            .acc-cb {
                height: 20px;
                width: 40px;
                margin-bottom: 5px;
                margin-left: 20px;
            }
            .acc-ok {
                margin-left: 10px;
                margin-bottom: 5px;
            }
            .acc-cancel {
                margin-left: 20px;
                margin-bottom: 5px;
            }
            .acc-lbl {
                margin-top: 5px;
            }
        `);
    }

})();



