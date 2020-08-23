/// ==UserScript==
// @name         Torn Racing - Car Order
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Allows cars to be sorted in any order when starting a race.
// @author       xedx [2100735]
// @include      https://www.torn.com/loader.php?sid=racing*
// @updateURL    https://github.com/edlau2/Tampermonkey/raw/master/RaceCarOrder/Torn%20Racing%20-%20Car%20Order.user.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @require      https://raw.githubusercontent.com/lodash/lodash/4.17.15-npm/core.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    ///////////////////////////////////////////////////////////////////////////////////
    // Miscellaneous utilities/(pseudo)constants
    ///////////////////////////////////////////////////////////////////////////////////

    const defOrderKey = 'default_car_order';
    const savedOrderKey = 'saved_car_order';
    const savedCheckboxKey = 'load_saved';
    const loadSavedId = 'loadSavedId';
    const saveBtnId = 'saveBtnId';
    const bodyDivId = 'xedx-body-div';
    const hdrDivId = 'xedx-hdr-div';
    var defOrderSaved = false;

    const mainDivId = 'racingMainContainer';
    const refDivId = 'racingAdditionalContainer';

    function getCurrentCarOrder(parentNode) {
        let elemList = myGetElementsByClassName(parentNode, 'model-car-name');
        let nameArray = [];
        elemList.forEach(element => nameArray.push(element.className));
        return nameArray;
    }

    function isObject(object) {
        return object != null && typeof object === 'object';
    }

    function doesLiExistInArray(li) {
        let len = savedCarsArray.length;
        for (let i=0; i<len; ++i) {
            let savedLi = savedCarsArray[i];
             if (_.isEqual(li , savedLi)) {
                 return true;
                 }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Order the cars.
    ///////////////////////////////////////////////////////////////////////

    var savedCarsArray = [];
    var arrayFilled = false;
    function putCarsInOrder(carList) {
        var refDiv = document.getElementById(refDivId);
        var ul = refDiv.getElementsByClassName('enlist-list')[0];
        if (validPointer(ul)) {
            if(!arrayFilled) {
                for (var i = 0, len = ul.children.length; i < len; i++ ) {
                    var li = ul.children[i];
                    console.log('putCarsInOrder: ');
                    console.dir(li);
                    console.log('innerText: ' + li.innerText);
                    if(savedCarsArray.includes(li, 0)){
                        continue;
                    }
                    if (doesLiExistInArray(li)) {
                        continue;
                    }
                    savedCarsArray.push(li);
                }
            } // !arrayFilled
            arrayFilled = true;
            $(ul).empty();
            carList.forEach(function(car){
                var li = findSavedCar(car, savedCarsArray);
                if (validPointer(li)) {
                    ul.appendChild(li);
                }
            })
        }
    }

    function findSavedCar(name, liArray) {
        for (let i = 0; i < liArray.length; i++) {
            let li = liArray[i];
            let elemList = myGetElementsByClassName(li, name);
            if (validPointer(elemList) && elemList.length > 0) {
                return li;
            }
        }
        return null;
    }

    //////////////////////////////////////////////////////////////////////
    // Build the Car Order div, append underneath the Personal Perks div
    //////////////////////////////////////////////////////////////////////

    var extDivId = 'xedx-carorder-ext-div';
    function buildRaceCarOrderDiv() {

        var refDiv = document.getElementById(refDivId);
        var checkDiv = refDiv.getElementsByClassName('enlist-wrap enlisted-wrap')[0];
        if (! extendedDivExists(extDivId) && validPointer(checkDiv)) { // Build the 'Select Car Order' <DIV>, only do once.
            let extDiv = createExtendedDiv(extDivId);
            let bodyDiv = createBodyDiv(bodyDivId);
            let contentDiv = createContentDiv();
            let hdrDiv = createHeaderDivEx('Car Order', hdrDivId, bodyDiv, true); // true to start hidden

            //hdrDiv.appendChild(document.createTextNode('Car Order'));
            extDiv.appendChild(hdrDiv);
            extDiv.appendChild(bodyDiv);
            bodyDiv.appendChild(contentDiv);
            extDiv.appendChild(createSeparator());

            let mainDiv = document.getElementById(mainDivId);
            let mainWrapDiv = mainDiv.getElementsByClassName('racing-main-wrap')[0];

            if (validPointer(mainWrapDiv) && validPointer(refDiv)) {
                mainWrapDiv.insertBefore(extDiv, refDiv);
            } else {
                return;
            }
        }

        // First save the current (default) car order
        if (validPointer(checkDiv) && !defOrderSaved) {
            let currOrder = getCurrentCarOrder(checkDiv);
            let saved = GM_getValue(defOrderKey);

            // Save if it does not match current default, or does not exist.
            if (!validPointer(saved) || JSON.stringify(currOrder) != saved) {
                GM_setValue(defOrderKey, JSON.stringify(currOrder));
            }
            defOrderSaved = true;
        }

        if (validPointer(checkDiv)) {
            // Now we can restore any saved order - if so desired.
            if (loadSavedCarOrder()) {
                handleRestoreBtn(true);
            }
        } else if (extendedDivExists(extDivId)) {
            let extDiv = document.getElementById(extDivId);
            extDiv.parentNode.removeChild(extDiv);
        }

        // Make cars draggable. Also only do once.
        var setDraggable = false;
        if (!setDraggable) {
            //debugger;
            refDiv = document.getElementById(refDivId);
            let ul = refDiv.getElementsByClassName('enlist-list')[0];
            if (validPointer(ul)) {
                setDraggable = true;
                for (let i = 0, len = ul.children.length; i < len; i++ ) {
                    let li = ul.children[i];
                    li.setAttribute("draggable", "true");

                    // See 'https://www.html5rocks.com/en/tutorials/dnd/basics/'
                    li.addEventListener('dragstart', handleDragStart, false);
                    li.addEventListener('dragenter', handleDragEnter, false);
                    li.addEventListener('dragover', handleDragOver, false);
                    li.addEventListener('dragleave', handleDragLeave, false);
                    li.addEventListener('drop', handleDrop, false);
                    li.addEventListener('dragend', handleDragEnd, false);

                    //ul.children[i].appendChild(createDraggableDiv()); // Adds the little cross shaped icon
                }
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // DnD handlers
    //////////////////////////////////////////////////////////////////////

    // If these work, put in common code?

    var dragSrcEl = null;
    function handleDragStart(e) {
        // this / e.target is the source node.
        console.log('handleDragStart: ', e);
        // this.style.opacity = '0.4';  // Done automatically in Chrome...

        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragOver(e) {
        console.log('handleDragOver: ', e);
        if (e.preventDefault) {
            e.preventDefault(); // Necessary. Allows us to drop.
        }
        e.dataTransfer.dropEffect = 'move'; // See the section on the DataTransfer object.
        return false;
    }

    function handleDragEnter(e) {
        // this / e.target is the current hover target.
        console.log('handleDragEnter: ', e);
        this.classList.add('over');
    }

    function handleDragLeave(e) {
        // this / e.target is previous target element.
        console.log('handleDragLeave: ', e);
        this.classList.remove('over');
    }

    var stopBlinkBtnId = null;
    function handleDrop(e) {
        // this / e.target is current target element.
        console.log('handleDrop: ', e);
        observer.disconnect();

        if (e.stopPropagation) {
            e.stopPropagation(); // stops the browser from redirecting.
        }

        // Don't do anything if dropping the same column we're dragging.
        if (dragSrcEl != this) {
            // Set the source column's HTML to the HTML of the column we dropped on.
            dragSrcEl.innerHTML = this.innerHTML;
            this.innerHTML = e.dataTransfer.getData('text/html');

            // Since the order has changed, either auto-save or maybe flash the 'Save' button
            // saveBtnId
            stopBlinkBtnId = blinkBtn(saveBtnId);
            console.log('Blinking "Save" button - ID = ' + stopBlinkBtnId);
        }

        // Get rid of the added <meta http-equiv="content-type" content="text/html;charset=UTF-8">
        // I think this was added by the setData call in the start drag handler.
        let elements = e.currentTarget.getElementsByTagName('meta');
        elements[0].parentNode.removeChild(elements[0]);

        observer.observe(targetNode, config);
        return false;
    }

    function handleDragEnd(e) {
        // this / e.target is the current hover target.
        console.log('handleDragEnd: ', e);

        // Remove the 'over' class,that was added to prevent dragOver
        // from firing too many times, in the drag enter handler.
        for (let i = 0, len = this.children.length; i < len; i++ ) {
                let li = this.children[i];
                li.classList.remove('over');
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Misc UI helpers
    //////////////////////////////////////////////////////////////////////

    function createContentDiv() {
        let contentDiv = document.createElement('div');
        contentDiv.id = 'xedx-content-div';
        contentDiv.className = 'cont-gray bottom-round';
        contentDiv.setAttribute('style', 'background-color: #ddd;');

        let primaryBtnWrap = document.createElement('SPAN');
        primaryBtnWrap.setAttribute('style', 'display: block; overflow: hidden; padding: 5px 10px;');
        let secondaryBtnWrap = document.createElement('SPAN');
        secondaryBtnWrap.setAttribute('style', 'display: block; overflow: hidden; padding: 5px 10px;');

        primaryBtnWrap.appendChild(createSilverButton('Save', handleSaveBtn, saveBtnId));
        primaryBtnWrap.appendChild(createSilverButton('Restore', handleRestoreBtn));

        // If already saved, use that value. Otherwise, default to checked.
        let val = GM_getValue(savedCheckboxKey);
        if (!validPointer(val)) {
            val = 'true';
        }
        primaryBtnWrap.appendChild(createCheckbox('Load Saved at Startup', (val === 'true'), loadSavedId));
        secondaryBtnWrap.appendChild(createSilverButton('Defaults', handleDefBtn));
        secondaryBtnWrap.appendChild(createSilverButton('Help', handleHelpBtn));

        contentDiv.appendChild(primaryBtnWrap);
        contentDiv.appendChild(secondaryBtnWrap);

        return contentDiv;
    }

    // Need to save state - and have a handler for when it changes!
    function createCheckbox(text, def, id) {
        let span = document.createElement('SPAN');
        let x = document.createElement("INPUT");
        x.setAttribute("type", "checkbox");
        x.checked = def;
        x.id = id;
        GM_setValue(savedCheckboxKey, x.checked ? 'true' : 'false');
        x.onclick = function() {
            GM_setValue(savedCheckboxKey, x.checked ? 'true' : 'false');
        };
        span.appendChild(x);
        span.appendChild(document.createTextNode(text));
        return span;
    }

    // Return value of above
    function loadSavedCarOrder() {
        let val = GM_getValue(savedCheckboxKey);
        return (val == 'true' ? true : false);
    }

    function createSilverButton(name, func, id=null) {
        let spanBtnWrap = document.createElement('SPAN');
        spanBtnWrap.className = 'btn-wrap silver';
        let spanBtn = document.createElement('SPAN');
        spanBtn.className = 'btn';
        spanBtn.setAttribute('style', 'padding: 5px 10px;');
        let btn = document.createElement("BUTTON");
        btn.innerHTML = name;
        btn.addEventListener("click", func);
        btn.setAttribute('style', 'width: 108px;');
        if (id) {btn.id = id;}
        spanBtn.appendChild(btn);
        spanBtnWrap.appendChild(spanBtn);

        return spanBtnWrap;
    }

    function createDraggableDiv() {
        let dragDiv = document.createElement('div');
        dragDiv.className = 'draggable-wrap icon-h';
        dragDiv.setAttribute("draggable", "true");
        let iconDiv = document.createElement('i');
        iconDiv.className = 'draggable-icon';
        dragDiv.appendChild(iconDiv);
        return dragDiv;
    }

    //////////////////////////////////////////////////////////////////////
    // Button handlers
    //////////////////////////////////////////////////////////////////////

    // Set up a handler for the page 2 button
    function clickHandler() {
        // Need page-value=10 and also active
        let element = document.querySelector("#racingAdditionalContainer > div.gallery-wrapper.pagination.m-top10.left > a.page-number.active.t-gray-3.h.pager-link.page-show");
        let page = element.getAttribute('page-value');
        let active = element.hasAttribute('active');
        let string = 'Page Change: page=' + page + ' Active: ' + active;
        console.log(string);
        if (page != 10) {
            setTimeout(clickHandler, 1000);
        } else {
            populatePageTwo();
        }
    }

    function populatePageTwo() {
        let enlistList = document.querySelector("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap > div.cont-black.bottom-round.enlist");
        $(enlistList).empty();
        for (let i=9; i < savedCarsArray.length; i++) {
            let li = savedCarsArray[i];
             if (validPointer(li)) {
                 let element = li.getElementsByClassName('enlist-bars')[0];
                 if (element) {
                     element.parentNode.removeChild(element);
                 }
                 enlistList.appendChild(li);
             }
        }
    }

    // Add the handler for when page 2 is clicked. Hmmm ... the handler can't run until the page is loaded!
    function addPage2Handler() {
        // Path to "2" selector
        let enlistList = document.querySelector("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap > div.cont-black.bottom-round.enlist > ul");
        let element = document.querySelector("#racingAdditionalContainer > div.gallery-wrapper.pagination.m-top10.left > a:nth-child(4)");
        if (validPointer(element)) {
            element.addEventListener('click', clickHandler); // associate the function above with the click event
        }
    }

    function handleSaveBtn() {
        console.log('handleSaveBtn - stopBlinkBtnId = ' + stopBlinkBtnId);
        let refDiv = document.getElementById(refDivId);
        let checkDiv = refDiv.getElementsByClassName('enlist-wrap enlisted-wrap')[0];
        let currOrder = getCurrentCarOrder(checkDiv);
        GM_setValue(savedOrderKey, JSON.stringify(currOrder));
        if (stopBlinkBtnId) {
            stopBlinkBtn(stopBlinkBtnId);
        }
        alert('Car order has been saved!');
    }

    // Could use animateElementJS(...) here??
    function stopBlinkBtn(id) {
        clearInterval(id);
    }

    function blinkBtn(id) {
        let selector = document.getElementById(id);
        return ((stopBlinkBtnId = setInterval(() => {
            $(selector).fadeOut(500);
            $(selector).fadeIn(500);},
            1000)));
    }

    function handleRestoreBtn(silent=false) {
        observer.disconnect();
        var data = GM_getValue(savedOrderKey);
        if (validPointer(data)) {
            let carList = JSON.parse(data);
            if (validPointer(carList) && carList.length > 0) {
                putCarsInOrder(carList);
                addPage2Handler();
            } else if (!silent) {
                alert('No car list has been saved! Please see the "Help".');
            }
        }
        observer.observe(targetNode, config);
    }

    function handleDefBtn() {
        console.log('handleDefBtn');

        // Call 'putCarsInOrder', using def list.
        observer.disconnect();
        let carList = JSON.parse(GM_getValue(defOrderKey));
        if (validPointer(carList) && carList.length > 0) {
            putCarsInOrder(carList);
        } else {
            alert('Default car list has not been saved! This is an error, please contact the developer' +
                 ' (xedx [2100735]) for assistance!');
        }
        observer.observe(targetNode, config);
    }

    function handleHelpBtn() {
        console.log('handleHelpBtn');
        let helpText = "To create a saved car order, simply drag and drop the cars into any " +
            "order you want. When finished, press the 'Save' button to save in local storage. " +
            "\n\nSelecting the 'Load Saved on Startup' will cause that order to be restored whenever " +
            "this script runs." +
            "\n\nThe 'Restore' button will force any saved car order to be loaded." +
            "\n\nSlecting the 'Defaults' button will restore the Default order, as selected by Torn. You'd " +
            "need to select Save again, to keep that as the saved default, or de-select the 'Load Saved on Startup'" +
            " checkbox.";
        alert(helpText);
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    var targetNode = document.getElementById('racingMainContainer');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        buildRaceCarOrderDiv();
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
})();


