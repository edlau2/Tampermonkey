// ==UserScript==
// @name         Torn iPad Align Left
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Align left on iPad desktop mode
// @run-at       document-start
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
            margin-left: 20px;
        }`;
    document.head.appendChild(style);

})();