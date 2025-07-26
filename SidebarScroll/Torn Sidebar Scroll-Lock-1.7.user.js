// ==UserScript==
// @name         Torn Sidebar Scroll-Lock
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Let sidebar vert scroll independently
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*  This script lets the sidebar scroll independently of the center content
    There is a hidden checkbox on the sidebar header, hover over it and a
    checkbox will appear to lock it in place dynamically. Meaning, back
    to normal. It also will lock the page headers in place, so that they
    are always visible. These features can be changed via options in
    browser storage.
*/

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    if (isAttackPage()) return;

    var lockable = GM_getValue('lockable', -1);
    var useFixedHdrs = GM_getValue('useFixedHdrs', -1);
    if (lockable == -1) {
        lockable = true;
        useFixedHdrs = true;
        GM_setValue('lockable', lockable);
        GM_setValue('useFixedHdrs', useFixedHdrs);
    }

    const fixedHeader = (useFixedHdrs && location.href.indexOf('calendar.php') < 0);
    var sidebarTop = fixedHeader ? "74px" : "0px";
    const lock = `<span><input type="checkbox" id="lock-box" class=""></span>`;

    if (fixedHeader == true)
        addHdrStyle();

    function handlePageLoad(retries=0) {
        let checked = GM_getValue('checked', false);

        if(!$("#sidebarroot").length) {
            if (retries++ < 10) return setTimeout(handlePageLoad, 250);
            return log("No sidebar found at ", location.href,
                       " after ", retries, " attempts.");
        }

        // ========== Set sidebar style ==========
        $("#sidebarroot").addClass("disable-scrollbars");
        if (checked != true)
            $("#sidebarroot").addClass("xedx-locked");

        // Add lock btn. Lock will NOT work with TT NPC Timers? id=topbarNpcTimers
        if (lockable == true) {
            addLockboxStyle();
            $("#topbarNpcTimers").remove();
            let hdrDiv = $("#sidebar div[class*='header_'][class*='desktop_']")[0];
            $(hdrDiv).append(lock);
            $("#lock-box").prop('checked', checked);
            $("#lock-box").on('click.xedx', handleClick);
            displayHtmlToolTip($("#lock-box"), "Checking this will lock the sidebar<br>scroll with main window scroll.", "tooltip4");
        }

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
               top: ${sidebarTop};
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
            #sidebarroot { margin-bottom: 50px; }
        `);
    }

     function addLockboxStyle() {
        GM_addStyle(`
           #lock-box {
                margin: 5px 10px 0px 0px;
                cursor: pointer;
                opacity: 0;
                z-index: 9999999;
            }
            #lock-box:hover {
                opacity: 1;
            }
        `);
     }

    function addHdrStyle() {
        GM_addStyle(`
            #topHeaderBanner {
                position: fixed;
                top: 0;
                z-index: 999999;
                width: 100%;
            }
            #body > div.content.responsive-sidebar-container {
                position: relative;
                top: 74px;
            }
        `);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (checkCloudFlare()) return;
    if (onAttackPage()) return;
    if (location.href.toLowerCase().indexOf("api.htm") > -1 ||
        location.href.toLowerCase().indexOf("logout") > -1) return;

    addStyles();
    handlePageLoad();

})();








