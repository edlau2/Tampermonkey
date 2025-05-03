// ==UserScript==
// @name         Torn Needle Roller
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Allow quick-equip for needles
// @author       xedx [2100735]
// @run-at       document-start
// @match        https://www.torn.com/item.php*
// @connect      api.torn.com
// @icon         https://www.google.com/s2/favicons?domain=torn.com
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

(function() {
    'use strict';

    debugLoggingEnabled = true;

    const rfcv = getRfcv();
    const URL = `https://www.torn.com/item.php?rfcv=${rfcv} #quickItems`;
    const delim = `<hr class="delimiter-999 m-top10 m-bottom10">`;
    var expectedItems = 0;
    var updateWaiting = false;

    var needlesAdded = false;
    var needlesBeingAdded = false;
    var updateTimer = null;

    function getItemCategory(category) {
        log("[getItemCategory]");
        let postData = {step: "getCategoryList",
                        itemName: category,
                        start: 0,
                        test: true,
                        prevtotal: 0};

        $.post( URL, postData, function(response, status, xhr){
            processLoadResponse(response, status, xhr);
        });
    }

    var inEquip = false;
    var equipURL = `https://www.torn.com/item.php?rfcv=${rfcv}`;
    function doEquip(e) {
        log("doEquip: ", inEquip, $(this).parent());
        if (inEquip == true) return;

        inEquip = true;
        setTimeout(function(){inEquip = false;}, 500);

        let target = $(this).parent();
        e.preventDefault();
        event.stopPropagation();
        let itemId = $(target).data("item");
        let xid = $(target).data("id");

        let postData = {step: "actionForm",
                        item_id: itemId,
                        type: 5,
                        action: "equip",
                        item: itemId,
                        id: xid,
                        confirm: 1
                       };

        log("postData: ", postData);

        $.post( equipURL, postData, function(response, status, xhr){
            processEquipResponse(response, status, xhr);
        });

        return false;
    }

    function hashChangeHandler(e) {
        debug("hashChangeHandler e: ", e);
    }

    function pushStateChanged(e) {
        debug("hashChangeHandler e: ", e);
    }

    function processLoadResponse(response, status, xhr, target) {
        debug("[processLoadResponse] ", status);

        let data = JSON.parse(response);
        let html = data.html;

        if ($("#xedx-fake").length == 0) {
            let fakeDiv = "<div id='xedx-fake' style='display: none;'><ul id='fake-ul'></ul></div>";
            $("body").after(fakeDiv);
        }

        $("#xedx-fake > ul > li").remove();
        $("#xedx-fake > ul").html(html);
        let list = $("#xedx-fake > ul > li");
        log("List: ", $(list).length, $(list));

        if ($(list).length == 0)
            debugger;

        if (updateWaiting == true) {
            updateNeedles("LoadResponse");
        } else {
            getOwnedNeedles("xedx-fake");
        }
    }

    function closeResult() {
        $("#equip-result").empty();
        $("#equip-result").removeClass("has-res");
    }

    function processEquipResponse(response, status, jqXHR) {
        updateNeedles();
        $("#equip-result").html(response);
        $("#equip-result").addClass("has-res");
        setTimeout(closeResult, 10000);
    }

    function handleGetFocus() {
        debug("handleGetFocus");
    }

    var needles = [ {id: 463, xid: '', lid: 'xndl-0', name: 'Epinephrine', disp: "Epi", qty: 0, equipped: false, loaded: false, fac: false},
                    {id: 463, xid: '', lid: 'xndl-1', name: 'Epinephrine', disp: "Epi", qty: 0, equipped: false, loaded: false, fac: true},
                    {id: 464, xid: '', lid: 'xndl-2', name: 'Melatonin', disp: "Mela", qty: 0, equipped: false, loaded: false, fac: false},
                    {id: 464, xid: '', lid: 'xndl-3', name: 'Melatonin', disp: "Mela", qty: 0, equipped: false, loaded: false, fac: true},
                    {id: 465, xid: '', lid: 'xndl-4', name: 'Serotonin', disp: "Sero", qty: 0, equipped: false, loaded: false, fac: false},
                    {id: 465, xid: '', lid: 'xndl-5', name: 'Serotonin', disp: "Sero", qty: 0, equipped: false, loaded: false, fac: true},
                    {id: 814, xid: '', lid: 'xndl-6', name: 'Tyrosine', disp: "Tyro", qty: 0, equipped: false, loaded: false, fac: false},
                    {id: 814, xid: '', lid: 'xndl-7', name: 'Tyrosine', disp: "Tyro", qty: 0, equipped: false, loaded: false, fac: true}
                  ];

    function scrubEntry(entry) {
        if (entry.qty == undefined) entry.qty = 0;
        if (entry.xid == undefined) entry.xid = '0';
        if (entry.equipped == undefined) entry.equipped = false;
    }

    // Compare two entries, return false if different (for our purposes)
    function compareEntries(entryA, entryB) {
        if (entryA.qty != entryB.qty) return false;
        if (entryA.equipped != entryB.equipped) return false;
        if (entryA.xid != entryB.xid) return false;

        return true;
    }

    function getOwnedNeedles(root, retries=0) {
        //log("[getOwnedNeedles] root: ", root, $(`#${root}`));

        if ($(`#${root}`).length == 0) {
            if (retries++ < 20) return setTimeout(getOwnedNeedles, 250, root, retries);
            return log("[getOwnedNeedles] timeout");
        }

        expectedItems = 0;
        for (let idx=0; idx<needles.length; idx += 2) {
            let entryOwn = needles[idx];
            let entryFac = needles[idx+1];

            entryOwn.qty = $(`#${root} li[data-item='${entryOwn.id}'][data-sort='${entryOwn.name}']:not(:has(.left.return))`).data("qty");
            entryFac.qty = $(`#${root} li[data-item='${entryFac.id}'][data-sort='${entryFac.name}']:has(.left.return)`).data("qty");

            entryOwn.equipped = $(`#${root} li[data-item='${entryOwn.id}'][data-sort='${entryOwn.name}']:not(:has(.left.return))`).data("equipped");
            entryFac.equipped = $(`#${root} li[data-item='${entryFac.id}'][data-sort='${entryFac.name}']:has(.left.return)`).data("equipped");

            entryOwn.loaded = $(`#${root} li[data-item='${entryOwn.id}'][data-sort='${entryOwn.name}']:not(:has(.left.return))`).data("loaded");
            entryFac.loaded = $(`#${root} li[data-item='${entryFac.id}'][data-sort='${entryFac.name}']:has(.left.return)`).data("loaded");

            entryOwn.xid = $(`#${root} li[data-item='${entryOwn.id}'][data-sort='${entryOwn.name}'] .actions.right:not(:has(.left.return))`).attr("xid");
            entryFac.xid = $(`#${root} li[data-item='${entryFac.id}'][data-sort='${entryFac.name}'] .actions.right:has(.left.return)`).attr("xid");

            scrubEntry(entryOwn);
            scrubEntry(entryFac);

            if (parseInt(entryOwn.qty) > 0) expectedItems++;
            if (parseInt(entryFac.qty) > 0) expectedItems++;
        }
    }

    // Need to catch collisions, if the interval timer pops
    // while requesting server data - otherwise we do not
    // have valid response data!
    function updateNeedles(from) {
        debug("[updateNeedles] ", updateWaiting, from);
        if (updateWaiting == true && !from) {
            return debug("Not from query response!");
        }
        if (updateWaiting == false) {
            debug("Sending update req");
            updateWaiting = true;
            getItemCategory("Temporary");
            return;
        }

        if (from != "LoadResponse") {
            debugger;  // should have been caught
            return log("Error: called before response ready!");
        }
        updateWaiting = false;
        let dirty = false;

        let root = "xedx-fake";
        for (let idx=0; idx<needles.length; idx += 2) {

            let entryOwn = needles[idx];
            let entryFac = needles[idx+1];

            let beforeOwn = JSON.parse(JSON.stringify(entryOwn));
            let beforeFac = JSON.parse(JSON.stringify(entryFac));

            entryOwn.qty = $(`#${root} li[data-item='${entryOwn.id}'][data-sort='${entryOwn.name}']:not(:has(.left.return))`).data("qty");
            entryFac.qty = $(`#${root} li[data-item='${entryFac.id}'][data-sort='${entryFac.name}']:has(.left.return)`).data("qty");

            entryOwn.equipped = $(`#${root} li[data-item='${entryOwn.id}'][data-sort='${entryOwn.name}']:not(:has(.left.return))`).data("equipped");
            entryFac.equipped = $(`#${root} li[data-item='${entryFac.id}'][data-sort='${entryFac.name}']:has(.left.return)`).data("equipped");

            entryOwn.loaded = $(`#${root} li[data-item='${entryOwn.id}'][data-sort='${entryOwn.name}']:not(:has(.left.return))`).data("loaded");
            entryFac.loaded = $(`#${root} li[data-item='${entryFac.id}'][data-sort='${entryFac.name}']:has(.left.return)`).data("loaded");

            entryOwn.xid = $(`#${root} li[data-item='${entryOwn.id}'][data-sort='${entryOwn.name}'] .actions.right:not(:has(.left.return))`).attr("xid");
            entryFac.xid = $(`#${root} li[data-item='${entryFac.id}'][data-sort='${entryFac.name}'] .actions.right:has(.left.return)`).attr("xid");

            scrubEntry(entryOwn);
            scrubEntry(entryFac);

            if (compareEntries(entryOwn, beforeOwn) == false) {
                debug("****** Owned Entry Change Detected! ******  ");
                debug("before: ", beforeOwn);
                debug("after: ", entryOwn);

                // Safety net:
                if (entryOwn.xid == "0" && beforeOwn != "0" && entryOwn.qty == 0 && beforeOwn.qty != 1) {
                    debugger;
                    debug("ERROR: Possible bad result?");
                } else {
                    replaceNode(entryOwn);
                    dirty = true;
                }
            }
            if (compareEntries(entryFac, beforeFac) == false) {
                debug("****** Fac Entry Change Detected! ******  ");
                debug("before: ", beforeFac);
                debug("after: ", entryFac);

                // Safety net:
                if (entryFac.xid == "0" && beforeFac != "0" && entryFac.qty == 0 && beforeFac.qty != 1) {
                    debugger;
                    debug("ERROR: Possible bad result?");
                } else {
                    replaceNode(entryFac);
                    dirty = true;
                }
            }

            if (dirty == true) {
                $(`.xndl-container`).off();
                $(`.xndl-container`).on('click.xedx', doEquip);
            }
        }

        function replaceNode(entry) {
            let newNode = getNodeForEntry(entry);
            $(`#xndl-list #${entry.lid}`).replaceWith(newNode);
            debug("replaceNode: ", JSON.stringify(entry, null, 4), $(`#xndl-list #${entry.lid}`));
            updateNodeProperties(entry);
        }
    }

    function updateNodeProperties(entry) {
        debug("updateNodeProperties: ", JSON.stringify(entry, null, 4));
        if (parseInt(entry.qty) == 0) {
            $(`#${entry.lid} .xndl-container`).addClass("xndlhidden");
        } else {
            $(`#${entry.lid} .xndl-container`).removeClass("xndlhidden");
        }

        if (entry.equipped == true) {
            $(`#${entry.lid} .xndl-container`).css("border", "2px solid green");
        } else {
            $(`#${entry.lid} .xndl-container`).css("border", "1px solid blue");
        }
    }

    function getNodeForEntry(entry) {
        let node = `
                <div id="${entry.lid}" class="xndl-item" data-item="${entry.id}" data-id="${entry.xid}" title="${entry.name}"
                data-category="Temporary" data-equipped="${entry.equipped}">
                    <section class="xndl-container">
                        <div class="xpic" style="background-image: url(/images/items/${entry.id}/medium.png)"></div>
                        <div class="text">${entry.disp} x${entry.qty}</div>
                    </section>
                </div>`;
        return node;
    }

    function addNeedlesToList(retries=0) {
        debug("[addNeedlesToList] ", needlesBeingAdded, $("#xndl").length, $("#xndl"));

        if (needlesBeingAdded == true && retries == 0)
            return debug("Needles already being added!");
        needlesBeingAdded = true;

        if ($("#xndl").length == 0) {
            if (retries++ < 30) return setTimeout(addNeedlesToList, 500, retries);
            needlesBeingAdded = false;
            return log("[addNeedlesToList] timed out.");
        }

        needles.forEach((entry, index) => {
            let node = getNodeForEntry(entry);
            if (entry.fac == false) {
                $("#xndl-list.xown").append(node);
            } else {
                $("#xndl-list.xfac").append(node);
            }

           updateNodeProperties(entry);
           $(`.xndl-container`).on('click.xedx', doEquip);
        });

        needlesBeingAdded = false;
        needlesAdded = true;

        updateTimer = setInterval(updateNeedles, 15000);
    }

    function installUI(retries=0) {
        debug("[installUI]");
        if ($("#loadoutsRoot").length == 0) {
            if (retries++ < 40) return setTimeout(installUI, 250, retries);
            return log("[installUI] timeout");
        }
        $("#loadoutsRoot").before(getNeedleWrap());

        addNeedlesToList();
    }

    function handlePageLoad() {
        installUI();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart(false);

    //validateApiKey();
    versionCheck();
    addStyles();

    getItemCategory("Temporary");

    installPushStateHandler(pushStateChanged);
    callOnHashChange(hashChangeHandler);
    callOnContentLoaded(handlePageLoad);


    // ================ UI stuff, out of the way down here ===============

    function getNeedleWrap() {
        let wrap = `<div id='xndl' class="xndl-wrap">
                        <div class="xndl-list-wrap">
                            <div id="xndl-list" class="xndl-inner xown">
                            </div>
                            <div id="xndl-list" class="xndl-inner xfac">
                            </div>
                        </div>
                        <div id="equip-result">
                        </div>
                    </div> ${delim}`;
        return wrap;
    }

    function addStyles() {

        addBorderStyles();

        GM_addStyle(`
            #xndl {
                display: flex;
                flex-direction: column;
                /*flex-flow: row wrap;*/
                justify-content: space-between;
                background: linear-gradient(180deg,#555,#333) no-repeat;
                border-radius: 5px;
                overflow: visible;
                padding: 8px 10px 8px 10px;
                /*margin-bottom: 10px;*/
            }
            .xndl-list-wrap {
                display: flex;
                flex-flow: row-wrap;
                justify-content: space-between;
            }
            #xndl-list {
                display: flex;
                flex-flow: row wrap;
                justify-content: space-evenly;
                width: 50%;
                min-height: 64px;
                border: 2px solid #777;
            }
            .xown {
                border: 1px solid limegreen;
                margin-right: 5px;
            }
            .xfac {
                border: 1px solid purple;
                margin-left: 5px;
            }
            .xndl-owned { border: 2px solid limegreen; }
            .xndl-item {
                display: inline-block;
                cursor: pointer;
                position: relative;
                padding: 10px 5px 10px 5px;
                border-radius: 5px;
                border-width: 2px;
                margin: 5px 5px 0px 0px;
            }

            .xpic {
                width: 60px;
                height: 30px;
                background-size: cover;
                margin-left: 7px;
            }
            #xndl .text {
                display: flex;
                justify-content: center;
                padding-bottom: 6px;
            }
            .xndlhidden {
                /*height: 0;*/
                /*display: none;*/
                z-order: -1;
                opacity: .3;
            }
            body:not(.dark-mode) #xndl {
                background: var(--default-panel-gradient);
            }
            #xndl .xndl-inner {
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: row;
                border-radius: 5px;
                background: black;
                justify-content: space-between;
                gap: 5px;
                padding: 0px 14px;
            }
            body:not(.dark-mode) #xndl .xndl-inner {
                background-color: var(--default-bg-panel-color);
                background: var(--default-panel-gradient);
            }
            .xndl-container {
                max-width: 64px;
                border-radius: 6px;
                background-color: #333;
                cursor: pointer;
            }
            .xndl-container:hover {
                filter: bightness(1.2);
            }
            .xndl-container > img {
                overflow-x: hidden;
                padding-left: 5px;
            }
            body:not(.dark-mode) .xndl-container {
                background: linear-gradient(0deg,#ebebeb,#ddd);
                box-shadow: inset 0 2px 4px #00000040,0 1px 0 #fff;
            }
            .has-res {
                height: 20px;
                padding-top: 10px;
                align-items: center;
                display: flex;
                flex-flow: row wrap;
            }
        `);

        GM_addStyle(`
            .custom-menu {
                display: none;
                z-index: 1000;
                position: absolute;
                overflow: hidden;
                border: 1px solid green;
                white-space: nowrap;
                font-family: sans-serif;
                background: #ddd;
                color: #333;
                border-radius: 5px;
                padding: 0;
            }

            .custom-menu li {
                padding: 8px 12px;
                cursor: pointer;
                list-style-type: none;
                transition: all .3s ease;
                user-select: none;
            }

            .custom-menu li:hover {
                background-color: #DEF;
            }
        `);
    }



})();


