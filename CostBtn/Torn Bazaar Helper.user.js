// ==UserScript==
// @name         Torn Bazaar Helper
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  try to take over the world!
// @author       xedx [2100735]
// @include      https://www.torn.com/bazaar.php?userId*
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

    let autoConfirm = true;
    var targetNode = null;
    var observer = null;
    const config = { attributes: true, childList: true, subtree: true };

    var obsRetries = 0;
    function hookupObserver() {
        targetNode = document.querySelector("#react-root > div > div.segment___A6rRN.noPadding___dfjfn.itemsContainner___jjKJf" +
                           " > div.ReactVirtualized__Grid.ReactVirtualized__List > div");
        if (!targetNode && obsRetries++ < 10) return setTimeout(hookupObserver, 200);
        if (!observer) observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    function processNewNodes(nodeList) {
        for (let i=0; i<nodeList.length; i++) {
            let confNodes = targetNode.getElementsByClassName("button___PgWli");
            for (let j=0; j<confNodes.length; j++) {
                if (confNodes[j].getAttribute('aria-label') == 'Yes') {
                    if (autoConfirm) confNodes[j].click();
                }
            }
        }
    }

    const callback = function(mutationsList, observer) {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                let nodeList = mutation.addedNodes;
                if (nodeList) {
                    processNewNodes(nodeList);
                }
            }
        }
    };

    function onRadioClicked(e) {
        let selID = document.querySelector('input[name="sortopts"]:checked').value;
        console.log('Radio Button Selected: ' + selID);
        GM_setValue('selectedBtn', selID);
        document.querySelector("#react-root > div > div.searchBar___usfAr > button:nth-child(" + selID + ")").click();
    }

    function onCheckboxClicked() {
        let ckBox = document.querySelector("#confirm");
        GM_setValue('checkbox', ckBox.checked);
        autoConfirm = ckBox.checked;
    }

    function installUI() {
        let parent = document.querySelector("#react-root > div > div.wrapper");
        if (!parent) return setTimeout(installUI, 50);
        if (!document.querySelector("xedx-bazaar-ext")) $(parent).append(optionsDiv);

        // Install handlers
        $('input[type="radio"]').on('click change', onRadioClicked);
        let ckBox = document.querySelector("#confirm");
        if (!ckBox) return setTimeout(installUI, 50);
        ckBox.addEventListener("click", onCheckboxClicked);

        // Set up default states.
        autoConfirm = GM_getValue('checkbox', autoConfirm);
        console.log('installUI autoConfirm = ', autoConfirm);
        ckBox.checked = autoConfirm;

        let selID = GM_getValue('selectedBtn', 4);
        let btn = document.querySelector("#\\3" + selID);
        btn.checked = true;
        GM_setValue('selectedBtn', selID);
    }

    var ccvRetries = 0;
    function clickCostOrValue() {
        let selID = GM_getValue('selectedBtn', 4);
        let useBtn = document.querySelector("#react-root > div > div.searchBar___usfAr > button:nth-child(" + selID + ")");

        if (!useBtn && ccvRetries++ < 25) {
            return setTimeout(clickCostOrValue, 100);
        } else if (ccvRetries >= 25) {
            return;
        } else {
            useBtn.click();
            if (Number(selID) == 5) useBtn.click();  // Click twice
        }
        hookupObserver();
    }

 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    installUI();
    clickCostOrValue();

    GM_addStyle('.xedx-ctrls {' +
                    'margin: 10px;' +
                '}'
    );

    var optionsDiv =
        '<div class="t-blue-cont h" id="xedx-bazaar-ext">' +
              '<div id="xedx-content-div" class="cont-gray border-round" style="height: auto; overflow: auto">' +
                  '<div style="text-align: center">' +
                      '<span class="xedx-main">' +
                          '<div>' +
                              '<input class="xedx-ctrls" type="checkbox" id="confirm" name="confirm" value="confirm" checked>' +
                              '<label for="confirm">Auto Confirm?</label>'+
                              '<input class="xedx-ctrls" type="radio" id="1" class="xedx-oneclick" name="sortopts" data="default" value="1">' +
                                  '<label for="1">Default</label>' +
                              '<input class="xedx-ctrls" type="radio" id="2" class="xedx-oneclick" name="sortopts" data="name" value="2">' +
                                  '<label for="2">Name</label>' +
                              '<input class="xedx-ctrls" type="radio" id="3" class="xedx-oneclick" name="sortopts" data="category" value="3">' +
                                  '<label for="3">Category</label>'+
                              '<input class="xedx-ctrls" type="radio" id="4" class="xedx-oneclick" name="sortopts" data="cost" value="4">' +
                                  '<label for="4">Cost</label>'+
                              '<input class="xedx-ctrls" type="radio" id="5" class="xedx-oneclick" name="sortopts" data="value" value="5" checked>' +
                                  '<label for="5">Value</label>'+
                              '<input class="xedx-ctrls" type="radio" id="6" class="xedx-oneclick" name="sortopts" data="rarity" value="6">' +
                                  '<label for="6">Rarity</label>'+
                          '</div>'+
                      '</span>' +
                  '</div>' +
              '</div>' +
          '</div>' +
          '<hr class="page-head-delimiter m-top10 m-bottom10">';

})();