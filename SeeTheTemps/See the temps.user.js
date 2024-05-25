// ==UserScript==
// @name         See the temps
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Remove haze around defender to see temps before attack.
// @author       _syntaxera_
// @match        https://www.torn.com/loader.php?sid=attack*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    GM_addStyle ( `
        .defender___2q-P6 {
            background:none !important;
        }
    }` );
})();