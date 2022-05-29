// ==UserScript==
// @name         Torn Sidebar Colors
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add color to the icons on the sidebar
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    function colorIcon(icon, color, pw=1) {
        if (icon) {
            icon.setAttribute('stroke', color);
            icon.setAttribute('stroke-width', pw.toString());
        }
    }

    function handlePageLoad() {
        let homeIcon = document.querySelector("#nav-home > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(homeIcon, 'red');

        let itemsIcon = document.querySelector("#nav-items > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(itemsIcon, 'blue');

        let cityIcon = document.querySelector("#nav-city > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(cityIcon, 'yellow');

        let jobIcon = document.querySelector("#nav-job > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(jobIcon, '#9EBF7C', 4);

        let gymIcon = document.querySelector("#nav-gym > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(gymIcon, '#719EA3');

        let propIcon = document.querySelector("#nav-properties > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(propIcon, 'yellow');

        let eduIcon = document.querySelector("#nav-education > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(eduIcon, 'black');

        let crimesIcon = document.querySelector("#nav-crimes > div > a > span.svgIconWrap___YUyAq > svg");
        //colorIcon(crimesIcon, 'red');

        let missionIcon = document.querySelector("#nav-missions > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(missionIcon, '#C32A1F');

        let newsIcon = document.querySelector("#nav-newspaper > div > a > span.svgIconWrap___YUyAq > svg");
        //colorIcon(newsIcon, '#686B6C');

        let jailIcon = document.querySelector("#nav-jail > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(jailIcon, 'black');

        let hospIcon = document.querySelector("#nav-hospital > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(hospIcon, 'red');

        let casinoIcon = document.querySelector("#nav-casino > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(casinoIcon, '#4D8719');

        let forumIcon = document.querySelector("#nav-forums > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(forumIcon, 'white');

        let hofIcon = document.querySelector("#nav-hall_of_fame > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(hofIcon, '#FFD701');

        let facIcon = document.querySelector("#nav-my_faction > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(facIcon, '#DFAF2A');

        let recIcon = document.querySelector("#nav-recruit_citizens > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(recIcon, 'red');

        let calendarIcon = document.querySelector("#nav-calendar > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(calendarIcon, 'orange');

        let travelIcon = document.querySelector("#nav-traveling > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(travelIcon, '#6AB6F3'); // '#6CB0E5');

        let peopleIcon = document.querySelector("#nav-people > div > a > span.svgIconWrap___YUyAq > svg");
        colorIcon(peopleIcon, '#F7BDA4');

        //let mexicoIcon = document.querySelector("#nav-mexico > div > a > span.svgIconWrap___YUyAq > svg");
        //let canadaIcon = document.querySelector("#nav-canada > div > a > span.svgIconWrap___YUyAq > svg");
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    callOnContentLoaded(handlePageLoad);

})();
