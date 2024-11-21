// ==UserScript==
// @name         Torn Pickpocketing aid
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php*
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

    const checkSecs = 2; // Seconds between checking for cops...

    var notifyOpen = false;

    function onNotifyDone() {notifyOpen = false;}
    function onNotifyClick() {window.focus(); notifyOpen = false;}

    function doBrowserNotify() {
        if (notifyOpen == true) return;
        notifyOpen = true;
        let msgText = "There's a policeman walking around waiting to be robbed!";

        GM_notification ({
            title: 'Pickpocketing',
            text: msgText,
            tag: xedx,
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: 45000,
            onclick: onNotifyClick,
            ondone: onNotifyDone
        });
    }

    function hashChangeHandler() {
        handlePageLoad();
    }

    function checkMarks() {
        let divList = $("[class^='titleAndProps_'] > div");
        logt("divList, marks: ", $(divList).length);

        $(divList).each(function(index, element) {
            let name = $(this).text();
            if (name && name.indexOf("Police") > -1)
                doBrowserNotify();
            log("Elem ", index, " name: ", $(this).text());
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