// ==UserScript==
// @name         Torn Weapon Proc Highlights for PDA
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Make it obvious what bonuses proc'd in a fight
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php*
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    // ==========================================================================================
    // Common stuff normally defined in a library. Cut and past in until I find a better way...
    // ==========================================================================================

    const loggingEnabled = true;

    // Just spit out the name of the script at startup
    const logScriptStart = function () {
        console.log(GM_info.script.name + ' version ' +
                    GM_info.script.version + ' script started, library version ' + thisLibVer);
    }

    function log(...data) {
        if (loggingEnabled) {
            console.log(GM_info.script.name + ': ', ...data);
        }
    }

    // Call the callback once page content loaded (readystate is still interactive)
    function callOnContentLoaded(callback) {
        if (document.readyState == 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    // Create an element from an HTML string
    // Note: could use "const template = document.createElement('template');"
    function createElementFromHTML(htmlString) {
        var div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstChild;
        //return div.childNodes;    // Change .firstChild to div.childNodes to support multiple top-level nodes.
    }

    // Insert a new node (newNode) after another (refNode). Replaces JQuery .after()
    function insertAfter(newNode, refNode) {
        refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
    }

    // ==========================================================================================

    // Just a test, don't need it...
    let api_key = "###PDA-APIKEY###";
    if (api_key.charAt(0) === "#") {
        console.log("WPH: NOT running under Torn PDA");
    } else {
        console.log("WPH running under Torn PDA!");
    }

    function getPageSid() {
        const params = new URLSearchParams(window.location.search);
        return params.get('sid');
    }

    const iconDivHtml = "<div class='xx-procIconClass'><span style='margin-left: 0px;'></span></div>";

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

    // Global array of: procEvent{bonus: <name>, element: <el>}
    var procsArr = [];

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
        let allNodes = document.querySelectorAll("[class^='attacking-events-']");
        return allNodes;
    }

    function filterAttackEvents(events) {
        if (!events) return events;

        for (let idx=0; idx < events.length; idx++) {
            let node = events[idx];
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

    function addProcEventIconOld(event) {
        let name = event.name;
        let node = event.element;
        let parent = node ? node.parentNode : undefined;
        if (!parent) {
            return log("Error finding parent!");
        }
        let index = weaponBonuses.indexOf(name.toLowerCase());
        let pHeight = parent.style.height;
        let color = iconColors[index % iconColors.length];
        //let iconDiv = "<div class='xx-procIconClass'><span style='margin-left: 0px;'></span></div>";

        let iconDiv = createElementFromHTML(iconDivHtml);
        log("iconDiv: ", iconDiv);

        // Picking colors sucks, log what I got if I need to change it...
        log("Selected color for ", name, ": ", color);

        // Add it. Modify parent LI so we can adjust spacing.
        parent.style.display = "flex";

        // =============== Here down needs adjusting... ===================
        //$(node).after(iconDiv);
        insertAfter(iconDiv, node);
        //node.parentNode.insertBefore(iconDiv, node.nextSibling);


        //iconDiv = $(parent).find(".xx-procIconClass")[0];
        iconDiv  = parent.querySelectorAll(".xx-procIconClass")[0];

        let spanText = " " + weaponBonusesFromWiki[index] + " ";
        //let innerSpan = $(iconDiv).find("span")[0];
        let innerSpan = iconDiv.querySelectorAll("span")[0];

        //$(innerSpan).text(spanText);
        innerSpan.innerText = spanText;

        // Make div width a little bigger
        //let divWidth = parseInt($(iconDiv).outerWidth());
        let divWidth = parseInt(iconDiv.style.width);
        let newDivWidth = divWidth + 10;

        // For pure js...
        //let widthStr = newDivWidth + "px !important";
        //let colorStr = "background-color: " + color;
        //iconDiv.style.width = widthStr;
        //iconDiv.style.backgroundColor = colorStr;

        let styleStr = "width: " + newDivWidth + "px !important;  background-color: " + color + ";";
        iconDiv.style = styleStr;

        //let styleStr = "width: " + newDivWidth + "px !important;  background-color: " + color + ";";
        //$(iconDiv).attr("style", styleStr);

        // Shift sib span a bit left, should really resize a bit smaller as well, or use % widths....
        //let msgNode = $(parent).find(".message")[0];
        //$(msgNode).css("margin-left", "5px");

        let msgNode = parent.querySelectorAll(".message")[0];
        if (msgNode) msgNode.style.marginLeft = "5px";
    }

    // ================== to here ........ =======================

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

    //logScriptStart();
    //versionCheck();

    if (!validatePageUrl()) {
        log("Not on valid page, going home.");
        return;
    }

    convertArrayToLower();
    callOnContentLoaded(handlePageLoad);

})();



