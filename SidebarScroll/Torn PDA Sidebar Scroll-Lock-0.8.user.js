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

    console.log("Torn PDA Sidebar Scroll-Lock starting.");

    addStyles();
    handlePageLoad();

    function handlePageLoad() {
        console.log("Torn PDA SSL: handlePageLoad");

        let sidebar = $("#sidebarroot");
        $(sidebar).addClass("disable-scrollbars");
        $(sidebar).css("max-height", "95vh"); // bottom margin for TTS footer.
        $(sidebar).css("overflow-y", "auto");
        $(sidebar).css("top", "0px");
        $(sidebar).css("position", "sticky");
    }

    function addStyles() {
        console.log("Torn PDA SSL: addStyles");
        GM_addStyle(`
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








