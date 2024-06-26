// ==UserScript==
// @name         Torn Sidebar Scroll
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Let sidebar vert scroll independently
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

// For some reason, setting css styles on the 3 divs didn't work, so have to set each style element individually....
// no idea why yet.

(function() {
    'use strict';

    // Can set this to 'false' to disable logging.
    debugLoggingEnabled = true;

    // This option, if enabled, hides the scrollbar that will appear
    // on the sidebar while scrolling.
    const hideScrollbars = true;

    const sidebarHeightExtra = 0;
    const leftContentMargin = "20px";
    const bottomMargin = "80px";
    const fakeDiv = $(`<div id="fake-div"></div>`);
    const fakeDiv2 = $(`<div id="fake-div2" style="height: ` + bottomMargin + `;"></div>`);
    const fakeDiv3 = $(`<div id="fake-div3" style="height: ` + bottomMargin + `;"></div>`);

    // Make sure the sidebar resizes correctly when the window size changes
    $( window ).resize(function() {
        adjustSidebarHeight();
    });

    var retries = 0;
    function handlePageLoad() {
        let container = $("#mainContainer");
        let sidebar = $("#sidebarroot");
        let content = $("#mainContainer > .content-wrapper");

        debug("container: ", $(container));
        debug("sidebar: ", sidebar);
        debug("content: ", $(content));

        // If we don't have a sidebar, or mainContainer, this is all pointless.
        // Retry a few times in case we are here too early, which shouldn't happen.
        if(!$(container).length || !$(sidebar).length) {
            retries++;
            debug("missing divs: ", $(container).length, " : ", $(sidebar).length);
            if (retries < 3) return setTimeout(handlePageLoad, 250);
            return;
        }

        // ========== Set main conatiner properties ==========
        $(container).css("display", "flex");
        $(container).css("flex-direction", "row");
        debug("container: ", $(container));

        // ========== Set sidebar style ==========
        let sidebarWidth = $(sidebar).width();
        debug("sidebar width: ", sidebarWidth);

        let winHeight = $(window).height();
        debug("winHeight: ", winHeight);

        if (hideScrollbars) $(sidebar).addClass("disable-scrollbars");
        $(sidebar).css("width", sidebarWidth);
        $(sidebar).css("height", winHeight + sidebarHeightExtra);
        $(sidebar).css("overflow-y", "auto");
        $(sidebar).css("top", "0px");
        $(sidebar).css("position", "sticky");
        debug("sidebar: ", sidebar);

        // ========== Set content (right hand side) styles ==========
        if ($(content).length) {
            let contentWidth = $(content).width();
            debug("content width: ", contentWidth);

            $(content).css("margin-bottom", "50px");
            $(content).css("margin", "0 auto");
            $(content).css("position", "relative");
            $(content).css("top", "10px");
            $(content).css("bottom", "100px");
            $(content).css("left", leftContentMargin);
            $(content).css("width", contentWidth);    // subtract 20 for artificial left margin
            debug("content: ", $(content));

            // Bottom margin, "bottom" doesn't seem to work...
            $(content).append(fakeDiv2);
            $(sidebar).append(fakeDiv3);

            // Spacing between DIV's
            $(content).after(fakeDiv);
            $("#fake-div").css("width", leftContentMargin);
        }
    }

    function adjustSidebarHeight() {
        debug("Window viewport size change detected!");
        let winHeight = $(window).height();
        debug("winHeight: ", winHeight);
        $("#sidebarroot").css("height", winHeight + sidebarHeightExtra);
    }

    function ignoredPage() {
        if (window.location.search.indexOf("attack") > -1) return true;
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
            .xedx-main-wrap {
                display: flex;
                flex-direction: row;
                border: 1px solid red;
            }
            .xedx-left {
                overflow-y: auto;
                border: 1px solid blue;
                position: sticky;
                top: 0px;
            }
            .xedx-right {
                overflow-y: auto;
                border: 1px solid blue;
            }
        `);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (ignoredPage()) {
        log("Ignoring page: ", window.location.href);
        return;
    }

    addStyles();
    handlePageLoad();
})();








