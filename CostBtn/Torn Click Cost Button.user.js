// ==UserScript==
// @name         Torn Click Cost Button
// @namespace    http://tampermonkey.net/
// @version      0.3
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

    let autoConfirm = true; // Change to 'false' to NOT suppress confirmation
    //let button = 'cost';    // Toggle these to sort by cost or value
    let button = 'value';

    var targetNode = null;
    var observer = null;
    const config = { attributes: true, childList: true, subtree: true };

    var retries = 0;
    function hookupObserver() {
        log('hookupObserver');
        targetNode = document.querySelector("#react-root > div > div.segment___A6rRN.noPadding___dfjfn.itemsContainner___jjKJf" +
                           " > div.ReactVirtualized__Grid.ReactVirtualized__List > div");

        if (!targetNode && retries++ < 10) {
            log('Retry attempt #' + retries);
            return setTimeout(hookupObserver, 200);
        }

        if (!observer) observer = new MutationObserver(callback);
        log('Starting observer');
        observer.observe(targetNode, config);
    }

    function processNewNodes(nodeList) {
        log('processNewNodes: ' + nodeList.length);
        for (let i=0; i<nodeList.length; i++) {
            let confNodes = targetNode.getElementsByClassName("button___PgWli");
            log('confNodes: ' + confNodes.length);
            for (let j=0; j<confNodes.length; j++) {
                console.log('confNode: ', confNodes[j]);
                if (confNodes[j].getAttribute('aria-label') == 'Yes') {
                    console.log('Found YES conf button (clicking): ', confNodes[j]);
                    if (autoConfirm) confNodes[j].click();
                }
            }
        }
    }

    const callback = function(mutationsList, observer) {
        for(const mutation of mutationsList) {
            log('mutation.type = ' + mutation.type);
            if (mutation.type === 'childList') {
                log("Detected childList!");
                let nodeList = mutation.addedNodes;
                if (nodeList) {
                    log("Detected new nodes!");
                    processNewNodes(nodeList);
                }
            }
        }
    };

    function clickCostOrValue() {
        log('clickCostOrValue: ' + button);
        let useBtn = null;

        if (button == 'cost')
            useBtn = document.querySelector("#react-root > div > div.searchBar___usfAr > button:nth-child(4)");
        else
            useBtn = document.querySelector("#react-root > div > div.searchBar___usfAr > button:nth-child(5)");

        if (!useBtn) {
            return setTimeout(clickCostOrValue, 100);
        } else {
            useBtn.click();
            if (button == 'value') useBtn.click();  // Click twice
        }

        log('Hooking up observer');
        hookupObserver();
    }

 
    //////////////////////////////////////////////////////////////////////
    // Main. 
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    clickCostOrValue();

})();