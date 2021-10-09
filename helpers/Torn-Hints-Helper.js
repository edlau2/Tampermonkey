// ==UserScript==
// @exclude     *
// @namespace   https://github.com/edlau2
// @version     1.3
// ==UserLibrary==
// @name        Torn-Hints-Helper
// @description 'Hints' placed in various places
// @author      xedx [2100735]
// @updateURL   https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-Hints-Helper.js
// @license     MIT
// ==/UserLibrary==

// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////////
// 'Hints' placed in various places in Torn, typically the Items pages
///////////////////////////////////////////////////////////////////////////////////

// Format: {name, ID, displayed hint}
var flowerHints = [{"name":"Dahlia", "id": 260, "hint": "(Mexico :18)"},
                  {"name":"Orchid", "id": 264, "hint": "(Hawaii 1:34)"},
                  {"name":"African Violet", "id": 282, "hint": "(South Africa 3:28)"},
                  {"name":"Cherry Blossom", "id": 277, "hint": "(Japan 2:38)"},
                  {"name":"Peony", "id": 276, "hint": "(China 2:49)"},
                  {"name":"Ceibo Flower", "id": 271, "hint": "(Argentina 1:57)"},
                  {"name":"Edelweiss", "id": 272, "hint": "(Zurich 2:03)"},
                  {"name":"Crocus", "id": 263, "hint": "(Canada :29)"},
                  {"name":"Heather", "id": 267, "hint": "(UK 1:51)"},
                  {"name":"Tribulus Omanense","id": 385, "hint": "(UAE 3:10)"},
                  {"name":"Banana Orchid", "id": 617, "hint": "(Caymans :25)"}];

var plushieHints = [{"name":"Jaguar Plushie", "id": 258, "hint": "(Mexico :18)"},
                   {"name":"Lion Plushie", "id": 281, "hint": "(South Africa 3:28)"},
                   {"name":"Panda Plushie", "id": 274, "hint": "(China 2:49)"},
                   {"name":"Monkey Plushie", "id": 269, "hint": "(Argentina 1:57)"},
                   {"name":"Chamois Plushie", "id": 273, "hint": "(Zurich 2:03)"},
                   {"name":"Wolverine Plushie", "id": 261, "hint": "(Canada :29)"},
                   {"name":"Nessie Plushie", "id": 266, "hint": "(UK 1:51)"},
                   {"name":"Red Fox Plushie", "id": 268, "hint": "(UK 1:51)"},
                   {"name":"Camel Plushie", "id": 384, "hint": "(UAE 3:10)"},
                   {"name":"Kitten Plushie", "id": 215, "hint": "(Torn)"},
                   {"name":"Teddy Bear Plushie", "id": 187, "hint": "(Torn)"},
                   {"name":"Sheep Plushie", "id": 186, "hint": "(Torn)"},
                   {"name":"Stingray Plushie", "id": 618, "hint": "(Caymans :25)"}];

var temporaryHints = [{"name":"Epinephrine", "id": 463, "hint": "(Strength by +500% for 120 secs)"},
                     {"name":"Melatonin", "id": 464, "hint": "(Speed by +500% for 120 secs)"},
                     {"name":"Serotonin", "id": 465, "hint": "(Defense by +300% for 120 secs, life by 25%)"},
                     {"name":"Tyrosine", "id": 814, "hint": "(Dexterity by +500% for 120 seconds)"},
                     {"name":"Pepper Spray", "id": 392, "hint": "(Dexterity by -1/5th for 15-20 seconds)"},
                     {"name":"Smoke Grenade", "id": 226, "hint": "(Speed by -1/3rd for 120-180 seconds)"},
                     {"name":"Flash Grenade", "id": 222, "hint": "(Speed by -1/5th for 15-20 seconds)"},
                     {"name":"Tear Gas", "id": 256, "hint": "(Dexterity by -1/3rd for 120-180 seconds)"}];

///////////////////////////////////////////////////////////////////////////////////
// Find items we care about (via our hint arrays) and add the hint
// Takes a node list of <li>'s, and uses the format in the Items Lists
// in Torn, to locate where text is displayed. Items are compared against
// the supplied array of hints - three are supplied here. If a match id found,
// by ID, the hint in the array is displayed to the right of the name/qty.
///////////////////////////////////////////////////////////////////////////////////

function fillHints(liList, searchArray) {
    let hintsAdded = 0;

    let xedxDiv = liList[0].parentNode.querySelector('.xedx-item-div');
    if (validPointer(xedxDiv)) {return 0;}

    console.log('Fill Hints, li list:', liList);
    console.log('search array: ', searchArray);
    for (let i = 0; i < liList.length; i++) {
        let elemId = liList[i].getAttribute('data-item');
        for (let j = 0; j < searchArray.length; j++) {
            if (elemId == searchArray[j].id) {
                let nameWrap = liList[i].querySelector("div.title-wrap > div > span.name-wrap");
                if (validPointer(nameWrap)) {
                    let span = document.createElement('span');
                    span.innerText = searchArray[j].hint;
                    nameWrap.append(span);
                    hintsAdded++;
                }
            }
        }
    }

    if (hintsAdded) {
        log('Inserting hidden xedx <div>');
        let div = document.createElement('div');
        div.setAttribute("class", "xedx-item-div");
        div.setAttribute("style", "display: none");
        liList[0].parentNode.append(div);
    }
    return hintsAdded;
}

