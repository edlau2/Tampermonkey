// ==UserScript==
// @name         Torn Attack Page Hosp Time
// @namespace    http://tampermonkey.net/
// @version      0.2
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

(function() {
    'use strict';

    const XID = idFromURL(location.href);

    logScriptStart();

    validateApiKey();
    xedx_TornUserQueryv2(XID, "basic", queryCb);

    // Make this a simple ajax with embedded success fn
    var outAt = 0;
    function queryCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        if (jsonObj.error) return;
        let status = jsonObj.status;
        if (!status || status.state != "Hospital") return;
        outAt = status.until;
        startHospTimer();
    }

    var timer = 0;
    function startHospTimer(retries=0) {
        let hdr = $("[class^='titleContainer_'] > h4");
        if (!$(hdr).length) {
            if (retries++ < 20) return setTimeout(startHospTimer, 250, retries);
            return;
        }
        addFlexStyles();
        GM_addStyle(`
            .time-span {
                padding: 2px 20px 2px 20px;
                margin-right: 0;
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
        `);
        let btnSpan = `
            <div class='xflexr xflex-center' style="margin-right: 36%;">
                <span id='time-left' class="time-span"></span>
            </div>
        `;

        $(hdr).after($(btnSpan));
        $(hdr).addClass("xflexr");
        updateHospClock();
        timer = setInterval(updateHospClock, 1000);
    }

    function getSecsUntilOut() {
        let nowSecs = new Date().getTime() / 1000;
        let diff = +outAt - nowSecs;
        return diff;
    }

    function updateHospClock() {
        let diff = getSecsUntilOut();
        if (diff <= 0) {
            clearInterval(timer);
            $("#time-left").remove();
            return;
        }
        if (diff <= 10) $("#time-left").addClass("flash-grn");
        let date = new Date(null);
        date.setSeconds(diff);
        let timeStr = date.toISOString().slice(11, 19);
        $("#time-left").text(timeStr);
    }

})();