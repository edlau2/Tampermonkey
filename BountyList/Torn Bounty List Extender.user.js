// ==UserScript==
// @name         Torn Bounty List Extender
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Add rank to bounty list display
// @author       xedx [2100735]
// @include      https://www.torn.com/bounties.php*
// @local      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/BountyList/Torn%20Bounty%20List%20Extender.user.js
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    var loggingEnabled = true;
    var apiCallsMade = 0;

    const cacheMaxSecs = 3600 * 1000; //one hour in ms
    //const cacheMaxSecs = 600 * 1000; // 10 min in ms
    //const cacheMaxSecs = 180 * 1000; // 3 min in ms
    //const cacheMaxSecs = 60 * 1000; // 1 min in ms

    // Global cache of ID->Rank associations
    var rank_cache = [{ID: 0, numeric_rank: 0}];
    function newCacheItem(ID, rank, access) {
        return {ID: ID, numeric_rank: rank, access: new Date().getTime()};
    }

    // Query profile information based on ID
    function getRankFromId(ID, name, li) {
        log("Querying Torn for rank: " + name + " [" + ID + "]");
        xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, li);
        apiCallsMade++;
    }

    // Helper to get name from <li>
    function nameFromLi(li) {
        let node = li.querySelector("ul > li.b-info-wrap.head > div.target.left > a");
        return node.innerText;
    }

    // Helper to get ID from <li>
    function idFromLi(li) {
        let node = li.querySelector("ul > li.b-info-wrap.head > div.target.left > a");
        return node.getAttribute('href').split('=')[1];
    }

    // Callback from query, cache the rank and update the <li> with the rank.
    function updateUserLevelsCB(responseText, ID, li) {
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        let name = nameFromLi(li);
        let numeric_rank = numericRankFromFullRank(jsonResp.rank);
        log("Caching rank (mem): " + name + " [" + ID + "] ==> " + numeric_rank);
        let cacheObj = newCacheItem(ID, numeric_rank);
        rank_cache.push(cacheObj);
        log('Caching ID ' + ID + ' to storage.');
        GM_setValue(ID, cacheObj);
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

        lvlNode.innerText = text.trim() + '/' + (numeric_rank ? numeric_rank : '?');
        observer.observe(targetNode, config);
    }

    // Find a rank from our cache, based on ID
    function getCachedRankFromId(ID, li) {
        let name = nameFromLi(li);
        for (var i = 0; i < rank_cache.length; i++) {
            if (rank_cache[i].ID == ID) {
                log("Returning mem cached rank: " + name + " [" + ID + "] ==> " + rank_cache[i].numeric_rank);
                updateLiWithRank(li, rank_cache[i].numeric_rank);
                return rank_cache[i].numeric_rank;
            }
        }
        // Not in mem cache - try storage
        let cacheObj = GM_getValue(ID, undefined);
        if (cacheObj != undefined) {
            let now = new Date().getTime();
            let accessed = cacheObj.access;
            GM_setValue('LastCacheAccess', now);
            if ((now - accessed) > cacheMaxSecs) {
                log('Cache entry for ' + name + ' [' + ID + '] expired, deleting.');
                GM_deleteValue(ID);
            }
            cacheObj.access = now;
            rank_cache.push(cacheObj);
            log("Returning storage cached rank: "  + name + " [" + ID + "] ==> " + cacheObj.numeric_rank);
            updateLiWithRank(li, rank_cache[i].numeric_rank);
            return cacheObj.numeric_rank;
        }
        log("didn't find " + name + " [" + ID + "] in cache.");
        return 0; // Not found!
    }

    // Write out some cache stats
    function writeCacheStats() {
        let now = new Date().getTime();
        let lastAccess = GM_getValue('LastCacheAccess', 0);
        let arrayOfKeys = GM_listValues();
        log('Cache stats:\nNow: ' + now + '\nLast Access: ' + lastAccess +
            'Cache Age: ' + (now - lastAccess)/1000 + ' seconds.\nItem Count: ' + arrayOfKeys.length - 3);
    }

    // Function to scan our storage cache and clear old entries
    function clearStorageCache() {
        let counter = 0;
        let idArray = [];
        let now = new Date().getTime();
        let arrayOfKeys = GM_listValues();
        GM_setValue('LastCacheAccess', now);
        log("Clearing storage cache, 'timenow' = " + now + ' Cache lifespan: ' + cacheMaxSecs/1000 + ' secs.');
        for (let i = 0; i < arrayOfKeys.length; i++) {
            let obj = GM_getValue(arrayOfKeys[i]);
            if ((now - obj.access) > cacheMaxSecs) {idArray.push(arrayOfKeys[i]);}
        }
        for (let i = 0; i < idArray.length; i++) {
            counter++;
            log('Cache entry for ID ' + idArray[i] + ' expired, deleting.');
            GM_deleteValue(idArray[i]);
        }
        log('Finished clearing cache, removed ' + counter + ' object.');
    }

    //////////////////////////////////////////////////////////////////////
    // This prepares to update the UI by locating level, user ID
    // and getting the rank for each of the <li>'s in the <ul>.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevels() {
        log('**** Entering updateUserLevels ****');
        apiCallsMade = 0;
        let items = $('ul.' + ulRootClassName +  ' > li');
        if (!validPointer(items)) {
            log('Invalid <ul> class name. Bailing.');
            return;
        }

        log('detected ' + items.length + ' player entries');
        for (let i = 0; i < items.length; i++) {
            let li = items[i];
            if (!validPointer(li.getAttribute('data-id'))) {continue;} // Not top-level li, hould never happen.
            if (window.getComputedStyle(li).display === "none") {continue;} // Filtered out

            let ID = idFromLi(li);
            let name = nameFromLi(li);
            if (!getCachedRankFromId(ID, li)) {
                // Only get rank if status is 'Okay' ...
                let statusSel = li.querySelector('div.left.user-info-wrap > div.status.right > span:nth-child(2)');
                if (validPointer(statusSel)) {
                    if (statusSel.innerText == 'Okay') {
                        getRankFromId(ID, name, li);
                    } else {
                        log('player ' + name + ' [' + ID + '],  status is ' + statusSel.innerText + ', skipping.');
                    }
                } else {
                    log("Invalid status selector, can't query rank.");
                }
            }
        }

        log('**** updateUserLevels complete, ' + apiCallsMade + ' API calls made. ****');
    }

    // Simple logging helper
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
    versionCheck();

    setInterval(writeCacheStats, 5000); // Debugging - check on cache.
    setInterval(function() {
        log('**** Performing interval driven cache clearing ****');
        clearStorageCache();},
                (0.5*cacheMaxSecs)); // Look for expired cache items at intervals, half max cache age.

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

