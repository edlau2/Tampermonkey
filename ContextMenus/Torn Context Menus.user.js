// ==UserScript==
// @name         Torn Context Menus
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Add context quick links to several icons and things
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      http://code.jquery.com/jquery-3.4.1.min.js
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

//
// TBD:
// 1. Add stock page
// 2. Add war timer
// 3. Life bar
// 4. Crime bar stuff? Prob keep separate.
// 5. remainder of CD;s
// 6. Storage for options
// 7. TT help or directions page that scrolls.
// 8. See if TTS running and if has stocks enabled?
// 9. Crime list and fn in lib, also string prototype (have install fn for prototypes?)
// 12. Right-click name in chat for bust...
//

(function() {
    'use strict';

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    const installNerveContext = true;
    const installFacContext = true;
    const installCooldownClocks = true;
    const installWarTimer = true;
    const installStockOptions = true;
    const installEventPreviews = false;
    const installCityNavBarCtxt = true;

    var enableDebugger = GM_getValue("enableDebugger", false);

    // =========== Quick test ============
    function getSidebar() {
        let key = Object.keys(sessionStorage).find(key => /sidebarData\d+/.test(key));
        let sidebarData = JSON.parse(sessionStorage.getItem(key));
        return sidebarData;
    }

    getSidebar();
    // ========== End test ==============

    //
    // With dual scroll action the Y may be WAY off if right side is scrolled and not the left...
    // **** CHECK THIS WITH NEW METHOD !!!! ****
    //
    /*
    function isClickInElement(event, elem) {
        let xOK = false, yOK = false;
        let xClick = event.clientX, yClick = event.clientY;
        let elemTop = $(elem).offset().top, elemLeft = $(elem).offset().left;
        let elemBottom = elemTop + $(elem).height(), elemRight = elemLeft + $(elem).width();
        let pos = $(elem).position();

        if (xClick >= elemLeft && xClick <= elemRight) xOK = true;
        if (yClick >= elemTop && yClick <= elemBottom) yOK = true;

        // Compensation for sidebar scrolling.
        if (yClick >= pos.top && yClick <= (pos.top + $(elem).height())) yOK = true;

        return (xOK && yOK);
    }
    */

    // Global filter for right-click on enabled elements, save current menu selector
    var activeCtxMenuSel;
    function filterContextClick(event) {
        debug("click filter, e: ", event);
        debug("data: ", event.data);
        if (event.data) {
            activeCtxMenuSel = event.data.cmSel;
        }
    }

    // ========================== City Sidebar context ======================
    // 
    var cityList = [ {id: "cty-mus", href: "/museum.php", disp: "Museum", enabled: true},
                      {id: "cty-bb", href: "/shops.php?step=bitsnbobs", disp: "Bits and Bobs", enabled: true},
                      {id: "cty-pts", href: "/points.php", disp: "Points Building", enabled: true},
                      {id: "cty-im", href: "/imarket.php", disp: "Item Market", enabled: true},
                      {id: "cty-pawn", href: "/shops.php?step=pawnshop", disp: "Pawn Shop", enabled: true},
                      {id: "cty-nikeh", href: "/shops.php?step=nikeh", disp: "Nikeh Sports", enabled: true},
                      {id: "cty-ah", href: "/amarket.php", disp: "Auction House", enabled: true},
                      {id: "cty-ra", href: "/loader.php?sid=racing", disp: "Race Track", enabled: true},
                      {id: "cty-ta", href: "/travelagency.php", disp: "Travel Agency", enabled: true},
                      {id: "cty-ps", href: "/personalstats.php", disp: "Personal Stats", enabled: true},
                      {id: "cty-bo", href: "/bounties.php#!p=main", disp: "Bounties", enabled: true},
                      {id: "cty-ma", href: "/city.php#map-cont", disp: "City Map", enabled: true},
                      {id: "cty-ql", href: "/city.php#quick-links", disp: "City Links", enabled: true}
                      ];


    function addLiToUL(idx) {
        let id = cityList[idx].id;
        if (document.getElementById(id)) {
            return debug("city node for id ", id, " already exists!");
        }

        let newLi = `<li class="xmed-li-rad">
                          <a href="https://www.torn.com/${cityList[idx].href}" id="${cityList[idx].id}">
                          ${cityList[idx].disp}
                          </a>
                      </li>`;

        $("#xnav > ul").append(newLi);
    }

    function removeLiFromUL(idx) { $(('#'+ cityList[idx].id)).remove(); }

    // Add filter to close as well! Otherwise reverts to hide/show!
    function cityClickFilter(e) {
        $("#xnav").removeClass("ctxhide");
        $("#xnav").animate({
            opacity: 1,
        }, 1000, function() {

        });

        return false;
    }

    function doCityNavContext() {
        installContextMenu("#nav-city", "xnav", {noSample: true, filter: cityClickFilter});
        insertMenuItems();

        $("#xnav").css("border-radius", "10px");
        $("#xnav > ul").css("border-radius", "10px");
        $("#xnav").css("opacity", 0);

        function addOptionsLi() {
            let optsLi = `<li id="city-gen-opts" class="xmed-li-rad" style="border-radius: 10px 10px 0px 0px;"><a>Options</a></li>`;
            $("#xnav > ul").prepend(optsLi);
            $("#city-gen-opts").on('click', handleOptsSelection);
        }

        function insertMenuItems() {
            let fullList = "";
            for (let idx=0; idx < cityList.length; idx++) {
                let key = "city-" + idx + "-enabled";
                let val = GM_getValue(key, cityList[idx].enabled);
                if (cityList[idx].enabled == true) {
                    addLiToUL(idx);
                }
            }

            addOptionsLi();
        }
    }

    function gotoMap(retries=0) {
        let mapLink = $($("#ui-id-1")[0]);
        debug("mapLink: ", $($("#ui-id-1")[0]));
        if ($(mapLink).length > 0) {
            debug("Clicking link: ", $(mapLink));
            $(mapLink).click();
        } else {
            if (retries++ < 10) return setTimeout(gotoMap, 250, retries);
            return;
        }
    }

    function gotoLinks(retries=0) {
        let mapLink = $($("#ui-id-2")[0]);
        debug("mapLink: ", $($("#ui-id-2")[0]));
        if ($(mapLink).length > 0) {
            debug("Clicking link: ", $(mapLink));
            $(mapLink).click();
        } else {
            if (retries++ < 10) return setTimeout(gotoLinks, 250, retries);
            return;
        }
    }

    // Options callback
    function handleCityCbClick(e) {
        let target = $(e.currentTarget);
        let checked = $(target).prop('checked');
        let idx = $(target).attr("index");
        let id = cityList[idx].id;
        if (!checked) {
            removeLiFromUL(idx);
        } else {
            addLiToUL(idx);
        }
    }

    // =============================== events context ===============================
    //
    // TBD - merge in standalone version!!!
    //

    function doEventsContext() {
        const hoverPreview = false;
        const rightClickPreview = !hoverPreview;

        // Last 100 (?) events
        var latestEvents;
        var pageHtml;

        const pageHeader =
                `<div class="eventsListWrapper____jgrS">
                    <div>
                        <ul class="eventsList___uoDYV">`;

        const pageFooter = "</ul></div></div>"

        const templateLiHdr =
                `<li "class="listItemWrapper___XHSAe">
                     <div class="listItem___qQf5B">
                         <div class="contentGroup___FeqLe">
                         <p>`;

        const templateLiFtr = ` </p></div></div></li>`;

        // Main() ....
        doUserEventsQuery();

        function parseResponse(jsonResp) {
            latestEvents = jsonResp.events;
            openNewHtmlDoc();

            let keys = Object.keys(latestEvents);
            for (let idx = 0; idx<keys.length; idx++) {
                let key = keys[idx];
                let eventObject = latestEvents[key];
                let event = eventObject.event;

                if (idx == 0) log("First event: ", event);

                insertLi(event);
            }

            finishHtmlDoc();

            function finishHtmlDoc() {
                pageHtml = pageHtml + "</ul></div></div>";
                debug("pageHtml: ", pageHtml.slice(0, 1024));
            }

            function insertLi(event) {
                let newLi = templateLiHdr + event + templateLiFtr;
                pageHtml = pageHtml + newLi;
            }

            function openNewHtmlDoc() {
                pageHtml = pageHeader;
           }
        }

        function userQueryCB(responseText, ID) {
            let jsonResp = JSON.parse(responseText);
            if (jsonResp.error) {
                if (jsonResp.error.code == 6)
                    return;
                return handleError(responseText);
            }

            parseResponse(jsonResp);
            callOnContentLoaded(handlePageLoad);
        }

         const baseSettings = `menubar=no, resizable=yes, scrollbars=yes, location=no,
                            status=no, location=no, toolbar=no, `;

        function getNewWinSettings() {
            let width = "width=600,";
            let height = "height=200,";
            let top = "top=" + Math.floor(verticalCenter) + ",";
            let left = "left=" + Math.floor(horizontalCenter/2);
            let settings = baseSettings + width + height + top + left;

            debug("Settings: ", settings);
            return settings;
        }

        function displayNewWin() {
            let settings = getNewWinSettings();
            hoverWin = window.open('','',settings);
            hoverWin.document.open().write(pageHtml);
            return false;
        }

        var hoverWin;
        function hoverEnter() {
            displayNewWin();
        }

        function hoverLeave() {
            
        }

        function handlePageLoad() {
            if (hoverPreview == true)
                $("#nav-events").hover(hoverEnter, hoverLeave);
            if (rightClickPreview == true)
                $("#nav-events").on('contextmenu', hoverEnter);
        }

        function doUserEventsQuery() {
            xedx_TornUserQuery(null, 'events', userQueryCB);
        }

    }

    // =============================== fac Context ===================================

    var facIcon;
    var facCtxId = "fac-ctx";
    var facCtxSel = "#" + facCtxId;
    const facListSel = facCtxSel + " > ul";

    const facLinks = [{name: "Faction", url: "", enabled: true},
                      {name: "Info", url: "tab=info", enabled: true},
                      {name: "Territory", url: "tab=territory", enabled: true},
                      {name: "Rank", url: "tab=rank", enabled: true},
                      {name: "Crimes", url: "tab=crimes", enabled: true},
                      {name: "Upgrades", url: "tab=upgrades", enabled: true},
                      {name: "Armory", url: "tab=armoury", enabled: true},
                      {name: "Armory (points)", url: "tab=armoury&sub=points", enabled: true},
                      {name: "Controls", url: "tab=controls", enabled: true},
                      {name: "Chain", url: "war/chain", enabled: true},
                      {name: "Options (TBD)", url: "#", enabled: true}];

    function doFacContext(name, status, iconNode) {
        GM_addStyle(`
            #fac-ctx > ul > li:first-child {
                border-radius: 10px 10px 0px 0px;
            }
            #fac-ctx > ul > li:last-child {
                border-radius: 0px 0px 10px 10px;
            }
        `);

        facIcon = $(iconNode)[0];
        if (!facIcon || !$(facIcon).length) {
            console.error("Unable to find fac icon! ", status);
            if (document.readyState != 'complete') {
                document.addEventListener("DOMContentLoaded", (event) => {
                    debug("DOMContentLoaded! event: ", event);
                    doFacContext(name, status, iconNode);
                });
                return;
            }
        }

        addContextMenu(facIcon);
     
        function insertMenuItems() {
            for (let idx=0; idx < facLinks.length; idx++) {
                let node = facLinks[idx];
                if (node.enabled == true) {
                    let newLi = `<li class="xmed-li-rad xz"><a href="/factions.php?step=your&type=1#/${node.url}">${node.name}</a></li>`;
                    $(facListSel).append(newLi);
                }
            }
        }

        function filterRightClick(event) {
            let isIn = isClickInElement(event, facIcon);
            if (isIn) {
                event.preventDefault();
                cmHideShow(facCtxSel, $(facIcon).parent());
                let newTop = parseInt($(facCtxSel).css('top')) + 40;
                $(facCtxSel).css('top', newTop + 'px');
            }

            return true;
        }

        function addContextMenu(facIcon) {
            installContextMenu($(facIcon).parent(), facCtxId, {filter: filterRightClick, noSample: true});
            $(facCtxSel).addClass("ctxhide");
            $(facCtxSel).addClass("xopts-border-89");
            insertMenuItems();
        }
    }

    // =============================== End fac Context ================================

    // ================================= Nerve Context ================================

    var nerveBarNode;
    var hookWaiting = false;
    const crimeKeyPrefix = "CrimeLink-";
    const crimeBaseUrl = "https://www.torn.com/loader.php?sid=crimes#/";

    function installNerveHook() {
        const jailURL = "https://www.torn.com/jailview.php";
        const pointsURL = "https://www.torn.com/page.php?sid=points";
        const hubURL = "https://www.torn.com/loader.php?sid=crimes";
        const crimeCheckKey = "crimeLinksChecked";
        const crimesMax = 12;

        const nerveCmId = "x-contextMenu";
        const nerveCmSel = "#" + nerveCmId;
        const nerveMenuSel = "#" + nerveCmId;
        const nerveOptsSel = "#nerve-bar-opts";

        let custCrimeRetries = 0;

        // Delay long enough for custom links (if any) to
        // be installed, unless we've saved them (TBD)
        debug("hookWaiing? ", hookWaiting);
        if (!hookWaiting) {
            hookWaiting = true;
            setTimeout(installNerveHook, 1500);
            return;
        }

        nerveBarNode = $("#sidebar").find("a[class*='nerve__']");
        installContextMenu(nerveBarNode, nerveCmId, {filter: filterContextClick});
        $(nerveCmSel).addClass("xopts-border-89");

        // Insert the LI's that are the menu items
        installDefaultItems();
        installSavedCrimeLinks();

        $("#x-contextMenu > ul > li").addClass("xz");
        $("#x-contextMenu > ul > li").addClass("xmed-li-rad");

        // === end main function, rest are local funcs

        function installDefaultItems() {

            $("#x-contextMenu").css("border-radius", "10px");
            $("#x-contextMenu > ul").css("border-radius", "10px");

            let jailLi = `<li id="jail-top"><a href="` + jailURL + `">Jail</a></li>`;
            let pointsLi = `<li><a href="` + pointsURL + `">Points (Refills)</a></li>`;
            let hubLi = `<li><a href="` + hubURL + `">Crime Hub</a></li>`;
            let updateLi = `<li id="update-crimes"><a>Update Crimes</a></li>`;
            let optsLi = `<li id="nerve-opts"><a>Options</a></li>`;

            $("#x-contextMenu > ul").append(jailLi);
            $("#x-contextMenu > ul").append(pointsLi);
            $("#x-contextMenu > ul").append(hubLi);

            // Add a reserved LI for the Uniques script, for testing
            let uniquesLi = `<li id="uniques-rsvd" style="display:none"><a>Check Uniques</a></li>`;
            $("#x-contextMenu > ul").append(uniquesLi);

            $("#x-contextMenu > ul").append(optsLi);

            $("#nerve-opts").on('click', displayNerveOpts);

            matchBottomBorderRadius("#nerve-opts", "#x-contextMenu");
            matchTopBorderRadius("#jail-top", "#x-contextMenu");
        }

        // Seems 'options' is no longer used, now that is one gen opts dialog...
        function displayNerveOpts(e) {
            let myOpts = {menuId: nerveCmId};
            handleOptsSelection(e, myOpts);
        }

        function installSavedCrimeLinks() {
            for (let idx=0; idx<crimesMax; idx++) {
                let savedLi = GM_getValue(crimeKeyPrefix + idx, undefined);
                if (savedLi) {
                    $("#nerve-opts").before(savedLi);
                }
            }
        }
    }

    // ============================= End Nerve Context ================================

    // ============================= Cooldown Contexts ================================

    //
    // I've added fns into the lib to grab the various icons, use those!
    // MUCH faster...
    //
    var drugCdIcon;
    var boosterCdIcon;
    var medicalCdIcon;
    var drugCD = 0;
    var boosterCD = 0;
    var medicalCD = 0;

    var drugOpts = {text: "", left: 0, top:0, type: "drug"};
    var medicalOpts = {text: "", left: 0, top:0, type: "medical"};
    var boosterOpts = {text: "", left: 0, top:0, type: "booster"};
    var cdHandlersInstalled = false;

    function doCooldownClocks () {
        xedx_TornUserQuery(null, 'cooldowns', cooldownsQueryCB);

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

            if (!cdHandlersInstalled) {
                installHandleCdDiv();
                //$("[class^='icon53_']").on('click', handleDrugIconClick);
                cdHandlersInstalled = true;
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

        const showCdDiv = `<div id="xedx-show-cd" class='cdWrapper xcddiv xhide' style='display: none;'>
                               <span id='xcdmsg' class='xhide xcddiv drugcd drugCdStyle' style='display: none;'></span>
                           </div>`;
        var iconPos;

        // Should be able to use same DIV, change text as needed?
        // 'whichOne' not needed here, set text on display...
        function installHandleCdDiv(whichOne) {
            addCdStyles();
            let root = $("#sidebar").find("[class^='toggle-content_']").find("[class^='status-icons__']").next();
            let el = $(showCdDiv);
            $(root).after(el);
            //$(el).attr("id", "xedx-show-cd_" + whichOne);

            let now = new Date().getTime();
            drugOpts.text = "Drug CD: " + new Date(now + (+drugCD * 1000)).toLocaleTimeString();
            boosterOpts.text = "Booster CD: " + new Date(now + (+boosterCD * 1000)).toLocaleTimeString();
            medicalOpts.text = "Med CD: " + new Date(now + (+medicalCD * 1000)).toLocaleTimeString();

            // Just a default...
            $("#xcdmsg").text("not initializd"); //drugOpts.text);


            cmHandleOutsideClicks("xedx-show-cd");
            debug("Install drug icon click? ", drugCD);
            if (drugCD) configCdIcon("drug");
            if (medicalCD) configCdIcon("medical");
            if (boosterCD) configCdIcon("booster");
        }

        function isCdIcon(anode, whichOne) {
            if ($(anode).length && $(anode).attr("aria-label")) {
                if ($(anode).attr("aria-label").toLowerCase().indexOf(whichOne) > -1) return true;
            }
            return false;
        }

        // Replace w/fns in library!!!
        function findCdIcon(whichOne) {
            let list = $("ul[class^='status-icons_'] > li");
            if (!list.length) return;
            for (let idx=0; idx < list.length; idx++) {
                let anode = list[idx];
                if (isCdIcon($(anode).find("a")[0], whichOne)) {return anode;}
            }
        }

        var cfgRetries = 0;
        function configCdIcon(whichOne) {
            let icon;
            let useOptions;
            if (whichOne == "drug") {
                icon = drugCdIcon = findCdIcon(whichOne);
                useOptions = drugOpts;
            } else if (whichOne == "booster") {
                icon = boosterCdIcon = findCdIcon(whichOne);
                useOptions = boosterOpts;
            } else if (whichOne == "medical") {
                icon = medicalCdIcon = findCdIcon(whichOne);
                useOptions = medicalOpts;
            }

            /// TBD....
            if (!icon) {
                log("Didn't find " + whichOne + " CD icon...");
            } else {
                iconPos = $(icon).position();
                useOptions.top = iconPos.top;
                useOptions.left = iconPos.left;

                //$("#xedx-show-cd").css("top", (iconPos.top));
                //$("#xedx-show-cd").css("left", iconPos.left);

                $(icon).on('contextmenu', handleIconClick);
            }
        }

        const toggleClass = function(sel, classA, classB) {
            if ($(sel).hasClass(classA)) {
                $(sel).removeClass(classA).addClass(classB);
            } else {
                $(sel).removeClass(classB).addClass(classA);
            }
            doHideShowStyles();
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
                    $(".xcddiv").removeClass("xshow").addClass("xhide");
                    doHideShowStyles();
                    //handleIconClick(e);
                }
            });
        }

        // Haven't yet figured out why I get multiple clicks...
        var inClick = false;
        function turnOffClick() {log("turnOffClick"); inClick = false;}

        function handleIconClick(e) {
            if (inClick) return;
            inClick = true;
            setTimeout(turnOffClick, 500);
            if (e) e.stopPropagation();

            $(".xcddiv").removeClass("xshow").addClass("xhide");
            doHideShowStyles();

            let target = $(e.currentTarget);
            let anode = $(target).find("a")[0];
            let label = $(anode).attr("aria-label");
            if (!label) return;

            let opts;
            if (label.toLowerCase().indexOf("drug") > -1) opts = drugOpts;
            else if (label.toLowerCase().indexOf("medic") > -1) opts = medicalOpts;
            else if (label.toLowerCase().indexOf("boost") > -1) opts = boosterOpts;

            if (!opts) return;

            $("#xedx-show-cd").css("top", opts.top);
            $("#xedx-show-cd").css("left", opts.left);
            $("#xcdmsg").text(opts.text);

            toggleClass("#xedx-show-cd", "xhide", "xshow");
            toggleClass("#xcdmsg", "xhide", "xshow");

            doHideShowStyles();
            return false;
        }
    }

    // ============================= End Cooldown Contexts ============================

    // ============================== Stock Page Stuff ================================

    function doStockHandlers() {

        var mainStocksUL;

        if (!mainStocksUL) {
                mainStocksUL = $("#stockmarketroot").find('[class^="stockMarket"]')[0];
            }
            if (!mainStocksUL) {
                log("[tornStockProfits] didn't find target!");
                return setTimeout(doStockHandlers, 250); // Check should not be needed
            }

        function addCheckBox() {
            let root = $("#stockmarketroot > div[class^='appHeaderWrapper_'] > " +
                  " div[class^='topSection_'] > div[class^='titleContainer_'] > h4");
            let width = $(root).outerWidth();
            GM_addStyle(`.stk-cb { float: right; margin-left: 20px; margin-top: 8px;}`);
            let cb = $('<span><input class="stk-cb" type="checkbox">Only Ready</span>');
            $(root).append(cb);

            GM_addStyle(".xblack {background: #111} .xact {border: 1px solid green; background: #111;} " +
                        " .xin {border: 1px solid red; opacity: .5;  background: #ccc;} " +
                        " .lime{border: 3px solid limegreen;  background: #111;}");


            Object.defineProperty(String.prototype, "has", {
                value: function (word) {
                    return this.indexOf(word) > -1;
                },
            });

            let tip = "Checking this will hida all stocks except<BR>for those currently ready to collect.";
            displayHtmlToolTip(cb, tip, "tooltip4");

            // add 'click' handler, and tooltip...
            $(cb).on('click', toggleReadyOnly);
        }


        function toggleReadyOnly(e) {

            let cb = $(e.currentTarget).find("input")[0];
            let checked = $(cb).prop("checked");
            let checked2 = $(cb).checked;

            let stockList = $(mainStocksUL).find("ul");
            let divInfo = $(mainStocksUL).find("[class^='dividendInfo']");

            for (let idx=0; idx < $(divInfo).length; idx++) {
                let el = $(divInfo)[idx];
                let child2 = $(el).children().eq(1);
                let text = $(child2).text();
                let sel = $(child2).closest("ul");
                //log("Parent UL: ", $(sel));

                if (checked) {
                    if (text.has("Benefit")) {log(text + " matches Benefit!");$(sel).addClass("xblack");}
                    else if (text.has("Ready in")) {log(text + " matches Ready in!");$(sel).addClass("xblack");}
                    else if (text.has("Inactive")) {log(text + " matches Inactive!");$(sel).addClass("xblack");}
                    else if (text.has("collection")) {log(text + " matches collection !");$(sel).addClass("lime");}
                    else {log(text + " matches NOTHING !");$(sel).css("opacity", ".5");}
                } else {
                    $(sel).removeClass("xblack").removeClass("lime").css("opacity", "1.0");
                }

            }

        }

    }
    // ================================= End Stock ====================================

    // ============================= Common options dialog? ===========================

    const myOptsSel = "#xedx-gen-opts";      // Selector for options page

    const showMenu = function (sel) {$(sel).removeClass("ctxhide").addClass("ctxshow");}
    const hideMenu = function (sel) {$(sel).removeClass("ctxshow").addClass("ctxhide");}
    //const showOpts = function () {log("xedx showOpts"); $(".nerveflex").removeClass("nervehide").addClass("nerve-showflex");}
    const hideOpts = function () {$(".nerveflex").removeClass("xnerve-flex").addClass("nervehide");}

    function showOpts() {
        let nodes = $(myOptsSel).find(".nerveflex");
        for (let idx=0; idx < nodes.length; idx++) {
            let node = nodes[idx];
            $($(node)[0]).removeClass("ctxhide");
            $($(node)[0]).removeClass("nervehide"); //.addClass("xnerve-flex");
            $($(node)[0]).addClass("xnerve-flex");
        }
    }

    function doSwap(sel) {
        if ($(sel).css("display") == "none" || $(myOptsSel).css("display") == "block") {
            showMenu(sel);
            hideOpts();
        } else {
            hideMenu(sel);
            showOpts();
        }
    }

    var hasBeenSaved = false;
    function doSave(sel) {
        hasBeenSaved = true;
        if (confirm("Options saved!\nClose?"))
            doSwap(sel);
    }

    function doCancel(sel) {
        doSwap(sel);
    }

    function handleOptsSelection(event, options) {
        if ($("#xedx-gen-opts").length == 0) {
            installOptsDialog();
        }

        hideMenu(activeCtxMenuSel);
        showOpts();
        $("#xedx-gen-opts").removeClass("nervehide");
        $("#xedx-gen-opts").removeClass("ctxhide");
        $("#xedx-gen-opts").addClass("nerve-showflex");
    }

    function installOptsDialog() {
        let optsDiv = getGeneralOptsDiv();

        $("body").prepend(optsDiv);

        buildTabs();              // Create tabs depending on what is installed

        insertCrimeOpts();        // Add option to the Nerve option page
        insertCityOpts();

        addLifeBarHandlers();     // Add handlers for tab 1, life bar opts

        addGeneralHandlers();     // Cancel/save, tabs ...
    }

    const tabList = [
            {name: "General", target: "#x-tab-gen", enabled: true},
            {name: "Life", target: "#x-tab-life", enabled: true},
            {name: "Nerve", target: "#x-tab-nerve", enabled: true},
            {name: "City", target: "#x-tab-city", enabled: true}
        ];

    function buildTabs() {
        let tabDiv = $("#xedx-gen-opts").find(".tab");
        for (let idx=0; idx < tabList.length; idx++) {
            let tabEntry = tabList[idx];
            if (!tabEntry.enabled) continue;

            let elem = '<button class="tablinks" target="' + tabEntry.target + '">' + tabEntry.name + '</button>';
            $(tabDiv).append(elem);
        }

        $(tabDiv).append('<button id="opt-menu-fbtn" class="fake-btn"></button>');
        $($(".tablinks")[0]).addClass("active");
    }

    // change to object list: {name: <..>, dispName: <...>, href?, ...}
    const crimeList = [ {crime: "searchforcash", disp: "Search for Cash"}, {crime: "bootlegging", disp: "Bootlegging"},
                        {crime: "graffiti", disp: "Graffiti"}, {crime: "shoplifting", disp: "Shoplifting"},
                        {crime: "pickpocketing", disp: "Pick Pocketing"}, {crime: "cardskimming",  disp: "Card Skimming"},
                        {crime: "burglary", disp: "Burglary"}, {crime: "hustling", disp: "Hustling"},
                        {crime: "disposal", disp:"Disposal"}, {crime: "cracking",  disp: "Cracking"},
                        {crime: "forgery", disp: "Forgery"}, {crime: "scamming", disp: "Scamming"} ];


    // Attempt to convert 'insertCrimeOpts' to generic opts table builder
    //
    // cbClass is the name of a dummy class given to every checkbox in the table, to locate them.
    // optsList is an array of objects, object must have at least a 'disp' key/member
    // cbCallback is the handler called called on checkbox click.
    // startCheckedCb is a function that is passed the checkbox (input) node, which has
    // an attr called 'index', which is an index into the above array. If it should be
    // initilized as checked, it should return true. Could also add any additional
    // attributes to the input node as well....
    //
    function buildOptsTable(tabSelector, cbClass, optsList, cbCallback, startCheckedCb) {
        const classSelector = "." + cbClass;
        const cellStartL = '<td class="xntcl">';
        const cellStartR = '<td class="xntcr">';
        const cellStart = '<span class="xfmt-span"><input type="checkbox" class="' + cbClass + '" index="';
        const cellEnd = '</span></td>';

        let table = $(tabSelector).find("table");

        for (let idx=0; idx < optsList.length; idx += 2) {
            let lastRow = (idx + 2) >= optsList.length;
            let row = "<tr>" + cellStartL + cellStart + idx + '">' + optsList[idx].disp + cellEnd;
            if (!lastRow) {
                row += cellStartR + cellStart + (+idx + 1) + '">' + optsList[idx + 1].disp + cellEnd;
            } else {
                if ((idx + 2) == optsList.length)
                    row += cellStartR + cellStart + (+idx + 1) + '">' + optsList[idx + 1].disp + cellEnd;
            }
            row += "</tr>";
            $(table).append(row)
        }

        let cbList = $(classSelector);
        for (let idx=0; idx < cbList.length; idx++) {
            let node = cbList[idx];
            if (crimeNodeInitChecked(node) == true)
                $(node).prop('checked', true);
        }

        $(classSelector).on("click", cbCallback);
    }

    function crimeNodeInitChecked(node) {
        let key = crimeKeyPrefix + $(node).attr("index");
        let el = GM_getValue(key, undefined);
        if (el && el.length > 1) return true;
    }

    function cityNodeInitChecked(node) {
        let idx = $(node).attr("index");
        let key = "city-" + idx + "-enabled";
        let val = GM_getValue(key, undefined);
        if (val == null) {
            val = false;
            GM_setValue(key, false);
        }

        //$(node).attr("nodeId", cityList[idx].id);

        cityList[idx].enabled = val;
        return val;
    }

    function insertCityOpts() {
        buildOptsTable("#x-tab-city", "city-cb", cityList, handleCityCbClick, cityNodeInitChecked);
    }

    function insertCrimeOpts() {

        buildOptsTable("#x-tab-nerve", "nerve-cb", crimeList, handleNerveCbClick, crimeNodeInitChecked);
        return;
    }

    // Life bar option handlers
    function addLifeBarHandlers() {
        // Default tab/same page behaviour radio button group
        $('input[name="tab-select"]').on("click", function() {
            hasBeenSaved = false;
            let tabOrPage = $('input[name = "tab-select"]:checked').val();
            alert(tabOrPage);
        });

        // Default left-click behaviour radio button group
        $('input[name="def-go"]').on("click", function() {
            hasBeenSaved = false;
            let defLeftClick = $('input[name = "def-go"]:checked').val();
            alert(defLeftClick);
        });
    }

    // General handlers
    function addGeneralHandlers() {
        // Cancel and save buttons save: doSave, cancel: doSwap
        $("#opts-save").on('click', function() {
            doSave(activeCtxMenuSel);});

        $("#opts-cancel").on('click', function() {
            doSwap(activeCtxMenuSel);});

        $(".gen-cb").on("click", handleGeneralCbClick);

        // Tab handling
        let tab1 = $(".tablinks")[0];
        let page1 = $(".tabcontent")[0];
        $(tab1).css("min-width", 100);
        $(page1).css("display", "block");
        $(".tablinks").on('click', tabSwitch);
    }

    // =============== nerve opts handlers ===============

    // TBD: update nerve context menu list also?
    function handleNerveCbClick(e) {
        let node = $(e.currentTarget);
        let idx = $(node).attr("index");
        let checked = $(node)[0].checked;
        let key = crimeKeyPrefix + idx;
        let value = "<li class='xmed-li-rad'><a href='" + crimeBaseUrl + crimeList[idx].crime + "'>" + crimeList[idx].disp + "</a></li>";
        GM_setValue(key, checked ? value : "");
    }

    function handleGeneralCbClick(e) {
        let node = $(e.currentTarget);
        let checked = $(node)[0].checked; // use prop?

    }

    // ============================= End Common options dialog ===========================

    // ===================================================================================
    // Styles for everything
    function addStyles() {
        addContextStyles();
        loadMiscStyles();
        addBorderStyles();
        addFloatingOptionsStyles();
        addTornButtonExStyles();
        loadCommonMarginStyles();
        addTabbedDivStyles();
        addBackgroundStyles();
    }

    function handlePageLoad() {
        if (checkCloudFlare()) return log("Clodflare active: won't run now");;
        if (installFacContext) getSidebarIcon('faction', doFacContext); //doFacContext();
        if (installNerveContext) installNerveHook();
        if (installCooldownClocks) doCooldownClocks();
        if (installCityNavBarCtxt == true) doCityNavContext();

        // May need to tab-click on cit page...
        if (location.href.indexOf("city.php") > -1) {
            let hash = location.hash;
            let needMap = hash ? (hash.indexOf("map-cont") > -1) : false;
            log("In the city, hash: ", hash, " need map: ", needMap);

            if (needMap == true) setTimeout(gotoMap, 250);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (isAttackPage()) return log("Won't run on attack page!");

    if (checkCloudFlare()) {
        log("Won't run while challenge active!");
        return;
    }

    // Only neded for Cooldown option...
    validateApiKey();
    versionCheck();


    // Some things not applicable when flying
    if (abroad() || travelling()) {
        //installNerveContext = false;
    }

    addStyles();

    if (installEventPreviews) doEventsContext();    // Events right-click preview

    // TBD need esp. for map tabs!!!
    //callOnHashChange(hashChangeHandler);
    //installPushStateHandler(pushStateChanged);

    callOnContentLoaded(handlePageLoad);


    // ================================= opts menu content =============================
    //
    // Stolen from life bar context script. Will call from any Options click.
    // Use target to see whicg options page to display, or same one with tabs?
    // Prob same so from any, can choose all options....
    //
    //
    // ================================== Options dialog ================================

    function getGeneralOptsDiv() {

        const alignLeft = ` align-content: flex-start !important; `;
        const alignCenter = ` align-content: center; `;
        const justifyCenter = ` justify-content: center; `;
        const flexCol = ` flex-direction: column; width: 100%; `;
        const flexRow = ` flex-direction: row; `;

        const bBlue = " border: 2px solid blue;";
        const bGreen = " border: 2px solid green;";
        const bRed = " border: 2px solid red;";
        const bYellow = " border: 2px solid yellow;";

        let flexRowStyle = ` minimum-height: 24px !important; `;
        flexRowStyle += ` padding-top: 15px !important; `;

        // Temp until I fix this....
        GM_addStyle(`
            .xnerve-flex {
                display: flex !important;
            }
            .nervehide {display: none;}
        `);

        // Note: the nerveflex is a dummy class used to remove the !impotant flex claas so it can be
        // over-ridden by the display: none class (ctxhide)
        //
        // xlb-opts-bg: life bar background, border, z-order
        // xedx-ctr-screen: position, transforms - to center outer div
        GM_addStyle(`
            .xfmt-font-blk input {
                margin-right: 10px;
            }
            .xbig-border {
                border: 3px solid darkslategray;
            }
            .custborder1 {
                border-radius: 0px 6px 6px 6px;
                border: 1px solid black;
            }
            .xbtn-wrap {
                position: absolute;
                bottom: 0;
                margin-bottom: 15px;
                width:100%;
                margin-left: -10px;
            }
        `);

        // Used by left, right table cells on opts pages
        GM_addStyle(`
            .xntcl {
                padding: 6px 0px 6px 28px !important;
                width: 58%;
            }
            .xntcr {
                padding: 6px 2px 6px 12px !important;
            }
            .xntcg {
                padding: 6px 12px 6px 12px !important;
            }
        `);

        // If we are going to display a tabbed dialog, need to get rid of the top padding
        const displayTabs = true;

        var paddingTop = "";
        if (displayTabs) paddingTop = " padding-top: 8px !important; ";

        // Prob don't need ID's...
        const generalOptsDiv = `
             <div id="xedx-gen-opts"
                 class="xopt-border-ml8 xopts-ctr-screen xfmt-font-blk x-ez-scroll xopts-bg xopts-def-size nerveflex nervehide"
                 style="` + paddingTop + `">

                 <div class="nerve-showflex lb-flex nerveflex" style="` + flexCol + `">

                     <div class="tab nerve-showflex lb-flex nerveflex" style="` + flexRow + `">

                     </div>

                     <div class="dummy-tab-content-area">

                         <div id="x-tab-gen" class="tabcontent" name="general">
                             <div class="nerve-showflex nerveflex" style="` + flexCol + alignLeft + `">
                                 <span class="xfmt-hdr-spanc">
                                     Select which elements to add right-click menus to:
                                 </span>
                                 <table class="gen-table xmt5 xml14">
                                     <tr>
                                         <td class="xntcl"><span class="xfmt-span"><input class="gen-cb" type="checkbox">Life Bar</span></td>
                                         <td class="xntcr"><span class="xfmt-span"><input class="gen-cb" type="checkbox">Nerve Bar</span></td>
                                     </tr>
                                     <tr>
                                         <td class="xntcl"><span class="xfmt-span"><input class="gen-cb" type="checkbox" name="chk-box">Faction Icon</span></td>
                                     </tr>
                                 </table>

                                 <span class="xfmt-hdr-spanc">
                                     Select which cooldown icons to add right-click menus to:
                                 </span>
                                 <table class="gen-table-cds xmt5 xml20">
                                     <tr>
                                         <td class="xntcg"><span class="xfmt-span"><input class="gen-cb" type="checkbox" name="chk-box">Drug</span></td>
                                         <td class="xntcg"><span class="xfmt-span"><input class="gen-cb" type="checkbox" name="chk-box">Booster</span></td>
                                         <td class="xntcg"><span class="xfmt-span"><input class="gen-cb" type="checkbox" name="chk-box">Medical</span></td>
                                     </tr>
                                 </table>

                                 <span class="xfmt-hdr-spanc">
                                     War Timer options (right-click toggles view):
                                 </span>
                                 <table class="gen-table-wt xmt5 xml14">
                                     <tr>
                                         <td class="xntcl"><span class="xfmt-span"><input class="gen-cb" type="checkbox">Enabled</span></td>
                                         <td class="xntcr"><span class="xfmt-span"><input class="gen-cb" type="checkbox">Tooltip</span></td>
                                     </tr>
                                     <tr>
                                         <td class="xntcl"><span class="xfmt-span"><input class="gen-cb" type="checkbox">Time At</span></td>
                                         <td class="xntcr"><span class="xfmt-span"><input class="gen-cb" type="checkbox">Time Until</span></td>
                                     </tr>
                                     <tr>
                                         <td class="xntcl"><span class="xfmt-span"><input class="gen-cb" type="checkbox" name="chk-box">Short Format</span></td>
                                     </tr>
                                 </table>
                             </div>
                         </div>

                         <div id="x-tab-life" class="tabcontent" name="life">
                             <div class="nerve-showflex nerveflex" style="` + flexCol + alignLeft + `">
                                 <span class="xfmt-hdr-spanc">
                                     Select how to open the medical items page
                                 </span>

                                 <span class="xfmt-span xopts-black"><input name="tab-select" type="radio" value="tab">Open med items page in new tab</span>
                                 <span class="xfmt-span info-msg msg"><input name="tab-select" type="radio" value="page">Open med items page in same page</span>

                                 <span class="break"></span>

                                 <span class="xfmt-hdr-spanc">
                                     Select default options for left-click (if any)
                                 </span>

                                 <span class="break"></span>

                                 <span class="xfmt-span"><input name="def-go" type="radio" value="med">Go to medical items page</span>
                                 <span class="xfmt-span"><input name="def-go" type="radio" value="hela">Request revive from HeLa</span>
                                 <span class="xfmt-span"><input name="def-go" type="radio" value="none">Nothing</span>

                                 <span class="break"></span>

                                 <span class="xfmt-hdr-spanc">
                                     Just a few checkboxes that do nothing.
                                 </span>

                                 <span class="xfmt-span"><input type="checkbox" class="xedx-cb-opts xmr20" name="chk-box">Test</span>
                                 <span class="xfmt-span"><input type="checkbox" class="xedx-cb-opts xmr20" name="chk-box">Test2</span>
                                 <span class="xfmt-span"><input type="checkbox" class="xedx-cb-opts xmr20" name="chk-box">Test3</span>

                                 <span class="break"></span>
                             </div>
                         </div>

                         <div id="x-tab-nerve" class="tabcontent" name="nerve">
                             <div class="nerve-showflex nerveflex" style="` + flexCol + alignLeft + `">
                                 <span class="xfmt-hdr-spanc">
                                     Select crimes to add to menu
                                 </span>

                                 <table class="nerve-table xmt10">

                                 </table>

                             </div>
                         </div>

                         <div id="x-tab-city" class="tabcontent" name="city">
                             <div class="city-showflex nerveflex" style="` + flexCol + alignLeft + `">
                                 <span class="xfmt-hdr-spanc">
                                     Select city locations to add to menu
                                 </span>

                                 <table class="city-table xmt10">

                                 </table>

                             </div>
                         </div>

                     </div>

                     <div class="xbtn-wrap nerve-showflex nerveflex" style="` + flexRowStyle + flexRow + alignCenter + justifyCenter + `">

                         <button id="opts-save" class="xedx-torn-btn xmr10">Save</button>
                         <button id="opts-cancel" class="xedx-torn-btn xml10">Cancel</button>
                     </div>



                 </div>
             </div>
             `;

        return generalOptsDiv;
    }

    // .tab: bg color should match whole div...
    function addTabbedDivStyles() {
        GM_addStyle(`
            .tab {
              overflow: hidden;
              border: 1px solid #ccc;
              max-height: 26px;
              justify-content: left;
            }

            /* Style the buttons that are used to open the tab content */
            .tab button {
              height: 24px;
              width: auto;
              left: 0;
              padding-left: 8px;
              padding-right: 8px;
              border-radius: 6px 6px 0px 0px;
              background-color: #999;
              float: left;
              border-left: 1px solid black;
              border-right: 1px solid black;
              border-top: 1px solid black;
              border-bottom: 2px solid #888;
              outline: none;
              cursor: pointer;
              transition: 0.3s;
            }

            .tab button.fake-btn {
                border-left: none;
                border-top: none;
                border-right: none;
                border-bottom: 2px solid #888;
                background-color: #ccc;
                width: 100%;
            }

            .tab button.fake-btn {
                background-color: #ccc;
            }

            /* Change background color of buttons on hover */
            .tab button:hover {
              background-color: #ddd;
            }

            /* Create an active/current tablink class */
            .tab button.active {
              border-bottom: none;
              background: #ccc;
            }

            /* Style the tab content */
            .tabcontent {
              display: none;
            }
        `);
    }

    /*
    .tab button.active {
      border-bottom: none;
      background: linear-gradient(#777 5%, #999 20%, #ccc);
    }
    */


    function tabSwitch(evt) {
        log("tabSwitch: ", evt);
        log("tab target: ", $(evt.currentTarget));

        let tab = $(evt.currentTarget);
        let pageSel = $(tab).attr("target");

        $(".tabcontent").attr("style", "display: none;");
        $(pageSel).attr("style", "display: block;");

        $(".tablinks").removeClass("active");
        $(".tablinks").css("min-width", "");

        let tabW = $(tab).outerWidth();
        let newW = tabW * 2; // (tabW < 40) ? (tabW * 2) :
                             // (tabW < 60) ? (tabW + 30) : (tabW + 20);
        $(tab).addClass("active");
        $(tab).css("min-width", 100);
    }


    // ============================================ End opts menu content =============================

})();