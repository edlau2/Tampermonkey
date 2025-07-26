// ==UserScript==
// @name         Torn PDA Tests
// @namespace    http://tampermonkey.net/
// @version      1.0.4
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

    const viewPortWidthPx = window.innerWidth;
    const isMobileView = viewPortWidthPx <= 784;
    const isTampermonkeyEnabled = typeof unsafeWindow !== 'undefined';

    console.log("Torn PDA Tests started");
    console.log("Test GM_info.script.name");

    if (GM_info.script.name === undefined)
        GM_info.script.name = "Torn PDA Tests";

    try {
        console.log("GM_info: ", JSON.stringify(GM_info, null, 4));
        console.log("Script name: ", JSON.stringify(GM_info.script.name, null, 4));
        console.log("isTampermonkeyEnabled: ", isTampermonkeyEnabled, " isMobileView: ", isMobileView);
    } catch (err) {
        console.log("Failed! ", err);
    }

    function log(...data) { console.log(GM_info.script.name + ': ', ...data); };

    console.log("Test 'log' function");
    log("If you see this it works");

    log("quick jquery test");
    log("sidebarroot: ", $('#sidebarroot').length);

    let debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging
    log("GM_getValue returned: ", debugLoggingEnabled);

    GM_setValue("debugLoggingEnabled", true);    
    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);
    log("GM_getValue 2 returned: ", debugLoggingEnabled);

})();
