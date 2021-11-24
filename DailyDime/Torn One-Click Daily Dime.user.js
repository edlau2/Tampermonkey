// ==UserScript==
// @name         Torn One-Click Daily Dime
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Clicks on a selected lottery 'X' times for you with one click
// @author       xedx [2100735]
// @include      https://www.torn.com/loader.php?sid=lottery
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

const daily_dime_div =
      '<div class="t-blue-cont h" id="xedx-dailydime-ext">' +
          '<div id="xedx-header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">One-Click Lottery</div>' +
          '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: auto; overflow: auto">' +
              '<div style="text-align: center">' +
                  '<span class="xedx-main">' +
                      //'<button id="xedx-buy-btn" style="font-size: 14px; height: 24px; text-align: center;border-radius: 5px; margin: 15px 40px; ' +
                      //'background: LightGrey; border: 1px solid black;">Buy</button>' +
                      '<button id="xedx-buy-btn" class="btn-dark-bg">Click to Buy</button>' +
                      '<input id="xedx-slot-turns" type="number" style="font-size: 14px; height: 24px; text-align: center;' +
                      'border-radius: 5px; margin: 15px 40px; border: 1px solid black;">' +
                      '<B>Lottery Tickets</B>' +
                      '<p>Select a Lottery:</p>' +
                      '<div>' +
                          '<input type="radio" id="DD" class="xedx-oneclick" name="lottery" data="daily-dime" value="DD" checked>' +
                          '<label for="DD"> Daily Dime </label>' +
                          '<input type="radio" id="LSC" class="xedx-oneclick" name="lottery" data="lucky-shot" value="LSC">' +
                          '<label for="LSC">Lucky Shot Casino</label>' +
                          '<input type="radio" id="HG" class="xedx-oneclick" name="lottery" data="holy-grail" value="HG">' +
                          '<label for="HG">Holy Grail</label>'+
                      '</div>'+
                  '</span>' +
              '</div>' +
          '</div>' +
      '</div>';

(function() {
    'use strict';

    var lottoDiv = null;
    var buyBtn = null; // Lotto buy button
    var inputField = null;
    var slotturnsDiv = null;
    var selectedLottery = 'daily-dime';

    GM_addStyle(".xedx-oneclick {margin: 10px;}");
    GM_addStyle(".xedx-main {margin-left: 0px;}");


    function createMainDiv() {
        if (validPointer(document.getElementById('xedx-dailydime-ext'))) {return;} // Only do once
        var parentDiv = document.getElementsByClassName("lottery-wrap");
        $(parentDiv).append(separator);
        $(parentDiv).append(daily_dime_div);

        lottoDiv = document.getElementById(selectedLottery);
        buyBtn = lottoDiv.getElementsByClassName('btn')[0];
        inputField = document.getElementById('xedx-slot-turns');
        slotturnsDiv = document.getElementsByClassName('slotturns')[0];

        document.getElementById('xedx-buy-btn').addEventListener('click',function () {
            buyFunction();
        });

        document.getElementById("DD").addEventListener('click', function (event) {
            handleRadioBtn(event.target)}, { passive: false });
        document.getElementById("HG").addEventListener('click', function (event) {
            handleRadioBtn(event.target)}, { passive: false });
        document.getElementById("LSC").addEventListener('click', function (event) {
            handleRadioBtn(event.target)}, { passive: false });

        refresh();
    }

    function refreshHandles() {
        lottoDiv = document.getElementById(selectedLottery);
        buyBtn = lottoDiv.getElementsByClassName('btn')[0];
        inputField = document.getElementById('xedx-slot-turns');
        slotturnsDiv = document.getElementsByClassName('slotturns')[0];
    }

    function handleRadioBtn(target) {
        selectedLottery = target.getAttribute('data');
        console.log('Lottery Select:', target, ' selectedLottery: ', selectedLottery);
        refreshHandles();
    }

    //////////////////////////////////////////////////////////////////////
    // Function(s) to actually press the "Buy" button
    //////////////////////////////////////////////////////////////////////

    function buyFunction() {
        //refresh();
        let turns = parseInt(inputField.value);
        buyBtn.disabled = true;

        let maxTurns = slotturnsDiv.innerText;
        if (turns > maxTurns) {inputField.value = turns = maxTurns;}

        log("Will buy " + turns + " times.");
        log('Turns: ' + turns + ' Max turns: ' + maxTurns);
        for (let i = turns; i > 0; i--) {
            buyBtn.click();
            maxTurns--;
            turns--;
        }
        refresh(maxTurns);
    }

    function refresh(value = -1) {
        if (value == -1) {
            inputField.value = slotturnsDiv.innerText;
        } else {
            inputField.value = value;
        }

        buyBtn.disabled = (inputField.value == 0);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        createMainDiv();
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

})();




