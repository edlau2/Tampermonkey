// ==UserScript==
// @name         Torn Item Market Scroll-Lock
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Makes Item Market sections independently scrollable.
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=ItemMarket*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    console.log("Torn Item Market Scroll-Lock Started");

    GM_addStyle(`
        [class^='categoryGroups_'] {
            position: sticky;
            top: 0;
            max-height: 80vh;
            overflow-y: scroll;
            overflow-x: hidden;
        }
    `);

})();