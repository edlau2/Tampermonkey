// ==UserScript==
// @name         Torn Adv Mini Profile
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Adds additional stats to the mini profiles on a page.
// @author       xedx [2100735]
// @include      https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/AdvMiniProfile/Torn%20Adv%20Mini%20Profile.user.js
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
        let batStats = getEstimatedBatStats(networth, crimes, userLvl, userRank); // Calculate bat stats estimate
        if (tornSpy.estimate) {
            batStats.estimate = numberWithCommas(tornSpy.estimate) + ' (' + tornSpy.lkg + ')';
        }

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
                        '<span>' + batStats.estimate + '</span></td>' +
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
            //queryUserProfile(node, id);
            profileQueried = true;
        }
    }

    let tornSpy = {estimate: 0, low: 0, high: 0};
    function getTornSpyCB(respText, ID, node) {
        let data = JSON.parse(respText);
        log('Spy response: ' + respText);
        if (!data.status) {
            log('Error getting spy! Response text: ' + respText);
        } else {
            if (data.spy.status) {
                tornSpy = {status: data.spy.status,
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

        queryUserProfile(node, ID);
        //profileQueried = true;

        // Get our own custom 'spy' (async) (TBD)
        //log('Calling getCustomBatStatEst');
        //getCustomBatStatEst(ID, customBatStatEstCB);
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
