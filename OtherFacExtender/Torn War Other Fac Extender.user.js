// ==UserScript==
// @name         Torn War Other Fac Extender
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Appends rank to the level displayed on another's faction user list.
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
    var rank_cache = [];
    var api_key = GM_getValue('gm_api_key');

    //////////////////////////////////////////////////////////////////////
    // Utilities
    //////////////////////////////////////////////////////////////////////

    var date_formats = ["YYYY-MM-DD",
                        "YYYY-MONTH-DD DDD",
                        "YYYY-MM-DD HH:MM:SS",
                        "DAY MONTH DD YYYY HH:MM:SS",
                        "FULL (DAY MONTH DD YYYY HH:MM:SS TZ)"];

    var months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    var days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

    // Convert a date object into a formatted string
    function dateConverter(dateobj, format){
        var year = dateobj.getFullYear();
        var month= ("0" + (dateobj.getMonth()+1)).slice(-2);
        var date = ("0" + dateobj.getDate()).slice(-2);
        var hours = ("0" + dateobj.getHours()).slice(-2);
        var minutes = ("0" + dateobj.getMinutes()).slice(-2);
        var seconds = ("0" + dateobj.getSeconds()).slice(-2);
        var day = dateobj.getDay();
        var converted_date = dateobj.toString();

        switch(format){
            case "YYYY-MM-DD":
                converted_date = year + "-" + month + "-" + date;
                break;
            case "YYYY-MONTH-DD DDD":
                converted_date = year + "-" + months[parseInt(month)-1] + "-" + date + " " + days[parseInt(day)];
                break;
            case "YYYY-MM-DD HH:MM:SS":
                converted_date = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
                break;
            case "DAY MONTH DD YYYY HH:MM:SS":
                converted_date = days[parseInt(day)] + " " + months[parseInt(month)-1] + " " + date + " " + year + " " +
                    hours + ":" + minutes + ":" + seconds;
                break;
            case "FULL (DAY MONTH DD YYYY HH:MM:SS TZ)":
                converted_date = dateobj.toString();
                break;
        }

        return converted_date;
    }

    // Create a timestamp string for current time (YY-MM-DD HH:MM:SS)
    function timestamp() {
        return dateConverter(new Date(), "YYYY-MM-DD HH:MM:SS");
    }

    // Log an event to the console, prepended with a timestamp
    function logEvent(event) {
        console.log(timestamp() + " - " + event);
    }

    //////////////////////////////////////////////////////////////////////
    // Query profile information based on ID
    //
    // ID: User ID to query
    // index: index into the <UL> array
    // hint: length of requests to be made rapidly.
    //
    //////////////////////////////////////////////////////////////////////

    var totalRequests = 0;
    function submitProfileRequest(ID, index) {
        GM_xmlhttpRequest({
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
    }

    function getRankFromId(ID, index, hint) {
        var deferTime = 500; // milliseconds
        logEvent("Querying Torn, ID = " + ID + " Requests = " + totalRequests);
        totalRequests++;
        //if (!rank) {
            setTimeout(function(){ submitProfileRequest(ID, index);}, deferTime);
        //} else {
        //    totalResponses++; // Was cached, already have response in cache.
        //    if (totalRequests == totalResponses) {
        //        updateUserLevelsUI();
        //    }
        //}
    }

    //////////////////////////////////////////////////////////////////////
    // Very simple error handler; only displayed (and logged) once
    //////////////////////////////////////////////////////////////////////

    var errorLogged = false;
    var lastError = 0;
    function handleRankError(responseText) {

        var jsonResp = null;
        if (responseText != "") {
            jsonResp = JSON.parse(responseText);
        } else {
            // Unknown error
            return;
        }

        if (responseText != "") {
            if (!errorLogged || jsonResp.error.code != lastError) {
                var errorText = 'An error has occurred querying rank information.\n' +
                    '\nCode: ' + jsonResp.error.code +
                    '\nError: ' + jsonResp.error.error;

                lastError = jsonResp.error.code;
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
        } else {
            // Unknown error.
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

        // Lookup name in our table (array) to convert to number
        var numeric_rank = 0;
        for (var i = 0; i < tornRanks.length; i++) {
            if (rank == tornRanks[i]) {
                numeric_rank = i;
                break;
            }
        }

        cacheIdRank(ID, numeric_rank);

        // If we have received all responses, we can trigger the
        // actual UI update.
        if (totalRequests == totalResponses) {
            updateUserLevelsUI();
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Cache utilities
    //////////////////////////////////////////////////////////////////////

    // Time an entry may be cached, in hours
    var expire_time = 24;

    function hoursBetween(date1, date2) {
        var one_hour = 1000*60*60;
        var date1_ms = date1.getTime();
        var date2_ms = date2.getTime();
        var difference_ms = date2_ms - date1_ms;

        return Math.round(difference_ms/one_hour);
    }

    // Add a cache entry: [ID, rank, added_date]
    function cacheIdRank(ID, numeric_rank) {
        var cacheDate = new Date().toString();
        var cacheEntry = [ID, numeric_rank, cacheDate];
        rank_cache.push(cacheEntry);
    }

    // See if a cached entry should be expired, and if so, remove it
    function expireCache(index) {
        var now = new Date()
        var cacheDate = new Date(rank_cache[index][2]);
        if (hoursBetween(cacheDate, now) > expire_time) {
            logEvent("cache entry expired: ID " + rank_cache[index][0]);
            rank_cache.splice(index, 1);
        }
    }

    // Find a rank from our cache, based on ID
    function getCachedRankFromId(ID) {
        for (var i = 0; i < rank_cache.length; i++) {
            if (rank_cache[i][0] == ID) {
                logEvent("cache hit: ID " + ID + " ==> Rank:" + rank_cache[i][1] + " Expires: " +
                         dateConverter(new Date(rank_cache[i][2]), "YYYY-MM-DD HH:MM:SS"));
                expireCache(i);
                return rank_cache[i][1];
            }
        }
        logEvent("cache miss: ID " + ID);
        return 0; // Not found!
    }

    //////////////////////////////////////////////////////////////////////
    // This actually updates the UI - it finds the rank associated
    // with an ID from our cache and updates.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevelsUI() {
        var targetNodes = document.getElementsByClassName('faction-info-wrap another-faction');
        var ulList = targetNodes[1].getElementsByClassName('member-list info-members bottom-round t-blue-cont h');
        var ul = ulList[0];

        // Iterate each <LI>
        var items = ul.getElementsByTagName("li");
        if (items == 'undefined') {
            return;
        }

        for (var i = 0; i < items.length; ++i) {
            var li = items[i];
            var ID;
            try {
                ID = li.getElementsByClassName('user name')[0].getAttribute("href").split("=")[1];
            } catch(err) {
                continue;
            }

            var lvlTextVal;
            try {
                lvlTextVal = li.getElementsByClassName('lvl')[0].firstChild.nextSibling.nextSibling;
            } catch (err) {
                continue;
            }

            var numeric_rank = getCachedRankFromId(ID);
            var text = lvlTextVal.textContent;

            if (!text.includes('/')) {
                lvlTextVal.textContent = text.trim() + '/' + (numeric_rank ? numeric_rank : '?');
            }
        }

        // Re-connect our observer, in preparation for going to another page.
        totalRequests = totalResponses = 0;
        observer.observe(targetNodes[1], config);
    }

    //////////////////////////////////////////////////////////////////////
    // This prepares to update the UI by locating level, user ID
    // and the index of the <li> in the <ul>.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevels() {
        var targetNodes = document.getElementsByClassName('faction-info-wrap another-faction');
        var ulList = targetNodes[1].getElementsByClassName('member-list info-members bottom-round t-blue-cont h');
        var items;
        try {
            items = ulList[0].getElementsByTagName("li");
        } catch(err) {
            return;
        }

        // We seem to be called twice, the first call always has a length of 1.
        // It seems we can ignore this call.
        //console.log("<LI> Items detected: " + items.length);
        if (items.length <= 1) {
            return;
        }

        logEvent("Estimated requests required: " + items.length);
        var pendingReqQueue = [];
        for (var i = 0; i < items.length; ++i) {
            var ID;
            try {
                ID = items[i].getElementsByClassName('user name')[0].getAttribute("href").split("=")[1];
            } catch (err) {
                continue;
            }

            if (!getCachedRankFromId(ID)) {
                var queueObj = [ID, i];
                pendingReqQueue.push(queueObj);
            }
        } // End 'for' loop

        // Now we have an idea about how many requests we'll be making.
        // We can use this as a 'hint' to getRankFromId() to defer
        // requests as needed to prevent the 100 reqs/min limit.
        logEvent("Pending requests queued: " + pendingReqQueue.length);
        pendingReqQueue.forEach(function(element) {
            getRankFromId(element[0], element[1], pendingReqQueue.length);
        });
    }

    //////////////////////////////////////////////////////////////////////
    // Array to map textual rank names to numeric, via array index
    //////////////////////////////////////////////////////////////////////

    var tornRanks = ['Absolute beginner',
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

    console.log("Torn War Other Fac Extender script started!");

    // Make sure we have an API key
    api_key = GM_getValue('gm_api_key');
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt("Please enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }

    var targetNodes = document.getElementsByClassName('faction-info-wrap another-faction');
    var config = { attributes: true, childList: true, subtree: true };
    if (targetNodes == 'undefined' || typeof targetNodes == 'undefined') {
        return;
    }
    updateUserLevels();
    var callback = function(mutationsList, observer) {
        updateUserLevels();
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNodes[1], config);
})();