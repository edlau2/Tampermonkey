// ==UserScript==
// @name         Torn Sidebar Scroll-Lock
// @namespace    http://tampermonkey.net/
// @version      1.11
// @description  Let sidebar vert scroll independently
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_xmlhttpRequest
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

    Awards just stuck over on sidebar here until I find a better script to add from
*/

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    if (isAttackPage()) return;

    // Left-align
    GM_addStyle(`
        #mainContainer {
            display: flex;
            justify-content: left;
            margin: 0px 5px 5px 5px !important;
        }`);

    const addAwards = GM_getValue('addAwards', false);
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
    const lock = `<span>
                      <input type="checkbox" id="hide-hdr" class="" style="margin-right: 10px;">
                      <input type="checkbox" id="lock-box" class="">
                  </span>`;

    if (fixedHeader == true)
        addHdrStyle();

    function handlePageLoad(retries=0) {
        let checked = GM_getValue('checked', false);
        let hdrHidden = GM_getValue('hdrHidden', false);

        if(!$("#sidebarroot").length) {
            if (retries++ < 10) return setTimeout(handlePageLoad, 250);
            return log("No sidebar found at ", location.href,
                       " after ", retries, " attempts.");
        }

        // ========== Set sidebar style ==========
        $("#sidebarroot").addClass("disable-scrollbars");
        if (checked != true)
            $("#sidebarroot").addClass("xedx-locked");
        if (hdrHidden == true)
            $("#topHeaderBanner").addClass("hdrHide");

        // Add lock btn. Lock will NOT work with TT NPC Timers? id=topbarNpcTimers
        if (lockable == true) {
            addLockboxStyle();
            $("#topbarNpcTimers").remove();
            let hdrDiv = $("#sidebar div[class*='header_'][class*='desktop_']")[0];
            $(hdrDiv).append(lock);
            $("#lock-box").prop('checked', checked);
            $("#lock-box").on('click.xedx', handleClick);
            displayHtmlToolTip($("#lock-box"), "Checking this will lock the sidebar<br>scroll with main window scroll.", "tooltip4");
            $("#hide-hdr").prop('checked', hdrHidden);
            $("#hide-hdr").on('click.xedx', handleHide);
            displayHtmlToolTip($("#hide-hdr"), "Checking this will hide the top banner bar.", "tooltip4");
        }

        function handleClick(e) {
            $("#sidebarroot").toggleClass("xedx-locked");
            GM_setValue('checked', $("#lock-box").prop('checked'));
        }
        function handleHide(e) {
            $("#topHeaderBanner").toggleClass("hdrHide");
            //GM_setValue('hdrHidden', $("#hide-hdr").prop('checked'));
        }
    }

    function addStyles() {
        addToolTipStyle();

        GM_addStyle(`
           .content-wrapper {
               margin-bottom: 200px !important;
           }
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
           #lock-box, #hide-hdr {
                margin: 5px 10px 0px 0px;
                cursor: pointer;
                opacity: 0;
                z-index: 9999999;
            }
            #lock-box:hover, #hide-hdr:hover {
                opacity: 1;
            }
            .hdrHide {
                display: none !important;
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

    function queryStatsCB(responseText, ID, node) {
        log('queryStatsCB: ');
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let awards = jsonResp.personalstats.awards;

        log("Awards: ", awards);

        let awardsSpan = `<p class="point-block___rQyUK" tabindex="0">
            <span class="name___ChDL3">Awards:</span>
            <span class="value___mHNGb ">${awards}</span>
         </p>`;


        $(".points___UO9AU").append(awardsSpan);



    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (checkCloudFlare()) return;
    if (onAttackPage()) return;
    if (location.href.toLowerCase().indexOf("api.htm") > -1 ||
        location.href.toLowerCase().indexOf("logout") > -1) return;

    if (addAwards == true) {
        validateApiKey();
        xedx_TornUserQuery('', 'personalstats', queryStatsCB);
    }

    addStyles();
    handlePageLoad();

})();








