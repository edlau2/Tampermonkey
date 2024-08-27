// ==UserScript==
// @name         Torn Sidebar Scroll-Lock
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Let sidebar vert scroll independently
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
// @grant        GM_addStyle
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

    debugLoggingEnabled = false;

    // This option, if enabled, hides the scrollbar that will appear
    // on the sidebar while scrolling.
    const hideScrollbars = true;

    var retries = 0;
    function handlePageLoad() {
        let sidebar = $("#sidebarroot");

        // This should never happen...
        if(!$(sidebar).length) {
            alert("This shoudn't happen, prob a page without a sidebar? Let xedx know what page!");
            return (retries++ < 3) ? setTimeout(handlePageLoad, 250) : false;
        }

        // ========== Set sidebar style ==========
        if (hideScrollbars)
            $(sidebar).addClass("disable-scrollbars");

        // Could just add these as styles to the '#sidebar' element....
        $(sidebar).css("max-height", "100vh");
        $(sidebar).css("overflow-y", "auto");
        $(sidebar).css("top", "0px");
        $(sidebar).css("position", "sticky");
    }

    function addStyles() {
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

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    // Don't bother on attack pages
    if (window.location.search.indexOf("attack") > -1) return;

    addStyles();
    handlePageLoad();

})();








