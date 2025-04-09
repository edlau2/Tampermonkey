// ==UserScript==
// @name         Torn Custom Chat 3.0
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  This script does...
// @author       xedx [2100735]
// @run-at       document-start
// @match        https://www.torn.com/*
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    const xedx_addStyle = function(styles) {
        (typeof GM_addStyle != "undefined") ?
            GM_addStyle(styles) :
            (styles) => {
                const styleElement = document.createElement("style");
                styleElement.setAttribute("type", "text/css");
                styleElement.innerHTML = styles;
                document.head.appendChild(styleElement);
            }
    };

    xedx_addStyle(`
        .item___ydsFW {
            width: 260px;
        }
        .root___Xw4jI {
            font-family: arial !important;
            font-size: 14px !important;
            /*color: lightblue !important;*/
        }
        .root___NVIc9 {
            background-color: transparent !important;
        }
        .root___NVIc9:not(.self___IbPax) span {
            color: lightblue !important;
        }
        .self___IbPax span {
            color: red !important;
        }

        .root___NVIc9.self___IbPax {
            border: 1px solid pink !important;
        }
    `);

})();