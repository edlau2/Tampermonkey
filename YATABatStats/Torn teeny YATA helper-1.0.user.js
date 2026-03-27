// ==UserScript==
// @name         Torn teeny YATA helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script does...
// @author       xedx [2100735]
// @match        https://yata.yt/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // This is for https://yata.yt/faction/war/*
    GM_addStyle(`
        tr.faction-targets-refresh:hover {
            background-color: rgba(0, 161, 99, 0.3) !important;
        }
    `);

})();