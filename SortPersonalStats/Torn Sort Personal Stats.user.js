// ==UserScript==
// @name         Torn Sort Personal Stats
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Sort selectable stats on the Persoanl Stats page.
// @author       xedx [2100735]
// @include      https://www.torn.com/personalstats.php*
// @connect      api.torn.com
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

    var autoSort = true;
    var targetNode = null;
    var observer = null;
    const config = { attributes: false, childList: true, subtree: true };

    GM_addStyle('.xedx-sort {margin-left: 2px;}');

    function onCheckboxClicked() {
        let ckBox = document.querySelector("#autoSort");
        GM_setValue('autoSort', ckBox.checked);
        autoSort = ckBox.checked;
    }

    function installUI() {
        const titleSel = document.querySelector("#chartSection > div.title___IDdOX");
        console.log('installUI: ', titleSel);
        $(titleSel).after('<div class="selectUsersCont___bxLyQ">' +
                              '<input class="xedx-sort" type="checkbox" id="autoSort" name="sort" value="sort" checked>' +
                              '<label for="sort" style="margin-left:10px;">Sort?</label>'+
                           '</div>');
        let ckBox = document.querySelector("#autoSort");
        if (!ckBox) return setTimeout(installUI, 50);
        ckBox.addEventListener("click", onCheckboxClicked);
        autoSort = GM_getValue('autoSort', autoSort);
        ckBox.checked = autoSort;
    }

    function installObserver() {
        targetNode = document.querySelector("#chartSection > div.content___nl0g8.chartContent___N7vZX > div.dropDowns___WV180");
        if (!observer) observer = new MutationObserver(sortDropdowns);
        observer.observe(targetNode, config);
    }

    function sortDropdowns() {
        if (observer) observer.disconnect();
        const listItems = document.querySelector("#chartSection > div.content___nl0g8.chartContent___N7vZX > div.dropDowns___WV180 > ul").children;
        const listArray = Array.from(listItems);
        if (listArray.length == 0) return setTimeout(sortDropdowns, 50);
        listArray.forEach((item) => {
            let sortableList = item.querySelectorAll("div > div > ul > li");
            if (sortableList.length == 0) setTimeout(sortDropdowns, 50);
            tinysort(sortableList);
            log('Dropdown sorted.');
        });
        if (observer) observer.observe(targetNode, config);
    }

    function handlePageLoaded() {
        installUI();
        installObserver();
        if (autoSort) sortDropdowns();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    document.onreadystatechange = function () {
      if (document.readyState === 'complete') {
        handlePageLoaded();
      }
    };

})();