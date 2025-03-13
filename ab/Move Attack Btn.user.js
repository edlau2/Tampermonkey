// ==UserScript==
// @name         Move Attack Btn
// @namespace    https://github.com/0xymandias
// @version      1.7.6
// @description  Move Torn "Start Fight" button on top of your weapon of choice.
// @author       xedx [2100735], smokey_ [2492729]
// @match        https://www.torn.com/loader.php*
// @run-at       document-body
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @license      WTFPL
// ==/UserScript==

// Copyright © 2034 smokey_ [2492729] <relatii@sri.ro,>
// This work is free. You can redistribute it and/or modify it under the
// terms of the Do What The Fuck You Want To Public License, Version 2,
// as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.

// TBD: Remove dependence on helper..shouldn't affect load times, it's cached....

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint curly: 0*/

(function () {
    'use strict';

    console.log(GM_info.script.name + ' version ' +
        GM_info.script.version + ' script started');

    //Global constants
    const loggingEnabled = true;
    const debugLoggingEnabled =           // Turn on for extra debug logging, off for normal use
        GM_getValue("debugLoggingEnabled", false);
    const moveFightBtn =                  // Setting this to true moves the start button to over your weapon of choice
        GM_getValue("moveFightBtn", true);

    const autoFireWeapon =                // Primary, Secondary, Melee, Temp - case sensitive!
        GM_getValue("autoFireWeapon", 'Primary');
    var startBtnLocation =                // Button to move 'Attack' button to, same as above (Primary, Secondary, ...)
        GM_getValue("startBtnLocation", 'Primary');

    function saveOptions() {
        GM_setValue("moveFightBtn", moveFightBtn);
        GM_setValue("startBtnLocation", startBtnLocation);
    }

    function log(...data) {if (loggingEnabled) {console.log(GM_info.script.name + ': ', ...data);}}
    function debug(...data) {if (debugLoggingEnabled) {console.log(GM_info.script.name + ': ', ...data);}}

    saveOptions();

    // Do not edit the following constants....
    const defSel = "[class*='defender_']";
    const cntSel = "[class^='labelsContainer_'] > div:nth-child(1) > span[class^='labelTitle_']";

    // Table for quick selector lookup, based on weapon choice.
    const selector = {"Primary": '#weapon_main', "Secondary": '#weapon_second',
                      "Melee": '#weapon_melee', "Temp": '#weapon_temp'};


    var startFightButton;
    var weaponWrapper; // = $(selector[startBtnLocation]);
    var weaponImage; // = $(weaponWrapper).find("figure > img");


    // ============= Start of local functions, may fire immediately ===============

    if (location.href.indexOf("loader.php?sid=attack&user2ID") > -1) {
        if (moveFightBtn == true) moveStartFightButton();
    }

    // Move the 'Start Fight' button over a weapon button
    // If enabled this is called immediately.
    function moveStartFightButton(retries=0) {
        debug('moveStartFightButton called');

        startFightButton = document.querySelector('.torn-btn.btn___RxE8_.silver'); // start fight button
        if (!$(startFightButton).length)
            startFightButton = document.querySelector('.torn-btn.silver');

        if (startBtnLocation === 'Primary') {
            weaponImage = document.querySelector('#weapon_main > figure > img'); // equipped weapon image
            weaponWrapper = document.querySelector('#weapon_main'); // common parent element
        } else if (startBtnLocation === 'Secondary') {
            weaponImage = document.querySelector('#weapon_second > figure > img');
            weaponWrapper = document.querySelector('#weapon_second');
        } else if (startBtnLocation === 'Melee') {
            weaponImage = document.querySelector('#weapon_melee  > figure > img');
            weaponWrapper = document.querySelector('#weapon_melee');
        } else if (startBtnLocation === 'Temp') {
            weaponImage = document.querySelector('#weapon_temp  > figure > img');
            weaponWrapper = document.querySelector('#weapon_temp');
        }

        $(weaponWrapper).css("border", "1px solid green");

        debug('startFightButton: ', $(startFightButton));
        debug('weaponImage: ', $(weaponImage));
        debug('weaponWrapper: ', $(weaponWrapper));

        if (startFightButton && weaponImage && weaponWrapper) {
            debug('all elements found');
            const buttonWrapper = document.createElement('div'); // create new div element
            buttonWrapper.id = "tbw"; // "Temp Button Wrapper"
            buttonWrapper.classList.add('button-wrapper');
            buttonWrapper.appendChild(startFightButton); // append start fight button to new div element
            weaponWrapper.insertBefore(buttonWrapper, weaponImage.nextSibling); // insert new div element after equipped weapon image
            debug('buttonWrapper: ', buttonWrapper);

            // Position the button wrapper over the weapon image
            buttonWrapper.style.position = 'absolute';
            buttonWrapper.style.top = weaponImage.offsetTop + 'px';
            buttonWrapper.style.left = '+15px'; // set left position to move it to the left
            startFightButton.addEventListener('click', function() {
                buttonWrapper.remove();
            });
        }

        if (!document.querySelector('.button-wrapper')) {
            // stop retrying after 5s (20 loops * 250ms per loop = 5s)
            if (retries++ > 20) return log('too many retries.');
            setTimeout(moveStartFightButton, 250, retries);
        }
    }

    // ================= Minimal UI to select options=========================
    function installUi(retries=0) {
        let topBar = $("[class^='titleContainer_']");
        if (!$(topBar).length) {
            if (retries++ < 20) return setTimeout(installUi, 500, retries);
            return log("To may retries, not installing UI");
        }
        let optsDiv = getOptsDiv();

        $(topBar).append(optsDiv);
        $("#xab-opts input[name='btn-weapon'][value=" + startBtnLocation + "]").prop('checked', true);
        $("#xab-opts input").on('click', function(e) {
            startBtnLocation = $(this).val();
            GM_setValue("startBtnLocation", startBtnLocation);
            $(weaponWrapper).css("border", "");
            weaponWrapper = $(selector[startBtnLocation]);
            weaponImage = $(weaponWrapper).find("figure > img");
            $(weaponWrapper).css("border", "1px solid green");

            moveStartFightButton();
        });

        function getOptsDiv() {
            GM_addStyle(`
                #xab-opts { margin-right: auto; padding-left: 20px; }
                #xab-opts input { margin-right: 5px; }
            `);
            return `
                <div id="xab-opts" class="xflexr">
                    <label><input type="radio" name="btn-weapon" value="Primary">Primary</label>
                    <label><input type="radio" name="btn-weapon" value="Secondary">Secondary</label>
                    <label><input type="radio" name="btn-weapon" value="Melee">Melee</label>
                    <label><input type="radio" name="btn-weapon" value="Temp">Temp</label>
                </div>
            `;
        }
    }

    // ============ This triggers once page has loaded ========================
    //
    // Wait for page to load before executing this part of the script
    // Images are already loaded when the on 'load' fires, need to use
    // DOMContentLoaded instead. Hence the 'callOnContentLoaded()' call.
    function handlePageLoad() {
        debug('[handlePageLoad]');

        // ================ Element Stripping ==================
        //
        // get the custom-bg-desktop sidebar-off element - the token shop background.
        const sidebarElement = document.querySelector('.custom-bg-desktop.sidebar-off');

        // if the element exists, remove it from the DOM to prevent it from being downloaded or loaded
        if (sidebarElement) {
            sidebarElement.remove();
        }

        // Add the UI component, weapon selection
        installUi();
    }

    //////////////////////////////////////////////////////////////////////
    // Effectively 'main', where the script starts. Log this event in the
    // console so we know it has started. Note that the really important
    // local functions, above, that only apply on the attack page may
    // have already been kicked off....
    //////////////////////////////////////////////////////////////////////

    // This fires when DOMContentLoaded is true...handles suppressing
    // unnecessary Ui elements.
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoad);
    } else {
        handlePageLoad();
    }

    // Defender Model
    debug("Setting interval for defender model");
    var startTimeDefender = Date.now();
    var intervalIdDefender = setInterval(function() {
        if (Date.now() - startTimeDefender > 10000) {
            debug("Didn't find def model within 10 secs, stopping");
            clearInterval(intervalIdDefender);
            return;
        }

        /*
        // Fix - use wildcards, also, #defender is no longer an id
        var defenderModel = document.querySelectorAll(`#defender >
                div.playerArea___oG4xu >
                div.playerWindow___FvmHZ >
                div > div.modelLayers___FdSU_.center___An_7Z >
                div.modelWrap___j3kfA *`);
        */

        // This implements the fix for the defender model, but not sure
        // if it does what is intended. The whole defender - body and
        // all - is removed...so the actual element removal is commented out.
        var defenderModel = $($("div[class*='modelWrap_']")[1]).find("*");

        debug("Defender model: ", defenderModel);
        if ($(defenderModel).length > 0) {
            debug("Found model, stopping timer");
            clearInterval(intervalIdDefender);
        }

        // This removes too much?
        for (const element of defenderModel) {
            debug(`Removing defender element: ${element.tagName}: `, $(element));
            //element.remove();
        }
    }, 100);

    // Attacker Model
    var startTimeAttacker = Date.now();
    var intervalIdAttacker = setInterval(function() {
        if (Date.now() - startTimeAttacker > 5000) {
            clearInterval(intervalIdAttacker);
            return;
        }

        //var attackerModel = document.querySelectorAll(`#attacker > div.playerArea___oG4xu > div.playerWindow___FvmHZ > div.allLayers___cXY5i >
        //                                              div.modelLayers___FdSU_.center___An_7Z > div.modelWrap___j3kfA *`);

        // Similar to the defenderModel, above, can get attacker:
        var attackerModel = $($("div[class*='modelWrap_']")[0]).find("*");

        debug("Attacker model: ", attackerModel);
        if ($(attackerModel).length > 0) {
            log("Found model, stopping timer");
            clearInterval(intervalIdAttacker);
        }

        // Also not actually removing RN....
        for (const element of attackerModel) {
            debug(`Removing attacker element: ${element.tagName}: `, $(element));
            //element.remove();
        }
    }, 100);

})();




