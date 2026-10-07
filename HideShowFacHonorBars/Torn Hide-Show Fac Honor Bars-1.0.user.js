// ==UserScript==
// @name         Torn Hide-Show Fac Honor Bars
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script does...
// @author       hexedexemal [4030124]
// @match        https://www.torn.com/factions.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", false);    // Extra debug logging
    GM_setValue("debugLoggingEnabled", debugLoggingEnabled);

    var facId;
    function doFacCheck() {
        let okToCheck = false;
        if (location.hash && location.hash.indexOf("tab=info") > 0) okToCheck = true;
        if (location.href.indexOf('step=profile') > 0) {
            let parts = location.href.split('=');
            let temp = parts ? parts[2] : undefined;
            if (temp) {
                parts = temp.split('#');
                let str = parts[0];
                facId = str.replace(/\D/g, "");
            }
            okToCheck = true;
        }
        debug("doFacCheck: ", okToCheck, ", ID: '", facId, "'");

        return okToCheck;
    }

    function hashChangeHandler() {
        debug("[hashChangeHandler]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }

    function pushStateChanged(e) {
        debug("[pushStateChanged]: ", location.href);
        callOnContentLoaded(handlePageLoad);
    }
    
    // ======================== Show/Hide honor bars ================================


    function showHideBars(e) {
        e.preventDefault();
        e.stopPropagation();
        $(".d .honor-text-wrap img:not('.ff-scouter-arrow')").toggleClass("bhide");
        $(".honor-text.honor-text-svg > span").toggleClass("bhide");
        $(".honor-text").toggleClass("bscale");
    }

    const hideBtn =  `<div class="watch4" style="position: absolute; left: 101%; top: 5px; display:flex;">
                          <span id="hideHonors" class="x-round-btn" style="width: 20px;">H</span>
                      </div>`;

    function installHonorBarHandler(retries=0) {
        debug("[installHonorBarHandler]");
        if ($("#hideHonors").length > 0) return debug("[installHonorBarHandler] already installed");

        let target = $(".members-list ul.table-header");
        if (!$(target).length) {
            if (retries++ < 20) return setTimeout(installHonorBarHandler, 250, retries);
            return log("[installHonorBarHandler] timed out.");
        }

        $(target).css("position", "relative");
        $(target).append(hideBtn);
        $("#hideHonors").on("click", showHideBars);


        displayHtmlToolTip($("#hideHonors"), "Hide or Show honor bars<br>Can make the text easier<br>to read.", "tooltip4");
        //debug("[installHonorBarHandler] added button? ", $(target), $("#hideHonors"));
    }

    function handlePageLoad(retries=0) {
        let okToCheck = doFacCheck();
        if (okToCheck == false) {
            return log("Not on fac info page...");
        }

        installHonorBarHandler();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (checkCloudFlare()) return log("Won't run while challenge active!");

    //validateApiKey();
    versionCheck();

    addStyles();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);


    // Add any styles here
    function addStyles() {
         GM_addStyle(`
            .bhide { visibility: hidden; }
            .bscale { transform: scale(1.4); color: white !important; }

            .x-round-btn {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                align-content: center;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
                width: 20px;
                aspect-ratio: 1 / 1;
                border-radius: 50%;
            }
            .xrt-btn {
                margin-left: auto;
                margin-right: 10px;
                float: right;
            }
        `);
    }

})();