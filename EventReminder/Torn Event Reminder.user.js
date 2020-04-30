// ==UserScript==
// @name         Torn Event Reminder
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add an Event 'alarm clock' to all Torn pages
// @include      https://www.torn.com/*
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/EventReminder/Torn%20Event%20Reminder.user.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// The UI...

// Search span, uses jquery-ui ???
const selectBtnSpan =
      '<span>' +
          '<a class="ui-selectmenu ui-widget ui-state-default ui-selectmenu-dropdown ui-corner-all" id="search-type-button"' +
              ' role="button" href="#nogo" tabindex="0" aria-haspopup="true" aria-owns="search-type-menu" aria-disabled="false"' +
              ' style="width: 119px; display: inline-block;">' +
          '<span class="ui-selectmenu-status">Add an event...</span>' +
          '<span class="ui-selectmenu-icon ui-icon ui-icon-triangle-1-s"></span></a>' +
      '</span>';

const selectBtnSpan2 =
      '<select name="xedx-select" class="select-css" id="xedx-select">' +
              '<option value="Add">Add an event...</option>' +
              '<option value="Test1">Test 1</option>' +
              '<option value="Test2">Test 2</option>' +
          '</select>';

const add_event_div =
      '<div id="xedx-events-div" style="dispay=inline-block;">' +
          '<span id="xedx-add-event" class="header-bottom-text"><a href="#">&nbspAdd Event&nbsp</a></span>' +
          '<span id="xedx-events" class="event_text_style event_box_style">test</span>' +
          //'<span id="xedx-add-event" class="event_text_style event_box_style">&nbspUpcoming events:</span>' +
          '<span id="xedx-add-event" class="event_text_style event_box_style"></span>' +
          //'<select name="xedx-select" class="select-css event_text_style" id="xedx-select">' +
          /*
          '<select name="xedx-select" class="select-css" id="xedx-select">' +
              '<option value="Add">Add an event...</option>' +
              '<option value="Test1">Test 1</option>' +
              '<option value="Test2">Test 2</option>' +
          '</select>' +
          */
          selectBtnSpan2 +
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

// Get rid of default 'select' style, make our own.
const selectStyle = `.select-css {
	color: #444;
	line-height: 1.3;
	width: 100px;
    margin-top: 7px;
	box-sizing: border-box;
	border: 1px solid gray; //#aaa;
	box-shadow: 0 1px 0 1px rgba(0,0,0,.04);
	border-radius: .5em;
	-moz-appearance: none;
	-webkit-appearance: none;
	appearance: none;
	background-color: #fff;
	background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'),
	  linear-gradient(to bottom, #ffffff 0%,#e5e5e5 100%);
	background-repeat: no-repeat, repeat;
	background-position: right .7em top 50%, 0 0;
	background-size: .65em auto, 100%;
}
.select-css::-ms-expand {
	display: none;
}
.select-css:hover {
	border-color: #888;
}
.select-css:focus {
	border-color: #aaa;
	box-shadow: 0 0 1px 3px rgba(59, 153, 252, .7);
	box-shadow: 0 0 0 3px -moz-mac-focusring;
	color: #222;
	outline: none;
}
.select-css option {
	font-size: 12pt;
    font-weight: bold;
    font-color: white;
}`;

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
    GM_addStyle(selectStyle);

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

    // Handlers for the 'Select' menu
    let select = document.getElementById('xedx-select');
    $(select).change(function() {
        alert('Hi!');
    });

    // Start the clock ticking...
    setInterval(updateTime, 1000); // Update every second, just the clock
    updateTime(); // And set it first - erase 'TEST TEST TEST' :-)

    // Test to see if travelling, use on other pages
    let country = currentCountry();
    let areTravelling = areTravelling();

    console.log('Travelling = ' + (areTravelling ? 'true' : 'false') + ' Country = "' + country + '"');

})();


