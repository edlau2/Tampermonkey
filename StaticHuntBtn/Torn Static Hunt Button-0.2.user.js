// ==UserScript==
// @name         Torn Static Hunt Button
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add another button to the Hunting page, that doesn't move
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @grant        GM_addStyle
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

    const DEV_MODE = true;

    logScriptStart();

    // TBD: need hash change etc. handlers....
    // If created via llibrary, cal lib fn to check that and handle then call passed in fn.

    log("Current country: ", currentCountry());
    let testFailed = false;
    const currCountry = currentCountry();
    log("You're at: ", currCountry);
    if (currCountry != 'south-africa') {
        log("Not in SA, bailing! Current country: ", currCountry);
        testFailed = true;
        //if (!DEV_MODE) return;
        return;
    }
    log("Passed SA test..." + ((testFailed && DEV_MODE) ? " but in DEV_MODE..." : "") + "continuing to install button.");

    //if (!testFailed)

    GM_addStyle(`
        div.hunt-result-wrap > div.hunt-again > div.hunt-btn-area > span > span > button {
           position: absolute;
           left: 360px;
           top:85px;
        }

       .x-hunt-btn {
           position: absolute;
           left: 360px;
           top:85px;
       }
    `);


    //callOnContentLoaded(adjustHuntBtn);

    function miscBtnClickFn(event) {
        let huntAgainBtn = $("div.hunt-result-wrap > div.hunt-again > div.hunt-btn-area > span > span > button");
        if ($(huntAgainBtn)[0]) $(huntAgainBtn)[0].click();
    }

    function adjustHuntBtn(retries = 0) {
        //log("adjustHuntBtn");
        let huntAgainBtn = $("div.hunt-result-wrap > div.hunt-again > div.hunt-btn-area > span > span > button");
        //if ($(huntAgainBtn).length < 1) {
        //    if (retries++ < 30) return setTimeout(adjustHuntBtn, 200, retries);
        //    log("Too many retries");
        //    return addTopBarButton();
        //}
        //log("Adding class");
        if (!$(huntAgainBtn).hasClass("x-hunt-btn")) $(huntAgainBtn).addClass("x-hunt-btn");
        setTimeout(adjustHuntBtn, 100);
    }

    function addTopBarButton() {
        log("[addTopBarButton]");
        GM_addStyle(".xx123 {  margin-left: 15px; margin-top: 2px;}");
        addTornButtonExStyles();

        if ($("#xedx-misc-btn").length > 0) return;

        let name = $("#skip-to-content");
        let myButton = `<span><input id="xedx-misc-btn" type="submit" class="xedx-torn-btn xx123" value="Click"></span>`;
        $(name).after(myButton);
        $("#xedx-misc-btn").on('click', miscBtnClickFn);
    }

})();