// ==UserScript==
// @name         Torn Crime Tooltips
// @namespace    http://tampermonkey.net/
// @version      0.13
// @description  Provides Tool Tips the Criminal Record section of the Home page
// @author       xedx [2100735]
// @include      https://www.torn.com/index.php
// @updateURL    https://github.com/edlau2/Tampermonkey/blob/master/CrimeTooltips/Torn%20Crime%20Tooltips.user.js
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    GM_addStyle(`.ui-helper-hidden-accessible {display: none;}`);

    // Globals
    debugLoggingEnabled = false;
    loggingEnabled = true;

    //////////////////////////////////////////////////////////////////////
    // Functions that do the tool tip adding to separate DIV's
    //////////////////////////////////////////////////////////////////////

    function addCriminalRecordToolTips() {

        var rootDiv = document.getElementsByClassName('cont-gray bottom-round criminal-record')[0];
        if (!validPointer(rootDiv)) {return;}

        addToolTipStyle();

        let ul = rootDiv.getElementsByClassName("info-cont-wrap")[0];
        let items = ul.getElementsByTagName("li");
        for (let i = 0; i < items.length; ++i) {
            let li = items[i];
            let label = li.innerText;
            let ariaLabel = li.getAttribute('aria-label');
            let crimes = qtyFromAriaLabel(ariaLabel);

            // Note - can just switch and pass # crimes.
            // aria-label = "Drug deals: 255" for example.
            //
            // TBD: parseCrimesFromAriaLabel(), then pass to disp...TT
            //
            debug('li #' + i + '\nlabel = "' + label +'"\naria-label = "' + ariaLabel +'"');
            if (ariaLabel.indexOf('Illegal') != -1) {
                dispIllegalProductsTT(li, crimes);
            } else if (ariaLabel.indexOf('Theft') != -1) {
                dispTheftTT(li, crimes);
            } else if (ariaLabel.indexOf('Auto theft') != -1) {
                dispAutoTT(li, crimes);
            } else if (ariaLabel.indexOf('Drug deals') != -1) {
                dispDrugTT(li, crimes);
            } else if (ariaLabel.indexOf('Computer crimes') != -1) {
                dispComputerTT(li, crimes);
            } else if (ariaLabel.indexOf('Murder') != -1) {
                dispMurderTT(li, crimes);
            } else if (ariaLabel.indexOf('Fraud crimes') != -1) {
                dispFraudTT(li, crimes);
            } else if (ariaLabel.indexOf('Other') != -1) {
                dispOtherTT(li, crimes);
            } else if (ariaLabel.indexOf('Total') != -1) {
                dispTotalTT(li, crimes);
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Functions for tool tips for each individual crime type
    //////////////////////////////////////////////////////////////////////

    function qtyFromAriaLabel(ariaLabel) {
        // ex. aria-label = "Drug deals: 255"
        var parts = ariaLabel.split(':');
        return Number(parts[1].replace(/,/g, ""));
    }

    // Helper to get the value of the number associated with the
    // span, which is a key/value string pair, as a percentage.
    function getPctForLi(li, value) {
        let ariaLabel = li.getAttribute('aria-label');
        let crimes = qtyFromAriaLabel(ariaLabel);
        let pctText = crimes/value * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
        }

        return pctText;
    }

    function dispIllegalProductsTT(li, crimes) {
        debug('dispIllegalProductsTT');
        var text = '<B>Illegal Products (Bottlegging):</B>' + CRLF + TAB + 'Sell Copied Media, Arms Trafficking' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Civil Offence\",</B> ' + getPctForLi(li, 5000);

        displayToolTip(li, text);
    }

    function dispTheftTT(li, thefts) {
        var text = '<B>Theft:</B>' + CRLF +
            TAB + 'Shoplift, Pickpocket Someone, Larceny,' + CRLF + TAB + 'Armed Robberies, Kidnapping' + CRLF + CRLF;
            text = text + 'Honor Bars at:' + CRLF +
            TAB + '1,000: <B>\"Candy Man\",</B> ' + getPctForLi(li, 1000) + CRLF +
            TAB + '2,500: <B>\"Smile You\'re On Camera\",</B> ' + getPctForLi(li, 2500) + CRLF +
            TAB + '5,000: <B>\"Smokin\' Barrels\",</B> ' + getPctForLi(li, 5000) + CRLF +
            TAB + '7,500: <B>\"Breaking And Entering\",</B> ' + getPctForLi(li, 7500) + CRLF +
            TAB + '10,000: <B>\"Stroke Bringer\",</B> ' + getPctForLi(li, 10000);

        debug('dispTheftTT, thefts = ' + thefts);
        var text2 = 'Medals at: <B>' +
            ((thefts >= 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
            ((thefts >= 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
            ((thefts >= 5000) ? '<font color=green>5000, </font></B>' : '<font color=red>5000, </font>') +
            ((thefts >= 7500) ? '<font color=green>7500, </font></B>' : '<font color=red>7500, </font>') +
            ((thefts >= 10000) ? '<font color=green>10000, </font></B>' : '<font color=red>10000, </font>') +
            ((thefts >= 12500) ? '<font color=green>12500, </font></B>' : '<font color=red>12500, </font>') +
            ((thefts >= 15000) ? '<font color=green>15000, </font></B>' : '<font color=red>15000, </font>') +
            ((thefts >= 17500) ? '<font color=green>17500, </font></B>' : '<font color=red>17500, </font>') +
            ((thefts >= 20000) ? '<font color=green>20000, </font></B>' : '<font color=red>20000, </font>') +
            ((thefts >= 22500) ? '<font color=green>22500, </font></B>' : '<font color=red>22500, </font>') +
            ((thefts >= 25000) ? '<font color=green>25000</font></B>' : '<font color=red>25000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispAutoTT(li, crimes) {
        var text = '<B>Auto Theft:</B>' + CRLF + TAB + 'Grand Theft Auto' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Joy Rider\",</B> ' + getPctForLi(li, 5000);

        debug('dispAutoTT, crimes = ' + crimes);
        var text2 = 'Medals at: <B>' +
            ((crimes >= 1500) ? '<font color=green>1500, </font>' : '<font color=red>1500, </font>') +
            ((crimes >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((crimes >= 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
            ((crimes >= 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
            ((crimes >= 3500) ? '<font color=green>3500, </font>' : '<font color=red>3500, </font>') +
            ((crimes >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((crimes >= 4500) ? '<font color=green>4500, </font>' : '<font color=red>4500, </font>') +
            ((crimes >= 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
            ((crimes >= 5500) ? '<font color=green>5500, </font>' : '<font color=red>5500, </font>') +
            ((crimes >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((crimes >= 6500) ? '<font color=green>6500, </font>' : '<font color=red>6500, </font>') +
            ((crimes >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((crimes >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((crimes >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((crimes >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');


        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispDrugTT(li, crimes) {
        var text = '<B>Drug deals:</B>' + CRLF + TAB + 'Transport Drugs' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Escobar\",</B> ' + getPctForLi(li, 5000);

        debug('dispDrugTT, crimes = ' + crimes);
        var text2 = 'Medals at: <B>' +
            ((crimes >= 250) ? '<font color=green>250, </font>' : '<font color=red>250, </font>') +
            ((crimes >= 500) ? '<font color=green>500, </font>' : '<font color=red>500, </font>') +
            ((crimes >= 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
            ((crimes >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((crimes >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((crimes >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((crimes >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((crimes >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispComputerTT(li, crimes) {
        var text = '<B>Computer crimes:</B>' + CRLF + TAB + 'Plant a Computer Virus, Hacking' + CRLF + CRLF;
        text = text + 'Honor Bar at 1,000: <B>\"Bug\",</B> ' + getPctForLi(li, 1000) + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"We Have A Breach\",</B> ' + getPctForLi(li, 5000);

        debug('dispComputerTT, crimes = ' + crimes);
        var text2 = 'Medals at: <B>' +
            ((crimes >= 1500) ? '<font color=green>1500, </font>' : '<font color=red>1500, </font>') +
            ((crimes >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((crimes >= 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
            ((crimes >= 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
            ((crimes >= 3500) ? '<font color=green>3500, </font>' : '<font color=red>3500, </font>') +
            ((crimes >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((crimes >= 4500) ? '<font color=green>4500, </font>' : '<font color=red>4500, </font>') +
            ((crimes >= 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
            ((crimes >= 5500) ? '<font color=green>5500, </font>' : '<font color=red>5500, </font>') +
            ((crimes >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((crimes >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((crimes >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((crimes >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((crimes >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispMurderTT(li, frauds) {
        var text = '<B>Murder crimes:</B>' + CRLF + TAB + 'Assasination' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Professional\",</B> ' + getPctForLi(li, 5000);

        debug('dispMurderTT, crimes = ' + frauds);
        var text2 = 'Medals at: <B>' +
            ((frauds >= 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
            ((frauds >= 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((frauds >= 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
            ((frauds >= 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((frauds >= 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
            ((frauds >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((frauds >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((frauds >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((frauds >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((frauds >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispFraudTT(li, frauds) {
        var text = '<B>Fraud crimes:</B>' + CRLF + TAB + 'Arson, Pawn Shop, Counterfeiting,' + CRLF + TAB +
            'Arms Trafficking, Bombings' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Fire Starter\",</B> ' + getPctForLi(li, 5000);

        debug('dispFraudTT, crimes = ' + frauds);
        var text2 = 'Medals at: <B>' +
            ((frauds >= 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((frauds >= 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((frauds >= 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((frauds >= 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((frauds >= 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispOtherTT(li, crimes) {
        debug('dispOtherTT');
        var text = '<B>Other crimes:</B>' + CRLF + TAB + 'Search for cash' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Find A Penny, Pick It Up\",</B> ' + getPctForLi(li, 5000);

        displayToolTip(li, text);
    }

    function dispTotalTT(li, crimes) {
        debug('dispTotalTT');
        var text = '<B>Total Criminal Offences:</B>' + CRLF + TAB + 'Well, everything.' + CRLF + CRLF;
        text = text + 'Honor Bar at 10,000: <B>\"Society\'s Worst\",</B> ' + getPctForLi(li, 10000);

        displayToolTip(li, text);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 'Main'
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    logScriptStart();
    if (awayFromHome()) {return;}
    versionCheck();

    document.addEventListener('readystatechange', event => {
        if (event.target.readyState === "complete") {
            addCriminalRecordToolTips();
        }
    });

})();
