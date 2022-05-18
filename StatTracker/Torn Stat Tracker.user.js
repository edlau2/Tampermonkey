// ==UserScript==
// @name         Torn Stat Tracker
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/index.php
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
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const options = {debugLogging: true,
                     killstreak: true,
                     defendswon: true,

                     // Finishing hits
                     smghits: false, // Sub machine gun
                     chahits: true, // Mechanical weapons
                     heahits: true, // Heavy Artillery
                     pishits: true, // Pistols
                     machits: true, // Machine GUns
                     grehits: true, // Temps (grenades)
                     h2hhits: true  // Hand-to-hand
                    };

    const optionsHtml = loadOptionsPage();
    const stats_div = loadStatsDiv();
    const award_li = loadAwardLi();

    debugLoggingEnabled = options.debugLogging;
    var stats = null; // personalstats JSON object

    // For code collapse, easier to read. Loaded into const's, above.
    function loadStatsDiv() {
        return '<div class="sortable-box t-blue-cont h" id="xedx-stats">' +
          '<div id="header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
              '<div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>' +
              '<div class="move-wrap"><i class="accordion-header-move right"></i></div>' +
              'Stat Tracker' +
          '</div>' +
          '<div class="bottom-round">' +
          '    <div class="cont-gray bottom-round" style="width: 386px; height: auto; overflow: auto">' +
                  '<ul class="info-cont-wrap" id="stats-list">' +
                  '</ul>' +
              '</div>' +
          '</div>' +
          '<div class="title-black bottom-round" style="text-align: center">' +
              '<button id="config-btn">Configure</button>' +
          '</div>' +
      '</div>';
    }
    function loadAwardLi() {
        return '<li tabindex="0" role="row" aria-label="STAT_NAME: STAT_DESC">' +
            '<span class="divider">' +
                '<span>STAT_NAME</span>' +
            '</span>' +
            '<span class="desc">STAT_DESC</span>' +
        '</li>';
    }
    function loadOptionsPage() {
        let csp = "frame-src 'self'";
        let html =
            `<html>
                <head>
                    <title>Torn Stat Tracker Options</title>
                    <meta charset="UTF-8">
                    <meta http-equiv=“Content-Security-Policy” content=”' + csp + '”>
                </head>
                <style>
                    body {background-color: lightgray;}
                    h1   {color: blach;}
                    .outer {text-align: center;}
                </style>
                <body>
                    <div class="outer">
                        <h1>Options:</h1>
                    </div>
                </body>
            </html>`;

        return html;
    }

    // Get data used to calc award progress via the Torn API
    function personalStatsQuery() {
        log('Calling xedx_TornUserQuery');
        xedx_TornUserQuery(null, 'personalstats', personalStatsQueryCB);
    }

    // Callback for above
    function personalStatsQueryCB(responseText, ID) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        stats = jsonResp.personalstats;
        handlePageLoad();
    }

    // Create a config options dialog (was going to be a new div, try a new page, instead)
    function createConfigDiv() {
        let x = window.open();
        x.document.write(optionsHtml);
    }

    function addStat(name, desc) {
        log('[addStat] ', name + ': ', desc);
        let newLi = award_li;
        newLi = newLi.replaceAll('STAT_NAME', name);
        newLi = newLi.replaceAll('STAT_DESC', desc);
        debug('Stats LI: ', newLi);
        $('#stats-list').append(newLi);
    }

    function handlePageLoad() {
        let targetDiv = document.querySelector("#item10961671");
        if (!targetDiv) return setTimeout(handlePageLoad, 500);
        if (!document.querySelector("#xedx-stats")) {
            $(targetDiv).after(stats_div);
            $('#config-btn').click(createConfigDiv);
        }

        // Add stats here
        if (options.killstreak) addStat('Kill Streak', numberWithCommas(stats.killstreak));
        if (options.defendswon) addStat('Defends Won', numberWithCommas(stats.defendswon));

        if (options.smghits) addStat('Sub Machine Guns', numberWithCommas(stats.smghits));
        if (options.heahits) addStat('Heavy Artillery', numberWithCommas(stats.heahits));
        if (options.chahits) addStat('Mechanical Weapons', numberWithCommas(stats.chahits));
        if (options.pishits) addStat('Pistols', numberWithCommas(stats.pishits));
        if (options.machits) addStat('Machine Guns', numberWithCommas(stats.machits));
        if (options.grehits) addStat('Temporaries', numberWithCommas(stats.grehits));
        if (options.h2hhits) addStat('Hand to Hand', numberWithCommas(stats.h2hhits));
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    personalStatsQuery();
    //callOnContentLoaded(handlePageLoad);

})();
