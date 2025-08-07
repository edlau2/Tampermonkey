// ==UserScript==
// @name         Torn Faster Slots
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  This script speeds up slot outcomes, and tracks stats locally
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=slots
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
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

    const doFastSlots = GM_getValue("doFastSlots", true);
    GM_setValue("doFastSlots", doFastSlots);

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    // Globals
    var tokens = null;
    var moneyWon = 0;
    var moneyLost = 0;
    var wins = 0;
    var losses = 0;
    var lastResultWon = false;
    var lastBetAmt = 0;
    var money = null, moneyTotal = 0;

    var spinSpeed = GM_getValue("spinSpeed", -1);

    const MAX_RETRIES = 50;
    const targetSel = `#mainContainer > div.content-wrapper > div.slots-main-wrap > div`;
    const p = (x) => { return parseInt(x); }
    const ts = () => { return new Date().toTimeString().split(' ')[0]; }
    function moneyOnHand() { return $("#user-money").data("money"); }
    function getTokens() {return $("#tokens").text(); }

    function readStats() {
        moneyWon = GM_getValue("moneyWon", 0);   // Money won so far
        moneyLost = GM_getValue("moneyLost", 0);;
        wins = GM_getValue("wins", 0);;
        losses = GM_getValue("losses", 0);
        spinSpeed = GM_getValue("spinSpeed", -1);
    }
    readStats();

    function writeStats(reset=false) {
        if (reset == true) {
            moneyWon = 0; moneyLost = 0;
            wins = 0; losses = 0;
        }
        GM_setValue("moneyWon", p(moneyWon ?? 0));   // Money won so far
        GM_setValue("moneyLost", p(moneyLost ?? 0));
        GM_setValue("wins", p(wins ?? 0));
        GM_setValue("losses", p(losses ?? 0));
        GM_setValue("spinSpeed", spinSpeed);
    }

    function updateStats(data) {
        money = parseInt(data.money);
        moneyTotal = parseInt(data.moneyTotal);
        tokens = parseInt(data.tokens);
        if (data.won == 1) {
            wins++;
            lastResultWon = true;
            moneyWon += (parseInt(data.moneyWon) - parseInt(lastBetAmt));
        } else {
            losses++;
            moneyLost += parseInt(lastBetAmt);
        }
        //debug("money: ", money, " mmoneyTotal: ", moneyTotal, " tokens: ", tokens,
        //    " wins: ", wins, " losses:", losses, " lastResultWon: ", lastResultWon, " lastBetAmt: ", lastBetAmt);

        writeStats();
        updateStatsTable();
    }

    const originalAjax = $.ajax;
    if (doFastSlots == true) {
        $.ajax = function (options) {
            debug("Trapped ajax: ", options);
            if (options.data != null && options.data.sid == 'slotsData' && options.data.step == 'play') {
                const originalSuccess = options.success;
                lastResultWon = false;
                lastBetAmt = options.data.stake;
                options.success = function (data, textStatus, jqXHR) {
                    updateStats(data);

                    // Make stop immediately...maybe small delay?
                    debug("Speed is ", data.barrelsAnimationSpeed, " Setting to ", spinSpeed);
                    if (spinSpeed > 0) {
                        data.barrelsAnimationSpeed = spinSpeed;
                    } else {
                        $("$speed").val(data.barrelsAnimationSpeed);
                    }

                    if (originalSuccess) {
                        originalSuccess(data, textStatus, jqXHR);
                    }
                };
            }

            return originalAjax(options);
        }
    }

    function handleTableReset(e) {
        writeStats(true);
        updateStatsTable();
    }

    function handleSpeedChange(e) {
        spinSpeed = $("#speed").val();
        writeStats();
    }

    function addTableStyles() {
        GM_addStyle(`
            #stats-tbl {
                padding: 0px 2px 60px 2px;
            }

            #stats-tbl > table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                width:100%;
            }

            #stats-tbl tbody {
                background-color: black;
            }

            #stats-tbl tbody tr {
                display: flex;
                height: 40px;
            }

            #stats-tbl thead tr {
                background-color: transparent;
                border-left: 1px solid white;
                border-right: 1px solid white;
                height: 20px;
            }

            #stats-tbl td {
                display: flex;
                flex-flow: row wrap;
                justify-content: left;
                align-content: center;
                vertical-align: middle;
                padding: 2px 0px 2px 10px;
                width: 25%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: white;
                border: 1px solid white;
                padding: 10px 0px 10px 10px;
            }
            #stats-tbl tr:first-child td {
                border-top: none;
            }
            .x-btn-cell {
                display: flex;
                flex-flow: row wrap;
                justify-content: flex-end;
                align-content: center;
            }
            #opts-btn {
                width: 40%;
                display: flex;
                justify-content: flex-end;
                align-content: center;
                flex-flow: row wrap;
            }
            .num-ip {
                display: flex;
                align-content: center;
                flex-flow: row wrap;
            }
            #test-btn > i {
                position: absolute;
                cursor: pointer;
                color: black;
                right: 2%;
                width: 36px;
                border-radius: 36px;
                border: 1px solid white;
                background-color: white;
            }
        `);
    }

    var updateInterval;
    function updateStatsTable(retries=0) {
        if (!tokens && !getTokens()) {
            if (retries++ < 30) return setTimeout(updateStatsTable, 100, retries);
        }
        if (!tokens || tokens == null) {
            tokens = getTokens();
        }
        if (money == null) money = moneyOnHand();
        debug("[updateStatsTable] ", asCurrency(moneyWon), asCurrency(moneyLost), wins, losses,
            tokens, money, moneyTotal, ((lastResultWon == true) ? "Win" : "Loss"));

        let profit = moneyWon - moneyLost;
        let table = `
            <div id="stats-tbl">
                <table>
                    <thead>
                        <tr colspan="4">
                            <th>
                            <span id="test-btn"><i class="fas fa-caret-down fa-3x"></i></span>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="stat-bod">
                        <tr>
                            <td>Net: ${asCurrency(profit ?? 0)}</td><td>Won: ${asCurrency(moneyWon ?? 0)}</td>
                            <td>Lost: ${asCurrency(moneyLost ?? 0)}</td><td>Win/Loss: ${wins}/${losses}</td>
                        </tr>
                        <tr>
                            <td>Tokens: ${tokens}</td><td>On-Hand: ${asCurrency(money)}</td>
                            <!-- td>Last Result: ${((lastResultWon == true) ? "Win" : "Loss")}</td -->
                            <td class="num-ip">
                                <span><label>Speed:
                                    <input type="number" id="speed" name="speed" min="0" max="2000" step="1">
                                </label></span>
                            </td>
                            <td class="x-btn-cell">
                                <span><input id="xrst" class="xedx-torn-btn" value="Reset"></span>
                                <!-- span id="opts-btn"><i class="fas fa-caret-down"></i></span -->
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        log("[updateStatsTable] ", $("#stats-tbl"));

        if ($("#stats-tbl").length > 0) {
            $("#stats-tbl").replaceWith(table);
        } else {
            let target = $(targetSel);
            $(target).append(table);
        }

        $("#xrst").on('click', handleTableReset);

        $("#opts-btn").on('click', function() {
                $("#opts-btn > i").toggleClass("fa-caret-right fa-caret-down");
                $("#stat-bod").slideToggle(1000);
        });
        $("#test-btn").on('click', function() {
                $("#test-btn > i").toggleClass("fa-caret-right fa-caret-down");
                $("#stat-bod").fadeToggle(1000);
        });

        $("#speed").val(spinSpeed);
        $("#speed").on('change', handleSpeedChange);

        if (!updateInterval) {
            updateInterval = setInterval( function() {
                if (!$("#stats-tbl").length) updateStatsTable();
            }, 1000);
        }
    }

    // Add minimal UI so I know what's going on.
    function installUI(retries = 0) {
        /*if (retries == 0)*/ debug('[installUI]');
        let target = $(targetSel);
        if (!$(target).length) {
            if (retries++ < MAX_RETRIES) return setTimeout(installUI, 250, retries);
            return log("[installUI] timed out!");
        }
        debug("Found target after ", retries, " cycles");
        addTableStyles();
        updateStatsTable();
        $("#speed").on('change', handleSpeedChange);
    }

    // Kick things off
    function handlePageLoaded() {
        if (!$("#stats-tbl").length) installUI();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    callOnContentLoaded(handlePageLoaded);



})();