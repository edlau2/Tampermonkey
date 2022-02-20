// ==UserScript==
// @name         Torn Overseas Rank Indicator
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Add rank to the the 'people' list
// @author       xedx [2100735]
// @include      https://www.torn.com/index.php?page=people*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const displayRank = true;
    const displayHealth = true;
    const displayLastAction = true;

    const loggingEnabled = true;
    var requestsPaused = false;

    // Cache 'lifetime', time to expire
    //const cacheMaxSecs = 3600 * 1000; //one hour in ms
    const cacheMaxSecs = 1800 * 1000; // 30 min in ms
    //const cacheMaxSecs = 600 * 1000; // 10 min in ms
    //const cacheMaxSecs = 180 * 1000; // 3 min in ms
    //const cacheMaxSecs = 60 * 1000; // 1 min in ms

    const recoverableErrors = [5, // Too many requests
                               8, // IP Block
                               9, // API disabled
                               ];

    // Global cache of ID->Rank associations
    var rank_cache = [{ID: 0, numeric_rank: 0, access: 0}];
    function newCacheItem(ID, rank, la, curr, max) {
        return {ID: ID, numeric_rank: rank, la: la, lifec: curr, lifem: max, access: new Date().getTime()};
    }

    // Queue of rank from ID requests, from the Torn API
    const queueIntms = 300; // Ms between popping queue item
    var queryQueue = []; // The queue
    var queryQueueId = null; // ID for queue check interval
    function processQueryQueue() {if (!requestsPaused) processQueueMsg(queryQueue.pop());} // Pop message from queue and dispatch

    function processQueueMsg(msg) { // Process a queued message (request) for rank from ID
        if (!validPointer(msg)) return;
        let ID = msg.ID;
        let li = msg.li;
        let optMsg = msg.optMsg;

        log('Processing queued ID ' + ID);
        if (optMsg) {log(optMsg)};
        if (requestsPaused) {
            log("Requests pause, can't make request. Will retry later.");
            return queryQueue.push(msg);
        }
        xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, msg);
    }

    // Query profile information based on ID. Places on a queue for later processing.
    // In case we are recalled before getting an answer, save the ID's we've already
    // sent requests for.
    var sentIdQueue = [];
    function getRankFromId(ID, li, optMsg = null) {
        if (sentIdQueue.includes(ID)) {
            return;
        }
        log("Querying Torn for rank, ID = " + ID);
        let msg = {ID: ID, li: li, optMsg: optMsg};
        sentIdQueue.push(ID);
        queryQueue.push(msg);
        if (!queryQueueId) {queryQueueId = setInterval(processQueryQueue, queueIntms);}
    }

    // Pauses further requets to the Torn API for 'timeout' seconds
    function pauseRequests(timeout) {
        if (!requestsPaused) {setTimeout(function(){
            requestsPaused = false;
            log('Restarting requests.');}, timeout*1000); // Turn back on in 'timeout' secs.
        }
        log('Pausing requests for ' + timeout + ' seconds.');
        return (requestsPaused = true);
    }

    // Callback from querying the Torn API
    function updateUserLevelsCB(responseText, ID, msg) {
        var jsonResp = JSON.parse(responseText);
        log("updateUserLevelsCB = " + ID);
        if (jsonResp.error) {
            log('Error: ' + JSON.stringify(jsonResp.error));
            if (recoverableErrors.includes(jsonResp.error.code)) { // Recoverable - pause for now.
                pauseRequests(15); // Pause for 15 secs
                queryQueue.push(msg);
            }
            return handleError(responseText);
        }
        let li = msg.li;
        let numeric_rank = numericRankFromFullRank(jsonResp.rank);
        log("Caching rank (mem): " + ID + " ==> " + numeric_rank + ' (cache depth = ' + rank_cache.length + ')');
        let cacheObj = newCacheItem(ID, numeric_rank, jsonResp.last_action.relative, jsonResp.life.current, jsonResp.life.maximum);
        rank_cache.push(cacheObj);
        log('Caching ID ' + ID + ' to storage.');
        GM_setValue(ID, cacheObj);
        if (validPointer(li)) {updateLiWithRank(li, cacheObj);}
    }

    // Write to the UI
    function updateLiWithRank(li, cacheObj) {
        observer.disconnect();
        let lvlNode = li.getElementsByClassName('level')[0];
        let statusNode = li.querySelector("div.left-right-wrapper > div.right-side.right > span.status > span.t-green");
        let text = lvlNode.childNodes[2].data;
        if (text.indexOf("/") != -1) { // Don't do again!
            observer.observe(targetNode, config);
            return;
        }
        let numeric_rank = cacheObj.numeric_rank;
        let la = cacheObj.la;
        let lifeCurr = cacheObj.lifec;
        let lifeMax = cacheObj.lifem;
        let ul = li.querySelector("div.center-side-bottom.left > ul");
        let div = li.querySelector("div.center-side-bottom.left");

        if (displayHealth) $(div).append('<span style="float: right; margin-left: 50px; font-size: 12px;"> ' + lifeCurr + '/' + lifeMax + '</span>');
        if (statusNode && displayLastAction) statusNode.textContent = statusNode.textContent + ' ' + la;
        if (displayRank) lvlNode.childNodes[2].data = text.trim() + '/' + (numeric_rank ? numeric_rank : '?');

        observer.observe(targetNode, config);
    }

    // Find a rank from our cache, based on ID
    function getCachedRankFromId(ID, li) {
        for (var i = 0; i < rank_cache.length; i++) {
            if (rank_cache[i].ID == ID) {
                log("Returning mem cached rank: " + ID + " ==> " + rank_cache[i].numeric_rank);
                updateLiWithRank(li, rank_cache[i]);
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
                log('Cache entry for ID ' + ID + ' expired, deleting.');
                GM_deleteValue(ID);
            }
            cacheObj.access = now;
            rank_cache.push(cacheObj);
            log("Returning storage cached rank: " + ID + " ==> " + cacheObj.numeric_rank);
            updateLiWithRank(li, cacheObj);
            return cacheObj.numeric_rank;
        }
        log("didn't find " + ID + " in cache. Cache has " + rank_cache.length + " items.");
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

    function updateUserLevels(optMsg=null) {
        if (optMsg != null) {log('updateUserLevels: ' + optMsg);}
        log('document.readyState: ' + document.readyState);
        log('Entering updateUserLevels, cache depth = ' + rank_cache.length);
        let items = $('ul.' + ulRootClassName +  ' > li');
        if (!validPointer(items)) {return;}

        log('Detected ' + items.length + ' user entries');
        for (let i = 0; i < items.length; i++) {
            let li = items[i];
            if (window.getComputedStyle(li).display === "none") {continue;}
            let idNode = li.querySelector("div.left-right-wrapper > div.left-side.left > a.user.name");
            document.querySelector("div.left-right-wrapper > div.left-side.left > a.user.name")
            if (!validPointer(idNode)) { // Should never happen.
                continue;
            }

            let ID = idNode.getAttribute('href').split('=')[1];
            if (!getCachedRankFromId(ID, li)) {
                let statusSel = li.querySelector('div.left-right-wrapper > div.right-side.right > span.status > span.t-green');
                let nameSel = li.querySelector("div.left-right-wrapper > div.left-side.left > a.user.name > img");
                let name = validPointer(nameSel) ? nameSel.title : 'unknown';
                // let name2 = validPointer(nameSel) ? nameSel.getAttribute('title') : 'unknown'; // Also valid.

                if (validPointer(statusSel)) {
                    // Only get rank if status is 'Okay' ...
                    if (statusSel.innerText == 'Okay') {
                        log('Querying rank for player ' + ID + ' ' + name + ' (i = ' + i + ')');
                        getRankFromId(ID, li, 'call to getRankFromId from updateUserLevels: ' + optMsg);
                    } else {
                        log('player ' + ID + ', ' + name + ' status is ' + statusSel.innerText + ', skipping.');
                    }
                } else {
                    log("Invalid status selector, can't query rank.");
                }
            }
        }

        log('Finished iterating ' + items.length + ' users, ' + rank_cache.length + ' cache entries.');
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    try {
        if (!abroad()) {
            log('Not Abroad! Bailing...');
            return;
        }

        window.addEventListener('hashchange', function() { // Never gets hit, pages reload when abroad on pagination
                log('The hash has changed! new hash: ' + location.hash);
                updateUserLevels('Hash Change Detected!');
            }, false);

        // setInterval(writeCacheStats, 5000); // Debugging - check on cache.
        setInterval(function() {
            log('**** Performing interval driven cache clearing ****');
            clearStorageCache();},
                    (0.5*cacheMaxSecs)); // Check for expired cache entries at intervals, half max cache age.

        //var contentRootName = "content";
        var ulRootContainerName = 'travel-people';
        var ulRootClassName = 'users-list';
        var targetNode = document.getElementsByClassName(ulRootContainerName /*contentRootName*/)[0];
        var config = { attributes: true, childList: true, subtree: true };
        var callback = function(mutationsList, observer) {
            updateUserLevels('Mutation Observer!');
        };

        var observer = new MutationObserver(callback);
        observer.observe(targetNode, config);

        // If *already* loaded, go ahead...
        if (document.readyState === 'complete') {
            updateUserLevels('Ready State Complete!');
        }
    } catch(e) {
        log('Error:', e);
    }

})();

