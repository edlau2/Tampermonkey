// ==UserScript==
// @name         Torn Fac Chat Filter
// @namespace    https://github.com/edlau2
// @version      0.4
// @description  Add ability to filter out chats by keyword/name.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/FacChatFilter/Torn%20Fac%20Chat%20Filter.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

const hide = true; // Hide if matches, set to false to hide everything else
let disabled = false; // true to turn on filtering
let filterArray = []; // In-memory array of filter keywords

////////////////////////////////////////////////////////////////////
// Actual filtering is done here. 'content' is the content object
// of the chat box, 'keyword' is the word to filter off of, and
// 'hide' is set to TRUE to suppress, FALSE to only allow.
////////////////////////////////////////////////////////////////////

// Just for feedback, make some blinky lights.
function blinkLight(filter_name, filtered, interval=1000) {
    let filterLight = document.getElementById(filter_name + '-filtered');
    let notFilterLight = document.getElementById(filter_name + '-notfiltered');
    let elem = filtered ? filterLight : notFilterLight;
    elem.style.backgroundColor = filtered ? 'Yellow' : 'LawnGreen';
    setTimeout(function() {
        elem.style.backgroundColor = 'Gainsboro';
    }, interval);
}

// Do the filtering
function filter(filter_name, content, keyword, hide) {
    const msgs = $(content).find('div[class^=message_]');
    $(msgs).each(function() {
        const msg = $(this).text();  // Entire message
        let at = msg.indexOf(':');   // Ptr. to 'From:' separator
        let from = msg.slice(0, at); // Msg is from this person

        //console.log("Torn Fac Chat: filtering! From: '" + from + "'");

        if (disabled) {
            console.log('Filtering Disabled');
            $(this).show();
            blinkLight(filter_name, !hide, 1500);
        }

        // Potential options:
        //if (msg.toLowerCase().includes(keyword.toLowerCase())) // Contains, case-insensitive
        //if (msg.toLowerCase().startsWith(keyword.toLowerCase())) // Starts with, should match 'from', insensitive
        //if (from == keyword) // Case-sensitive match on 'from'

        if (!disabled) {
            console.log('Filtering on keyword ' + keyword);
            console.log('Matching ' + from);

            // Could change this - case sensitive, use 'if (filterArray.includes(from))...'
            // Or for case-insensitive, convert array, and toLower for 'from':
            // filterArray = filterArray.map(function(x){ return x.toUpperCase() }) // or toLowerCase ?

            if (from.toLowerCase() == keyword.toLowerCase()) { // Case-insensitive match on 'from'
                hide ? $(this).hide() : $(this).show();
                console.log('Hiding ' + from);
                blinkLight(filter_name, hide);
            } else {
                hide ? $(this).show() : $(this).hide();
                console.log('Showing ' + from);
                blinkLight(filter_name, !hide);
            }
        }
    });
}

////////////////////////////////////////////////////////////
// Handler for the 'Enable' button, toggles colors
// and sets the global 'disable' variable.
////////////////////////////////////////////////////////////

const enabledBtnText = '&nbsp;';
const btnEnabledColor = 'LawnGreen';
const disabledBtnText = '&nbsp;';
const btnDisabledColor = 'Crimson';
const optionsBtnText = '&nbsp;';

function btnOnEnableClick(e) {
    //alert('onEnable');
    let button = e.currentTarget; // Same as .srcElement, 'this' ....
    console.log(this.innerHTML + 'clicked');
    if (!disabled) {
        button.style.backgroundColor = btnDisabledColor;
        disabled = true;
        this.innerHTML = enabledBtnText;
        GM_setValue('state', 'Disabled');
    } else {
        button.style.backgroundColor = btnEnabledColor;
        disabled = false;
        this.innerHTML = disabledBtnText;
        GM_setValue('state', 'Enabled');
    }
    filter('faction'); // ??? Need params, esp. 'content' ????
}

////////////////////////////////////////////////////////////
// Load/launch the config (options) dialog
////////////////////////////////////////////////////////////

