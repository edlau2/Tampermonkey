// ==UserScript==
// @name         Torn Raceway Sorting
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Allows sorting of custom races by start time
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=racing*
// @match        https://www.torn.com/page.php?sid=racing*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @grant        GM_addStyle
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

    if (location.href.indexOf('racing') < 0) return;

    const getCustRaceWrap = function () {return $(".custom-events-wrap");}
    const hasCustRaceWrap = function () {return $(".custom-events-wrap").length > 0;}

    var hidePwdProtect = GM_getValue("hidePwdProtect", false);



    //if (hidePwdProtect == true) updatePwdProtected();
    var pwdInterval; // = (hidePwdProtect == true) ? setInterval(updatePwdProtected, 200): null;

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        setTimeout(handlePageLoad, 250);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        setTimeout(handlePageLoad, 250);
    }

    // =======================================================================

    function updatePwdProtected() {
        if (hidePwdProtect == true) {
            $(".events-list > .protected").attr("style", "display: none;");
        } else {
            $(".events-list > .protected").attr("style", "display: list-item;");
        }
    }

    var prevOrder = 0;
    function doSort(what) {
        let matches = $(".events-list > li");
        let attr = what; //'data-startTime';
        let order = (prevOrder == 0) ? 'asc' : 'desc';
        prevOrder = (prevOrder == 0) ? 1 : 0;
        tinysort(matches, {attr: attr, order: order});
    }

    var inClick = false;
    function resetClickFlag() {inClick = false;}
    function handleBtnClick(e) {
        let target= $(e.currentTarget);
        debug("handleBtnClick: ", $(target));
        if (inClick == true) return false;
        inClick = true;
        let attr;
        if ($(target).hasClass('track')) attr = "data-track";
        if ($(target).hasClass('startTime')) attr = "data-startTime";
        if (!attr) {
            debug("ERROR: invalid click!");
            debugger;
            return;
        }
        doSort(attr);
        setTimeout(resetClickFlag, 500);
        return false;
    }

    function handleStartTimeClick(e) {
        let target= $(e.currentTarget);
        debug("handleStartTimeClick: ", $(target));
        if (inClick == true) return false;
        inClick = true;
        doSort('data-startTime');
        setTimeout(resetClickFlag, 500);
        return false;
    }

    function handleTrackClick(e) {
        debug("handleTrackClick");
        if (inClick == true) return false;
        inClick = true;
        doSort('data-track');
        setTimeout(resetClickFlag, 500);
        return false;
    }

    function handleCatClick(e) {
        let target = e ? $(e.currentTarget) : null;
        let page = $(target).find("a").attr("tab-value");
        debug("handleCatClick: ", page, $(target));

        setTimeout(handlePageLoad, 250);
    }

    function parseTextTime(timeText) {
        // format: 'x h y m", "y m", "waiting"
        let hrs = 0, min = 0;
        if (timeText.indexOf('waiting') > -1) return 0;

        let hasMin = (timeText.indexOf('m') > -1);
        timeText = timeText.replaceAll('\n', '').trim();
        if (timeText.indexOf('h') > -1) {
            let parts = timeText.split('h');
            hrs = parseInt(parts[0]);
            if (hasMin) min = parseInt(parts[1]);
        } else if (timeText.indexOf('m') > -1) {
            let parts = timeText.split('m');
            min = parseInt(parts[0]);
        }

        return hrs * 3600 + min * 60;
    }

    function addSortAttrs() {
        let rootLis = $(".events-list > li");
        for (let idx=0; idx<$(rootLis).length; idx++) {
            let li = $(rootLis)[idx];
            let startTimeNode = $(li).find(".startTime");
            let timeText = $(startTimeNode).text();
            let timeSecs = parseTextTime(timeText);

            if (isNaN(timeSecs)) {
                debug("NaN!!! '", timeText, "' ", $(li), $(startTimeNode));
                debugger;
            }

            let tnode = $(li).find(".track");
            let track = $(tnode).text();

            $(li).attr("data-startTime", timeSecs);
            $(li).attr("data-track", track);
        }
    }

    function addFilterOpts(retries=0) {
        if ($("#xraceWrap").length > 0) return;
        let root = $($(`#racingAdditionalContainer .cont-black.bottom-round`)[0]);
        if ($(root).length == 0) {
            if (retries++ < 20) return setTimeout(addFilterOpts, 250, retries);
            return log("addFilterOpts timeout");
        }

        let btnWrap = $($("#racingAdditionalContainer  .cont-black.bottom-round")[0]).find(".btn-wrap");
        let myWrap = `<div id="xraceWrap" class="xflexr" style="width: 100%;"></div>`;
        $(btnWrap).wrap(myWrap);
        let optsDiv = `
            <div class="xr-opts xflexr">
                <label class="xmr10">Hide pwd protected
                <input type="checkbox" class="xracecb xmr10 xml5" value="hidePwdProtect">
                </label>
            </div>
            `;
        $("#xraceWrap").append(optsDiv);
        $(".xracecb").prop('checked', hidePwdProtect);
        if (hidePwdProtect == true) $(".events-list > .protected").attr("style", "display: none;");
        $(".xracecb").on('change.xedx', function (e) {
            hidePwdProtect = $(this).prop('checked');
            GM_setValue("hidePwdProtect", hidePwdProtect);
            updatePwdProtected();
        });

    }

    function addSortSupport(retries=0) {

        // Get the start time col header
        let startTimeBtn = $("li.startTime.title-divider");
        let trackBtn = $("li.track.title-divider");
        if ($(startTimeBtn).length == 0 && $(trackBtn).length == 0) {
            if (retries++ < 20) return setTimeout(addSortSupport, 250, retries);
            return debug("[handlePageLoad] timeout: ", $(startTimeBtn).length, $(trackBtn).length);
        }

        $(trackBtn).addClass("xsrtbtn");
        $(startTimeBtn).addClass("xsrtbtn");

        $(".xsrtbtn").on('click.xedx', handleBtnClick);

        addSortAttrs();
    }

    function handlePageLoad(retries=0) {

        if (location.href.indexOf('racing') < 0) {
            clearInterval(pwdInterval);
            return;
        }

        addFilterOpts();
        addSortSupport();

        $("ul.categories > li").off('click.xedx');
        $("ul.categories > li").on('click.xedx', handleCatClick);

        clearInterval(pwdInterval);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    if (hidePwdProtect == true) updatePwdProtected();
    pwdInterval = (hidePwdProtect == true) ? setInterval(updatePwdProtected, 200): null;

    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);

    function addStyles() {
        addFlexStyles();
        loadCommonMarginStyles();

        GM_addStyle(`
            .xsrtbtn {
                cursor: pointer;
            }
            .xsrtbtn:hover {
                background: linear-gradient(180deg,#333,#000);
            }
            .xr-opts {
                margin-left: auto;
                float: right;
                align-content: center;
            }
            .xr-opts label {
                font-family: arial;
                font-size: 14px;
            }
        `);

    }

})();