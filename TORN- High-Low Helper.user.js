// ==UserScript==
// @name         TORN: High/Low Helper
// @version      1.2
// @description  Only display the 'best' choice for high/low.
// @author       DeKleineKobini
// @namespace    DeKleineKobini [2114440]
// @run-at       document-end
// @license      MIT
// @match        https://www.torn.com/loader.php?sid=highlow
// @updateURL    https://openuserjs.org/meta/DeKleineKobini/TORN_HighLow_Helper.meta.js
// ==/UserScript==

$(document).ajaxComplete((event, jqXHR, ajaxObj) => {
  if (jqXHR.responseText) {
    handle(jqXHR.responseText)
  }
})

var cards = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];

function shuffleCards() {
  cards = [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
}

function getCardsLower(card) {
  let index = card - 2;
  let amount = 0;

  for (let i = 0; i < index; i++) {
    amount = amount + cards[i];
  }
  return amount;
}

function getCardsHigher(card) {
  let index = card - 2;
  let amount = 0;

  for (let i = index + 1; i < cards.length; i++) {
    amount = amount + cards[i];
  }
  return amount;
}

function handle(responseText) {
  var json = JSON.parse(responseText);

  if (json.DB && json.DB.deckShuffled) shuffleCards();

  var currentText;
  var current;

  if (json.status == "gameStarted") {
    currentText = json.currentGame[0].dealerCardInfo.nameShort;

    if (json.currentGame[0].result == "Incorrect") return;

    if (currentText == "J") current = 11;
    else if (currentText == "Q") current = 12;
    else if (currentText == "K") current = 13;
    else if (currentText == "A") current = 14;
    else current = parseInt(currentText);

    cards[current - 2] = cards[current - 2] - 1;

    console.log(cards);
    console.log("lower: " + getCardsLower(current) + ", higher: " + getCardsHigher(current));

    // if(current >= 8){
    if (getCardsLower(current) > getCardsHigher(current)) {
      $(".high")[0].style = "display: none";
      $(".low")[0].style = "display: inline-block";
    }
    else {
      $(".low")[0].style = "display: none";
      $(".high")[0].style = "display: inline-block";
    }
    $(".startGame")[0].style = "display: none";
  }
  else if (json.status == "makeChoice") {
    currentText = json.currentGame[0].dealerCardInfo.nameShort;

    if (currentText == "J") current = 11;
    else if (currentText == "Q") current = 12;
    else if (currentText == "K") current = 13;
    else if (currentText == "A") current = 14;
    else current = parseInt(currentText);

    cards[current - 2] = cards[current - 2] - 1;
  }
  else if (json.status == "startGame") {
    $(".actions-wrap")[0].style = "display: block";
    $(".actions")[0].appendChild($(".startGame")[0])
    $(".startGame")[0].style = "display:inline-block";
    $(".low")[0].style = "display: none";
    $(".high")[0].style = "display: none";
    $(".continue")[0].style = "display: none";
  }
}
