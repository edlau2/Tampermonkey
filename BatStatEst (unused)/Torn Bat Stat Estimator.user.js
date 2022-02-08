// ==UserScript==
// @name         Torn Bat Stat Estimator
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Estimates a user's battle stats and adds to the user's profile page
// @author       xedx [2100735]
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/BatStatEst/Torn%20Bat%20Stat%20Estimator.user.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @include      https://www.torn.com/profiles.php*
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// Note: the approach used is described here:
// https://www.torn.com/forums.php#/p=threads&f=61&t=16065473&b=0&a=0

(function() {
    'use strict';

    // Constants and globals
    const levelTriggers = [ 2, 6, 11, 26, 31, 50, 71, 100 ];
    const crimeTriggers = [ 100, 5000, 10000, 20000, 30000, 50000 ];
    const nwTriggers = [ 5000000, 50000000, 500000000, 5000000000, 50000000000 ];

    // From: https://wiki.torn.com/wiki/Ranks
    // Total Battlestats	2k-2.5k, 20k-25k, 200k-250k, 2m-2.5m, 20m-35m, 200m-250m
    //
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

    // <li> to display...
    function createBatStatLI(ul, display) {
        let li = '<li id="'+ batStatLi + '"><div class="user-information-section"><span class="bold">Est. Bat Stats</span>' +
            '</div><div class="user-info-value"><span>' + display + '</span></div></li>';
        $(ul).append(li);

        return li;
    }

    // Get data used to calc bat stats
    function personalStatsQuery(ID) {
        xedx_TornUserQuery(ID, 'personalstats,crimes,profile', personalStatsQueryCB);
    }

    function personalStatsQueryCB(responseText, ID) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        userNW = jsonResp.personalstats.networth;
        userCrimes = jsonResp.criminalrecord.total;
        userLvl = jsonResp.level;
        userRank = numericRankFromFullRank(jsonResp.rank);

        updateUserProfile();
    }

    // Create the <li>, add to the profile page
    function updateUserProfile() {
        let testDiv = document.getElementById(batStatLi);
        if (validPointer(testDiv)) {return;} // Only do once

        let rootDiv = targetNode.getElementsByClassName('basic-information profile-left-wrapper left')[0];
        let targetUL = rootDiv.getElementsByClassName('info-table')[0];
        if (!validPointer(targetUL)) {return;}

        let display = buildBatStatDisplay(); // Calculate bat stats estimate
        let li = createBatStatLI(targetUL, display); // And add to the display
    }

    //////////////////////////////////////////////////////////////////////
    // Determine the range to display
    //
    // This calculation taken from:
    //    https://www.torn.com/forums.php#/p=threads&f=61&t=16065473&b=0&a=0
    // and DeKleineKobini's 'dekleinekobini.statestimate' from:
    //    https://www.tornstats.com/awards.php
    ////////////////////////////////////////////////////////////////////

    function buildBatStatDisplay() {
        // if (userLvl >= 75) {return "Over level 75, N/A.";}

        let trLevel = 0, trCrime = 0, trNetworth = 0;
        for (let l in levelTriggers) {
            if (levelTriggers[l] <= userLvl) trLevel++;
        }
        for (let c in crimeTriggers) {
            if (crimeTriggers[c] <= userCrimes) trCrime++;
        }
        for (let nw in nwTriggers) {
            if (nwTriggers[nw] <= userNW) trNetworth++;
        }

        let statLevel = userRank - trLevel - trCrime - trNetworth;
        let estimated = estimatedStats[statLevel];

        console.log('Stat estimator: statLevel = ' + statLevel + ' Estimated = ' + estimated);
        console.log('Stat estimator: Level: ' + userLvl + ' Crimes: ' + userCrimes + ' NW: ' + userNW + ' Rank: ' + userRank);
        console.log('Stat estimator: trLevel: ' + trLevel + ' trCrimes: ' + trCrime + ' trNW: ' + trNetworth);
        if (!estimated) {
            if (userLvl < 76)
                estimated = "Unknown, maybe level holding?";
            else
                estimated = "N/A";
        }

        return estimated;
    }

    function handlePageLoad() {
        personalStatsQuery(xidFromProfileURL(window.location.href));
    }

    //////////////////////////////////////////////////////////////////////
    // Effectively 'main', where the script starts. Log this event in the
    // console so we know it has started
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();

    // Get the show on the road...
    // Delay until DOM content load (not full page) complete, so that other scripts run first.
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoaded);
    } else {
        handlePageLoad();
    }

})();
