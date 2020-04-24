// ==UserScript==
// @name         Torn - TheMightyThor's Catalog Builder
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Selects items in you invetory and docuemnts in an associated spreadsheet
// @author       xedx [2100735]
// @include      https://www.torn.com/item.php
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
          '<div style="text-align: center">' +
              '<span id="button-span">' +
                  '<button id="xedx-submit-btn" class="btn-dark-bg">Submit</button>' +
                  '<button id="xedx-view-all-btn" class="btn-dark-bg">View All</button>' +
                  '<button id="xedx-view-primary-btn" class="btn-dark-bg">View Primary</button>' +
                  '<button id="xedx-view-secondary-btn" class="btn-dark-bg">View Secondary</button>' +
                  '<button id="xedx-view-melee-btn" class="btn-dark-bg">View Melee</button>' +
                  //'<button id="xedx-view-temp-btn" class="btn-dark-bg">View Temporary</button>' +
                  //'<button id="xedx-view-armor-btn" class="btn-dark-bg">View Armor</button>' +
                  '<button id="xedx-reload-btn" class="btn-dark-bg">Reload</button>' +
                  //'<input id="xedx-slot-turns" type="number" style="font-size: 14px; height: 24px; text-align: center;' +
                  //'border-radius: 5px; margin: 15px 40px; border: 1px solid black;">' +
                  //'<B>Daily Dime tickets</B>' +

              '</span>' +
          '</div>' +
      '</div>' +
  '</div>';

const separator = '<hr class = "delimiter-999 m-top10 m-bottom10">'; // Moved to helper lib

const spreadsheetURL = ''; // URL for the content service provider

const primaryItemsId = 'primary-items';
const secondaryItemsId = 'secondary-items';
const meleeItemsId = 'melee-items';
const tempItemsId = 'temporary-items';
const armorItemsId = 'armour-items';

const allItemsList = [primaryItemsId, secondaryItemsId, meleeItemsId]; //, tempItemsId, armorItemsId];

