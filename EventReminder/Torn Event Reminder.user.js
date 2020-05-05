// ==UserScript==
// @name         Torn Event Reminder
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  Add an Event 'alarm clock' to all Torn pages
// @include      https://www.torn.com/*
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/EventReminder/Torn%20Event%20Reminder.user.js
//
// Replace these with URL's when done testing!!! (the UNUSED ones are the local ones - swap as needed)
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/EventReminder/Torn-Event-Reminder-CSS.js
// UNUSED @require      file:////Users/edlau/Documents/Tampermonkey Scripts/EventReminder/Torn-Event-Reminder-CSS.js
//
// @resource     datetimepickerCSS https://raw.githubusercontent.com/edlau2/Tampermonkey/master/DateTimePicker/jquery.datetimepicker.min.css
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/DateTimePicker/jquery.datetimepicker.full.min.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_getResourceText
// @grant        unsafeWindow
// ==/UserScript==

// Usage: Use the 'Add Event' button to add an event, enter the name (brief description)
// and time from the date picker. The date picker and display time are currently in local
// time. Once selected, the event is added to the dropdown, which is kept in order of
// coming up events. At 10 minutes before the event is due, the event will slowly flash
// yellow, at 5 minutes before, orange, and 2 minutes, red, and finally at 30 seconds before,
// a more rapid red flashing. Once expired, it will continue to flash for another 30
// seconds before finally being removed.

// The UI...
const selectBtnSpan =
      '<span>' +
          '<select name="xedx-select" class="custom-select select-selected" id="xedx-select">' +
              //'<option value="0"  time="0" title="test">No upcoming events...</option>' +
          '</select>' +
          '<span id="xedx-remove-event" class="close-icon" style="margin-left:5px"></span>' +
      '</span>';

// header at the top of the screen, that contains the above select.
const add_event_div =
      '<div id="xedx-events-div" style="dispay=inline-block;">' +
          '<span id="xedx-add-event" class="header-bottom-text"><a href="#">&nbsp&nbspAdd Event&nbsp</a></span>' +
          '<span id="xedx-events" class="event_text_style event_box_style">test</span>' +
          selectBtnSpan +
          //infoDiv +
      '</div>';

// Currently unused...
const noEventsOpt = '<option value="0" time="0" title="test">No upcoming events...</option>';

const infoDiv =
      '<div id="myModal" class="modal">' +
          '<span class="modal-text">' +
              '<p>Some long text, maybe explaing what, when, where, how and why this is here.<br><br>Maybe time left, other details.....</p>' +
          '</span>' +
      '</div>';

// Note: the classes used in the above are contained in the file
// 'Torn-Event-Reminder-CSS.js', @require'd above. That file
// assigns the CSS to const's, to be directly loaded (added)
// via GM_addStyle.
//
// The datetimepicker is a plugin, and is @resource'd in; it is
// distributed as a .css file so requires that the resource be
// loaded via GM_getResourceText (...) and GM_addStyle(...)
// See: https://xdsoft.net/jqplugins/datetimepicker/

// Array and helpers to store saved events. See the section
// 'Functions to manage saving, restoring, deleting events'
// for details about how used. These must be declared first,
// otherwise might not yet be defined in callbacks.
const eventPrefix = 'xedx-event-';
const keyFromValue = (value) => eventPrefix + value;
var eventArray = [];

// Force the width of the 'select' to that of the displayed text.
function autoSizeSelect(elem) {
    var text = $(elem).find('option:selected').text()
    if (text.length == 0) { // No text to match to...
        $(elem).width(60);
        return;
    }
    var $aux = $('<select/>').append($('<option/>').text(text))
    $(elem).after($aux)
    $(elem).width($aux.width())
    $aux.remove()
}

// Function to keep the dropdown list ordered,
// based on the timestamp.
function sortCustomSelect() {
    $('.custom-select').children("option").sort(function(a, b) {
        let x = $(a).attr('time');
        let y = $(b).attr('time');
        //return (x < y) ? -1 : (x > y) ? 1 : 0;
        return (x > y) ? -1 : (x < y) ? 1 : 0;
    }).appendTo($('.custom-select'));
}

// Time constants - minutes in ms
const ten_minutes = 10 * 60 * 1000;
const five_minutes = 5 * 60 * 1000;
const two_minutes = 2 * 60 * 1000;
const thirty_seconds = 30 * 1000;

