// ==UserScript==
// @name         Torn Clock
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  This script copies the small clock onto the title/menu bar
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    if (checkCloudFlare()) return console.log("Won't run while challenge active!");

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let serverTime = 0;

    const updateTime = () => { serverTime = Number(serverTime) + 1; }
    setInterval(updateTime, 1000);

    const setTimeSecs = (res) => {
        if (!res.error) serverTime = Number(res.timestamp);
        log("ts: ", serverTime, " str: ", formatEpochToUTC(serverTime));
    };

    const clock = `<li class="addlClock active"><div><p><span class="server-date-time xaddl">Mon 00:00:00 - 00/00/00</span></p></div></li>`;
    // const setClock = () => { $("li.addlClock > div > p > span").text($("li.tc-clock > div > p > span").text()); }

    /*
    Number.prototype.padding = function(base, chr) {
        let len = (String(base || 10).length
                    - String(this).length) + 1;

        return len > 0 ? new Array(len).join(chr || '0')
                + this : this;
    }

    function fmtTime(d) {
        let tm = [ d.getHours().padding(),
                d.getMinutes().padding(),
                d.getSeconds().padding()].join(':');
        log("tm: ", tm);
        return tm;
    }

    function fmtDate(d) {
        let dt = [d.getDate().padding(),
                 (d.getMonth() + 1).padding(),
                  getShortYear(d)].join('/');
        log("dt: ", dt);
        return dt;
    }

    function getDOW(d) {
        let day = d.getDate();
        let dow = daysOfWeek[Number(day)];
        return dow;
    }

    function getShortYear(d) {
        let fullYear = d.getFullYear();
        let shortYear = fullYear.toString().slice(-2);
        return shortYear;
    }

    function formattedDate(d) {

        let str = getDOW(d) + " " + fmtDate(d) + " " + fmtTime(d);
        log("Date is: ", str);

        return str;

        // str = [(d.getMonth()+1).padding(),
        //         d.getDate().padding(),
        //         d.getFullYear()].join('/')
        //         + ' ' + [ d.getHours().padding(),
        //         d.getMinutes().padding(),
        //         d.getSeconds().padding()].join(':');
    }
    */

    function setClock() {
        let time = $($("li.tc-clock > div > p > span")[0]).text();
        if (!time) {
            let now = new Date(Number(serverTime));
            // let yr = getShortYear(now);
            // log("Time now: ", now, " yr: ", yr, " get yr: ", now.getFullYear());
            time = formatEpochToUTC(now.getTime());
            time = time.replace(/\/(\d{2})(\d{2})$/, '/$2');
        }
        $("li.addlClock > div > p > span").text(time);
    }

    function formatEpochToUTC(epochSecs) {
        const date = new Date(epochSecs * 1000);
        const dayOfWeek = daysOfWeek[date.getUTCDay()];
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const seconds = date.getUTCSeconds().toString().padStart(2, '0');
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        const year = date.getUTCFullYear();

        return `${dayOfWeek} ${hours}:${minutes}:${seconds} ${month}/${day}/${year}`;
    }

    function getServerTime() {
        const url = `https://api.torn.com/v2/torn/timestamp?key=${api_key}`;

        $.ajax({
            url: url,
            headers: {'Authorization': ('ApiKey ' + api_key)},
            type: 'GET',
            success: setTimeSecs,
            error: function (jqXHR, textStatus, errorThrown) {
                console.debug(GM_info.script.name + ": Error in ajax GET: ", textStatus, errorThrown, jqXHR);
            }
        });
    }

    function handlePageLoad(retries=0) {
        const target = $("#topHeaderBanner > div.header-wrapper-top > div > div.header-navigation.right > div > ul > li.avatar");
        if (!$(target).length) {
            if (retries++ < 50) return setTimeout(handlePageLoad, 100, retries);
            return log("Timed out...");
        }

        if (!$(".addlClock").length) {
            $(target).append(clock);
            setInterval(setClock, 1000);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    // Only public required
    validateApiKey();

    getServerTime();

    addStyles();
    callOnContentLoaded(handlePageLoad);

    function addStyles() {
        GM_addStyle(`
            .addlClock {
                position: absolute;
                top: 50%;
                transform: translateY(-25%);
                margin-left: 40px;
                width: 250px;
                display: flex;
            }
            .addlClock > div {
                height: 20px;
            }
            .addlClock > div > p > span {
                font-size: 14px;
                color: white;
            }
        `);
    }

})();