function btnOnConfigClick(e, filter_name) {
    let cfgBase = document.getElementById("configure");
    cfgBase.style.display = "none";
    var cfgDialog = $("#configure").dialog(configOpt);
    cfgDialog.dialog("open");

    // Further dialog customization
    $(".ui-dialog").attr("style", $(".ui-dialog").attr("style") + " border: solid black 2px; border-radius: 5px; background-color: gray");
    $(".ui-dialog-titlebar-close").hide();
    $(".ui-dialog-titlebar").attr("style", "text-align: center; margin: 5px; color: black; font-weight: bold");

    let okBtn = document.getElementById("xedx-cfgbtn-ok");
    const textParam = filter_name;
    okBtn.addEventListener("click", function(e) {
                    //alert('Options: on OK filter_name = ' + textParam);
                    btnOnApplyFilterClick(null, textParam);
                    let cfgBase = document.getElementById("configure");
                    //$(this).dialog( "close" );
                    $("#configure").dialog("close");
                }, false);
}

/////////////////////////////////////////////////////////////////////
// Handle adding/removing filters (the Options dialog buttons)
/////////////////////////////////////////////////////////////////////

// Create UI element for a new filter
function btnOnAddFilterClick(chat, filter_name) {
    //alert('Add filter');
    let idIndex = Math.random();
    let elem = document.getElementById(filter_name + '-filter-div');
    let id = filter_name + '-' + idIndex;
    let btnId = 'btn-' + id;
    let spanID = 'span-' + id;
    let name = 'Filter: ';
    let filter = '<span id="' + spanID + '" <label for="filter" style="color: green;">' + name + '</label>' +
                 '<input type="text" style="border: 1px solid #ddd;"' +
                 ' id="' + id + '" name="' + id + '">' +
                 '<button type="button" id="' + btnId + '" onclick="removeFilter()">X</button><br></span>';
    $(elem).append(filter);

    let removeBtn = document.getElementById(btnId);
    if (removeBtn) {removeBtn.addEventListener("click", function(){removeFilter(spanID);}, false);}
}

// Add a filter, to the UI and in-memory array
function addSavedFilter(filter_name, id, value) {
    //console.log('addSavedFilter: ' + id + ' == ' + value);
    let elem = document.getElementById(filter_name + '-filter-div');
    let btnId = 'btn-' + id;
    let spanID = 'span-' + id;
    let span = document.getElementById(spanID);
    if (!validPointer(span)) { // Already in UI
    }
        let name = 'Filter: ';
        let filter = '<span id="' + spanID + '" <label for="filter" style="color: green;">' + name + '</label>' +
                     '<input type="text" style="border: 1px solid #ddd;"' +
                     ' id="' + id + '" name="' + id + '">' +
                     '<button type="button" id="' + btnId + '" onclick="removeFilter()">X</button><br></span>';
        $(elem).append(filter);
        let indexElem = document.getElementById(id);
        indexElem.setAttribute('value', value); // Just set in 'filter' assignment?

        let removeBtn = document.getElementById(btnId);
        if (removeBtn) {removeBtn.addEventListener("click", function(){removeFilter(spanID);}, false);}

    if (!filterArray.includes(value)) {filterArray.push(value);} // Add to in-mem array
}

// Remove a filter, from the UI only
function removeFilter(spanId) {
    let elem = document.getElementById(spanId);
    $(elem).remove();
}

// Apply button - save filters to storage and memory
function btnOnApplyFilterClick(chat, filter_name) {
    // Save each filter as id:value
    let name = filter_name + '-filter-div';
    let elem = document.getElementById(name);
    let inputs = elem.getElementsByTagName('input');
    clearFilters(filter_name, true);
    for (let i=0; i < inputs.length; i++) {
        let id = inputs[i].id;
        let value = inputs[i].value;
        if (value == '') {
            let spanID = 'span-' + id;
            removeFilter(spanID);
            continue;
        }
        console.log('Applying filter (2): ' + id + ' == ' + value);
        GM_setValue(id, value);  // Save in storage
        filterArray.push(value); // Save in-mem
    }

    let text = 'Filters Applied!\n';
    filterArray.forEach(item => (text = text + '\n\t' + item));
    alert(text);
}

// Restore button - restore filters from storage
function btnOnRestoreFilterClick(chat, filter_name) {
    //alert('Restore Filters');
    loadSavedFilters(chat, filter_name);
}

// Function to load saved filters from storage
function loadSavedFilters(chat, filter_name) {
    //alert('Load saved filters');
    let vals = GM_listValues();
    for (let i=0; i < vals.length; i++) {
        let id = vals[i];
        let value = GM_getValue(id);
        if (value == '') {continue;}
        if (value.indexOf('filter') == -1) {continue;}
        addSavedFilter(filter_name, id, value);
    }
}

