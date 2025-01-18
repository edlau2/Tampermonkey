// ==UserScript==
// @name         Torn Revives Off Nag
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Pester if revives are on.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
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

    // Times in seconds
    const useApiv2 = true;
    const recheckDelay = 10;       // Seconds to wait if there is an error, before retrying
    const nagSeconds = 10;         // Seconds before checking again, unless at hosp
    const hospNagSeconds = 20;     // Delay before recheck if at hosp already
    var   doNag = false;
    const dontShowForever = false;
    GM_setValue("xalert-checked", dontShowForever);

    const mainMsg = "Revives are on! Please turn off!";
    async function startNagging() {
        let rc = await alertEx(mainMsg);
        if (rc) {
            if (location.href.indexOf('hospitalview') < 0) {
                window.location.href = "https://www.torn.com/hospitalview.php?from=nag";
                return;
            }
        }
        if (location.href.indexOf('hospitalview') > -1) {
            setColorRed();
            return setTimeout(doUserQuery, hospNagSeconds * 1000);
        }
        setTimeout(doUserQuery, nagSeconds * 1000);
    }

    var blinking = false;
    function setColorRed() {
        blinking = true;
        $(".revive-availability-btn").css("color", "var(--revive-availability-btn-everyone-red)");
        redTimer = setTimeout(setColorGreen, 500);
    }

    function setColorGreen() {
        $(".revive-availability-btn").css("color", "var(--revive-availability-btn-everyone-green)");
        if ($("#revive-availability").text() != "Nobody")
            setTimeout(setColorRed, 500);
        else
            $(".revive-availability-btn").css("color", "var(--revive-availability-btn-everyone-red)");
    }

    function userQueryCb(responseText, ID, param) {
        let jsonResp;
        try {
           jsonResp = JSON.parse(responseText);
        }
        catch (err) {
            debug("[userQueryCb] error, invalid JSON");
            debug("[userQueryCb] Will try again in ", recheckDelay * 1000, " seconds");
            debug("Details: ", err);
            debug("response text: ", responseText);
            return setTimeout(doUserQuery, recheckDelay * 1000);
        }

        if (!jsonResp) return handleError(responseText);
        if(jsonResp.revivable > 0) return callOnContentComplete(startNagging);

        //setTimeout(doUserQuery, recheckDelay * 1000);
    }

    function doUserQuery(retry) {
        if (dontShowAgain()) return;

        logt("doUserQuery: ", retry, "|", location.href.indexOf('hospitalview'));
        if (retry != true && location.href.indexOf('hospitalview') > -1) {
            if (!blinking) setColorRed();
            let urlParams = new URLSearchParams(window.location.search);
            let from = urlParams.get('from');
            logt("from: ", from, " secs: ", hospNagSeconds * 1000);
            if (from == 'nag') return setTimeout(doUserQuery, hospNagSeconds * 1000, true);
        }
;
        useApiv2 ? xedx_TornUserQueryv2(null, "profile", userQueryCb) :
                   xedx_TornUserQuery(null, "profile", userQueryCb);
    }

    // ================ Custom alert support ============================

    var alertStylesAdded = false;

    function dontShowAgain() {
        return GM_getValue("xalert-checked", false);
    }

    async function alertEx(mainMsg, cbMsg, btnMsg) {
        if (!alertStylesAdded || !$("#xalert").length)
            addAlertSupport();

        $("#xalert .mainMsg").text(mainMsg);
        if (cbMsg)  $("#xalert label").text(cbMsg);
        if (btnMsg) $("#xalert button").text(btnMsg);

        let rc = await openModalAlert();
        log("openModal rc: ", rc);
        return rc;

        // Local support functions

        async function openModalAlert() {
            $("#xalert").css("display", "block");

            return new Promise(resolve => {
                const okButton = document.getElementById("xalert-ok-btn");
                const cnclButton = document.getElementById("xalert-cncl-btn");
                cnclButton.addEventListener("click", (e) => {resolve(handleClicks(e));});
                okButton.addEventListener("click", (e) => {resolve(handleClicks(e));});
            });

            function handleClicks(e) {
                let target = $(e.currentTarget);
                const checked = $("#xalert-cb")[0].checked;
                GM_setValue("xalert-checked", checked);
                $("#xalert").css("display", "none");
                let rc = $(target).attr("id") == "xalert-ok-btn" ? true : false;
                logt("handleClick, rc: ", rc);
                return rc;
            }
        }

        function addAlertSupport() {
            if (!alertStylesAdded && !$("#xalert").length) {
                GM_addStyle(`
                    #xalert {
                        display: none;
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        width: 300px;
                        height: 150px;
                        transform: translate(-50%, -50%);
                        background-color: var(--default-white-color);
                        padding: 20px 20px 0px 20px;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
                        color: var(--default-black-color);
                        font-size: 14px;
                        font-family: arial;
                    }
                    #xalert button {
                        margin: 10px 25px 10px 25px;
                    }
                    #xalert label {
                        position: absolute;
                        bottom: 10%;
                        left: 50%;
                        transform: translate(-50%);
                        width: 100%;
                        justify-content: center;
                        display: flex;
                    }
                    #xalert input {
                        margin-right: 10px;
                    }
                    .mainMsg {
                        padding: 20px 0px 20px 0px;
                        font-size: 16px;
                    }
                    .alert-content {
                        position: relative;
                        display: flex;
                        flex-flow: column wrap;
                        align-content: center;
                        height: 100%;
                    }
                    .xbtn-wrap {
                        display: flex;
                        flex-flow: row wrap;
                        justify-content: center;
                    }
                `);
                alertStylesAdded = true;
            }

            let newDiv = `
                <div id="xalert">
                    <div class="alert-content">
                        <p class='mainMsg'></p>
                        <span class="xbtn-wrap">
                            <button id="xalert-cncl-btn" class="xedx-torn-btn" data-ret="false">Later</button>
                            <button id="xalert-ok-btn" class="xedx-torn-btn" data-ret="true">OK</button>
                        </span>

                        <label for="xalert-cb">
                        <input type="checkbox" id="xalert-cb">
                        Do not show again (until refresh)
                        </label>
                    </div>
                </div>
            `;

            $("body").append(newDiv);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    if (isAttackPage()) return log("Won't run on attack page!");

    logScriptStart();
    validateApiKey();

    doUserQuery();

})();