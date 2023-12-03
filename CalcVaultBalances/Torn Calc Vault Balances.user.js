// ==UserScript==
// @name         Torn Calc Vault Balances
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Calc vault balances for spouses
// @author       xedx [2100735]
// @match        https://www.torn.com/properties.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const buttonSpan = `<div class="btn-wrap silver xedx-box">
                            <div id="xedx-save-btn">
                                <span class="btn">
                                    <input type="submit" class="torn-btn xedx-span" value="Do It!">
                                </span>
                            </div>
                        </div>`;

    const totalsSpan = `<div>
                            <span id="xedx-total">xedx: </span><br>
                            <span id="khaleesi-total">khaleesi: </span>
                        </div>`;

    var uiRetries = 0;
    function AddUI()
    {
        let rootNode = document.getElementsByClassName("vault-access-wrap")[0];

        log("AddUI: rootNode: ", rootNode);
        if (rootNode)
        {
            $(rootNode).after(totalsSpan);
            $(rootNode).after(buttonSpan);
            $("#xedx-save-btn").on('click', handleDoIt);
        }
        else if (uiRetries < 4)
        {
            setTimeout(AddUI, 1000);
            uiRetries++;
            return;
        }
    }

    function handleDoIt()
    {
        log("Do It! Clicked!");

        let xedxTotal = 0;
        let khaleesiTotal = 0;
        let time = "never";
        let date = "never";

        let rootUL = document.getElementsByClassName("vault-trans-list")[0];
        if (!rootUL)
        {
            log("Error finding transaction list!");
            return;
        }
        log("Transaction list found: ", rootUL);
        let transList = rootUL.querySelectorAll('[transaction_id]');
        if (!transList)
        {
            log("Error finding individual transactions!");
            return;
        }
        log("Found a total of " + transList.length + " unique transactions.");
        for (let i=0; i < transList.length; i++)
        {
            let node = transList[i];

            // Date/time
            let dateNode = node.getElementsByClassName("transaction-date")[0];
            let timeNode = node.getElementsByClassName("transaction-time")[0];
            time = $(timeNode).text().replace(/\s/g,'');
            date = $(dateNode).text().replace(/\s/g,'');

            // Get user name
            let nameNode = node.getElementsByClassName("user name")[0];
            let userName = $(nameNode).attr("title");

            // Get deposit/withdrawal
            let typeNode = node.getElementsByClassName("type-sign")[0];
            let transType = "unknown";
            if ($(typeNode).text().indexOf('-') > -1) transType = "withdrawal";
            if ($(typeNode).text().indexOf('+') > -1) transType = "deposit";

            // Get amount
            let amtNode = typeNode ? typeNode.parentNode : null;
            let amount = $(amtNode).text().replace(/\s/g,'');

            var moneyAmt = Number(amount.replace(/[^0-9.-]+/g,""));

            if (userName.indexOf('xedx') > -1)
            {
                xedxTotal += moneyAmt;
                log(date, " ", time, " ", userName, " ", amount, "-> ", asCurrency(xedxTotal));
            }
            if (userName.indexOf('Khaleesi') > -1)
            {
                khaleesiTotal += moneyAmt;
                log(date, " ", time, " ", userName, " ", amount, "-> ", asCurrency(khaleesiTotal));
            }

            //log(date, " ", time, " ", userName, " ", amount, "-> ", moneyAmt);
        }

        log("Deposit Totals: xedx: ", asCurrency(xedxTotal), " Khaleesi: ", asCurrency(khaleesiTotal));
        log("Since ", time, " on ", date);

        let totalsNode = document.getElementsByClassName("wvalue")[0];
        let totalValue = $(totalsNode).text();
        let totalAmt = Number(totalValue.replace(/[^0-9.-]+/g,""));
        log("Vault totals: ", asCurrency(totalAmt), " xedx: ",
            asCurrency(totalAmt - khaleesiTotal),
            " Khaleesi: ",
            asCurrency(khaleesiTotal));
    }

    function handlePageLoad() {
        let href = window.location.href;
        if (href.indexOf("vault") < 0)
        {
            log("Not on vault page, bailing.");
            return;
        }
        AddUI();
    }

    function addStyles()
    {
        /*
        GM_addStyle(`
            .xedx-box {float: right; display: flex;}
            .score {width: 57px;}
            .xedx-span {margin-bottom: 5px; margin-left: 20px;}
            .xedx-hide {display: none;}
        `);
        */
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    addStyles();

    callOnContentLoaded(handlePageLoad);

})();