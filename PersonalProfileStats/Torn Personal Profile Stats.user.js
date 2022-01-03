// ==UserScript==
// @name         Torn Personal Profile Stats
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Estimates a user's battle stats, NW, and numeric rank and adds to the user's profile page
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @local        file://///Users/edlau/Documents/Tampermonkey Scripts/helpers/Torn-JS-Helpers.js
// @include      https://www.torn.com/profiles.php*
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

(function() {
    'use strict';

    // Constants and globals
    const levelTriggers = [ 2, 6, 11, 26, 31, 50, 71, 100 ];
    const crimeTriggers = [ 100, 5000, 10000, 20000, 30000, 50000 ];
    const nwTriggers = [ 5000000, 50000000, 500000000, 5000000000, 50000000000 ];
    const caretNode = '<span style="float:right;"><i id="xedx-caret" class="icon fas fa-caret-right xedx-caret"></i></span>';
    var caretState = 'fa-caret-right';

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

    GM_addStyle(".xedx-caret {" +
                "padding-top:5px;" +
                "padding-bottom:5px;" +
                "padding-left:20px;" +
                "padding-right:10px;" +
                "}");

    const batStatLi = 'xedx-batstat-li';
    var userNW = 0;
    var userLvl = 0;
    var userCrimes = 0;
    var userRank = 0;
    var targetNode = document.getElementById('profileroot');

    function handleClick(e) {
        log('handleClick: state = ' + caretState);
        let targetNode = document.querySelector("#xedx-caret"); // e.target
        let elemState = 'block';
        let childList = document.querySelector("#nav-home").parentNode.children;
        if (caretState == 'fa-caret-down') {
            targetNode.classList.remove("fa-caret-down");
            targetNode.classList.add("fa-caret-right");
            caretState = 'fa-caret-right';
            elemState = 'none';
        } else {
            targetNode.classList.remove("fa-caret-right");
            targetNode.classList.add("fa-caret-down");
            caretState = 'fa-caret-down';
        }
        GM_setValue('lastState', caretState);
        document.querySelector("#xedx-stat-det").setAttribute('style' , 'display: ' + elemState);
    }

    // Get data used to calc bat stats and get NW via the Torn API
    function personalStatsQuery(ID) {
        log('Calling xedx_TornUserQuery');
        xedx_TornUserQuery(ID, 'personalstats,crimes,profile', personalStatsQueryCB);
    }

    // Callback for above
    function personalStatsQueryCB(responseText, ID) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        if (loggingEnabled) {console.log(GM_info.script.name + 'Personal stats: ', jsonResp);}

        userNW = jsonResp.personalstats.networth;
        userCrimes = jsonResp.criminalrecord.total;
        userLvl = jsonResp.level;
        userRank = numericRankFromFullRank(jsonResp.rank);

        // Add NW
        addNetWorthToProfile(userNW);

        // Get bat stats spy, or estimate.
        batStats = getEstimatedStats(); // Calculate bat stats estimate

        log('Calling xedx_TornStatsSpy');
        xedx_TornStatsSpy(ID, getBatStatsCB); // Get any spies. On completion, get our estimated stats from FF DB.

        // Display the numeric rank next to textual rank
        addNumericRank();
    }

    function getBatStatsCB(respText, ID) {
        // Process result, get spy (if any), if not, use estimated.
        let data = JSON.parse(respText);
        log('Spy response: ' + respText);
        if (!data.status) {
            log('Error getting spy! Response text: ' + resptext);
        } else {
            if (data.spy.status) {
                jsonSpy = {status: data.spy.status,
                                           speed: data.spy.speed,
                                           strength: data.spy.strength,
                                           defense: data.spy.defense,
                                           dexterity: data.spy.dexterity,
                                           score: data.spy.target_score,
                                           lkg: data.spy.difference,
                                           estimate: data.spy.total,
                                           high: data.spy.total,
                                           low: data.spy.total};
            }
        }

        log('Calling getCustomBatStatEst');
        getCustomBatStatEst(ID, customBatStatEstCB);

        //addBatStatsToProfile();
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
                console.log('HTTP Error: ', response);
                addBatStatsToProfile(); // Recover!
            }});
        } catch(e) {
            console.log('Error: ', e);
            addBatStatsToProfile(); // Recover!
        }
    }

    /*
    {"Row 1":{"rowid":4,"date":"2022-01-01","time":"01:20:38","attackID":177986049,
    "userID":"2100735","userName":"xedx","oppID":"2503509","oppName":"Admiral_Biatch","oppLevel":68,
    "lastAction":"31 minutes ago","result":"Mugged","ffMod":3,"userScore":52506.588844970276,
    "oppScore":39379.94163372771,"scoreRatio":0.75,"oppStatsLow":"387,694,950",
    "statRatio":"539,347,113","lkg":"596,643,488","lkg_when":"2 weeks ago","oppStatsHigh":"2000"}}
    */
    function customBatStatEstCB(resp, ID) {
        console.log('*** Custom stats: ', resp);
        let values = [];

        try {
            let obj = JSON.parse(resp);
            let keys = Object.keys(obj);
            for (let i=0; i<keys.length; i++) {
                console.log('obj[keys[i]]: ', obj[keys[i]]);

                let lkg = obj[keys[i]].lkg;
                console.log('lkg: ', lkg);
                if (lkg) lkg = Number(lkg.toString().replaceAll(',', '')); else lkg = 0;
                console.log('lkg: ', lkg);

                let stats = obj[keys[i]].oppStatsLow;
                console.log('stats: ', stats);
                if (stats) stats = Number(stats.toString().replaceAll(',', '')); else stats = 0;
                console.log('stats: ', stats);

                let value = (lkg > stats) ? lkg : stats;
                console.log('high value: ', value);
                console.log('Pushing stat est: ', stats);
                //values.push(value);
                values.push(stats);
            }
        } catch(e) {
            console.log('[customBatStatEstCB] Error: ', e);
        }

        console.log('values: ', values);
        if (values.length) {
            let highStat = Math.max(...values);
            log("*** High stat: " + highStat);
            custBatStats = {estimate: highStat, low: highStat, high: highStat};
        }

        addBatStatsToProfile();
    }

    // Create the bat stats <li>, add to the profile page
    function addBatStatsToProfile() {
        log('Adding estimated bat stats to profile.');
        let testDiv = document.getElementById(batStatLi);
        if (validPointer(testDiv)) {return;} // Only do once

        let rootDiv = targetNode.getElementsByClassName('basic-information profile-left-wrapper left')[0];
        let targetUL = rootDiv.getElementsByClassName('info-table')[0];
        if (!validPointer(targetUL)) {return;}

        let li = createBatStatLI(targetUL); // And add to the display
    }

    // Helper, pick the best of below three values.
    var batStats = {estimate: 0, low: 0, high: 0}; // Can be 'Unknown' or 'N/A' !!
    var jsonSpy = {estimate: 0, low: 0, high: 0};
    var custBatStats = {estimate: 0, low: 0, high: 0};

    function getBestValues() {
        console.log(GM_info.script.name + ' batStats: ', batStats);
        console.log(GM_info.script.name + ' custBatStats: ',  custBatStats);
        console.log(GM_info.script.name + ' jsonSpy: ', jsonSpy);

        // No spy or custom estimate: return basic estimate
        if (!jsonSpy.low && !custBatStats.low) return batStats.estimate;

        // Spy, but no custom estimate (or lower estimate): return spy
        if (jsonSpy.low && (jsonSpy.low > custBatStats.low)) return numberWithCommas(jsonSpy.estimate) + ' (' + jsonSpy.lkg + ')';

        // Spy, but no custom estimate: return spy
        if (jsonSpy.low && !custBatStats.low) return numberWithCommas(jsonSpy.estimate) + ' (' + jsonSpy.lkg + ')';

        // Custom estimate, no spy - see if within batStat ranges
        // {estimate: "over 200m", low: 200000000, high: 0},
        if (!jsonSpy.low && custBatStats.low) {
            if (batStats.estimate == 'N/A' || (batStats.estimate.indexOf('Unknown') > -1))
                return 'Over ' + numberWithCommas(custBatStats.estimate) + ' (Level holding?)';
            if (custBatStats.low > batStats.high)
                return 'Min. ' + numberWithCommas(custBatStats.estimate) + ' (FF estimate)';
            if (custBatStats.low > batStats.low && !batStats.high)
                return 'Over ' + numberWithCommas(custBatStats.estimate) + ' (FF estimate)';
            if (jsonSpy.low < batStats.high)
                return numberWithCommas(custBatStats.estimate) + ' to ' + numberWithCommas(batStats.high);
            return numberWithCommas(custBatStats.estimate) + ' (FF estimate)';
        }

        // Spy and custom: return larger of the two. Spy details will be displayed regardless.
        if (jsonSpy.low && custBatStats.low) {
            if (jsonSpy.low > custBatStats.low) // Just use the spy
                return numberWithCommas(jsonSpy.estimate) + ' (' + jsonSpy.lkg + ')';
            else
                return numberWithCommas(custBatStats.estimate) + ' (FF estimate)';
        }
    }

    // Helper, create <li> to display...
    function createBatStatLI(ul) {
        log('[createBatStatLI]');

        // Need the best of the three - batStats, jsonSpy, and custBatStatsLow.
        let display = getBestValues();
        log('Best value: ' + display);

        let li = '<li id="'+ batStatLi + '">' +
                     '<div class="user-information-section"><span class="bold">Est. Bat Stats</span></div>' +
                     '<div class="user-info-value" id="xedx-collapsible"><span>' + display + '</span>' +
                     ((jsonSpy.status) ? caretNode : '') +
                     '</div></li>';

        if (jsonSpy.status) {
            //$("#xedx-collapsible").append(caretNode);
            li += '<div id="xedx-stat-det" style="display:block;">' +
                  '<li style="display:flex;"><div class="user-info-value" style="border-right: 1px solid black;width:50%;"><span>Spd: ' +
                  numberWithCommas(jsonSpy.speed) + '</span></div>' +
                  '<div class="user-info-value" style="width:50%;"><span>Str: ' +
                  numberWithCommas(jsonSpy.strength) + '</span></div></li>' +
                  '<li style="display:flex;"><div class="user-info-value" style="border-right: 1px solid black;width:50%;"><span>Dex: ' +
                  numberWithCommas(jsonSpy.dexterity) + '</span></div>' +
                  '<div class="user-info-value" style="width:50%;"><span>Def: ' +
                  numberWithCommas(jsonSpy.defense) + '</span></div><li></div>';
        }
        $(ul).append(li);

        // Make the details 'collapsible'
        caretState = GM_getValue('lastState', caretState);
        document.getElementById("xedx-caret").addEventListener('click', function (event) {
            handleClick(event)}, { passive: false });
        caretState = (caretState == 'fa-caret-down') ? 'fa-caret-right' : 'fa-caret-down';
        handleClick();

        return li;
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

    function getEstimatedStats() {
        let trLevel = 0, trCrime = 0, trNetworth = 0;
        for (let l in levelTriggers) {if (levelTriggers[l] <= userLvl) trLevel++;}
        for (let c in crimeTriggers) {if (crimeTriggers[c] <= userCrimes) trCrime++;}
        for (let nw in nwTriggers) {if (nwTriggers[nw] <= userNW) trNetworth++;}

        let statLevel = userRank - trLevel - trCrime - trNetworth;
        let estimated = estimatedStats[statLevel];

        log('Stat estimator: statLevel = ' + statLevel + ' Estimated = ' + estimated);
        log('Stat estimator: Level: ' + userLvl + ' Crimes: ' + userCrimes + ' NW: ' + userNW + ' Rank: ' + userRank);
        log('Stat estimator: trLevel: ' + trLevel + ' trCrimes: ' + trCrime + ' trNW: ' + trNetworth);
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

    function addNetWorthToProfile(nw) {
        log('Adding Net Worth to profile.');
        if (validPointer(document.getElementById('xedx-networth-li'))) {return;}

        let display = '$' + numberWithCommas(nw);
        let profileDiv = $('#profileroot').find('div.user-profile');
        let basicInfo = $(profileDiv).find('div.profile-wrapper > div.basic-information');
        var targetNode = document.getElementById('profileroot');
        let ul = $(basicInfo).find('ul.info-table');
        if (!ul.length) {return;}
        let li = '<li id="xedx-networth-li"><div class="user-information-section">' +
            '<span class="bold">Net Worth</span></div>' +
            '<div class="user-info-value"><span>' + display + '</span></div></li>';
        $(ul).append(li);
    }

    //////////////////////////////////////////////////////////////////////
    // Convert the rank name to it's numeric equivalent for display.
    //////////////////////////////////////////////////////////////////////

    // ['str-to-match', 'str-to-replace-with', 'attr', 'attr-value']
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

    function addNumericRank() {
        log('Adding Numeric Rank to profile.');
        var elemList = document.getElementsByClassName('two-row');
        var element = elemList[0];
        if (element == 'undefined' || typeof element == 'undefined') {
            return;
        }
        var rank = element.firstChild;
        var html = rank.innerHTML;
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
    validateApiKey();
    versionCheck();

    // Delay until DOM content load (not full page) complete
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoaded);
    } else {
        handlePageLoad();
    }

})();
