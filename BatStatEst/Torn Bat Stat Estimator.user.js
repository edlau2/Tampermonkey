// ==UserScript==
// @name         Torn Bat Stat Estimator
// @namespace    http://tampermonkey.net/
// @version      0.1
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

(function($) {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // UI helpers: create an <LI> to insert onto the page
    //////////////////////////////////////////////////////////////////////

    function createBatStatLI(display) {
        var li = document.createElement('li'); // Main <li>
        li.id = batStatLi;
        var div = document.createElement('div'); // First <div>
        div.className = 'user-information-section left width112';
        var span = document.createElement('span'); // Span inside of the <div>
        span.className = 'bold';
        span.innerHTML = 'Est. Bat Stats';

        // Put them together
        li.appendChild(div);
        div.appendChild(span);

        let div2 = document.createElement('div');
        let span2 = document.createElement('span');
        span2.innerHTML = display;

        li.appendChild(div2);
        div2.appendChild(span2);

        return li;
    }

    //////////////////////////////////////////////////////////////////////
    // Main functions that do the real work: query the Torn API
    //////////////////////////////////////////////////////////////////////

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
    //////////////////////////////////////////////////////////////////////
    // Determine the range to display
    //////////////////////////////////////////////////////////////////////

    // This calculation taken from https://www.torn.com/forums.php#/p=threads&f=61&t=16065473&b=0&a=0
    // and DeKleineKobini's 'dekleinekobini.statestimate' - stat estimates from: https://www.tornstats.com/awards.php
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

        let statLevel = userRank - trLevel - trCrime - trNetworth - 1;
        let estimated = estimatedStats[statLevel];
        if (!estimated) estimated = "N/A";

        return estimated;
    }

    // Create the <li>, add to the profile page
    function updateUserProfile() {
        let testDiv = document.getElementById(batStatLi);
        if (validPointer(testDiv)) {return;}

        let rootDiv = targetNode.getElementsByClassName('basic-information profile-left-wrapper left')[0];
        let targetUL = rootDiv.getElementsByClassName('basic-list')[0];
        if (!validPointer(targetUL)) {return;}

        let display = buildBatStatDisplay();
        let li = createBatStatLI(display);
        targetUL.appendChild(li);
    }

    //////////////////////////////////////////////////////////////////////
    // Effectively 'main', where the script starts. Log this event in the
    // console so we know it has started
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();

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
    let userNW = 0;
    let userLvl = 0;
    let userCrimes = 0;
    let userRank = 0;
    let userID = xidFromProfileURL(window.location.href);
    let targetNode = document.getElementById('profileroot');
    let config = { attributes: true, childList: true, subtree: true };

    // Get the show on the road...
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        personalStatsQuery(userID);
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

})();