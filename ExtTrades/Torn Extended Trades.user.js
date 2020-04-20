// ==UserScript==
// @name         Torn Extended Trades
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Allows immediate selection of multiple items in a trade.
// @author       xedx [2100735]
// @match        https://www.torn.com/trade.php*
// ==/UserScript==

(function() {
    'use strict';

    function getTargetName(target) {
        let reactId = target.getAttribute('data-reactid');
        let parent4 = target.parentElement.parentElement.parentElement.parentElement;
        let nameWrap = parent4.getElementsByClassName('name-wrap')[0];
        return nameWrap.children[0].innerText;
    }

    function selectItem(item) {
        item.setAttribute('aria-checked', "true");
        item.children[0].setAttribute('checked', "checked");
        item.children[1].setAttribute('class', "checked");
    }

    var savedIds = [];
    function clickSimilarTargets(sourceInput, sourceReactId, findName) {
        let inputs = document.getElementsByClassName("checkbox-fake-wrapper");
        for (let i=0; i < inputs.length; i++) {
            let reactId = inputs[i].getAttribute('data-reactid');
            if (inputs[i] == sourceInput || reactId == sourceReactId) {continue;}
            let target = inputs[i];
            let parent4 = target.parentElement.parentElement.parentElement.parentElement;
            let nameWrap = parent4.getElementsByClassName('name-wrap')[0];
            let name = nameWrap.children[0].innerText;
            if (name == findName) {
                savedIds.push(reactId);
                selectItem(target.children[0]);
            }
        }
    }

    var eventOptions = {
        once: true,
        passive: true,
        capture: false
    }

    function trapCheckboxes() {
        let inputs = document.getElementsByClassName("checkbox-fake-wrapper");
        for (let i=0; i < inputs.length; i++) {
            inputs[i].addEventListener('click', function(e) {
                let name = getTargetName(e.currentTarget);
                let reactId = e.currentTarget.getAttribute('data-reactid');
                if (savedIds.includes(reactId)) {return;}
                savedIds.push(reactId);
                clickSimilarTargets(inputs[i], reactId, name);
            }, eventOptions);
        }
    }

    // Kick it off here, if we're on the right page (the 'add items' page)
    console.log('Torn Extended Trades script started!');
    window.onload = function () {
        if (window.location.href.indexOf('trade.php#step=add') != -1) {
            trapCheckboxes();
        }
    }

})();