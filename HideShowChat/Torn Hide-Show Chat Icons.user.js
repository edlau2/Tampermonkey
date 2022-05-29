// ==UserScript==
// @name         Torn Hide-Show Chat Icons
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  Toggles the display of chat icons at the bottom of the screen
// @author       xedx [2100735]
// @match        https://www.torn.com/*
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

    var hideChatHdr = '<hr id="xedx-hr-delim" class="delimiter___neME6">';

    var hideChatDiv = '<div><hr id="xedx-hr-delim" class="delimiter___neME6">' +
        '<div id="xedxShowHideChat" style="padding-bottom: 5px; padding-top: 5px;">' +
        '<span style="font-weight: 700;">Chat Icons</span>' +
        '<a id="showHideChat" class="t-blue show-hide">[hide]</a></div>';

    function hideChat(hide) {
        log((hide ? "hiding " : "showing " + "chat icons."));
        $('#showHideChat').text(`[${hide ? 'show' : 'hide'}]`);
        if (document.querySelector("#chatRoot > div"))
            document.querySelector("#chatRoot > div").style.display = hide ? 'none' : 'block';
    }

    function disableTornToolsChatHide() {
        if (validPointer($('#tt-hide_chat')[0])) {
            log("Disabling TornTools 'Hide Chat' icon");
            $('#tt-hide_chat')[0].style.display = 'none';
        }
    }

    function appendHideShowChatDiv() {
        //$('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(hideChatHdr);
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
        if (!validPointer($("#chatRoot > div"))) { // Should never happen...
            log('Delaying <div> insertion...');
            setTimeout(handlePageLoad, 500);
            return;
        }

        appendHideShowChatDiv();
        hideChat(GM_getValue('xedxHideChat', false));

        disableTornToolsChatHide();
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    // Delay until DOM content load (not full page) complete
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', handlePageLoaded);
    } else {
        handlePageLoaded();
    }

})();
