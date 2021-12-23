// ==UserScript==
// @name         Torn Personal Profile Stats
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Estimates a user's battle stats, NW, and numeric rank and adds to the user's profile page
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @local        file://///Users/edlau/Documents/Tampermonkey Scripts/helpers/Torn-JS-Helpers.js
// @include      https://www.torn.com/profiles.php*
// @connect      api.torn.com
// @connect      www.tornstats.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Constants and globals
    const levelTriggers = [ 2, 6, 11, 26, 31, 50, 71, 100 ];
    const crimeTriggers = [ 100, 5000, 10000, 20000, 30000, 50000 ];
    const nwTriggers = [ 5000000, 50000000, 500000000, 5000000000, 50000000000 ];

    // From: https://wiki.torn.com/wiki/Ranks
    // Total Battlestats	2k-2.5k, 20k-25k, 200k-250k, 2m-2.5m, 20m-35m, 200m-250m
    // These are from: https://www.tornstats.com/awards.php
    const estimatedStats = [
        "under 2k",
        "2k - 20k",
        "20k - 250k",
        "250k - 2.5m",
        "2.5m - 35m",
        "35m - 200m",
        "over 200m",
    ];

    const batStatLi = 'xedx-batstat-li';
    var userNW = 0;
    var userLvl = 0;
    var userCrimes = 0;
    var userRank = 0;
    var targetNode = document.getElementById('profileroot');

    // Helper, create <li> to display...
    function createBatStatLI(ul, display, jsonSpy=null) {
        let detailsDiv = '<li style="display:flex;"><div class="user-info-value" style="border-right: 1px solid black;width:50%;"><span>STRENGTH</span></div>' +
                         '<div class="user-info-value" style="width:50%;"><span>SPEED</span></div></li>' +
                         '<li style="display:flex;"><div class="user-info-value" style="border-right: 1px solid black;width:50%;"><span>DEX</span></div>' +
                         '<div class="user-info-value" style="width:50%;"><span>DEF</span></div><li>';
        let li = '<li id="'+ batStatLi + '">' +
                     '<div class="user-information-section"><span class="bold">Est. Bat Stats</span></div>' +
                     '<div class="user-info-value"><span>' + display + '</span></div>' +
                 '</li>';

        if (jsonSpy != null) {
            li += '<li style="display:flex;"><div class="user-info-value" style="border-right: 1px solid black;width:50%;"><span>Spd: ' +
                  numberWithCommas(jsonSpy.speed) + '</span></div>' +
                  '<div class="user-info-value" style="width:50%;"><span>Str: ' +
                  numberWithCommas(jsonSpy.strength) + '</span></div></li>' +
                  '<li style="display:flex;"><div class="user-info-value" style="border-right: 1px solid black;width:50%;"><span>Dex: ' +
                  numberWithCommas(jsonSpy.dexterity) + '</span></div>' +
                  '<div class="user-info-value" style="width:50%;"><span>Def: ' +
                  numberWithCommas(jsonSpy.defense) + '</span></div><li>';
        }
        $(ul).append(li);

        return li;
    }

    // Get data used to calc bat stats and get NW via the Torn API
    function personalStatsQuery(ID) {
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
        xedx_TornStatsSpy(ID, getBatStatsCB);

        // Display te numeric rank next to textual rank
        addNumericRank();
    }

    /*
    "spy":{"type":"faction-share","status":true,"message":"Shared stats found.","player_name":"RoninRaven",
    "player_id":606826,"player_level":0,"player_faction":"LONDON","target_score":112669.02951767252,
    "your_score":50807.34278825367,"fair_fight_bonus":3,"difference":"2 hours ago","timestamp":1640223069,
    "strength":420069669,"deltaStrength":-335987804,"effective_strength":567094053,
    "defense":1005140509,"deltaDefense":-804124814,"effective_defense":1417248117,
    "speed":831947439,"deltaSpeed":-677136567,"effective_speed":1198004312,
    "dexterity":1000202499,"deltaDexterity":-774679467,"effective_dexterity":1490301723,"total":3257360116,"deltaTotal":-2591928652,"effective_total":4672648206},
    */

    function getBatStatsCB(respText) {
        // Process result, get spy (if any), if not, use estimated.
        let jsonSpy = null;
        let batStats = 0;
        let data = JSON.parse(respText);
        log('Spy response: ' + respText);
        if (!data.status) {
            log('Error getting spy! Response text: ' + resptext);
        } else {
            if (data.spy.status) jsonSpy = {speed: data.spy.speed,
                                           strength: data.spy.strength,
                                           defense: data.spy.defense,
                                           dexterity: data.spy.dexterity};
            batStats = data.spy.status ? (numberWithCommas(data.spy.total) +
                                          /*' score '+ numberWithCommas(Math.round(data.spy.target_score)) +*/
                                          ' (' + data.spy.difference + ')') : 0;
        }
        if (!batStats) {
            batStats = buildBatStatDisplay(); // Calculate bat stats estimate
        }
        addBatStatsToProfile(batStats, jsonSpy);
    }

    // Create the bat stats <li>, add to the profile page
    function addBatStatsToProfile(batStats, jsonSpy=null) {
        log('Adding estimated bat stats to profile.');
        let testDiv = document.getElementById(batStatLi);
        if (validPointer(testDiv)) {return;} // Only do once

        let rootDiv = targetNode.getElementsByClassName('basic-information profile-left-wrapper left')[0];
        let targetUL = rootDiv.getElementsByClassName('info-table')[0];
        if (!validPointer(targetUL)) {return;}

        let li = createBatStatLI(targetUL, batStats, jsonSpy); // And add to the display
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

    function buildBatStatDisplay() {
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
            if (userLvl < 76) {estimated = "Unknown, maybe level holding?";} else {estimated = "N/A";}
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
