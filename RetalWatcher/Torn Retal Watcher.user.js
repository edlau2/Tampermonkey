// ==UserScript==
// @name         Torn Retal Watcher
// @namespace    http://tampermonkey.net/
// @version      0.9
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
    const NOTIFY_TIMEOUT_SECS = 5; // Seconds a notification will stay up, in seconds. 0 means forever.

    var opts = {'opt_retalsOnly': true, // false for debugging - will notify on wins as well as losses.
                'opt_soundOn': true};   // true to play beep on retal

    // Mutation observer for attacks list
    var targetNode = null;
    var observer = null;
    const config = {attributes: false, childList: true, subtree: false};

    const beepType = "sine";   // "sine", "square", "sawtooth", "triangle" (or 'custom', but then need to define a periodic wave function)
    const beepFrequency = 440; // In hertz, 440 is middle A
    const volume = .5;         // Volume, 0-1
    var beeping = false;       // true if currently beeping, false otherwie
    var beepInt = 0;           // ID of interval timer
    var muted = false;         // Audio on/off

    debugLoggingEnabled = DEV_MODE;

    GM_addStyle(`.xedx-btn {color: red; font-size: 16px;}
                 .xcbx {margin-left: 12px;}
    `);

    const miniUI = '<div id="xedx-test-ui">' +
                       '<button id="xedx-btn" class="xedx-btn">Retal Watcher</button>' +
                       '<input type="checkbox" class="xcbx" id="xedx-retal-only" name="retal" checked>' +
                       '<label for="retal"><span style="margin-left: 15px;">Retal Only</span></label>' +
                       '<input type="checkbox" class="xcbx" id="xedx-sound-on" name="sound" checked>' +
                       '<label for="sound"><span style="margin-left: 15px;">Volume On</span></label>' +
                   '</div>';

    function notify(title, notifyText, notifyImage, profileURL) {
        log('[notify]');
        let bigNotifyImage = notifyImage.replace('small', 'large');
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
                beepingOff();
                notification.close();
                window.open(profileURL, '_blank');
            };
            notification.onclose = () => {
                beepingOff();
                notification.close()}
            ;
        }

        if (opts.opt_soundOn) {
            beepingOn();
            if (NOTIFY_TIMEOUT_SECS) setTimeout(beepingOff, NOTIFY_TIMEOUT_SECS * 1000);
        }
    }

    function doBeep() {
        beep(null, beepFrequency, volume, beepType);
    }

    function beepingOn() {
        if (!muted && !beeping && !beepInt) {
            log('[beepingOn]');
            beepInt = setInterval(doBeep, 1000);
            beeping = true;
        }
    }

    function beepingOff() {
        log('[beepingOff]');
        if (beepInt) clearInterval(beepInt);
        beeping = false;
        beepInt = 0;
    }

    function userQueryCB(responseText, ID, param) {
        log('[userQueryCB] resp: ', responseText);
        let jsonObj = null;
        try {
        jsonObj = JSON.parse(responseText);
        if (jsonObj.error) {
            log('Response error: ', jsonObj.error);
            return;
        }
        } catch (e) {
            log('JSON.parse error: ', e);
        }

        let title = 'Retal: ' + (jsonObj ? jsonObj.name : ID);
        let body = 'Click to attack!';
        debug('Notifying: ', param);
        if (param.forced || param.attack || !opts.opt_retalsOnly) notify(title, body, param.image, param.href);
    }

    function processNewNodes(nodeList, forced=false) {
        log('[processNewNodes] nodeList: ', forced, nodeList);
        let newLi = targetNode.firstChild;
        for (let i=0; i<nodeList.length; i++) {
            let id = '';
            let href = '', honorBar = '', attack = false, assist = false, lost = false;
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

            let facNode = newNode.getElementsByClassName('factionWrap___O4hN7')[1];
            let facImage = null;
            if (facNode) {
                let imgNode = facNode.querySelector('a > img');
                if (imgNode) facImage = imgNode.getAttribute('src');
            }

            let respNode = newNode.getElementsByClassName('respect')[0];
            if (respNode) { // See if classList has 'green' or 'red' ? Or just respect > 0?
                let valNode = respNode.parentNode.querySelector('.respect > span');
                debug('valNode: ', valNode, ' Respect: ', valNode.textContent);

                if (valNode.textContent == 'Assist') assist = true;
                if (valNode.textContent == 'Lost') lost = true;
                if ($(valNode).hasClass('red')) attack = true;
                if ($(valNode).hasClass('green')) attack = false;
                let userObj = {'ID': id, 'image': (facImage ? facImage : honorBar), 'href': href, 'attack': attack, 'forced': forced};

                if (forced || attack || !opts.opt_retalsOnly) {
                    if (id && !assist && !lost) xedx_TornUserQuery(id, 'basic', userQueryCB, userObj);
                }
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
        log('[addMiniUI] ==>');
        let target = document.querySelector("#factions > div.content-title.m-bottom10");
        if (!target) return setTimeout(handlePageLoad, 50);
        if (!document.querySelector("#xedx-test-ui")) $(target).after(miniUI);

        $('#xedx-btn').click(function() {
            if (targetNode) processNewNodes([targetNode.firstChild], true);
            //if (targetNode) processNewNodes([targetNode.querySelectorAll('li')[3]], true);
        });

        $("#xedx-retal-only")[0].checked = GM_getValue("opt_retalsOnly", opts.opt_retalsOnly);
        $("#xedx-retal-only")[0].addEventListener("click", function() {
            opts.opt_retalsOnly = this.checked;
            GM_setValue("opt_retalsOnly", opts.opt_retalsOnly);
            debug('Retal Only set to: ', opts.opt_retalsOnly);
        });

        $("#xedx-sound-on")[0].checked = GM_getValue("opt_soundOn", opts.opt_soundOn);
        $("#xedx-sound-on")[0].addEventListener("click", function() {
            opts.opt_soundOn = this.checked;
            GM_setValue("opt_soundOn", opts.opt_soundOn);
            debug('Volume On set to: ', opts.opt_soundOn);
        });

        log('<== [addMiniUI] opts:', opts);
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