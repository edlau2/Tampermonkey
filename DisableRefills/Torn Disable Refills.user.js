// ==UserScript==
// @name         Torn Disable Refills
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Disables refills in the points building if bars aren't empty.
// @author       xedx [2100735]
// @match      https://www.torn.com/points.php*
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

    var safetyOn = true;
    var jsonResp = null;
    let safetyNet = '<input class="xedx-ctrls" type="checkbox" id="refill_confirm" name="refill_confirm" value="refill_confirm" checked>' +
                    '<label for="refill_confirm">  Safety Net! Note that clicking the title bar will bypass the safety net.</label>';

    function onCheckboxClicked() {
        let ckBox = document.querySelector("#refill_confirm");
        safetyOn = ckBox.checked;
        GM_setValue('refills_checkbox', ckBox.checked);
    }

    function onRefillClick(e) {
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

        let ckBox = document.querySelector("#refill_confirm");
        ckBox.addEventListener("click", onCheckboxClicked);
        ckBox.checked = safetyOn = GM_getValue('refills_checkbox', true);

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




