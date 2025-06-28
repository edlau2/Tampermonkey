// ==UserScript==
// @name         Torn Awards Tracker
// @namespace    http://tampermonkey.net/
// @version      1.0
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

    function queryAwardsCB(responseText, ID, param) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) return handleError(responseText);

        if (param == "user") {
            myAwards.honors = jsonResp.honors_awarded;
            myAwards.medals = jsonResp.medals_awarded;
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
        let li = `
        <li tabindex="0" aria-label="${entry.name}" class="honor___XzO0D progressZero___Lv3KB">
            <div class="honorWrap___PO8VW" data-is-tooltip-opened="false">
                <div class="honor-text-wrap default bgStyle___nnQBT big">
                    <img src="/images/honors/${id}/f.png" srcset="/images/honors/${id}/f.png 1x, /images/honors/${id}/f@2x.png 2x, /images/honors/${id}/f@3x.png 3x, /images/honors/${id}/f@4x.png 4x" alt="${entry.name}">
                    <span class="honor-text honor-text-svg">` +
                        honorTextForName(entry.name) +
                    `</span>
                    <span class="honor-text">${entry.name}</span>
                </div>
            </div>
            <span class="honorType___rXDqZ ${entry.rarity.toLowerCase()}"></span>
            <p class="description___Q5OFP">${entry.description}</p>
        </li>`;
    }

    // Handle clicking one of the new tabs - display new page
    function handleTabClick(e) {
        log("[handleTabClick]: ", $(this), $(this).attr("id"));

        switch($(this).attr("id")) {
            case "missing-honors":
            case "missing-medals":
            case "locked-awards":
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

        log("UL clone: ", $(ulClone));
        log("LI clone: ", $(liClone));

        if (!$(ulClone).length)
            ulClone = $(`<ul class="honorsList"></ul>`);

    }

    function getMissingAwards(retries=0) {
        missingHonors = allHonorsArr.filter(num => !myAwards.honors.includes(num));
        missingMedals = allMedalsArr.filter(num => !myAwards.medals.includes(num));

        //log("allHonorsArr: ", allHonorsArr);
        //log("myAwards.honors: ", myAwards.honors);
        //debug("missingHonors: ", missingHonors);
        //debug("missingMedals: ", missingMedals);

        debug("Missing honor: ", missingHonors[0], "\nDetails: ", allAwards.honors[missingHonors[0]]);
        debug("Example honor: ", myAwards.honors[0], "\nDetails: ", allAwards.honors[myAwards.honors[0]]);
    }

    function handlePageLoad(retries=0) {
        log("[handlePageLoad]");
        handlingPSChange = false;
        let h = honorsTab(), m = medalsTab();
        //log("h: ", $(h), " m: ", $(m));
        if (!$(h).length || !$(m).length) {
            if (retries++ < 50) return setTimeout(handlePageLoad, 250, retries);
            return log("handlePageLoad timed out");
        }
        installUI();

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

    // Get owned honors and medals
    xedx_TornUserQuery(null, "honors,medals", queryAwardsCB, "user");

    // And all available (once)
    if (!Object.keys(allAwards.honors).length || !allHonorsArr.length || !allMedalsArr.length)
        xedx_TornTornQuery(null, "honors,medals", queryAwardsCB, "all");

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

            .limited { background-position: 0 -41px; }
            .veryrare { background-position: 0 -67px; }
            .uncommon { background-position: 0 -28px; }
            .rare ( background-position: 0 -54px; }
        `);
    }

    // limited___bLYIw
    // veryrare___GIMBu
    // uncommon___otCmz
    // rare___mAjX2

    // ===================================================================

    /*

        // Alternative idea, little buttons on the tabs..
        if (doTabBtns == true) {
            $("#honors").prepend(`
                <button type="button" aria-label="Search on honors tab" class="searchButton___NyCYD" i-data="i_418_57_18_34"
                style="left: 0;border: 1px solid green;height: 20px;width: 20px;">
                <span>M</span>
                </button>`);
        }

    allAwards.honors[id] = {circulation: 15002, description: "Achieve 5,000 theft crimes",
    equipped: 182, name: "Smokin' Barrels", rarity: "Limited", type: 5}

    // <ul class="honorsList">...</ul>

    // Or clone first one, replace attrs one by one?
    function liFromHonorEntry(entry, id) {
        let li = `
        <li tabindex="0" aria-label="${entry.name}" class="honor___XzO0D progressZero___Lv3KB">
            <div class="honorWrap___PO8VW" data-is-tooltip-opened="false">
                <div class="honor-text-wrap default bgStyle___nnQBT big">
                    <img src="/images/honors/${id}/f.png" srcset="/images/honors/${id}/f.png 1x, /images/honors/${id}/f@2x.png 2x, /images/honors/${id}/f@3x.png 3x, /images/honors/${id}/f@4x.png 4x" alt="${entry.name}">
                    <span class="honor-text honor-text-svg">
                        <span class="honorTextSymbol___PGzDa" data-char="A"></span> <!-- etc for each letter -->
                    </span>
                    <span class="honor-text">${entry.name}</span>
                </div>
            </div>
            <span class="honorType___rXDqZ ${entry.rarity.toLowerCase()}"></span>
            <p class="description___Q5OFP">${entry.description}</p>
        </li>`;
    }

    */






})();