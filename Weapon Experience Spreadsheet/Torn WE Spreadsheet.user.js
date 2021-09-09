// ==UserScript==
// @name         Torn WE Spreadsheet
// @namespace    http://tampermonkey.net/
// @version      0.2
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
                             '</div>Weapon Experience</div>' +

                             '<div class="bottom-round" style="display: none; overflow: hidden;" id="xedx-we-spreadsheet-body">' +
                                 '<div class="cont-gray" style="height: auto;" id="xedx-we-spreadsheet-cont">' +
                                     '<table id="xedx-we-spreadsheet-table" style="width: 782px;">' +
                                         '<thead><tr>' +
                                             '<th class="xthx" style="color: white;">Primary</th>' +
                                             '<th class="xthx" style="color: white;">Secondary</th>' +
                                             '<th class="xthx" style="color: white;">Melee</th>' +
                                             '<th class="xthx" style="color: white;">Temporary</th>' +
                                         '</tr></thead>' +
                                         '<tbody>';  // Start table

                                           /* Rows will be inserted here */

       var newBottomDiv =                '</tbody>' + // End table
                                     '</table>' +
                                 '</div>' +
                             '</div>' +
                         '</div>' +
                     '</div>' +
                 '</div>' +
                 '<hr class="delimiter-999 m-top10 m-bottom10"></hr>';

    function loadTableStyles() {
        log('Loading table styles.');
        GM_addStyle(".xthx, .xtdx {" +
                    (useCellBackground ? '' : "background: #333333 !important;") +
                    "border-width: 1px !important;" +
                    "border-style: solid !important;" +
                    "border-color: #5B5B5B !important;" +
                    "padding: 0.5rem !important;" +
                    "vertical-align: middle !important;" +
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

    // Globals
    var itemsArray = null; // Array of all Torn items
    var weArray = null;  // Array of weapon experience

    var useCellBackground = false; // true to colr background, else text itself.

    var primaryArray = [];
    var secondaryArray = [];
    var meleeArray = [];
    var temporaryArray = [];

    // Declared in Torn-JS-Helpers
    debugLoggingEnabled = false;
    loggingEnabled = true;

    //////////////////////////////////////////////////////////////////////
    // Real meat of the code. Labelled in order for convenience, Each
    // async call is chained, could use promises instead.
    //////////////////////////////////////////////////////////////////////

    // Step 1:
    // Called once page is loaded
    function handlePageLoad() {
        log('handlePageLoad.');
        loadTableStyles();

        // Query weapons experience - once that completes,
        // we will call the function to modify the page.
        if (itemsArray == null) {
            xedx_TornTornQuery(null, 'items', tornQueryCB);
        } else {
            xedx_TornUserQuery(null, 'weaponexp', userQueryCB);
        }
    }

    // Step 2:
    // Response handler for Torn API 'torn' query, above.
    function tornQueryCB(responseText, ID, param) {
        log('Torn query callback.');
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        // This will be an array of "key (item ID)" : {...}
        // For example:
        /*
        "1": {
			"name": "Hammer",
			"description": "A small, lightweight tool used in the building industry. Can also be used as a weapon.",
			"effect": "",
			"requirement": "",
			"type": "Melee",
			"weapon_type": "Clubbing",
			"buy_price": 75,
			"sell_price": 50,
			"market_value": 106,
			"circulation": 1839375,
			"image": "https://www.torn.com/images/items/1/large.png"
		},
        */
        // We just save this for now, to locate weapon type, later.
        itemsArray = jsonResp.items;
        xedx_TornUserQuery(null, 'weaponexp', userQueryCB);
    }

    // Step 3:
    // Response handler for Torn API 'user' query, above.
    function userQueryCB(responseText, ID, param) {
        log('User query callback.');
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        weArray = jsonResp.weaponexp; // Array of 'weaponexperience' objects: {"itemID", "name", "Exp"}
        sortArrays();
    }

    // Step 4:
    // Sorts and merges the two arrays, items and experience, into 4 new arrays,
    // primary, secondary, melee and temporary weapons and their WE.
    function sortArrays() {
        for (let i =0; i < weArray.length; i++) {
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

        let rows = buildTableRows();
        let newDiv = newTopDiv + rows + newBottomDiv;

        $(newDiv).insertBefore(refDiv);
        installClickHandler();
    }

    //////////////////////////////////////////////////////////////////////
    // Helper functions
    //////////////////////////////////////////////////////////////////////

    // Function to build the table rows from our arrays
    function buildTableRows() {
        let maxRows = Math.max(primaryArray.length, secondaryArray.length, meleeArray.length, temporaryArray.length);
        if (maxRows < 1) {return;}

        let result = '';
        for (let i = 0; i < maxRows; i++) {
            result += '<tr style="height: 23px;">'; // Start row

            let arrays = [primaryArray, secondaryArray, meleeArray, temporaryArray];
            for (let j = 0; j < 4; j++) {
                let useArray = arrays[j];
                if (validPointer(useArray[i])) {
                    result += buildCell(useArray[i].name, useArray[i].exp);
                } else {
                    result += '<td class="xtdx"></td>'; // Empty cell
                }
            }
            result += '</tr>'; // End row
        }
        return result;
    }

    // Helper to build and color-code an individual cell
    function buildCell(name, exp) {
        let color = (exp == 100) ? 'xtdx-green' :
            (exp >= 75) ? 'xtdx-yellow' :
            (exp >= 50) ? 'xtdx-orange' : 'xtdx-red';

        let output = '<td class="xtdx ' + color + '">' +
            '<span style="float:left">' + name +
            '</span><span style="float:right">' + exp + '%</span></td>';

        return output;
    }

    // Helper to get item object by ID
    function getItemById(itemID) {
        let itemObj = itemsArray[itemID.toString()];
        return itemObj;
    }

    // Helper to toggle body div on arrow click
    function installClickHandler() {
        const bodyDiv = document.getElementById('xedx-we-spreadsheet-body');
        const headerDiv = document.getElementById('xedx-we-spreadsheet-hdr-div');
        const arrowDiv = headerDiv.parentElement; // xedx-we-spreadsheet-div ??

        arrowDiv.addEventListener("click", function() {
            if (bodyDiv.style.display === "block") {
                bodyDiv.style.display = "none";
                headerDiv.className = 'title main-title title-black border-round';
            } else {
                bodyDiv.style.display = "block";
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

    // The queries will take a bit - just go ahead ans start the party!
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