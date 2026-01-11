// ==UserScript==
// @name        wall-battlestats2
// @namespace   http://tampermonkey.net/
// @version     1.38
// @description show tornstats spies on faction wall page
// @author      xedx [2100735], finally [2060206], seintz [2460991]
// @license     GNU GPLv3
// @run-at      document-end
// @match       https://www.torn.com/factions.php*
// @require     https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require     https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @connect     api.torn.com
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addValueChangeListener
// @connect     tornstats.com
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function () {
  "use strict";

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    logScriptStart();
    if (checkCloudFlare()) return log("Wall-BatStats Won't run while challenge active!");

    var lastHashTab = getPageTab();
    callOnHashChange(hashChangeHandler);

    if (validFacPage() == false || lastHashTab == 'controls') {
        return log("Invalid page, going home: ", location.href);
    }

    api_key = GM_getValue('gm_api_key');
    validateApiKey();

    var enemyMembers = {};
    var enemyProfile = true;
    var ourProfile = false;
    var enemyID, step, facTab;

    // $("#faction_war_list_id > li[class*='warListItem_'] > div > div > div > a[class*='opponentFactionName_']")
    function checkPageParams() {
        let params = new URLSearchParams(location.search);
        step = params.get('step');
        enemyProfile = (step == 'profile');
        if (enemyProfile) enemyID = params.get("ID");
        params = location.hash.length ? new URLSearchParams(location.hash.replace("#/", "?")) : null;
        if (params) facTab = params.get('tab');
        ourProfile = (step == 'your' || facTab == 'info');

        debug("[checkPageParams] step: ", step, " us: ", ourProfile, " them: ", enemyProfile, " ID: ", enemyID, " facTab: ", facTab);
    }

    function validFacPage() {
        checkPageParams();
        return (enemyProfile == true ||
            (ourProfile == true && facTab == "info") ||
            enemyID);
    }

    function getPageTab() {
        let hash = location.hash ? location.hash.replace("#/", "?") : null;
        let params = hash ? new URLSearchParams(hash) : null;
        let tab = params ? params.get("tab") : null;
        //log("[getPageTab]: ", hash, " tab: ", tab);
        if (tab == 'info') ourProfile = true;
        return tab;
    }

    function hashChangeHandler() {
        // Going to or from the Controls page, reload so that
        // either we aren't running, or we start running if that
        // was the previous page.
        let currTab = getPageTab();
        if (lastHashTab == 'controls' || currTab == 'controls')
            location.reload();

        setTimeout(addWarListClickHandlers, 250);
    }

    var apiKey = api_key;
    if (!apiKey) {
        alert("No apikey set!\nUse the 'Update BS key'\nlink at the top of\nthe page to fix.");
        return;
    }

    const thisUser = JSON.parse($("#torn-user").val());
    const myUserId = thisUser.id;  // Use to get fac id, then war status
    var myFacId;
    var atWar;
    var myFacMembers = {};

    xedx_TornUserQueryv2('', "profile", userProfileQueryCb); // get fac ID

    let   xedxDevMode = GM_getValue("xedxDevMode", false);
    const enableScrollLock = GM_getValue("enableScrollLock", true);
    const trackOkUsers = GM_getValue("trackOkUsers", false);
    var updateUserCountsTimer;
    const updateIntervalSecs = GM_getValue("updateIntervalSecs", 3); // unused?
    const statusIntervalSecs = GM_getValue("statusIntervalSecs", 5);

    GM_setValue("enableScrollLock", enableScrollLock);
    GM_setValue("updateIntervalSecs", updateIntervalSecs);
    GM_setValue("statusIntervalSecs", statusIntervalSecs);
    GM_setValue("trackOkUsers", trackOkUsers);

    const iconSel = "[class*='userStatusWrap_'] > svg";
    const usersOk = function () {return $(".table-cell.status > span.okay").length;}
    const usersFallen = function () {return $(".table-cell.status > span.fallen").length;}
    const usersAway = function () { return $(".table-cell.status > span.traveling").length +
                                           $(".table-cell.status > span.abroad").length;}
    const usersInHosp = function () { return $(".hospital.not-ok").length; }

    const bsSortKey = "data-total";
    const sortOrders = ['desc', 'asc'];
    const useCustSort = true;
    var   tableReady = false;
    var   defSortOrder = GM_getValue("defSortOrder", 0);
    var   currSortOrder = sortOrders[defSortOrder];
    var   bsSortOrder = defSortOrder;

    debug("Loaded defSortOrder: ", defSortOrder, currSortOrder);
    function handleStorageChange(name, oldVal, newVal, remote) {
        debug("[handleStorageChange] ", name, oldVal, newVal, remote);
    }

    GM_addValueChangeListener("defSortOrder", handleStorageChange);

    function saveSortOrder(order, index=-1, hdr) {
        //debug("[saveSortOrder] order: ", parseInt(order), sortOrders[order], " index: ", index, " hdr: ", $(hdr));
        GM_setValue("defSortOrder", parseInt(order));
        if (index > -1) {
            GM_setValue("defSortIndex", parseInt(index));
        }

        let sortClass;
        let sortHdrType;
        if (hdr) {
            if ($(hdr).hasClass('status')) sortClass = 'status';
            else if ($(hdr).hasClass('member')) sortClass = 'member';
            else if ($(hdr).hasClass('bs')) sortClass = 'bs';
            else if ($(hdr).hasClass('ff-scouter-est-visible')) sortClass = 'ff-scouter-est-visible';
            else if ($(hdr).hasClass('lvl')) sortClass = 'lvl';
            else if ($(hdr).hasClass('days')) sortClass = 'days';
            else if ($(hdr).hasClass('level')) sortClass = 'level';

            if ($(hdr).hasClass("table-cell")) sortHdrType = 'table-cell';
            else sortHdrType = 'war-list';
        }
        if (sortClass) GM_setValue("sortClass", sortClass);
        if (sortHdrType) GM_setValue("sortHdrType", sortHdrType);
        debug("[saveSortOrder] order: ", parseInt(order), sortOrders[order], " index: ", index, " sortClass: ", sortClass, " type: ", sortHdrType);
    }

    let bsCache = JSONparse(localStorage["finally.torn.bs"]) || {};
    let hospTime = {};
    let previousSort =
        parseInt(localStorage.getItem("finally.torn.factionSort")) || 1;
    let filterFrom =
        parseInt(localStorage.getItem("finally.torn.factionFilterFrom")) || undefined;
    let filterTo =
        parseInt(localStorage.getItem("finally.torn.factionFilterTo")) || undefined;

    let loadTSFactionLock = false;
    let loadTSFactionBacklog = [];
    let loadTSFactionDone = [];
    let hospLoopCounter = 0;
    const hospNodes = [];

    const resetApiKeyLink = `<a class="t-clear h c-pointer  m-icon line-h24 left">
                                 <span id="xedx-rst-link" class="xedx-api-rst">Update BS Key</span>
                             </a>`;

    callOnContentLoaded(installExtraUiElements);
    callOnContentComplete(replaceTravelIcons);
    callOnContentComplete(addDbgContextHandlers);

    function userProfileQueryCb(responseText, ID, param) {
        let jsonObj;
        try {
            jsonObj = JSON.parse(responseText);
        } catch (e) {
            console.error("wall-batstats2 parse error: ", e, "\nresponse: ", responseText);
            //debugger;
            return;
        }
        if (jsonObj.error) return;
        if (jsonObj.faction) {
            myFacId = jsonObj.faction.faction_id;
            debug("facId: ", myFacId);
            checkWarStatus(myFacId)
        }
    }

    function shortTimeStamp(date) {
        if (!date) date = new Date();
        const timeOnly = new Intl.DateTimeFormat('en-US', {
          timeZone: "UTC",
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });

        return timeOnly.format(date);
    }

    var logApiCalls = GM_getValue("logApiCalls", false);;
    function logApiCall(msg) {
        if (logApiCalls == true)
            debug(shortTimeStamp(), " API call: ", msg);
    }

    function rwReqCb(responseText, ID, options) {
        let jsonObj = JSON.parse(responseText);
        if (jsonObj.error) {
            console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
        } else {
            let warsArray = jsonObj.rankedwars;
            let war0 = warsArray[0];
            if (war0) {
                if (war0.end == 0 || war0.winner == null) {
                    atWar = true;
                }
            }
        }
        debug("War status: ", atWar);
    }

    function checkWarStatus(facId) {
        logApiCall("Ranked wars");
        xedx_TornFactionQueryv2(facId, "rankedwars", rwReqCb);
    }

    function installExtraUiElements() {
        installTopBarLink();
        // if (trackOkUsers == true && enemyProfile == true)
        //     installUsersBar(enemyID);

        function installTopBarLink(retries=0) {
            if ($("#xedx-bar").length) return;
            if (!$("#top-page-links-list").length && retries++ < 30)
                return setTimeout(installExtraUiElements, 500);
            $("#top-page-links-list").append(resetApiKeyLink);
            $("#xedx-rst-link").on("click", function () {api_key = ''; validateApiKey();});
            initColWidths();
        }
    }

    function handleRstBtnClick() {
        api_key = '';
        validateApiKey();
    }

    function JSONparse(str) {
        if (!str) {
            debug("JSONParse ERROR: no str!");
            //debugger;
            return null;
        }
      try {
        return JSON.parse(str);
      } catch (e) {
          debug("JSON parse error: ", e);
          debug("result string: '", str, "'");

          if (xedxDevMode == true) {
              //var newWindow = window.open("", "new window", "width=400, height=200");
              //newWindow.document.write(str);
          }
      }
      return null;
    }

    function loadTSFactionsDone() {
      loadTSFactionLock = false;
      loadTSFactions();
    }

    var apiRequests = 0;                // Track how many times we've prompted for a new API key
    var loadAttempts = 0;               // How many times we've retried the fetch
    function loadTSFactions(id) {
        debug("loadTSFactions");
      if (loadTSFactionLock) {
        if (
          id &&
          loadTSFactionDone.indexOf(id) === -1 &&
          loadTSFactionBacklog.indexOf(id) === -1
        )
          loadTSFactionBacklog.push(id);

        debug("loadTSFactions - locked");
        return;
      }

      if (!id && loadTSFactionBacklog.length == 0) {
        showStatsAll();
        return;
      }

      loadTSFactionLock = true;
      id = id || loadTSFactionBacklog.shift();
      loadTSFactionDone.push(id);

      // test: force an api key error
      //let URL;
      //if (apiRequests == 0)
      //    URL = `https://www.tornstats.com/api/v2/123badkey7890123/spy/faction/${id}`;
      //else
      //    URL = `https://www.tornstats.com/api/v2/${api_Key}/spy/faction/${id}`;

      let URL = `https://www.tornstats.com/api/v2/${apiKey}/spy/faction/${id}`;
      debug("loadTSFactions - submitting: ", id);
      loadAttempts++;
      GM_xmlhttpRequest({
        method: "GET",
        url: URL,
        onload: (r) => {
            debug("loadTSFactions - response: ", id);
            let j = JSONparse(r.responseText, id);

            if (j && !j.status) {
                debug("Spy resp text: (id=", id, ") ", r.responseText);
                debug("Spy response: ", j);
            } else {
                log("Error getting spy for ", id);
            }

            if (j && !j.status) {
                GM_setValue("LastErrURL", URL);
                log("Error loading fac spies (1): ", j, " id: ", id, " attempt #", loadAttempts);

                if (loadAttempts > 3) {
                    if (j.message) {
                        log("msg: ", j.message);
                        let msg = "The server has responded with an error:\n" + j.message;
                        if (j.message.indexOf("User not found") > -1)
                            msg += "\n\nYour API key may not be valid or the one used to register with TornStats";
                        else
                            msg += "TornStats said: '" + j.message + "'";
                        msg += "\n\nWould you like to try re-entering your API key?";

                        if (apiRequests == 3) {
                            msg = "Too many retries, aborting...";
                            window.alert(msg);
                            return;
                        }
                        log("Calling confirm: ", msg);
                        if (window.confirm(msg)) {
                            apiRequests++;
                            api_key = null;
                            validateApiKey();
                            loadTSFactionsDone();
                            setTimeout(loadTSFactions(id), 100);
                            return;
                        }
                        log("going home");
                        return;
                    }
                    else {
                        log("No message? ", j);
                    }
                }
            }

          if (!j || !j.status || !j.faction) {
            log("Error loading fac spies (2): ", j, " id: ", id, " attempt #", loadAttempts);
            loadTSFactionsDone();
            return;
          }

            debug("loadTSFactions - done");
            loadAttempts = 0;
            apiRequests = 0;

            Object.keys(j.faction.members).forEach((k) =>
                addSpy(k, j.faction.members[k].spy)
            );
            localStorage["finally.torn.bs"] = JSON.stringify(bsCache);

            loadTSFactionsDone();

            tableReady = true;
            if (useCustSort) expSort('tableReady');
        },
        onabort: () => loadTSFactionsDone(),
        onerror: () => loadTSFactionsDone(),
        ontimeout: () => loadTSFactionsDone(),
      });
    }

    // What is this doing? oh, getting spies for each member, one at a time
    function loadFactions() {
      let factionIds = Array.from(
        document.querySelectorAll("[href^='/factions.php?step=profile&ID=']")
      )
        .map((a) => a.href.replace(/.*?ID=(\d+)$/, "$1"))
        .filter((v, i, a) => a.indexOf(v) === i);
      factionIds.forEach((id) => loadTSFactions(id));
    }

    function expSort(from) {
        debug("[expSort]");
        let sortClass = GM_getValue("sortClass");
        let sortList = $(".faction-info-wrap  ul.table-body > li");

        if (!$(sortList).length || !tableReady) return; // log("Not ready (", tableReady, ") or no items (", $(sortList).length, ")");

        log("expSort, class: ", sortClass, " from: ", from, " ready: ", tableReady, " len: ", $(sortList).length,
              "bsSortOrder: ", +bsSortOrder, sortOrders[+bsSortOrder], " key: ", bsSortKey);

        if (from == 'tableReady') {
            log("do tiny sort 1");
            bsSortOrder = defSortOrder;
            currSortOrder = sortOrders[+bsSortOrder];
            tinysort($(sortList), {attr: bsSortKey, order: sortOrders[+bsSortOrder]});

            log("(1) Setting defSortOrder to: ", bsSortOrder);
            saveSortOrder(bsSortOrder);
            return;
        }

        currSortOrder = sortOrders[+bsSortOrder];


        log("do tiny sort 2");
        tinysort($(sortList), {attr: bsSortKey, order: sortOrders[+bsSortOrder]});
        if (from != 'hosp-time') {
            bsSortOrder = bsSortOrder ? 0 : 1;
        }

        log("(2) Setting defSortOrder to: ", bsSortOrder);
        saveSortOrder(bsSortOrder);
    }

    // Get rid of other sort, where is it???
    function sortStats(node, sort) {
        debug("[sortStats]");
      if (useCustSort) {
          if (!tableReady) return debug("Table not ready, not sorting yet!");
          return expSort('sortStats');
      }
    }

    function addSpy(id, spy) {
      if (!spy) return;
      //debug("addSpy: ", id, " spy: ", spy);
      bsCache[id] = spy;
    }

    function updateStats(id, node, parentNode) {
      if (!node) return;

      let stats = ["N/A", "N/A", "N/A", "N/A", "N/A"];
      let time = "";
      if (bsCache[id]) {
        if (
          (filterFrom && bsCache[id].total <= filterFrom) ||
          (filterTo && bsCache[id].total >= filterTo)
        ) {
          parentNode.style.display = "none";
        } else {
          parentNode.style.display = "";
        }

        stats[0] = bsCache[id].total;
        stats[1] = bsCache[id].strength;
        stats[2] = bsCache[id].defense;
        stats[3] = bsCache[id].speed;
        stats[4] = bsCache[id].dexterity;

        let difference = new Date().getTime() / 1000 - bsCache[id].timestamp;
        if (difference < 0) {
          delete bsCache[id];
          localStorage["finally.torn.bs"] = JSON.stringify(bsCache);
          return;
        }
        if (difference > 365 * 24 * 60 * 60)
          time = Math.floor(difference / (365 * 24 * 60 * 60)) + " years ago";
        else if (difference > 30 * 24 * 60 * 60)
          time = Math.floor(difference / (30 * 24 * 60 * 60)) + " months ago";
        else if (difference > 24 * 60 * 60)
          time = Math.floor(difference / (24 * 60 * 60)) + " days ago";
        else if (difference > 60 * 60)
          time = Math.floor(difference / (60 * 60)) + " hours ago";
        else if (difference > 60)
          time = Math.floor(difference / 60) + " minutes ago";
        else time = Math.floor(difference) + " seconds ago";
      }
      else {
         //debug("No entry found in cache for id ", id);
      }

      // Save total for easy exp. sort access, but raw #
      $(node).parent().attr(bsSortKey, stats[0]);

      let units = ["K", "M", "B", "T", "Q"];
      for (let i = 0; i < stats.length; i++) {
        let stat = Number.parseInt(stats[i]);
        if (Number.isNaN(stat) || stat == 0) continue;

        for (let j = 0; j < units.length; j++) {
          stat = stat / 1000;
          if (stat > 1000) continue;

          stat = stat.toFixed(i == 0 ? (stat >= 100 ? 0 : 1) : 2);
          stats[i] = `${stat}${units[j]}`;
          break;
        }
      }

      node.innerHTML = stats[0];
      node.title = `
        <div class="finally-bs-stat">
            <b>STR</b> <span class="finally-bs-stat">${stats[1]}</span><br/>
            <b>DEF</b> <span class="finally-bs-stat">${stats[2]}</span><br/>
            <b>SPD</b> <span class="finally-bs-stat">${stats[3]}</span><br/>
            <b>DEX</b> <span class="finally-bs-stat">${stats[4]}</span><br/>
            ${time}
        </div>`;
    }

    // ============================= Updating hosp times/flight times ===============================================

    // Save status on unload, really only need travel departure times
    $(window).on('beforeunload', function() {
        let key = "enemyMembers-" + enemyID;
        GM_setValue(key, JSON.stringify(enemyMembers));
        debug("Saved enemyMembers as ", key);
    });

    function secondsToHHMMSS(secs) {
        const hours = Math.floor(secs / 3600);
        const minutes = Math.floor((secs % 3600) / 60);
        const seconds = secs % 60;

        const fh = hours.toString().padStart(2, '0');
        const fm = minutes.toString().padStart(2, '0');
        const fs = seconds.toString().padStart(2, '0');

        return `${fh}:${fm}:${fs}`;
    }

    function processWarListStatus(statusNode, id) {
        debug("[processWarListStatus] ", id, $(statusNode));

        // Process hosp times
        if (!$(statusNode).closest('li').hasClass("bs-xhosp"))
            $(statusNode).closest('li').addClass("bs-xhosp");

        let entry = enemyMembers[id];
        if (!entry) {
            debug("[processWarListStatus] missing entry, try our fac for ", id, myFacMembers);
            entry = myFacMembers[id];
        }

        if (!entry) {
            debug("[processWarListStatus] no entry for id ", id);
            return;
        } else {
            debug("[processWarListStatus] entry for id ", id, ": ", entry);
        }

        let secsUntil = entry.until ? parseInt(getSecsUntilOut(entry.until)) : 0;
        let dispTime = (secsUntil <= 0) ? entry.state : secondsToHHMMSS(secsUntil);

        debug("[processWarListStatus] secs: ", dispTime, secsUntil);
        $(statusNode).text(dispTime);
    }

    function updateNodeTime(statusNode, userId, secsOverride, isWarList) {

        if (!enemyMembers[userId]) {
            debug("[updateNodeTime] no entry for id ", userId);
            return;
        } else {
            debug("[updateNodeTime] entry for id ", userId, ": ", enemyMembers[userId]);
        }

        let secsUntil = enemyMembers[userId].until ? parseInt(getSecsUntilOut(enemyMembers[userId].until)) : 0;
        let dispTime = secondsToHHMMSS(secsUntil);

        debug("[updateNodeTime] secs: ", dispTime, secsUntil);
        $(statusNode).text(dispTime);
    }

    function secsToTime(totalSeconds) {
        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);

        if (hours < 0 || minutes < 0 || seconds < 0) {
            debug("*** ERROR bad time! ", hours, minutes, seconds, totalSeconds);
            return 'err';
        }

        let timeStr = `${hours.toString().padLeft(2, "0")}:${minutes
          .toString()
          .padLeft(2, "0")}:${seconds.toString().padLeft(2, "0")}`;
        return timeStr;
    }

    function getIdFromStatus(statusNode, warNode) {
        let id;
        //let li = warNode ? $(statusNode).closest("li") : $(statusNode).parent().parent();
        let li = $(statusNode).closest("li");
        let wrap = $(li).find("[class^='honorWrap_'] > a");
        if (!$(wrap).length) {
            li = $(statusNode).closest('li');
            wrap = $(li).find("[class^='honorWrap_'] > a");
        }
        if ($(wrap).length > 0) {
            let href = $(wrap).attr("href");
            let idx = href ? href.indexOf("XID=") : 0;
            id = idx ? href.slice(idx+4) : 0;
        }
        //debug("[getIdFromStatus] id: ", id);
        return id;
    }

    function getLiFromId(id) {
        return $(`li.table-row a[href='/profiles.php?XID=${id}']`).closest('li');
    }

    function getStatusFromId(id) {
        let myLi = getLiFromId(id);
        return $(myLi).find(".table-cell.status > span");
    }

    function getStatusTextFromId(id) {
        let statNode = getStatusFromId(id);
        return $(statNode).text();
    }

    function fixStatusText(id, text) {
        let statNode = getStatusFromId(id);
        let currText = $(statNode).text();
        if (currText != text) $(statNode).text(text);

    }

    function setClassForStatSpan(statNode) {
        let currText = $(statNode).text();
        switch (currText) {
            case 'Okay': {
                $(statNode).attr('class', 'ellipsis okay ok');
                break;
            }
            case 'Traveling': {
                $(statNode).attr('class', 'ellipsis traveling');
                break;
            }
            case 'Abroad': {
                $(statNode).attr('class', 'ellipsis abroad');
                break;
            }
        }
    }

    function getSecsUntilOut(outAt) {
        let nowSecs = new Date().getTime() / 1000;
        let diff = +outAt - nowSecs;
        return diff;
    }

    var useArrHospTimes = false;
    function memberStatusRefresh() {
        logApiCall("fac members: " + enemyID);
        xedx_TornFactionQueryv2(enemyID, 'members', memberRefreshCb);
        xedx_TornFactionQueryv2(myFacId, 'members', memberRefreshCb);

        // ====================================================

        function updateArrTime(id) {
            let ctry = getCountryFromStatus(enemyMembers[id].desc);
            let durationSecs = gettravelTimeSecsForCtry(ctry);
            if (durationSecs <= 0) {
                enemyMembers[id].dur = 0;
                enemyMembers[id].estArr = 0;
                return;
            }
            enemyMembers[id].dur = durationSecs;
            enemyMembers[id].estArr = parseInt(enemyMembers[id].estDpt) + durationSecs * 1000;

            let arrDate = new Date(enemyMembers[id].estArr);
            debug(id, " started flying to ", ctry, " at ", shortTimeStamp());
            debug("Est arrival: ", shortTimeStamp(arrDate), arrDate.toString());
        }

        function memberRefreshCb(responseText, ID, param) {
            let jsonObj = JSON.parse(responseText);
            if (jsonObj.error)
                return log("ERROR: Bad result for startRefreshTimer: ", responseText);

            let useArray = enemyMembers;           // Copy-to array (actually a JSON object of arrays)
            if (ID == myFacId)
                useArray = myFacMembers;

            let membersArray = jsonObj.members;    // Copy-from array, from server

            useArray.lastUpdate = (new Date().getTime());
            membersArray.forEach(member => {
                let secsUntil = member.status.until ? getSecsUntilOut(member.status.until) : 0;
                let currState = member.status.state;
                let prevState = useArray[member.id].prevState;

                useArray[member.id].id = member.id;
                useArray[member.id].name = member.name;
                useArray[member.id].status = member.last_action.status;
                useArray[member.id].state = member.status.state;
                useArray[member.id].desc = member.status.description;
                useArray[member.id].until = member.status.until;
                useArray[member.id].revivable = member.is_revivable;
                useArray[member.id].ed = member.has_early_discharge;
                useArray[member.id].secsUntil = secsUntil;
                useArray[member.id].prevState = currState;

                //debug("Member refresh, id: ", member.id, " secsUntil: ", secsUntil);

                let logAfter = false;
                let noLog = (!prevState || prevState == '') ? true : false;
                if (currState != prevState) {
                    if (noLog == false) {
                        debug("***** State Change! From ", prevState, " to ", currState, " *****");
                        debug("Member: ", member);
                        debug("Entry: ", useArray[member.id]);
                    }
                    // ********** Re-sort
                    if (currState == 'Okay') {
                        debug("Calling sort: ", bsSortOrder, currSortOrder, defSortOrder);
                        expSort("hosp-time");
                    }
                    logAfter = true;
                    if (currState == 'Traveling') { //started flying since last check
                        useArray[member.id].estDpt = new Date().getTime();
                        updateArrTime(member.id);
                    } else if (prevState == 'traveling') { // landed
                        //clear times, notify?
                    }
                }

                if (currState != 'Traveling') {
                    useArray[member.id].estDpt = 0;
                    useArray[member.id].estArr = 0;
                    useArray[member.id].tFirstSeen = 0;
                }

                if (logAfter == true && noLog == false)
                    debug("New Entry: ", useArray[member.id]);

                // Sync status text with state if they disagree
                if (currState == 'Traveling' ||
                   currState == 'Abroad') fixStatusText(member.id, member.status.state);
                if (getStatusTextFromId(member.id) == '') fixStatusText(member.id, member.status.state);
            });
            useArrHospTimes = true;
         }
    }

    function getAbsPos(element) {
        let rect = $(element)[0].getBoundingClientRect();
        let absTop = rect.top + window.scrollY;
        let absLeft = rect.left + window.scrollX;
        return { top: absTop, left: absLeft };
    }

    function addDbgContextHandlers(retries=0) {
        // For debugging: add handler to status cells in the table
        if (!$("ul > li .table-cell.status").length) {
            if (retries++ < 30) return setTimeout(addDbgContextHandlers, 500, retries);
            return log("[addDbgContextHandlers] timed out.");
        }

        $("ul > li .table-cell.status").on('contextmenu', handleStatusContext);

        function handleStatusContext(e) {
            e.stopPropagation();
            e.preventDefault();

            let target = $(e.currentTarget);
            let statusNode = $(target).find('span')[0];
            let id = getIdFromStatus(statusNode);
            let entry = enemyMembers[id];
            //let pos = $(target).position();
            let pos = getAbsPos(target);

            debug("target: ", $(target));
            debug("pos: ", pos);
            debug("entry: ", entry);

            let txt1, txt2, txt3, txt4;
            if (entry.state=='Traveling') {
                txt1 = 'Estimated departure: ' + shortTimeStamp((new Date(entry.estDpt)));
                txt2 = 'Estimated arrival: ' + shortTimeStamp((new Date(entry.estArr)));
            }

            let updated = shortTimeStamp(enemyMembers.lastUpdate);
            let msg = `<span style="display: flex; flex-direction: column; justify-content: center;">
                           <span class="msg-box-sp">${entry.name} [${entry.id}]</span>
                           <span class="msg-box-sp">${entry.desc}</span>` +
                           (txt1 ? `<span class="msg-box-sp">${txt1}</span>` : ``) +
                           (txt2 ? `<span class="msg-box-sp">${txt2}</span>` : ``) +
                           `<span class="msg-box-sp">Last updated: ${updated}</span>
                       </span>`;

            let usePos = {left: pos.left + 'px', top: pos.top + 'px'};
            messageBox(msg, usePos);

            return false;
        }
    }

    function getEnemyId() {
        let link = $("#faction_war_list_id > li[class*='warListItem_'] > div > div > div > a[class*='opponentFactionName_']");
        //debug("[getEnemyId] link: ", $(link));
        let href =$(link).attr("href");
        let id = href ? href.split("ID=")[1] : null;
        //debug("[getEnemyId] href: ", href, " parts: ", (href ? href.split("ID=") : 'NA'), " id: ", id);
        return id;
    }

    // Build our own private members object, for easier lookups
    var refreshTimer = 0;
    var refreshTimerDelay = 5000;    // 12 per minute
    function startRefreshTimer(retries=0) {
        debug("[startRefreshTimer] enemyID: ", enemyID);
        if (!enemyID) {
            enemyID = getEnemyId();
        }
        if (!enemyID && retries++ < 25) {
            return setTimeout(startRefreshTimer, 250, retries);
        }
        if ( /*ourProfile == true ||*/ !enemyID || getPageTab() == 'info') {
            debug("[startRefreshTimer] ourprofile: ", ourProfile, " enemyID: ", enemyID, " page: ", getPageTab());
            return log("Not on enemy page, not starting timer:\n", location.href);
        }

        logApiCall("fac members: " + enemyID);
        xedx_TornFactionQueryv2(enemyID, 'members', startRefreshCb);
        xedx_TornFactionQueryv2(myFacId, 'members', startRefreshCb);

        function startRefreshCb(responseText, ID, param) {
            debug("[startRefreshCb] ID: ", ID);
            let jsonObj = JSON.parse(responseText);
            if (jsonObj.error)
                return log("ERROR: Bad result for startRefreshTimer: ", responseText);

            let savedArray = null;
            if (ID != myFacId) {
                let key = "enemyMembers-" + enemyID;
                savedArray = JSON.parse(GM_getValue(key, JSON.stringify({})));
            }

            let useArray = (ID != myFacId) ? enemyMembers : myFacMembers;;
            let membersArray = jsonObj.members;
            useArray.lastUpdate = (new Date().getTime());
            membersArray.forEach(member => {
                let secsUntil = member.status.until ? getSecsUntilOut(member.status.until) : 0;
                useArray[member.id] =
                    { id: member.id, name: member.name, status: member.last_action.status,  state: member.status.state,
                     desc: member.status.description, prevState: '', loadedAt: (new Date().getTime()),
                     estDpt: 0, estArr: 0, dur: 0, tFirstSeen: (member.status.state == 'Traveling' ? useArray.lastUpdate : 0),
                     until: member.status.until, revivable: member.is_revivable, ed: member.has_early_discharge, secsUntil: secsUntil };

                if (savedArray && savedArray[member.id]) {
                    let before = savedArray[member.id];
                    if ((before.estArr && before.estArr > useArray.lastUpdate)  || member.status.state == 'Traveling') {
                        useArray[member.id].dur = before.dur;
                        if (!before.dur) {
                            let ctry = getCountryFromStatus(member.status.description);
                            useArray[member.id].dur = gettravelTimeSecsForCtry(ctry);
                        }
                        useArray[member.id].estDpt = before.estDpt;
                        useArray[member.id].estArr = before.estArr ? before.estArr :
                                                         (before.estDpt && useArray[member.id].dur) ?
                                                         (parseInt(before.estDpt) + useArray[member.id].dur * 1000) : 0;
                        useArray[member.id].tFirstSeen = before.tFirstSeen;
                    }
                }
            });

            if (ID == myFacId) return;

            if (refreshTimer) clearInterval(refreshTimer);
            refreshTimer = setInterval(memberStatusRefresh, refreshTimerDelay);
        }
    }

    var verifyCounter = 0;
    var inUpdate = false;
    function updateHospTimers() {
        let haveWarList = false;
        let usersInHosp = $(".hospital.not-ok");
        //debug("[updateHospTimers] list: ", $(usersInHosp).length, inUpdate);
        if (inUpdate == true) return debug("[updateHospTimers] already inUpdate");
        inUpdate = true;

        // There are two 'classes' of the nodes with a hosp status, the smaller ones in
        // the 'war page' view, two columns side-by side, with no status icons, and thje
        // full page views. The full page views can directly copy hosp time left from the
        // hosp icon, the other needs to grap the "until" (released? forgot the name0.
        for (let idx=0; idx < $(usersInHosp).length; idx++) {
            let statusNode = $(usersInHosp)[idx];

            let isWarList = $($(statusNode).closest("li.descriptions")).length > 0;
            haveWarList = haveWarList || isWarList;
            if (haveWarList && !refreshTimer) {
                debug("[updateHospTimers] starting refresh timer");
                startRefreshTimer();
            }

            let id = $(statusNode).closest('li').attr("data-id");

            //debug("[updateHospTimers] node: ", $(statusNode), " warList: ", isWarList, " id: ", id);
            if (!id) {
                id = getIdFromStatus(statusNode, isWarList);
                $(statusNode).closest('li').attr("data-id", id);
            }

            if (!id) debug("ERROR: No ID found for ", $(statusNode));

            let done = false;
            if (isWarList == true && id) {
                debug("processing war view node: ", $(statusNode));
                processWarListStatus(statusNode, id);
                done = true;
                //return;
            }

            if (done == false) {
                if (!$(statusNode).parent().parent().hasClass("bs-xhosp"))
                    $(statusNode).parent().parent().addClass("bs-xhosp");

                if (updateNodeTime(statusNode, id, 0, false) == 0) {
                    if (id && enemyMembers[id])
                       fixStatusText(id, enemyMembers[id].state);
                    setClassForStatSpan(getStatusFromId(id));
                }
            }
        }

        doExpiredCleanup();
        useArrHospTimes = false;
        inUpdate = false;

        setTimeout(updateHospTimers, 1000);
    }

    function doExpiredCleanup() {
        let list1 = $(".bs-xhosp:has('.hospital.not-ok')");
        let list2 = $(".bs-xhosp:not(:has('.hospital.not-ok'))");

        if ($(list2).length) {
            debug("***** Found expired nodes! ", $(list2));
            for (let idx=0; idx<$(list2).length; idx++) {
                let li = $(list2)[idx];
                let statusNode = $(li).find(".table-cell.status > span");
                debug("Exp node: ", $(li), "\nspan: ", $(statusNode),  "\ntext: ", $(statusNode).text());
                $(li).removeClass("bs-xhosp");
                $(statusNode).removeClass("blink30").removeClass("blink2").removeClass("blink1");
                debug("***** Removed classes from: ", $(statusNode));
            }
        }
    }

    // =====================================================================================================

    function updateStatus(id, node) {
      if (!node) return;
      if (hospNodes.find((h) => h[0] == id)) return;
      hospNodes.push([id, node]);
    }

    function showStats(node) {
        //debug("[showStats] node: ", $(node));
        if (!node) return;

        let id = node
            .querySelector('a[href*="XID"]')
            .href.replace(/.*?XID=(\d+)/i, "$1");
        let bsNode = node.querySelector(".bs") || document.createElement("div");
        let statusNode = node.querySelector(".status");

        updateStats(id, bsNode, node);
        updateStatus(id, statusNode);

        if (bsNode.classList.contains("bs")) {
            return;
        }

        // Adds a touch handler to the BS element to open attack page in new tab
        bsNode.className = "table-cell bs level lvl left iconShow finally-bs-col";
        let iconsNode = node.querySelector(".user-icons, .member-icons, .points");
        iconsNode.parentNode.insertBefore(bsNode, iconsNode);  let isMobile = false;
        bsNode.addEventListener("touchstart", () => (isMobile = true));
        bsNode.addEventListener("click", () => {
            if (isMobile) return;
                window.open(`loader.php?sid=attack&user2ID=${id}`, "_newtab");
        });
        bsNode.addEventListener("dblclick", () => {
            window.open(`loader.php?sid=attack&user2ID=${id}`, "_newtab");
        });
    }

    function showStatsAll(node) {
        debug("[showStatsAll]");
      if (!node)
        node = Array.from(
          document.querySelectorAll(".f-war-list .members-list, .members-list")
        );
      if (!node) return;

      if (!(node instanceof Array)) {
        node = [node];
      }

      node.forEach((n) =>
          n.querySelectorAll(
            ".your:not(.row-animation-new), .enemy:not(.row-animation-new), .table-body > .table-row"
          )
          .forEach((e) => showStats(e))
      );
    }

    function watchWall(observeNode) {
      if (!observeNode) return;

      loadFactions();

      let parentNode = observeNode.parentNode.parentNode.parentNode;
      let factionNames = parentNode.querySelector(".faction-names");
      if (factionNames && !factionNames.querySelector(".finally-bs-swap")) {
        let swapNode = document.createElement("div");
        swapNode.className = "finally-bs-swap";
        swapNode.innerHTML = "&lt;&gt;";
        factionNames.appendChild(swapNode);
        swapNode.addEventListener("click", () => {
          parentNode
            .querySelectorAll(
              ".name.left, .name.right, .tab-menu-cont.right, .tab-menu-cont.left"
            )
            .forEach((e) => {
              if (e.classList.contains("left")) {
                e.classList.remove("left");
                e.classList.add("right");
              } else {
                e.classList.remove("right");
                e.classList.add("left");
              }
            });

            log("[watchWall] click handler");
        });

        let filterNode = document.createElement("div");
        filterNode.className = "finally-bs-filter input-money-group no-max-value";
        let filterFromInput = document.createElement("input");
        filterFromInput.className = "input-money";
        filterFromInput.placeholder = "Filter BS from";
        filterFromInput.value =
          localStorage.getItem("finally.torn.factionFilterFrom") || "";
        let filterToInput = document.createElement("input");
        filterToInput.className = "input-money";
        filterToInput.placeholder = "Filter BS to";
        filterToInput.value =
          localStorage.getItem("finally.torn.factionFilterTo") || "";
        filterNode.appendChild(filterFromInput);
        filterNode.appendChild(filterToInput);
        factionNames.appendChild(filterNode);

        function filterFromTo() {
            debug("[filterFromTo]");
          function formatInput(input) {
            let value = input.value.toLowerCase();
            let valueNum = value.replace(/[^\d]/g, "");

            let multiplier = 1;
            if (value.indexOf("k") !== -1) multiplier = 1000;
            else if (value.indexOf("m") !== -1) multiplier = 1000000;
            else if (value.indexOf("b") !== -1) multiplier = 1000000000;
            else if (value.indexOf("t") !== -1) multiplier = 1000000000000;

            valueNum *= multiplier;
            input.value = valueNum > 0 ? valueNum.toLocaleString("en-US") : "";

            return valueNum;
          }

          filterFrom = formatInput(filterFromInput);
          filterTo = formatInput(filterToInput);
          localStorage.setItem("finally.torn.factionFilterFrom", filterFrom || "");
          localStorage.setItem("finally.torn.factionFilterTo", filterTo || "");

          showStatsAll();
        }
        filterFromTo();

        filterFromInput.addEventListener("keyup", filterFromTo);
        filterToInput.addEventListener("keyup", filterFromTo);
      }

      let titleNode = observeNode.parentNode.querySelector(".title, .c-pointer");
      let lvNode = titleNode.querySelector(".level");
      lvNode.childNodes[0].nodeValue = "Lv";

      if (!titleNode.querySelector(".bs")) {
        let bsNode = lvNode.cloneNode(true);
        bsNode.classList.add("bs");
        bsNode.childNodes[0].nodeValue = "BS";
        titleNode.insertBefore(
          bsNode,
          titleNode.querySelector(".user-icons, .points")
        );
        if (bsNode.childNodes.length > 1) {
          let orderClass = bsNode.childNodes[1].className.match(
            /(?:\s|^)((?:asc|desc)(?:[^\s|$]+))(?:\s|$)/
          )[1];
          bsNode.childNodes[1].classList.remove(orderClass);
          for (let i = 0; i < titleNode.children.length; i++) {
            titleNode.children[i].addEventListener("click", (e) => {
              setTimeout(() => {
                let sort = i + 1;
                let sortIcon = e.target.querySelector("[class*='sortIcon']");
                let desc = sortIcon
                  ? sortIcon.className.indexOf("desc") === -1
                  : false;

                // This controls sort direction, apparently from already existing icon.
                // For me seems to start ascending, I'd prefer descending, heavies on top.
                sort = desc ? sort : -sort;
                localStorage.setItem("finally.torn.factionSort", sort);

                if (!e.target.classList.contains("bs"))
                  document
                    .querySelectorAll("[class*='finally-bs-activeIcon']")
                    .forEach((e) => e.classList.remove("finally-bs-activeIcon"));
                //if (Math.abs(sort) != 3) document.querySelectorAll("[class*='finally-bs-activeIcon']").forEach((e) => e.classList.remove("finally-bs-activeIcon"));
              }, 100);
            });
          }

            $(bsNode).attr("id", "bs-hdr-node");
          // Add click to sort listener. When ready w/experimental
          // sort, replace w/my own fn and handle all colums
          // Can prob remove a lot of the code right above this, also...
            //
            // Isn't called???
          /*
          bsNode.addEventListener("click", () => {
            log("Sort click");
            useCustSort ? expSort('click') : sortStats(observeNode);
            bsSortOrder = bsSortOrder ? 0 : 1;
          });
          */

          let title = titleNode.children[Math.abs(previousSort) - 1];
          let sortIcon = title.querySelector("[class*='sortIcon']");
          let desc = sortIcon ? sortIcon.className.indexOf("desc") !== -1 : false;
          let active = sortIcon
            ? sortIcon.className.indexOf("activeIcon") !== -1
            : false;

          let x = 0;
          if (title.classList.contains("bs") && observeNode.querySelector(".enemy"))
            x = 0; //funny edge case, dont ask :)
          //if (Math.abs(previousSort) == 3 && observeNode.querySelector(".enemy")) x = 0; //funny edge case, dont ask :)
          else if (!active && previousSort < 0) x = 1;
          else if (!active) x = 2;
          else if (previousSort < 0 && !desc) x = 1;
          else if (previousSort > 0 && desc) x = 1;

          for (; x > 0; x--) {
            title.click();
          }
        }
      }

      showStatsAll(observeNode);

      let prevSortCheck = "";
      const mo = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          for (const node of mutation.addedNodes) {
            if (
              node.classList &&
              (node.classList.contains("your") || node.classList.contains("enemy"))
            ) {
              showStats(node);
            }
          }
        });

        let sort = Array.from(observeNode.querySelectorAll('a[href*="XID"]'))
          .map((a) => a.href)
          .join(",");
        if (
          prevSortCheck != sort &&
          observeNode.parentNode.querySelector(".finally-bs-activeIcon")
        ) {
          mo.disconnect();
          debug("In mutation, calling sort");
          useCustSort ? expSort('mutation') : sortStats(observeNode, observeNode.finallySort);
          prevSortCheck = Array.from(observeNode.querySelectorAll('a[href*="XID"]'))
            .map((a) => a.href)
            .join(",");
          mo.takeRecords();
          mo.observe(observeNode, { childList: true, subtree: true });
        }
      });

      mo.observe(observeNode, { childList: true, subtree: true });
    }

    function watchWalls(observeNode) {
      if (!observeNode) return;

      observeNode.querySelectorAll(".members-list").forEach((e) => watchWall(e));

      new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          for (const node of mutation.addedNodes) {
            node.querySelector &&
              node.querySelectorAll(".members-list").forEach((w) => watchWall(w));

              if ($(node).hasClass("descriptions")) addWarListClickHandlers();
          }
        });
      }).observe(observeNode, { childList: true, subtree: true });
    }

    function memberList(observeNode) {
      if (!observeNode) return;
      loadFactions();

      let titleNode = observeNode.querySelector(".table-header");
      if (!titleNode || titleNode.querySelector(".bs")) return;

      let bsNode = document.createElement("li");
      bsNode.className = "table-cell bs torn-divider divider-vertical";
      bsNode.innerHTML = "BS";
      titleNode.insertBefore(bsNode, titleNode.querySelector(".member-icons"));
      for (let i = 0; i < titleNode.children.length; i++) {
        titleNode.children[i].addEventListener("click", (e) => {
          let sort = i + 1;
          sort = e.target.querySelector("[class*='asc']") ? -sort : sort;
          localStorage.setItem("finally.torn.factionSort", sort);
        });
      }

      bsNode.addEventListener("click", (e) => {
          debug("on click, calling sort");
          useCustSort ? expSort('click') : sortStats(observeNode);
      });
      if (previousSort >= 0) {
        titleNode.children[previousSort - 1].click();
        titleNode.children[previousSort - 1].click();
      } else if (previousSort < 0) titleNode.children[-previousSort - 1].click();

      observeNode
        .querySelectorAll(".table-body > .table-row")
        .forEach((e) => showStats(e));
    }

    // ======================== Updated methods =======================================

    setTimeout(updateHospTimers, 1000);
    startRefreshTimer();
    //var hospTimer = setInterval(updateHospTimers, 1000);

    // ================================================================================

    memberList(document.querySelector(".members-list"));
    watchWalls(document.querySelector(".f-war-list"));

    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        for (const node of mutation.addedNodes) {
          memberList(node.querySelector && node.querySelector(".members-list"));
          watchWalls(node.querySelector && node.querySelector(".f-war-list"));
        }
      });
    }).observe(document.body, { childList: true, subtree: true });

    const oldFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async (url, init) => {
      if (
        !url.includes("step=getwarusers") &&
        !url.includes("step=getProcessBarRefreshData")
      )
        return oldFetch(url, init);

      let response = await oldFetch(url, init);
      let clone = response.clone();
      clone.json().then((json) => {
        let members = null;
        if (json.warDesc) members = json.warDesc.members;
        else if (json.userStatuses) members = json.userStatuses;
        else return;

        if (!members) return;

        Object.keys(members).forEach((id) => {
          let status = members[id].status || members[id];
          id = members[id].userID || id;
          if (status.text == "Hospital") hospTime[id] = status.updateAt;
          else delete hospTime[id];
        });

        showStatsAll();
      });

      return response;
    };

    const oldWebSocket = unsafeWindow.WebSocket;
    unsafeWindow.WebSocket = function (...args) {
      const socket = new oldWebSocket(...args);
      socket.addEventListener("message", (event) => {
        let json = JSONparse(event.data);

        // if (!Object.keys(json).length) {
        //     debug("No data in event ", event);
        //     //debug("data() ", event.target.data());
        // } else {
        //     debug("Event data keys: ", Object.keys(json), "\nEvent: ", event);
        // }

        if (!json?.result?.data?.data?.message?.namespaces?.users?.actions?.updateStatus?.status)
          return;

        let id =
          json.result.data.data.message.namespaces.users.actions.updateStatus.userId;
        let status =
          json.result.data.data.message.namespaces.users.actions.updateStatus.status;

        if (status.text == "Hospital") hospTime[id] = status.updateAt;
        else delete hospTime[id];

        showStatsAll();
      });
      return socket;
    };

    //=======================================================================
    // The 'Travel Icons' part of this script taken from another of mine.
    // If travelling or abroad, replaces the generic globe with country
    // icon so can easily see where they are going.
    //=======================================================================

    // Uses the description from User->basic, status.description
    function getCountryFromStatus(desc) {
        if (desc.indexOf("United Kingdom") > -1) return 'UK';
        if (desc.indexOf("Mexico") > -1) return 'Mexico';
        if (desc.indexOf("Argentina") > -1) return 'Argentina';
        if (desc.indexOf("Canada") > -1) return 'Canada';
        if (desc.indexOf("Cayman") > -1) return 'Caymans';
        if (desc.indexOf("Switzerland") > -1) return 'Zurich';
        if (desc.indexOf("Japan") > -1) return 'Japan';
        if (desc.indexOf("China") > -1) return 'China';
        if (desc.indexOf("UAE") > -1) return 'UAE'; // ???
        if (desc.indexOf("Arab") > -1) return 'UAE'; // ???
        if (desc.indexOf("South") > -1) return 'SA'; // ??
        if (desc.indexOf("Africa") > -1) return 'SA'; // ??
        if (desc.indexOf("Hawaii") > -1) return 'Hawaii';

        return null;
    }

    // Images for country flags
    function getTornFlag() {
        return `<li style=margin-bottom: 0px;"><img class="flag selected bs2" src="/images/v2/travel_agency/flags/fl_torn.svg"
                country="torn" alt="Torn" title="Torn"></li>`;
    }

    const ctryMap = { "UK": { flag: "uk", ctry: "united_kingdom", title: "United Kingdom" },
                      "Mexico": { flag: "mexico", ctry: "mexico", title: "Mexico" },
                      "Canada": { flag: "canada", ctry: "canada", title: "Canada" },
                      "Argentina": { flag: "argentina", ctry: "argentina", title: "Argentina" },
                      "Hawaii": { flag: "hawaii", ctry: "hawaii", title: "Hawaii" },
                      "Caymans": { flag: "cayman", ctry: "cayman_islands", title: "Cayman Islands" },
                      "Zurich": { flag: "switzerland", ctry: "switzerland", title: "Switzerland" },
                      "Japan": { flag: "japan", ctry: "japan", title: "Japan" },
                      "China": { flag: "china", ctry: "china", title: "China" },
                      "UAE": { flag: "uae", ctry: "uae", title: "UAE" },
                      "SA": { flag: "south_africa", ctry: "south_africa", title: "South Africa" }
                    };

    // type: 'std', 'pi', 'wlt', 'bct'
    function gettravelTimeSecsForCtry(ctry, type='pi') {
        const travelTime = { "Mexico": {std: "26min", pi: "18min", wlt: "13min", bct: "8min"},
                           "Caymans": {std: "35min", pi: "25min", wlt: "18min", bct: "11min"},
                           "Canada": {std: "41min", pi: "29min", wlt: "20min", bct: "12min"},
                           "Hawaii": {std: "2h 14min", pi: "1h 34min", wlt: "1h 7min", bct: "40min"},
                           "UK": {std: "2h 39min", pi: "1h 51min", wlt: "1h 20min", bct: "48min"},
                           "Argentina": {std: "2h 47min", pi: "1h 57min", wlt: "1h 23min", bct: "50min"},
                           "Zurich": {std: "2h 55min", pi: "2h 3min", wlt: "1h 28min", bct: "53min"},
                           "Japan": { std: "3h 45min", pi: "2h 38min", wlt: "1h 53min", bct: "1h 8min"},
                           "China": {std: "4h 2min", pi: "2h 49min", wlt: "2h 1min", bct: "1h 12min"},
                           "UAE": {std: "4h 31min", pi: "3h 10min", wlt: "2h 15min", bct: "1h 21min"},
                           "SA": {std: "4h 57min", pi: "3h 28min", wlt: "2h 29min", bct: "1h 29min"},
                         };

        let entry = travelTime[ctry];
        let timeStr = entry ? entry[type] : null;
        let secs = timeStr ? travelTimeStrToSec(timeStr) : -1;

        //debug("Travel time for ", ctry, " [", type, "] ", secs, timeStr, entry);
        return secs;

        function travelTimeStrToSec(timeStr) {
            if (!timeStr) return 0;
            let parts = timeStr.split(' ');
            if (parts.length == 1) {
                let min = parseInt(parts[0]);
                return min * 60;
            } else if (parts.length > 1) {
                let hr = parseInt(parts[0]);
                let min = parseInt(parts[1]);
                return hr * 3600 + min * 60;
            }
            return 0;
        }
    }


    function getAbroadFlag(country) {
        let entry = ctryMap[country];
        if (!entry) return;

        return `<li class="bs2" style="margin-bottom: 0px; z-index: 9999;"><img class="flag selected" src="/images/v2/travel_agency/flags/fl_${entry.flag}.svg"
                country="${entry.ctry}" alt="${entry.title}" title="${entry.title}"></li>`;
    }

    function replaceDestFlag(userId, iconLi) {
        if (ourProfile == true || getPageTab() == 'info') return;
        let entry = enemyMembers[userId];
        if (!entry) {
            return debug("Error: no entry for user ID ", userId);
        }
        let country = getCountryFromStatus(entry.desc);
        if (country) {
            if (entry.desc.indexOf('eturning') > -1)
                $(iconLi).replaceWith($(getTornFlag()));
            else {
                //const targetPos = $(iconLi).position();
                //$(iconLi).parent().css("position", "relative");
                $(iconLi).css("display", "none");

                //$(iconLi).replaceWith($(getAbroadFlag(country)));

                //let cell = $(iconLi).closest(".table-cell");

                //if (!$(iconLi).parent().next().hasClass("bs2")) {
                //if (!$(iconLi).closest("ul").parent().next().hasClass("bs2")) {

                    //debug("[replaceDestFlag] add new flag, pos: ", targetPos);

                if (!$(iconLi).next().hasClass("bs2")) {
                    let newNode = getAbroadFlag(country);
                    //$(newNode).css({ top: targetPos.top, left: targetPos.left });
                    $(newNode).addClass("tmp-new-flag");
                    $(iconLi).after($(newNode));

                    debug("[replaceDestFlag] new node: ", $(newNode));


                    // $(iconLi).closest("ul").parent().after($(newNode));
                    // let el = $(iconLi).closest("ul").parent().next();
                    // debug("[replaceDestFlag] el: ", $(el));
                }
            }
        }
    }

    function replaceDestText(userId, textNode) {
        //if (ourProfile == true || getPageTab() == 'info') return;
        let entry = enemyMembers[userId];
        if (!entry) entry = myFacMembers[userId];
        if (!entry) {
            return debug("Error: no entry for user ID ", userId);
        }
        let country = getCountryFromStatus(entry.desc);
        if (country) {
            $(textNode).text(country);
        }
    }

    // Can get this from members array!
    // Need to handle war page if open - #faction_war_list_id > li.descriptions
    var travelTimer;
    var flagStyleAdded = false;
    function replaceTravelIcons(retries=0) {
        if (ourProfile == true || getPageTab() == 'info') return;
        if (!travelTimer)
            travelTimer = setInterval(replaceTravelIcons, 250);
        let travelIcons = document.querySelectorAll("[id^='icon71___']");

        if (flagStyleAdded == false) {
            flagStyleAdded = true;
            GM_addStyle(`
                li[id^="icon71"] {
                    display: none !important;
                }
                .bs2 {
                    /*position: absolute;*/
                    /*border: 1px solid green;*/
                }
            `);
        }

        //debug("[replaceTravelIcons] icons: ", $(travelIcons));

        for (let i=0; i < $(travelIcons).length; i++) {
            let iconLi = $(travelIcons)[i];
            if ($(iconLi).find(".bs2").length > 0) {
            //if ($(iconLi).parent().next().hasClass("bs2")) {
                //debug("Found travel globe: ", $(iconLi).find(".bs2"));
                continue;
            }
            let memberRow = $(iconLi).closest("li.table-row");
            let honorWrap = $(memberRow).find("[class*='honorWrap'] > a");
            let fullId = $(honorWrap).prop("href");
            if (!fullId) {log("no fullId!"); continue;}

            let id = fullId.match(/\d+/)[0];
            replaceDestFlag(id, iconLi);
        }

        // War page view, textt only
        let warPgTravel = $("#faction_war_list_id > li.descriptions .traveling");
        let warPgAbroad = $("#faction_war_list_id > li.descriptions .abroad");

        const combinedArray = $(warPgTravel).add($(warPgAbroad));
        for (let i=0; i < $(combinedArray).length; i++) {
            let div = combinedArray[i];
            let a = $(div).closest('li').find("[class*='honorWrap_'] > a");
            let href = $(a).attr("href");
            if (!href) continue;
            let id = href.match(/\d+/)[0];
            replaceDestText(id, div);
        }

    }

    // ====================== Fix up column widths ========================
    //
    // The column widths will be offset if TT is installed, this attempts
    // to dynamically size the columns and also place the"sort"icon in the
    // correct place.
    //
    var tornToolsPresent = false;  // Has TT columns
    var ffScouterPresent = false;
    var addlFirstColWidth = 0;     // with TT installed, may have div.tt-member-index column
    const sortIconSel = "div[class^='sortIcon_']";


    var bsTableHeader;             // BS header element, header of table
    var activeClass;
    var currSortDir = 'asc';
    var ascSortClassName;
    var descSortClassName;
    var currSortDirClassName;

    function findActiveIconClasses(retries=0) {
        let found = false;
        let classList;
        const tableHeader = $(".members-list > ul.table-header");
        let headerColumnList = $(tableHeader).find("li");
        bsTableHeader = $(headerColumnList)[2];
        let activeSortIcon = $(tableHeader).find("[class*='activeIcon']");
        let list = $(activeSortIcon).attr("class");
        if (list && list.length) {
            classList = $(activeSortIcon).attr("class").split(/\s+/);
            for (let idx=0; idx < classList.length; idx++) {
                if (classList[idx].indexOf('active') > -1) {
                    activeClass = classList[idx];
                    found = true;
                    debug("[findActiveIconClasses] activeClass: ", activeClass, " list: ", classList);
                    break;
                }
            }

            currSortDirClassName = getAscDescClassName(classList);
            debug("[findActiveIconClasses] currSortDirClassName: ", currSortDirClassName);
            getSortDirClassNames();
        }

        if (!found) {
            if (retries++ < 30) return setTimeout(findActiveIconClasses, 500, retries);
            return log("ERROR: Didn't find active icons!");
        }

        debug("Appending sort icon: ", $(activeSortIcon), " table hdr: ", $(bsTableHeader),
              " activeClass: ", activeClass);
        debug("cust sort: ", useCustSort, " currSortOrder: ", currSortOrder, " defSortOrder: ", defSortOrder, " bsSortOrder: ", bsSortOrder);

        let clone = $(activeSortIcon).clone();
        if (currSortOrder == 'asc')
            $(clone).addClass(ascSortClassName).removeClass(descSortClassName);
        else
            $(clone).addClass(descSortClassName).removeClass(ascSortClassName);

        debug("clone: ", $(clone), " hdr: ", $(bsTableHeader));
        $(bsTableHeader).append($(clone));
        $(activeSortIcon).removeClass(activeClass);

        // Is this to sort twice??
        if (!useCustSort) {
            $(bsTableHeader).click();
            $(bsTableHeader).click();
        }
    }

    /*
    function adjustHdrsForFfScouter(retries=0) {
        if ($(".ff-scouter-est-hidden").length > 0 || $(".ff-scouter-ff-visible").length > 0) {
            ffScouterPresent = true;
            GM_addStyle(
                `.d .faction-info-wrap .members-list .table-cell.position {
                    width: 12% !important;
                 }`
            );
            debug("FFScouter present, widths adjusted");
        }
        if (ffScouterPresent == false && retries++ < 25) setTimeout(adjustHdrsForFfScouter, 5000, retries);
    }
    */


    // function watchForWarList(observeNode) {
    //     new MutationObserver((mutations) => {
    //         mutations.forEach((mutation) => {
    //             for (const node of mutation.addedNodes) {
    //                 //log("Node added: ", $(node));
    //                 if ($(node).hasClass("descriptions")) {
    //                     log("Node added: ", $(node));
    //                     addWarListClickHandlers();
    //                 }
    //             }
    //         });
    //     }).observe($("#faction_war_list_id")[0], { childList: true, subtree: true });
    // }

    var warListTimer;
    var needWarListHandlers = true;
    function addWarListClickHandlers() {
        let list =  $("#faction_war_list_id li.descriptions .members-cont > div > div:not(.clear):not(.attack)");
        //log("[addWarListClickHandlers] ", $(list), needWarListHandlers);
        if (needWarListHandlers == true) {
            for (let idx=0; idx<$(list).length; idx++) {
                //debug("Add war list sort handler to ", $(list[idx]));
                $(list[idx]).off("click click.xedx");
                $(list[idx]).on("click.xedx click", handleTableHeaderClick);
            }
            needWarListHandlers = false;
        }
        if (!$(list).length) needWarListHandlers = true;

        if (!warListTimer)
            warListTimer = setInterval(addWarListClickHandlers, 2000);
        //watchForWarList();

        // Add observer if not found, for $("#faction_war_list_id .desc-wrap")
        // added to $("#faction_war_list_id")

        // Special for status hdr, for now
        // $(".table-cell.status.torn-divider")
    }

    function addWallClickHandlers() {
        let list = $(".members-list > ul.table-header > li.table-cell");
        //log("[addWallClickHandlers] ", $(list));
        for (let idx=0; idx<=8; idx++) {
            //debug("Add wall list sort handler to ", $(list[idx]));
            $(list[idx]).off("click click.xedx");
            $(list[idx]).on("click.xedx click", handleTableHeaderClick);
        }
    }

    function initColWidths(retries=0) {
        if (document.readyState != "complete") {
            if (retries++ < 10) return setTimeout(initColWidths, 300, retries);
            return;
        }

        debug("**** [initColWidths] ****");

        GM_addStyle(
            `.d .faction-info-wrap .members-list .table-cell.position {
                width: 12% !important;
             }`
        );

        const divider = " | ";
        const tableHeader = $(".members-list > ul.table-header");
        const membersTable = $(".members-list > ul.table-body");
        const firstMemberRow = $(".members-list > ul.table-body > li")[0];
        let   classList;

        // See if the TT column is present
        let ttIndexCol = $(".members-list > ul.table-body > li > div.tt-member-index")[0];
        if ($(ttIndexCol).length > 0) {
            tornToolsPresent = true;
            addlFirstColWidth = parseInt($(ttIndexCol).outerWidth());
        }

        //adjustHdrsForFfScouter();
        //callOnContentComplete(adjustHdrsForFfScouter);

        // First row member icon cell, may be [0] or [1], depending on TT
        let memberIconCol = $(".members-list > ul.table-body > li > div.table-cell.member.icons")[0];
        let memberIconsColWidth = parseInt($(memberIconCol).outerWidth(), 10);

        // Width up to the 'lvl' column...
        let actualWidthHdrCol1 = memberIconsColWidth + addlFirstColWidth;

        // List of header columns. Need to modify col 1 for correct width
        let headerColumnList = $(tableHeader).find("li");
        let firstHdrCol = $(headerColumnList)[0];
        let bodyColumnList = $(firstMemberRow).children("div");    // List of body row columns

        // Force width of first header column, is too small if TT installed
        let minWidth = tornToolsPresent ?
                (parseInt($($(bodyColumnList)[0]).outerWidth()) +
                parseInt($($(bodyColumnList)[1]).outerWidth())) :
                parseInt($($(bodyColumnList)[0]).outerWidth());

        let colIdx = tornToolsPresent ? 3 : 2;
        let batBodyStatHeader = $(bodyColumnList)[colIdx];

        $(firstHdrCol).css("min-width", (minWidth + 1) + "px");
        $($(headerColumnList)[2]).css("min-width", parseInt($(batBodyStatHeader).outerWidth()) + "px");

        // Find active one
        findActiveIconClasses();
        bsTableHeader = $(headerColumnList)[2];  // In header row, the 'BS' column;
        $(bsTableHeader).off();

        //debug("[initColWidths] Removing and adding click/sort handlers");
        //$(".members-list > ul.table-header > li.table-cell").off("click");
        $(".members-list > ul.table-header > li.table-cell").on("click", handleTableHeaderClick);

        addWallClickHandlers();
        addWarListClickHandlers();

        // Make the body scrollable and header sticky
        if (enableScrollLock == true) {
            $("ul.table-header").css({"position": "sticky", "top": 0, "z-index": 999});
            $("ul.table-body").addClass("sticky-wrap");
        }

        if (!useCustSort) {
            $(bsTableHeader).click();
            $(bsTableHeader).click();
        }

        // Click the saved sort index, if any
        // Set def order to opposite what we want
        let sortClass = GM_getValue("sortClass", null);
        let sortType = GM_getValue("sortHdrType");
        let sortIdx = GM_getValue("defSortIndex", -1);
        bsSortOrder = (bsSortOrder == 0) ? 1 : 0;
        defSortOrder = bsSortOrder;
        currSortOrder = sortOrders[bsSortOrder];

        debug("sortClass: ", sortClass, " sortType: ", sortType, " bsSortOrder: ", bsSortOrder,
            " defSortOrder: ", defSortOrder, " currSortOrder:", currSortOrder, " Idx: ", sortIdx);

        if (sortIdx > -1 || sortClass != null) {
            bsSortOrder = (bsSortOrder == 0) ? 1 : 0;
            defSortOrder = bsSortOrder;
            currSortOrder = sortOrders[bsSortOrder];
            let list = $(".members-list > ul.table-header > li.table-cell");

            //let sortHdr = sortClass ? $(`[class*="${sortClass}"]`) : $(list)[sortIdx];
            let sortSel = sortClass ? `.${sortClass}.table-cell.torn-divider` : null;
            let sortHdr = sortClass ? $(`.${sortClass}.table-cell.torn-divider`) : $(list)[sortIdx];

            let warListSel = `.members-cont [class*='tab_'].${sortClass}`;
            let warListHdrs = $(`.members-cont [class*='tab_'].${sortClass}`);

            //log("Clicking, sort hdr: ", $($(sortHdr)[0]));
            //log("Clicking, war list hdr: ", $($(warListHdrs)[1]));

            // if ($($(warListHdrs)[1]).length > 0)
            //     $($(warListHdrs)[1]).click();
            // else
            //     $($(sortHdr)[0]).click();

            if (sortType == 'table-cell')
                doInitSortClick(sortSel, warListSel);
            else
                doInitSortClick(warListSel, sortSel);

            //$(".members-cont [class*='tab_']")
        }
        
    }

    function doInitSortClick(hdr, altHdr, retries=0) {
        //log("[doInitSortClick]: ", retries);
        if (!$(hdr).length) {
            if (retries++ < 10) return setTimeout(doInitSortClick, 250, hdr, altHdr, retries);
            if (retries < 20) {
                if (!$(altHdr).length) return setTimeout(doInitSortClick, 250, hdr, altHdr, retries);
            }
        }
        let clickHdr = $(hdr).length> 0 ? $(hdr)[0] : $(altHdr)[0];
        let isCellHdr = $(clickHdr).hasClass('table-cell');

        let iconOrder = ($(clickHdr).find("[class*='desc__']").length > 0) ? 'desc' : 'asc';
        let doDblClick = (iconOrder == currSortOrder);

        debug("** [doInitSortClick] Clicking ", (isCellHdr ? " table hdr, " : " war list hdr, "), /*$(clickHdr),*/
            " want: ", currSortOrder, " iconOrder: ", iconOrder, " dbl: ", doDblClick);

        $(clickHdr).click();
        if (doDblClick) $(clickHdr).click();


    }

    function getSortDirClassNames() {
        if (currSortDirClassName.indexOf('asc') > -1) {
            ascSortClassName = currSortDirClassName;
            descSortClassName = currSortDirClassName.replace('asc', 'desc');
        } else {
            descSortClassName = currSortDirClassName;
            ascSortClassName = currSortDirClassName.replace('desc', 'asc');
        }
    }

    function getAscDescClassName(classList) {
        let className = "";
        for (let idx=0; idx < $(classList).length; idx++) {
            if (classList[idx].indexOf('asc') > -1) {
                currSortDir = 'asc';
                className = classList[idx];
                ascSortClassName = className;
                return className;
            } else if (classList[idx].indexOf('desc') > -1) {
                currSortDir = 'desc';
                className = classList[idx];
                descSortClassName = className;
                return className;
            }
        }
        return className;
    }

    // Note: there are two class for asc/desc....
    var detachedBs;
    var detachedother;
    var inHdrClick = false;
    const resetHdrClick = function () { inHdrClick = false; }

    function handleTableHeaderClick(e) {
        //log("handleTableHeaderClick - for defSortOrder. inHdrClick: ", inHdrClick, $(this));
        if (inHdrClick == true) return;
        inHdrClick = true;
        setTimeout(resetHdrClick, 500);

        if ($(bsTableHeader).outerWidth() > 40) debugger;
        log("handleTableHeaderClick: ", $(e.currentTarget));

        const tableHeader = $(".members-list > ul.table-header");
        //const tableHeader = $(this).parent();

        //bsTableHeader = $(headerColumnList)[2];
        let activeSortIcon = $(tableHeader).find("[class*='activeIcon']");

        let node = e.currentTarget;
        let bsIconNode = $(bsTableHeader).find("[class*='activeIcon']"); // "BS" col sort flag
        let thisIconNode = $(node).find("[class*='activeIcon']")[0];     // Same on this node (mat be BS column also)
        let nodeIndex = $(node).index();

        // log("activeSortIcon: ", $(activeSortIcon));
        // log("bs-sort-ico: ", $("#bs-sort-ico"));
        // log("bsIconNode: ", $(bsIconNode));
        // log("bsIconNode0: ", $($(bsIconNode)[0]));

        debug("handleTableHeaderClick, defSortOrder: ", defSortOrder, " bsSortOrder: ", bsSortOrder,
              " currSortOrder: ", currSortOrder, " index: ", nodeIndex);
        bsSortOrder = (bsSortOrder == 0) ? 1 : 0;
        defSortOrder = bsSortOrder;
        currSortOrder = sortOrders[bsSortOrder];

        debug("(3) Setting defSortOrder to: ", defSortOrder);
        //GM_setValue("defSortOrder", defSortOrder);

        saveSortOrder(bsSortOrder, nodeIndex, $(this));
        debug("New defSortOrder: ", defSortOrder, " bsSortOrder: ", bsSortOrder, " currSortOrder: ", currSortOrder);

        if (!$(node).hasClass("bs")) {
            debug("Making BS node inactive");
            if (!detachedBs) {
                detachedBs = $(bsIconNode).detach();
            }
        } else {
            log("Making BS node active, curr order: ", currSortOrder, " det: ", $(detachedBs));
            if (detachedBs)
                $(bsTableHeader).append(detachedBs);
            else {
                $(bsTableHeader).append($(activeSortIcon).clone());
            }
            detachedBs = null;

            //$(activeSortIcon).remove();
            $(activeSortIcon).removeClass(activeClass);

            bsIconNode = $(tableHeader).find("[class*='activeIcon']");
            log("New bsIconNode: ", $(bsIconNode));
            $(bsIconNode).attr("id", "bs-sort-ico");

            let cl = $(bsIconNode).attr('class');
            if (cl) log("Class list, before: ", cl.split(/\s+/));

            $(bsIconNode).addClass(activeClass);
            //if ($(bsIconNode).hasClass("finally-bs-desc")) {
            if (currSortOrder == 'asc') {
                log("Making bsIconNode 'asc'");
                $(bsIconNode).removeClass("finally-bs-desc").addClass("finally-bs-asc");
                $(bsIconNode).removeClass(descSortClassName).addClass(ascSortClassName);

            } else {
                log("Making bsIconNode 'desc'");
                $(bsIconNode).removeClass("finally-bs-asc").addClass("finally-bs-desc");
                $(bsIconNode).removeClass(ascSortClassName).addClass(descSortClassName);
            }

            cl = $(bsIconNode).attr('class');
            if (cl) log("Class list, after: ", $(bsIconNode).attr('class').split(/\s+/));
            log("bsIconNode: ", $(bsIconNode));
        }
    }

    //================================ Styles, misc ui ===========================================

    function messageBox(msgText, position={left: '50%', top: '50%'}, timeoutSecs=0) {
        $("#xedx-msg-box").remove();
        let msgBoxDiv = `
            <div id="xedx-msg-box" class="msgBoxWrap" style="left: ${position.left}; top: ${position.top};>
                <span class="xedx-msg-txt">${msgText}</span>
                <span class="msg-box-sp"><input id="msg-box-btn" class="xedx-torn-btn" value="OK"></span>
            </div>
            `;

        $(body).after(msgBoxDiv);
        $("#msg-box-btn").on('click', function(e) {
            $("#xedx-msg-box").remove();
        });

        $(document).on('click.xedx', function(event) {
          if (!$(event.target).closest('#xedx-msg-box').length) {
              $('#xedx-msg-box').remove();
              $(document).off('click.xedx');
          }
        });
    }

    addTornButtonExStyles();
    loadCommonMarginStyles();
    loadMiscStyles();

    GM_addStyle(`
        .msgBoxWrap {
            position: absolute;
            /* transform: translate(-50%, -50%); */
            background-color:white;
            /*width:200px;
            height:150px;*/
            border-radius: 15px;
            box-shadow: 0 60px 80px rgba(0,0,0,0.60), 0 45px 26px rgba(0,0,0,0.14);
            padding: 10px 20px 10px 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
         }
         .msgBoxWrap .centered {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
         }
        .xedx-msg-txt, .msg-box-sp {
            display: flex;
            flex-flow: row wrap;
            justify-content: center;
            content-align: center;
            color: black;
            /*height: 36px;*/
        }
    `);

    GM_addStyle(`
        .blink2 {
           /*color:  var(--default-orange-color) !important;*/
           animation: blinker2 1.5s linear infinite;
       }
        .blink1 {
           color:  green !important;
           animation: blinker 1.0s linear infinite;
       }
       .blink30 {
           color:  limegreen !important;
           animation: blinker 0.5s linear infinite;
       }

       --user-status-red-color
       @keyframes blinker2 {
           0%, 100% {color:  var(--default-orange-color) !important;}
           50%, 70% {color:  var(--user-status-red-color) !important;}
        }

       @keyframes blinker {
           0%, 100% {opacity: 1;}
           50%, 70% {opacity: .3;}
        }
        .counts-wrap {
            display: flex;
            flex-flow: row wrap;
            align-content: center;
        }

        .count-span {
            display: flex;
            flex-flow: row wrap;
            justify-content: space-between;
        }

        .count-text {
            font-size: 15px;
        }

        .counts-wrap input {
            position: relative;
            margin-left: 10px;
        }
    `);

    GM_addStyle(`
        ul.table-header li.table-cell:hover {
            background: linear-gradient(180deg,#333,#000);
        }
        @media screen and (max-width: 1000px) {
            .members-cont .bs {
                display: none;
            }
        }

        .members-cont .level {
            width: 27px !important;
        }

        .members-cont .id {
            padding-left: 5px !important;
            width: 28px !important;
        }

        .members-cont .points {
            width: 42px !important;
        }

        .finally-bs-stat {
            font-family: monospace;
        }

        .finally-bs-stat > span {
            display: inline-block;
            width: 55px;
            text-align: right;
        }

        .faction-names {
            position: relative;
        }

        .finally-bs-filter {
            position: absolute !important;
            top: 25px !important;
            left: 0;
            right: 0;
            margin-left: auto;
            margin-right: auto;
            width: 120px;
            cursor: pointer;
        }
        .finally-bs-filter > input {
            display: block !important;
            width: 100px;
        }

        .finally-bs-swap {
            position: absolute;
            top: 0px;
            left: 0;
            right: 0;
            margin-left: auto;
            margin-right: auto;
            width: 100px;
            cursor: pointer;
        }

        .finally-bs-activeIcon {
            display: block !important;
        }

        .finally-bs-asc {
            border-bottom: 6px solid var(--sort-arrow-color);
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 0 solid transparent;
            height: 0;
            top: -8px;
            width: 0;
        }

        .finally-bs-desc {
            border-bottom: 0 solid transparent;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 6px solid var(--sort-arrow-border-color);
            height: 0;
            top: -1px;
            width: 0;
        }

        .finally-bs-col {
            text-overflow: clip !important;
        }

        .raid-members-list .level:not(.bs) {
            width: 16px !important;
        }

        div.desc-wrap:not([class*='warDesc']) .finally-bs-swap {
        display: none;
        }

        div.desc-wrap:not([class*='warDesc']) .faction-names {
        padding-top: 100px !important;
        }

        .re_spy_title, .re_spy_col {
        display: none !important;
        }

        .xedx-api-rst {
            margin-left: 10px;
        }
        .table-cell.bs {
            cursor: pointer;
        }
        .sticky-wrap {
            max-height: 90vh;
            overflow-y: auto;
            top: 0px;
            position: sticky;

            /*-ms-overflow-style: none;*/
            scrollbar-width: none;
        }
        .sticky-wrap::-webkit-scrollbar {
            display: none;
        }
    `);


})();
