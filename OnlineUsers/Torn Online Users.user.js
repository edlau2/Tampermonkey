// ==UserScript==
// @name         Torn Online Users
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Simply counts users online for other facs
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
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
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const updateIntervalSecs = GM_getValue("updateIntervalSecs", 10);
    GM_setValue("updateIntervalSecs", updateIntervalSecs);
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    var searchParams = new URLSearchParams(location.search);
    var hashParams = new URLSearchParams(location.hash);
    const iconSel = "[class*='userStatusWrap_'] > svg";

    const usersOk = function () {return $(".table-cell.status > span.okay").length;}
    const usersFallen = function () {return $(".table-cell.status > span.fallen").length;}
    const usersAway = function () { return $(".table-cell.status > span.traveling").length +
                                           $(".table-cell.status > span.abroad").length;}
    const usersInHosp = function () { return $(".table-cell.status > span.hospital").length +
                                           $(".table-cell.status:not(:has(*))").length;}


    var online = 0;
    var offline = 0;
    var idle = 0;
    var userCount = 0;

    function hashChangeHandler() {
        debug("hashChangeHandler");
        handlePageLoad();
    }

    function pushStateChanged(e) {
        debug("pushStateChanged");
        handlePageLoad();
    }

    function logParams() {
        let msgText = "Search Params:\n  ";
        searchParams.forEach(function(value, key) {
            msgText += ` key: ${key} value: ${value}\n`;
        });
        log(msgText);
        msgText = "Hash Params:\n  ";
        hashParams.forEach(function(value, key) {
            msgText += ` key: ${key} value: ${value}\n`;
        });
        log(msgText);
    }

    function onFacProfilePage() {
        searchParams = new URLSearchParams(location.search);
        hashParams = new URLSearchParams(location.hash);

        let step = searchParams.get('step');
        let type = searchParams.get('type');
        let tab = hashParams.get('#/tab');

        log("searchParams, type: ", type, " step: ", step, " tab: ", tab);

        if (step == 'profile') return true;
        if (step == 'your' && /*type == '1' &&*/ tab == 'info') return true;

        return false;
    }

    function shortTimeStamp(date) {
        if (!date) date = new Date();
        const timeOnly = new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        return timeOnly.format(date);
    }

    function updateUserCountUI() {
        $("#xcnt-online").text(online);
        $("#xcnt-offline").text(offline);
        $("#xcnt-idle").text(idle);

        $("#xcnt-ok").text(usersOk);
        $("#xcnt-away").text(usersAway);
        $("#xcnt-hosp").text(usersInHosp);

        $("#xcnt-time").text(shortTimeStamp());
    }

    function updateUserCounts(retries=0) {
        let userIconList = $(iconSel);
        let len = $(userIconList).length;
        if (userIconList && len > 0) {
            online = offline = idle = userCount = 0;
            for (let idx=0; idx<len; idx++) {
                let node = userIconList[idx];
                userCount++;
                let fill = $(node).attr('fill');
                if (fill) {
                    if (fill.indexOf('offline') > -1) offline++;
                    else if (fill.indexOf('online') > -1) online++;
                    else if (fill.indexOf('idle') > -1) idle++;
                }
            }
            if (idle > 0) idle = idle - usersFallen();

            updateUserCountUI();
            //debug("User count: ", userCount, " online: ", online, " offline: ", offline, " idle: ", idle);
        } else {
            if (retries++ < 20) return setTimeout(handlePageLoad, 250, retries);
        }
    }

    function installTitleBar(retries=0) {
        if ($("#xonline-title").length != 0) return;

        let facwrap = $(".faction-info-wrap");
        if (!$(facwrap).length) {
            if (retries++ < 20) return setTimeout(installTitleBar, 250, retries);
            return log("Too many retries!");
        }

        let target = ($(facwrap).length > 1) ? $(facwrap)[1] : $(facwrap);
        let titleBarDiv = getTitleBarDiv();
        $(target).before(titleBarDiv);
        $("#xedx-refresh-btn").on('click', updateUserCounts);

    }

    var timer = null;
    function handlePageLoad(retries=0) {
        logParams();
        if (!onFacProfilePage())
            return log("Not on fac profile page!");

        if ($("#xonline-title").length == 0) {
            installTitleBar();
        }

        updateUserCounts();
        if (timer) clearInterval(timer);
        timer = setInterval(updateUserCounts, updateIntervalSecs*1000);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    //validateApiKey();

    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    if (!onFacProfilePage()) {
        logParams();
        return log("Not on fac profile page!");
    }

    callOnContentLoaded(handlePageLoad);

    // ========================= UI stuff =========================

    // <div id="xonline-title" class="title-black m-top10" data-title="user-counts" role="heading" aria-level="5">
    function getTitleBarDiv() {
        let titleBarDiv = `
            <div id="xonline-title" class="title-black m-top10">
                <div class="counts-wrap">
                    <div class="counts-wrap xmr20">
                        <span class="count-span xmr20">
                            <span class="xmr5">Online: </span>
                            <span id="xcnt-online" class="count-text"></span>
                        </span>
                        <span class="count-span xmr20">
                            <span class="xmr5">Offline: </span>
                            <span id="xcnt-offline" class="count-text"></span>
                        </span>
                        <span class="count-span xmr20">
                            <span class="xmr5">Idle: </span>
                            <span id="xcnt-idle" class="count-text"></span>
                        </span>
                    </div>

                    <div class="counts-wrap xml20">
                        <span class="count-span xmr20">
                            <span class="xmr5">OK: </span>
                            <span id="xcnt-ok" class="count-text"></span>
                        </span>
                        <span class="count-span xmr20">
                            <span class="xmr5">Hosp: </span>
                            <span id="xcnt-hosp" class="count-text"></span>
                        </span>
                        <span class="count-span xmr20">
                            <span class="xmr5">Away: </span>
                            <span id="xcnt-away" class="count-text"></span>
                        </span>
                    </div>

                        <span class="count-span" style="margin-left: auto;">
                            <span class="xmr5">Updated: </span>
                            <span id="xcnt-time"></span>
                        </span>
                        <input id="xedx-refresh-btn xml10" type="submit" class="xedx-torn-btn xmr10 xmt3" value="Refresh">
                    </div>
                </div>
            </div>
        `;

        return titleBarDiv;
    }

    function addStyles() {

    addTornButtonExStyles();
    loadCommonMarginStyles();

    GM_addStyle(`
        .counts-wrap {
            display: flex;
            flex-flow: row wrap;
            align-content: center;
        }

        .count-span {
            display: flex;
            flex-flow: row wrap;
            justify-content: space-between;
        }

        .count-text {
            font-size: 15px;
        }

        .counts-wrap input {
            position: relative;
            margin-left: 10px;
        }
    `);
    }



})();


