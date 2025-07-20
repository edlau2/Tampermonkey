// ==UserScript==
// @name         Torn Suppress Chat
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script prevents chats.
// @author       xedx [2100735]
// @match        https://www.torn.com/gym.php*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @exclude      https://www.torn.com/recaptcha.php*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`#chatRoot { display: none; }`);
    function log(...data) { console.log(GM_info.script.name + ': ', ...data); }

    log("Script started");

    /*
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = typeof input === 'string' ? input : input.url;
        log("Fetch: ", url);
        if (url.indexOf(`/chat`) > -1 || url.indexOf(`/sendbird`) > -1) {
            log(`Fetch to ${url} prevented by override.`);
            return Promise.reject(new TypeError('Fetch to this URL is blocked.'));
        }
    return originalFetch(input, init);
    };
    */

    const originalUnsafeFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async (...args) => {
        let [resource, config] = args;

        const url = typeof resource === 'string' ? resource : resource.url;
        log("Unsafe Fetch: ", url);
        if (url.indexOf(`/chat`) > -1 || url.indexOf(`/sendbird`) > -1) {
            log(`Fetch to ${url} prevented by override.`);
            return Promise.reject(new TypeError('Fetch to this URL is blocked.'));
        }
    return originalUnsafeFetch(resource, config);
    };

    /*
        let response = await originalUnsafeFetch(resource, config);
        if (response.url.indexOf("metadata-v2") != -1) {
            log("metadata change detected");
            response.clone().json().then((data) => {
                debug("metadata ack: ", data.acknowledged, "\nid: ", data.id, "\ndata: ", data);
                if (data._id) {
                    GM_setValue("chatMetaData", JSON.stringify(data));
                    chatMetaData = JSON.parse(GM_getValue("chatMetaData", JSON.stringify({})));
                }
            });
        }

        return response;
    };
    */

    // Hook chat Websocket on receive message
    /*
    const originalSend = WebSocket.prototype.send;
    window.sockets = [];
    WebSocket.prototype.send = function (...args) {
        if (window.sockets.indexOf(this) === -1 && this.url.indexOf("sendbird.com") > -1) {
            log("found chat2.0 websocket");
            window.sockets.push(this);
            this.addEventListener("message", function (event) {
                if (event.data.startsWith("MESG")) {
                    const messageObj = JSON.parse(event.data.substring(4));
                    handleMessage(messageObj);
                }
            });
        }
        return originalSend.call(this, ...args);
    };
    */





})();