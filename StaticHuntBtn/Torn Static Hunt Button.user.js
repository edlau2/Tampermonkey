// ==UserScript==
// @name         Torn Static Hunt Button
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add another button to the Hunting page, that doesn't move
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.43.js
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

    logScriptStart();

    if (currentCountry() != 'south-africa') {
        log("Not in SA, bailing!");
        // return;
    }

    callOnContentLoaded(addTopBarButton);

    function miscBtnClickFn(event) {
        let huntAgainBtn = $("div.hunt-result-wrap > div.hunt-again > div.hunt-btn-area > span > span > button");
        if ($(huntAgainBtn)[0]) $(huntAgainBtn)[0].click();
    }

    function addTopBarButton() {
        GM_addStyle(".xx123 {  margin-left: 15px; margin-top: 2px;}");
        addTornButtonExStyles();

        if ($("#xedx-misc-btn").length > 0) return;

        let name = $("#skip-to-content");
        let myButton = `<span><input id="xedx-misc-btn" type="submit" class="xedx-torn-btn xx123" value="Click"></span>`;
        $(name).after(myButton);
        $("#xedx-misc-btn").on('click', miscBtnClickFn);
    }

})();