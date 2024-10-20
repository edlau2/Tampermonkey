// ==UserScript==
// @name         Torn Quick Parcels
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Quickly add an SED to a parcel
// @author       xedx [2100735]
// @match        https://www.torn.com/item.php*
// @match        https://www.torn.com/itemuseparcel.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @connect      api.torn.com
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

    // ================== user configurable options ===========================
    //
    // downloadImages: If true, you'll get little thumnail images in the scoll
    // list where you select the item your parcel will appear as (its
    // 'disguise'). Enabling this really slows things down, as it takes
    // a long time to fetch them all, and they are not cacheable.
    //
    const downloadImages = false;

    // displayAsQuickItem: If you have Torn Tools Quick Items enabled, can set
    // this to true to display as a Quick Item instead of a separate button on the UI.
    //
    const displayAsQuickItem = false;

    // skipCompletionMsg Enable to skip success confirmation and jump
    // right back to the items page, where new XID's will already be
    // grabbed and you just need to press Go! again.
    // Set to false to get the confirmational message instead.
    //
    const skipCompletionMsg = false;

    // mp3test: Setting this to true lets me test by packing an
    // MP3 player instead of SED, cheaper and safer :-) If
    // useMP3AsDisguise, use MP3 Player as the 'disguised' contents,
    // otherwise use the selected one.
    //
    const mp3test = false;
    const useMP3AsDisguise = false;

    // ================== End general user configurable options =================

    var searchItemName = "small explosive";
    if (mp3test == true)
        searchItemName = "mp3 player";

    // To aid in development - don't collapse the list!
    let displayDevList = false;

    const rootID = "x-select";
    var mainSelect = "#" + rootID;
    if (displayDevList == true) mainSelect = mainSelect + "-dev";

    // For the list of items to disguise as, will cache that if enabled.
    // This is set automatically once the items are retrieved.
    const useCachedItems = GM_getValue("useCachedItems", false);
    var tornItemsList = {};
    var itemsListValid = false;

    var itemDisguiseID = (mp3test == true && useMP3AsDisguise == true) ? 39 :
        GM_getValue("itemDisguiseID", 133); // 10 Ton Pacifier is default if not there
    GM_setValue("itemDisguiseID", itemDisguiseID);
    log("Loaded itemDisguiseID", itemDisguiseID);

    // For special dev/experimental testing
    const xedxDevMode = false;
    debugLoggingEnabled = false;

    // Instead of getting the whole item list each time,
    // we may cache - if enabled, load now before the
    // script even starts.
    if (useCachedItems == true) {
        let val = GM_getValue("tornItemsList", "{}");
        tornItemsList = JSON.parse(val);
        if (tornItemsList) {
            let keys = Object.keys(tornItemsList);
            let expected = GM_getValue("CachedItemsCount", 0);
            if (expected != keys.length) {
                console.error("Invalid items cache!");
                GM_setValue("useCachedItems", false);
                useCachedItems = false;
            } else {
                log("Using cached item list");
                itemsListValid = true;
            }
        }
    }

    var lastPosition = GM_getValue("lastPosition", "open");

    let useID = rootID + ((displayDevList == true) ? "-dev" : "");
    const itemPageDashboard = `
        <div id="x-tab" class="xleft-tab"></div>
        <div style="display:flex;flex-direction:row;height:46px;">
            <div id="xitem-page" class="xpdiv">
                <span id="xpsp1" class="xpsp">Quick Parcels</span>
                <input id="x-submit" type="submit" class="xedx-torn-btn-raw xpbtn" value="Pack an SED">
                <input id="x-use-parcel" type="submit" class="xedx-torn-btn-raw xpbtn" style="color: #C00000;" value="Use Parcel">
                <div id="` + useID + `">
                    <ul>
                    </ul>
                </div>
             </div>
        </div>
    `;

    const quickItemBoxDiv =
            `<div id="xedx-i372" class="item" draggable="true" data-id="372" title="Create SED Parcel" data-category="Special">
                <div class="pic" style="background-image: url(/images/items/372/medium.png)"></div>
                <div class="text" data-qty="">Empty Box with SED</div>
                <i id="xqi372-remove" class="fas fa-times tt-close-icon" title="Remove quick access."></i>
            </div>`;
    const quickItemParcelDiv =
            `<div id="xedx-i373" class="item" draggable="true" data-id="373" title="Use Parcel" data-category="Supply Pack">
                <div class="pic" style="background-image: url(/images/items/373/medium.png)"></div>
                <div class="text" data-qty="">Parcel</div>
                <i id="xqi-remove" class="fas fa-times tt-close-icon" title="Remove quick access."></i>
            </div>`;

    var hasQuickItems = false;
    var cClass = "xcollapsed";
    var oClass = "xopen";
    function collapseDevDash() {
        if (!$("#x-tab").hasClass(cClass)) {
            GM_setValue("lastPosition", "closed");
            $("#x-tab").addClass(cClass).removeClass(oClass);
            $("#xitem-page").animate({
                opacity: 0,
            }, 500, function() {
                $("#xitem-page").css("top", "-46px");
            });
            $("#xitem-page").parent().animate({height: "0px"}, 1000);
        } else {
            GM_setValue("lastPosition", "open");
            $("#x-tab").removeClass(cClass).addClass(oClass);
            $("#xitem-page").attr("style", "");
            $("#xitem-page").css('opacity', 0);

            $("#xitem-page").animate({opacity: 1}, 1000);
            $("#xitem-page").parent().animate({height: "46px",}, 500);
        }
    }

    function additemPageDashboard() {
        if ($("#quickItems").length > 0) {
            hasQuickItems = true;
            if (displayAsQuickItem == true) {
                $("#quickItems > main > div.inner-content").append(quickItemBoxDiv);
                $("#quickItems > main > div.inner-content").append(quickItemParcelDiv);
            } else {
                cClass = "xcollapsed-tt";
                oClass = "xopen-tt";
                $("#quickItems").after(itemPageDashboard);
                $("#xpsp1").removeClass("xpsp").addClass("xpsp-tt");
                $("#x-submit").removeClass("xpbtn").addClass("xpbtn-tt");
                $("#x-use-parcel").removeClass("xpbtn").addClass("xpbtn-tt");
            }
        } else {
            $(".equipped-items-wrap").after(itemPageDashboard);
        }

        if ($(".xleft-tab").length > 0) {
            $(".xleft-tab").on('click', collapseDevDash);
            let tooltipText = "Click here to hide/show the<br>Quick Parcels button.";
            displayHtmlToolTip($(".xleft-tab"), tooltipText, "tooltip4");
            $(".xleft-tab").addClass(oClass);
            if (lastPosition == "closed") collapseDevDash();
        }

        debug("Dashboard created, List ready? ", itemsListValid);
        if (itemsListValid)
            insertListItems();
    }

    const addSedBtn = `<input id="xcreate" type="submit" class="xedx-torn-btn-raw xpbtn2" value="Create Parcel!">`;
    const devSedBtn = `<input id="testBtn" type="submit" class="xedx-torn-btn-raw xpbtn2" value="Test Btn">`;
    const useParcelBtn = `<input id="xUseParcel" type="submit" class="xedx-torn-btn-raw xpbtn2" value="Use Parcel">`;

    const spItemCat = "special-items";        // ID for special items list (where empty boxes are)
    const spItemTabId = "ui-id-23";           // Tab ID for Special Items (tab along top)
    const supplyPackCat = "supply-pck-items"; // ID for supply pack items (where parcels are)
    const supplyPackTabId = "ui-id-13";       // Tab ID for supply packs

    const emptyBoxId = "372";             // Item ID for an empty box
    const sedItemId = "380";              // "" for a SED, on same page
    const parcelId = "373";               // ID for a parcel
    const mp3id = "42";                   // For testing...

    var usePackItemID = (mp3test == true) ? parseInt(mp3id) : parseInt(sedItemId);

    var emptyBoxLi;                       // List item element for an empty box
    var sedLi;                            // LI for an SED

    var sedUseItemSlot;                   // Where the Use Item btn would be for an SED, but isn't...

    const baseTornUrl = "https://www.torn.com/";
    const itemsURL = "https://www.torn.com/item.php";
    var emptyBoxXID;
    var emptyBoxDataUrl;
    var sedXID;
    var mp3XID;

    // ======================= Helpers =======================
    //
    const onMakeParcelPage = function() { return (location.href.indexOf("itemuseparcel") > -1);}

    function scrollTo(elem) {
       $('html,body').animate({
          scrollTop: $(elem).offset().top - $(window).height()/2
       }, 500);
    }

    function scrollToTop(elem) {
       $('html,body').animate({
          scrollTop: $(elem).offset().top - 40
       }, 500);
    }

    // Find item's LI on Items page
    function getLiByItemId(itemId, category) {
        if (!category) category = spItemCat;
        let selector = "ul#" + category + " li[data-item='" + itemId + "']"
        var element = $(selector)[0];
        return element;
    }

    // From Items page, go to any tab
    function goToPage(pageTabId) {
        let sel = "#" + pageTabId;

        log("Going to page: ", pageTabId, " el: ", $(sel)[0]);
        if ($(sel)[0]) $(sel)[0].click();
    }

    // =================== Handle the "Use Parcel" option ========================
    //
    function useParcel() {
        goToPage(supplyPackTabId);

        locateItem("Supply Pack", parcelId, findParcelCB);

        function clickUseParcel(node) {
            $(node).click();
            return false;
        }

        function findParcelCB(thisLi, itemId, retries=0) {
            if ($(thisLi).length == 0) {
                return log("Error: parcel invalid! ID: ", itemId, " Node: ", $(thisLi));
            }

            debug("qty: ", $($(thisLi)[0]).attr("data-qty"));

            let parcelLi = $("[data-item='373']")[0];
            if ($(parcelLi).length == 0) {
                if (confirm("Error: parcel not found! Try again?") == false) return;
                return setTimeout(findParcelCB, 250, thisLi, itemId, ++retries);
            }
            $(parcelLi).find(".title").addClass("xbgreen-inset-sm");
            let useBtn = $(parcelLi).find("[class^='option-use']")[0];

            if ($(useBtn).length) {
                $(useBtn).click();
                scrollToTop(parcelLi);
            }
        }
    }

    // ============== Locate XID for SED, by name... and create the parcel ==================
    var foundElement;

    // This simply scans the items on the page, matches by name.
    // Item ID isn't available, but we need the item's XID
    // Currently only looks for SED's
    function findItemOnParcelPage(itemId, retries=0) {
        let list = $("ul.special-items > li");
        if (list.length == 0 || document.readyState != "complete") {
            if (retries++ < 10) return setTimeout(findItemOnParcelPage, 250, itemId, retries);
            return;
        }

        sedXID = 0;
        mp3XID = 0;
        let found = false;
        for (let idx=0; idx<list.length; idx++) {
            let element = list[idx];
            let reactId = $(element).attr("data-reactid");
            let nameNode = $(element).find("div.title-wrap > div.name-wrap > span");

            if ($(nameNode).length > 0) {
                for (let i=0; i<$(nameNode).length; i++) {
                    let node = $(nameNode)[i];
                    if (node) {
                        let it = node.innerText;
                        if ( it && it.toLowerCase().indexOf(searchItemName) > -1)
                            nameNode = node;
                    }
                }
            }

            let name = $(nameNode).text();
            debug("name: ", name);

            if (name) {
                if (name.toLowerCase().indexOf(searchItemName) > -1) {
                    let parts = reactId.split("$");
                    if (mp3test == true) {
                        mp3XID = parts[3];
                        debug("Got MP3 XID");
                    } else {
                        sedXID = parts[3];
                        debug("Got SED XID");
                    }
                    if (!$("#xcreate").length) {
                        let name = $(element).find(".title-wrap > div.name-wrap")[0];
                        debug("name: ", $(name));

                        $(name).append(addSedBtn);
                        $("#xcreate").on('click', submitCreateParcel);
                        scrollTo(element);
                    }
                    return (mp3test == true) ? mp3XID : sedXID;
                }
            }
        }

        // Not found, retry. Need a way to see when really fully loaded,
        // or observer. Or maybe don't need, can add SED anyways...
        log("Didn't find item, retrying!");
        if (retries++ < 30) {
            return setTimeout(findItemOnParcelPage, 250, itemId, retries);
            alert("Couldn't find any SEDs! Are you out?");
        }

    }

    // POST result handler
    function processJSONPostResponse(response, status, xhr) {
        let jsonObj;
        try {
            jsonObj = JSON.parse(response);
        } catch (e) {
            console.error("Exception: ", e);
            console.error("Response: ", response);
            return;
        }

        let tryAgain = false;
        if (jsonObj.success == true) {
            if (skipCompletionMsg == true) {
                location.href = itemsURL;
                return;
            }
            let Q = "\r\n\r\nPress OK to go pack another,\r\nCancel to simply stay here.";
            if (confirm("Success!" +
                   (jsonObj.text ? ("\r\n\r\n" + jsonObj.text) : "") + Q)) {
                location.href = itemsURL;
                return;
            }
        } else {
            console.error("Error making parcel: ", jsonObj);
            let msg = "Oops! Something went wrong.\r\n";
            if (jsonObj.logs) {
                for (let idx=0; idx<logs.length; idx++) {
                    msg += logs[idx] + "\r\n";
                }
            }
            if (jsonObj.text) {
                msg += "\r\nTorn says: " + jsonObj.text + "\r\n";
            }
            msg += "\r\nThe console logs may have more details.";
            alert(msg);
        }
    }

    // POST an 'add sed to box to make parcel' request
    // Actually creates the parcel. Uses the emptyBoxXID,
    // from the items page, and SED XID from create parcel page.
    // TBD: hard coded to use item ID 133 as a disguise, 10 Ton Pacifier
    function submitCreateParcel(e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        // Disable the button?
        $("#xcreate").off();
        $("#xcreate").removeClass("xpbtn2").addClass("xpbtn3");

        const urlParams = new URLSearchParams(window.location.search);
        emptyBoxXID = urlParams.get("XID");
        let URL = "https://www.torn.com/itemuseparcel.php?rfcv=6702e976a480a";

        let postData = {
            disguise: itemDisguiseID,
            XID: emptyBoxXID,
            items: {0:{
                amount: 1,
                price: 1,
                type: "Special",
                id: (mp3test == true) ? mp3XID : sedXID,
                itemID: parseInt(usePackItemID),
                estimatedPrice: 5078355,
            }},
            step: "createInventoryParcel"
        };
        log("postData: ", postData, " xid: ", emptyBoxXID);
        log("Packed item, ID: ", usePackItemID, " XID: ", (mp3test == true) ? mp3XID : sedXID);
        log("Posted itemDisguiseID: ", itemDisguiseID);
        $.post( URL, postData, processJSONPostResponse);

        emptyBoxXID = 0;
        return false;
    }

    function parcelPageCB(thisLi, itemId) {
        debug("parcelPageCB: ", $(thisLi));
        if ($(thisLi).length == 0) {
            return log("Error: box LI invalid! ID: ", itemId, " Node: ", $(thisLi));
        }
        emptyBoxLi = $(thisLi);
        let linkNode = $(emptyBoxLi).find("div.cont-wrap > div > ul > li.left.use")[0];
        emptyBoxDataUrl = $(linkNode).attr('data-url');
        emptyBoxXID = $(linkNode).attr("data-armory");
        let qty = $(linkNode).attr("data-qty");

        debug("emptyBoxXID: ", emptyBoxXID);
        debug("qty: ", qty);
        debug("url: ", emptyBoxDataUrl);
        debug("sedXID: ", sedXID);

        if (emptyBoxXID) {
            $("#xcreate").on('click', submitCreateParcel);
            $("#xcreate").removeClass("xpbtn3").addClass("xpbtn2");
        }
    }

    // =========== Locate empty box and SED, and go to parcel page to pack it =============
    //
    function useEmptyBox() {
        let useId = (mp3test == true) ? mp3id : sedItemId;
        let newURL = baseTornUrl + emptyBoxDataUrl + "&xFindId=" + useId;
        window.location.href = newURL;
    }

    // Get to special items page, and locate XID's
    function packAnEmptyBox(e) {
        goToPage(spItemTabId);

        // For now, wait...better to call and retry if needed?
        // Or observer? Special Items page needs to be fully displayed.
        // Just need the two XID's....
        // Can do the Quick Items thingy to be sure they have required
        // items before enabling buttons, have Tool Tips to explain whyy disabled...
        setTimeout(locateReactXids, 1000);
    }

    function handleParcelPage(retries=0) {
        let urlParams = new URLSearchParams(window.location.search);
        let findId = urlParams.get("xFindId"); // Saved XID of a box
        if (findId) {
            let tab= $("ul.ui-tabs-nav > li > a[title='Special']"); //[0].click();
            if ($(tab).length == 0) {
                if (retries++ < 20) return setTimeout(handleParcelPage, 250, retries);
                return;
            }
            $(tab)[0].click();
            setTimeout(findItemOnParcelPage, 500, findId);
        }
    }

    function addDevStyles() {
        GM_addStyle(`
            #x-select-dev {
                height: 240px;
                max-height:240px;
                overflow-y: scroll;

                position: absolute;
                z-index: 9999999;
                top: 4px;
                left: 300px;
                border-radius: 5px;

                width:328px;
                background: black;
            }
            #x-select-dev ul {
                width: 320px;

                height: 600px;
                max-height: 340px;
                padding-left: 4px;

                overflow-y: scroll;
                border-radius: 10px;
                opacity: 1;
                transition: 0.5s;
            }
            #x-select-dev ul li:first-child {
                padding-top: 4px;
                padding-bottom: 2px;
                border-bottom: 6px solid black;
                position: sticky;
                z-index: 9999999;
            }
            #x-select-dev ul li:first-child .span-test {
                color: #dddddd;
            }
            #x-select-dev ul li:hover {
                filter: brightness(65%);
                height: 34px;
            }
            #x-select-dev ul li .span-org {
                font: 16px arial;
                color: #cccccc;
                padding: 4px 16px 4px 20px;
                display: flex;
                justify-content: center;
            }
            #x-select-dev ul li .span-test {
                font: 16px arial;
                color: #cccccc;
                padding: 4px 0px 4px 0px;
                display: flex;
                justify-content: center;
            }

            #x-select-dev ul li .span-test:hover {
                color: #ffffff;
                font-weight: 600;
            }
            #x-select-dev ul li .span-wrap:hover {
                padding-top: 3px;
            }
        `);
    }

    function addStyles() {
        addTornButtonExStyles();
        addToolTipStyle();
        addBorderStyles();

        if (xedxDevMode == true)
            addDevStyles();

        const scrollHeight = "480px;";
        GM_addStyle(`
            #x-select {
                height: 30px;
                max-height:20px;
                position: absolute;
                top: 4px;
                left: 300px;
                border-radius: 5px;
                width:328px;
                background: transparent;
            }
            #x-select:hover {
                z-index: 9999999;
                background: black;
            }
            #x-select ul {
                width: 320px;
                height: 28px;
                max-height: 28px;
                padding-left: 4px;

                overflow-y: scroll;
                border-radius: 10px;
                opacity: 0;
                transition: 0.5s;
            }
            #x-select ul li:first-child {
                padding-top: 4px;
                padding-bottom: 2px;
                border-bottom: 6px solid black;
                position: sticky;
                z-index: 9999999;
            }
            #x-select ul li:first-child:hover {
                z-index: 9999999;
            }
            #x-select ul li:first-child .span-test {
                color: #dddddd;
            }

            #x-select ul:hover {
                max-height: ` + scrollHeight +
                ` height: 800px;
                opacity: 1;
            }
            #x-select ul li {
                height: 26px;
                /*background: #888888;*/
                border-top: 1px solid black;
            }
            #x-select ul li:hover {
                filter: brightness(65%);
                height: 34px;
            }
            #x-select ul li .image-wrap {
                position: absolute;
                max-height: 100%;
            }
            #x-select ul li span-test {
                font: 16px arial;
                color: #cccccc;
                padding: 4px 0px 4px 0px;
                display: flex;
                justify-content: center;
            }
            .span-test {
                font: 16px arial;
                color: #cccccc;
                padding: 4px 0px 4px 0px;
                display: flex;
                justify-content: center;
            }
            #x-select ul li .span-test:hover {
                color: #ffffff;
                font-weight: 600;
            }
            #x-select ul li .span-wrap:hover {
                padding-top: 3px;
            }
            .xl-delim{
                width: 40px;
                border-right: 1px solid black;
            }
            #x-select:hover {
                max-height: ` + scrollHeight +
                ` height: 8000px;
                overflow-y: scroll;
            }
            .xname-wrap {
                position: relative;
                z-index: 3;
            }
            .x-title-left {
                width: 85px;
            }
        `);

        GM_addStyle(`
            .xleft-tab {
                width: 8px;
                background: #050;
                margin-left: -8px;
                border-radius: 5px 0px 0px 5px;
                height: 46px;
                margin-right: 0px;
                position: absolute;
                cursor: pointer;
            }
            .xcollapsed {margin-top: -5px;}
            .xopen {margin-top: 5px;}
            .xcollapsed-tt {margin-top: -28px;}
            .xopen-tt {margin-top: -4px;}
            .xpsp {
                font: 16px arial;
                color: var(--item-info-color-font);
                margin-top: 18px;
                margin-left: 15px;
            }
            .xpsp-tt {
                font: 16px arial;
                color: var(--item-info-color-font);
                margin-top: 10px;
                margin-left: 15px;
            }
            .xpbtn {
                margin-left: 15px;
                margin-bottom: 10px;
                margin-top: 8px;
                padding: 6px 10px;
            }
            .xpbtn-tt {
                margin-left: 15px;
                margin-bottom: 10px;
                padding: 6px 10px;
                border-radius: 10px;
            }
            .xpbtn2 {
                margin-left: 55px;
                padding: 2px 10px;
                border: 2px solid #070 !important;
            }
            .xpbtn3 {
                margin-left: 55px;
                padding: 2px 10px;
                color: #777 !important;
            }
            .xpdiv {
                display: flex;
                flex-direction: row;
                width: 100%;
                position: absolute;
            }
            .xtabbed {
                position: relative;
                border-left: 8px solid lightblue;
                border-radius: 5px;
                padding-left: 10px;
                left: -10px;
                top: -5px;
            }
            
        `);
    }

    function findEmptyBoxCB(thisLi, itemId) {
        if ($(thisLi).length == 0) {
            return log("Error: box LI invalid! ID: ", itemId, " Node: ", $(thisLi));
        }
        emptyBoxLi = $(thisLi);
        let linkNode = $(emptyBoxLi).find("div.cont-wrap > div > ul > li.left.use")[0];
        emptyBoxDataUrl = $(linkNode).attr('data-url');
        emptyBoxXID = $(linkNode).attr("data-armory");
        let qty = $(linkNode).attr("data-qty");
        if (emptyBoxXID) {
            $("#x-submit").val("Go!");
            $("#x-submit").css("color", "#080");
            $("#x-submit").off();
            $("#x-submit").on('click.xedx', useEmptyBox);
        }
    }

    // ======================== Load items from Special tab UL ======================

    function locateItem(category, itemId, loadCallback) {

        if (!category || !itemId || !loadCallback) {
            console.error("Invalid arguments! category: ", category, " ID: ", itemId, " cb: ", loadCallback);
            return;
        }

        getItemCategory(category, itemId, loadCallback);

        function processLoadResponse(response, status, xhr, findId, callback) {
            log("Process Load Response: ", status);
            let data = JSON.parse(response);
            let html = data.html;

            log("Find ID: ", findId);

            $("#xedx-fake > ul > li").remove();
            $("#xedx-fake > ul").html(html);

            // Find item by ID
            let thisLi = $("#xedx-fake > ul > li[data-item='" + findId + "']");
            callback(thisLi, findId);

            $("#xedx-fake > ul > li").remove();
        }

        function getItemCategory(category, itemId, loadCallback) {
            if (!$("#xedx-fake").length) {
                let fakeDiv = "<div id='xedx-fake' style='display: none;'><ul id='fake-ul'></ul></div>";
                $("body").after(fakeDiv);
            }

            let URL = "https://www.torn.com/item.php?rfcv=66c24f2e7a892 #quickItems";
            let postData = {step: "getCategoryList",
                            itemName: category,
                            start: 0,
                            test: true,
                            prevtotal: 0};

            var callback = function (response, status, xhr) {
                processLoadResponse(response, status, xhr, itemId, loadCallback);
            };

            $.post(URL, postData, callback);
        }
    }

    // ===================== Start things once page has loaded DOM ===================

    function handlePageLoad() {
        if (onMakeParcelPage() == true) {
            handleParcelPage();
        } else {
            additemPageDashboard();

            $("#x-submit").on('click.xedx', function() {
                locateItem("Special", emptyBoxId, findEmptyBoxCB);
            });

            $("#x-use-parcel").on('click.xedx', useParcel);

            if (emptyBoxXID) {
                $("#x-submit").val("Go!");
                $("#x-submit").css("color", "#080");
                $("#x-submit").off();
                $("#x-submit").on('click.xedx', useEmptyBox);
            }

            if (hasQuickItems == true && displayAsQuickItem == true) {
                $("#xedx-i372").on('click.xedx', useEmptyBox);
                $("#xqi372-remove").on('click.xedx', function(e) {
                    $("#xedx-i372").remove();
                    $(".ui-tooltip-content").parent().remove();
                });
                $("#xedx-i373").on('click.xedx', useParcel);
                $("#xqi373-remove").on('click.xedx', function(e) {
                    $("#xedx-i373").remove();
                    $(".ui-tooltip-content").parent().remove();
                });
            }
        }
    }

    // ================ callback for items list ==========================

    // TBD: also add style to change when clicked?
    function handleListClick(e) {
        debug("handleListClick: ", $(this));

        let itemId = $(this).attr("data-item-id");
        let name = $(this).attr("data-title");
        debug("handleListClick, id: ", itemId, " name: ", name);

        let sel = mainSelect + " > ul";
        $(sel).prepend(this);

        sel = sel + " > li:first";
        let firstLi = $(sel);
        $(firstLi).focus();

        GM_setValue("itemDisguiseID", itemId);
    }

    function archived() {
        let liOrg = `<li data-item-id="` + id + `" data-title="` + name + `"></li>`;

        let liAdvanced = `
              <li data-item-id="` + id + `" data-title="` + name + `">
                  <div>
                      <span>` + name + `</span>
                      <span><img class="torn-item small" src="/images/items/` + id + `/small.png" alt="` + name + `"></span>
                  </div>
              </li>`;

    }

    function insertListItems(retries=0) {
        let sel = mainSelect + " > ul";
        let ul = $(sel);
        if ($(ul).length == 0) {
            if (retries++ < 10) return setTimeout(insertListItems, 250, retries);
            return log("Unable to find items list!");
        }

        log("UL: ", $(ul));

        let itemIds = Object.keys(tornItemsList);
        for (let idx=0; idx<itemIds.length; idx++) {
            let id = itemIds[idx];
            let name = tornItemsList[id].trim();
            let addClass = "";
            if (itemDisguiseID == parseInt(id)) addClass = ' xdisguise ';

            let imgSpan = `<span class="image-wrap">
                                <img class="torn-item small" src="/images/items/` + id + `/small.png" alt="` + name + `">
                           </span>`;

            let liAdvanced2 = `
                <li data-item-id="` + id + `" class="title-black ` + addClass + `" data-title="` + name + `">
                    <div class="title-wrap">
                        <div class="x-title-left">` +
                            ((downloadImages == true) ? imgSpan : "") +
                        `</div>
                        <div class="span-wrap">
                            <span class="name span-test">` + name + `</span>
                        </div>
                    </div>
                </li>
            `;

            if (itemDisguiseID == parseInt(id))
                $(ul).prepend(liAdvanced2);
            else
                $(ul).append(liAdvanced2);
        }

        $(ul).find("li").on('click', handleListClick);

        let list = mainSelect + " > ul";
        let matches = $(list).children("li");
        let attr = "data-title";
        let ord = "asc";

        tinysort(matches, {attr: attr, order: ord});

        // Move disguised back to top
        sel = mainSelect + " > ul";
        let el = $(sel).find(".xdisguise")[0];
        $(ul).prepend(el);
        $(el).removeClass("xdisguise");
    }

    function itemsQueryCB(responseText, ID) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            if (jsonResp.error.code == 6) return;
            return handleError(responseText);
        }

        let itemsJson = jsonResp.items;
        let itemIds = Object.keys(itemsJson);

        for (let idx=0; idx<itemIds.length; idx++) {
            let itemId = itemIds[idx];
            let item = itemsJson[itemId]
            let name = item.name;
            tornItemsList[itemId] = name;
        }

        let itemKeys = Object.keys(tornItemsList);
        GM_setValue("tornItemsList", JSON.stringify(tornItemsList));
        GM_setValue("useCachedItems", true);
        GM_setValue("CachedItemsCount", itemKeys.length);
        itemsListValid = true;
        if ($(mainSelect).length > 0)
            insertListItems();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    validateApiKey();
    versionCheck();

    if (useCachedItems == false) {
        xedx_TornTornQuery("", "items", itemsQueryCB);
    }

    addStyles();

    if (!onMakeParcelPage()) locateItem("Special", emptyBoxId, findEmptyBoxCB);

    callOnContentLoaded(handlePageLoad);

})();


