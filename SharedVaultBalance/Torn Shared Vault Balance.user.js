// ==UserScript==
// @name         Torn Shared Vault Balance
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  This script tracks your balance in a shared vault
// @author       xedx [2100735]
// @match        https://www.torn.com/properties.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @xxxrequire      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/torn_js_lib.js
// @require      file:////Users/edlau/Documents/Documents - Ed’s MacBook Pro/Tampermonkey Scripts/Helpers/torn_js_lib.js
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
/*eslint dot-notation: 0*/

(function() {
    'use strict';

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    const devMode = GM_getValue("devMode", true);

    const secsInMin = 60;
    const minInHr = 60;
    const hrInDay = 24;
    const secsInHr = secsInMin * minInHr;
    const secsInDay = secsInMin * minInHr * hrInDay;

    // TEMP for debugging: check every 30 secs
    const updateCheckInterval = devMode ? 30000 : secsInDay * 1000;

    var searchParams = getHashSearchParams();
    var lastEntry = parseInt(GM_getValue("lastEntry", 0));
    var lastUpdate = parseInt(GM_getValue("lastUpdate", 0));
    var totalDeposits = parseInt(GM_getValue("totalDeposits", 0));
    var totalWithdrawals = parseInt(GM_getValue("totalWithdrawals", 0));
    var balance = totalDeposits - totalWithdrawals; // parseInt(GM_getValue("balance", 0));

    // let dt = new Date("04:27:23 12/11/25"); // Note for a JS date, swap a Torn  day/month with month/day!
    // Divide getTime by 1000 to cvt to secs, to match the Torn date...
    var initStartDate = GM_getValue("initStartDate", null);
    if (initStartDate != null) {
        GM_setValue("savedStartDate", initStartDate);
        GM_setValue("initStartDate", null);
        initStartDate = (new Date(initStartDate).getTime() / 1000) - 1;
    }

    var resetAll = GM_getValue('resetAll', false);
    var inResetAll = resetAll;
    if (resetAll == true) {
        lastEntry = 0;
        lastUpdate = 0;
        totalDeposits = 0;
        totalWithdrawals = 0;
        balance = 0;
    }
    resetAll = false;
    GM_setValue('resetAll', false);
    GM_setValue("debugLoggingEnabled", debugLoggingEnabled);
    GM_setValue("devMode", devMode);

    function getHashSearchParams() {
        const hashString = window.location.hash;
        if (!hashString) return;
        const queryStringInHash = hashString.replace('#/', '');
        debug("[getHashSearchParams] hash: ", hashString, " query: ", queryStringInHash);
        if (queryStringInHash) {
            return new URLSearchParams(queryStringInHash);
        }
    }

    function logQueryCB(responseText, ID, param) {
        debug("[logQueryCB]");
        const data = JSON.parse(responseText);
        const logs = data.log;
        //debug("[logQueryCB] logs: ", logs);

        if (!logs) return;

        let mostRecent = logs[0].timestamp;  // Set this as lastEntry,  GM_setValue("lastEntry", mostRecent);
        let deposited = 0, withdrawn = 0;
        let dirty = (mostRecent && mostRecent != lastEntry) ? true : false;

        debug("Most recent: ", (new Date(mostRecent * 1000)));

        let oldestDate = mostRecent;
        logs.forEach(entry => {
            debug("Entry: ", (entry.timestamp > lastEntry), (new Date(entry.timestamp * 1000)));
            if (entry.timestamp > lastEntry && entry.timestamp > initStartDate) {
                if (entry.data.withdrawn) withdrawn = +withdrawn + parseInt(entry.data.withdrawn);
                if (entry.data.deposited) deposited = +deposited + parseInt(entry.data.deposited);
                dirty = true;
            }
            if (entry.timestamp < oldestDate) oldestDate = entry.timestamp;
        });

        totalDeposits = Number(totalDeposits) + Number(deposited);
        totalWithdrawals = Number(totalWithdrawals) + Number(withdrawn);
        balance = balance + (totalDeposits - totalWithdrawals);

        debug("[logQueryCB] \ndeposits: ", deposited, "\nwithdrawals: ", withdrawn, "\nBalance: ", balance);

        lastUpdate = new Date().getTime();
        if (dirty == true) {
            GM_setValue("lastUpdate", lastUpdate);
            GM_setValue("lastUpdateStr", (new Date(lastUpdate).toString()));
            GM_setValue("lastEntry", mostRecent);
            GM_setValue("lastEntryStr", (new Date(mostRecent * 1000).toString()));
            GM_setValue("totalDeposits", totalDeposits);
            GM_setValue("totalWithdrawals", totalWithdrawals);
        }

        if (initStartDate && initStartDate < oldestDate && inResetAll == true) {
            // recurse
            updateBalance(Number(oldestDate) - 1);
            let oldDate = new Date(Number(oldestDate) * 1000);
            return log("Getting next log entries prior to ", oldDate);
        }

        inResetAll = false;
        if (!$("#xedx-vault-balance").length) installUI();
        updateTableData();
    }

    function updateBalance(to=0) {
        debug("[updateBalance]");
        let opts = {"log": "5850,5851"};

        //let lastEntry = GM_getValue("lastEntry", 0);
        if (parseInt(lastEntry) > 0) opts["from"] = lastEntry;
        xedx_TornUserQueryv2(null, 'log', logQueryCB, opts);
    }

    function updateTableData() {
        $("#ledger-bal").text(asCurrency(balance));
        if (lastUpdate > 0) $("#ledger-upd").text(new Date(lastUpdate).toLocaleString());
        $("#ledger-d").text(asCurrency(totalDeposits));
        $("#ledger-w").text(asCurrency(totalWithdrawals));
    }

    var tableObserver;
    function installObserver(retries=0) {
        let target = $("div.vault-opt");
        if (!$(target).length) {
            if (retries++ < 20) return setTimeout(installObserver, 100, retries);
            return debug("[installObserver' timed out");
        }

        if (tableObserver) tableObserver.disconnect();
        tableObserver = new MutationObserver(function(mutationsList, observer) {
            for (const mutation of mutationsList) {
                //debug(" mutation: ", mutation.type, mutation);
                if (mutation.type === 'childList') {
                    //debug("**** childList: ", $(mutation.target), mutation.removedNodes, mutation.addedNodes);
                    //mutation.addedNodes.forEach(node => {
                    for (let idx=0; idx<mutation.removedNodes.length; idx++) {
                        let node = mutation.removedNodes[idx];
                        //debug("**** Removed node: ", $(node), $(node).attr("id"));
                    }
                }
            }
            //debug("[observer] Checking table: ", $("#xedx-vault-balance").length, $("#xedx-vault-balance"));
            if (!$("#xedx-vault-balance").length) installUI();
        });

        const config = { childList: true, subtree: true };
        tableObserver.observe($(target)[0], config);
        debug("tableObserver started");

    }

    var tableCheck;
    function checkTable() {
        if ($("#xedx-vault-balance").length == 0) installUI();
    }

    function installUI(retries=0) {
        debug("[installUI]");
        if ($("#xedx-vault-balance").length > 0) {
            debug("[installUI] table exists, replacing ", $("#xedx-vault-balance"));
            $("#xedx-vault-balance").prev().remove();
            $("#xedx-vault-balance").remove();
        }
        const ledgerTable =
            `<hr class="delimiter-999 m-bottom10 m-top10">` +
            `<div id="xedx-vault-balance">
                 <table class="xedx-ledger">
                     <tbody>
                         <tr><th>Balance</th><th class="action-cell">Last Update</th><th>Deposits</th><th>Withdrawals</th></tr>
                         <tr><td id="ledger-bal"</td><td id="ledger-upd"></td><td id="ledger-d"></td><td id="ledger-w"></td></tr>
                     </tbody>
                 </table>
             </div>`;

        let rootNode = $(".vault-access-wrap");
        debug("[installUI] rootNode: ", $(rootNode));
        if ($(rootNode).length == 0) {
            rootNode = $(".vault-wrap");
            debug("[installUI] rootNode 2: ", $(rootNode));
        }
        if ($(rootNode).length == 0) {
            if (retries++ < 40) return setTimeout(installUI, 100, retries);
            return log("[installUI] timed out");
        }

        debug("[installUI] found rootNode: ", $(rootNode));
        $(rootNode).after(ledgerTable);
        //$(rootNode).after(getButtonSpan);

        installObserver();

        debug("[installUI] table: ", $("#xedx-vault-balance"));

        $('.action-cell').hover(
            function() {
                $(this).text('Update Now!'); // Change the text
            },
            function() {
                $(this).text('Last Update');
            }
        )

        $('.action-cell').on("click", updateBalance);

        debug("[installUI] install btn handlers: ", $("form.vault-cont input[type='submit']"));
        $("form.vault-cont input[type='submit']").off('click.xedx');
        $("form.vault-cont input[type='submit']").on('click.xedx', function(e) {
            debug("Form Button Click!", e);
            updateBalance();
            setTimeout(installUI, 250);
        });

        updateTableData();
        if (tableCheck) clearInterval(tableCheck);
        tableCheck = setInterval(checkTable, 500);
    }

    function needsUpdate() {
        const now = new Date().getTime();
        return (now - lastUpdate > updateCheckInterval);
    }

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        //callOnContentLoaded(handlePageLoad);
        setTimeout(handlePageLoad, 250);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function handlePageLoad(retries=0) {
        searchParams = getHashSearchParams();
        debug("[handlePageLoad] params: ", searchParams, (searchParams ? searchParams.get("tab") : "N/A"));
        if (searchParams && searchParams.get("tab") == "vault") {
            installUI();
        }
        debug("[handlePageLoad] install btn handlers: ", $("form.vault-cont input[type='submit']"));
        $("form.vault-cont input[type='submit']").on('click.xedx', function(e) {
            debug("Form Button Click!", e);
            setTimeout(installUI, 250);
        });
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    if (needsUpdate())
        updateBalance();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {
        GM_addStyle(`
            table.xedx-ledger tr {
                border: 1px solid #bbb;
            }
            table.xedx-ledger td, table.xedx-ledger th {
                border: 1px solid #bbb !important;
                color: white;
                text-align: center;
                padding: 8px !important;
            }
            table.xedx-ledger {
                border-collapse: collapse;
                border: 2px solid #bbb;
                width: 100%;
            }
            .action-cell {
                /* Default styles */
                /* padding: 10px 15px;
                background-color: #f0f0f0;
                border: 1px solid #ccc;
                text-align: center; */

                cursor: pointer; /* Changes cursor to a hand icon on hover */
                transition: all 0.3s ease; /* Smooth transition for hover effects */
            }

            .action-cell:hover {
                /* Button-like styles on hover */
                background-color: #007bff; /* A typical button blue */
                color: #fff; /* White text for contrast */
                border-color: #0056b3;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Optional: adds depth */
            }
            .active-cell:active {
                /* background-color: #ccc; */
                filter: brightness(0.6);
                transform: translateY(1px); /* Slight movement effect */
            }
        `);
    }

})();