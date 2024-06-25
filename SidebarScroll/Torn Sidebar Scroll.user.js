// ==UserScript==
// @name         Torn Sidebar Scroll
// @namespace    http://tampermonkey.net/
// @version      0.1
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

    const sidebarHeightExtra = 0;
    const leftContentMargin = "20px";
    const fakeDiv = $(`<div id="fake-div" class="xedx-fake"><!-- fake div, forces correct spacing --></div>`);

    var retries = 0;
    function handlePageLoad() {
        let container = $("#mainContainer");
        let sidebar = $("#sidebarroot");
        let content = $("#mainContainer > .content-wrapper");

        log("container: ", $(container));
        log("sidebar: ", sidebar);
        log("content: ", $(content));

        // If we don't have a sidebar, or mainContainer, this is all pointless.
        // Retry a few times in case we are here too early, which shouldn't happen.
        if(!$(container).length || !$(sidebar).length) {
            retries++;
            log("missing divs: ", $(container).length, " : ", $(sidebar).length);
            if (retries < 3) return setTimeout(handlePageLoad, 250);
            return;
        }

        // ========== Set main conatiner properties ==========
        $(container).css("display", "flex");
        $(container).css("flex-direction", "row");
        log("container: ", $(container));

        // ========== Set sidebar style ==========
        let sidebarWidth = $(sidebar).width();
        log("sidebar width: ", sidebarWidth);

        let winHeight = $(window).height();
        log("winHeight: ", winHeight);

        $(sidebar).css("width", sidebarWidth);
        $(sidebar).css("height", winHeight + sidebarHeightExtra);
        $(sidebar).css("overflow-y", "auto");
        $(sidebar).css("top", "0px");
        $(sidebar).css("position", "sticky");

        log("sidebar: ", sidebar);

        // ========== Set content (right hand side) styles ==========
        if ($(content).length) {
            let contentWidth = $(content).width();
            log("content width: ", contentWidth);

            $(content).css("margin-bottom", "50px");
            $(content).css("margin", "0 auto");
            $(content).css("position", "relative");
            $(content).css("top", "10px");
            $(content).css("left", leftContentMargin);
            $(content).css("width", contentWidth);    // subtract 20 for artificial left margin
            log("content: ", $(content));

            $(content).after(fakeDiv);
            $("#fake-div").css("width", leftContentMargin);
        }
    }

    function addStyles() {
        GM_addStyle(`
            .xedx-main-wrap {
                display: flex;
                flex-direction: row;
                border: 1px solid red;
            };
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
    addStyles();
    handlePageLoad();

    //callOnContentLoaded(handlePageLoad);


})();








