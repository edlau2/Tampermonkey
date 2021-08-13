// ==UserScript==
// @name         Torn Hide-Show Chat Icons
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Toggles the display of chat icons at the bottom of the screen
// @author       xedx [2100735]
// @include      https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    logScriptStart();

    var hideChatDiv = '<hr class="delimiter___neME6"><div id="xedxShowHideChat" style="padding-bottom: 5px; padding-top: 5px;"><span style="font-weight: 700;">Chat Icons</span>' +
        '<a id="showHideChat" class="t-blue show-hide">[hide]</a>';

    function hideChat(hide) {
        console.log(GM_info.script.name + (hide ? ": hiding " : ": showing " + "chat icons."));
        $('#showHideChat').text(`[${hide ? 'show' : 'hide'}]`);
        document.querySelector("#chatRoot > div").style.display = hide ? 'none' : 'block';
    }

    function handlePageLoaded() {
        $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(hideChatDiv);
        $('#showHideChat').on('click', function () {
            const hide = $('#showHideChat').text() == '[hide]';
            hideChat(hide);
        });
    }

    // Delay until DOM content load (not full page) complete, so that other scripts run first.
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoaded);
    } else {
        handlePageLoaded();
    }

})();