// Function to clear all saved filters, from UI and storage
function clearFilters(filter_name, fromApply=false) {
    //alert('Clear filters');

    let vals = GM_listValues();
    for (let i=0; i < vals.length; i++) {
        let spanID = 'span-' + vals[i]; // id = vals[i]
        if (!fromApply) {removeFilter(spanID);}
        GM_deleteValue(vals[i]);
    }

    // Clear in-mem array
    filterArray = [];

    // This handles the ones in the UI but not yet in storage
    if (!fromApply) {
        let name = filter_name + '-filter-div';
        let elem = document.getElementById(name);
        let inputs = elem.getElementsByTagName('input');
        for (let i=0; i<inputs.length; i++) {
            let spanID = 'span-' + inputs[i].id;
            let rem = document.getElementById(spanID);
            if (validPointer(rem)) {$(rem).remove();}
        }
    }
}

// View filter array, in-mem
function viewFilters() {
    let text = '';
    filterArray.forEach(item => (text = text + '\n\t' + item));
    alert('Installed Filters:' + text);
}

//////////////////////////////////////////////////////
// Enable misc. button handlers.
//////////////////////////////////////////////////////

// Note: only will work for a *single* filter_name...
// Prevent adding a handler multiple times.
var handlerBtns = {'cfgBtnOn' : false,
                   'enableBtnOn' : false,
                   'addBtnOn' : false,
                   'applyBtnOn' : false,
                   'restoreBtnOn' : false,
                   'clearBtnOn' : false,
                   'viewBtnOn' : false,
                  }

var eventOptions = {
  once: false,
  passive: true,
  capture: false
}

function handlersInstalled() {
    return (handlerBtns.cfgBtnOn &&
            handlerBtns.enableBtnOn &&
            handlerBtns.addBtnOn &&
            handlerBtns.applyBtnOn &&
            handlerBtns.restoreBtnOn &&
            handlerBtns.clearBtnOn &&
            handlerBtns.viewBtnOn);
}

function ResetHandlerFlags() {
    handlerBtns.cfgBtnOn = handlerBtns.enableBtnOn = handlerBtns.addBtnOn =
    handlerBtns.applyBtnOn = handlerBtns.restoreBtnOn = handlerBtns.clearBtnOn =
    handlerBtns.viewBtnOn = false;
}

function enableButtonHandlers(filter_name) {
    // Handlers for button(s) on main chat
    let cfgButton = document.getElementById(filter_name + '-enable');
    if (validPointer(cfgButton) && !handlerBtns.cfgBtnOn) {
        cfgButton.addEventListener("click", btnOnEnableClick);
        handlerBtns.cfgBtnOn = true;
    }

    let enableButton = document.getElementById(filter_name + '-cfg');
    if (validPointer(enableButton) && !handlerBtns.enableBtnOn) {
        enableButton.addEventListener("click", function(e) {btnOnConfigClick(e, filter_name);});
        handlerBtns.enableBtnOn = true;
    }

    // Handlers for 'Options' dialog buttons
    let addButton = document.getElementById(filter_name + '-cfg-add');
    if (validPointer(addButton) && !handlerBtns.addBtnOn) {
        addButton.addEventListener("click", function(){btnOnAddFilterClick(chat, filter_name);}, false);
        handlerBtns.addBtnOn = true;
    }

    let applyButton = document.getElementById(filter_name + '-cfg-apply');
    if (validPointer(applyButton) && !handlerBtns.applyBtnOn) {
        applyButton.addEventListener("click", function(){btnOnApplyFilterClick(chat, filter_name);}, false);
        handlerBtns.applyBtnOn = true;
    }

    let restoreButton = document.getElementById(filter_name + '-cfg-restore');
    if (validPointer(restoreButton) && !handlerBtns.restoreBtnOn) {
        restoreButton.addEventListener("click", function(){btnOnRestoreFilterClick(chat, filter_name);}, false);
        handlerBtns.restoreBtnOn = true;
    }

    let clearButton = document.getElementById(filter_name + '-cfg-clear');
    if (validPointer(clearButton) && !handlerBtns.clearBtnOn) {
        clearButton.addEventListener("click", function(){clearFilters(filter_name);}, false);
        handlerBtns.clearBtnOn = true;
    }

    let viewButton = document.getElementById(filter_name + '-cfg-view');
    if (validPointer(viewButton) && !handlerBtns.viewBtnOn) {
        viewButton.addEventListener("click", function(){viewFilters();}, false);
        handlerBtns.viewBtnOn = true;
    }
}

