// ==UserScript==
// @name         Torn Suppress Chat
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script prevents chats.
// @author       xedx [2100735]
// @match        https://www.torn.com/gym.php*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    // Comment out this line to see proof that chats are disabled
    GM_addStyle(`#chatRoot { display: none; }`);

    function log(...data) { console.log(GM_info.script.name + ': ', ...data); }
    log("Script started");

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

    // ============Minimal UI to enable/disable dynamically, TBD =================

    function installUi(retries=0) {
        GM_addStyle(`
            div.xchat { padding-bottom: 5px; padding-top: 0px; }
            span.xchat { font-weight: 700; }
            a.xchat { margin-left: 5px; }
        `);
        let newNode = `<div id="xhsc-root"><div class="xchat"><span class="xchat">Chat Icons</span>
                       <a id="xhsc" class="t-blue show-hide xchat">[show]</a></div></div>`;
        let target = $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]')[0];
        $(target).append(newNode);

        $('#xhsc').on('click', function (e) {
            const hide = $('#xhsc').text() == '[hide]';
            if (hide == true) {
                $("#chatRoot").css("display", "none");
            } else {
                $("#chatRoot").css("display", "block");
            }
            return false;
        });
    }

    function checkForReady() {
        if (window.jQuery) {
            installUi()
        } else {
            setTimeout(checkForReady, 250);
        }
    }
    checkForReady();


})();