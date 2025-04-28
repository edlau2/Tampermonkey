// ==UserScript==
// @name         Torn Tab Titles
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Makes names on attack page tabs easier to see
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=attack*
// @match        https://www.torn.com/loader2.php?sid=attack*
// @match        https://www.torn.com/loader2.php?sid=getInAttack*
// @run-at       document-end
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    const opts = {attributes: false, childList: true, subtree: true};
    const targetNode = $("title")[0];
    const fixTab = function (node) {$(targetNode).text($(node).text().replace('Attack', 'A'));}

    fixTab(targetNode);

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            fixTab(mutation.target);
            observer.disconnect();
        });
    });

    observer.observe(targetNode, opts);

})();