// ==UserScript==
// @name         Torn Quick Refill Nerve Button
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Adds a 'quick refill' button to crime and jail pages.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @match        https://www.torn.com/jailview.php*
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

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);
    const dbgBtnAlwaysOn = false;

    const rfcv = getRfcv();
    const updateUrl = "https://www.torn.com/page.php?sid=pointsBuildingData&rfcv=";
    const refillUrl = "https://www.torn.com/page.php?sid=pointsBuildingExchange&rfcv=";

    var statusTimer = null;
    var statusInt = 60000;

    function isCrimePage() {return (location.href.indexOf("sid=crimes") > -1)}

    function refillNerveBar() {
        function nerveRefillCb(response, status, xhr) {
            debug("nerveRefillCb response: ", response);
            clearInterval(statusTimer);
            nerveUpdAvail = false;
            updateRefillBtn();
        }

        let URL = refillUrl + rfcv;
        let postData = {key: "refillNerve"};
        $.ajax({url: URL, type: 'POST', data: JSON.stringify(postData),
            processData: false,
            success: nerveRefillCb,
            error: function(err){console.error("ajax error: ", err);}
        });
    }

    var nerveUpdAvail = false;
    var updateStatusGood = false;
    function updateStatusCb(response, status, xhr) {
        let contentType = xhr.getResponseHeader('Content-Type');
        if (response.success == true) {
            updateStatusGood = true;
            let list = response.list;

            // Just looking at nerve for now...
            // could add energy.
            list.forEach((refill) => {
                if (refill.key == 'refillNerve') {
                    debug("Nerve: ", refill);
                    let wasAvail = nerveUpdAvail;
                    nerveUpdAvail = (refill.owned == false && refill.availableAfter == null);
                    updateRefillBtn();
                    debug(refill.name, (nerveUpdAvail ? " is available" : " is NOT available"),
                        " key: ", refill.key, " after: ", refill.avilableAfter);
                }
            });
        }
    }

    function getNerveAmount() {
        let data = getSidebarData();
        let amt = data.bars.nerve.amount;
        return amt;
    }

    function requestNerveRefill() {
        let nerve = getNerveAmount();
        let msg = "Request a refill?";
        if (nerve > 0)
            msg = msg + "\nYou still have " + nerve + " nerve remaining!\nPress OK to refill or Cancel not to.";
        if (confirm(msg) == true) {
            refillNerveBar();
        }
        checkUpdateStatus();
    }

    function checkUpdateStatus() {
        let URL = updateUrl + rfcv;
        $.ajax({url: URL,
                type: 'GET',
                processData: false,
                success: updateStatusCb,
                error: function(err){console.error("ajax error: ", err);}
            });
    }

    // Using a timer to make sure our button doesn't go away, better to
    // set up an observer...
    var btnTimer = 0;
    function updateRefillBtn() {
        $("#xrefill").off();
        if ((dbgBtnAlwaysOn == false) && nerveUpdAvail == false) {
            $("#xrefill").addClass("x-notavail");
            $("#xrefill").val("Unavailable");
            $("#xrefill").off();
            $("#xrefill").on('click', function(e) {return false;});
        } else {
            $("#xrefill").removeClass("x-notavail");
            $("#xrefill").val("Refill");
            $("#xrefill").off();
            $("#xrefill").on('click', requestNerveRefill);
        }
    }
    function addRefillBtn(retries=0) {
        let hdr;
        if (isJailPage()) {
            hdr = $("#skip-to-content");
        } else {
            hdr = $(".crimes-app-header > h4");
        }
        if (!$(hdr).length) {
            if (retries++ < 20) return setTimeout(addRefillBtn, 250, retries);
            return log("Too many retries, all done.");
        }
        GM_addStyle(`
            #xrefill {
                padding: 2px 10px 2px 10px;
                margin-left: 15px;
                margin-top: -4px;
                height: 32px;
                min-width: 82px;
                border-radius: 8px;
            }
            .x-notavail {
                opacity: .4;
                color: darkgray;
            }
        `);
        let btnSpan = `
            <div class='xflexr xflex-center'>
                <input id="xrefill" type="submit" class="xedx-torn-btn-raw" value="Refill">
            </div>
        `;

        $(hdr).append($(btnSpan));
        $(hdr).addClass("xflexr");

        if ((dbgBtnAlwaysOn == false) && nerveUpdAvail == false) {
            $("#xrefill").addClass("x-notavail");
            $("#xrefill").val("Unavailable");
            $("#xrefill").off();
            $("#xrefill").on('click', function(e) {return false;});
        } else {
            $("#xrefill").on('click', requestNerveRefill);
        }

        if (btnTimer) clearInterval(btnTimer);
        btnTimer = setInterval(btnCheck, 500);
    }

    function btnCheck() {
        if ($("#xrefill").length > 0) return;
        if (btnTimer) clearInterval(btnTimer);
        btnTimer = null;
        addRefillBtn();
    }

    function hashChangeHandler() {checkUpdateStatus(); debug("hash changed: ", location.hash); handlePageLoad();}
    function pushStateChanged(e) {checkUpdateStatus(); debug("push state change"); handlePageLoad();}

    function handlePageLoad() {
        if ($("#xrefill").length > 0) {
            $("#xrefill").parent().remove();
        }
        if (btnTimer) clearInterval(btnTimer);
        btnTimer = null;
        if (isCrimePage() || isJailPage()) {
            addRefillBtn();
        } else {
            return;
        }

        if (statusTimer) clearInterval(statusTimer);
        statusTimer = setInterval(checkUpdateStatus, statusInt);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return;
    if (checkCloudFlare()) return log("Won't run while challenge active!");
    if (!isCrimePage() && !isJailPage()) return log("No jail and no crime, no woman no crime.");

    versionCheck();

    addFlexStyles();
    checkUpdateStatus();

    let sd = getSidebarData();

    callOnHashChange(hashChangeHandler);
    installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);

})();