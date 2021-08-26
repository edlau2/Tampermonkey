// ==UserScript==
// @name         Torn Bounty List Extender
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Add rank to bounty list display
// @author       xedx [2100735]
// @include      https://www.torn.com/bounties.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/BountyList/Torn%20Bounty%20List%20Extender.user.js
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    var loggingEnabled = true;

    // Global cache of ID->Rank associations
    var rank_cache = [{ID: 0, numeric_rank: 0}];
    function newCacheItem(ID, rank) {
        return {ID: ID, numeric_rank: rank};
    }

    // Query profile information based on ID
    function getRankFromId(ID, li) {
        log("Querying Torn for rank, ID = " + ID);
        xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, li);
    }

    function updateUserLevelsCB(responseText, ID, li) {
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let numeric_rank = numericRankFromFullRank(jsonResp.rank);
        log("Caching rank: " + ID + " ==> " + numeric_rank);
        rank_cache.push(newCacheItem(ID, numeric_rank));
        updateLiWithRank(li, numeric_rank);
    }

    // Write to the UI
    function updateLiWithRank(li, numeric_rank) {
        observer.disconnect();
        let lvlNode = li.getElementsByClassName('level')[0];
        let text = lvlNode.innerText;
        if (text.indexOf("/") != -1) { // Don't do again!
            observer.observe(targetNode, config);
            return;
        }

        //lvlNode.style.paddingRight = "2px";
        lvlNode.innerText = text.trim() + '/' + (numeric_rank ? numeric_rank : '?');
        observer.observe(targetNode, config);
    }

    // Find a rank from our cache, based on ID
    function getCachedRankFromId(ID, li) {
        for (var i = 0; i < rank_cache.length; i++) {
            if (rank_cache[i].ID == ID) {
                log("Returning cached rank: " + ID + " ==> " + rank_cache[i].numeric_rank);
                updateLiWithRank(li, rank_cache[i].numeric_rank);
                return rank_cache[i].numeric_rank;
            }
        }
        log("didn't find " + ID + " in cache.");
        return 0; // Not found!
    }

    //////////////////////////////////////////////////////////////////////
    // This prepares to update the UI by locating level, user ID
    // and getting the rank for each of the <li>'s in the <ul>.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevels() {
        log('Entering updateUserLevels');
        let ul = document.getElementsByClassName(ulRootClassName)[0];
        if (!validPointer(ul)) {return;}
        let items = ul.getElementsByTagName("li");
        if (!validPointer(items)) {return;}

        log('detected ' + items.length + ' player entries');
        for (let i = 0; i < items.length; i++) {
            let li = items[i];
            if (!validPointer(li.getAttribute('data-id'))) {continue;}
            if (window.getComputedStyle(li).display === "none") {continue;}

            let idNode = li.children[0] // ul.item
                           .children[0] // li.b-info-wrap.head
                           .children[1] // div.target.left
                           .children[0]; // a

            let ID = idNode.getAttribute('href').split('=')[1];
            if (!getCachedRankFromId(ID, li)) {
                // Only get rank if status is 'Okay' ...
                let statusSel = document.querySelector('#mainContainer > div.content-wrapper > div.newspaper-wrap> div.newspaper-body-wrap > div > div > ' +
                                                       'div.page-template-cont > div.bounties-wrap > div.bounties-cont > ul.bounties-list.t-blue-cont.h > ' +
                                                       'li:nth-child(1) > ul > li:nth-child(2) > div.left.user-info-wrap > div.status.right > span:nth-child(2)');
                if (validPointer(statusSel)) {
                    if (statusSel.innerText == 'Okay') {
                        getRankFromId(ID, li);
                    } else {
                        log('player ' + ID + ' status is ' + statusSel.innerText + ', skipping.');
                    }
                } else {
                    log("Invalid status selector, can't query rank.");
                }
            }
        }
    }

    // Simple logging helper
    // @param data - What to log.
    function log(data) {
        if (loggingEnabled) {
            console.log(GM_info.script.name + ': ' + data);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();

    var contentRootName = "content";
    var ulRootContainerName = 'content-wrapper';
    var ulRootClassName = 'bounties-list';
    var targetNode = document.getElementsByClassName(ulRootContainerName /*contentRootName*/)[0];
    var config = { attributes: true, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        updateUserLevels();
    };

    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    // If *already* loaded, go ahead...
    if (document.readyState === 'complete') {
        updateUserLevels();
    }

})();

