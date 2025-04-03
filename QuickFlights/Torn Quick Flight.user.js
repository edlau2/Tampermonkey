// ==UserScript==
// @name         Torn Quick Flight
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  This script adds a sidebar menu to jump to the Travel Agency, PDA compatible
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const clickTravel = true;
    const debugLoggingEnabled = false;

    const xedx_addStyle = function(styles) {
        (typeof GM_addStyle != "undefined") ?
            GM_addStyle(styles) :
            (styles) => {
                const styleElement = document.createElement("style");
                styleElement.setAttribute("type", "text/css");
                styleElement.innerHTML = styles;
                document.head.appendChild(styleElement);
            }
    };

    function log(...data) {console.log('Torn Quick Flight: ', ...data);}
    function debug(...data){if (debugLoggingEnabled == true) log(...data);}

    const searchParams = new URLSearchParams(window.location.search);

    const destinations = { "Mexico": {fullName: "Mexico", icon: "mexico", idx: 0, std: "26min", pi: "18min", wlt: "13min", bct: "8min"},
                           "Caymans": {fullName: "Cayman Islands", icon: "cayman", idx: 1, std: "35min", pi: "25min", wlt: "18min", bct: "11min"},
                           "Canada": {fullName: "Canada", icon: "canada", idx: 2, std: "41min", pi: "29min", wlt: "20min", bct: "12min"},
                           "Hawaii": {fullName: "Hawaii", icon: "hawaii", idx: 3, std: "2h 14min", pi: "1h 34min", wlt: "1h 7min", bct: "40min"},
                           "UK": {fullName: "United Kingdom", icon: "uk", idx: 4, std: "2h 39min", pi: "1h 51min", wlt: "1h 20min", bct: "48min"},
                           "Argentina": {fullName: "Argentina", icon: "argentina", idx: 5, std: "2h 47min", pi: "1h 57min", wlt: "1h 23min", bct: "50min"},
                           "Switzerland": {fullName: "Switzerland", icon: "switzerland", idx: 6, std: "2h 55min", pi: "2h 3min", wlt: "1h 28min", bct: "53min"},
                           "Japan": {fullName: "Japan", icon: "japan", idx: 7, std: "3h 45min", pi: "2h 38min", wlt: "1h 53min", bct: "1h 8min"},
                           "China": {fullName: "China", icon: "china", idx: 8, std: "4h 2min", pi: "2h 49min", wlt: "2h 1min", bct: "1h 12min"},
                           "UAE": {fullName: "United Arab Emirates", icon: "uae", idx: 9, std: "4h 31min", pi: "3h 10min", wlt: "2h 15min", bct: "1h 21min"},
                           "South Africa": {fullName: "South Africa", icon: "south_africa", idx: 10, std: "4h 57min", pi: "3h 28min", wlt: "2h 29min", bct: "1h 29min"},
                         };

    var sidebarParentSel;
    var destinationLinks;

    function getTravelLinks() {return $("[class^='destinationLabel_'] > input");}
    function atTravelAgency() {return location.href.indexOf('sid=travel') > -1;}
    function getConfirmBtn(retries=0) {return $("#travel-root > [class*='destinationPanel__'] > div > div > [class^='buttons_'] > button.torn-btn.btn-dark-bg");}
    function getTravelBtn() {return $("#travel-root > [class*='destinationPanel__'] > div > div > div > div:nth-child(4) > button");}

    var savedUl;
    var maxHeight;
    var inAnimate = false;
    function handleCaretClick(e) {
        log("handleCaretClick: ", inAnimate);
        if (inAnimate == true) return;
        inAnimate = true;

        let closing = $("#xtrav-cs").hasClass("fa-caret-down");
        $("#xtrav-cs").toggleClass("fa-caret-down fa-caret-right");

        log("handleCaretClick: ", $("#xtrav-cs"));
        log("handleCaretClick: closing: ", closing, $("#xtrav-cs").hasClass("fa-caret-down"));

        if (!closing) {
            if (!savedUl) {return log("ERROR: no saved UL!!!");}
            $("#ctry-list").append(savedUl);
        }

        $("#ctry-list > ul").animate({height: (closing ? "0px" : maxHeight)}, 500, function () {
            if (closing) {
                $(sidebarParentSel).css("padding-bottom", "0px");
                savedUl = $("#ctry-list > ul").detach();
            } else {
                $(sidebarParentSel).css("padding-bottom", "142px");
            }
            inAnimate = false;
        });

        return false;
    }

    // Just a helper cut-and-pasted from my helper lib,
    // so PDA compatible and don't need lib
    function makeXedxSidebarContentDiv(elemId) {
        let newElemId = "x-scrollbar-content" + (elemId ? ("-" + elemId) : "");
        let selector = '#'+ newElemId;
        if ($(selector).length > 0) return selector;
        let node = $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]:not([id^="x-scroll"])');
        if ($(node).length < 1) return;

        let clone = $($(node)[0]).clone();
        $(clone).children().remove();
        $(node).after(clone);
        $(clone).attr("id", newElemId);
        return selector;
    }

    function handleTravelBtnClicked(retries=0) {
        let btn = getConfirmBtn();
        if (!$(btn).length) {
            if (retries++ < 20) return setTimeout(handleTravelBtnClicked, 200, retries);
            return log("handleTravelBtnClicked: too many retries");
        }
        $(btn).css("border", "1px solid limegreen");
    }

    function handleDestClicked(retries = 0) {
        let btn = getTravelBtn();
        if (!$(btn).length) {
            if (retries++ < 20) return setTimeout(handleDestClicked, 200, retries);
            return log("handleDestClicked: too many retries");
        }
        if (clickTravel == true) {
            $(btn).click();
            handleTravelBtnClicked();
        } else {
            $(btn).css("border", "1px solid limegreen");
        }
    }

    function findAndClick(dest, idx, retries=0) {
        if (!destinationLinks) destinationLinks = getTravelLinks();
        if (!destinationLinks || destinationLinks.length < 10) {
            if (retries++ < 30) return setTimeout(findAndClick, 250, dest, idx, retries);
            return log("Too many retries");
        }
        $(destinationLinks[idx]).click();
        handleDestClicked();
    }

    function handleCountryClick(e) {
        let target = $(e.currentTarget);
        let dest = $(target).attr('data-ctry');
        let index = $(target).attr('data-idx');
        if (atTravelAgency() == true) {
            findAndClick(dest, index);
        } else {
            let url = `https://www.torn.com/page.php?sid=travel&xdest=${dest}&idx=${index}`;
            window.location.href = url;
        }

        return false;
    }

    function installUi(retries=0) {
        log("installUI: ", $("#xtravelbar"));
        if ($("#xtravelbar").length == 0) {
            sidebarParentSel = makeXedxSidebarContentDiv('xtravelbar');
            log("parent: ", $(sidebarParentSel));
            $(sidebarParentSel).append(getSidebarDiv());
            $(sidebarParentSel).css("padding", "0px");
        }

        let keys = Object.keys(destinations);
        for (let idx=0; idx<keys.length; idx++) {
            let country = keys[idx];
            let data = destinations[country];
            let li = `<li data-ctry="${data.icon}" data-idx="${data.idx}">
                          <span><img class="flag" src="/images/v2/travel_agency/flags/fl_${data.icon}.svg"></span>
                          <span>${country}</span>
                      </li>`;
            $("#xloc").append(li);
        }

        $("#xloc > li").on('click', handleCountryClick);

        let countLi = $("#xloc > li").length;
        let liH = $($("#xloc > li")[0]).height();
        if (!maxHeight) maxHeight = (countLi * liH) + "px";

        log("installUI 2: ", $("#xtravelbar"));

        handleCaretClick();

        $("#xtrav-cs").on('click', handleCaretClick);
    }

    function handlePageLoad(retries=0) {
        log("handlePageLoad");
        installUi();

        if (atTravelAgency()) {
            destinationLinks = getTravelLinks();
            let dest = searchParams.get('xdest');
            let idx = searchParams.get('idx');
            debug("dest: ", dest, " idx: ", idx);
            if (dest) findAndClick(dest, idx);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    log("Script started!");

    addStyles();

    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoad);
    } else {
        handlePageLoad();
    }

    // ==================== UI stuff down here, out of the way ===================

    function getSidebarDiv() {
        let div = `
            <div id="xtravelbar" style='display: flex; flex-direction: column;'>
                <div style="display: flex; flex-flow: row wrap;">
                    <span class="t-title">Travel</span>
                    <span class="xcaret-wrap" style="float:right;">
                        <i id="xtrav-cs" class="icon fas fa-caret-down xedx-tcaret"></i>
                    </span>
                </div>
                <div id="ctry-list">
                    <ul id="xloc">
                    </ul>
                </div>
            </div>
        `;

        return div;
    }

    function addStyles() {
        //addFlexStyles();

        xedx_addStyle(`
            .xedx-tcaret {
                padding-top:5px;
                padding-bottom:5px;
                padding-left:20px;
                padding-right:10px;
                position: absolute;
                right: 0;
                cursor: pointer;
            }
            .xcaret-wrap:hover {
                border-radius: 2px;
                border: 2px solid #333;
            }
            .t-title {
                padding: 5px 0px 5px 10px;
                font-size: 14px;
            }
            #xtravelbar {
                border-radius: 4px;
            }
            #ctry-list {
                position: absolute;
                max-height: 140px;
                overflow-y: auto;
                z-index: 9999999;
                margin-top: 28px;
                max-width: 170px;
                /*border: 1px solid green;*/
            }
            #xloc li {
                padding: 5px 0px 5px 0px;
                background: transparent linear-gradient(180deg, #666666 0%, #222222 100%) 0 0 no-repeat;
                color: #FFFFFF;
                text-shadow: none;
                display: flex;
                max-width: 170px;
                width:170px;
            }
            #xloc li:last-child {
                border-radius: 0px 0px 4px 4px;
            }
            #xloc li span:last-child {
                padding-left: 10px;
                width: 80%;
            }
            #xloc li span:first-child {
                justify-content: center;
            }
            #xloc li:hover {
                background: transparent linear-gradient(180deg, #555555 0%, #111111 100%) 0 0 no-repeat;
                filter: brightness(.8);
            }
            #xloc li img {
                padding-left: 10px;
            }
        `);
    }

})();