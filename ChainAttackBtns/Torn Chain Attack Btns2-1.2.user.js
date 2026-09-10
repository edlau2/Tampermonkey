// ==UserScript==
// @name         Torn Chain Attack Btns2
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    console.log(GM_info.script.name + " script starting");

    const bindEventListener = function (type) {
        const historyEvent = history[type];
        return function () {
            const newEvent = historyEvent.apply(this, arguments);
            const e = new Event(type);
            e.arguments = arguments;
            window.dispatchEvent(e);
            return newEvent;
        };
    };

    GM_addStyle(`.att-lnk { border: 1px solid green; } `);

    function handleClick(e) {
        let href = $(this).find("[class*='linkWrap']").attr("href");
        if (href) {
            e.stopPropagation();
            e.preventDefault();
            let id = href.split("=")[1];
            window.open(`page.php?sid=attack&user2ID=${id}`, "_newtab");
            return false;
        }
    }

    var updTimer = 0;
    function updateLinks() {
        updTimer = 0;
        $(".right-player [class*='honorWrap_']").each((x, el) => {
            if (!$(el).hasClass("att-lnk")) {
                $(el).addClass("att-lnk").on("click", handleClick);
            }
        });
        if (!updTimer)
            updTimer = setTimeout(updateLinks, 500);
    }

    function handlePageLoad(e) {
        if (location.href.indexOf("/war/chain") < 0)
            return console.log("Wrong page,,,");
        updateLinks();
    }

    // ======================== Main entry points ===============================

    window.addEventListener('hashchange', handlePageLoad);

    history.pushState = bindEventListener("pushState");
    window.addEventListener("pushState", handlePageLoad);

    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoad);
    } else {
        handlePageLoad();
    }

})();