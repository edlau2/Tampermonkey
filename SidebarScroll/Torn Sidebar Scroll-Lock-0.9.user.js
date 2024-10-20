// ==UserScript==
// @name         Torn Sidebar Scroll-Lock
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Let sidebar vert scroll independently
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
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

    const lock = `<span><input type="checkbox" id="lock-box" class=""></span>`;

    function handlePageLoad(retries=0) {
        let checked = GM_getValue('checked', false);

        // This should never happen...
        if(!$("#sidebarroot").length) {
            if (confirm("This shoudn't happen, prob a page without a sidebar?\n" +
                         "Let xedx [200735] know what page!\n" +
                         "Page URL:\n" + document.location.href +
                          "\nPress OK to try again, or cancel to just continue.")) {
            if (retries++ < 3) return setTimeout(handlePageLoad, 250);
            }
            return;
        }

        // ========== Set sidebar style ==========
        $("#sidebarroot").addClass("disable-scrollbars");
        if (checked != true)
            $("#sidebarroot").addClass("xedx-locked");

        // Add lock btn.
        let hdrDiv = $("#sidebar div[class*='header_'][class*='desktop_']")[0];
        $(hdrDiv).append(lock);
        $("#lock-box").prop('checked', checked);
        $("#lock-box").on('click.xedx', handleClick);
        displayHtmlToolTip($("#lock-box"), "Checking this will lock the sidebar<br>scroll with main window scroll.", "tooltip4");

        function handleClick(e) {
            $("#sidebarroot").toggleClass("xedx-locked");
            GM_setValue('checked', $("#lock-box").prop('checked'));
        }
    }

    function addStyles() {
        addToolTipStyle();

        GM_addStyle(`
           .xedx-locked {
               max-height: 95vh;
               overflow-y: auto;
               top: 0px;
               position: sticky;
           }
           #lock-box {
                margin: 5px 10px 0px 0px;
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

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (checkCloudFlare()) return;
    if (onAttackPage()) return;
    if (location.href.toLowerCase().indexOf("api.htm") > -1) return;

    addStyles();
    handlePageLoad();

})();








