// ==UserScript==
// @name         Torn Awards Tracker
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=awards*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @exclude      https://www.torn.com/recaptcha.php*
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

    // Need to trap switching tabs! Or maybe just on one page? or all 3?

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging
    GM_setValue("debugLoggingEnabled", debugLoggingEnabled);

    const doTabBtns = false;

    var myAwards = { honors: [], medals: [] };

    var allAwards = JSON.parse(GM_getValue("allAwards", JSON.stringify({ honors: {}, medals: {} })));
    var allHonorsArr = JSON.parse(GM_getValue("allHonorsArr", JSON.stringify([])));
    var allMedalsArr = JSON.parse(GM_getValue("allMedalsArr", JSON.stringify([])));

    var missingHonors = [];
    var missingMedals = [];

    const honorsTab = function () { return $("#honors"); }
    const medalsTab = function () { return $("#medals"); }
    const meritsTab = function () { return $("#merits"); }

    const oldHonors = [ 2, 6, 24, 25, 152, 153, 154, 155, 157, 158, 159, 160, 161 ];

    function queryAwardsCB(responseText, ID, param) {
        let jsonResp = JSON.parse(responseText);

        log("queryAwardsCB: ", param, jsonResp);
        if (jsonResp.error) return handleError(responseText);

        if (param == "user") {
            myAwards.honors = JSON.parse(JSON.stringify(jsonResp.honors_awarded));
            myAwards.medals = JSON.parse(JSON.stringify(jsonResp.medals_awarded));

            log("myAwards: ", myAwards);
        }

        if (param == "all") {
            allAwards = JSON.parse(JSON.stringify(jsonResp));
            GM_setValue("allAwards", JSON.stringify(allAwards));

            allHonorsArr = Object.keys(allAwards.honors).map(Number);
            GM_setValue("allHonorsArr", JSON.stringify(allHonorsArr));

            allMedalsArr = Object.keys(allAwards.medals).map(Number);
            GM_setValue("allMedalsArr", JSON.stringify(allMedalsArr));
        }
    }

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    var handlingPSChange = false;
    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", handlingPSChange, location.href);
        if (handlingPSChange == true) return;
        handlingPSChange = true;
        callOnContentComplete(handlePageLoad);
    }

    function imgSrcFromEntry(entry, id) {
        return `<img src="/images/honors/${id}/f.png" srcset="/images/honors/${id}/f.png 1x, ` +
            `/images/honors/${id}/f@2x.png 2x, /images/honors/${id}/f@3x.png 3x, /images/honors/${id}/f@4x.png 4x" alt="${entry.name}">`;
    }

    function honorTextForName(name) {
        let hText = `<span class="honor-text honor-text-svg">`;
        for (const char of name) {
            hText = hText + `<span class="honorTextSymbol___PGzDa" data-char="${char}"></span>`;
        }
        hText = hText + `</span>`;
        return hText;
    }

    function liFromHonorEntry(entry, id) {
        // Need fn to build letters...
        if (!entry || !entry.name || !entry.rarity || !entry.description) {
            debug("Default entry? ", entry);
            return null;
        }

        let li = `
        <li tabindex="0" aria-label="${entry.name}" class="honor___XzO0D progressZero___Lv3KB">
            <div class="honorWrap___PO8VW" data-is-tooltip-opened="false">
                <div class="honor-text-wrap default bgStyle___nnQBT big">` +
                        imgSrcFromEntry(entry, id) +
                        honorTextForName(entry.name) +
                   `<span class="honor-text">${entry.name}</span>
                </div>
            </div>
            <span class="honorType ${entry.rarity.toLowerCase()}"></span>
            <p class="description___Q5OFP">${entry.description}</p>
        </li>`;

        return li;
    }

    var detachedChildren;
    function showMissingHonors() {
        // 2nd time, re-attach...
        if (detachedChildren) {
            $('#honors-panel').children().slice(2).remove();
            $('#honors-panel').append(detachedChildren);
            detachedChildren = null;
            $(`ul[class*='categoryList_'] > li[class*='category_']`).off('click.xedx');
            return;
        }

        $(`ul[class*='categoryList_'] > li[class*='category_']`).on('click.xedx', showMissingHonors);

        // Copy one list entry
        let firstUl = $("#honors-panel").find("ul[class*='honorsList_']")[0];
        let template = $(firstUl).clone();
        $(template).empty();

        // Remove current contents
        detachedChildren = $('#honors-panel').children().slice(2).detach();

        // Build the rows of missing honors
        let countNa = 0, countAdded = 0;
        let newRow = $(template).clone();
        let c = 0, needAppend = false;
        for (let i=0; i<missingHonors.length; i++) {
            let id = missingHonors[i];
            let entry = allAwards.honors[id];
            let li = liFromHonorEntry(entry, id);
            if (!li || li == null) {
                countNa++;
                continue;
            }
            $(newRow).append(li);
            countAdded++;
            if (c++ == 2) {
                c = 0;
                $('#honors-panel').append(newRow);
                newRow = $(template).clone();
                needAppend = false;
            } else {
                needAppend = true;
            }
        }
        if (needAppend == true)
            $('#honors-panel').append(newRow);

        debug("Honors missing: ", missingHonors.length, " N/A: ", countNa, " Added:", countAdded);
    }

    // Handle clicking one of the new tabs - display new page
    function handleTabClick(e) {
        debug("[handleTabClick]: ", $(this), $(this).attr("id"));

        switch($(this).attr("id")) {
            case "missing-honors": {
                showMissingHonors();
                break;
            }
            case "missing-medals": {

                break;
            }
            case "locked-awards": {

                break;
            }
        }
    }

    // Only instll on Honors page for now...
    function installUI(retries=0) {
        const params = new URLSearchParams(window.location.search);
        if ($(".xtabstyle").length) return log("UI already installed: ", $(".xtabstyle"));

        let tab = params.get("tab");
        if (tab == 'medals' || tab == 'merits') return log("Will only install on the Honors page.");
        let panelUl  = $("#honors-panel [class^='categoryList']");

        if (!$(panelUl).length) {
            if (retries++ < 50) return setTimeout(installUI, 250, retries);
            return log("installUI timed out");
        }

        // Tabs under the existing ones
        $(panelUl).append(`
             <li id="missing-honors" class="xtabstyle" role="tab" tabindex="0"
                 aria-labelledby="missing-tab">Missing Honors</li>
             <li id="missing-medals" class="xtabstyle" role="tab" tabindex="0"
                 aria-labelledby="medals-tab">Missing Medals</li>
             <li id="locked-awards" class="xtabstyle" role="tab" tabindex="0"
                 aria-labelledby="locked-tab">Locked</li>`);

        $(".xtabstyle").on('click', handleTabClick);

        // Clone a UL and LI to populate. Or, create our own styles...
        let firstUl = $("#honors-panel").find("ul[class*='honorsList_']")[0];
        let ulClone = $(firstUl).clone();

        let firstLi = $(firstUl).find("li:first-child");
        let liClone = $(firstLi).clone();

        $(ulClone).empty();

        log("UL clone: ", $(ulClone)[0]);
        //log("LI clone: ", $(liClone));

        if (!$(ulClone).length)
            ulClone = $(`<ul class="honorsList"></ul>`);

    }

    function getMissingAwards(retries=0) {
        if (!myAwards.honors.length || !allHonorsArr.length) {
            if (retries++ < 50) return setTimeout(getMissingAwards, retries);
            return log("[getMissingAwards] timed out.");
        }

        missingHonors = allHonorsArr.filter(num => !myAwards.honors.includes(num) && !oldHonors.includes(num));
        missingMedals = allMedalsArr.filter(num => !myAwards.medals.includes(num));

        //debug("allHonorsArr: ", allHonorsArr);
        //debug("myAwards.honors: ", myAwards.honors);
        //debug("missingHonors: ", missingHonors);

        log("Missing medal: ", allAwards.medals[missingMedals[0]]);
    }

    function handlePageLoad(retries=0) {
        debug("[handlePageLoad] ", retries);
        handlingPSChange = false;
        let h = honorsTab(), m = medalsTab();
        if (!$(h).length || !$(m).length) {
            if (retries++ < 50) return setTimeout(handlePageLoad, 250, retries);
            return log("handlePageLoad timed out");
        }

        installUI();
        if (!missingHonors.length || !missingMedals.length)
            getMissingAwards();
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


    // Get all available (once)
    if (!Object.keys(allAwards.honors).length || !allHonorsArr.length || !allMedalsArr.length)
        xedx_TornTornQuery(null, "honors,medals", queryAwardsCB, "all");

    // Get owned honors and medals
    xedx_TornUserQuery(null, "honors,medals", queryAwardsCB, "user");

    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {
        GM_addStyle(`
            .xtabstyle {
                flex: 1 1 10%;

                align-items: center;
                border-bottom: 1px solid #000;
                border-right: 1px solid #000;
                box-sizing: border-box;
                color: #ccc;
                display: flex;
                font-size: 11px;
                justify-content: center;
                min-width: 0;
                padding: 11px 4px 10px;
                position: relative;
                text-transform: uppercase;
            }

            .xtabstyle:hover {
                background: #222;
                color: #fff;
                cursor: pointer;
            }

            .honorsList {
                border-bottom: 1px solid #222;
                display: flex;
            }
            .medalsList {
                border-bottom: 1px solid #222;
                display: flex;
                flex-wrap: wrap;
            }

            .honorType {
                background: url(/images/v2/awards/flags_reg.svg) 100% 0 no-repeat;
                display: inline-block;
                filter: drop-shadow(0 0 1px rgba(17, 17, 17, .3019607843));
                height: 10px;
                margin-right: -189px;
                min-height: 10px;
                width: 13px;
            }

            .limited { background-position: 0 -41px; }
            .veryrare { background-position: 0 -67px; }
            .uncommon { background-position: 0 -28px; }
            .rare ( background-position: 0 -54px; }
            .common { background-position: 0 -15px; }
        `);
    }

    // limited___bLYIw
    // veryrare___GIMBu
    // uncommon___otCmz
    // rare___mAjX2


})();