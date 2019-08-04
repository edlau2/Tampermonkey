// ==UserScript==
// @name         Torn One-Click Daily Dime
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Clicks on the daily dime 'X' times for you with one click
// @author       xedx [2100735]
// @include      https://www.torn.com/loader.php?sid=lottery
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // Utility funstions
    //////////////////////////////////////////////////////////////////////

    // Check to see if a pointer is valid
    function validPointer(val, dbg = false) {
        if (val == 'undefined' || typeof val == 'undefined' || val == null) {
            if (dbg) {
                debugger;
            }
            return false;
        }
        return true;
    }

    function addMainButtons() {
        observer.disconnect();
        var extDiv = document.getElementById('xedx-dailydime-ext');

        // Only do once, or when not present.
        if (validPointer(extDiv)) {
            return;
        }

        var parentDiv = document.getElementsByClassName("lottery-wrap");

        // Create our own div, to append to parentDiv[0], after a separator
        var separator = createSeparator();
        var btnDiv = createButtonDiv();
        parentDiv[0].appendChild(separator);
        parentDiv[0].appendChild(btnDiv);
    }

    //////////////////////////////////////////////////////////////////////
    // createButtonDiv() function: Creates the div we insert into the
    // page. Insertion is done in the addMainButtons() function.
    //////////////////////////////////////////////////////////////////////

    function createButtonDiv() {
        var extDiv = createExtendedDiv();
        var hdrDiv = createHeaderDiv();
        var bodyDiv = createBodyDiv();

        // Header
        extDiv.appendChild(hdrDiv);
        hdrDiv.appendChild(document.createTextNode('One-Click Daily Dime'));

        // Body
        extDiv.appendChild(bodyDiv);
        var btns = createButtons();
        bodyDiv.appendChild(btns);

        return extDiv;
    }

    //////////////////////////////////////////////////////////////////////
    // Helpers for creating misc. UI parts and pieces
    //////////////////////////////////////////////////////////////////////

    function createSeparator() {
        var sepHr = document.createElement('hr');
        sepHr.className = 'delimiter-999 m-top10 m-bottom10';
        return sepHr;
    }

    function createExtendedDiv() {
        var extendedDiv = document.createElement('div');
        extendedDiv.className = 't-blue-cont h';
        extendedDiv.id = 'xedx-dailydime-ext';
        return extendedDiv;
    }

    function createHeaderDiv() {
        var headerDiv = document.createElement('div');
        headerDiv.id = 'xedx-header_div';
        headerDiv.className = 'title main-title title-black active top-round';
        headerDiv.setAttribute('role', 'heading');
        headerDiv.setAttribute('aria-level', '5');
        return headerDiv;
    }

    function createBodyDiv() {
        var contentDiv = document.createElement('div');
        contentDiv.id = 'xedx-content-div';
        contentDiv.className = 'cont-gray bottom-round';
        contentDiv.setAttribute('style', 'height: 50px; overflow: auto');
        return contentDiv;
    }

    function setBtnAttributes(btn) {
        btn.setAttribute('style', 'font-size: 14px; height: 24px; text-align: center;' +
                        'border-radius: 5px; margin: 15px 40px; background: LightGrey; border: 1px solid black;');
    }

    function createButtons() {
        var btnDiv = document.createElement('div');
        btnDiv.setAttribute('style', 'text-align: center');

        var btnSpan = document.createElement('span');
        btnDiv.appendChild(btnSpan);

        var buyBtn = document.createElement('button');
        buyBtn.id = 'buy-btn';
        var t = document.createTextNode('Buy');
        buyBtn.addEventListener('click',function () {
            buyFunction();
        });
        buyBtn.appendChild(t);
        setBtnAttributes(buyBtn);
        btnSpan.append(buyBtn);

        /*
        // Forces a manual refresh of the input field, to match
        // how many tokens we have left.
        // Now done automatically by virtue of the 'refresh'
        // function being called from the 'buy' function.
        //
        var refreshBtn = document.createElement('button');
        refreshBtn.id = 'refresh-btn';
        t = document.createTextNode('Refresh');
        buyBtn.addEventListener('click',function () {
            refreshFunction();
        });
        refreshBtn.appendChild(t);
        setBtnAttributes(refreshBtn);
        */

        var inputField = document.createElement("INPUT");
        inputField.id = 'xedx-slot-turns';
        inputField.setAttribute("type", "number");
        inputField.setAttribute('style', 'font-size: 14px; height: 24px; text-align: center;' +
                        'border-radius: 5px; margin: 15px 40px; border: 1px solid black;');
        btnSpan.appendChild(inputField);
        btnSpan.appendChild(document.createTextNode("Daily Dime tickets"));
        //btnSpan.append(refreshBtn);

        // Pre-load the input field
        var slotturnsDiv = document.getElementsByClassName('slotturns')[0];
        var turns = 0;
        if (validPointer(slotturnsDiv)) {
            turns = slotturnsDiv.innerText;
            inputField.value = turns;
        }

        // If we're out of tokens, disable our buy button.
        if (parseInt(turns) == 0) {
            buyBtn.disabled = true;
        }

        return btnDiv;
    }

    //////////////////////////////////////////////////////////////////////
    // Function(s) to actually press the "Buy" button
    //////////////////////////////////////////////////////////////////////

    function buyFunction() {
        var dailyDimeDiv = document.getElementById('daily-dime');
        var buyBtn = dailyDimeDiv.getElementsByClassName('btn')[0];
        var inputFieldDiv = document.getElementById('xedx-slot-turns');
        var turns = parseInt(inputFieldDiv.value);

        var slotturnsDiv = document.getElementsByClassName('slotturns')[0];
        var maxTurns = 0;
        if (validPointer(slotturnsDiv)) {
            maxTurns = slotturnsDiv.innerText;
            if (turns > maxTurns) {
                inputFieldDiv.value = maxTurns;
                turns = maxTurns;
            }
        }

        if (validPointer(buyBtn)) {
            for (var i = 0; i < turns; i++) {
                buyBtn.click();
                maxTurns--;
            }
        }
        refreshFunction(maxTurns);
    }

    function refreshFunction(maxTurns = -1) {
        if (maxTurns = -1) {
            var inputFieldDiv = document.getElementById('xedx-slot-turns');
            var slotturnsDiv = document.getElementsByClassName('slotturns')[0];
            var turns = 0;
            if (validPointer(slotturnsDiv)) {
                turns = slotturnsDiv.innerText;
                inputFieldDiv.value = turns;
            }
        } else {
            inputFieldDiv.value = maxTurns;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    console.log("Torn Once-Click Daily Dime script started!");

    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        addMainButtons();
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);})();