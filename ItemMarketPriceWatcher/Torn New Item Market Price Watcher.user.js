// ==UserScript==
// @name         Torn New Item Market Price Watcher
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Monitor the Item Market for low prices
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    // Globals...
    loggingEnabled = true;
    debugLoggingEnabled = false;
    const enableNewsTicker = GM_getValue("enableNewsTicker", true);
    const startHidden = GM_getValue("startHidden", false);
    const browserNotifications = GM_getValue("browserNotifications", true);
    const notifyTimeSecs = GM_getValue("notifyTimeSecs", 15);

    var watchList;                                 // Items we are watching
    const doInit = GM_getValue("doInit", true);    // Haven't saved anything in storage yet, so do so for dev...
    if (doInit) prepareSampleWatchlist();          // Just for watchlist ATM until I have opts dialog
    watchList = JSON.parse(GM_getValue("watchList", "{}"));

    updateAppOptions();
    logAppOptions();

    // Non-configurable globals, calculated dynamically
    const searchBaseURL = "https://api.torn.com/v2/market/?selections=itemmarket&id=";
    const color = "#8abeef";
    var doNotShowAgain = false;
    var canShowAfterMinutes = 10;
    var notificationTimeoutMs = notifyTimeSecs * 1000;
    var intTimer = 0;
    var doQuit = false;
    var notifyOpen = false;

    function updateAppOptions() {
        GM_getValue("enableNewsTicker", enableNewsTicker);
        GM_setValue("startHidden", startHidden);
        GM_setValue("browserNotifications", browserNotifications);
        GM_setValue("notifyTimeSecs", notifyTimeSecs);
    }

    function logAppOptions() {
        log("Enabled options: enableNewsTicker: ", enableNewsTicker,
            " startHidden: ", startHidden, " browserNotifications,: ",
            browserNotifications, " notifyTimeSecs: ", notifyTimeSecs);
        log("Watch List: ", watchList);
    }

    const saveWatchList = function () {GM_setValue("watchList", JSON.stringify(watchList));}

    // Sample list until I have an options dlg
    function prepareSampleWatchlist() {
        watchList = { //selector is data-xwid="itemID' ....
            330: {name: "Boxing Gloves", limit: 448000000, currLow: 0, lastNotify: 0},
            533: {name: "Can of Taurine Elite", limit: 3800000, currLow: 0, lastNotify: 0}
        };
        saveWatchList();
        GM_setValue("doInit", false);
    }

    // ============== Experimental: hook news ticker ===========================
    //
    if (enableNewsTicker == true) {
        function modifyContent() {
            return new Promise((resolve, reject) => {
                var ticker = document.querySelector('.news-ticker-countdown');
                ticker.style.color = color;
                var wrap = ticker.parentNode.parentNode.parentNode;
                var svg = wrap.children[0];
                svg.setAttribute('fill', color);
                svg.setAttribute('viewBox', "0 0 24 24");
                svg.setAttribute('height', '14');
                svg.setAttribute('width', '14');
                svg.children[0].setAttribute('d', 'M17.457 3L21 3.003l.002 3.523-5.467 5.466 2.828 2.829 1.415-1.414 1.414 1.414-2.474 2.475 2.828 2.829-1.414 1.414-2.829-2.829-2.475 2.475-1.414-1.414 1.414-1.415-2.829-2.828-2.828 2.828 1.415 1.415-1.414 1.414-2.475-2.475-2.829 2.829-1.414-1.414 2.829-2.83-2.475-2.474 1.414-1.414 1.414 1.413 2.827-2.828-5.46-5.46L3 3l3.546.003 5.453 5.454L17.457 3zm-7.58 10.406L7.05 16.234l.708.707 2.827-2.828-.707-.707zm9.124-8.405h-.717l-4.87 4.869.706.707 4.881-4.879v-.697zm-14 0v.7l11.241 11.241.707-.707L5.716 5.002l-.715-.001z');
                // console.log(svg);
                resolve('Content updated');
            });
        }

        const newstickerObserver = new MutationObserver((mutationsList, observer) => {
            if ($(".news-ticker-slide #xedx-itemwatch").length == 1) {
                newstickerObserver.disconnect();
                modifyContent()
                    .then(() => {
                    startNewstickerObserver();
                })
                .catch(error => console.error('Error updating content:', error));
            }
        });

        function startNewstickerObserver() {
            const opts = { childList: true, attributes: false, subtree: true, characterData: false };
            const target = document.querySelector('.news-ticker-slider-wrapper');
            if (target) {
                newstickerObserver.observe(target, opts);
            }
        }

            // <mark style="color: red;">  </mark>
        function buildTickerMsg(maxItems) {
            let keys = Object.keys(watchList);
            let msg = "";
            for (let idx=0; idx < keys.length && idx < maxItems; idx++) {
                let id = keys[idx];
                let item = watchList[id];
                if (idx > 0) msg = msg + ", ";
                let isUnder = item.currLow < item.limit;
                msg = msg + item.name + " now at: " +
                    ('<mark style="color: ' +
                     (isUnder ? " limegreen;" : " #B80000;") + ' background-color: transparent;">' +
                     asCurrency(item.currLow) + '  </mark>');
            }
            return msg;
        }

        const { fetch: originalFetch } = unsafeWindow;
        unsafeWindow.fetch = async (...args) => {
            var [resource, config] = args;
            var response = await originalFetch(resource, config);
            const json = () => response.clone().json()
            .then((data) => {
                data = { ...data };
                if(response.url.indexOf('?sid=newsTicker') != -1) {

                    log("Fetch data: ", data);

                    // Insert the custom news item into the news ticker
                    // For now, two prices
                    let msg = buildTickerMsg(2);
                    log("New msg: ", msg);
                    let attackItem = {ID: 0,
                                      headline: '<span style="color:' + color +
                                          '; font-weight: bold;" id="xedx-itemwatch">' + msg +
                                          '</span>',
                                      //countdown: true,
                                      //endTime: result.time.clear,
                                      //link: attackLink,
                                      isGlobal: true,
                                      type: 'generalMessage'};
                    data.headlines.unshift(attackItem);
                }
                return data;
            });

            response.json = json;
            response.text = async () =>JSON.stringify(await json());

            return response;
        };
    }

    // ============== End Experimental: hook news ticker ===========================

    const resetShowAgain = function() {doNotShowAgain = false;};

    function doBrowserNotify(name, cost, id) {
        log("doBrowserNotify: ", browserNotifications, " | ", doQuit, "|", notifyOpen, "|", doNotShowAgain);

        if (browserNotifications == false) return;
        if (doQuit == true) return;
        if (notifyOpen == true) return;
        if (doNotShowAgain == true) return;

        let now = new Date().getTime();
        watchList[id].lastNotify = now;
        saveWatchList();

        let msgText = "The price of " + name + " is available " +
            "at under " + cost + "!\n\nClick to go to market...";

        // For now just show once. Make an option later
        doNotShowAgain = true;
        if (canShowAfterMinutes > 0) {
            let afterMs = canShowAfterMinutes * 60 * 1000;
            setTimeout(resetShowAgain, afterMs);
        }

        GM_notification ( {
            title: 'Item Market Alert',
            text: msgText,
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: notificationTimeoutMs,
            onclick: () => {
                let url = "https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=" + id;
                window.open(url, '_blank').focus();
            },

            // Maybe setTimeout to not clear, so won't be notified
            // again for a bit? Or flag in storage?
            ondone: () => {notifyOpen = false;}
        } );
    }

    function processResult(jsonObj, status, xhr) {
        if (doQuit == true) return;

        let listings, item, cheapest, name, itemId, myLi;
        let market = jsonObj.itemmarket;
        if (market) item = market.item;
        if (item) {
            name = item.name;
            itemId = item.id;
        }

        let myItem = watchList[itemId];
        if (!myItem) {
            log("ERROR: no item found for id ", itemId, " item: ", item);
            return;
        }

        // If not yet filled in, at least enter name into item list element
        if (myItem.avgPrice == 0) {
            myItem.name = name;
            myItem.type = item.type;
            myItem.avgPrice = item.avgPrice;
        }

        if (market) listings = market.listings;
        if (listings) cheapest = listings[0];
        if (cheapest && itemId) {
            let price = cheapest.price;
            watchList[itemId].currLow = price;
            let priceStr = asCurrency(price);
            let sel = '[data-xwid="' + itemId +'"] > span';
            $(sel).eq(0).text(name);
            $(sel).eq(1).text(priceStr);

            if (price <= myItem.limit && !$(sel).hasClass("flash-grn")) {
                $(sel).addClass("flash-grn");
                if (doNotShowAgain == false) doBrowserNotify(name, price, itemId);
            } else if (price > myItem.limit && $(sel).hasClass("flash-grn")) {
                $(sel).removeClass("flash-grn");
            }
        }
    }

    function doItemGet(itemId) {
        if (doQuit == true) return;
        let url = searchBaseURL + itemId + "&key=" + api_key;

        $.ajax({
            url: url,
            type: 'GET',
            success: function (response, status, xhr) {
                processResult(response, status, xhr);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                log("yyz Error in doAjaxPost: ", textStatus);
                log("yyz Error thrown: ", errorThrown);
            }
        });
    }

    const itemCheckInterval = 15000;     // 15 secs between check, 4 calls a minute
    var callSpaceDelay = 5000;  // 5 secs between each item call

    function getItemList() {
        let keys = Object.keys(watchList);
        for (let idx=0; idx < keys.length; idx++) {
            let itemId = keys[idx];
            setTimeout(doItemGet, (callSpaceDelay * (idx + 1)), itemId, idx);
        }
        setTimeout(getItemList, itemCheckInterval);
    }

    // =============================== Startup, create a mini dashboard ==============================
    var currLiIndex = 0;
    var liIndexMax;    // item count
    const anSpd = 2000;
    const anDelay = 6000;

    function animateUl() {
        if (doQuit == true) return;

        // could use ( ul > li).eq(0...max) also ???
        let currLiSel = "#li-idx-" + currLiIndex;
        let nextLiIdx = (currLiIndex == liIndexMax) ? 1 : (+currLiIndex + 1);
        let nextLiSel = (currLiIndex == liIndexMax) ? "#li-idx-0" : "#li-idx-" + (+currLiIndex + 1);
        $(currLiSel).animate({
            height: "0px",
            opacity: 0
        }, anSpd, function() {
            $("#x-the-ul").append($(currLiSel));
        });
        $(nextLiSel).animate({height: "52px", opacity: 1}, anSpd);

        currLiIndex++;
        if (currLiIndex > liIndexMax) currLiIndex = 0;
        setTimeout(animateUl, anDelay);
    }

    const liTemplate = `
        <li>
            <span class="xfetch-span">Please Wait....</span>
            <span class="xfetch-span">...initializing...</span>
        </li>
    `;

    function addLiToDashboard(idx, itemId) {
        let item = watchList[itemId];
        let el = $(liTemplate);

        // To find in API callback
        $(el).attr("data-xwid", itemId);

        // To find when animating
        let listId = "li-idx-" + idx;
        $(el).attr("id", listId);

        $($(el).find('span')[0]).text(item.name);
        $("#x-the-ul").append($(el));
    }

    function hide() {
        $("#x-itemwatch").css('opacity', 0);
        $("#x-itemwatch").css('left', 5000);
    }

    function createDashboard() {
        if ($("#x-itemwatch").length > 0) {
            log("yyz Window exists!");
            return;
        }

        let myDiv = getWindowDiv();
        $("#mainContainer").append(myDiv);

        let keys = Object.keys(watchList);
        liIndexMax = keys.length - 1;
        for (let idx=0; idx<keys.length; idx++) {
            addLiToDashboard(idx, keys[idx]);
        }

        $("#x-fetch-close").on('click', function () {
            doQuit = true;
            $("#x-itemwatch").remove();
        });

        $("#x-fetch-hide").on('click', function () {
            hide();
            GM_setValue("startHidden", true);
            log("Hide, pos: ", $("#x-itemwatch").position());
        });

        $("#x-fetch-help").on('click', function () {
            log("Help clicked, opts screen?");
        });

        if (startHidden == true) {
            hide();
        } else {
            let l = parseInt($("#x-itemwatch").css("left"));
            if (l) {
                if (l < 0 || l > $(window).width())
                    $("#x-itemwatch").css("left", 0);
            }
        }

        displayHtmlToolTip($("#x-fetch-hide"), "Hide", "tooltip4");
        displayHtmlToolTip($("#x-fetch-help"), "Options", "tooltip4");
        displayHtmlToolTip($("#x-fetch-close"), "Close and Disable, this page only.", "tooltip4");

        dragElement(document.getElementById("x-itemwatch"));
        startSavingPos(1500, "x-itemwatch", true);

        setTimeout(animateUl, anDelay);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();

    if (isAttackPage()) return log("Won't run on attack page!");
    if (checkCloudFlare()) return log("Won't run while challenge active!");

    getItemList();

    versionCheck();
    addTornButtonExStyles();
    addWindowStyles();
    addToolTipStyle();

    createDashboard();
    //callOnContentLoaded(createDashboard);

    // ============================ styles & UI ================================

    // <div id="x-itemwatch" class="x-fetch-wrap x-drag xbgreen xbgb">
    function getWindowDiv() {
        const floatingDiv = `
            <div id="x-itemwatch" class="x-drag xbgreen xbgb">
                <div id="x-itemwatchheader">
                    <div class="x-fetch-hdr title-black top-round">
                        <div role="heading" aria-level="5">Item Watcher</div>
                        <div class="x-fetch-hdr">
                            <!-- span id="x-fetch-a" class="x-rt-btn x-inner-span xml10">Q</span -->
                            <span id="x-fetch-help" class="x-inner-span xml10">?</span>
                            <span id="x-fetch-hide" class="x-inner-span xml5">H</span>
                            <span id="x-fetch-close" class="x-inner-span xml5 xmr5">X</span>
                        </div>
                    </div>

                    <div id="x-itemwatch-inner" >
                        <ul id="x-the-ul"class="x-scroll">
                        </ul>
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

            #x-fetch-help, #x-fetch-hide, #x-fetch-close {
                display: flex;
                flex-wrap: wrap;
                align-content: center;
                justify-content: center;
                width: 24px;
                border-radius: 24px;
                cursor: pointer;
                background-image: radial-gradient(rgba(170, 170, 170, 0.6) 0%, rgba(6, 6, 6, 0.8) 100%);
            }
            .x-fetch-hdr {
                /*border: 1px solid limegreen;*/
                border-radius: 5px;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-content: center;
                flex-wrap: wrap;
            }

            #x-itemwatch-inner {
                border-radius: 5px;
                width: auto;
                height: 60px;
                align-content: center;
                justify-content: center;
                display: flex;
                flex-direction: column;
                flex-wrap: wrap;
            }

            #x-itemwatch-inner ul {
                max-height: 54px;
                overflow: hidden;
            }

            #x-itemwatch-inner ul li {
                display: flex;
                flex-direction: column;
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






