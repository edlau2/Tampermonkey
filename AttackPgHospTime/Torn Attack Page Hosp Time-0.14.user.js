// ==UserScript==
// @name         Torn Attack Page Hosp Time
// @namespace    http://tampermonkey.net/
// @version      0.14
// @description  Display remaining hosp time on attack loader page
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=attack&user2ID*
// @run-at       document-start
// @connect      api.torn.com
// @connect      www.tornstats.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    const notifyAlerts = GM_getValue("notifyAlerts", true);
    const notifyAlertSecs = GM_getValue("notifyAlertSecs", 20);

    GM_setValue("notifyAlerts", notifyAlerts);
    GM_setValue("notifyAlertSecs", notifyAlertSecs);

    logScriptStart();

    var wasInHosp = false;
    const XID = new URLSearchParams(location.search).get("user2ID");
    var spy = {};
    const getHospTime = function() {xedx_TornUserQueryv2(XID, "basic", queryCb);}

    const noTtLa = true;    // The Torn Tools 'Last Action' div forces the other attackers
                            // view and damage you do off the bottom of the screen sometimes.
    const ttLastAction = "#tt-defender-last-action";

    var minSecsForBs = 15;
    var secsBefore = 1;
    var autoLoad = false;

    validateApiKey();
    addTornButtonExStyles();
    getHospTime();

    var outAt = 0;
    var clockTimer = null;
    var apiTimer = null;
    function queryCb(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        if (jsonObj.error) {
            debug("[queryCb] ERROR: ", jsonObj);
            return;
        }
        let status = jsonObj.profile.status;
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

    var notified;
    function checkAlerts(secs) {
        if (secs < notifyAlertSecs && !notified && document.hidden) doBrowserNotify();
        if (secs <= 10) $("#time-left").addClass("flash-grn");
    }

    function doBrowserNotify() {
        log("[doBrowserNotify]");
        notified = true;
        let name = $($("[class^='player_']")[1]).find("[id^='playername']").text();
        let msg = name + " out of hosp in " + notifyAlertSecs + " seconds!";
        GM_notification ({
            title: 'HospTimer',
            text: msg,
            //image: 'https://imgur.com/QgEtwu3.png',
            timeout: notifyAlertSecs * 1000,
            onclick: (context) => {
                window.focus();
            },
            ondone: () => {

            }
        });
    }

    var noBatstatsYet = true;
    function updateHospClock() {
        let diff = getSecsUntilOut();

        if (diff <= secsBefore && secsBefore > 0 && diff > 0 && autoLoad == true) {
            location.reload();
            return;
        }

        if (diff > minSecsForBs && noBatstatsYet == true) {
            let tmp = GM_getValue('lastSpy', null);
            if (!tmp) {
                queryBatStats();
            } else {
                spy = JSON.parse(tmp);
                if (spy.id == XID)
                    updateSpyUI(spy);
                else
                    queryBatStats();
            }
        }

        if (diff <= 0) {
            clearInterval(clockTimer);
            clearInterval(apiTimer);
            $("#time-wrap").remove();
            return;
        }
        //if (diff <= 10) $("#time-left").addClass("flash-grn");
        checkAlerts(diff);
        let date = new Date(null);
        date.setSeconds(diff);
        let timeStr = date.toISOString().slice(11, 19);
        $("#time-left").text(timeStr);
    }

    function truncToOneDec(number) {
        let res = Math.trunc(number / 100);
        return res;
    }

    function parseNumber(number) {
        const scales = [
            { name: "quintillion", aka: 'Q', power: 15 },
            { name: "trillion", aka: 'T', power: 12 },
            { name: "billion", aka: 'B', power: 9 },
            { name: "million", aka: 'M', power: 6 },
            { name: "thousand", aka: 'K', power: 3 }
        ];

        let result = "";
        let num = Number(number);
        let suffix = getSuffix(num);
        let firstMatch = false;

        for (const scale of scales) {
            if (num >= Math.pow(10, scale.power)) {
                let value = Math.floor(num / Math.pow(10, scale.power));
                if (firstMatch == true) value = truncToOneDec(value);
                result += `${value}`;
                num -= value * Math.pow(10, scale.power);
                if (firstMatch == false) {
                    result += '.';
                    firstMatch = true;
                } else {
                    //result = result + ' ' + suffix;
                    break;
                }
            }
        }

        if (num > 0) {
            result += `${num}`
        }

        result = parseFloat(result).toFixed(2);
        result = result + ' ' + suffix;
        return result.trim();

        function getSuffix(num) {
            for (let idx=0; idx < scales.length; idx++) {
                let scale = scales[idx];
                if (num >= Math.pow(10, scale.power)) {
                    return scale.aka;
                }
            }
            return '';
        }
    }

    GM_addStyle(`
        .spyd {
            width: 100%;
            height: 14px;
            display: flex;
            flex-flow: row wrap;
            justify-content: center;
            align-content: center;
        }
        .spys {
            display: flex;
            flex-flow: row wrap;
            justify-content: space-between;
            align-content: center;
        }
        .spys span {
            padding-right: 10px;
            padding-top: 10px;
        }
    `);

    function updateSpyUI(spy) {
        let statsDiv = `<div id="xspyd" class="spyd">
                            <span class="spys">
                               <span>Str: ${spy.str}</span>
                               <span>Def: ${spy.def}</span>
                               <span>Spd: ${spy.spd}</span>
                               <span>Dex: ${spy.dex}</span>
                               <span>Tot: ${spy.total}</span>
                            </span>
                        </div>`;

        if ($("#xspyd").length == 0) {
            let target = $("[class^='playersModelWrap_']");
            $(target).after(statsDiv);
        } else {
            $("#xspyd").replaceWith($(statsDiv));
        }
    }

    function getTornSpyCB(respText, ID) {
        let data = null;
        try {
            data = JSON.parse(respText);
        } catch (e) {
            log('Error parsing JSON: ', e);
        }
        if (!data || !data.status) {
            log('Error getting spy!', data);
        } else if (data.spy.status) {
            let spStr = parseNumber(data.spy.speed);
            let stStr = parseNumber(data.spy.strength);
            let defStr = parseNumber(data.spy.defense);
            let dexStr = parseNumber(data.spy.dexterity);
            let totStr = parseNumber(data.spy.total);
            spy = { id: XID, spd: spStr, str: stStr, def: defStr, dex: dexStr, total: totStr };

            GM_setValue('lastSpy', JSON.stringify(spy));
            debug('Spy result: ', spy);

            updateSpyUI(spy);
        }
    }

    function queryBatStats() {
        noBatstatsYet = false;
        xedx_TornStatsSpy(XID, getTornSpyCB);
    }



})();
