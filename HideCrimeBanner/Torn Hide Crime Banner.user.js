// ==UserScript==
// @name         Torn Hide Crime Banner
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Add button to hide top banner, highlights crimes with uniques.
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php*
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

    // Some custom options for myself
    const disposalAutoSelectAllAbandon = true;    // On disposal page, select abandon for all at load
    const autoHide = true;                        // Hide immediatelly at load
    const quickDisposeBurglary = false;           // one-click to remove all current burglary targets with no uniques (TBD)
    const preventBtnFlicker = true;               // experimental, burglary only RN - prevent the right crime options buttons
                                                  // from flickering on hover. Seems that when the background of the button
                                                  // changes (goes away?), the size changes to 0 hence the flicker.
    var autoHilghlightUniques = true;             // Highlight crimes with available uniques, just makes more obvious
    var autoHideUniqueAbandon = true;             // For burglaries with a unique, hide the abandon button so you can't accidentally click
    var autoClickYesOnAbandon = true;             // If true, auto-click the 'yes' confirmation on abandon ("quick abandon")

    const dispOptsScreen = true;                  // Experimental: animated options screen, the kinda button to the left of "Sho/Hide"

    // Note: right-click handling has been added for certain crimes.
    // On Disposal, it selects (or de-selects) 'abandon' for all.

    // For burglary, will dispose of all non-unique ones in your list.
    // The "autoClickYesOnAbandon" option must be true for this to work.

    // Enable for debug logging...
    debugLoggingEnabled = false;

    // TBD: experiment with history.pushState, hash change won't work anymore?

    // ==================================

    function pushStateChanged(e) {
        let thisCrime = getThisCrime();
        log("PS changed! thisCrime: '", thisCrime, "'");
        log("pushStateChanged: ", e);
        log("hash: ", window.location.hash);
        if (autoHide) hideBanner(true);
        setTimeout(addHideBannerBtn, 500);
    }

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

    // =====================================

    const helpBtnIDs = {
        "searchforcash" : 16343473, "bootlegging" : 16341811, "graffiti" : 16344567,
        "shoplifting" : 16346491, "cardskimming" : 16350490, "burglary" : 16353303,
        "pickpocketing" : 16358739, "hustling" : 16363421, "disposal" : 16367936,
        "cracking" : 16373016, "forgery" : 16388086
    };

    const hideBannerBtn = `<button id="xedx-banner-btn" value="Hide" style="margin-right: 10px;" class="torn-btn">
                               <span class="chlps">Hide</span>
                           </button>`
    const optsBtn = `<button id="x-opts-btn" class="xhlpbtn"><span class="copts">*</span></button>`;
    const hideBannerBtnOrg = $(`<input id="xedx-banner-btn" type="submit" value="Hide" class="btn silver xedx-hide-btn">`);
    const fakeDiv = $(`<div id="hide-crime-fake-div" class="xedx-fake"><!-- fake div, forces correct spacing --></div>`);
    const helpIcon = `<i class="info-icon"></i>`;
    const helpBtn = `<input id="x-help-btn" type="button" class="xhlpbtn xedx-torn-btn" value="?">`
    const helpBtn2 = `<button id="x-help-btn" class="xhlpbtn"><span class="chlps">?</span></button>`;
    const helpBtnOrg = `<button id="x-help-btn" class="torn-btn"><span class="chlps">?</span></button>`;
    const caretNode = `<span style="float:right;"><i id="xcaret" class="icon fas fa-caret-down xedx-caret"></i></span>`;

    // Instead of "?" ...

    // Maybe display uniques left on title bar? See if stat always available...
    // $("#crime-stats-panel > div > div.panelContent___zLds1 > div.slick-slider.slickSlider___vZRuA.slick-initialized >
    // div.slick-list > div > div:nth-child(2) > div > div > button:nth-child(4) > span.value___Q3ZWA.copyTrigger___m_sge")

    // Caret for opts:
    /*
    let cs_caretState = 'fa-caret-down';

        installCollapsibleCaret("nav-city");

        function installCollapsibleCaret(nodeName) {
            //debug("[custLinks - installCollapsibleCaret] nodeName: ", nodeName);

            if (!nodeName) nodeName = "nav-city";
            let selName = "#" + nodeName;
            let nodeId = nodeName + "-collapse";

            if (document.querySelector("#" + nodeId)) {
                log("collapse node exists, not adding again!");
                return;
            }

            debug("[custLinks - installCollapsibleCaret] nodeName: ", nodeName, " ID: ", nodeId, " sel: ", selName);

            const caretNode = `<span style="float:right;"><i id="` + nodeId + `" class="icon fas fa-caret-down xedx-caret"></i></span>`;
            cs_caretState = GM_getValue(nodeName + 'cs_lastState', cs_caretState);
            if (!document.querySelector("#sidebarroot")) return "'#sidebarroot' not found, try again later!";
            if (document.getElementById('xedx-collapse')) document.getElementById('xedx-collapse').remove();
            if (!document.querySelector(selName)) return selName + "' not found, try again later!";

            // Set parents to 'flex', allow divs to be side-by-side
            document.querySelector(selName).setAttribute('style', 'display:block;');
            document.querySelector(selName + " > div > a").setAttribute('style', 'width:auto;height:23px;float:left;');

            // Add the caret and handler.
            let target = document.querySelector(selName + " > div");
            if (!target) return selName + " > div' not found, try again later!";
            $(target).append(caretNode);

            let handlerSel = "#" + nodeId;
            debug("custLinks - add handler to ", handlerSel);

            $(handlerSel).on('click', {from: nodeName}, cs_handleClick);
        }

        function cs_handleClick(e, optParam) {
            debug('[custLinks - cs_handleClick] state = ' + cs_caretState);

            let rootNodeName = "nav-city";
            if (e && e.data && e.data.from)
                rootNodeName = e.data.from;

            let nodeId = rootNodeName + "-collapse";
            let nodeSel = "#" + nodeId;
            let targetNode = document.querySelector(nodeSel); // e.target

            debug("[custLinks - cs_handleClick] optParam: ", optParam);
            debug("[custLinks - cs_handleClick] rootNodeName: ", rootNodeName);
            debug("[custLinks - cs_handleClick] nodeId: ", nodeId);
            debug("[custLinks - cs_handleClick] nodeSel: ", nodeSel);
            debug("[custLinks - cs_handleClick] targetNode: ", targetNode);
            if (e)
                debug("[custLinks - cs_handleClick] e.target: ", e.target);

            let elemState = 'block;';
            if (cs_caretState == 'fa-caret-down') {
                targetNode.classList.remove("fa-caret-down");
                targetNode.classList.add("fa-caret-right");
                cs_caretState = 'fa-caret-right';
                elemState = 'none;';
            } else {
                targetNode.classList.remove("fa-caret-right");
                targetNode.classList.add("fa-caret-down");
                cs_caretState = 'fa-caret-down';
            }

            GM_setValue(rootNodeName + 'cs_lastState', cs_caretState);

            // These need unique indicators (ID's) under 'city', 'home', etc.
            // let custLinkId = rootId + "-" + key;
            let partialID = rootNodeName + "-custlink-";
            debug("[custLinks - cs_handleClick] partial ID: ", partialID);
            $("[id^=" + rootNodeName + "-custlink-]").attr("style", "display: " + elemState);
        }
    }
    */

    function findUniqueOutomesReceived() {
        let outcomes = $("button > span[class*='copyTrigger_']").filter(function( index ) {
                console.log($(this).text()); return ($(this).text() == 'Unique outcomes');
              });
        return outcomes;
    }

    var bannerHidden = false;
    var bannerHeight = 0;
    var bannerArea;

    var initRetries = 0;
    const maxInitRetries = 10;

    function initBannerArea() {
        let thisCrime = getThisCrime();
        if (!thisCrime || thisCrime == '') {
            log("hideBanner: Not on a crime page, maybe hub?");
            return;
        }

        bannerArea = $("[class^='currentCrime'] > [class^='bannerArea']");
        log("initBannerArea, retries: ", initRetries, " len: ", $(bannerArea).length);
        if (!$(bannerArea).length) {
            if (initRetries++ > maxInitRetries) return;
            return setTimeout(initBannerArea, 250);
        }

        if (bannerHeight == 0 && $(bannerArea).css("height") > 0) {
            bannerHeight = $(bannerArea).css("height");
        }
        log("Banner height: ", bannerHeight);
        if (bannerHeight == 0) bannerHeight = 150;

        addHideBannerBtn();
    }

    function hideBanner(forceHide) {
        let thisCrime = getThisCrime();
        if (!thisCrime || thisCrime == '') {
            log("hideBanner: Not on a crime page, maybe hub?");
            return;
        }

        bannerArea = $("[class^='currentCrime'] > [class^='bannerArea']");
        log("hideBanner, len: ", $(bannerArea).length);

        if (forceHide && $(bannerArea).length == 0) {
            return setTimeout(hideBanner, 250, true);
        }

        if (bannerHeight == 0 && $(bannerArea).css("height") > 0) {
            bannerHeight = $(bannerArea).css("height");
            log("Saving height: ", bannerHeight);
        }

        // Change this to animate!!!
        log("hideBanner, hidden: ", bannerHidden, " display: ", $(bannerArea).css('display'), " forceHide: ", forceHide);
        if (forceHide) {
            $(bannerArea).addClass("xshow");
            handleBannerBtn(bannerArea, bannerHeight);

            /*
            $(bannerArea).css('display', 'none');
            $("#xedx-banner-btn > span.chlps").text('Show');
            bannerHidden = true;
            */
            return;
        }

        handleBannerBtn(bannerArea, bannerHeight);

        /*
        if (bannerHidden) {
            $(bannerArea).css('display', 'block');
            $("#xedx-banner-btn > span.chlps").text('Hide');
            bannerHidden = false;
        } else {
            $(bannerArea).css('display', 'none');
            $("#xedx-banner-btn > span.chlps").text('Show');
            bannerHidden = true;
        }
        */
    }

    const handleClick = function (e) {
        log("click! e: ", e);
        e.preventDefault();
        hideBanner();
    }

    const uiCheck = function () {if (!$("#xedx-banner-btn").length) initBannerArea();}

    // This adds the button on load (or page change), the title div
    // and child title node are global just for convenience.
    var titleDiv, title, currCrime;
    var uniquesTimer;
    var addBannerRetries = 0;
    const maxBannerRetries = 20;
    var intTimer;

    // Revisit all this - can prob just put help and either caret or bottom down area (a little 'pull' thingy)
    // and ditch fake div?....
    //
    // Also single animate fn, make on button class, pull in torn-btn to it...can remove the !important...

    function addHideBannerBtn() {
        clearInterval(intTimer);
        let thisCrime = getThisCrime();

        log("addHideBannerBtn for: '", thisCrime, "' (retry #" + addBannerRetries + ")");
        if (!thisCrime || thisCrime == '') {
            log("Must be at the hub, going home...");
            return;
        }

        //if (autoHide) hideBanner(true);

        log("autoHide is: ", autoHide);
        //if ($("#xedx-banner-btn").length > 0) {
        if ($("#x-help-btn").length > 0) {
            debug("Btn exists! ", $("#x-help-btn"));
            //if (autoHide) hideBanner(true);
            addClickHandlers();
            fixupBtnsForFlicker();
            return;
        }
        currCrime = $("[class^='currentCrime']");

        if (!$(currCrime).length) {
            addBannerRetries++;
            if (addBannerRetries > maxBannerRetries) {
                log("Too many retries (", addBannerRetries, "), giving up.");
                return;
            }
            return setTimeout(addHideBannerBtn, 500);
        }

        addBannerRetries = 0;

        // Only add to the top DIV, not the spans beneath!
        title = $(currCrime).find("div[class^='title_']");

        // may need to adjust title width. Do before adding buttons to
        // prevent weird text movement
        let reqTitleWidth = getCrimeTitleWidth();
        log("req title width: ", reqTitleWidth);
        if (reqTitleWidth) $(title).css("width", reqTitleWidth);

        // Get distance between crime title and next element (result counts)
        // May not always need, def do for cracking.
        // NOTE: Not needed, use technique in jail scores? Although
        // here, more dynamic content on RH side...
        //
        // Note 2: replaced big hide button with an invisible btn
        // on top of the 'medal' in the middle of the banner...
        let xdiff = distBetweenNodes();
        debug("Adding button before ", $(title));
        if ($(title).length) {
            //$(title).before(optsBtn);
            $(title).before(caretNode);
            //$(title).before(hideBannerBtn);
            $(title).after(fakeDiv);
        }

        //debug("Button: ", $("#xedx-banner-btn"));
        debug("Fake div: ", $("#hide-crime-fake-div"));

        // Add help button
        $("#hide-crime-fake-div").before(helpBtn);

        // test...replacement for big banner btn
        let testDiv = `<div id="test-div" class="center"></div>`;
        //let ctrBtn = $("[class^='centerSlot']")[0];
        //let ctrBtn = $(currCrime).find("[class^='centerSlot']")[0];
        let ctrBtn = $("[class^='currentCrime']").find("[class^='centerSlot']");
        $(ctrBtn).after(testDiv);
        //log("all ctr btns: ", $("[class^='centerSlot']"));
        log("ctrBtn: ", $(ctrBtn));

        // Add a right-click handler to the fake div, for misc custom stuff
        //$("#hide-crime-fake-div").on('contextmenu', handleRightClick);

        let btn = $("#xedx-banner-btn");
        let xuse = xdiff - btn.width();

        // Change height to dynamic. better yet add 2nd button just on the disposals sscreen
        GM_addStyle(`.xedx-fake {width: ` + xuse.toString() + `px; height: 34px;}`);
        debug("hide-crime-fake-div, width: ", $("#hide-crime-fake-div").css("width"));

        addClickHandlers();

        // Safety net if push state handler and hash change handler not called.
        intTimer = setInterval(uiCheck, 1000);

        if (autoHide) hideBanner(true);

        if (preventBtnFlicker) fixupBtnsForFlicker();
        if (disposalAutoSelectAllAbandon && location.hash.indexOf("disposal") > 0) {
            setTimeout(handleRightClick, 500);
        }
        // Should really add an observer, some crimes, like
        // burglary, pickpocketing, can pop up uniques while
        // doing the crimes....
        //log("Highlighting uniques...");
        // Need to always do to flag uniques, for right-click
        if (true || autoHilghlightUniques || autoHideUniqueAbandon) {
            uniquesTimer = setInterval(highlightUniques, 1000);
            highlightUniques();
        }

        // Same for this, do in observer...
        setInterval(addHandlerToCloseBtns, 1000);
        addHandlerToCloseBtns();

        // Add the options panel
        if (dispOptsScreen && $("#xedx-crime-opts").length == 0) {
            log("Adding options panel");
            let optsDiv = getOptionsDiv();
            $(title).parent().after(optsDiv);
            $("#xedx-crime-opts").css("height", optsDivHeight);
        }


        // Test - make into function
        /*
        log("Locating uniques already found...");
        let node = findUniqueOutomesReceived();
        log("node: ", $(node));
        log("text: ", $(node).text());
        let value = $(node).siblings("[class^='value_']")[0];
        log("Value: ", $(value).text());
        */
    }

    function addClickHandlers() {
        log("[addClickHandlers]");

        /*
        let ctrBtn = $("[class^='centerSlot']")[0];
        if (!$(ctrBtn).hasClass("xtemp")) {
            $(ctrBtn).addClass("xtemp");
            $(ctrBtn).css("pointer-events", "auto");
            $(ctrBtn).on('click', handleClick);
            //$("#xedx-banner-btn").prop('value', 'Hide');
            log("hide handler added? ctrBtn: ", $(ctrBtn));
        }
        */

        // hmm this someho broke...
        if (!$("#test-div").hasClass("xtemp")) {
            $("#test-div").addClass("xtemp");
            $("#test-div").css("pointer-events", "auto");
            $("#test-div").on('click', handleClick);
            //$("#xedx-banner-btn").prop('value', 'Hide');
            log("hide handler added? test-div: ", $("#test-div"));
        }

        /*
        if (!$("#xedx-banner-btn").hasClass("xtemp")) {
            $("#xedx-banner-btn").addClass("xtemp");
            $("#xedx-banner-btn").on('click', handleClick);
            $("#xedx-banner-btn").prop('value', 'Hide');
            log("#xedx-banner-btn added");
        }
        */

        if (!$("#hide-crime-fake-div").hasClass("xtemp")) {
            $("#hide-crime-fake-div").addClass("xtemp");
            $("#hide-crime-fake-div").on('contextmenu', handleRightClick);
            log("#hide-crime-fake-div added");
        }
        if (!$("#x-help-btn").hasClass("xtemp")) {
            $("#x-help-btn").addClass("xtemp");
            $("#x-help-btn").on('click', handleHelpBtn);
            log("#x-help-btn added");
        }

        /*
        if (!$("#x-opts-btn").hasClass("xtemp")) {
            $("#x-opts-btn").addClass("xtemp");
            $("#x-opts-btn").on('click', handleOptsBtn);
            log("#x-opts-btn added");
        }
        */

        if (!$("#xcaret").hasClass("xtemp")) {
            $("#xcaret").addClass("xtemp");
            $("#xcaret").on('click', handleOptsBtn);
            log("#x-opts-btn added");
        }
    }

    // ========== Options button and panel handlers ==========
    var inAnimation = false;
    function optsAnimate(size) {
        log("optsAnimate, inAnimation: ", inAnimation, " size: ", size);
        inAnimation = true;

        $( "#xedx-crime-opts" ).animate({
            height: size,
        }, 1500, function() {
            optsHideShow();
            inAnimation = false;
        });
    }

    function optsHideShow() {
        let dataval = $("#xedx-crime-opts").attr("data-val");
        $("#xedx-crime-opts").attr("data-val", "");
        log("optsHideShow, dataval: ", dataval);
        if (dataval == "none") return;

        // Check for animate-specific data-val first
        if (dataval == "hide") {
            $("#xedx-crime-opts").removeClass("xshow").addClass("xhide");
            return;
        }
        if (dataval == "show") {
            $("#xedx-crime-opts").removeClass("xhide").addClass("xshow");
            return;
        }

        if ($("#xedx-crime-opts").hasClass("xshow")) {
            $("#xedx-crime-opts").removeClass("xshow").addClass("xhide");
        } else {
            $("#xedx-crime-opts").removeClass("xhide").addClass("xshow");
        }
    }

    function handleOptsBtn() {
        log("handleOptsBtn, animating: ", inAnimation);
        if (inAnimation) return;

        if ($("#xedx-crime-opts").hasClass("xshow")) {
            $("#xedx-crime-opts").attr("data-val", "hide");
            optsAnimate(0);
        } else {
            $("#xedx-crime-opts").removeClass("xhide").addClass("xshow");
            $("#xedx-crime-opts").attr("data-val", "none");
            optsAnimate(optsDivHeight);
        }
    }
    // ========== End Options button and panel handlers ==========

    // ***************************
    // I am duplicating the opts animation for now for the banner
    // Will make one common fn later....
    //
    // ========== Banner button and panel handlers ==========
    var elInAnimation = false;
    function elementAnimate( element, size) {
        log("elementAnimate, inAnimation: ", elInAnimation, " size: ", size);
        log("element: ", $(element));
        elInAnimation = true;

        $(element).animate({
            height: size,
        }, 1500, function() {
            elementHideShow(element);
            elInAnimation = false;
        });
    }

    function elementHideShow(element) {
        let dataval = $(element).attr("data-val");
        $(element).attr("data-val", "");
        log("elementHideShow, dataval: ", dataval);
        if (dataval == "none") return;

        // Check for animate-specific data-val first
        if (dataval == "hide") {
            $(element).removeClass("xshow").addClass("xhide");
            return;
        }
        if (dataval == "show") {
            $(element).removeClass("xhide").addClass("xshow");
            return;
        }

        if ($(element).hasClass("xshow")) {
            $(element).removeClass("xshow").addClass("xhide");
        } else {
            $(element).removeClass("xhide").addClass("xshow");
        }
    }

    function handleBannerBtn(element, maxHeight) {
        log("handleBannerBtn, animating: ", elInAnimation);
        if (elInAnimation) return;

        if ($(element).hasClass("xshow")) {
            $(element).attr("data-val", "hide");
            elementAnimate(element, 0);
        } else {
            $(element).removeClass("xhide").addClass("xshow");
            $(element).attr("data-val", "none");
            elementAnimate(element, maxHeight);
        }
    }
    // ========== End Options button and panel handlers ==========


    //
    // ***************************

    // Right-click selects 'abandon' for all disposal crimes
    // Can add options for other crimes....
    function handleRightClick() {
        let crime = getThisCrime();
        debug("handleRightClick: ", crime);

        //if (location.hash.indexOf("disposal") > 0) doDisposalClick();
        if (crime == "disposal") doDisposalClick();

        // Add what we want for other crimes...
        //if (location.hash.indexOf("burglary") > 0) doBurglaryClick();
        if (crime == "burglary") doBurglaryClick();

        return false;
    }

    function doDisposalClick() {
        if (location.hash.indexOf("disposal") < 0) return;

        debug("Selecting 'abandon'");
        let nodes = $("#react-root").find("[class*='abandon_']"); //.click();
        debug("nodes: ", $(nodes));
        $(nodes).click();
    }

    function doBurglaryClick() {
        log("Burglary right-click");

        abandonNonUniques();
    }

    const doAdandonClick = function (node) { $(node).click();}
    function abandonNonUniques() {

        // ATM clears all non-unique crimes that are available.
        // The option "autoClickYesOnAbandon" must be enabled,
        // otherwise won't work (no real need to actually check it)
        if (autoClickYesOnAbandon) {
            let btnList = $("[class*='closeButton_']").filter(function( index ) {
                return !$(this).hasClass('x-has-unique');
              });

            log("abandonNonUniques, list: ", $(btnList));

            if ($(btnList).length > 1 && confirm("Abandon targets without uniques?")) {
                // Note we skip the first one, the slider panel
                let delay = 250;
                for (let idx=1; idx<$(btnList).length; idx++) {
                    let node = $(btnList)[idx];
                    if ($(node).hasClass('x-has-unique')) continue;
                    if ($(node).hasClass('hidden-close')) continue;
                    setTimeout(doAdandonClick, delay, node);
                    delay += 250;
                }
            }
        }
    }

    // Experimental: prevent buttons from flickering, seems that on hover,
    // the button style changes and 'shrinks' it to no width - force the parent min width.
    function fixupBtnsForFlicker() {
        let width = getWidthForFlickerFix();

        // not really working....

        let widthText = "min-width: " + width + " !important;";
        //log("fixupBtnsForFlicker, width: ", widthText);
        $("div[class^='crimeOptionWrapper__']").find("[class^='title_']").parent().attr("style", widthText);
        $("div[class^='crimeOptionWrapper__']").find("[class*='commitButtonSection_']").parent().attr("style", widthText);

        // Def in burgle. Selectors are wrong...
        //let btns = $("div[class^='crimeOptionWrapper__']").find("[class*='commitButtonSection_']");
        //log("fixupBtnsForFlicker: commitButtonSection_ len: ", $(btns).length);
        //$("div[class^='crimeOptionWrapper__']").find("[class*='commitButtonSection_']").css("min-width", width);

        //btns = $("div[class^='crimeOptionWrapper__']").find("[class^='commitButton_']");
        //log("commitButton_: commitButtonSection_ len: ", $(btns).length);

        //
        // BURGLE -- NOT 60, 125!!!
        //
        //$("div[class^='crimeOptionWrapper__']").find("[class*='commitButton_']").css("min-width", width);

        //$("div[class^='crimeOptionWrapper__']").find("[class^='childrenWrapper']").css("min-width", "60px");
        // Def in burgle
        doChildWrap();
        setTimeout(fixupBtnsForFlicker, 500);
    }

    // Def in burgle
    function doChildWrap() {
        let width = getWidthForFlickerFix();
        $("div[class^='crimeOptionWrapper__']").find("[class*='childrenWrapper']").css("min-width", width);
        //setTimeout(doChildWrap, 500);
    }

    function getWidthForFlickerFix() {
        let crime = getThisCrime();
        if (crime == "burglary") return "125px";
        if (crime == "shoplifting") return "100px";

        let width = $("div[class^='crimeOptionWrapper__']").find("[class^='title_']").parent().css("width");
        log("parent width: ", width);

        if (crime == "disposal") {
            return "110px";
        }

        log("CHECK EACH CRIME AND GET RIGHT WIDTH!!");
        return "100px";
    }

    function handleCloseBtn(e) {
        log("handleCloseBtn, e: ", e);

        if (autoClickYesOnAbandon) {
            let node = e.currentTarget;
            
            let relative = $(node).closest("[class^='crimeOptionWrapper_']");
            let abandon = $(relative).find("[class^='abandonConfirmation__']");
            let btns = $(abandon).find("[class^='buttons_']");
            let yesNoBtns = $(btns)[0];
            let yesBtn = $(yesNoBtns).find('button')[0];
            
            $(yesBtn).css("border", "solid 2px red");
            let root = $(yesBtn).parent().parent();
            $(root).css("border", "solid 2px blue");

            //log("pre yn-cb: style: ", $(root).attr("style"));
            setTimeout(function (param) {$(param).attr("style", "display: none;");}, 200, root);

            if(!$(yesBtn).length)
                setTimeout(simulateMouseClick,  100, yesBtn);
            else
                simulateMouseClick(yesBtn);

            //log("Doing click on ", $(yesBtn));
            //$(yesBtn).addClass('xc1');
            //$(yesBtn).click();
        }
    }

    //--- Simulate a natural mouse-click sequence.
    var ynRetries = 0;
    const maxYnRetries = 20;
    function simulateMouseClick(targetNode, retries=0) {
        //log("yes-no btn: ", $(targetNode));

        // See if hidden, must be better way...
        /*
        let hiddenNode = $(targetNode).parent().find("[class*='hidden']");
        log("hidden nodes: ", $(hiddenNode));

        if ( $(targetNode).parent().is($("[class~='button']"))){
            log("Found partial class button on parent");
        }
        */
        let dataLabel = $(targetNode).attr("data-label");
        //log("data: ", dataLabel);

        if (!$(targetNode).length) {
            //log("missing node, ynRetries: ", ynRetries, " retries: ",
            //    retries, " data-val: ", $(targetNode).attr('data-val'));
            if (ynRetries++ > maxYnRetries) {
                //log("Max retries exceeded for ", $(targetNode));
                ynRetries = 0;
                return;
            }
            //log("Setting timeout for: ", $(targetNode));
            return setTimeout(simulateMouseClick, 100, targetNode, ynRetries);
        }
        ynRetries = 0;

        triggerMouseEvent (targetNode, "mouseover");
        triggerMouseEvent (targetNode, "mousedown");
        triggerMouseEvent (targetNode, "mouseup");
        triggerMouseEvent (targetNode, "click");

        // Mark as 'clicked'
        $(targetNode).attr('data-val', 'xclick');
        $(targetNode).addClass("xedx-clicked");
        setTimeout(logXedxClass, 1500);

        //log("Clicked for: ", $(targetNode));
    }

    function logXedxClass() {
        log("Locate class: ", $(".xedx-clicked"));
        $(".xedx-clicked").click();
    }

    function triggerMouseEvent (node, eventType) {
        var clickEvent = document.createEvent ('MouseEvents');
        clickEvent.initEvent (eventType, true, true);

        node.dispatchEvent (clickEvent);
    }

    // This adds an event handler to the close buttons without uniques
    // for the purpose and doind "quick dispose" - don't have to click
    // "yes" and also to auto-dispose, on right click, all non-unique
    // burgalries.
    //
    // The fake xburgle-temp class has two purposes - prevent
    // adding the handler twice, and also make finding the
    // clickable button nodes easy to find.
    function addHandlerToCloseBtns() {
        let closeBtnList = $("[class*='closeButton_']");
        //debug("Close buttons: ", $(closeBtnList));

        $(closeBtnList).on('click', function (e) {
            let node = e.currentTarget;
            // if ($(node).attr('data-val') == 'xclick') return;
            if (!$(node).hasClass("xburgle-temp")) {
                $(node).addClass("xburgle-temp");
                handleCloseBtn(e);
            }
        });
    }

    // Burglary: disable the abandon button on uniques
    // to avoid accidentally clicking it.
    function disableAbandonOnUniques() {
        let closeBtnList = $("[class*='closeButton_']");
        for (let idx=0; idx<$(closeBtnList).length; idx++) {
            let node = $(closeBtnList)[idx];
            let grandpa = $(node).parent().parent().parent();

            let uniques = $(grandpa).find("[class^='uniqueStar_']");
            if ($(uniques).length) {
                if (autoHideUniqueAbandon) {
                    $(node).css("display", "none");
                    $(node).css("pointer-events", "none");
                }
                $(node).addClass('x-has-unique');
            }
        }
    }

    function highlightUniques() {
        let uniques = $("[class^='uniqueStar_']");

        if ($(uniques).length) {
            for (let idx=0; idx < $(uniques).length; idx++) {
                let node = $(uniques)[idx];
                let rp = $(node).parent().parent();

                // Make text yellow if highlighting is enabled
                if (autoHilghlightUniques) {
                    if (location.hash.indexOf("burglary") > 0) {
                        let svgNode = $(rp).find("svg")[0];
                        $(svgNode).attr("stroke", "yellow");
                    } else {
                        let btnTitle = $(rp).find("[class^='title_']")[0];
                        $(btnTitle).css("color", "yellow");
                    }
                }

                // :Find abandon btn...and disable it.
                if (autoHideUniqueAbandon) {
                    let close = $(node).closest(".crime-option-sections");
                    let btn = $(close).find("[class^='closeButton_']");

                    if (!$(btn).hasClass("hidden-close")) $(btn).addClass("hidden-close");
                    if (!$(btn).hasClass("x-has-unique")) $(btn).addClass('x-has-unique');
                }
            }
        }
    }

    // Get the URL for the nice forum posts for each crime.
    // When clicking the help icon, will ope in a new tab.
    function handleHelpBtn() {
        const baseURL = "https://www.torn.com/forums.php#/p=threads&f=61&t=";
        let crime = getThisCrime();
        let ID = helpBtnIDs[crime];
        if (ID) openInNewTab(baseURL + ID);
    }

    function openInNewTab(url) {
      window.open(url, '_blank').focus();
    }

    function getCrimeTitleWidth() {
        let cr = getThisCrime();
        if (cr == "searchforcash") return "120px";

        return undefined;
    }

    function getThisCrime() {

        let tmp = location.hash.substring(location.hash.lastIndexOf('/') + 1);
        return tmp.trim();
    }

    function distBetweenNodes() {
        let resCntNode = $(currCrime).find("[class^='resultCounts_']");
        let xleft = title.position().left + title.width();
        let xright = resCntNode.position().left;
        return (xright - xleft);
    }

    function addStyle() {
        GM_addStyle(`
            .xedx-caret {
                padding-top:5px;
                padding-bottom:5px;
                padding-left:20px;
                padding-right:10px;
             }
            .xedx-cb-opts {
                display: inline-block;
                vertical-align: top;
                margin-top: 10px;
            }
            .copts {
                font-size: 14px;
                display: table;
                margin: 0 auto;
                width: 10px;
                float: left;
                padding-right: 10px;
            }
            .chlps {
                font-size: 14px;
                display: table;
                margin: 0 auto;
                width: 32px;
            }
            .xhide {
                display: none;
            }
            .xshow {
                display: block;
            }
            .xedx-hide-btn {
                margin-left: 10px;
                margin-right: 10px;
                width: 60px;
            }
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
            .xhlpbtn2 {
                width: 32px;
                border: 1px solid gray;
                border-radius: 4px;
                cursor: pointer
            }
            .hidden-close {
                display: none !important;
                pointer-events: none;
            }
            .x10 {
                width: 10px;
            }
            .xedx-ml2 {
                margin-left: 20px;
            }
            .xoptsd {
                font-size: 13px !important;
                height: 60px;
            }
            .xnb:before {
                content: none !important;
            }
            .xedx-torn-btn {
                height: 34px;
                line-height: 34px;
                font-family: "Fjalla One", Arial, serif;
                font-size: 14px;
                font-weight: normal;
                text-align: center;
                text-transform: uppercase;
                border-radius: 5px;
                padding: 0 10px;
                cursor: pointer;
                color: #555;
                color: var(--btn-color);
                text-shadow: 0 1px 0 #FFFFFF40;
                text-shadow: var(--btn-text-shadow);
                background: linear-gradient(180deg, #DEDEDE 0%, #F7F7F7 25%, #CFCFCF 60%, #E7E7E7 78%, #D9D9D9 100%);
                background: var(--btn-background);
                border: 1px solid #aaa;
                border: var(--btn-border);
                display: inline-block;
                vertical-align: middle;
             }
             .center {
                  position: absolute;
                  top:0;
                  bottom:0;
                  left: 44%;
                  right: 40%;
                  margin-top: -26px !important;
                  height: 44px;
                  width: 44px;
                  margin:15px;
                  padding:10px;
                  font-size: large;
                  z-index: 1;
                  border-radius: 44px;
                  border: 1px solid blue;
                  background-color: #00bfa5;
                  color: white;
             }
        `);
    }

    /*

                  left:  30%;
                  right: 30%;
                  bottom:30%;
                  top: 30%;
    */

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (location.href.indexOf("crimes") < 0) {
        log("Not on a crimes page!");
        return;
    }

    addStyle();
    if (autoHide) hideBanner(true);
    callOnContentLoaded(initBannerArea);

    installHashChangeHandler(addHideBannerBtn);

    history.pushState = bindEventListener("pushState");
    window.addEventListener("pushState", function (e) {
        pushStateChanged(e);  // Could directly call addHideBannerBtn() instead
    });

    // hmmm... 30 per inner div, but xoptsd sets height....
    var optsDivHeight = 60;
    function getOptionsDiv() {
        let optsDiv = `
            <div id="xedx-crime-opts"  class="title-black xnb bottom-round xhide" role="heading" aria-level="5">
            <div>
                 <input type="checkbox" data-type="highlight" class="xedx-cb-opts">
                     <span>Highllight Uniques</span>
                 <input type="checkbox" data-type="quick-abndn" class="xedx-cb-opts xedx-ml2">
                     <span>Quick Abandon</span>
                 <input type="checkbox" data-type="autohide" class="xedx-cb-opts xedx-ml2">
                     <span>Auto Hide</span>
             </div>
             <div>
                 <input type="checkbox" data-type="highlight" class="xedx-cb-opts">
                     <span>Right-click, abandon non-unique</span>
                 <input type="checkbox" data-type="highlight" class="xedx-cb-opts">
                     <span>Quick-Click abandon</span>
             </div>
             `;

        return optsDiv;
    }
   

})();





