// ==UserScript==
// @name         Torn Retal Watcher
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Monitor for retals avail. on chain page
// @author       xedx [2100735]
// @include      https://www.torn.com/factions.php?step=your*
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

    var targetNode = null;
    var observer = null;
    var config = {attributes: false, childList: true, subtree: false};

    function notify(notifyText) {
        log('[notify]');
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        } else {
            var notification = new Notification('Retal!', {
            icon: 'https://imgur.com/24j01c0.png',
            body: notifyText,
            });

            setTimeout(() => {notification.close()}, 10000);
            notification.onclick = () => {notification.close()};
        }
    }

    function processNewNodes(nodeList) {
        log('[processNewNodes] nodeList: ', nodeList);
        let newLi = targetNode.firstChild;
        for (let i=0; i<nodeList.length; i++) {
            let id = 'unknown';
            let newNode = nodeList[i];
            log('newLi: ', newLi);
            log('newNode: ', newNode);
            //if (newNode.parentNode != targetNode) continue;
            log('must be LI!');

            let idNode = newLi.getElementsByClassName('userWrap___vmatZ')[1];
            log('idNode: ', idNode);

            if (idNode) {
                id = idNode.firstChild.getAttribute('id').split('-')[0];
                log('ID = ', id);
            }

            let respNode = newLi.getElementsByClassName('respect')[0];
            log('respNode: ', respNode);

            if (respNode) { // See if classList has 'green' or 'red' ? Or just respect > 0?
                let valNode = respNode.parentNode.querySelector('.respect > span');
                log('valNode: ', valNode, ' Respect: ', valNode.textContent);

                if ($(valNode).hasClass('red')) {
                    log('Is a loss!');
                    log('Notifying!');
                    notify('ID: ' + id);
                }
                if ($(valNode).hasClass('green')) log('Is a win!');
            }
        }
    }

    const mutationCallback = function(mutationsList, observer) {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                let nodeList = mutation.addedNodes;
                if (nodeList) processNewNodes(nodeList);
            }
        }
    };

    function handlePageLoad() {
        log('[handlePageLoad] hash: ', location.hash);
        if (location.hash.indexOf('war/chain') == -1) return;
        targetNode = document.querySelector("#react-root > div > div > ul > li.descriptions > div > ul.chain-attacks-list");
        if (!targetNode) return setTimeout(handlePageLoad, 250);

        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }

        log('Starting observer, target: ', targetNode);
        if (!observer) observer = new MutationObserver(mutationCallback);
        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    //validateApiKey();
    versionCheck();

    // your#/war/chain
    window.addEventListener('hashchange', function() {
        log('The hash has changed! new hash: ' + location.hash);
        handlePageLoad();}, false);

    callOnContentLoaded(handlePageLoad);

})();
