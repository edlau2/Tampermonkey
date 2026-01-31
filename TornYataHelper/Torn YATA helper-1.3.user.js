// ==UserScript==
// @name         Torn YATA helper 
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  This script does...
// @author       hexedexemal [4030124]
// @match        https://yata.yt/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @connect      ffscouter.com
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    var ffScouterKey = GM_getValue('ffScouterKey', '');
    if (ffScouterKey == '') validateApiKey();
    var usesFF = ffScouterKey && ffScouterKey.length >= 15;

    var opponentFacId = GM_getValue("opponentFacId", null);
    var opponentIds = [];
    var opponentStats = JSON.parse(GM_getValue("opponentStats", JSON.stringify({})));
    var cachedStatsId = GM_getValue("cachedStatsId", null);

    function validateApiKey() {
        if (ffScouterKey == 'none') return log("Not using FF Scouter");

        let text = GM_info.script.name + "Says:\n\nPlease enter your FF Scouter API key.\n" +
            "Your key will be saved locally so you won't have to be asked again.\n" +
            "Your key is kept private and not shared with anyone.\n\n" +
            "If you do not use FF Scouter, enter 'none' here.";

        if (!ffScouterKey || typeof ffScouterKey === 'undefined' || ffScouterKey == '') {
            ffScouterKey = prompt(text, "");
            GM_setValue('ffScouterKey', ffScouterKey);
            usesFF = ffScouterKey && ffScouterKey.length >= 15;
        }
    }

    function hashChangeHandler() {
        log("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        log("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function getOpponentStats() {
        log("[getOpponentStats] stats: ", opponentStats);
        if (!usesFF) return log("Not using FF Scouter!");

        let statKeys = Object.keys(opponentStats);
        if ($(statKeys).length > 0) return debug("Get stats: already full: ", $(opponentStats));

        if (!opponentIds.length) return log("Error: getOpponentStats, no IDs.");

        let targets = "";
        let len = opponentIds.length;
        opponentIds.forEach((id, idx) => {
            if (id) {
                if (+id < 0) debug("Negative ID: ", id);
                targets = targets + id + ( idx < (opponentIds.length - 1) ? ',' : '');
            }
        });

        targets = targets.replace(/,$/, '');

        const url = `https://ffscouter.com/api/v1/get-stats?key=${ffScouterKey}&targets=${targets}`;
        //debug("Get estimates, url = ", url);

        //$.get(url);

        $.get(url, function(data, success) {
            // data is a parsed JSON object/array
            //log("success: ", success, " type: ", typeof data, " res: ", data);
            if (success == 'success') {
                let keys = Object.keys(data);

                for (let idx=0; idx<$(keys).length; idx++) {
                    let entry = data[keys[idx]];
                    //log("Entry: ", entry);
                    if (entry) opponentStats[entry.player_id] = entry.bs_estimate_human;
                }

                GM_setValue("opponentStats", JSON.stringify(opponentStats));

                debug("stats: ", $(opponentStats));
            }
        });

    }

    function initOpponentIds(retries=0) {
        let rows = $("#faction-targets > tbody > tr");
        if (!$(rows).length) {
            if (retries++ < 25) return setTimeout(initOpponentIds, 250, retries);
            return debug("initOpponentIds get member ID's timed out");
        }

        let statKeys = Object.keys(opponentStats);
        let haveStats = $(statKeys).length > 0;
        if (haveStats) debug("Using cached stats");

        let keys = Object.keys(rows);
        for (let idx=0; idx<$(keys).length; idx++) {
            let row = rows[keys[idx]];
            let id = $(row).attr("data-val");
            opponentIds.push(id);

            if (haveStats == true) {
                let stats = opponentStats[id];
                if (!stats) continue;
                $(row).find('td:nth-child(7)').text(stats);
            }
        }

        if (!haveStats || haveStats == false)
            getOpponentStats();
    }

    function addRowClickHandlers(retries=0) {
        debug("[addRowClickHandlers]");
        if (!$("#faction-targets > tbody > tr.faction-targets-refresh").length) {
            if (retries++ < 25) return setTimeout(addRowClickHandlers, 250, retries);
            debug("[addRowClickHandlers] timed out.");
        }
        $("#faction-targets > tbody > tr.faction-targets-refresh").find("td:gt(0):lt(7)").on("click", gotoAttackPage);


        function gotoAttackPage(e) {
            e.stopPropagation();
            e.preventDefault();
            let link = $(this).closest("tr").find("td > a").attr("href");
            debug("[gotoAttackPage] this: ", $(this), " link: ", link);
            openInNewTab(link);
        }
    }

    function addRowNodeStyles(retries=0) {
        debug("[addRowNodeStyles]");

        // Add class so cursor becomes a pointer
        let nodes = $("#faction-targets > tbody > tr.faction-targets-refresh").find("td:gt(0):lt(7)");
        if (!$("#faction-targets > tbody > tr.faction-targets-refresh").length) {
            if (retries++ < 25) return setTimeout(addRowNodeStyles, 250, retries);
            debug("[addRowNodeStyles] timed out.");
        }

        $("#faction-targets > tbody > tr.faction-targets-refresh").find("td:gt(0):lt(7)").addClass("cursor-ptr");
    }

    var hoverColor;
    function handlePageLoad(retries=0) {
        let target = $("#war-status > div > table > tbody > tr > td:nth-child(1) > a");
        debug("handlePageLoad, facId: ", opponentFacId, $(target));
        if (!$(target).length) {
            if (retries++ < 25) return setTimeout(handlePageLoad, 250, retries);
            debug("handlePageLoad get fac ID timed out");
        }

        if (usesFF == true) {
            let facHref = $(target).attr("href");
            debug("[handlePageLoad] href: ", facHref);
            let facId = idFromURL(facHref);
            debug("[handlePageLoad] facId: ", facId, " opponentFacId: ", opponentFacId);
            if (facId && opponentFacId && facId != opponentFacId) {
                opponentStats = {};
            }

            if (facId) {
                GM_setValue("opponentFacId", facId);
                opponentFacId = facId;
            }

            initOpponentIds();
        }

        log("Installing hover handler");
        $('tr.faction-targets-refresh').hover(function() {
            log("Hover handler");
            if( !hoverColor ) {
                hoverColor = $(this).css('background-color');
                debug("hoverColor: ", hoverColor);
                addStyles();
            } else {
                //log("bg color: ", $(this).css('background-color'));
            }
        });

        // Add click handler to most of row, to go right to attack page
        addRowClickHandlers();

        addRowNodeStyles();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    debug("Using FFScouter: ", usesFF);

    //validateApiKey();
    //versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {
        debug("Adding YATA styles");

        // This is for https://yata.yt/faction/war/*
        GM_addStyle(`
            tr.faction-targets-refresh:hover {
                background-color: rgba(0, 161, 99, 0.3) !important;
                color: white;
            }
            tr.faction-targets-refresh:hover td {
                color: white !important;
            }
            tr.faction-targets-refresh:hover td a {
                color: white !important;
            }
            :root body.dark {
                /* --nav-div-module-background: #ccc url(/static/images/bg_hospital-dark.jpg) left top repeat;
                --nav-div-module-color: #fff;
                --body-color: #fff; */
                --body-background: #000;
                --player-status-red-color: #ee0000;
            }
            body.dark .table-striped > tbody > tr:nth-of-type(odd) {
                background-color: #000;
                color: #fff;
            }
            body.dark .table-striped > tbody > tr:nth-of-type(even) {
                background-color: #333;
                color: #fff;
            }
            nav.module, div.module {
                background-color: #cccccc00;
                color: var(--nav-div-module-color);
                border-radius: 0 0 6px 6px;
                background: none !important;
            }
            .cursor-ptr {
                cursor: pointer;
                /* color: yellow; */
            }
            tr:hover > td.cursor-ptr {
                color: gold !important;
            }
        `);
    }

})();