// ==UserScript==
// @name         Torn Adv Fac Info
// @namespace    http://tampermonkey.net/
// @version      1.10
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
        const request = objectStore.put(dataToAdd, id);

        request.onsuccess = () => debug(`Added stats for: ${id}`);
        request.onerror = (e) => debug('Error adding stats:', e);

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

    var statsNeedUpdate = GM_getValue("statsNeedUpdate", false);       // true to update stats after getting member list
    var lastKeyIdx = GM_getValue("lastKeyIdx", 0) ?? 0;
    var memberKeys;
    var cancelUpd = false;

    if (GM_getValue("LastUpdated", 0) == 0) {
        statsNeedUpdate = true;
    }

    function updateMemberStats(last=0) {
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
        if (last == memberKeys.length) {
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

            statsNeedUpdate = false;
            facMembersUpdated = true;
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

        // Display msg asking if update is OK?
        if (statsNeedUpdate == true) {
            if (GM_getValue("lastUpdated", 0) == 0) {
                if (confirm(`Fac member stats must be retrieved periodically.\n` +
                            `You can click 'cancel' to stop the process, and\n` +
                            `click 'update' at any time to start again. This\n` +
                            `makes one API call every 2 seconds (configurable)\n` +
                            `and does not have to be done too often.\n` +
                            `Press OK to go ahead or Cancel to skip for now.`)) {
                    updateMemberStats();
                }
            } else {
                updateMemberStats();
            }
        }
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

    // ======================= DB UI/Control Panel ============================

     function initCSS() {
        const isDarkmode = $("body").hasClass("dark-mode");
        GM_addStyle(`
            .chat-control-panel-popup {
                position: fixed;
                top: 10%;
                left: 15%;
                border-radius: 10px;
                padding: 10px;
                background: ${isDarkmode ? "#999" : "#F0F0F0"};
                z-index: 1000;
                display: none;
              }

              .chat-control-panel-results {
                padding: 10px;
              }

              .chat-control-player {
                margin: 4px 4px 4px 4px !important;
                display: inline-block !important;
              }

              .chat-control-panel-overlay {
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

              div#chat-player-list {
                overflow-y: scroll;
                height: 50px;
              }

              a.chat-history-search:hover {
                color: #318CE7 !important;
              }

              .chat-control-panel-item {
                display: inline-block;
                /* margin: 2px 2px 2px 2px; */
              }
          `);

        GM_addStyle(`
            #chatHistoryControl {
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
            #chat-target-id-input {
                border-radius: 4px;
                padding: 2px;
                margin-left: 5px;
            }

            #cdc-opt-table td, label, input, .cpl-text {
                line-height: 22px;
                font-family: Arial, serif;
                font-size: 14px;
            }
            #cdc-opt-table td label {
                padding: 2px 20px 2px 20px;
            }

            .dbg-log {
                /*line-height: 22px;*/
                font-family: Arial, serif;
                font-size: 12px;
                color: black;
                margin-top: 6px;
            }

            .cdc-ip {

            }
            #history {
                width: 50px;
                border-radius: 5px;
                padding-left: 5px;
                margin-left: 5px;
            }
        `);
    }

    function getCtrlPanelHtml() {
        let innerHtml = `
            <div class="xflexr">
                <div class="xflexc" style="width: 25%;">
                    <div class=xflexr xmt10">
                        <input type="text" class="chat-control-panel-item cpl-text xmr10" id="target-id-input" placeholder="Player ID" size="10" />
                        <button id="chat-search" class="xedx-torn-btn" style="cursor: pointer;">Search</button>
                    </div>
                    <div id="chat-player-list" class="cpl-text xmt10"></div><br>
                </div>
                <div style="margin-left: auto;" class="xflexc">
                    <button id="dashboard-close" class="xedx-torn-btn" style="cursor: pointer;margin-left: auto;">Close</button>
                    <div style="display:flex;flex-flow:row wrap;align-items:center;">
                        <input id="dbgLogging" class="cdc-cb xmr5 xmt5" type="checkbox" name="debugLoggingEnabled">
                        <label for="dbgLogging" class="dbg-log">Debug Logging</label>
                    </div>
                </div>
            </div>
            <textarea readonly id="chat-results" cols="120" rows="30"></textarea>
        `;

        return innerHtml;
    }

    function initControlPanel(retries=0) {
        debug("initControlPanel");
        let $title; // = $("div#top-page-links-list");
        let addlClass = "links-fmt";
        //if ($title.length === 0) {
            addlClass = "btn-wrap-fmt";
            $title = $(".header-navigation.right > .header-buttons-wrapper > ul");
        //}
        if ($title.length === 0) {
            if (retries++ < 20) return setTimeout(initControlPanel, 250, retries);
            console.error("Nowhere to put control panel button");
        }

        if ($(".f-war-list > ul.table-header").css("position") == 'sticky')
            $(".f-war-list > ul.table-header").css("z-index", 999);

        const $controlBtn = $(`<a id="chatHistoryControl" class="t-clear h c-pointer right last ${addlClass}">
                                  <span class="icon-wrap svg-icon-wrap">
                                    <span class="link-icon-svg">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10.33"><defs><style>.cls-1{opacity:0.35;}.cls-2{fill:#fff;}.cls-3{fill:#777;}</style></defs><g id="Слой_2" data-name="Слой 2"><g id="icons"><g class="cls-1"><path class="cls-2" d="M10,5.67a2,2,0,0,1-4,0,1.61,1.61,0,0,1,0-.39A1.24,1.24,0,0,0,7.64,3.7a2.19,2.19,0,0,1,.36,0A2,2,0,0,1,10,5.67ZM8,1C3,1,0,5.37,0,5.37s3.22,5,8,5c5.16,0,8-5,8-5S13.14,1,8,1ZM8,9a3.34,3.34,0,1,1,3.33-3.33A3.33,3.33,0,0,1,8,9Z"></path></g><path class="cls-3" d="M10,4.67a2,2,0,0,1-4,0,1.61,1.61,0,0,1,0-.39A1.24,1.24,0,0,0,7.64,2.7a2.19,2.19,0,0,1,.36,0A2,2,0,0,1,10,4.67ZM8,0C3,0,0,4.37,0,4.37s3.22,5,8,5c5.16,0,8-5,8-5S13.14,0,8,0ZM8,8a3.34,3.34,0,1,1,3.33-3.33A3.33,3.33,0,0,1,8,8Z"></path></g></g></svg>
                                    </span>
                                  </span>
                                </a>`);
        $title.append($controlBtn);

        debug("Added ctrl panel btn: ", $("#chatHistoryControl"));

        const $controlPanelDiv = $(`<div id="chatControlPanel" class="chat-control-panel-popup">control</div>`);

        //  chat-control-panel-item, replaced with xedx-torn-btn
        const $controlPanelOverlayDiv = $(`<div id="chatControlOverlayPanel" class="chat-control-panel-overlay"></div>`);

        $controlPanelDiv.html(getCtrlPanelHtml());

        /*
        // Control panel onClick listeners
        $controlPanelDiv.find("button#chat-search").click(function () {
            const inputId = $controlPanelDiv.find("input#chat-target-id-input").val();
            dbReadByTargetPlayerId(inputId).then((result) => {
                //log("InputId: ", inputId);
                let text = "";
                for (const message of result) {
                    //log("Res msg: ", message);
                    const timeStr = formatDateStringLong(new Date(message.timestamp));
                    text += timeStr + " " + message.senderPlayerName + ": " + message.messageText + "\n";
                }
                text += "Found " + result.length + " records\n";
                const $textarea = $("textarea#chat-results");
                $textarea.val(text);
                $textarea.scrollTop($textarea[0].scrollHeight);
            });
        });
        */

        $title.append($controlPanelDiv);

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

        $controlBtn.click(function () {
            //dbReadAllPlayerId().then((result) => {
            //    //log("dbReadAllPlayerId res: ", result);
            //    const $playerListDiv = $controlPanelDiv.find("div#chat-player-list");
            //    $playerListDiv.empty();
            //    let num = 0;
            //    for (const message of result) {
            //        if (num == 8) {
            //            $playerListDiv.append($(`<br>`));
            //            num = -1;
            //        }
            //        num++;
            //        let a = $(`<a class="chat-control-player">${message.targetPlayerName}</a>`);
            //        a.click(() => {
            //            $controlPanelDiv.find("input#chat-target-id-input").val(message.targetPlayerId);
            //            $controlPanelDiv.find("button#chat-search").trigger("click");
            //        });
            //        $playerListDiv.append(a);
            //    }

                $controlPanelDiv.fadeToggle(200);
                $controlPanelOverlayDiv.fadeToggle(200);
            //});
        });

        $controlPanelOverlayDiv.click(function () {
            $controlPanelDiv.fadeOut(200);
            $controlPanelOverlayDiv.fadeOut(200);
        });

        $("#dashboard-close").on('click', function () {
            $controlPanelDiv.fadeOut(200);
            $controlPanelOverlayDiv.fadeOut(200);
        });
    }

    // ======================== Options handling ==============================

    const optsHdrs = ["Option", "Value", "Description"];
    const advFacOpts = {
        "Debug Logging":    {value: false, type: "checkbox", key: "debugLoggingEnabled",
                            desc: "Enables advanced console logging."},
        "API Interval":     {value: 2,     type: "number",   key: "apiIntervalSecs", min: 1, max: 60, label: "secs",
                            desc: "Time in seconds between API calls for each member's stats."},
        "Update Frequency": {value: 24,    type: "number",   key: "apiFrequencyHrs", min: 1, max: 168, label: "hrs",
                            desc: "How much time, in hours, passes before stat updates will automatically start again."},
    };

    function buildOptTableRows() {
        for (const [key, entry] of Object.entries(advFacOpts)) {
            let row = `<tr><td><span>${key}</span></td>`;
            row = row + getValCell(entry) + `<td><span>${entry.desc}</span></td></tr>`;
            $("#adv-fac-opts tbody").append(row);
        };

        function getValCell(entry) {
            let cell = `<td><span>`;
            if (entry.type == 'number') {
                cell = cell +
                    `<label>` +
                    `<input type="number" name="${entry.key}" min="${entry.min}" max="${entry.max}" value="${entry.value}">` +
                    `${entry.label}</label></span></td>`;
            } else {
                cell = cell + `${entry.value}</span></td>`;
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
            if (!rowKeys) {
                rowKeys = getAllKeysWithPaths(value[stat]);
                let thRow = "<th>Member</th>";

                rowKeys.forEach(key => {
                    if (key.indexOf(".") < 0 && typeof value[stat][key] != 'object') {
                        thRow = thRow + `<th>${key}</th>`;
                    } else if (key.indexOf(".") > -1) {
                        let parts = key.split('.');
                        let path = value[stat];
                        let newKey;
                        for (let idx=0; idx<parts.length-1; idx++) {
                            path = path[parts[idx]];
                            newKey = parts[idx+1];
                        }
                        thRow = thRow + `<th>${newKey}</th>`;
                    } else {
                        debug("Skipped object key ", key);
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
                    debug("Skipping key ", key);
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
            <div id="${divId}" class="stat-tbl">
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

            if (rowKeys.length) {
                let thRow = "<th>Member</th>";
                rowKeys.forEach(key => {
                    thRow = thRow + `<th>${key}</th>`;
                });
                $("thead.sticky-thead > tr").empty();
                $("thead.sticky-thead > tr").append(thRow);
            }
        }
    }

    function handleHdrBtns(e) {
        let btn = $(e.currentTarget);
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
                z-index: 9999999;

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
                      "fac-opts": "This button would open a panel that would<br>" +
                                  "then let you pick options controlling the<br>" +
                                  "behavior of this script, had I implemented it.<br>" +
                                  "However, it is still a work in progress...",
                    };

    function installSearchUI(target) {
        debug("[installSearchUI] ", $(target), $("#adv-fac-bar"));
        if ($("#adv-fac-bar").length) return log("Search bar already installed!");
        if (!$(target).length) return log("[installSearchUI] timeout installing search bar");

        $(target).before(getFacSearchDiv());

        $("#upd-stats").on('click', handleUpdateBtn);
        $("#view-stats").on('click', getTopHeaderRow);
        $("#fac-opts").on('click', buildOptsTable);

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
        openDatabase();
        callWhenReady(installSearchUI, ".f-war-list.members-list", 250, 50);

        initCSS();
        initControlPanel();
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
        addAcStyles();

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
                background-color: #444;
                outline: 1px solid #666;
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
                height: 32px;
                z-index: 0;
                padding-left: 10px;
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
            .opts-tbl thead.sticky-thead {
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