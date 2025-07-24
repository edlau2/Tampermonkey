// ==UserScript==
// @name         Torn Static Hunt Button
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Make sure the "Hunt Again" button doesn't jump around
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @exclude      https://www.torn.com/recaptcha.php*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    let useLeft = "360px";
    let useTop = "9px";

    const currCountry = $('body')[0].getAttribute('data-country');
    if (currCountry != 'south-africa') {
        console.log("StaticHuntButton: Not in SA, bailing! Current country: ", currCountry);
        return;
    }

    GM_addStyle(`
        div.hunt-result-wrap > div.hunt-again > div.hunt-btn-area > span > span > button {
           position: absolute;
           left: ${useLeft};
           top: ${useTop};
        }
    `);

})();