(function() {
    'use strict';

    var categoryDiv = null;
    var primaryItemArray = [];
    var secondaryItemArray = [];
    var meleeItemArray = [];
    var tempItemArray = [];
    var armorItemArray = [];

    // Build the simple UI associated with this
    function buildUI() {
        let parentDiv = document.getElementsByClassName('equipped-items-wrap')[0];
        if (!validPointer(parentDiv)) {return;}
        if (validPointer(document.getElementById('xedx-main-div'))) {return;} // Do only once

        $(parentDiv).append(separator);
        $(parentDiv).append(xedx_main_div);

        installHandlers();
        categoryDiv = document.getElementById('category-wrap');

        disableButtons();
        loadInventoryData();
        enableButtons();
    }

    // Load data for all of categories we're interested in
    function loadInventoryData() {
        for (let i=0; i < allItemsList.length; i++) {
            queryItemGroupInfo(allItemsList[i]);
        }
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
        }
    }

    // Install button handlers
    function installHandlers() {
        let myButton = document.getElementById('xedx-submit-btn');
        myButton.addEventListener('click',function () {
            submitFunction();
        });

        myButton = document.getElementById('xedx-view-all-btn');
        myButton.addEventListener('click',function () {
            viewFunction();
        });

        myButton = document.getElementById('xedx-view-primary-btn');
        myButton.addEventListener('click',function () {
            viewGroupFunction(primaryItemArray);
        });

        myButton = document.getElementById('xedx-view-secondary-btn');
        myButton.addEventListener('click',function () {
            viewGroupFunction(secondaryItemArray);
        });

        myButton = document.getElementById('xedx-view-melee-btn');
        myButton.addEventListener('click',function () {
            viewGroupFunction(meleeItemArray);
        });

        /*
        myButton = document.getElementById('xedx-view-temp-btn');
        myButton.addEventListener('click',function () {
            viewGroupFunction(tempItemArray);
        });

        myButton = document.getElementById('xedx-view-armor-btn');
        myButton.addEventListener('click',function () {
            viewGroupFunction(armorItemArray);
        });
        */

        myButton = document.getElementById('xedx-reload-btn');
        myButton.addEventListener('click',function () {
            loadInventoryData();
        });
    }

    // Send to our content service provider
    function submitFunction() {
        alert('Please wait while data is uplaoded...');
    }

    // Preview what will be sent (mostly for debugging purposes)
    function viewFunction() {
        alert('Inventory to be uploaded:');
    }

    function viewGroupFunction(groupArray) {
        let text = "Inventory:\n\n";
        for (let i=0; i < groupArray.length; i++) {
            text = text + 'Name: ' + groupArray[i].name + '\n' +
                'Damage: ' + groupArray[i].dmg + '\n' +
                'Accuray: ' + groupArray[i].acc + '\n\n';
        }

        alert(text);
    }

    // See if a given <ul> (item category) is active, by ID
    function isItemActive(itemId) {
        let ul = document.getElementById(itemId);
        if (!validPointer(ul)) {return false;} // Doesn't exist yet

        let attr = $(ul).attr('aria-hidden');
        if (attr == true) {return false;} // Hidden

        return true;
    }

    // Get the id of the active category selected
    function getActiveCategory() {
        let id = '';
        let ul = categoryDiv.getElementsByTagName('ul')[0];
        let liList = ul.getElementsByTagName('li');
        for (let i=0; i < liList.length; i++) {
            let li = liList[i];
            let selected = li.getAttribute('aria-selected');
            if (selected) {id = li.getAttribute('aria-controls');}
        }

        return id;
    }

    // Build an array of item info: name, accuracy and damage, where applicable
    // This builds from an entire group, such as primary-items. groupId is the ID
    // of the <ul> containing items in the category.
    function queryItemGroupInfo(groupId) {
        let ul = document.getElementById(groupId);
        let liList = $(ul).children();

        for (let i=0; i<liList.length; i++) {
            let li = liList[i];
            let value = queryItemInfo(li);
            pushArrayItem(groupId, value);
        }

    }

    // Get info for one item, represented by an <li> in the <ul>
    // representing a given category.
    // Returns an object: {name, acc, dmg}
    function queryItemInfo(li) {
        let damage = 'N/A', accuracy = 'N/A', name = 'N/A';
        let bonusesUl = $(li).find('ul.bonuses-wrap')[0];
        if (validPointer(bonusesUl)) {damage = bonusesUl.children[0].innerText;}
        if (validPointer(bonusesUl)) {accuracy = bonusesUl.children[1].innerText;}

        let thumbnail = $(li).find('div.thumbnail-wrap');
        if (validPointer(thumbnail)) {name = $(thumbnail).attr('aria-label');}

        let rVal = {'name': name, 'dmg': damage, 'acc': accuracy};
        return rVal;
    }

    // Push an item onto the correct array
    function pushArrayItem(groupId, value) {
        switch (groupId) {
            case primaryItemsId:
                primaryItemArray.push(value);
                break;
            case secondaryItemsId:
                return secondaryItemArray.push(value);
                break;
            case meleeItemsId:
                return meleeItemArray.push(value);
                break;
            case tempItemsId:
                return tempItemArray.push(value);
                break;
            case armorItemsId:
                return armorItemArray.push(value);
                break;
        }
    }

    // Clears the array associated with item group
    function clearGroupArray(groupId) {
        switch (groupId) {
            case primaryItemsId:
                return primaryItemArray.slice();
            case secondaryItemsId:
                return secondaryItemArray.slice();
            case meleeItemsId:
                return meleeItemArray.slice();
            case tempItemsId:
                return tempItemArray.slice();
            case armorItemsId:
                return armorItemArray.slice();
        }
        return null;
    }


    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();

    var targetNode = document.getElementById('category-wrap');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        buildUI();
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
})();




