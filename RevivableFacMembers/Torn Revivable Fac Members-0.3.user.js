// ==UserScript==
// @name         Torn Revivable Fac Members
// @namespace    http://tampermonkey.net/
// @version      0.3
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

    const emptyRevIconDiv = `<div class="table-cell xrev"></div>`;
    const revIconLi = `<li class="xrevive-icon"><span class="xrevive-icon"></span></li>`;
    const revIconDiv = `<div class="table-cell xrev">
                            <li class="x-rev-wrap"></span><span class="xrevive-icon"></span></li>
                        </div>`;
    var profilesList;

    function hashChangeHandler() {
        log("Hash change: ", location.hash);
        handlePageLoad();
    }

    function pushStateChanged(e) {
        log("pushStateChanged: ", e);
        handlePageLoad();
    }

    function setReviveStatus(li, id, revivable) {
        let iconTray = $(li).find("#iconTray");
        let revDiv = $(li).find("div.table-cell.xrev");

        if (revivable) {
            debug("member ", id, " is REVIVABLE!");
            revivableMembers++;
        }

        if (!$(revDiv).length) {
            revivable ? $(iconTray).parent().after($(revIconDiv)) : $(iconTray).parent().after($(emptyRevIconDiv));
            return;
        }

        if (revivable) {
            //$(li).addClass('xlibgg x-can-revive');
            $(revDiv).replaceWith($(revIconDiv));
        } else {
            $(revDiv).replaceWith($(emptyRevIconDiv));
        }
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
            return;
        }

        let member = profilesList[idx];
        let li = $(member).closest("li");

        setReviveStatus(li, id, revivable);

        if (processed == $(profilesList).length) {
            debug("Processed ", processed, " members, found ", revivableMembers, " revivable");
        }
    }

    function editUserTable() {
        let icons = $(".member-icons");
        for (let idx=0; idx < $(icons).length; idx++) {
            let iconNode = $(icons)[idx];
            $(iconNode).after($(emptyRevIconDiv));
        }
    }

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

        // Repeat in a few minutes in case this page is being left open
        setTimeout(getFacMembers, 60000);
    }

    function getFacMembers(retries=0) {
        if (!$(profilesList).length) {
            profilesList = $("[class*='honorWrap_'] > a");
            if (!$(profilesList).length) {
                if (retries++ > 30) return log("Too many retries, going home.");
                return setTimeout(getFacMembers, 250, retries);
            }
            editUserTable();
        }

        logt("Starting iteration of fac members");
        revivableMembers = 0;
        requests = 0;
        processed = 0;
        iterateFacList();
    }

    function handlePageLoad() {
        let okToCheck = false;
        if (location.hash && location.hash.indexOf("tab=info") > 0) okToCheck = true;
        if (location.href.indexOf('step=profile') > 0) okToCheck = true;
        if (okToCheck == false) {
            return log("Not on fac info page...");
        }

        editUserTable();
        getFacMembers();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);

    // ==================== Styles used ==========================

    function addStyles() {

    addBorderStyles();
        GM_addStyle(`
            .x-rev-wrap {
                display: flex;
                flex-direction: row;
                justify-content: flex-end;
            }
            .x-can-revive {
                background-color: rgba(108,195,21,.07);
            }
            .xlibgg {
                border: 1px solid limegreen;
                border-bottom: 1px solid limegreen !important;
            }
            .xrev {
                justify-content: center;
                width: 4%;
            }
            .xrevive-icon {
                display: inline-block;
                height: 18px;
                width: 20px;
                background: url(/images/v2/jail/buy_bust_revive.svg) left top no-repeat;
                filter: drop-shadow(0px 1px 0px #fff);
                filter: var(--default-icon-filter);
                background-position: 0 -36px;
            }
            .xrevive {
                display: inline-block;
                height: 18px;
                width: 43px;
                vertical-align: middle;
                border-left: 2px solid;
                border-left-color: #CCC;
                border-left-color: var(--default-panel-divider-outer-side-color);
                margin: -250px 0;
                padding: 250px 0;
                text-align: center;
                cursor: pointer;
            }
        `);
    }

})();