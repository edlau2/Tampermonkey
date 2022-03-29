// ==UserScript==
// @name         Torn Adv Mini Profile
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Adds additional stats to the mini profiles on a page.
// @author       xedx [2100735]
// @include      https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @connect      www.tornstats.com
// @connect      18.119.136.223
// @connect      *
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

    // Globals
    var observer = null;
    var target = document.body;
    var config = {childList: true, subtree: true, attributes: false, characterData: false};
    const custBatStatsEnabled = true; // Turn off if my IP (18.119.136.223) goes away, it's at AWS

    // Helpers
    function observeOn() {
        if (observer) {
           observer.observe(target, config);
        }
    }

    function observeOff() {
        if (observer) observer.disconnect();
    }

    // Handle page load - start an observer to check for new nodes,
    // specifically, the id="profile-mini-root" node. Once this node
    // has been added, we look for changes using this as the target.
    function handlePageLoaded() {
        log('handlePageLoaded');

        let node = document.getElementById('profile-mini-root');
        if (node) {
            target = node;
            observer = new MutationObserver(handleMiniProfileChange);
            observeOn();
            return;
        }

        observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (!mutation.addedNodes) return;
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                let node = mutation.addedNodes[i];
                observeOff();
                handleNewNode(node);
            }
          })
        });

        observeOn();
    }

    function queryUserProfile(node, id) {
        log('queryUserProfile: ID=' + id);
        xedx_TornUserQuery(id, 'personalstats,crimes,profile', queryUserProfileCB, node);
    }

    // This parses out the info we want to display, and adds it to
    // the mini profile in a table format.
    function queryUserProfileCB(responseText, ID, node) {
        log('queryUserProfileCB: id='+ID);
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let networth = jsonResp.personalstats.networth;
        let xanax = jsonResp.personalstats.xantaken;
        let cans = jsonResp.personalstats.energydrinkused;
        let ses = jsonResp.personalstats.statenhancersused;
        let totalAttacks = jsonResp.personalstats.attackswon + jsonResp.personalstats.attackslost + jsonResp.personalstats.attacksdraw;
        let crimes = jsonResp.criminalrecord.total;
        let lastAct = jsonResp.last_action.relative;
        let boosters = jsonResp.personalstats.boostersused;
        let userLvl = jsonResp.level;
        let userRank = numericRankFromFullRank(jsonResp.rank);

        // Get bat stats estimate, based on rank triggers (sync)
        batStats = getEstimatedBatStats(networth, crimes, userLvl, userRank); // Calculate bat stats estimate
        let useStats = getBestBatStatEstValues();

        let ttNode = node.querySelectorAll(`[class^="tt-mini-data"]`)[0];
        if (ttNode) {
            ttNode.setAttribute("style", "display: none;");
        }

        let parent = node.querySelectorAll(`[class^="profile-mini-_userProfileWrapper___"]`)[0];
        let wrapper = node.querySelectorAll(`[class^="profile-mini-_wrapper___"]`)[0];
        let newNode =
            '<div class="content-bottom-round" id="xedx-mini-adv" style="margin-top: 5px;">' +
                '<table style="width: 100%; border-collapse:separate;">' +
                    '<tr>' +
                        '<td class="xtdmp"><strong>NW: </strong><span> $' + numberWithCommas(networth) + '</span></td>' +
                        '<td class="xtdmp"><strong>Xan: </strong><span> ' + numberWithCommas(xanax) + '</span></td>' +
                    '</tr>' +
                    '<tr>' +
                        '<td class="xtdmp"><strong>Cans: </strong><span> ' + numberWithCommas(cans) + '</span></td>' +
                        '<td class="xtdmp"><strong>SE`s: </strong><span> ' + numberWithCommas(ses) + '</span></td>' +
                    '</tr>' +
                    '<tr>' +
                        '<td class="xtdmp"><strong>Attacks: </strong><span> ' + numberWithCommas(totalAttacks) + '</span></td>' +
                        '<td class="xtdmp"><strong>Crimes: </strong><span> ' + numberWithCommas(crimes) + '</span></td>' +
                    '</tr>' +
                    '<tr>' +
                        '<td class="xtdmp" colspan="2"><strong>Est Bat Stats: </strong>' +
                        '<span>' + useStats + '</span></td>' +
                    '</tr>' +
                    '<tr>' +
                        '<td class="xtdmp" colspan="2"><strong>Last Action: </strong>' +
                        '<span>' + lastAct + '</span></td>' +
                    '</tr>' +
                '</table>' +
            '</div>';
        console.log('queryUserProfileCB: Appending new node to ', parent);
        log(newNode);
        wrapper.style.maxHeight = '302px';
        $(parent).append(newNode);
    }

    // Handle changes to the mini profile node.
    // First check for a Torn Stats spy, which
    // is async and will trigger a personal stats and
    // crimes query of the user.
    var profileQueried = false;
    function handleMiniProfileChange() {
        log('handleMiniProfileChange');
        let node = target;
        let idNode = node.querySelectorAll('[id$=-user]')[0];
        if (!idNode) {
            log('Mini-profile closing - no id');
            profileQueried = false;
            return;
        }
        if (!profileQueried) {
            let id = idNode.id.replace('-user', '');
            log('User ID = ' + id);
            xedx_TornStatsSpy(id, getTornSpyCB, node);
            profileQueried = true;
        }
    }

    function getTornSpyCB(respText, ID, node) {
        let data = JSON.parse(respText);
        log('Spy response: ' + respText);
        if (!data.status) {
            log('Error getting spy! Response text: ' + respText);
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

        // Get our own custom 'spy' (async)
        if (custBatStatsEnabled) {
            log('Calling getCustomBatStatEst');
            getCustomBatStatEst(ID, customBatStatEstCB);
        } else {
            queryUserProfile(target, ID);
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
                queryUserProfile(target, ID); // Recover!
            }});
        } catch(e) {
            log('Error: ', e);
            queryUserProfile(target, ID); // Recover!
        }
    }

    // Parses the JSON data from our custom FF bat stat estimate, into a JSON object:
    // {estimate: estStat, low: lowStat, high: highStat}
    function customBatStatEstCB(resp, ID) {
        log('*** Custom stats: ', resp);
        let values = [];

        try {
            let obj = JSON.parse(resp);
            let keys = Object.keys(obj);
            for (let i=0; i<keys.length; i++) {
                let stats = obj[keys[i]].oppStatsLow;
                log('stats: ', stats);
                if (stats) stats = Number(stats.toString().replaceAll(',', '')); else stats = 0;
                log('stats: ', stats);
                if (!isNaN(stats) && stats != Infinity) values.push(stats);
            }
        } catch(e) {
            log('[customBatStatEstCB] Error: ', e);
        }

        log('values: ', values);
        if (values.length) {
            let estStat = Math.max(...values);
            let lowStat = estStat;
            let highStat = estStat;
            log("*** High stat: " + highStat);

            // Find range values
            let range = getRangeValues(highStat);
            if (range) {
                lowStat = range.low;
                highStat = range.high;
            }
            custBatStats = {estimate: estStat, low: lowStat, high: highStat};
        }

        queryUserProfile(target, ID);
    }

    // Using the estimated stats from the FF calc, determine which range it falls under
    // int he rank trigger based bat stat estimate, to clarify high and low values.
    // Return the JSON range, {estimated, low, high}
    function getRangeValues(highStat) {
        for (let i=0; i<estimatedStats.length; i++) {
            if (highStat > estimatedStats[i].low && highStat < estimatedStats[i].high)
                return estimatedStats[i];
        }
        return null;
    }

    // Helper, pick the best of below three values.
    var batStats = {estimate: 0, low: 0, high: 0}; // Can be 'Unknown' or 'N/A' !!
    var jsonSpy = {estimate: 0, low: 0, high: 0};
    var custBatStats = {estimate: 0, low: 0, high: 0};

    function getBestBatStatEstValues() {
        log('batStats: ', batStats);
        log('custBatStats: ',  custBatStats);
        log('jsonSpy: ', jsonSpy);

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
            log('Est. Display value: ' + estDisplay);
            if (batStats.estimate == 'N/A' || (batStats.estimate.indexOf('Unknown') > -1)) {
                return 'Over ' + estDisplay + ' (Level holding?)';
            }
            if (custBatStats.estimate > batStats.high) {
                if (custBatStats.estimate != custBatStats.high) {
                    let displayHigh = massageEstimate(custBatStats.high);
                    log('Display values: ' + estDisplay + ', ' + displayHigh);
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
                log('Display values: ' + estDisplay + ', ' + displayHigh);
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
                //return numberWithCommas(custBatStats.estimate) + ' (FF estimate)';
            }
        }
    }

    // 'massage' the numeric value, converting to display values such as '250k' or '2.5M'
    function massageEstimate(value) {
        if (value < 2000) return value;
        let base = Math.floor(value/1000);
        log('massageEstimate: value = ' + value + ' base = ' + base);
        if (base.toString().length <=3) return (base + 'k');

        // 1000+
        base = Math.floor(base/1000);
        var rounded = Math.round(base * 10) / 10;
        log('massageEstimate: base = ' + base + ' rounded = ' + rounded);
        return numberWithCommas(rounded) + 'M';
    }

    // Handle the new nodes that are added.
    // Once a mini profile node is inserted,
    // we change the observer to just look for
    // changes to that div.
    function handleNewNode(node) {
        if (!node.id || node.id != 'profile-mini-root') {
            observeOn();
            return;
        }

        target = node;
        observer = new MutationObserver(handleMiniProfileChange);
        observeOn();
    }

    //////////////////////////////////////////////////////////////////////
    // Determine the bat stat range to display
    //
    // This calculation taken from:
    //    https://www.torn.com/forums.php#/p=threads&f=61&t=16065473&b=0&a=0
    //
    // and DeKleineKobini's 'dekleinekobini.statestimate' from:
    //    https://www.tornstats.com/awards.php
    ////////////////////////////////////////////////////////////////////

    // From: https://wiki.torn.com/wiki/Ranks
    // Total Battlestats	2k-2.5k, 20k-25k, 200k-250k, 2m-2.5m, 20m-35m, 200m-250m
    // These are from: https://www.tornstats.com/awards.php
    const levelTriggers = [ 2, 6, 11, 26, 31, 50, 71, 100 ];
    const crimeTriggers = [ 100, 5000, 10000, 20000, 30000, 50000 ];
    const nwTriggers = [ 5000000, 50000000, 500000000, 5000000000, 50000000000 ];
    const estimatedStats = [
        {estimate: "under 2k", low: 2000, high: 2000},
        {estimate: "2k - 20k", low: 2000, high: 20000},
        {estimate: "20k - 250k", low: 20000, high: 250000},
        {estimate: "250k - 2.5m", low: 250000, high: 2500000},
        {estimate: "2.5m - 35m", low: 2500000, high: 35000000},
        {estimate: "35m - 200m", low: 35000000, high: 200000000},
        {estimate: "over 200m", low: 200000000, high: 0},
    ];

    function getEstimatedBatStats(userNW, userCrimes, userLvl, userRank) {
        let trLevel = 0, trCrime = 0, trNetworth = 0;
        for (let l in levelTriggers) {if (levelTriggers[l] <= userLvl) trLevel++;}
        for (let c in crimeTriggers) {if (crimeTriggers[c] <= userCrimes) trCrime++;}
        for (let nw in nwTriggers) {if (nwTriggers[nw] <= userNW) trNetworth++;}

        let statLevel = userRank - trLevel - trCrime - trNetworth;
        let estimated = estimatedStats[statLevel];

        log('Stat estimator: statLevel = ' + statLevel + ' Estimated = ' + (estimated ? estimated.estimate : 0));
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
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    GM_addStyle(".xtdmp {" + // Define table cell style
                    "border-width: 1px !important;" +
                    "border-style: solid !important;" +
                    "border-color: #5B5B5B !important;" +
                    "padding: 0.2rem !important;" +
                    "vertical-align: middle !important;" +
                    "color: " + (darkMode() ? "#E0E0E0 !important;" : "#303030 !important;") +
                    "text-align: left;" +
                    "}" +
                "tr:last-child td:first-child { border-bottom-left-radius: 10px; }" +
                "tr:last-child td:last-child { border-bottom-right-radius: 10px; }");

    if (document.readyState == "complete") {
        handlePageLoaded();
    }

    document.onreadystatechange = function () {
      if (document.readyState == "complete") {
        handlePageLoaded();
      }
    };

})();