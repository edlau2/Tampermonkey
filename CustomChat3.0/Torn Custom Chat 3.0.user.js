// ==UserScript==
// @name         Torn Custom Chat 3.0
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script does...
// @author       xedx [2100735]
// @run-at       document-start
// @match        https://www.torn.com/*
// @grant        unsafeWindow
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .root___Xw4jI {
            font-family: arial !important;
            font-size: 14px !important;
            color: lightblue !important;
        }
        .root___NVIc9, .root___NVIc9.self___IbPax {
            background-color: transparent;
        }
    `);

})();