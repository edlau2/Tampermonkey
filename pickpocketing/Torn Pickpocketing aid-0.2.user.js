// ==UserScript==
// @name         Torn Pickpocketing aid
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  This script notifies if a given pick-pocketing target shows up.
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @grant        GM_addStyle
// @grant        GM_notification
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

    // ================== These variables can be edited =========================

    // Target to look for. Case insensitive. Will do partial match, so
    // "police" will match "Police officer". Can set to "man" to convince yourself
    // it's working...
    const target = "man";

    // Seconds for notificationto timeout.
    // Won't display another until this one goes away...
    const timeoutSecs = 30;

    // Seconds between checking for target
    const checkSecs = 2;

    debugLoggingEnabled = false;

    // ======================= Nothing useful beyond here =========================

    var notifyOpen = false;

    function onNotifyDone() {notifyOpen = false;}
    function onNotifyClick() {window.focus(); notifyOpen = false;}

    GM_addStyle(".xcbgb {border: 1px solid green;}");

    function doBrowserNotify(name) {
        if (notifyOpen == true) return;
        notifyOpen = true;
        let msgText = "There's a " + name + " begging to be pick-pocketed!";

        GM_notification ({
            title: 'Pickpocketing',
            text: msgText,
            tag: "xedx",
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: timeoutSecs * 1000,
            onclick: onNotifyClick,
            ondone: onNotifyDone
        });
    }

    function hashChangeHandler() {
        handlePageLoad();
    }

    function checkMarks() {
        let divList = $("[class^='titleAndProps_'] > div");
        //logt("divList, marks: ", $(divList).length);

        $(divList).each(function(index, element) {
            let name = $(this).text();
            if (name && name.trim().toLowerCase().indexOf(target.trim().toLowerCase()) > -1) {
                $(this).parent().parent().parent().addClass("xcbgb");
                doBrowserNotify(name);
            }

            debug("Elem ", index, " name: '", name.trim().toLowerCase(), "' target: '", target.trim().toLowerCase(), "'");
        });

        setTimeout(checkMarks, checkSecs * 1000);
    }

    function handlePageLoad() {
        if (location.hash.indexOf("pickpocketing") < 0)
            return log("Not on a pickpocketing crime!");

        checkMarks();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(handlePageLoad);

    callOnContentLoaded(handlePageLoad);

})();