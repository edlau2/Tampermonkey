// ==UserScript==
// @name         Torn Event Reminder
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add an Event 'alarm clock' to all Torn pages
// @include      https://www.torn.com/*
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/EventReminder/Torn%20Event%20Reminder.user.js
//
// replace these with URL's when done testing!!!
// @require      file:////Users/edlau/Documents/Tampermonkey Scripts/EventReminder/Torn-Event-Reminder-CSS.js
// @resource     datetimepickerCSS file:////Users/edlau/Documents/JQuery/DateTimePicker/jquery.datetimepicker.min.css
//
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_getResourceText
// @grant        unsafeWindow
// ==/UserScript==

// Don't thhink I need these...
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js

// The UI...
const selectBtnSpan =
      '<select name="xedx-select" class="custom-select select-selected" id="xedx-select">' +
              // The width will auto-expand to the widest event. How about to current?
              '<option value="next">Upcoming...</option>' +
              '<option value="second">Next Event really long wut wut wut?</option>' +
              '<option value="third">Event 3</option>' +
          '</select>';

const add_event_div =
      '<div id="xedx-events-div" style="dispay=inline-block;">' +
          '<span id="xedx-add-event" class="header-bottom-text"><a href="#">&nbspAdd Event&nbsp</a></span>' +
          '<span id="xedx-events" class="event_text_style event_box_style">test</span>' +
          '<span id="xedx-add-event" class="event_text_style event_box_style"></span>' +
          selectBtnSpan +
      '</div>';

// Note: the classes used in the above are contained in the file
// 'Torn-Event-Reminder-CSS.js', @require'd above. That file
// assigns the CSS to const's, to be directly loaded (added)
// via GM_addStyle.
//
// The datetimepicker is a plugin, and is @resource'd in; it is
// distributed as a .css file so requires that the resource be
// loaded via GM_getResourceText (...) and GM_addStyle(...)


(function() {
    'use strict';

    logScriptStart();

    // Inline helper functions
    const format = (date) => date.toISOString().slice(11, 19);
    const display = (date = new Date()) => format(date) + ' TCT';
    const updateTime = () => target.textContent = display();

    // Out custom CSS, saved as .js - variables are already assigned.
    GM_addStyle(eventTextStyle);
    GM_addStyle(eventBoxStyle);
    GM_addStyle(eventBtnStyle);
    GM_addStyle(customSelect);

    // CSS for the datetimepicker class
    var newCSS = GM_getResourceText ("datetimepickerCSS");
    GM_addStyle (newCSS);

    const parent = $('div.header-wrapper-bottom');

    // Remove the 'time' element (well, hide it) - make separate fn
    // This may be installed by the 'Add Time' script, by Mist3rM [2154120] & hannes3510 [2150804]
    // Never tested with that script running after this one.
    let timeNode = $(parent).find('time').get();
    if (timeNode.length > 0) {$(timeNode).attr('style', 'display:none');}

    // Add our custom event div
    $(parent).append(add_event_div);
    const target = document.getElementById('xedx-events');

    // Add fake button handler, for the "Add Event" button,
    // which isn't really a button. But who cares.
    $("#xedx-add-event").click(function(){
        alert('I got a click');
    });

    // Start the clock ticking...
    setInterval(updateTime, 1000); // Update every second, just the clock
    updateTime(); // And set it first - erase 'TEST TEST TEST' :-)

    // ****** Set up the custom 'select' ******

    // Dynamically resize the select
    $('.custom-select').change(function(){
        var text = $(this).find('option:selected').text()
        var $aux = $('<select/>').append($('<option/>').text(text))
        $(this).after($aux)
        $(this).width($aux.width())
        $aux.remove()
    }).change()

    // Set the selected event to the first one, by index, 0-based.
    $('.custom-select').prop('selectedIndex', 0);

    // Handlers for the 'Select' menu. Must be added *after* we select what is chosen (?)
    let select = document.getElementById('xedx-select');
    $(select).change(function() {
        alert($('#xedx-select').val());
    });

    // Set up timers for upcoming events (TBD)


})();


