// ==UserScript==
// @name         Torn Chain Watcher
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Make the chain timeout/count blatantly obvious.
// @author       xedx [2100735]
// @include      https://www.torn.com/factions.php*
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

    GM_addStyle(`.xedx-chain {text-align: center;
                              font-size: 56px; color: red; width: 784px; margin-left:260px; margin-top: 10px;}
                 .xedx-chain-alert {text-align: center;
                              font-size: 56px; color: lime; width: 784px; margin-left:260px;  margin-top: 10px;
                              -webkit-animation: highlight-active 1s linear 0s infinite normal;
                              animation: highlight-active 1s linear 0s infinite normal;}`
    );

    const chainDiv = '<div id="xedx-chain-div">' +
                         '<span id="xedx-chain-span" class="xedx-chain">&nbsp</span>' +
                     '</div>';

    var targetNode = null;
    var chainNode = null;

    function timerTimeout() {
        //log('Timer pop: ', $("#xedx-chain-span")[0].textContent, targetNode.textContent);
        let parts = targetNode.textContent.split(':');
        if (Number(parts[0]) <= 1) {
            $("#xedx-chain-span").removeClass('xedx-chain');
            $("#xedx-chain-span").addClass('xedx-chain-alert');
        } else {
            $("#xedx-chain-span").addClass('xedx-chain');
            $("#xedx-chain-span").removeClass('xedx-chain-alert');
        }
        //$("#xedx-chain-span")[0].textContent = parts[0] + ':' + (Number(parts[1]) - 1).toString();
        $("#xedx-chain-span")[0].textContent = targetNode.textContent + ' | ' + chainNode.textContent.split('/')[0];

        document.querySelector("#barChain > div.bar-stats___pZpNX > p.bar-value___HKzIH")
    };

    function handlePageLoad() {
        let parent = document.querySelector("#react-root > div > div > hr")
        if (!parent) {
            log('Parent not found!');
            return setTimeout(handlePageLoad, 250);
        }
        log('parent: ', parent);
        $(parent).after(chainDiv);

        setInterval(timerTimeout, 1000);

        targetNode = document.querySelector("#barChain > div.bar-stats___pZpNX > p.bar-timeleft____259L");
        chainNode = document.querySelector("#barChain > div.bar-stats___pZpNX > p.bar-value___HKzIH");
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    handlePageLoad();

    //callOnContentLoaded(handlePageLoad);

})();