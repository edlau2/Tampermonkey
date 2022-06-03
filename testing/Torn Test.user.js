// ==UserScript==
// @name         Torn Test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/points.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    logScriptStart();

    GM_addStyle(`.xedx-container {position:fixed; width:650px; overflow:hidden; left:32%; z-index:28; height:326px; top:118px;}
                 .xedx-iframe {width: 100%;height: 100%;}
                 .xhide {display: none;}
                 .xshow {display: block;}
                 `);

    $('.toggle-content___C6m1T span:contains("Points")').next().mouseover(function() {     //  Pick mouseover event
        log('Mouse click detected');
        $(this).data('timeout', setTimeout(function () { // Save timeout fn if we need to cancel
            log('timer popped: ', $('#myIframe'));
            hideFrameContent();  // Hide the stuff we don't want.
            $('#myIframe').removeClass('xhide').addClass('xshow');
            setTimeout(hideFrameContent, 250); // This is a just in case, if we call the hideFrameContent before everything is actually
                                               // there, the 'show()' calls may not work. Yes bad name as it hides and shows.
        }, 1000));
        }).mouseleave(function () {
            clearTimeout($(this).data('timeout'));
            log('mouse left');
        });

    const content = "<div id='myIframe' class='myframe xedx-container xhide'" +
          "><iframe id='x-iframe' class='xedx-iframe' src='https://www.torn.com/points.php'></iframe></div>";

    // This is so you don't load iFrames inside of iFrames forever, if you click on the points in the iFrame :-)
    if (window.top === window.self) {     // Run Script if the Focus is Main Window
        let iframe = $("body").prepend(content);
        //hideFrameContent();
    } else {
        //--- Script is on domain_B.com if it is IN AN IFRAME.
        // DO YOUR STUFF HERE.
    }

    //$('iframe').load(function () { // This runs when the iFrame loads? I just run it when I unhide it.
    function hideFrameContent() {
        //var frame = $('iframe').contents();
        var frame = $('#x-iframe').contents(); // I like finding ID's better if unique.
                                               // Only need classes to match multiples.
        log('[test] frame: ', frame);

        // This adds frame-specific styles.
        frame.find('head').append(`<style type="text/css">
            .points-list > li {display:none!important;}
            .points-list > li:nth-child(2) {display:block!important;}
            .points-list > li:nth-child(3) {display:block!important;}
            .points-list > li:nth-child(4) {display:block!important;}
            // .content-wrapper{
            // width:100%!important;
            // }
            </style>`);

        // Slectively hide content, so the parents stay visible.
        frame.find('.tutorial-cont,#sidebarroot,#header-root,#footer,.chat-box-wrap_3fvIp,.content-title').hide();
        frame.find('div[class^="_chat-box"]').hide();

        // Get rid of top margin
        frame.find('.content-wrapper').css({"margin-top": "0px"});

        // Make sure the first 3 icons (0, 1, and 2) are shown, the rest - just remove.
        frame.find('.points-list > li').each(function (index) {
            if (index <= 2) {
                $(this).show(); // Hidden already by css styles, above (I think): ".points-list > li {display:none!important;}"
            } else {
                $(this).remove();
            }
        });
    }

})();
