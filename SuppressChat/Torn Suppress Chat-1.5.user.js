// ==UserScript==
// @name         Torn Suppress Chat
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  This script prevents chats.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    const originalUnsafeFetch = unsafeWindow.fetch;
    const log = (...data) => { console.log(GM_info.script.name + ': ', ...data); }

    var suppressOn = GM_getValue("suppressOn", true);
    const disp = (suppressOn == true) ? 'none' : 'block';
    GM_setValue("suppressOn", suppressOn);

    // Comment out this line to see proof that chats are disabled
    GM_addStyle(`#chatRoot { display: ${disp}; }`);

    GM_addStyle(`
        div.xchat { padding-bottom: 5px; padding-top: 0px; }
        span.xchat { font-weight: 700; }
        a.xchat { margin-left: 5px; }
        #xhac-root { z-index: 99999999; }
   `);

    log("version " + GM_info.script.version + " started, enabled: ", suppressOn);


    function hookFetch() {
        unsafeWindow.fetch = async (...args) => {
            let [resource, config] = args;
            if (suppressOn == true) {
                const url = typeof resource === 'string' ? resource : resource.url;
                if (url.indexOf(`/chat`) > -1 || url.indexOf(`/sendbird`) > -1) {
                    log(`Fetch to ${url} prevented by ${GM_info.script.name}.`);
                    return Promise.reject(new TypeError('Fetch to this URL is blocked.'));
                }
            }
        return originalUnsafeFetch(resource, config);
        };
    }

    function restoreFetch() { unsafeWindow.fetch = originalUnsafeFetch; }

    if (suppressOn == true) { hookFetch(); }

    // ============ Minimal UI to enable/disable dynamically =================

    function installUi(retries=0) {
        if ($('#xhsc').length > 0) return;
        let target = $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]')[0];
        if (!$(target).length) {
            if (retries++ < 100) return setTimeout(installUi, 250, retries);
            return log("[installUi] Timed Out!");
        }

        let className = (suppressOn == true) ? "xh" : "xs";
        let msg = (suppressOn == true) ? '[enable]' : '[disable]';
        let newNode = `<div id="xhsc-root"><div class="xchat"><span class="xchat">Chat:</span>
                       <a id="xhsc" class="t-blue ${className}">${msg}</a></div></div>`;
        $(target).append(newNode);

        $('#xhsc-root').on('click', function (e) {
            let hide = $('#xhsc').hasClass('xs');
            $('#xhsc').toggleClass('xs xh');
            if (hide == true) {
                $("#chatRoot").css("display", "none");
                $('#xhsc').text("[enable]");
                hookFetch();
            } else {
                $("#chatRoot").css("display", "block");
                $('#xhsc').text("[disable]");
                restoreFetch();
            }
            suppressOn = hide;
            GM_setValue("suppressOn", suppressOn);
            log("Chat suppression toggled, now is ", ((suppressOn == true) ? 'enabled' : 'disabled'));
            return false;
        });
    }

    function checkForReady() {
        if (window.jQuery || unsafeWindow.jQuery) {
            installUi();
        } else {
            setTimeout(checkForReady, 250);
        }
    }
    checkForReady();

})();