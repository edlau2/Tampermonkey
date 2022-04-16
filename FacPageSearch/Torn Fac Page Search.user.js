// ==UserScript==
// @name         Torn Fac Page Search
// @namespace    http://tampermonkey.net/
// @version      0.1
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

    const searchDiv = `<div>
        <hr class="delimiter-999 m-top10">
        <div>
            <label for="search">Search:</label>
            <input type="text" id="search" name="search" class="ac-search m-top10 ui-autocomplete-input ac-focus">
        </div>
    </div>`;

    function addStyles() {
        GM_addStyle(`
            .xedx-search-span {margin-top: 10px;}
            .xedx-bdr {border: solid 2px red;}
            .xedx-green {background: lime;}
        `);
    }

    // Handle key presses in the search area -
    var currSearch = '', lastSearch = '';
    var lastElems = [];
    function handleSearchKeypress(e) {
        debug('[handleSearchKeypress] ==> ', e.key);
        let target = e.target;
        let facCtrls = document.querySelector("#faction-controls");

        if (e.type == 'keydown' && e.key != 'Backspace') return;
        if (e.type == 'keydown' && e.key == 'Backspace') {
            log('Backspace: last: ', lastSearch, ' curr: ', currSearch);
            lastElems.forEach(el => {$(el).removeClass('xedx-green');});
            lastElems.length = 0;
            facCtrls.querySelectorAll('[title^="' + currSearch + '"]').forEach((el) => {
                $(el).removeClass('xedx-green');
            });
            facCtrls.querySelectorAll('[title^="' + lastSearch + '"]').forEach((el) => {
                $(el).addClass('xedx-green');
                lastElems.push(el);
            });
            //lastSearch = ???
            currSearch = lastSearch;
            return;
        }

        lastSearch = $(target)[0].value;
        currSearch = $(target)[0].value + e.key;
        debug('Searching: ', currSearch);

        lastElems.forEach(el => {$(el).removeClass('xedx-green');});
        lastElems.length = 0;

        facCtrls.querySelectorAll('[title^="' + currSearch + '"]').forEach((el) => {
            $(el).addClass('xedx-green');
            lastElems.push(el);
        });

        if (e.keyCode == 13) { // If the user has pressed enter
            return false;
        }
        return true;
    }

    function handlePageLoad() {
        // https://www.torn.com/factions.php?step=your#/tab=controls
        let targetNode = document.querySelector("#factions > ul");
        if (!targetNode) return setTimeout(handlePageLoad, 50);
        $(targetNode).append(searchDiv);

        $("#search").on("keypress", handleSearchKeypress);
        $("#search").on("keydown", handleSearchKeypress);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    addStyles();

    // installHashChangeHandler(...)
    callOnContentLoaded(handlePageLoad);

})();
