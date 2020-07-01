// ==UserScript==
// @name         Torn Faction Profile Onliners Only
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Display only online fac members on fac page
// @author       xedx [2100735]
// @include      *.torn.com/factions.php?step=profile&ID=*
// ==/UserScript==

(function() {
    'use strict';
    let members = $('ul.member-list > li');
    for (let i=0; i < members.length; i++) {
        let element = members[i]; // an <li>

        // Note: we seem to find underneath the element, more than one of these often
        // Hence the funny check below.
        let icon1 = $(element).find('[id^=icon1]').get(); // Online
        let icon2 = $(element).find('[id^=icon2]').get(); // Offline
        let icon62 = $(element).find('[id^=icon62]').get(); // Idle

        //console.log('li=' + i + ' icon1:' + icon1.length + ' icon2:' + icon2.length + ' icon62:' + icon62.length);

        if ((icon1.length > 0 && icon2.length != 2) || icon62.length == 1) { // Online or idle, leave alone
            //console.log('li #' + i + ' continuing');
            continue;
        }

        // Otherwise hide
        element.style.display = 'none';
    }

})();