// ==UserScript==
// @name         Torn Tab Titles
// @namespace    http://tampermonkey.net/
// @version      1.6
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

    const apiKey = 'Your API key here';

    const params = new URLSearchParams(window.location.search);
    const userID = params.get('user2ID');
    const opts = {attributes: false, childList: true, subtree: true};
    const targetNode = $("title")[0];
    const fixTab = function (node, name) {
        $(targetNode).text($(node).text()
                           .replace('Attack', 'A')
                           .replace(userID, name)
                           .replace("TORN", name));}
    const apiURL = `https://api.torn.com/v2/user?selections=basic&id=${userID}&key=${apiKey}`;
    var name = userID;

    $.ajax({
            url: apiURL, type: 'GET',
            success: function (response, status, xhr) {
                if (response) name = response.name;
                fixTab(targetNode, name);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.error("Error in API request/response!");
            }
        });

    fixTab(targetNode, name);

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            fixTab(mutation.target, name);
            observer.disconnect();
        });
    });

    observer.observe(targetNode, opts);

})();