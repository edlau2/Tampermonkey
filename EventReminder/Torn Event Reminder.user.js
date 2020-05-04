// ==UserScript==
// @name         Torn Event Reminder
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Add an Event 'alarm clock' to all Torn pages
// @include      https://www.torn.com/*
// @author       xedx [2100735]
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/EventReminder/Torn%20Event%20Reminder.user.js
//
// replace these with URL's when done testing!!! (the UNUSED ones are the local ones - swap as needed)
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/EventReminder/Torn-Event-Reminder-CSS.js
// UNUSED @require      file:////Users/edlau/Documents/Tampermonkey Scripts/EventReminder/Torn-Event-Reminder-CSS.js
// @resource     datetimepickerCSS https://raw.githubusercontent.com/edlau2/Tampermonkey/master/DateTimePicker/jquery.datetimepicker.min.css
// UNUSED @resource     datetimepickerCSS file:////Users/edlau/Documents/JQuery/DateTimePicker/jquery.datetimepicker.min.css
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/DateTimePicker/jquery.datetimepicker.full.min.js
// UNUSED @require      file:////Users/edlau/Documents/JQuery/DateTimePicker/jquery.datetimepicker.full.min.js

//
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_getResourceText
// @grant        unsafeWindow
// ==/UserScript==

// The UI...
const selectBtnSpan =
      '<span>' +
          '<select name="xedx-select" class="custom-select select-selected" id="xedx-select">' +
              '<option value="0" title="test">No upcoming events...</option>' +
              //'<option value="1" title="test">Next Event really long wut wut wut?</option>' +
              //'<option value="2" title="test">Event 3</option>' +
          '</select>' +
          '<span id="xedx-remove-event" class="close-icon" style="margin-left:5px"></span>' +
      '</span>';

const infoDiv =
      '<div id="myModal" class="modal">' +
          //'<div class="modal-content">' +
              '<span class="modal-text">' +
                  '<p>Some long text, maybe explaing what, when, where, how and why this is here.<br><br>Maybe time left, other details.....</p>' +
              '</span>' +
          //'</div>' +
      '</div>';

// header at the top of the screen, that contains the above select.
const add_event_div =
      '<div id="xedx-events-div" style="dispay=inline-block;">' +
          '<span id="xedx-add-event" class="header-bottom-text"><a href="#">&nbsp&nbspAdd Event&nbsp</a></span>' +
          '<span id="xedx-events" class="event_text_style event_box_style">test</span>' +
          selectBtnSpan +
          infoDiv +
          //'<span id="xedx-del-event" class="event_box_style"><a href="#">Del</a></span>' +
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
    var $aux = $('<select/>').append($('<option/>').text(text))
    $(elem).after($aux)
    $(elem).width($aux.width())
    $aux.remove()
}

// Entry point. Set up the UI and timer for clock.
(function() {
    'use strict';

    logScriptStart();

    // Inline helper functions
    const format = (date) => date.toISOString().slice(11, 19);
    const display = (date = new Date()) => format(date) + ' TCT';
    const updateTime = () => target.textContent = display();

    // CSS for the datetimepicker class
    var newCSS = GM_getResourceText ("datetimepickerCSS");
    GM_addStyle (newCSS);

    const parent = $('div.header-wrapper-bottom');

    // Remove the 'time' element (well, hide it) - make separate fn
    // This may be installed by the 'Add Time' script, by Mist3rM [2154120] & hannes3510 [2150804]
    // Never tested with that script running *after* this one.
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
    updateTime(); // And set it first - erase 'TEST TEST TEST' :-)

    // ****** Set up the custom 'select' ******

    // Dynamically resize the select
    $('.custom-select').change(function(){
        autoSizeSelect(this);
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
        console.log('Event: "' + e.type + '" Text: "' + e.currentTarget.innerText + '" Value: "' + e.currentTarget.value + '"');
    }, false);

    mySelect.addEventListener('mouseleave', function(e) {
        // Close the info dialog.
        let modal = document.getElementById("myModal");
        modal.style.display = "none";
        console.log('Event: "' + e.type + '" Text: "' + e.currentTarget.innerText + '" Value: "' + e.currentTarget.value + '"');
    }, false);
    */


    // Handler for the 'close-icon', the 'X' to the right of select
    // Removes the 'active' option in the select
    let remBtn = document.getElementById('xedx-remove-event');
    $(remBtn).click(function(){removeSelectedEvent();});

    // Load saved events from storage
    loadSavedEvents();

    // Set up timers for upcoming events (TBD)


})();

