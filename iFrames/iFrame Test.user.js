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

    // Defines the iframe and contents we'd like to add. This happens to be the
    // 'ivault' frame, we can have as many as we like.
    const myFrame = "<iframe id='ivault' class='iframes' scrolling='no'" +
                    "style='display:none; position:fixed; width:850px; height:326px; left:34%; top:13%;" +
                    "z-index:99; border:10px solid #1a0029 ; outline:1px solid #f50'" +
                    "src= 'https://www.torn.com/properties.php#/p=options&tab=vault' </iframe>";

    // We can save this when created as an easy way to check for existence.
    var iframe = null;

    // Add the style to hide an element
    GM_addStyle(`.myHideClass {display: none;}`);


    // MouseHover Money Value. If the timeout (for the mouseenter) is interupted
    // by the mouseleave, it cancels the fn to 'show'.
    $('#user-money')
    .mouseenter(function(){
        log('[mouseenter]');
        $(this).data('timeout',
                     setTimeout(function() {$('#ivault ').show()}, 1000))
    })
    .mouseleave(function () {
            clearTimeout($(this).data('timeout'));});


    // Click OutSide to Hide iFrame. This would trigger anywhere in the body.
    // Right now, all it does it hide the entire 'ivault' iframe.
    $('body').click(function() {
        log('[body.click]');
        $('#ivault').hide(); // Changed from .iframes class to #ivault ID
                             // Prob gonna have issues referencing individual things inside the frame
                             // Since they are same ID's, classes, etc - but in diff window
    });

    // Hide an element (adds the 'display: none;' CSS style)
    function hideElement(e) {
        if (!$(e).hasClass('myHideClass')) $(e).addClass('myHideClass');
    }

    // This finds all elements, using the 'selector' selector,
    // and returns an iterable array of the elements. Note that
    // a node list is live, whereas an arary is not.
    //
    // This ONLY looks in the 'irefill' iFrame.
    function getRefillFrameElements(selector) {
        return  Array.from($('#irefill').contents().find(selector));
    }

    // This finds all elements, using the 'selector' selector,
    // and returns an iterable array of the elements. It will find
    // all the requested elements, in the iFrame specified by the ID
    // iFrameID. Provide this in the form '#id'
    function getFrameElements(iFrameID, selector) {
        return Array.from($(iFrameID).contents().find(selector));
    }

    // Same as above, but second param is an array of selectors
    function getFrameElements2(iFrameID, selectors) {
        let retArray = [];
        let sel = selectors.pop();
        while (sel) {
            let arr = Array.from($(iFrameID).contents().find(sel));
            if (arr.length) retArray = [...retArray, ...arr];
            sel = selectors.pop();
        }
        return retArray;
    }


    // Once an iFrame is created, this will check the content, once the iFrame body itself
    // has been created, and selectively hide whatever is specified.
    function checkIframeLoaded(firstCheck=false) {
        // Get a handle to the iframe element
        if (!iframe) {
            log('ERROR: iFrame not yet created!');
            return;
        }
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        log('[checkIframeLoaded] iframe: ', iframe, ' doc: ', iframeDoc, ' readystate: ', (iframeDoc ? iframeDoc.readyState : 'unknown'));

        if (iframeDoc && iframeDoc.readyState == 'complete') {
            log('[checkIframeLoaded] complete!');
            if (firstCheck) return window.setTimeout(checkIframeLoaded, 250); // Ignore first #document complete.

            //$("#ivault").contents().find("#header-root").hide(); // Hide stuff
            //$("#ivault").contents().find(".info-msg-cont").hide();
            //$("#ivault").contents().find(".property-info-cont").hide();
            //$("#ivault").contents().find(".content-title").hide();

            //debugger; // Uncomment to stop in the debugger

            let nodeArray = getFrameElements("#ivault", "#header-root"); // Test: hide by ID
            nodeArray.forEach(e => hideElement(e));

            nodeArray = getFrameElements("#ivault", "a"); // Test: hide by tag
            nodeArray.forEach(e => hideElement(e));

            // Now here's a different way, showing off even more power of sub functions. pass in an array of selectors.
            nodeArray = getFrameElements2("#ivault", [".info-msg-cont", ".property-info-cont", ".content-title"]); // Test: hide array of selectors
            nodeArray.forEach(e => hideElement(e));

            // Now, what you could also do if you really wanted to, is create this function:
            // hideiVaultNodes(".info-msg-cont", ".property-info-cont", ".content-title");
            // to do all of the above in one line.

            return;
        }

        // If we are here, it is not loaded.
        window.setTimeout(checkIframeLoaded, 250);
    }

    function handlePageLoad() {
        // Vault iFrame
        if (window.top === window.self) {     // Run Script if the Focus is Main Window (Don't also put inside the iFrame!)
            log('Prepending iFrame');
            $('body').prepend(myFrame);
            iframe = document.getElementById('ivault'); // save this so we know we've done this.
            checkIframeLoaded(true);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    callOnContentLoaded(handlePageLoad);

})();