//////////////////////////////////////////////////////
// This triggers when a node insertion into the
// chat content box ocurrs.
//////////////////////////////////////////////////////

var oneShotBreak = false;  // Set to 'true' to stop at a debugger breakpoint on startup, once only.
var filtersLoaded = false; // Only load filters from storage once.

function addChatFilter(box, chat) {
    const content = $(box).find('div[class^=chat-box-content_]');
    const filter_name = 'filter-' + chat;

    ////////////////////////////////////////////////////////////////////
    // Call the filter function, if we have filters and are enabled.
    ////////////////////////////////////////////////////////////////////

    if (oneShotBreak) {
        debugger;
        oneShotBreak = false;
    }

    let filtSpan = document.getElementById("xedx-filter-span"); // $('#xedx-filter-span')
    let elem = $(box).find('#'+filter_name);
    if (elem.length > 0 || validPointer(filtSpan)) { // Filter input exists -or- filterSpan created (config dialog)
        console.log('trigger 3: ', content);
        for (let i=0; i<filterArray.length; i++) {
            let keyword = filterArray[i];
            if (keyword.length > 0) {
                console.log('Filtering on "' + keyword + '"');
                filter(filter_name, content, keyword, hide);
            }
        }
        return; // Assumes everything below has fully completed. ???
    }

    //////////////////////////////////////////////////////
    // Set up menus/buttons/etc. on main chat window
    //////////////////////////////////////////////////////

    const input = $(box).find('div[class^=chat-box-input_]');
    const output = $(box).find('div[class^=chat-box-content_]');
    if (!validPointer(filtSpan)) { // Only do once!
        let edBtnText = disabled ? disabledBtnText : enabledBtnText;
        $(input).before('<div>' +
        //$(input).prepend('<div>' +
        //$(output).append('<div>' +
                         '<span id="xedx-filter-span" style="vertical-align: middle; display:block; margin:0 auto; height: 14px; ' +
                         //'border: 1px solid #ccc; background-color: #f2f2f2;">' +
                         //'border: 1px solid #a9a9a9; background-color: #f2f2f2;">' +
                         'border-left: 1px solid #a9a9a9; border-right: 1px solid #a9a9a9; ' +
                         'border-bottom: 1px solid #a9a9a9; background-color: #f2f2f2;">' +

                         /*
                         // Input field for filter - moved to Options dialog
                         '<label for="filter" style="color: green;">Filter: </label>' +
                         '<input type="text" size="12" id="' + filter_name + '" name="' + filter_name + '">' + //</span>' +
                         */

                         // Make some nifty light buttons
                         '<button type="button" id="' + filter_name + '-filtered"' +
                         ' style="border-radius: 30%; border: 1px solid black; margin: 2px 2px 0px 8px; height: 10px; ' +
                         'width: 4%; background-color: Gainsboro;">&nbsp</button>' +
                         '<button type="button" id="' + filter_name + '-notfiltered"' +
                         ' style="border-radius: 30%; border: 1px solid black; height: 10px; ' +
                         'width: 4%; background-color: Gainsboro">&nbsp</button>' +

                         // Options button
                         '<button type="button" id="' + filter_name + '-cfg' +
                         '" onclick="btnOnConfigClick()"' +
                         ' style="border-radius: 5px; border: 1px solid black; margin: 0px 10px 0px; height:10px; width: 34%;">' +
                         optionsBtnText + '</button>' +

                         // Enable/Disable button
                         '<button type="button" id="' + filter_name + '-enable' +
                         '" onclick="btnOnEnableClick()"' +
                         ' style="border-radius: 5px;  border: 1px solid black; margin: 0px 0px 0px; height:10px; width: 34%; ' +
                         'background-color: Crimson">' +
                         edBtnText + '</button>' +
                         '</span>' +
                         '</div>');

    ResetHandlerFlags();
    }

    ////////////////////////////////////////////////////////////
    // Build empty div for 'Options' dialog.
    ////////////////////////////////////////////////////////////

    let configDiv = document.getElementById('configure');
    if (!validPointer(configDiv)) { // Only do once!
        $(".body").append('<div id="configure" ' +
                          'style="background-color: LightGray; display: block; text-align: center;">' +
                          '<p><br><span style="color: blue;">Installed Filters:</span></p>' +

                          // Filter inputs.
                          '<div id="' + filter_name + '-filter-div"><br></div>' +

                          // Buttons at bottom on cfg
                          '<span id="xedx-cfg-btn-span" style="vertical-align: middle; padding: 10px; display: inline-block;"><br>' +
                          '<button type="button" id="' + filter_name + '-cfg-add" onclick="btnOnAddFilterClick()"' +
                              ' style="border-radius: 5px; border: 1px solid black;">Add Filter</button>' +
                          '<button type="button" id="' + filter_name + '-cfg-apply" onclick="btnOnApplyFilterClick()"' +
                              ' style="border-radius: 5px; border: 1px solid black;">Apply Filters</button>' +
                          '<button type="button" id="' + filter_name + '-cfg-restore" onclick="btnOnRestoreFilterClick()"' +
                              ' style="border-radius: 5px; border: 1px solid black;">Restore Filters</button>' +
                          '<button type="button" id="' + filter_name + '-cfg-clear" onclick="btnOnClearFilterClick()"' +
                              ' style="border-radius: 5px; border: 1px solid black;">Clear Filters</button>' +
                          '<button type="button" id="' + filter_name + '-cfg-view" onclick="btnOnViewFilterClick()"' +
                              ' style="border-radius: 5px; border: 1px solid black;">View Filters</button>' +
                          '</span>' +
                        '</div>');
    ResetHandlerFlags();
    }

    // Enable all the buttons. We may have to call again...
    if (true) /*!handlersInstalled())*/ {enableButtonHandlers(filter_name);}

    // Load saved filters - call once.
    if (!filtersLoaded) {
        loadSavedFilters(chat, filter_name);
        filtersLoaded = true;
    }

    // Get notifications on node insertion/deletion, in the chat box
    $(content).bind('DOMNodeInserted DOMNodeRemoved', function() {
        console.log('trigger 2 ', content);
        for (let i=0; i<filterArray.length; i++) {
            let keyword = filterArray[i];
            if (keyword.length > 0) {
                console.log('Filtering on "' + keyword + '"');
                filter(filter_name, content, keyword, hide);
            }
        }
    });

    /*
    // Triggers on input to 'filter' input box
    // Moved to the Config dialog, Apply button function.
    $('#'+filter_name).on('input', function() {
        const keyword = $('#'+filter_name).val();
        GM_setValue(filter_name, keyword); // Sets single value, need an array...
        console.log('trigger 1');
        if (keyword.length > 0) {filter(content, keyword, hide);}
    });
    */
}

