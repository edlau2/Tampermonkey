// ==UserScript==
// @name         Torn Tct-To-Local Clock
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Toggle clock to local time (and back!)
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    // Some globals
    var clock, myClock, dateObserver;
    var firstPass = true;
    var retries = 0;
    var dispLocal = true;
    const options = {attributes: true, childList: true, characterData: true, subtree: true};

    function log(...data) { console.log(GM_info.script.name + ': ', ...data); }

    log('script started!');

    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', getClock);
    } else {
        getClock();
    }

    var locked = false;
    const rstLock = () => { locked = false; }
    function switchClocks(e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
            if (locked == true) return;
            locked = true;
            setTimeout(rstLock, 500);
        }
        $(clock).css("display", dispLocal ? "none" : "block");
        $(myClock).css("display", dispLocal ? "block" : "none");
        dispLocal = !dispLocal;
        firstPass = false;
    }

    GM_addStyle(`
        .tc-clock-tooltip {
            transition: all 0.5s ease;
        }
        .tc-clock-tooltip:hover {
            transform: scale(1.1);
            cursor: pointer;
        }
        .tc-clock-tooltip:hover span {
            color: #ebeb35;
        }
        .tc-clock-tooltip span {
            transition: all 0.5s ease;
        }
    `);

    function getDayNow() {
        const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const shortday = ["Sun","Mon","Tues","Wed","Thu","Fri","Sat"];
        const d = new Date();
        let day = shortday[d.getDay()];
        return day;
    }

    function clockChanged(mutations) {
        let outTime = 'Mon 00:00:00 - dd/mm/yy';
        let timeUTC = $(clock).text();
        let parts = timeUTC.split(" ");
        if (parts.length < 4) {
            outTime = parts[0] + " " + parts[1] + " - " + parts[2];
            //log("outTime1: ", outTime, " parts: ", parts);
        } else {
            let tm = parts[1].split(":");
            let dt = timeUTC.split(" ")[3].split("/");

            let tmpTm = new Date(Date.UTC(
                +("20" + dt[2]), +dt[1] - 1, +dt[0], +tm[0], +tm[1], +tm[2]
            )).toLocaleString();

            //log("tmpTm: ", tmpTm, " parts: ", parts, " tm: ", tm, " dt: ", dt);

            let parts2 = tmpTm.split(" "); // Parts2:  (3) ['2/14/2026,', '2:39:53', 'PM']
            //log("Parts2: ", parts2);
            outTime = getDayNow() + " " + parts2[1] + " - " + parts2[0];
            outTime = outTime.replace(/\/(\d{2})(\d{2})$/, '/$2');
            outTime = outTime.replaceAll(",","");
        }
        $(myClock).text(outTime);

        if (firstPass) switchClocks();
    }

    var inHide = false;
    const rstHide = () => { inHide = false; }
    function handleHideClock(e) {
        if (inHide == true) return;
        inHide = true;
        setTimeout(rstHide, 1000);
        getClock();
    }

    function hookClockBtn(retries=0) {
        let clkBtn = $("li.tc-clock > button");
        if (!$(clkBtn).length) {
            if (retries++ < 25) return setTimeout(hookClockBtn, 100, retries);
            return log("hookClockBtn: timed out!");
        }
        if ($(clkBtn).hasClass("xhk")) return;

        $(clkBtn).addClass("xhk");
        $(clkBtn).on('click', handleHideClock);
    }

    function getClock(retries=0) {
        clock = $($(".server-date-time").not(".xaddl")[0]);
        if ($(clock).length == 0) {
            if (retries++ < 20) return setTimeout(getClock, 100, retries);
            // fall through to hook the clock hide/show button
        } else {
            log("Got the clock: ", $(clock), $(".tc-clock-tooltip"));
            $(clock).after(`<span ID="loc" class="local-date-time"></span>`);
            myClock = $("#loc");
            $(".tc-clock-tooltip").on("click", switchClocks);

            dateObserver = new MutationObserver(clockChanged);
            dateObserver.observe($(clock)[0], options);
        }

        hookClockBtn();
    }

})();