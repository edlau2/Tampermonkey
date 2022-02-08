// ==UserScript==
// @name         Torn Jail Stats
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Adds basic jail stats to the Home page, jail busts and fails, bails and bail fees.
// @author       xedx [2100735]
// @include      https://www.torn.com/index.php
// @updateURL    https://github.com/edlau2/Tampermonkey/blob/master/JailStats/Torn%20Jail%20Stats.user.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

const extDivId = 'xedx-jailstats-ext-div';
const jail_stat_div = '<div class="sortable-box t-blue-cont h" id="' + extDivId + '">' +
      '<div id="xedx-header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
          '<div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>' +
          '<div class="move-wrap"><i class="accordion-header-move right"></i></div>' +
          'Jail and Bounty Stats' +
      '</div>' +
      '<div class="bottom-round">' +
          '<div id="xedx-jail-stats-content-div" class="cont-gray bottom-round" style="width: 386px; height: 174px; overflow: auto">' +
              '<ul class="info-cont-wrap">' +
                  '<li id="xedx-busts" title="original"><span class="divider" id="xedx-div-span-peoplebusted"><span>People Busted</span></span><span id="xedx-val-span-peoplebusted" class="desc">0</span></li>' +
                  '<li><span class="divider" id="xedx-div-span-failedbusts"><span>Failed Busts</span></span><span id="xedx-val-span-failedbusts" class="desc">0</span></li>' +
                  '<li id="xedx-bails" title="original"><span class="divider" id="xedx-div-span-peoplebought"><span>People Bailed</span></span><span id="xedx-val-span-peoplebought" class="desc">0</span></li>' +
                  '<li><span class="divider" id="xedx-div-span-peopleboughtspent"><span>Bail Fees</span></span><span id="xedx-val-span-peopleboughtspent" class="desc">0</span></li>' +
                  '<li><span class="divider" id="xedx-div-span-jailed"><span>Times Jailed</span></span><span id="xedx-val-span-jailed" class="desc">0</span></li>' +
                  '<li id="xedx-bounties" title="original"><span class="divider" id="xedx-div-span-bountiescollected"><span>Bounties Collected</span></span><span id="xedx-val-span-bountiescollected" class="desc">0</span></li>' +
                  '<li id="xedx-fees" title="original"><span class="divider" id="xedx-div-span-totalbountyreward"><span>Bounty Rewards</span></span><span id="xedx-val-span-totalbountyreward" class="desc">0</span></li>' +
              '</ul>' +
          '</div>' +
      '</div>' +
  '</div>';


