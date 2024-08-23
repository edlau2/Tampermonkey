// ==UserScript==
// @name         Torn Nerve Bar Context Menu
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      file:////Users/edlau/Documents/Tampermonkey Scripts/Helpers/Torn-JS-Helpers-2.45.3.js
// @xrequire      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.3.js
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

    if (isAttackPage()) return;
    if (abroad() || travelling()) return;

    logScriptStart();

    //addStyles();

    //const contextMenuYOffset = 0;
    //var ctxVisible = false;
    //var nerveBarContext = GM_getValue("nerveBarContext", false);    // Install right-click context menu on nerve bar
    //GM_setValue("nerveBarContext", nerveBarContext);

    //if (nerveBarContext) {
        addContextStyles();
        callOnContentLoaded(installNerveHook);
    //}
    //else {
    //    log("Script not enabled, can enable via an entry in script storage.");
        // $("#x-contextMenu").remove();
    //    return;
    //}

    // ========= Start right click handler for nerve bar

    var nerveBarNode;
    var hookWaiting = false;
    const jailURL = "https://www.torn.com/jailview.php";
    const pointsURL = "https://www.torn.com/page.php?sid=points";
    const hubURL = "https://www.torn.com/loader.php?sid=crimes";
    const crimeCheckKey = "crimeLinksChecked";
    const crimesMax = 12;
    const crimeKeyPrefix = "CrimeLink-";


    function installNerveHook() {
        log("installNerveHook");

        const nerveCmId = "x-contextMenu";
        const nerveCmSel = "#" + nerveCmId;
        const nerveMenuSel = "#" + nerveCmId;
        const nerveOptsSel = "#nerve-bar-opts";

        let custCrimeRetries = 0;

        // Delay long enough for custom links (if any) to
        // be installed, unless we've saved them (TBD)
        log("hookWaiing? ", hookWaiting);
        if (!hookWaiting) {
            hookWaiting = true;
            log("setTimeout 1");
            setTimeout(installNerveHook, 1500);
            return;
        }

        nerveBarNode = $("#sidebar").find("a[class*='nerve__']");
        log("nerveBarNode len: ", $(nerveBarNode).length);

        installContextMenu(nerveBarNode, nerveCmId);
        $(nerveCmSel).addClass("xopts-border-89");

        // Insert the LI's that are the menu items
        installDefaultItems();
        installCrimeItems();

        log("setTimeout2");
        setTimeout(updateCrimeLinks, 2000);
        log("[installNerveHook] complete");

        // === end main function, rest are local funcs

        function installDefaultItems() {
            let jailLi = `<li id="jail-top"><a href="` + jailURL + `">Jail</a></li>`;
            let pointsLi = `<li><a href="` + pointsURL + `">Points</a></li>`;
            let hubLi = `<li><a href="` + hubURL + `">Crime Hub</a></li>`;
            let updateLi = `<li id="update-crimes"><a>Update Crimes</a></li>`;

            $("#x-contextMenu > ul").append(jailLi);
            $("#x-contextMenu > ul").append(pointsLi);
            $("#x-contextMenu > ul").append(hubLi);

            log("Appending update URL");
            $("#x-contextMenu > ul").append(updateLi);
            $("#update-crimes").on('click', installCrimeItems);

            let optsLi = `<li id="nerve-opts""><a>Options</a></li>`;
            $("#x-contextMenu > ul").append(optsLi);
            $("#nerve-opts").on('click', handleOptsSelection);

            matchBottomBorderRadius("#nerve-opts", "#x-contextMenu");
            matchTopBorderRadius("#jail-top", "#x-contextMenu");
        }

        function installCrimeItems() {

            // If there aren't any custom crime links,
            // just install with the default options - or have opts to select which ones!
            let crimesList = $("[id*='nav-crimes-cust']");
            if ($(crimesList).length == 0) {
                log("No custom crimes?");
                if (custCrimeRetries++ > 10) return;
                return setTimeout(installCrimeItems, 250);
            }

            custCrimeRetries = 0;
            log("crime list len: ", $(crimesList).length);
            for (let idx=0; idx < $(crimesList).length; idx++) {
                let node = $(crimesList)[idx];
                let href = $($(node).find("a")[0]).attr("href");
                let willBeId = href.substr(href.indexOf("#") + 2);
                let li = "<li id='x-" + willBeId + "'><a href='" + href +
                    "'>" +
                    $($(node).find("span")[0]).text().trim() +
                    "</a></li>";
                let searchSel = "#x-" + willBeId;
                let checkNode = $("#x-contextMenu > ul").find(searchSel);
                if ($(checkNode).length == 0) {
                    $("#nerve-opts").before(li);
                }
            }

            let linksSaved = GM_getValue(crimeCheckKey, false);
            if ($(crimesList).length == 0 && linksSaved) {
                for (let idx=0; idx<crimesMax; idx++) {
                    let savedLi = GM_getValue(crimeKeyPrefix + idx, undefined);
                    if (savedLi) {
                        $("#nerve-opts").before(li);
                    }
                }
            }
        }

        function updateCrimeLinks() {
            log("[updateCrimeLinks]");
            let crimeCount = 0;
            for (let idx=0; idx<crimesMax; idx++) {
                if (GM_getValue(crimeKeyPrefix + idx, undefined)) crimeCount++;
                GM_setValue(crimeKeyPrefix + idx, undefined);
            }
            let crimesList = $("[id^='nav-crimes-cust']");
            for (let idx=0; idx < $(crimesList).length; idx++) {
                let node = $(crimesList)[idx];
                let li = "<li><a href='" +
                    $($(node).find("a")[0]).attr("href") +
                    "'>" +
                    $($(node).find("span")[0]).text().trim() +
                    "</a></li>";

                let key = crimeKeyPrefix + idx;
                GM_setValue(key, li);
            }
            if ($(crimesList).length == crimeCount) return;
            setTimeout(updateCrimeLinks, 5000);
            GM_setValue(crimeCheckKey, true);
        }

        // ****************************** Experimental: overlaid options menu/div ***********************
        // Note: couldn't exchange data with popup due to content security
        //
        const nerveBarOptsDiv = `
             <div id="nerve-bar-opts">
                 <div id="inner-nerve-bar-opts" class="xopts-ctr-screen xopts-bg" style="border: 2px solid red; width: 300px; height: 150px;">
                     <div style="width: 100%;">
                         <ul>
                             <li><span class="xfmt-span"><input name="mygroup" type="radio" id="btn1">Chk 1</span></li>
                             <li><span class="xfmt-span xmb10"><input name="mygroup" type="radio" id="btn2">Chk 2</span></li>
                             <li><span class="xfmt-span xmb10"><input name="mygroup" type="radio" id="btn3">Chk 3</span></li>
                             <li><input type="checkbox" id="chk-box" class="xedx-cb-opts" name="chk-box">
                                 <label for="chk-box">Test Label</label></li>
                         </ul>
                         <span>
                             <button id="opts-save" class="xedx-torn-btn xfmt-span">Save</button>
                             <button id="opts-cancel" class="xedx-torn-btn xfmt-span">Cancel</button>
                         </span>
                     </div>
                 </div>
             </div>`;

        const showMenu = function () {log("showMenu"); $(nerveMenuSel).removeClass("ctxhide").addClass("ctxshow");}
        const hideMenu = function () {log("hideMenu"); $(nerveMenuSel).removeClass("ctxshow").addClass("ctxhide");}
        const showOpts = function () {log("showOpts"); $(nerveOptsSel).removeClass("ctxhide").addClass("ctxshow");}
        const hideOpts = function () {log("hideOpts"); $(nerveOptsSel).removeClass("ctxshow").addClass("ctxhide");}

        function doSwap() {
            if ($(nerveMenuSel).css("display") == "none" || $(nerveOptsSel).css("display") == "block") {
                showMenu();
                hideOpts();
            } else {
                hideMenu();
                showOpts();
            }
        }

        function handleOptsSelection(event) {
            log("handleOptsSelection");
            if ($("#nerve-bar-opts").length == 0) {
                $("body").after(nerveBarOptsDiv);
                $("#opts-save").on('click', doSwap);
                $("#opts-cancel").on('click', doSwap);
            }
            hideMenu();
            showOpts();
        }
    }

    function addStyles() {
        
    }

    // ****************************** End Experimental: overlaid options menu/div ***********************

})();