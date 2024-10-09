// ==UserScript==
// @name         Torn Quick Parcels
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Quickly add an SED to a parcel
// @author       xedx [2100735]
// @match        https://www.torn.com/item.php*
// @match        https://www.torn.com/itemuseparcel.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
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

    debugLoggingEnabled = false;

    // No longer dashboards, just som small DIVs....
    const itemPageDashboard = `
        <div id="xitem-page" class="xpdiv">
            <span class="xpsp">Quick Parcels</span>
            <input id="btn1" type="submit" class="xedx-torn-btn-raw xpbtn" value="Pack an SED">
        </div>
    `;

    // Unused, older method...
    const parcelPageDashboard = `
        <div id="xparcel-page" class="xpdiv">
            <span class="xpsp">Quick Parcels</span>
            <input id="btn10" type="submit" class="xedx-torn-btn-raw xpbtn" value="Create Parcel!">
        </div>
    `;

    const addSedBtn = `<input id="xcreate" type="submit" class="xedx-torn-btn-raw xpbtn2" value="Create Parcel!">`;

    const spItemCat = "special-items";    // Where empty boxes are
    const spItemTabId = "ui-id-23";       // Tab ID for empty box (tab along top)

    const emptyBoxId = "372";             // Item ID for an empty box
    const sedItemId = "380";              // "" for a SED, on same page

    var emptyBoxLi;                       // List item element for an empty box
    var sedLi;                            // LI for an SED
    var sedUseItemSlot;                   // Where the Use Item btn would be, but isn't...

    const baseTornUrl = "https://www.torn.com/";
    const itemsURL = "https://www.torn.com/item.php";
    var emptyBoxXID;
    var emptyBoxDataUrl;
    var sedXID;

    // ============ Helpers =======================
    const onMakeParcelPage = function() { return (location.href.indexOf("itemuseparcel") > -1);}

    function scrollTo (elem) {
       $('html,body').animate({
          scrollTop: $(elem).offset().top - $(window).height()/2
       }, 500);
    }

    // Find item's LI on Items pge
    function getLiByItemId(itemId, category) {
        if (!category) category = spItemCat;
        let selector = "ul#" + category + " li[data-item='" + itemId + "']"
        var element = $(selector)[0];
        return element;
    }

    // From Items page, go to Special Items tab
    function goToSpecialItemsPage() {
        let sel = "#" + spItemTabId;
        $(sel).click();
    }

    // ============== Locate XID for SED, by name... and create the parcel ==================
    var foundElement;
    function findItemOnPage(itemId, retries=0) {
        let list = $("ul.special-items > li");
        if (list.length == 0 || document.readyState != "complete") {
            if (retries++ < 10) return setTimeout(findItemOnPage, 250, itemId, retries);
            return;
        }

        sedXID = 0;
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
                        if ( it && it.toLowerCase().indexOf("small explosive") > -1)
                            nameNode = node;
                    }
                }
            }

            let name = $(nameNode).text();
            debug("name: ", name);

            if (name) {
                if (name.toLowerCase().indexOf("small explosive") > -1) {
                    let parts = reactId.split("$");
                    sedXID = parts[3];
                    if (!$("#xcreate").length) {
                        let name = $(element).find(".title-wrap > div.name-wrap")[0];
                        debug("name: ", $(name));
                        $(name).append(addSedBtn);
                        $("#xcreate").on('click', submitCreateParcel);
                        scrollTo(element);
                    }
                    return sedXID;
                }
            }
        }

        // Not found, retry. Need a way to see when really fully loaded,
        // or observer. Or maybe don't need, can add SED anyways...
        log("Didn't find item, retrying!");
        if (retries++ < 30) {
            return setTimeout(findItemOnPage, 250, itemId, retries);
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
            let Q = "\r\n\r\nPress OK to go pack another,\r\nCancel to simply return to the items page.";
            tryAgain = confirm("Success!" +
                               (jsonObj.text ? ("\r\n\r\n" + jsonObj.text) : "") + Q);
            //if (confirm("OK to pack another, cancel to go back to items.")
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

        if (tryAgain == true) {
            location.href = itemsURL + "?qp=true"
        } else {
            history.back();
        }
    }

    // POST an 'add sed to box to make parcel' request
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
            disguise: 133,
            XID: emptyBoxXID,
            items: {0:{
                amount: 1,
                price: 1,
                type: "Special",
                id: sedXID,
                itemID: 380,
                estimatedPrice: 5078355,
            }},
            step: "createInventoryParcel"
        };
        debug("postData: ", postData, " xid: ", emptyBoxXID);
        $.post( URL, postData, processJSONPostResponse);

        // This didn't work...
        /*
        if (findItemOnPage(380)) {
            let boxImg = $('img[alt="Empty Box"]')[0];
            // data-reactid
            if ($(boxImg).length) {
                emptyBoxXID = 0;
                let reactId = $(boxImg).attr("data-reactid");
                if (reactId) {
                    let parts = reactId.split("$");
                    log("Parts: ", parts);
                    emptyBoxXID = parts[3];
                    log("emptyBoxXID: ", emptyBoxXID);
                    if (emptyBoxXID && emptyBoxXID.indexOf(".") > -1) {
                        emptyBoxXID = emptyBoxXID.split(".")[0];
                        log("emptyBoxXID: ", emptyBoxXID);
                    }
                }
            }
            log("emptyBoxXID: ", emptyBoxXID);

            if (emptyBoxXID && sedXID) {
                $("#xcreate").on('click', submitCreateParcel);
                $("#xcreate").removeClass("xpbtn3").addClass("xpbtn2");
            }
        }
        */


        return false;
    }

    // =========== Locate empty box and SED, and go to parcel page to pack it =============
    //
    function useEmptyBox() {
        let newURL = baseTornUrl + emptyBoxDataUrl + "&xFindId=" + sedItemId;
        window.location.href = newURL;
    }

    // Try to find empty box react ID (XID)
    var reactRetries = 0;
    function locateReactXids(e) {
        if (emptyBoxXID) return useEmptyBox();

        emptyBoxLi = getLiByItemId(emptyBoxId);
        let linkNode = $(emptyBoxLi).find("div.cont-wrap > div > ul > li.left.use")[0];
        emptyBoxDataUrl = $(linkNode).attr('data-url');
        emptyBoxXID = $(linkNode).attr("data-armory");
        sedLi = getLiByItemId(sedItemId);

        // If we need an extra button to click to go to send
        // page, could place here...
        sedUseItemSlot = $(sedLi).find("div.cont-wrap > div > ul > li:nth-child(1)")[0];
        $(sedUseItemSlot).css("border", "1px solid blue");

        log("XID: ", emptyBoxXID, " URL: ", emptyBoxDataUrl, " SED: ", $(sedLi), " slot: ", $(sedUseItemSlot));

        if (emptyBoxXID && sedLi) {
            //useEmptyBox();
            $("#btn1").val("Go!");
            if (secondEvent == true)
                $("#btn1").css("color", "#080");
        } else {
            if (secondEvent == true) {
                if (reactRetries++ < 10) return setTimeout(locateReactXids, 250);
            }
            if (reactRetries++ > 5 && reactRetries < 10) {
                if (confirm("Something went wrong!\r\n" +
                            "Didn't find a box or an SED, or their IDs!\r\n" +
                            "Press OK to try again or Cancel to give up.")) {
                    emptyBoxXID = undefined;
                    return setTimeout(locateReactXids, 250);
                }
            } else if (reactRetries < 10) {
                return setTimeout(locateReactXids, 250);
            }
        }
    }

    // Get to special items page, and locate XID's
    function packAnEmptyBox(e) {
        goToSpecialItemsPage();

        // For now, wait...better to call and retry if needed?
        // Or observer? Special Items page needs to be fully displayed.
        // Just need the two XID's....
        // Can do the Quick Items thingy to be sure they have required
        // items before enabling buttons, have Tool Tips to explain whyy disabled...
        setTimeout(locateReactXids, 1000);
    }
    //
    // =====================================================================================

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
            setTimeout(findItemOnPage, 500, findId);
        }
    }

    function addStyles() {
        addTornButtonExStyles();

        GM_addStyle(`
            .xpsp {
                font: 16px arial;
                color: #cccccc;
                margin-top: 9px;
            }
            .xpbtn {
                margin-left: 15px;
                margin-bottom: 10px;
                padding: 6px 10px;
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
            }
        `);
    }

    var secondEvent = false;
    function handlePageLoad() {
        if (onMakeParcelPage() == true) {
            handleParcelPage();
        } else {
            $("#quickItems").after(itemPageDashboard);

            let urlParams = new URLSearchParams(window.location.search);
            $("#btn1").on('click', packAnEmptyBox);

            debugger;
            if (urlParams.get("qp") == "true") {
                secondEvent = true;
                callOnContentComplete(packAnEmptyBox);
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (checkCloudFlare()) return log("Won't run while challenge active!");
    versionCheck();

    addStyles();

    callOnContentLoaded(handlePageLoad);

})();


