// ==UserScript==
// @name         Torn Safe Fac Newsies, PDA
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Try to prevent sending newsies accidentally
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';
    const newsieRootId = "react-root-faction-newsletter";
    const newsieRootSel = "#" + newsieRootId;

    var retries = 0;
    function handlePageLoad() {
        // Make sure we're on the newsletter page...
        let thisHref = window.location.href;
        let rootNode  = document.querySelector(newsieRootSel);


        if (thisHref.indexOf("newsletter") < 0) {
            return console.log("Torn Safe Fac Newsies: Wrong page, not writing a newsletter: ", thisHref);
        }

        // Have to wait for entire page to complete.
        if (!rootNode) {
            if (retries++ > 20) return console.log("Torn Safe Fac Newsies: too many retries, giving up.");
            return setTimeout(handlePageLoad, 250);
        }

        retries = 0;
        let funkySel = "div[class^='editorRoot_'] > div[class^='toolbarWrapper_'] > div[class^='actionButtonsWrapper_'] > button";
        let sendBtn = document.querySelector(funkySel);
        if (!sendBtn) {
            if (retries++ > 20) return console.log("Torn Safe Fac Newsies: too many retries, giving up.");
            return setTimeout(handlePageLoad, 250);
        }

        sendBtn.addEventListener('click', interceptSend);

        // Indicate with border color change we are safe
        sendBtn.style.border =  "1px solid green";
    }

    function interceptSend(event) {
        console.log("Torn Safe Fac Newsies: intercepting send");
        if (confirm("Are you sure?")) {
            console.log("Torn Safe Fac Newsies: Sending!");
            return true; // Left for JQuery handling...
        } else {
            console.log("Torn Safe Fac Newsies: Not Sending!!!");
            event.preventDefault();
            event.stopPropagation();
        }

        return false;
    }

    if (document.readyState == 'complete') {
        handlePageLoad();
    } else {
        document.addEventListener('readystatechange',
            event => {if (document.readyState == 'complete') handlePageLoad();});
    }

})();