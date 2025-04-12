// ==UserScript==
// @name         Torn Attack Page Hosp Time
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Display remaining hosp time on attack loader page
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=attack&user2ID*
// @run-at       document-start
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    console.log(GM_info.script.name + ' version ' +
        GM_info.script.version + ' script started');

    var wasInHosp = false;
    const XID = new URLSearchParams(location.search).get("user2ID");
    const getHospTime = function() {xedx_TornUserQueryv2(XID, "basic", queryCb);}

    const noTtLa = true;    // The Torn Tools 'Last Action' div forces the other attackers
                            // view and damage you do off the bottom of the screen sometimes.
    const ttLastAction = "#tt-defender-last-action";

    validateApiKey();
    addTornButtonExStyles();
    getHospTime();

    var outAt = 0;
    var clockTimer = null;
    var apiTimer = null;
    function queryCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        if (jsonObj.error) return;
        let status = jsonObj.status;
        if (!status || status.state != "Hospital") {
            $("#time-wrap").remove();
            clearInterval(apiTimer);
            clearInterval(clockTimer);
            if (wasInHosp == true) location.reload();
            wasInHosp = false;
            return;
        }
        outAt = status.until;
        if (!apiTimer && getSecsUntilOut() > 12)
            apiTimer = setInterval(getHospTime, 2000);
        if (!clockTimer)
            startHospTimer();
        wasInHosp == true;
    }

    function startHospTimer(retries=0) {
        if ($("#time-wrap").length > 0) return;
        let hdr = $("[class^='titleContainer_'] > h4");
        if (!$(hdr).length) {
            if (retries++ < 20) return setTimeout(startHospTimer, 250, retries);
            return;
        }
        
        GM_addStyle(`
            .xflexr {
                display: flex;
                flex-flow: row wrap;
            }
            .time-span {
                padding: 2px 20px 2px 20px;
                position: absolute;
                top: 50%;
                left: 57%;
                transform: translate(-50%, -50%);
                font-size: 18px;
            }
            .flash-grn {
                animation-name: flash-green;
                animation-duration: 0.4s;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                animation-direction: alternate;
                animation-play-state: running;
            }

            @keyframes flash-green {
                from {color: #00ee00;}
                to {color: #eeeeee;}
            }
            .xrt-btn {
                margin-left: auto;
                margin-right: 10px;
                float: right;
            }
        `);
        let clock = `
            <div id="time-wrap" class='xflexr xflex-center'>
                <span id='time-left' class="time-span"></span>
            </div>
        `;

        let rldBtn = `
                <span class="xrt-btn btn">
                   <input id="xrefresh" class="xedx-torn-btn" value="Reload">
               </span>`;

        // In case this is running with 'Attack Better'/'Move Attack Btn', this appends
        // the clock, and the UI for Attack Better will either place *before* this, or
        // *after* the title bar header if this isn't present....

        $(hdr).parent().css("position", "relative");
        $(hdr).parent().append($(clock));
        $(hdr).parent().append($(rldBtn));

        $("#xrefresh").on('click', function() {location.reload();});

        $(hdr).addClass("xflexr");
        updateHospClock();
        clockTimer = setInterval(updateHospClock, 1000);
    }

    function getSecsUntilOut() {
        let nowSecs = new Date().getTime() / 1000;
        let diff = +outAt - nowSecs;
        return diff;
    }

    function updateHospClock() {
        let diff = getSecsUntilOut();
        if (diff <= 0) {
            clearInterval(clockTimer);
            clearInterval(apiTimer);
            $("#time-wrap").remove();
            return;
        }
        if (diff <= 10) $("#time-left").addClass("flash-grn");
        let date = new Date(null);
        date.setSeconds(diff);
        let timeStr = date.toISOString().slice(11, 19);
        $("#time-left").text(timeStr);
    }

})();