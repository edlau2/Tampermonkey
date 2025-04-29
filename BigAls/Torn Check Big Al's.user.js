// ==UserScript==
// @name         Torn Check Big Al's
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Check Big Al's for camera status
// @author       xedx [2100735]
// @run-at       document-end
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    console.log("Torn Check Big Al's script started");

    const alertInterval = 3 * 60; // seconds between when you can be alerted. Should apply accross tabs.

    const rfcv = getRfcv();
    const crimesURL = `https://www.torn.com/page.php?sid=crimesData&step=crimesList&rfcv=${rfcv}`;
    var intTimer = setInterval(queryShoplifting, 30000);

    function doAlert() {
        let lastAlert = GM_getValue("lastAlert", null);
        let now = new Date().getTime() / 1000;
        if (lastAlert) {
            let diff = now - +lastAlert;
            if (diff < alertInterval) return;
        }

        console.log("Big Al's doing alert");
        GM_setValue("lastAlert", now);
        GM_notification({
            text: "Cameras down at Big Al's!",
            title: "Shoplifting Alert",
            image: 'https://imgur.com/QgEtwu3.png',
            timeout: 30000});
    }

    function processResponse(response, status, xhr) {
        if (!response || !response.DB || !response.DB.crimesByType[7]) {
            //console.error("Torn Check Big Al's: Bad response: ", response);
            return setTimeout(queryShoplifting, 3 * 60 * 1000);
        }
        let crime = response.DB.crimesByType[7];
        let info = crime.additionalInfo;
        let effects = info ? info.statusEffects : null;
        if (!effects) {
            //console.error("Torn Check Big Al's: Error: bad response! ", response);
            clearInterval(intTimer);
            intTimer = null;
            return setTimeout(queryShoplifting, 3 * 60 * 1000);
        }
        console.log("Big Al's: effects: ", effects[0], effects[1]);
        if (effects[0].disabled == true) {
            doAlert();

            // Option? For overnight tets, leave on...
            //clearInterval(intTimer);
        }
        if (!intTimer) {
            intTimer = setInterval(queryShoplifting, 30000);
        }
    }

    function queryShoplifting() {
        $.ajax({
            url: crimesURL, type: 'POST', data: { sid: 'crimesData', step: 'crimesList', rfcv: rfcv, typeID: 4 },
            success: function (response, status, xhr) {
                processResponse(response, status, xhr);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                //console.error("Torn Check Big Al's: Error: ", textStatus, errorThrown, jqXHR);
            }
        });
    }

    function getRfcv() {
        let name = "rfc_id=";
        let ca = document.cookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    queryShoplifting();

})();