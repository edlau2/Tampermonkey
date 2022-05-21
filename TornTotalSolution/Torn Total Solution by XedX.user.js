// ==UserScript==
// @name         Torn Total Solution by XedX
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  A compendium of all my individual scripts for the Home page
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @match        http://18.119.136.223:8080/testing/test.html
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/DrugStats/Torn-Drug-Stats-Div.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

// This script combines several scripts that are available individually, all that customize your
// Home Page for various things.
//
// All are configurable, and can be enabled/disbaled individually.
//
// Torn Latest Attacks Extender - shows up to the last 100 attacks you've been in, with more detail.
// Torn Stat Tracker - Allows you to easily track statistics of interest right on the home page.
// Torn Drug Stats - Shows stats about drug usage, with tool tips describing drug effect.
// Torn Crime Tooltips - Shows data about your progress in crime merits.
// Torn Sidebar Colors - Just for fun, colors the sidebar icons.
// Torn Hide-Show Chat Icons - Allows you to easily hide and show the chat icons.
// Torn Fac Respect Earned - Shows respect earned for your fac, with tool tips for merit progress.
// Torn TT Filter - Tweaks the Torn Tools display to my liking, disabling some redundant features. (TBD: will add later)
// Torn Customizable Sidebar - Adds links to pages you commonly use to the sidebar. (TBD: will add later)

// Notes to self:
//
// Can I individualize "debugLoggingEnabled" and "loggingEnabled" somehow? Per function....
//

