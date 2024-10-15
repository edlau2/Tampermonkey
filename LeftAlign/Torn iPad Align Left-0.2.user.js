// ==UserScript==
// @name         Torn iPad Align Left
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Align left on iPad desktop mode
// @run-at       document-end
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    console.log("Torn iPad Align Left started.");

    const style = document.createElement('style');
    style.innerHTML = `
        #mainContainer {
            display: flex;
            justify-content: left;
            margin: 0px 5px 0px 5px !important;
        }`;
    document.head.appendChild(style);

})();