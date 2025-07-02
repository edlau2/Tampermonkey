// ==UserScript==
// @name         Torn Slow and Easy
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Kill damn ducks.
// @author       xedx [2100735]
// @include      https://www.torn.com/page.php?sid=slots
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

    const doFastSlots = GM_getValue("doFastSlots", true);
    GM_setValue("doFastSlots", doFastSlots);

    // Globals
    var tokens = 0;     // Tokens left.
    var moneyWon = 0;   // Money won so far
    var moneyLost = 0;
    var wins = 0;
    var losses = 0;
    var lastBtn = null; // Selector of last button clicked
    var enabled = false;
    var active = false;

    var lastResultWon = false;
    var lastBetAmt = 0;
    var money = 0, moneyTotal = 0;

    function updateStats(data) {
        money = data.money;
        moneyTotal = data.moneyTotal;
        tokens = data.tokens;
        if (data.won == 1) {
            wins++;
            lastResultWon = true;
            moneyWon += data.moneyWon;
        } else {
            losses++;
            moneyLost += parseInt(lastBetAmt);
        }
        log("money: ", money, " mmoneyTotal: ", moneyTotal, " tokens: ", tokens,
            " wins: ", wins, " losses:", losses, " lastResultWon: ", lastResultWon, " lastBetAmt: ", lastBetAmt);
        updateStatsTable();
    }

    const originalAjax = $.ajax;
    if (doFastSlots == true) {
        $.ajax = function (options) {
            log("Trapped ajax: ", options);
            if (options.data != null && options.data.sid == 'slotsData' && options.data.step == 'play') {
                const originalSuccess = options.success;
                lastResultWon = false;
                lastBetAmt = options.data.stake;
                options.success = function (data, textStatus, jqXHR) {
                    log("Success, textStatus: ", textStatus);
                    log("Success, data: ", data);

                    updateStats(data);

                    // Make stop immediately...maybe small delay?
                    //data.barrelsAnimationSpeed = 0;

                    if (originalSuccess) {
                        originalSuccess(data, textStatus, jqXHR);
                    }

                };
            }

            return originalAjax(options);
        }
    }

    function addTableStyles() {
        GM_addStyle(`
            #stats-tbl {
                padding: 10px;
            }

            #stats-tbl > table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                width:100%;
            }

            #stats-tbl tbody {
                background-color: black;
            }

            #stats-tbl tr {
                display: flex;
            }

            #stats-tbl td {
                display: flex;
                flex-flow: row wrap;
                justify-content: left;
                align-content: center;
                vertical-align: middle;
                padding: 2px 0px 2px 10px;
                width: 25%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                color: white;
                border: 1px solid white;
                padding: 10px 0px 10px 10px;
            }
        `);
    }

    function updateStatsTable() {
        log("[updateStatsTable] ", asCurrency(moneyWon), asCurrency(moneyLost), wins, losses,
            tokens, money, moneyTotal, ((lastResultWon == true) ? "Win" : "Loss"));

        let table = `
            <div id="stats-tbl">
                <table><tbody>
                    <tr>
                        <td>Won: ${asCurrency(moneyWon)}</td><td>Lost: ${asCurrency(moneyLost)}</td>
                        <td>Wins: ${wins}</td><td>Losses: ${losses}</td>
                    </tr>
                    <tr>
                        <td>Tokens: ${tokens}</td><td>Money: ${asCurrency(money)}</td>
                        <td>Money Total: ${asCurrency(moneyTotal)}</td><td>Lats Result: ${((lastResultWon == true) ? "Win" : "Loss")}</td>
                    </tr>
                </tbody></table>
            </div>
        `;

        log("[updateStatsTable] ", $("#stats-tbl"));

        if ($("#stats-tbl").length > 0)
            $("#stats-tbl").replaceWith(table);
        else
            $("#xedx-slots-ext").after(table);
    }

    var optionsDiv =
        '<br><br><br><div class="t-blue-cont h" id="xedx-slots-ext">' +
              '<div id="xedx-content-div" class="cont-gray border-round" style="height: auto; overflow: auto">' +
                  '<div style="text-align: center">' +
                      '<span class="xedx-main">' +
                          '<div>' +
                              '<input class="xedx-ctrls" type="checkbox" id="enable" name="enable" value="enable">' +
                              '<label for="confirm">Enabled</label>'+
                              '<input class="xedx-ctrls" type="radio" id="active" class="xedx-oneclick" value="active">' +
                                  '<label for="active">Active</label>' +
                              '<input class="xedx-ctrls" type="radio" id="2" class="xedx-oneclick" value="2">' +
                                  '<label for="2">Something Else</label>' +
                          '</div>'+
                      '</span>' +
                  '</div>' +
              '</div>' +
          '</div>' +
          '<hr class="page-head-delimiter m-top10 m-bottom10">';


    //const moneyOnHand =
          function moneyOnHand() { return $("#user-money").data("money"); }
    //const moneyAmount =
          function moneyAmount() { return $("#moneyAmount").text().replaceAll(',', ''); }

    // Add handlers for all the bet buttons, $10 - $10M
    function addBetBtnHandlers() {
        let btnList = document.querySelector("#mainContainer > div.content-wrapper > div.slots-main-wrap > div > ul").children;
        if (!btnList) setTimeout(addBetBtnHandlers, 50);
        for (let i=0; i<btnList.length; i++) {
            btnList[i].addEventListener('click', function () {
                handleBetBtn(btnList[i], { passive: false });
            });
            log('Added handler for the ' + asCurrency(btnList[i].getAttribute('data-bet')) + ' button.');
        }
    }

    // Handle any bet button being clicked.
    function handleBetBtn(btn) {
        if (timeout) clearTimeout(timeout);
        log(asCurrency(btn.getAttribute('data-bet')) + ' bet button clicked!');
        log("moneyOnHand: ", moneyOnHand());
        lastBtn = btn;
        if (enabled) {
            document.querySelector("#active").checked = true;
            active = true;
        }
    }

    // Monitor the window, process when the text changes.
    let timeout = null;
    function handleTextChange(selectorID) {
        if (timeout) clearTimeout(timeout);
        tokens = document.querySelector("#tokens").innerText;
        let sel = document.querySelector("#" + selectorID);
        //log('handleTextChange: ID=' + sel.id + ' text: ' + sel.textContent);
        if (sel.textContent == 'Jackpot:') log('"' + sel.textContent + '" - didn`t win - click here?');
        if (sel.id == 'grv') {
            timeout = setTimeout(handleGrvTimeout, 800);
        }
    }

    function handleMoneyWon(selectorID) {
        let sel = document.querySelector("#" + selectorID);
        moneyWon = sel.textContent;
        //sel.textContent = sel.textContent + ' (' + asCurrency(moneyWon) + ')';
        log('Money won: ' + moneyWon + '(' + asCurrency(moneyWon) + ')');
    }

    //--- Simulate a natural mouse-click sequence.
    function simulateMouseClick(targetNode) {
        triggerMouseEvent (targetNode, "mouseover");
        triggerMouseEvent (targetNode, "mousedown");
        triggerMouseEvent (targetNode, "mouseup");
        triggerMouseEvent (targetNode, "click");
    }

    function triggerMouseEvent (node, eventType) {
        var clickEvent = document.createEvent ('MouseEvents');
        clickEvent.initEvent (eventType, true, true);
        node.dispatchEvent (clickEvent);
    }

    function placeBet(btn) {
        let ms = (Math.floor(Math.random() * 1000)); // + 1);
        log('Placing bet for ' + asCurrency(btn.getAttribute('data-bet')) + ' in ' + ms + 'ms');
        setTimeout(function(){simulateMouseClick(btn)}, (Math.floor(Math.random() * 1000) + 1));
    }

    // Called when the text window stops updating
    function handleGrvTimeout() {
        let output = document.querySelector("#grv").textContent;
        log('Payout: ' + output);
        log('handleGrvTimeout: might bet now!');
        log('Tokens available: ' + tokens);
        if (lastBtn) {
            log('Last button clicked was the ' + asCurrency(lastBtn.getAttribute('data-bet')) + ' button.');
        } else {
            log('Just started up, no bets placed yet!');
        }

        let tdata = $("#grv").attr("tdata");
        let amt = tdata ? tdata.replace(/[^0-9]/g, "") : "?";
        log("Money on hand: ", moneyOnHand(), moneyAmount());
        log("tdata: ", tdata, " amt: ", amt);

        if (output.includes('Jackpot: $')) {
            log('Sorry, you didn`t win!');
            log('Tokens: ' + tokens + ' Active: ' +  active + ' Enabled: ' + enabled);
            console.log('lastBtn: ', lastBtn);
            if (tokens > 0 && active && enabled) placeBet(lastBtn);
        } else {
            log('Winner Winner Winner! ' + output);
            if (output.toLowerCase().indexOf('torn') > -1) {enabled = false; active = false;}
            if (tokens > 0 && active && enabled) placeBet(lastBtn);
        }
    }

    // Set up to monitor the payout window
    function monitorElementText(selectorID, callback) {
        let sel = document.querySelector("#" + selectorID);
        sel.setAttribute("tdata", sel.textContent);
        setInterval(function() {
            let sel = document.querySelector("#" + selectorID);
            if (sel.getAttribute("tdata") != sel.textContent) {
                callback(selectorID);
                sel.setAttribute("tdata", sel.textContent);
            }}, 50);

        return sel;
    }

    // Add minimal UI so I know what's going on.
    function installUI() {
        log('installUI');
        addTableStyles();
        GM_addStyle('.xedx-ctrls {margin: 10px;}');
        let target = document.querySelector("#mainContainer > div.content-wrapper > div.slots-main-wrap > div");
        $(target).append(optionsDiv);
        document.querySelector("#enable").addEventListener('click', function (e) {
            enabled = this.checked;
            log('enable onClick: enabled? ' + enabled);
            if (lastBtn) {
                document.querySelector("#active").checked = true;
                active = true;
            }
        });

        $(target).css("height", "509px");

        addBetBtnHandlers();

        updateStatsTable();
    }

    // Kick things off
    function handlePageLoaded() {
        log('==> handlePageLoaded');

        // Get the selectors we care about
        //let ulSel = document.querySelector("#mainContainer > div.content-wrapper > div.slots-main-wrap > div > ul");
        let grh = document.querySelector("#grh");
        let grv = document.querySelector("#grv");

        if (/*!ulSel ||*/ !grh || !grv) {
            setTimeout(handlePageLoaded, 1000);
            return;
        }

        tokens = document.querySelector("#tokens").innerText;
        log('Tokens available: ' + tokens);
        log("Money on hand: ", moneyOnHand(), moneyAmount());
        installUI();
        monitorElementText("grv", handleTextChange);
        monitorElementText("moneyWon", handleMoneyWon);
    }
 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    if (document.readyState == "complete") {
        handlePageLoaded();
    }

    document.onreadystatechange = function () {
      if (document.readyState == "complete") {
        handlePageLoaded();
      }
    };

})();