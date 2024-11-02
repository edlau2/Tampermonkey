// ==UserScript==
// @name         Torn Sticky Chain Report
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Make header sticky on war/chain report
// @author       xedx [2100735]
// @match        https://www.torn.com/war.php*
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
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

(function() {
    'use strict';

    var userId = GM_getValue("userId", undefined);
    var myLi;

    // Move to shared lib...
    function getId() {
        if (userId) {
            return;
        }
        let tmp = $("#torn-user").val();
        if (!tmp) return;
        let parts = tmp.split('"');
        if (!parts || parts.length < 4) return;
        userId = parts[3];
        GM_setValue("userId", userId);

    }

    function handleSortClick(e) {
        if (findMyLi()) {
            scrollTo(myLi);
        }
    }

    function scrollTo(elem) {
        let target = $(".report-members-stats-content")[0];
        let scrollTo = $(elem);
        let pos = $(elem).offset().top - $(target).offset().top + $(target).scrollTop() - 150;
        displayHtmlToolTip($(elem), ("#" + $(elem).index()), "tooltip4");

       $(target).animate({
          scrollTop: pos
       });
    }

    var classAdded = false;
    function findMyLi() {
        let honors = $("[class^='honorWrap_'] > a");
        for (let idx=0; idx < $(honors).length; idx++) {
            let node = $(honors)[idx];
            let href = $(node).attr("href");
            if (href.indexOf(userId) > -1) {
                myLi = $(node).parent().parent().parent();

                let infoBox = $(myLi).find("[class*='userInfoBox_']");
                log("info-box: ", $(infoBox));
                $(infoBox).addClass("xedx-stb");
                let memRows = $(".members-stats-rows > li.members-stats-row");
                let idx = $(myLi).index();
                let member = $(memRows)[idx];
                $(member).addClass("xedx-stb");
                return myLi;
            }
        }
    }

    function doFacPageLoad(retries=0) {
        let link = $(".report-link");
        if (!$(link).length) {
            if (retries++ < 30) return setTimeout(doFacPageLoad, 200, retries);
            log("too many retries");
            return;
        }

        log("Got link: ", $(link));

        let url = $(link).attr("href");
        let uberDiv = "<div id='xwrap'></div>";
        $(link).wrap($(uberDiv));
        $("#xwrap").on('click', function() {
            window.open(url, '_blank').focus();
            return false;
        });
    }

    // report-link
    function handlePageLoad(retries=0) {
        let href = location.href;
        if (href.indexOf("factions.php") > -1) {
            doFacPageLoad();
            return;
        }

        let target = $(".report-members-stats-content")[0];
        if(!$(target).length) {
            if (retries++ < 10) return setTimeout(handlePageLoad, 250);
            return log("Too many attempts...");
        } else {
            $(target).css("max-height", "90vh"); // bottom margin for TTS footer.
            $(target).css("overflow-y", "auto");
            $(target).css("top", "0px");
            $(target).css("position", "sticky");
            let hdrs = $("ul.report-stats-titles").css({"position": "sticky", "top": 0});
        }

        if (findMyLi()) scrollTo(myLi);
        $(".c-pointer").on('click', function(e) {
            setTimeout(handleSortClick, 250);
        });
    }

    logScriptStart();

    addToolTipStyle();
    addBorderStyles();

    GM_addStyle(".xedx-stb { background-color: rgba(108,195,21,.07); cursor: pointer;}");

    callOnContentLoaded(getId);
    callOnContentComplete(handlePageLoad);

})();