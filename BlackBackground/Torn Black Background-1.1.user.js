// ==UserScript==
// @name         Torn Black Background
// @namespace    http://tampermonkey.net/
// @version      1.1
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
    var userStatus;
    var lastStatus;


    let mainColor = rootStyles.getPropertyValue('--main-bg');

    console.log("[Torn Black Background] set --main-bg, before: ", mainColor);


    var userData = JSON.parse(sessionStorage.getItem('headerData'));
    if (userData && userData.user && userData.user.state)
        userStatus = userData.user.state.status;

    console.log("[Torn Black Background] userData: ", userData);
    console.log("[Torn Black Background] status: ", (userData ? (userData.user ? (userData.user.state ? userData.user.state.status :'no state') : 'no user') : 'no data'));


    $("#body").css("background", "#000");
    setInterval(updateStatus, 1000);

    function updateStatus() {
        var userData = JSON.parse(sessionStorage.getItem('headerData'));
        if (userData && userData.user && userData.user.state)
            userStatus = userData.user.state.status;

        console.log("[Torn Black Background] update: ", userStatus, lastStatus);

        if (userStatus && lastStatus && userStatus != lastStatus) {
            switch (userStatus) {
                case 'ok':
                    $("#body").css("background", "#000");
                    break;
                case 'hospital':
                    $("#body").css("background", "#444");
                    break;
                default:
                    console.log("Unknown status: ", userStatus);
                    $("#body").css("background", "#000");
                    break;
            }
        }
        lastStatus = userStatus;
    }

})();