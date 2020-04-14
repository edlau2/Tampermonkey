// ==UserScript==
// @name         Torn Bounty List Extender
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Add rank to bounty list display
// @author       xedx [2100735]
// @include      https://www.torn.com/bounties.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/BountyList/Torn%20Bounty%20List%20Extender.user.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    // Global cache of ID->Rank associations
    var rank_cache = ['', 0];

    //////////////////////////////////////////////////////////////////////
    // Query profile information based on ID
    //////////////////////////////////////////////////////////////////////

    function getRankFromId(ID, li) {
        console.log("Querying Torn for rank, ID = " + ID);
        xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, li);
    }

    //////////////////////////////////////////////////////////////////////
    // This callback create a cache used to store ID-rank associations
    // and updates the actual <li> in the <ul>.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevelsCB(responseText, ID, li) {
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let numeric_rank = numericRankFromFullRank(jsonResp.rank);
        console.log("Caching rank: " + ID + " ==> " + numeric_rank);
        rank_cache.push({ID, numeric_rank});
        updateLiWithRank(li, numeric_rank);
    }

    function updateLiWithRank(li, numeric_rank) {
        observer.disconnect();

        let dataId = li.getAttribute('data-id');
        let lvlNode = li.getElementsByClassName('level')[0];
        let text = lvlNode.innerText;
        let html = lvlNode.innerHTML;

        if (text.indexOf("/") != -1) {
            observer.observe(targetNode, config);
            return;
        }

        // Don't need to update both here ....
        lvlNode.innerText = text.trim() + '/' + (numeric_rank ? numeric_rank : '?');
        lvlNode.innerHTML = html.trim() + '/' + (numeric_rank ? numeric_rank : '?');

        let text2 = lvlNode.innerText;
        let html2 = lvlNode.innerHTML;

        //console.log("Updated level text (data-id = " + dataId + ") to '" + lvlNode.innerText + "'");
        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // Find a rank from our cache, based on ID
    //////////////////////////////////////////////////////////////////////

    function getCachedRankFromId(ID, li) {
        for (var i = 0; i < rank_cache.length; i++) {
            if (rank_cache[i].ID == ID) {
                console.log("Returning cached rank: " + ID + " ==> " + rank_cache[i].numeric_rank);
                updateLiWithRank(li, rank_cache[i].numeric_rank);
                return rank_cache[i].numeric_rank;
            }
        }
        return 0; // Not found!
    }

    //////////////////////////////////////////////////////////////////////
    // This prepares to update the UI by locating level, user ID
    // and the index of the <li> in the <ul>.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevels() {
        let ul = document.getElementsByClassName(ulRootClassName)[0];
        if (!validPointer(ul)) {return;}
        let items = ul.getElementsByTagName("li");
        if (!validPointer(items)) {return;}

        for (let i = 0; i < items.length; i++) {
            let li = items[i];
            if (!validPointer(li.getAttribute('data-id'))) {continue;}
            if (window.getComputedStyle(li).display === "none") {continue;}

            let idNode = li.children[0] // ul.item
                           .children[0] // li.b-info-wrap.head
                           .children[1] // div.target.left
                           .children[0]; // a

            let ID = idNode.getAttribute('href').split('=')[1];
            console.log('Locating rank for ID ' + ID);
            if (!getCachedRankFromId(ID, li)) {
                getRankFromId(ID, li);
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    console.log("Torn Bounty List Extender script started!");
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

})();

