// ==UserScript==
// @name         Torn Black Background
// @namespace    http://tampermonkey.net/
// @version      1.3
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

    var userStatus = "ok";
    var lastStatus = "ok";

    // var userData = JSON.parse(sessionStorage.getItem('headerData'));
    // if (userData && userData.user && userData.user.state)
    //     userStatus = userData.user.state.status;

    checkHosp(true);
    console.log("[Torn Black Background] status: ", userStatus);

//     console.log("[Torn Black Background] userData: ", userData);
//     console.log("[Torn Black Background] status: ", (userData ? (userData.user ? (userData.user.state ? userData.user.state.status :'no state') : 'no user') : 'no data'));

    $("#body").css("background", ((userStatus == 'ok') ? "#000" : "#444"));
    setInterval(checkHosp, 1000);

    function checkHosp(checkOnly=false) {
        let icons, hosp;
        let key = Object.keys(sessionStorage).find(key => /sidebarData\d+/.test(key));
        let data = JSON.parse(sessionStorage.getItem(key)); //getSidebarData();
        if (data) icons = data.statusIcons ? data.statusIcons.icons : null;
        if (!icons) {
            console.log("[Torn Black Background] Error: amIinHosp didn't find icons! data: ", data);
            return;
        }
        hosp = icons ? icons.hospital : null;
        userStatus = hosp ? "hosp" : "ok";
        console.log("[Torn Black Background] userStatus: ", userStatus, " prev: ", lastStatus);
        if (checkOnly == true) {
            lastStatus = userStatus;
            return;
        }
        if (userStatus != lastStatus) {
            $("#body").css("background", ((userStatus == 'ok') ? "#000" : "#444"));
        }
        lastStatus = userStatus;
    }

    function updateStatus() {
        var userData = JSON.parse(sessionStorage.getItem('headerData'));
        if (userData && userData.user && userData.user.state)
            userStatus = userData.user.state.status;

        if (userStatus && lastStatus && userStatus != lastStatus) {
            console.log("[Torn Black Background] update: ", userStatus, lastStatus);
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