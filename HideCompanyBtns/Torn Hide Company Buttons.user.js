// ==UserScript==
// @name         Torn Hide Company Buttons
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Hide the 'Fire' and 'Sell Company' buttons
// @author       xedx [2100735]
// @include      https://www.torn.com/companies.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/

(function() {
    'use strict';

    GM_addStyle(".fire {" +
        //"width: 30px;" +
        "display: none;" +
    "}");

    function handlePageLoad() {
        let sel = null;
        document.querySelector("#mainContainer > div.content-wrapper.m-left20.left.autumn > div.company-wrap > div.manage-company.cont-gray.bottom-round.ui-tabs.ui-widget.ui-widget-content.ui-corner-all > ul")
        let ulSel = document.querySelector("#mainContainer > div.content-wrapper > div.company-wrap " +
                                         "> div.manage-company > ul");

        if (ulSel) sel = ulSel.querySelectorAll('[aria-controls="sell-company"]')[0];
        if (sel) sel.setAttribute('style', 'display: none;');

        ulSel = document.querySelector("#manage-tabs");
        if (ulSel) sel = ulSel.querySelectorAll('[value="sell-company"]')[0];
        if (sel) {
            sel.setAttribute('style', 'display: none;');
            sel.removeAttribute('selected');
            ulSel.querySelectorAll('[value="income-chart"]')[0].setAttribute('selected', 'selected');
        }
    }
 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();
    handlePageLoad();

    if (document.readyState === 'complete') {
        handlePageLoad();
    } else {
        window.onload = function(e){handlePageLoad();}
    }

})();
