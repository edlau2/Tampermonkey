/// ==UserScript==
// @name         Torn Racing - Car Order
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Allows cars to be sorted in any order when starting a race.
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=racing*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    //const xedxMainDiv = getMainDiv(); // Wrapped, to fold for easier code viewing. At end of file.

    ///////////////////////////////////////////////////////////////////////////////////
    // Miscellaneous utilities/(pseudo)constants
    ///////////////////////////////////////////////////////////////////////////////////

    //const defOrderKey = 'default_car_order';
    //const savedOrderKey = 'saved_car_order';
    //const savedCheckboxKey = 'load_saved';
    //const loadSavedId = 'loadSavedId';
    const saveBtnId = 'saveBtnId';
    //const bodyDivId = 'xedx-body-div';
    //const hdrDivId = 'xedx-hdr-div';
    var defOrderSaved = false;
    var savedCarsArray = [];
    var arrayFilled = false;

    // NEW
    var opt_sortCars = true; // Checkbox: load the saved car order

    var targetNode = null;
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        refDiv = document.querySelector("#racingAdditionalContainer");
        let checkDiv = refDiv ? refDiv.getElementsByClassName('enlist-wrap enlisted-wrap')[0] : null;
        if (!checkDiv) return;

        log('**** Observer triggered!');
        log('mutationsList: ', mutationsList);
        observerOff();
        buildRaceCarOrderDiv();
        observerOn();
    };
    var observer = new MutationObserver(callback);

    var refDiv = null;
    var draggableSet = false;
    var carsSorted = false;
    var savedCurrPage = 0;
    // end new


    function getCurrentCarOrder(parentNode) {
        let elemList = myGetElementsByClassName(parentNode, 'model-car-name');
        let nameArray = [];
        elemList.forEach(element => nameArray.push(element.className));
        return nameArray;
    }

    /*
    function doesLiExistInArray(li) {
        let len = savedCarsArray.length;
        for (let i=0; i<len; ++i) {
            let savedLi = savedCarsArray[i];
             if (_.isEqual(li , savedLi)) {
                 return true;
                 }
        }
    }
    */

    //////////////////////////////////////////////////////////////////////
    // Order the cars.
    ///////////////////////////////////////////////////////////////////////

    // Given a list of cars, put them into the UL on the page, in that order.
    function putCarsInOrder(carList) {
        log('[putCarsInOrder] ==>');
        log('arrayFilled: ', arrayFilled);
        log('carList: ', carList);

        // The savedCarsArray contains the actual LI's, the carList just references to them
        var ul = refDiv.getElementsByClassName('enlist-list')[0];
        if (validPointer(ul)) {

            if (!arrayFilled) { // Unused? Never set to true?
                log('FILLING ARRAY');
                for (var i = 0, len = ul.children.length; i < len; i++ ) {
                    var li = ul.children[i];
                    if(savedCarsArray.includes(li, 0)){
                        //log('savedCarsArray includes');
                        continue;
                    }
                    //if (doesLiExistInArray(li)) {
                    //    log('doesLiExistInArray');
                    //    continue;
                    //}
                    savedCarsArray.push(li);
                }
                log('savedCarsArray: ', savedCarsArray);
            } else { // !arrayFilled
                log('Array already filled. Length: ', savedCarsArray.length);
            }

            $(ul).empty();
            carList.forEach(function(car){
                var li = findSavedCar(car, savedCarsArray);
                if (validPointer(li)) {
                    ul.appendChild(li);
                } else {
                    log('Car not found in array!');
                }
            })
        }
        log('<== [putCarsInOrder]');
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

    function buildRaceCarOrderDiv() {
        log('[buildRaceCarOrderDiv] ==>');
        refDiv = document.querySelector("#racingAdditionalContainer");
        let checkDiv = refDiv.getElementsByClassName('enlist-wrap enlisted-wrap')[0];
        let mainWrapDiv = document.querySelector("#racingMainContainer > div");
        if (!refDiv || !checkDiv || !mainWrapDiv) return;

        if (!document.querySelector("#xedx-carorder")) { // Build the 'Select Car Order' <DIV>, only do once.
            log('[buildRaceCarOrderDiv] Building UI');
            $(xedxMainDiv).insertBefore(refDiv);

            // Handler for the arrow button
            $("#xedx-arrow").on("click", function() {
                if ($('#xedx-body-div').css('display') == 'block') {
                    $('#xedx-body-div').css('display', 'none');
                    $('#xedx-hdr-div').className = 'title main-title title-black border-round';
                } else {
                    $('#xedx-body-div').css('display', 'block');
                    $('#xedx-hdr-div').className = 'title main-title title-black top-round active';
                }
            });

            // Handlers for remaining buttons
            $("#xedx-save-btn").on('click', handleSaveBtn);
            $("#xedx-restore-btn").on('click', handleRestoreBtn);
            $("#xedx-default-btn").on('click', handleDefBtn);
            $("#xedx-help-btn").on('click', handleHelpBtn);

            // Handler for checkbox, and set default state
            opt_sortCars = GM_getValue('load_saved', opt_sortCars);
            $("#xedx-chkbox1").prop('checked', opt_sortCars);
            $("#xedx-chkbox1").on('click',  function() {
                opt_sortCars = $("#xedx-chkbox1").is(':checked');
                GM_setValue('load_saved', opt_sortCars);
            });

            savedCurrPage = currentPage();
        } // End build main div

        addPaginationHandler();

        log('currPage: ', currentPage(), ' saved: ', savedCurrPage);
        log('carsSorted: ', carsSorted, ' savedCarsArray: ', savedCarsArray);

        // First save the current (default) car order
        // For now, ignore the default ...
        /*
        if (!defOrderSaved) {
            log('[defOrderSaved] (only once!)');
            let currOrder = getCurrentCarOrder(checkDiv);
            let saved = GM_getValue('default_car_order');

            // Save if it does not match current default, or does not exist.
            if (!validPointer(saved) || JSON.stringify(currOrder) != saved) {
                GM_setValue('default_car_order', JSON.stringify(currOrder));
            }
            defOrderSaved = true;
        }
        */

        //if (!carsSorted) {
            if (opt_sortCars) {
                //log('[sortSavedCars] (only once!)');
                sortSavedCars(true);
                carsSorted = true; // Don't need anymore?
            }
        //}

        // Make cars draggable. Also only do once.
        if (!draggableSet) makePageDraggable();

        //savedCurrPage = currentPage();
        log('<== [buildRaceCarOrderDiv]');
    }

    //////////////////////////////////////////////////////////////////////
    //
    // Bunch of UI stuff that used to be in the helper lib.
    // Deprecated in favor of using JQuery, but I haven't modified
    // this yet, so I just moved here for now. TBD - simplify!!!
    //
    //////////////////////////////////////////////////////////////////////

    function myGetElementsByClassName(anode, className) {
        var elems = anode.getElementsByTagName("*");
        var matches = [];
        for (var i=0, m=elems.length; i<m; i++) {
            if (validPointer(elems[i].className) && elems[i].className.indexOf(className) != -1) {
                matches.push(elems[i]);
            }
        }

        return matches;
    }


    //////////////////////////////////////////////////////////////////////
    // DnD handlers
    //////////////////////////////////////////////////////////////////////

    // If these work, put in common code?

    function makePageDraggable() {
        log('[makePageDraggable] ==>');
        // let ul = refDiv.getElementsByClassName('enlist-list')[0];
        let ul = document.querySelector("#racingAdditionalContainer > div.enlist-wrap.enlisted-wrap > div.cont-black.bottom-round.enlist > ul");
        if (!ul) return setTimeout(makePageDraggable, 250);

        log('[setDraggable] (only once!)');
        for (let i = 0, len = ul.children.length; i < len; i++ ) {
            let li = ul.children[i];
            makeNodeDraggable(li);
        }
        draggableSet = true;
        log('<== [makePageDraggable]');
    }

    function makeNodeDraggable(node) {
        node.setAttribute("draggable", "true");
        node.addEventListener('dragstart', handleDragStart, false);
        node.addEventListener('dragenter', handleDragEnter, false);
        node.addEventListener('dragover', handleDragOver, false);
        node.addEventListener('dragleave', handleDragLeave, false);
        node.addEventListener('drop', handleDrop, false);
        node.addEventListener('dragend', handleDragEnd, false);

        //node.appendChild(createDraggableDiv()); // Adds the little cross shaped icon
    }

    var dragSrcEl = null;
    function handleDragStart(e) {
        log('type: ', e.type);
        log('handleDragStart: ', e);
        // this.style.opacity = '0.4';  // Done automatically in Chrome...
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragOver(e) {
        //log('type: ', e.type);
        //log('handleDragOver: ', e);
        if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
        e.dataTransfer.dropEffect = 'move'; // See the section on the DataTransfer object.
        return false;
    }

    function handleDragEnter(e) {
        log('type: ', e.type);
        log('handleDragEnter: ', e);
        this.classList.add('over');
    }

    function handleDragLeave(e) {
        log('type: ', e.type);
        // this / e.target is previous target element.
        log('handleDragLeave: ', e);
        this.classList.remove('over');
    }

    var stopBlinkBtnId = null;
    function handleDrop(e) {
        log('type: ', e.type);
        log('handleDrop: ', e);
        observerOff();

        if (e.stopPropagation) {
            e.stopPropagation(); // stops the browser from redirecting.
        }

        // Don't do anything if dropping the same column we're dragging.
        if (dragSrcEl != this) {
            dragSrcEl.innerHTML = this.innerHTML;
            this.innerHTML = e.dataTransfer.getData('text/html');
            stopBlinkBtnId = blinkBtn(saveBtnId);
            log('Blinking "Save" button - ID = ' + stopBlinkBtnId);
        }

        // Get rid of the added <meta http-equiv="content-type" content="text/html;charset=UTF-8">
        // I think this was added by the setData call in the start drag handler.
        let elements = e.currentTarget.getElementsByTagName('meta');
        elements[0].parentNode.removeChild(elements[0]);

        observerOn();
        return false;
    }

    function handleDragEnd(e) {
        log('type: ', e.type);
        // this / e.target is the current hover target.
        log('handleDragEnd: ', e);

        // Remove the 'over' class,that was added to prevent dragOver
        // from firing too many times, in the drag enter handler.
        for (let i = 0, len = this.children.length; i < len; i++ ) {
            let li = this.children[i];
            li.classList.remove('over');
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Button handlers
    //////////////////////////////////////////////////////////////////////

    // Set up a handler for the page 2 button - what about the rest???
    // No, no, no - 'page' is start car index, 1 based. So a 'page-value' of '0' means cars 0-9, '10' means 9-19, etc.
    function clickHandler() {
        log('[clickHandler] ==>');
        observerOff();

        /*
        let element = document.querySelector("#racingAdditionalContainer > div.gallery-wrapper.pagination > a.page-number.active");
        let page = element.getAttribute('page-value');
        let active = element.hasAttribute('active');
        log('Page Change: page=' + page + ' Active: ' + active);
        */
        let page = currentPage();

        log('curr page: ', page, ' Saved page: ', savedCurrPage);

        // NEW
        draggableSet = false;
        //carsSorted = false;
        // end new

        let pageNum = Number(page);
        if (pageNum == Number(savedCurrPage)) {
            observerOn();
            log('<== [clickHandler]');
            return setTimeout(clickHandler, 250);
        }

        //populatePage(pageNum); //pageNum ? (pageNum-1) : pageNum);

        sortSavedCars(true);
        savedCurrPage = pageNum;

        observerOn();
        log('<== [clickHandler]');
    }

    // Why do this instead of the sort function???
    function populatePage(index) {
        log('[populatePage] index: ', index);
        log('savedCarsArray: ', savedCarsArray);
        let enlistList = refDiv.getElementsByClassName('enlist-list')[0];
        $(enlistList).empty();
        log('Cleared UL');

        for (let i=index; i < savedCarsArray.length; i++) { // page 1 index is 0, page 2, 10, etc. Convert to 0-indexed.
             let li = savedCarsArray[i];
             if (validPointer(li)) {
                 let element = li.getElementsByClassName('enlist-bars')[0];
                 if (element) {
                     element.parentNode.removeChild(element);
                 }
                 log('appending car: ', li);
                 enlistList.appendChild(li);
             }

        }
    }

    // Return page number, which is really an index into the paginator.
    // Appears as 0, 10, 20 ...
    const currentPage = () => {
        let element = document.querySelector("#racingAdditionalContainer > div.gallery-wrapper.pagination > a.page-number.active");
        let page = element.getAttribute('page-value');
        let active = element.hasAttribute('active');
        return page;
    }

    // Add the handler for when the paginator is clicked.
    function addPaginationHandler() {
        let root = document.querySelector("#racingAdditionalContainer > div.gallery-wrapper.pagination.m-top10.left");
        let aList = root.querySelectorAll('a'); // Paginator buttons: '<', 1, 2, ..., '>'
        for (let i=0; i<aList.length; i++) {
            aList[i].addEventListener('click', clickHandler); // associate the function above with the click event
        }
    }

    function stopBlinkBtn(id) {
        log('[stopBlinkBtn]');
        clearInterval(id);
    }

    function blinkBtn(id) {
        log('[blinkBtn]');
        let selector = document.getElementById(id);
        let Id = setInterval(() => {
            $(selector).fadeOut(500);
            $(selector).fadeIn(500);},
            1000);

        return id;
    }

    // Wrapper for the actual sorter, 'putCarsInOrder'
    function sortSavedCars(silent=false) {
        log('[sortSavedCars] ==>');
        let carList = null;
        let key = 'carsPage' + currentPage();
        var data = GM_getValue(key);
        if (validPointer(data)) {
            carList = JSON.parse(data);
            if (validPointer(carList) && carList.length > 0) {
                log('[sortSavedCars] carList: ', carList);
                putCarsInOrder(carList);
            } else if (!silent) {
                alert('No car list has been saved! Please see the "Help".');
            } else {
                log('No car list has been saved! Please see the "Help".');
            }
        }
        log('carList: ', carList);
        log('<== [sortSavedCars]');
    }

    // Handle the 'Save' button, save the current car order to local storage
    const handleSaveBtn = function() {
        log('[handleSaveBtn] ==>');
        let checkDiv = refDiv.getElementsByClassName('enlist-wrap enlisted-wrap')[0];
        let carList = getCurrentCarOrder(checkDiv);
        log('carList: ', carList);

        let key = 'carsPage' + currentPage();
        GM_setValue(key, JSON.stringify(carList));

        if (stopBlinkBtnId) {
            stopBlinkBtn(stopBlinkBtnId);
        }
        alert('Car order has been saved! (key=' + key + ')');
        log('<== [handleSaveBtn]');
    }

    // Handle the 'Restore' button, restore the custom ordering, if you've moved stuff and changed your mind
    const handleRestoreBtn = function(silent=false) {
        observerOff();
        sortSavedCars(false);
        observerOn();
    }

    // Handle the 'Defaults' button, Restore the default ordering, currently not really supported.
    const handleDefBtn = function() {
        log('handleDefBtn');

        alert('Not yet implemented!');
        return;

        // Call 'putCarsInOrder', using def list.
        observerOff();
        let carList = JSON.parse(GM_getValue('default_car_order'));
        if (validPointer(carList) && carList.length > 0) {
            putCarsInOrder(carList);
        } else {
            alert('Default car list has not been saved! This is an error, please contact the developer' +
                 ' (xedx [2100735]) for assistance!');
        }
        observerOn();
    }

    // Handle the 'Help' button, display help.
    const handleHelpBtn = function() {
        log('handleHelpBtn');
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

    function observerOff() {
        log('[observerOff]');
        observer.disconnect();
    }

    function observerOn() {
        log('[observerOn]');
        observer.observe(targetNode, config);
    }

    function handlePageLoad() {
        targetNode = document.getElementById('racingMainContainer');
        if (!targetNode) return setTimeout(handlePageLoad, 250);
        observerOn();
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    versionCheck();

    loadStyles();
    const xedxMainDiv = getMainDiv(); // Wrapped, to fold for easier code viewing. At end of file.

    callOnContentLoaded(handlePageLoad);

    function loadStyles() { // TBD: finish 'styling' the dialog
        GM_addStyle(`.xedx-label {color: #06699B; margin-left: 10px;}
                     .xedx-chkbox {margin-right: 10px;}
                     .xedx-btn {border: 1px black solid; border-radius: 5px; background-color: #888888;}
                     .xedx-body {border: 2px black solid;}
        `);
    }

    function getMainDiv() {
        let result =
            `<div class="sortable-box t-blue-cont h" id="xedx-carorder">
            <div class="title main-title title-black border-round" role="table" aria-level="5" id="xedx-hdr-div">
                <div class="arrow-wrap sortable-list" id="xedx-arrow">
                    <a role="button" href="#/" class="accordion-header-arrow right" i-data="i_946_369_9_14"></a>
                </div>Car Order
            </div>
            <div class="bottom-round xedx-body" id="xedx-body-div" style="display: none;">
                <div id="xedx-content-div" class="cont-gray bottom-round" style="background-color: #ddd;">
                    <span style="display: block; overflow: hidden; padding: 5px 10px;">
                        <span class="btn-wrap silver">
                            <span class="xedx-btn" style="padding: 5px 10px;">
                                <button style="width: 108px;" id="xedx-save-btn">Save</button>
                            </span>
                        </span>
                        <span class="btn-wrap silver">
                            <span class="xedx-btn" style="padding: 5px 10px;">
                                <button style="width: 108px;" id="xedx-restore-btn">Restore</button>
                            </span>
                        </span>
                        <span>
                            <label class="xedx-label">
                            <input type="checkbox" class="xedx-chkbox" id="xedx-chkbox1">Load Saved Order at Startup
                            </label>
                        </span>
                    </span>
                    <span style="display: block; overflow: hidden; padding: 5px 10px;">
                        <span class="btn-wrap silver">
                            <span class="xedx-btn" style="padding: 5px 10px;">
                                <button style="width: 108px;" id="xedx-default-btn">Defaults</button>
                            </span>
                        </span>
                        <span class="btn-wrap silver">
                            <span class="xedx-btn" style="padding: 5px 10px;">
                                <button style="width: 108px;" id="xedx-help-btn">Help</button>
                            </span>
                        </span>
                    </span>
                </div>
            </div>
            <hr class="delimiter-999 m-top10 m-bottom10">
        </div>`;

        return result;
    }

})();


