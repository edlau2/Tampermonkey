// ==UserScript==
// @name         Torn Tampermonkey Template
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @include      https://www.torn.com/
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    function handlePageLoad() {
        // Can check for any required DIV here and setTimeout() if not available,
        // or trigger any required API calls...
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    callOnContentLoaded(handlePageLoad);

})();
