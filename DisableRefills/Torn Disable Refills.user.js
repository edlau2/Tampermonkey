// ==UserScript==
// @name         Torn Disable Refills
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Disables refills in the points building if bars aren't empty.
// @author       xedx [2100735]
// @include      https://www.torn.com/points.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    var safetyOn = true;
    var jsonResp = null;
    let safetyNet = '<input class="xedx-ctrls" type="checkbox" id="confirm" name="confirm" value="confirm" checked>' +
                    '<label for="confirm">  Safety Net! Note that clicking the title bar will bypass the safety net.</label>';

    function onCheckboxClicked() {
        let ckBox = document.querySelector("#confirm");
        safetyOn = ckBox.checked;
        GM_setValue('checkbox', ckBox.checked);
    }

    function onRefillClick(e) {
        var $el = $(this);
        let target = e.target;
        var parent = e.target.parentElement;
        if (!safetyOn) return;
        if (target.classList[1] == undefined) {
            if ((parent.classList[1].indexOf('energy') > -1) && jsonResp.energy.current > 0) return e.stopPropagation();
            if ((parent.classList[1].indexOf('nerve') > -1) && jsonResp.nerve.current > 0) return e.stopPropagation();
        } else {
            if ((target.classList[1].indexOf('energy') > -1) && jsonResp.energy.current > 0) return e.stopPropagation();
            if ((target.classList[1].indexOf('nerve') > -1) && jsonResp.nerve.current > 0) return e.stopPropagation();
        }
    }

    function userQueryCB(responseText, id, param) {
        jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleApiError(responseText);}

        let titleBar = document.querySelector("#mainContainer > div.content-wrapper.m-left20 > div.content-title");
        if (!titleBar) return setTimeout(function (){userQueryCB(responseText, id, param)}, 100);
        $(titleBar).append(safetyNet);

        let ckBox = document.querySelector("#confirm");
        ckBox.addEventListener("click", onCheckboxClicked);
        ckBox.checked = safetyOn = GM_getValue('checkbox', true);

        document.querySelector("#mainContainer > div.content-wrapper > ul").addEventListener('click', onRefillClick, {capture: true}, true);
    }
 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();
    xedx_TornUserQuery(null, 'bars', userQueryCB);

})();




