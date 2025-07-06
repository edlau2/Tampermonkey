// ==UserScript==
// @name         Torn Adv Fac Info
// @namespace    http://tampermonkey.net/
// @version      1.1
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

    function setProgressText(msg) {
        $("#prog-text").text(msg);
    }


    // =============== DB stuff, open, read/write, query...====================

    // Temp: dev help, delete old DB
    function delOldDb() {
        const DBDeleteRequest = window.indexedDB.deleteDatabase("FactionStats");

        DBDeleteRequest.onerror = (event) => {log("Error deleting database.");};
        DBDeleteRequest.onsuccess = (event) => {log("Database deleted successfully");};
    }

    var facDb;
    const facStatsStore = "fac-member-stats";

    function openDatabase() {
        //delOldDb();

        const request = indexedDB.open('FactionStats', 1); // Database name and version

        request.onupgradeneeded = function(event) {
            log("[onupgradeneeded]");
            facDb = event.target.result;
            if (!facDb.objectStoreNames.contains(facStatsStore)) {
                facDb.createObjectStore(facStatsStore);
                log('Object store "', facStatsStore, '" created.');
            }
        };

        request.onsuccess = function(event) {
            facDb = event.target.result;
            debug('Database opened successfully.');
        };

        request.onerror = function(event) {
            log('Error opening database:', event.target.errorCode);
        };
    }

    function getStatsForMember(id) {
        const transaction = facDb.transaction([facStatsStore], 'readonly'); // Create a read-only transaction
        const objectStore = transaction.objectStore(facStatsStore);
        const getRequest = objectStore.get(id);

        getRequest.onsuccess = function(event) {
            const stats = event.target.result;
            if (stats) {
                log('Retrieved stats:', stats);
            } else {
                log('ERROR: no stats found for ID ', id);
            }
        };

        getRequest.onerror = (e) => log('DB ERROR for ID ', id, ' error: : ', e);
    }

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
            log('All data added successfully. Verifying transaction...');
            getStatsForMember(id);
        }
        transaction.onerror = (e) => log('ERROR: Transaction failed:', e);
    }


    // ============ API/web page stuff: fac members, personal stats ============

    var facMembersUpdated = false;
    var membersList = {};
    var acSource = [];
    var acWaitingOnMembers = false;   // Auto-Complete waiting
    var updatingStats = false;

    // Set this based on time of last update?
    var statsNeedUpdate = GM_getValue("statsNeedUpdate", false);       // true to update stats after getting member list
    var lastKeyIdx = GM_getValue("lastKeyIdx", 0) ?? 0;
    var memberKeys;
    var cancelUpd = false;


    function updateMemberStats(last=0) {
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

        if (last == 0)
            last = lastKeyIdx ? parseInt(lastKeyIdx) : 0;

        let key = memberKeys[last];
        if (!key) {
            processUpdateDone();
            return log("ERROR: no key! ", last, lastKeyIdx, key, memberKeys);
        }
        getMemberStats(key);

        if (last++ == memberKeys.length) {
            last = 0;
            return processUpdateDone();
        }

        GM_setValue("lastKeyIdx", last);
        setTimeout(updateMemberStats, 2000, last);

        function processUpdateDone() {
            setProgressText("Update " + ((cancelUpd == true) ? "cancelled." : "complete."));

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

        debug("Members: ", Object.keys(membersList).length,
              " acSource: ", (acSource? acSource.length : "Empty"),
             "\nacWaitingOnMembers: ", acWaitingOnMembers,
             "\nstatsNeedUpdate: ", statsNeedUpdate);

        if (acWaitingOnMembers == true) installAutoComplete(searchid);
        if (statsNeedUpdate == true) updateMemberStats();
    }

    function processStatQuery(data, status) {
        //log("[processStatQuery] status: ", status, " id: ", this.id, " data: ", data);

        setProgressText(`Writing stats for ${this.id} to DB...`);
        addStatsToDb(data, this.id);
    }

    function getMemberStats(id) {
        const url = `https://api.torn.com/v2/user/${id}/personalstats?cat=all&key=${api_key}`;
        setProgressText(`Querying stats for ${id}...`);
        $.get({url: url, id: id, success: processStatQuery});
    }

    // ======================== Options handling ==============================


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

        updateFacMemberList();
        installAutoComplete(searchid);

        // ======== the html ....
        function getFacSearchDiv() {
            let div =
                `<div id="adv-fac-bar">
                    <div>
                        <label>Search:
                           <input type="text" id="${searchid}" name="search" class="ac-search m-top10 ui-autocomplete-input ac-focus">
                        </label>
                        <input id='mem-stats' type="submit" class="btn-dark-bg torn-btn" value="View Stats">
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
        `);
    }

})();