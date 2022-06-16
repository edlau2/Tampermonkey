// ==UserScript==
// @name         iFrame Test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/*
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

    const myFrame = "<iframe id='ivault' class='iframes' scrolling='no'" +
                    "style='display:none; position:fixed; width:850px; height:326px; left:34%; top:13%;" +
                    "z-index:99; border:10px solid #1a0029 ; outline:1px solid #f50'" +
                    "src= 'https://www.torn.com/properties.php#/p=options&tab=vault' </iframe>"


    // MouseHover Money Value
    $('#user-money').mouseenter(function(){
        log('[mouseenter]');
        setTimeout(function() {
            $('#ivault ').show();
        }, 1000);
    });

    // Click OutSide to Hide iFrame
    $('body').click(function() {
        log('[body.click]');
        $('#ivault').hide(); // Changed from .iframes class to #ivault ID
                             // Prob gonna have issues referencing individual things inside the frame
                             // Since they are same ID's, classes, etc - but in diff window
    });

    function handlePageLoad() {
        // Vault iFrame
        if (window.top === window.self) {     // Run Script if the Focus is Main Window (Don't also put inside the iFrame!)
            log('Prepending iFrame');
            $('body').prepend(myFrame);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    callOnContentLoaded(handlePageLoad);

})();
