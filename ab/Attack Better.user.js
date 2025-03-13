// ==UserScript==
// @name         Attack Better
// @namespace    https://github.com/0xymandias
// @version      1.7.6
// @description  Move Torn "Start Fight" button on top of your weapon of choice and remove certain elements to help with load times.
// @author       smokey_ [2492729]
// @match        https://www.torn.com/loader.php*
// @match        https://www.torn.com/factions.php*
// @connect      api.torn.com
// @run-at       document-body
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @grant        GM_xmlhttpRequest
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

    //Global constants
    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false); // Enables the 'debug()' function, which logs to console
    const myFacId = 8151;                 // Fac ID, to get war status. Note that is the only reason an API key is required.
                                          // Your API key will only be asked for (and used) if the option 'onlyInWar' is set,
                                          // along with 'autoFire' or 'immediateAttack'
    const moveFightBtn =                  // Setting this to true moves the start button to over your weapon of choice
        GM_getValue("moveFightBtn", true);

    var advancedOpts =                        // true to display the advanced options button, which isn't 100% complete.
        GM_getValue("advancedOpts", false);   // Here to make the Auto Fire legal, would need to click this to enable it....
    var immediateAttack =                     // Clicks Start Fight ASAP, but not Join
        GM_getValue("immediateAttack", false);
    var autoFire =                            // Automatically fires chosen weapon ASAP after fight has started
        GM_getValue("autoFire", false);       // 'autoFire' has no effect if 'immediateAttack' is not on.

    const onlyInWar =                         // immediate attack and auto fire only activated if in a RW
        GM_getValue("onlyInWar", true);

    // This value is set only when this script runs when NOT on an attack page, which ATM is
    // any faction page. But only set if the options 'onlyInWar' and either 'autoFire' or
    // 'immediateAttack' are enabled, so you don't need an API key if those aren't turned on.
    // 'autoFire' has no effect if 'immediateAttack' is not on.
    var doWarCheck = (onlyInWar == true && (immediateAttack == true || autoFire == true));
    var inWarNow = GM_getValue("activeWar", false);
    if (inWarNow == true && onlyInWar == true) {
        autoFire = false;
        immediateAttack = false;
    }

    const autoFireWeapon =                // Primary, Secondary, Melee, Temp - case sensitive!
        GM_getValue("autoFireWeapon", 'Primary');
    var startBtnLocation =                // Button to move 'Attack' button to, same as above (Primary, Secondary, ...)
        GM_getValue("startBtnLocation", 'Primary');

    function saveOptions() {
        GM_setValue("moveFightBtn", moveFightBtn);
        GM_setValue("onlyInWar", onlyInWar);
        GM_setValue("autoFire", autoFire);
        GM_setValue("immediateAttack", immediateAttack);
        GM_setValue("autoFireWeapon", autoFireWeapon);
        GM_setValue("startBtnLocation", startBtnLocation);
        GM_setValue("advancedOpts", advancedOpts);
    }

    saveOptions();

    // Do not edit the following constants....
    const effectsKey = "activeEffects";
    const defSel = "[class*='defender_']";
    const cntSel = "[class^='labelsContainer_'] > div:nth-child(1) > span[class^='labelTitle_']";

    // Table for quick selector lookup, based on weapon choice.
    const selector = {"Primary": '#weapon_main', "Secondary": '#weapon_second',
                      "Melee": '#weapon_melee', "Temp": '#weapon_temp'};


    var startFightButton;
    var weaponWrapper; // = $(selector[startBtnLocation]);
    var weaponImage; // = $(weaponWrapper).find("figure > img");


    // ============= Start of local functions, may fire immediately ===============

    if (onAttackPage()) {
        if (moveFightBtn == true) moveStartFightButton();
        if (immediateAttack == true) doAttack();
        if (advancedOpts == true) {
            instAdvOptsBtn();
        }
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

    // Returns number of attacks you've made. Used as an
    // auto-click safety net...
    function getAttackCount() {
        let t = $(cntSel).text();
        if (t) {
            return (t.indexOf(":") > -1) ? -1 :
            (t.indexOf("/") > -1) ?
            parseInt($(cntSel).text().split('/')[0]) : 0;
        }
    }

    // Fires your selected weapon of choice
    // Try up to 20 times (1 second) to auto hit, up to 1 time.
    var fc = 0, maxFc = 20, maxAutoHit = 1;
    function fireSelectedWeapon() {
        $($(selector[autoFireWeapon])[0]).click();
        if (getAttackCount() > (maxAutoHit-1)) return log("Stopping auto-click");
        if (fc++ < maxFc) setTimeout(fireSelectedWeapon, 50);
    }

    // Click the "Start Fight" button - but not Join
    // If enabled this is called immediately.
    var retriesReset = false;
    function doAttack(node, retries=0) {
        let startFightButton = $("[class*='modal_'] [class*='btn__']")[0];
        if (!$(startFightButton).length) {
            startFightButton = $('.button-wrapper')[0];
        }
        if (!$(startFightButton).length) {
            /*
            if (callWhenElementExistsEx(defSel, startFightButton, doAttack)) {
                if (retries++ < 80) return setTimeout(doAttack, 50, null, retries);
            return  log("Timed out, retries: ", retries);
            }
            log("set obs");
            return;
            */

            // 50ms == 20 in 1 sec, give 3 secs? 60 retries?
            if (retries++ < 80) return setTimeout(doAttack, 100, null, retries);
            return  log("Timed out, retries: ", retries);
        }

        let title = $(startFightButton).text();
        if (!title) {
            if (!retriesReset) retries=0;
            retriesReset = true;
            if (retries++ < 10) return setTimeout(doAttack, 10, null, retries);
            return log("Timed out 2, retries: ", retries);
        }
        //logt("found2");
        if (title) title = title.trim().toLowerCase();
        if (title == "start fight") {
            simulateMouseClick(startFightButton);
            if (autoFire == true) setTimeout(fireSelectedWeapon, 20);
        }
    }

    function handleAdvOptsBtn() {
        autoFire = true;
        if (immediateAttack == true) return;
        doAttack();
    }

    function instAdvOptsBtn() {
        addFlexStyles();
        GM_addStyle(`#adv-opt-btn {width:60px;height:24px;background:red;color:black;border-radius:6px;position:absolute;top:19%;left:40%;}`);
        let advBtn = `<div><span id="adv-opt-btn" class="xflexr xflex-center">Go!</span></div>`;

        $("body").after(advBtn);
        $("#adv-opt-btn").on('click', handleAdvOptsBtn);
    }

    // ================= Functions only called if NOT attacking =================

    // Save status of ranked war - if currently in one or not.
    // Whn on attack page, can just read from storage - certain
    // options only trigger if actually in war. Might not want
    // to for say mission targets, or trigger accidentally...
    function rwReqCb(responseText, ID, options) {
        let jsonObj = JSON.parse(responseText);
        if (jsonObj.error) {
            console.error("Error: code ", jsonObj.error.code, jsonObj.error.error);
            return;
        }

        let atWar = false;
        let warsArray = jsonObj.rankedwars;
        let war0 = warsArray[0];
        if (war0) {
            if (war0.end == 0 || war0.winner == null) {
                atWar = true;
            }
        }

        log("Faction ", ID, " at war? ", atWar);
        GM_setValue("activeWar", atWar);
    }

    function saveWarStatus(facId) {
        xedx_TornFactionQueryv2(facId, "rankedwars", rwReqCb);
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
            debug('background removed.');
        }

        // Add the UI component
        installUi();
    }

    //////////////////////////////////////////////////////////////////////
    // Effectively 'main', where the script starts. Log this event in the
    // console so we know it has started. Note that the really important
    // local functions, above, that only apply on the attack page may
    // have already been kicked off....
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (!onAttackPage()) {
        // If not on attack page, just save war status. We may want to
        // disable certain opts when not at war.
        if (doWarCheck == true) {
            validateApiKey();
            saveWarStatus(myFacId);
        }
        return log("Not attack page...");
    } else {
        // These have already been kicked off, above...
        //
        //if (moveFightBtn == true) moveStartFightButton();
        //if (immediateAttack) doAttack();
    }

    // This fires when DOMContentLoaded is true...handles suppressing
    // unnecessary Ui elements.
    callOnContentLoaded(handlePageLoad);

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




