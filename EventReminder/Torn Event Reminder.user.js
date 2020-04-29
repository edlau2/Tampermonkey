// ==UserScript==
// @name         Torn Event Reminder
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add an Event 'alarm clock' to all Torn pages
// @include      https://www.torn.com/*
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// The UI...
const add_event_div =
      '<div id="xedx-events-div" style="dispay=inline-block;">' +
          '<span id="xedx-add-event" class="header-bottom-text event-btn-style"><a href="#">&nbspAdd Event&nbsp</a></span>' +
          '<span id="xedx-events" class="event_text_style event_box_style">TEST TEST TEST</span>' +
          '<span id="xedx-add-event" class="event_text_style event_box_style">&nbspUpcoming events:</span>' +
      '</div>';

// CSS styles I may or may not use in above <div>'s
const eventTextStyle = '.event_text_style {' +
		'padding: 0 20px;' +
        'display: flex;' +
        'justify-content: center;' +
        'align-items: center;' +
        'width: 100%' +
        'font-size: 12pt;' +
        'font-weight: bold;' +
        'font-color: white;' +
	'}';


const eventBtnStyle = '.event-btn-style {' +
      //'background: lightgray;' +
      'border-width: 3px;' +
      'border-style: inset;' +
      'border-color: gray;' +
      'border-radius: 5px;' +
      '}';

const eventBoxStyle = '.event_box_style{' +
        'float: left;' +
        'font-weight: 600;' +
        'line-height: 30px;' +
        'overflow: hidden;' +
        'max-height: 30px;' +
        'box-sizing: border-box;' +
	'}';

// Just this entry point
(function() {
    'use strict';

    logScriptStart();

    // Inline helper functions
    const format = (date) => date.toISOString().slice(11, 19);
    const display = (date = new Date()) => format(date) + ' TCT';
    const updateTime = () => target.textContent = display();

    GM_addStyle(eventTextStyle);
    GM_addStyle(eventBoxStyle);
    GM_addStyle(eventBtnStyle);

    const parent = $('div.header-wrapper-bottom');

    // Remove the 'time' element (well, hide it) - make separate fn
    let timeNode = $(parent).find('time').get();
    if (timeNode.length > 0) {$(timeNode).attr('style', 'display:none');}

    // Add our custom event div
    $(parent).append(add_event_div);
    const target = document.getElementById('xedx-events');

    // Add fake button handler
    $("#xedx-add-event").click(function(){
        alert('I got a click');
    });

    setInterval(updateTime, 1000); // Update every second, just the clock
    updateTime(); // And set it first - erase 'TEST TEST TEST' :-)

})();