//////////////////////////////////////////////////////
// Dialog options for the 'Options'/'Configure' page
//////////////////////////////////////////////////////

// Define options for the 'Options' dialog
var configOpt =
    {
        draggable: true,
        resizable: true,
        autoOpen: false,
        modal: true,
        title: "Filtering Options",
        buttons: [
            {
                text: "Ok",
                id: "xedx-cfgbtn-ok",
            },
            {
                text: "Cancel",
                id: "xedx-cfgbtn-close",
                click: function() {
                    let cfgBase = document.getElementById("configure");
                    $(this).dialog( "close" );
                },
            },
        ]
    };

////////////////////////////////////////////////////////////////////////////////////
// Main entry point
////////////////////////////////////////////////////////////////////////////////////

(function() {
    'use strict';

    console.log(GM_info.script.name + ' script started!');

    // Load initial state
    let state = GM_getValue('State');
    if (!validPointer(state) || state == 'Disabled') {
        disabled = true;
        GM_setValue('state', 'Disabled');
    } else {
        disabled = false;
    }

    // Chats we care about...
    // const chats = ['global', 'trade', 'faction', 'company', 'travel', 'hospital', 'jail'];
    const chats = ['faction'];
    chats.forEach(function(chat) {
        const box = $('#chatRoot').find('div[class^=chat-box_][class*=' + chat + '_]');
        $(box).bind('DOMNodeInserted', function() {
            $(box).ready(addChatFilter(box, chat));
        });
    });

    // Make sure we trigger again when changing pages.
    window.onload = function () {
        console.log(GM_info.script.name + ' onLoad');
        let chat = 'faction';
        let box = $('#chatRoot').find('div[class^=chat-box_][class*=' + chat + '_]');
        $(box).ready(addChatFilter(box, chat));
    };
})();



