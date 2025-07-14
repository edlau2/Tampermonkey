// ==UserScript==
// @name         OC Role Pick Assist - CHR
// @namespace    http://tampermonkey.net/
// @version      1.5.12
// @description  Assists in finding best OC and role to join
// @author       colaman32 - better by xedx [2100735] ;-)
// @match        https://www.torn.com/factions.php?step=your*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_info
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @license      MIT
// @downloadURL https://update.greasyfork.org/scripts/541416/OC%20Role%20Display%20-%20CHR.user.js
// @updateURL https://update.greasyfork.org/scripts/541416/OC%20Role%20Display%20-%20CHR.meta.js
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

//OC Role Display - CHR
(async function() {
    'use strict';

    const isMobile = !isDesktop();
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);    // Enables more verbose logging
    var showCrimeScore = GM_getValue("showCrimeScore", false);
    var preferredLvl = GM_getValue("preferredLvl", 'any');
    GM_setValue("showCrimeScore", showCrimeScore);
    GM_setValue("preferredLvl", preferredLvl);

    // ================= Color Coding the slots, based on CPR ===================

    const defaultLevel6 = 70;
    const defaultLevel5 = 65;
    const defaultLevel4 = 65;
    const defaultLevel3 = 65;
    const defaultLevel2 = 65;
    const defaultDecline = 700;

    const ocRoles = [
        { OCName: "Blast From The Past",
          Positions: { "PICKLOCK #1": 70, "HACKER": 70, "ENGINEER": 70, "BOMBER": 70, "MUSCLE": 70, "PICKLOCK #2": 0 }},
        { OCName: "Stacking the Deck",
          Positions: { "HACKER": 65, "IMPERSONATOR": 65, "CAT BURGLAR": 65, "DRIVER": 65 }},
        { OCName: "Ace in the Hole",
          Positions: { "HACKER": 65, "DRIVER": 55, "MUSCLE #1": 63, "IMPERSONATOR": 65, "MUSCLE 2": 63 }},
        { OCName: "Break the Bank",
          Positions: { "ROBBER": 65, "MUSCLE #1": 65, "THIEF #1": 62, "MUSCLE #2": 62, "MUSCLE #3": 65, "THIEF #2": 65 }},
        { OCName: "Honey Trap", Positions: `default_${defaultLevel6}` },
        { OCName: "Leave No Trace", Positions: `default_${defaultLevel5}` },
        { OCName: "Stage Fright", Positions: `default_${defaultLevel4}` },
        { OCName: "Snow Blind", Positions: `default_${defaultLevel4}` },
        { OCName: "Pet Project", Positions: `default_${defaultLevel2}` },
        { OCName: "Cash Me If You Can", Positions: `default_${defaultLevel2}` },
        { OCName: "Smoke and Wing Mirrors", Positions: `default_${defaultLevel2}` },
        { OCName: "Market Forces", Positions: `default_${defaultLevel2}` },
        { OCName: "No Reserve", Positions: `default_${defaultLevel5}` },
        { OCName: "Stacking the Deck", Positions: `default_${defaultDecline}` }
    ];

    const roleMappings = {};

    function getCurrTab() {
        if (location.hash) return new URLSearchParams(location.hash.slice(2)).get("tab");
    }

    var crimeList = [];
    function processScenario(panel) {
        if (panel.classList.contains('role-processed')) return;
        panel.classList.add('role-processed');
        const ocName = $(panel).find('[class*="panelTitle_"]').text()?.trim() || "Unknown";
        const slots = $(panel).find('[class*="wrapper_"][class*="success"]');
        const slotsWaiting = $(panel).find('[class*="waitingJoin"]');
        var hasChance = false;

        let ocId = $(panel).attr("data-oc-id");
        let level = $(panel).find("[class^='levelValue_']").text();
        let scorePct = 0;
        let compPct = 0;
        let scoreHrs = 0;
        let slotScore = 0;
        let sortScore = 0;
        let hrsToIdle = 0;
        let slotCount = $(slots).length;
        let slotsWaitCount = $(slotsWaiting).length;
        debug("[processScenario] Panel: ", $(panel));
        debug("[processScenario] Panel has ", slotCount, " slots total, ", slotsWaitCount, " empty");
        let countScoresAdded = 0;
        Array.from(slots).forEach(slot => {
            // get raw role text and chance
            const roleElem      = slot.querySelector("[class*='title_']");
            const chanceElem    = slot.querySelector("[class*='successChance_']");
            if (!roleElem || !chanceElem) {
                debug("[processScenario] No role/chance elem for slot! ", $(slot));
                return;
            }

            // detect assigned player
            const honorTexts = slot.querySelectorAll('.honor-text');
            const userName   = honorTexts.length > 1 ? honorTexts[1].textContent.trim() : null;

            let iconNode = $(slot).find("[class^='slotIcon_'] > div[class^='planning_']");
            let style = $(iconNode).attr('style');
            //debug("[processScenario] Slot Icon Node: ", $(iconNode), " user: ", userName);
            if (style) {
                //debug("[processScenario] style: ", style);
                let idx = style.lastIndexOf(") ");
                if (idx > -1) {
                    let deg = parseFloat(style.slice(idx + 2).split('d')[0]);
                    //debug("[processScenario] deg: ", deg, (+deg == 0), (+deg == 360));
                    if (+deg == 0) {
                        //debug("[processScenario] deg == 0");
                        slotScore = userName ? 100 : 0;
                        hrsToIdle = userName ? 24 : 0;
                        //debug("[processScenario] deg == 0, userName: ", userName);
                    } else if (+deg == 360) {
                        //debug("[processScenario] deg == 360");
                        slotScore = 0;
                        compPct += 100; // Slot 100% done
                        hrsToIdle = 0;
                    } else {
                        //debug("[processScenario] math: ", (360 - deg), "|", ((360 - deg)/360), "|", (100 - (((360 - deg)/360)*100)));
                        slotScore = ((360 - deg)/360)*100;  // percent left
                        compPct += 100 - slotScore;
                        hrsToIdle = 24 - (24 * (slotScore / 100));
                    }
                    hrsToIdle = (24 * (slotScore / 100));
                    scoreHrs += hrsToIdle;
                    scorePct += slotScore;
                    countScoresAdded++;
                    //debug("[processScenario] slot score: ", slotScore, "%, total scorePct: ",
                    //      scorePct, " hrsToIdle: ", hrsToIdle, " total hrs: ", scoreHrs);
                }
            } else {
                //debug("[processScenario] No score info for slot: ", $(slot), " iconNode: ", $(iconNode));
            }

            const rawRole       = roleElem.innerText.trim();
            const successChance = parseInt(chanceElem.textContent.trim(), 10) || 0;
            const joinBtn       = slot.querySelector("button[class^='torn-btn joinButton']");

            // find thresholds
            const ocData = ocRoles.find(o => o.OCName.toLowerCase() === ocName.toLowerCase());
            let required = null;
            if (ocData) {
                if (typeof ocData.Positions === 'string' && ocData.Positions.startsWith('default_')) {
                    required = parseInt(ocData.Positions.split('_')[1], 10);
                } else if (typeof ocData.Positions === 'object' && ocData.Positions[rawRole] !== undefined) {
                    required = ocData.Positions[rawRole];
                }
            }
            if (required === null) {
                debug("[processScenario] Unmapped slot? ", $(slot));
                return;  // skip unmapped slots
            }

            // color & disable logic
            if (!userName) {
                slot.style.backgroundColor = successChance < required
                    ? '#ff000061'  // redish
                    : '#21a61c61'; // greenish
                if (joinBtn && successChance < required) {
                    joinBtn.setAttribute('disabled', '');
                }
                if (successChance >= required) hasChance = true;
            } else if (successChance < required) {
                $(slot).addClass('pulse-border-red');
            }
        });

        // If can't do this one, force to end of sorted list
        sortScore = scorePct;
        if (hasChance == false) {
            //scorePct = 9999;
            sortScore = 9999;
        }

        if (+scorePct == 0) sortScore = 200;              // no filled slots, score will be 0, put in the middle
        if (+scorePct > 100) sortScore = +scorePct + 200;  // One partial, one or more not started but filled, at end

        let entry = {id: parseInt(ocId), lvl: parseInt(level), slots: slots,
                     name: ocName, score: scorePct, scoreHrs: scoreHrs, hrsToIdle: scoreHrs, slotCount: slotCount, waiting: slotsWaitCount,
                     complete: compPct/slotCount, sortScore: sortScore}; //, f: filledSlots, e: emptySlots};

        debug("[processScenario] Added up ", countScoresAdded, " slots to get score of ", scorePct, "%, ", scoreHrs, " hrs for ", $(panel));

        if (showCrimeScore == true) {
            let tnode = $(panel).find("p[class^='panelTitle_']");
            let newTxt = $(tnode).text() +
                ` (score: ${entry.score.toFixed(2)} or ${entry.scoreHrs.toFixed(2)} hrs to idle, ${entry.waiting}/${entry.slotCount} empty, ${entry.complete.toFixed(2)}% complete)`;
            $(tnode).text(newTxt);
        }

        crimeList.push(entry);
        sortCrimeList();
    }

    var observer;
    var timer = 0;
    function startObserver() {
        if (observer)
            observer.disconnect();
        else {
            observer = new MutationObserver(mutations => {
                mutations.forEach(m => {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType !== 1) return;
                        if ($(node).attr("data-oc-id")) {
                            processScenario(node);
                        } else {
                            $("div[data-oc-id]").each(function(idx, el) { processScenario(el);});
                        }
                    });
                });
            });
        }

        let targetNode = document.querySelector('#factionCrimes-root') || document.body;
        observer.observe(targetNode, { childList: true, subtree: true });
    }

    // =========================== Calculating best OC to join =========================

    var listSorted = false;
    var listOrdered = false;
    function sortCrimeList() {
        if (!crimeList.length) return;
        crimeList.sort((a, b) => {
            if (a.lvl != b.lvl) return b.lvl - a.lvl;    // Level descending
            return a.sortScore - b.sortScore;            // Then score ascending
        });
        listSorted = true;
    }

    // ==================== Display the best ones to join, somehow =====================

    function scrollTo(node) {
        if ($(node).length) {
            var targetScrollPosition = $(node).offset().top - ($(window).height() / 2) + ($(node).outerHeight() / 2);
            $('html, body').animate({scrollTop: targetScrollPosition}, 800);
        }
    }

    // Order by level then score
    function orderByScore(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        log("[orderByScore] ", listSorted, crimeList.length, preferredLvl);
        if (!listSorted) return false;
        for (let idx=0; idx<crimeList.length; idx++) {
            let inc = crimeList.length + 1;
            let entry = crimeList[idx];
            let node = $(`div[data-oc-id='${entry.id}']`);
            if (idx == 0) $(node).parent().css({"display": "flex", "flex-direction": "column"});
            if ($(node).length) {
                $(node).attr("data-score", entry.score);
                let order = idx;
                if (preferredLvl == '7' && +entry.lvl != 7) order += inc;
                if (preferredLvl == '8' && +entry.lvl != 8) order += inc;
                $(node).attr('style', `order: ${order};`);
            }
        }
        listOrdered = true;
        return false;
    }

    // Highlight and scroll into focus
    function highlightNode(node) {
        if (!$(node).length) return false;
        let hn = $(`<div class="highlight2"></div>`);
        $(node).prepend($(hn));
        return true;
    }

    function goToBestChoice(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!listSorted) return false;
        let entry = crimeList[0];
        if ((preferredLvl == '7' && +entry.lvl != 7) ||
            (preferredLvl == '8' && +entry.lvl != 8)) {
            let searchLvl = (preferredLvl == '7') ? 7 : 8;
            for (let idx=0; idx<crimeList.length; idx++) {
                let tmp = crimeList[idx];
                if (+tmp.lvl == searchLvl) {
                    entry = tmp;
                    break;
                }
            }
        }

        let node = entry ? $(`div[data-oc-id='${entry.id}']`) : null;
        if (highlightNode(node) == false) return false;
        scrollTo($(node));
        return false;
    }

    function resetDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
        $(".highlight2").remove();
        $("div[data-oc-id]").each((idx, el) => { $(el).attr("style", "");});
        return false;
    }

    // ======================= mini UI for finding best to join ========================

    function handleShowOpts(e) {
        e.preventDefault();
        e.stopPropagation();
        $("#opts-btn > i").toggleClass("fa-caret-down fa-caret-right");
        let newH = "0px";
        let closing = true;
        if ($("#xoptsWrap").hasClass('xclosed')) {
            newH = "26px";
            closing = false;
            $("#xoptsWrap").css("display", "flex");
        }
        $("#xoptsWrap").toggleClass("xclosed xopen");
        $("#xoptsWrap > div > input").animate( {height: newH}, 100, function() {
            if (closing == true) $("#xoptsWrap").css("display", "none");
        });
        return false;
    }

    function getOptsDiv() {
        let optsDiv = `
            <div id="xoptsWrap" class="xclosed" style="display: none;">
                <input id="xedx-best-btn" class="xedx-torn-btn"  style="height: 0px;" value="Best Overall">
                <input id="xedx-best-btn7" class="xedx-torn-btn"  style="height: 0px;" value="Best Lvl 7">
                <input id="xedx-best-btn8" class="xedx-torn-btn"  style="height: 0px;" value="Best Lvl 8">
                <input id="xedx-sort-btn" class="xedx-torn-btn"  style="height: 0px;" value="Sort">
                <input id="xedx-default-btn" class="xedx-torn-btn"  style="height: 0px;" value="Default">
            </div>
        `;

        let optsDiv2 = `
            <div id="xoptsWrap" class="xoptsPc xclosed" style="display: none;">
                <div class="xflexr opts-btn-wrap">
                    <input id="xedx-best-btn" type='submit' class="xedx-torn-btn"  style="height: 0px;" value="Best">
                    <input id="xedx-sort-btn" type='submit' class="xedx-torn-btn"  style="height: 0px;" value="Sort">
                    <input id="xedx-default-btn" type='submit' class="xedx-torn-btn"  style="height: 0px;" value="Default">
                </div>
                <div class="xflexr radio-wrap">
                    <span>Preferred Level:</span>
                    <div class="inner-wrap">
                        <label><span class="sp">7:</span><input type="radio" id="lvl7" name="level" value="7"></label>
                        <label><span class="sp">8:</span><input type="radio" id=lvl8" name="level" value="8"></label>
                        <label><span class="sp">Any:</span><input type="radio" id="lvlany" name="level" value="any"></label>
                    </div>
                </div>
            </div>
        `;


        return optsDiv2;
    }

    function handleRadioChange(e) {
        e.preventDefault();
        e.stopPropagation();
        log("Radio selected: ", $(this).val(), $(this));
        preferredLvl = $(this).val();
        GM_setValue("preferredLvl", preferredLvl);
        log("preferred level: ", preferredLvl);
        if (listOrdered == true) orderByScore();
        return false;
    }

    function installUI(retries=0) {
        const toggleBtn = `<span id="opts-btn"><i class="fas fa-caret-right"></i></span>`;
        let recBtn = $("#faction-crimes-root > div > div[class^='buttonsContainer_'] > button:first-child");
        if (!$(recBtn).length) {
            if (retries++ < 50) return setTimeout(installUI, 250);
            return log("[installUI] timed out");
        }
        $(recBtn).prepend(toggleBtn);
        $("#opts-btn").on('click', handleShowOpts);
        $(recBtn).parent().after(getOptsDiv());

        if (true || isMobile) {
            $("#xoptsWrap").addClass("xoptsMobile").removeClass("xoptsPc");
        }

        $("#xedx-best-btn").on('click', goToBestChoice);
        $("#xedx-sort-btn").on('click', orderByScore);
        $("#xedx-default-btn").on('click', resetDefaults);

        $("input[name='level']").on('change', handleRadioChange);
        $(`#lvl${preferredLvl}`).prop('checked', true);
    }

    // ===================== Startup, hash/history change handling =====================

    function hashChangeHandler() {
        log("New fac tab: ", getCurrTab());
        setTimeout(handlePageLoad, 100);
    }

    function pushStateChanged(e) {
        setTimeout(handlePageLoad, 100);
    }

    function handlePageLoad(retries=0) {
        startObserver();
        $("div[data-oc-id]").each(function(idx, el) { processScenario(el); });
        installUI();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    debug("Debug logging enabled");
    log("Running on ", (isMobile ? 'mobile' : 'desktop'), " device.");

    if (checkCloudFlare()) return log("Won't run while challenge active!");
    debug("Current fac tab: ", getCurrTab());

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    versionCheck();
    addStyles();

    callOnContentLoaded(handlePageLoad);

    function addStyles() {
        const highlightBg = "green";
        addTornButtonExStyles();
        GM_addStyle(`
            @keyframes pulseRed {
                0% { box-shadow: 0 0 8px red; }
                50% { box-shadow: 0 0 18px red; }
                100% { box-shadow: 0 0 8px red; }
            }
            .pulse-border-red {
                animation: pulseRed 1s infinite;
                outline: 4px solid red;
                outline-offset: 0px;
            }
            .highlight {
                background-color: rgba(108,195,21,.07) !important;
                outline: 2px solid green;
                outline-offset: 0px;
            }
            @keyframes op {
                50% {opacity: .3;}
            }
            @keyframes fb {
                0%   { filter: brightness(1.4); }
                50%  { filter: brightness(0.4); }
                100% { filter: brightness(1.4); }
            }
            .highlight2 {
                animation: fb 1s infinite;
                background-color: ${highlightBg};
                opacity: 0.6;
                border-radius: 7px;
                filter: blur(2px);
                inset: -3px -3px -4px;
                position: absolute;
                width: 790px;
                height: 173px;
            }
            #opts-btn {
                position: absolute;
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                cursor: pointer;
                width: 34px;
                height: 34px;
                opacity: 1;
                visibility: visible;
                transition: all .2s ease-in-out;
                align-content: center;
                top: 0;
                z-index: 99999;
            }
            #opts-btn:hover {
                transform: scale(1.6);
            }
            #xoptsWrap {
                background: var(--tabs-bg-gradient);
                border-radius: 5px;
                box-shadow: var(--tabs-shadow);
                /*display: flex;
                flex-flow: row wrap;*/
                padding: 4px;
                margin-top: 5px;
                /*width: 776px;*/
            }
            .xoptsPc {
                display: flex;
                flex-flow: row wrap;
            }
            .xoptsMobile {
                display: flex;
                flex-direction: column;
            }
            #xoptsWrap > div > input[type='submit'] {
                margin: 0px 4px 0px 4px;
            }
            #xoptsWrap > div > input[type='radio'] {
                /*margin: 0px 2px 0px 2px;*/
            }
            #xoptsWrap span {
                font-size: 14px;
                text-shadow: var(--oc-header-text-shadow);
            }
            .opts-btn-wrap {
                display: flex;
                flex-flow: row wrap;
            }
            .radio-wrap {
                display: flex;
                flex-flow: row wrap;
                align-content: center;
                /*width: 280px;*/
                justify-content: space-evenly;
            }
            .radio-wrap span:first-child {
                font-size: 16px;
                font-family: arial;
                margin-right: 0px 10px 0px 10px;
                align-content: center;
                display: flex;
                flex-flow: row wrap;
            }
            #xoptsWrap.xoptsMobile > div.radio-wrap span:first-child {
                margin: 0px 2px 0px 0px;
            }
            .radio-wrap label {
                display: flex;
            }
            .sp {
                margin-right: 4px;
            }
            .inner-wrap {
                border: 1px solid #666;
                border-radius: 4px;
                display: flex;
                padding: 4px 8px 4px 8px;
                display: flex;
                /*width: 130px;*/
                justify-content: space-between;
            }
        `);
    }

})();