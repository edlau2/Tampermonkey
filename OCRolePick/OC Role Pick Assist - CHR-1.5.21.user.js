// ==UserScript==
// @name         OC Role Pick Assist - CHR
// @namespace    http://tampermonkey.net/
// @version      1.5.21
// @description  Assists in finding best OC and role to join
// @author       colaman32 - better by xedx [2100735] ;-)
// @match        https://www.torn.com/factions.php?step=your*
// @connect      api.torn.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_info
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @license      MIT
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

//OC Role Display - CHR
(async function() {
    'use strict';

    // ID: AKfycbyXa-UJj-habhEkCFuq3m7gRWHX4p-4Ki-oWdHPq9p2L1R917CTL6RgxfwoMoEFdHcx
    // URL: https://script.google.com/macros/s/AKfycbyXa-UJj-habhEkCFuq3m7gRWHX4p-4Ki-oWdHPq9p2L1R917CTL6RgxfwoMoEFdHcx/exec?action=cpr

    const isMobile = !isDesktop();
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);    // Enables more verbose logging
    var showCrimeScore = GM_getValue("showCrimeScore", false);
    var preferredLvl = GM_getValue("preferredLvl", 'any');
    var pausedOcsFirst = GM_getValue("pausedOcsFirst", true);

    GM_setValue("showCrimeScore", showCrimeScore);
    GM_setValue("preferredLvl", preferredLvl);
    GM_setValue("pausedOcsFirst", pausedOcsFirst);

    // =========================== Little helper fns =================================
    const recruitingIdx = 0, planningIdx = 1, completedIdx = 2;
    const tabNames = ["Recruiting", "Planning", "Completed"];
    const getBtnSel = function (btnIdx){ return `#faction-crimes [class^='buttonsContainer_'] button:nth-child(${(btnIdx+1)})`;}
    const getRecruitingTab = function () { return $(getBtnSel(recruitingIdx));}
    const getPlanningTab = function () { return $(getBtnSel(planningIdx));}
    const getCompletedTab = function () { return $(getBtnSel(completedIdx));}
    const btnIndex = function () {return $("#faction-crimes [class^='buttonsContainer_'] > [class*='active_']").index();}
    const pageBtnsList = function () {return $("#faction-crimes [class^='buttonsContainer_'] button");}
    const onRecruitingPage = function () {return (btnIndex() == recruitingIdx);}
    const onPlanningPage = function () {return (btnIndex() == planningIdx);}
    const onCompletedPage = function () {return (btnIndex() == completedIdx);}
    const getTabName = function (tab) { return $(tab).find("[class*=['tabName_']").text(); }

    // ================= Color Coding the slots, based on CPR ===================

    const defaultLevel6 = 70;
    const defaultLevel5 = 65;
    const defaultLevel4 = 65;
    const defaultLevel3 = 65;
    const defaultLevel2 = 65;
    const defaultDecline = 700;

    // Can be modified by overrides
    var ocRoles = [
        { OCName: "Blast From The Past",
          Positions: { "PICKLOCK #1": 70, "HACKER": 70, "ENGINEER": 70, "BOMBER": 70, "MUSCLE": 70, "PICKLOCK #2": 0 }},
        { OCName: "Stacking the Deck",
          Positions: { "HACKER": 65, "IMPERSONATOR": 65, "CAT BURGLAR": 65, "DRIVER": 65 }},
        { OCName: "Ace in the Hole",
          Positions: { "HACKER": 65, "DRIVER": 55, "MUSCLE #1": 63, "IMPERSONATOR": 65, "MUSCLE #2": 63 }},
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

    // Overrides URL
    const overrideUrl = `https://script.google.com/macros/s/AKfycbx0C7DzF0ztcNLDTCGszkjsgnVmfKzzS0sUJR68Y57qzVw3PWSunARc93kCscyYx2G-/exec?action=cpr`;

    const roleMappings = {};

    function getCurrTab() {
        if (location.hash) return new URLSearchParams(location.hash.slice(2)).get("tab");
    }

    // Check for cpr requirement updates
    function checkForUpdates() {
        let details = GM_xmlhttpRequest({
            method:"GET",
            url:overrideUrl,
            //data:data,
            headers: {
                //'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                handleOverrides(response.responseText);
            },
            onerror: function(response) {
                log('onerror', response);
            }
        });

        function getRoleEntryIdx(name) {
            let chk = name.toLowerCase();
            //ocRoles.forEach(entry => {
            for (let idx=0; idx<ocRoles.length; idx++) {
                let entry = ocRoles[idx];
                if (chk == entry.OCName.toLowerCase())
                    return idx;
            };
        }

        function handleOverrides(response, status, xhr) {
            let jsonObj = JSON.parse(response);
            debug("[handleOverrides] success? ", jsonObj.success);
            if (jsonObj.success == false) {
                log("ERROR getting over-rides: ", jsonObj.error);
                return;
            }
            debug("ocRoles before: ", ocRoles);

            let roles = jsonObj.roles;
            let defaults = jsonObj.defaults;
            roles.forEach(entry => {
                let idx = getRoleEntryIdx(entry.OCName);
                let currEntry = (idx != undefined) ? ocRoles[idx] : {};
                //log("currEntry: ", currEntry, " type of positions is ", (typeof currEntry.Positions));
                //log("entry: ", entry, " type of positions is ", (typeof entry.Positions));
                if ((typeof entry.Positions) == 'object') {
                    for (const [pos, req] of Object.entries(entry.Positions)) {
                        //log(entry.OCName, `: currEntry.Positions[${pos}] = `, currEntry.Positions[pos], ` new entry.Positions[${pos}] = `, req);
                        if (currEntry.Positions[pos] == req) {
                            //log("No change in requirement");
                        } else {
                            log("Changing ", entry.OCName, `: currEntry.Positions[${pos}]: `, currEntry.Positions[pos], " to ", req);
                            currEntry.Positions[pos] = req;
                        }
                    }
                } else if ((typeof entry.Positions) == 'string') {
                    //log("curr val for ", entry.OCName, " is ", currEntry.Positions, "over-ride is ", entry.Positions);
                    if (currEntry.Positions == entry.Positions) {
                        //log("No change in requirement");
                    } else {
                        log("Changing ", entry.OCName, " defaults from", currEntry.Positions, " to ", entry.Positions);
                        currEntry.Positions = entry.Positions;
                    }
                }
            });

            debug("ocRoles after: ", ocRoles);
        }
    }

    // Test tooltip with fancy features
    // options: { cl: class list
    //            btnSelector: selector of clickable button in tolltip content
    //            btnFn: fn called on btn click
    //            disabled: tbd
    //            hide: tbd
    //            items: tbd
    //            position: tbd
    //            show: tbd
    //            track: tbd
    //          }
    function displayHtmlToolTipEx(node, text, options) {
        let currAttr = $(node).attr("style");
        let newAttr = "white-space: pre-line;" + (currAttr ? currAttr : "");
        $(node).attr("title", "original");
        $(node).attr("data-html", "true");
        $(node).attr("style", newAttr);
        $(node).tooltip({
            content: text,
            classes: {
                "ui-tooltip": options.cl ? options.cl : "tooltip4"
            }
        });

        // Bind the button
        if (options.btnSelector && options.btnFn) {
            $(node).on( "tooltipopen", function( event, ui ) {
                $(options.btnSelector).attr("data-node-id", $(node).attr("id"));
                $(options.btnSelector).on("click", function(e) {
                    options.btnFn(e, $(node));
                });
            } );

            $(node).on("mouseleave", function(e) {
                e.stopImmediatePropagation(); // Prevent tooltip from closing on mouseleave
            });

            $(document).mouseup(function(e) {
                var container = $(".ui-tooltip");
                var trigger = $(node);
                if (!container.is(e.target) && container.has(e.target).length === 0 &&
                    !trigger.is(e.target) && trigger.has(e.target).length === 0) {
                    $(node).tooltip("close");
                }
            });
        }
    }

    function handleToolTipBtn(e, node) {
        debug("handleToolTipBtn: ", e);
        debug("node: ", $(node));
        let target = $(e.currentTarget);
        let ocName = $(target).attr('data-name');
        const ocData = ocRoles.find(o => o.OCName.toLowerCase() === ocName.toLowerCase());
        let tmp = JSON.stringify(ocData.Positions, null, 4);
        let dataStr = tmp.replace(/"/g, "").replaceAll('{', '').replaceAll('}', '').trim();
        $(node).tooltip("close");
        alert(`OC requirements:\n${dataStr}`);
    }

    var crimeList = [];
    var bestCrimeList = [];
    function processScenario(panel) {
        if (!onRecruitingPage()) { return debug("Not on recruit page."); }

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
        //debug("[processScenario] Panel: ", $(panel));
        //debug("[processScenario] Panel has ", slotCount, " slots total, ", slotsWaitCount, " empty");
        let countScoresAdded = 0;
        Array.from(slots).forEach(slot => {
            // get raw role text and chance
            const roleElem      = slot.querySelector("[class*='title_']");
            const chanceElem    = slot.querySelector("[class*='successChance_']");
            if (!roleElem || !chanceElem) {
                //debug("[processScenario] No role/chance elem for slot! ", $(slot));
                return;
            }

            // detect assigned player
            const honorTexts = slot.querySelectorAll('.honor-text');
            const userName   = honorTexts.length > 1 ? honorTexts[1].textContent.trim() : null;

            // Look for missing items, treat the same as ready, 0% complete
            let inactiveNode = $(slot).find("[class^='slotIcon_'] > div[class^='inactive_']");
            if ($(inactiveNode).length) {
                slotScore = 100;
                hrsToIdle = 24
                scoreHrs += 24;
                scorePct += 100;
                countScoresAdded++;
            }

            let iconNode = $(slot).find("[class^='slotIcon_'] > div[class^='planning_']");
            let style = $(iconNode).attr('style');
            if (style) {
                let idx = style.lastIndexOf(") ");
                if (idx > -1) {
                    let deg = parseFloat(style.slice(idx + 2).split('d')[0]);
                    if (+deg == 0) {
                        slotScore = userName ? 100 : 0;
                        hrsToIdle = userName ? 24 : 0;
                    } else if (+deg == 360) {
                        slotScore = 0;
                        compPct += 100; // Slot 100% done
                        hrsToIdle = 0;
                    } else {
                        slotScore = ((360 - deg)/360)*100;  // percent left
                        compPct += 100 - slotScore;
                        hrsToIdle = 24 - (24 * (slotScore / 100));
                    }
                    hrsToIdle = (24 * (slotScore / 100));
                    scoreHrs += hrsToIdle;
                    scorePct += slotScore;
                    countScoresAdded++;
                }
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

                // Have button pop up a dialog with that crime's cp requirements, and close tooltip.
                // Tooltip can have timer to auto-close, or close on window click
                // https://www.google.com/search?q=jquery+ui+have+tooltip+remain+long+enough+to+click+button+on+it&sca_esv=df549bc08c278101&sxsrf=AE3TifM0URF-AaYDHe0xsul9lRd9Yg6OKQ%3A1753354623184&ei=fxGCaNSAC_ntptQP8dy6wAw&ved=0ahUKEwiUvOv7qtWOAxX5tokEHXGuDsgQ4dUDCBA&uact=5&oq=jquery+ui+have+tooltip+remain+long+enough+to+click+button+on+it&gs_lp=Egxnd3Mtd2l6LXNlcnAiP2pxdWVyeSB1aSBoYXZlIHRvb2x0aXAgcmVtYWluIGxvbmcgZW5vdWdoIHRvIGNsaWNrIGJ1dHRvbiBvbiBpdEjNkwFQAFiLkQFwAHgBkAEAmAHdAaABxzOqAQczMi4zMC4xuAEDyAEA-AEBmAI7oALRNcICBBAjGCfCAgsQABiABBiRAhiKBcICDhAuGIAEGLEDGIMBGIoFwgIREC4YgAQYsQMY0QMYgwEYxwHCAgQQABgDwgILEAAYgAQYsQMYgwHCAgoQIxiABBgnGIoFwgIQEAAYgAQYsQMYQxiDARiKBcICChAAGIAEGEMYigXCAggQABiABBixA8ICBRAAGIAEwgIGEAAYFhgewgILEAAYgAQYhgMYigXCAgUQABjvBcICCBAAGKIEGIkFwgIGEAAYDRgewgIIEAAYgAQYogTCAgUQIRigAcICBRAhGJ8FwgIFECEYqwKYAwCSBwY1LjUzLjGgB4GhA7IHBjUuNTMuMbgH0TXCBwswLjIuMzguMTUuNMgH7gM&sclient=gws-wiz-serp
                let num = getRandomInt(999);
                let help = `Requirement: ${required} cpr
                            <br>Click to see all:
                            <input id="oc-help-${num}" data-name="${ocName}" type="button" class="xhlpbtn xedx-torn-btn oc-role-btn" value="?">`;
                let btnSel = `#oc-help-${num}`;
                displayHtmlToolTipEx($(slot), help, {btnSelector: btnSel, btnFn: handleToolTipBtn});

            } else if (successChance < required) {
                $(slot).addClass('pulse-border-red');
            }

        });

        // If can't do this one, force to end of sorted list
        sortScore = scorePct;
        if (hasChance == false) {
            sortScore = 9999;
        }

        // All empty slots, score will be 0, put in the middle
        if (+scorePct == 0 && pausedOcsFirst == false) sortScore = 200;           // paused and empty in middle
        else if (+scorePct == 0 && slotCount == slotsWaitCount) sortScore = 300;  // empty in middle, paused first, 300 to see what option is set
        if (+scorePct > 100) sortScore = +scorePct + 300;  // One partial, one or more not started but filled, at end

        let entry = {id: parseInt(ocId), lvl: parseInt(level), slots: slots,
                     name: ocName, score: scorePct, scoreHrs: scoreHrs, hrsToIdle: scoreHrs, slotCount: slotCount, waiting: slotsWaitCount,
                     complete: compPct/slotCount, sortScore: sortScore}; //, f: filledSlots, e: emptySlots};

        //debug("[processScenario] Added up ", countScoresAdded, " slots to get score of ", scorePct, "%, ", scoreHrs, " hrs for ", $(panel));

        if (showCrimeScore == true) {
            let tnode = $(panel).find("p[class^='panelTitle_']");
            let dispScore = (debugLoggingEnabled == true) ? (entry.score.toFixed(2) + "/" + entry.sortScore.toFixed(2)) : entry.score.toFixed(2);
            let newTxt = $(tnode).text() +
                ` (score: ${dispScore} or ${entry.scoreHrs.toFixed(2)} hrs to idle, ${entry.waiting}/${entry.slotCount} empty, ${entry.complete.toFixed(2)}% complete)`;
            $(tnode).text(newTxt);
        }

        debug("Created entry: ", entry);
        crimeList.push(entry);
        sortCrimeList();
    }

    var observer;
    var timer = 0;

    function observerOn() {
        if (!observer) return startObserver();
        let targetNode = document.querySelector('#factionCrimes-root') || document.body;
        observer.observe(targetNode, { childList: true, subtree: true });
    }

    function observerOff() { if (observer) observer.disconnect(); }

    function startObserver() {
        if (observer)
            observer.disconnect();
        else {
            observer = new MutationObserver(mutations => {
                if (!onRecruitingPage()) return;
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

        observerOn();
    }

    // =========================== Calculating best OC to join =========================

    // This sort will define the order displayed. Also make a copy
    // sorted by what is defined as best. Should be the same, this is for testing.
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

    // Order by level then score, changes what is displayed first
    function orderByScore(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        debug("[orderByScore] ", listSorted, crimeList.length, preferredLvl, pausedOcsFirst);
        if (!listSorted) return false;
        for (let idx=0; idx<crimeList.length; idx++) {
            let inc = crimeList.length + 1;
            let entry = crimeList[idx];
            let node = $(`div[data-oc-id='${entry.id}']`);
            if (idx == 0) $(node).parent().css({"display": "flex", "flex-direction": "column"});
            if ($(node).length) {
                $(node).attr("data-score", ((pausedOcsFirst == true) ? entry.score : entry.sortScore));
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

    // The 'best' can use raw score (pause first) or sort score, which depends
    // on whther paused OCs are displayed first. May need a list sorted differently
    // from the displayed order. Maybe always have a copy, sorted for 'best' lookup?
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

    function openNow(slide) {
        if ($("#xoptsWrap").hasClass('xclosed')) {
            $("#xoptsWrap").toggleClass("xclosed xopen");
            $("#opts-btn > i").toggleClass("fa-caret-right fa-caret-down");
            if (slide == true) {
                $("#xoptsWrap").slideToggle();
                return;
            }
            $("#xoptsWrap").css("display", "flex");
            $("#xoptsWrap > div > input").css("height", "26px");
        }
    }

    function closeNow(slide) {
        if ($("#xoptsWrap").hasClass('xopen')) {
            $("#xoptsWrap").toggleClass("xclosed xopen");
            $("#opts-btn > i").toggleClass("fa-caret-right fa-caret-down");
            if (slide == true) {
                $("#xoptsWrap").slideToggle();
                return;
            }
            $("#xoptsWrap").css("display", "none");
            $("#xoptsWrap > div > input").css("height", "0px");
        }
    }

    function getOptsDiv() {
        let optsDiv = `
            <div id="xoptsWrap" class="xopen" style="display: flex;">
                <input id="xedx-best-btn" class="xedx-torn-btn"  style="height: 26px;" value="Best Overall">
                <input id="xedx-best-btn7" class="xedx-torn-btn"  style="height: 26px;" value="Best Lvl 7">
                <input id="xedx-best-btn8" class="xedx-torn-btn"  style="height: 26px;" value="Best Lvl 8">
                <input id="xedx-sort-btn" class="xedx-torn-btn"  style="height: 26px;" value="Sort">
                <input id="xedx-default-btn" class="xedx-torn-btn"  style="height: 26px;" value="Default">
            </div>
        `;

        let optsDiv2 = `
            <div id="xoptsWrap" class="xoptsPc xopen" style="display: flex;">
                <div class="xflexr opts-btn-wrap">
                    <input id="xedx-best-btn" type='submit' class="xedx-torn-btn"  style="height: 26px;" value="Best">
                    <input id="xedx-sort-btn" type='submit' class="xedx-torn-btn"  style="height: 26px;" value="Sort">
                    <input id="xedx-default-btn" type='submit' class="xedx-torn-btn"  style="height: 26px;" value="Default">
                </div>
                <div class="xflexr radio-wrap">
                    <span>Preferred Level:</span>
                    <div class="inner-wrap">
                        <label><span class="sp">7:</span><input type="radio" id="lvl7" name="level" value="7"></label>
                        <label><span class="sp">8:</span><input type="radio" id=lvl8" name="level" value="8"></label>
                        <label><span class="sp">Any:</span><input type="radio" id="lvlany" name="level" value="any"></label>
                    </div>
                    <input id="x-help-btn" type="button" class="xhlpbtn xedx-torn-btn" value="?">
                </div>
            </div>
        `;


        return optsDiv2;
    }

    function handleRadioChange(e) {
        e.preventDefault();
        e.stopPropagation();
        preferredLvl = $(this).val();
        GM_setValue("preferredLvl", preferredLvl);
        if (listOrdered == true) orderByScore();
        return false;
    }

    function installUI(retries=0) {
        if ($("#xoptsWrap").length) return;
        const toggleBtn = `<span id="opts-btn"><i class="fas fa-caret-down"></i></span>`;
        let recBtn = $("#faction-crimes-root > div > div[class^='buttonsContainer_'] > button:first-child");
        if (!$(recBtn).length) {
            if (retries++ < 50) return setTimeout(installUI, 250);
            return log("[installUI] timed out");
        }
        $(recBtn).prepend(toggleBtn);
        $("#opts-btn").on('click', handleShowOpts);
        $(recBtn).parent().after(getOptsDiv());

        if (isMobile) {
            $("#xoptsWrap").addClass("xoptsMobile").removeClass("xoptsPc");
        }

        $("#xedx-best-btn").on('click', goToBestChoice);
        $("#xedx-sort-btn").on('click', orderByScore);
        $("#xedx-default-btn").on('click', resetDefaults);

        $("input[name='level']").on('change', handleRadioChange);
        $(`#lvl${preferredLvl}`).prop('checked', true);

        // Hide when not on the recruiting page
        if (!onRecruitingPage()) { closeNow(); }

        let tabBtns = $("#faction-crimes-root > div > div[class^='buttonsContainer_'] > button");
        $(tabBtns).on('click', function(e) {
            if ($(this).index() == +recruitingIdx) {
                observerOn();
                openNow(true);
            } else {
                observerOff();
                closeNow(true);
            }
        });


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

    checkForUpdates();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    versionCheck();
    addStyles();

    callOnContentLoaded(handlePageLoad);

    function addStyles() {
        const highlightBg = "green";
        addTornButtonExStyles();
        addToolTipStyle();
        GM_addStyle(`
            .xhlpbtn {
                width: 22px !important;
                height: 22px !important;
                border-radius: 22px !important;"
                cursor: pointer !important;
                padding: 0px !important;
                line-height: 0px !important;
                font-size: 12px !important;
                margin-left: 10px;
            }
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
            .xoptsPc .radio-wrap {
                margin-left: 40px;
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
                margin: 0px 3px 0px 5px;
            }
            #xoptsWrap.xoptsMobile > div.radio-wrap {
                display: flex;
                justify-content: flex-start;
            }
            .radio-wrap label {
                display: flex;
            }
            .xoptsPc .radio-wrap label {
                /*margin-left: 5px;*/
            }
            .xoptsPc .radio-wrap input[type='radio'] {
                margin-right: 8px;
            }
            .sp {
                margin-right: 4px;
            }
            #xoptsWrap.xoptsMobile .sp {
                padding-right: 3px;
            }
            #xoptsWrap.xoptsMobile .inner-wrap {
                padding: 4px 4px 4px 4px;
            }
            .inner-wrap {
                /*border: 1px solid #666;*/
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