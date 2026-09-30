// ==UserScript==
// @name         Torn Pickpocketing Colors
// @version      1.33
// @namespace    https://github.com/Korbrm
// @description  Color based on risk, disables ones too risky
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @author       Korbrm [2931507]
// @license      MIT License
// @match        https://www.torn.com/page.php?sid=crimes*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/


// If too many hidden, offer reload btn?
//  $("[class*='clock_'][class*='hidden']")
// $("[class*='clock_']")


(function() {
    'use strict';

    const isTornPDA = typeof window.flutter_inappwebview !== 'undefined';
    const dbgLogPda = false;

    function log(...data) { console.log(GM_info.script.name + ': ', ...data); }
    log(" Script started, version ", GM_info.script.version);

    function pdaLog(...data) { if (isTornPDA == true && dbgLogPda == true) log(...data); }

    // Make sure we are on the pickpocketing page, if not, disconnect everything
    function isPickpocketingPage() { return (location.href.indexOf('pickpocketing') > -1); }
    function validatePickpocketingPage() {
        if (isPickpocketingPage() == false) {
            if (reloadInt) clearInterval(reloadInt);
            if (initTimer) clearInterval(initTimer);
            reloadInt = null; initTimer = null;
            if (skillObserver) skillObserver.disconnect();
            if (nodeObserver) nodeObserver.disconnect();
            skillObserver = null; nodeObserver = null;
            return false;
        } else {
            return true;
        }
    }

    function retry(callback, retries, maxRetries=25, interval=250) {
        if (++retries > maxRetries) return("Timed out for ", callback);
        setTimeout(callback, interval, retries);
    }

    function addHideBannerBtn(retries=0) {
        if ($("#outer-halo").length == 0) {
            let ctrBtn = $("[class^='currentCrime']").find("[class^='centerSlot']");
            if (!$(ctrBtn).length) return retry(addHideBannerBtn, retries);

             GM_addStyle(`
                .center { position: absolute; top:0; bottom:0; left: 44%; right: 40%; margin-top: -26px !important;
                      margin:15px; padding:10px; font-size: large; z-index: 1; color: white; cursor: pointer; }
                 .ctr44 { height: 44px; width: 44px; border-radius: 44px; border: 0px solid blue; }
                 .ctr24 { left: 47%; right: 40%; margin-top: -4px !important; height: 2px; width: 2px; border-radius: 10px; border: 0px solid green; }
                 .halo {  box-shadow: 0 0 50px 8px #48abe0; }
            `);

            let outerDiv = `<div id="outer-halo" class="center ctr44"></div>`;
            let innerDiv = `<div id="inner-halo" class="center halo ctr24"></div>`;

            $(ctrBtn).after(outerDiv);
            $(ctrBtn).after(innerDiv);

            $("#outer-halo").on('click', function() {
                let bannerArea = $("[class^='currentCrime'] > [class^='bannerArea']");
                $(bannerArea).slideToggle();
            });
        }
    }

    const saveResData = GM_getValue("saveResData", false);
    GM_setValue("saveResData", saveResData);

    // Sets up main entry point
    const callOnContentLoaded = function(callback) {
        if (document.readyState == 'loading') {
            document.addEventListener('DOMContentLoaded', callback);
        } else {
            callback();
        }
    }

    // Sets up function to call on hash change
    const callOnHashChange = function (callback) {
        window.addEventListener('hashchange', function() {
            log('The hash has changed! new hash: ' + location.hash);
            callback();}, false);
    }

    // Same for push state
    const bindEventListener = function (type) {
        const historyEvent = history[type];
        return function () {
            const newEvent = historyEvent.apply(this, arguments);
            const e = new Event(type);
            e.arguments = arguments;
            window.dispatchEvent(e);
            return newEvent;
        };
    };

    const installPushStateHandler = function (pushStateChangedHandler) {
        history.pushState = bindEventListener("pushState");
        window.addEventListener("pushState", function (e) {
            pushStateChangedHandler(e);
        });
    }

    const signFmt = (n) => (n >= 0 ? '+' : '') + n;

    // Maybe use disposal colors? https://www.torn.com/forums.php#/p=threads&f=61&t=16367936
    // single place to define colors
    const neonPink = '#FF10F0';

    // The hex and rgba colors are not the same here...
    const xbrightGreen = "#37b04d";
    const brightGreen = "rgba(0, 250, 0, .7)";
    const darkGreen = "#018106";
    const bluish = "rgba(12, 143, 172, 1)";  // actually bluish/teal
    const xyellow = "#f7da00bb";
    const yellow = "rgba(247, 218, 0, .8)";
    const orange = "#F08C00"; //"#f03e3e";
    const red = "#b80d0d";
    const policeBlue = "#7048e8";

    const categoryColorMap = {
        "Safe": brightGreen, "Moderately Unsafe": darkGreen, "Unsafe": yellow, "Risky": orange, "Dangerous": red, "Very Dangerous": policeBlue,
    };

    var sideColorMap = JSON.parse(JSON.stringify(categoryColorMap));
    const thresholds = [
        { min: 0, max: 10, rec: "Safe",
         tier: { "Safe": brightGreen, "Moderately Unsafe": yellow, "Unsafe": orange, "Risky": orange, "Dangerous": orange, "Very Dangerous": policeBlue }},
        { min: 11, max: 35, rec: "Moderately Unsafe",
         tier: { "Safe": brightGreen, "Moderately Unsafe": darkGreen, "Unsafe": yellow, "Risky": orange, "Dangerous": orange, "Very Dangerous": policeBlue }},
        { min: 36, max: 65, rec: "Unsafe",
         tier: { "Safe": brightGreen, "Moderately Unsafe": darkGreen, "Unsafe": darkGreen, "Risky": yellow, "Dangerous": orange, "Very Dangerous": policeBlue }},
        { min: 66, max: 80, rec: "Risky",
         tier: { "Safe": brightGreen, "Moderately Unsafe": brightGreen, "Unsafe": darkGreen, "Risky": darkGreen, "Dangerous": yellow, "Very Dangerous": policeBlue }},
        { min: 81, max: 100, rec: "Dangerous",
         tier: { "Safe": brightGreen, "Moderately Unsafe": brightGreen, "Unsafe": brightGreen, "Risky": brightGreen, "Dangerous": darkGreen, "Very Dangerous": policeBlue }},
    ];

    var nextMapLevel = 0;
    const updateColorMap = (num) => {
        const range = thresholds.find(r => num >= r.min && num <= r.max);
        if (range) {
            sideColorMap = range.tier;
            nextMapLevel = range.max;
        }
    };

    var emptyMarks = {};
    var goodMarks = {};

    function isPastViewportBottom() {
        let vpTop = $(window).scrollTop();
        let vpBottom = vpTop + $(window).height();
        let el = $("div.crime-root.pickpocketing-root > div > div[class*='currentCrime_'] > div[class*='virtualList_'] > div[class*='lastOfGroup']");
        let elTop = $(el).offset().top;
        let elBottom = elTop + $(el).outerHeight();

        log("[isPastViewportBottom] vpt: ", vpTop, " vpb: ", vpBottom, " elt: ", elTop, " elb: ", elBottom);

        return ($(el).length > 0) ? elTop > vpBottom : false;
    }

    function enableRefreshBtn(enable) {
        if (enable == true) {
            log("[enableRefreshBtn] ENABLE!!");
        } else {
            log("[enableRefreshBtn] DISABLE!!");
        }
    }

    function updateRefreshBtn() {
        if (!isPickpocketingPage()) return;
        emptyMarks = $("[class*='clock_'][class*='hidden']");
        goodMarks = $("[class*='clock_']:not([class*='hidden'])");

        enableRefreshBtn($(emptyMarks).length > 3 || isPastViewportBottom());
    }

    function updateRecomendedMax(retries=0) {
        if (!$("#recomend").length) return (retries > 25) ? '' : setTimeout(updateRecomendedMax, 250, retries++);
        let cs = getSkill();
        const range = thresholds.find(r => cs >= r.min && cs <= r.max);
        // log("[updateRecomendedMax] cs: ", cs, " range: ", range);
        if (range) {
            let txt = `Recomended: ${range.rec}`;
            $("#recomend").text(txt);
        }
    }

    const markGroups = {
        "Safe": ["Drunk man", "Drunk woman", "Homeless person", "Junkie", "Elderly man", "Elderly woman"],
        "Moderately Unsafe": ["Classy lady", "Laborer", "Postal worker", "Young man", "Young woman", "Student"],
        "Unsafe": ["Rich kid", "Sex worker", "Thug"],
        "Risky": ["Jogger", "Businessman", "Businesswoman", "Gang member", "Mobster"],
        "Dangerous": ["Cyclist"],
        "Very Dangerous": ["Police officer"],
    };

    const categoryProps = {
        "Safe": { disabled: false, idx: 0, csGain: "100%" },
        "Moderately Unsafe": { disabled: true, idx: 1, csGain: "150%" },
        "Unsafe": { disabled: true, idx: 2, csGain:  "200%" },
        "Risky": { disabled: true, idx: 3, csGain:  "250%" },
        "Dangerous": { disabled: true, idx: 4, csGain: "300%" },
        "Very Dangerous": { disabled: true, idx: 5, csGain: "350%" },
    }


    initRiskMap();

    // <button type="button" class="torn-btn grey commit-button commitButton___NYsg8 disabled btn-dark-bg"
    // aria-disabled="true" aria-label="You have lost the target" data-is-tooltip-opened="false"
    // data-risk="Risky" data-phys="Average, 5'9&quot;, 182 lbs" style="cursor: not-allowed;">

    // <button type="button" class="torn-btn grey commit-button commitButton___NYsg8 btn-dark-bg"
    // aria-disabled="false" aria-label="Pickpocket, 5 nerve" data-is-tooltip-opened="false"
    // data-risk="Safe" data-phys="Average, 5'4&quot;, 170 lbs" style="cursor: pointer;">

    function disableButton(btn, disable=true, forced=false) {
        log("disableButton: ", $(btn), disable);
        let title = $(btn).find("div > span[class^='title']");

        let color = $(title).attr("data-color");
        let dim = .4;
        if (color == darkGreen) dim = .6;
        if (color == brightGreen) dim = .6;
        if (color == yellow) dim = .3;

        // You don't have enough nerve, or the target has been lost
        let label = $(btn).attr("aria-label");
        log("[disableButton] btn: ", $(btn), " disable: ", disable,  " dim: ", dim, " label: ", label);
        if (forced == false && label && (label.indexOf("enough") > -1 || label.indexOf("lost") > -1)) {
            $(btn).addClass("disabled");
            $(btn).attr("aria-disabled", "true");
            $(title).css("filter", `brightness(${dim})`);
        } else if (disable == false) {
            $(btn).removeClass("btn-unsafe disabled");
            $(btn).attr("aria-disabled", "false");
            $(btn).attr("style", "cursor: pointer;");
            $(title).css("filter", "brightness(1)");
            return;
        } else if (disable == true) {
            $(btn).addClass("btn-unsafe disabled");
            $(btn).attr("aria-disabled", "true");
            $(btn).attr("style", "cursor: not-allowed;");
            $(title).css("filter", `brightness(${dim})`);
        }
    }

    function updateTargets() {
        let maxRiskIdx = GM_getValue("maxRisk", 0);
        let btnList = $("button.tpc");
        log("[updateTargets] btns: ", $(btnList), " maxRiskIdx: ", maxRiskIdx)
        for (let idx=0; idx<$(btnList).length; idx++) {
            let btn = $(btnList)[idx];
            let category = $(btn).attr("data-risk");
            //let doDisable = categoryProps[category].disabled;
            let title = $(btn).find("div > span[class^='title']");
            $(title).attr("data-color", categoryColorMap[category]);
            $(title).css("color", categoryColorMap[category]);

            log("[updateTargets] btn: ", $(btn), " cat: ", category, " disable: ", categoryProps[category].disabled);

            disableButton($(btn), categoryProps[category].disabled);
        }
    }
    var riskMapSelected;
    function adjustRiskMap(maxRiskIdx, minRiskIdx=-1) {
        log("[adjustRiskMap] categoryProps ==> idx: ", maxRiskIdx, " map: ", categoryProps);
        if (minRiskIdx == -1) minRiskIdx = +maxRiskIdx - 1;
        let keys = Object.keys(categoryProps);
        for (let i=0; i<keys.length; i++) {
            let entry = categoryProps[keys[i]];
            if (i == maxRiskIdx) riskMapSelected = keys[i];
            entry.disabled = (entry.idx <= maxRiskIdx && entry.idx >= minRiskIdx) ? false : true;
         }
        log("[adjustRiskMap] categoryProps <== map: ", categoryProps);
    }

    function initRiskMap() {
        let risk = parseInt(GM_getValue("maxRisk", null));
        if (!risk || isNaN(risk) || risk < 0 || risk > 5) {
            risk = 0;
            GM_setValue("maxRisk", risk);
        }
        adjustRiskMap(risk);
    }

    function handleRiskSelect(e) {
        let maxRisk = e.target.value;
        if (!categoryProps[maxRisk]) {
            log("[handleRiskSelect] ERROR: no map entry for ", maxRisk);
            return;
        }
        let maxRiskIdx = categoryProps[maxRisk].idx;
        categoryProps[maxRisk].disabled = false;
        adjustRiskMap(maxRiskIdx);

        GM_setValue("maxRisk", maxRiskIdx);

        updateTargets();
    }

    function displayHtmlToolTip(node, text, cl) {
        $(document).ready(function() {
            $(node).attr("title", "original");
            $(node).attr("data-html", "true");
            $(node).tooltip({
                content: text,
                classes: { "ui-tooltip": cl ? (cl + " tt-ws") : "tooltip4 tt-ws" }
            });
        })
    }

    // Just use value set by observer?
    function getSkill() {
        let se2 = $($("li[class*='statistic_'] > button > span[class*='value_']")[0]);
        return $(se2).length ? parseFloat($(se2).text()) : 0;
    }

    // For guides, charts, what have you...
    // put into a DB?
    function saveResult(lastAction) {
        let tm = new Date().getTime();
        let key = `result-${tm}`;

        log("[saveResult] key: ", key, " la: ", lastAction);
        GM_setValue(key, JSON.stringify(lastAction));
    }

    var skillObserver;
    var prevSkill = 0, currSkill = 0;
    function installSkillObserver(retries=0) {
        if (!isPickpocketingPage()) return log("Wrong page, not adding skill observer");
        let target = $($("li[class*='statistic_'] > button > span[class*='value_']")[0]);
        if (!$(target).length) {
            if (retries++ < 50) return setTimeout(installSkillObserver, 250, retries);
            return log("[installSkillObserver] timed out");
        }
        if ($("#skillLevel").length > 0) $("#skillLevel").remove();

        $("#skillLevel").text($(target).text());
        currSkill = parseFloat($(target).text());
        updateColorMap(currSkill);
        updateRecomendedMax();

        const config = { childList: true, subtree: true, characterData: true, characterDataOldValue: true };
        const handleAddedNodes = function(mutationsList, observer) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'characterData') {
                    currSkill = parseFloat(mutation.target.data);
                    prevSkill = parseFloat(mutation.oldValue);
                    let skillDiff = parseFloat(currSkill - prevSkill);

                    //if (currSkill > nextMapLevel) updateColorMap(currSkill);

                    let lastAction = lastActions.pop();
                    if (lastAction) {
                        lastAction.gain = skillDiff;
                        lastAction.newSkill = currSkill;
                        log("Target clicked, result: ", lastAction, " old skill: ", prevSkill, " new: ", currSkill);


                        let spanGainIdSel = "#" + lastAction.spanId;

                        log("Span ID for gain: ", lastAction.spanId);
                        let el = document.getElementById(lastAction.spanId); //$(spanGainIdSel);
                        log("Span ID el: ", el, $(el));
                        log("Span ID inner text: ", document.getElementById(lastAction.spanId).innerText);
                        log("Span ID text: ", $(el).text());
                        if ($(el).hasClass("xss")) return;
                        let txt = $(el).text();
                        let n = signFmt((currSkill - prevSkill).toFixed(2));
                        let gainTxt = (" (" + n + ") ");
                        let newTxt = txt + gainTxt;
                        log("Span ID for gain: ", lastAction.spanId, "el: ", $(el));
                        log("Span ID  txt: ", txt, " new text: ", newTxt);
                        $(el).text(newTxt);
                        $(el).addClass("xss");
                        log("Span ID  new txt: ", $(el).text());

                        if (saveResData == true) {
                            log("Saving result");
                            saveResult(lastAction);
                            log("Result saved?");
                        }
                    }
                    let gain = 0;
                    if (currSkill > prevSkill) {
                        gain = (" (+" + (skillDiff.toFixed(2)) + ") ");
                        $("#skillLevel").addClass("gain");
                        updateRecomendedMax();
                    }
                    if (currSkill < prevSkill) {
                        gain = (" (-" + ((prevSkill - currSkill).toFixed(2)) + ") ");
                        if (currSkill < prevSkill) $("#skillLevel").addClass("loss");
                    }
                    $("#skillLevel").text((mutation.target.data + gain));

                    // if (lastAction) {
                    //     let spanGainIdSel = "#" + lastAction.spanId;
                    //     let el = $(spanGainIdSel);
                    //     let txt = $(el).text();
                    //     log("Span ID for gain: ", lastAction.spanId, "el: ", $(el), " txt: ", txt);
                    //     if (txt) {
                    //         txt = txt + gain;
                    //         $(el).text(txt);
                    //     }
                    // }
                }
            }
        };

        if (!skillObserver) {
            skillObserver = new MutationObserver(handleAddedNodes);
            skillObserver.observe($(target)[0], config);
        }
    }

    var lastActions = [];
    function addToQueue(arr, item, limit=5) {
        arr.push(item);
        if (arr.length > limit)  arr.shift();
    }

    function handleUnlockBtn(e) {
        disableButton($(this), false);
        $(this).on('click', handleClickTarget);
    }

    // Single-click on a disabled button enables it...
    var inClick = false;
    function resetClick() { inClick = false; }
    function handleClickTarget(e) {
        if (inClick == true) return false;
        inClick = true;
        setTimeout(resetClick, 500);
        if ($(this).hasClass('disabled')) { //Did not work...
            e.preventDefault();
            e.stopPropagation();
            log("XXXX locked btn click!!");
            disableButton($(this)[0], false, true);
            return false;
        } else {  // end new
            let category = $(this).attr("data-risk");
            let phys = $(this).attr("data-phys");
            let stars = $(this).find("[class*='uniqueStars_']").length;
            let spanId = $(this).attr("data-gainid");
            addToQueue(lastActions, {cat: category, gain: 0, stars: stars, phys: phys, skill: currSkill, newSkill: 0, spanId: spanId });
        }
    }

    function processNewNode(node, retries=0) {
        pdaLog("[processNewNode] node: ", node);

        let stars = $("[class*='scalableSheetIcon']:not(.xtrag)");
        for (let idx=0; idx<$(stars).length; idx++) { $($(stars)[idx]).addClass("xtrag"); }

        let divElement = $(node).find('[class*="titleAndProps"]:not(.processed)');
        let divElement2 = $(node).find('[class*="titleAndProps"]');
        if (!$(divElement).length && $(divElement2).length > 0) return; //{ return log("[processNewNode] node already processed", $(node)); }
        if (!$(divElement).length) {
            if (retries++ < 40) return setTimeout(processNewNode, 100, node, retries);
            if (isTornPDA == true) {
            log("[processNewNode] timed out for node, len: " + $(node).length);
                log("[processNewNode] node: ", node);
                log("[processNewNode] .titleAndProps len: ", $(node).find('[class*="titleAndProps"]').length);
                log("[processNewNode] .titleAndProps:not len: ", $(node).find('[class*="titleAndProps"]:not(.processed)').length);
            } else {
            log("[processNewNode] timed out for node ", $(node),
                $(node).find('[class*="titleAndProps"]').length,
                $(node).find('[class*="titleAndProps"]:not(.processed)').length);
            }
            pdaLog("[processNewNode] exit");
            return;
        }

        const divContent = $(divElement).find('div:first-child').text().trim();
        const additionalData = $(divElement).find('button[class*="physicalPropsButton_"]');

        pdaLog("[processNewNode] addl data: ", additionalData);
        if (additionalData) {
            const additionalText = $(additionalData).text().trim();
            const text = divContent + ' ' + additionalText;
            const phyProps = $(divElement).find("[class^='physicalPropsButton_']");
            const phys = $(phyProps).attr('aria-label');

            pdaLog("[processNewNode] markGroups: ", markGroups);
            for (const category in markGroups) {
                pdaLog("[processNewNode] cat: ", category);
                if (markGroups[category].some(group => text.includes(group))) {
                    pdaLog("[processNewNode] found group");
                    $(divElement).find('div:first-child').css("color", categoryColorMap[category]);
                    $(divElement).find('div:first-child').attr("data-color", categoryColorMap[category]);

                    pdaLog("[processNewNode] child: ", $(divElement).find('div:first-child').length);

                    let csGain = categoryProps[category].csGain;
                    let spanId = "gain_" + Math.floor(Math.random() * (99999999+1));
                    if (window.innerWidth > 386) {
                        $(divElement).find('div:first-child').text(`${divContent} (${category}, ${csGain})`);
                        $(divElement).find('div:first-child').attr("id", spanId);
                    }

                    //let doDisable = categoryProps[category].disabled;
                    let btn = $(divElement).closest(".crime-option").find("button.commit-button");
                    let title = $(btn).find("div > span[class^='title']");
                    $(title).css("color", categoryColorMap[category]);
                    $(title).attr("data-color", categoryColorMap[category]);
                    $(btn).attr("data-risk", category);
                    $(btn).attr("data-phys", phys);
                    $(btn).addClass("tpc");
                    $(btn).attr("data-gainid", spanId);

                    let disabled = categoryProps[category].disabled;
                    disableButton($(btn), categoryProps[category].disabled);
                    if (categoryProps[category].disabled == false)
                        $(btn).on('click', handleClickTarget);
                    else
                        $(btn).on('contextmenu', handleUnlockBtn);

                    log("xxx Processing new node: ", $(divElement), " cat: ", category);
                    log("xxx Processing new node, props: ", categoryProps);

                    $(divElement).addClass("processed");
                    $(divElement).closest(".virtual-item").addClass("processed").css("border-left", `3px solid ${sideColorMap[category]}`);


                    let target = $(btn).closest(".crime-option-sections").find("[class*='clock']");
                    //log("xxxx [processNewNode] clock: ", $(target));

                    let noClock = false;
                    let tmStr = $(target).text();
                    if (!tmStr) noClock = true;
                    if (tmStr == '0s') noClock = true;
                    //if ($(btn).hasClass('disabled')) noClock = true;
                    let to = 0;
                    if (tmStr) {
                        let hasMin = (tmStr.indexOf('m') > -1) ? true : false;
                        let parts = tmStr.trim().split(' ');

                        log("xxxx text: ", tmStr, " noClock: ", noClock, " hasMin: ", hasMin, " parts: ", parts);
                        if (parts && parts.length) {
                            if (parts.length == 2) {
                                let m = parseInt(parts[0].replace('m', ''));
                                let s = parseInt(parts[1].replace('s', ''));
                                to = m * 60 + s + 2;
                            } else {
                                to = parseInt(parts[0].replace('s', '')) + 2;
                            }
                            log("xxxx  timeout: ", to, " secs");
                        }
                    }

                    let lockId = "lock-" + Math.floor(Math.random() * (99999999+1));
                    let unlockedNode = `<div class="lock-delim"></div>
                                   <div class="lock-wrap unlocked">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-0.69 -0.69 22 22" id="${lockId}" height="22" width="22">
                                              <g id="padlock-square-2--combination-combo-key-keyhole-lock-secure-security-square-unlock-unlocked">
                                                <path id="Subtract" stroke="#dad339aa" stroke-linecap="round" stroke-linejoin="round" d="m7.857938333333334 9.0392925 0.1778475 -3.0285624999999996a2.2780804166666666 2.2780804166666666 0 0 1 4.548428333333333 0 0.4776966666666667 0.4776966666666667 0 0 0 0.47125291666666663 0.44934416666666666c0.7045166666666666 0.008591666666666666 1.3527579166666666 0.02062 1.9455829166666665 0.03436666666666666a0.8402649999999999 0.8402649999999999 0 0 0 0.8578779166666667 -0.9081391666666666A5.154999999999999 5.154999999999999 0 0 0 10.721540833333332 0.8591666666666666h-0.8230816666666666a5.154999999999999 5.154999999999999 0 0 0 -5.137387083333333 4.727135l-0.29641249999999997 3.5535133333333335" stroke-width="1.38"></path>
                                                <path id="Rectangle 1095" stroke="#dad339aa" stroke-linecap="round" stroke-linejoin="round" d="M2.278939583333333 17.328962083333334c0.09966333333333334 1.0653666666666666 0.9609779166666667 1.8227220833333333 2.0302108333333333 1.8759904166666665C5.569977499999999 19.2668125 7.535750833333334 19.33125 10.309999999999999 19.33125c2.7742491666666664 0 4.7400225 -0.06357833333333333 6.0012791666666665 -0.12629749999999998 1.0688033333333333 -0.053268333333333334 1.9301179166666667 -0.8101941666666665 2.0297812499999996 -1.8759904166666665 0.07217 -0.7719612499999999 0.13102291666666666 -1.8128416666666665 0.13102291666666666 -3.1527120833333333 0 -1.3394408333333332 -0.05885291666666667 -2.3807508333333334 -0.13102291666666666 -3.1522825 -0.09966333333333334 -1.0662258333333334 -0.9609779166666667 -1.8231516666666665 -2.0302108333333333 -1.87642C15.050022499999999 9.084828333333332 13.084249166666666 9.02125 10.309999999999999 9.02125c-2.7742491666666664 0 -4.7400225 0.06357833333333333 -6.0012791666666665 0.12629749999999998 -1.0688033333333333 0.053268333333333334 -1.9301179166666667 0.8101941666666665 -2.0297812499999996 1.8759904166666665C2.206769583333333 11.79592875 2.1479166666666667 12.836379583333333 2.1479166666666667 14.17625c0 1.3394408333333332 0.05885291666666667 2.3807508333333334 0.13102291666666666 3.1527120833333333Z" stroke-width="1.38"></path>
                                                <path id="Union" stroke="#dad339aa" stroke-linecap="round" stroke-linejoin="round" d="M11.376225833333333 14.664686249999999a1.7183333333333333 1.7183333333333333 0 1 0 -2.132451666666667 0l-0.2736445833333333 1.1727625c-0.09450833333333333 0.40595624999999996 0.12329041666666665 0.8089054166666666 0.5356904166666667 0.8651808333333332 0.21736916666666667 0.02964125 0.4854291666666666 0.05112041666666666 0.80418 0.05112041666666666 0.3187508333333333 0 0.5868108333333334 -0.021479166666666667 0.80418 -0.05155 0.4124 -0.05584583333333333 0.6306283333333333 -0.458795 0.5356904166666667 -0.8643216666666667l-0.2736445833333333 -1.1731920833333331Z" stroke-width="1.38"></path>
                                              </g>
                                        </svg>
                                   </div>`;

                    let lockedNode = `<div class="lock-delim"></div>
                                   <div class="lock-wrap locked">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-0.69 -0.69 22 22" id="${lockId}" height="22" width="22">
                                       <g id="padlock-key--combination-combo-key-keyhole-lock-secure-security-square-unlock-unlocked">
                                         <path id="Rectangle 1096" stroke="#dad339b0" stroke-linecap="round" stroke-linejoin="round" d="M3.1058875 10.739583333333332c0.013746666666666666 -0.18944624999999998 0.0283525 -0.36686416666666666 0.042958333333333334 -0.5318241666666667 0.097945 -1.0761062499999998 0.9601187499999999 -1.85193375 2.0388025 -1.9099274999999998C6.449334583333333 8.230816666666666 8.409523333333333 8.162083333333333 11.169166666666666 8.162083333333333c2.7600729166666667 0 4.719832083333333 0.06873333333333333 5.981518333333333 0.13574833333333333 1.07868375 0.057993750000000004 1.9408575 0.83382125 2.0383729166666664 1.9099274999999998 0.07732499999999999 0.8475679166666666 0.14219208333333333 2.0147458333333335 0.14219208333333333 3.5389074999999997 0 1.5237320833333334 -0.06529666666666666 2.691339583333333 -0.1417625 3.5389074999999997 -0.097945 1.0761062499999998 -0.9601187499999999 1.8523633333333334 -2.0388025 1.9099274999999998 -0.1881575 0.009880416666666666 -0.39220958333333333 0.020190416666666666 -0.6117266666666666 0.030070833333333335" stroke-width="1.38"></path>
                                         <path id="Subtract" stroke="#dad339b0" stroke-linecap="round" stroke-linejoin="round" d="m13.545621666666666 8.180555416666666 -0.10224083333333332 -1.7406716666666664a2.2780804166666666 2.2780804166666666 0 0 0 -4.54799875 0l-0.10267041666666665 1.7406716666666664m8.114829166666667 0.10481833333333333 -0.18901666666666667 -2.2694887500000003A5.154999999999999 5.154999999999999 0 0 0 11.580277916666667 1.2887499999999998h-0.8230816666666666a5.154999999999999 5.154999999999999 0 0 0 -5.137387083333333 4.727135l-0.18901666666666667 2.2694887500000003" stroke-width="1.38"></path>
                                         <path id="Union" stroke="#dad339b0" stroke-linecap="round" stroke-linejoin="round" d="M4.295833333333333 18.901666666666667a3.007083333333333 3.007083333333333 0 1 1 2.7175441666666664 -4.295833333333333L10.309999999999999 14.605833333333333l3.007083333333333 0a1.2887499999999998 1.2887499999999998 0 0 1 1.2887499999999998 1.2887499999999998v2.1479166666666667a1.2887499999999998 1.2887499999999998 0 1 1 -2.5774999999999997 0v-0.8591666666666666h-0.4295833333333333v0.8591666666666666a1.2887499999999998 1.2887499999999998 0 1 1 -2.5774999999999997 0v-0.8591666666666666h-2.0078725A3.007083333333333 3.007083333333333 0 0 1 4.295833333333333 18.901666666666667Z" stroke-width="1.38"></path>
                                         <path id="Vector 1452" stroke="#dad339b0" stroke-linecap="round" stroke-linejoin="round" d="m3.86625 15.894583333333333 0.8591666666666666 0" stroke-width="1.38"></path>
                                       </g>
                                    </svg>
                                  </div>`;

                    //if (disabled == true) {
                        let newNode = (disabled == true) ? lockedNode : unlockedNode;
                        $(target).after($(newNode));

                        let lid = "#" + lockId;

                        log("xxxx [processNewNode] lock: ", $(lid));

                        if (+to > 0) {
                            log("xxxx setting timeout for ", $(lid), " in ", to, " secs");
                            setTimeout(handleLockTo, (+to * 1000), lid);
                        }

                        if (disabled != true) {
                            $(lid).css("visibility", "hidden");
                            $(lid).css("cursor", "none !important");
                        } else  if (noClock == true)
                            handleLockTo(lid);
                        else
                            $(lid).on('click', handleLockClick);
                    //}

                }
            }
        }
        else {
            log("ERROR no additional data! ", $(divElement));
        }
        pdaLog("[processNewNode] exit");
    }

    function handleLockClick(e) {
        let root = $(this).closest(".crime-option-sections");
        let btn = $(root).find("button.torn-btn")[0];
        disableButton($(btn), false, true);

        $(this).css("visibility", "hidden");
        $(this).css("cursor", "none !important");
    }

    function handleLockTo(selector) {
        let lock = $(selector);
        log("xxxx [handleLockTo] lock: ", $(lock));
        $(lock).css("visibility", "hidden");
        $(lock).css("cursor", "none !important");
        let root = $(lock).closest(".crime-option-sections");
        let btn = $(root).find("button.torn-btn")[0];
        disableButton($(btn), true);
    }

    var nodeObserver, initTimer;
    function processAllNodes(retries=0) {
        if (location.href.indexOf('pickpocket') < 0) return;
        if (!nodeObserver && !initTimer) initTimer = setInterval(processAllNodes, 250);
        let target = $("div.crime-root.pickpocketing-root > div > div[class*='currentCrime_'] > div[class*='virtualList_']");
        if (!$(target).length) { // Should get handled by observer?
            if (retries++ < 25) return setTimeout(processAllNodes, 100, retries);
            return log("No targets yet");
        }

        // Handle existing entries
        let currList = $(target).find(".virtual-item:not(.processed)");

        log("[processAllNodes] $(currList): ", $(currList).length, $(currList));

        if ($(currList).length > 1) {
            for (let idx=1; idx<$(currList).length; idx++) {
                processNewNode($(currList)[idx]);
            }
        }
    }

    function installObserver(retries=0) {
        let target = $("div.crime-root.pickpocketing-root > div > div[class*='currentCrime_'] > div[class*='virtualList_']");
        if (!$(target).length) {
            if (retries++ < 50) return setTimeout(installObserver, 250, retries);
            return log("[installObserver] timed out");
        }

        const config = { childList: true, subtree: true };
        const handleAddedNodes = function(mutationsList, nodeObserver) {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if ($(node).hasClass("virtual-item")) {
                            processNewNode($(node));
                        }
                    }
                }
            }
        };

        if (!nodeObserver) {
            nodeObserver = new MutationObserver(handleAddedNodes);
            nodeObserver.observe($(target)[0], config);
            if (initTimer) {
                clearInterval(initTimer);
                initTimer = null;
            }
            log("[installObserver] started nodeObserver");
        }

        if (!skillObserver) installSkillObserver();

        processAllNodes();
    }

    var reloadInt = null;
    function installUI(retries=0) {
        if ($("#safety-select").length > 0) return;
        if (!location.href.includes("#/pickpocketing")){
            return log("[installUI] wrong page...");
        }

        //let target = $("div[class*='currentCrime'] > div[class*='titleBar'] > div:first-child");
        let target = $("div[class*='currentCrime'] > div[class*='titleBar']");
        if (!$(target).length) {
            if (retries++ < 50) return setTimeout(installUI, 250, retries);
            return log("timed out installing UI");
        }
        log("[installUI] target: ", $(target));
        let titleClass = $(target).attr("class");

        addStyles();

        let optsBar = `<div id="ppOpts" style="display: none;">
                           <div class="select-wrap">
                               <span id="maxRisk" title="original" data-html="true">Max risk:</span>
                                 <select name="safety" id="safety-select">
                                     <option value="Safe">Safe</option>
                                     <option value="Moderately Unsafe">Moderately Unsafe</option>
                                     <option value="Unsafe">Unsafe</option>
                                     <option value="Risky">Risky</option>
                                     <option value="Dangerous">Dangerous</option>
                                     <option value="Very Dangerous">Very Dangerous</option>
                                 </select>
                                 <span id="recomend" title="original" data-html="true">Recomended: Safe</span>
                           </div>
                       </div>`;
        $(target).after(optsBar);

        let optsBtn = `<span id="skillLevel"></span><div class="opts-wrap xedx-torn-btn"><span id="optsBtn">Options</span></div>`;
        $("div[class*='currentCrime'] > div[class*='titleBar'] > div:first-child").after(optsBtn);
        $("#optsBtn").on("click", function() {$("#ppOpts").slideToggle(); } );


        let selectDiv = `<span id="skillLevel"></span>
                         <div class="select-wrap">
                             <span id="maxRisk">Max risk:</span>
                             <select name="safety" id="safety-select">
                                 <option value="Safe">Safe</option>
                                 <option value="Moderately Unsafe">Moderately Unsafe</option>
                                 <option value="Unsafe">Unsafe</option>
                                 <option value="Risky">Risky</option>
                                 <option value="Dangerous">Dangerous</option>
                                 <option value="Very Dangerous">Very Dangerous</option>
                             </select>
                             <span id="recomend">Recomended: </span>
                         </div>
                             `;
        //$(target).after(selectDiv);

        //initRiskMap();
        $("#safety-select").val(riskMapSelected);
        $("#safety-select").on("change", handleRiskSelect);
        $("#skillLevel").text(getSkill());
        updateRecomendedMax();

        displayHtmlToolTip($("#recomend"), "Based on your skill level,<br>this is the recommended max value.");
        displayHtmlToolTip($("#maxRisk"), "Targets with risk above<br>this value will be disabled<br>so you don't accidentally<br>click them.");

        if (!reloadInt)
            reloadInt = setInterval(updateRefreshBtn, 1000);
    }

    function hashChangeHandler() {
        log("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        log("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function handlePageLoad() {
        if (!validatePickpocketingPage()) return;
        processAllNodes();
        installObserver();
        installUI();
        addHideBannerBtn();
    }

    // Set up main entry points
    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);
    callOnContentLoaded(handlePageLoad);

    function addStyles() {
        GM_addStyle(`
            #ppOpts {
                align-items: center;
                background: var(--crimes-crimeHeading-background);
                box-sizing: border-box;
                display: flex;
                height: 34px;
                justify-content: center;
                padding: 1px .625rem 0;
            }
            .lock-delim {
                background: var(--crimes-crimeOption-sectionDelimiter-borderImage);
                height: 50px;
                width: 1px;
            }
            .select-wrap, opts-wrap {
                display: flex;
                flex-flow: row wrap;
                margin-left: -30px;
            }
            .opts-wrap {
                left: 50%;
                position: absolute;
                transform: translateX(-50%);
            }
            #safety-select {
                margin-left: 10px;
                border-radius: 6px;
            }
            .select-wrap > span { align-content: center; }
            .opts-wrap > span { align-content: center; cursor: pointer; }
            .opts-wrap > span:hover { color: yellow; }
            #recomend { margin-left: 10px; }
            #skillLevel { font-size: 16px; margin-left: -350px; }
            #skillLevel.loss { color: red; }
            #skillLevel.gain { color: limegreen; }
            .btn-unsafe {
                cursor: not-allowed;
                pointer-events: none;
            }
            .btn-unsafe div > span[class^='title'] { filter: brightness(.4); }
            .btn-override { border: 1px solid red !important; }
            .xbg { border: 1px solid green; }
            .xbr { border: 1px solid red; }

            .tooltip4 {
                radius: 4px !important;
                background-color: #000000 !important;
                filter: alpha(opacity=80);
                opacity: 0.80;
                padding: 5px 20px;
                border: 2px solid gray;
                border-radius: 10px;
                width: fit-content;
                margin: 50px;
                text-align: left;
                font: bold 14px ;
                font-stretch: condensed;
                text-decoration: none;
                color: #FFF;
                font-size: 1em;
                line-height: 1.5;
                z-index: 999999;
            }
            .tt-ws {white-space: pre-line;}

            /* [class*='scalableSheetIcon'] */
            .xtrag {
                width: 14px;
                height: 14px;
                background: linear-gradient(
                    135deg,
                    #FFF27E 0%,   /* Bright highlight */
                    #FFD700 50%,  /* Classic Gold */
                    #B8860B 100%  /* Deep Gold shadow */
                ) !important;
                -webkit-mask-image: url('/images/v2/crimes/unique-outcome-star-dark.svg');
                mask-image: url('/images/v2/crimes/unique-outcome-star-dark.svg');
                mask-repeat: no-repeat;
                mask-size: 300%;
                mask-position: 0%;
                filter: drop-shadow(0 0 2px rgba(255, 215, 0, 0.5))  !important;
            }
            .lock-wrap {
                height: 30px;
                width: 30px;
                border-radius: 30px;
                border: 1px solid black;
                cursor: pointer;
                display: flex;
                flex-flow: row wrap;
                justify-content: center;
                align-content: center;
            }
            .lock-wrap > svg:hover {
                transform: scale(1.4);
            }
        `);
    }

})();


