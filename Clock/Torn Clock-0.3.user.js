// ==UserScript==
// @name         Torn Clock
// @namespace    http://tampermonkey.net/
// @version      0.3
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

(function() {
    'use strict';

    const clock = `<li class="addlClock active"><div><p><span class="server-date-time">00:00:00 - 00/00/00</span></p></div></li>`;
    const setClock = () => { $("li.addlClock > div > p > span").text($("li.tc-clock > div > p > span").text()); }

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