// ==UserScript==
// @name         Torn Crime Tooltips
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Provides Tool Tips the Criminal Record section of the Home page
// @author       xedx [2100735]
// @include      https://www.torn.com/index.php
// @updateURL    https://github.com/edlau2/Tampermonkey/blob/master/CrimeTooltips/Torn%20Crime%20Tooltips.user.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

(function() {
    'use strict';

    //////////////////////////////////////////////////////////////////////
    // General utility functions
    //////////////////////////////////////////////////////////////////////

    // HTML constants
    var CRLF = '<br/>';
    var TAB = '&emsp;';

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

    // Wildcard version of getElementsByClassName()
    function myGetElementsByClassName2(anode, className) {
        var elems = anode.getElementsByTagName("*");
        var matches = [];
        for (var i=0, m=elems.length; i<m; i++) {
            if (elems[i].className && elems[i].className.indexOf(className) != -1) {
                matches.push(elems[i]);
            }
        }

        return matches;
    }

    //////////////////////////////////////////////////////////////////////
    // Functions that do the tool tip adding to separate DIV's
    //////////////////////////////////////////////////////////////////////

    function addCriminalRecordToolTips() {
        var rootDiv = document.getElementsByClassName('cont-gray bottom-round criminal-record')[0];
        if (!validPointer(rootDiv)) {
            console.log('Cannot find criminal record div!');
            return;
        }

        // Define the tool tip style to whatever we want.
        GM_addStyle(".tooltip1 {" +
                    "display:none;" +
                    "background: solid white;" +
                    "font-size:12px;" +
                    "height:10px;" +
                    "width:80px;" +
                    "padding:10px;" +
                    "color:#fff; " +
                    "z-index: 99;" +
                    "bottom: 10px;" +
                    "border: 2px solid black;" +
                    /* for IE */
                    "filter:alpha(opacity=80);" +
                    /* CSS3 standard */
                    "opacity:0.8;" +
                    "}");

        GM_addStyle(".tooltip2 {" +
                  "radius: 4px !important;" +
                  "background-color: #ddd !important;" +
                  //" color: rgb(255, 77, 85) !important;" +
                  "padding: 5px 20px;" +
                  "border: 2px solid white;" +
                  "border-radius: 10px;" +
                  "width: 300px;" +
                  "margin: 50px;" +
                  "text-align: left;" +
                  "font: bold 14px ;" +
                  "font-stretch: condensed;" +
                  "text-decoration: none;" +
                  // "box-shadow: 0 0 10px black;" +
                  "}");

        var ul = rootDiv.getElementsByClassName("info-cont-wrap")[0];
        var items = ul.getElementsByTagName("li");
        for (var i = 0; i < items.length; ++i) {
            var label = items[i].innerText;
            if (label.indexOf('Illegal') != -1) {
                dispIllegalProductsTT(items[i]);
            } else if (label.indexOf('Theft') != -1) {
                dispTheftTT(items[i]);
            } else if (label.indexOf('Auto') != -1) {
                dispAutoTT(items[i]);
            } else if (label.indexOf('Drug') != -1) {
                dispDrugTT(items[i]);
            } else if (label.indexOf('Computer') != -1) {
                dispComputerTT(items[i]);
            } else if (label.indexOf('Murder') != -1) {
                dispMurderTT(items[i]);
            } else if (label.indexOf('Fraud') != -1) {
                dispFraudTT(items[i]);
            } else if (label.indexOf('Other') != -1) {
                dispOtherTT(items[i]);
            } else if (label.indexOf('Total') != -1) {
                dispTotalTT(items[i]);
            }
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Functions for tool tips for each individual crime type
    //////////////////////////////////////////////////////////////////////

    // Helper to get the value of the number associated with the
    // span, which is a key/value string pair.
    function getPctForLi(li, value) {
        var span = li.getElementsByClassName('desc')[0];
        var spanText = span.innerText.replace(/,/g, "")
        var pctText = Number(spanText)/value * 100;
        if (Number(pctText) >= 100) {
            pctText = '<B><font color=\'green\'>100%</font></B>';
        } else {
            pctText = '<B><font color=\'red\'>' + Math.round(pctText) + '%</font></B>';
        }

        return pctText;
    }

    //
    // For some reason, calling this does not work.
    // The tooltip quickly dissapears...
    // Figured out why - positioning at the top causes the text to
    // go under the mouse, firing a mouse move event.
    //
    // Note that this replaces the default tool tips, added like this:
    // $(useDiv).attr("data-html", "true");
    // $(useDiv).attr("title", text);
    //
    // That does not allow for very long tool tips, they wind up truncated
    // with elipses.
    //
    function displayToolTip(li, text) {
        $(document).ready(function() {
            $(li).attr("title", "original");
            $(li).tooltip({
                content: text,
                //position: { my: "center top", at: "center top"},
                classes: {
                    "ui-tooltip": "tooltip2"
                }
            });
            //$(li).tooltip("option", "track", true);
            $(li).on( "tooltipclose", function( event, ui ) {
                var span = li.getElementsByClassName('divider')[0];
                console.log('ToolTip \"' + span.innerText + '\" CLOSE!');
            });
        })
    }

    function dispIllegalProductsTT(li) {
        var text = '<B>Illegal Products (Bottlegging):</B>' + CRLF + TAB + 'Sell Copied Media' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Civil Offence\",</B> ' + getPctForLi(li, 5000);

        displayToolTip(li, text);
    }

    function dispTheftTT(li) {
        var text = '<B>Theft:</B>' + CRLF +
            TAB + 'Shoplift, Pickpocket Someone, Larceny,' + CRLF + TAB + 'Armed Robberies, Kidnapping' + CRLF + CRLF;
        text = text + 'Honor Bars at:' + CRLF +
            TAB + '1,000: <B>\"Candy Man\",</B> ' + getPctForLi(li, 1000) + CRLF +
            TAB + '2,500: <B>\"Smile You\'re On Camera\",</B> ' + getPctForLi(li, 2500) + CRLF +
            TAB + '5,000: <B>\"Smokin\' Barrels\",</B> ' + getPctForLi(li, 5000) + CRLF +
            TAB + '7,500: <B>\"Breaking And Entering\",</B> ' + getPctForLi(li, 7500) + CRLF +
            TAB + '10,000: <B>\"Stroke Bringer\",</B> ' + getPctForLi(li, 10000);

        var span = li.getElementsByClassName('desc')[0];
        var thefts = Number(span.innerText.replace(/,/g, ""));
        var text2 = 'Medals at: <B>' +
            ((thefts > 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
            ((thefts > 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
            ((thefts > 5000) ? '<font color=green>5000, </font></B>' : '<font color=red>5000, </font>') +
            ((thefts > 7500) ? '<font color=green>7500, </font></B>' : '<font color=red>7500, </font>') +
            ((thefts > 10000) ? '<font color=green>10000, </font></B>' : '<font color=red>10000, </font>') +
            ((thefts > 12500) ? '<font color=green>12500, </font></B>' : '<font color=red>12500, </font>') +
            ((thefts > 15000) ? '<font color=green>15000, </font></B>' : '<font color=red>15000, </font>') +
            ((thefts > 17500) ? '<font color=green>17500, </font></B>' : '<font color=red>17500, </font>') +
            ((thefts > 20000) ? '<font color=green>20000, </font></B>' : '<font color=red>20000, </font>') +
            ((thefts > 22500) ? '<font color=green>22500, </font></B>' : '<font color=red>22500, </font>') +
            ((thefts > 25000) ? '<font color=green>25000</font></B>' : '<font color=red>25000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispAutoTT(li) {
        var text = '<B>Auto Theft:</B>' + CRLF + TAB + 'Grand Theft Auto' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Joy Rider\",</B> ' + getPctForLi(li, 5000);

        var span = li.getElementsByClassName('desc')[0];
        var crimes = Number(span.innerText.replace(/,/g, ""));
        var text2 = 'Medals at: <B>' +
            ((crimes > 1500) ? '<font color=green>1500, </font>' : '<font color=red>1500, </font>') +
            ((crimes > 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((crimes > 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
            ((crimes > 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
            ((crimes > 3500) ? '<font color=green>3500, </font>' : '<font color=red>3500, </font>') +
            ((crimes > 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((crimes > 4500) ? '<font color=green>4500, </font>' : '<font color=red>4500, </font>') +
            ((crimes > 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
            ((crimes > 5500) ? '<font color=green>5500, </font>' : '<font color=red>5500, </font>') +
            ((crimes > 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((crimes > 6500) ? '<font color=green>6500, </font>' : '<font color=red>6500, </font>') +
            ((crimes > 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((crimes > 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((crimes > 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((crimes > 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');


        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispDrugTT(li) {
        var text = '<B>Drug deals:</B>' + CRLF + TAB + 'Transport Drugs' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Escobar\",</B> ' + getPctForLi(li, 5000);

        var span = li.getElementsByClassName('desc')[0];
        var crimes = Number(span.innerText.replace(/,/g, ""));
        var text2 = 'Medals at: <B>' +
            ((crimes > 250) ? '<font color=green>250, </font>' : '<font color=red>250, </font>') +
            ((crimes > 500) ? '<font color=green>500, </font>' : '<font color=red>500, </font>') +
            ((crimes > 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
            ((crimes > 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((crimes > 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((crimes > 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((crimes > 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((crimes > 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispComputerTT(li) {
        var text = '<B>Computer crimes:</B>' + CRLF + TAB + 'Plant a Computer Virus, Hacking' + CRLF + CRLF;
        text = text + 'Honor Bar at 1,000: <B>\"Bug\",</B> ' + getPctForLi(li, 1000) + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"We Have A Breach\",</B> ' + getPctForLi(li, 5000);

        var span = li.getElementsByClassName('desc')[0];
        var crimes = Number(span.innerText.replace(/,/g, ""));
        var text2 = 'Medals at: <B>' +
            ((crimes > 1500) ? '<font color=green>1500, </font>' : '<font color=red>1500, </font>') +
            ((crimes > 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((crimes > 2500) ? '<font color=green>2500, </font>' : '<font color=red>2500, </font>') +
            ((crimes > 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
            ((crimes > 3500) ? '<font color=green>3500, </font>' : '<font color=red>3500, </font>') +
            ((crimes > 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((crimes > 4500) ? '<font color=green>4500, </font>' : '<font color=red>4500, </font>') +
            ((crimes > 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
            ((crimes > 5500) ? '<font color=green>5500, </font>' : '<font color=red>5500, </font>') +
            ((crimes > 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((crimes > 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((crimes > 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((crimes > 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((crimes > 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispMurderTT(li) {
        var text = '<B>Murder crimes:</B>' + CRLF + TAB + 'Assasination' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Professional\",</B> ' + getPctForLi(li, 5000);

        var span = li.getElementsByClassName('desc')[0];
        var frauds = Number(span.innerText.replace(/,/g, ""));
        var text2 = 'Medals at: <B>' +
            ((frauds > 1000) ? '<font color=green>1000, </font>' : '<font color=red>1000, </font>') +
            ((frauds > 2000) ? '<font color=green>2000, </font>' : '<font color=red>2000, </font>') +
            ((frauds > 3000) ? '<font color=green>3000, </font>' : '<font color=red>3000, </font>') +
            ((frauds > 4000) ? '<font color=green>4000, </font>' : '<font color=red>4000, </font>') +
            ((frauds > 5000) ? '<font color=green>5000, </font>' : '<font color=red>5000, </font>') +
            ((frauds > 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((frauds > 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((frauds > 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((frauds > 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((frauds > 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispFraudTT(li) {
        var text = '<B>Fraud crimes:</B>' + CRLF + TAB + 'Arson, Pawn Shop, Counterfeiting,' + CRLF + TAB +
            'Arms Trafficking, Bombings' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Fire Starter\",</B> ' + getPctForLi(li, 5000);

        var span = li.getElementsByClassName('desc')[0];
        var frauds = Number(span.innerText.replace(/,/g, ""));
        var text2 = 'Medals at: <B>' +
            ((frauds > 6000) ? '<font color=green>6000, </font>' : '<font color=red>6000, </font>') +
            ((frauds > 7000) ? '<font color=green>7000, </font>' : '<font color=red>7000, </font>') +
            ((frauds > 8000) ? '<font color=green>8000, </font>' : '<font color=red>8000, </font>') +
            ((frauds > 9000) ? '<font color=green>9000, </font>' : '<font color=red>9000, </font>') +
            ((frauds > 10000) ? '<font color=green>10000</font>' : '<font color=red>10000</font></B>');

        displayToolTip(li, text + CRLF + CRLF + text2);
    }

    function dispOtherTT(li) {
        var text = '<B>Other crimes:</B>' + CRLF + TAB + 'Search for cash' + CRLF + CRLF;
        text = text + 'Honor Bar at 5,000: <B>\"Find A Penny, Pick It Up\",</B> ' + getPctForLi(li, 5000);

        displayToolTip(li, text);
    }

    function dispTotalTT(li) {
        var text = '<B>Total Criminal Offences:</B>' + CRLF + TAB + 'Well, everything.' + CRLF + CRLF;
        text = text + 'Honor Bar at 10,000: <B>\"Society\'s Worst\",</B> ' + getPctForLi(li, 10000);

        displayToolTip(li, text);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    // 'Main'
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    console.log("Torn HomePage Tooltips script started!");

    document.addEventListener('readystatechange', event => {
        if (event.target.readyState === "complete") {
            addCriminalRecordToolTips();
        }
    });

})();