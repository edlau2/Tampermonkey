// ==UserScript==
// @name         Torn Minimal Attack Page Hosp Time
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Display remaining hosp time on attack loader page
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=attack&user2ID*
// @run-at       document-start
// @connect      api.torn.com
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    function log(...data) {console.log(GM_info.script.name + ': ', ...data);}
    log("Script started");

    const api_key = GM_getValue('gm_api_key', "");
    const params = new URLSearchParams(location.search);
    const XID = params.get("user2ID");

    var outAt = 0;
    const URL = "https://api.torn.com/v2/user?selections=basic&id=3272749&key=" + api_key;
    $.ajax({url: URL, type: 'GET',
            success: function(result) {
                let status = result.status;
                if (!status || status.state != "Hospital") return;
                outAt = status.until;
                startHospTimer();
            },
            error: function(err){console.error("ajax error: ", err);}
        });

    GM_setValue('gm_api_key', api_key);

    var timer = 0;
    function startHospTimer(retries=0) {
        let hdr = $("[class^='titleContainer_'] > h4");
        if (!$(hdr).length) {
            if (retries++ < 20) return setTimeout(startHospTimer, 250, retries);
            return;
        }
        GM_addStyle(`
            #time-left {
                padding: 2px 20px 2px 20px;
                margin-right: 0;
                font-size: 18px;
            }
            #time-hdr {
                display: flex;
                flex-flow: row wrap;
                align-content: center;
                justify-content: center;
                margin-right: 36%;
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
        let btnSpan = `<div id="time-hdr"><span id='time-left' class="time-span"></span></div>`;

        $(hdr).after($(btnSpan));
        $(hdr).css({"display": "flex", "flex-flow": "row wrap"});
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