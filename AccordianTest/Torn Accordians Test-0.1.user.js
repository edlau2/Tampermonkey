// ==UserScript==
// @name         Torn Accordians Test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.1.js
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


// @xrequire      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers-2.45.1.js

(function() {
    'use strict';

    const sidebarSel = "#sidebarroot";

    function animateDone() {
        log("[animateDone]");
    }

    var inAnimation = false;
    function toggleSidebar() {
        let newWidth = 0;
        let currWidth = parseInt($(sidebarSel).css("width"));
        if (currWidth < 20) newWidth = 172;

        $( sidebarSel ).animate({
            width: newWidth,
        }, 1200, function() {
            //animateDone();
            //inAnimation = false;
        });
    }

    function handleBtnClick() {
        log("Inside my handler!");
        toggleSidebar();
    }

    function handlePageLoad() {
        log("sel: ", $("#skip-to-content"));
        addTopBarButton(toggleSidebar, "acc-test", "Test");
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    //versionCheck();

    addTornButtonExStyles();
    callOnContentLoaded(handlePageLoad);

})();