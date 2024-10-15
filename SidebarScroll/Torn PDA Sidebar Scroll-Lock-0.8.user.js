// ==UserScript==
// @name         Torn PDA Sidebar Scroll-Lock
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Let sidebar vert scroll independently
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    console.log("Torn PDA Sidebar Scroll-Lock started.");

    addStyles();

    let sidebar = $("#sidebarroot");
    $(sidebar).addClass("disable-scrollbars");
    $(sidebar).addClass("scroll-lock");

    function addStyles() {
        GM_addStyle(`
            .scroll-lock {
                max-height: 95vh;
                overflow-y: auto;
                top: 0px;
                position: sticky;
            }
            .disable-scrollbars::-webkit-scrollbar {
                background: transparent; /* Chrome/Safari/Webkit */
                width: 0px;
            }
            .disable-scrollbars {
                scrollbar-width: none; /* Firefox */
                -ms-overflow-style: none;  /* IE 10+ */
            }
        `);
    }

})();








