// ==UserScript==
// @name         Torn Revivable Fac Members
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  This script sees who has revives on, in any fac.
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
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
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    var profilesList;

    function hashChangeHandler() {
        log("Hash change: ", location.hash);
        handlePageLoad();
    }

    function pushStateChanged(e) {
        log("pushStateChanged: ", e);
        handlePageLoad();
    }

    var revivableMembers = 0;
    var requests = 0;
    var processed = 0;
    function userQueryCb(responseText, id, idx) {
        let jsonResp;
        processed++;
        debug("Processing resp ", processed, " for id: ", id, " idx ", idx, ", ", requests, " reqs submitted (of ", $(profilesList).length, ").");
        if (!responseText) return log("ERROR: Missing query response!");

        try {
           jsonResp = JSON.parse(responseText);
        }
        catch (err) {
            log("ERROR: invalid JSON! ", responseText, " err: ", err);
            return handleApiComplete();
        }

        debug("Query result, id: ", id, " idx: ", idx, " JSON: ", jsonResp);
        let revivable = jsonResp.revivable;
        debug("member ", id, " is ", (revivable ? "REVIVABLE" : "NOT revivable"));

        if (jsonResp.error) {
            let msg = "Error: " + jsonResp.error.error + " (code " +
                jsonResp.error.code + ") response # " + processed +
                " requests: " + requests;
            console.error("JSON resp error: ", jsonResp);
            logt(msg);
            //alert(msg);
            return;
        }

        if (revivable != 0 && revivable != 1)
            debugger;

        let member = profilesList[idx];
        let li = $(member).closest("li");

        if (revivable) {
            log("member ", id, " is REVIVABLE! resp: ", jsonResp);
            revivableMembers++;
            $(li).addClass('xlibgg');
            $(li).addClass('x-can-revive');
        } else {
            //$(li).addClass('xbred');
        }

        if (processed == $(profilesList).length) {
            log("Processed ", processed, " members, found ", revivableMembers, " revivable");
        }
    }

    // callback(response.responseText, ID, param);
    function getReviveForMember(id, idx) {
        requests++;
        xedx_TornUserQuery(id, 'profile', userQueryCb, idx);
    }

    function iterateFacList(idx = 0) {
        if (!profilesList) return log("ERROR: No profile list!!");

        let listLen = $(profilesList).length;
        let count = 0;
        for (idx; idx < listLen; idx++) {
            let memberNode = $(profilesList)[idx];
            let href = $(memberNode).attr("href");
            if (!href) continue;

            let id = xidFromProfileURL(href);
            debug("member: ", $(memberNode), " href: ", href, " ID: ", id);

            getReviveForMember(id, idx);
            count++;

            // Every 10 API calls, sleep for 9 secs if need to do over 75 calls.
            // 100 calls, 90 secs, allowed 100 every 60 secs.
            if (listLen > 50) {
                if (count == 10) return setTimeout(iterateFacList, 9000, (idx+1));
            }
        }

        logt("Finished iterating fac members");
    }

    function getFacMembers(retries=0) {
        if (!$(profilesList).length) {
            profilesList = $("[class*='honorWrap_'] > a");
            if (!$(profilesList).length) {
                if (retries++ > 30) return log("Too many retries, going home.");
                return setTimeout(getFacMembers, 250, retries);
            }
        }

        logt("Starting iteration of fac members");
        revivableMembers = 0;
        requests = 0;
        processed = 0;
        iterateFacList();
    }

    function handlePageLoad() {
        // tab=info
        let okToCheck = false;
        if (location.hash && location.hash.indexOf("tab=info") > 0) okToCheck = true;
        if (location.href.indexOf('step=profile') > 0) okToCheck = true;
        if (okToCheck == false) {
            return log("Not on fac info page...");
        }

        getFacMembers();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    addBorderStyles();
    GM_addStyle(`.x-can-revive { background-color: rgba(108,195,21,.07);}
                 .xlibgg {border: 1px solid limegreen; border-bottom: 1px solid limegreen !important;`);

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);

})();