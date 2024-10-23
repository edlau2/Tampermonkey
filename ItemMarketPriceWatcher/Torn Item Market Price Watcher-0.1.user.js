// ==UserScript==
// @name         Torn Item Market Price Watcher
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Monitor the Item Market for low prices
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
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

    // boxing gloves
    //const itemType = "Booster";
    //const searchItemId = "330";

    var doQuit = false;

    function doAjaxPost(useUrl, postData, callbackFn, params) {
        log("[doAjaxPost] URL: ", useUrl, " data:", postData);

        if (typeof callbackFn != 'function')
            return console.error("Function argument required!");

        $.ajax({
            url: useUrl,
            type: 'POST',
            data: postData,
            callback: callbackFn,
            params: params,
            success: function (response, status, xhr) {
                //log("[doAjaxPost] success!");
                //log("[doAjaxPost] resp: ", response);

                if (typeof callbackFn === 'function')
                    callbackFn(response, status, xhr, params);
                else
                    console.error("Function argument required!");
            },
            error: function (jqXHR, textStatus, errorThrown) {
                log("Error in doAjaxPost: ", textStatus);
                log("Error thrown: ", errorThrown);
            }
        });
    }

     function testBCallback(response, status, xhr, params) {
        log("testBCallback, params: ", params);
        let itemsArray = response.items;
        //log("Array: ", itemsArray);
        if (itemsArray) {
            itemsArray.forEach((item) => {
                //log(item);
                if (item.itemID == params.id) { // Taurin, for test
                    log("Item: ", item);
                    let min = Number(item.minPrice);
                    $(params.sel).text(params.name + ": " + asCurrency(item.minPrice));

                    if (min < params.low)
                        $(params.sel).addClass("flash-grn");
                    else
                        $(params.sel).removeClass("flash-grn");
                }
            });
        }
    }

    function getGlovesPrice() {
        let URL = "https://www.torn.com/page.php?sid=iMarket&step=getShopList&rfcv=67177f6049e99";
        let postData = {type: "Booster", offset: 0};

        let params = {name: "Gloves", id: 330, sel: "#fetch-msg2", low: 441000000};
        doAjaxPost(URL, postData, testBCallback, params);

        if (doQuit == false) {
            let repeatTimeSecs = getRandomIntEx(20, 40);
            log("Repeating in ", repeatTimeSecs, " secs");
            setTimeout(getGlovesPrice, repeatTimeSecs*1000);
        }
    }

    function getTaurinePrice() {
        let URL = "https://www.torn.com/page.php?sid=iMarket&step=getShopList&rfcv=67177f6049e99";
        let postData = {type: "Energy Drink", offset: 0};

        let params = {name: "Taurine", id: 533, sel: "#fetch-msg", low:4150000};
        doAjaxPost(URL, postData, testBCallback, params);

        if (doQuit == false) {
            let repeatTimeSecs = getRandomIntEx(20, 40);
            log("Repeating in ", repeatTimeSecs, " secs");
            setTimeout(getTaurinePrice, repeatTimeSecs*1000);
        }

    }

    function doBtnC() {
        getTaurinePrice();
        getGlovesPrice();

        // Instead of reg interval, do random?
        //setInterval(getTaurinePrice, 30000);

    }

    // =============================== Startup, create a mini dashboard ==============================

    function createDashboard() {
        if ($("#x-fetch-test").length > 0) {
            log("Window exists!");
            return;
        }

        let myDiv = getWindowDiv();
        $("#mainContainer").append(myDiv);

        log("UI apended: ", $("#x-fetch-test"));

        $("#x-fetch-close").on('click', function () {
            doQuit = true;
            $("#x-fetch-test").remove();
        });

        $("#x-fetch-a").on('click', function () {
            doQuit = true;
        });
        //$("#x-fetch-b").on('click', runTestB);
        //$("#x-fetch-c").on('click', doBtnC);


        dragElement(document.getElementById("x-fetch-test"));

        startSavingPos(1500, "x-fetch-test", true);

        doBtnC();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    versionCheck();

    addTornButtonExStyles();
    addWindowStyles();

    callOnContentLoaded(createDashboard);

    // ============================ styles & UI ================================


    function getWindowDiv() {
        const floatingDiv = `
            <div id="x-fetch-test" class="x-fetch-wrap x-drag xbgreen xbgb">
                <div id="x-fetch-testheader">
                    <div class="x-fetch-hdr title-black top-round">
                        <div role="heading" aria-level="5">Fetch Test</div>
                        <div class="x-fetch-hdr">
                            <!-- span id="x-fetch-a" class="x-rt-btn x-inner-span xml10">Q</span>
                            <span id="x-fetch-b" class="x-rt-btn x-inner-span xml10">B</span -->
                            <span id="x-fetch-c" class="x-rt-btn x-inner-span xml5">T</span>
                            <span id="x-fetch-close" class="x-rt-btn x-inner-span xml5 xmr5">X</span>
                        </div>
                    </div>
                    <div id="x-fetch-inner" class="x-fetch-inner-flex">
                        <span id="fetch-msg" class="xfetch-span">Data Placeholder</span>
                        <span id="fetch-msg2" class="xfetch-span">...</span>
                    </div>
                </div>
            </div>
        `;

        return floatingDiv;
    }

     function addWindowStyles() {
        GM_addStyle(`
            .flash-grn {
               animation-name: flash-green;
                animation-duration: 0.8s;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                animation-direction: alternate;
                animation-play-state: running;
            }

            @keyframes flash-green {
                from {color: #00ff00;}
                to {color: #eeeeee;}
            }

            .xbgb {background: black !important;}
            .xbgt {background: transparent !important;}

            .xfetch-span {font-size: 16px; text-align: center; margin: 5px;}

            .x-rt-btn {
                display: flex;
                justify-content: center;
                width: 30px;
                border-radius: 30px;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }
            .x-fetch-hdr {
                /*border: 1px solid limegreen;*/
                border-radius: 5px;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            }
            .x-fetch-inner-flex {
                border-radius: 5px;
                width: 200px;
                height: 100px;
                align-content: center;
                justify-content: center;
                display: flex;
                flex-direction: column;
                flex-wrap: wrap;
            }
            .x-drag {
                position: fixed;
                display: flex;
                z-index: 999998;
                overflow: scroll;
                border: 1px solid steelblue;
                border-radius: 10px;
                background: var(--default-bg-panel-color) none repeat scroll 0% 0% / auto padding-box border-box;
                cursor: grab;
            }
        `);
    }

})();