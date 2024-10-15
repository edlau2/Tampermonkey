// ==UserScript==
// @name         Torn iPad Align Left
// @namespace    http://tampermonkey.net/
// @version      0.1
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
        }`;
    document.head.appendChild(style);

    const item = document.getElementById('mainContainer');
    const st = getComputedStyle(item);
    const margin = st.margin;
    const marginLeft = st.marginLeft;
    console.log("margin: ", margin, " left: ", marginLeft);

})();
