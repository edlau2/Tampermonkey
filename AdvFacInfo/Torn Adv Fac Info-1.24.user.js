// ==UserScript==
// @name         Torn Adv Fac Info
// @namespace    http://tampe8monkey.net/
// @version      1.24
// @description  Adds better search and member stats to fac info page
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php?step=your*
// @match        https://www.torn.com/factions.php?step=profile*
// @exclude      https://www.torn.com/recaptcha.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const searchid = "fac-search";
    const myId = getPlayerId();

    // ======================== Options editable via the UI ===================

    const optsHdrs = ["Option", "Value", "Description"];
    const advFacOpts = {
        "Debug Logging":    {value: false, type: "checkbox", key: "debugLoggingEnabled", label: "false",
                            desc: "Enables advanced console logging."},
        "Auto-Clean DB":    {value: true, type: "checkbox", key: "autoPruneDb", label: "true",
                            desc: "Automatically remove DB entries when members leave the fac."},
        "Details View":     {value: "", type: "select", key: "detailsView", options: ["Tree", "List"], label: "Style: ",
                             desc: "Select how to display the member's detailed stats from the database"},
        "API Interval":     {value: 2,     type: "number",   key: "apiIntervalSecs", min: 1, max: 60, label: "secs",
                            desc: "Time in seconds between API calls for each member's stats."},
        "Update Frequency": {value: 24,    type: "number",   key: "apiFrequencyHrs", min: 1, max: 168, label: "hrs",
                            desc: "How much time, in hours, passes before stat updates will automatically start again."},
    };

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    var apiIntervalSecs = GM_getValue("apiIntervalSecs", 2);
    var apiFrequencyHrs = GM_getValue("apiFrequencyHrs", 24);
    var autoPruneDb = GM_getValue("autoPruneDb", true);
    var detailsView = GM_getValue("detailsView", "Tree");

    saveOpts();

    function readOpts() {
        debugLoggingEnabled = GM_getValue("debugLoggingEnabled", debugLoggingEnabled);
        apiIntervalSecs = GM_getValue("apiIntervalSecs", apiIntervalSecs);
        apiFrequencyHrs = GM_getValue("apiFrequencyHrs", apiFrequencyHrs);
        autoPruneDb = GM_getValue("autoPruneDb", autoPruneDb);
        detailsView = GM_getValue("detailsView", detailsView);
    }

    function saveOpts() {
        GM_setValue("debugLoggingEnabled", debugLoggingEnabled);
        GM_setValue("apiIntervalSecs", apiIntervalSecs);
        GM_setValue("apiFrequencyHrs", apiFrequencyHrs);
        GM_setValue("autoPruneDb", autoPruneDb);
        GM_setValue("detailsView", detailsView);
    }

    if (GM_getValue("lastUpdated", -1) == -1) GM_setValue("lastUpdated", -1);

    // =========================== Helper funcs ===============================


    const mediumTime = new Intl.DateTimeFormat("en-GB", {timeStyle: "medium", hourCycle: "h24",});
    const shortDate = new Intl.DateTimeFormat("en-GB", {dateStyle: "short", });

    function getCurrTab() {
        if (location.hash) return new URLSearchParams(location.hash.slice(2)).get("tab");
    }

    function isDate(val) {
        let d = new Date(val);
        return !isNaN(d.valueOf());
    }

    function scrollTo(node) {
        if ($(node).length) {
            var targetScrollPosition = $(node).offset().top - ($(window).height() / 2) + ($(node).outerHeight() / 2);
            $('html, body').animate({scrollTop: targetScrollPosition}, 100);
        }
    }

    function tm_str(tm) {
        let dt = tm ? new Date(tm) : new Date();
        const dayOfWeekText = dt.toLocaleDateString('en-GB', { weekday: 'short' });
        return (dayOfWeekText + ", " + shortDate.format(dt) + "  " + mediumTime.format(dt));
    }

    function setProgressText(msg) { $("#prog-text").text(msg ?? ""); }

    function setProgressUpdated(saved=false) {
        if (saved == true) {
            let tm = GM_getValue("lastUpdated", 0);
            if (!tm || tm == -1) return setProgressUpdated();
            $("#prog-text").text(`Last Update: ${tm_str(tm)}`);
        } else {
            GM_setValue("lastUpdated", (new Date().getTime()));
            $("#prog-text").text(`Last Update: ${tm_str()}`);
        }
    }

    function getAllKeys(obj, keys = []) {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                keys.push(key);
                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    getAllKeys(obj[key], keys);
                }
            }
        }
        return keys;
    }

    function getAllKeysWithPaths(obj, currentPath = '') {
        let keysWithPaths = [];
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                  const newPath = currentPath ? `${currentPath}.${key}` : key;
                  keysWithPaths.push(newPath);
                  if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    keysWithPaths = keysWithPaths.concat(getAllKeysWithPaths(obj[key], newPath));
                  }
            }
        }
        return keysWithPaths;
    }

    // =============== DB stuff, open, read/write, query...====================

    var facDb;
    var facDbKeys;
    var facDbCount = -1;
    const facStatsStore = "fac-member-stats";
    var ctrlPnlRowsWaiting = false;

    function openDatabase(getKeys=false) {
        const request = indexedDB.open('FactionStats', 1); // Database name and version

        request.onupgradeneeded = function(event) {
            facDb = event.target.result;
            if (!facDb.objectStoreNames.contains(facStatsStore)) {
                facDb.createObjectStore(facStatsStore);
                debug('Object store "', facStatsStore, '" created.');
            }
        };

        request.onsuccess = function(event) {
            facDb = event.target.result;
            debug('Database opened successfully.');
            if (getKeys == true) {
                getAllKeysFromObjectStore()
                .then(keys => {
                    facDbKeys = keys;
                    facDbCount = keys.length;
                    if (waitingOnUpdateCheck == true) {
                        waitingOnUpdateCheck = false;
                        doStartupUpdates();
                    }
                }).catch(error => {
                    log("ERROR: Failed to retrieve keys:", error);
                });
            }
            if (ctrlPnlRowsWaiting == true)
                setTimeout(fillCtrlPanelRows, 100);
        };

        request.onerror = function(event) {
            log('ERROR opening database:', event.target.errorCode);
        };
    }

    function getStatsForMemberFromDb(id) {
        return new Promise((resolve, reject) => {
            const transaction = facDb.transaction([facStatsStore], 'readonly'); // Create a read-only transaction
            const objectStore = transaction.objectStore(facStatsStore);
            const getRequest = objectStore.get(id);

            getRequest.onsuccess = (event) => {
                const fullEntry = event.target.result;
                //debug("fullEntry: ", fullEntry);
                if (!fullEntry) {
                    log("Error: no stats for ", id);
                    log("target: ", event.target);
                    resolve(null);
                } else {
                    const stats = fullEntry.stats;
                    //if (stats) log('Retrieved stats:', stats);
                    resolve(stats);
                }
            };

            getRequest.onerror = (event) => {
                log("ERROR for id:", id, event.target.errorCode);
                reject("Error retrieving value");
            };
        });

    } // getStatsForMember() end

    function addStatsToDb(data, id) {
        debug("[addStatsToDb] id: ", id, " data: ", data);
        const transaction = facDb.transaction([facStatsStore], 'readwrite');
        const objectStore = transaction.objectStore(facStatsStore);

        // Change this - add all of data? But add data,lastUpdated, data.memberName?
        // On the get, return just data.stats..
        let stats = data.personalstats;
        let keys = Object.keys(stats);
        let dataToAdd = {};
        keys.forEach(key => {
            dataToAdd[key] = stats[key];
        });

        let now = new Date().getTime();
        const fullDataEntry = {"stats": dataToAdd, "lastUpdated": now};
        //const request = objectStore.put(dataToAdd, id);
        const request = objectStore.put(fullDataEntry, id);

        request.onsuccess = () => debug(`Added stats for: ${id}`);
        request.onerror = (e) => debug('Error adding stats:', e);

        transaction.oncomplete = () => {
            //debug('Data added successfully, verifying...');
            //getStatsForMemberFromDb(id);
        }
        transaction.onerror = (e) => log('ERROR: Transaction failed:', e);
    }

    function getAllKeysFromObjectStore(storeName=facStatsStore) {
        debug("[getAllKeysFromObjectStore]");
        return new Promise((resolve, reject) => {
            const transaction = facDb.transaction(storeName, 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.getAllKeys();

            request.onsuccess = (event) => {
                const keys = event.target.result;
                resolve(keys);
            };

            request.onerror = (event) => {
               console.error("Error getting all keys:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    function getAllKeysAndValues(storeName=facStatsStore) {
        debug("[getAllKeysAndValues] ", facDb);
        if (!facDb) {
            console.error("DB isn't opened!");
            return;
        }
        return new Promise((resolve, reject) => {
            const transaction = facDb.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const result = [];
            const request = objectStore.openCursor();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    result.push({ key: cursor.key, value: cursor.value });
                    cursor.continue();
                } else {
                    resolve(result);
                }
            };

            request.onerror = (event) => {
                reject('Error getting all keys and values: ' + event.target.errorCode);
            };
        });
    }

    // TBD....
    var savedDbData;    // For a 'details' click...
    function fillCtrlPanelRows(retries=0) {
        if (!facDb) {
            log("DB not open yet!");
            ctrlPnlRowsWaiting = true;
            return;
        }
        ctrlPnlRowsWaiting = false;

        if (!$("#db-table tbody").length) {
            if (retries++ < 50) return setTimeout(fillCtrlPanelRows, 250, retries);
            return log("ERROR: no table body?");
        }

        getAllKeysAndValues().then(data => {
            savedDbData = JSON.parse(JSON.stringify(data));
            data.forEach(entry => {
                let id = entry.key;
                if (membersList[id] && membersList[id] != undefined) {
                    let name = membersList[id].name;
                    let lastUpd = entry.value.lastUpdated;
                    let row = `<tr class='db-row'>
                                  <td><span>${name} [${id}]</span></td>
                                  <td><span>${tm_str(lastUpd)}</span></td>
                                  <!-- td><span> </span></td -->
                                  <td><input type="checkbox" name="select"></td>
                              </tr>`;
                    $("#db-table tbody").append($(row));
                }
            });

            // Handler for clicking the member name (details?)
            //log("Add td click handlers: ", $(".db-tbl table tbody td:first-child"));
            $(".db-tbl table tbody td:first-child").on('click', handleMemberClick);

            // May not want the cb...
            //log("Add cb click handlers: ", $(".db-tbl table tbody td input"));
            $(".db-tbl table tbody td input").on('change', handleCtrlPanelCb);

        }).catch(error => {
            console.error(error);
        });
    }

    // ============ API/web page stuff: fac members, personal stats ============

    var facMembersUpdated = false;
    var membersList = {};
    var usersNotInFac = [];
    var acSource = [];
    var memberCount = -1;
    var acWaitingOnMembers = false;   // Auto-Complete waiting
    var updatingStats = false;
    var waitingOnUpdateCheck = false;

    var statsNeedUpdate = GM_getValue("statsNeedUpdate", false);       // true to update stats after getting member list
    var lastKeyIdx = GM_getValue("lastKeyIdx", 0) ?? 0;
    var memberKeys;
    var cancelUpd = false;
    var updateReason = "";
    var updateMissingOnly = false;

    if (GM_getValue("lastUpdated", -1) == -1) {
        statsNeedUpdate = true;
    }

    function timeSinceLastUpd() {
        let res = {};
        let now = new Date().getTime();
        let lastFull = GM_getValue("lastCompleteUpd", 0);
        res.diff = now - Number(lastFull); // ms
        res.diffSecs = res.diff / 1000;
        res.diffMin = res.diffSecs / 60;
        res.diffHrs = res.diffMin / 60;
        res.diffDays = res.diffHrs / 24;
        log("[timeSinceLastUpd] ", res);
        return res;
    }

    function checkStatsUpdateNeeded() {
        log("[checkStatsUpdateNeeded] ", facDbCount, memberCount);
        updateReason = null;
        if (facDbCount < 0 || memberCount < 0) return false;
        if (facDbCount < memberCount) {
            updateReason = "Database incomplete";
            statsNeedUpdate = true;
            updateMissingOnly = true;
            return true;
        }

        let tm = timeSinceLastUpd();
        if (tm.diffHrs > apiFrequencyHrs) {
            updateReason = "Last update over " + apiFrequencyHrs + " hrs";
            statsNeedUpdate = true;
            return true;
        }
        return true;
    }

    function updateMemberStats(last=0) {
        lastKeyIdx = GM_getValue("lastKeyIdx", 0);
        debug("[updateMemberStats] last: ", last, " idx: ", lastKeyIdx, " cancelUpd: ", cancelUpd);
        if (cancelUpd == true) {
            return processUpdateDone();
        }
        if (facMembersUpdated == false) {
            statsNeedUpdate = true;
            return;
        }
        $("#upd-stats").val("Cancel");
        updatingStats = true;
        statsNeedUpdate = false;
        if (!memberKeys)
            memberKeys = Object.keys(membersList);

        if (last == 0) {
            lastKeyIdx = GM_getValue("lastKeyIdx", 0);
            last = lastKeyIdx ? parseInt(lastKeyIdx) : 0;
        }
        if (last >= memberKeys.length) {
            log("ERROR: length! ", last, lastKeyIdx, memberKeys.length, memberKeys);
            last = 0;
            lastKeyIdx = 0;
            GM_setValue("lastKeyIdx", last);
        }

        let key = memberKeys[last];
        if (!key) {
            processUpdateDone();
            return log("ERROR: no key! ", last, lastKeyIdx, key, memberKeys.length, memberKeys);
        }

        if (updateMissingOnly == true) {
            log("Check if ", key, " already in table");
            if (facDbKeys.includes(key.toString())) {
                log("Skipping member ", key);
                last = Number(last) + 1;
                if (last >= memberKeys.length) {
                    last = 0;
                    return processUpdateDone();
                }
                GM_setValue("lastKeyIdx", last);
                return setTimeout(updateMemberStats, 100, last);
            }
        }
        getMemberStats(key, last);

        last = Number(last) + 1;
        if (last == memberKeys.length) {
            last = 0;
            return processUpdateDone();
        }

        GM_setValue("lastKeyIdx", last);
        setTimeout(updateMemberStats, Number(apiIntervalSecs) * 1000, last);

        function processUpdateDone() {
            setProgressText("Update " + ((cancelUpd == true) ? "cancelled." : "complete."));
            setTimeout(setProgressUpdated, 5000);

            if (cancelUpd == false)
                GM_setValue("lastCompleteUpd", (new Date().getTime()));

            statsNeedUpdate = false;
            facMembersUpdated = true;
            updatingStats = false;
            cancelUpd = false;
            updateMissingOnly = false;
            $("#upd-stats").val("Update");
            GM_setValue("statsNeedUpdate", false);
            GM_setValue("lastKeyIdx", last);
        }
    }

    function doStartupUpdates(retries=0) {
        if (checkStatsUpdateNeeded() == false) {
            waitingOnUpdateCheck = true;
            return;
        }

        log("statsNeedUpdate? ", statsNeedUpdate, " reason? ", updateReason);

        // Display msg asking if update is OK?
        if (statsNeedUpdate == true) {
            if (GM_getValue("lastUpdated", 0) == -1) {  // Ensure only shown once....
                GM_setValue("lastUpdated", 0);
                if (confirm(`Fac member stats must be retrieved periodically.\n` +
                            `You can click 'cancel' to stop the process, and\n` +
                            `click 'update' at any time to start again. This\n` +
                            `makes one API call every 2 seconds (configurable)\n` +
                            `and does not have to be done too often.\n` +
                            `Press OK to go ahead or Cancel to skip for now.`)) {
                    updateMemberStats();
                }
            } else {
                if (updateReason) {
                    $("#upd-stats").val("Cancel");
                    setProgressText(("Updating in 3s: " + updateReason));
                    setTimeout(updateMemberStats, 3000);
                } else
                   updateMemberStats();
            }
        }
    }

    function updateFacMemberList(retries=0) {
        debug("[updateFacMemberList]");
        let honors = $("[class*='honorWrap_'] > a");
        if (!$(honors).length) {
            if (retries++ < 50) return setTimeout(updateFacMemberList, 250, retries);
            return log("[updateFacMemberList] timed out.");
        }

        $(honors).each(function() {
            let id = $(this).attr('href').split('=')[1];
            let name = $(this).find("span.honor-text:not('.honor-text-svg')").text();
            let root = $(this).closest("li");
            $(root).attr("data-id", id);
            acSource.push({label: name, value: name, data: id});
            membersList[id] = {name: name};
        });

        facMembersUpdated = true;
        memberCount = Object.keys(membersList).length;

        debug("Members: ", memberCount,
              " acSource: ", (acSource? acSource.length : "Empty"),
             "\nacWaitingOnMembers: ", acWaitingOnMembers,
             "\nstatsNeedUpdate: ", statsNeedUpdate);

        if (acWaitingOnMembers == true) installAutoComplete(searchid);

        // Get members in DB no longer in fac
        getAllKeysFromObjectStore()
            .then(keys => {
                keys.forEach(key => {
                    if (membersList[key] == undefined)
                        usersNotInFac.push(key);
                });
            }).catch(error => {
                log("ERROR: Failed to retrieve keys:", error);
        });

        debug("Orphaned users list: ", usersNotInFac);

        // Startup 'updates needed' check
        doStartupUpdates();

    }

    function processStatQuery(data, status) {
        setProgressText(`[${this.idx}/${memberCount}] Writing ${this.name} [${this.id}] to DB`);
        addStatsToDb(data, this.id);
    }

    function getMemberStats(id, idx) {
        const url = `https://api.torn.com/v2/user/${id}/personalstats?cat=all&key=${api_key}`;
        let name = membersList[id] ? membersList[id].name : "unknown";
        setProgressText(`[${idx}/${memberCount}] Updating ${name} [${id}]`);
        $.get({url: url, id: id, idx: idx, name: name, success: processStatQuery});
    }

    function handleUpdateBtn(e) {
        let val = $("#upd-stats").val();
        if (val == "Update") {
            $("#upd-stats").val("Cancel");
            updateMemberStats();
        } else {
            cancelUpd = true;
            setTimeout(function() {$("#upd-stats").val("Update");}, 1000);
        }
    }

    // TBD...
    var lvl = 0;

    function cap(word) {
        return word.charAt(0).toUpperCase() + word.slice(1)
    }

    function getLi(jsonNode, key) {
        let keyVal = jsonNode[key];
        let li;
        let hlvl = +lvl + 1;
            let txt = cap(key);
        if (typeof keyVal == 'object') {
            //li = `<li data-lvl="${lvl}" class="obj-lvl-${lvl}"><h${hlvl}><a href="#">${txt}</a><i class="fas fa-caret-right pt10"></i></h${hlvl}>`;
            li = `<li data-lvl="${lvl}" class="obj-lvl-${lvl}"><span class="xhfas"><a href="#">${txt}</a><i class="fas fa-caret-right pt"></i></span>`;
        } else {
            //li = `<li data-lvl="${lvl}" class="obj-lvl-${lvl}"><h${hlvl}><a href="#">${txt}: ${keyVal}</a></h${hlvl}></li>`;
            li = `<li data-lvl="${lvl}" class="obj-lvl-${lvl}"><span><a href="#">${txt}: ${keyVal}</a></span></li>`;
        }
        return li;
    }

    function buildHtmlListFromJson(jsonNode, htmlString) {
        log("buildHtmlListFromJson");
        let keys = Object.keys(jsonNode);
        lvl++;
        if (keys.length) {
            let lastWasLi = false;
            let lastWasUl = false;
            htmlString  += `<ul data-lvl="${lvl}" class="xfc">`;
            keys.forEach(key => {
                let keyVal = jsonNode[key];
                if (typeof keyVal == 'object') {
                    let savedNode = jsonNode;
                    htmlString +=  getLi(jsonNode, key);
                    let nextHtml = buildHtmlListFromJson(jsonNode[key], '', lvl);
                    nextHtml += "</li>";
                    htmlString += nextHtml;
                }
                else {
                    htmlString += getLi(jsonNode, key);
                }
            });
            lvl--;
            htmlString += "</ul>";
        }
        return htmlString;
    }

    function handleMemberClick(e) {
        e.stopPropagation();
        e.preventDefault();
        debug("[handleMemberClick] ", $(this), $(this).find("span").text());
        $("#mem-stat-wrap").remove();
        $("#accordian-hdr").remove();
        if (savedDbData) {
            let fullName = $(this).find("span").text();
            let tmp = fullName.split('[')[1];
            let id = tmp.split(']')[0];
            log("Full Name: ", fullName, " ID: ", id);

            getStatsForMemberFromDb(id)
                .then(value => {
                    log("Value: ", value);
                    let stats = value.stats ? value.stats : value;
                    log("Stats: ", stats);
                    log("detailsView: ", detailsView);

                    if (detailsView == "Tree") {
                        let statStr = JSON.stringify(stats, null, 4);
                        let tmpDiv = `<div id='mem-stat-wrap' style="width: 100%; position:relative;">
                                          <button id="junk-btn" class="xedx-torn-btn" style="cursor: pointer;position: absolute; top: 3px; left: 90%;">Close</button>
                                          <textarea style="width: 100%; height: 200px;">${statStr}</textarea>
                                      </div>`;
                        $(this).closest('table').before(tmpDiv);
                        $("#junk-btn").on('click', function() {$("#mem-stat-wrap").remove();});
                    } else if (detailsView == "List") {
                        let root = `<div id="mem-stat-wrap" class='accordian-wrap'>
                                        <div id='accordian' class='flist' style='width: 100%;'>
                                        </div>
                                    </div>`;
                        let hdr = `<li id="accordian-hdr" data-lvl="${lvl}" class="obj-lvl-${lvl}">
                                       <span><a href="#">Personal Stats for ${fullName}</a></span>
                                   </li>`;

                        $("#db-table").before($(hdr));
                        $(this).closest('table').before($(root));

                        let html = buildHtmlListFromJson(stats, '');
                        $('#accordian').append(html);
                        $('#accordian ul ul').hide();


                        var inClick = false;
                        function resetClick(){inClick = false;}

                        $('#accordian ul li').on('click', function(e) {
                            e.stopPropagation();
                            e.preventDefault();
                            if (inClick == true) return false;
                            inClick = true;
                            setTimeout(resetClick, 500);

                            // Find the direct child <ul> of the clicked <li> and toggle its visibility
                            let i = $(this).find("> h2 > i.fas, > h3 > i.fas, > span > i.fas");
                            log("Click: ", $(this), $(i));
                            $(this).children('ul').slideToggle();
                            $(i).toggleClass("fa-caret-right fa-caret-down");
                            return false;
                        });

                    }

                    $("#db-table > table").css("visibility", "collapse");
            });
        }
    }

    function addAccordianStyles() {
        GM_addStyle(`
            .xfc {display: flex; flex-direction: column; }
            .xdn { display: none; }

            l1.obj-lvl-1 { padding-left: 5px; }
            [class^='obj-lvl']:not(.obj-lvl-1) { padding-left: 50px; }

            /*
            li.obj-lvl-1 span {
                background: linear-gradient(#999, #445572);
            }
            li.obj-lvl-2 span {
                background: linear-gradient(#bbb, #445572);
            }
            li.obj-lvl-3 span {
                background: linear-gradient(#ddd, #445572);
            }
            */

            span.pt {padding-top: 5px; }
            h2.pt, h3.pt, h4.pt, h5.pt {padding-top: 10px; }

            .accordian-wrap {
                width: 100%;
                /* max-height: 200px; */
                overflow-y: auto;
                position: sticky;
                display: flex;
                flex-direction: column;
            }
            #accordian-hdr {
                background: #ddd;
                box-shadow: 0 5px 15px 1px rgba(0, 0, 0, 0.6), 0 0 200px 1px rgba(255, 255, 255, 0.5);
                height: 32px;
                position: sticky;
                justify-content: center;
                display: flex;
                align-content: center;
                flex-flow: row wrap;
                justify-content: center;
                width: 734px;
                margin-left: 10px;
            }
            #accordian-hdr span a {
                color: black;
                font-size: large;
            }
            #accordian ul {
                display: flex;
                flex-direction: column;
            }
            #accordian ul:first-child {
                padding-left: 10px;
            }
            #accordian {
                /*background: #004050;*/
                /*width: 250px;*/
                /*margin: 20px auto 0 auto;*/
                color: black;
                padding-top: 20px;
                /*box-shadow: 0 5px 15px 1px rgba(0, 0, 0, 0.6), 0 0 200px 1px rgba(255, 255, 255, 0.5);*/
            }

            #accordian span {
                display: flex;
                flex-flow: row wrap;
                margin-top: 0px;
                margin-bottom: 0px;
            }
            #accordian span i.fas {
                padding-top: 5px;
            }

            #accordian h2,
            #accordian h3,
            #accordian h4,
            #accordian h5 {
                padding-top: 5px;
                display: flex;
                flex-flow: row wrap;
                margin-top: 0px;
                margin-bottom: 0px;
            }
            #accordian a {
                border-radius: 4px;
            }
            /* #accordian h3 a {
                line-height: 34px;
                color: black;
                text-decoration: none;
                padding: 5px;
            } */

            #accordian span a,
            #accordian h2 a,
            #accordian h3 a,
            #accordian h4 a {
                color: black;
                padding: 5px;
            }
            #accordian span:hover,
            #accordian h3:hover {
                text-shadow: 0 0 1px rgba(255, 255, 255, 0.7);
            }

            #accordian li {
                display: flex;
                flex-direction: column;
                list-style-type: none;
            }

            #accordian span {
                color: black;
                -webkit-transition: all 0.15s;
                transition: all 0.15s;
                position: relative;
            }
            #accordian ul ul li a,
            #accordian h4 {
                color: black;
                text-decoration: none;
                /*line-height: 27px;*/
                -webkit-transition: all 0.15s;
                transition: all 0.15s;
                position: relative;
            }
            /*#accordian ul li a:hover {*/
            #accordian ul li span.xhfas:hover {
                background: #ddd;
                border-left: 15px solid lightgreen;
                box-shadow: 0 5px 15px 1px rgba(0, 0, 0, 0.6), 0 0 200px 1px rgba(255, 255, 255, 0.5);
            }
            #accordian ul li span:not(.xhfas):hover {
                background: #ddd;
                box-shadow: 0 5px 15px 1px rgba(0, 0, 0, 0.6), 0 0 200px 1px rgba(255, 255, 255, 0.5);
            }

            #accordian ul ul li a:hover {
                /*background: #eee;
                border-left: 5px solid lightgreen;*/
            }

            #accordian ul ul {
                border-left: 2px dotted rgba(0, 0, 0, 0.8);
            }

            #accordian li.active>ul {
                background: #99ffff;
            }

            #accordian ul ul ul {
                margin-left: 15px;
            }

            #accordian a:not(:only-child):after {
                content: "\f104";
                font-family: fontawesome;
                position: absolute;
                right: 10px;
                top: 0;
                border-top: 1px dotted red;
            }

            #accordian .active>a:not(:only-child):after {
                content: "\f107";
                border-top: 1px dotted yellow;
            }
        `);
    }

    function handleCtrlPanelCb(e) {
        debug("[handleCtrlPanelCb] ", $(this), $(this).closest("tr"));
    }

    // ======================= DB UI/Control Panel ============================

    function initCSS() {

         // Figure out what is actually used here!!!
        const isDarkmode = $("body").hasClass("dark-mode");
        GM_addStyle(`
            #dbCtrlPanelBtn {
                width: 30px;
                position: relative;
            }
            .links-fmt {
                margin-right: -16px;
            }
            .btn-wrap-fmt {
                margin-left: 5px;
                margin-right: -34px;
                top: 6px;
            }

            .dbg-log {
                /*line-height: 22px;*/
                font-family: Arial, serif;
                font-size: 12px;
                color: black;
                margin-top: 6px;
            }
        `);

         // DB table styles - these are used, not sure about any above...
         GM_addStyle(`
             .db-tbl {
                 background-color: #eee;
                 width: 784px;
                 margin-left: 10px;
                 margin-right: 10px;
                 overflow: scroll;
                 overflow-x: auto;
                 height: 340px;
             }
             .db-tbl table {
                  width: 100%;
             }
             .db-tbl tbody {
                  background-color: #ddd;
             }
             .db-tbl tbody tr {
                  height: 28px;
                  width: 982px;
             }
             .db-tbl thead tr {
                  height: 32px;
                  background: linear-gradient(180deg, #333333 0%, #555555 25%, #333333 60%, #333333 78%, #333333 100%);
             }
             .db-tbl table thead th {
                  border-left: 1px solid #666;
                  border-right: 1px solid #666;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                  position: relative;
                  left: 0;
                  z-index: 9;
                  padding: 0px 4px 0px 4px;
                  outline: 1px solid #666;
                  background: linear-gradient(180deg, #333333 0%, #555555 25%, #333333 60%, #333333 78%, #333333 100%);
              }
              .db-tbl table tbody td input {
                  margin-right: 0px;
              }
              .db-tbl table tbody td:first-child:hover {
                  cursor:pointer;
                  font-weight: bold;
                  font-size: 16px;
                  color: var(--default-blue-dark-color);
                  text-shadow: none;
              }
              .db-tbl table thead th:last-child,
              .db-tbl table tbody td:last-child {
                  width: 22px;
                  padding-right: 0px;
             }

             .db-tbl table tbody tr td {
                  border: 1px solid #aaa;
                  color: black;
                  vertical-align: middle;
                  padding: 4px 10px;
                  font-size: 14px;
             }
             .db-tbl table thead th:first-child {
                  width: 220px;
             }
             .db-tbl table thead th:nth-child(2) {
                 width: 200px;
             }
             .db-tbl table tbody td:nth-child(2) {
                 text-align: center;
             }
             .db-control-panel-overlay {
                  position: fixed;
                  top: 0;
                  left: 0;
                  background: ${isDarkmode ? "#404040" : "#B0B0B0"};
                  width: 100%;
                  height: 100%;
                  opacity: 0.7;
                  z-index: 900;
                  display: none;
             }
             .db-control-panel-popup {
                  position: fixed;
                  top: 10%;
                  left: 15%;
                  border-radius: 10px;
                  padding: 10px;
                  background: ${isDarkmode ? "#999" : "#F0F0F0"};
                  z-index: 1000;
                  display: none;
                  width: 804px;
                  /*height: 426px;*/
              }
              #target-id-input {
                  width: 90px;
                  border-radius: 4px;
              }
              .top-wrap {
                  margin: 10px;
              }
        `);
    }

    function getCtrlPanelHtml() {
        let innerHtml = `
            <div class="xflexr top-wrap">
                <div class="xflexc">
                    <div class=xflexr xmt10">
                        <input type="text" class="ib cpl-text xmr10" id="target-id-input" placeholder="Player ID" size="10" />
                        <button id="db-search" class="xedx-torn-btn" style="cursor: pointer;">Search</button>
                    </div>
                </div>
                <div style="margin-left: auto;" class="xflexc">
                    <button id="dashboard-close" class="xedx-torn-btn" style="cursor: pointer;margin-left: auto;">Close</button>
                </div>
            </div>

            <div id="db-table" class="db-tbl xmt10">
                <table cellpadding>
                    <thead class="sticky-thead title-black"></thead>
                    <tbody></tbody>
                </table>
            </div>

        `;

        return innerHtml;
    }

    // Add sort on header column click....
    function addTblHdr() {
        let hdr = `<tr>
                      <th>Member Name (click name for details)</th>
                      <th>Last Update</th>
                      <!-- th>View Details</th -->
                      <th></th>
                  </tr>`;
        $("#db-table thead.sticky-thead").append(hdr);
    }

    function openDbConsole(e) {
        log("[openDbConsole]");
        $("#dbControlPanel").fadeToggle(200);
        $("#dbControlOverlayPanel").fadeToggle(200);

        if (!$(".db-row").length) {
            fillCtrlPanelRows();
        }
    }

    var consoleInit = false;
    function initControlPanel(retries=0) {
        debug("initControlPanel");
        if (consoleInit == true) return;
        let $title = $(".header-navigation.right > .header-buttons-wrapper > ul");
        let addlClass = "btn-wrap-fmt";
        if ($title.length === 0) {
            if (retries++ < 20) return setTimeout(initControlPanel, 250, retries);
            console.error("Nowhere to put control panel button");
        }

        if ($(".f-war-list > ul.table-header").css("position") == 'sticky')
            $(".f-war-list > ul.table-header").css("z-index", 999);

        const $controlBtn = $(`<a id="dbCtrlPanelBtn" class="t-clear h c-pointer right last ${addlClass}">
                                  <span class="icon-wrap svg-icon-wrap">
                                    <span class="link-icon-svg">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10.33"><defs><style>.cls-1{opacity:0.35;}.cls-2{fill:#fff;}.cls-3{fill:#777;}</style></defs><g id="Слой_2" data-name="Слой 2"><g id="icons"><g class="cls-1"><path class="cls-2" d="M10,5.67a2,2,0,0,1-4,0,1.61,1.61,0,0,1,0-.39A1.24,1.24,0,0,0,7.64,3.7a2.19,2.19,0,0,1,.36,0A2,2,0,0,1,10,5.67ZM8,1C3,1,0,5.37,0,5.37s3.22,5,8,5c5.16,0,8-5,8-5S13.14,1,8,1ZM8,9a3.34,3.34,0,1,1,3.33-3.33A3.33,3.33,0,0,1,8,9Z"></path></g><path class="cls-3" d="M10,4.67a2,2,0,0,1-4,0,1.61,1.61,0,0,1,0-.39A1.24,1.24,0,0,0,7.64,2.7a2.19,2.19,0,0,1,.36,0A2,2,0,0,1,10,4.67ZM8,0C3,0,0,4.37,0,4.37s3.22,5,8,5c5.16,0,8-5,8-5S13.14,0,8,0ZM8,8a3.34,3.34,0,1,1,3.33-3.33A3.33,3.33,0,0,1,8,8Z"></path></g></g></svg>
                                    </span>
                                  </span>
                                </a>`);
        $title.append($controlBtn);

        const $controlPanelDiv = $(`<div id="dbControlPanel" class="db-control-panel-popup">control</div>`);
        const $controlPanelOverlayDiv = $(`<div id="dbControlOverlayPanel" class="-control-panel-overlay"></div>`);

        $controlPanelDiv.html(getCtrlPanelHtml());
        $title.append($controlPanelDiv);

        log("Appended ctrl panel: ", $("#db-table"), $("#dbControlPanel"));
        consoleInit = true;

        addTblHdr();
        fillCtrlPanelRows();

        // Checkbox handlers
        $(".cdc-cb").on('click', function (e) {
            let key = $(this).attr('name');
            updateOption(key, $(this).prop('checked'));
        });

        // Input field handlers
        $(".cdc-input").on('change', function (e) {
            let key = $(this).attr('name');
            updateOption(key, $(this).val());
        });

        $("#dbCtrlPanelBtn").on('click', openDbConsole);

        $controlPanelOverlayDiv.click(function () {
            $controlPanelDiv.fadeOut(200);
            $controlPanelOverlayDiv.fadeOut(200);
        });

        $("#dashboard-close").on('click', function () {
            log("dashboard-close, click ", $("#mem-stat-wrap").length, $("#db-table > table"));
           // $("#db-table > table").css("visibility", "visible");
            if ($("#mem-stat-wrap").length > 0) {
                $("#mem-stat-wrap").remove();
                $("#accordian-hdr").remove();
                $("#db-table > table").css("visibility", "visible");
            } else {
                $controlPanelDiv.fadeOut(200);
                $controlPanelOverlayDiv.fadeOut(200);
            }
        });

    }

    // ======================== Options handling ==============================

    function handleOptInputChange(e) {
        GM_setValue($(this).attr("name"), $(this).val());
        readOpts();
        debug("Set option ", $(this).attr("name"), " to ", $(this).val());
    }

    function handleOptCbChange(e) {
        GM_setValue($(this).attr("name"), $(this).prop('checked'));
        readOpts();
        let labelTxt = ($(this).prop('checked') == true) ? 'true' : 'false';
        $(this).next().text(labelTxt);
        debug("Set option ", $(this).attr("name"), " to ", $(this).prop('checked'));
    }

    function handleOptSelectChange(e) {
        log("[handleOptSelectChange] ", $(this));
        log("Name/key: ", $(this).attr("name"), " option: ", $(this).val());
        GM_setValue($(this).attr("name"), $(this).val());
        readOpts();
        debug("Set option ", $(this).attr("name"), " to ", $(this).val());
    }

    function buildOptTableRows() {
        for (const [key, entry] of Object.entries(advFacOpts)) {
            let row = `<tr><td><span>${key}</span></td>`;
            row = row + getValCell(entry) + `<td><span>${entry.desc}</span></td></tr>`;
            $("#adv-fac-opts tbody").append(row);
        };

        function getValCell(entry) {
            entry.value = GM_getValue(entry.key, entry.value);
            let cell = ``;
            if (entry.type == 'number') {
                cell = cell +
                    `<td><span><label>` +
                    `<input type="number" name="${entry.key}" min="${entry.min}" max="${entry.max}" value="${entry.value}">` +
                    `${entry.label}</label></span></td>`;
            } else if (entry.type == "checkbox") {
                let checked = GM_getValue(entry.key, entry.value);
                let ck = (checked == true) ? 'checked' : '';
                entry.label = (checked == true) ? 'true' : 'false';
                cell = cell +
                    `<td><label class="xflexr">` +
                    `<input type="checkbox" name="${entry.key}" ${ck}>` +
                    `<span>${entry.label}</span></label></td>`;
            } else if (entry.type == "select") {
                let value = GM_getValue(entry.key, entry.value);
                let opts = "";
                entry.options.forEach(name => {
                    opts += `<option value="${name}">${name}</option>`;
                });
                cell = cell +
                    `<td><label class="xflexr">` +
                    `<select name="${entry.key}">${opts}</section>` +
                    `<span>${entry.label}</span></label></td>`;
            } else {
                return log("ERROR: invalid option type: ", entry);
            }
            return cell;
        }
    }

    function buildOptTblHdr() {
        let hdr = `<tr>`;
        optsHdrs.forEach(name => {
            hdr = hdr + `<th><span>${name}</span></th>`;
        });
        hdr = hdr + `</tr>`;
        $("#adv-fac-opts thead").append(hdr);
    }

    function buildOptsTable() {
        if ($("#adv-fac-opts").length > 0) {
            $("#adv-fac-opts").remove();
            return;
        }

        let table = `
            <div id="adv-fac-opts" class="opts-tbl xmt10">
                <table cellpadding>
                    <thead class="sticky-thead title-black"></thead>
                    <tbody></tbody>
                </table>
            </div>
        `;

        if ($(".stat-tbl").length> 0) $(".stat-tbl").remove();
        if ($("#tbl-btns").length > 0) $("#tbl-btns").remove();
        $("#adv-fac-bar").after($(table));
        buildOptTblHdr();
        buildOptTableRows();

        // Will this work?
        $('.opts-tbl select').each(function() {
            let key = $(this).attr("name");
            let value = GM_getValue(key, null);
            log("Set select: ", key, value);
            $(this).val(value);
        });

        // Option handlers
        $('.opts-tbl input[type="number"]').on('change', handleOptInputChange);
        $('.opts-tbl input[type="checkbox"]').on('change', handleOptCbChange);
        $('.opts-tbl select').on('change', handleOptSelectChange);
    }

    // ============================= Table Sorting ==========================

    function addSortArrowStyles() {
        // .sortable-hdr replaces "table thead tr th"
        GM_addStyle(`
            table thead tr th:after {
                position: absolute;
                right: 2px;
            }

            table thead tr th.sortable-hdr {
                padding-right: 14px;
                position: relative;
            }

            table thead tr th.sort-asc:after {
                content: "\u25b4";
                position: absolute;
                top: 0;
                bottom: 0;
                width: 14px;
            }

            table thead tr th.sort-desc:after {
                content: "\u25be";
                position: absolute;
                top: 0;
                bottom: 0;
                width: 14px;
            }

            .sortable-hdr {
                cursor: pointer;
                color: #555;
                color: var(--btn-color);
                text-shadow: 0 1px 0 #FFFFFF40;
                text-shadow: var(--btn-text-shadow);
                /*background: linear-gradient(180deg, #DEDEDE 0%, #F7F7F7 25%, #CFCFCF 60%, #E7E7E7 78%, #D9D9D9 100%);*/
                background: linear-gradient(180deg, #333333 0%, #555555 25%, #333333 60%, #333333 78%, #333333 100%);
                /*background: var(--btn-background);*/
                /*border: 1px solid #aaa;
                border: var(--btn-border);
                display: inline-block;
                vertical-align: middle;*/
            }
            .sortable-hdr:hover {
                filter: brightness(1.50);
                border: 1px solid #222;
                /*transform: scaleX(1.2);
                padding-right: 2px;*/
            }
            .sortable-hdr:active {
                filter: brightness(0.80);
                border: 1px solid #111;
            }
            .sortable-hdr span {
                padding-right: 4px;
            }
        `);
    }

    function addTableSort(parentId) {
        $(".sortable-hdr").on("click", function() {
            let dir = ($(this).hasClass("sort-asc")) ? "desc" : "asc";
            let table = $(this).parents("table");
            let rowArray = $(table).find("tbody tr").toArray();
            let idx = $(this).index() - 1;
            let rows = $(table).find("tbody tr").toArray().sort(TableComparer(idx, dir));

            let body = $(table).find("tbody");
            rows.forEach(row => {
                $(body).append(row);
            });

            table.find("thead tr th").removeClass("sort-asc").removeClass("sort-desc");
            $(this).removeClass("sort-asc").removeClass("sort-desc") .addClass("sort-" + dir);
        });

        function TableCellValue(row, index) {
            return $(row).children("td").eq(index).text();
        }

        function dbgWriteRowArray(arr, idx, msg) {
            let arrVals = [];
            arr.forEach(row => {
                arrVals.push(TableCellValue(row, idx));
            });

            log(msg, arrVals);
        }

        function TableComparer(index, dir) {
            return function (a, b) {
                let val_a = TableCellValue(a, index).replace(/\$\,/g, "");
                let val_b = TableCellValue(b, index).replace(/\$\,/g, "");
                let result = val_a.toString().localeCompare(val_b);

                if ($.isNumeric(val_a) && $.isNumeric(val_b)) {
                    result = (dir == 'asc') ?
                        parseInt(val_a) - parseInt(val_b) : parseInt(val_b) - parseInt(val_a);
                } else if (isDate(val_a) && isDate(val_b)) {
                    let date_a = new Date(val_a);
                    let date_b = new Date(val_b);
                    result = date_a - date_b;
                }

                return result;
            }
        }
    }

    // =============== Stats table(s) installation/handling ===================

    var detachedTables = {};
    function getHonorForId(id) {
        let node = $(`[data-id='${id}']`).find(".honor-text-wrap").clone();
        $(node).removeClass("big").addClass("small");
        return $(node);
    }

    var rowKeys;
    function buildTableRow(stat, id) {
        let divId = `stat-tbl-${stat}`;
        getStatsForMemberFromDb(id)
       .then(value => {
            if (!rowKeys && value) {
                rowKeys = getAllKeysWithPaths(value[stat]);
                let thRow = "<th>Member</th>";

                rowKeys.forEach(key => {
                    if (key.indexOf(".") < 0 && typeof value[stat][key] != 'object') {
                        thRow = thRow + `<th  class="sortable-hdr">${key}</th>`;
                    } else if (key.indexOf(".") > -1) {
                        let parts = key.split('.');
                        let path = value[stat];
                        let newKey;
                        for (let idx=0; idx<parts.length-1; idx++) {
                            path = path[parts[idx]];
                            newKey = parts[idx+1];
                        }
                        thRow = thRow + `<th class="sortable-hdr">${newKey}</th>`;
                    }
                });
                $("thead.sticky-thead > tr").empty();
                $("thead.sticky-thead > tr").append(thRow);
                addTableSort();
            }

            let keys = rowKeys; 
            let cells = "";
            log("******* Check This! ********");
            if (keys) keys.forEach(key => {
                if (key.indexOf(".") > -1) {
                    let parts = key.split(".");
                    let path = value[stat];
                    let newKey;
                    for (let idx=0; idx<parts.length-1; idx++) {
                        path = path[parts[idx]];
                        newKey = parts[idx+1];
                    }
                    let dataVal = path[newKey];
                    let val = path[newKey];
                    cells = cells + `<td><span>${val}</th>`;
                } else if (typeof value[stat][key] == 'object') {
                    //debug("Skipping key ", key);
                } else {
                    cells = cells + `<td><span>${value[stat][key]}</th>`;
                }
            });

            if (membersList[id]  != undefined) {
                let honor = getHonorForId(id);
                let name = membersList[id].name;
                let row = `<tr data-id="${id}" data-name="${name}">
                               <th><span class="honor-text-wrap default img-wrap small">${$(honor).html()}</span></th>
                               ${cells}
                           </tr>`;
                $(`#${divId}`).find("tbody").append(row);
            }
        })
       .catch(error => console.error(error));
    }

    function detachStatTbl() {
        let sib = $("#tbl-btns").next();
        if ($(sib).hasClass("stat-tbl")) {
            let tblId = $(sib).attr("id");
            detachedTables[tblId] = $(sib).detach();
        }
    }

    function buildStatTable(stat) {
        rowKeys = null;
        let divId = `stat-tbl-${stat}`;
        let table = `
            <div id="${divId}" class="stat-tbl scroll-wrap">
                <table>
                    <thead class="sticky-thead title-black"><tr id='stat-hdr-row'></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        `;

        detachStatTbl();

        if (detachedTables[divId]) {
            log("Re-using detached table!!!!");
            $("#tbl-btns").after(detachedTables[divId]);
        } else {
            $("#tbl-btns").after(table);
            for (const id of Object.keys(membersList)) {
                buildTableRow(stat, id);
            };

            log("Built rows, rowKeys: ", rowKeys);
            if (rowKeys && rowKeys.length) {
                let thRow = "<th>Member</th>";
                rowKeys.forEach(key => {
                    thRow = thRow + `<th>${key}</th>`;
                });
                $("thead.sticky-thead > tr").empty();
                $("thead.sticky-thead > tr").append(thRow);
                log("Appended header row: ", $("thead.sticky-thead > tr"));
            }

            addTableSort(divId);
        }
    }

    function handleHdrBtns(e) {
        let btn = $(e.currentTarget);
        $(".selected").removeClass("selected");
        $(btn).addClass("selected");
        debug("[handleHdrBtns]: ", $(btn).attr("id"));
        buildStatTable($(btn).attr("id"));
    }

    function getTopHeaderRow() {
        if (!$("#tbl-btns").length) {
            if ($("#adv-fac-opts").length > 0) $("#adv-fac-opts").remove();

            const row1 = { "attacking": "Attack",  "jobs": "Jobs",               "trading": "Trade",       "jail": "Jail",
                           "hospital": "Hosp",     "finishing_hits": "Fin Hits", "communication": "Comm",  "crimes": "Crimes" };
            const row2 = { "bounties": "Bounty",   "items": "Items",             "travel": "Travel",       "drugs": "Drugs",
                           "missions": "Mission",  "racing": "Racing",           "networth": "NW",         "other": "Other" };
            let hdr = `<div id="tbl-wrap">
                          <div id="tbl-btns"><table><tbody></tbody></table></div>
                      </div>`;
            let table = $(hdr);
            let tbody = $(table).find('tbody');
            for (let i=0;i<2;i++) {
                let row = "<tr>";
                for (const [key, value] of Object.entries((i ==0 ? row1 : row2))) {
                    row = row + `<td><input id='${key}' type="submit" class="btn-dark-bg stat-btn" value="${value}"></td>`;
                }
                row = row + "</tr>";
                $(tbody).append(row);
            }

            $("#adv-fac-bar").after($(table));
            $(".stat-btn").on('click', handleHdrBtns);

        } else {
            detachStatTbl();
            $("#tbl-btns").remove();
        }
    }

    // ============= Search bar UI installation, Search handling ==============

    function addAcStyles() {
        GM_addStyle(`
            .ib {
                display: inline-block;
                padding-left: 5px;
            }
            .ac-hide {
                order: 10;
                content-visibility: hidden;
                height: 35px;
                min-height: 35px;
                background: var(--main-bg);
            }
            .ac-hide2 {
                order: 10;
                visibility: hidden;
            }
            .ac-hide1 {
                display: none !important;
            }
            .li-content {
                cursor: pointer;
                display: block;
                font-size: 16px;
                line-height: 22px;
                padding: 4px 10px;
                color: #bbb;
                text-decoration: none;
                font: inherit;
                vertical-align: baseline;
            }
            .li-content:hover {
                filter: brightness(1.4);
            }
            .ac-scrollable {
                background-color: #222;
                border-radius: 0 0 5px 5px;
                border-top: 0;
                box-shadow: 0 0 0 1px #444, 0 1px 2px rgba(0,0,0,.451);
                left: 1px;
                max-height: 200px;
                position: absolute;
                z-index: 99999;

                border-bottom: 1px solid #eee;
                border-right: 1px solid #eee;
                border-left: 1px solid #eee;
                width: 175px !important;
                margin-top: -4px !important;
            }

        `);
    }

    function onResponse(event, ui) {
        $(".members-list .table-body li.table-row").removeClass("ac-hide").removeClass("ac-res");

        if (ui.content) {
            ui.content.forEach(el => {
                let list = $(`[data-id='${el.data}']`).addClass("ac-res");
            });
        }

        $(".members-list .table-body li.table-row").not(".ac-res").addClass("ac-hide"); //.css("display", "none");
    }

    function installAutoComplete(id, retries=0) {
        if (!Object.keys(membersList).length) {
            acWaitingOnMembers = true;
            return;
        }
        acWaitingOnMembers = false;

        let sel = `#${searchid}`;
        $(sel).autocomplete(
            {
                source: acSource,
                response: onResponse,
                create: function (event, ui) {
                    $(this).data('ui-autocomplete')._renderItem = function (ul, item) {
                        return $('<li>')
                        .addClass("li-content")
                        .attr( "data-value", item.value )
                        .append( '<a>' + item.label + ' [' + item.data + '] </a>' )
                        .appendTo( ul );
                    };
                    $(this).data('ui-autocomplete')._renderMenu = function (ul, items) {
                        $(ul).addClass("ac-scrollable");
                        var that = this;
                        $.each( items, function( index, item ) {
                            that._renderItemData( ul, item );
                        });
                    };
                },
            });

        $(sel).on( "autocompleteselect", function( event, ui ) {
            $(".members-list .table-body li").removeClass("ac-hide").removeClass("ac-res");
            $(".outline-green").removeClass("outline-green");
            let id = ui.item.data;
            let name = ui.item.label;
            let li = $(`[data-id='${id}']`);
            //log("autocompleteselect: ", ui.item, name, "[", id, "] ", $(li));
            $(li).addClass("outline-green bg-mild-gr");
            scrollTo($(li));
        });
    }

    const btnHelp = { "view-stats": "Click here to view all<br>" +
                                    "personal stats, for all fac<br>" +
                                    "members. It is organized into<br>" +
                                    "a series of sub-categories that<br>" +
                                    "you can select from. Click this<br>" +
                                    "again to close all.",
                      "upd-stats": "This will start to update all user's<br>" +
                                   "stats again from the Torn servers. It<br>" +
                                   "makes a request every two seconds by<br>" +
                                   "default, so 30 a minute. If interrupted,<br>" +
                                   "it will continue next time from where it<br>" +
                                   "off.",
                      "fac-opts": "This allows you to set various options<br>" +
                                  "the script uses. Self-explanatory...",
                      "view-db": "This allows you to view the saved contents of<br>" +
                                 "the faction stats database, and perform minor<br>" +
                                 "maintainence.",
                    };

    function installSearchUI(target) {
        debug("[installSearchUI] ", $(target), $("#adv-fac-bar"));
        if ($("#adv-fac-bar").length) return log("Search bar already installed!");
        if (!$(target).length) return log("[installSearchUI] timeout installing search bar");

        $(target).before(getFacSearchDiv());

        $("#upd-stats").on('click', handleUpdateBtn);
        $("#view-stats").on('click', getTopHeaderRow);
        $("#fac-opts").on('click', buildOptsTable);
        $("#view-db").on('click', openDbConsole);

        addSearchBarHelp();

        updateFacMemberList();
        installAutoComplete(searchid);

        setProgressUpdated(true);

        // ======== the html ....
        function getFacSearchDiv() {
            let div =
                `<div id="adv-fac-bar">
                    <div>
                        <label>
                           <input type="text" id="${searchid}" name="search" class="ac-search m-top10 ui-autocomplete-input ac-border">
                        </label>
                        <input id='view-stats' type="submit" class="btn-dark-bg torn-btn" value="View Stats">
                        <input id='upd-stats' type="submit" class="btn-dark-bg torn-btn" value="Update">
                        <input id='fac-opts' type="submit" class="btn-dark-bg torn-btn" value="Options">
                        <input id='view-db' type="submit" class="btn-dark-bg torn-btn" value="DB">
                        <span id="prog-text"></span>
                    </div>
                </div>`;

            return div;
        }

        // Context sensitive help
        function addSearchBarHelp() {
            let btns = $("#adv-fac-bar input[type='submit']");
            $.each(btns, function (index, button) {
                let id = $(button).attr("id");
                displayHtmlToolTip(button, btnHelp[id], "tooltip4");
            });
        }
    }

    // ================ Entry points, besides initial 'main' ==================

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function handlePageLoad(retries=0) {
        if (getCurrTab() != 'info') return log("Not on info page...");
        openDatabase(true);
        callWhenReady(installSearchUI, ".f-war-list.members-list", 250, 50);

        initCSS();
        initControlPanel();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    debug("Debug logging enabled");

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {
        addFlexStyles();
        loadCommonMarginStyles();
        addTornButtonExStyles();
        addToolTipStyle();
        addAcStyles();
        addSortArrowStyles();
        addAccordianStyles();

        // If TTS is running, '#xedx-search' disables (moves) that search bar
        // Styles for the top search bar
        GM_addStyle(`
            .outline-green {
                outline: 2px solid green;
                outline-offset: 0px;
            }
            .outline-blue {
                outline: 2px solid blue;
                outline-offset: 0px;
            }
            .bg-mild-gr {
                background-color: rgba(108,195,21,.07) !important;
            }
            #xedx-search {
                top: -2000px;
                left: -2000px;
                position: absolute;
            }
            #prog-text {
                margin-left: 20px;
            }
            #fac-search {
                width: 175px !important;
                margin-right: 10px;
            }
            .ac-border {
                border: 1px solid #666;
            }
        `);

        // Button table styles
        GM_addStyle(`
            #tbl-btns {
                display: flex;
                justify-content: center;
                padding: 10px 0px;
            }
            #tbl-btns table {
                border: 1px solid #666 !important;
                border-radius: 6px;
                width: 100%;
            }
            #tbl-btns tbody {
                padding: 10px;
            }
            #tbl-btns td {
                padding: 2px 6px 2px 6px;
            }
        `);

        // Stats/opts tables

        GM_addStyle(`
            tr[data-id="${myId}"] > td {
                background-color: rgba(108,195,21,.07) !important;
            }
         `);

        GM_addStyle(`
            .sticky-top {
                z-index: 99 !important;
            }
            .stat-tbl, .opts-tbl {
                display: flex;
                justify-content: left;
                border: 1px solid #666;
                border-radius: 6px;
            }
            .opt-tbl {
                margin-top: 8px;
            }
            .stat-tbl > table,
            .opts-tbl > table {
                width: 5000px;
                left: 0;
                position: relative;
            }
            .stat-tbl tr, .opts-tbl tr {
                height: 32px;
            }
            .stat-tbl tbody tr th:first-child {
                width: 110px !important;
                max-width: 110px !important;
                position: sticky;
                left: 0;
                z-index: 9;
                /*background-color: #444;*/
                outline: 1px solid #666;
                background: linear-gradient(90deg, #333333 0%, #555555 25%, #333333 60%, #333333 78%, #333333 100%);
            }
            .stat-tbl tbody tr:hover th:first-child {
                filter: brightness(1.50);
                border: 1px solid #222;
            }
            .stat-tbl tr:hover td:not(:first-child) {
                filter: brightness(1.2);
                background-color: #222222;
            }
            .stat-tbl tr:hover td:first-child {
                filter: brightness(1.2);
                background-color: #;
            }
            .stat-tbl td {
                color: var(--btn-color);
                border: 1px solid #666 !important;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                height: 100%;
                min-width: 60px;
                z-index: 0;
            }
            .opts-tbl td {
                color: var(--btn-color);
                border: 1px solid #666 !important;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                min-width: 60px;
                z-index: 0;
                padding-left: 10px;
                vertical-align: middle;
            }
            .stat-tbl td span, .img-wrap, .stat-tbl th span {
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                align-content: center;
                height: 32px;
            }
            .opts-tbl td span, .opts-tbl th span {
                display: flex;
                flex-flow: row wrap;
                justify-content: left;
                align-content: center;
                height: 32px;
            }
            .opts-tbl input[type="number"] {
                width: 48px;
                border-radius: 4px;
                padding-left: 5px;
                margin-right: 4px;
            }
            .opts-tbl input[type="checkbox"] {
                margin-right: 6px;
            }
            .opts-tbl td:last-child span {
                word-wrap: break-word;
            }
            .stat-tbl table th, .opts-tbl table th {
                border-left: 1px solid #666;
                border-right: 1px solid #666;
                text-overflow: ellipsis;
                white-space: nowrap;
                position: relative;
                left: 0;
                z-index: 9;
                padding: 0px 4px 0px 4px;
                outline: 1px solid #666;
            }
            table th:last-child,
            table td:last-child {
                padding-right: 10px;
            }
            .stat-tbl table thead th:first-child {
                position: sticky;
                left: 0;
                z-index: 9999;
                width: 110px !important;
                max-width: 110px !important;
                background-color: #444;
                padding: 0px;
            }
            .stat-tbl thead.sticky-thead,
            .opts-tbl thead.sticky-thead,
            .db-tbl thead.sticky-thead {
                position: sticky;
                inset-block-start: 0;
                font-size: 12px;
                font-weight: bold;
                letter-spacing: 0;
                text-shadow: var(--tutorial-title-shadow);
                color: var(--tutorial-title-color);
                z-index: 999;
                outline: 1px solid #666;
                outline-offset: -1px;
            }
            .scroll-wrap {
                overflow: scroll;
                overflow-x: auto;
                height: 340px;
                width: 784px;
                max-width: 784px;
            }
            .scroll-wrap2 {
                overflow: scroll;
                height: 486px;
                width: 982px;
                max-width: 982px;
            }
        `);

        // Buttons
        GM_addStyle(`
            .stat-btn {
                height: 24px;
                width: 74px;
                line-height: 16px;
                font-family: "Fjalla One", Arial, serif;
                font-size: 12px;
                font-weight: normal;
                text-align: center;
                border-radius: 5px;
                padding: 0 10px;
                cursor: pointer;
                color: #555;
                color: var(--btn-color);
                text-shadow: 0 1px 0 #FFFFFF40;
                text-shadow: var(--btn-text-shadow);
                background: linear-gradient(180deg, #DEDEDE 0%, #F7F7F7 25%, #CFCFCF 60%, #E7E7E7 78%, #D9D9D9 100%);
                background: var(--btn-background);
                border: 1px solid #aaa;
                border: var(--btn-border);
                display: inline-block;
                vertical-align: middle;
            }
            .stat-btn:hover {
                filter: brightness(1.50);
                border: 1px solid #222;
            }
            .stat-btn:active {
                filter: brightness(0.80);
                border: 1px solid #111;
            }
            .stat-btn.selected {
                background: #111;
                border: 1px solid #444;
                filter: brightness(1.50);
            }
        `);
    }

})();