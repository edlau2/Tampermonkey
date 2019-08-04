// ==UserScript==
// @name         Torn One-Click Mods Restore
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Equip/Unequio items (armor and weapons) with one click
// @author       xedx [2100735]
// @include      https://www.torn.com/loader.php?sid=itemsMods
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

(function($) {
    'use strict';

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

    // Function to parse out the name of an attached mod
    function parseItemName(node) {
        var label = node.getAttribute('aria-label');
        var name = label.slic(8, label.length);
        return name;
    }

    //////////////////////////////////////////////////////////////////////
    // addMainButtons() function: Adds two buttons to the page, one
    // to sve current mods, one to restore saved mods.
    //////////////////////////////////////////////////////////////////////

    function addMainButtons() {
        observer.disconnect();
        var extDiv = document.getElementById('xedx-mods-ext');

        // Only do once, or when not present.
        if (validPointer(extDiv)) {
            return;
        }

        var parentDiv = document.getElementsByClassName("tutorial-cont m-top10");

        // Create our own div, to append to parentDiv[0], after a separator
        var separator = createSeparator();
        var btnDiv = createButtonDiv();
        parentDiv[0].appendChild(btnDiv);
        parentDiv[0].appendChild(separator);
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
        hdrDiv.appendChild(document.createTextNode('One-Click Mods Restore'));

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
        extendedDiv.id = 'xedx-mods-ext';
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

        var saveBtn = document.createElement('button');
        saveBtn.id = 'save-btn';
        var t = document.createTextNode('Save Mods');
        saveBtn.addEventListener('click',function () {
            saveModsFunction();
        });
        saveBtn.appendChild(t);
        setBtnAttributes(saveBtn);
        btnSpan.append(saveBtn);

        var restoreModsBtn = document.createElement('button');
        restoreModsBtn.id = 'restore-btn';
        t = document.createTextNode('Restore Mods');
        restoreModsBtn.addEventListener('click',function () {
            restoreModsFunction();
        });
        restoreModsBtn.appendChild(t);
        setBtnAttributes(restoreModsBtn);
        btnSpan.append(restoreModsBtn);

        return btnDiv;
    }

    /////////////////////////////////////////////////////////////////////
    // Functions to save/restore the mods - button handlers.
    //////////////////////////////////////////////////////////////////////

    function saveModsFunction() {
        // Find the parent div of all the mods: <ul class="mods clearfix"...>
        var dialogText = 'Equipped Mods:\n';
        var parentDiv = document.getElementsByClassName('mods clearfix')[0];
        var len = parentDiv.children.length;
        for (var i = 0; i < len; i++) {
            var child = parentDiv.children[i];
            if (child.className == 'attached') {
                // Save in local storage.
                var name = parseItemName(child);
                dialogText += '\t' + name + '\n';

                // Hmmm... can't find what it's attached to from here, it seems.
                // It is saved on the items page, however.
            }
        }

        dialogText += '\n(Not Yet Implemented)';
        alert(dialogText);
    }

    function restoreModsFunction() {
        // TBD: Restore from the mods saved in storage.
        // can all <li>'s under <ul class="mods clearfix"...>, match name.
        // If names match, there are 2 <li>'s underneath. <li> 0 = primary, 1 = secondary.
        // Click the <a> tag underneath correct <li>
        alert('Not Yet Implemented');
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    console.log("Torn One-Click Mods script started!");

    var targetNode = document.getElementById('mainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        addMainButtons();
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
})();