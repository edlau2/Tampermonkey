// ==UserScript==
// @name         Torn One-Click Daily Dime
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Clicks on the daily dime 'X' times for you with one click
// @author       xedx [2100735]
// @include      https://www.torn.com/loader.php?sid=lottery
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// This is just easier to read this way, instead of one line.
// Could also have be @required from a separate .js....
const daily_dime_div =
      '<div class="t-blue-cont h" id="xedx-dailydime-ext">' +
          '<div id="xedx-header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">One-Click Daily Dime</div>' +
          '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: 60px; overflow: auto">' +
              '<div style="text-align: center">' +
                  '<span>' +
                      '<button id="buy-btn" style="font-size: 14px; height: 24px; text-align: center;border-radius: 5px; margin: 15px 40px; ' +
                      'background: LightGrey; border: 1px solid black;">Buy</button>' +
                      '<input id="xedx-slot-turns" type="number" style="font-size: 14px; height: 24px; text-align: center;' +
                      'border-radius: 5px; margin: 15px 40px; border: 1px solid black;">' +
                      '<B>Daily Dime tickets</B>' +
                  '</span>' +
              '</div>' +
          '</div>' +
      '</div>';

const separator = '<hr class = "delimiter-999 m-top10 m-bottom10">';
var lottoDiv = null;
var buyBtn = null;
var inputField = null;
var slotturnsDiv = null;

(function() {
    'use strict';

    function createMainDiv() {
        if (validPointer(document.getElementById('xedx-dailydime-ext'))) {return;} // Only do once
        var parentDiv = document.getElementsByClassName("lottery-wrap"); // $('#lottery-wrap')
        $(parentDiv).append(separator);
        $(parentDiv).append(daily_dime_div);

        // Could change this to pick any of the lottos...
        // 'daily-dime', 'lucky-shot', or 'holy-grail'
        lottoDiv = document.getElementById('daily-dime');
        buyBtn = lottoDiv.getElementsByClassName('btn')[0];
        inputField = document.getElementById('xedx-slot-turns');
        slotturnsDiv = document.getElementsByClassName('slotturns')[0];

        buyBtn.addEventListener('click',function () {
            buyFunction();
        });

        refresh();
    }

    //////////////////////////////////////////////////////////////////////
    // Function(s) to actually press the "Buy" button
    //////////////////////////////////////////////////////////////////////

    function buyFunction() {
        let turns = parseInt(inputField.value);
        buyBtn.disabled = true;

        let maxTurns = slotturnsDiv.innerText;
        if (turns > maxTurns) {inputField.value = turns = maxTurns;}

        console.log("Daily Dime debug: Will buy " + turns + " times.");
        for (let i = 0; i < turns; i++) {
            buyBtn.click();
            maxTurns--;
        }
        refresh(maxTurns);
    }

    function refresh(maxTurns = -1) {
        if (maxTurns == -1) {
            inputField.value = slotturnsDiv.innerText;
        } else {
            inputField.value = maxTurns;
        }

        buyBtn.disabled = (inputField.value == 0);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

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




