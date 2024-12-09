// ==UserScript==
// @name         Torn Stock Assist
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  This script does...misc stock stuff
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
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
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    debugLoggingEnabled = false;

    var observer;
    var myStocks, tornStocks;
    const showProfit = true;
    const showLoss = true;
    const mainStocksSelector = "#stockmarketroot [class^='stockMarket']";
    const stockListSelector = "#stockmarketroot [class^='stockMarket'] > ul";

    // Get stock name/price from ID
    const stockNameFromID = function(ID){return tornStocks.stocks[ID].name;};
    const stockPriceFromID = function(ID){return tornStocks.stocks[ID].current_price;};

    // Callbacks for our Torn API calls. This saves data about the
    // stocks you own. It is far more accurate, quicker, and easier to
    // get using the API as opposed to web scraping. This callback also
    // triggers the next API call, although we could have done in parrallel.
    // but then we have to synchonize the responses.
    function userStocksCB(responseText, ID, param) {
        debug('[tornStockProfits] userStocksCB');
        let jsonObj = JSON.parse(responseText);
        if (jsonObj.error) {return handleError(responseText);}
        myStocks = jsonObj.stocks;
        xedx_TornTornQuery(null, 'stocks', tornStocksCB);
    }

    // Callback triggered from above, saves stock info such as current price...
    function tornStocksCB(responseText, ID, param) {
        log('[tornStockProfits] tornStocksCB');
        tornStocks = JSON.parse(responseText);
        if (tornStocks.error) {
            if (tornStocks.error.code == 17) {
                if (queryRetries++ < 5) {
                    if (alertOnRetry) alert("Retrying error 17!");
                    return xedx_TornTornQuery(null, 'stocks', tornStocksCB);
                } else {
                    queryRetries = 0;
                }
            }
            return handleError(responseText);
        }
        modifyPage();
    }

    // This started as an experiment, just to make the ready stocks easier/quicker to see
    // and collect. I like the result (in dark mode, anyways) so I left it.
    function addCheckBox() {
        let root = $("#stockmarketroot > div[class^='appHeaderWrapper_'] > " +
              " div[class^='topSection_'] > div[class^='titleContainer_'] > h4");
        let width = $(root).outerWidth();
        GM_addStyle(`.stk-cb { float: right; margin-left: 20px; margin-top: 8px;}`);
        let cb = $('<span><input class="stk-cb" type="checkbox">Only Ready</span>');
        $(root).append(cb);

        GM_addStyle(".xblack {background: #111} .xact {border: 1px solid green; background: #111;} " +
                    " .xin {border: 1px solid red; opacity: .5;  background: #ccc;} " +
                    " .lime {border: 3px solid limegreen;  background: #111;}");


        Object.defineProperty(String.prototype, "has", {
            value: function (word) {
                return this.indexOf(word) > -1;
            },
        });

        // add 'click' handler, and tooltip...
        let tip = "Checking this will hida all stocks except<BR>for those currently ready to collect.";
        displayHtmlToolTip(cb, tip, "tooltip4");
        $(cb).on('click', toggleReadyOnly);
    }

    function toggleReadyOnly(e) {

        let cb = $(e.currentTarget).find("input")[0];
        let checked = $(cb).prop("checked");
        let checked2 = $(cb).checked;
        debug("cb: ", $(cb), " :", checked, ":", checked2); //, ":", ":", checked4, ":", checked5, ":", checked6);

        let stockList = $(stockListSelector);
        let divInfo = $(mainStocksSelector).find("[class^='dividendInfo']");

        for (let idx=0; idx < $(divInfo).length; idx++) {
            let el = $(divInfo)[idx];
            let child2 = $(el).children().eq(1);
            let text = $(child2).text();

            debug("[tornStockProfits] 2nd child: ", $(child2));
            debug("[tornStockProfits] ID: ", (idx+1), " text: ", $(child2).text());

            let sel = $(child2).closest("ul");
            if (checked) {
                if (text.has("Benefit")) {log(text + " matches Benefit!");$(sel).addClass("xblack").addClass("xedx-not-ready");}
                else if (text.has("Ready in")) {log(text + " matches Ready in!");$(sel).addClass("xblack").addClass("xedx-not-ready");}
                else if (text.has("Inactive")) {log(text + " matches Inactive!");$(sel).addClass("xblack").addClass("xedx-not-ready");}
                else if (text.has("collection")) {log(text + " matches collection !");$(sel).addClass("lime");}
                else {log(text + " matches NOTHING !");$(sel).css("opacity", ".5").addClass("xedx-not-ready");}
            } else {
                $(sel).removeClass("xblack").removeClass("lime").css("opacity", "1.0");
            }
        }

        debug("[tornStockProfits] toggleReadyOnly: ", (checked ? "hiding" : "unhiding"), " elements");

        let notRead = $(".xedx-not-ready");
        debug("[tornStockProfits] notReady: ", $(notRead));

        for (let idx=0; idx < $(notRead).length; idx++) {
            let node = $(notRead)[idx];
            let parent = $(node).closest("ul");
            if (checked)
                $(parent).attr("style", "display: none !important");
            else
                $(parent).css("display", "");
        }

    }

    // While we're here, also add dummy classes to find later
    function highlightReadyStocks() {
        debug('[tornStockProfits] [highlightReadyStocks]');
        let objects = document.querySelectorAll('[class*="Ready__"]');

        debug("[tornStockProfits] highlightReadyStocks: flagging ready/not");
        for (let i=0; i<objects.length; i++) {
            let obj = objects[i];
            if (obj.textContent == 'Ready for collection') {
                debug('[tornStockProfits] Stock is ready!!');
                $(obj).addClass("xedx-ready");
                if (!$(obj).hasClass('highlight-active')) $(obj).addClass('highlight-active');
            } else {
                $(obj).addClass("xedx-not-ready");
            }
        }
    }

    // Called when page loaded.
    function modifyPage(retries=0) {
        if (observer) observer.disconnect();

        let countOwned = Object.keys(myStocks).length;
        let countExist = Object.keys(tornStocks.stocks).length;
        let stocksList = $("#stockmarketroot [class^='stockMarket'] > ul");
        debug("Owned: ", countOwned, " On page: ", $(stocksList).length, " exist: ", countExist);

        if ($(stocksList).length < countExist) {
            if (retries++ < 20) return setTimeout(modifyPage, 250, retries);
            return log("Error: did not get full stock list! ", $(stocksList).length, " exist: ", countExist, " list: ", $(stocksList));
        }

        // -- Now we're all good to go. --
        for (let i = 0; i < stocksList.length; i++) {
            let stockUL = stocksList[i];
            let stockID = stockUL.id;
            if (!stockID) continue; // Expanded stock column
            let stockName = stockNameFromID(stockID);
            let stockPrice = stockPriceFromID(stockID);
            if (!myStocks[stockID]) { // Un-owned
                continue;
            }
            stockUL.setAttribute('style', 'height: auto;');
            let owned = myStocks[stockID].transactions;
            let keys = Object.keys(owned);
            for (let j = 0; j < keys.length; j++) {
                let ownedLI = stockUL.querySelector("#ownedTab");
                let ownedShares = owned[keys[j]].shares;
                let boughtPrice = owned[keys[j]].bought_price;
                let profit = (stockPrice - boughtPrice) * ownedShares; // Gross profit
                let fee = stockPrice * ownedShares * .001;
                profit = profit - fee; // -.1% fee.
                if (profit > 0 && showProfit) $(ownedLI).append('<p class="xedx-green">' + asCurrency(profit) + '</p>');
                if (profit < 0 && showLoss) $(ownedLI).append('<p class="xedx-offred">' + asCurrency(profit) + '</p>');
            }
        }

        highlightReadyStocks();

        // Now set up an observer, as the prices update now and again.
        if (!observer) observer = new MutationObserver(reload);
        observer.observe($(mainStocksSelector)[0], {attributes: true, characterData: true});
    }

    // Reload after stock prices change
    function reload() {
        log("reload triggered");
        myStocks = null;
        tornStocks = null;
        xedx_TornUserQuery(null, 'stocks', userStocksCB);
    }

    function handlePageLoad() {
        if (!isStocksPage()) return log("ERROR: Not on stocks page?");
        addCheckBox();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    xedx_TornUserQuery(null, 'stocks', userStocksCB);

    callOnHashChange(handlePageLoad);
    installPushStateHandler(handlePageLoad);

    if (!isStocksPage()) return log("ERROR: Not on stocks page?");

    callOnContentLoaded(handlePageLoad);


})();