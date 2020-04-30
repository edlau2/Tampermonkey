// ==UserScript==
// @name         Torn Fac Respect Earned
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Displays faction respect earned by you on the home page.
// @author       xedx [2100735]
// @match        https://www.torn.com/index.php
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// Note:
// GM_xmlhttpRequest, GM_getValue and GM_setValue are used to interact with the Torn API.
// GM_addStyle is used to create the tooltip style.
// jquery-ui.js is included to help create the tooltips, and is included with the verion
// of jquery that it expects.

(function() {
    'use strict';

    // Callback triggered once the call to the Torn API completes
    function personalStatsQueryCB(responseText, ID, param) {
        jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        buildPersonalRespectLi();
    }

    // Build the <li> we'll append in the Faction Stats section on the home page
    function buildPersonalRespectLi() {
        let respect = jsonResp.personalstats.respectforfaction;
        let ul = $('#item4875408').find('div.bottom-round > div.cont-gray > ul.info-cont-wrap');
        let li = '<li id="xedx-respect" tabindex="0" role="row" aria-label="Personal Respect Earned' + respect.toLocaleString("en") + '">' +
                 '<span class="divider"> <span>Personal Respect Earned</span></span><span class="desc">' +
            respect.toLocaleString("en") + '</li>';
        $(ul).append(li);
        addToolTip();
    }

    // Add a tool tip for the <li> detailing honor bars/medals, and progress
    function addToolTip() {
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

        displayToolTip($('#xedx-respect')[0], toolTipText);
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
        var pctText = value/limit * 100;
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

    var jsonResp = null; // Global for returned stats

    window.onload = function () {
        let html = $('#skip-to-content').html();
        if (html.indexOf('Home') >= 0) {
            xedx_TornUserQuery('', 'personalstats,honors', personalStatsQueryCB, null);
        }
    };
})();