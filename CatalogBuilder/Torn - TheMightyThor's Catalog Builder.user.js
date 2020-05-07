// ==UserScript==
// @name         Torn - TheMightyThor's Catalog Builder
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  Selects items in you invetory and docuemnts in an associated spreadsheet
// @author       xedx [2100735]
// @include      https://www.torn.com/bazaar.php*
// @include      https://www.torn.com/item.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// Set this to 'true' to upload each item as it is expanded,
// of 'false' to require the 'submit' button to tbe pressed.
var INSTANT_UPLOAD = true;

// This is just easier to read this way, instead of one line.
// Could also have be @required from a separate .js....
const xedx_main_div =
  '<div class="t-blue-cont h" id="xedx-main-div">' +
      '<div id="xedx-header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
          'TheMightyThor`s Inventory Builder</div>' +
      '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: auto; overflow: auto";>' +
          '<div id="button-div" style="text-align: center; vertical-align: middle; display: none;">' +
              '<span id="button-span">' +
                  '<button id="xedx-submit-btn" class="enabled-btn">Submit</button>' +
                  '<button id="xedx-view-btn" class="enabled-btn">View All</button>' +
                  '<button id="xedx-clear-btn" class="enabled-btn">Clear</button>' +
              '</span>' +
          '</div><div style="text-align: center; vertical-align: middle;>' +
              '<span id="input-span">Google Sheets URL: ' +
                  '<input id="xedx-google-key" type="text" style="font-size: 14px;' + // height: 24px;' +
                  'border-radius: 5px; margin: 0px 10px 10px 10px; border: 1px solid black; width: 450px;">' +
                  '<button id="xedx-save-btn" class="enabled-btn">Save</button>' +
              '</span>' +
          '</div>' +
      '</div>' +
  '</div>';

const enabledBtnStyle = '.enabled-btn {font-size: 14px; ' +
      'height: 24px;' +
      'text-align: center;' +
      'border-radius: 5px;' +
      'margin: 15px 40px;' +
      'background: LightGrey;' +
      'border: 1px solid black;' +
      '}';

const blueBtnStyle = '.blue-btn {font-size: 14px; ' +
      'height: 24px;' +
      'text-align: center;' +
      'border-radius: 5px;' +
      'margin: 15px 40px;' +
      'background: dodgerblue;' +
      'border: 1px solid black;' +
      '}';


const disabledBtnStyle = '.disabled-btn {font-size: 14px; ' +
      'height: 24px;' +
      'text-align: center;' +
      'border-radius: 5px;' +
      'margin: 15px 40px;' +
      'background: white;' +
      'border: 1px solid black;' +
      '}';

const strSuccess = 'Success';

var isBazaar = false;
var isItems = false;

