// ==UserScript==
// @name         Torn Halloween User List Helper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
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

    // Filters to hide what twe can't attack
    function isInHosp(li) {
        return (li.querySelector("[id^='icon15___']")) ? true : false;
    }
    function isFedded(li) {
        return (li.querySelector("[id^='icon70___']")) ? true : false;
    }
    function isFallen(li) {
        return (li.querySelector("[id^='icon77___']")) ? true : false;
    }
    function isTravelling(li) {
        return (li.querySelector("[id^='icon71___']")) ? true : false;
    }

    function preFilter(li) {
        if (isInHosp($(li)[0])) return true;
        if (isTravelling($(li)[0])) return true;
        if (isFedded($(li)[0])) return true;
        if (isFallen($(li)[0])) return true;

        return false;
    }

    function handlePageLoad() {
        let list = $("ul.user-info-list-wrap > li > div > a.user.name");
        if (!list.length) return setTimeout(handlePageLoad, 500);

        for (let idx=0; idx<list.length; idx++) {
            let node = list[idx];
            let li = $(node).parent().parent();
            if (!$(node).length) continue;
            let href = $(node).attr("href");
            if (!href) continue;
            if (preFilter(li) == true) {
                $(li).attr("style", "display: none;");
                continue;
            }

            let parts = href.split("=");
            let url = "https://www.torn.com/loader.php?sid=attack&user2ID=" + parts[1];
            $(node).attr("href", url);
            $($(node)[0]).on('click', function() {
                window.open(url, '_blank').focus();
                return false;
            });
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");
    versionCheck();

    callOnHashChange(handlePageLoad);
    installPushStateHandler(handlePageLoad);

    if (location.href.indexOf("UserList") < 0) return;

    callOnContentComplete(handlePageLoad);

})();