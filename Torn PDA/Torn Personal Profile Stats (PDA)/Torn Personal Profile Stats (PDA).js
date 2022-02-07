// ==UserScript==
// @name         Torn Personal Profile Stats (PDA)
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Estimates a user's battle stats, NW, and numeric rank and adds to the user's profile page
// @author       xedx [2100735]
// @include      https://www.torn.com/profiles.php*
// @connect      api.torn.com
// @connect      www.tornstats.com
// @connect      localhost
// @connect      18.119.136.223
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Temporary: minimal crap from my normal library, and GM_* over-rides
    function validPointer(val, dbg = false) {return (typeof val !== undefined && val) ? true: false;}
    function log(...data) {console.log(/*GM_info.script.name + ': ',*/ ...data);}
    function GM_setValue(a, b) {window.localStorage.setItem(a, b);}
    function GM_getValue(a, b) {return (window.localStorage.getItem(a)) ? window.localStorage.getItem(a) : b;}

    // Callbacks should have the following signature: callback(responseText, ID, (optional)param)
    function xedx_TornUserQuery(ID, selection, callback, param=null) {xedx_TornGenericQuery('user', ID, selection, callback, param);}
    function xedx_TornPropertyQuery(ID, selection, callback, param=null) {xedx_TornGenericQuery('property', ID, selection, callback, param);}
    function xedx_TornFactionQuery(ID, selection, callback, param=null) {xedx_TornGenericQuery('faction', ID, selection, callback, param);}
    function xedx_TornCompanyQuery(ID, selection, callback, param=null) {xedx_TornGenericQuery('company', ID, selection, callback, param);}
    function xedx_TornMarketQuery(ID, selection, callback, param=null) {xedx_TornGenericQuery('market', ID, selection, callback, param);}
    function xedx_TornGenericQuery(section, ID, selection, callback, param=null) {
        let url = "https://api.torn.com/" + section + "/" + ID + "?selections=" + selection + "&key=" + apikey;
        log('(PDA-Helper) Querying ' + section + ':' + selection);
        PDA_httpGet(url).then(response => {
            if (Number(response.status) != 200) return handleError(response.responseText);
            callback(response.responseText, ID, param);});
    }
    function xedx_TornStatsSpy(ID, callback, param=null) {
        let url = 'https://www.tornstats.com/api/v1/' + apikey + '/spy/' + ID;
        log('(PDA-Helper) Spying ' + ID + ' via TornStats');
        PDA_httpGet(url).then(response => {
            if (Number(response.status) != 200) return handleError(response.responseText);
            callback(response.responseText, ID, param);});
    }
    function handleError(responseText) {
        let jsonResp = JSON.parse(responseText);
        log('Error querying the Torn API.\nCode: ' + jsonResp.error.code +'\nError: ' + jsonResp.error.error);
    }
    function abroad() {return $('body')[0].getAttribute('data-abroad') == 'true';}

    // Dummy stub
    function numericRankFromFullRank(rank) {return 99;}

    function numberWithCommas(x) {
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    }

    // End temporary wrappers


    // Constants and globals
    const apikey = '###PDA-APIKEY###';
    const levelTriggers = [ 2, 6, 11, 26, 31, 50, 71, 100 ];
    const crimeTriggers = [ 100, 5000, 10000, 20000, 30000, 50000 ];
    const nwTriggers = [ 5000000, 50000000, 500000000, 5000000000, 50000000000 ];
    const caretNode = '<span style="float:right;"><i id="xedx-caret" class="icon fas fa-caret-right xedx-caret"></i></span>';
    var caretState = 'fa-caret-right';
    const custBatStatsEnabled = true; // Turn off if my IP (18.119.136.223) goes away, it's at AWS

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
    var targetNode = document.getElementById('profileroot');

    // TBD
    /*
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
    */

    // Get data used to calc bat stats and get NW via the Torn API
    function personalStatsQuery(ID) {
        log('Calling xedx_TornUserQuery');
        xedx_TornUserQuery(ID, 'personalstats,crimes,profile', personalStatsQueryCB);
    }

    // Callback for above
    function personalStatsQueryCB(responseText, ID) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let userNW = jsonResp.personalstats.networth;
        let userCrimes = jsonResp.criminalrecord.total;
        let userLvl = jsonResp.level;
        let userRank = numericRankFromFullRank(jsonResp.rank);

        // Add NW to the profile
        addNetWorthToProfile(userNW);

        // Get bat stats estimate, based on rank triggers (sync)
        batStats = getEstimatedBatStats(userNW, userCrimes, userLvl, userRank); // Calculate bat stats estimate

        // Get any spies (async). On completion, get our estimated stats from FF DB.
        log('Calling xedx_TornStatsSpy');
        xedx_TornStatsSpy(ID, getTornSpyCB);

        // Display the numeric rank next to textual rank (sync)
        addNumericRank(userRank);
    }

    // If a spy exists, parse it into a JSON jsonSpy object,
    // which contains the same data as rank trigger bat stat
    // estimates and custom estimates: {estimate: estStat, low: lowStat, high: highStat}
    // Detailed data may be displayed as a collapsible field (DIV) on the profile
    function getTornSpyCB(respText, ID) {
        let data = JSON.parse(respText);
        log('Spy response: ' + respText);
        if (!data.status) {
            log('Error getting spy! Response text: ' + respText);
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
                log('Spy result: ', jsonSpy);
            }
        }

        // Get our own custom 'spy' (async) if enabled.
        if (custBatStatsEnabled) {
            log('Calling getCustomBatStatEst');
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
                values.push(stats);
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

        addBatStatsToProfile();
    }

    // Using the estimated stats from the FF calc, determine which range it falls under
    // int he rank trigger based bat stat estimate, to clarify high and low values.
    // Return the JSON range, {estimated, low, high}
    function getRangeValues(highStat) {
        for (let i=0; i<estimatedStats.length; i++) {
            if (highStat > estimatedStats[i].low && highStat < estimatedStats[i].high) {return estimatedStats[i];}
        }
        return null;
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

    function getBestBatStatEstValues() {
        log('batStats: ', batStats);
        log('custBatStats: ', custBatStats);
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

    // Helper, create <li> to display...
    function createBatStatLI(ul) {
        log('[createBatStatLI]');

        // Need the best of the three - batStats, jsonSpy, and custBatStats.
        let display = getBestBatStatEstValues();
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

        // TBD
        /*
        // Make the details 'collapsible'
        if (document.getElementById("xedx-caret") && !abroad()) {
            caretState = GM_getValue('lastState', caretState);
            document.getElementById("xedx-caret").addEventListener('click', function (event) {
                handleClick(event)}, { passive: false });
            caretState = (caretState == 'fa-caret-down') ? 'fa-caret-right' : 'fa-caret-down';
            handleClick();
        }
        */

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

    function getEstimatedBatStats(userNW, userCrimes, userLvl, userRank) {
        let trLevel = 0, trCrime = 0, trNetworth = 0;
        for (let l in levelTriggers) {if (levelTriggers[l] <= userLvl) trLevel++;}
        for (let c in crimeTriggers) {if (crimeTriggers[c] <= userCrimes) trCrime++;}
        for (let nw in nwTriggers) {if (nwTriggers[nw] <= userNW) trNetworth++;}

        let statLevel = userRank - trLevel - trCrime - trNetworth;
        let estimated = estimatedStats[statLevel];

        log('Stat estimator: statLevel = ' + statLevel + ' Estimated = ' + ((estimated && estimated.estimate) ? estimated.estimate : 0));
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

    var nwRetries = 0;
    function addNetWorthToProfile(nw) {
        log('Adding Net Worth to profile.');
        if (validPointer(document.getElementById('xedx-networth-li'))) {
            log('Node already present: xedx-networth-li');
            return;
        }

        let display = '$' + numberWithCommas(nw);
        let profileDiv = $('#profileroot').find('div.user-profile');
        let basicInfo = $(profileDiv).find('div.profile-wrapper > div.basic-information');
        var targetNode = document.getElementById('profileroot');
        let ul = $(basicInfo).find('ul.info-table');
        if (!ul.length) {
            log('ul.info-table not found!');
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

    function addNumericRank(userRank) { // userRank is unused
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

    function xidFromProfileURL(URL) {
        var n = URL.indexOf('XID='); // Find the 'XID=' token
        if (n == -1) {return null;}
        var n2 = URL.indexOf('#'); // Find the '#' sign (removed in some patch, may not exist)
        var ID = 0;
        if (n2 != -1) {
            ID = URL.slice(n+4, n2); // Extract just the ID from the URL, between the '=' and '#'
        } else {
            ID = URL.slice(n+4);
        }
        return ID;
    }

    // Kick everything off...
    function handlePageLoad() {
        personalStatsQuery(xidFromProfileURL(window.location.href));
    }

    //////////////////////////////////////////////////////////////////////
    // Effectively 'main', where the script starts. Log this event in the
    // console so we know it has started
    //////////////////////////////////////////////////////////////////////

    console.log('Torn PDA Test script started!');
    $(window).on('load', function(){handlePageLoad();});

    //logScriptStart();
    //validateApiKey();
    //versionCheck();

    // Delay until DOM content load (not full page) complete
    /*
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoaded);
    } else {
        handlePageLoad();
    }
    */

})();