(function() {
    'use strict';

    var detectedItemsArray = [];
    var detectedItemsHashTable = [];
    var google_sheets_key = "";
    var profileId = "";
    var spreadsheetURL = '';
        //'https://script.google.com/macros/s/AKfycbyT0L4R0ewjEs0-1CeqUWeBUR---jhbcy-NaFZQinayEDZBLDI/exec';

    /////////////////////////////////////////////////////////////////
    // Look for an item that has been expanded, and grab it's info
    /////////////////////////////////////////////////////////////////

    function trapItemDetails(observer) {
        if (doingBazaarMaintainance()) {
            if ($('#xedx-main-div').length > 0) {
                $(targetNode).unbind('DOMNodeInserted');
                $('#xedx-main-div').remove();
            }
            return;
        }
        buildUI(); // If needed...

        console.log(GM_info.script.name + ': mutation observed ==> trapItemDetails', observer);

        // Set up all vars here as they vary, bazaar or items.
        let parentDiv = null;
        let owlItem = null;
        let clearfix = null;
        let pricingUl = null;
        let statsUl = null;

        if (isItems) {
            parentDiv = itemsGetActiveClass();
        } else {
            parentDiv = $('div.ReactVirtualized__Grid').get();
        }
        if (!validPointer(parentDiv) || !parentDiv.length) {return;}

        owlItem = isBazaar ? $(parentDiv).find('div.info___3-0WL').get() :
                             $(parentDiv).find('li.show-item-info.bottom-round').get();
        if (!owlItem.length || !validPointer(owlItem)) {return;}

        clearfix = $(owlItem).find('div.info-content > div.clearfix.info-wrap')[0];
        if (!validPointer(clearfix)) {return;}

        pricingUl = $(clearfix).find('ul.info-cont')[0];
        if (!validPointer(pricingUl)) {return;}

        statsUl = $(clearfix).find('ul.info-cont.list-wrap')[0];
        if (!validPointer(statsUl)) {return;}

        let newItem = getNewItem();

        // We give a unique ID to a root node that persists (I hope)
        // to prevent doing this more than once. We also hash the
        // resulting object to prevent array insertion more than once
        // in case this fails for whatever reason. The hash value is
        // saved in a separate array.
        if (isItemTagged(pricingUl, newItem)) {return;}

        getNameTypeItemInfo(owlItem, newItem);
        getPricingInfo(pricingUl, newItem);
        getStatInfo(statsUl, newItem);

        console.log('newItem: ', newItem);

        // Generate a unique hash value for this, so as not to add twice.
        // Should never get here if already added.
        // The hash can't be part of the data, for obvious reasons - at
        // least not when calculating the hash. But we can add it to be saved
        // into the spreadsheet, to prevent inserting duplicates, if you go to the
        // same place twice by mistake.
        let jsonData = JSON.stringify(newItem);
        let hash = jsonData.hashCode();

        console.log('Hashcode for the ' + newItem.name + ': ' + hash);
        if (!detectedItemsHashTable.includes(hash)) {
            detectedItemsHashTable.push(hash);

            // We add the hash value to the item immediately before pushing onto our array.
            // This allows it to be recorded by the Google Sheets script, to prevent
            // duplicates from being inserted into the sheet.
            newItem.hash = hash.toString();
            detectedItemsArray.push(newItem);
            console.log('Pushed a "' + newItem.name + '" onto array');
        }

        if (INSTANT_UPLOAD) {
            submitFunction();
        }
    }

    // For the items page, get active 'class' - melee,secondary, primary
    function itemsGetActiveClass() {
        if ($("#melee-items").attr('aria-hidden') == 'false') {return $("#melee-items").get();}
        if ($("#secondary-items").attr('aria-hidden') == 'false') {return $("#secondary-items").get();}
        if ($("#primary-items").attr('aria-hidden') == 'false') {return $("#primary-items").get();}
    }


    /////////////////////////////////////////////////////////////////
    // Function to add an ID to items we've visited. This prevents us
    // from doing the same work twice. Doesn't work quite as expected.
    // Prevents some multiple calls, but the div or ID is not
    // persisted if the item selected changes.
    /////////////////////////////////////////////////////////////////

    function isItemTagged(element, newItem) {
        let itemActive = null;
        if (isBazaar) {
            let parentRowDiv = $(element).parents('div.row___3NY9_').get();
            // Don't need *both* of these, do we?
            // let itemActiveParent = $(parentRowDiv).find('div.item___2GvHm.item___-mxOy.viewActive___1ODG2')[0];
            let itemActive = $(parentRowDiv).find('div.item___2GvHm.item___-mxOy.viewActive___1ODG2 > div.itemDescription___3bOmj')[0];
        } else if (isItems) {
            itemActive = element;
        }
        if (!validPointer(itemActive)) {
            return false;
        }
        let id = itemActive.id;
        if (id == "" || !validPointer(id)) {
            itemActive.id = 'xedx-' + Math.random();
        } else {
            return true;
        }

        /* Not working, not persistent.
        let testTag = $(itemActive).find('div.xedx');
        if (testTag.length) {
            console.log('Found "xedx" div.');
            return true;
        } else {
            $(itemActive).append('<div class="xedx"></div>');
            console.log('Added "xedx" div');
        }
        */

        return false;
    }

    /////////////////////////////////////////////////////////////////
    // Functions to pick apart various nodes to get info we want
    /////////////////////////////////////////////////////////////////

    function getNewItem() {
        return {name: 'TBD',       // <== getNameTypeItemInfo
                type: 'TBD',       // <== getNameTypeItemInfo
                dmg: 'TBD',        // <== getStatInfo
                acc: 'TBD',        // <== getStatInfo
                quality: 'TBD',    // <== getStatInfo
                buy: 'TBD',        // <== getPricingInfo
                sell: 'TBD',       // <== getPricingInfo
                value: 'TBD',      // <== getPricingInfo
                circ: 'TBD',       // <== getPricingInfo
                asking: 'N/A',     // <== getPricingInfo
                id: profileId,     // <== buildUi
                hash: 0,
                };
    }

    /////////////////////////////////////////////////////////////////
    // Fill damage, accuracy and quality item info data members
    /////////////////////////////////////////////////////////////////

    function getStatInfo(element, newItem) {
        let liList = element.getElementsByTagName('li');
        let dmgLi = liList[0], accLi = liList[1]; //, qLi = liList[6];

        newItem.dmg = $(dmgLi).find('div.desc').get()[0].innerText.trim();
        newItem.acc = $(accLi).find('div.desc').get()[0].innerText.trim();

        // Quality LI position varies. All these can be found by class='title'
        // 'Damage:', 'Accuracy:', 'Quality:', etc. Find qLi that way.
        // Should prob do the same for *all* the stuff we're looking for.
        for (let i=0; i < liList.length; i++) {
            let titleDiv = $(liList[i]).find('div.title').get()[0];
            if (validPointer(titleDiv)) {
                if (titleDiv.innerText.trim() == 'Quality:') {
                    let desc = $(liList[i]).find('div.desc').get()[0];
                    if (validPointer(desc)) {newItem.quality = desc.innerText.trim();}
                }
            } else {
                //debugger;
            }
        }
    }

    /////////////////////////////////////////////////////////////////
    // Fill buy, sell, value, asking price and circulation item data members
    /////////////////////////////////////////////////////////////////

    function getPricingInfo(element, newItem) {
        let liList = element.getElementsByTagName('li');
        let buyLi = liList[0], sellLi = liList[1], valueLi = liList[2], circLi = liList[3];

        newItem.buy = $(buyLi).find('div.desc').get()[0].innerText;
        newItem.sell = $(sellLi).find('div.desc').get()[0].innerText;
        newItem.value = $(valueLi).find('div.desc').get()[0].innerText;
        newItem.circ = $(circLi).find('div.desc').get()[0].innerText;

        if (isBazaar) {
            let parentRowDiv = $(element).parents('div.row___3NY9_').get();
            let itemActive = $(parentRowDiv).find('div.item___2GvHm.item___-mxOy.viewActive___1ODG2')[0];
            newItem.asking = $(itemActive).find('p.price___8AdTw').get()[0].innerText;
        }
    }

    /////////////////////////////////////////////////////////////////
    // Fill name and type item data members.
    /////////////////////////////////////////////////////////////////

    function getNameTypeItemInfo(element, newItem) {
        let itemWrap = $(element).find('div.clearfix.info-wrap > div.item-cont > div.item-wrap').get()[0];
        let spanWrap = $(itemWrap).find('span.info-msg > div.m-bottom10 > span.bold').get()[0];
        let name = $(spanWrap).text();
        if (name.indexOf('The') == 0) {name = name.slice(4);}

        let infoMsg = $(itemWrap).find('span.info-msg > div.m-bottom10').get()[0];
        let type = $(infoMsg).text();

        // May be 'are a' or 'is a', search both
        let at = type.indexOf('are a ');
        if (at == -1) {at = type.indexOf('is a ');}
        let end = type.indexOf('Weapon.');
        if (end == -1) {end = type.indexOf('.');}
        if (end < 0) {end = 0;}
        if (at >= 0) {type = type.slice(at+6, end-1);}

        newItem.name = name;
        newItem.type = type;
    }

    //////////////////////////////////////////////////////////////////
    // Function to create a hash for a string. Returns a positive
    // 32 bit int.
    //////////////////////////////////////////////////////////////////

    String.prototype.hashCode = function(){
    var hash = 0;
    for (var i = 0; i < this.length; i++) {
        var character = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

    /////////////////////////////////////////////////////////////////
    // Initializing the UI - display, install handlers, etc.
    // Update: Now we build the same UI, but in three different
    // places - the Bazaar screen, personal items page, and the
    // item market page.
    /////////////////////////////////////////////////////////////////

    function buildUI() {
        let parentDiv = null;
        let nextDiv = null;

        GM_addStyle(enabledBtnStyle);
        GM_addStyle(disabledBtnStyle);
        GM_addStyle(blueBtnStyle);

        if (isBazaar) {
            parentDiv = document.getElementsByClassName('searchBar___F1E8s')[0]; // Search/sort options
            nextDiv = document.getElementsByClassName('segment___38fN3')[0];     // Items grid
        } else if (isItems) {
            parentDiv = $('#mainContainer').find('div.main-items-cont-wrap >' +  // "Your Items"
                                                 'div.equipped-items-wrap').get();
            nextDiv = $('#mainContainer').find('div.main-items-cont-wrap > div.items-wrap.primary-items');
        } else {
            return;
        }

        if (!validPointer(parentDiv)) {return;}                                  // Wait until enough is loaded
        if (!validPointer(nextDiv)) {return;}                                    // ...
        if (validPointer(document.getElementById('xedx-main-div'))) {return;}    // Do only once

        $(xedx_main_div).insertAfter(parentDiv);
        $(separator).insertAfter(parentDiv);

        $(targetNode).unbind('DOMNodeInserted');

        if (!INSTANT_UPLOAD) {
            let btnDiv = document.getElementById('button-div');
            btnDiv.style.display = "block";
        }

        let urlInput = document.getElementById('xedx-google-key');
        let value = GM_getValue('xedx-google-key');
        if (typeof value != 'undefined' && value != null && value != '') {
            urlInput.value = value;
        }

        installHandlers(); // Hook up buttons

        //disableButtons(); // Temporary - testing enable/disable
        //enableButtons();

        // Save the user ID of this bazaar
        profileId = isBazaar ? useridFromProfileURL(window.location.href) : 'me';

        return strSuccess; // Return value is currently unused
    }

    /////////////////////////////////////////////////////////////////
    // enable/Disable all buttons - or set to blue.
    /////////////////////////////////////////////////////////////////

    function enableButtons(id=null) {disableEnableButtons(false, id);}
    function disableButtons(id=null) {disableEnableButtons(true, id);}

    /////////////////////////////////////////////////////////////////
    // Diable/Enable one or all buttons - true to disable, false to enable
    /////////////////////////////////////////////////////////////////

    function disableEnableButtons(value, id) {
        if (id == null) {
            let span = document.getElementById('button-span');
            let btns = span.getElementsByTagName('button');
            for (let i=0; i<btns.length; i++) {
                btns[i].disabled = value;
                if (value) {btns[i].className = 'blue-btn';}
                else {btns[i].className = 'enabled-btn';}
            }
        } else {
            // blueBtnStyle
            let btn = document.getElementById(id);
            btn.disabled = value;
            if (value) {btn.className = 'blue-btn';}
                else {btn.className = 'enabled-btn';}
        }
    }

    /////////////////////////////////////////////////////////////////
    // Install button handlers
    /////////////////////////////////////////////////////////////////

    function installHandlers() {
        let myButton = document.getElementById('xedx-submit-btn');
        myButton.addEventListener('click',function () {
            submitFunction();
        });

        myButton = document.getElementById('xedx-view-btn');
        myButton.addEventListener('click',function () {
            viewFunction();
        });

        myButton = document.getElementById('xedx-clear-btn');
        myButton.addEventListener('click',function () {
            clearInventoryData();
        });

        myButton = document.getElementById('xedx-save-btn');
        myButton.addEventListener('click',function () {
            saveSheetsUrl();
        });
    }

    /////////////////////////////////////////////////////////////////
    // Send to our content service provider
    //
    // This POSTS to the entered Google Sheets Content Service provider.
    // Response TBD...
    /////////////////////////////////////////////////////////////////

    function readyState(state) {
        switch (state) {
            case 0: return 'UNSENT'; // UNSENT	Client has been created. open() not called yet.
            case 1: return 'OPENED'; // open() has been called.
            case 2: return 'HEADERS_RECEIVED'; // send() has been called, and headers and status are available.
            case 3: return 'LOADING'; // Downloading; responseText holds partial data.
            case 4: return 'DONE';
        }
        return 'Unknown';
    }

    function submitFunction() {
        if (detectedItemsArray.length == 0) {
            if (!INSTANT_UPLOAD) {
                alert('No data to upload!');
            }
            return;
        }

        //alert('Please wait while data is uploaded...');
        let url = document.getElementById('xedx-google-key').value;
        if (url == '') {
            url = GM_getValue('xedx-google-key');
            if (url == '' || typeof url == 'undefined') {
                alert('You must enter the Google Sheets URL!');
                return;
            }
        }
        saveSheetsUrl(url);

        let data = JSON.stringify(detectedItemsArray);
        console.log(GM_info.script.name + ' Posting data to ' + url);
        disableButtons('xedx-submit-btn');
        let details = GM_xmlhttpRequest({
            method:"POST",
            url:url,
            data:data,
            //data:detectedItemsArray[0],
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            onload: function(response) {
                console.log(GM_info.script.name + ': submitFunctionCB: ' + response.responseText);
                submitFunctionCB(response.responseText);
            },
            onerror: function(response) {
                enableButtons('xedx-submit-btn');
                console.log(GM_info.script.name + ': onerror');
                handleScriptError(response);
            },
            onabort: function(response) {
                enableButtons('xedx-submit-btn');
                console.log(GM_info.script.name + ': onabort');
                handleSysError(response);
            },
            ontimeout: function(response) {
                enableButtons('xedx-submit-btn');
                console.log(GM_info.script.name +': ontimeout');
                handleScriptError(response);
            }
        });
    }

    // Callback for above...
    function submitFunctionCB(responseText) {
        enableButtons('xedx-submit-btn');
        if (responseText.indexOf('<!DOCTYPE html>') != -1) {
            var newWindow = window.open();
            newWindow.document.body.innerHTML = responseText;
            return;
        }

        let jsonResp = JSON.parse(responseText); // Only needed is response is expected as stringified JSON
        if (jsonResp.error) {return handleError(responseText);}

        let result = jsonResp.result;
        let output = '';
        if (result.indexOf('Success') != -1) {
            clearInventoryData(true);
            let start = result.indexOf('Processed');
            let end = result.indexOf('.') + 1;
            let msg1 = result.slice(start, end);
            let start2 = result.indexOf('Found');
            let msg2 = result.slice(start2);
            output = 'Success!\n\n' + msg1 + '\n' + msg2;
        } else {
            output = 'An error has occurred!\nDetails:\n\n' + responseText;
        }

        if (!INSTANT_UPLOAD) {
            alert(output);
        }
    }

    function handleScriptError(response) {
        let errorText = GM_info.script.name + ': An error has occurred submitting data:\n\n' +
            response.error;

        console.log(errorText);
        alert(errorText + '\n\nPress OK to continue.');
    }

    /////////////////////////////////////////////////////////////////
    // Preview what will be sent (mostly for debugging purposes)
    /////////////////////////////////////////////////////////////////

    function viewFunction() {
        let text = 'Inventory to be uploaded (total ' + detectedItemsArray.length + ' items):';
        for (let i=0; i<detectedItemsArray.length; i++) {
            let item = detectedItemsArray[i];
            let hash = JSON.stringify(item).hashCode();
            text = text + '\n\nName: ' + item.name + ' (' + item.type + ')\n\t' +
                'Damage: ' + item.dmg +' Accuracy: ' + item.acc +' Quality: ' + item.quality + '\n\t' +
                'Buy: ' + item.buy + ' Sell: ' + item.sell + ' Value: ' + item.value + '\n\t' +
                'Asking Price: ' + item.asking + ' Profile ID: ' + item.id + '\n\t' +
                'Hashcode (debugging): ' + hash;
        }
        alert(text);
    }

    /////////////////////////////////////////////////////////////////
    // Clear saved data - erase the array. Could do inline.
    /////////////////////////////////////////////////////////////////

    function clearInventoryData(silent=false) {
        detectedItemsArray = [];
        if (!silent) {
            alert('All data cleared. Select "view" to verify (if you don`t believe me!).');
        }
    }

    /////////////////////////////////////////////////////////////////////////
    // Save the URL to our Google Sheets script (content service provider).
    // Could do inline.
    /////////////////////////////////////////////////////////////////////////

    function saveSheetsUrl(useUrl=null) {
        let url = useUrl;
        if (url == null) {
            url = document.getElementById('xedx-google-key').value;
        }
        if (url == '' || url == null) {
            alert('You must enter the Google Sheets URL!');
            return;
        }
        spreadsheetURL = url;
        GM_setValue('xedx-google-key', url);
    }

    // Return 'true' if on our own bazaar page...
    function doingBazaarMaintainance() {
        let loc = window.location.href;
        if (loc.indexOf('add') > 0 || loc.indexOf('manage') > 0 || loc.indexOf('personalize') > 0) {
            console.log('Nothing to see here, just doing maintainace on my own Bazaar...');
            return true;
        }
        return false;
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //
    // Update: Now we build the same UI, but in three different
    // places - the Bazaar screen, personal items page, and the
    // item market page.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    if (window.location.href.indexOf('bazaar') > 0) {
        isBazaar = true;
        isItems = false;
    } else if (window.location.href.indexOf('item.php') > 0) {
        isBazaar = false;
        isItems = true;
    } else {
        return;
    }

    console.log(GM_info.script.name + ': Building UI for ' + (isBazaar ? 'Bazaar page' : 'Items page'));

    var targetNode = isBazaar ? document.getElementById('bazaarroot') : document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        trapItemDetails(observer);
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    window.onload = function () {
        console.log('onLoad ==> buildUI');
        buildUI();

        // Will be unbound once UI is in place.
        $(targetNode).bind('DOMNodeInserted', function(e) {
            console.log(e.type + ' ==> trapItemDetails');
            trapItemDetails();
        });
    };

    // If there is anything saved and not yet uploaded, prompt the user.
    let goingAwayText = 'You have items yet to be uploaded. If you leave, you will lose any unsaved changes.';
    window.addEventListener('beforeunload', (event) => {
        if (detectedItemsArray.length) {
            if (!INSTANT_UPLOAD) {
                // Cancel the event as stated by the standard.
                event.preventDefault();
                // Chrome requires returnValue to be set.
                event.returnValue = goingAwayText;
            }
        }
        });

})();