(function() {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Build the Jail Stats div, append underneath the Personal Perks div
    //////////////////////////////////////////////////////////////////////

    function buildJailStatsDiv() {
        if (document.querySelector(extDivId)) {return;} // Only do this once

        var mainDiv = document.getElementById('column0');
        if (!validPointer(mainDiv)) {return;}
        $(mainDiv).append(jail_stat_div);

        xedx_TornUserQuery('', 'personalstats', personalStatsQueryCB); // Callback will set the correct values.
    }

    //////////////////////////////////////////////////////////////////////
    // Callback to parse returned JSON.
    //////////////////////////////////////////////////////////////////////

    let statArray = ['peoplebusted', 'failedbusts','peoplebought','peopleboughtspent','jailed','bountiescollected','totalbountyreward'];
    function personalStatsQueryCB(responseText) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        for (let i=0; i<statArray.length; i++) {
            let name = statArray[i];
            let searchName = 'xedx-val-span-' + name;
            let valSpan = document.getElementById(searchName);
            let stats = jsonResp.personalstats;
            if (!validPointer(valSpan)) {
                console.log('Unable to find proper span: ' + searchName + ' at ' + document.URL);
                continue;
            }
            if (!validPointer(stats[name])) {continue;}
            if (!name.localeCompare('totalbountyreward') || !name.localeCompare('peopleboughtspent')) {
                valSpan.innerText = '$' + numberWithCommas(stats[name]);
            } else {
                valSpan.innerText = stats[name];
            }
        }

        addToolTips();
    }

    //////////////////////////////////////////////////////////////////////
    // Functions to add tooltips for honor bars/medals (merits)
    //////////////////////////////////////////////////////////////////////

    function addToolTips() {
        addToolTipStyle();

        var bustsLi = document.getElementById('xedx-busts');
        var bailsLi = document.getElementById('xedx-bails');
        var bountiesLi = document.getElementById('xedx-bounties');
        var feesLi = document.getElementById('xedx-fees');

        if (validPointer(bustsLi) && validPointer(bailsLi) &&
            validPointer(bountiesLi) && validPointer(feesLi)) {
            buildBustsToolTip('People Busted');
            buildBailsToolTip('People Bailed');
            buildBountiesToolTip('Bounties Collected');
            buildFeesToolTip('Bounty Rewards');
        }
    }

    function buildFeesToolTip(title) {
        var feesLi = document.getElementById('xedx-fees');
        var feesText = document.getElementById('xedx-val-span-totalbountyreward').innerText;
        var tmp = feesText.replace('$', '');
        tmp = tmp.replace(/,/g, '');
        var pctText = tmp/10000000 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
        }

        var text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at $10,000,000: <B>\"Dead or Alive\"</B> ' + pctText;
        displayToolTip(feesLi, text);
    }

    function buildBountiesToolTip(title) {
        var bountiesLi = document.getElementById('xedx-bounties');
        var bountiesText = document.getElementById('xedx-val-span-bountiescollected').innerText;
        var pctText = bountiesText/250 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
        }

        var text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at 250: <B>\"Bounty Hunter\"</B> ' + pctText;
        var text2 = 'Medals at: <B>' +
        ((bountiesText > 25) ? '<font color=green>25, </font>' : '<font color=red>25, </font>') +
            ((bountiesText > 100) ? '<font color=green>100, </font>' : '<font color=red>100, </font>') +
            ((bountiesText > 500) ? '<font color=green>500</font></B>' : '<font color=red>500</font></B>');

        displayToolTip(bountiesLi, text + CRLF + text2);
    }

    function buildBustsToolTip(title) {
        var bustsLi = document.getElementById('xedx-busts');
        var bustsText = document.getElementById('xedx-val-span-peoplebusted').innerText;
        var pctText = bustsText/1000 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
        }
        var pctText2 = bustsText/2500 * 100;
        if (Number(pctText2) >= 100) {
            pctText2 = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText2 = '<B><font color=\'red\'>' + Math.round(pctText2) + '%</font></B>';
        }
        var pctText3 = bustsText/10000 * 100;
        if (Number(pctText3) >= 100) {
            pctText3 = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText3 = '<B><font color=\'red\'>' + Math.round(pctText3) + '%</font></B>';
        }

        var text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at 1,000: <B>\"Bar Breaker\"</B> ' + pctText;
        var text2 = 'Honor Bar at 2,500: <B>\"Aiding and Abetting\"</B> ' + pctText2;
        var text3 = 'Honor Bar at 10,000: <B>\"Don\'t Drop It\"</B> ' + pctText3;
        var text4 = 'Medals at: <B>' +
            ((bustsText > 250) ? '<font color=green>250, </font>' : '<font color=red>250, </font>') +
            ((bustsText > 500) ? '<font color=green>500, </font>' : '<font color=red>500, </font>') +
            ((bustsText > 1000) ? '<font color=green>1K, </font>' : '<font color=red>1K, </font>') +
            ((bustsText > 2000) ? '<font color=green>2K, </font>' : '<font color=red>2K, </font>') +
            ((bustsText > 4000) ? '<font color=green>4K, </font>' : '<font color=red>4K, </font>') +
            ((bustsText > 6000) ? '<font color=green>6K</font>' : '<font color=red>6K</font>') + ' and ' +
            ((bustsText > 8000) ? '<font color=green>8K</font></B>' : '<font color=red>8K</font></B>');

        displayToolTip(bustsLi, text + CRLF + text2 + CRLF + text3 + CRLF + text4);
    }

    function buildBailsToolTip(title) {
        var bailsLi = document.getElementById('xedx-bails');
        var bailsText = document.getElementById('xedx-val-span-peoplebought').innerText;
        var pctText = bailsText/500 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
        }

        var text = '<B>' + title + CRLF + CRLF + '</B>Honor Bar at 500: <B>\"Freedom isn\'t Free\"</B> ' + pctText;
        displayToolTip(bailsLi, text);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    if (awayFromHome()) {return;}

    logScriptStart();
    validateApiKey();

    callOnContentLoaded(buildJailStatsDiv);

    /* Delay until DOM content load (not full page) complete, so that other scripts run first.
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', buildJailStatsDiv);
    } else {
        buildJailStatsDiv();
    }
    */
})();