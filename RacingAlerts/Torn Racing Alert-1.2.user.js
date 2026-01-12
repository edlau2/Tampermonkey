// ==UserScript==
// @name         Torn Racing Alert
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Keep the racing icon active, to alert when not in a race
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @exclude      https://www.torn.com/recaptcha.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict'

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);
    const animatedIcons = GM_getValue("animatedIcons", true); // TRUE to flash the red icon

    const globeIcon = `<li class="icon71___NZ3NH"><a id="icon71-sidebar" href="#" tabindex="0" i-data="i_64_86_17_17"></a></li>`;
    const raceIconGreen =  `<li class="icon17___eeF6s"><a href="/loader.php?sid=racing" tabindex="0" i-data="i_37_86_17_17"></a></li>`;
    const raceIconRed  =`<li id="xedx-race-icon" class="icon18___wusPZ"><a href="/loader.php?sid=racing" tabindex="0" i-data="i_37_86_17_17"></a></li>`;

    function addStyles() {
        GM_addStyle(`
          .highlight-active {
              -webkit-animation: highlight-active 2s linear 0s infinite normal;
              animation: highlight-active 2s linear 0s infinite normal;
              scale: 2.0;
          }
      `);
    }

    function hasStockRaceIcons() {
        let result = $("[class^='icon18_']").length > 0 || $("[class^='icon17_']").length > 0;
        if ($("[class^='icon18_']").length > 0) {
            let iconClassRed = $($("[class^='icon18_']")[0]).attr("class");
            GM_setValue("iconClassRed", iconClassRed);
        }
        if ($("[class^='icon17_']").length > 0) {
            let iconClassGreen = $($("[class^='icon17_']")[0]).attr("class");
            GM_setValue("iconClassGreen", iconClassGreen);
        }
        return result;
    }

    var timer;
    function handlePageLoad() {
        let existingRaceIcon = $("#xedx-race-icon");
        let redIcon = $("[class^='icon18_']");
        if ($(redIcon).length > 0 && animatedIcons && !$(redIcon).parent().hasClass('highlight-active')) {
            $(redIcon).addClass('highlight-active');
        }

        if (abroad() || hasStockRaceIcons()) { // Remove if flying or stock icons there already
            if ($(existingRaceIcon).length) {
                $(existingRaceIcon).remove();
            }
            return;
        }

        if (existingRaceIcon) {
            if (animatedIcons && !$(existingRaceIcon).hasClass('highlight-active'))
                $(existingRaceIcon).addClass('highlight-active');
            return;
        }

        // Add our icon
        $('[class^="status-icons"]').append(raceIconRed);
        let iconClassRed = GM_getValue("iconClassRed", null);
        if (iconClassRed) $("#xedx-race-icon").attr("class", iconClassRed);
        if (animatedIcons) $("#xedx-race-icon").addClass('highlight-active');
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();
    addStyles();

    timer = setInterval(handlePageLoad, 5000);
    handlePageLoad();

})();


