// ==UserScript==
// @name        wall-battlestats2
// @namespace   http://tampermonkey.net/
// @version     1.09
// @description show tornstats spies on faction wall page
// @author      finally [2060206], seintz [2460991]
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
// @connect     tornstats.com
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function () {
  "use strict";

    if (isAttackPage()) return;

    // This is at present no longer used, don't bother setting it!
    let manualApiKey = "<your API key here>";

    /*
     * -------------------------------------------------------------------------
     * |    DO NOT MODIFY BELOW     |
     * -------------------------------------------------------------------------
     */

    logScriptStart();

    // Before doing anything, make sure we are on a good page.
    // Otherwise we constantly are doing stuff for no reason.
    if (validFacPage() == false) {
        log("Invalid page, going home: ", location.href);
        return;
    }

    // Fix this up later, better way to just say it's ok, not chack each one.
    function validFacPage() {
        let href = window.location.href;
        if (href.indexOf("ID=") > -1) return true;
        if (location.hash.indexOf("tab-info") > -1) return true;
        if (href.indexOf("step=your") > -1) return true;

        return false;
    }

    api_key = GM_getValue('gm_api_key');
    validateApiKey();

    var apiKey = api_key; //manualApiKey?.length == 16 ? manualApiKey : localStorage["finally.torn.api"];
    if (!apiKey) {
        alert('no apikey set');
        return;
    }

    // My stuff
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);
    let   xedxDevMode = GM_getValue("xedxDevMode", false);
    const bsSortKey = "data-total";
    const sortOrders = ['desc', 'asc'];
    const useCustSort = true;
    var   tableReady = false;
    const defSortOrder = 0;
    var   currSortOrder = sortOrders[defSortOrder];
    var   bsSortOrder = defSortOrder;

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

    // Once the page has loaded (before complete), this is where we add a few other
    // misc UI elements, such as a button to reset the API key
    const resetApiKeyLink = `<a class="t-clear h c-pointer  m-icon line-h24 left">
                                 <span id="xedx-rst-link" class="xedx-api-rst">Update BS Key</span>
                             </a>`;

    callOnContentLoaded(installExtraUiElements);
    debug("Will replace travel icons on content complete");
    callOnContentComplete(replaceTravelIcons);

    function installExtraUiElements() {
        if ($("#xedx-bar").length) return;
        if (!$("#top-page-links-list").length) return setTimeout(installExtraUiElements, 500);
        $("#top-page-links-list").append(resetApiKeyLink);
        $("#xedx-rst-link").on("click", function () {api_key = ''; validateApiKey();});

        $("#xedx-rst-link").on('contextmenu', handleRightClick);
        initColWidths();
    }

    function handleRstBtnClick() {
        debug("handleRstBtnClick");
        api_key = '';
        validateApiKey();
    }

    // temp (experimental)
    function handleRightClick() {
        //initColWidths();
        debug("handleRightClick: will try quick reload");
        quickReload();
        return false;
    }

    function validateApiKey(forced=false) {
        let text = GM_info.script.name + "Says:\n\nPlease enter your API key.\n" +
                     "Your key will be saved locally so you won't have to be asked again.\n" +
                     "Your key is kept private and not shared with anyone." +
                     "\n\nOnly limited access is required.";

        if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
            api_key = prompt(text, "");
            GM_setValue('gm_api_key', api_key);
            apiKey = api_key;
        }
    }

    function getApiKey() {
        return api_key;
    }

    function JSONparse(str) {
      try {
        return JSON.parse(str);
      } catch (e) {
          if (debugLoggingEnabled) log(e);
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
      //    URL = `https://www.tornstats.com/api/v2/${apiKey}/spy/faction/${id}`;

      let URL = `https://www.tornstats.com/api/v2/${apiKey}/spy/faction/${id}`;
      log("loadTSFactions - submitting");
      loadAttempts++;
      GM_xmlhttpRequest({
        method: "GET",
        url: URL,
        onload: (r) => {
          let j = JSONparse(r.responseText);

            if (j && !j.status) {
                debug("Spy resp text: (id=", id, ") ", r.responseText);
                debug("Spy response: ", j);
            }

            if (j && !j.status) {
                GM_setValue("LastErrURL", URL);
                log("Error loading fac spies (1): ", j);
                log("Attempts: ", loadAttempts);

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
            log("Error loading fac spies (2): ", j);
            log("Attempts: ", loadAttempts);
            loadTSFactionsDone();
            return;
          }

            log("loadTSFactions - done");
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

    function loadFactions() {
      let factionIds = Array.from(
        document.querySelectorAll("[href^='/factions.php?step=profile&ID=']")
      )
        .map((a) => a.href.replace(/.*?ID=(\d+)$/, "$1"))
        .filter((v, i, a) => a.indexOf(v) === i);
      factionIds.forEach((id) => loadTSFactions(id));
    }

    // Experiment: try my tinysort instead of finally custom sort
    // bat stat cells: $(".finally-bs-col")
    function expSort(from) {
        let sortList = $(".faction-info-wrap  ul.table-body > li");
        debug("expSort, from: ", from, " ready: ", tableReady, " len: ", $(sortList).length, +bsSortOrder, sortOrders[+bsSortOrder]);

        if (!$(sortList).length || !tableReady) return log("Not ready or no items");

        if (from == 'tableReady') {
            bsSortOrder = defSortOrder;
            currSortOrder = sortOrders[+bsSortOrder];
            tinysort($(sortList), {attr: bsSortKey, order: sortOrders[+bsSortOrder]});
            return;
        }

        currSortOrder = sortOrders[+bsSortOrder];

        tinysort($(sortList), {attr: bsSortKey, order: sortOrders[+bsSortOrder]});
        bsSortOrder = bsSortOrder ? 0 : 1;
        //log("orders after:", +bsSortOrder, sortOrders[+bsSortOrder]);
    }

    function sortStats(node, sort) {
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

    function updateHospTimers() {
      for (let i = 0, n = hospNodes.length; i < n; i++) {
        const hospNode = hospNodes[i];
        const id = hospNode[0];
        const node = hospNode[1];
        if (!node) continue;
        if (!hospTime[id]) continue;

        let totalSeconds = hospTime[id] - new Date().getTime() / 1000;
        if (!totalSeconds || totalSeconds <= 0) continue;
        else if (totalSeconds >= 10 * 60 && hospLoopCounter % 10 != 0) continue;
        else if (
          totalSeconds < 10 * 60 &&
          totalSeconds >= 5 * 60 &&
          hospLoopCounter % 5 != 0
        )
          continue;

        let hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        let minutes = Math.floor(totalSeconds / 60);
        let seconds = Math.floor(totalSeconds % 60);

        node.textContent = `${hours.toString().padLeft(2, "0")}:${minutes
          .toString()
          .padLeft(2, "0")}:${seconds.toString().padLeft(2, "0")}`;
      }
      if (hospNodes.length > 0) hospLoopCounter++;
      setTimeout(updateHospTimers, 1000);
    }

    function updateStatus(id, node) {
      if (!node) return;
      if (hospNodes.find((h) => h[0] == id)) return;
      hospNodes.push([id, node]);
    }

    function showStats(node) {
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

    updateHospTimers();
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

        if (
          !json?.result?.data?.data?.message?.namespaces?.users?.actions
            ?.updateStatus?.status
        )
          return;
        let id =
          json.result.data.data.message.namespaces.users.actions.updateStatus
            .userId;
        let status =
          json.result.data.data.message.namespaces.users.actions.updateStatus
            .status;
        if (status.text == "Hospital") hospTime[id] = status.updateAt;
        else delete hospTime[id];

        showStatsAll();
      });
      return socket;
    };

    //=======================================================================
    // The 'Travel Icons' part of this script taken from another of mine.
    // If ravelling or abroad, replaces the generic globe with country
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
    function getAbroadFlag(country) {
        //log("getAbroadFlag: ", country);
        if (country == 'UK') {
            return `<li style=margin-bottom: 0px;"><img class="flag selected" src="/images/v2/travel_agency/flags/fl_uk.svg"
                country="united_kingdom" alt="United Kingdom" title="United Kingdom"></li>`;
        }
        if (country == 'Mexico') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_mexico.svg"
                country="mexico" alt="Mexico" title="Mexico"></li>`;
        }
        if (country == 'Canada') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_canada.svg"
                country="canada" alt="Canada" title="Canada"></li>`;
        }
        if (country == 'Argentina') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_argentina.svg"
                country="argentina" alt="Argentina" title="Argentina"></li>`;
        }
        if (country == 'Hawaii') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_hawaii.svg"
                country="hawaii" alt="Hawaii" title="Hawaii"></li>`;
        }
        if (country == 'Caymans') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_cayman.svg"
                country="cayman_islands" alt="Cayman Islands" title="Cayman Islands"></li>`;
        }
        if (country == 'Zurich') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_switzerland.svg"
                country="switzerland" alt="Switzerland" title="Switzerland"></li>`;
        }
        if (country == 'Japan') {
            return `<li style=margin-bottom: 0px;"><img class="flag selected" src="/images/v2/travel_agency/flags/fl_japan.svg"
                country="japan" alt="Japan" title="Japan"></li>`;
        }
        if (country == 'China') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_china.svg"
                country="china" alt="China" title="China"></li>`;
        }
        if (country == 'UAE') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_uae.svg"
                country="uae" alt="UAE" title="UAE"></li>`;
        }
        if (country == 'SA') {
            return `<li style=margin-bottom: 0px;"><img class="flag" src="/images/v2/travel_agency/flags/fl_south_africa.svg"
                country="south_africa" alt="South Africa" title="South Africa"></li>`;
        }
    }

    function userBasicQueryCallback(responseText, id, iconLi) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            log('Error: ' + JSON.stringify(jsonResp.error));
            return handleError(responseText);
        }

        let desc = jsonResp.status.description;
        let country = getCountryFromStatus(desc);
        if (country) $(iconLi).replaceWith($(getAbroadFlag(country)));
    }

    var countFlags = -1;
    function replaceTravelIcons(retries=0) {
        let firstTime = (countFlags == -1)? true : false;
        if (firstTime == true) countFlags = 0;
        let travelIcons = document.querySelectorAll("[id^='icon71___']");
        let len = $(travelIcons).length;
        if (len < 1) {
            if (retries++ < 10) return setTimeout(replaceTravelIcons, 250 * retries, retries);
            debug("replaceTravelIcons timed out");
            return;
        }
        // instead of adding an observer, just recheck in a few.
        // Prob not necessary, if travellling will show as globes.
        // Should prob fix at some point...
        if (len == countFlags) return;
        for (let i=0; i < $(travelIcons).length; i++) {
            let iconLi = $(travelIcons)[i];

            let memberRow = $(iconLi).closest("li.table-row");
            if (!memberRow) {log("no memberRow!"); continue;}

            let honorWrap = $(memberRow).find("[class^='honorWrap'] > a");
            if (!honorWrap) {log("no honorWrap!"); continue;}

            let fullId = $(honorWrap).prop("href");
            if (!fullId) {log("no fullId!"); continue;}

            let id = fullId.match(/\d+/)[0];
            xedx_TornUserQuery(id, "basic", userBasicQueryCallback, iconLi);
        }
        if (firstTime == true) setTimeout(replaceTravelIcons, 5000);
    }


    // ====================== Fast Reload testing ===================
    // This loads only the member portion of the page, so does not
    // have to reload everything. *Should* make things faster - but
    // this script also does it's own updating so mat not be neccesary.
    var doingReload = false;
    function quickReload() {

        // https://www.torn.com/
        let reloadURL = location.href;
        debug("quickReload, URL: ", reloadURL);

        if (doingReload) {
            doingReload = false;
            return;
        }

        doingReload = true;

        $.ajax({
            url: reloadURL,
            type: 'GET',
            //dataType: 'json',
            //headers: {
            //    'Referer': 'https://www.torn.com/factions.php?step=your&type=1',
            //    'origin': 'www.torn.com'
            //},
            //contentType: 'application/json; charset=utf-8',
            success: function (response, status, xhr) {
                var ct = xhr.getResponseHeader("content-type") || "";
                debug("Response content type: ", ct);
                if (ct.indexOf('html') > -1) {
                    parseResponseAsHTML(response, status, xhr);
                } else if (ct.indexOf('json') > -1) {
                    // Change the name at some point...
                    quickReloadCallBack(response, status, xhr);
                } else {
                    quickReloadCallBack(response, status, xhr);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                debug("Error in quickReload: ", textStatus);
                decodeQuickReloadError(jqXHR, textStatus, errorThrown);
            }
        });

    }

    function quickReloadCallBack(response, status, xhr) {
        debug("Handling quickReload response: ", response);

        //var newWindow = window.open("", "new window", "width=400, height=200");
        //newWindow.document.write(response);

        //let targetUl = $("#mainContainer > div.content-wrapper > div.userlist-wrapper > ul");
        let jsonObj;
        try {
            jsonObj = JSON.parse(response);
        } catch (e) {
            debug("Exception: ", e);
            debug("Response: ", response);
            //parseResponseAsHTML(response, status, xhr);
            return;
        }

        debug("jsonObj: ", jsonObj);
        if (jsonObj.success == true) {
            debug("Fast Reload, obj: ", jsonObj);
        }

        doingReload = false;
    }

    function parseResponseAsHTML(response, status, xhr) {
        debug("Handling quickReload response as HTML");
        debug("quickReload Response: ", $(response));

        var newWindow = window.open("", "new window", "width=400, height=200");
        newWindow.document.write(response);
    }

    function decodeQuickReloadError(jqXHR, textStatus, errorThrown) {
        debug("decodeQuickReloadError");
        debug("jqXHR: ", jqXHR);
        debug("textStatus: ", textStatus);
        debug("errorThrown: ", errorThrown);
    }
    // ====================== End Fast Reload testing ===================

    // ====================== Fix up column widths ========================
    //
    // The column widths will be offset if TT is installed, this attempts
    // to dynamically size the columns and also place the"sort"icon in the
    // correct place.
    //
    var tornToolsPresent = false;  // Has TT columns
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
                    break;
                }
            }

            currSortDirClassName = getAscDescClassName(classList);
            getSortDirClassNames();
        }

        if (!found) {
            if (retries++ < 30) return setTimeout(findActiveIconClasses, 500, retries);
            return log("ERROR: Didn't find active icons!");
        }

        //log("Appending sort icon: ", $(activeSortIcon), $(bsTableHeader));
        $(bsTableHeader).append($(activeSortIcon).clone());
        $(activeSortIcon).removeClass(activeClass);

        // Is this to sort twice??
        if (!useCustSort) {
            $(bsTableHeader).click();
            $(bsTableHeader).click();
        }
    }

    function initColWidths(retries=0) {
        if (document.readyState != "complete") {
            if (retries++ < 10) return setTimeout(initColWidths, 300, retries);
            return;
        }

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

        $(".members-list > ul.table-header > li.table-cell").on("click", handleTableHeaderClick);

        // Is this to sort twice??
        if (!useCustSort) {
            $(bsTableHeader).click();
            $(bsTableHeader).click();
        }
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
    function handleTableHeaderClick(e) {
        log("handleTableHeaderClick");
        if ($(bsTableHeader).outerWidth() > 40) debugger;
        log("handleTableHeaderClick: ", $(e.currentTarget));

        const tableHeader = $(".members-list > ul.table-header");
        //bsTableHeader = $(headerColumnList)[2];
        let activeSortIcon = $(tableHeader).find("[class*='activeIcon']");

        let node = e.currentTarget;
        let bsIconNode = $(bsTableHeader).find("[class*='activeIcon']"); // "BS" col sort flag
        let thisIconNode = $(node).find("[class*='activeIcon']")[0];     // Same on this node (mat be BS column also)

        log("activeSortIcon: ", $(activeSortIcon));
        log("bs-sort-ico: ", $("#bs-sort-ico"));
        log("bsIconNode: ", $(bsIconNode));
        log("bsIconNode0: ", $($(bsIconNode)[0]));

        if (!$(node).hasClass("bs")) {
            log("Making BS node inactive");
            //$(bsIconNode).remove();

            if (!detachedBs) {
                detachedBs = $(bsIconNode).detach();
            }
            //$("#bs-sort-ico").remove();

            //$(bsIconNode).removeClass(activeClass);
            //$(bsIconNode).removeClass("finally-bs-activeIcon");
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
                $(bsIconNode).removeClass("finally-bs-asc").addClass("finally-bs-desc");
                $(bsIconNode).removeClass(ascSortClassName).addClass(descSortClassName);
            }

            cl = $(bsIconNode).attr('class');
            if (cl) log("Class list, after: ", $(bsIconNode).attr('class').split(/\s+/));
            log("bsIconNode: ", $(bsIconNode));
        }
    }

    //=======================================================================

    GM_addStyle(`
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
    `);


})();
