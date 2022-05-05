// ==UserScript==
// @name         Torn Stock Profits
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Displays current stock profits for owned shares
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=stocks*
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

    // Global vars
    var observer = null;
    var userStocksJSON = null;
    var tornStocksJSON = null;
    const showProfit = true;
    const showLoss = true;

    function addStyles() {
        GM_addStyle(`.highlight-active {
          -webkit-animation: highlight-active 1s linear 0s infinite normal;
          animation: highlight-active 1s linear 0s infinite normal;
        }`);
    }

    // Callbacks for our Torn API calls.
    function userStocksCB(responseText, ID, param) {
        log(GM_info.script.name + ' userStocksCB');
        userStocksJSON = JSON.parse(responseText);
        if (userStocksJSON.error) {return handleError(responseText);}
    }

    function tornStocksCB(responseText, ID, param) {
        log(GM_info.script.name + ' tornStocksCB');
        tornStocksJSON = JSON.parse(responseText);
        if (tornStocksJSON.error) {return handleError(responseText);}

    }

    function highlightReadyStocks() {
        log('[highlightReadyStocks]');
        var objects = $(".Ready___Y6Stk");
        log('objects: ', objects);
        for (let i=0; i<objects.length; i++) {
            let obj = objects[i];
            if (obj.textContent == 'Ready for collection') {
                log('Stock is ready!!');
                if (!$(obj).hasClass('highlight-active')) $(obj).addClass('highlight-active');
            }
        }
    }

    // Get stock name/price from ID
    const stockNameFromID = function(ID){return tornStocksJSON.stocks[ID].name;};
    const stockPriceFromID = function(ID){return tornStocksJSON.stocks[ID].current_price;};

    // Called when page loaded.
    function handlePageLoaded() {
        if (observer) observer.disconnect();

        // -- prep work --
        var mainStocksUL = document.querySelector("#stockmarketroot > div.stockMarket___T1fo2");
        if (!mainStocksUL) return setTimeout(handlePageLoaded, 1000); // Check should not be needed

        var stocksList = mainStocksUL.getElementsByTagName('ul');
        if (stocksList.length < 2) return setTimeout(handlePageLoaded, 1000); // Check should not be needed
        if (!userStocksJSON || !tornStocksJSON) return setTimeout(handlePageLoaded, 1000);

        // -- Now we're all good to go. --
        for (let i = 0; i < stocksList.length; i++) {
            let stockUL = stocksList[i];
            let stockID = stockUL.id;
            if (!stockID) continue; // Expanded stock column
            let stockName = stockNameFromID(stockID);
            let stockPrice = stockPriceFromID(stockID);
            //log('Stock ' + i + ' ID = ' + stockID);
            if (!userStocksJSON.stocks[stockID]) { // Un-owned
                //log("Don't own stock ID " + stockID + ', ' + stockName);
                continue;
            }
            //log('Editing stock ' + name);
            stockUL.setAttribute('style', 'height: auto;');
            let owned = userStocksJSON.stocks[stockID].transactions;
            let keys = Object.keys(owned);
            for (let j = 0; j < keys.length; j++) {
                let ownedLI = stockUL.querySelector("#ownedTab");
                //console.log('ownedLI: ', ownedLI);
                let ownedShares = owned[keys[j]].shares;
                let boughtPrice = owned[keys[j]].bought_price;
                let profit = (stockPrice - boughtPrice) * ownedShares; // Gross profit
                let fee = stockPrice * ownedShares * .001;
                profit = profit - fee; // -.1% fee.
                if (profit > 0 && showProfit) $(ownedLI).append('<p class="up___WzZlD">' + asCurrency(profit) + '</p>');
                if (profit < 0 && showLoss) $(ownedLI).append('<p class="down___BftsG">' + asCurrency(profit) + '</p>');
            }
        }

        highlightReadyStocks();

        // Now set up an observer, as the prices update now and again.
        if (!observer) observer = new MutationObserver(reload);
        observer.observe(mainStocksUL, {attributes: true, characterData: true});
    }

    // Reload after stock prices change
    function reload() {
        userStocksJSON = null;
        tornStocksJSON = null;
        xedx_TornUserQuery(null, 'stocks', userStocksCB);
        xedx_TornTornQuery(null, 'stocks', tornStocksCB);
        setTimeout(handlePageLoaded, 2000);
    }

    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();
    addStyles();

    // Kick off our API calls - two of them
    xedx_TornUserQuery(null, 'stocks', userStocksCB);
    xedx_TornTornQuery(null, 'stocks', tornStocksCB);

    callOnContentComplete(handlePageLoaded);

})();
