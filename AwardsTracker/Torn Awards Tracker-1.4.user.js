// ==UserScript==
// @name         Torn Awards Tracker
// @namespace    http://tampermonkey.net/
// @version      1.4
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

    let medalTypeMap = { "CRM": {name: "crime", class: "crimes___gPSVM" },
                                // 9 types
                         "OTR": {name: "general", class: "general___DTna6" },
                         "NTW": {name: "networth", class: "networth___n9fhW" },      // net-worth1-networth 1-14
                         "RNK": {name: "rank", class: "rank___XEQdd" },              // rank1-rank, 1-25
                         "LVL": {name: "level", class: "level___rMT3B" },            // lvl1-level...20, or level/5
                         "ATK": {name: "attacking", class: "attacking___fHBku" },
                         "CMT": {name: "commitment", class: "commitment___RlEbr" },
                                // 4 types:
                                // fac - f-membership1-commitment, 1-10
                                // marriage - marriage1-commitment, 1-21
                                // donator - donator1-commitment, 1-5
                                // torn - years-of-service1-commitment, 1-10
                       };


    function whichPage() {
        const params = new URLSearchParams(window.location.search);
        let selectedTab = $("[class*='tabList_'] [class*='selectedTab_']").attr("id");
        let urlTab = params.get("tab");
        if (urlTab) return urlTab;
        if (selectedTab) return selectedTab;
        return 'honors';
    }

    function whichPanel() { return `#${whichPage()}-panel`; }

    function liFromMedalEntry(entry, id) {
        let mapEntry = medalTypeMap[entry.type];
        if (!mapEntry) mapEntry = {name: "fake", class: "crimes___gPSVM" };
        let li =
            `<li data-id="${id}" class="medal___dYub_ ${mapEntry.class}">
                   <i class="somesubsetandnumber-${mapEntry.name}-v2">
                       <i class="md-icon medalIcon___AMWtj"></i>
                   </i>
                   <div class="information___yxwRo">
                       <p class="date___hi0lf"></p>
                       <p class="title____bn3U">${entry.name}</p>
                       <p class="description___F6pkp">${entry.description}</p>
                   </div>
               </li>`;

        return li;
    }

    function liFromHonorEntry(entry, id) {
        if (!entry || !entry.name || !entry.rarity || !entry.description) {
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

    function getHonorsUl() {
        let ulTemplate;
        let ulList = $("#honors-panel").find("ul[class*='honorsList_']");
        if ($(ulList).length) {
            ulTemplate = $($(ulList)[0]).clone();
            $(ulTemplate).empty();
            GM_setValue("defHonorsUl", $(ulTemplate).attr("class"));
            log("[getHonorsUl] saved class: ", GM_getValue("defHonorsUl", "unknown"));
        }
        if (!$(ulTemplate).length) {
            ulTemplate = $(`<ul class="honorsList___SegMk"></ul>`);
        }

        return $(ulTemplate);
    }

    function getMedalsUl() {
        let firstUl = $("#medals-panel").find("ul[class*='medalsList_']")[0];
        log("[getMedalsUl] firstUl", $(firstUl));
        if (!$(firstUl).length) {
            firstUl = $(`<ul class="medalsList____X7l2"></ul>`);
        }
        let template = $(firstUl).clone();
        $(template).empty();
        log("[getHonorsUl] template", $(template)[0]);

        // temp?
        if ($(template).length) {
            let saved = JSON.parse(GM_getValue("defMedalsUl", JSON.stringify("")));
            log("Saved: ", saved, " template: ", $(template)[0]);
            if (!saved || saved != $(template)[0]) {
                GM_setValue("defMedalsUl", JSON.stringify($(template)[0]));
            }
        }

        return $(template);
    }

    function showMissingMedals(e) {
        // See where we came from, if from the missing honors/medals tab,
        // don't need to restore or save..
        let from = e ? $(e.currentTarget).attr("id") : "unknown";
        let fromMyTabs = from.indexOf('missing-') > -1;
        log("[showMissingMedals] from: ", fromMyTabs, $(e.currentTarget).attr("id"));


        // 2nd time, re-attach...unless from one of the "missing-*" tabs again
        let template = getMedalsUl();
        let panel = whichPanel();
        if (detachedChildren  && !fromMyTabs) {
            $(panel).children().slice(2).remove();
            $(panel).append(detachedChildren);
            detachedChildren = null;
            $(`ul[class*='categoryList_'] > li[class*='category_']`).off('click.xedx');
            return;
        }

        if (!detachedChildren) {
            $(`ul[class*='categoryList_'] > li[class*='category_']`).on('click.xedx', showMissingMedals);
            detachedChildren = $(panel).children().slice(2).detach();
        }

        let countNa = 0, countAdded = 0;
        let newRow = $(template).clone();

        let c = 0, needAppend = false;
        for (let i=0; i<missingMedals.length; i++) {
            let id = missingMedals[i];
            let entry = allAwards.medals[id];
            let li = liFromMedalEntry(entry, id);
            if (!li || li == null) {
                countNa++;
                continue;
            }
            $(newRow).append(li);
            countAdded++;
            if (c++ == 2) {
                c = 0;
                $(panel).append(newRow);
                newRow = $(template).clone();
                needAppend = false;
            } else {
                needAppend = true;
            }
        }
        if (needAppend == true)
            $(panel).append(newRow);

        debug("Medals missing: ", missingMedals.length, " N/A: ", countNa, " Added:", countAdded);
    }

    function showMissingHonors(e) {
        let from = e ? $(e.currentTarget).attr("id") : "unknown";
        let fromMyTabs = from.indexOf('missing-') > -1;
        log("[showMissingMedals] from: ", fromMyTabs, $(e.currentTarget).attr("id"));

        // 2nd time, re-attach...unless from one of the "missing-*" tabs again
        let template = getHonorsUl();
        let panel = whichPanel();
        if (detachedChildren  && !fromMyTabs) {
            $(panel).children().slice(2).remove();
            $(panel).append(detachedChildren);
            detachedChildren = null;
            $(`ul[class*='categoryList_'] > li[class*='category_']`).off('click.xedx');
            return;
        }

        if (!detachedChildren) {
            $(`ul[class*='categoryList_'] > li[class*='category_']`).on('click.xedx', showMissingMedals);
            detachedChildren = $(panel).children().slice(2).detach();
        }

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


    // temporary helper
    var medalTypes = [];
    function getMedalTypes() {
        for (let [key, entry] of Object.entries(allAwards.medals)) {
            if (!medalTypes.includes(entry.type))
                medalTypes.push(entry.type);
        }
        log("medal types: ", medalTypes);
    }

    // Only instll on Honors page for now...
    function installUI(retries=0) {
        let page = whichPage();
        if ($(".xtabstyle").length) {
            log("Honors UI already installed: ", $(".xtabstyle"));
            $(".xtabstyle").remove();
        }

        // Only if I decide to put on medals page also
        if ($("#medals-clone").length) {
            log("Medals UI already installed: ", $(".xtabstyle"));
            $("#medals-clone").remove();
        }

        let isHonorsPg = (page == 'honors');
        log("[installUI] curr page: ", page);

        //if (whichPage() == 'merits') return log("Will not install on the merits page.");
        if (!isHonorsPg) return log("Not on honors page");

        let panelUl = isHonorsPg ?
            $("#honors-panel [class^='categoryList']") :
            $("#medals-panel [class^='categoryList']");

        if (!$(panelUl).length) { // try the opposite, just in case
            panelUl = isHonorsPg ?
                $("#medals-panel [class^='categoryList']") :
                $("#honors-panel [class^='categoryList']");
        }

        if (!$(panelUl).length) {
            if (retries++ < 50) return setTimeout(installUI, 250, retries);
            return log("installUI timed out");
        }

        if ($("#medals-panel").length) {
            let panelClone = $(panelUl).clone();
            $(panelClone).empty();
            $(panelClone).attr("id", "medals-clone");
            $(panelClone).append(`
                 <li id="missing-honors" class="xtabstyle" role="tab" tabindex="0"
                     aria-labelledby="missing-tab">Missing Honors</li>
                 <li id="missing-medals" class="xtabstyle" role="tab" tabindex="0"
                     aria-labelledby="medals-tab">Missing Medals</li>
                 <li id="locked-awards" class="xtabstyle" role="tab" tabindex="0"
                     aria-labelledby="locked-tab">Locked</li>`);
            $(panelUl).after(panelClone);
        } else {
            $(panelUl).append(`
                 <li id="missing-honors" class="xtabstyle" role="tab" tabindex="0"
                     aria-labelledby="missing-tab">Missing Honors</li>
                 <li id="missing-medals" class="xtabstyle" role="tab" tabindex="0"
                     aria-labelledby="medals-tab">Missing Medals</li>
                 <li id="locked-awards" class="xtabstyle" role="tab" tabindex="0"
                     aria-labelledby="locked-tab">Locked</li>`);
        }

        //$(".xtabstyle").on('click', handleTabClick);
        $("#missing-honors").on('click', showMissingHonors);
        $("#missing-medals").on('click', showMissingMedals);

        /*
        // Clone a UL and LI to populate. Or, create our own styles...
        let firstUl = $("#honors-panel").find("ul[class*='honorsList_']")[0];
        let ulClone = $(firstUl).clone();
        $(ulClone).empty();

        log("UL clone: ", $(ulClone)[0]);
        //log("LI clone: ", $(liClone));

        if (!$(ulClone).length)
            ulClone = $(`<ul class="honorsList"></ul>`);
        */
    }

    function getMissingAwards(retries=0) {
        if (!myAwards.honors.length || !allHonorsArr.length) {
            if (retries++ < 50) return setTimeout(getMissingAwards, retries);
            return log("[getMissingAwards] timed out.");
        }

        let oldMedals = getOldMedals();

        missingHonors = allHonorsArr.filter(num => !myAwards.honors.includes(num) && !oldHonors.includes(num));
        missingMedals = allMedalsArr.filter(num => !myAwards.medals.includes(num) && !oldMedals.includes(+num));

        function getOldMedals() {
            let ret = [];
            let ng = { 54: 73, 81: 88, 97: 104, 117: 147, 152: 155, 163: 173 };
            for (let [a, b] of Object.entries(ng)) {
                for (let i = +a; i <= +b; i++) ret.push(+i);
            }
            return ret;
        }
    }

    function handlePageLoad(retries=0) {
        debug("[handlePageLoad] ", retries);
        handlingPSChange = false;

        let h = honorsTab(), m = medalsTab();
        if (!$(h).length || !$(m).length) {
            if (retries++ < 50) return setTimeout(handlePageLoad, 250, retries);
            return log("handlePageLoad timed out");
        }

        const params = new URLSearchParams(window.location.search);
        let selectedTab = $("[class*='tabList_'] [class*='selectedTab_']").attr("id");
        let tab = params.get("tab");
        log("[handlePageLoad] selectedTab: ", selectedTab, " tab: ", tab);

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

            .common { background-position: 0 -15px; }
            .uncommon { background-position: 0 -28px; }
            .limited { background-position: 0 -41px; }
            .rare ( background-position: 0 -54px; }
            .veryrare { background-position: 0 -67px; }
            .extremelyrare { background-position: 0 -80px; }
        `);
    }

    function getLockedMedalDiv() {
        return `<div class="md-icon medalIcon___AMWtj">` +
                    `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="63" viewBox="0 0 30 63" class="lockedMedal___zVS2E">` +
                        `<defs>` +
                            `<linearGradient id="linear-gradient" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">` +
                                `<stop offset="0" stop-color="#222"></stop>`+
                                `<stop offset="1" stop-color="#333"></stop>`+
                            `</linearGradient>`+
                            `<filter id="Path_3048" x="0" y="0" width="30" height="64" filterUnits="userSpaceOnUse">`+
                                `<feOffset></feOffset>`+
                                `<feGaussianBlur result="blur"></feGaussianBlur>`+
                                `<feFlood flood-color="#fff" flood-opacity="0.051"></feFlood>`+
                                `<feComposite operator="in" in2="blur"></feComposite>`+
                                `<feComposite in="SourceGraphic"></feComposite>` +
                            `</filter>`+
                            `<filter id="Path_3048-2" x="0" y="0" width="30" height="64" filterUnits="userSpaceOnUse">`+
                                `<feOffset></feOffset>`+
                                `<feGaussianBlur stdDeviation="2.5" result="blur-2"></feGaussianBlur>`+
                                `<feFlood flood-opacity="0.651" result="color"></feFlood>`+
                                `<feComposite operator="out" in="SourceGraphic" in2="blur-2"></feComposite>`+
                                `<feComposite operator="in" in="color"></feComposite>`+
                                `<feComposite operator="in" in2="SourceGraphic"></feComposite>`+
                            `</filter>`+
                            `<linearGradient id="linear-gradient-2" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">`+
                                `<stop offset="0" stop-color="#666"></stop><stop offset="1" stop-color="#333"></stop>`+
                            `</linearGradient>`+
                            `<filter id="iconmonstr-lock-1" x="3" y="13" width="24" height="30" filterUnits="userSpaceOnUse">`+
                                `<feOffset></feOffset>`+
                                `<feGaussianBlur stdDeviation="1" result="blur-3"></feGaussianBlur>`+
                                `<feFlood></feFlood>`+
                                `<feComposite operator="in" in2="blur-3"></feComposite>`+
                                `<feComposite in="SourceGraphic"></feComposite>`+
                            `</filter>`+
                            `<clipPath id="clip-medal_locked"><rect width="30" height="63"></rect></clipPath>`+
                        `</defs>`+
                        `<g clip-path="url(#clip-medal_locked)">`+
                            `<g transform="translate(-1026 -641)">`+
                                `<g>`+
                                    `<g transform="matrix(1, 0, 0, 1, 1026, 641)" filter="url(#Path_3048)">`+
                                        `<path d="M243-23h30V30L258,40,243,30Z" transform="translate(-243 23)" fill="url(#linear-gradient)">`+
                                        `</path>`+
                                    `</g>`+
                                    `<g transform="matrix(1, 0, 0, 1, 1026, 641)" filter="url(#Path_3048-2)">`+
                                        `<path d="M243-23h30V30L258,40,243,30Z" transform="translate(-243 23)" fill="#fff"></path>`+
                                    `</g>`+
                                `</g>`+
                            `<g transform="matrix(1, 0, 0, 1, 1026, 641)" filter="url(#iconmonstr-lock-1)">`+
                                `<path d="M18,10V6A6,6,0,0,0,6,6v4H3V24H21V10ZM8,10V6a4,4,0,0,1,8,0v4Z" transform="translate(3 16)" fill="url(#linear-gradient-2)"></path>`+
                            `</g>`+
                        `</g>`+
                    `</g>`+
                `</svg>`+
                `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="63" viewBox="0 0 30 63" class="progressBg___KOI0O">`+
                    `<defs><linearGradient id="medals_crimes_progress_347" gradientTransform="rotate(90)"><stop offset="100%" stop-color="#FCC4194D" stop-opacity="0"></stop><stop offset="100%" stop-color="#FCC4194D" stop-opacity="1"></stop><stop offset="100%" stop-color="#FCC41900" stop-opacity="0"></stop></linearGradient>`+
                    `</defs>`+
                    `<g><path d="M0,0h30v53l-15,10L0,53V0Z" fill="url('#medals_crimes_progress_347')" stroke-width="0"></path></g>`+
                `</svg>`+
            `</div>`;
    }

})();



