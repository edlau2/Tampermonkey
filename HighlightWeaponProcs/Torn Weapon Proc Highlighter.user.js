// ==UserScript==
// @name         Torn Weapon Proc Highlighter
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Make it obvious what bonuses proc'd in a fight
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @xrequire      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    let api_key = "###PDA-APIKEY###";
    if (api_key.charAt(0) === "#") {
        console.log("WPH: Running under Torn PDA");
    } else {
        console.log("WPH NOT running under Torn PDA");
    }

    function getPageSid() {
        const params = new URLSearchParams(window.location.search);
        return params.get('sid');
    }

    // This array comes from a helper script used in the Wiki page, and don't feel like
    // change the case of everything by hand, so will create a new lower-case array dynamically
    // to use in checking an attack event to see if it a bonus event.
    const weaponBonusesFromWiki = ['Achilles', 'Assassinate', 'Backstab', 'Berserk', 'Bleed', 'Blindside', 'Bloodlust',
                           'Comeback', 'Conserve', 'Cripple', 'Crusher', 'Cupid', 'Deadeye', 'Deadly', 'Disarm',
                           'Double-edged', 'Double Tap', 'Empower', 'Eviscerate', 'Execute', 'Expose', 'Finale',
                           'Focus', 'Frenzy', 'Fury', 'Grace', 'Home Run', 'Irradiate', 'Motivation', 'Paralyzed',
                           'Parry', 'Penetrate', 'Plunder', 'Powerful', 'Proficience', 'Puncture', 'Quicken',
                           'Rage', 'Revitalize', 'Roshambo', 'Slow', 'Smurf', 'Specialist', 'Stricken', 'Stun',
                           'Suppress', 'Sure Shot', 'Throttle', 'Warlord', 'Weaken', 'Wind-up', 'Wither'];

    var weaponBonuses = [];

    // I don't feel like coming up with 52 diff colors for each bonus, so will cycle
    // through a small handfull
    const iconColors = ["darkorchid", "plum", "lightseagreen", "royalblue",
                        "tomato", "gold", "lightsalmon"];

    function convertArrayToLower() {
        for (let idx=0; idx<weaponBonusesFromWiki.length; idx++) {
            weaponBonuses.push(weaponBonusesFromWiki[idx].toLowerCase());
        }
    }

    function getAllAttackEvents() {
        let allNodes = $("[class^='attacking-events-']");
        return allNodes;
    }

    // Global array of: procEvent{bonus: <name>, element: <el>}
    var procsArr = [];

    function filterAttackEvents(events) {
        if (!$(events).length) return events;

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

    function addProcEventIcon(event) {
        let name = event.name;
        let node = event.element;
        let parent = $(node).parent();
        let index = weaponBonuses.indexOf(name.toLowerCase());
        let pHeight = $(parent).css("height");
        let color = iconColors[index % iconColors.length];
        let iconDiv = "<div class='xx-procIconClass'><span style='margin-left: 0px;'></span></div>";

        // Picking colors sucks, log what I got if I need to change it...
        log("Selected color for ", name, ": ", color);

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
    }

    function addIconStyle() {
        GM_addStyle(`
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

    function handlePageLoad() {
        addIconStyle();

        let attackEvents = getAllAttackEvents();
        filterAttackEvents(attackEvents);

        for (let idx=0; idx<procsArr.length; idx++) {
            let procEvent = procsArr[idx];
            addProcEventIcon(procEvent);
        }
    }

    // Have to be on attack log page, or attack complete (?) page
    // Attack log URL: www.torn.com/loader.php?sid=attackLog&ID=<log ID>
    // RN only valid on log page.
    function validatePageUrl() {
        let sid = getPageSid();
        log("[validatePageUrl] sid: ", getPageSid());

        if (getPageSid() == 'attackLog') return true;

        return false;
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point, above is globals, consts and functions.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    if (!validatePageUrl()) {
        debug("Not on valid page, going home.");
        return;
    }

    convertArrayToLower();

    callOnContentLoaded(handlePageLoad);

})();



