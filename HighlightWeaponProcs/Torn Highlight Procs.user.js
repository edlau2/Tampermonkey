// ==UserScript==
// @name         Torn Highlight Procs
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Make it obvious what bonuses proc'd in a fight
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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

    // If not configured to highlight on attack page, return immediately.
    const filterAttackPg = GM_getValue("filterAttackPg", null);
    if (!filterAttackPg) GM_setValue("filterAttackPg", true);
    if (!filterAttackPg || filterAttackPg == false && isAttackPage()) return;

    const myUID = getPlayerId();
    const xedxDevMode = (myUID == '2100735');

    // Used just by me, to see when my revit proc's
    var revitProcsTotal = GM_getValue("revitProcsTotal", 0);
    var totalBT9Finishes = GM_getValue("totalBT9Finishes", 0);
    GM_setValue("revitProcsTotal", revitProcsTotal);
    GM_setValue("totalBT9Finishes", totalBT9Finishes);

    // Mutation observer stuff
    const options = {attributes: true, childList: true, characterData: true, subtree: true};
    var targetSel = "#log-list-scrollbar";
    var sid = getPageSid();
    var listObserver;

    function getPageSid() {
        const params = new URLSearchParams(window.location.search);
        return params.get('sid').trim();
    }

    // This array comes from a helper script used in the Wiki page, and don't feel like
    // change the case of everything by hand, so will create a new lower-case array dynamically
    // to use in checking an attack event to see if it a bonus event.
    const weaponBonusesFromWiki = ['Achilles', 'Assassinate', 'Backstab', 'Berserk', 'Bleed', 'Blindside', 'blindsided', 'Bloodlust',
                                   'Comeback', 'Conserve', 'Cripple', 'crippled', 'Crusher', 'Cupid', 'Deadeye', 'Deadly', 'Disarm', 'disarmed',
                                   'Double-edged', 'Double Tap', 'Empower', 'empowered', 'Eviscerate', 'eviscerated', 'Execute', 'executed',
                                   'exposed', 'Expose', 'Finale', 'Focus', 'Frenzy', 'Fury', 'Grace', 'Home Run', 'Irradiate', 'irradiated',
                                   'Motivation', 'motivated', 'Paralyzed', 'Parry', 'Penetrate', 'Plunder', 'Powerful', 'Proficience',
                                   'Puncture', 'punctured', 'Quicken', 'Rage', 'Revitalize', 'Roshambo', 'Slow', 'Smurf', 'Specialist',
                                   'Stricken', 'Stun', 'stunned', 'Suppress', 'Sure Shot', 'Throttle', 'Warlord', 'Weaken', 'weakened', 'Wind-up',
                                   'Wither', 'withered'];

    var weaponBonuses = [];

    // I don't feel like coming up with 52 diff colors for each bonus, so will cycle
    // through a small handfull
    const iconColors = ["darkorchid", "plum", "lightseagreen", "royalblue",
                        "tomato", "goldenrod", "lightsalmon"];

    function convertArrayToLower() {
        for (let idx=0; idx<weaponBonusesFromWiki.length; idx++) {
            weaponBonuses.push(weaponBonusesFromWiki[idx].toLowerCase());
        }
    }

    function getAllAttackEvents() {return $("[class^='attacking-events-']");}

    // Special fn just to see if my BT MP9 revit proc'd, useless for
    // anyone else. Will eventually make generic...
    var finHitLogged = false, revitCounted = false, failedRetries = 0;
    function checkSpecialBt9(retries=0) {
        if (xedxDevMode == false || finHitLogged == true || failedRetries > 10) return;
        let nodeList = document.querySelectorAll("span[class*='attacking-events-attack-win']");

        // If any event signalling 'complete', stop script!
        let node = $(".attacking-events-attack-win");
        if (!$(node).length) {
            if (retries++ < 20 && finHitLogged != true)
                return setTimeout(checkSpecialBt9, 200, retries);
            failedRetries++;
            return log("Too many retries!");
        }
        let msgSpan = $(node).parent().parent().find("[class*='message_'] > span");
        if (!$(msgSpan).length) {
            debug("Msg not found! trying again.Node: ", $(node), " msgSpan: ", $(msgSpan));
            msgSpan = $(node).parent().find("[class*='message_'] > span")[0];

            if (!$(msgSpan).length) {
                debug("Msg not found! ", $(node).parent(), " msgSpan: ", $(msgSpan));
                return false;
            }
        }
        let text = $(msgSpan).text();
        if (!text) {
            debug("No text! ", $(msgSpan));
            return false;
        }
        if (text.indexOf("MP9") > -1) {
            finHitLogged = true;
            +totalBT9Finishes++;
            GM_setValue("totalBT9Finishes", totalBT9Finishes);
            debug("totalBT9Finishes: ", totalBT9Finishes, " revitProcsTotal: ", revitProcsTotal);
        }

        debug((finHitLogged == true) ?
            ("finHitLogged."): ("*** finHitLogged NOT logged! ***"));

        finHitLogged = true;
        return true;
    }

    var procsArr = [];    // Global array of: procEvent{bonus: <name>, element: <el>}
    function filterAttackEvents(events) {
        if (!$(events).length) return events;
        if (xedxDevMode == true && finHitLogged == false) checkSpecialBt9();

        for (let idx=0; idx<$(events).length; idx++) {
            let node = $(events)[idx];
            let eventClass = node.className;
            if (!eventClass) continue;

            let parts = eventClass.split('-');
            let attackEvent = parts[2];
            if (parts.length > 3) {                    // Cheezy way to handle the few bonuses that are
                for (let j=3; j<parts.length; j++) {   // more than one word, or hyphenated. "Home Run",
                    attackEvent += '-' + parts[j];     // "Double-Edged"...
                }
            }
            if (weaponBonuses.includes(attackEvent.toLowerCase())) {
                procsArr.push({name: attackEvent, element: node});
            }
        }
    }

    function addTitleBarMsg(msg) {
        if ($("#rvt-msg").length > 0) return;
        let msgSpan = '<span id="rvt-msg"></span>';
        let target = $("[class^='titleContainer_'] > h4");
        log("Msg Target: ", $(target));
        $(target).after(msgSpan);
        $("#rvt-msg").text(msg);
    }

    function addProcEventIcon(event) {
        let name = event.name;
        let node = event.element;
        let parent = $(node).parent();
        debug("addProcEventIcon, parent: ", $(parent));
        let test = $(parent).find(".xx-procIconClass")[0];
        if (test && $(test).length > 0) {
            debug("Has icon: ", $(test));
            return;
        }
        let index = weaponBonuses.indexOf(name.toLowerCase());
        let pHeight = $(parent).css("height");
        let color = iconColors[index % iconColors.length];
        let iconDiv = "<div class='xx-procIconClass'><span style='margin-left: 0px;'></span></div>";

        // Picking colors sucks, log what I got if I need to change it...
        debug("Selected color for ", name, ": ", color);

        // Add it. Modify parent LI so we can adjust spacing.
        $(parent).css("display", "flex");
        $(node).after(iconDiv);
        iconDiv = $(parent).find(".xx-procIconClass")[0];

        let spanText = " " + weaponBonusesFromWiki[index] + " ";
        let innerSpan = $(iconDiv).find("span")[0];
        $(innerSpan).text(spanText);

        // Make div width a little bigger
        let divWidth = parseInt($(iconDiv).outerWidth());
        let newDivWidth = divWidth + 10;
        let styleStr = "width: " + newDivWidth + "px !important;  background-color: " + color + ";";
        $(iconDiv).attr("style", styleStr);

        // Shift sib span a bit left, should really resize a bit smaller as well, or use % widths....
        let msgNode = $(parent).find(".message")[0];
        $(msgNode).css("margin-left", "5px");

        // Special case for my revit...
        if (xedxDevMode == true && name.indexOf('revit') > -1) {
            try {
                if (revitCounted == true) return log("Revit proc already counted");
                +revitProcsTotal++;
                GM_setValue("revitProcsTotal", revitProcsTotal);
                let pct = (Number(revitProcsTotal)/Number(totalBT9Finishes)) * 100;
                pct = pct.toFixed(2);
                let msg = "Revit Proc'd! (" + revitProcsTotal + "/" + totalBT9Finishes + ", " + pct + "%)";
                addTitleBarMsg(msg);
            } catch (error) {
                debugger;
                console.error("An error occurred:", error);
                alert("Revit proc error!");
            }
        }
    }

    function addIconStyle() {
        GM_addStyle(`
            #rvt-msg {
                position: absolute;
                left: 25%;
                font-size: 14pt;
                color: var(--attack-header-text-color);
            }
            .xx-procIconClass {
                border-radius: 10px;
                height: 12px;
                display: inline-block;
                opacity: 1.0;
                overflow: auto;
                margin-left: 10px;
                padding: 6px 0px 6px 0px;
            }
            .xx-procIconClass span {
                width: fit-content !important;
                font-size: 12px;
                text-align: center;
                color: white;
                display: table-cell;
                vertical-align: middle;
            }
            `);
    }

    // Test URL
    // https://www.torn.com/loader.php?sid=attackLog&ID=de50a89dc3bc88edd2823ce99a337ed8
    var lastEventIdx = 0;
    function handlePageLoad() {
        debug("handlePageLoad");
        addIconStyle();
        addObserver();
        parseEvents();
    }

    function addObserver(retries=0) {
        listObserver = new MutationObserver(parseEvents);
        debug("target: ", $(targetSel));
        if (!$(targetSel).length) {
            if (retries++ < 10) return setTimeout(addObserver, 500, retries);
            return;
        }
        listObserver.observe($(targetSel)[0], options);
    }

    const observerOn = function () {
        if (listObserver && $(targetSel).length) {
            listObserver.observe($(targetSel)[0], options);
            return true;
        }
        else {
            debug("Error: Unable to start observer! ", $(targetSel));
            return false;
        }
    }

    const observerOff = function () {
        if (listObserver) listObserver.disconnect();
    }

    function parseEvents() {
        let attackEvents = getAllAttackEvents();
        filterAttackEvents(attackEvents);

        let idx = lastEventIdx;
        observerOff();
        for (idx=lastEventIdx; idx<procsArr.length; idx++) {
            let procEvent = procsArr[idx];
            addProcEventIcon(procEvent);
        }
        observerOn();

        lastEventIdx = idx;
    }

    // Have to be on attack log page, or attack complete (?) page
    // Attack log URL: www.torn.com/loader.php?sid=attackLog&ID=<log ID>
    // RN only valid on log page.
    function validatePageUrl() {
        return (sid == 'attackLog' || sid == 'attack');
    }

    function setTargetSelector() {
        if (sid == "attackLog")
            targetSel = "#log-list-scrollbar";
        else if (sid == "attack")
            targetSel = "div[class*='logStatsWrap_'] > div[class*='log_'] > div > ul";

        debug("Set target selector: ", targetSel);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point, above is globals, consts and functions.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    if (!validatePageUrl()) return debug("Not on valid page, going home.");

    setTargetSelector();
    convertArrayToLower();
    callOnContentLoaded(handlePageLoad);

})();



