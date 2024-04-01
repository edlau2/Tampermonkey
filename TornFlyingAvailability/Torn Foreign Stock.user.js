// ==UserScript==
// @name         Torn Foreign Stock
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Check foreign stock quantities while flying
// @author       xedx [2100735]
// @match        https://www.torn.com/index.php
// @connect      api.torn.com
// @connect      yata.yt
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// Rename Torn Foreign Stock ?

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

/* GitHub link:
    https://github.com/edlau2/Tampermonkey/raw/master/TornFlyingAvailability/Torn%20Flying%20Availabilty.user.js

    To get country from a console: $('body')[0].getAttribute('data-country')
*/

(function() {
    'use strict';

    // For testing/dev/debug
    var devMode = false;
    var inFlight = false;
    var country = "";
    var countryCode = "";

    debugLoggingEnabled = true; //devMode;

    var targetNode = document.querySelector("#mainContainer > div.content-wrapper > " +
                                              "div.travel-agency-travelling > div.flight-info");

    var itemsList = null;
    var availableStocks = null;
    var updating = false;
    var updateInterval = null;
    var lastUpdate = "";

    function addStyles()
    {
        GM_addStyle(`
            .xedx-flex-wrap {display: flex; flex-direction: row;}
            .xedx-center {display: inline-block; margin-bottom: 0px;}
            .xedx-fly-btn {display: inline-block;
                       vertical-align: top;
                       margin-top: 10px;}
            .xedx-ml2 {margin-left: 20px;}
            .xedx-mb10 {margin-bottom: 10px;}
            .xdivider span {padding-right: 3px; margin-top: 10px;}
            .xedx-item {margin-right: 10px;}
            .xedx-cell-width {width: 120px; margin-left: 10px;}
        `);

        /*
        GM_addStyle(`
            .xedx-o {outline: 1px solid white;}
        `);
        */
    }

    const delim = `<hr class="delimiter-999 m-hide">`;

    const newDiv = `<hr class="delimiter-999 m-hide">
                      <div id="xedx-trav-div">
                        <span><b>Foreign Stock</b></span>
                        <ul id="xedx-stock-list"></ul>
                      </div>`;

    const wrapperDiv =
          `<hr class="delimiter-999 m-hide">
           <div style="opacity: 1; height: 10px;"><span></span></div>

           <div id="xedx-fly-wrapper" class="items-wrap t-blue-cont">
             <div class="title-black hospital-dark top-round scroll-dark" role="heading" aria-level="5">
                 <span id="xedx-last-update" class="m-hide"> Inventory </span>
             </div>
             <div class="title-black hospital-dark " role="heading" aria-level="5">
                 <input type="checkbox" id="xedx-plushies" data-type="Plushie" class="xedx-fly-btn"/><span> Plushies </span>
                 <input type="checkbox" id="xedx-flowers" data-type="Flower" class="xedx-fly-btn xedx-ml2"> Flowers </input>
                 <input type="checkbox" id="xedx-drugs" data-type="Drug" class="xedx-fly-btn xedx-ml2"> Drugs </input>
                 <input type="checkbox" data-type="Primary" class="xedx-fly-btn xedx-ml2"> Primary </input>
                 <input type="checkbox" data-type="Seconday" class="xedx-fly-btn xedx-ml2"> Secondary </input>
                 <input type="checkbox" data-type="Melee" class="xedx-fly-btn xedx-ml2"> Melee </input>
                 <input type="checkbox" data-type="Temporary" class="xedx-fly-btn xedx-ml2"> Temps </input>
                 <input type="checkbox" id="xedx-temps" data-type="Defensive" class="xedx-fly-btn xedx-ml2"> Armor </input>
                 <input type="checkbox" id="xedx-other" data-type="Other" class="xedx-fly-btn xedx-ml2"> Other </input>
             </div>
             <ul id="xedx-inventory-ul" class="info-cont-wrap">
             </ul>
          </div>`; // Ends class="items-wrap"

    // <div class="thumbnail-wrap xedx-flex-wrap" tabindex="0">
    const liInsert =
        `<li>
            <div class="xedx-flex-wrap" tabindex="0">
                    <span class="thumbnail">
                        <img class="torn-item medium xedx-item xedx-o" src="/images/items/REPLACE_ID/medium.png">
                    </span>
                    <span class="xdivider xedx-o">
                        <span class="xedx-center xedx-cell-width">REPLACE_NAME</span>
                    </span>
                    <span class="xdivider xedx-o">
                        <span class="xedx-center xedx-cell-width">REPLACE_TYPE</span>
                    </span>
                    <span class="xdivider xedx-o">
                        <span class="xedx-center xedx-cell-width">Price: REPLACE_COST</span>
                    </span>
                    <span class="xdivider xedx-o">
                        <span class="xedx-center xedx-cell-width">Available: REPLACE_Q</span>
                    </span>
            </div>
        </li>`;

    const liEmpty =
        `<li>
            <div class="xedx-flex-wrap" tabindex="0">
                    <span class="thumbnail">
                    </span>
                    <span class="xdivider">
                        <span class="xedx-center"></span>
                    </span>
                    <span class="xdivider">
                        <span class="xedx-center"></span>
                    </span>
                    <span class="xdivider">
                        <span class="xedx-center"></span>
                    </span>
            </div>
        </li>`;

    function getYataStocks()
    {
        if (updating) log("Updating stock list...");
        xedx_YataForeignStocks(handleStocksResult);
    }

    function itemsQueryCallback(responseText)
    {
        log("itemsQueryCallback");
        if (responseText != null) {
            let jsonObj = JSON.parse(responseText);
            if (jsonObj.error) {return handleError(responseText);}

            itemsList = jsonObj.items;
        }

        getYataStocks();
    }

    function logTimestamp(timestamp)
    {
        const date = new Date(timestamp * 1000);
        const now = new Date(Date.now());

        const datevalues = {
            "year": date.getFullYear(),
            "month": date.getMonth()+1,
            "day": date.getDate(),
            "hr": date.getHours(),
            "min": date.getMinutes(),
            "sec": date.getSeconds(),
        };

        const nowvalues = {
            "year": now.getFullYear(),
            "month": now.getMonth()+1,
            "day": now.getDate(),
            "hr": now.getHours(),
            "min": now.getMinutes(),
            "sec": now.getSeconds(),
        };

        /*
        debug("timestamp: ", timestamp, " date: ", datevalues);
        debug("timestamp now: ", now, " date: ", nowvalues);
        debug("timestamp diff, hrs: ", nowvalues.hr - datevalues.hr, " min: ", nowvalues.min - datevalues.min,
            " sec: ", nowvalues.sec - datevalues.sec);
        */

        lastUpdate = (nowvalues.min - datevalues.min) + " min. ago";
        log("Last update: ", lastUpdate);
        $("#xedx-last-update").text(" Inventory - Last Updated " + lastUpdate);
    }

    function handleStocksResult(responseText, param)
    {
        debug("handleStocksResult");
        if (responseText != null) {
            let jsonObj = JSON.parse(responseText);
            if (jsonObj.error) {return handleError(responseText);}
            availableStocks = jsonObj.stocks;
            debug("Available: ", availableStocks);
            if (!countryCode) countryCode = codeFromCountry(country);

            log("countryCode: ", countryCode);
            if (countryCode) {
                log("availableStocks[countryCode]: ", availableStocks[countryCode]);
                log("availableStocks[countryCode].update: ", availableStocks[countryCode].update);
                logTimestamp(availableStocks[countryCode].update);
            }
        }

        if (updating)
            reloadInventory();
        else
            handlePageLoad();
    }

    function codeFromCountry(country)
    {
        log ("[codeFromCountry] locating ", country);

        if (country == 'uk') return 'uni';                // Verified
        if (country == 'mexico') return 'mex';            // Verified
        if (country == 'canada') return 'can';            // Verified
        if (country == 'argentina') return 'arg';         // Verified
        if (country == 'hawaii') return 'haw';
        if (country == 'cayman-islands') return 'cay';    // Verified
        if (country == 'switzerland') return 'swi';       // Verified
        if (country == 'japan') return 'jap';
        if (country == 'china') return 'chi';             // Verified
        if (country == 'uae') return 'uae';               // Verified
        if (country == 'south-africa') return 'sou';      // Verified

        log("*** Didn't find ", country, " in country list! ***");
        GM_setValue("unknown_country", country);
        return null;
    }

    // Install handlers for filter checkboxes
    // Also set the saved state!
    function installCheckboxHandlers()
    {
        let checkboxes = document.getElementsByClassName('xedx-fly-btn');
        for (let i=0; i<checkboxes.length; i++) {
            let id = checkboxes[i].id;
            let dataType = $(checkboxes[i]).attr("data-type");
            let optName = "show-" + dataType;
            debug("Install handler for id: ", id, " dataType: ", dataType, " optName: ", optName);
            checkboxes[i].addEventListener('click', tornFlyingClickHandler);

            $(checkboxes[i]).prop("checked", GM_getValue(optName, false));
        }
    }

    // Handle the clicks on checkboxes.
    function tornFlyingClickHandler(ev)
    {
        log('[tornFlyingClickHandler] target: ', ev.target, ' enabled: ', ev.target.checked);

        let node = ev.currentTarget;
        let dataType = $(node).attr("data-type");
        let optName = "show-" + dataType;
        log("Target: ", $(node));
        log("DataType: ", dataType, " optName: ", optName);
        GM_setValue(optName, ev.target.checked);

        reloadInventory();
    }

    function reloadInventory()
    {
        $("#xedx-inventory-ul").empty();
        buildInventoryList();
    }

    function buildInventoryList()
    {
        let currCountryStocks = availableStocks[countryCode].stocks;
        //debug("currCountryStocks: ", currCountryStocks);
        $("#xedx-inventory-ul").append(liEmpty);
        currCountryStocks.forEach((item) => {
            let itemType = itemsList[item.id].type;
            debug("Item: ", item.name, " ID: ", item.id, " type: ", itemType);

            // Filter items as needed
            let optName = "show-" + itemType;
            let optEnabled = GM_getValue(optName, false);
            debug("optName: ", optName, " enabled: ", optEnabled);
            if (!optEnabled) return;

            // Build the LI and insert
            let newLi = liInsert.replaceAll("REPLACE_ID", item.id)
                                .replaceAll("REPLACE_NAME", item.name)
                                .replaceAll("REPLACE_TYPE", itemType)
                                .replaceAll("REPLACE_COST", asCurrency(item.cost))
                                .replaceAll("REPLACE_Q", item.quantity);
            $("#xedx-inventory-ul").append(newLi);
        });
    }

    function handlePageLoad() {
        // Can check for any required DIV here and setTimeout() if not available,
        // or trigger any required API calls...
        let testNode = $('#xedx-fly-wrapper');
        if (!$(testNode).length)
        {
            // Testing - need diff target if not really flying
            if (!inFlight && devMode) {
                targetNode = document.querySelector("#xedx-attacks-ext > div.title-black.bottom-round");
            }

            if (targetNode) {
                debug("Inserting new DIV");
                $(targetNode).after(wrapperDiv);
                //$("#xedx-fly-wrapper").before(delim);
            } else {
                debug("Retrying...");
                return setTimeout(handlePageLoad, 1000);
            }

            installCheckboxHandlers();
        }

        // For the country we are in, add the available stock to our UL
        // Clean up the UI later
        //countryCode = codeFromCountry(country);
        if (!countryCode) {
            log("Unable to find country code! ERROR!");
            let li = "";
            if (country == "torn")
                li = "<li> --> Flying home, nothing to see here!</li>";
            else
                li = "<li>Unable to locate country for: '" + country + " Let xedx [2100735] know!' </li>";
            $("#xedx-inventory-ul").append(li);
            return;
        }

        buildInventoryList();

        // Start auto-updating
        updating = true;
        updateInterval = setInterval(getYataStocks, 60000);
        logTimestamp(availableStocks[countryCode].update);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    if (!travelling()) {
        log("Not travelling!");

        // Dev: test this call even in not flying
        if (devMode) {
            addStyles();
            country = "argentina";
            xedx_TornTornQueryDbg(0, "items", itemsQueryCallback);
        }

        return;
    }

    addStyles();
    inFlight = true;
    country = currentCountry().toLowerCase().trim();
    if (country == "torn") {
        log("Flying home, no inventory to display.");
        return;
    }

    xedx_TornTornQueryDbg(0, "items", itemsQueryCallback);


    /////////////////////////////////////////////////
    // Query YATA for foreign stocks, put this into library...
    //
    function xedx_YataForeignStocks(callback, param=null) {

        const yataHost = "https://yata.yt";
        const stocksURL = "/api/v1/travel/export/";
        let url = yataHost + stocksURL;

        //console.debug('(JS-Helper) ' + GM_info.script.name + ' Spying ' + ID + ' via TornStats');
        //console.debug('(JS-Helper) ' + GM_info.script.name + ' url: ' + url);

        log("xedx_YataForeignStocks: url is ", url);
        GM_xmlhttpRequest({
            method:"GET",
            url:url,
            headers: {
                'Accept': '*/*'
            },
            onload: function(response) {
                // Check status code here: 429
                console.log('TornStat response: ', response);
                //if (response.status != 200) {
                //} else {
                    callback(response.responseText, param);
                //}
            },
            onerror: function(response) {
                console.debug('(JS-Helper) ' + GM_info.script.name + ': onerror');
                console.debug(response);
                handleSysError(response);
            },
            onabort: function(response) {
                console.debug('(JS-Helper) ' + GM_info.script.name + ': onabort');
                console.debug(response);
                handleSysError(response);
            },
            ontimeout: function(response) {
                console.debug('(JS-Helper) ' + GM_info.script.name +': ontimeout');
                console.debug(response);
                handleSysError(response);
            }
        });
    }// End YATA stocks fn...


})();