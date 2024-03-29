// ==UserScript==
// @name         Torn Stat Tracker
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Put useful stats on your home page, good for merit chasing.
// @author       xedx [2100735]
// @match        https://www.torn.com/index.php
// @match        http://18.119.136.223:8080/TornTotalSolution/*
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

    // Must be the same as the 'match' statement in the header.
    const tornStatTrackerCfgURL = "http://18.119.136.223:8080/TornTotalSolution/StatTracker.html";

    var intervalTimer = null;
    var configWindow = null;

    function initOptStats() {
        addOptStat('killstreak', "Kill Streak", "attacks");
        addOptStat('defendswon', "Defends Won", "attacks");
        addOptStat('attackdamage', "Total Damage", "attacks");
        addOptStat('attackswon', "Attacks Won", "attacks");
        addOptStat('attackslost', "Attacks Lost", "attacks");
        addOptStat('attackcriticalhits', "Total Crit Hits", "attacks");
        addOptStat('onehitkills', "One Hit Kills", "attacks");
        addOptStat('attacksdraw', 'Stalemates', "attacks");
        addOptStat('bestdamage', "Best Damage", "attacks");
        addOptStat('attackdamage', "Total Damage", "attacks");
        addOptStat('bountiescollected', 'Bounties Collected', "attacks");
        addOptStat('unarmoredwon', "Unarmored Fights Won", "attacks");
        addOptStat('attackhits', "Total Attack Hits", "attacks");
        addOptStat('attacksassisted', "Total Assists", "attacks");
        addOptStat("yourunaway", "Times you Escaped", "attacks");
        addOptStat("theyrunaway", "Foes Escaped", "attacks");

        addOptStat("cantaken", "Cannabis Taken", "drugs");
        addOptStat("exttaken", "Ecstacy Taken", "drugs");
        addOptStat("kettaken", "Ketamine Taken", "drugs");
        addOptStat("lsdtaken", "LSD Taken", "drugs");
        addOptStat("opitaken", "Opium Taken", "drugs");
        addOptStat("shrtaken", "Shrooms Taken", "drugs");
        addOptStat("spetaken", "Speed Taken", "drugs");
        addOptStat("pcptaken", "PCP Taken", "drugs");
        addOptStat("xantaken", "Xanax Taken", "drugs");
        addOptStat("victaken", "Vicodin Taken", "drugs");

        addOptStat("argtravel", "Flights to Argentina", "travel");
        addOptStat("mextravel", "Flights to Mexico", "travel");
        addOptStat("dubtravel", "Flights to UAE", "travel");
        addOptStat("hawtravel", "Flights to Hawaii", "travel");
        addOptStat("japtravel", "Flights to Japan", "travel");
        addOptStat("lontravel", "Flights to UK", "travel");
        addOptStat("soutravel", "Flights to South Africa", "travel");
        addOptStat("switravel", "Flights to Switzerland", "travel");
        addOptStat("chitravel", "Flights to China", "travel");
        addOptStat("cantravel", "Flights to Canada", "travel");
        addOptStat("caytravel", "Flights to Caymans", "travel");

        addOptStat('smghits', "Finishing Hits: SMG", "weapons");
        addOptStat('chahits', "Finishing Hits: Mechanical", "weapons");
        addOptStat('heahits', "Finishing Hits: Heavy Artillery", "weapons");
        addOptStat('pishits', "Finishing Hits: Pistols", "weapons");
        addOptStat('machits', "Finishing Hits: Machine Guns", "weapons");
        addOptStat('grehits', "Finishing Hits: Temps", "weapons");
        addOptStat('h2hhits', "Finishing Hits: Hand to Hand", "weapons");
        addOptStat('axehits', "Finishing Hits: Clubbing", "weapons");
        addOptStat('rifhits', "Finishing Hits: Rifle", "weapons");
        addOptStat('shohits', "Finishing Hits: Shotgun", "weapons");
        addOptStat('piehits', "Finishing Hits: Piercing", "weapons");
        addOptStat('slahits', "Finishing Hits: Slashing", "weapons");

        addOptStat('roundsfired', "Rounds Fired", "weapons");
        addOptStat('specialammoused', "Special Ammo Total Used", "weapons");
        addOptStat('hollowammoused', "Hollow Point Ammo Used", "weapons");
        addOptStat('tracerammoused', "Tracer Ammo Used", "weapons");
        addOptStat('piercingammoused', "Piercing Ammo Used", "weapons");
        addOptStat('incendiaryammoused', "IncendiaryAmmo Used", "weapons");

        addOptStat('medicalitemsused', "Medical Items Used", "medical");
        addOptStat('bloodwithdrawn', "Blood Bags Filled", "medical");
        addOptStat('revives', "People Revived", "medical");
        addOptStat('hospital', "Times Hospitalized", "medical");

        addOptStat("racingskill", "Racing Skill", "racing");
        addOptStat("raceswon", "Races Won", "racing");
        addOptStat("racesentered", "Races Entered", "racing");
        addOptStat("racingpointsearned", "Racing Points Earned", "racing");

        addOptStat("peoplebusted", "Busts Succeeded", "jail");
        addOptStat("failedbusts", "Busts Failed", "jail");
        addOptStat("peoplebought", "People Bailed Out", "jail");
        addOptStat("jailed", "Times Jailed", "jail");
    }

    const categoryColors = {"drugs":   '#FF69B4',  // Hot Pink
                            "travel":  '#6495ED',  // Cornflower Blue
                            "attacks": '#DC143C',  // Crimson
                            "weapons": '#FFD700',  // Gold
                            "medical": '#7FFF00',  // Chartreuse
                            "racing":  '#228B22',  // Forest Green
                            "foes":    '#FF8C00',  // DarkOrange
                            "jail":    '#CD5C5C',  // Indian Red
                           };

    const optStats = {};

    function addOptStat(name, desc, category) {
        optStats[name] = {enabled: GM_getValue(name, false), name: desc, cat: category};
    }

    function reloadOptStats() {
        let keys = Object.keys(optStats);
        for (let i=0; i<keys.length; i++) {
            let name = keys[i];
            optStats[name].enabled = GM_getValue(name);
        }
    }

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

    ///////////////////////////////////////////////////////////////////////////////////
    // Portion of script run when on config page
    ///////////////////////////////////////////////////////////////////////////////////

    // Note: not loaded with JQuery active!
    // I'm not loading it myself as I don't want a conflict with Torn's version.
    function handleConfigPage() {
        log('[handleConfigPage]');

        // Insert table rows
        let html = '';
        let keys = Object.keys(optStats);
        for (let i=0; i < keys.length; i++) {
            let statName = keys[i]; // eg, 'heahits' - name in the personalstats obj
            addTableRow(statName);
        }

        // Install handlers
        let checkboxes = document.getElementsByClassName('clickable');
        for (let i=0; i<checkboxes.length; i++) {
            checkboxes[i].addEventListener('click', clickHandler);
        }

        let saveButton = document.querySelector('#xedx-button');
        saveButton.addEventListener('click', handleSaveButton);
    }

    function addTableRow(statName) {
        let cat = optStats[statName].cat;
        let color = cat ?  categoryColors[cat] : null;
        let table = document.getElementById('xedx-table');
        let row = table.insertRow();
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);

        cell1.innerHTML = '<input type="checkbox" class="clickable"' +
            (optStats[statName].enabled? 'checked ': '') + ' />';
        cell2.innerHTML = optStats[statName].name;
        if (color) cell2.setAttribute('bgcolor', color);

        cell1.firstChild.setAttribute('name', statName);
    }

    function clickHandler(ev) {
        let target = ev.target;
        let srcElem = ev.srcElement;

        debug('[clickHandler]Checkbox clicked! stat: ', target.name, ' value: ', target.value, ' checked: ', target.checked);

        GM_setValue(target.name, target.checked);
    }

    function handleSaveButton(ev) {
        log('[handleSaveButton]');

        GM_setValue("config", 'saved');

        // Notify the user - this ould be way easier with JQuery :-)
        const newP = document.createElement('p');
        const newSpan = document.createElement('span');
        newP.append(newSpan);
        newP.id = "x1";
        newSpan.textContent = "Data Saved!";
        newSpan.className = "notification";

        let myTable = document.getElementById('xedx-table');
        myTable.parentNode.insertBefore(newP, myTable.nextSibling);
        setTimeout(clearResult, 3000);
    }

    function clearResult() {
        document.getElementById('x1').remove();
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // End portion of script run when on config page
    ///////////////////////////////////////////////////////////////////////////////////

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

    function checkSaveButton() {
        let data = GM_getValue("config");
        if (data == 'saved') {
            log('Save button has been pressed!');

            clearInterval(intervalTimer);
            intervalTimer = null;
            GM_setValue("config", '');
            reloadOptStats();
            $("#stats-list").empty();
            handlePageLoad();
            if (configWindow && !configWindow.closed) intervalTimer = setInterval(checkSaveButton, 2000);
        }

        log('Check config win: ', configWindow, (configWindow ? configWindow.closed : 'no window'));
        if (configWindow && configWindow.closed) {
            configWindow = null;
            clearInterval(intervalTimer);
        }
    }

    // Create a config options dialog (was going to be a new div, try a new page, instead)
    function createConfigDiv() {
        log('[createConfigDiv]');
        configWindow = window.open(tornStatTrackerCfgURL);

        // Since broadcasts won't work, and storage notifications won't work, poll.
        if (!intervalTimer) intervalTimer = setInterval(checkSaveButton, 2000);
    }

    // Add stats to the DIV on the home page
    function addStat(name, desc) {
        log('[addStat] ', name + ': ', desc);
        let newLi = award_li;
        newLi = newLi.replaceAll('STAT_NAME', name);
        newLi = newLi.replaceAll('STAT_DESC', numberWithCommas(Number(desc)));
        debug('Stats LI: ', newLi);
        $('#stats-list').append(newLi);
    }

    function handlePageLoad() {
        //let targetDiv = document.querySelector("#item10961671"); // Not unique, random....
        if (abroad()) return;

        let targetDivRoot = document.querySelector("#mainContainer > div.content-wrapper.m-left20 > div.content.m-top10 > div.sortable-list.left.ui-sortable");

        let divList = $("#mainContainer > div.content-wrapper.m-left20 > div.content.m-top10 > div.sortable-list.left.ui-sortable > div");
        let targetDiv = divList[3];

        log('targetDivRoot: ', targetDivRoot);
        log('divList: ', divList);
        log('targetDiv: ', targetDiv);

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

    initOptStats();
    GM_setValue("config", '');

    if (location.href.indexOf('test.html') > -1) {
        handleConfigPage();
    } else {
        personalStatsQuery();
    }

})();
