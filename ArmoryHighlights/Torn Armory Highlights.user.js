// ==UserScript==
// @name         Torn Armory Highlights
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  This script highlights Revits and Warlords in the fac armory
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @run-at       document-end
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    function log(...data) {console.log(GM_info.script.name + ': ', ...data);}
    function handleHashChange() {setTimeout(getItemList, 250);}

    console.log(GM_info.script.name + ' version ' +
        GM_info.script.version + ' script started');

    window.addEventListener('hashchange', handleHashChange);

    function checkPageParams() {
        let params = new URLSearchParams(location.search);
        if (params.get('step') != 'your') return log("Not your armory page!");
        let params2 = location.hash ? new URLSearchParams(location.hash.replace("#/", "?")) : {};
        if (params2.get('sub') != 'weapons') return log("Not on weapons page!");
        return true;
    }

    GM_addStyle(`
            .xrevit {
                background-color: rgba(0,195,0,.07);
            }
            .xwarlord {
                background-color: rgba(195,0,0,.07);
            }
        `);

    getItemList();

    function getItemList(retries=0) {
        if (checkPageParams() != true) return log("Going home.");
        let list = $("#armoury-weapons > ul.item-list");
        if (!$(list).length) {
            if (retries++ < 40) return setTimeout(getItemList, 500, retries);
            return log("Couldn't find item list!");
        }

        $(".bonus-attachment-warlord").closest('ul').closest('li').addClass("xwarlord");
        $(".bonus-attachment-revitalize").closest('ul').closest('li').addClass("xrevit");
    }

})();