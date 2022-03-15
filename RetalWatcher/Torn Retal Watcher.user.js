// ==UserScript==
// @name         Torn Retal Watcher
// @namespace    http://tampermonkey.net/
// @version      0.3
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

    const DEV_MODE = true; // true for additional logging and test link on top of page.
    const NOTIFY_TIMEOUT_SECS = 10; // Seconds a notification will stay up, in seconds.
    const RETALS_ONLY = true; // false for debugging - will notify on wins as well as losses.

    var targetNode = null;
    var observer = null;
    var config = {attributes: false, childList: true, subtree: false};

    debugLoggingEnabled = DEV_MODE;

    GM_addStyle(`.xedx-btn {color: red; font-size: 12px;}`);
    const miniUI = '<div id="xedx-test-ui" class="box">' +
                       '<button id="xedx-btn" class="xedx-btn">Retal Watcher</button>' +
                   '</div>';

    function notify(title, notifyText, notifyImage, profileURL) {
        log('[notify]');
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        } else {
            var notification = new Notification(title, {
                icon: notifyImage,
                body: notifyText,
                requireInteraction: true,
            });

            if (NOTIFY_TIMEOUT_SECS) setTimeout(() => {notification.close()}, NOTIFY_TIMEOUT_SECS * 1000);
            notification.onclick = () => {
                notification.close();
                window.open(profileURL, '_blank');
            };
            notification.onclose = () => {notification.close()};
        }
    }

    function userQueryCB(responseText, ID, param) {
        let jsonObj = JSON.parse(responseText);
        if (jsonObj.error) {
            log('Response error: ', jsonObj.error);
            return;
        }

        let title = 'Retal! ' + jsonObj.name;
        let body = 'Click to attack!';
        debug('Notifying!');
        if (param.forced || param.attack || !RETALS_ONLY) notify(title, body, param.honorBar, param.href);
    }

    function processNewNodes(nodeList, forced=false) {
        log('[processNewNodes] nodeList: ', nodeList);
        let newLi = targetNode.firstChild;
        for (let i=0; i<nodeList.length; i++) {
            let id = 'unknown';
            let href = '', honorBar = '', attack = false;
            let newNode = nodeList[i];
            debug('newLi: ', newLi);
            debug('newNode: ', newNode);

            let idNode = newNode.getElementsByClassName('userWrap___vmatZ')[1];
            if (idNode) {
                id = idNode.firstChild.getAttribute('id').split('-')[0];
                href = idNode.firstChild.getAttribute('href');
                honorBar = idNode.querySelector("div > img").getAttribute('src');
                debug('ID: ', id);
                debug('href: ', href);
                debug('honorBar: ', honorBar);
            }

            let respNode = newNode.getElementsByClassName('respect')[0];
            if (respNode) { // See if classList has 'green' or 'red' ? Or just respect > 0?
                let valNode = respNode.parentNode.querySelector('.respect > span');
                debug('valNode: ', valNode, ' Respect: ', valNode.textContent);

                if ($(valNode).hasClass('red')) attack = true;
                if ($(valNode).hasClass('green')) attack = false;
                let userObj = {'ID': id, 'honorBar': honorBar, 'href': href, 'attack': attack, 'forced': forced};
                xedx_TornUserQuery(id, 'basic', userQueryCB, userObj);
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

    function addMiniUI() {
        let target = document.querySelector("#factions > div.content-title.m-bottom10");
        if (!target) return setTimeout(handlePageLoad, 50);
        if (!document.querySelector("xedx-test-ui")) $(target).after(miniUI);

        $('#xedx-btn').click(function() {
          if (targetNode) processNewNodes([targetNode.firstChild], true);
        });
    }

    function handlePageLoad() {
        debug('[handlePageLoad] hash: ', location.hash);
        if (location.hash.indexOf('war/chain') == -1) return;
        targetNode = document.getElementsByClassName("chain-attacks-list")[0];
        if (!targetNode) return setTimeout(handlePageLoad, 250);

        // Mini-button for testing
        if (DEV_MODE) addMiniUI();

        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }

        debug('Starting observer, target: ', targetNode);
        if (!observer) observer = new MutationObserver(mutationCallback);
        observer.observe(targetNode, config);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    window.addEventListener('hashchange', function() {
        log('The hash has changed! new hash: ' + location.hash);
        handlePageLoad();}, false);

    callOnContentLoaded(handlePageLoad);

})();
