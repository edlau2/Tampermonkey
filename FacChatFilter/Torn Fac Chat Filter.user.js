// ==UserScript==
// @name         Torn Fac Chat Filter
// @namespace    https://github.com/edlau2
// @version      0.2
// @description  Add ability to filter out chats by keyword/name.
// @author       xedx [2100735]
// @match        https://www.torn.com/*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

const hide = true; // Hide if matches, set to false to hide everything else
let disabled = false; // true to turn on filtering
let filterArray = [];

////////////////////////////////////////////////////////////////////
// Actual filtering is done here. 'content' is the content object
// of the chat box, 'keyword' is the word to filter off of, and
// 'hide' is set to TRUE to suppress, FALSE to only allow.
////////////////////////////////////////////////////////////////////

function blinkLight(filter_name, filtered, interval=1000) {
    let filterLight = document.getElementById(filter_name + '-filtered');
    let notFilterLight = document.getElementById(filter_name + '-notfiltered');
    let elem = filtered ? filterLight : notFilterLight;
    elem.style.backgroundColor = filtered ? 'Yellow' : 'LawnGreen';
    setTimeout(function() {
        elem.style.backgroundColor = 'Gainsboro';
    }, interval);
}

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
//
// TBD: On 'Disable', call filter and show everything.
// Do before toggling the 'disabled' var.
//
////////////////////////////////////////////////////////////

function btnOnEnableClick(e) {
    //alert('onEnable');
    let button = e.currentTarget; // Same as .srcElement, 'this' ....
    console.log(this.innerHTML + 'clicked');
    if (this.innerHTML == "Disable") {
        button.style.backgroundColor = 'LawnGreen';
        disabled = true;
        this.innerHTML = "Enable";
        GM_setValue('state', 'Disabled');
    } else {
        button.style.backgroundColor = 'Crimson';
        disabled = false;
        this.innerHTML = "Disable";
        GM_setValue('state', 'Enabled');
    }
    filter('faction'); // ??? Need params, esp. 'content' ????
}

////////////////////////////////////////////////////////////
// Load/launch the config dialog
////////////////////////////////////////////////////////////

function btnOnConfigClick(e) {
    let cfgBase = document.getElementById("configure");
    cfgBase.style.display = "none";
    var cfgDialog = $("#configure").dialog(configOpt);
    cfgDialog.dialog("open");

    // Try to get the dialog to configure. Should be able to do so -before- opening.
    let uiDlg = document.getElementsByClassName("ui-dialog")[0];
    if (validPointer(uiDlg)) {
        let style = uiDlg.getAttribute('style');
        style = style + ' border: solid black 2px; border-radius: 5px; background-color: gray';
        uiDlg.setAttribute('style', style);
    }
}

/////////////////////////////////////////////////////////////////////
// Handle adding/removing filters (the Config dialog buttons)
/////////////////////////////////////////////////////////////////////

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

