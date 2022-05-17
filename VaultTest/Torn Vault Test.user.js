// ==UserScript==
// @name         Torn Vault Test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/properties.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    function handlePageLoad() {
        if (location.hash.indexOf('vault') == -1) {
            log('Not on vault page');
            return;
        }
        let inputNode = document.querySelector("#properties-page-wrap > div.property-option > div.vault-opt.owner > div.vault-wrap.cont-gray " +
                                               " > form.vault-cont.right.deposit-box > div.cont.torn-divider > div > input:nth-child(3)");
        if (!inputNode) return setTimeout(handlePageLoad, 500);

        let newValue = 123456;
        inputNode.setAttribute('value', newValue);
        log('Set value to ', newValue);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    window.addEventListener('hashchange', handlePageLoad);
    callOnContentComplete(handlePageLoad);

})();
