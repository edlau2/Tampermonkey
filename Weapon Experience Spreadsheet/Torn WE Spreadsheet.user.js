// ==UserScript==
// @name         Torn WE Spreadsheet
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Creates a new expandable DIV on the Items page with Weapon Experience info in a table
// @include      https://www.torn.com/item.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/GymGains/Torn-Gym-Gains-Div.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // HTML for new DIVs and styles for the table cells
    //////////////////////////////////////////////////////////////////////

    var newTopDiv = '<div class="sortable-box t-blue-cont h" id="xedx-we-spreadsheet-div">' +
                     '<div class="title main-title title-black top-round active" role="table" aria-level="5" id="xedx-we-spreadsheet-hdr-div">' +
                         '<div class="arrow-wrap sortable-list">' +
                             '<a role="button" href="#/" class="accordion-header-arrow right"></a>' +
                         '</div><span id="xedx-we-title">Weapon Experience and Finishing Hits</span>' +
                     '</div>' +

                             '<div class="bottom-round" style="display: none; overflow: hidden;" id="xedx-fh-spreadsheet-body">' +
                                 '<div class="cont-gray" style="height: auto;" id="xedx-fh-spreadsheet-cont">' +
                                     // Finishing hits table
                                     '<table id="xedx-fh-spreadsheet-table" style="width: 782px;">' +
                                         '<thead><tr>' +
                                             '<th class="xthx" colspan="4" scope="colgroup">Finishing Hits</th>' +
                                         '</tr></thead>' +
                                         '<tbody>'; // Start table

                                             /* Rows (fhRows) will be inserted here */

    var newMiddleDiv =                   '</tbody>' + // End table
                                     '</table>' +
                                 '</div>' +
                             '</div>' +

                             '<div class="bottom-round" style="display: none; overflow: hidden;" id="xedx-we-spreadsheet-body">' +
                                 '<div class="cont-gray" style="height: auto;" id="xedx-we-spreadsheet-cont">' +
                                     // Weapon Experience table
                                     '<table id="xedx-we-spreadsheet-table" style="width: 782px;">' +
                                         //'<thead><tr>' +
                                         //    '<th class="xthx" colspan="4" scope="colgroup">Weapon Experience</th>' +
                                         //'</tr></thead>' +
                                         '<thead><tr>' +
                                             '<th class="xthx">Primary</th>' +
                                             '<th class="xthx">Secondary</th>' +
                                             '<th class="xthx">Melee</th>' +
                                             '<th class="xthx">Temporary</th>' +
                                         '</tr></thead>' +
                                         '<tbody>'; // Start table

                                           /* Rows (weRows) will be inserted here */

       var newBottomDiv =                '</tbody>' + // End table
                                     '</table>' +
                                 '</div>' +
                             '</div>' +
                         '</div>' +
                     '</div>' +
                 '</div>' +
                 '<hr class="delimiter-999 m-top10 m-bottom10"></hr>';

    // Will be table rows
    var fhRows = null;
    var weRows = null;

    // Globals
    var itemsArray = null; // Array of all Torn items
    var inventoryArray = null; // Array of inventory items
    var weArray = null;  // Array of weapon experience
    var fhArray = null; // Array of personalstats, including finishing hits
    var weAt100pct = 0; // Count of weapons at 100%

    var useCellBackground = false; // true to color background, else text itself.

    var primaryArray = [];
    var secondaryArray = [];
    var meleeArray = [];
    var temporaryArray = [];

    // Declared in Torn-JS-Helpers
    debugLoggingEnabled = true;
    loggingEnabled = true;

    function loadTableStyles() {
        log('Loading table styles.');
        GM_addStyle(".xthx, .xtdx {" +
                    (useCellBackground ? '' : "background: #333333 !important;") +
                    "border-width: 1px !important;" +
                    "border-style: solid !important;" +
                    "border-color: #5B5B5B !important;" +
                    "padding: 0.5rem !important;" +
                    "vertical-align: middle !important;" +
                    "color: white; !important;" +
                    "text-align: center;" +
                    "}");

        GM_addStyle(".xtdx-left {text-align: left;}");
        GM_addStyle(".xtdx-center {text-align: center;}");
        GM_addStyle(".xtdx-right {text-align: right;}");

        if (useCellBackground) {
            GM_addStyle(".xtdx-green {" +
                        "background: green;" +
                        "}");
            GM_addStyle(".xtdx-red {" +
                        "background: red;" +
                        "}");
            GM_addStyle(".xtdx-yellow {" +
                        "background: yellow;" +
                        "}");
            GM_addStyle(".xtdx-orange {" +
                        "background: orange;" +
                        "}");
        } else {

            GM_addStyle(".xtdx-green {" +
                        "color: green;" +
                        "}");
            GM_addStyle(".xtdx-red {" +
                        "color: red;" +
                        "}");
            GM_addStyle(".xtdx-yellow {" +
                        "color: yellow;" +
                        "}");
            GM_addStyle(".xtdx-orange {" +
                        "color: orange;" +
                        "}");
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Real meat of the code. Labelled in order for convenience, Each
    // async call is chained, could use promises instead.
    //////////////////////////////////////////////////////////////////////

    // Step 1:
    // Called once page is loaded
    function handlePageLoad() {
        log('handlePageLoad.');
        loadTableStyles();

        // Query inventory, to see what is equipped.
        xedx_TornUserQuery(null, 'inventory', inventoryCB);
    }

    // Step 1a: Callback for inventory query.
    // Launches other queries.
    function inventoryCB(responseText, ID, param) {
        log('User inventory query callback.');
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        inventoryArray = jsonResp.inventory;

        // Query weapons experience - once that completes,
        // we will call the function to modify the page.
        if (itemsArray == null) {
            xedx_TornTornQuery(null, 'items', tornQueryCB);
        } else {
            xedx_TornUserQuery(null, 'weaponexp', userQueryCB);
        }

        // Query personal stats, for finishing hits
        xedx_TornUserQuery(null, 'personalstats', userPersonalstatsCB);
    }

    // Step 2:
    // Response handler for Torn API 'torn' query, above.
    function tornQueryCB(responseText, ID, param) {
        log('Torn items query callback.');
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        // This will be an array of "key (item ID)" : {...}
        // We just save this for now, to locate weapon type, later.
        itemsArray = jsonResp.items;
        xedx_TornUserQuery(null, 'weaponexp', userQueryCB);
    }

    // Step 3a:
    // Response handler for Torn API 'user' query for weaponexp, above.
    function userQueryCB(responseText, ID, param) {
        log('User weaponexperience callback.');
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        weArray = jsonResp.weaponexp; // Array of 'weaponexperience' objects: {"itemID", "name", "Exp"}
        sortArrays();
    }

    // Step 3b:
    // Response handler for personal stats query
    function userPersonalstatsCB(responseText, ID, param) {
        log('User personalstats callback.');
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        fhArray = jsonResp.personalstats; // Array of 'personalstats', including finishing hits

        fhRows = buildFhTableRows(fhArray);
        modifyPage();
    }

    // Step 3a helper:
    // Sorts and merges the two arrays, items and experience, into 4 new arrays,
    // primary, secondary, melee and temporary weapons and their WE.
    // Also count the ## at 100% (weAt100pct)
    function sortArrays() {
        for (let i =0; i < weArray.length; i++) {
            if (weArray[i].exp == 100) {weAt100pct++;}
            let ID = weArray[i].itemID;
            let itemObj = getItemById(ID);
            if (validPointer(itemObj)) {
                if (itemObj.type == 'Primary') {
                    primaryArray.push(weArray[i]);
                } else if (itemObj.type == 'Secondary') {
                    secondaryArray.push(weArray[i]);
                } else if (itemObj.type == 'Melee') {
                    meleeArray.push(weArray[i]);
                } else if (itemObj.type == 'Temporary') {
                    temporaryArray.push(weArray[i]);
                } else {
                    log('Unknown type ' + itemObj.type + ' for weapon ID ' + ID);
                }
            } else {
                log('Error finding item ' + ID + ' in itemsArray!');
            }
        }

        weRows = buildWeTableRows();
        modifyPage();
    }

    // Step 5:
    // Build our new DIV
    function modifyPage() {
        log('modifyPage');

        // Install above this div
        let refDiv = $("#loadoutsRoot");
        if (!validPointer(refDiv)) {
            console.log('Do something here!!');
            // Set up an observer, or timer, ....
            return;
        }

        // Wait until -both- tables have been built
        if (fhRows ==  null || weRows ==  null) {
            log('Not all rows complete - will return.');
            setTimeout(modifyPage, 500);
            return;
        } else {
            log('Both weRows and fhRows complete.');
            log('Weapons at 100%: ' + weAt100pct);
        }

        if (validPointer(document.querySelector("#xedx-we-spreadsheet-div"))) {
            debug('New WE and FH div already installed!');
            return;
        }
        let newDiv = newTopDiv + fhRows + newMiddleDiv + weRows + newBottomDiv;

        $(newDiv).insertBefore(refDiv);
        setTitlebar();
        installClickHandler();
    }

    //////////////////////////////////////////////////////////////////////
    // Helper functions
    //////////////////////////////////////////////////////////////////////

    // Helper to set the title in the title bar to reflect # of weapons completed to 100%
    function setTitlebar() {
        if (!validPointer($("#xedx-we-title"))) {
            setTimeout(setTitlebar, 1000);
        } else {
            document.querySelector("#xedx-we-title").innerText = "Weapon Experience and Finishing Hits (" +
                weAt100pct + ") weapons at 100%. Total rounds fired: " + numberWithCommas(fhArray.roundsfired) + "/1,000,000";
        }
    }

    // Function to build the table rows from our arrays for Weapon Experience
    function buildWeTableRows() {
        let maxRows = Math.max(primaryArray.length, secondaryArray.length, meleeArray.length, temporaryArray.length);
        if (maxRows < 1) {return;}

        let result = '';
        for (let i = 0; i < maxRows; i++) {
            result += '<tr style="height: 23px;">'; // Start row

            let arrays = [primaryArray, secondaryArray, meleeArray, temporaryArray];
            for (let j = 0; j < 4; j++) {
                let useArray = arrays[j];
                if (validPointer(useArray[i])) {
                    result += buildWeCell(useArray[i]);
                } else {
                    result += '<td class="xtdx"></td>'; // Empty cell
                }
            }
            result += '</tr>'; // End row
        }
        return result;
    }

    // Helper to build and color-code an individual cell for WE
    function buildWeCell(weItem) {
        let itemObj = getInventoryById(weItem.itemID);
        let color = (weItem.exp == 100) ? 'xtdx-green' :
            (weItem.exp >= 50) ? 'xtdx-orange' : 'xtdx-red';
        if (validPointer(itemObj) ? itemObj.equipped : false) {color = 'xtdx-yellow';}

        let output = '<td class="xtdx ' + color + '">' +
            '<span style="float:left">' + weItem.name +
            '</span><span style="float:right">' + weItem.exp + '%</span></td>';

        return output;
    }

    // Helper for below, put in helper lib!!!
    function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

    // Function to build the table rows from our arrays for Finishing Hits
   function buildFhTableRows(obj) { // obj is a personalstats object
        let result = '<tr>';
        result += buildFhCell('Machine Guns', obj.machits);
        result += buildFhCell('Rifles', obj.rifhits);
        result += buildFhCell('Piercing', obj.piehits);
        result += buildFhCell('Clubbing', obj.axehits);
        result += '</tr><tr>';
        result += buildFhCell('Sub Machine Guns', obj.smghits);
        result += buildFhCell('Pistols', obj.pishits);
        result += buildFhCell('Mechanical', obj.chahits);
        result += buildFhCell('Temporary', obj.grehits);
        result += '</tr><tr>';
        result += buildFhCell('Heavy Artillery', obj.heahits);
        result += buildFhCell('Shotguns', obj.shohits);
        result += buildFhCell('Slashing', obj.slahits);
        result += buildFhCell('Hand to Hand', obj.h2hhits);
        result += '</tr>';

        return result;
    }

    // Helper to build and color-code an individual cell for FH
    function buildFhCell(name, count) {
        let color = (count >= 1000) ? 'xtdx-green' : 'xtdx-red';
        let result = '<td class="xtdx ' + color + '"><span style="float:left">' + name +
            '</span><span style="float:right">' + numberWithCommas(count) + '</span></td>';
        return result;
    }

    // Helper to get item object by ID
    function getItemById(itemID) {
        let itemObj = itemsArray[itemID.toString()];
        return itemObj;
    }

    // Helper to get inventory object by ID
    function getInventoryById(itemID) {
        let itemObjs = inventoryArray.filter(item => item.ID == itemID);
        return itemObjs[0];
    }

    // Helper to toggle body div on arrow click
    function installClickHandler() {
        const bodyDiv = document.getElementById('xedx-we-spreadsheet-body');
        const bodyDiv2 = document.getElementById('xedx-fh-spreadsheet-body');
        const headerDiv = document.getElementById('xedx-we-spreadsheet-hdr-div');
        const arrowDiv = headerDiv.parentElement; // xedx-we-spreadsheet-div ??

        arrowDiv.addEventListener("click", function() {
            if (bodyDiv.style.display === "block") {
                bodyDiv.style.display = "none";
                bodyDiv2.style.display = "none";
                headerDiv.className = 'title main-title title-black border-round';
            } else {
                bodyDiv.style.display = "block";
                bodyDiv2.style.display = "block";
            }
        });
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();

    // The queries will take a bit - just go ahead and start the party!
    handlePageLoad();

    // Wait for full page load.
    /*
    if (document.readyState === 'complete') {
        handlePageLoad();
    } else {
        window.onload = function(e){handlePageLoad();}
    }
    */

})();
