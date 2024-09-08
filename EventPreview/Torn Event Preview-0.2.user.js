// ==UserScript==
// @name         Torn Event Preview
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Displays small preview when hovering over events button
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_xmlhttpRequest
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

    const hoverPreview = false;
    const rightClickPreview = !hoverPreview;

    const horizontalCenter = Math.floor(window.innerWidth/2);
    const verticalCenter = Math.floor(window.innerHeight/2);

    // Last 100 (?) events
    var latestEvents;
    var pageHtml;

    const pageHeader =
            `<div class="x-eventsListWrapper">
                 <header class="x-header"><h5 class="x-heading">Events</h5>
                     <div class="x-hdrbtns">
                         <button id="x-evt-close" type="submit" class="x-hdrbtn" value="X"><header><h5 class="x-heading">X</h5></button>
                     </div>
                 </header>
                 <div><ul class="x-eventsList">`;

    const pageFooter = `</ul></div></div>`;

    const templateLiHdr =
            `<li class="x-listItemWrapper"><div style="display: flex; letter-spacing: 0;">
                 <div style="display: flex; flex: 1;"><p class="x-message">`;

    const templateLiFtr = ` </p></div></div></li>`;

    function parseResponse(jsonResp) {
        latestEvents = jsonResp.events;
        openNewHtmlDoc();

        log("All events: ", latestEvents);

        let keys = Object.keys(latestEvents);
        for (let idx = 0; idx<keys.length; idx++) {
            let key = keys[idx];
            let eventObject = latestEvents[key];
            let event = eventObject.event;

            if (idx == 0) {
                log("First object: ", eventObject);
                log("First event: ", event);
            }

            insertLi(event);
        }

        finishHtmlDoc();

        function finishHtmlDoc() {
            pageHtml = pageHtml + "</ul></div></div>";
            debug("pageHtml: ", pageHtml.slice(0, 1024));
        }

        function insertLi(event) {
            let newLi = templateLiHdr + event + templateLiFtr;
            pageHtml = pageHtml + newLi;
        }

        function openNewHtmlDoc() {
            pageHtml = pageHeader;
       }
    }

    function userQueryCB(responseText, ID) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            if (jsonResp.error.code == 6)
                return;
            return handleError(responseText);
        }

        parseResponse(jsonResp);
        callOnContentLoaded(handlePageLoad);
    }

    const baseSettings = `menubar=no,
                        resizable=yes,
                        scrollbars=yes,
                        location=no,
                        status=no,
                        location=no,
                        toolbar=no,`;

    function getNewWinSettings() {
        let width = "width=600,";
        let height = "height=200,";
        let top = "top=" + Math.floor(verticalCenter) + ",";
        let left = "left=" + Math.floor(horizontalCenter/2);
        let settings = baseSettings + width + height + top + left;

        log("Settings: ", settings);

        return settings;
    }

    function displayNewWin() {
        let settings = getNewWinSettings();
        hoverWin = window.open('','',settings);
        hoverWin.document.open().write(pageHtml);
        return false;
    }

    var outsideClickHandlerInstalled = false;
    function handleOutsideClicks() {
        $("html").click(function (e) {
            let div = document.getElementById("xedx-preview")
            if (e.target != div) {
                $("#xedx-preview").remove();
            }
        });
    }

    function displayNewWinEx() {
        log("displayNewWinEx");

        if ($("#xedx-preview").length > 0) {
            $("#xedx-preview").remove();
        } else {
            let win = "<div id='xedx-preview' class='x-preview'><div id='xedx-previewheader'></div></div>";
            $($('.content-wrapper')[0]).append(win);

            let inner = $($.parseHTML(pageHtml));
            $("#xedx-preview > div").append(inner);
            $("#xedx-preview").find('a').addClass("x-nowrap");
            $("#xedx-preview").css("top", Math.floor(verticalCenter/2));
            $("#xedx-preview").css("left", Math.floor(horizontalCenter/2));
            $("#xedx-preview").find("a").attr("style", "color: var(--default-blue-color)");

            // Make draggable
            dragElement(document.getElementById("xedx-preview"));

            // Right-click closes
            $("#xedx-preview").on('contextmenu', function () {$("#xedx-preview").remove();$(".cbqc1").remove();return false;});
            $("#x-evt-close").on('click', function () {$("#xedx-preview").remove();$(".cbqc1").remove();});

            // Removed to make draggable
            /*
            $("#xedx-preview").on('click', function () {$("#xedx-preview").remove();});
            if (outsideClickHandlerInstalled == false) {
                outsideClickHandlerInstalled = true;
                handleOutsideClicks();
            }
            */

            $(".cbqc1").remove(); // Closes any open tool tip

            debug("preview: ", $("#xedx-preview"));
        }

        return false;
    }

    var hoverWin;
    function hoverEnter() {
        log("Hovering!!! : ", $(this));
        displayNewWin();
    }

    function hoverLeave() {
        log("No longer hovering!!!");
        //setTimeout(function () {hoverWin.close();}, 3000);
    }

    function dragElement(elmnt) {
      var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
      if (document.getElementById(elmnt.id + "header")) {
        // if present, the header is where you move the DIV from:
        document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
      } else {
        // otherwise, move the DIV from anywhere inside the DIV:
        elmnt.onmousedown = dragMouseDown;
      }

      function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
      }

      function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
      }

      function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
      }
    }

    function handlePageLoad() {
        if (hoverPreview == true)
            $("#nav-events").hover(hoverEnter, hoverLeave);
        if (rightClickPreview == true)
            $("#nav-events").on('contextmenu', displayNewWinEx);

        // tooltip for same. Test: multiple classes
        let node = $("#nav-events");
        displayHtmlToolTip(node, "Right-Click to preview", "tooltip4 cbqc1");
    }

    function doUserEventsQuery() {
        xedx_TornUserQuery(null, 'events', userQueryCB);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    addWinStyles();
    addToolTipStyle();

    doUserEventsQuery();

    function addWinStyles() {
        GM_addStyle(`
            .x-preview {
                position: fixed;
                display: flex;
                z-index: 9999999;
                width: 600px;
                height: 200px;
                overflow: scroll;
                border: 2px solid steelblue;
                border-radius: 10px;
                background: var(--default-bg-panel-color) none repeat scroll 0% 0% / auto padding-box border-box;
            }
            .x-nowrap {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
           .x-message {
               color: var(--shared-list-item-message-text-color);
               line-height: 16px;
               padding: 9px 10px 8px;
               width: 100%;
               word-break: break-word;
           }
           .x-message a {
               color: var(--default-blue-color);
           }
           .x-eventsListWrapper {
               font-family: Arial,Helvetica,sans-serif;
               position: relative;
           }
           .x-listItemWrapper {
               background: var(--default-bg-panel-color);
               border-bottom: 1px solid var(--divider-dark-color);
               box-shadow: var(--shared-list-item-box-shadow);
               position: relative;
           }
           .x-eventsList {
               margin: 0;
               padding: 0;
               border: 0;
               font-size: 100%;
               font: inherit;
               vertical-align: baseline;
               list-style: none;
           }
           .x-header {
               align-items: center;
               border-bottom: 1px solid var(--divider-dark-color);
               border-radius: 5px 5px 0 0;
               display: flex;
               height: 33px;
               overflow: hidden;
               padding-left: 10px;
               position: relative;
               background: var(--title-black-linear-gradient);
           }
           .x-heading {
               color: var(--tutorial-title-color);
               font-size: 12px !important;
               font-weight: 700;
               letter-spacing: 0;
               text-shadow: var(--tutorial-title-shadow);
           }
           .x-hdrbtns {
               align-items: center;
               display: flex;
               height: 100%;
               margin-left: auto;
               position: relative;
           }
           .x-hdrbtn {
               align-items: center;
               border: none;
               border-left: 1px solid;
               cursor: pointer;
               display: flex;
               height: 100%;
               justify-content: center;
               padding: 0;
               width: 32px;
           }
        `);
    }

})();



