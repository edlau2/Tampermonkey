// ==UserScript==
// @name         Torn Fac Respect Earned
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Displays faction respect earned by you on the home page.
// @author       xedx [2100735]
// @match        https://www.torn.com/index.php
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// Note: requiring those versions of JQuery is very important for the ToolTips to display properly!

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    var jsonResp = null; // Global for returned stats
    var displayToolTips = true; // set to 'true' to display tool tips for respect

    // Callback triggered once the call to the Torn API completes
    function personalStatsQueryCB(responseText, ID, param) {
        jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            log('personalStatsQueryCB error! ', responseText);
            return handleError(responseText);
        }
        log('personalStatsQueryCB: ', jsonResp);
        buildPersonalRespectLi();
    }

    // Build the <li> we'll append in the Faction Stats section on the home page
    function buildPersonalRespectLi() {
        let respect = jsonResp.personalstats.respectforfaction;
        let children = document.querySelector("#column0").children;
        let useSel = null;
        let ul = null;
        for (let i=0; i<children.length; i++) {
            let title = children[i].querySelector("div.title.main-title.title-black.active.top-round > h5");
            if (!title) continue;
            if (title.innerText == 'Faction Information') {
                useSel = children[i];
                break;
            }
        };
        if (useSel) ul = $(useSel).find('div.bottom-round > div.cont-gray > ul.info-cont-wrap');
        log('buildPersonalRespectLi ul = ', ul);
        if (!ul) return console.log('Unable to find correct ul!');
        let li = '<li tabindex="0" role="row" aria-label="Personal Respect Earned"><div id="xedx-respect">' +
                     '<span class="divider"><span>Personal Respect Earned</span></span>' +
                     '<span class="desc">' + respect.toLocaleString("en") + '</span>' +
                 '</div></li>';
        $(ul).append(li);
        addFacToolTip(li); 
    }

    function addFacToolTip(li) {
        addToolTipStyle();

        let respect = jsonResp.personalstats.respectforfaction;
        let title = '<B>Respect Earned for Faction</B>';
        let honors = '<B>Honors - Respect in a Single Hit:</B>' + CRLF +
            TAB + '<B>Carnage (10): </B>' + hasHonor(256) + CRLF +
            TAB + '<B>Massacre (100): </B>' + hasHonor(477) + CRLF +
            TAB + '<B>Genocide (1,000): </B>' + hasHonor(478);
        let medals = '<B>Medals:</B>' + CRLF +
            buildMedalText('Recruit', respect, 100) +
            buildMedalText('Associate', respect, 500) +
            buildMedalText('Picciotto', respect, 1000) +
            buildMedalText('Soldier', respect, 2500) +
            buildMedalText('Capo', respect, 5000) +
            buildMedalText('Contabile', respect, 10000) +
            buildMedalText('Consigliere', respect, 25000) +
            buildMedalText('Underboss', respect, 50000) +
            buildMedalText('Boss', respect, 75000) +
            buildMedalText('Boss Of All Bosses', respect, 100000);
        let toolTipText = title + CRLF + CRLF + honors + CRLF + CRLF + medals;

        if (li) displayToolTip($('#xedx-respect')[0], toolTipText);
        return toolTipText;
    }

    // Miscellaneous utility functions
    function hasHonor(id) {
        return jsonResp.honors_awarded.includes(id) ?
            '<font color=green>Completed</font>' :
            '<font color=red>Not yet...</font>';
    }

    function buildMedalText(name, respect, needed) {
        let text = TAB + ((respect > needed) ? '<font color=green>' + name.toLocaleString() + ': ' + needed.toLocaleString() + ' (' + asHtmlPct(respect, needed) + ')' +
                    ', </font>' : '<font color=red>' + name.toLocaleString() + ': ' + needed.toLocaleString() + ' (' + asHtmlPct(respect, needed) + ')' +
                    ', </font>') + CRLF;
        return text;
    }

    function asHtmlPct(value, limit) {
        let pctText = value/limit * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
        }

        return pctText;
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (awayFromHome()) {return;}

    validateApiKey();
    versionCheck();

    window.onload = function () {
        let html = $('#skip-to-content').html();
        if (html.indexOf('Home') >= 0) {
            xedx_TornUserQuery('', 'personalstats,honors', personalStatsQueryCB, null);
        }
    };
})();