// Entry point. Set up the UI and timer for clock.
(function() {
    'use strict';

    logScriptStart();

    // Inline helper functions to keep the clock ticking
    const format = (date) => date.toISOString().slice(11, 19);
    const display = (date = new Date()) => format(date) + ' TCT';
    const updateTime = () => target.textContent = display();

    // CSS for the datetimepicker class
    var newCSS = GM_getResourceText ("datetimepickerCSS");
    GM_addStyle (newCSS);

    const parent = $('div.header-wrapper-bottom');

    // Remove the 'time' element (well, hide it) - make separate fn
    // This may be installed by the 'Add Time' script, by Mist3rM [2154120] & hannes3510 [2150804]
    // Never tested with that script running *after* this one. That's where inspiration for the
    // clock itself came from.
    let timeNode = $(parent).find('time').get();
    if (timeNode.length > 0) {$(timeNode).remove();}

    // Add our custom event reminder div
    $(parent).append(add_event_div);
    const target = document.getElementById('xedx-events');

    // Build empty div for 'Add Event' dialog.
    let configDiv = document.getElementById('add-event-dlg');
    if (!validPointer(configDiv)) { // Only do once!
        insertAddEventDialogDiv();
    }

    // ****** UI is now available, can configure now ****** //

    // Add fake button handler, for the "Add Event" button,
    // which isn't really a button. But who cares.
    $("#xedx-add-event").click(function(){launchAddEventDlg();});

    // Start the clock ticking...
    setInterval(updateTime, 1000); // Update every second, just the clock
    updateTime();

    // ****** Set up the custom 'select' ****** //

    $('.custom-select').change(function(){
        autoSizeSelect(this);
        setEventTimer();
    }).change()

    // Set the selected event to the first one, by index, 0-based.
    $('.custom-select').prop('selectedIndex', 0);

    // Mouse-over events - the idea is to create hover-over info dialogs, like tool-tips.
    // This works but needs clean-up. Not pretty yet, need to tweak the CSS
    /*
    let mySelect = document.getElementById('xedx-select');
    mySelect.addEventListener('mouseenter', function(e) {
        // Display details about event here.
        let modal = document.getElementById("myModal");
        modal.style.display = "block";
        console.log(GM_info.script.name + ' Event: "' + e.type + '" Text: "' + e.currentTarget.innerText + '" Value: "' + e.currentTarget.value + '"');
    }, false);

    mySelect.addEventListener('mouseleave', function(e) {
        // Close the info dialog.
        let modal = document.getElementById("myModal");
        modal.style.display = "none";
        console.log(GM_info.script.name + ' Event: "' + e.type + '" Text: "' + e.currentTarget.innerText + '" Value: "' + e.currentTarget.value + '"');
    }, false);
    */

    // Handler for the 'close-icon', the 'X' to the right of select
    // Removes the 'active' option in the select
    let remBtn = document.getElementById('xedx-remove-event');
    $(remBtn).click(function(){removeSelectedEvent();});

    // Load saved events from storage
    loadSavedEvents();

    // Set up timers for any saved upcoming events
    setEventTimer();

    //$('#datetimepicker').change(function() {
    //    debugger;});
})();

///////////////////////////////////////////////////
// Functions/handlers for the 'Add Event' page
///////////////////////////////////////////////////

// Handler for the 'Add Event' OK button
function btnOnOkClick() {
    let count = $('#xedx-select option').length; // 'count' is index into the options list - also the 'value'
    let desc = $('#event-name').val(); // Desciption
    let date = $('#datetimepicker').val(); // Formatted date
    let timestamp = timestampFromDate(date); // Time in ms, used for sorting and setting alarms

    $('.custom-select').prop('selectedIndex', count);

    // Save it in our array and storage
    addSavedEvent(new savedEvent(count, timestamp, desc, date));

    // Debugging
    let target = $(".custom-select option:selected");
    let currTime = new Date().getTime();
    let expTime = $(target).attr('time');

    // expTime forced to 'now', if close to currTime - assumes 'now' is in the past?
    // ex: 7:00 AM GMT, 4:00 EST. Set for 4:15, assumes < 7:00, sets to 4:00... (minus a few ms)

    try {
        console.log(GM_info.script.name + ' OnOK - CurrTime: ' + new Date(parseInt(currTime)));
        console.log(GM_info.script.name + ' OnOK - ExpTime: ' + new Date(parseInt(timestamp)));
    } catch (e) {
        console.log(e);
    }
    // End debugging

    clearTimers();
    sortCustomSelect();
    autoSizeSelect($('.custom-select'));
    $('#datetimepicker').datetimepicker('hide'); // ??? Seems to prevent the date picker from popping up again.
    setEventTimer();
}

