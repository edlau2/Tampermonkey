// ==UserScript==
// @name         Torn Test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/points.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict'

    logScriptStart();

  $('.tt-points-value').mousedown (function() {
       setTimeout (function () {
           log('Setting .myPopups to "show" in one sec');
           $('.myPopups').show();
       }, 1000);});

  let iframe = $("body").prepend(
       "<div style='display: none; position: fixed; width:1000px; height:500px; top:200px; left:775px; z-index:999;'" +
       "class='myPopups'> <iframe id='pointspopup' style='width: 1000px; height: 500px;'" +
       "src='https://www.torn.com/points.php'> </iframe> </div>");

  if (window.top === window.self) {
      let res = $("#pointspopup").contents().find("body");
      log('res: ', res);
      $("#pointspopup").contents().find("body").hide();
  }


})();
