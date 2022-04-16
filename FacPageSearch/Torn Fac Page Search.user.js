// ==UserScript==
// @name         Torn Fac Page Search
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add custom search bar to fac pages
// @author       xedx [2100735]
// @include      https://www.torn.com/factions.php?step=your*
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

    const searchDiv = `<div id="xedx-search">
        <hr class="delimiter-999 m-top10">
        <div>
            <label for="search">Search:</label>
            <input type="text" id="search" name="search" class="ac-search m-top10 ui-autocomplete-input ac-focus">
        </div>
    </div>`;

    function addStyles() {
        GM_addStyle(`
            .xedx-bdr {border: solid 1px red;}
            .xedx-green {background: lime;}
        `);
    }

    // Handle key presses in the search area -
    var currSearch = '', lastSearch = '';
    var lastElems = [];
    function handleSearchKeypress(e) {
        debug('[handleSearchKeypress] ==> ', e.key);
        let target = e.target;
        let searchNode = document.querySelector("#faction-controls");

        // Special case, handled on keydown and backspace.
        if (e.type == 'keydown') {
            if (e.key == 'Backspace') {
                log('Backspace: last: ', lastSearch, ' curr: ', currSearch);
                lastElems.forEach(el => {$(el).removeClass('xedx-green');});
                searchNode.querySelectorAll('[title^="' + currSearch + '"]').forEach((el) => {
                    $(el).removeClass('xedx-green');
                });
                searchNode.querySelectorAll('[title^="' + lastSearch + '"]').forEach((el) => {
                    $(el).addClass('xedx-green');
                    lastElems.push(el);
                });
                let temp = lastSearch.slice(0, -1);
                currSearch = lastSearch;
                lastSearch = temp;
            }
            return;
        }

        lastSearch = $(target)[0].value;
        currSearch = $(target)[0].value + e.key;

        // Remove previous highlights
        lastElems.forEach(el => {$(el).removeClass('xedx-green');});
        lastElems.length = 0;

        // Add new ones
        searchNode.querySelectorAll('[title^="' + currSearch + '"]').forEach((el) => {
            $(el).addClass('xedx-green');
            lastElems.push(el);
        });
    }

    function installUI() {
        log('[installUI]');
        $("#xedx-search").remove();
        let targetNode = document.querySelector("#factions > ul");

        if (document.querySelector('#option-give-to-user') || document.querySelector('#option-pay-day')) {
            log('[installUI] inserting search div');
            $(targetNode).append(searchDiv);

            $("#search").on("keypress", handleSearchKeypress);
            $("#search").on("keydown", handleSearchKeypress); // For backspace only
        } else {
            //setTimeout(installUI, 500);
        }
    }

    // Called when the URL hash changes
    function handleHashChange() {
        $("#xedx-search").remove();
        if (location.hash.indexOf('give-to-user') > -1 ||
            location.hash.indexOf('pay-day') > -1) {
            installUI()
        }
    }

    // Called on document load complete
    function handlePageLoad() {
        let targetNode = document.querySelector("#factions > ul");
        if (!targetNode) return setTimeout(handlePageLoad, 50);
        installUI();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    addStyles();

    installHashChangeHandler(handleHashChange);
    callOnContentComplete(handlePageLoad);

})();
