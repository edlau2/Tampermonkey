// ==UserScript==
// @name         Torn PDA Tests
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script tests for PDA compliance
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @connect      api.torn.com
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

(function() {
    'use strict';

    console.log("Torn PDA Tests started");
    console.log("Test GM_info.script.name");

    try {
    console.log("Script name: ", GM_info.script.name);
    } catch (err) {
        console.log("Failed! ", err);
    }

    function log(...data) { console.log(GM_info.script.name + ': ', ...data); };

    console.log("Test 'log' function");
    log("If you see this it works");

    log("quick jquery test");
    log("sidebarroot: ", $('#sidebarroot').length);

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging


})();