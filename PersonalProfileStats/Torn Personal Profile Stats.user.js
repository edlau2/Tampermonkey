// ==UserScript==
// @name         Torn Personal Profile Stats
// @namespace    http://tampermonkey.net/
// @version      2.11
// @description  Estimates a user's battle stats, NW, and numeric rank and adds to the user's profile page
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @match        https://www.torn.com/profiles.php*
// @connect      api.torn.com
// @connect      www.tornstats.com
// @connect      localhost
// @connect      18.119.136.223
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

(function() {
    'use strict';

    // These are custom stats that can be displayed in a collapsible DIV
    // under Personal Information. Any stat that is available in the user
    // personalstats API call can be put here.
    var statArray = [{statDesc: "Xanax Used", statVar: "xantaken"},
                     {statDesc: "SE's used",  statVar: "statenhancersused"},
                     {statDesc: "Cans Used",  statVar: "energydrinkused"},
                     {statDesc: "Boosters",   statVar: "boostersused"},
                     {statDesc: "RW Hits",    statVar: "rankedwarhits"},
                     {statDesc: "Refills",    statVar: "refills"}];

    // Constants and globals
    const levelTriggers = [ 2, 6, 11, 26, 31, 50, 71, 100 ];
    const crimeTriggers = [ 100, 5000, 10000, 20000, 30000, 50000 ];
    const nwTriggers = [ 5000000, 50000000, 500000000, 5000000000, 50000000000 ];

    // This feature uses my batstats server, which gets estimates based
    // on FF calculations. It's still a WIP, my bats stat estimator script
    // is required to update the DB, but not required to read. If enabled,
    // my server IP must  be put in the script header:
    // @connect      18.119.136.223
    // The "// @connect      localhost" line is there for testing with my
    // local DB. Turn off if my IP (18.119.136.223) goes away, it's at AWS
    const custBatStatsEnabled = GM_getValue("custBatStatsEnabled", false);
    const displayCustomStats = true;
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    // From: https://wiki.torn.com/wiki/Ranks
    // Total Battlestats	2k-2.5k, 20k-25k, 200k-250k, 2m-2.5m, 20m-35m, 200m-250m
    // These are from: https://www.tornstats.com/awards.php
    const estimatedStats = [
        {estimate: "under 2k", low: 2000, high: 2000},
        {estimate: "2k - 20k", low: 2000, high: 20000},
        {estimate: "20k - 250k", low: 20000, high: 250000},
        {estimate: "250k - 2.5m", low: 250000, high: 2500000},
        {estimate: "2.5m - 35m", low: 2500000, high: 35000000},
        {estimate: "35m - 200m", low: 35000000, high: 200000000},
        {estimate: "over 200m", low: 200000000, high: 0},
    ];

    GM_addStyle(`.xedx-caret { padding: 5px 10px 5px 20px;}`);

    const batStatLi = 'xedx-batstat-li';
    var targetNode = $("#profileroot");

    //let retries = 0;
    function personalStatsQueryCB(responseText, ID, retries=0) {
        if (!responseText) {
            // Retry without the 'profile' selection, but just once.
            log("Error querying user stats - no result!");
            if (retries++ < 1) xedx_TornUserQueryDbg(ID, 'personalstats,crimes', personalStatsQueryCB, retries);
            return;
        }

        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            if (jsonResp.error.code == 6)
                return;
            return handleError(responseText);
        }

        let userNW = jsonResp.personalstats.networth;
        let userCrimes = jsonResp.criminalrecord.total;
        let userLvl = jsonResp.level;
        let userRank = (jsonResp.rank == undefined) ? undefined : numericRankFromFullRank(jsonResp.rank);

        // Highlight life as appropriate
        doLifeHighlighting();
        addNetWorthToProfile(userNW);

        // Get bat stats estimate, based on rank triggers (sync)
        if (userRank != undefined && userLvl != undefined && userNW != undefined)
            batStats = getEstimatedBatStats(userNW, userCrimes, userLvl, userRank); // Calculate bat stats estimate

        // Get any spies (async). On completion, get our estimated stats from FF DB.
        xedx_TornStatsSpy(ID, getTornSpyCB);

        addNumericRank(userRank);

        if (displayCustomStats) {
            addCustomStats(jsonResp.personalstats);
        }
    }

    // Get data used to calc bat stats and get NW via the Torn API
    function personalStatsQuery(ID, param) {
        xedx_TornUserQueryDbg(ID, 'personalstats,crimes,profile', personalStatsQueryCB, param);
    }

    //////////////////////////////////////////////////////////////////////////////////
    // Function to add custom stats to the "Personal Information" section.
    //////////////////////////////////////////////////////////////////////////////////

    //var notSharing = false;
    //var statsHeightCollapsed;
    function addCustomStats(personalStats) {
        var statsHeightCollapsed = $(".profile-right-wrapper .personal-info").height();

        let table = $(".profile-right-wrapper .info-table");
        if (!$(table).length) {  // This is the case if the user isn't sharing information.
            let contDiv = $(".profile-container.personal-info");
            $(contDiv).append($('<ul class="info-table"></ul>'));
            table = $(".profile-container.personal-info > ul"); //sectionDiv.querySelector(".info-table");
        }

        let node2 = $(`<li id="xedx-cust-stats2">
                       <div class="user-information-section">
                           <span class="bold">Custom Stats</span>
                       </div>
                       <div class="user-info-value">
                           <span> Expand for more...</span>
                           <span style="float:right;"><i id="xedx-stats-caret" class="icon fas fa-caret-right xedx-caret"></i></span>
                       </div>
                   </li>`);

        $(table).append(node2);

        //let root = $(".profile-right-wrapper .personal-info");
        //statsHeightCollapsed = $(root).height();

        for (let i=0; i<statArray.length; i += 2) {
            let stat1 = statArray[i];
            if (!stat1) break;
            let stat2 = statArray[i+1];
            let statLi = makeStatLi2(stat1.statDesc, personalStats[stat1.statVar],
                              stat2 ? stat2.statDesc : '', stat2 ? personalStats[stat2.statVar] : '');

            $(table).append(statLi);
            if (!stat2) break;
        }

        $("#xedx-stats-caret").on('click', handleStatExpand);

        function handleStatExpand(e) {
            let target = $(e.currentTarget);
            let expand = $(target).hasClass("fa-caret-right");
            $(target).toggleClass("fa-caret-right fa-caret-down");
            let root = $(".profile-right-wrapper .personal-info");
            $(root).css("height", (expand ? "auto" : statsHeightCollapsed + "px"));
        }
    }

    function makeStatLi2(name1, value1, name2, value2) {
        let li = `
            <li class='xstat-pps' style="display:flex;">
                <div class="user-info-value" style="border-right: 1px solid black; width:30%;">
                    <span class="bold">${name1}</span>
                </div>
                <div class="user-info-value" style="border-right: 1px solid black; width:20%;">
                    <span>${value1}</span>
                </div>
                <div class="user-info-value" style="border-right: 1px solid black; width:30%;">
                    <span class="bold">${name2}</span>
                </div>
                <div class="user-info-value" style="width:20%;">
                    <span>${value2}</span>
                </div>
            </li>`;
        return li;
    }

    //////////////////////////////////////////////////////////////////////////////////
    // Function to highlight life: green if full, red otherwise
    //////////////////////////////////////////////////////////////////////////////////

    function doLifeHighlighting() {
        let liSpan =  $(".basic-information   ul.info-table > li:nth-child(5) > div.user-info-value > span");
        if (!$(liSpan).length) return console.error("Couldn't find life bar!");

        let life = $(liSpan).text();
        let parts = life.split('/');
        if (parts[0].trim() == parts[1].trim())
            $(liSpan).attr('style', 'color: #00a500;');
        else
            $(liSpan).attr('style', 'color: #d83500;');

    }

    //////////////////////////////////////////////////////////////////////////////////
    //
    // Bat Stat stuff
    //
    //////////////////////////////////////////////////////////////////////////////////

    // If a spy exists, parse it into a JSON jsonSpy object,
    // which contains the same data as rank trigger bat stat
    // estimates and custom estimates: {estimate: estStat, low: lowStat, high: highStat}
    // Detailed data may be displayed as a collapsible field (DIV) on the profile
    function getTornSpyCB(respText, ID) {
        let data = null;
        try {
            data = JSON.parse(respText);
        } catch (e) {
            log('Error parsing JSON: ', e);
        }
        if (!data || !data.status) {
            log('Error getting spy!', data);
        } else {
            if (data.spy.status) {
                // If no total, adjust high/low accordingly!!!
                let low = 0;
                if (!data.spy.total || isNaN(data.spy.total)) {
                    const nFilter = function(x){return isNaN(x) ? 0 : x;}
                    low = nFilter(data.spy.speed) + nFilter(data.spy.strength) +
                                     nFilter(data.spy.dexterity) + nFilter(data.spy.defense);
                    log('No spy total, adjusted "low" to ' + low);
                }
                jsonSpy = {status: data.spy.status,
                           speed: data.spy.speed,
                           strength: data.spy.strength,
                           defense: data.spy.defense,
                           dexterity: data.spy.dexterity,
                           score: data.spy.target_score,
                           lkg: data.spy.difference,
                           estimate: data.spy.total,
                           high: data.spy.total,
                           low: low ? low : data.spy.total};
                debug('Spy result: ', jsonSpy);
            }
        }

        // Get our own custom 'spy' (async) if enabled.
        if (custBatStatsEnabled) {
            getCustomBatStatEst(ID, customBatStatEstCB);
        } else {
            addBatStatsToProfile();
        }
    }

    // Call our private bat stat esimator DB
    function getCustomBatStatEst(ID, callback) {
        let url = 'http://18.119.136.223:8002/batstats/?cmd=getStats&id=' + ID;
        try {
            GM_xmlhttpRequest({
            method:"GET",
            url:url,
            headers: {
                'Accept': 'application/json'
            },
            onload: function(response) {
                callback(response.responseText, ID);
            },
            onerror: function(response) {
                log('HTTP Error: ', response);
                addBatStatsToProfile(); // Recover!
            }});
        } catch(e) {
            log('Error: ', e);
            addBatStatsToProfile(); // Recover!
        }
    }

    // Parses the JSON data from our custom FF bat stat estimate, into a JSON object:
    // {estimate: estStat, low: lowStat, high: highStat}
    function customBatStatEstCB(resp, ID) {
        let values = [];

        try {
            let obj = JSON.parse(resp);
            let keys = Object.keys(obj);
            for (let i=0; i<keys.length; i++) {
                let stats = obj[keys[i]].oppStatsLow;
                if (stats) stats = Number(stats.toString().replaceAll(',', '')); else stats = 0;
                debug('stats: ', stats);
                if (!isNaN(stats) && stats != Infinity) values.push(stats);
            }
        } catch(e) {
            log('[customBatStatEstCB] Error: ', e);
        }

        if (values.length) {
            let estStat = Math.max(...values);
            let lowStat = estStat;
            let highStat = estStat;

            // Find range values
            let range = getRangeValues(highStat);
            if (range) {
                lowStat = range.low;
                highStat = range.high;
            }
            custBatStats = {estimate: estStat, low: lowStat, high: highStat};
        }

        addBatStatsToProfile();
    }

    // Using the estimated stats from the FF calc, determine which range it falls under
    // int he rank trigger based bat stat estimate, to clarify high and low values.
    // Return the JSON range, {estimated, low, high}
    function getRangeValues(highStat) {
        for (let i=0; i<estimatedStats.length; i++) {
            if (highStat > estimatedStats[i].low && highStat < estimatedStats[i].high)
                return estimatedStats[i];
        }
    }

    // Helper, pick the best of below three values.
    var batStats = {estimate: 0, low: 0, high: 0}; // Can be 'Unknown' or 'N/A' !!
    var jsonSpy = {estimate: 0, low: 0, high: 0};
    var custBatStats = {estimate: 0, low: 0, high: 0};

    function getBestBatStatEstValues() {
        // No spy or custom estimate: return basic estimate
        if (!jsonSpy.estimate && !custBatStats.low) return batStats.estimate;

        // Spy, but no custom estimate (or lower estimate): return spy
        if (jsonSpy.estimate && (jsonSpy.low > custBatStats.low)) return numberWithCommas(jsonSpy.estimate) + ' (' + jsonSpy.lkg + ')';

        // Spy, but no custom estimate: return spy
        if (jsonSpy.estimate && !custBatStats.low) return numberWithCommas(jsonSpy.estimate) + ' (' + jsonSpy.lkg + ')';

        // Custom estimate, no spy - see if within batStat ranges
        // {estimate: "over 200m", low: 200000000, high: 0},
        if (!jsonSpy.estimate && custBatStats.estimate) {
            let estDisplay = massageEstimate(custBatStats.estimate);
            if (batStats.estimate == 'N/A' || (batStats.estimate.indexOf('Unknown') > -1)) {
                return 'Over ' + estDisplay + ' (Level holding?)';
            }
            if (custBatStats.estimate > batStats.high) {
                if (custBatStats.estimate != custBatStats.high) {
                    let displayHigh = massageEstimate(custBatStats.high);
                    return estDisplay + ' to ' + displayHigh + ' (FF estimate)';
                } else {
                    return 'Min. ' + estDisplay + ' (FF estimate)';
                }
            }
            if (custBatStats.estimate > batStats.low && !batStats.high) {
                return 'Over ' + estDisplay + ' (FF estimate)';
            }
            if (custBatStats.estimate <= batStats.high) {
                let displayHigh = massageEstimate(batStats.high);
                return estDisplay + ' to ' + displayHigh + ' (FF estimate)';
            }
            return 'Over ' + estDisplay + ' (FF estimate)';
        }

        // Spy and custom: return larger of the two. Spy details will be displayed regardless.
        if (jsonSpy.low && custBatStats.low) {
            if (jsonSpy.low > custBatStats.low) { // Just use the spy
                return numberWithCommas(jsonSpy.estimate) + ' (' + jsonSpy.lkg + ')';
            } else {
                let estDisplay = massageEstimate(custBatStats.estimate);
                return 'Over ' + estDisplay + ' (FF estimate)';
            }
        }
    }

    // 'massage' the numeric value, converting to display values such as '250k' or '2.5M'
    function massageEstimate(value) {
        if (value < 2000) return value;
        let base = Math.floor(value/1000);
        if (base.toString().length <=3) return (base + 'k');

        // 1000+
        //base = Math.floor(base/1000);
        //base = Math.round(base * 10) / 10;
        base = Math.round(Math.floor(base/1000) * 10) /10;
        if (base.toString().length <=3) return numberWithCommas(base) + 'M';

        //base = Math.round(base * 10) / 10;
        base = Math.round(Math.floor(base/1000) * 10) /10;
        if (base.toString().length <=3) return numberWithCommas(base) + 'B';

        base = Math.round(Math.floor(base/1000) * 10) /10;
        if (base.toString().length <=3) return numberWithCommas(base) + 'T';

        base = Math.round(Math.floor(base/1000) * 10) /10;
        if (base.toString().length <=3) return numberWithCommas(base) + 'Q';
    }

    // Helper, create <li> to display...
    function addBatStatsToProfile() {
        let targetUL = $(".profile-left-wrapper .info-table");
        let display = getBestBatStatEstValues();
        let caretNode = '<span style="float:right;"><i id="xedx-spy-caret" class="icon fas fa-caret-down xedx-caret"></i></span>';

        let li = '<li id="'+ batStatLi + '">' +
                     '<div class="user-information-section"><span class="bold">Est. Bat Stats</span></div>' +
                     '<div class="user-info-value" id="xedx-collapsible"><span>' + display + '</span>' +
                     ((jsonSpy.status) ? caretNode : '') +
                     '</div></li>';

        if (jsonSpy.status) {
            li += '<div id="xedx-stat-det" class="xedx-cx" style="display:block;">' +
                  '<li style="display:flex;"><div class="user-info-value" style="border-right: 1px solid black;width:50%;"><span>Spd: ' +
                  numberWithCommas(jsonSpy.speed) + '</span></div>' +
                  '<div class="user-info-value" style="width:50%;"><span>Str: ' +
                  numberWithCommas(jsonSpy.strength) + '</span></div></li>' +
                  '<li style="display:flex;"><div class="user-info-value" style="border-right: 1px solid black;width:50%;"><span>Dex: ' +
                  numberWithCommas(jsonSpy.dexterity) + '</span></div>' +
                  '<div class="user-info-value" style="width:50%;"><span>Def: ' +
                  numberWithCommas(jsonSpy.defense) + '</span></div><li></div>';
        }
        $(targetUL).append(li);
        if (!abroad()) {
            $("#xedx-spy-caret").on('click', handleSpyExpand);
        }

        var expandedHeight = $("#xedx-stat-det").height();
        function handleSpyExpand(e) {
            let target = $(e.currentTarget);
            let expand = $(target).hasClass("fa-caret-right");
            $(target).toggleClass("fa-caret-right fa-caret-down");

            $("#xedx-stat-det").animate({"height": (expand ? (expandedHeight + "px") : "0px")}, 250);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Determine the range to display
    //
    // This calculation taken from:
    //    https://www.torn.com/forums.php#/p=threads&f=61&t=16065473&b=0&a=0
    //
    // and DeKleineKobini's 'dekleinekobini.statestimate' from:
    //    https://www.tornstats.com/awards.php
    ////////////////////////////////////////////////////////////////////

    function getEstimatedBatStats(userNW, userCrimes, userLvl, userRank) {
        let trLevel = 0, trCrime = 0, trNetworth = 0;
        for (let l in levelTriggers) {if (levelTriggers[l] <= userLvl) trLevel++;}
        for (let c in crimeTriggers) {if (crimeTriggers[c] <= userCrimes) trCrime++;}
        for (let nw in nwTriggers) {if (nwTriggers[nw] <= userNW) trNetworth++;}

        let statLevel = userRank - trLevel - trCrime - trNetworth;
        let estimated = estimatedStats[statLevel];
        if (!estimated) {
            if (userLvl < 76) {
                estimated = {estimate: "Unknown, maybe level holding?", low: 0, high: 0};
            } else {
                estimated = {estimate: "N/A", low: 0, high: 0};
            }
        }

        return estimated;
    }

    //////////////////////////////////////////////////////////////////////
    // Add net worth to the profile
    //////////////////////////////////////////////////////////////////////

    var nwRetries = 0;
    function addNetWorthToProfile(nw) {
        if (validPointer(document.getElementById('xedx-networth-li'))) {
            return;
        }

        let display = '$' + numberWithCommas(nw);
        let profileDiv = $('#profileroot').find('div.user-profile');
        let basicInfo = $(profileDiv).find('div.profile-wrapper > div.basic-information');
        var targetNode = document.getElementById('profileroot');
        let ul = $(basicInfo).find('ul.info-table');
        if (!ul.length) {
            if (nwRetries++ < 4) setTimeout(addNetWorthToProfile(nw), 500);
            return;
        }
        let li = '<li id="xedx-networth-li"><div class="user-information-section">' +
            '<span class="bold">Net Worth</span></div>' +
            '<div class="user-info-value"><span>' + display + '</span></div></li>';
        $(ul).append(li);
    }

    //////////////////////////////////////////////////////////////////////
    // Convert the rank name to it's numeric equivalent for display.
    //////////////////////////////////////////////////////////////////////

    // ['str-to-match', 'str-to-replace-with', 'attr', 'attr-value']
    /*
    var ranks = [['Absolute beginner', 'Absolute noob', 'class', 'long'],
                 ['Beginner', 'Beginner', 'class','medium'],
                 ['Inexperienced', 'Inexperienced', 'class', 'long'],
                 ['Rookie', 'Rookie', 'class','medium'],
                 ['Novice', 'Novice', 'class','medium'],
                 ['Below average', 'Below average', 'class', 'long'],
                 ['Average', 'Average', 'class','medium'],
                 ['Reasonable', 'Reasonable', 'class', 'long'],
                 ['Above average', 'Above average', 'class', 'long'],
                 ['Competent', 'Competent', 'class','medium'],
                 ['Highly competent', 'Highly comp.', 'class', 'long'],
                 ['Veteran', 'Veteran', 'class','medium'],
                 ['Distinguished', 'Distinguished', 'class', 'long'],
                 ['Highly distinguished', 'Highly dist.', 'class', 'long'],
                 ['Professional', 'Professional', 'class', 'long'],
                 ['Star', 'Star', 'class','medium'],
                 ['Master', 'Master', 'class','medium'],
                 ['Outstanding', 'Outstanding', 'class', 'long'],
                 ['Celebrity', 'Celebrity', 'class', 'medium'],
                 ['Supreme', 'Supreme', 'class','medium'],
                 ['Idolized', 'Idolized', 'class','medium'],
                 ['Champion', 'Champion', 'class','medium'],
                 ['Heroic', 'Heroic', 'class','medium'],
                 ['Legendary', 'Legendary', 'class', 'long'],
                 ['Elite', 'Elite', 'class','medium'],
                 ['Invincible', 'Invincible', 'class', 'long']];
    */

    var ranksObj = { 'Absolute beginner': {name: 'Absolute noob', class: 'long'},
                 'Beginner': {name: 'Beginner', class: 'medium'},
                 'Inexperienced': {name: 'Inexperienced', class:  'long'},
                 'Rookie': {name: 'Rookie', class: 'medium'},
                 'Novice': {name: 'Novice', class: 'medium'},
                 'Below average': {name: 'Below average', class:  'long'},
                 'Average': {name: 'Average', class: 'medium'},
                 'Reasonable': {name: 'Reasonable', class:  'long'},
                 'Above average': {name: 'Above average', class:  'long'},
                 'Competent': {name: 'Competent', class: 'medium'},
                 'Highly competent': {name: 'Highly comp.', class:  'long'},
                 'Veteran': {name: 'Veteran', class: 'medium'},
                 'Distinguished': {name: 'Distinguished', class:  'long'},
                 'Highly distinguished': {name: 'Highly dist.', class:  'long'},
                 'Professional': {name: 'Professional', class:  'long'},
                 'Star': {name: 'Star', class: 'medium'},
                 'Master': {name: 'Master', class: 'medium'},
                 'Outstanding': {name: 'Outstanding', class:  'long'},
                 'Celebrity': {name: 'Celebrity', class:  'medium'},
                 'Supreme': {name: 'Supreme', class: 'medium'},
                 'Idolized': {name: 'Idolized', class: 'medium'},
                 'Champion': {name: 'Champion', class: 'medium'},
                 'Heroic': {name: 'Heroic', class: 'medium'},
                 'Legendary': {name: 'Legendary', class:  'long'},
                 'Elite': {name: 'Elite', class: 'medium'},
                 'Invincible': {name: 'Invincible', class:  'long'}};

    function addNumericRank(userRank) { // userRank is unused
        /*
        var elemList = document.getElementsByClassName('two-row');
        var element = elemList[0];
        if (element == 'undefined' || typeof element == 'undefined') {
            return;
        }
        var rank = element.firstChild;
        var html = rank.innerHTML;
        */

        let span = $('.two-row > span')[0];
        let text = $(span).text();
        let entry = ranksObj[text];
        log("span: ", $(span), " text: ", text, " entry: ", entry);

        if (entry) {
            $(span).text(entry.name);
            $(span).attr("class", entry.class);
        }

        /*else {
            log("ERROR: entry not found!");

            let html = $($('.two-row > span')[0]).text();
            for (var i = 0; i < ranks.length; i++) {
                if (html == ranks[i][0]) {
                    while(rank.attributes.length > 0) {
                        rank.removeAttribute(rank.attributes[0].name);
                    }
                    rank.setAttribute(ranks[i][2], ranks[i][3]);
                    rank.innerHTML = ranks[i][1] + ' (' + i +')';
                    return;
                }
            }
        }*/
    }

    // Kick everything off...
    function handlePageLoad() {
        personalStatsQuery(xidFromProfileURL(window.location.href));
    }

    //////////////////////////////////////////////////////////////////////
    // Effectively 'main', where the script starts. Log this event in the
    // console so we know it has started
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (checkCloudFlare()) {
        log("Won't run while challenge active!");
        return;
    }

    validateApiKey();
    versionCheck();

    callOnContentLoaded(handlePageLoad);

})();

