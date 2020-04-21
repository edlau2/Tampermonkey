// ==UserScript==
// @name         Torn Fac Chat Filter
// @namespace    https://github.com/edlau2
// @version      0.9
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

function filterReset(content) {
    const msgs = $(content).find('div[class^=message_]');
    $(msgs).each(function() {
        $(this).show();
    });
}

// Do the filtering
function filter(filter_name, content, keyword) {
    const msgs = $(content).find('div[class^=message_]');
    $(msgs).each(function() {
        const msg = $(this).text();  // Entire message
        let at = msg.indexOf(':');   // Ptr. to 'From:' separator
        let from = msg.slice(0, at); // Msg is from this person

        if (disabled) {
            console.log('Filtering Disabled');
            $(this).show();
            blinkLight(filter_name, !hide, 1500);
        }

        // Can't 'continue' inside of an '.each()' :-)
        if (!disabled) {
            let match = keyword ? keyword : 'Entire Array';
            console.log('Filtering on keyword: ' + match);
            console.log('Matching ' + from);

            if (!keyword ?
                filterArray.includes(from.toLowerCase()) :
               (from.toLowerCase() == keyword.toLowerCase()) // Legacy...
               ) {
                hide ? $(this).hide() : $(this).show();
                console.log('Hiding ' + from);
                blinkLight(filter_name, hide);
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

function btnOnEnableClick(content, filter_name) {
    let button = document.getElementById(filter_name + '-enable');
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

    // Re-run our filtere.
    btnOnApplyFilterClick(content, filter_name, true);
}

////////////////////////////////////////////////////////////
// Load/launch the config (options) dialog
////////////////////////////////////////////////////////////

function btnOnConfigClick(content, filter_name) {
    let cfgBase = document.getElementById("configure");
    cfgBase.style.display = "none";
    var cfgDialog = $("#configure").dialog(configOpt);
    cfgDialog.dialog("open");

    // Further dialog customization
    $(".ui-dialog").attr("style", $(".ui-dialog").attr("style") + " border: solid black 2px; border-radius: 5px; background-color: gray");
    $(".ui-dialog-titlebar-close").hide();
    $(".ui-dialog-titlebar").attr("style", "text-align: center; margin: 5px; color: black; font-weight: bold");

    let okBtn = document.getElementById("xedx-cfgbtn-ok");
    const c_filter_name = filter_name;
    const c_content = content;
    okBtn.addEventListener("click", function() {
        btnOnApplyFilterClick(c_content, c_filter_name);
        let cfgBase = document.getElementById("configure");
        cfgBase.style.display = "none";
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

    if (!filterArray.includes(value)) {filterArray.push(value.toLowerCase());} // Add to in-mem array
}

// Remove a filter, from the UI only
function removeFilter(spanId) {
    let elem = document.getElementById(spanId);
    $(elem).remove();
}

// Apply button - save filters to storage and memory
function btnOnApplyFilterClick(content, filter_name, silent=false) {
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
        filterArray.push(value.toLowerCase()); // Save in-mem
    }

    // Reset and run through the filter...
    filterReset(content);
    if (filterArray.length > 0) {filter(filter_name, content, null);}

    if (!silent) {
        let text = 'Filters Applied!\n';
        filterArray.forEach(item => (text = text + '\n\t' + item));
        alert(text);
    }
}

// Restore button - restore filters from storage
function btnOnRestoreFilterClick(chat, filter_name) {
    loadSavedFilters(chat, filter_name);
}

// Function to load saved filters from storage
function loadSavedFilters(chat, filter_name) {
    let vals = GM_listValues();
    for (let i=0; i < vals.length; i++) {
        let key = vals[i];
        let value = GM_getValue(key);
        if (value == '') {continue;}
        if (key.indexOf(filter_name) == -1) {continue;}
        addSavedFilter(filter_name, key, value);
    }
}

// Function to clear all saved filters, from UI and storage
function clearFilters(filter_name, fromApply=false) {
    let vals = GM_listValues();
    for (let i=0; i < vals.length; i++) {
        if (vals[i].indexOf(filter_name) < 0) {continue;}
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
    let statusText = disabled ? 'disabled' : 'enabled';
    alert('Installed Filters (currently' + statusText + '):' + text);
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

function enableButtonHandlers(content, filter_name) {
    // Handlers for button(s) on main chat
    let cfgButton = document.getElementById(filter_name + '-enable');
    if (validPointer(cfgButton) && !handlerBtns.cfgBtnOn) {
        cfgButton.addEventListener("click", function() {btnOnEnableClick(content, filter_name);});
        handlerBtns.cfgBtnOn = true;
    }

    let enableButton = document.getElementById(filter_name + '-cfg');
    if (validPointer(enableButton) && !handlerBtns.enableBtnOn) {
        enableButton.addEventListener("click", function() {btnOnConfigClick(content, filter_name);});
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
        applyButton.addEventListener("click", function(){btnOnApplyFilterClick(content, filter_name);}, false);
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
var chatSize = 0;          // Track parent resizing.

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

    let filtDiv = document.getElementById("xedx-filter-div"); // $('#xedx-filter-div')
    let elem = $(box).find('#'+filter_name);
    if (elem.length > 0 || validPointer(filtDiv)) { // Filter input exists -or- filterSpan created (config dialog)
        console.log('trigger 3: ', content);
        if (!disabled) {
            if (filterArray.length > 0) {
                console.log('Calling filter with entire array');
                filter(filter_name, content, /*keyword*/null);
            }
        }
        if (validPointer(filtDiv)) {return;}
    }

    //////////////////////////////////////////////////////
    // Set up menus/buttons/etc. on main chat window
    //////////////////////////////////////////////////////

    const input = $(box).find('div[class^=chat-box-input_]');
    const output = $(box).find('div[class^=chat-box-content_]');
    if (!validPointer(filtDiv)) { // Only do once!
        let edBtnText = disabled ? disabledBtnText : enabledBtnText;
        let edBtnColor = disabled ? btnDisabledColor : btnEnabledColor;
        $(input).before('<div id="xedx-filter-div">' +
                        '<span id="xedx-filter-span" style="vertical-align: middle; display:block; margin:0 auto; height: 14px; ' +
                        'border-left: 1px solid #a9a9a9; border-right: 1px solid #a9a9a9; ' +
                        'border-bottom: 1px solid #a9a9a9; background-color: #f2f2f2;">' +

                        /*
                         // Input field for filter - moved to Options dialog
                         '<label for="filter" style="color: green;">Filter: </label>' +
                         '<input type="text" size="12" id="' + filter_name + '" name="' + filter_name + '">' + //</span>' +
                         */

                        // Make some nifty light buttons
                        '<button type="button" id="' + filter_name + '-filtered" title="Blocked"' +
                        ' style="border-radius: 30%; border: 1px solid black; margin: 2px 2px 0px 8px; height: 10px; ' +
                        'width: 4%; background-color: Gainsboro;">&nbsp</button>' +
                        '<button type="button" id="' + filter_name + '-notfiltered" title="Allowed"' +
                        ' style="border-radius: 30%; border: 1px solid black; height: 10px; ' +
                        'width: 4%; background-color: Gainsboro">&nbsp</button>' +

                        // Options button
                        '<button type="button" id="' + filter_name + '-cfg' +
                        '" onclick="btnOnConfigClick()" title="Filter Options"' +
                        ' style="border-radius: 5px; border: 1px solid black; margin: 0px 10px 0px; height:10px; width: 34%;">' +
                        optionsBtnText + '</button>' +

                        // Enable/Disable button
                        '<button type="button" id="' + filter_name + '-enable' +
                        '" onclick="btnOnEnableClick()" title="Enable/Disable"' +
                        ' style="border-radius: 5px;  border: 1px solid black; margin: 0px 0px 0px; height:10px; width: 34%; ' +
                        'background-color: ' + edBtnColor + ';">' +
                        edBtnText + '</button>' +
                        '</span>' +
                        '</div>');

        console.log('Inserted xedx-filter-div');
        ResetHandlerFlags();

        // Need to modify chat box height, to compensate for new div.
        filtDiv = document.getElementById("xedx-filter-div"); // $('#xedx-filter-div')
        if (validPointer(filtDiv)/* && !chatSize*/) {
            if (!chatSize) chatSize = $(output).height() - $(filtDiv).height();
            $(output).height(chatSize);
            const viewport = $(output).find('div[class^=viewport_]');
            $(viewport).height(chatSize-1);

            // Remove when needed to re-create in proper place.
            $(output).on('DOMNodeRemoved DOMNodeInserted', function(e) {
                if (validPointer(e.target.className)) {
                    let at = e.target.className.indexOf('chat-box-content');
                    if (validPointer(filtDiv) && e.type == 'DOMNodeRemoved' && at != -1) {
                        $(filtDiv).remove();
                        filtDiv = null;
                    }
                }
            });
        }
    }

    ////////////////////////////////////////////////////////////
    // Build empty div for 'Options' dialog.
    ////////////////////////////////////////////////////////////

    let configDiv = document.getElementById('configure');
    if (!validPointer(configDiv)) { // Only do once!
        $(".body").append('<div id="configure" ' +
                          'style="background-color: LightGray; display: none; text-align: center;">' +
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
    if (true) /*!handlersInstalled())*/ {enableButtonHandlers(content, filter_name);}

    // Load saved filters - call once.
    if (!filtersLoaded) {
        loadSavedFilters(chat, filter_name);
        filtersLoaded = true;
    }

    // Get notifications on node insertion/deletion, in the chat box
    $(content).bind('DOMNodeInserted DOMNodeRemoved', function() {
        if (!disabled) {
            console.log('trigger 2 ', content);
            if (filterArray.length > 0) {filter(filter_name, content, null);}
            /*
            for (let i=0; i<filterArray.length; i++) {
                let keyword = filterArray[i];
                if (keyword.length > 0) {
                    console.log('Filtering on "' + keyword + '"');
                    filter(filter_name, content, keyword);
                }
            }
            */
        }
    });
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
                    cfgBase.style.display = "block";
                    $(this).dialog( "close" );
                },
            },
        ]
    };

function loadInitialState() {
    let state = GM_getValue('state');
    if (!validPointer(state) || state == 'Disabled') {
        disabled = true;
        GM_setValue('state', 'Disabled');
    } else {
        disabled = false;
        GM_setValue('state', 'Enabled');
    }

    let statusText = disabled ? 'disabled' : 'enabled';
    console.log('Loaded saved state. Status: ' + statusText);
}

////////////////////////////////////////////////////////////////////////////////////
// Main entry point
////////////////////////////////////////////////////////////////////////////////////

(function() {
    'use strict';

    console.log(GM_info.script.name + ' script started!');

    loadInitialState();

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
        loadInitialState();
        let chat = 'faction';
        let box = $('#chatRoot').find('div[class^=chat-box_][class*=' + chat + '_]');
        $(box).ready(addChatFilter(box, chat));
        let cfgBase = document.getElementById("configure");
        if (validPointer(cfgBase)) {cfgBase.style.display = "none";}
    };
})();