//////////////////////////////////////////////////////////////////////////////////////
// Functions/handlers for the 'Add Event' page - a JQuery-UI based dialog.
//////////////////////////////////////////////////////////////////////////////////////

// Events should be saved in GM_storage.
// List should be sorted by ascending event time/date
// Would it be easier to save as an array? Save using timestamp as one field?
// [{timestamp:n, name:"xxx" formattedDate:"yyy"}, etc...]

// Handler for the 'Add Event' OK button
function btnOnOkClick() {
    let count = $('#xedx-select option').length; // 'count' is index into the options list - also the 'value'
    let desc = $('#event-name').val(); // Desciption
    let date = $('#datetimepicker').val(); // Formatted date

    // Order using this...???
    let timestamp = timestampFromDate(date);

    // Test the timestamp. Works.
    //console.log('Date: ' + date + ' Timestamp (converted): ' + (new Date(timestamp)));

    // Add to list
    let newOption = '<option value="' + count + '">' + desc + ' at ' + date +'</option>';
    $('.custom-select').append(newOption);
    $('.custom-select').prop('selectedIndex', count);
    autoSizeSelect($('.custom-select'));

    // Save it in our array and storage
    addSavedEvent(new savedEvent(count, timestamp, desc, date));
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

// Add an event to an in-mem array and more permanent storage
function addSavedEvent(event, fromStorage=false) {
    eventArray.push(event);

    // In storage, save as 'xedx-event-<savedEvent.value>:savedEvent'
    //let key = 'xedx-event-' + event.value;
    let value = JSON.stringify(event);
    if (!fromStorage) {
        GM_setValue(keyFromValue(event.value), value);
    }
}

// Remove from storage, also after event is over.
function removeSelectedEvent() {
    let desc = $(".custom-select option:selected").text();
    let value = $(".custom-select option:selected").val();
    let key = keyFromValue(value);
    let text = 'Are you sure you`d like to remove this event reminder?';
    text = text + 'n\nDescription: ' + desc;
    if (confirm(text)) {
        $(".custom-select option:selected").remove();
        GM_deleteValue(keyFromValue(value));
    }
}

// Load all saved events from permanent storage
function loadSavedEvents() {
    let allEvents = GM_listValues();
    for (let i=0; i<allEvents.length; i++) {
        if (allEvents[i].indexOf(/*'xedx-event-'*/ eventPrefix) == -1) {continue;}
        let event = JSON.parse(GM_getValue(allEvents[i]));
        addSavedEvent(event, true);

        // Add to list
    let newOption = '<option value="' + event.value + '">' + event.desc + ' at ' + event.date +'</option>';
    $('.custom-select').append(newOption);
    }

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
    let year = '20' + dateParts[2];
    let month = dateParts[1] - 1;
    let day = dateParts[0];
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

    // TBD ...
    // Further dialog customization (move to CSS class!) And put in the function below...
    // Should not be here !!!! Define on creation.
    $(".ui-dialog").attr("style", $(".ui-dialog").attr("style") + " border: solid black 2px; border-radius: 5px; background-color: white;");
    $(".ui-dialog-titlebar-close").hide();
    $(".ui-dialog-titlebar").attr("style", "text-align: center; margin: 5px; color: black; font-weight: bold;");

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

    // Main body of the dialog style - note
    // that the BG color of what's behind it bleeds through.
    const event_original = '<div id="add-event-dlg" class="event-style event-center">' +
              '<br><br><br>' +
              '<p>' +
                  '<label for="event-name">Event name: </label>' +
                  '<input type="text" id="event-name" name="event-name"></input><br><br>' +
                  '<label for="datetimepicker">Select time: </label>' +
                  '<input id="datetimepicker" type="text"></input>' +
              '</p>' +
          '</div>';

    /*
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

    let bodyTags = document.getElementsByTagName('body');
    $("#body").append(event_original);

    // Any options accepted can be specified here, see https://xdsoft.net/jqplugins/datetimepicker/
    $('#datetimepicker').datetimepicker( // Initialization
        {theme:'dark',
         format:'l d/m/y H:i', // Don't change this without changing everything else that relies on this specific format.
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

