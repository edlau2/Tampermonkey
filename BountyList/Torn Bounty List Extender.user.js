// ==UserScript==
// @name         Torn Bounty List Extender
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add rank to bounty list display
// @author       xedx
// @include      https://www.torn.com/bounties.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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

    var totalRequests = 0;
    function getRankFromId(ID, li) {
        console.log("Querying Torn for rank, ID = " + ID);
        var details = GM_xmlhttpRequest({
            method:"POST",
            url:"https://api.torn.com/user/" + ID + "?selections=profile&key=" + api_key,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                console.log("getRankFromId handler, ID = " + ID);
                updateUserLevelsCB(response.responseText, li, ID);
            },
            onerror: function(response) {
                handleRankError(response.responseText);
            }
        });
        totalRequests++;
    }

    //////////////////////////////////////////////////////////////////////
    // Very simple error handler; only displayed (and logged) once
    //////////////////////////////////////////////////////////////////////

    var totalResponses = 0;
    var errorLogged = false;

    function handleRankError(responseText) {
        totalResponses++;
        if (!errorLogged) {
            var prefix = 'Torn Bounty List Extender\n\n';
            var jsonResp = JSON.parse(responseText);
            var errorText = prefix + 'An error has occurred querying rank information.\n' +
                '\nCode: ' + jsonResp.error.code +
                '\nError: ' + jsonResp.error.error;

            if (jsonResp.error.code == 5) {
                errorText += '\n\n The Torn API only allows so many requests per minute. ' +
                    'If this limit is exceeded, this error will occur. It will clear itself' +
                    'up shortly, or you may try refreshing the page.\n';
            }

            errorText += '\nPress OK to continue.';
            alert(errorText);
            console.log(errorText);
            errorLogged = true;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // This callback create a cache used to store ID-rank associations
    // and updates the actual <li> in the <ul>.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevelsCB(responseText, li, ID) {
        totalResponses++;
        var jsonResp = JSON.parse(responseText);

        if (jsonResp.error) {
            return handleRankError(responseText);
        }

        var fullRank = jsonResp.rank;
        var parts = fullRank.split(' ');
        var rank = parts[0];
        if (parts.length >= 3 &&
            (rank == 'Absolute' || rank == 'Below' || rank == 'Above' || rank == 'Highly')) {
            rank = rank + ' ' + parts[1];
        }

        console.log("Callback for ID " + ID + ", rank = " + rank);

        // Lookup name in our table (array) to convert to number
        var numeric_rank = 0;
        for (var i = 0; i < ranks.length; i++) {
            if (rank == ranks[i]) {
                numeric_rank = i;
                break;
            }
        }

        // Cache the result
        console.log("Caching rank: " + ID + " ==> " + numeric_rank);
        rank_cache.push({ID, numeric_rank});

        updateLiWithRank(li, numeric_rank);
    }

    // Actually update the li.
    var updateLiWithRankTotals = 0;
    function updateLiWithRank(li, numeric_rank) {
        console.log("Disconnecting observer.");
        observer.disconnect();

        let dataId = li.getAttribute('data-id');

        /*
        let useLi = getLiByDataId(dataId);
        if (!validPointer(useLi)) {
            useLi = li;
        }
        */

        let lvlNode = li.getElementsByClassName('level')[0];
        let text = lvlNode.innerText;
        let html = lvlNode.innerHTML;

        if (text.indexOf("/") != -1) {
            console.log("Re-starting observer: text already modified! ==> " + text);
            observer.observe(targetNode, config);
            return;
        }

        lvlNode.innerText = text.trim() + '/' + (numeric_rank ? numeric_rank : '?');
        lvlNode.innerHTML = html.trim() + '/' + (numeric_rank ? numeric_rank : '?');

        let text2 = lvlNode.innerText;
        let html2 = lvlNode.innerHTML;

        console.log("Updated level text (data-id = " + dataId + ") to '" + lvlNode.innerText + "'");

        updateLiWithRankTotals++;
        console.log("Total Updates: " + updateLiWithRankTotals);

        console.log("Starting observer.");
        observer.observe(targetNode, config);
    }

    /*
    function getLiByDataId(id) {
        var ul = document.getElementsByClassName(ulRootClassName)[0];
        if (!validPointer(ul)) {return null;}
        var items = ul.getElementsByTagName("li");
        if (!validPointer(items)) {return null;}

        for (var i = 0; i < items.length; i++) {
            let li = items[i];
            let dataId = li.getAttribute('data-id');
            if (!validPointer(dataId)) {continue;}
            if (dataId == id) {return li;}
        }
    }
    */

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
        var ul = document.getElementsByClassName(ulRootClassName)[0];
        if (!validPointer(ul)) {return;}
        var items = ul.getElementsByTagName("li");
        if (!validPointer(items)) {return;}

        // Why isn't JQuery working ???
        // $(ul).foreach(li => function() {
        for (var i = 0; i < items.length; i++) {
            let li = items[i];
            if (!validPointer(li.getAttribute('data-id'))) {
                continue;
            }
            if (window.getComputedStyle(li).display === "none") {
                continue;
            }

            let idNode = li.children[0] // ul.item
                           .children[0] // li.b-info-wrap.head
                           .children[1] // div.target.left
                           .children[0]; // a

            try { // Shouldn't need this... (the 'try')
                var ID = idNode.getAttribute('href').split('=')[1];
                console.log('Locating rank for ID ' + ID);
                if (!getCachedRankFromId(ID, li)) {
                    getRankFromId(ID, li);
                }
            } catch (e) {
                console.log("Error caught getting ID!");
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Map textual rank names to numeric, via array index
    //////////////////////////////////////////////////////////////////////

    var ranks = ['Absolute beginner',
                 'Beginner',
                 'Inexperienced',
                 'Rookie',
                 'Novice',
                 'Below average',
                 'Average',
                 'Reasonable',
                 'Above average',
                 'Competent',
                 'Highly competent',
                 'Veteran',
                 'Distinguished',
                 'Highly distinguished',
                 'Professional',
                 'Star',
                 'Master',
                 'Outstanding',
                 'Celebrity',
                 'Supreme',
                 'Idolized',
                 'Champion',
                 'Heroic',
                 'Legendary',
                 'Elite',
                 'Invincible'];

    //////////////////////////////////////////////////////////////////////
    // Main. Using a MutationObserver allows us to be notified
    // whenever the root of the 'User List' section (the
    // <div id="mainContainer"> section) changes/updates. Note
    // that this is likely triggered at the addition of each <li>,
    // and we'll need to keep track of what has already been edited.
    //////////////////////////////////////////////////////////////////////

    console.log("Torn Bounty List Extender script started!");

    // Make sure we have an API key
    var api_key = GM_getValue('gm_api_key');
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt("Please enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }

    var contentRootName = "content";
    //var ulRootContainerName = 'bounties-wrap';
    //var ulRootContainerName = 'page-template-cont';
    var ulRootContainerName = 'content-wrapper';
    var ulRootClassName = 'bounties-list';
    var targetNode = document.getElementsByClassName(ulRootContainerName /*contentRootName*/)[0];
    var config = { attributes: true, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        updateLiWithRankTotals = 0;
        updateUserLevels();
    };

    var observer = new MutationObserver(callback);
    updateLiWithRankTotals = 0;

    console.log("Starting observer.");
    observer.observe(targetNode, config);

})();

