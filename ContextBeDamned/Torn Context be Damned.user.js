// ==UserScript==
// @name         Torn Context be Damned
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add what I think is interesting highlighting
// @author       xedx [2100735]
// @match        https://contextbedamned.com/torn.php
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
    var colorCode = true; // TRUE to color-code stocks I own (may be done by page)

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

    // Callback from the User->Stocks query
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

    // Callback from the Torn->Stocks query
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

    // Helper to convert the benefit column to total benefit.
    // If tier 1 gives 100e, for example, and tier 2 another 100,
    // dislay 200 total for tier 2. And 300 for tier 3. etc.
    // There are 3 cases to consider:
    // 1. nX of something
    // 2. nnn somthing
    // 3. $nnn,nnn
    function convertBenefitToTotal(tier, benefit) {
         // case 2: 1000 happiness, for example.
        let parts = benefit.split(' ');
        if (!isNaN(parts[0])) {
            parts[0] = Number(parts[0]) * Number(tier);
            return parts.join(' ');
        }

        // Case 2: 1x Drug Pack, for example.
        // Or worse, 1x Box of Grenades.
        if (benefit.indexOf('x') > -1) {
            let parts = benefit.split(' ');
            console.log('parts: ', parts);
            parts[0] = (Number(parts[0].match(/(\d+)/)[0]) * Number(tier)) + 'x';
            return parts.join(' ');
        }

        // Case 3: $25,000,000, for example.
        if (benefit.indexOf('$') > -1) {
            let amount = benefit.replace(/[$,]+/g,"");
            let result = Number(amount) * Number(tier);
            return '$' + numberWithCommas(result);
        }

        return benefit; // Unknown: don't change.
    }

    // Determine is own a partial block for the next tier
    // Return shares needed if so, 0 otherwise
    function partiallyOwned(thisStock, tier) {
        if (thisStock.tier > 0 || thisStock.owned) {
            let reqTotalThisTier = 0, reqLastTier = 0, needed = 0;
            for (let i=0; i < tier; i++) {
                if (i == (tier-1)) reqLastTier = reqTotalThisTier;
                reqTotalThisTier += thisStock.required * Math.pow(2, i);
            }
            needed = reqTotalThisTier - thisStock.owned;
            if ((thisStock.owned > reqLastTier) && (needed > 0)) return needed;
        }
        return 0;
    }


    // Handle editing the UI, if needed.
    function handlePageLoad() {
        log('[handlePageLoad] City Stocks: ', cityStocks);

        // Pre-fill the input field with my API key
        let input = document.querySelector("body > form > p:nth-child(1) > input[type=text]");
        if (!input) input = document.querySelector("#content > form > p:nth-child(1) > input[type=text]")
        try {
            input.value = getApiKey();
        } catch (e) {
            log("ERROR setting API key!");
        }

        // See if on either of the 'Stocks' pages. These highlights stock I currently own, and show what I need for the next tier.

        // "Get List of Stocks to Buy Sorted by ROI"
        let table = document.querySelector("#nextStocksTable");
        if (table) {
            let legendTable = document.querySelector("body > table:nth-child(7) > tbody");
            if (!legendTable) legendTable = document.querySelector("#content > table:nth-child(6) > tbody")
            let legend = document.querySelector("#content > table:nth-child(6)");
            if (legend) table.setAttribute('style', 'mergin-bottom: 20px;');

            if (colorCode) {
                let firstTableRow = document.querySelector("body > table:nth-child(7) > tbody > tr:nth-child(1) > td");
                if (!firstTableRow) firstTableRow = document.querySelector("#content > table:nth-child(6) > tbody > tr > td");
                firstTableRow.textContent = `Stocks in Lime Green are stocks you own, and can afford more with cash-on-hand and in vault`;
                $(legendTable).append(`<tr class="owned"><td>Stocks in Light Blue are owned stocks`);
                $(legendTable).append(`<tr class="partial-and-afford"><td>Stocks in Yellow are stocks you own part of a block and can afford the rest of the block`);
                $(legendTable).append(`<tr class="partial"><td>Stocks in Gold are stocks you own part of a block of`);
                $(legendTable).append(`<tr class="unowned"><td>Stocks in White are stocks you do not own, and can't afford with cash on hand and in vault`);
            } else {
                $(legendTable).append(`<tr><td>Stocks preceeded by an asterisk ('*') are owned stocks`);
                $(legendTable).append(`<tr><td>Stocks preceeded by an dollar sign ('$') indicate a partial block is owned`);
            }

            if (colorCode) {
                let target = document.querySelector("body > form");
                $(target).after(`<p><span>Color added by XedX</span></p>`);
            }

            let rows = table.getElementsByTagName('tr');
            log('Rows: ', rows.length);
            for (let i = 1; i < rows.length; i++) { // Start at 1 to skip header
                let name = rows[i].childNodes[0].textContent;
                let tier = rows[i].childNodes[1].textContent;
                let thisStock = cityStocks.filter(e => name == e.name)[0];
                let needed = partiallyOwned(thisStock, tier);
                console.log('Row #' + i + ' Name: ' + name + ' Tier: ' + tier + ' Owned tier: ' + (thisStock ? thisStock.tier : 0));

                let benefitColumn = rows[i].querySelector("td:nth-child(5)");
                let benefit = benefitColumn.textContent;
                let convertedBenefit = convertBenefitToTotal(tier, benefit);
                benefitColumn.textContent = convertedBenefit;

                let partialAttr = rows[i].getAttribute('bgcolor') ? 'partial-and-afford' : 'partial';
                let ownedAttr = rows[i].getAttribute('bgcolor') ? 'owned-and-afford' : 'owned';
                if (colorCode) rows[i].classList.add('unowned');

                if (needed && Number(thisStock.tier) == 0) {
                    rows[i].classList.remove('unowned');
                    if (colorCode)
                        rows[i].classList.add(partialAttr);
                    else
                        rows[i].childNodes[0].textContent = '$ ' + name;
                }

                if (Number(thisStock.tier) > 0) { // Means I completely own at least one tier
                    rows[i].classList.remove('unowned');
                    if (colorCode)
                        rows[i].classList.add(needed ? partialAttr : ownedAttr);
                    else
                        rows[i].childNodes[0].textContent = (needed ? '$* ' : '* ') + name;
                }

                // Add tool tips
                if (needed) {
                    let cost = (needed * thisStock.price).toString().split(".")[0];
                    rows[i].classList.add('tooltip');
                    $(rows[i].firstChild).append('<span class="tooltiptext">' + name + '<br />Shares Needed: ' +
                                                 numberWithCommas(needed) + '<br />Cost: $' +
                                                 numberWithCommas(cost) + '</span>');
                }
            }
        }

        // "Get List of All Stocks Sorted by ROI"
        table = document.querySelector("#allStocksTable");
        if (table) {
            colorCode = false;
            if (colorCode) {
                let target = document.querySelector("body > form");
                $(target).after(`<p><span>Color added by XedX</span></p>`);
            }

            log('On the "Get List of All Stocks Sorted by ROI(In Testing)" page');
            let rows = table.getElementsByTagName('tr');
            for (let i = 1; i < rows.length; i++) { // Start at 1 to skip header
                let name = rows[i].childNodes[0].textContent;
                let thisStock = cityStocks.filter(e => name == e.name)[0];
                let tier = Number(rows[i].querySelector("td:nth-child(2)").textContent);
                log('Row #' + i + ' Stock: ', name);
                console.log('This stock: ', thisStock, ' Name: ', name, ' tier: ' + tier);

                let benefit = rows[i].querySelector("td:nth-child(6)").textContent;
                let convertedBenefit = convertBenefitToTotal(tier, benefit);
                rows[i].querySelector("td:nth-child(6)").textContent = convertedBenefit;

                if (thisStock.tier > 0 || thisStock.owned) { // If I own it:
                    if (colorCode && thisStock.tier >= tier) rows[i].classList.add('owned'); // Color it green.
                }
                let needed = partiallyOwned(thisStock, tier);
                if (needed) {
                    if (colorCode) { // Color it yellow
                        rows[i].classList.remove('owned');
                        rows[i].classList.add('partial');
                    }
                    // And add tool tips.
                    let cost = (needed * thisStock.price).toString().split(".")[0];
                    rows[i].classList.add('tooltip');
                    $(rows[i].firstChild).append('<span class="tooltiptext">' + name + '<br />Shares Needed: ' +
                                                 numberWithCommas(needed) + '<br />Cost: $' +
                                                 numberWithCommas(cost) + '</span>');
                }

                if (colorCode && !rows[i].classList.contains('owned') && !rows[i].classList.contains('partial')) {
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

    // Find the stocks I own, then handle the page load.
    xedx_TornUserQuery(null, 'stocks', ownedStocksCB);
    xedx_TornTornQuery(null, 'stocks', allStocksCB);

    // CSS styles
    GM_addStyle(`.highlight-active {
                    -webkit-animation: highlight-active 1s linear 0s infinite normal;
                    animation: highlight-active 1s linear 0s infinite normal;}

                .owned {background-color: LightSkyBlue;}
                .owned-and-afford {background-color: lime;}

                .partial {background-color: gold;}
                .partial-and-afford {background-color: yellow;}

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



