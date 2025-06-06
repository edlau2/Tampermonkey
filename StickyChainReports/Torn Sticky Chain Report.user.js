// ==UserScript==
// @name         Torn Sticky Chain Report
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Make header sticky on war/chain report
// @author       xedx [2100735]
// @match        https://www.torn.com/war.php*
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
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

// Sample URL: https://www.torn.com/war.php?step=chainreport&chainID=41832240
// 41964765 <-- 100k
// https://www.torn.com/war.php?step=chainreport&chainID=46099408
// ^^ Carbon

(function() {
    'use strict';

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);
    const userId = getThisUserId();
    var userSelector = `ul.members-names-rows > li > div > div[class^='honorWrap_'] > a[href="/profiles.php?XID=${userId}"]`;
    var warPage = false;
    var myLi;
    var myFacSelector;
    var myFacTarget;
    var enemyFacTarget;

    function handleSortClick(e) { scrollToMyLi();}

    function scrollTo(elem) {
        if (!myFacTarget) {
            log("Error: No target set!");
            debugger;
            return;
        }
        log("scrollTo: ", $(elem));
        let scrollTo = $(elem);
        let pos = $(elem).offset().top - $(myFacTarget).offset().top + $(myFacTarget).scrollTop() - 150;
        displayHtmlToolTip($(elem), ("#" + ($(elem).index()+1)), "tooltip4");
        $(myFacTarget).animate({scrollTop: pos});
    }

    var classAdded = false;
    function scrollToMyLi(retries=0) {
        //if (!root) root = myFacTarget;

        let myHonor = $(userSelector);
        log("Selector: ", userSelector);
        log("[scrollToMyLi] myHonor: ", $(myHonor).length, $(myHonor));

        if ($(myHonor).length == 0) {
            if (retries++ < 20) return setTimeout(scrollToMyLi, 200, retries);
            return log("Timeout: scrollToMyLi");
        }
        retries = 0;


        myLi = $(myHonor).closest("li");
        log("[scrollToMyLi] myLi: ", $(myLi).length, $(myLi));

        /*
        let honors = $(root).find("[class^='honorWrap_'] > a");
        for (let idx=0; idx < $(honors).length; idx++) {
            let node = $(honors)[idx];
            let href = $(node).attr("href");
            log("found hef: ", href);
            if (href.indexOf(userId) > -1) {
                log("found my ID");
                myLi = $(node).parent().parent().parent();
                if (warPage == true) myLi = $(myLi).closest("li");
                */
        if ($(myLi).length) {
            let infoBox = $(myLi).find("[class*='userInfoBox_']");
            if (warPage == false) $(infoBox).addClass("xedx-stb");
            let memRows = $(".members-stats-rows > li.members-stats-row");
            let idx = $(myLi).index();
            let member = $(memRows)[idx];
            if (warPage == true)
                $(myLi).addClass("xedx-stb");
            else
                $(member).addClass("xedx-stb");

            log("Found my LI: ", $(myLi));
            scrollTo(myLi);
            return;
        } else {
            log("[scrollToMyLi] didn't find myLi!");
        }
    }

    function getSpanForChainId() {
        GM_addStyle(`
            #xchain-span {
                display: inline-flex;
                /*flex-wrap: wrap;*/
                padding-left: 10px;
                padding-top: 6px;
            }
            #chain-id {
                margin-left: 10px;
                margin-top: -2px;
            }
        `);
        let element = `
            <span id='xchain-span'><label for="chain-id">Chain ID:</label><input type="text" id="chain-id" name="chain-id"></span>
        `;
        return element;
    }

    // War report - add area to enter chain ID
    function doWarPageLoad(retries=0) {
        debug("doWarPageLoad");
        if ($("#xchain-span").length > 0) return;
        let title = $("#skip-to-content");
        if (!$(title).length) {
            if (retries++ < 20) return setTimeout(doWarPageLoad, 500, retries);
            return log("[doWarPageLoad] Too many retries!");
        }
        let node = getSpanForChainId();
        $(title).after(node);
    }

    // Look for chain report link to open in new tab
    function doFacPageLoad(retries=0) {
        let link = $(".report-link");
        debug("Loading, looking for rpt link: ", $(".report-link").length, $(".report-link"));
        if ($(link).length == 0) {
            if (retries++ < 30) return setTimeout(doFacPageLoad, 200, retries);
            debug("[doFacPageLoad] too many retries");
            return;
        }

        let url = $(link).attr("href");
        let uberDiv = "<div id='xwrap'></div>";
        $(link).wrap($(uberDiv));
        $("#xwrap").on('click', function() {
            debug("Report btn clicked, opening in new tab");
            window.open(url, '_blank').focus();
            return false;
        });
    }

    function addTargetHandlers() {
        $(myFacTarget).addClass("sticky-wrap");
        $(enemyFacTarget).addClass("sticky-wrap");
        if (warPage == true)
                $(".members-cont .c-pointer").css({"position": "sticky", "top": 0, "z-index": 9999999});
            else
                $("ul.report-stats-titles").css({"position": "sticky", "top": 0, "z-index": 9999999});

        scrollToMyLi();

        $(".c-pointer").on('click', function(e) {
            setTimeout(handleSortClick, 250);
        });
    }

    function getTargetNodes(addHandlers=false, retries=0) {
        myFacSelector = ".report-members-stats-content";
        if (warPage == true) {
            myFacSelector = ".your-faction .members-cont";
            myFacTarget = $(myFacSelector)[0];
            enemyFacTarget = $(".enemy-faction .members-cont")[0];
        } else {
            myFacTarget = $(myFacSelector)[0];
        }

        if($(myFacTarget).length == 0) {
            if (retries++ < 40) return setTimeout(getTargetNodes, 250, addHandlers, retries);
            return log("[getTargetNodes] Too many attempts for '", myFacSelector, "'");
        }

        if (addHandlers == true)
            addTargetHandlers();
    }

    // Main entry once page loads
    function handlePageLoad(retries=0) {
        debug("handlePageLoad");

        let params = new URLSearchParams(location.search);

        let href = location.href;
        if (href.indexOf("factions.php") > -1) { return doFacPageLoad(); }

        // Ranked War report - can lookup chain IDs?
        // Iterate backwards, use "to="
        // https://api.torn.com/faction/?selections=chains&to=1729850258&key=
        if (params.get("step") == "rankreport") {
            warPage = true;
            doWarPageLoad();
        }

        getTargetNodes(true);
    }

    logScriptStart();
    addToolTipStyle();
    addBorderStyles();

    GM_addStyle(`
        .xedx-stb {
            background-color: rgba(108,195,21,.07) !important;
            cursor: pointer;
        }

        .sticky-wrap {
            max-height: 90vh;
            overflow-y: scroll;
            top: 0px;
            position: sticky;
            padding-right: 17px;
            box-sizing: content-box;
            width: 100%;
        }
        .report-members-stats {
           overflow: hidden;
           width: 100%;
           height: 100%;
        }
    `);

    callOnContentComplete(handlePageLoad);

})();