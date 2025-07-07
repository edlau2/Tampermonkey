// ==UserScript==
// @name         Torn Adv Fac Info
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Adds better search and member stats to fac info page
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php?step=your*
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

    // Globals
    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    const searchid = "fac-search";

    // =========================== Helper funcs ===============================

    function getCurrTab() {
        if (location.hash) return new URLSearchParams(location.hash.slice(2)).get("tab");
    }

    function scrollTo(node) {
        if ($(node).length) {
            var targetScrollPosition = $(node).offset().top - ($(window).height() / 2) + ($(node).outerHeight() / 2);
            $('html, body').animate({scrollTop: targetScrollPosition}, 100);
        }
    }

    function tm_str(tm) {
        let dt = tm ? new Date(tm) : new Date();
        const mediumTime = new Intl.DateTimeFormat("en-GB", {timeStyle: "medium", hourCycle: "h24",});
        const shortDate = new Intl.DateTimeFormat("en-GB", {dateStyle: "short", });
        return (mediumTime.format(dt) + " - " + shortDate.format(dt));
    }

    function setProgressText(msg) { $("#prog-text").text(msg ?? ""); }

    function setProgressUpdated(saved=false) {
        if (saved == true) {
            let tm = GM_getValue("LastUpdated", 0);
            if (!tm) return setProgressUpdated();
            $("#prog-text").text(`Last Update: ${tm_str(tm)}`);
        } else {
            GM_setValue("LastUpdated", (new Date().getTime()));
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
    const facStatsStore = "fac-member-stats";

    function openDatabase() {
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
                const stats = event.target.result;
                //if (stats) log('Retrieved stats:', stats);
                resolve(stats);
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

        let stats = data.personalstats;
        let keys = Object.keys(stats);
        let dataToAdd = {};
        keys.forEach(key => {
            dataToAdd[key] = stats[key];
        });
        //const dataToAdd = { id: 1, name: 'Example Item', value: 'Some Data' };
        const request = objectStore.put(dataToAdd, id);

        request.onsuccess = () => log(`Added stats for: ${id}`);
        request.onerror = (e) => log('Error adding stats:', e);

        transaction.oncomplete = () => {
            //debug('Data added successfully, verifying...');
            //getStatsForMemberFromDb(id);
        }
        transaction.onerror = (e) => log('ERROR: Transaction failed:', e);
    }


    // ============ API/web page stuff: fac members, personal stats ============

    var facMembersUpdated = false;
    var membersList = {};
    var acSource = [];
    var memberCount = 0;
    var acWaitingOnMembers = false;   // Auto-Complete waiting
    var updatingStats = false;

    // Set this based on time of last update?
    var statsNeedUpdate = GM_getValue("statsNeedUpdate", false);       // true to update stats after getting member list
    var lastKeyIdx = GM_getValue("lastKeyIdx", 0) ?? 0;
    var memberKeys;
    var cancelUpd = false;

    function updateMemberStats(last=0) {
        debug("[updateMemberStats] last: ", last, " idx: ", lastKeyIdx, " cancelUpd: ", cancelUpd);
        if (cancelUpd == true) {
            return processUpdateDone();
        }
        if (facMembersUpdated == false) {
            statsNeedUpdate = true;
            return;
        }
        updatingStats = true;
        statsNeedUpdate = false;
        if (!memberKeys)
            memberKeys = Object.keys(membersList);

        if (last == 0) {
            lastKeyIdx = GM_getValue("lastKeyIdx", 0);
            last = lastKeyIdx ? parseInt(lastKeyIdx) : 0;
        }
        if (last == memberKeys.length) {
            log("ERROR: length! ", last, lastKeyIdx, memberKeys.length, memberKeys);
            last = 0;
            lastKeyIdx = 0;
            GM_setValue("lastKeyIdx", last);
            //return processUpdateDone();
        }

        let key = memberKeys[last];
        if (!key) {
            processUpdateDone();
            return log("ERROR: no key! ", last, lastKeyIdx, key, memberKeys.length, memberKeys);
        }
        getMemberStats(key, last);

        last = Number(last) + 1;
        if (last == memberKeys.length) {
            last = 0;
            return processUpdateDone();
        }

        GM_setValue("lastKeyIdx", last);
        setTimeout(updateMemberStats, 2000, last);

        function processUpdateDone() {
            setProgressText("Update " + ((cancelUpd == true) ? "cancelled." : "complete."));
            setTimeout(setProgressUpdated, 5000);

            updatingStats = false;
            cancelUpd = false;
            $("#upd-stats").val("Update");
            GM_setValue("statsNeedUpdate", false);
            GM_setValue("lastKeyIdx", last);
        }
    }

    function updateFacMemberList(retries=0) {
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
        if (statsNeedUpdate == true) updateMemberStats();
    }

    // TEMPORARY test!
    //getMemberStats(271665, 666);

    function processStatQuery(data, status) {
        if (Number(this.idx) == 666) {
            return log("Data: ", JSON.stringify(data, null, 4));
        }
        setProgressText(`[${this.idx}/${memberCount}] Writing ${this.name} [${this.id}] to DB`);
        addStatsToDb(data, this.id);
    }

    function getMemberStats(id, idx) {
        const url = `https://api.torn.com/v2/user/${id}/personalstats?cat=all&key=${api_key}`;
        let name = membersList[id] ? membersList[id].name : "unknown";
        setProgressText(`[${idx}/${memberCount}] Updating ${name} [${id}]`);
        $.get({url: url, id: id, idx: idx, name: name, success: processStatQuery});
    }

    // ======================== Options handling ==============================

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
            //log('Retrieved value:', value);

            //log("{buildTableRow] rowKeys.length: ", rowKeys.length);
            if (!rowKeys) {
                rowKeys = getAllKeysWithPaths(value[stat]);

                //rowKeys = Object.keys(value[stat]);
                log("Saved keys for stat: ", rowKeys);
                let thRow = "<th>Member</th>";

                rowKeys.forEach(key => {
                    log("key: ", key, " type: ", typeof value[stat][key]);
                    if (key.indexOf(".") < 0 && typeof value[stat][key] != 'object') {
                        log("Using key ", key, (key.indexOf(".") < 0), (typeof value[stat][key] != 'object'));
                        thRow = thRow + `<th>${key}</th>`;
                    } else if (key.indexOf(".") > -1) {
                        let parts = key.split('.');
                        log("*** nested path, depth: ", parts.length);
                        let path = value[stat];
                        let newKey;
                        for (let idx=0; idx<parts.length-1; idx++) {
                            path = path[parts[idx]];
                            newKey = parts[idx+1];

                        log("path: ", path, "newKey: ", newKey);
                        }
                        thRow = thRow + `<th>${newKey}</th>`;
                    } else {
                        log("Skipped object key ", key);
                    }
                });
                $("thead.sticky-thead > tr").empty();
                $("thead.sticky-thead > tr").append(thRow);
            }

            let keys = rowKeys; //Object.keys(value[stat]);
            let cells = "";
            keys.forEach(key => {
                if (key.indexOf(".") > -1) {
                    let parts = key.split(".");
                    log("*** nested path, depth: ", parts.length);
                    let path = value[stat];
                    let newKey;
                    for (let idx=0; idx<parts.length-1; idx++) {
                        path = path[parts[idx]];
                        newKey = parts[idx+1];
                    }
                    //let subkey = parts[0];
                    //let base = value[stat][subkey];
                    //let newKey = parts[1];
                    let dataVal = path[newKey];
                    log("path[newKey]: ", path, "[", newKey, "] = ", path[newKey]);
                    let val = path[newKey];
                    cells = cells + `<td><span>${val}</th>`;
                } else if (typeof value[stat][key] == 'object') {
                    log("Skipping key ", key);
                } else {
                    cells = cells + `<td><span>${value[stat][key]}</th>`;
                }
            });

            let honor = getHonorForId(id);
            let row = `<tr>
                           <th><span class="honor-text-wrap default img-wrap small">${$(honor).html()}</span></th>
                           ${cells}
                       </tr>`;
            $(`#${divId}`).find("tbody").append(row);
            //log("Row added to ", $(`#${divId}`));
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
                    <thead class="sticky-thead title-black"><tr></tr></thead>
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

            log("Finished table rows");
            log("Add headers? ", rowKeys.length);
            log("rowkeys: ", rowKeys);
            if (rowKeys.length) {
                let thRow = "<th>Member</th>";
                rowKeys.forEach(key => {
                    thRow = thRow + `<th>${key}</th>`;
                });
                $("thead.sticky-thead > tr").empty();
                $("thead.sticky-thead > tr").append(thRow);
            }
            log("Done adding hdr cells to ", $("thead.sticky-thead > tr"));
        }
    }

    function handleHdrBtns(e) {
        let btn = $(e.currentTarget);
        log("[handleHdrBtns]: ", $(btn).attr("id"));
        buildStatTable($(btn).attr("id"));
    }

    function getTopHeaderRow() {
        if (!$("#tbl-btns").length) {
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

    function installAutoComplete(id, retries=0) {
        if (!Object.keys(membersList).length) {
            acWaitingOnMembers = true;
            return;
        }
        acWaitingOnMembers = false;

        let sel = `#${searchid}`;
        $(sel).autocomplete({source: acSource});
        $(sel).on( "autocompleteselect", function( event, ui ) {
            $(".outline-green").removeClass("outline-green");
            let id = ui.item.data;
            let name = ui.item.label;
            let li = $(`[data-id='${id}']`);
            log("autocompleteselect: ", ui.item, name, "[", id, "] ", $(li));
            $(li).addClass("outline-green bg-mild-gr");
            scrollTo($(li));
        });
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

    function installSearchUI(target) {
        debug("[installSearchUI] ", $(target));
        if (!$(target).length) return log("[installSearchUI] timeout installing search bar");

        $(target).before(getFacSearchDiv());

        $("#upd-stats").on('click', handleUpdateBtn);
        $("#view-stats").on('click', getTopHeaderRow);

        updateFacMemberList();
        installAutoComplete(searchid);

        setProgressUpdated(true);

        // ======== the html ....
        function getFacSearchDiv() {
            let div =
                `<div id="adv-fac-bar">
                    <div>
                        <label>Search:
                           <input type="text" id="${searchid}" name="search" class="ac-search m-top10 ui-autocomplete-input ac-border">
                        </label>
                        <input id='view-stats' type="submit" class="btn-dark-bg torn-btn" value="View Stats">
                        <input id='upd-stats' type="submit" class="btn-dark-bg torn-btn" value="Update">
                        <input id='fac-opts' type="submit" class="btn-dark-bg torn-btn" value="Options">
                        <span id="prog-text"></span>
                    </div>
                    <!-- hr class="delimiter-999 m-top10" -->
                </div>`;

            return div;
        }
    }

    // ================ Entry points, besides initial 'main' ==================

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function handlePageLoad(retries=0) {
        if (getCurrTab() != 'info') return log("Not on info page...");
        openDatabase();
        callWhenReady(installSearchUI, ".f-war-list.members-list", 250, 50);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

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
                border: 1px solid white;
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
                border: 1px solid white !important;
                width: 100%;
            }
            #tbl-btns tbody {
                padding: 10px;
            }
            #tbl-btns td {
                padding: 2px 6px 2px 6px;
            }
        `);

        // Stats tables
        GM_addStyle(`
            .stat-tbl {
                display: flex;
                justify-content: left;
                border: 1px solid white;
            }
            .stat-tbl > table {
                width: 5000px;
                left: 0;
                position: relative;
                /*margin-left: 158px;*/
            }
            .stat-tbl tr {
                height: 32px;
            }
            .stat-tbl tbody tr th:first-child {
                width: 110px !important;
                max-width: 110px !important;
                position: sticky;
                left: 0;
                z-index: 9;
                background-color: #444;
                outline: 1px solid white;
            }
            .stat-tbl td {
                color: white;
                border: 1px solid white !important;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                height: 100%;
                min-width: 60px;
                z-index: 0;
            }
            .stat-tbl td span, .img-wrap, .stat-tbl th span {
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                align-content: center;
                height: 32px;
            }
            .stat-tbl table th {
                border-left: 1px solid white;
                border-right: 1px solid white;
                text-overflow: ellipsis;
                white-space: nowrap;
                position: relative;
                left: 0;
                z-index: 9;
                padding: 0px 4px 0px 4px;
                outline: 1px solid white;
            }
            table th:last-child,
            table td:last-child {
                padding-right: 10px;
            }
            table thead th:first-child {
                position: sticky;
                left: 0;
                z-index: 9999;
                width: 110px !important;
                max-width: 110px !important;
                background-color: #444;
                padding: 0px;
            }
            .stat-tbl thead.sticky-thead {
                position: sticky;
                inset-block-start: 0;
                font-size: 12px;
                font-weight: bold;
                letter-spacing: 0;
                text-shadow: var(--tutorial-title-shadow);
                color: var(--tutorial-title-color);
                z-index: 999;
                outline: 1px solid white;
                outline-offset: -1px;
            }
            .scroll-wrap {
                overflow: scroll;
                overflow-x: auto;
                height: 340px;
                width: 784px;
                max-width: 784px;
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
        `);
    }

})();