// Currently unused.
function addNullEvent() {
    $('.custom-select').append(noEventsOpt);
    autoSizeSelect($('.custom-select'));
}

///////////////////////////////////////////////////////////////////
// Functions to manage the actual alarms themselves
///////////////////////////////////////////////////////////////////

// The events are ordered, so we only need a trigger on the currently displayed one.
var currentTimer = null;
function setEventTimer() {
    let target = $(".custom-select option:selected");
    let currTime = new Date().getTime();
    let expTime = $(target).attr('time');
    let when = expTime - currTime;

    clearTimers();

    // Decide what timer to set - 10 minute, 5 minute, or 2 minute.
    if (when > ten_minutes) {
        console.log(GM_info.script.name + ' Setting 10 minute timer');
        currentTimer = executeAt(expTime-ten_minutes, tenMinuteTimer);
        return;
    } else if (ten_minutes >= when && when > five_minutes) {
        $('.custom-select').addClass('fade-yellow');
        console.log(GM_info.script.name + ' Setting 5 minute timer');
        currentTimer = executeAt(expTime-five_minutes, fiveMinuteTimer);
        return;
    } else if (five_minutes >= when && when > two_minutes) {
        $('.custom-select').addClass('fade-orange');
        console.log(GM_info.script.name + ' Setting 2 minute timer');
        currentTimer = executeAt(expTime-two_minutes, twoMinuteTimer);
        return;
    } else if (two_minutes >= when && when > thirty_seconds) {
        $('.custom-select').addClass('fade-red');
        console.log(GM_info.script.name + ' Setting Really Soon timer');
        currentTimer = executeAt(expTime-thirty_seconds, reallySoonTimer);
        return;
    } else if (thirty_seconds > when && when > 0 && expTime > currTime) {
        $('.custom-select').addClass('rapid-red');
        console.log(GM_info.script.name + ' Setting Really Soon timer');
        currentTimer = executeAt(expTime, reallySoonTimer);
        return;
    }

    clearTimers();

    // Debugging
    console.log(GM_info.script.name + ' setEventTimer Didn`t set any timers!!');
    console.log(GM_info.script.name + ' setEventTimer - currTime: ' + new Date(parseInt(currTime)));

    try {
        let date = $('#datetimepicker').val(); // Formatted date
        if (date != '') {
            let timestamp = timestampFromDate(date);
            console.log(GM_info.script.name + ' setEventTimer - timestamp: ' + new Date(parseInt(timestamp)));
        }
        if (typeof expTime != 'undefined') {
            console.log(GM_info.script.name + ' setEventTimer - expTime: ' + new Date(parseInt(expTime)));
        }
        //let date = $('#datetimepicker').val(); // Formatted date
        //console.log(GM_info.script.name + ' setEventTimer - ExpTime: ' + date);
        console.log(GM_info.script.name + ' setEventTimer - Difference: ' + when + 'ms');
    } catch (e) {
        console.log(e);
    }
    // End debugging
}

/* This Method executes a function certain time of the day
 * @param {type} time of execution in ms
 * @param {type} func function to execute
 * @returns {Object} timer object (may be cleared later) time is valid, null if time not valid.
*/
function executeAt(time, func){
    let currentTime = new Date().getTime();
    if(currentTime>time){
        console.log(GM_info.script.name + " executeAt: Time is in the Past!");
        return null;
    }
    let diffMs = time-currentTime;
    let diffSec = Math.floor(diffMs/1000);
    let diff
    console.log(GM_info.script.name + ' Setting timeout for ' + new Date(parseInt(time)) + ' - in ' + diffMs + 'ms');
    console.log(GM_info.script.name + ' Will go off in ' + msToTime(diffMs));
    let timer = setTimeout(func, diffMs);
    return timer;
}

