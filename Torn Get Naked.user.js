// ==UserScript==
// @name         Torn Get Naked
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Equip/Unequio items (armor and weapons) with one click
// @author       xedx [2100735]
// @include      https://www.torn.com/item.php
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

    // Text displayed as a confirmation after re-equip/un-quip/reset has finished.
    var dialogText = '';

    // Counter used to track re-equip/un-equip progress
    var classesProcessed = 0;

    //////////////////////////////////////////////////////////////////////
    // Utility funstions
    //////////////////////////////////////////////////////////////////////

    // Check to see if a pointer is valid
    function validPointer(val, dbg = false) {
        if (val == 'undefined' || typeof val == 'undefined' || val == null) {
            if (dbg) {
                debugger;
            }
            return false;
        }
        return true;
    }

    // Parse the name from our storage of name/id pairs
    function parseSavedName(val) {
        if (!validPointer(val)) {
            return '';
        }
        var start = val.indexOf('name:') + 6;
        var name = val.slice(start, val.length);
        return name;
    }

    // Parse the ID from our saved name/ID pairs
    function parseSavedId(val) {
        if (!validPointer(val)) {
            return '';
        }
        var start = val.indexOf('id:') + 4;
        var end = val.indexOf('name:') - 1;
        var id = val.slice(start, end);
        return id;
    }

    // Get the name of a node from it's 'thumbnail' class, reather than the data-sort
    // attribute - which prefixes with a number (index?)
    function nameFromParentNode(node) {
        var child = node.getElementsByClassName('thumbnail-wrap');
        if (!validPointer(child)) {
            return node.getAttribute('data-sort');
        }
        if (!validPointer(child[0])) {
            return null;
        }
        return child[0].getAttribute('aria-label');
    }

    // Functions to disable/enable UI buttons. Disabling one automatically enables the other.
    function disableEquip(disable=true) {
        document.getElementById("equip-btn").disabled = disable;
        if (disable) {
            document.getElementById("unequip-btn").disabled = false;
        }
    }

    function disableUnequip(disable=true) {
        document.getElementById("unequip-btn").disabled = disable;
        if (disable) {
            document.getElementById("equip-btn").disabled = false;
        }
    }

    //////////////////////////////////////////////////////////////////////
    // addMainButtons() function: Adds two buttons to the page, one
    // to equip and one to unequip defined armor/weapons in one click.
    //////////////////////////////////////////////////////////////////////

    function addMainButtons() {
        observer.disconnect();
        var extDiv = document.getElementById('xedx-attacks-ext');

        // Only do once, or when not present.
        if (validPointer(extDiv)) {
            return;
        }

        var parentDiv = document.getElementsByClassName("equipped-items-wrap");

        // Create our own div, to append to parentDiv[0], after a separator
        var separator = createSeparator();
        var btnDiv = createButtonDiv();
        parentDiv[0].appendChild(separator);
        parentDiv[0].appendChild(btnDiv);

        var lastAction = GM_getValue('xedx-getnaked-lastaction');
        if (lastAction == 'equip') {
            disableEquip();
        } else if (lastAction == 'unequip') {
            disableUnequip();
        }
    }

    //////////////////////////////////////////////////////////////////////
    // createButtonDiv() function: Creates the div we insert into the
    // page. Insertion is done in the addMainButtons() function.
    //////////////////////////////////////////////////////////////////////

    function createButtonDiv() {
        var extDiv = createExtendedDiv();
        var hdrDiv = createHeaderDiv();
        var bodyDiv = createBodyDiv();

        // Header
        extDiv.appendChild(hdrDiv);
        hdrDiv.appendChild(document.createTextNode('Get Naked!'));

        // Body
        extDiv.appendChild(bodyDiv);
        var btns = createButtons();
        bodyDiv.appendChild(btns);

        return extDiv;
    }

    //////////////////////////////////////////////////////////////////////
    // Helpers for creating misc. UI parts and pieces
    //////////////////////////////////////////////////////////////////////

    function createSeparator() {
        var sepHr = document.createElement('hr');
        sepHr.className = 'delimiter-999 m-top10 m-bottom10';
        return sepHr;
    }

    function createExtendedDiv() {
        var extendedDiv = document.createElement('div');
        extendedDiv.className = 't-blue-cont h';
        extendedDiv.id = 'xedx-attacks-ext';
        return extendedDiv;
    }

    function createHeaderDiv() {
        var headerDiv = document.createElement('div');
        headerDiv.id = 'xedx-header_div';
        headerDiv.className = 'title main-title title-black active top-round';
        headerDiv.setAttribute('role', 'heading');
        headerDiv.setAttribute('aria-level', '5');

        var arrowDiv = createArrowDiv();
        headerDiv.appendChild(arrowDiv);

        return headerDiv;
    }

    function createBodyDiv() {
        var contentDiv = document.createElement('div');
        contentDiv.id = 'xedx-content-div';
        contentDiv.className = 'cont-gray bottom-round';
        contentDiv.setAttribute('style', 'height: 50px; overflow: auto');
        return contentDiv;
    }

    function createArrowDiv() {
        var arrowDiv = document.createElement('div');
        arrowDiv.className = 'arrow-wrap';
        var a = document.createElement('i');
        a.className = 'accordion-header-arrow right';
        arrowDiv.appendChild(a);
        return arrowDiv;
    }

    function setBtnAttributes(btn) {
        btn.setAttribute('style', 'font-size: 14px; height: 24px; text-align: center;' +
                        'border-radius: 5px; margin: 15px 40px;');
    }

    function createButtons() {
        var btnDiv = document.createElement('div');
        btnDiv.setAttribute('style', 'text-align: center');

        var btnSpan = document.createElement('span');
        btnDiv.appendChild(btnSpan);

        var equipBtn = document.createElement('button');
        equipBtn.id = 'equip-btn';
        var t = document.createTextNode('Re-equip');
        equipBtn.addEventListener('click',function () {
            equipFunction();
        });
        equipBtn.appendChild(t);
        setBtnAttributes(equipBtn);
        btnSpan.append(equipBtn);

        var unequipBtn = document.createElement('button');
        unequipBtn.id = 'unequip-btn';
        t = document.createTextNode('Un-equip');
        unequipBtn.addEventListener('click',function () {
            unequipFunction();
        });
        unequipBtn.appendChild(t);
        setBtnAttributes(unequipBtn);
        btnSpan.append(unequipBtn);

        var resetBtn = document.createElement('button');
        resetBtn.id = 'reset-btn';
        t = document.createTextNode('Reset');
        resetBtn.addEventListener('click',function () {
            resetFunction();
        });
        resetBtn.appendChild(t);
        setBtnAttributes(resetBtn);
        btnSpan.append(resetBtn);

        return btnDiv;
    }

    //////////////////////////////////////////////////////////////////////
    // Functions to load item data, and equip/unequip selected items
    //////////////////////////////////////////////////////////////////////

    function checkLoad(callback, itemNode, name) { // itemNode passed in for debugging
        if (!validPointer(itemNode)) {
            return;
        }

        var len = itemNode.childElementCount;
        if (window.onLoad || itemNode.childElementCount > 1) {
            // Page has loaded, call the callback, which either equips or unequips.
            var children = itemNode.childElementCount;
            console.log('Get Naked finished loading the "' + name +'" node, has ' + children + ' children.');
            callback(name);
        } else {
            setTimeout(function() {
                checkLoad(callback, itemNode, name);
            }, 1000);
        }
    }

    // This ensures that the actual item data for all classes is actually loaded.
    // This happens once the appropriate tab is clicked. Once loaded, we can call
    // the appropriate callback - either equip or un-equip.
    function loadItemData(callback) {
        // Press the buttons in the
        // <ul class=clearfix ui-tabs-nav ui-helper-result ui-helper-clearfix ui-widget-header ui-corner-all>
        // Iterate <li>'s, look for aria-controls=<item>, where item is
        // "primary-items", "secondary-items", "melee-items", "temporary-items" or "armour-items"
        var parentDiv = document.getElementsByClassName('main-items-cont-wrap');
        var tabsDiv = parentDiv[0].getElementsByClassName('clearfix ui-tabs-nav ui-helper-reset ' +
                                                          'ui-helper-clearfix ui-widget-header ui-corner-all');
        var tabs = tabsDiv[0];
        var len = tabs.childElementCount;

        for (var i=0; i < len; i++) {
            var tab = tabs.children[i];
            var name = tab.getAttribute('aria-controls');
            if (name == 'primary-items' || name == 'secondary-items' || name == 'melee-items' ||
                name == 'temporary-items' || name == 'armour-items') {
                // Click the underlying href to load the items for the given category
                var node = tab.children[0];
                node.click();

                // We need to wait for the page to load before continuing
                var itemNode = document.getElementById(name);
                var children = itemNode.childElementCount;
                if (children <= 1) {
                    checkLoad(callback, itemNode, name);
                    children = itemNode.childElementCount;
                } else {
                    console.log('Get Naked loaded ' + name +'. Has ' + children + ' children');
                    callback(name);
                }
            }
        }
    }

    // Once an equipped item has been found, this actually presses
    // the 'un-equp' button.
    function realUnequip(node, name, id) {
        var unequipList = node.getElementsByClassName('option-unequip wai-btn');
        if (!validPointer(unequipList) || unequipList.length == 0) {
            unequipList = node.getElementsByClassName('icon-h unequip');
        }
        var unequipBtn = unequipList[0];
        if (!validPointer(unequipBtn)) {
            console.log('Failed to locate un-equip button for the ' + name + '!');
            return;
        }
        console.log('Get Naked un-equipping ' + name);
        unequipBtn.click();
    }

    // This locates equipped items for a given class of items (the itemId),
    // equipped items are saved in storage for later re-equipping.
    // The actual un-equip is performed by the realUnequip() fn.
    function unequip(itemId) {
        var itemDiv = document.getElementById(itemId);
        var len = itemDiv.childElementCount;

        // Iterate each <li>; if equipped, create a string to save in an array.
        // The string has the syntax "id: <id> name: <name>"
        // These are pushed onto an array which is saved in storage.
        // Only armour-items will have multiple array elements.
        dialogText += itemId + " Un-equipped:\n";
        var itemArray = [];
        for (var i=0; i<len; i++) {
            var equipped = itemDiv.children[i].getAttribute('data-equipped');
            if (equipped == 'true') {
                // Equipped: save ID and name in storage, and unequip.
                var name = nameFromParentNode(itemDiv.children[i]);
                dialogText += "\t" + name + "\n";
                var id = itemDiv.children[i].getAttribute('data-armoryid');
                var arrayElement = 'id: ' + id + ' name: ' + name;
                itemArray.push(arrayElement);

                // Perform the real button press to unequip the item
                realUnequip(itemDiv.children[i], name, id);
            }
        }
        dialogText += "\n";

        classesProcessed++;
        if (classesProcessed == 5) {
            alert(dialogText);
            disableUnequip();
        }

        // Check flag idicating items already saved. If true, return.
        var saved = GM_getValue('xedx-getnaked-datasaved-' + itemId);
        if (saved == 'true') {
            return;
        }

        // Now if the array has elements, save it to storage
        if (itemArray.length > 0) {
            GM_setValue(itemId, JSON.stringify(itemArray));
            // Set flag indicating item ID's saved (unique for each item class - primary, secondary, etc.).
            GM_setValue('xedx-getnaked-datasaved-' + itemId, 'true');
        }
    }

    // This function load item data, by pressing the appropriate tabs in the tab
    // array via loadData(). It then calls the unequip() indirectly via a
    // callback passed to loadData().
    function unequipFunction() {
        GM_setValue('xedx-getnaked-lastaction', 'unequip');

        // Load <ul class="primary-items", "secondary-items", "melee-items", "temporary-items" and "armour-items".
        // Then the callback will handle the actual un-equipping.
        dialogText = '';
        classesProcessed = 0;
        loadItemData(unequip);

        // Set flag indicating item ID's saved.
        //GM_setValue('xedx-getnaked-datasaved', 'true');
    }

    function realEquip(node, name, id) {
        var equipList = node.getElementsByClassName('option-equip wai-btn');
        if (!validPointer(equipList) || equipList.length == 0) {
            equipList = node.getElementsByClassName('icon-h unequip');
        }
        var equipBtn = equipList[0];
        if (!validPointer(equipBtn)) {
            console.log('Failed to locate equip button for the ' + name + '!');
            return;
        }
        console.log('Get Naked equipping ' + name + ', ID=' + id);
        equipBtn.click();
    }

    function equip(itemId) {
        var itemDiv = document.getElementById(itemId);
        var len = itemDiv.childElementCount;
        var itemArray = [];
        var matchName = false;
        dialogText += itemId + " equipped:\n";
        for (var i=0; i<len; i++) {
            var name = nameFromParentNode(itemDiv.children[i]);
            var id = itemDiv.children[i].getAttribute('data-armoryid');
            if (name == null) {
                break;
            }

            // Temp items don't have armoury-id's, so match on name.
            if ((id == 'null' || id == null) && itemId == 'temporary-items') {
                matchName = true;
            }

            var keyArray = JSON.parse(GM_getValue(itemId));
            for (var j = 0; j < keyArray.length; j++) {
                var savedName = parseSavedName(keyArray[j]);
                var savedId = parseSavedId(keyArray[j]);
                if (matchName ? savedName == name : savedId == id) {
                    // Press the 'equip' button
                    dialogText += "\t" + name + "\n";
                    realEquip(itemDiv.children[i], name, id);
                }
            }
        }
        dialogText += "\n";

        classesProcessed++;
        if (classesProcessed == 5) {
            dialogText += "Don't forget to re-equip weapons mods!";
            alert(dialogText);
            disableEquip();
        }
    }

    function equipFunction() {
        GM_setValue('xedx-getnaked-lastaction', 'equip');

        // Load <ul class="primary-items", "secondary-items", "melee-items", "temporary-items" and "armour-items".
        dialogText = '';
        classesProcessed = 0;
        loadItemData(equip);
        // Iterate <li>'s, locating saved ID's retrieved from storage
        // Press 'equip' button for each: button clss='option-equip wai-btn'
    }

    function resetFunction() {
        GM_setValue('xedx-getnaked-lastaction', 'reset');

        // Clear storage
        var keyArray = GM_listValues();

        var key;
        for (var i = 0; i < keyArray.length; i++) {
            key = keyArray[i];
            if(key.indexOf('xedx-getnaked-datasaved') == -1){
                GM_deleteValue(key);
            }
        }

        GM_setValue('xedx-getnaked-datasaved-primary-items', 'false');
        GM_setValue('xedx-getnaked-datasaved-secondary-items', 'false');
        GM_setValue('xedx-getnaked-datasaved-melee-items', 'false');
        GM_setValue('xedx-getnaked-datasaved-temporary-items', 'false');
        GM_setValue('xedx-getnaked-datasaved-armour-items', 'false');

        dialogText = 'All saved data has been cleared.\nUn-equipping will save new data.';
        alert(dialogText);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    console.log("Torn Get Naked script started!");

    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        addMainButtons();
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
})();