// ==UserScript==
// @name         Torn - TheMightyThor's Catalog Builder
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Selects items in you invetory and docuemnts in an associated spreadsheet
// @author       xedx [2100735]
// @include      https://www.torn.com/bazaar.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

// This is just easier to read this way, instead of one line.
// Could also have be @required from a separate .js....
const xedx_main_div =
  '<div class="t-blue-cont h" id="xedx-main-div">' +
      '<div id="xedx-header_div" class="title main-title title-black active top-round" role="heading" aria-level="5">' +
          'TheMightyThor`s Inventory Builder</div>' +
      '<div id="xedx-content-div" class="cont-gray bottom-round" style="height: 60px; overflow: auto">' +
          '<div style="text-align: center; vertical-align: middle;">' +
              '<span id="button-span">' +
                  '<button id="xedx-submit-btn" class="enabled-btn">Submit</button>' +
                  '<button id="xedx-view-btn" class="enabled-btn">View All</button>' +
                  '<button id="xedx-clear-btn" class="enabled-btn">Clear</button>' +
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

const disabledBtnStyle = '.disabled-btn {font-size: 14px; ' +
      'height: 24px;' +
      'text-align: center;' +
      'border-radius: 5px;' +
      'margin: 15px 40px;' +
      'background: white;' +
      'border: 1px solid black;' +
      '}';

const strSuccess = 'Success';
const separator = '<hr class = "delimiter-999 m-top10 m-bottom10">'; // Moved to helper lib
const spreadsheetURL = ''; // URL for the content service provider