// Add a filter, to the UI only
function addSavedFilter(filter_name, id, value) {
    //console.log('addSavedFilter: ' + id + ' == ' + value);
    let elem = document.getElementById(filter_name + '-filter-div');
    let btnId = 'btn-' + id;
    let spanID = 'span-' + id;
    let span = document.getElementById(spanID);
    if (!validPointer(span)) {// Already in UI
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

    // Add to in-mem array
    if (!filterArray.includes(value)) {filterArray.push(value);}
}

// Remove a filter, from the UI only
function removeFilter(spanId) {
    let elem = document.getElementById(spanId);
    $(elem).remove();
}

// Apply button - save filters to storage
function btnOnApplyFilterClick(chat, filter_name) {
    //alert('Apply Filters');
    //console.log('Applying filter');

    /* NOT WORKING - stringify is returning empty object!
    let name = filter_name + '-filter-div';
    let elem = document.getElementById(name);
    let replacer = function(k, v) { if (v === undefined) { return null; } return v; };
    let save_elem = JSON.stringify(elem, replacer); // For debugging...
    GM_setValue(name, save_elem);
    */

    // Save each filter as id:value
    let name = filter_name + '-filter-div';
    let elem = document.getElementById(name);
    let inputs = elem.getElementsByTagName('input');
    clearFilters(filter_name, true);
    for (let i=0; i < inputs.length; i++) {
        let id = inputs[i].id;
        let value = inputs[i].value;
        console.log('Applying filter (2): ' + id + ' == ' + value);
        GM_setValue(id, value);

        // Save in-mem
        filterArray.push(value);
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

    /* NOT WORKING - stringifying the element is returning empty object!
    let name = filter_name + '-filter-div';
    let elem = document.getElementById(name);
    let saved_elem = JSON.parse(GM_getValue(name), null);
    if (!validPointer(saved_elem)) {return;}
    if (JSON.stringify(saved_elem) === JSON.stringify({})) {return;}
    $(elem).replaceWith(saved_elem);
    */

    let vals = GM_listValues();
    for (let i=0; i < vals.length; i++) {
        let id = vals[i];
        let value = GM_getValue(id);
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
        if (!fromApply) {
            //console.log('Clearing filter, spanID = ' + spanID);
            removeFilter(spanID);
        }
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
        enableButton.addEventListener("click", btnOnConfigClick);
        handlerBtns.enableBtnOn = true;
    }

    // Handlers for 'config' dialog buttons
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

var oneShotBreak = false; // Set to 'true' to stop at a debugger breakpoint on startup, once only.
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

    // I *think* this is looking for the box added.
    // Should be able to look for 'id="xedx-filter-span"' instead
    // How do I do this with JQuery?
    let filtSpan = document.getElementById("xedx-filter-span"); // $('#xedx-filter-span')
    let elem = $(box).find('#'+filter_name);
    //if ($(box).find('#'+filter_name).size() > 0) { // Diff. jquery version screwed this up...
    if (elem.length > 0 || validPointer(filtSpan)) { // Filter input exists -or- filterSpan created (config dialog)
    //if (filterArray.length > 0) {
        /* No longer used
        $('#'+filter_name).val(GM_getValue(filter_name)); // from storage ? What does 'val' do?
        const keyword = $('#'+filter_name).val();
        */
        console.log('trigger 3: ', content);
        //filterArray.forEach(keyword => function() {
        for (let i=0; i<filterArray.length; i++) {
            let keyword = filterArray[i];
            if (keyword.length > 0) {
                console.log('Filtering on "' + keyword + '"');
                filter(filter_name, content, keyword, hide);
            }
        }
        //});
        return; // Assumes everything below has fully completed. ???
    }

    //////////////////////////////////////////////////////
    // Set up menus/buttons/etc. on main chat window
    //////////////////////////////////////////////////////

    const input = $(box).find('div[class^=chat-box-input_]');
    if (!validPointer(filtSpan)) {
        $(input).prepend('<div>' +
                         '<span id="xedx-filter-span" style="vertical-align: middle; display:table; margin:0 auto;">' +
                         /*
                         // Input field for filter - moved to Options dialog
                         '<label for="filter" style="color: green;">Filter: </label>' +
                         '<input type="text" size="12" id="' + filter_name + '" name="' + filter_name + '">' + //</span>' +
                         */

                         // Make some nifty light buttons
                         '<button type="button" id="' + filter_name + '-filtered"' +
                         ' style="border-radius: 50%; background-color: Gainsboro;">.</button>' +
                         '<button type="button" id="' + filter_name + '-notfiltered"' +
                         ' style="border-radius: 50%; margin: 2px; background-color: Gainsboro">.</button>' +

                         // Options and Enable/Disable button
                         '<button type="button" id="' + filter_name + '-cfg' +
                         '" onclick="btnOnConfigClick()"' +
                         ' style="border-radius: 5px; margin: 0px 10px 0px;">Options</button>' +
                         '<button type="button" id="' + filter_name + '-enable' +
                         '" onclick="btnOnEnableClick()"' +
                         ' style="border-radius: 5px;  margin: 0px 10px 0px; background-color: Crimson">' +
                         (disabled ? 'Enable' : 'Disable') + '</button>' +
                         '</span>' +
                         '</div>');

    ResetHandlerFlags();
    }

    ////////////////////////////////////////////////////////////
    // Build empty div for 'Configure' dialog.
    ////////////////////////////////////////////////////////////

    let configDiv = document.getElementById('configure');
    if (!validPointer(configDiv)) {$(".body").append('<div id="configure" ' +
                      'style="border: 2px solid black; border-radius: 5px; background-color: white; display: block;">' +
                        // Filter inputs.
                        '<div id="' + filter_name + '-filter-div"><br>' +
                        '</div>' +
                        // Buttons at bottom on cfg
                        '<span id="xedx-cfg-btn-span" style="vertical-align: middle; padding: 10px; display: inline-block;"><br>' +
                        '<button type="button" id="' + filter_name + '-cfg-add" onclick="btnOnAddFilterClick()"' +
                            ' style="border-radius: 5px;">Add Filter</button>' +
                        '<button type="button" id="' + filter_name + '-cfg-apply" onclick="btnOnApplyFilterClick()"' +
                            ' style="border-radius: 5px;">Apply Filters</button>' +
                        '<button type="button" id="' + filter_name + '-cfg-restore" onclick="btnOnRestoreFilterClick()"' +
                            ' style="border-radius: 5px;">Restore Filters</button>' +
                        '<button type="button" id="' + filter_name + '-cfg-clear" onclick="btnOnClearFilterClick()"' +
                            ' style="border-radius: 5px;">Clear Filters</button>' +
                        '<button type="button" id="' + filter_name + '-cfg-view" onclick="btnOnViewFilterClick()"' +
                            ' style="border-radius: 5px;">View Filters</button>' +
                        '</span>' +
                      '</div>');
    ResetHandlerFlags();
    }

    // Enable all the buttons. We may have to call again...
    if (true) /*!handlersInstalled())*/ {enableButtonHandlers(filter_name);}

    // Load saved filters
    if (!filtersLoaded) {
        loadSavedFilters(chat, filter_name);
        filtersLoaded = true;
    }

    //Already done, why do here too?
    $(content).bind('DOMNodeInserted DOMNodeRemoved', function() {
        /*
        $('#'+filter_name).val(GM_getValue(filter_name));
        const keyword = $('#'+filter_name).val(); // This is for the input box, no longer used.
        if (keyword.length > 0) {
            console.log('Filtering on "' + keyword + '"');
            filter(filter_name, content, keyword, hide);
        }
        */
        console.log('trigger 2 ', content);
        for (let i=0; i<filterArray.length; i++) {
            let keyword = filterArray[i];
            if (keyword.length > 0) {
                console.log('Filtering on "' + keyword + '"');
                filter(filter_name, content, keyword, hide);
            }
        }
    });

    // Triggers on input to 'filter' input box
    // Moved to the Config dialog, Apply button function.
    $('#'+filter_name).on('input', function() {
        /*
        const keyword = $('#'+filter_name).val();
        GM_setValue(filter_name, keyword); // Sets single value, need an array...
        console.log('trigger 1');
        if (keyword.length > 0) {filter(content, keyword, hide);}
        */
    });
}

//////////////////////////////////////////////////////
// Dialog options for the 'Options'/'Configure' page
//////////////////////////////////////////////////////

var configOpt =
    {
        draggable: true,
        resizable: true,
        autoOpen: false,
        modal: true,
        buttons: [
        {
            text: "Ok",
            click: function() {
              let cfgBase = document.getElementById("configure");
              cfgBase.style.display = "block";
              $(this).dialog( "close" );
            }
        }]
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

    window.onload = function () {
        console.log(GM_info.script.name + ' onLoad');
        let chat = 'faction';
        let box = $('#chatRoot').find('div[class^=chat-box_][class*=' + chat + '_]');
        $(box).ready(addChatFilter(box, chat));
    };
})();



