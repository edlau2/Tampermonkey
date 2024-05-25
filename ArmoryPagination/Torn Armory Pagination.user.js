// ==UserScript==
// @name         Torn Armory Pagination
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Copy paginator to top of armory pages.
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
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

    const maxRetries = 5;
    let retries = 0;

    function hashChangeHandler() {
        log("hashChangeHandler");
        setTimeout(handlePageLoad, 250);
    }

    function handlePageLoad() {
        if (document.querySelector("#xedx-pgn"))
        {
            log("Paginator already present - will replace");
            $("#xedx-pgn").remove();
        }

        let currURL = window.location.href;
        log("Location: ", currURL);
        if (currURL.indexOf("armoury") < 0)
        {
            log("Not in the armory!");
            return;
        }

        // May take a while when the hash changes for the paginator
        // to appear, try a few times...
        let paginator = $(".pagination-wrap");
        if (!paginator.length)
        {
            log("Didn't find paginator!");
            if (retries < maxRetries)
            {
                retries++;
                setTimeout(handlePageLoad, 500);
                return;
            }
            retries = 0;
            return;
        }
        retries = 0;

        let topRow = $("#faction-armoury-tabs > ul");
        if (!topRow.length)
        {
            log("Unable to find top row!");
            return;
        }

        // Clone the node with attributes. Unfortunately, the
        // event isteners will not be cloned. So, for each child with
        // a class of ".page-number", add a click handler that clicks
        // it's corresponding real node....
        let newPaginator = $($(paginator)).clone(true);
        $(newPaginator).attr("ID", "xedx-pgn");
        cloneEventListeners(paginator, newPaginator);

        $(topRow).after(newPaginator);
    }

    function cloneEventListeners(paginator, newPaginator) {
        let orgPages = $(paginator).find(".page-number");
        let newPages = $(newPaginator).find(".page-number");

        for (let i=0; i<orgPages.length; i++)
        {
            let nodeID = "xedx-pg-" + i;
            $(orgPages[i]).attr("ID", nodeID);
            $(newPages[i]).removeAttr("ID");
            log("Removed ID from ", $(newPages[i]));
            $(newPages[i]).on('click', {nodeID: nodeID}, clickHandler);
        }
    }

    function clickHandler(event) {
        log("onClick, nodeID: ", event.data.nodeID);
        let fullID = "#" + event.data.nodeID;
        $(fullID).click();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    //versionCheck();

    callOnContentComplete(handlePageLoad);
    callOnHashChange(hashChangeHandler);

})();