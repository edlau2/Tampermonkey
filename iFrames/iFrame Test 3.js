// ==UserScript==
// @name         iFrame Test
// @namespace    http://tampermonkey.net/
// @version      0.2
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

    const log = function(...data) {console.log('iFrameTest: ', ...data)}

    // Defines the iframe and contents we'd like to add. This happens to be the
    // 'ivault' frame, we can have as many as we like.
    const vaultFrameID = 'ivault';
    const vaultFrame = "<iframe id='" + vaultFrameID + "' class='iframes' scrolling='no'" +
                "style='display:none; position:absolute; width:850px; height:326px;" + // left:34%; top:13%;" +
                "z-index:99; border:10px solid #1a0029 ; outline:1px solid #f50'" +
                "src= 'https://www.torn.com/properties.php#/p=options&tab=vault' </iframe>";

    // Hide an element
    function hideElement(e) {$(e).hide();}

    // Get a bunch of elements as one array of elements
    function getiFrameElements(iFrameID, ...selectors) {
        let retArray = [];
        for(let sel of selectors) {
            log('[getFrameElements3] finding sel ', sel);
            let arr = Array.from($("#" + iFrameID).contents().find(sel));
            if (arr.length) {retArray = [...retArray, ...arr];}
        }
        return retArray;
    }

    // Hide a bunch of elements. Uses the above functions to do this.
    function hideiFrameElements(iFrameID, ...selectors) {
        let arr = getiFrameElements(iFrameID, ...selectors);
        log('[hideFrameElements3] found ' + arr.length + ' elements.');
        arr.forEach(e => hideElement(e));
    }

    // Once an iFrame is created, this will check the content, once the iFrame body itself
    // has been created, and selectively hide whatever is specified.
    function checkIframeLoaded(id, firstCheck=false) {
        let iframe = document.getElementById(id);
        if (!iframe) {
            log('ERROR: iFrame not yet created! (id=' + id + ')');
            return;
        }
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        log('[checkIframeLoaded] iframe: ', iframe, ' doc: ', iframeDoc, ' readystate: ', (iframeDoc ? iframeDoc.readyState : 'unknown'));

        if (iframeDoc && iframeDoc.readyState == 'complete') {
            log('[checkIframeLoaded] complete!');
            if (firstCheck) return window.setTimeout(function(){checkIframeLoaded(id)}, 250); // Ignore first #document complete.

            if (id == vaultFrameID) { // vault specific stuff
                log('[checkIframeLoaded] hiding stuff for vault');
                hideiFrameElements(id, ".info-msg-cont", ".property-info-cont", ".content-title", "a", "#header-root");
            }

            return;
        }

        // If we are here, it is not loaded.
        window.setTimeout(function(){checkIframeLoaded(id)}, 250);
    }

    function loadiFrame(frame, id) {
        // Vault iFrame
        if (window.top === window.self) {     // Run Script if the Focus is Main Window (Don't also put inside the iFrame!)
            log('Prepending iFrame');
            $('body').prepend(frame);
            checkIframeLoaded(id, true);
        }
    }

    function addHandlers() {
        // MouseHover Money Value. If the timeout (for the mouseenter) is interupted
        // by the mouseleave, it cancels the fn to 'show'.
        $('#user-money')
        .mouseenter(function (ev) {
            log('[mouseenter]');
            $(this).data('timeout',
                setTimeout(function() {
                    log('[mouseenter]');
                    $('#ivault').show();
                    $('#ivault').css('left', ev.clientX);
                    $('#ivault').css('top', ev.clientY);
                    checkIframeLoaded(vaultFrameID, true); // Only checks the one iFrame!
                }, 1000))
        })
        .mouseleave(function () {
            log('[mouseleave]');
            clearTimeout($(this).data('timeout'));
        });

        // Click OutSide to Hide iFrame. This would trigger anywhere in the body.
        // Right now, all it does it hide the entire 'ivault' iframe.
        $('body').click(function() {
            log('[body.click]');
            $('#ivault').hide(); // Changed from .iframes class to #ivault ID
                                 // Prob gonna have issues referencing individual things inside the frame
                                 // Since they are same ID's, classes, etc - but in diff window
        });
    }

    //////////////////////////////////////////////////////////////////////
    // Main. This is where the script starts.
    //////////////////////////////////////////////////////////////////////

    console.log('Starting script "iFrame Test"...');

    // Add click handlers
    addHandlers();

    // Add some iFrames...
    loadiFrame(vaultFrame, vaultFrameID); // Do the vault iFrame ...
    // loadiFrame(refillFrame, refillFrameID); // another one ...

})();
