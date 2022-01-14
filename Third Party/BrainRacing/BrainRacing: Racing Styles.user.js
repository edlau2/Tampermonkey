// ==UserScript==
// @name         BrainRacing: Racing Styles
// @namespace    brainslug.torn.racing
// @version      0.2
// @description  Pull you to the top so you don't have to go looking for your position in big races
//               and shows the full height driver panel nothing more nothing less
// @author       Brainslug [2323221]
// @match        https://www.torn.com/loader.php?sid=racing*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @updateURL    https://raw.githubusercontent.com/br41nslug/torn-brainscripts/main/scripts/racing-always-on-top.user.js
// @grant        GM_addStyle
// ==/UserScript==

const user_id = document.cookie.match('(^|;)\\s*uid\\s*=\\s*([^;]+)')?.pop() || '';
GM_addStyle(`
.d .racing-main-wrap .car-selected-wrap #drivers-scrollbar#drivers-scrollbar {
    max-height: 328px!important;
}
`);

/*
.d .racing-main-wrap .car-selected-wrap #drivers-scrollbar#drivers-scrollbar {
    max-height: fit-content!important;
}
*/

GM_addStyle(`
#leaderBoard {
  padding-top: 32px;
  position: relative;
}
#lbr-${user_id} {
  position: absolute;
  width: 100%;
  top: 0;
}
`);
