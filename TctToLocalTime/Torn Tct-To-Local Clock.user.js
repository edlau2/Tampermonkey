// ==UserScript==
// @name         Torn Tct-To-Local Clock
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Toggle clock to local time (and back!)
// @author       xedx [2100735]
// @match        https://www.torn.com/*
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

    const switchClocks = () => {
        $(clock).css("display", dispLocal ? "none" : "block");
        $(myClock).css("display", dispLocal ? "block" : "none");
        dispLocal = !dispLocal;
        firstPass = false;
    }

    console.log(GM_info.script.name + ' version ' + GM_info.script.version + ' script started!');
    getClock();

    function clockChanged(mutations) {
        let timeUTC = $(clock).text();
        let tm = timeUTC.split(" ")[1].split(":");
        let dt = timeUTC.split(" ")[3].split("/");
        $(myClock).text(new Date(Date.UTC(
            +("20" + dt[2]), +dt[1], +dt[0], +tm[0], +tm[1], +tm[2]
        )).toLocaleString());

        if (firstPass) switchClocks();
    }

    function getClock() {
        console.log("tct getClock");
        clock = $(".server-date-time");
        console.log("clock: ", $(clock));
        if ($(clock).length == 0 && retries++ < 5) return setTimeout(getClock, 100);
        if (retries < 5) {
            $(clock).after(`<span ID="loc" class="local-date-time"></span>`);
            myClock = $("#loc");
            $(myClock).on("click", switchClocks);
            $(clock).on("click", switchClocks);

            dateObserver = new MutationObserver(clockChanged);
            dateObserver.observe($(clock)[0], options);
        }
    }

})();