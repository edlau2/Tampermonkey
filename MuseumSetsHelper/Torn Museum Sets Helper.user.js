// ==UserScript==
// @name         Torn Museum Sets Helper
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Helps determine when museum sets are complete in Item pages
// @author       xedx [2100735]
// @match        https://www.torn.com/item.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @require      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-Hints-Helper.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @connect      api.torn.com
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

    const requiredHdr = +
        '<div>' +
            '<div id="xedx-required-hdr" class="items-wrap primary-items t-blue-cont">' +
                '<div class="title-black top-round scroll-dark" role="heading" aria-level="5">' +
                    '<span class="m-hide"> Required items for full sets </span>' +
                '</div>' +
                '<div id="xedx-category-wrap" class="category-wrap ui-tabs ui-widget ui-widget-content ui-corner-all">' +
                    '<ul id="xedx-required-items" class="items-cont tab-menu-cont cont-gray bottom-round itemsList ui-tabs-panel ui-widget-content ui-corner-bottom current-cont" data-loaded="0" aria-expanded="true" aria-hidden="false">' +
                    '</ul>' +
                '</div>' +
            '</div>' +
        '</div>';

    const fullSetsHdr = +
        '<div>' +
            '<div id="xedx-fullset-hdr" class="items-wrap primary-items t-blue-cont">' +
                '<div class="title-black top-round bottom-round scroll-dark" role="heading" aria-level="5">' +
                    '<span class="m-hide"> You have numberFullSets full set(s). This can be traded in for ' +
                    ' numberFullPoints points, at priceOfPoints each, for totalPrice (pawnPrice at the Pawn Shop).</span>' +
                '</div>' +
                '<div id="xedx-category-wrap" class="category-wrap ui-tabs ui-widget ui-widget-content ui-corner-all">' +
                    '<ul id="xedx-required-items" class="items-cont tab-menu-cont cont-gray bottom-round itemsList ui-tabs-panel ui-widget-content ui-corner-bottom current-cont" data-loaded="0" aria-expanded="true" aria-hidden="false">' +
                    '</ul>' +
                '</div>' +
            '</div>' +
        '</div>';

    const xedxHdrID = 'xedx-required-hdr';
    const xedxFullSetHdr = 'xedx-fullset-hdr';
    const sepDiv = '<hr class="delimiter-999 m-top10 m-bottom10">';

    // Control flags: Once the page is loaded, AND we have inventory data,
    // only then can we fully process.
    var pageLoaded = false; // Page fully loaded
    var dataReceived = false; // Data from API query received
    var dataProcessed = false; // Data from API call processed
    var pageModified = false; // Page has been  modified
    var pageObserver = null; // Mutation observer for the page
    var observing = false; // Observer is active
    const observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };

    // Page names. spans, divs, etc.
    const pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
    const pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black";
    const mainItemsDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap";
    var pageName = null;
    var pageSpan = null;
    var pageDiv = null;
    var xedxSepNode = null;
    var xedxHdrNode = null;

    // Colors used to highlight items that belong in museum sets
    // See https://www.w3schools.com/colors/colors_names.asp or
    // https://www.w3schools.com/cssref/css_colors_legal.asp
    // or any other color-picker. I'm still experimenting to
    // find a color I like, on both dark mode and light. We
    // can use different colors for either.
    const flowerSetColor = "#5f993c"; // "#FFFACD50"; // LemonChiffon, 0x50% xparency, looks OK in light and dark modes
    const plushiesSetColor = "#5f993c";
    const quransSetSetColor = "#2f690c";
    const coinSetSetColor = "#5f993c"; //"Plum"; // #DDA0DD
    const senetSetSetColor = "LightBlue"; // #ADD8E6
    const missingItemColor = "#228B2250"; //"ForestGreen" #228B22

    // Names of items in various sets. 
    var flowersInSet = [{"name":"Dahlia", "id": 260, "quantity": 0},
                          {"name":"Orchid", "id": 264, "quantity": 0},
                          {"name":"African Violet", "id": 282, "quantity": 0},
                          {"name":"Cherry Blossom", "id": 277, "quantity": 0},
                          {"name":"Peony", "id": 276, "quantity": 0},
                          {"name":"Ceibo Flower", "id": 271, "quantity": 0},
                          {"name":"Edelweiss", "id": 272, "quantity": 0},
                          {"name":"Crocus", "id": 263, "quantity": 0},
                          {"name":"Heather", "id": 267, "quantity": 0},
                          {"name":"Tribulus Omanense","id": 385, "quantity": 0},
                          {"name":"Banana Orchid", "id": 617, "quantity": 0}];

    var plushiesInSet = [{"name":"Jaguar Plushie", "id": 258, "quantity": 0},
                           {"name":"Lion Plushie", "id": 281, "quantity": 0},
                           {"name":"Panda Plushie", "id": 274, "quantity": 0},
                           {"name":"Monkey Plushie", "id": 269, "quantity": 0},
                           {"name":"Chamois Plushie", "id": 273, "quantity": 0},
                           {"name":"Wolverine Plushie", "id": 261, "quantity": 0},
                           {"name":"Nessie Plushie", "id": 266, "quantity": 0},
                           {"name":"Red Fox Plushie", "id": 268, "quantity": 0},
                           {"name":"Camel Plushie", "id": 384, "quantity": 0},
                           {"name":"Kitten Plushie", "id": 215, "quantity": 0},
                           {"name":"Teddy Bear Plushie", "id": 187, "quantity": 0},
                           {"name":"Sheep Plushie", "id": 186, "quantity": 0},
                           {"name":"Stingray Plushie", "id": 618, "quantity": 0}];

    var coinsInSet = [{"name":"Leopard Coin",  "id": 450, "quantity": 0},
                       {"name":"Florin Coin",  "id": 451, "quantity": 0},
                       {"name":"Gold Noble Coin",  "id": 452, "quantity": 0}];

    var quransInSet = [{"name":"Quran Script : Ibn Masud",  "id": 455, "quantity": 0},
                       {"name":"Quran Script : Ubay Ibn Kab",  "id": 456, "quantity": 0},
                       {"name":"Quran Script : Ali",  "id": 457, "quantity": 0}];

    // TBD: sculptures, senets

    // Variables tracking # full sets
    var fullFlowerSets = 0;
    var fullPlushieSets = 0;
    var fullCoinsSets = 0;
    var fullQuranSets = 0;
    var fullSenetSets = 0;
    // ...

    // Misc other globals
    var pointsPriceUnitCost = 0;
    const pawnShopPays = 45000;

    // To calculate prices/profit/etc.
    //
    // Plushies and flowers - 10 points per set.
    // Medieval coins - 100 points
    // Vairocana Buddha - 100 pts
    // Ganesha Sculpture - 250 pts
    // Shabti Sculpture - 500 pts
    // Script's from the Quran - 1,000 pts
    // Senet Game - 2,000 pts
    // Egyptian Amulet - 10,000 pts.
    //
    // To get value of points, call "https://api.torn.com/market/?selections=pointsmarket&key="
    //
    // pointsmarket": {
	//	    "11154988": {
	//		"cost": 45550,    <== Use this for current (live) price info.
	//		"quantity": 4000,
	//		"total_cost": 182200000
	//	},
    var flowersPtsPerSet = 10;
    var plushiesPtsPerSet = 10;
    var coinPtsPerSet = 100;
    var VairocanaPtsPerSet = 100;
    var ganeshaPtsPerSet = 250;
    var shabtiPtsPerSet = 500;
    var quranPtsPerSet = 1000
    var senetPtsPerSet = 2000;
    var egyptianPtsPerSet = 10000;

    //////////////////////////////////////////////////////////////////////
    // Handle the response from querying the Torn API
    //////////////////////////////////////////////////////////////////////

    function marketQueryCB(responseText, ID, param) {
        console.log(GM_info.script.name + ' market query callback.');
        dataReceived = true;
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}

        let objEntries = Object.entries(jsonResp.pointsmarket);
        let firstPointTrade = Object.entries(objEntries[0][1]);
        pointsPriceUnitCost = firstPointTrade[0][1]; // Save globally
        console.log('Unit Price: ' + pointsPriceUnitCost);

        dataProcessed = true;
        if (pageLoaded && !pageModified) {modifyPage(true);} // else will call from handlePageLoaded()
    }

    //////////////////////////////////////////////////////////////////////
    // Handle page loaded event
    //////////////////////////////////////////////////////////////////////

    function handlePageLoaded() {
        xedx_TornMarketQuery(null, 'pointsmarket', marketQueryCB);
        removeTTBlock();
        pageLoaded = true;
        log('handlePageLoaded.');
        if (dataProcessed && !pageModified) {modifyPage(true);} // else will call from userQueryCB()/marketQueryCB()
        //if (!pageModified) {modifyPage(true);}
    }

    //////////////////////////////////////////////////////////////////////
    // Helpers for page modification
    //////////////////////////////////////////////////////////////////////

    // Helper to highlight proper LI's, and track item amounts
    function highlightList(liList, searchArray, color) {
        log('Highlighting items, <li> is ' + liList.length + ' item(s) long.');
        if (liList.length == 1) {
            console.log(GM_info.script.name + ' Re-calling modifyPage');
            pageModified = false;
            setTimeout(function() { modifyPage(false); }, 2000);
            return false;
        }
        for (var i = 0; i < liList.length; ++i) {
            searchArray.forEach((element, index, array) => {
                let qty = Number(liList[i].getAttribute('data-qty'));
                if (element.id == liList[i].getAttribute('data-item') && qty > 0) {
                    // Highlight & save quantity
                    liList[i].style.backgroundColor = color;
                    array[index].quantity = qty;
                    console.log(GM_info.script.name + ' Highlighted ' + element.name + "'s, count = " + qty);
                }
            });
        }
        return true;
    }

    // Builds a valid node element for inserting into the DOM
    function createElementFromHTML(htmlString) {
        var div = document.createElement('div');
        div.innerHTML = htmlString.trim();

        // Change this to div.childNodes to support multiple top-level nodes
        return div.firstChild;
        //return div.childNodes;
    }

    // Insert a node after a reference node
    function insertAfter(newNode, referenceNode) {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    }

    // Create a <li> with supplied item ID and name
    function buildNewLi(id, name) {
        // LI and DIVs to insert for set count, items needed, items required
        const newLi =
            '<li class="">' +
                '<div class="thumbnail-wrap" tabindex="0">' +
                    '<div class="thumbnail">' +
                        '<img class="torn-item item-plate" data-size="medium" src="/images/items/replaceID/large.png"' +
                            'style="opacity: 0;" data-converted="1" aria-hidden="true">' +
                        '<canvas role="img"style="opacity: 1;" width="60" height="30" class="torn-item item-plate item-converted" item-mode="true">' +
                        '</canvas>' +
                    '</div>' +
                '</div>' +
                '<div class="title-wrap">' +
                    '<div class="title left">' +
                        '<span class="image-wrap">' +
                            '<div class="thumbnail">' +
                                '<img src="/images/items/replaceID/large.png" width="60" height="30">' +
                            '</div>' +
                        '</span>' +
                        '<span class="name-wrap">'+
                            '<span class="qty bold d-hide"> x0</span>'+
                            '<span class="name">replaceName</span>'+
                            '<span class="qty bold t-hide"> x0</span>'+
                        '</span>'+
                    '</div>'+
                '</div>' +
                '<div class="cont-wrap">'+
                    '<div class="actions right">'+
                        '<ul class="actions-wrap">'+
                            '<li class="left"></li>'+
                            '<li class="left"></li>'+
                            '<li class="left"></li>'+
                            '<li class="left"></li>'+
                            '<li class="clear"></li>' +
                        '</ul>'+
                    '</div>'+
                '</div>' +
            '<div class="clear"></div>'+
            '</li>';
        let temp = newLi.replace(/replaceID/g, id);
        let temp2 = temp.replace(/replaceName/g, name);
        return temp2;
    }

    // Helper to add items which we don't own
    function addMissingItems(ulDiv, setArray) {
        log('Adding missing items.');
        let hdrNode = document.getElementById(xedxHdrID);
        if (validPointer(hdrNode)) {
            log('addMissingItems: header already present.');
            return;
        } // Means we've done this already.

        // Add a separator, header (and UL for new LI's)
        let mainItemsDiv = document.querySelector(mainItemsDivSelector);
        xedxSepNode = createElementFromHTML(sepDiv);
        xedxHdrNode = createElementFromHTML(requiredHdr);
        insertAfter(xedxSepNode, mainItemsDiv);
        insertAfter(xedxHdrNode.nextSibling, xedxSepNode);

        // Add LI's for each missing item - TBD
        log('Going to add ' + setArray.length + ' items.');
        for (let i = 0; i < setArray.length; i++) {
            let item = setArray[i];
            if (item.quantity == 0) {
                log('Adding ' + item.name + ' to required list.');
                let liStr = buildNewLi(item.id, item.name);
                let newNode = createElementFromHTML(liStr);
                newNode.style.backgroundColor = missingItemColor;
                let ulList = $('#xedx-required-items');
                ulList[0].appendChild(newNode);
            }
        }
    }

    // Header to display if we have full sets
    function displayFullSetHdr(count, pts) {
        log('displayFullSetHdr');
        let mainItemsDiv = document.querySelector(mainItemsDivSelector);
        xedxSepNode = createElementFromHTML(sepDiv);

        // '<span class="m-hide"> You have numberFullSets full sets. This can be traded in for ' +
        // ' numberFullPoints points, at priceOfPoints each, for totalPrice.</span>' +

        // This can be done in one shot?
        let fullSets = fullSetsHdr.replace('numberFullSets', count);
        let fullPts = fullSets.replace('numberFullPoints', count * pts);
        let ptsPrice = fullPts.replace('priceOfPoints', asCurrency(pointsPriceUnitCost));
        //log('displayFullSetHdr - points cost: "' + pointsPriceUnitCost + '"');
        let totalPrice = ptsPrice.replace('totalPrice', asCurrency(count * pts * pointsPriceUnitCost));
        let output = totalPrice.replace('pawnPrice', asCurrency(count * pts * pawnShopPays));

        xedxHdrNode = createElementFromHTML(output);
        insertAfter(xedxSepNode, mainItemsDiv);
        insertAfter(xedxHdrNode.nextSibling, xedxSepNode);
    }

    // Helper to remove above header(s) and items list
    function removeAdditionalItemsList() {
        // log('Removing extra node (removeAdditionalItemsList - ' + xedxHdrID + ') from page.');
        if (xedxSepNode) {xedxSepNode.remove();}
        let hdrNode = document.getElementById(xedxHdrID);
        if (hdrNode) {hdrNode.remove();}
    }

    function removeFullSetHdr() {
        // log('Removing extra node (removeFullSetHdr - ' + xedxFullSetHdr + ') from page.');
        if (xedxSepNode) {xedxSepNode.remove();}
        let hdrNode = document.getElementById(xedxFullSetHdr);
        if (hdrNode) {hdrNode.remove();}
    }

    // Remove TornTools additional items required div
    function removeTTBlock() {
        if (validPointer($('#tt-needed-flowers-div'))) {$('#tt-needed-flowers-div').remove();}
        if (validPointer($('#tt-needed-plushies-div'))) {$('#tt-needed-plushies-div').remove();}
    }

    // Helpers to turn on and off the observer
    function observeOff() {
        if (observing && pageObserver) {
            pageObserver.disconnect();
            console.log(GM_info.script.name + ' disconnected observer.');
            observing = false;
        }
    }

    function observeOn() {
        if (pageObserver) {
            pageObserver.observe(pageDiv, observerConfig);
            console.log(GM_info.script.name + ' observing page.');
            observing = true;
        }
    }

    // Helper to see how many complete sets we have of a given type.
    function countCompleteSets(itemArray) {
        var totalSets = 999999999;
        itemArray.forEach((element, index, array) => {
            let amt = element.quantity;
            if (!amt || amt == null) {totalSets = 0;} // Too bad we can't 'break' here, or 'return'.
            if (amt < totalSets) {totalSets = amt;}
        });
        return totalSets;
    }

    //////////////////////////////////////////////////////////////////////
    // Modify the page
    //////////////////////////////////////////////////////////////////////

    function modifyPage(enableObserver) {
        if (!enableObserver) {log(' detected page change.');}
        if (pageModified) {return;}
        //$('#xedx-fullset-hdr').remove();
        removeFullSetHdr();
        removeAdditionalItemsList();
        removeTTBlock();
        pageModified = true;
        log('modifying page.');

        // See what page we are on
        pageSpan = document.querySelector(pageSpanSelector);
        pageName = pageSpan.innerText;
        log("On page '" + pageName + "'");

        // Highlight items that are in sets, if on an artifact page, flower page or plushie page.
        // Iterate the item <lis>'s, highlight if in proper array of items that are in sets.
        observeOff();
        if (pageName == 'Flowers') {
            // Highlight set items and count complete sets
            let ulDiv = $('#flowers-items'); // Verify this...
            let liList = $('#flowers-items > li');
            if (!highlightList(liList, flowersInSet, flowerSetColor)) {return;}
            let fullFlowerSets = countCompleteSets(flowersInSet);
            console.log(GM_info.script.name + ": Complete flower sets: " + fullFlowerSets);
            sortUL($('#flowers-items > li'));

            // Add 'hints' - where to get items
            let hints = fillHints(liList, flowerHints);
            log('Added hints to ' + hints + ' items.');

            // Add LI's for missing items
            if (!fullFlowerSets) {
                removeFullSetHdr();
                addMissingItems(ulDiv, flowersInSet); // Verify this...
            } else {
                removeAdditionalItemsList();
                displayFullSetHdr(fullFlowerSets, flowersPtsPerSet);
            }

        } else if (pageName == 'Plushies') {
            // HIghlight set items and count complete sets
            let ulDiv = $('#plushies-items'); // Verify this...
            let liList = $('#plushies-items > li');
            if (!highlightList(liList, plushiesInSet, plushiesSetColor)) {return;}
            fullPlushieSets = countCompleteSets(plushiesInSet);
            log("Complete plushie sets: " + fullPlushieSets);
            sortUL($('#plushies-items > li'));

            // Add 'hints' - where to get items
            let hints = fillHints(liList, plushieHints);
            log('Added hints to ' + hints + ' items.');

            // Add LI's for missing items
            if (!fullPlushieSets) {
                removeFullSetHdr();
                addMissingItems(ulDiv, plushiesInSet);
            } else {
                removeAdditionalItemsList();
                displayFullSetHdr(fullPlushieSets, plushiesPtsPerSet);
            }
        } else if (pageName == 'Artifacts') {
            // TBD -
            //
            // Medieval coins - 100 points
            // Vairocana Buddha - 100 pts
            // Ganesha Sculpture - 250 pts
            // Shabti Sculpture - 500 pts
            // Script's from the Quran - 1,000 pts
            // Senet Game - 2,000 pts
            // Egyptian Amulet - 10,000 pts.

            // HIghlight set items and count complete sets
            let ulDiv = $('#artifacts-items'); // Verify this...
            let liList = $('#artifacts-items > li');

            if (!highlightList(liList, coinsInSet, coinSetSetColor)) {return;}
            fullCoinsSets = countCompleteSets(coinsInSet);
            log("Complete coin sets: " + fullCoinsSets);

            if (!highlightList(liList, quransInSet, quransSetSetColor)) {return;}
            fullQuranSets = countCompleteSets(quransInSet);
            log("Complete coin sets: " + fullQuranSets);

            sortUL($('#artifacts-items > li'));

            // Add LI's for missing items
            removeFullSetHdr();
            removeAdditionalItemsList();
            if (!fullCoinsSets || !fullQuranSets) {
                log("ulDiv", ulDiv);
                log("Adding missing items. " + JSON.stringify({fullCoinsSets, coinsInSet, fullQuranSets, quransInSet}));
                if (!fullCoinsSets) {addMissingItems(ulDiv, coinsInSet);}
                if (!fullQuranSets) {addMissingItems(ulDiv, quransInSet);}
            }
            if (fullCoinsSets || fullQuranSets) {
                log("ulDiv", ulDiv);
                log("Displaying full set header. " + JSON.stringify({fullCoinsSets, fullQuranSets}));
                if (fullCoinsSets) {displayFullSetHdr(fullCoinsSets, coinPtsPerSet);}
                if (fullQuranSets) {displayFullSetHdr(fullQuranSets, quranPtsPerSet);}
            }
        } else {
            removeAdditionalItemsList()
        }

        // Watch for active page changes.
        if (pageObserver == null) {
            pageDiv = document.querySelector(pageDivSelector);
            var callback = function(mutationsList, observer) {
                pageModified = false;
                modifyPage(false);
            };
            pageObserver = new MutationObserver(callback);
        }

        pageModified = false;
        observeOn();
    }

    // Sort the list, ascending, by qty. See 'https://github.com/Sjeiti/TinySort'
    function sortUL(ulDiv) {
        log('Sorting UL ' + ulDiv + ', length = ' + ulDiv.length);
        tinysort(ulDiv, {attr:'data-qty'});
        log('Sorted.');

    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    // Call the Torn API for inventory info. (why do we do this??
    //xedx_TornUserQuery(null, 'inventory', userQueryCB);

    // Call the Torn API for current point price. Seems to be off by a day-ish.
    xedx_TornMarketQuery(null, 'pointsmarket', marketQueryCB);

    removeTTBlock();

    // Set up a listener to fire on page load complete
    window.addEventListener("load", function(){
        handlePageLoaded();
    });

})();
