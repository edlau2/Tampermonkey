// ==UserScript==
// @name         Torn HiLo Helper
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  This script does...
// @author       xedx [2100735]
// @match        https://www.torn.com/page.php?sid=highlow*
// @icon         https://www.google.com/s2/favicons?domain=torn.com
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/
/*eslint no-loop-func: 0*/

(function() {
    'use strict';

    var cards = JSON.parse(GM_getValue("cards", JSON.stringify([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4])));
    GM_deleteValue("cards");

    debugLoggingEnabled =
        GM_getValue("debugLoggingEnabled", true);    // Extra debug logging

    logScriptStart();

    GM_addStyle(`

        div.xtokens-wrap .xtokens,  div.xtokens-wrap .xwins {
            display: flex;
            font-size: 20px;
            justify-content: center;
            margin-top: 5px;
            color: #79796A;
            text-align: center;
            text-shadow: 0 1px 0 rgb(240, 240, 225);
        }
        .cards-wrap {
            margin-top: -25px;
        }
    `);

    $(document).ajaxComplete((event, jqXHR, ajaxObj) => {
        if (jqXHR.responseText) {
            debug("[ajaxComplete]");
            handle(jqXHR.responseText)
        }
    })

    function shuffleCards() {
        cards = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
        updateTableCells();
    }

    function getCardsLower(card) {
        let index = card - 2;
        let amount = 0;

        for (let i = 0; i < index; i++) {
            amount = amount + cards[i];
        }
        updateTableCells();
        return amount;
    }

    function getCardsHigher(card) {
        let index = card - 2;
        let amount = 0;

        for (let i = index + 1; i < cards.length; i++) {
            amount = amount + cards[i];
        }
        updateTableCells();
        return amount;
    }

    let tokens = 0;
    let wins = 0;
    function handle(responseText) {
        debug("[handle]");

        var json = JSON.parse(responseText);
        if (json.DB && json.DB.deckShuffled) shuffleCards();

        debug("response: ", json);

        if ($(".actions-wrap > .xtokens-wrap").length == 0)
            $(".actions-wrap").append($(`<div class="xtokens-wrap"><div class="xtokens"></div><div class="xwins"></div></div>`));

        if ($(".table.bet span.tokens").length) {
            tokens = $(".table.bet span.tokens").text();
        } else {
            if (json.user) tokens = json.user.slotturns;
        }

        if (tokens != undefined) {
            let msg = tokens + " tokens";
            debug("Set token text: ", msg);
            $(".actions-wrap > .xtokens-wrap > .xtokens").text(msg);
        }
        if (json.currentGame && json.currentGame[0]) {
            wins = json.currentGame[0].winsInRow;
            if (!wins) wins = 0;
            $(".actions-wrap > .xtokens-wrap > .xwins").text(wins + (wins == 1 ? " win" : " wins"));
        }
        if (json.status == "startGame") {
            wins = 0;
            $(".actions-wrap > .xtokens-wrap > .xwins").text(wins + (wins == 1 ? " win" : " wins"));
        }


        var currentText;
        var current;
        if (json.status == "startGame") {
            $(".actions-wrap")[0].style = "display: block";
            $(".actions")[0].appendChild($(".startGame")[0])
            $(".startGame")[0].style = "display:inline-block";
            $(".low")[0].style = "display: none";
            $(".high")[0].style = "display: none";
            $(".continue")[0].style = "display: none";
        } else if (json.status == "gameStarted" || json.status == "makeChoice") {
            if (json.status == "gameStarted" && json.currentGame[0].result != "Incorrect") {
                if (json.currentGame && json.currentGame[0] && json.currentGame[0].dealerCardInfo)
                    currentText = json.currentGame[0].dealerCardInfo.nameShort;
            } else {
                if (json.currentGame && json.currentGame[0] && json.currentGame[0].playerCardInfo)
                    currentText = json.currentGame[0].playerCardInfo.nameShort;
            }

            debug("Removed card, before: ", cards);
            current = getValue(currentText);
            cards[current - 2] = cards[current - 2] - 1;

            debug("Removing card: ", currentText , " (", current, ")");
            debug("Removed card, set ", (current - 2), " (", (cards[current - 2]), ")  to ",  (cards[current - 2] - 1));

            debug(cards);

            updateTableCells();

            if (json.status == "gameStarted") {
                if (json.currentGame[0].result == "Incorrect") return;

                if (getCardsLower(current) >= getCardsHigher(current)) {
                    $(".high")[0].style = "display: none";
                    $(".low")[0].style = "display: inline-block";
                } else {
                    $(".low")[0].style = "display: none";
                    $(".high")[0].style = "display: inline-block";
                }
                $(".startGame")[0].style = "display: none";
            }
        }
    }

    function getValue(text) {
        var value;

        if (text == "J") value = 11;
        else if (text == "Q") value = 12;
        else if (text == "K") value = 13;
        else if (text == "A") value = 14;
        else value = parseInt(text);

        debug("[getValue] text: ", text, " value: ", value);

        return value;
    }

    function updateTableCells() {
        debug("[updateTableCells] cards: ", cards);
        let cardCount = 0;
        for (let idx=0; idx<13; idx++) {
            //if (idx == 12) debug("idx: ", idx, " card: ", cards[idx]);

            let cell = $(`#dbgTable tr:last-child > td:nth-child(${idx + 1})`)[0];
            let txtNow = parseInt(cards[idx]);
            let tblTxt = parseInt($(cell).text());
            debug("[updateTableCells] cards: ", $(cell), txtNow, tblTxt, $(cell).text());

            $(cell).text(cards[idx]);
            if (txtNow != tblTxt) {
                $(cell).addClass("fade-text");
                setTimeout(function () { $(cell).removeClass("fade-text"); }, 2000);
            }

            // if (txtNow != tblTxt) {
            //     $(cell).text(cards[idx]);
            //     $(cell).animate({
            //         color: "limegreen"
            //     }, 1000, function() {
            //         // This function runs after the first animation is complete
            //         $(cell).animate({
            //             color: "#DDDDDD"
            //         }, 1000);
            //     });
            // }
            cardCount += parseInt(cards[idx]);
        }

        $("#deckCount").text(cardCount);
    }

    function installDebugTable(target) {
        debug("[installDebugTable] target: ", $(target));

        GM_addStyle(`
            #dbgTable table {
                width: 100%;
            }
            #dbgTable tbody {
                border: 1px solid white;
            }
            #dbgTable tr {
                height: 32px;
                display: flex;
                justify-content: space-evenly;
            }
            #dbgTable tr:first-child {
                border-bottom: 1px solid green;
            }
            #dbgTable td {
                /* border-top: 1px solid green; */
                color: #DDDDDD;
                font-size: 16px;
                display: flex;
                text-align: center;
                line-height: 2;
                width: -webkit-fill-available;
                justify-content: center;
            }
            #dbgTable th {
                font-size: 18px;
                display: flex;
                text-align: center;
                line-height: 2;
                color: #FFFFFF;
                width: -webkit-fill-available;
                justify-content: center;
            }
            .tbl-ftr {
                display: flex;
                width: 100%
            }
            .tbl-ftr span {
                padding: 0px 10px 0px 5px;
                color: #DDDDDD;
                font-size: 18px;
                display: flex;
                text-align: center;
                line-height: 2;
            }

            @keyframes color-fade-once {
              0% { color: #dddddd; scale: 1.0; }
              50% { color: limegreen; scale: 1.5; }
              100% { color: #dddddd; scale: 1.0; }
            }

            /* The element to animate */
            .fade-text {
              animation-name: color-fade-once;
              animation-duration: 2s;
              animation-timing-function: ease-in-out;
              animation-iteration-count: 3;
            }
        `);

        const dbgTable = `
            <div id="dbgTable"><table><tbody>
                <tr>
                    <th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>J</th><th>Q</th><th>K</th><th>A</th>
                </tr>
                <tr>
                    <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                </tr>
            </tbody></table></div>
            <div class="tbl-ftr">
                <span class="btn">
                   <input id="refresh" type="submit" class="xedx-torn-btn-raw" style="padding: 0px 10px 0px 10px;" value="Reload">
                   <span>Deck Count:</span><span id="deckCount"></span>
               </span>
            </div>

        `;
        $(target).after(dbgTable);
        debug("[installDebugTable] table: ", $("#dbgTable"));

        $("#refresh").on('click', function() {
            GM_setValue("cards", JSON.stringify(cards));
            location.reload();
        });
        updateTableCells();
    }

    function handlePageLoaded(retries=0) {
        let target = $("#mainContainer > div.content-wrapper > div.highlow-main-wrap.beach");
        if (!$(target).length) {
            if (retries++ < 25) return setTimeout(handlePageLoaded, 100, retries);
            return log("Error, no target, timed out.");
        }
        installDebugTable(target);
    }

    callOnContentComplete(handlePageLoaded);


})();