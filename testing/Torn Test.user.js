// ==UserScript==
// @name         Torn Test
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       xedx [2100735]
// @match        https://www.torn.com/*
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
    'use strict';

    // What I really do, in practice:
    let result =
        `<div class="sortable-box t-blue-cont h" id="xedx-carorder">
        <div class="title main-title title-black border-round" role="table" aria-level="5" id="xedx-hdr-div">
            <div class="arrow-wrap sortable-list" id="xedx-arrow">
                <a role="button" href="#/" class="accordion-header-arrow right" i-data="i_946_369_9_14"></a>
            </div>Car Order
        </div>
        <div class="bottom-round xedx-body" id="xedx-body-div" style="display: none;">
            <div id="xedx-content-div" class="cont-gray bottom-round" style="background-color: #ddd;">
                <span style="display: block; overflow: hidden; padding: 5px 10px;">
                    <span class="btn-wrap silver">
                        <span class="xedx-btn" style="padding: 5px 10px;">
                            <button style="width: 108px;" id="xedx-save-btn">Save</button>
                        </span>
                    </span>
                    <span class="btn-wrap silver">
                        <span class="xedx-btn" style="padding: 5px 10px;">
                            <button style="width: 108px;" id="xedx-restore-btn">Restore</button>
                        </span>
                    </span>
                    <span>
                        <label class="xedx-label">
                        <input type="checkbox" class="xedx-chkbox" id="xedx-chkbox1">Load Saved Order at Startup
                        </label>
                    </span>
                </span>
                <span style="display: block; overflow: hidden; padding: 5px 10px;">
                    <span class="btn-wrap silver">
                        <span class="xedx-btn" style="padding: 5px 10px;">
                            <button style="width: 108px;" id="xedx-default-btn">Defaults</button>
                        </span>
                    </span>
                    <span class="btn-wrap silver">
                        <span class="xedx-btn" style="padding: 5px 10px;">
                            <button style="width: 108px;" id="xedx-help-btn">Help</button>
                        </span>
                    </span>
                </span>
            </div>
        </div>
        <hr class="delimiter-999 m-top10 m-bottom10">
    </div>`;

    // Note in this one - 'id' is *inside* the style attribute. Messing up everything.
    let div1 = "<div style=' display: none ; position:fixed ; width:1000px ; height:500px ; top:200px ; left:775px ; z-index:999 ;" +
               "' class='myPopups' > <iframe style=' id='pointspopup'; width: 100%;height: 100%;' src='https://www.torn.com/points.php'>" +
               " </iframe> </div> ";

    // Fixed, using back ticks.
    let div2 = `<div style=' display: none ; position:fixed ; width:1000px ; height:500px ; top:200px ; left:775px ; z-index:999 ;
               ' class='myPopups' > <iframe id='poinstpopup' style='width: 100%;height: 100%;' src='https://www.torn.com/points.php'>
               </iframe> </div>`;

    // Fixed, backticks and double quotes
    let div3 = `<div style="display: none ; position:fixed ; width:1000px ; height:500px ; top:200px ; left:775px ; z-index:999 ;
               " class="myPopups" > <iframe id="pointspopup" style="width: 100%;height: 100%;" src="https://www.torn.com/points.php">
               </iframe> </div>`;

    // Fixed without back ticks, need line continuation.
    let div4 = '<div style="display: none ; position:fixed ; width:1000px ; height:500px ; top:200px ; left:775px ; z-index:999 ;"' +
               ' class="myPopups" > <iframe id="pointspopup" style="width: 100%;height: 100%;" src="https://www.torn.com/points.php">' +
               '</iframe> </div>';

    let iframe = $("body").prepend(div4); // or div2 or div3
})();
