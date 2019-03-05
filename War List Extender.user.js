// ==UserScript==
// @name         War List Extender
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Appends rank to the level display on the war user list.
// @author       xedx
// @include      https://www.torn.com/factions.php*
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    // Global cache of ID->Rank associations
    var rank_cache = ['', 0];
    var api_key = GM_getValue('gm_api_key');

    //////////////////////////////////////////////////////////////////////
    // Query profile information based on ID
    //////////////////////////////////////////////////////////////////////

    var totalRequests = 0;
    function getRankFromId(ID, index) {
        var details = GM_xmlhttpRequest({
            method:"POST",
            url:"https://api.torn.com/user/" + ID + "?selections=profile&key=" + api_key,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                updateUserLevelsCB(response.responseText, index, ID);
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

    var errorLogged = false;
    function handleRankError(responseText) {
        if (!errorLogged) {
            var jsonResp = JSON.parse(responseText);
            var errorText = 'An error has occurred querying rank information.\n' +
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
    // This callback create the cache used to store ID-rank associations.
    // This is done because if we edit the LI text here, we'll trigger
    // the MutationObserver again. Once the iteration is complete that
    // in turn triggers profile lookups (which callback to here), we
    // can disconnect the observer and perform the modifications, using
    // the cache to get the values we need.
    //////////////////////////////////////////////////////////////////////

    var totalResponses = 0;
    function updateUserLevelsCB(responseText, index, ID) {
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
        //console.log('Rank: ' + rank);

        // Lookup name in our table (array) to convert to number
        var numeric_rank = 0;
        for (var i = 0; i < ranks.length; i++) {
            if (rank == ranks[i]) {
                numeric_rank = i;
                break;
            }
        }

        var cacheEntry = [ID, numeric_rank];
        rank_cache.push(cacheEntry);

        //console.log("Cached entry: " + ID + " is rank " + numeric_rank);
        //console.log("Total Requests: " + totalRequests + " Total Responses: " + totalResponses);

        // If we have received all responses, we can trigger the
        // actual UI update.
        if (totalRequests == totalResponses) {
            updateUserLevelsUI();
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Find a rank from our cache, based on ID
    //////////////////////////////////////////////////////////////////////

    function getCachedRankFromId(ID) {
        for (var i = 0; i < rank_cache.length; i++) {
            if (rank_cache[i][0] == ID) {
                return rank_cache[i][1];
            }
        }
        return 0; // Not found!
    }

    //////////////////////////////////////////////////////////////////////
    // This actually updates the UI - it finds the rank associated
    // with an ID from our cache and updates.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevelsUI() {
        var targetNode = document.getElementById('war-react-root');
        var ulList = targetNode.getElementsByClassName('members-list');
        var ul = ulList[0];

        // Iterate each <LI>
        var items = ul.getElementsByTagName("li");
        if (items == 'undefined') {
            return;
        }

        for (var i = 0; i < items.length; ++i) {
            var li = items[i];
            var userNames = li.getElementsByClassName('user name');
            if (userNames == 'undefined' || userNames[0] == 'undefined' ||
                typeof userNames === 'undefined' || typeof userNames[0] === 'undefined') {
                continue;
            }

            var href = userNames[0].getAttribute("href");
            if (href == 'undefined') {
                continue;
            }

            var parts = href.split("=");
            var ID = parts[1];
            var levelLeftDiv = li.getElementsByClassName('level left');
            var numeric_rank = getCachedRankFromId(ID);
            if (!levelLeftDiv[0].innerHTML.includes('/')) {
                levelLeftDiv[0].innerHTML = levelLeftDiv[0].innerHTML + '/' + (numeric_rank ? numeric_rank : '?');
            }
        }

        // Re-connect our observer, in preparation for going to another page.
        totalRequests = totalResponses = 0;
        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // This prepares to update the UI by locating level, user ID
    // and the index of the <li> in the <ul>.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevels() {
        // Get the <UL>
        var targetNode = document.getElementById('war-react-root');
        var ulList = targetNode.getElementsByClassName('members-list');
        var ul = ulList[0];
        if (ul == 'undefined' || typeof ul == 'undefined') {
            return;
        }

        // Iterate each <LI>
        var items = ul.getElementsByTagName("li");
        if (items == 'undefined') {
            return;
        }

        // We seem to be called twice, the first call always has a length of 1.
        // It seems we can ignore this call.
        //console.log("<LI> Items detected: " + items.length);
        if (items.length == 1) {
            return;
        }

        for (var i = 0; i < items.length; ++i) {
            // Get user ID, to look up rank
            var li = items[i];
            var userNames = li.getElementsByClassName('user name');
            if (userNames == 'undefined' || userNames[0] == 'undefined' ||
                typeof userNames === 'undefined' || typeof userNames[0] === 'undefined') {
                continue;
            }

            var href = userNames[0].getAttribute("href");
            if (href == 'undefined') {
                return;
            }

            // Get ID from href, and rank from ID
            var parts = href.split("=");
            var ID = parts[1];

            // At this point, 'i' is the index into the <ul> 'array'.
            // We'll need to get the rank from the ID, async, so
            // the callback will have to repeat the above but can
            // just index into the <ul> array, no need for the loop
            // anymore.
            if (!getCachedRankFromId(ID)) {
                getRankFromId(ID, i);
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
                 'Below Average',
                 'Average',
                 'Reasonable',
                 'Above Average',
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
                 'Idolised',
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

    if (document.URL.includes('/war/')) {
        console.log("War List Extender script started!");

        // Make sure we have an API key
        api_key = GM_getValue('gm_api_key');
        if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
            api_key = prompt("Please enter your API key.\n" +
                             "Your key will be saved locally so you won't have to be asked again.\n" +
                             "Your key is kept private and not shared with anyone.", "");
            GM_setValue('gm_api_key', api_key);
        }

        var targetNode = document.getElementById('war-react-root');
        var config = { attributes: false, childList: true, subtree: true };
        if (targetNode == 'undefined' || typeof targetNode == 'undefined') {
            return;
        }
        var callback = function(mutationsList, observer) {
            updateUserLevels();
        };
        var observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }
})();