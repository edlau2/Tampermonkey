// ==UserScript==
// @name         Torn Tide Level
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  This script places an icon on the sidebar with current tide level.
// @author       xedx [2100735]
// @run-at       document-start
// @match        https://www.torn.com/*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    logScriptStart();

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    const rfcv = getRfcv();
    const notifyOnReq = GM_getValue('notifyOnReq', false);
    const queryTideInterval = GM_getValue('queryTideInterval', 15000);
    const crimesURL = `https://www.torn.com/page.php?sid=crimesData&step=crimesList&rfcv=${rfcv}`;
    const postData = { sid: 'crimesData', step: 'crimesList', rfcv: rfcv, typeID: 1 };
    const iconSel = ".icon99__tidepool";

    const readTideCache = function () {tideVals = JSON.parse(GM_getValue("tideValues", JSON.stringify([])));}
    const writeTideCache = function () {GM_setValue("tideValues", JSON.stringify(tideVals));}
    const classForScale = function (scale) { return +scale >= 68 ? "tidepool-green" : +scale >= 33 ? "tidepool-yellow" : "tidepool-red"; }
    const atCrimeHub = function () {return (location.search.indexOf('crimes') > -1 && location.hash == '#/');}
    const xedx_addStyle = function(styles) {
        (typeof GM_addStyle != "undefined") ?
            GM_addStyle(styles) :
            (styles) => {
                const styleElement = document.createElement("style");
                styleElement.setAttribute("type", "text/css");
                styleElement.innerHTML = styles;
                document.head.appendChild(styleElement);
            }
    };

    if (abroad()) return log("Can't check while abroad!");

    GM_setValue('notifyOnReq', notifyOnReq);
    GM_setValue('queryTideInterval', queryTideInterval);

    var beachInfo = {};
    var intTimer;
    var tideVals;
    readTideCache();
    drawTempIcon();

    function processCrimesResult(response, status, xhr) {
        let DB = response.DB;
        let crimes = DB ? DB.crimesByType : null;
        if (!crimes || !Object.keys(crimes).length)
            return log("Error: didn't find crimes! ");

        if (Object.keys(crimes[3].additionalInfo).length)
            beachInfo = JSON.parse(JSON.stringify(crimes[3].additionalInfo));
        else
            return log("ERROR getting info: ", crimes[3].additionalInfo);

        if (document.readyState == 'loading') {
            document.addEventListener('DOMContentLoaded', addUpdateStatusIcon);
        } else {
            addUpdateStatusIcon();
        }
    }

    function blink(n) {
        if (n > 0) {
            $(iconSel).toggleClass('xbl');
            return setTimeout(blink, 200, (n-1));
        } else {
            $(iconSel).removeClass('xbl');
        }
    }

    function queryTideLevel() {
        if (notifyOnReq == true) blink(6);
        $.ajax({
            url: crimesURL, type: 'POST', data: postData,
            success: function (response, status, xhr) {
                processCrimesResult(response, status, xhr);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("Error: ", textStatus, errorThrown, jqXHR);
            }
        });
    }

    queryTideLevel();

    addStyles();

    // ==================================

    function getTornTideColor(retries=0) {
        if (!atCrimeHub()) return;
        let node = $("[class^='statusCirclePosition'][aria-label^='Search the Beach'] [class='CircularProgressbar-path']");
        let style = $(node).attr("style"), obj = {};
        if (style) {
            let parts = style.split(';');
            if (parts) parts.forEach((part) => {
                obj[part.split(":")[0]] = part.split(":")[1];
            });
        }

        return obj.stroke;
    }

    function isRGB(c) {
        if ((typeof c === 'string' && c.length > 0) != true) return false;
        if (c.toLowerCase().indexOf('rgb') > -1) return true;
        return false;
    }

    function getCachedEntry(scale, entry, retries=0) {
        let newEntry = entry;
        if (!newEntry) {
            let cachedEntry = tideVals[scale];
            if (cachedEntry) {
                if (atCrimeHub() && !cachedEntry.ttc) {
                    cachedEntry.ttc = getTornTideColor();
                    if (!cachedEntry.ttc) if (retries++ < 10) {
                        setTimeout(getCachedEntry, 50, scale, null, retries);
                        return null;
                    }
                    if (cachedEntry.ttc)
                        cachedEntry.dirty = true;
                }
                setTimeout(addUpdateStatusIcon, 100, cachedEntry);
                return null;
            }
        }

        let t = beachInfo.title;
        if (!newEntry) {
            let lvl = t ? t.split(":").map(item => item.trim())[1].toLowerCase() : 'mid';
            let tide = lvl.split('-')[0];
            newEntry = {level: lvl, color: '', ttc: '', iconLvl: tide, dirty: false};
            tideVals[scale] = JSON.parse(JSON.stringify(newEntry));
            debug("new entry: ", newEntry);
        }

        newEntry.ttc = getTornTideColor();
        if (!newEntry.ttc && atCrimeHub() && retries++ < 10) {
            setTimeout(getCachedEntry, 50, scale, newEntry, retries);
            return null;
        }

        setTimeout(addUpdateStatusIcon, 100, newEntry);
        return null;
    }

    var lastScale;
    function addUpdateStatusIcon(newEntry, retries=0) {
        let t = beachInfo.title, scale = beachInfo.scale;
        if (lastScale && scale == lastScale) return;

        if (newEntry instanceof Event) newEntry = null;
        let entry = newEntry ? newEntry : getCachedEntry(scale);
        if (!entry) return; // will be called back

        debug("addUpdateStatusIcon: ", lastScale, scale,  entry);
        lastScale = scale;

        if (entry.ttc && entry.ttc != entry.color) {
            entry.dirty = true;
            entry.color = entry.ttc;
        }

        if (!entry.color) {
            let R = 255 * (100 - +scale)/100, G = (+scale / 100) * 255;
            entry.color = `rgba(${R}, ${G}, 0, 1)`;
            entry.dirty = true;
        }

        let stroke = entry.ttc ? entry.ttc : getTornTideColor();
        if (stroke && isRGB(stroke)) {
            entry.color = entry.ttc = stroke;
            entry.dirty = true;
        }

        if (entry.ttc && isRGB(entry.ttc) == false) {
            entry.ttc = null;
            entry.dirty = true;
        }
        let isDirty = entry.dirty;
        tideVals[scale] =
            JSON.parse(JSON.stringify({level: entry.level, color: entry.color, ttc: entry.ttc, iconLvl: entry.iconLvl, dirty: false}));
        if (isDirty == true) writeTideCache();

        GM_setValue("lastIconEntry", scale);
        drawNewIcon(entry);

        if (!intTimer) intTimer = setInterval(queryTideLevel, queryTideInterval);
    }

    function drawTempIcon(retries=0) {
        if ($(iconSel).length > 0) return;
        let node = $("#sidebarroot ul[class^='status-icons_']");
        if ($(node).length == 0) {
            if (retries++ < 50) return setTimeout(drawTempIcon, 100, retries);
            return;
        }
        let scale = GM_getValue("lastIconEntry", null);
        if (!scale) return;
        let entry = tideVals[scale];
        if (!entry) return;
        drawNewIcon(entry, scale);
    }

    function drawNewIcon(entry, scale) {
        if (!scale) scale = beachInfo.scale;
        let dataLvl = $("#x-tide-line > path").data("lvl");
        document.body.style.setProperty('--color-tide', entry.color);
        let msg = entry.level + ", " + scale + "%";

        let ul = $("ul[class^='status-icons_']");
        let iconsList = $(`ul[class^='status-icons_'] > li`);
        let iconSvg = getBeachIcon(entry.iconLvl, scale);

        let newLi = `<li class="icon99__tidepool svgWrap"
                         title="Tide Level" style="white-space: pre-line;" data-html="true">
                         ${iconSvg}
                         <a href="#" aria-label="Tides" tabindex="0"></a>
                     </li>`;

        $(iconSel).remove();
        $(ul).append(newLi);

        $(iconSel).tooltip({content: msg, classes: {"ui-tooltip": "tooltip5"}});
        $(iconSel).on('click', function(){
            window.open(`https://www.torn.com/loader.php?sid=crimes#/searchforcash`, '_blank');
        });
    }

    var stylesAdded = false;
    function addStyles() {
        if (stylesAdded == true) return;
        stylesAdded = true;
        addIconStyles();
        xedx_addStyle(`
            :root {--color-tide: #transparent;}
            .xbl { filter: brightness(1.8) !important;}
            .tooltip5 {
                radius: 4px !important;
                background-color: #000000 !important;
                filter: alpha(opacity=80);
                opacity: 0.80;
                padding: 5px 20px;
                border: 2px solid gray;
                border-radius: 10px;
                width: fit-content;
                margin: 10px;
                text-align: left;
                font: bold 14px ;
                font-stretch: condensed;
                text-decoration: none;
                color: #FFF;
                font-size: 1em;
                z-index: 999999;
             }
        `);
    }

    function addIconStyles() {
        xedx_addStyle(`
            .svgWrap {
                position: relative;
                background-image: none !important;
                width: 22px;
                border-radius: 11px;
                cursor: pointer;
            }
            .tidalCircle {
                background: var(--crimes-hub-statusCircle-background);
                border-radius: calc(var(--crimes-hub-statusCircle-size)/2);
                box-sizing: border-box;
                height: 54px;
                overflow: hidden;
                padding: 1px;
                pointer-events: auto;
                position: absolute !important;
                top: 0;
                width: 18px !important;
                z-index: 99998;
            }
            .wigglyWrapper {
                left: 2px;
                position: absolute;
                top: 2px;
            }
            .wigglyIcon {
                width: 18px;
                height: 18px;
                position: absolute;
                top: 0;
                transform: translate(2px, 4px);
            }
            .wigglyIcon svg {
                position: absolute;
                /*top: 2%;*/
                /*transform: translate(3px, -12px);*/
                z-index: 99999998;
            }
            .CircularProgressbar {
                position: absolute;
                top: 0;
                width: 18px;
                border-radius: 9px;

             /* background: linear-gradient(180deg,#666,#444);
                box-shadow: 0 0 2px #666; */
            }
            .CircularProgressbar:hover {
                transform: translateX(-50%) scale(1.2);
                z-index: 99999;
            }

            .fillColor { fill: var(--color-tide); }
            .strokeColor { stroke: var(--color-tide); }
        `);
    }

    function midTideIco() {
        return `<path data-lvl='mid' d="M16,5.09c-.02.47-.39.85-.86.87-.54.04-1.05.3-1.39.72-.55.66-1.34,1.07-2.19,1.15-.85-.07-1.64-.49-2.19-1.15-.33-.42-.83-.69-1.37-.72-.54.04-1.03.3-1.37.72-.55.66-1.34,1.07-2.19,1.15-.85-.07-1.64-.49-2.19-1.15-.33-.42-.83-.69-1.37-.72-.47-.02-.85-.4-.86-.87,0-.47.39-.85.86-.86.96.05,1.87.47,2.52,1.18.53.49.8.7,1.05.7s.51-.21,1.03-.7c.66-.71,1.56-1.13,2.53-1.18.96.05,1.87.47,2.53,1.17.53.49.8.7,1.05.7s.51-.21,1.03-.7c.66-.71,1.56-1.13,2.53-1.17.46.02.83.39.85.86Z"></path>
                <path                d="M15.11.03h-.21c-.88.12-1.69.52-2.32,1.15-.47.42-.72.66-.95.7-.04,0-.06.02-.08.02-.11,0-.21-.05-.3-.11-.27-.17-.52-.38-.74-.62C9.86.47,8.96.05,8,0h-.21c-.88.12-1.69.52-2.31,1.15-.46.42-.72.66-.95.7-.04,0-.06.02-.08.02-.11,0-.21-.05-.3-.11-.04-.02-.08-.04-.13-.06-.22-.17-.43-.34-.63-.53C2.73.47,1.83.05.87,0,.39.02.01.4,0,.87c0,.47.39.85.86.85.54.04,1.03.3,1.37.72.55.66,1.34,1.08,2.19,1.15h.19c.78-.14,1.49-.54,2-1.15.23-.25.51-.45.82-.6.07-.02.11-.04.16-.06s.13-.02.19-.04c.06,0,.13-.02.21-.02.54.04,1.03.3,1.37.72.13.11.25.23.4.38.48.48,1.11.76,1.79.79h.19c.78-.14,1.49-.54,2-1.15.23-.25.51-.45.82-.6.06-.02.11-.04.17-.06s.13-.02.19-.04c.06,0,.13-.02.21-.02.47-.02.84-.39.87-.85-.03-.48-.41-.85-.89-.87Z"></path>`;
    }

    function lowTideIco() {
        return `<path data-lvl='low' d="M16,.86c-.02.47-.39.85-.86.87-.54.04-1.05.3-1.39.72-.55.66-1.34,1.08-2.19,1.15-.85-.07-1.64-.49-2.19-1.15-.33-.42-.83-.69-1.37-.72-.54.04-1.04.3-1.37.72-.55.66-1.34,1.08-2.19,1.15-.86-.07-1.64-.49-2.19-1.15-.33-.42-.83-.69-1.37-.72-.47-.02-.85-.4-.86-.87C0,.38.39,0,.86,0c.96.05,1.87.47,2.53,1.18.53.49.8.7,1.05.7s.51-.21,1.03-.7c.66-.71,1.56-1.13,2.53-1.18.96.05,1.87.47,2.53,1.17.53.49.8.7,1.06.7s.51-.21,1.03-.7c.66-.71,1.56-1.13,2.53-1.17.46.02.83.39.84.86Z"></path>`;
    }

    function highTideIco() {
        return `<path data-lvl='high' d="M16,9.26c-.02.47-.39.85-.86.87-.54.04-1.05.3-1.39.72-.55.66-1.34,1.07-2.19,1.15-.85-.07-1.64-.49-2.19-1.15-.33-.42-.83-.69-1.37-.72-.54.04-1.03.3-1.37.72-.55.66-1.34,1.07-2.19,1.15-.85-.07-1.64-.49-2.19-1.15-.33-.42-.83-.69-1.37-.72-.47-.02-.85-.4-.86-.87,0-.47.39-.85.86-.86.96.05,1.87.47,2.52,1.18.53.49.8.7,1.05.7s.51-.21,1.03-.7c.66-.71,1.56-1.13,2.53-1.18.96.05,1.87.47,2.53,1.17.53.49.8.7,1.05.7s.51-.21,1.03-.7c.66-.71,1.56-1.13,2.53-1.17.46.02.83.39.85.86Z"></path>
                <path                 d="M.86,1.72c.54.03,1.03.28,1.37.7.54.66,1.33,1.08,2.19,1.15h.19c.78-.14,1.49-.54,2-1.15.31-.36.72-.6,1.18-.7.06,0,.13-.02.21-.02.54.03,1.03.28,1.37.7.13.11.25.23.4.38.48.48,1.11.76,1.79.79h.19c.78-.14,1.49-.54,2-1.15.31-.36.72-.6,1.18-.7.06,0,.13-.02.21-.02.11,0,.22-.02.32-.06.05-.02.1-.05.15-.08.24-.15.39-.42.4-.7,0-.11-.02-.22-.06-.32h0c-.04-.1-.11-.2-.19-.28-.04-.04-.08-.08-.13-.11-.05-.03-.1-.06-.15-.08-.05-.03-.11-.04-.17-.05-.05-.02-.11-.02-.17-.02h-.21c-.88.11-1.7.51-2.32,1.15-.47.42-.72.66-.95.7-.04,0-.06.02-.08.02-.06,0-.13-.02-.19-.04-.18-.09-.34-.21-.48-.36-.13-.1-.25-.21-.36-.32C9.88.45,8.98.04,8.02,0h-.21c-.88.11-1.7.51-2.32,1.15-.47.42-.72.66-.95.7-.04,0-.06.02-.08.02-.07,0-.13-.02-.19-.04-.08-.04-.16-.08-.23-.13-.22-.17-.43-.34-.63-.53C2.75.47,1.85.06.89.02h-.08C.34.05-.02.45,0,.92c0,.45.38.82.84.81,0,0,.02,0,.02,0Z"></path>
                <path                 d="M15.11,4.19h-.21c-.88.12-1.69.52-2.32,1.15-.47.42-.72.66-.95.7-.04,0-.06.02-.08.02-.11,0-.21-.05-.3-.11-.27-.17-.52-.38-.74-.62-.66-.7-1.56-1.12-2.52-1.17h-.21c-.88.12-1.69.52-2.31,1.15-.46.42-.72.66-.95.7-.04,0-.06.02-.08.02-.11,0-.21-.05-.3-.11-.04-.02-.08-.04-.13-.06-.22-.17-.43-.34-.63-.53-.66-.7-1.56-1.12-2.52-1.17C.39,4.18.01,4.56,0,5.04c0,.47.39.85.86.85.54.04,1.03.3,1.37.72.55.66,1.34,1.08,2.19,1.15h.19c.78-.14,1.49-.54,2-1.15.23-.25.51-.45.82-.6.07-.02.11-.04.16-.06s.13-.02.19-.04c.06,0,.13-.02.21-.02.54.04,1.03.3,1.37.72.13.11.25.23.4.38.48.48,1.11.76,1.79.79h.19c.78-.14,1.49-.54,2-1.15.23-.25.51-.45.82-.6.06-.02.11-.04.17-.06s.13-.02.19-.04c.06,0,.13-.02.21-.02.47-.02.84-.39.87-.85-.03-.48-.41-.85-.89-.87Z"></path>`;
    }

    function getBeachIcon(level, scale) {
        let useIco = midTideIco();
        let offset = "17%";
        let strokeOffset = (+scale/100 * 300);
        log("Set stroke offset to: ", (+scale/100 * 300), "scale: ", scale, " offset: ", strokeOffset);

        if (level && level == 'mid') {useIco = midTideIco(); offset="17%";}
        else if (level && level == 'high') {useIco = highTideIco(); offset="3%";}
        else if (level && level == 'low') {useIco = lowTideIco(); offset="35%";}

        let icon = `
                <svg class="CircularProgressbar" viewBox="0 0 100 100" data-test-id="CircularProgressbar">
                    <path class="CircularProgressbar-trail" d="
                          M 50,50
                          m 0,-47.5
                          a 47.5,47.5 0 1 1 0,95
                          a 47.5,47.5 0 1 1 0,-95
                        " stroke-width="5" fill-opacity="0"
                        style="stroke: transparent; stroke-linecap: butt;
                               stroke-dasharray: ${strokeOffset}px, ${strokeOffset}px; stroke-dashoffset: 0px;">
                    </path>
                    <path class="xCircularProgressbar-path strokeColor" d="
                          M 50,50
                          m 0,-47.5
                          a 47.5,47.5 0 1 1 0,95
                          a 47.5,47.5 0 1 1 0,-95
                        " stroke-width="5" fill-opacity="0"
                        style="stroke-linecap: butt; transition-duration: 0.5s;
                               stroke-dasharray: ${strokeOffset}px, ${strokeOffset}px; stroke-dashoffset: 0px;">
                    </path>
                </svg>
                <div class="wigglyIcon" style="--icon-offset-x: 0px; --icon-offset-y: 0px; --scale: 1; --translate-y: 0px;">
                    <svg id="x-tide-line" style="top: ${offset};" xmlns="http://www.w3.org/2000/svg" width="16" height="23.61" viewBox="0 0 16 23.61" class="fillColor">
                        ${useIco}
                    </svg>
                </div>
        `;

        return icon;
    }

})();