// ==UserScript==
// @name         Torn Stat Tracker
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Put useful stats on your home page, good for merit chasing.
// @author       xedx [2100735]
// @match        https://www.torn.com/index.php
// @match        http://18.119.136.223:8080/testing/test.html
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

    // This is not working, cross-domain?
    const bcChannelName = "xedx-channel"; // = GM_info.script.name;
    //var bcChannel = new BroadcastChannel(bcChannelName);
    var intervalTimer = null;

    function initOptStats() {
        addOptStat('killstreak', "Kill Streak");
        addOptStat('defendswon', "Defends Won");
        addOptStat('smghits', "Finishing Hits: SMG");
        addOptStat('chahits', "Finishing Hits: Mechanical");
        addOptStat('heahits', "Finishing Hits: Heavy Artillery");
        addOptStat('pishits', "Finishing Hits: Pistols");
        addOptStat('machits', "Finishing Hits: Machine Guns");
        addOptStat('grehits', "Finishing Hits: Temps");
        addOptStat('h2hhits', "Finishing Hits: Hand to Hand");
    }

    const optStats = {};

    function addOptStat(name, desc) {
        optStats[name] = {enabled: GM_getValue(name, false), name: desc};
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
    function handleConfigPage() {
        log('[handleConfigPage]');
        // Insert table rows
        let html = '';
        let keys = Object.keys(optStats);
        for (let i=0; i < keys.length; i++) {
            let statName = keys[i]; // eg, 'heahits' - name in the personalstats obj
            addTableRow(statName);
        }

        let checkboxes = document.getElementsByClassName('clickable');
        for (let i=0; i<checkboxes.length; i++) {
            checkboxes[i].addEventListener('click', clickHandler);
        }

        let saveButton = document.querySelector('#xedx-button');
        saveButton.addEventListener('click', handleSaveButton);
    }

    function addTableRow(statName) {
        let table = document.getElementById('xedx-table');
        let row = table.insertRow();
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);

        cell1.innerHTML = '<input type="checkbox" class="clickable"' +
            (optStats[statName].enabled? 'checked ': '') + ' />';
        cell2.innerHTML = optStats[statName].name;

        cell1.firstChild.setAttribute('name', statName);
    }

    function clickHandler(ev) {
        let target = ev.target;
        let srcElem = ev.srcElement;

        log('Checkbox clicked! stat: ', target.name, ' value: ', target.value, ' checked: ', target.checked);
        debug('[clickHandler] target: ', target);

        GM_setValue(target.name, target.checked);
    }

    function sendSaveBroadcast() {
        let bcChannel = new BroadcastChannel(bcChannelName);
        bcChannel.postMessage('save');
        log('Sent message on channel: ', bcChannel);
    }

    function handleSaveButton(ev) {
        log('[handleSaveButton]');

        // This is not working, cross-domain?
        //sendSaveBroadcast();

        GM_setValue(bcChannelName, 'saved');
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

    // Handle inter-window broadcasts
    function handleBroadcasts(ev) {
        log('[handleBroadcasts] data: ', ev.data);
    }

    function checkSaveButton() {
        let data = GM_getValue(bcChannelName);
        if (data == 'saved') {
            log('Save button has been pressed!');

            clearInterval(intervalTimer);
            intervalTimer = null;
            GM_setValue(bcChannelName, '');
            reloadOptStats();
            $("#stats-list").empty();
            handlePageLoad();
            intervalTimer = setInterval(checkSaveButton, 2000);
        }
    }

    // Create a config options dialog (was going to be a new div, try a new page, instead)
    function createConfigDiv() {
        log('[createConfigDiv]');
        let x = window.open("http://18.119.136.223:8080/testing/test.html");

        // Since broadcasts won't work, and storage notifications won't work, poll.
        if (!intervalTimer) intervalTimer = setInterval(checkSaveButton, 2000);
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
        //let targetDiv = document.querySelector("#item10961671"); // Not unique, random....

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

    function installBroadcastChannel() {
        let bcChannel = new BroadcastChannel(bcChannelName);
        bcChannel.addEventListener('message', handleBroadcasts);
        bcChannel.onmessage = (messageEvent) => {
            log('[handleBroadcasts] data: ', messageEvent.data);
        }
        log('Listening on channel: ', bcChannel);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    initOptStats();
    GM_setValue(bcChannelName, '');

    if (location.href.indexOf('test.html') > -1) {
        handleConfigPage();
    } else {
        // This is not working, cross-domain?
        // installBroadcastChannel();

        personalStatsQuery();
    }

})();
