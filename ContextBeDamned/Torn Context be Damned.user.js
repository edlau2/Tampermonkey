// ==UserScript==
// @name         Torn Context be Damned
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @include      https://contextbedamned.com/torn.php
// @connect      api.torn.com
// @require      http://code.jquery.com/jquery-3.5.1.min.js
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

    var myStocks = null; // Data returned from a Torn User->Stocks API call
    var allStocks = null; // Data returned from a Torn Torn->Stocks API call
    var ownedStocksDone = false; // TRUE once the CB has processed the User->Stocks call
    var allStocksDone = false; // TRUE once the CB has processed the Torn->Stocks call

    // Notes: the ID's must be in order, as the array index must match the stock ID. This also implies that
    //        any skipped ID numbers must be filled in with null data. The names here are replaced by the
    //        names taken from the Torn API in case they change.
    var cityStocks = [{name: "", ID: 0, owned: 0, required: 0, price: 0, tier: 0}, // null entry so index and ID line up
                      {name: "Torn & Shanghai Banking", ID: 1, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Torn City Investments", ID: 2, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Syscore MFG", ID: 3, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Legal Authorities Group", ID: 4, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Insured On Us", ID: 5, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Grain	", ID: 	6, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Torn City Health Service", ID: 7, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Yazoo", ID: 8, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "The Torn City Times", ID: 9, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Crude & Co", ID: 10, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Messaging Inc.", ID: 11, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "TC Music Industries", ID: 12, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "TC Media Productions", ID: 13, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "I Industries Ltd.", ID: 14, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Feathery Hotels Group", ID: 15, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Symbiotic Ltd.", ID: 16, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Lucky Shots Casino", ID: 17, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Performance Ribaldry", ID: 18, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Eaglewood Mercenary", ID: 19, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Torn City Motors", ID: 20, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Empty Lunchbox Traders", ID: 21, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Home Retail Group", ID: 22, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Tell Group Plc.", ID: 23, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Munster Beverage Corp.", ID: 24, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "West Side University", ID: 25, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "International School TC", ID: 26, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Big Al's Gun Shop", ID: 27, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Evil Ducks Candy Corp", ID: 28, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Mc Smoogle Corp", ID: 29, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Wind Lines Travel", ID: 30, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Torn City Clothing", ID: 31, owned: 0, required: 0, price: 0, tier: 0},
                      {name: "Alcoholics Synonymous", ID: 32, owned: 0, required: 0, price: 0, tier: 0}];

    function ownedStocksCB(responseText) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        myStocks = jsonResp.stocks;
        let ownedStockIds = Object.keys(myStocks);
        log('[ownedStocksCB] Owned stocks: ', ownedStockIds);
        for (let i=0; i<ownedStockIds.length; i++) {
            cityStocks[ownedStockIds[i]].owned = myStocks[ownedStockIds[i]].total_shares;
            cityStocks[ownedStockIds[i]].tier = myStocks[ownedStockIds[i]].benefit ?
                myStocks[ownedStockIds[i]].benefit.increment :
               (myStocks[ownedStockIds[i]].dividend ? myStocks[ownedStockIds[i]].dividend.increment : 0);
        }
        ownedStocksDone = true;
        if (allStocksDone) handlePageLoad();
    }

    function allStocksCB(responseText) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        allStocks = jsonResp.stocks;
        let allStockIds = Object.keys(allStocks);
        log('[allStocksCB] allStocks: ', allStockIds);
        for (let i=0; i<allStockIds.length; i++) {
            cityStocks[allStockIds[i]].name = allStocks[allStockIds[i]].name;
            cityStocks[allStockIds[i]].price = allStocks[allStockIds[i]].current_price;
            cityStocks[allStockIds[i]].required = allStocks[allStockIds[i]].benefit.requirement;
        }
        allStocksDone = true;
        if (ownedStocksDone) handlePageLoad();
    }

    function handlePageLoad() {
        log('[handlePageLoad] City Stocks: ', cityStocks);

        // Pre-fill the input field with my API key
        let input = document.querySelector("body > form > p:nth-child(1) > input[type=text]");
        input.value = getApiKey();

        // See if on a 'Stocks' page. This highlights stock I currently own.
        let table = document.querySelector("#nextStocksTable"); // "Get List of Stocks to Buy Sorted by ROI"
        if (table) {
            let rows = table.getElementsByTagName('tr');
            log('Rows: ', rows.length);
            for (let i = 0; i < rows.length; i++) {
                let tier = rows[i].childNodes[1].textContent;
                if (Number(tier) > 1) { // Means I own it
                    rows[i].classList.add('owned');
                }
            }
        }

        // Private - this is the general formula I use RN.

        table = document.querySelector("#allStocksTable"); // Get List of All Stocks Sorted by ROI(In Testing)
        if (table) {
            log('On the "Get List of All Stocks Sorted by ROI(In Testing)" page');
            let rows = table.getElementsByTagName('tr');
            log('Rows: ', rows.length);

            for (let i = 1; i < rows.length; i++) { // Iterates the table rows. This would be replaced by where you build the rows.
                let name = rows[i].childNodes[0].textContent;
                log('Row #' + i + ' Stock: ', name);

                // figure out which stock it is, by name, and get which tier it's for
                let thisStock = cityStocks.filter(e => name == e.name)[0]; // Gets the details of the stock - how many I own, price, amt. for a BB
                let tier = Number(rows[i].querySelector("td:nth-child(2)").textContent);
                console.log('This stock: ', thisStock, ' Name: ', name, ' tier: ' + tier);

                if (thisStock.tier > 0 || thisStock.owned) { // If I own it:
                    if (thisStock.tier >= tier) rows[i].classList.add('owned'); // Color it green.

                    // Calculate total shares for up to this tier (total) and the last tier, total, and also JUST this tier
                    let reqTotalThisTier = 0;
                    let reqLastTier = 0;
                    for (let i=0; i < tier; i++) {
                        if (i == (tier-1)) reqLastTier = reqTotalThisTier; // Amount needed for prior tier. At tier 1, will be 0, tier 2, inital BB cost, etc.
                        reqTotalThisTier += thisStock.required * Math.pow(2, i); // TOTAL to get to this tier.
                    }
                    let reqThisTier = thisStock.required * Math.pow(2, tier); // What this tier (col 2) needs for a block, total. JUST this tier
                    let needed = reqTotalThisTier - thisStock.owned; // If we own some, what's still needed
                    console.log('Owned: ' + thisStock.owned + ' Needed: ' + needed + ' reqTotalThisTier: ' + reqTotalThisTier + ' reqLastTier: ' + reqLastTier);

                    // Here, determine if I have a partial chunk into this tier (this tier represents the *next* tier I could have, in this case)
                    if ((needed % thisStock.required != 0) && (thisStock.owned > reqLastTier) && (needed > 0)) {
                        rows[i].classList.remove('owned');

                        // Add shares needed and cost tooltip
                        let cost = (needed * thisStock.price).toString().split(".")[0];
                        rows[i].classList.add('partial', 'tooltip'); // Color yellow
                        $(rows[i].firstChild).append('<span class="tooltiptext">' + name + '<br />Shares Needed: ' +
                                                     numberWithCommas(needed) + '<br />Cost: $' +
                                                     numberWithCommas(cost) + '</span>');
                    }
                }

                // If I don't own it, it's white.
                if (!rows[i].classList.contains('owned') && !rows[i].classList.contains('partial')) {
                    rows[i].classList.add('unowned');
                }
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    // FInd the stocks I own, then handle the page load.
    xedx_TornUserQuery(null, 'stocks', ownedStocksCB);
    xedx_TornTornQuery(null, 'stocks', allStocksCB);

    // CSS styles
    GM_addStyle(`.highlight-active {
                    -webkit-animation: highlight-active 1s linear 0s infinite normal;
                    animation: highlight-active 1s linear 0s infinite normal;}

                .owned {background-color: lime;}

                .partial {background-color: yellow;}

                .unowned {background-color: white;}

                .tooltip {
                  position: relative;
                }

                .tooltip .tooltiptext {
                  visibility: hidden;
                  width: auto;
                  background-color: black;
                  color: #fff;
                  text-align: center;
                  padding: 5px 0;
                  border-radius: 6px;
                  position: absolute;
                  z-index: 1;
                }

                .tooltip:hover .tooltiptext {
                  visibility: visible;
                }
               `);
})();



