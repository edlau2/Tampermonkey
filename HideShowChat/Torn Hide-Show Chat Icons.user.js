// ==UserScript==
// @name         Torn Hide-Show Chat Icons
// @namespace    http://tampermonkey.net/
// @version      0.6
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

    var hideChatDiv = '<hr id="xedx-hr-delim" class="delimiter___neME6">' +
        '<div id="xedxShowHideChat" style="padding-bottom: 5px; padding-top: 5px;">' +
        '<span style="font-weight: 700;">Chat Icons</span>' +
        '<a id="showHideChat" class="t-blue show-hide">[hide]</a>';

    function hideChat(hide) {
        console.log(GM_info.script.name + (hide ? ": hiding " : ": showing " + "chat icons."));
        $('#showHideChat').text(`[${hide ? 'show' : 'hide'}]`);
        document.querySelector("#chatRoot > div").style.display = hide ? 'none' : 'block';
    }

    function disableTornToolsChatHide() {
        if (validPointer($('#tt-hide_chat')[0])) {
            console.log(GM_info.script.name + " disabling TornTools 'Hide Chat' icon");
            $('#tt-hide_chat')[0].style.display = 'none';
        }
    }

    function appendHideShowChatDiv() {
        console.log('appendHideShowChatDiv: #xedxShowHideChat = ' + $('#xedxShowHideChat'));
        console.log('appendHideShowChatDiv: content = ' + $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]'));

        if (!validPointer($('#xedxShowHideChat'))) {
            console.log('#xedxShowHideChat NOT found.');
        } else {
            $('#xedx-hr-delim').remove();
            $('#xedxShowHideChat').remove();
        }
        console.log('Appending #xedxShowHideChat.');
        $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(hideChatDiv);
        installClickHandler();
    }

    function installClickHandler() {
        $('#showHideChat').on('click', function () {
                const hide = $('#showHideChat').text() == '[hide]';
                GM_setValue('xedxHideChat', hide);
                hideChat(hide);
            });
    }

    function handlePageLoaded() {
        appendHideShowChatDiv();
        if (window.location.pathname.indexOf('loader.php') >= 0) {
            hideChat(GM_getValue('xedxHideChat', false));
        } else {
            const savedHide = GM_getValue('xedxHideChat', false);
            appendHideShowChatDiv();
            hideChat(savedHide);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    // Delay until DOM content load (not full page) complete, so that other scripts run first.
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoaded);
    } else {
        handlePageLoaded();
    }

    // Check for Torn Tools, AFTER page is -fully- loaded
    window.onload = function(e){disableTornToolsChatHide();}

})();