(function() {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Options and global variables
    //////////////////////////////////////////////////////////////////////

    debugLoggingEnabled = false;
    loggingEnabled = true;

    const opts_enabledScripts = {
        "latestAttacks": true,     // profile, attacks
        "statTracker": true,       // personalstats
        "drugStats": true,         // personalstats
        "crimeToolTips": true,     // None, complete
        "sidebarColors": true,     // None, loaded
        "hideShowChat": true,      // None, loaded
        "facRespect": true,        // personalstats,honors
        "ttFilter": true,          // None, complete, hashchange
    };

    var jsonResp = null;
    var personalStats = null;
    var honorsAwarded = null;
    var attacks = null;

    var userId = null;
    var userName = null;

    //////////////////////////////////////////////////////////////////////
    // API calls (profile, attacks, personalstats, honors)
    //////////////////////////////////////////////////////////////////////

    // Get data used for most of the handlers in here, in one call.
    function personalStatsQuery() {
        log('[personalStatsQuery]');
        xedx_TornUserQuery(null, 'personalstats,profile,attacks,honors', personalStatsQueryCB);
    }

    // Callback for above
    function personalStatsQueryCB(responseText, ID) {
        log('[personalStatsQueryCB]');
        let _jsonResp = JSON.parse(responseText);
        if (_jsonResp.error) {return handleError(responseText);}

        jsonResp = _jsonResp;
        personalStats = jsonResp.personalstats;
        honorsAwarded = jsonResp.honors_awarded;
        attacks = jsonResp.attacks;

        userId = jsonResp.player_id;
        userName = jsonResp.name;

        // Call scripts that depend on stats being available
        onApiComplete();
    }

    //////////////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Latest Attacks Extender" (called at API call complete)
    //////////////////////////////////////////////////////////////////////////////

    function tornLatestAttacksExtender() {
        log('[tornLatestAttacksExtender]');

        return new Promise((resolve, reject) => {
            if (abroad()) return reject('[tornLatestAttacksExtender] not at home!');

            let result = extendLatestAttacks();
            if (result)
                return reject(result);
            else
                return resolve("tornLatestAttacksExtender complete!");
        });
    }

    const latestAttacksconfig = {
        'max_values': GM_getValue('latest_attacks_max_values', 100),
        'date_format': GM_getValue('latest_attacks_date_format', "YYYY-MM-DD HH:MM:SS")
     };

    const latest_attacks_config_div = getLatestAttacksCfgDiv();
    const latest_attacks_div = getLatestAttacksDiv();

    function extendLatestAttacks() {
        // Find first column
        let mainDiv = document.getElementById('column1');
        if (!validPointer(mainDiv)) {return '[extendLatestAttacks] main div not found! Consider launching later.';}
        $(mainDiv).append(latest_attacks_div);

        // Hook up button handler(s)
        $('#la-config-btn').click(function () {createConfigDiv();});

        populateLatestAttacksList();
        return null;
    }

    function populateLatestAttacksList() {
        let counter = 0;
        let ul = document.getElementById('latest-attacks-list');

        let keys = Object.keys(attacks).reverse(); // Why reverse? Latest first...
        for (let i = 0; i < keys.length; i++) {
            let obj = attacks[keys[i]];
            let span = document.createElement('span');
            let li = createLaLi(span);

            // Link to the attack log: data-location="loader.php?sid=attackLog&ID=
            let code = 'loader.php?sid=attackLog\u0026ID=' + obj.code;
            li.setAttribute('data-location', code);

            // List element title: date of attack
            let d = new Date(0);
            d.setUTCSeconds(obj.timestamp_ended);
            li.setAttribute("title", dateConverter(d, latestAttacksconfig.date_format));

            // Attacker name, either myself or opponent
            let offense = (obj.attacker_id == userId);
            let a2 = document.createElement('a');
            a2.setAttribute('href', 'profiles.php?XID=' + obj.attacker_id);
            a2.innerHTML = obj.attacker_name ? obj.attacker_name : 'someone';
            if (!offense && obj.attacker_name && obj.attacker_factionname != null) {
                a2.innerHTML += ' [' + obj.attacker_id + ']';
                a2.innerHTML += ' (' + obj.attacker_factionname + ')';
            }
            if (offense && obj.stealthed) {
                a2.innerHTML += ' (stealth)';
            }
            span.appendChild(a2);

            // Format the Action (make fn, w/case stmt)
            let result = obj.result;
            if (result === 'Lost') {result = 'Attacked and lost to';}
            if (result === 'Stalemate') {result = 'Stalemated with';}
            if (result === 'Escape') {result = 'Escaped from';}
            if (result === 'Assist') {result = 'Assisted in attacking';}
            span.appendChild(document.createTextNode(' ' + result + ' '));

            // Defender name, either myself or opponent
            let a3 = document.createElement('a');
            a3.setAttribute('href', 'profiles.php?XID=' + obj.defender_id);
            a3.innerHTML = obj.defender_name;
            if (offense) {a3.innerHTML += ' (' + obj.defender_factionname + ')';}
            span.appendChild(a3);

            // Respect gain
            if (obj.respect_gain > 0) {span.appendChild(document.createTextNode(' (Respect: ' + obj.respect_gain + ')'));}

            li.appendChild(span);
            ul.appendChild(li);

            if (counter++ > latestAttacksconfig.max_values) {return;}
        }
    }

    function createLaLi(span) {
        var li = document.createElement("li");
        var a1 = document.createElement('a')
        a1.className = 't-blue';
        a1.setAttribute('href', 'profiles.php?XID=');
        span.appendChild(a1);
        return li;
    }

    function createConfigDiv() {
        if (document.getElementById('config-div')) return;

        let extendedDiv = document.getElementById('xedx-attacks-ext');
        if (!validPointer(extendedDiv)) {return;}
        $(extendedDiv).append(latest_attacks_config_div);

        $('#la-maxinput').val(GM_getValue('latest_attacks_max_values'));
        $('#la-dateformat').val(GM_getValue('latest_attacks_date_format'));

        $('#la-cancel-btn').click(function () {$('#la-config-div').parentNode.removeChild(element)});
        $('#la-save-btn').click(function () {saveLaConfig();});
    }

     // Handler for 'Config' screen, 'Save' button
    function saveLaConfig() {
        let maxInput = document.getElementById('la-maxinput');
        let dateFormat = document.getElementById('la-dateformat');

        if (maxInput.value > 100 || !isaNumber(maxInput.value) || maxInput.value < 0) {
            maxInput.value = 100;
        }
        GM_setValue('latest_attacks_max_values', maxInput.value);
        GM_setValue('latest_attacks_date_format', dateFormat.options[dateFormat.selectedIndex].text);

        latestAttacksconfig.max_values = GM_getValue('latest_attacks_max_values');
        latestAttacksconfig.date_format = GM_getValue('latest_attacks_date_format');

        let headerDiv = document.getElementById('la_header_div');
        headerDiv.removeChild(headerDiv.lastChild);
        headerDiv.appendChild(document.createTextNode('Latest Attacks (Previous ' + GM_getValue('latest_attacks_max_values') + ')'));

        $('#la-config-div').parentNode.removeChild(element);
    }

    // Functions to hide DIV's using code collapse
    function getLatestAttacksCfgDiv() {
        const result =
          '<div id="la-config-div" class="cont-gray bottom-round" style="text-align: center">' +
              '<br>Max Entries (0-100): <input type="text" id="la-maxinput"><br>' +
              '<br>Date format: ' +
              '<select id="la-dateformat">' +
                  '<option value="YYYY-MM-DD">YYYY-MM-DD</option>' +
                  '<option value="YYYY-MONTH-DD DDD">YYYY-MONTH-DD DDD</option>' +
                  '<option value="YYYY-MM-DD HH:MM:SS">YYYY-MM-DD HH:MM:SS</option>' +
                  '<option value="DAY MONTH DD YYYY HH:MM:SS">DAY MONTH DD YYYY HH:MM:SS</option>' +
                  '<option value="FULL (DAY MONTH DD YYYY HH:MM:SS TZ)">FULL (DAY MONTH DD YYYY HH:MM:SS TZ)</option>' +
              '</select><br><br>' +
              '<button id="la-cancel-btn" style="margin: 0px 10px 10px 0px;">Cancel</button>' +
              '<button id="la-save-btn" style="margin: 0px 10px 10px 0px;">Save</button>' +
          '</div>';

        return result;
    }

    function getLatestAttacksDiv() {
        const result =
          '<div class="sortable-box t-blue-cont h" id="xedx-attacks-ext">' +
              '<div id="la_header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
                  '<div class="arrow-wrap"><i class="accordion-header-arrow right"></i></div>' +
                  '<div class="move-wrap"><i class="accordion-header-move right"></i></div>' +
                  'Latest Attacks (Previous 100)' +
              '</div>' +
              '<div class="bottom-round">' +
              '    <div class="cont-gray bottom-round" style="width: 386px; height: 179px; overflow: auto">' +
                      '<ul class="list-cont" id="latest-attacks-list">' +
                      '</ul>' +
                  '</div>' +
              '</div>' +
              '<div class="title-black bottom-round" style="text-align: center">' +
                  '<button id="la-config-btn">Configure</button>' +
              '</div>' +
          '</div>';
        return result;
    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Stat Tracker" (called at API call complete)
    //////////////////////////////////////////////////////////////////////

    function tornStatTracker() {
        log('[tornStatTracker]');

        return new Promise((resolve, reject) => {
            if (abroad()) return reject('[tornFacRespect] not at home!');

            initOptStats();

            let result = buildStatsUI();
            if (result)
                return reject(result);
            else
                return resolve("tornStatTracker complete!");
        });
    }

    // Must be the same as the 'match' statement in the header.
    const tornStatTrackerCfgURL = "http://18.119.136.223:8080/testing/test.html";

    const optStats = {};
    const categoryColors = {"drugs":   '#FF69B4',  // Hot Pink
                            "travel":  '#6495ED',  // Cornflower Blue
                            "attacks": '#DC143C',  // Crimson
                            "weapons": '#FFD700',  // Gold
                            "medical": '#7FFF00',  // Chartreuse
                            "racing":  '#228B22',  // Forest Green
                            "foes":    '#FF8C00',  // DarkOrange
                            "jail":    '#CD5C5C',  // Indian Red
                           };

    var stats_intervalTimer = null;
    var stats_configWindow = null;

    function buildStatsUI() {
        let targetDivRoot = document.querySelector("#mainContainer > div.content-wrapper.m-left20 >" +
                                                       " div.content.m-top10 > div.sortable-list.left.ui-sortable");
        let divList = $("#mainContainer > div.content-wrapper.m-left20 > div.content.m-top10 > div.sortable-list.left.ui-sortable > div");
        let targetDiv = divList[3];
        debug('targetDivRoot: ', targetDivRoot, ' divList: ', divList, ' targetDiv: ', targetDiv);
        if (!targetDiv) return '[tornStatTracker] targetDiv not found! Consider starting later.';

        if (!document.querySelector("#xedx-stats")) {
            $(targetDiv).after(stats_div);
            $('#config-btn').click(createStatsConfigDiv);
        }

        // Populate the UL of enabled stats
        let keys = Object.keys(optStats);
        for (let i=0; i < keys.length; i++) {
            let statName = keys[i];
            if (optStats[statName].enabled) {
                addStat(optStats[statName].name, personalStats[statName]);
            }
        }

        return null; // Success!
    }

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

    function checkStatsSaveButton() {
        let data = GM_getValue("stats-config");

        if (data == 'saved') {
            log('Save button has been pressed!');

            clearInterval(stats_intervalTimer);
            stats_intervalTimer = null;
            GM_setValue("stats-config", '');
            reloadOptStats();
            $("#stats-list").empty();
            buildStatsUI();
            if (stats_configWindow && !stats_configWindow.closed) stats_intervalTimer = setInterval(checkSaveButton, 2000);
        }

        debug('Check config win: ', stats_configWindow, (stats_configWindow ? stats_configWindow.closed : 'no window'));
        if (stats_configWindow && stats_configWindow.closed) {
            stats_configWindow = null;
            clearInterval(stats_intervalTimer);
        }
    }

    // Create a stats config options page in a new tab
    function createStatsConfigDiv() {
        log('[createStatsConfigDiv]');
        stats_configWindow = window.open(tornStatTrackerCfgURL);

        // Since broadcasts won't work, and storage notifications won't work, poll.
        if (!stats_intervalTimer) stats_intervalTimer = setInterval(checkStatsSaveButton, 2000);
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

    ///////////////////////////////////////////////////////////////////////////////////
    // Portion of "Torn Stat Tracker" script run when on config page
    ///////////////////////////////////////////////////////////////////////////////////

    // Note: not loaded with JQuery active!
    // I'm not loading it myself as I don't want a conflict with Torn's version.
    //
    // NOTE: Now I do load JQuery, use instead? Can simplify!
    function handleStatsConfigPage() {
        log('[handleConfigPage]');

        initOptStats();

        // Insert table rows
        let html = '';
        let keys = Object.keys(optStats);
        for (let i=0; i < keys.length; i++) {
            let statName = keys[i]; // eg, 'heahits' - name in the personalstats obj
            addStatsTableRow(statName);
        }

        // Install handlers
        let checkboxes = document.getElementsByClassName('clickable');
        for (let i=0; i<checkboxes.length; i++) {
            checkboxes[i].addEventListener('click', statsClickHandler);
        }

        let saveButton = document.querySelector('#xedx-button');
        saveButton.addEventListener('click', handleStatsSaveButton);
    }

    function addStatsTableRow(statName) {
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

    function statsClickHandler(ev) {
        let target = ev.target;
        let srcElem = ev.srcElement;

        GM_setValue(target.name, target.checked);
    }

    function handleStatsSaveButton(ev) {
        log('[handleSaveButton]');

        GM_setValue("stats-config", 'saved');

        // Notify the user - this ould be way easier with JQuery :-)
        const newP = document.createElement('p');
        const newSpan = document.createElement('span');
        newP.append(newSpan);
        newP.id = "x1";
        newSpan.textContent = "Data Saved!";
        newSpan.className = "notification";

        let myTable = document.getElementById('xedx-table');
        myTable.parentNode.insertBefore(newP, myTable.nextSibling);
        setTimeout(clearStatsResult, 3000);
    }

    function clearStatsResult() {
        document.getElementById('x1').remove();
    }

    ///////////////////////////////////////////////////////////////////////////////////
    // End portion of "Torn Stat Tracker" script run when on config page
    ///////////////////////////////////////////////////////////////////////////////////

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Drug Stats" (called at API call complete)
    //////////////////////////////////////////////////////////////////////

    function tornDrugStats() {
        log('[tornDrugStats]');

        let extDiv = drug_stats_div; // Pulled from the include, 'Torn-Drug-Stats-Div.js' Move to here!!!
        let extDivId = 'xedx-drugstats-ext-div';
        let mainDiv = document.getElementById('column0');

        return new Promise((resolve, reject) => {
            if (abroad()) return reject('[tornDrugStats] not at home!');
            if (!validPointer(mainDiv)) return reject('[tornDrugStats] unable to locate main DIV! Consider launching later.');
            $(mainDiv).append(extDiv); // could be $('#column0') ???

            installDrugStats(personalStats);

            resolve('tornDrugStats complete!');
        });
    }

    function installDrugStats(stats) {
        let knownSpans = ['cantaken', 'exttaken', 'kettaken', 'lsdtaken',
                          'opitaken', 'opitaken', 'shrtaken', 'spetaken',
                          'pcptaken', 'xantaken', 'victaken', 'drugsused',
                          'overdosed', 'rehabs', 'rehabcost'];

        knownSpans.forEach((name) => {
            let id = 'xedx-val-span-' + name;
            let valSpan = document.getElementById(id);
            let value = stats[name];
            if (typeof value === 'undefined' || value === null) {value = 0;} // Drug not taken yet

            // Format properly and insert.
            if (!name.localeCompare('rehabcost')) {
                valSpan.innerText = '$' + numberWithCommas(value);
            } else if (!name.localeCompare('overdosed')) {
                var pct = (Number(value) / Number(stats['drugsused'])*100).toFixed(2);
                valSpan.innerText = value + ' (' + pct + '%)';
            } else {
                valSpan.innerText = value;
            }
        });

        addToolTips();
    }

    function addToolTips() {
        addToolTipStyle();

        buildUseString('cantaken');
        buildUseString('exttaken');
        buildUseString('kettaken');
        buildUseString('lsdtaken');
        buildUseString('opitaken');
        buildUseString('shrtaken');
        buildUseString('spetaken');
        buildUseString('pcptaken');
        buildUseString('xantaken');
        buildUseString('victaken');
    }

    function buildUseString(item) {
        let useDiv = document.getElementById('xedx-val-span-' + item);
        let useText = useDiv.innerText.replace(/,/g, "");
        let pctText = useText/50 * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + pctText + '%</font></B>';
        }

        let divSpan = document.getElementById('xedx-div-span-' + item);
        let text = '<B>' + divSpan.innerText + ': </B>Honor Bar Available' + CRLF;
        let effectText, cdText, sideEffectText, odChance;

        switch (item) {
            case 'cantaken':
                text = text + TAB + '<B>Who\'s Frank?</B> (50 Cannabis): ' + pctText + CRLF +
                    TAB + '<B>Spaced Out</B> (Overdose on Cannabis)' + CRLF;
                effectText = 'Increases nerve by 2-3.';
                cdText = 'Cooldown: 1 to 1 1/2 hr.';
                sideEffectText = '-35% speed, -25% def, -20% strength';
                odChance = '.04% (1/2,500), 5x chance on 4/20';
                break;
            case 'exttaken':
                text = text + TAB + '<B>Party Animal</B> (50 Ecstacy): ' + pctText + CRLF;
                effectText = 'Doubles happiness.';
                cdText = 'Cooldown: 3 hrs 20 min - 3 hrs 40 min';
                sideEffectText = 'none.';
                odChance = '~4%-5%';
                break;
            case 'kettaken':
                text = text + TAB + '<B>Horse Tranquilizer</B> (50 Ketamine): ' + pctText + CRLF;
                effectText = 'Temporarily increases Defense by 50%.';
                cdText = 'Cooldown: 50 min - 1 hr 30 min';
                sideEffectText = '-20% speed, -20% strength';
                odChance = 'high';
                break;
            case 'lsdtaken':
                text = text + TAB + '<B>Acid Dream</B> (50 LSD): ' + pctText + CRLF;
                effectText = 'Increases energy by 50, nerve by 5, and happiness by 200-500. Also +50% def, +30% str';
                cdText = 'Cooldown: 6 hrs 40 min - 7 hrs 30 min';
                sideEffectText = '-30% dex';
                odChance = '~5%-6%';
                break;
            case 'opitaken':
                text = text + TAB + '<B>The Fields of Opium</B> (50 Opium): ' + pctText + CRLF;
                effectText = 'Removes all hospital time and replenishes life by 66.6%. Increases happiness by 50-100.';
                cdText = 'Cooldown: 3 hrs 20 min - 4 hrs 10 min';
                sideEffectText = 'none';
                odChance = 'none';
                break;
            case 'shrtaken':
                text = text + TAB + '<B>I Think I See Dead People</B> (50 Shrooms): ' + pctText + CRLF;
                effectText = 'Increases happiness by 500 and reduces energy by 25.';
                cdText = 'Cooldown: 3 hrs 20 min - 3 hrs 54 min';
                sideEffectText = '-20% on all bat stats, -25e';
                odChance = 'unknown';
                break;
            case 'spetaken':
                text = text + TAB + '<B>Crank it Up</B> (50 Speed): ' + pctText + CRLF;
                effectText = 'Temporarily increases Speed by 20%. Increases happiness by 50.';
                cdText = 'Cooldown: 3 hrs 28 min';
                sideEffectText = '-20% dex';
                odChance = 'unknown';
                break;
            case 'pcptaken':
                text = text + TAB + '<B>Angel Dust</B> (50 PCP): ' + pctText + CRLF;
                effectText = 'Temporarily increases Strength and Dexterity by 20%. Increases happiness by 250.';
                cdText = 'Cooldown: 5 hrs 40 min - 6 hrs 40 min';
                sideEffectText = 'none.';
                odChance = 'unknown';
                break;
            case 'xantaken':
                text = text + TAB + '<B>Free Energy</B> (50 Xanax): ' + pctText + CRLF;
                effectText = 'Increases energy by 250 and happiness by 75.';
                cdText = 'Cooldown: 6 - 8 hrs.';
                sideEffectText = '-35% all bat stats';
                odChance = '3.0%';
                break;
            case 'victaken':
                text = text + TAB + '<B>Painkiller</B> (50 Vicodin): ' + pctText + '</B>';
                effectText = 'Temporarily increases all battle stats by 25%. Increases happiness by 75.';
                cdText = 'Cooldown: 5 hrs - 5 hrs 50 min';
                sideEffectText = 'none.';
                odChance = 'unknown';
                break;
            default:
                return;
        }
        text = text + CRLF + 'Effects: ' + effectText + CRLF + cdText + CRLF + 'Side Effects: ' + sideEffectText +
            CRLF + 'Chance of OD: ' + odChance;
        displayToolTip(useDiv.parentNode, text);
    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Fac Respect" (called at API call complete)
    //////////////////////////////////////////////////////////////////////

    function tornFacRespect() {
        log('[tornFacRespect]');

        return new Promise((resolve, reject) => {
            if (abroad()) return reject('[tornFacRespect] not at home!');
            if ($('#skip-to-content').html().indexOf('Home') < 0) return reject('[tornFacRespect] unable to find content header.');
            let error = buildPersonalRespectLi();
            if (error)
                reject(error);
            else
                resolve("tornFacRespect complete!");
        });
    }

    // Returns null on success, string error otherwise...
    function buildPersonalRespectLi() {
        let respect = personalStats.respectforfaction;
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
        debug('buildPersonalRespectLi ul = ', ul);
        if (!ul) return '[tornFacRespect] Unable to find correct ul!';

        let li = '<li tabindex="0" role="row" aria-label="Personal Respect Earned"><div id="xedx-respect">' +
                     '<span class="divider"><span>Personal Respect Earned</span></span>' +
                     '<span class="desc">' + respect.toLocaleString("en") + '</span>' +
                 '</div></li>';
        $(ul).append(li);
        addFacToolTip(li);
        return null;
    }

    function addFacToolTip(li) {
        addToolTipStyle();

        let respect = personalStats.respectforfaction;
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
    // Handlers for "Torn Sidebar Colors" (called at content loaded)
    //////////////////////////////////////////////////////////////////////

    function tornSidebarColors() {
        log('[tornSidebarColors]');

        return new Promise((resolve, reject) => {
            let homeIcon = document.querySelector("#nav-home > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(homeIcon, 'red');

            let itemsIcon = document.querySelector("#nav-items > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(itemsIcon, 'blue');

            let cityIcon = document.querySelector("#nav-city > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(cityIcon, 'yellow');

            let jobIcon = document.querySelector("#nav-job > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(jobIcon, '#9EBF7C', 4);

            let gymIcon = document.querySelector("#nav-gym > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(gymIcon, '#719EA3');

            let propIcon = document.querySelector("#nav-properties > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(propIcon, 'yellow');

            let eduIcon = document.querySelector("#nav-education > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(eduIcon, 'black');

            let crimesIcon = document.querySelector("#nav-crimes > div > a > span.svgIconWrap___YUyAq > svg");
            //colorIcon(crimesIcon, 'red');

            let missionIcon = document.querySelector("#nav-missions > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(missionIcon, '#C32A1F');

            let newsIcon = document.querySelector("#nav-newspaper > div > a > span.svgIconWrap___YUyAq > svg");
            //colorIcon(newsIcon, '#686B6C');

            let jailIcon = document.querySelector("#nav-jail > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(jailIcon, 'black');

            let hospIcon = document.querySelector("#nav-hospital > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(hospIcon, 'red');

            let casinoIcon = document.querySelector("#nav-casino > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(casinoIcon, '#4D8719');

            let forumIcon = document.querySelector("#nav-forums > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(forumIcon, 'white');

            let hofIcon = document.querySelector("#nav-hall_of_fame > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(hofIcon, '#FFD701');

            let facIcon = document.querySelector("#nav-my_faction > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(facIcon, '#DFAF2A');

            let recIcon = document.querySelector("#nav-recruit_citizens > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(recIcon, 'red');

            let calendarIcon = document.querySelector("#nav-calendar > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(calendarIcon, 'orange');

            let travelIcon = document.querySelector("#nav-traveling > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(travelIcon, '#6AB6F3'); // '#6CB0E5');

            let peopleIcon = document.querySelector("#nav-people > div > a > span.svgIconWrap___YUyAq > svg");
            colorIcon(peopleIcon, '#F7BDA4');

            resolve("tornSidebarColors complete!");
        });
    }

    function colorIcon(icon, color, pw=1) {
        if (icon) {
            icon.setAttribute('stroke', color);
            icon.setAttribute('stroke-width', pw.toString());
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Hide-Show Chat Icons" (called at content loaded)
    //////////////////////////////////////////////////////////////////////

    function tornHideShowChat() {
        log('[tornHideShowChat]');

        return new Promise((resolve, reject) => {
            if (!validPointer($("#chatRoot > div"))) { // Should never happen...
            }

            appendHideShowChatDiv();
            hideChat(GM_getValue('xedxHideChat', false));
            disableTornToolsChatHide();

            resolve("tornHideShowChat complete!");
        });
    }

    function hideChat(hide) {
        log('[hideChat] ' + (hide ? "hiding " : "showing " + "chat icons."));
        $('#showHideChat').text(`[${hide ? 'show' : 'hide'}]`);
        if (document.querySelector("#chatRoot > div"))
            document.querySelector("#chatRoot > div").style.display = hide ? 'none' : 'block';
    }

    const hideChatHdr = '<hr id="xedx-hr-delim" class="delimiter___neME6">';

    const hideChatDiv = '<div><hr id="xedx-hr-delim" class="delimiter___neME6">' +
        '<div id="xedxShowHideChat" style="padding-bottom: 5px; padding-top: 5px;">' +
        '<span style="font-weight: 700;">Chat Icons</span>' +
        '<a id="showHideChat" class="t-blue show-hide">[hide]</a></div>';

    function disableTornToolsChatHide() {
        if (validPointer($('#tt-hide_chat')[0])) {
            log("Disabling TornTools 'Hide Chat' icon");
            $('#tt-hide_chat')[0].style.display = 'none';
        }
    }

    function appendHideShowChatDiv() {
        //$('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(hideChatHdr);
        $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(hideChatDiv);
        installHideShowClickHandler();
    }

    function installHideShowClickHandler() {
        $('#showHideChat').on('click', function () {
                const hide = $('#showHideChat').text() == '[hide]';
                GM_setValue('xedxHideChat', hide);
                hideChat(hide);
            });
    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for "Torn Crime Tooltips" (called at content complete)
    //////////////////////////////////////////////////////////////////////

    function tornCrimeTooltips() {
        log('[tornCrimeTooltips]');

        return new Promise((resolve, reject) => {
            if (abroad()) return reject('[tornCrimeTooltips] not at home!');

            addCriminalRecordToolTips();
            resolve("tornCrimeTooltips complete!");
        });
    }

    function addCriminalRecordToolTips() {
        let rootDiv = document.getElementsByClassName('cont-gray bottom-round criminal-record')[0];
        if (!validPointer(rootDiv)) {return;}

        addToolTipStyle();

        let ul = rootDiv.getElementsByClassName("info-cont-wrap")[0];
        let items = ul.getElementsByTagName("li");
        for (let i = 0; i < items.length; ++i) {
            let li = items[i];
            let label = li.innerText;
            let ariaLabel = li.getAttribute('aria-label');
            let crimes = qtyFromAriaLabel(ariaLabel);

            debug('li #' + i + '\nlabel = "' + label +'"\naria-label = "' + ariaLabel +'"');
            if (ariaLabel.indexOf('Illegal') != -1) {
                dispIllegalProductsTT(li, crimes);
            } else if (ariaLabel.indexOf('Theft') != -1) {
                dispTheftTT(li, crimes);
            } else if (ariaLabel.indexOf('Auto theft') != -1) {
                dispAutoTT(li, crimes);
            } else if (ariaLabel.indexOf('Drug deals') != -1) {
                dispDrugTT(li, crimes);
            } else if (ariaLabel.indexOf('Computer crimes') != -1) {
                dispComputerTT(li, crimes);
            } else if (ariaLabel.indexOf('Murder') != -1) {
                dispMurderTT(li, crimes);
            } else if (ariaLabel.indexOf('Fraud crimes') != -1) {
                dispFraudTT(li, crimes);
            } else if (ariaLabel.indexOf('Other') != -1) {
                dispOtherTT(li, crimes);
            } else if (ariaLabel.indexOf('Total') != -1) {
                dispTotalTT(li, crimes);
            }
        }
    }

    function dispIllegalProductsTT(li, crimes) {
        debug('dispIllegalProductsTT');
        var text = '<B>Illegal Products (Bottlegging):</B>' + CRLF + TAB + 'Sell Copied Media, Arms Trafficking' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Civil Offence\",</B> ' + getPctForLi(li, 5000);

        displayToolTip(li, text);
    }

    function dispTheftTT(li, thefts) {
        var text = '<B>Theft:</B>' + CRLF +
            TAB + 'Shoplift, Pickpocket Someone, Larceny,' + CRLF + TAB + 'Armed Robberies, Kidnapping' + CRLF + CRLF;
            text = text + 'Honor Bars at:' + CRLF +
            TAB + '1,000: <B>\"Candy Man\",</B> ' + getPctForLi(li, 1000) + CRLF +
            TAB + '2,500: <B>\"Smile You\'re On Camera\",</B> ' + getPctForLi(li, 2500) + CRLF +
            TAB + '5,000: <B>\"Smokin\' Barrels\",</B> ' + getPctForLi(li, 5000) + CRLF +
            TAB + '7,500: <B>\"Breaking And Entering\",</B> ' + getPctForLi(li, 7500) + CRLF +
            TAB + '10,000: <B>\"Stroke Bringer\",</B> ' + getPctForLi(li, 10000);

        debug('dispTheftTT, thefts = ' + thefts);
        var text2 = 'Medals at: <B>' +
            ((thefts >= 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
            ((thefts >= 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
            ((thefts >= 5000) ? '<font color=green>5000, </font></B>' : '<font color=red>5000, </font>') +
            ((thefts >= 7500) ? '<font color=green>7500, </font></B>' : '<font color=red>7500, </font>') +
            ((thefts >= 10000) ? '<font color=green>10000, </font></B>' : '<font color=red>10000, </font>') +
            ((thefts >= 12500) ? '<font color=green>12500, </font></B>' : '<font color=red>12500, </font>') +
            ((thefts >= 15000) ? '<font color=green>15000, </font></B>' : '<font color=red>15000, </font>') +
            ((thefts >= 17500) ? '<font color=green>17500, </font></B>' : '<font color=red>17500, </font>') +
            ((thefts >= 20000) ? '<font color=green>20000, </font></B>' : '<font color=red>20000, </font>') +
            ((thefts >= 22500) ? '<font color=green>22500, </font></B>' : '<font color=red>22500, </font>') +
            ((thefts >= 25000) ? '<font color=green>25000</font></B>' : '<font color=red>25000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispAutoTT(li, crimes) {
        var text = '<B>Auto Theft:</B>' + CRLF + TAB + 'Grand Theft Auto' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Joy Rider\",</B> ' + getPctForLi(li, 5000);

        debug('dispAutoTT, crimes = ' + crimes);
        var text2 = 'Medals at: <B>' +
            ((crimes >= 1500) ? '<font color=green>1500, </font>' : '<font color=red>1500, </font>') +
            ((crimes >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((crimes >= 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
            ((crimes >= 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
            ((crimes >= 3500) ? '<font color=green>3500, </font>' : '<font color=red>3500, </font>') +
            ((crimes >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((crimes >= 4500) ? '<font color=green>4500, </font>' : '<font color=red>4500, </font>') +
            ((crimes >= 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
            ((crimes >= 5500) ? '<font color=green>5500, </font>' : '<font color=red>5500, </font>') +
            ((crimes >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((crimes >= 6500) ? '<font color=green>6500, </font>' : '<font color=red>6500, </font>') +
            ((crimes >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((crimes >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((crimes >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((crimes >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');


        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispDrugTT(li, crimes) {
        var text = '<B>Drug deals:</B>' + CRLF + TAB + 'Transport Drugs' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Escobar\",</B> ' + getPctForLi(li, 5000);

        debug('dispDrugTT, crimes = ' + crimes);
        var text2 = 'Medals at: <B>' +
            ((crimes >= 250) ? '<font color=green>250, </font>' : '<font color=red>250, </font>') +
            ((crimes >= 500) ? '<font color=green>500, </font>' : '<font color=red>500, </font>') +
            ((crimes >= 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
            ((crimes >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((crimes >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((crimes >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((crimes >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((crimes >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispComputerTT(li, crimes) {
        var text = '<B>Computer crimes:</B>' + CRLF + TAB + 'Plant a Computer Virus, Hacking' + CRLF + CRLF;
        text = text + 'Honor Bar at 1,000: <B>\"Bug\",</B> ' + getPctForLi(li, 1000) + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"We Have A Breach\",</B> ' + getPctForLi(li, 5000);

        debug('dispComputerTT, crimes = ' + crimes);
        var text2 = 'Medals at: <B>' +
            ((crimes >= 1500) ? '<font color=green>1500, </font>' : '<font color=red>1500, </font>') +
            ((crimes >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((crimes >= 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
            ((crimes >= 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
            ((crimes >= 3500) ? '<font color=green>3500, </font>' : '<font color=red>3500, </font>') +
            ((crimes >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((crimes >= 4500) ? '<font color=green>4500, </font>' : '<font color=red>4500, </font>') +
            ((crimes >= 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
            ((crimes >= 5500) ? '<font color=green>5500, </font>' : '<font color=red>5500, </font>') +
            ((crimes >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((crimes >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((crimes >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((crimes >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((crimes >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispMurderTT(li, frauds) {
        var text = '<B>Murder crimes:</B>' + CRLF + TAB + 'Assasination' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Professional\",</B> ' + getPctForLi(li, 5000);

        debug('dispMurderTT, crimes = ' + frauds);
        var text2 = 'Medals at: <B>' +
            ((frauds >= 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
            ((frauds >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((frauds >= 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
            ((frauds >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((frauds >= 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
            ((frauds >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((frauds >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((frauds >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((frauds >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((frauds >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispFraudTT(li, frauds) {
        var text = '<B>Fraud crimes:</B>' + CRLF + TAB + 'Arson, Pawn Shop, Counterfeiting,' + CRLF + TAB +
            'Arms Trafficking, Bombings' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Fire Starter\",</B> ' + getPctForLi(li, 5000);

        debug('dispFraudTT, crimes = ' + frauds);
        var text2 = 'Medals at: <B>' +
            ((frauds >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((frauds >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((frauds >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((frauds >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((frauds >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispOtherTT(li, crimes) {
        debug('dispOtherTT');
        var text = '<B>Other crimes:</B>' + CRLF + TAB + 'Search for cash' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Find A Penny, Pick It Up\",</B> ' + getPctForLi(li, 5000);

        displayToolTip(li, text);
    }

    function dispTotalTT(li, crimes) {
        debug('dispTotalTT');
        var text = '<B>Total Criminal Offences:</B>' + CRLF + TAB + 'Well, everything.' + CRLF + CRLF;
        text = text + 'Honor Bar at 10,000: <B>\"Society\'s Worst\",</B> ' + getPctForLi(li, 10000);

        displayToolTip(li, text);
    }

    // Helper to parse # from an aria-label
    function qtyFromAriaLabel(ariaLabel) {
        // ex. aria-label = "Drug deals: 255"
        var parts = ariaLabel.split(':');
        return Number(parts[1].replace(/,/g, ""));
    }

    // Helper to get the value of the number associated with the
    // span, which is a key/value string pair, as a percentage.
    function getPctForLi(li, value) {
        let ariaLabel = li.getAttribute('aria-label');
        let crimes = qtyFromAriaLabel(ariaLabel);
        let pctText = crimes/value * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
        }

        return pctText;
    }

    //////////////////////////////////////////////////////////////////////
    // Handlers for various states of page loading
    //////////////////////////////////////////////////////////////////////

    // Some scripts can run as soon as the page has loaded.
    function handlePageLoad() {
        log('[handlePageLoad]');

        if (opts_enabledScripts.sidebarColors) {
            tornSidebarColors().then(
            result => {
                log('[SUCCESS] ' + result);
            },
            error => {
                log('[ERROR] ' + error);
            });
        }

        if (opts_enabledScripts.hideShowChat) {
            tornHideShowChat().then(
            result => {
                log('[SUCCESS] ' + result);
            },
            error => {
                log('[ERROR] ' + error);
            });
        }
    }

    // And some need to wait until the page is complete.
    function handlePageComplete() {
        log('[handlePageComplete]');

        if (opts_enabledScripts.crimeToolTips) {
            tornCrimeTooltips().then(
            result => {
                log('[SUCCESS] ' + result);
            },
            error => {
                log('[ERROR] ' + error);
            });
        }
    }

    // And others after data from the API has been received.
    function onApiComplete() {
        log('[onApiComplete]');

        if (opts_enabledScripts.latestAttacks) {
            tornLatestAttacksExtender().then(
            result => {
                log('[SUCCESS] ' + result);
            },
            error => {
                log('[ERROR] ' + error);
            });
        }

        if (opts_enabledScripts.statTracker) {
            if (location.href.indexOf('test.html') > -1) {
                handleStatsConfigPage();
            } else {
                tornStatTracker().then(
                result => {
                    log('[SUCCESS] ' + result);
                },
                error => {
                    log('[ERROR] ' + error);
                });
            }
        }

        if (opts_enabledScripts.drugStats) {
            tornDrugStats().then(
            result => {
                log('[SUCCESS] ' + result);
            },
            error => {
                log('[ERROR] ' + error);
            });
        }

        if (opts_enabledScripts.facRespect) {
            tornFacRespect().then(
            result => {
                log('[SUCCESS] ' + result);
            },
            error => {
                log('[ERROR] ' + error);
            });
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    if (location.href == tornStatTrackerCfgURL) {
        // Separate URL just for the 'Stats Tracker' script config page.
        handleStatsConfigPage();
    } else {
        // Start of by collecting stats we need. This will kick off some scripts that depend on stats.
        // Callback triggers onApiCoomplete()
        personalStatsQuery();

        // Other scripts can run at certain earlier page load states.
        callOnContentLoaded(handlePageLoad);
        callOnContentComplete(handlePageComplete);
    }

})();