// Helper to convert MS to hh:mm:ss
function msToTime(duration) {
    let milliseconds = parseInt((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

// Helper to clear timers
function clearTimers() {
    console.log(GM_info.script.name + ': clearTimers: ' + currentTimer);
    if (currentTimer) {
        clearTimeout(currentTimer);
    }
    removeTimedClasses();
}

// Helper to remove certain classes
function removeTimedClasses() {
    $('.custom-select').removeClass('fade-yellow');
    $('.custom-select').removeClass('fade-orange');
    $('.custom-select').removeClass('fade-red');
    $('.custom-select').removeClass('rapid-red');
}

// The timer functions. Available faders - 'fade-green', 'fade-yellow', 'fade-orange', 'fade-red', 'rapid-red'
// Defined in 'Torn-Event-Reminder-CSS.js'
function tenMinuteTimer() {
    clearTimers();
    $('.custom-select').addClass('fade-yellow');
    console.log(GM_info.script.name + ' 10 minute timer triggered!');
    setEventTimer();
}

function fiveMinuteTimer() {
    clearTimers();
    $('.custom-select').addClass('fade-orange');
    console.log(GM_info.script.name + ' 5 minute timer triggered!');
    setEventTimer();
}

function twoMinuteTimer() {
    clearTimers();
    $('.custom-select').addClass('fade-red');
    console.log(GM_info.script.name + ' 2 minute timer triggered!');
    setEventTimer();
}

function reallySoonTimer() {
    clearTimers();
    $('.custom-select').addClass('rapid-red');
    let currentTime = new Date().getTime();
    console.log(GM_info.script.name + ' Really Soon timer triggered!');
    currentTimer = executeAt(currentTime + thirty_seconds, timeOutEvent);
}

function timeOutEvent() {
    clearTimers();
    removeSelectedEvent(true);
    setEventTimer();
}

///////////////////////////////////////////////////////////////////
// Functions to manage saving, restoring, deleting events
///////////////////////////////////////////////////////////////////

// Define a saved event
class savedEvent {
    constructor(count, timestamp, desc, date) {
        this.value = count;
        this.timestamp = timestamp;
        this.desc = desc;
        this.date = date;
  }
}

// Add an event to an in-mem array and more permanent storage (and the UI)
function addSavedEvent(event, fromStorage=false) {
    eventArray.push(event);

    // In storage, save as 'xedx-event-<savedEvent.value>:savedEvent'
    let value = JSON.stringify(event);
    if (!fromStorage) {
        GM_setValue(keyFromValue(event.value), value);
    }

    let newOption = '<option value="' + event.value + '" time="' + event.timestamp + '">' + event.desc + ' at ' + event.date +'</option>';
    $('.custom-select').append(newOption);
}

// Remove from storage, manually and also after event is over (expired).
function removeSelectedEvent(automatic=false) {
    if ($(".custom-select option:selected").length == 0) {return;}

    let desc = $(".custom-select option:selected").text();
    let value = $(".custom-select option:selected").val();
    let key = keyFromValue(value);

    if (!automatic) {
        let text = 'Are you sure you`d like to remove this event reminder?';
        text = text + 'n\nDescription: ' + desc;
        if (confirm(text)) {
            clearTimers();
            $(".custom-select option:selected").remove();
            GM_deleteValue(keyFromValue(value));
            setEventTimer();
            return;
        }
    }

    $(".custom-select option:selected").remove();
    GM_deleteValue(keyFromValue(value));

    clearTimers();
    setEventTimer();
}

// Load all saved events from permanent storage
function loadSavedEvents() {
    let allEvents = GM_listValues();
    let timenow = new Date().getTime();
    for (let i=0; i<allEvents.length; i++) {
        if (allEvents[i].indexOf(eventPrefix) == -1) {continue;}
        let event = JSON.parse(GM_getValue(allEvents[i]));
        if (event.timestamp < timenow) {
            console.log(GM_info.script.name + ' Removing expired event: ', allEvents[i].name);
            GM_deleteValue(allEvents[i]);
            continue;
        }
        addSavedEvent(event, true);
    }

    sortCustomSelect();
    autoSizeSelect($('.custom-select'));
}

///////////////////////////////////////////////////////////////////
// Utility to get a timestamp from a string in our display format
///////////////////////////////////////////////////////////////////

function timestampFromDate(value) {
    // convert from 'day dd/mm/yy hh:mm' to a date object
    // format:'l d/m/y H:i',
    let at = value.indexOf(' ');
    let remains = value.slice(at+1);

    let dateParts = remains.split("/");
    let timeParts = dateParts[2].split(" ")[1].split(":");
    dateParts[2] = dateParts[2].split(" ")[0];
    let year = '20' + dateParts[2]; // The following could all be squished together,
    let month = dateParts[1] - 1;   // but was easier to debug this way, when changing
    let day = dateParts[0];         // the format displayed.
    let hour = timeParts[0];
    let min = timeParts[1];
    let dateObject = new Date(year, month, day, hour, min);
    return dateObject.getTime();
}

/////////////////////////////////////////////////////////////////////////////////
// Un-hide (open) the hidden 'Add Event' dialog
/////////////////////////////////////////////////////////////////////////////////

function launchAddEventDlg() {
    let dlgBase = document.getElementById("add-event-dlg");
    dlgBase.style.display = "none";
    var addEventDlg = $("#add-event-dlg").dialog(addEventOpt);
    addEventDlg.dialog("open");

    // Further dialog customization.
    $(".ui-dialog").addClass('ui-dialog-ext');
    $(".ui-dialog-titlebar-close").hide();
    $(".ui-dialog-titlebar").addClass('ui-dialog-titlebar-ext');

    // Handler for the 'OK' button
    let okBtn = document.getElementById("xedx-btn-ok");
    okBtn.addEventListener("click", function() {
        btnOnOkClick();
        let dlgBase = document.getElementById("add-event-dlg");
        dlgBase.style.display = "none";
        $("#add-event-dlg").dialog("close");
    }, false);
}

/////////////////////////////////////////////////////////////////////////////////
// Add the "Add Event" dialog - starts hidden. Use 'launchAddEventDlg()' to show.
/////////////////////////////////////////////////////////////////////////////////

function insertAddEventDialogDiv() {
    let cfgBase = document.getElementById("add-event-dlg");
    if (validPointer(cfgBase)) {
        return;
    }

    // Main body of the Add Event dialog.
    const event_original = '<div id="add-event-dlg" class="event-style event-center">' +
              '<br><br><br>' +
              '<p>' +
                  '<label for="event-name">Event name: </label>' +
                  '<input type="text" id="event-name" name="event-name"></input><br><br>' +
                  '<label for="datetimepicker">Select time: </label>' +
                  '<input id="datetimepicker" type="text"></input>' +
              '</p>' +
          '</div>';

    /* This adds some checkboxes, to select alarm style - abs. time or timer-style (countdown)
    // Not yet implemented...
    const event_new = '<div id="add-event-dlg" class="event-style">' +
              '<p>' +
                  '<div class="event-left"><br>' +
                      '<input type="radio" id="alarm" name="mode" value="alarm">' +
                      '<label for="alarm"> Alarm Clock Mode</label><br><br>' +
                      '<input type="radio" id="timer" name="mode" value="timer">' +
                      '<label for="timer"> Kitchen Timer Mode</label>' +
                  '</div>' +
              '</p>' +
              '<br>' +
              '<p>' +
                  '<div class="event-center">' +
                      '<label for="event-name">Event name: </label>' +
                      '<input type="text" id="event-name" name="event-name"></input><br><br>' +
                      '<label for="datetimepicker">Select time: </label>' +
                      '<input id="datetimepicker" type="text"></input>' +
                  '</div>' +
              '</p>' +
          '</div>';
          */

    $("#body").append(event_original);

    // Any options accepted can be specified here, see https://xdsoft.net/jqplugins/datetimepicker/
    // Want to set this to display in TCT (AKA GMT)
    $('#datetimepicker').datetimepicker( // Initialization
        {theme:'dark',
         format:'l d/m/y H:i', // Don't change this without changing everything else that relies on this specific format.
         showTimezone:true,
         validateOnBlur:false, // This prevents the datetimepicker from 'fixing' the date when losing focus.
         step:5,               // Seems to set the date to 'now', regardless. The 'fix', I mean...
        }
    );
}

/////////////////////////////////////////////////////////////////////////////////
// Define JQuery-UI options for the 'Add Event' dialog
/////////////////////////////////////////////////////////////////////////////////

// Leave this alone, edit at your own risk...
var addEventOpt =
    {
        //draggable: true,
        resizable: true,
        autoOpen: false,
        modal: true,
        title: "Add Event",
        buttons: [
            {
                text: "Ok",
                id: "xedx-btn-ok",
            },
            {
                text: "Cancel",
                id: "xedx-btn-close",
                click: function() {
                    let cfgBase = document.getElementById("add-event-dlg");
                    cfgBase.style.display = "block";
                    $(this).dialog( "close" );
                },
            },
        ]
    };

