// ==UserScript==
// @name         Torn Sort Weapons
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Sorts weapons on the Items page by various criteria
// @author       xedx [2100735]
// @include      https://www.torn.com/item.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle('.xedx-ctrls {' +
                    'margin: 10px;' +
                '}'
    );

    // Global variables
    debugLoggingEnabled = true; // Defined in helper lib.
    loggingEnabled = true; // Defined in helper lib.

    var dmgSel = null; // Selectors for sorting
    var accSel = null; // ...

    var autosort = false; // TRUE to auto sort on load
    var selID = 'xedx-1'; // What to sort by (1 = default, 2 = acc, 3 = dmg, 4 = Q, 5 = name)
    var lastSelID = 'xedx-1'; // Previous selection
    var lastSortOrder = 'Default';

    const sortOrder = {
        'xedx-0': 'none',
        'xedx-1': 'Default',
        'xedx-2': 'Accuracy',
        'xedx-3': 'Damage',
        'xedx-4': 'Total',
        'xedx-5': 'Name',
    };

    // Selector names.
    const pageSpanSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black > span.items-name";
    const pageDivSelector = "#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.items-wrap.primary-items > div.title-black";

    // Page/observer stuff
    var pageName = ''; // Items page we are on
    var pageDiv = null; // Mis-named selector for items page div.
    var pageObserver = null; // Mutation observer for the page
    var observing = false; // Observer is active
    const observerConfig = { attributes: true, characterData: true, subtree: true, childList: true };

    //////////////////////////////////////////////////////////////////////
    //
    // Called once page is fully loaded
    //
    //////////////////////////////////////////////////////////////////////

    function handlePageLoad() {
        log('handlePageLoaded.');
        installUI();

        if (pageObserver == null) { // Watch for active page changes.
            pageDiv = document.querySelector(pageDivSelector);
            var callback = function(mutationsList, observer) {
                log('Observer triggered - page change!');
                lastSortOrder = 'Default';
                sortPage(true);
            };
            pageObserver = new MutationObserver(callback);
            observeOn();
        }

        sortPage();
    }

    //////////////////////////////////////////////////////////////////////
    //
    // Function to sort the page
    //
    //////////////////////////////////////////////////////////////////////

    function sortPage(pageChange = false) {
        let lastPage = pageName;
        pageName = getPageName();
        log('sortPage: pageName = "' + pageName + '" pageChange = "' + pageChange + '"');
        if ((lastPage != '') && (pageName.indexOf(lastPage) == -1) && (pageChange == false)) {
            log('Went from page "' + lastPage + '" to "' + pageName +'"');
        } else if (pageChange) {
            log('pageChange (observer): "' + lastPage + '" --> "' + pageName + '"');
        } else {
            log('pageChange: "' + lastPage + '" --> "' + pageName + '"');
        }
        log('Observing = ' + observing);

        // Hide/show UI as appropriate
        let itemUL = null;
        if (pageName == 'Primary') {
            enableSortDiv();
            itemUL = $("#primary-items")[0];
        } else if (pageName == 'Secondary') {
            enableSortDiv();
            itemUL = $("#secondary-items")[0];
        } else if (pageName == 'Melee') {
            enableSortDiv();
            itemUL = $("#melee-items")[0];
        } else {
            enableSortDiv(false);
            return; // Not on a weapons page, go home.
        }

        // If not sorting, bail
        log('sortPage: Auto Sort is ' + (autosort ? 'ON' : 'OFF'));
        if (!autosort) {
            log('Auto Sort not on, going home.');
            return;
        }

        // Make sure fully loaded.
        let items = itemUL.getElementsByTagName("li");
        let itemLen = items.length;
        log(pageName + ' Items length: ' + itemUL.getElementsByTagName("li").length);
        if (itemLen <= 1) { // Not fully loaded: come back later
            return setTimeout(function(){ sortPage(true); }, 500);
        }

        let sorted = false, sortSel = null;
        if (lastSortOrder == sortOrder[selID]) return;
        lastSortOrder = sortOrder[selID];

        observeOff(); // Don't call ourselves while sorting.
        setSumTotal(itemUL); // Create the 'totalStats' attr.
        
        debug('Preparing to sort by ' + sortOrder[selID]);

        let order = 'desc';
        let attr = '';
        switch (sortOrder[selID]) {
            case 'Default':
                location.reload();
                observeON();
                return;
            case 'Accuracy':
                setSelectors(itemUL);
                sorted = true;
                sortSel = accSel;
                break;
            case 'Damage':
                setSelectors(itemUL);
                sorted = true;
                sortSel = dmgSel;
                break;
            case 'Total':
                attr = 'totalStats';
                sorted = true;
                break;
            case 'Name':
                sorted = true;
                order = 'asc';
                sortSel = "div.title-wrap > div > span.name-wrap > span.name";
                break;
            default:
                break;
        }

        if (!sorted) {
            log('Not sorting by ' + sortOrder[selID]);
        } else {
            log('Sorting by ' + sortOrder[selID]);
            log('selector = "' + sortSel + '" attr = "' + attr + '"');
            let matches = itemUL.querySelectorAll("li[data-weaponinfo='1']");
            if (attr) {
                tinysort(matches, {attr: attr, order: order});
            } else {
                tinysort(matches, {selector: sortSel, order: order});
            }
        }

        observeOn();
    }

    //////////////////////////////////////////////////////////////////////
    //
    // Find each pertinent li, meaning which child it is. It *may*
    // vary, for example, if my WE script is installed, and WE hasn't
    // yet gotten here yet. So need to check each time, but only on first weapon.
    // We need this number, which 'nth' child:
    // document.querySelector(div.cont-wrap > div.bonuses.left > ul > li:nth-child(2) > span")
    //
    //////////////////////////////////////////////////////////////////////

    function setSelectors(itemUL) {
        debug('setSelectors ==>');
        let firstItemSel = itemUL.querySelector("li.bg-green");
        if (!firstItemSel) firstItemSel = itemUL.querySelectorAll("li.t-first-in-row")[0];
        console.log(GM_info.script.name + 'setSelectors: firstItemSel = ', firstItemSel);
        let liList = firstItemSel.querySelectorAll("div.cont-wrap > div.bonuses.left > ul > li");
        console.log(GM_info.script.name + 'setSelectors: liList = ', liList);
        for (let i=0; i<liList.length; i++) {
            let iSel = liList[i].querySelector('i');
            if (!iSel) continue;
            if (iSel.classList[0].indexOf('damage') > -1) {
                dmgSel = "div.cont-wrap > div.bonuses.left > ul > li:nth-child(" + (i+1) + ") > span";
            }
            if (iSel.classList[0].indexOf('accuracy') > -1) {
                accSel = "div.cont-wrap > div.bonuses.left > ul > li:nth-child(" + (i+1) + ") > span";
            }
        }
        log('<== setSelectors');
    }

    // Summ acc and dmg to sort by sum total
    function setSumTotal(itemUL) {
        debug('setSumTotal ==>');
        let items = itemUL.children;
        for (let j = 0; j < items.length; j++) {
            let dmg = 0, acc = 0;
            let liList = items[j].querySelectorAll("div.cont-wrap > div.bonuses.left > ul > li");
            for (let i=0; i<liList.length; i++) {
                let iSel = liList[i].querySelector('i');
                if (!iSel) continue;
                if (iSel.classList[0].indexOf('damage') > -1) {
                    dmgSel = "div.cont-wrap > div.bonuses.left > ul > li:nth-child(" + (i+1) + ") > span";
                    dmg = Number(items[j].querySelector(dmgSel).innerText);
                }
                if (iSel.classList[0].indexOf('accuracy') > -1) {
                    accSel = "div.cont-wrap > div.bonuses.left > ul > li:nth-child(" + (i+1) + ") > span";
                    acc = Number(items[j].querySelector(accSel).innerText);
                }
            }
            if (dmg && acc) items[j].setAttribute('totalStats', (dmg + acc));
        }
        log('<== setSumTotal');
    }

    //////////////////////////////////////////////////////////////////////
    //
    // Install the sort options div, hidden if not on a weapons page.
    //
    //////////////////////////////////////////////////////////////////////

    function installUI() {
        let parent = document.querySelector("#mainContainer > div.content-wrapper > div.main-items-cont-wrap > div.equipped-items-wrap");
        if (!parent) return setTimeout(installUI, 50);
        if (!document.querySelector("xedx-weapon-sort")) {
            $(optionsDiv).insertAfter(parent);
        }

        // Install handlers and default states
        let ckBox = document.querySelector("#autosort");
        if (!ckBox) return setTimeout(installUI, 50);

        autosort = GM_getValue('checkbox', autosort);
        ckBox.checked = autosort;
        ckBox.addEventListener("click", onCheckboxClicked);

        selID = GM_getValue('selectedBtn', selID);
        let btn = document.querySelector("#" + selID); // querySelector("#\\3" + selID);
        btn.checked = true;
        btn.click();
        GM_setValue('selectedBtn', selID);
        $('input[type="radio"]').on('click change', onRadioClicked);
    }

    //////////////////////////////////////////////////////////////////////
    // Helpers
    //////////////////////////////////////////////////////////////////////

    // Turn on/off sort option div.
    function enableSortDiv(enable=true) {
        let sortSel = document.querySelector("#xedx-weapon-sort");
        log('enableSortDiv enable = ' + enable + ' selector: ' + sortSel);
        if (sortSel) sortSel.setAttribute('style', 'display: ' + (enable ? 'block' : 'none'));
    }

    // Handle the sort type radio buttons
    function onRadioClicked(e) {
        lastSelID = selID;
        selID = document.querySelector('input[name="sortopts"]:checked').value;
        if (lastSelID == selID) return;
        log('Radio Button Selected: ' + selID);
        GM_setValue('selectedBtn', selID);
        log('onRadioClicked: Sorting page by ' + sortOrder[selID]);
        sortPage();
    }

    // Handle the "Auto Sort" checkbox
    function onCheckboxClicked() {
        let ckBox = document.querySelector("#autosort");
        GM_setValue('checkbox', ckBox.checked);
        autosort = ckBox.checked;
        log('onCheckboxClicked: Auto Sort is ' + (autosort ? 'ON' : 'OFF'));
    }

    // Returns the page name of current page
    function getPageName() {
        let pageSpan = document.querySelector(pageSpanSelector);
        let pageName = pageSpan.innerText;
        log("On page '" + pageName + "'");
        return pageName;
    }

    // Helpers to turn on and off the observer
    function observeOff() {
        log('disconnecting observer.');
        if (observing && pageObserver) {
            log('disconnected observer.');
            pageObserver.disconnect();
            observing = false;
        }
    }

    function observeOn() {
        if (pageObserver) {
            pageObserver.observe(pageDiv, observerConfig);
            log('observing page.');
            observing = true;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart(); // Logs even if logging disabled.
    versionCheck();

    // Need to wait for full page load.
    if (document.readyState === 'complete') {
        handlePageLoad();
    } else {
        window.onload = function(e){handlePageLoad();}
    }

     var optionsDiv =
        '<hr class="page-head-delimiter m-top10 m-bottom10">' +
        '<div class="t-blue-cont h" id="xedx-weapon-sort" style="display: none;">' +
              '<div id="xedx-content-div" class="cont-gray border-round" style="height: auto; overflow: auto;">' +
                  '<div style="text-align: center">' +
                      '<span class="xedx-main">' +
                          '<div>' +
                              '<input class="xedx-ctrls" type="checkbox" id="autosort" name="autosort" value="autosort">' +
                              '<label for="confirm">Auto Sort?</label>'+
                              '<input class="xedx-ctrls" type="radio" id="xedx-1" class="xedx-oneclick" name="sortopts" data="Default" value="xedx-1">' +
                                  '<label for="xedx-1">Default</label>' +
                              '<input class="xedx-ctrls" type="radio" id="xedx-2" class="xedx-oneclick" name="sortopts" data="Accuracy" value="xedx-2">' +
                                  '<label for="xedx-2">Accuracy</label>' +
                              '<input class="xedx-ctrls" type="radio" id="xedx-3" class="xedx-oneclick" name="sortopts" data="Damage" value="xedx-3">' +
                                  '<label for="xedx-3">Damage</label>' +
                              '<input class="xedx-ctrls" type="radio" id="xedx-4" class="xedx-oneclick" name="sortopts" data="Total" value="xedx-4">' +
                                  '<label for="xedx-4">Total</label>'+
                              '<input class="xedx-ctrls" type="radio" id="xedx-5" class="xedx-oneclick" name="sortopts" data="Name" value="xedx-5">' +
                                  '<label for="xedx-5">Name</label>'+
                          '</div>'+
                      '</span>' +
                  '</div>' +
              '</div>' +
          '</div>';


})();
