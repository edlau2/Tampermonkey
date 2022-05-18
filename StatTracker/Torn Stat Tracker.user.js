// ==UserScript==
// @name         Torn Stat Tracker
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Put useful stats on your home page, good for merit chasing.
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

    const options = {debugLogging: true};
    const optStats = {
                     killstreak: {enabled: true, name: "Kill Streak"},
                     defendswon: {enabled: true, name: "Defends Won"},
                     smghits: {enabled: false, name: "Finishing Hits: SMG"}, // Sub machine gun
                     chahits: {enabled: true, name: "Finishing Hits: Mechanical"}, // Mechanical weapons
                     heahits: {enabled: true, name: "Finishing Hits: Heavy Artillery"}, // Heavy Artillery
                     pishits: {enabled: true, name: "Finishing Hits: Pistols"}, // Pistols
                     machits: {enabled: true, name: "Finishing Hits: Machine Guns"}, // Machine GUns
                     grehits: {enabled: true, name: "Finishing Hits: Temps"}, // Temps (grenades)
                     h2hhits: {enabled: true, name: "Finishing Hits: Hand to Hand"}  // Hand-to-hand
                    };

    const optionsHtml = loadOptionsPage();
    const stats_div = loadStatsDiv();
    const award_li = loadAwardLi();

    debugLoggingEnabled = options.debugLogging;
    var stats = null; // personalstats JSON object

    // For code collapse, easier to read. Loaded into const's, above.
    // overflow: hidden (outer div)
    // overflow-y: scroll in the inner div
    function loadStatsDiv() {
        return '<div class="sortable-box t-blue-cont h" id="xedx-stats">' +
          '<div id="header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
              '<div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>' +
              '<div class="move-wrap"><i class="accordion-header-move right"></i></div>' +
              'Stat Tracker' +
          '</div>' +
          '<div class="bottom-round">' +
          '    <div class="cont-gray bottom-round" style="width: 386px; height: auto; overflow: auto;">' +
                  '<ul class="info-cont-wrap" id="stats-list" style="overflow-y: scroll; width: auto; max-height: 125px;">' +
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
            '<span class="divider"  style="width: 180px;">' +
                '<span>STAT_NAME</span>' +
            '</span>' +
            '<span class="desc" style="width: 100px;">STAT_DESC</span>' +
        '</li>';
    }
    function loadOptionsPage() {
        //let csp = "frame-src 'self'";
        //let csp = "script-src 'unsafe-inline';";
        // <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
        let CSP = `<meta http-equiv=“Content-Security-Policy” content="script-src 'self' 'unsafe-inline' 'unsafe-eval'">`;
        let html =
            `<html>
                <head>
                    <title>Torn Stat Tracker Options</title>
                    <meta charset="UTF-8">`
                    + CSP +
                `</head>
                <style>
                    body {background-color: lightgray;}
                    h2   {color: black;}
                    .outer {text-align: center;}
                    td {text-align: center; vertical-align: middle; border: 1px solid; width: auto;}
                    table {border: 2px solid; width: 50%; margin: auto;}
                </style>
                <script>
                    const handleClick = function(ev) {console.log('[handleClick] ev: ', ev);};
                </script>
                <body>
                    <div class="outer">
                        <h2>Personal Stats to Display on the Home Page:</h2>
                        <table><tbody>`;

        // td:nth-child(1) {padding-left: 20px; width: 5%}
                            //<tr><th>Stat</th><th>Selected</th><tr>`;

        // Insert table rows
        let keys = Object.keys(optStats);
        for (let i=0; i < keys.length; i++) {
            let statName = keys[i]; // eg, 'heahits' - name in the personalstats obj
            html += '<tr><td><input type="checkbox" name="' +
                statName + '" value="' + (optStats[statName].enabled? 'checked' : 'unchecked') + '" ' +
                (optStats[statName].enabled? 'checked': '') + '/></td><td>' + optStats[statName].name +
                ' onclick="handleClick"</td></tr>';
        }

        html += `</table></tbody></div></body></html>`;

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
        newLi = newLi.replaceAll('STAT_DESC', numberWithCommas(Number(desc)));
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
        let keys = Object.keys(optStats);
        for (let i=0; i < keys.length; i++) {
            let statName = keys[i];
            if (optStats[statName].enabled) {
                addStat(optStats[statName].name, stats[statName]);
            }
        }
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
