// ==UserScript==
// @name         Torn Forum Resizer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  This script resizes the "New Thread" post window
// @author       xedx [2100735]
// @match        https://www.torn.com/forums.php*
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    const formHeight = '440px';
    const editorHeight = '360px';
    const contentHeight = '340px';

    GM_addStyle(`

        #editor-wrapper {min-height: ${formHeight}; }
        .editorRoot { min-height: ${formHeight}; }
        .forums-create-new .editorRoot { min-height: ${formHeight} !important; }
        [class*='editorRoot_ '] { min-height: ${formHeight}; }

        #editor-form { min-height: ${editorHeight}; }
        [class^='editorContentWrapper_'] { min-height: ${editorHeight}; }

        .editor-content { min-height: ${contentHeight} !important; }
        [class*='editorContent'] { min-height: ${contentHeight} !important; }

    `);

})();
