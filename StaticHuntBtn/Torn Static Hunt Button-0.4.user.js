// ==UserScript==
// @name         Torn Static Hunt Button
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Make sure the "Hunt Again" button doesn't jump around
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    const currCountry = $('body')[0].getAttribute('data-country');
    if (currCountry != 'south-africa') {
        console.log("StaticHuntButton: Not in SA, bailing! Current country: ", currCountry);
        return;
    }

    GM_addStyle(`
        div.hunt-result-wrap > div.hunt-again > div.hunt-btn-area > span > span > button {
           position: absolute;
           left: 360px;
           top:85px;
        }
    `);

})();