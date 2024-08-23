// ==UserScript==
// @name         Torn Cooldown End Times
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Right-click shows CD end time
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
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

    // TBD: add to all othe icons - med, booster, ...

    // ===================== Convert drug CD to actual time =============================

    var drugCD = 0;
    var boosterCD = 0;
    var medicalCD = 0;
    var handlersInstalled = false;

    function startCdOption () {
        xedx_TornUserQuery(null, 'cooldowns', cooldownsQueryCB);
    //}

        function cooldownsQueryCB(responseText, ID) {
            let jsonResp = JSON.parse(responseText);
            if (jsonResp.error) {
                debug('Response error!');
                return handleError(responseText);
            }

            let cd = jsonResp.cooldowns;
            drugCD = cd.drug;
            boosterCD = cd.booster;
            medicalCD = cd.medical;

            if (!handlersInstalled) {
                installHandleDrugCdDiv();
                //$("[class^='icon53_']").on('click', handleDrugIconClick);
                handlersInstalled = true;
            }
        }

        function addCdStyles() {
            GM_addStyle(`.cdWrapper {
                            position: absolute !important;
                            xwidth: max-content;
                            width: 24px;
                            height: 24px;
                            margin: 0 auto;
                        }
                            .xshowif {
                            display: inline-flex;
                        }`);

            GM_addStyle(".drugCdStyle {" +
                        "background-color: #000000 !important;" +
                        "padding: 5px 15px;" +
                        "border: 2px solid gray;" +
                        "border-radius: 10px;" +
                        "width: max-content;" +
                        "text-align: left;" +
                        "font: bold 14px ;" +
                        "font-stretch: condensed;" +
                        "text-decoration: none;" +
                        "color: #FFF;" +
                        "font-size: 1em;" +
                        "left: 0;" +
                        "}");
        }

        const showCdDiv = `<div id='xedx-show-cd' class='cdWrapper xhide' style='display: none;'>
                               <span id='xcdmsg' class='xhide drugcd drugCdStyle' style='display: none;'></span>
                           </div>`;
        var iconPos;
        function installHandleDrugCdDiv() {
            addCdStyles();
            let root = $("#sidebar").find("[class^='toggle-content_']").find("[class^='status-icons__']").next();
            $(root).after(showCdDiv);

            let msgText = "CD ends: " + new Date(new Date().getTime() + (+drugCD * 1000)).toLocaleTimeString();
            $("#xcdmsg").text(msgText);

            configCdIcon();
        }

        var cfgRetries = 0;
        function configCdIcon() {
            log("configCdIcon: ", cfgRetries);
            let icon = findDrugCdIcon();
            if (!icon) {
                return log("Didn't find CD icon...");
            }

            iconPos = $(icon).position();
            $("#xedx-show-cd").css("top", (iconPos.top));
            $("#xedx-show-cd").css("left", iconPos.left);

            $(icon).on('contextmenu', handleDrugIconClick);
            cmHandleOutsideClicks("xedx-show-cd");

            log("Installed: ", $("#xedx-show-cd"));
        }

        function isDrugCdIcon(anode) {
            log("icon check: ", $(anode));
            if ($(anode).length && $(anode).attr("aria-label")) {
                if ($(anode).attr("aria-label").indexOf("Drug Cooldown") > -1) return true;
            }
            return false;
        }

        function findDrugCdIcon() {
            let list = $("ul[class^='status-icons_'] > li");
            if (!list.length) return;
            for (let idx=0; idx < list.length; idx++) {
                let anode = list[idx];
                if (isDrugCdIcon($(anode).find("a")[0])) {return anode;}
            }
        }

        const toggleClass = function(sel, classA, classB) {
            log("toggleClass");
            if ($(sel).hasClass(classA)) {
                $(sel).removeClass(classA).addClass(classB);
                log("Remove class ", classA, ", add ", classB, " on ", $(sel));
            } else {
                $(sel).removeClass(classB).addClass(classA);
                log("Remove class ", classB, ", add ", classA, " on ", $(sel));
            }
        }

        function doHideShowStyles() {
            if ($("#xedx-show-cd").hasClass("xhide")) {
                $("#xedx-show-cd").attr("style", "display: none;");
            } else if ($("#xedx-show-cd").hasClass("xshow")) {
                $("#xedx-show-cd").attr("style", "display: block;");
            }

            if ($("#xcdmsg").hasClass("xhide"))
                $("#xcdmsg").attr("style", "display: none;");
            else
                $("#xcdmsg").attr("style", "display: inline-flex;");
        }

        function cmHandleOutsideClicks(cmId) {
            $("html").click(function (e) {
                let elem = document.getElementById("xedx-show-cd");
                if ($(elem).hasClass("xhide")) return;
                if (e.target != elem) {
                    log("cmHandleOutsideClicks: ", e);
                    handleDrugIconClick(e);
                }
            });
        }

        // Haven't yet figured out why I get multiple clicks...
        var inClick = false;
        function turnOffClick() {log("turnOffClick"); inClick = false;}

        function handleDrugIconClick(e) {
            log("handleDrugIconClick: ", e);
            if (inClick) return;
            inClick = true;
            setTimeout(turnOffClick, 500);
            if (e) e.stopPropagation();

            toggleClass("#xedx-show-cd", "xhide", "xshow");
            toggleClass("#xcdmsg", "xhide", "xshow");

            doHideShowStyles();
            return false;
        }
    }


    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    callOnContentLoaded(startCdOption);

})();