(function() {
    'use strict';

    var detectedItemsArray = [];
    var detectedItemsHashTable = [];

    /////////////////////////////////////////////////////////////////
    // Look for an item that has been expanded, and grab it's info
    /////////////////////////////////////////////////////////////////

    function trapItemDetails() {
        buildUI(); // If needed...

        let parentDiv = $('div.ReactVirtualized__Grid').get();
        if (!validPointer(parentDiv) || !parentDiv.length) {return;}

        let owlItem = $(parentDiv).find('div.info___3-0WL').get();
        if (!validPointer(owlItem) || !owlItem.length) {return;}

        let clearfix = $(owlItem).find('div.info-content > div.clearfix.info-wrap')[0];
        let pricingUl = $(clearfix).find('ul.info-cont')[0];
        let statsUl = $(clearfix).find('ul.info-cont.list-wrap')[0];

        let newItem = getNewItem();

        // We give a unique ID to a root node that persists (I hope)
        // to prevent doing this more than once. We also hash the
        // resulting object to prevent array insertion more than once
        // in case this fails for whatever reason. The hash value is
        // saved in a separate array.
        if (isItemTagged(pricingUl, newItem)) {return;}

        console.log('mutation observed ==> trapItemDetails');

        getNameTypeItemInfo(owlItem, newItem);
        getPricingInfo(pricingUl, newItem);
        getStatInfo(statsUl, newItem);

        // Generate a unique hash value for this, so as not to add twice.
        // Should never get here if already added.
        let jsonData = JSON.stringify(newItem);
        let hash = jsonData.hashCode();

        console.log('Hashcode for the ' + newItem.name + ': ' + hash);
        if (!detectedItemsHashTable.includes(hash)) {
            detectedItemsHashTable.push(hash);
            detectedItemsArray.push(newItem);
            console.log('Pushed a "' + newItem.name + '" onto array');
        }
    }

    /////////////////////////////////////////////////////////////////
    // Function to add an ID to items we've visited. This prevents us
    // from doing the same work twice.
    /////////////////////////////////////////////////////////////////

    function isItemTagged(element, newItem) {
        let parentRowDiv = $(element).parents('div.row___3NY9_').get();
        let itemActiveParent = $(parentRowDiv).find('div.item___2GvHm.item___-mxOy.viewActive___1ODG2')[0];
        let itemActive = $(parentRowDiv).find('div.item___2GvHm.item___-mxOy.viewActive___1ODG2 > div.itemDescription___3bOmj')[0];
        let id = itemActive.id;
        if (id == "" || !validPointer(id)) {
            itemActive.id = 'xedx-' + Math.random();
            //console.log('Item not tagged - tagged as ' + itemActive.id);
        } else {
            //console.log('Item already tagged as ' + id);
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
                asking: 'TBD',
                };
    }

    function getStatInfo(element, newItem) {
        let liList = element.getElementsByTagName('li');
        let dmgLi = liList[0], accLi = liList[1], qLi = liList[6];

        newItem.dmg = $(dmgLi).find('div.desc').get()[0].innerText.trim();
        newItem.acc = $(accLi).find('div.desc').get()[0].innerText.trim();

        let tmp = $(qLi).find('div.desc').get()[0];
        if (validPointer(tmp)) {newItem.quality = $(qLi).find('div.desc').get()[0].innerText.trim();}
    }

    function getPricingInfo(element, newItem) {
        let liList = element.getElementsByTagName('li');
        let buyLi = liList[0], sellLi = liList[1], valueLi = liList[2], circLi = liList[3];

        newItem.buy = $(buyLi).find('div.desc').get()[0].innerText;
        newItem.sell = $(sellLi).find('div.desc').get()[0].innerText;
        newItem.value = $(valueLi).find('div.desc').get()[0].innerText;
        newItem.circ = $(circLi).find('div.desc').get()[0].innerText;

        let parentRowDiv = $(element).parents('div.row___3NY9_').get();
        let itemActive = $(parentRowDiv).find('div.item___2GvHm.item___-mxOy.viewActive___1ODG2')[0];
        newItem.asking = $(itemActive).find('p.price___8AdTw').get()[0].innerText;
    }

    function getNameTypeItemInfo(element, newItem) {
        let itemWrap = $(element).find('div.clearfix.info-wrap > div.item-cont > div.item-wrap').get()[0];
        let spanWrap = $(itemWrap).find('span.info-msg > div.m-bottom10 > span.bold').get()[0];
        let name = $(spanWrap).text();
        if (name.indexOf('The') == 0) {name = name.slice(4);}

        let infoMsg = $(itemWrap).find('span.info-msg > div.m-bottom10').get()[0];
        let type = $(infoMsg).text();
        let at = type.indexOf('is a ');
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
    /////////////////////////////////////////////////////////////////

    function buildUI() {

        GM_addStyle(enabledBtnStyle);
        GM_addStyle(disabledBtnStyle);

        let parentDiv = document.getElementsByClassName('searchBar___F1E8s')[0]; // Search/sort options
        let nextDiv = document.getElementsByClassName('segment___38fN3')[0];     // Items grid
        if (!validPointer(parentDiv)) {return;}                                  // Wait until enough is loaded
        if (!validPointer(nextDiv)) {return;}                                    // ...
        if (validPointer(document.getElementById('xedx-main-div'))) {return;}    // Do only once

        $(xedx_main_div).insertAfter(parentDiv);
        $(separator).insertAfter(parentDiv);

        $(targetNode).unbind('DOMNodeInserted');

        installHandlers(); // Hook up buttons

        //disableButtons(); // Temporary - testing enable/disable
        //enableButtons();

        return strSuccess; // Return value is currently unused
    }

    // enable/Disable all buttons
    function enableButtons() {disableEnableButtons(false);}
    function disableButtons() {disableEnableButtons(true);}

    // Diable/Enable all buttons - true to disable, false to enable
    function disableEnableButtons(value) {
        let span = document.getElementById('button-span');
        let btns = span.getElementsByTagName('button');
        for (let i=0; i<btns.length; i++) {
            btns[i].disabled = value;
            if (value) {btns[i].className = 'disabled-btn';}
            else {btns[i].className = 'enabled-btn';}
        }
    }

    // Install button handlers
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
    }

    // Send to our content service provider
    function submitFunction() {
        alert('Please wait while data is uplaoded...');
    }

    // Preview what will be sent (mostly for debugging purposes)
    function viewFunction() {
        let text = 'Inventory to be uploaded (total ' + detectedItemsArray.length + ' items):';
        for (let i=0; i<detectedItemsArray.length; i++) {
            let item = detectedItemsArray[i];
            let hash = JSON.stringify(item).hashCode();
            text = text + '\n\nName: ' + item.name + ' (' + item.type + ')\n\t' +
                'Damage: ' + item.dmg +' Accuracy: ' + item.acc +' Quality: ' + item.quality + '\n\t' +
                'Buy: ' + item.buy + ' Sell: ' + item.sell + ' Value: ' + item.value + '\n\t' +
                'Asking Price: ' + item.asking + '\n\t' +
                'Hashcode (debugging): ' + hash;
        }
        alert(text);
    }

    // Load data
    function clearInventoryData() {
        detectedItemsArray = [];
        alert('All data cleared. Select "view" to verify (if you don`t believe me!).');
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    var targetNode = document.getElementById('bazaarroot');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        //console.log('mutation observed ==> trapItemDetails');
        trapItemDetails();
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

})();




