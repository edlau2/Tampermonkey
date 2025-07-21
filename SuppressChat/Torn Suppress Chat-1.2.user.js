// ==UserScript==
// @name         Torn Suppress Chat
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  This script prevents chats.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    // Comment out these lines to see proof that chats are disabled
    GM_addStyle(`
        #chatRoot { display: none; }
        div.xchat { padding-bottom: 5px; padding-top: 0px; }
        span.xchat { font-weight: 700; }
        a.xchat { margin-left: 5px; }
        #xhac-root { z-index: 99999999; }
   `);

    var suppressOn = GM_getValue("suppressOn", true);
    GM_setValue("suppressOn", suppressOn);

    function log(...data) { console.log(GM_info.script.name + ': ', ...data); }
    log("Script started");

    const originalUnsafeFetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async (...args) => {
        let [resource, config] = args;

        if (suppressOn == true) {
            const url = typeof resource === 'string' ? resource : resource.url;
            log("Unsafe Fetch: ", url);
            if (url.indexOf(`/chat`) > -1 || url.indexOf(`/sendbird`) > -1) {
                log(`Fetch to ${url} prevented by override.`);
                return Promise.reject(new TypeError('Fetch to this URL is blocked.'));
            }
        }
    return originalUnsafeFetch(resource, config);
    };

    // ============Minimal UI to enable/disable dynamically, TBD =================

    function installUi(retries=0) {
        log("[installUi]");
        let target = $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]')[0];
        if (!$(target).length) {
            if (retries++ < 100) return setTimeout(installUi, 250, retries);
            return log("Install UI Timed Our!");
        }

        let newNode = `<div id="xhsc-root"><div class="xchat"><span class="xchat">Chat Icons</span>
                       <a id="xhsc" class="t-blue xs xchat">[show]</a></div></div>`;
        $(target).append(newNode);

        log("[installUi], target: ", $(target));
        log("root: ", $("#xhsc-root"));

        $('#xhsc-root').on('click', function (e) {
            log("Click!");
            let hide = $('#xhsc').hasClass('xh');
            $('#xhsc').toggleClass('xs xh');
            log("On click: ", hide, $("#chatRoot").css("display"));
            if (hide == true) {
                $("#chatRoot").css("display", "none");
                $('#xhsc').text("[show]");
            } else {
                $("#chatRoot").css("display", "block");
                $('#xhsc').text("[hide]");
            }
            GM_setValue("suppressOn", hide);
            return false;
        });
    }

    function checkForReady() {
        log("[checkForReady", window.jQuery, unsafeWindow.jQuery);
        if (window.jQuery || unsafeWindow.jQuery) {
            installUi();
        } else {
            setTimeout(checkForReady, 250);
        }
    }

    log("Start to install UI");
    checkForReady();


})();