// ==UserScript==
// @name         Torn Racing Alert
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Keep the racing icon active, to alert when not in a race
// @author       xedx [2100735]
// @match        https://www.torn.com/*
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
    'use strict'

    debugLoggingEnabled = true; // TRUE to log 'debug()' calls
    const animatedIcons = true; // TRUE to flash the red icon

    const globeIcon = `<li class="icon71___NZ3NH"><a id="icon71-sidebar" href="#" tabindex="0" i-data="i_64_86_17_17"></a></li>`;
    const raceIconGreen =  `<li class="icon17___eeF6s"><a href="/loader.php?sid=racing" tabindex="0" i-data="i_37_86_17_17"></a></li>`;
    const raceIconRed  =`<li id="xedx-race-icon" class="icon18___wusPZ"><a href="/loader.php?sid=racing" tabindex="0" i-data="i_37_86_17_17"></a></li>`;

    function addStyles() {
        GM_addStyle(`.highlight-active {
          -webkit-animation: highlight-active 1s linear 0s infinite normal;
          animation: highlight-active 1s linear 0s infinite normal;
        }`);
    }

    function hasStockRaceIcons() {
        let result = document.getElementById("icon18-sidebar") || document.getElementById("icon17-sidebar");
        debug('[hasStockRaceIcons] result: ', result);
        debug('Icon 17: ', document.getElementById("icon17-sidebar"));
        debug('Icon 18: ', document.getElementById("icon18-sidebar"));
        return result;
    }

    function handlePageLoad() {
        let existingRaceIcon = document.getElementById("xedx-race-icon");
        debug('[handlePageLoad] existingRaceIcon: ', existingRaceIcon);

        let redIcon = document.getElementById("icon18-sidebar");
        if (redIcon && animatedIcons && !$(redIcon.parentNode).hasClass('highlight-active')) {
            debug('Adding the "highlight-active" class to existing icon"');
            $(redIcon.parentNode).addClass('highlight-active');
        }

        if (abroad() || hasStockRaceIcons()) { // Remove if flying or stock icons there already
            if (debugLoggingEnabled) {
                debug('Either abroad, or has stock race icons - removing race alert icon');
                debug('Abroad: ', abroad());
                debug('Stock icons: ', hasStockRaceIcons());
            }
            if (existingRaceIcon) {
                debug('Removing icon!');
                $(existingRaceIcon).remove();
            }
            return;
        }

        if (existingRaceIcon) { // Style sometimes gets removed...not sure why. Test: used to have dup ID's!
            debug('Class: ', $("#xedx-race-icon").attr('class'));
            if (animatedIcons && !$(existingRaceIcon).hasClass('highlight-active')) $(existingRaceIcon).addClass('highlight-active');
            if (debugLoggingEnabled) {
                debug('Icon exists, returning');
                debug('existing icon: ', document.getElementById("xedx-race-icon"));
            }
            return;
        }

        let iconArea = document.querySelector("#sidebar > div:nth-child(1) > div > div.user-information___DUwZf > div > div > div > div:nth-child(1) > ul");

        // TBD: possibly add sidebar link.
        // let sidebarContent = document.querySelector("#sidebar > div:nth-child(3) > div > div > div > div");

        // Add our icon
        $(iconArea).append(raceIconRed);
        existingRaceIcon = document.getElementById("xedx-race-icon");
        if (animatedIcons) $(existingRaceIcon).addClass('highlight-active');
        log('Race icon appended!');
        debug('Icon: ', existingRaceIcon);
        debug('Class: ', $("#xedx-race-icon").attr('class'));
        setTimeout(handlePageLoad, 5000); // Style sometimes gets removed...not sure why. This will re-add it.
                                          //  Test: used to have dup ID's! May  not need anymore....
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();
    addStyles();

    setInterval(handlePageLoad, 15000);
    callOnContentLoaded(handlePageLoad);

})();
