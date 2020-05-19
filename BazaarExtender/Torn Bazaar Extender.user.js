// ==UserScript==
// @name         Torn Bazaar Extender
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds additional item info to Bazaar item data
// @author       xedx [2100735]
// @include      https://www.torn.com/bazaar.php*
// @include      https://www.torn.com/item.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==


(function() {
    'use strict';


    /////////////////////////////////////////////////////////////////
    // Look for an item that has been expanded, and grab it's info
    /////////////////////////////////////////////////////////////////

    function trapItemDetails() {

        console.log(GM_info.script.name + ': trapItemDetails');

        //debugger;

        let parentDiv = $('div.ReactVirtualized__Grid').get();
        if (!validPointer(parentDiv) || !parentDiv.length) {return;}

        let owlItem = $(parentDiv).find('div.info___3-0WL').get();
        if (!owlItem.length || !validPointer(owlItem)) {return;}

        let clearfix = $(owlItem).find('div.info-content > div.clearfix.info-wrap')[0];
        if (!validPointer(clearfix)) {return;}

        //let pricingUl = $(clearfix).find('ul.info-cont')[0];
        //if (!validPointer(pricingUl)) {return;}

        let statsUl = $(clearfix).find('ul.info-cont.list-wrap')[0];
        if (!validPointer(statsUl)) {return;}

        let newItem = getNewItem();

        //getNameTypeItemInfo(owlItem, newItem);
        //getPricingInfo(pricingUl, newItem);
        getStatInfo(statsUl, newItem);

        console.log(GM_info.script.name + ': newItem: ', newItem);


    }

    // For the items page, get active 'class' - melee,secondary, primary
    function itemsGetActiveClass() {
        if ($("#melee-items").attr('aria-hidden') == 'false') {return $("#melee-items").get();}
        if ($("#secondary-items").attr('aria-hidden') == 'false') {return $("#secondary-items").get();}
        if ($("#primary-items").attr('aria-hidden') == 'false') {return $("#primary-items").get();}
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
                id: 'N/A',         // <== buildUi
                hash: 0,
                };
    }

    /////////////////////////////////////////////////////////////////
    // Fill damage, accuracy and quality item info data members
    /////////////////////////////////////////////////////////////////

    function getStatInfo(element, newItem) {
        let liList = element.getElementsByTagName('li');
        let dmgLi = liList[0], accLi = liList[1]; //, qLi = liList[6];
        let count = liList.length;
        let clearElem = $(element).find('li.clear');
        let lastEmptyElem = $(element).find('li:not(.additional-bonus-item,.clear)');

        let myLi = $(element).find('li.xedx');
        if (myLi.length > 0) return;

        newItem.dmg = $(dmgLi).find('div.desc').get()[0].innerText.trim();
        newItem.acc = $(accLi).find('div.desc').get()[0].innerText.trim();

        let total = parseFloat(newItem.dmg) + parseFloat(newItem.acc);

        let subElem = '<div class="title">Total:</div>' +
            '<div class="desc">' +
            '<i class="bonus-attachment-item-damage-bonus"></i> ' + total.toFixed(2) + '</div>';
        let newLeftElem =
            '<li class="additional-bonus-item t-left xedx" aria-label="Total: ' + total.toFixed(2) + '" tabindex="0">' +
            subElem +
            '</li>';
        let emptyLeftElem = '<li class="t-rigth"></li>';
        let emptyRightElem = '<li class="t-rigth"></li>';

        // Need either the first *empty* <li> before <li class="clear">, or insert *before* the "clear" class element.
        if (lastEmptyElem.length > 0) {
            // Fill empty elem...
            let target = $(lastEmptyElem)[0];
            $(target).addClass('additional-bonus-item');
            $(target).addClass('xedx');
            $(target).removeClass('t-hide');
            $(target).append(subElem);
        } else {
            // Insert new one
            $(newLeftElem).insertBefore(clearElem);
            $(emptyRightElem).insertBefore(clearElem);
            $(emptyLeftElem).insertBefore(clearElem);
            $(emptyRightElem).insertBefore(clearElem);
        }

        /*
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
        */
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

    var targetNode = document.getElementById('bazaarroot');
    var config = { attributes: false, childList: true, subtree: true };
    var callback = function(mutationsList, observer) {
        observer.disconnect();
        console.log(GM_info.script.name + ': mutation observed ==> trapItemDetails');
        trapItemDetails();
        observer.observe(targetNode, config);
    };
    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);

    /*
    window.onload = function () {
        // Will be unbound once UI is in place.
        $(targetNode).bind('DOMNodeInserted', function(e) {
            console.log(e.type + ' ==> trapItemDetails');
            trapItemDetails();
        });
    };
    */
    
})();




