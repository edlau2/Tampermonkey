// ==UserScript==
// @name         Torn Faster Slots
// @namespace    http://tampermonkey.net/
// @version      1.3
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
    var pot = GM_getValue("pot", null);

    var spinSpeed = GM_getValue("spinSpeed", -1);

    // Limits
    var optWonOver = GM_getValue("optWonOver", 0);
    var optLostOver = GM_getValue("optLostOver", 0);
    var optLostPot = GM_getValue("optLostPot", false);
    var lockLimitsEnabled = GM_getValue("lockLimitsEnabled", false);
    const lockTimeSecs = GM_getValue("lockTimeSecs", 300);
    var unlockTime = GM_getValue("unlockTime");

    const MAX_RETRIES = 50;
    const targetSel = `#mainContainer > div.content-wrapper > div.slots-main-wrap > div`;
    const p = (x) => { return parseInt(x); }
    const ts = () => { return new Date().toTimeString().split(' ')[0]; }
    function moneyOnHand() { return $("#user-money").data("money"); }
    function getTokens() {return $("#tokens").text(); }

    function readOpts() {
        lockLimitsEnabled = GM_getValue("lockLimitsEnabled", lockLimitsEnabled);
        optLostPot = GM_getValue("optLostPot", optLostPot);
        optWonOver = GM_getValue("optWonOver", optWonOver);
        optLostOver = GM_getValue("optLostOver", optLostOver);
    }

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
            wins = 0; losses = 0; pot = money ?? moneyOnHand();
        }
        GM_setValue("moneyWon", p(moneyWon ?? 0));   // Money won so far
        GM_setValue("moneyLost", p(moneyLost ?? 0));
        GM_setValue("wins", p(wins ?? 0));
        GM_setValue("losses", p(losses ?? 0));
        GM_setValue("spinSpeed", spinSpeed);
        GM_setValue("pot", pot);
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

    GM_addStyle(`
        .locked {
            opacity: .2;
            pointer-events: none;
        }
        .locked li {
            background-color: #f05e5a;
        }
        #lock-msg-wrap {
            position: absolute;
            display: flex;
            flex-direction: column;
            justify-content: center;
            top: 80%;
            left: 50%;
            transform: translateX(-50%);
        }
        #lock-msg {
            display: flex;
            flex-flow: row wrap;
            justify-content: center;
            font-family: arial;
            font-size: 62px;
            color: red;
        }
        #lock-time {
            display: flex;
            flex-flow: row wrap;
            justify-content: center;
            font-family: arial;
            font-size: 36px;
            color: red;
        }
    `);

    var lockTimer;
    var unlockTimer;
    const secsInHr = 60 * 60;
    const nn = function(t) {return t == 0? '00' : t < 10 ? '0' + t : t;}
    function cvtSecs(secs) {
        let hrs = Math.floor(secs / secsInHr);
        let remains = secs - (hrs * secsInHr);
        let mins = Math.floor(remains/60);
        secs = remains - mins * 60;
        return (nn(hrs) + ":" + nn(mins) + ":" + nn(secs));
    }

    function updateLockTime() {
        let t = parseInt($("#lock-time").attr('data-time')) - 1;
        $("#lock-time").attr('data-time', t);
        if (t > 0) {
            $("#lock-time").text(cvtSecs(t));
            lockTimer = setTimeout(updateLockTime, 1000);
            return;
        }
        lockTimer = null;
        unlockBets("updateLockTime");
    }

    function addLockedDiv(time, retries=0) {
        let node = `
            <div id='lock-msg-wrap'>
                <span id='lock-msg'>LOCKED!</span>
                <span id='lock-time'></span>
            </div>
        `;
        $("#stats-tbl table").append(node);
        if (!$("#lock-msg-wrap").length) {
            if (retries++ < 50) return setTimeout(relockBets, 250, retries);
            return debug("Relock, timed out.");
        }

        $("#lock-time").attr('data-time', time);
        updateLockTime();
    }

    function unlockBets(from) {
        //debug("[unlockBets]: ", from);
        GM_setValue("unlockTime", 0);
        $(".slots-btn-list").removeClass('locked');
        $("#stat-bod").removeClass('locked')
        $(".cr").removeClass("cr");
        $("#lock-msg-wrap").remove();
        unlockTimer = null;
    }

    function lockAllBets(sel) {
        let timeNow = new Date().getTime() / 1000;
        let unlockAt = timeNow + lockTimeSecs;
        GM_setValue("unlockTime", unlockAt);

        $(".slots-btn-list").addClass('locked');
        $("#stat-bod").addClass('locked')
        $(sel).addClass("cr");
        addLockedDiv(lockTimeSecs);
        if ($("#lock-msg-wrap").length) {
            if (!unlockTimer)
                unlockTimer = setTimeout(unlockBets, lockTimeSecs * 1000, "lockAllBets timer");
        }

    }

    function relockBets(retries=0) {
        let unlockAt = GM_getValue("unlockTime", 0);
        let timeNow = new Date().getTime() / 1000;
        let secs = +unlockAt - +timeNow;
        if (secs > 0) {
            $(".slots-btn-list").addClass('locked');
            $("#stat-bod").addClass('locked');
            addLockedDiv(secs, retries);
            if ($("#lock-msg-wrap").length > 0) {
                if (!unlockTimer)
                    unlockTimer = setTimeout(unlockBets, secs * 1000);
                updateLockTime();
            }
        }
    }

    const ppi = function(x) {return parseInt(Math.abs(x)); }
    function enforceLockLimits() {
        let profit = moneyWon - moneyLost;
        if (ppi(optWonOver) > 0 && profit > 0) {
            if (ppi(profit) > ppi(optWonOver)) lockAllBets("#optWonOver");
        }
        if (ppi(optLostOver) > 0 && profit < 0) {
            if (ppi(profit) > ppi(optLostOver)) lockAllBets("#optLostOver");
        }
        if (optLostPot == true && profit < 0) {
            if (ppi(profit) > ppi(pot)) lockAllBets("#lostPot");
        }
    }

    function checkLockState() {
        let unlockAt = GM_getValue("unlockTime", 0);
        if (unlockAt <= 0 || !unlockAt) {
            return unlockBets("checkLockState");
            //return log("checkLockState: unlockAt, ", unlockAt);
        }
        let now = new Date().getTime() / 1000;
        if (now > parseInt(unlockAt))  {
            return unlockBets("checkLockState");
            //return log("checkLockState: now, ", now, parseInt(unlockAt), (now - unlockAt));
        }
        relockBets();
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

                    if (lockLimitsEnabled == true) {
                        enforceLockLimits();
                    }

                    // Make stop immediately...maybe small delay?
                    //debug("Speed is ", data.barrelsAnimationSpeed, " Setting to ", spinSpeed);
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
            #table-btn > i {
                position: absolute;
                cursor: pointer;
                color: black;
                right: 2%;
                width: 36px;
                border-radius: 36px;
                border: 1px solid white;
                background-color: white;
            }
            #limits td {
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
            }
            #optLostOver, #optWonOver {
                width: 100px;
                margin: 0px 10px 0px 10px;
                border-radius: 4px;
                padding: 2px 4px 2px 4px;
            }
            #optLostPot {
                margin: 0px 10px 0px 10px;
            }
            .cr { color: red; }
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
        if (pot == null) {
            pot = money;
            GM_setValue("pot", pot);
        }
        debug("[updateStatsTable] ", asCurrency(moneyWon), asCurrency(moneyLost), wins, losses,
            tokens, money, moneyTotal, ((lastResultWon == true) ? "Win" : "Loss"));

        let profit = moneyWon - moneyLost;
        let table = `
            <div id="stats-tbl">
                <table>
                    <thead>
                        <tr colspan="4">
                            <th>
                            <span id="table-btn"><i class="fas fa-caret-down fa-3x"></i></span>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="stat-bod">
                        <tr>
                            <td>Net: ${asCurrency(profit ?? 0)}</td><td>Won: ${asCurrency(moneyWon ?? 0)}</td>
                            <td>Lost: ${asCurrency(moneyLost ?? 0)}</td><td>Win/Loss: ${wins}/${losses}</td>
                        </tr>
                        <tr>
                            <td id='test-btn'>Tokens: ${tokens}</td><td>On-Hand: ${asCurrency(money)}</td>
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
                        <tr id='limits'>
                        <td class="c-ctr">  <!-- style="min-width: 183px; display: flex; flex-flow: row wrap;" -->
                            <span><label>
                                <input type="checkbox" id="lockLimitsEnabled" name="lockLimitsEnabled" style="margin-right: 10px;">
                                Enforce Gambling Limits</label>
                            </span>
                        </td>
                        <!-- td colspan="3" style="width: -webkit-fill-available; display: flex; flex-flow: row wrap;">
                            <td><span class="locks" -->
                            <td><span><label>Lost over:<input type="text" id="optLostOver" name="optLostOver"></label></span></td>
                            <td><span><label>Lost pot (${asCurrency(pot)}):<input type="checkbox" id="optLostPot" name="optLostPot"></label></span></td>
                            <td><span><label>Won over:<input type="text" id="optWonOver" name="optWonOver"></label></span></td>
                            <!-- /span>
                        </td -->
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        /*
        <td colspan="3" style="width: -webkit-fill-available; display: flex; flex-flow: row wrap;">
            <span class="locks">
            <span><label>Lost over:<input type="number" id="optLostOver" name="optLostOver"></label></span>
            <span><label>Lost pot<input type="checkbox" id="optLostPot" name="optLostPot"></label></span>
            <span><label>Won over:<input type="number" id="optWonOver" name="optWonOver"></label></span>
            </span>
        </td>
        */

        log("[updateStatsTable] ", $("#stats-tbl"));

        if ($("#stats-tbl").length > 0) {
            $("#stats-tbl").replaceWith(table);
        } else {
            let target = $(targetSel);
            $(target).append(table);
        }

        $('#optLostOver').val(asCurrency(optLostOver));
        $('#optWonOver').val(asCurrency(optWonOver));
        $("#lockLimitsEnabled").prop("checked", lockLimitsEnabled);
        $("#optLostPot").prop("checked", optLostPot);

        $("#xrst").on('click', handleTableReset);

        $("#opts-btn").on('click', function() {
                $("#opts-btn > i").toggleClass("fa-caret-right fa-caret-down");
                $("#stat-bod").slideToggle(1000);
        });
        $("#table-btn").on('click', function() {
                $("#table-btn > i").toggleClass("fa-caret-right fa-caret-down");
                $("#stat-bod").fadeToggle(1000);
        });

        $("#speed").val(spinSpeed);
        $("#speed").on('change', handleSpeedChange);

        $("#limits input[type='checkbox']").on('change', handleCbOptChange);
        $("#limits input[type='text']").on('input', handleNumOptChange);
        $("#limits input[type='text']").on('blur', handleNumOptChange);
        //$("#optWonOver").on('input', handleNumOptChange);
        //$("#optWonOver").on('blur', handleNumOptChange);

        //$('#test-btn').on("click", lockAllBets);

        if (!updateInterval) {
            updateInterval = setInterval( function() {
                if (!$("#stats-tbl").length) updateStatsTable();
            }, 1000);
        }
    }

    function handleCbOptChange(e) {
        if (e) e.preventDefault();
        if (e) e.stopPropagation();
        let key = $(this).attr('name');
        let checked = $(this).prop('checked');
        GM_setValue(key, checked);
        readOpts();
    }

    function handleNumOptChange(e) {
        let key = $(this).attr('name');
        let value = $(this).val();
        value = value.replace(/[^0-9.]/g, '');
        let numberValue = parseInt(value);

        if (!isNaN(numberValue)) {
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            });
            $(this).val(formatter.format(numberValue));
        } else {
            $(this).val('');
        }
        GM_setValue(key, numberValue);
        readOpts();
    }

    function installUI(retries = 0) {
        let target = $(targetSel);
        if (!$(target).length) {
            if (retries++ < MAX_RETRIES) return setTimeout(installUI, 250, retries);
            return log("[installUI] timed out!");
        }
        debug("Found target after ", retries, " cycles");
        addTableStyles();
        updateStatsTable();
        $("#speed").on('change', handleSpeedChange);

        checkLockState();
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