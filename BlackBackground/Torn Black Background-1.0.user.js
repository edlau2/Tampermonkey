// ==UserScript==
// @name         Torn Black Background
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/recaptcha.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const rootStyles = window.getComputedStyle(document.documentElement);
    let mainColor = rootStyles.getPropertyValue('--main-bg');

    console.log("[Torn Black Background] set --main-bg, before: ", mainColor);

    //$(":root").css("--main-bg", "#000");

    //setTimeout(doBgTest, 5000);

    $("#body").css("background", "#000");

    function doBgTest() {
        // $(":root").css("--main-bg", "#000");
        // $(":root .dark-mode").css("--main-bg", "#000");
        //document.documentElement.style.setProperty('--main-bg', '#000');
        $("#body").css("background", "#000");
        mainColor = rootStyles.getPropertyValue('--main-bg');
        console.log("[Torn Black Background] set --main-bg, after: ", mainColor);
    }

// Get the value of the CSS variable

})();