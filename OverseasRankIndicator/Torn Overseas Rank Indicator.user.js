// ==UserScript==
// @name         Torn Overseas Rank Indicator
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add rank to the the 'people' list
// @author       xedx [2100735]
// @include      https://www.torn.com/index.php?page=people*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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
        log("updateUserLevelsCB = " + ID);
        if (jsonResp.error) {return handleError(responseText);}
        let numeric_rank = numericRankFromFullRank(jsonResp.rank);
        log("Caching rank: " + ID + " ==> " + numeric_rank);
        rank_cache.push(newCacheItem(ID, numeric_rank));
        updateLiWithRank(li, numeric_rank);
    }

    // Write to the UI
    function updateLiWithRank(li, numeric_rank) {
        observer.disconnect();
        let testLvlNode = li.querySelector("div.left-right-wrapper > div.right-side.right > span.level");
        let lvlNode = li.getElementsByClassName('level')[0];
        //let text = lvlNode.innerText;
        let text = lvlNode.childNodes[2].data;
        if (text.indexOf("/") != -1) { // Don't do again!
            observer.observe(targetNode, config);
            return;
        }

        //lvlNode.innerText = text.trim() + '/' + (numeric_rank ? numeric_rank : '?');
        lvlNode.childNodes[2].data = text.trim() + '/' + (numeric_rank ? numeric_rank : '?');
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
        let items = ul.getElementsByTagName("li"); // This gives sub-li's, ise ul > li[i] or something?
        if (!validPointer(items)) {return;}

        log('detected ' + items.length + ' player entries'); /// ... so this # is wrong.
        for (let i = 0; i < items.length; i++) {
            let li = items[i];
            if (window.getComputedStyle(li).display === "none") {continue;}
            let idNode = li.querySelector("div.left-right-wrapper > div.left-side.left > a.user.name");
            document.querySelector("div.left-right-wrapper > div.left-side.left > a.user.name")
            if (!validPointer(idNode)) { // Lower-level LI...
                //log('Invalid ID node detected! i = ' + i + ' Children: ' + li.childElementCount);
                //setTimeout(updateUserLevels, 1000);
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
                        log('Querying rank for player ' + ID + ' ' + name);
                        getRankFromId(ID, li);
                    } else {
                        log('player ' + ID + ', ' + name + ' status is ' + statusSel.innerText + ', skipping.');
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

    if (!abroad()) {
        log('Not Abroad! Bailing...');
        return;
    }

    window.addEventListener('hashchange', function() {
            log('The hash has changed! new hash: ' + location.hash);
            updateUserLevels();
        }, false);

    //var contentRootName = "content";
    var ulRootContainerName = 'travel-people';
    var ulRootClassName = 'users-list';
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

