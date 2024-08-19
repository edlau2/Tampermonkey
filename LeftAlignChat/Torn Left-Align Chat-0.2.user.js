// ==UserScript==
// @name         Torn Left-Align Chat
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Align chat boxes and icons to the left of the screen
// @author       xedx [2100735]
// @match        https://www.torn.com/index.php*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @run-at       document-start
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.43.js
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
    'use strict';

    // set this to 'true' to just go ahead and left align, no button.
    const autoAlign = true;

    const myButton = `<span><input id="alignLeft" type="submit" class="xal xedx-torn-btn" value="left"></span>`;

    function installReloadBtn() {
        if (autoAlign) {
            $("[class*='chat-setting-button_']").on('contextmenu', btnClickHandler);
        } else {
            $("#skip-to-content").append(myButton);
            $("#alignLeft").on('click', btnClickHandler );
        }
    }

    function btnClickHandler(e) {
        let chat = $("[class^='chat-app__chat-list-chat-box-wrapper__']");
        if (!$(chat).length) {
            return setTimeout(btnClickHandler, 100);
        }

        if ($(chat).hasClass("xleft0"))
            $(chat).removeClass("xleft0");
        else
            $(chat).addClass("xleft0");

        let minIcons = $("[class^='group-minimized-chat-box_']");
        if ($(minIcons).hasClass("flexRowStart")) {
            $("#alignLeft").val("left");
            $(minIcons).removeClass("flexRowStart").addClass("flexRowEnd");
            $(minIcons).prependTo($(minIcons).parent());
        }
        else {
            $("#alignLeft").val("right");
            $(minIcons).removeClass("flexRowEnd").addClass("flexRowStart");
            $(minIcons).appendTo($(minIcons).parent());
        }

        return false;
    }

    function loadStyles() {
        addTornButtonExStyles();
        GM_addStyle(`
            .xal {
                margin-left: 15px;
                margin-top: 0px;
                height: 26px;
            }
            .xleft0 {
                left: 0;
            }
            .flexRowEnd {
                flex-direction: row-end;
            }
            .flexRowStart {
                flex-direction: row !important;
            }
        `);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();
    loadStyles();

    if (autoAlign)
        btnClickHandler();

    callOnContentLoaded(installReloadBtn);

})();