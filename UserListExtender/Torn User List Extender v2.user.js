// ==UserScript==
// @name         Torn User List Extender v2
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Add rank to user list display
// @author       xedx
// @include      https://www.torn.com/userlist.php*
// @include      https://www.torn.com/page.php?sid=UserList*
// @blah         file:////Users/edlau/documents/Tampermonkey Scripts/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    const xedx_main_div =
          '<div class="t-blue-cont h" id="xedx-main-div">' +

              // Header and title.
              '<div id="xedx-header-div" class="title main-title title-black top-round active" role="table" aria-level="5">' +
                  "<span>Advanced Search by XedX</span>" +

                  // This displays the active/inactive status - active when data array is populated.
                  '<div id="xedx-active-light" style="float: left; margin-right: 10px; margin-left: 10px; color: green;">' +
                      '<span>Active</span>' +
                  '</div>' +

                  // This displays the [hide] | [show] link
                  '<div class="right" style="margin-right: 10px">' +
                      '<a role="button" id="xedx-show-hide-btn" class="t-blue show-hide">[hide]</a>' +
                  '</div>' +
              '</div>' +

          // This is the content that we want to hide when '[hide] | [show]' is clicked.
          // '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: auto; overflow: auto display: hide";>' +
          '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: auto; overflow: auto; display: flex";>' +
              '<br>' +
              '<span style="text-align: left; margin-left: 10px; margin-top: 10px;">Options:</span>' +
              '<table style="margin-top: 10px; width: 500px;"><tbody>' +
                  '<tr>' + // Row 1
                      '<td class="xtdx" ><div>' +
                          '<input type="checkbox" class="xcbx" id="xedx-devmode-opt" name="devmode">' +
                          '<label for="devmode"><span style="margin-left: 15px;">Development Mode</span></label>' +
                      '</div></td>' +
                      '<td class="xtdx"><div>' +
                          '<input type="checkbox" class="xcbx" id="xedx-hidefallen-opt" name="hidefallen">' +
                          '<label for="hidefallen"><span style="margin-left: 15px;">Hide Fallen</span></label>' +
                      '</div></td>' +
                      '<td class="xtdx""><div>' +
                          '<input type="checkbox" class="xcbx" id="xedx-disabled-opt" name="disabled">' +
                          '<label for="disabled"><span style="margin-left: 15px;">Disable Script</span></label>' +
                      '</div></td>' +
                  '</tr>' +
                  '<tr>' + // Row 2
                      '<td class="xtdx"><div>' +
                          '<input type="checkbox" class="xcbx" id="xedx-hidefedded-opt" name="hidefedded"">' +
                          '<label for="hidefedded"><span style="margin-left: 15px">Hide Fedded</span></label>' +
                      '</div></td>' +
                      '<td class="xtdx" id="loggingEnabled" style="display: block;"><div>' +
                          '<input type="checkbox" class="xcbx" id="xedx-loggingEnabled-opt" name="loggingEnabled"">' +
                          '<label for="loggingEnabled"><span style="margin-left: 15px;">Debug Logging Enabled</span></label>' +
                      '</div></td>' +
                  '</tr>' +
                  '<tr>' + // Row 3
                      '<td class="xtdx"><div>' +
                          '<input type="checkbox" class="xcbx" id="xedx-hidetravel-opt" name="hidetravel"">' +
                          '<label for="hidetravel"><span style="margin-left: 15px">Hide Traveling</span></label>' +
                      '</div></td>' +
                      '<td class="xtdx" id="showcaymans" style="display: hide;"><div>' +
                          '<input type="checkbox" class="xcbx" id="xedx-showcaymans-opt" name="showcaymans"">' +
                          '<label for="showcaymans"><span style="margin-left: 15px">Show Only From Caymans</span></label>' +
                      '</div></td>' +
                  '<tr>' +
                  '</tr>' + // Row 4
                      '<td class="xtdx"><div>' +
                          '<input type="checkbox" class="xcbx" id="xedx-hidehosp-opt" name="hidehosp" style="margin-bottom: 10px;">' +
                          '<label for="hidehosp"><span style="margin-left: 15px">Hide Hospitalized</span></label>' +
                      '</div></td>' +
                      '<td class="xtdx" id="viewcache" style="display: block;"><div>' +
                          '<button id="xedx-viewcache-btn" class = "button">View Cache</button>' +
                      '</div></td>' +
                  '</tr>' +
              '</tbody></table>' +
              '<div id="xedx-stats" style="float: right; margin-top: 10px;">' +
                  '<span id="xedx-info-text" style="color: red; margin-right: 20px; margin-left: 20px;">' +
                  GM_info.script.name +
                  '</span>' +
              '</div>' +
              '<br>' +
          '</div>'; // End xedx-content-div

    // Options
    var opt_devmode = false;
    var opt_loggingEnabled = false; // Only affect debug logging, not regular
    var opt_hidefedded = true;
    var opt_hidefallen = true;
    var opt_hidetravel = true;
    var opt_showcaymans = false;
    var opt_hidehosp = true;
    var opt_disabled = false;
    var opt_paused = false;

   var reqDelay = 10; //seconds to delay on error code 5 (too many req's)

    // Observers
    var mainTargetNode = null;
    const mainConfig = { attributes: false, childList: true, subtree: true };
    const mainObserver = new MutationObserver(function() {updateUserLevels('mainObserver');});null;

    // Declared in helper lib, toggled in here.
    debugLoggingEnabled = opt_loggingEnabled;

    // Global cache of ID->Rank associations
    //var rank_cache = [{ID: 0, numeric_rank: 0, name: '', state: '', description: ''}];
    var rank_cache = [];
    function newCacheItem(ID, obj) {
        let rank = numericRankFromFullRank(obj.rank);
        return {ID: ID, numeric_rank: rank, name: obj.name, state: obj.status.state, description: obj.status.description, access: new Date().getTime()};
    }

    //const cacheMaxSecs = 3600 * 1000; // one hour in ms
    const cacheMaxSecs = 18000 * 1000; // 300 min (5 hrs) in ms
    //const cacheMaxSecs = 180 * 1000; // 3 min in ms
    //const cacheMaxSecs = 60 * 1000; // 1 min in ms

    // TRUE if TornTools filtering is in play
    var ttInstalled = false;

    //////////////////////////////////////////////////////////////////////
    // Query profile information based on ID
    //////////////////////////////////////////////////////////////////////

    // Query profile information based on ID. Skip those we'd like to filter out.
    // We don't display if the class contains 'filter-hidden', added by TornTools,
    // or 'xedx_hidden', added here.
    function getRankFromId(ID, li) {
        debug('getRankFromId: ID ' + ID + ' classList: ' + li.classList);

        if (opt_disabled) {
            log('Script disabled - ignoring.');
            return true;
        }

        if (li.classList.contains('filter-hidden') || li.classList.contains('xedx_hidden')) {
            log('Skipping ' + ID + ': hidden.');
            return true;
        }

        if (isRanked(li)) { // Don't do again!
            log('***** getRankFromId: rank already present! *****');
            log('***** Should not be here!!! *****');
            return true;
        }

        if (opt_paused) {
            log('Script paused - requeuing. (' + $("#xedx-info-text")[0].innerText + ')');
            if (!$("#xedx-info-text")[0].innerText) {
                $("#xedx-info-text")[0].innerText = 'Requests paused, please wait.';
            }
            setTimeout(function(){
               xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, li);}, reqDelay * 1000);
            return true;
        }

        log("Querying Torn for rank, ID = " + ID);
        xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, li);
    }

    //////////////////////////////////////////////////////////////////////
    // This callback create the cache used to store ID-rank associations
    // and updates the UI.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevelsCB(responseText, ID, li) {
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            console.log('updateUserLevelsCB: error:', jsonResp.error);
            if (jsonResp.error.code == 5) { // {"code":5,"error":"Too many requests"}
                if (isRanked(li)) { // Don't do again!
                    log('***** updateUserLevelsCB: rank for ' + name + ' already present! Ignoring.');
                    return;
                }
                let name = fullNameFromLi(li);
                let msg = "Delaying request for " + reqDelay + " seconds.";
                log('updateUserLevelsCB requeuing ' + name);
                setTimeout(function(){
                    $("#xedx-info-text")[0].innerText = "Restarting requests.";
                    opt_paused = false;
                    xedx_TornUserQuery(ID, 'profile', updateUserLevelsCB, li);
                    log('Restarting requests.');
                },
                reqDelay * 1000);  // Turn back on in <delay> secs.

                $("#xedx-info-text")[0].innerText = "Error: " + jsonResp.error.error + "\n" + msg;
                log(msg);
                opt_paused = true;
                return;
            }
            return handleError(responseText);
        }

        $("#xedx-info-text")[0].innerText = 'Queried ID ' + ID;
        setTimeout(function(){$("#xedx-info-text")[0].innerText = opt_paused ? 'Requests paused, please wait.' : '';}, 5000);

        let numeric_rank = numericRankFromFullRank(jsonResp.rank);
        let cache_item = newCacheItem(ID, jsonResp);
        debug("Caching rank to mem: " + ID + " (" + cache_item.name + ") ==> " + cache_item.numeric_rank);
        rank_cache.push(cache_item);
        log('Caching ID ' + ID + ' to storage.');
        GM_setValue(ID, cache_item);
        updateLiWithRank(li, cache_item);
    }

    //////////////////////////////////////////////////////////////////////
    // Find a rank from our cache, based on ID
    //////////////////////////////////////////////////////////////////////

    function getCachedRankFromId(ID, li) {
        let name = fullNameFromLi(li);
        log('Looking for ' + name + + ' [' + ID + '] in cache...');

        let isHosped = isInHosp(li);
        let inFed = isFedded(li);
        let travelling = isTravelling(li);
        if (isHosped || inFed || travelling) {
            log('Hosp: ' + isHosped + ' Fedded: ' + inFed + ' IsTravelling: ' + travelling);
            log('**** Shouldn`t be here? *****');
        }

        for (var i = 0; i < rank_cache.length; i++) {
            if (rank_cache[i].ID == ID) {
                debug("Returning mem cached rank: " + ID + "(" +  rank_cache[i]. name + ") ==> " +  rank_cache[i].numeric_rank);
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
        debug("didn't find " + name + ' [' + ID + "] in cache.");
        return false; // Not found!
    }

    // Write out some cache stats
    function writeCacheStats() {
        let now = new Date().getTime();
        let lastAccess = GM_getValue('LastCacheAccess', 0);
        let arrayOfKeys = GM_listValues();
        log('Cache stats:\nNow: ' + now + '\nLast Access: ' + lastAccess +
            'Cache Age: ' + (now - lastAccess)/1000 + ' seconds.\nItem Count: ' + arrayOfKeys.length - 9);
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
    // This actually updates the UI - it finds the rank associated
    // with an ID from our cache and updates.
    //////////////////////////////////////////////////////////////////////

    // Write to the UI
    function updateLiWithRank(li, cache_item) {
        // Run through our filter
        li.classList.remove('xedx_hidden');

        if (opt_disabled) return;

        if (!cache_item) {
            log('Invalid params - not filtering: li=' + li + ' cache_item: ' + cache_item);
            return;
        }

        if (filterUser(li, cache_item)) {
            debug('Filtered ' + cache_item.name);
            li.classList.add('xedx_hidden');
            return;
        }

        let numeric_rank = cache_item.numeric_rank;
        if (validPointer(li)) {
            let lvlNode = li.getElementsByClassName('level')[0];
            let text = lvlNode.innerText;
            if (text.indexOf("/") != -1) { // Don't do again!
                log('***** Rank already present!! *****');
                return;
            }

            // Not filtered: add rank.
            lvlNode.innerText = text.trim() + '/' + (numeric_rank ? numeric_rank : '?');
        } else {
            debugger;
        }
    }

    // Diagnostic aids, will be used elsewhere later
    function isInHosp(li) {
        return (li.querySelector("[id^='icon15___']")) ? true : false;
    }
    function isFedded(li) {
        return (li.querySelector("[id^='icon70___']")) ? true : false;
    }
    function isFallen(li) {
        return (li.querySelector("[id^='icon77___']")) ? true : false;
    }
    function isTravelling(li) {
        return (li.querySelector("[id^='icon71___']")) ? true : false;
    }

    function isRanked(li) {
        let lvlNode = li.getElementsByClassName('level')[0];
        let lvlText = lvlNode.innerText;
        if (lvlText.indexOf("/") != -1) { // Don't do again!
            log('***** isRanked: rank already present! *****');
            return true;
        }
        return false;
    }

    // Pre-filter - just based on icons in the li
    // If filtered, return TRUE
    function preFilter(li) {
        let ID = idFromLi(li);
        let name = fullNameFromLi(li);

        log("Pre-filtering " + name + ' [' + ID + ']');

        if (opt_hidehosp && isInHosp(li)) {
            log('***** preFilter: in hospital! (' + name + + ' [' + ID + '])');
            return true;
        }
        if (opt_hidefedded && isFedded(li)) {
            log('***** preFilter: fedded! (' + name + + ' [' + ID + '])');
            return true;
        }
        if (opt_hidefallen && isFallen(li)) {
            log('***** preFilter: fallen! (' + name + + ' [' + ID + '])');
            return true;
        }
        if (opt_hidetravel && isTravelling(li)) {
            log('***** preFilter: travelling! (' + name + + ' [' + ID + '])');
            return true;
        }

        return false;
    }

    // Filter to cull out those we're not interested in, based callback info (not icons). Return TRUE if filtered.
    function filterUser(li, ci) {
        debug('Filtering ' + ci.name + ' Rank: ' + ci.numeric_rank + ' State: ' + ci.state + ' Desc: ' + ci.description);
        if (opt_showcaymans && ci.state != 'Traveling') {
            debug('Filtered - Caymans only, but either not returning or not Caymans');
            debug('State = ' + ci.state);
            return true;
        }

        let isHosped = isInHosp(li);
        let infed = isFedded(li);
        let fallen = isFallen(li);
        let travelling = isTravelling(li);
        if (isHosped || infed || travelling) {
            log('Hosp: ' + isHosped + ' Fedded: ' + infed + ' IsTravelling: ' + travelling);
            log('**** Shouldn`t be here? *****');
        }

        switch (ci.state) {
            case 'Hospital':
                if (opt_hidehosp) {
                    if (isHosped) log('**** Shouldn`t be here? *****');
                    debug('***** Filtered - in hosp.');
                    return true;
                }
                break;
            case 'Federal':
                if (opt_hidefedded) {
                    if (infed) log('**** Shouldn`t be here? *****');
                    debug('***** Filtered - fedded.');
                    return true;
                }
                break;
            case 'Fallen':
                if (opt_hidefallen) {
                    if (infed) log('**** Shouldn`t be here? *****');
                    debug('***** Filtered - fallen.');
                    return true;
                }
                break;
            case 'Abroad':
            case 'Traveling':
                if (opt_hidetravel) {
                    if (travelling) log('**** Shouldn`t be here? *****');
                    debug('***** Filtered - traveling.');
                    return true;
                }
                if (opt_showcaymans) {
                    if (ci.description.indexOf('Cayman') != -1) {
                        if (ci.description.indexOf('Returning') != -1) {
                            debug('******Returning from Caymans! Not filtered!');
                            return false;
                        }
                    }
                    debug('Filtered - caymans only, but either not returning or not Caymans');
                    return true;
                }
                break;
            default:
                return false;
        }
        return false;
    }

    //////////////////////////////////////////////////////////////////////
    // This prepares to update the UI by locating level, user ID
    // and the index of the <li> in the <ul>.
    //////////////////////////////////////////////////////////////////////

    function updateUserLevels(display) {
        log('updateUserLevels called by: ' + display);

        if (opt_disabled) {
            log('Script disabled - not processing.');
            return;
        }

        // See if TornTools filtering is in play.
        let ttPlayerFilter = document.querySelector("#tt-player-filter");
        if (validPointer(ttPlayerFilter)) {
            log('TornTools filter detected!');
            ttInstalled = true;
            }

        // Get the <UL>, list of all users.
        var elemList = document.getElementsByClassName('user-info-list-wrap bottom-round cont-gray');
        var items = elemList[0].getElementsByTagName("li");
        if (items.length <= 1) {return;} // DOM not fully loaded, observer will recall us.

        observerOFF();
        for (var i = 0; i < items.length; ++i) {
            let li = items[i], ID = 0;
            if ((ID = idFromLi(li)) != 0) {

                if (isRanked(li)) { // Don't do again!
                    log('***** updateUserLevels: rank already present, ignoring *****');
                    continue;
                }

                // NOTE: Filter here first, before secondary filter, which
                // requires stuff from a stats query. We can filter based on icons in the li.
                // Just need to add the filter class, will be caught in getRankFromId()
                // and ignored. The secondary filter, which uses data from the Torn API
                // call, is called from updateLiWithRank().
                if (preFilter(li)) {
                    li.classList.add('xedx_hidden');
                    log('pre-filtered: ignoring.');
                    continue;
                }

                // This returns TRUE if either a cached rank item is found, or it is filtered out.
                // If neither of these cases is true, we query the Torn API, and then update the UI
                // according - we perform secondary filtering there.
                if (!getCachedRankFromId(ID, li)) {
                    setTimeout(function(){getRankFromId(ID, li);}, 500); // Updates UI. Do this in .5 sec intervals
                                                                         // to limit the 100 reqs/min errors
                }
            }
        }
        observerON();
    }


    function fullNameFromLi(li) {
        try {
            let elems = li.getElementsByClassName('user name'); // debugging
            if (elems.length == 0) {return 0;}
            return elems[0].getAttribute("data-placeholder");
        } catch(err) { // Should never hit this.
            console.error(err);
            debugger;
            return 0;
        }
    }


    // Helper for above
    function idFromLi(li) {
        try {
            let elems = li.getElementsByClassName('user name'); // debugging
            if (elems.length == 0) {return 0;}
            return elems[0].getAttribute("href").split("=")[1];
        } catch(err) { // Should never hit this.
            console.error(err);
            debugger;
            return 0;
        }
    }

    // Disable the script
    function disableScript(disabled=true) {
        opt_disabled = disabled;
        GM_setValue("opt_disabled", opt_disabled);
        $("#xedx-disabled-opt")[0].checked = disabled;
        indicateActive();
    }

    //////////////////////////////////////////////////////////////////////
    // UI related stuff, namely options
    //////////////////////////////////////////////////////////////////////

    // Build the main UI
    function buildUI() {
        getSavedOptions();
        if (validPointer(document.getElementById('xedx-main-div'))) {
            log('UI already installed!');
            return;
        }

        let parentDiv = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper");
        if (!validPointer(parent)) {setTimeout(buildUI, 500);}

        loadTableStyles();
        $(separator).insertBefore(parentDiv);
        $(xedx_main_div).insertBefore(parentDiv);

        installHandlers();
        setDefaultCheckboxes();
        hideDevOpts(!opt_devmode);
        indicateActive();
        log('UI installed.');
    }

    // Handle the selected options
    function handleOptsClick() {
        let option = this.id;
        log('Handling checkbox change for ' + option);
        switch (option) {
            case "xedx-loggingEnabled-opt":
                opt_loggingEnabled = this.checked;
                GM_setValue("opt_loggingEnabled", opt_loggingEnabled);
                debugLoggingEnabled = opt_loggingEnabled;
                debug('Saved value for opt_loggingEnabled');
                break;
            case "xedx-hidefedded-opt":
                opt_hidefedded = this.checked;
                GM_setValue("opt_hidefedded", opt_hidefedded);
                debug('Saved value for opt_hidefedded');
                break;
            case "xedx-hidefallen-opt":
                opt_hidefallen = this.checked;
                GM_setValue("opt_hidefallen", opt_hidefallen);
                debug('Saved value for opt_hidefallen');
                break;
            case "xedx-devmode-opt":
                opt_devmode = this.checked;
                GM_setValue("opt_devmode", opt_devmode);
                hideDevOpts(!opt_devmode);
                debug('Saved value for opt_devmode');
                break;
            case "xedx-hidetravel-opt":
                opt_hidetravel = this.checked;
                GM_setValue("opt_hidetravel", opt_hidetravel);
                debug('Saved value for opt_hidetravel');
                break;
            case "xedx-showcaymans-opt":
                opt_showcaymans = this.checked;
                if (opt_showcaymans) {
                    $('#xedx-hidetravel-opt').prop("checked", false);
                    opt_hidetravel = false;
                    GM_setValue("opt_hidetravel", opt_hidetravel);
                }
                GM_setValue("opt_showcaymans", opt_showcaymans);
                debug('Saved value for opt_showcaymans');
                break;
            case "xedx-hidehosp-opt":
                opt_hidehosp = this.checked;
                GM_setValue("opt_hidehosp", opt_hidehosp);
                debug('Saved value for opt_hidehosp');
                break;
            case "xedx-disabled-opt":
                opt_disabled = this.checked;
                opt_disabled ? observerOFF() : observerON();
                indicateActive();
                GM_setValue("opt_disabled", opt_disabled);
                debug('Saved value for opt_disabled');
                break;
            case "xedx-viewcache-btn":
                displayCache();
                break;
            default:
                debug('Checkbox ID not found!');
        }
        updateUserLevels('handleOptsClick');
    }

    // Function to enable/diable dev mode options
    function hideDevOpts(hide = true) {
        if (hide) {
            $('#showcaymans')[0].style.display = 'none';
            $('#loggingEnabled')[0].style.display = 'none';
            $('#viewcache')[0].style.display = 'none';
            opt_showcaymans = false;
            GM_setValue("opt_showcaymans", opt_showcaymans);
        } else {
            $('#showcaymans')[0].style.display = 'block';
            $('#loggingEnabled')[0].style.display = 'block';
            $('#viewcache')[0].style.display = 'block';
        }
    }

    // Function to display cache contents TBD: Add storage cache
    function displayCache() {
        debug('displayCache');
        // var rank_cache = [{ID: 0, numeric_rank: 0, name: '', state: '', description: ''}];
        var output = 'Mem Cached Users:\n\n';
        let rc = rank_cache;
        for (let i = 0; i < rc.length; i++) {
            output += 'Name: "' + rc[i].name + '" Rank: "' + rc[i].numeric_rank +
                '" State: "' + rc[i].state + '"\n';
        }
        alert(output);
    }

    // Read saved options values
    function getSavedOptions() {
        log('Getting saved options.');
        opt_devmode = GM_getValue("opt_devmode", opt_devmode);
        debugLoggingEnabled = opt_loggingEnabled = GM_getValue("opt_loggingEnabled", opt_loggingEnabled);
        opt_hidefedded = GM_getValue("opt_hidefedded", opt_hidefedded);
        opt_hidefallen = GM_getValue("opt_hidefallen", opt_hidefallen);
        opt_hidetravel = GM_getValue("opt_hidetravel", opt_hidetravel);
        opt_showcaymans = GM_getValue("opt_showcaymans", opt_showcaymans);
        opt_hidehosp = GM_getValue("opt_hidehosp", opt_hidehosp);
        opt_disabled = GM_getValue("opt_disabled", opt_disabled);
    }

    // Write saved options values
    function setSavedOptions() {
        log('Getting saved options.');
        GM_setValue("opt_loggingEnabled", opt_loggingEnabled);
        GM_setValue("opt_hidefedded", opt_hidefedded);
         GM_setValue("opt_hidefallen", opt_hidefallen);
        GM_setValue("opt_hidetravel", opt_hidetravel);
        GM_setValue("opt_showcaymans", opt_showcaymans);
        GM_setValue("opt_hidehosp", opt_hidehosp);
        GM_setValue("opt_disabled", opt_disabled);
    }

    // Check checkboxes to default.
    function setDefaultCheckboxes() {
        log('Setting default state of checkboxes.');
        $("#xedx-loggingEnabled-opt")[0].checked = GM_getValue("opt_loggingEnabled", opt_loggingEnabled);
        $("#xedx-devmode-opt")[0].checked = GM_getValue("opt_devmode", opt_devmode);
        $("#xedx-hidefedded-opt")[0].checked = GM_getValue("opt_hidefedded", opt_hidefedded);
        $("#xedx-hidefallen-opt")[0].checked = GM_getValue("opt_hidefallen", opt_hidefallen);
        $("#xedx-hidetravel-opt")[0].checked = GM_getValue("opt_hidetravel", opt_hidetravel);
        $("#xedx-showcaymans-opt")[0].checked = GM_getValue("opt_showcaymans", opt_showcaymans);
        $("#xedx-hidehosp-opt")[0].checked = GM_getValue("opt_hidehosp", opt_hidehosp);
        $("#xedx-disabled-opt")[0].checked = GM_getValue("opt_disabled", opt_disabled);
    }

    // Show/hide opts page
    function hideOpts(hide=true) {
        debug((hide ? "hiding " : "showing ") + "options page.");
        $('#xedx-show-hide-btn').text(`[${hide ? 'show' : 'hide'}]`);
        document.querySelector("#xedx-content-div").style.display = hide ? 'none' : 'flex';
    }

    // Toggle active/inactive status
    function indicateActive() {
        debug('Toggling active status: ' + (opt_disabled ? 'active' : 'disabled'));
        if (validPointer($('#xedx-active-light')[0])) {
            var str = `[${opt_disabled ? 'Disabled' : 'Active'}]`;
            $('#xedx-active-light').text(str);
            $('#xedx-active-light')[0].style.color = opt_disabled ? "red" : "green";
            opt_disabled ? observerOFF() : observerON();
        } else {
            debug('Active indicator not found!');
        }
    }

    // Add button handler(s).
    function installHandlers() {
        // Show/Hide options link
        const savedHide = GM_getValue('xedxHideOpts', false);
        hideOpts(savedHide);
        $('#xedx-show-hide-btn').on('click', function () {
            const hide = $('#xedx-show-hide-btn').text() == '[hide]';
            GM_setValue('xedxHideOpts', hide);
            hideOpts(hide);
        });

        // Options checkboxes
        $("#xedx-loggingEnabled-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-devmode-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-hidefedded-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-hidetravel-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-showcaymans-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-hidehosp-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-disabled-opt")[0].addEventListener("click", handleOptsClick);
        $("#xedx-viewcache-btn")[0].addEventListener("click", handleOptsClick);
    }

    // Styles for UI elements
    function loadTableStyles() {
        GM_addStyle(".xedx_hidden {display: none;}");
        GM_addStyle(".xcbx {margin-left: 12px;}");
        if (darkMode()) {
            GM_addStyle(".xtdx {color: white;}");
            GM_addStyle(".button {" +
                  "border: solid 1px;" +
                  "color: black;" +
                  "background-color: #c4c3c0;" +
                  "padding: 5;" +
                  "text-align: center;" +
                  "display: inline-block;" +
                  "cursor: pointer;" +
                  "border-radius: 4px;" +
                  "margin-left: 50px;" +
                "}");

        } else {
            GM_addStyle(".xtdx {color: black;}");
            GM_addStyle(".button {" +
                  "border: solid 1px;" +
                  "color: black;" +
                  "background-color: #c4c3c0;" +
                  "padding: 5;" +
                  "text-align: center;" +
                  "display: inline-block;" +
                  "cursor: pointer;" +
                  "border-radius: 4px;" +
                  "margin-left: 50px;" +
                "}");
        }
    }

    // Adds an observer to handle changes from dark mode to light
    function addDarkModeObserver() {
        var dmObserver = new MutationObserver(function() {loadTableStyles();});
        dmObserver.observe($('body')[0], {attributes: true, childList: false, subtree: false});
    }

    // Functions to log when we connect/disconnect main observer, for debugging
    function observerON() {
        debug('Turning observer ON');
        if (validPointer(mainObserver)) {mainObserver.observe(mainTargetNode, mainConfig);}
    }

    function observerOFF() {
        debug('Turning observer OFF');
        if (validPointer(mainObserver)) {mainObserver.disconnect();}
    }

    //////////////////////////////////////////////////////////////////////
    // Main. Using a MutationObserver allows us to be notified
    // whenever the root of the 'User List' section (the
    // <div id="mainContainer"> section) changes/updates. Note
    // that this is likely triggered at the addition of each <li>,
    // and we'll need to keep track of what has already been edited.
    //////////////////////////////////////////////////////////////////////

    validateApiKey();
    logScriptStart();
    versionCheck();

    // setInterval(writeCacheStats, 5000); // Debugging - check on cache.
        setInterval(function() {
            log('**** Performing interval driven cache clearing ****');
            clearStorageCache();},
                    (0.5*cacheMaxSecs)); // Check for expired cache entries at intervals, half max cache age.

    mainTargetNode = document.querySelector("#mainContainer > div.content-wrapper > div.userlist-wrapper");
    addDarkModeObserver();
    buildUI();
    observerON();

    // Add a listener to detect when the hash changes - new page.
    // Don't need this and the observer?
    /*
    window.addEventListener('hashchange', function() {
            log('The hash has changed (new page)');
            updateUserLevels('hashchange');
        }, false);
    */

    // If *already* loaded, go ahead...
    if (document.readyState === 'complete') {
        updateUserLevels('document.readyState');
    }

})();