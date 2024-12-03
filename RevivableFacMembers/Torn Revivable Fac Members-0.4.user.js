// ==UserScript==
// @name         Torn Revivable Fac Members
// @namespace    http://tampermonkey.net/
// @version      0.4
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
    var memberReviveStatus = {};

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

    // Make room for extra column....
    function editUserTable() {
        let icons = $(".member-icons");
        for (let idx=0; idx < $(icons).length; idx++) {
            let iconNode = $(icons)[idx];
            $(iconNode).after($(emptyRevIconDiv));
        }
    }

    var retryExpected = false;
    function iterateFacList(fromCallback) {
        debug("iterateFacList: ", $(profilesList));
        if (fromCallback == true && retryExpected == false) return;
        retryExpected = false;
        if (!profilesList) return log("ERROR: No profile list!!");

        let listLen = $(profilesList).length;
        let count = 0;
        for (let idx = 0; idx < listLen; idx++) {
            let member = $(profilesList)[idx];
            let href = $(member).attr("href");
            if (!href) continue;

            let id = xidFromProfileURL(href);

            if (!memberReviveStatus[id]) {
                debug("ID missing from revive list (", id, ") - invalid list?");
                continue;
            }

            let li = $(member).closest("li");
            let revivable = memberReviveStatus[id].revivable;
            setReviveStatus(li, id, revivable);

            count++;
        }

        logt("Finished iterating fac members");

        // Repeat in a few minutes in case this page is being left open
        retryExpected = true;
        setTimeout(doFacMemberQuery, 20000);
    }

    function startIteration(fromCb) {
        logt("Starting iteration of fac members");
        revivableMembers = 0;
        requests = 0;
        processed = 0;
        iterateFacList(fromCb);
    }

    // profileList is to get the position of the member's LI in the
    // table in the UI. The member ID from the table is matched to
    // the revive status from the API call.
    function getFacMembers(retries=0) {
        if (!$(profilesList).length) {
            profilesList = $("[class*='honorWrap_'] > a");
            if (!$(profilesList).length) {
                if (retries++ > 30) return log("Too many retries, going home.");
                return setTimeout(getFacMembers, 250, retries);
            }
            editUserTable();
        }

        let keys = Object.keys(memberReviveStatus);
        if (!keys.length) log("ERROR: No revive list yet!!");

        startIteration();
    }

    function facMemberQueryCb(responseText, id, param) {
        let jsonResp;
        if (!responseText) return log("ERROR: Missing query response!");

        try {
           jsonResp = JSON.parse(responseText);
        }
        catch (err) {
            log("ERROR: invalid JSON! ", responseText, " err: ", err);
            return handleApiComplete();
        }

        debug("facMemberQueryCb", jsonResp);
        let members = jsonResp.members;
        for (let idx=0; idx < members.length; idx++) {
            let member = members[idx];
            memberReviveStatus[member.id] = {revivable: member.is_revivable};
        }

        if ($(profilesList).length && param == false)
            startIteration(true);
    }

    var facId;
    function doFacCheck() {
        let okToCheck = false;
        if (location.hash && location.hash.indexOf("tab=info") > 0) okToCheck = true;
        if (location.href.indexOf('step=profile') > 0) {
            let parts = location.href.split('=');
            let temp = parts ? parts[2] : undefined;
            if (temp) {
                parts = temp.split('#');
                facId = parts[0];
            }
            okToCheck = true;
        }
        debug("doFacCheck: ", okToCheck, ", ID: '", facId, "'");

        return okToCheck;
    }

    function doFacMemberQuery(atInit=false) {
        debug("doFacMemberQuery, id: '", facId, "'");
        xedx_TornFactionQueryv2(facId, 'members', facMemberQueryCb, atInit);
    }


    function handlePageLoad() {
        let okToCheck = doFacCheck();
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

    if (doFacCheck() == true)
        doFacMemberQuery(true);

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