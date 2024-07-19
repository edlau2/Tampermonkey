// ==UserScript==
// @name         Torn TTS Helpers
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Misc. functions to run in adjunct to Torn Total Solutions
// @author       xedx [2100735]
// @match        https://www.torn.com/index.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

// https://github.com/edlau2/Tampermonkey/raw/master/TornTotalSolution/Torn%20TTS%20Helpers.user.js

(function() {
    'use strict';

    // ======= Functions to support home page sorting/dragging events

    var sortListenerEnabled = false;
    function instSortableListListener() {

        $( ".sortable-list" ).on( "sortstop", function( event, ui ) {
            if (sortListenerEnabled) handleListChangeStop(event);
        } );

        debug("Installed listener for moveable page DIVs");

        log("readystate: ", document.readyState);
        if (document.readyState == "complete") {
            restoreNodePositions();
        } else {
            $(window).on("load", function () {
                restoreNodePositions();
            });
        }
    }

    function restoreNodePositions() {
        let checkIds = ["xedx-mjailstats-ext-div", "xedx-mdrugstats-ext-div",
                        "xedx-mstats-tracker", "xedx-mattacks-ext",
                        // Older names:
                        "xedx-jailstats-ext-div", "xedx-drugstats-ext-div",
                        "xedx-stats", "xedx-attacks-ext"];

        for (let idx=0; idx < checkIds.length; idx++) {
            let myId = checkIds[idx];
            let sibId = GM_getValue(myId, undefined);
            log("Saved sib ID for my ID ", myId, " is: ", sibId);
            if (sibId) moveElement(sibId, myId);
        }

        // Now can turn on listener...
        sortListenerEnabled = true;
    }

    function moveElement(sibId, elementId) {
        let sibSel = "#" + sibId;
        let nodeSel = "#" + elementId;

        debug("Moving ", nodeSel, " under node ", sibSel);
        $(sibSel).after($(nodeSel));
    }

    let oldNames = ["xedx-jailstats-ext-div", "xedx-drugstats-ext-div",
                    "xedx-stats", "xedx-attacks-ext"];
    function handleListChangeStop(event) {
        let list = event.target;
        let len = $(list).length;

        let myDivs = $(list).find("div[id^='xedx-m']");
        for (let idx=0; idx < $(myDivs).length; idx++) {
            let myNode = $(myDivs)[idx];
            saveNodePrevSibling(myNode);
        }

        // Temp, older names.
        if ($(myDivs).length == 0 && true) {
            for (let idx=0; idx < oldNames.length; idx++) {
                let sel = "#" + oldNames[idx];
                if ($(sel).length > 0) {
                    let myNode = $(sel);
                    saveNodePrevSibling(myNode);
                }
            }
        }
    }

    function saveNodePrevSibling(myNode) {

        let prevSib = $(myNode).prev();
        let sibId = $(prevSib).attr("id");
        let myId = $(myNode).attr("id");
        let nodeSel = "#" + myId;

        log("saveNodePrevSibling sib data: ", myId, " ==> ", sibId);

        GM_setValue(myId, sibId);

        return sibId;
    }

    // ======= End test home page sorting/dragging events

    // This called when page is loaded, not complete. an call anything from here,
    // at present only calls one function.
    function handlePageLoad() {
        instSortableListListener();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    callOnContentLoaded(handlePageLoad);

})();