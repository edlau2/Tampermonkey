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
// @require      file:////Users/edlau/Documents/JQuery/DateTimePicker/jquery.datetimepicker.full.min.js
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
              '<option value="0">Upcoming...</option>' +
              '<option value="1">Next Event really long wut wut wut?</option>' +
              '<option value="2">Event 3</option>' +
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
// See: https://xdsoft.net/jqplugins/datetimepicker/


function autoSizeSelect(elem) {
    var text = $(elem).find('option:selected').text()
    var $aux = $('<select/>').append($('<option/>').text(text))
    $(elem).after($aux)
    $(elem).width($aux.width())
    $aux.remove()
}

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

    // Build empty div for 'Add Event' dialog.
    let configDiv = document.getElementById('add-event-dlg');
    if (!validPointer(configDiv)) { // Only do once!
        insertAddEventDialogDiv();
    }

    // ****** UI is now available, can configure now ******

    // Add fake button handler, for the "Add Event" button,
    // which isn't really a button. But who cares.
    $("#xedx-add-event").click(function(){
        //alert('Adding a new event...');
        launchAddEventDlg();
    });

    // Start the clock ticking...
    setInterval(updateTime, 1000); // Update every second, just the clock
    updateTime(); // And set it first - erase 'TEST TEST TEST' :-)

    // ****** Set up the custom 'select' ******

    // Dynamically resize the select
    $('.custom-select').change(function(){
        autoSizeSelect(this);
        /*
        var text = $(this).find('option:selected').text()
        var $aux = $('<select/>').append($('<option/>').text(text))
        $(this).after($aux)
        $(this).width($aux.width())
        $aux.remove()
        */
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



//////////////////////////////////////////////////////////////////////////////////////
// Dialog options for the 'Options'/'Configure' page - JQuery-UI wrapper around above
//////////////////////////////////////////////////////////////////////////////////////

// Handler for the 'Add Event' button

function btnOnOkClick() {
    let count = $('#xedx-select option').length;
    let newOpt = '<option value="' + count + '">' + $('#datetimepicker').val() + ' : ' + $('#event-name').val() +'</option>';
    $('#xedx-select').append(newOpt);
    $('.custom-select').prop('selectedIndex', count);
    autoSizeSelect($('.custom-select'));
}

function launchAddEventDlg() {
    let dlgBase = document.getElementById("add-event-dlg");
    dlgBase.style.display = "none";
    var addEventDlg = $("#add-event-dlg").dialog(configOpt);
    addEventDlg.dialog("open");

    // Further dialog customization (move to CSS class!)
    $(".ui-dialog").attr("style", $(".ui-dialog").attr("style") + " border: solid black 2px; border-radius: 5px;background-color: white;");
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

function insertAddEventDialogDiv() {

    // Main body of the dialog style - note
    // that the BG color of what s behind it bleeds through.
    const addEventStyle = '.event-style {' +
      'display: none; text-align: center;' +
      'border: solid black 2px;' +
      'border-radius: 0px;' +
      'background-color: #000000;' +
      'filter: alpha(opacity=80);' +
      'opacity: 0.80;' +
      'font-weight: bold;' +
      'font-size: 12px;' +
      'color: #fff;' +
      '}';

    GM_addStyle(addEventStyle);
    $(".body").append(
          '<div id="add-event-dlg" class="event-style">' +
              '<br><br><br>' +
              '<p>' +
                  '<label for="event-name">Event name: </label>' +
                  '<input type="text" id="event-name" name="event-name">New Event</input><br><br>' +
                  '<label for="datetimepicker">Select time: </label>' +
                  '<input id="datetimepicker" type="text"></input>' +
              '</p>' +
          '</div>');

    $('#datetimepicker').datetimepicker( // Initialization
        {theme:'dark',
         format:'d/m/Y h:i',
        }
    );
}

// Define options for the 'Options' dialog
var configOpt =
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

