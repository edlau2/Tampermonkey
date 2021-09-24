// ==UserScript==
// @exclude     *
// @namespace   https://github.com/edlau2
// @version     1.1
// ==UserLibrary==
// @name        Torn-Hints-Helper
// @description 'Hints' placed in various places
// @author      xedx [2100735]
// @updateURL   https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-Hints-Helper.js
// @do-I-need-this-version     1.0
// @license     MIT
// ==/UserLibrary==

// ==/UserScript==

///////////////////////////////////////////////////////////////////////////////////
// 'Hints' placed in various places in Torn, typically the Items pages
///////////////////////////////////////////////////////////////////////////////////

// Format: {name, ID, displayed hint}
var flowerHints = [{"name":"Dahlia", "id": 260, "hint": "(Mexico)"},
                  {"name":"Orchid", "id": 264, "hint": "(Hawaii)"},
                  {"name":"African Violet", "id": 282, "hint": "(South Africa)"},
                  {"name":"Cherry Blossom", "id": 277, "hint": "(Japan)"},
                  {"name":"Peony", "id": 276, "hint": "(China)"},
                  {"name":"Ceibo Flower", "id": 271, "hint": "(Argentina)"},
                  {"name":"Edelweiss", "id": 272, "hint": "(Zurich)"},
                  {"name":"Crocus", "id": 263, "hint": "(Canada)"},
                  {"name":"Heather", "id": 267, "hint": "(UK)"},
                  {"name":"Tribulus Omanense","id": 385, "hint": "(UAE)"},
                  {"name":"Banana Orchid", "id": 617, "hint": "(Caymans)"}];

var plushieHints = [{"name":"Jaguar Plushie", "id": 258, "hint": "(Mexico)"},
                   {"name":"Lion Plushie", "id": 281, "hint": "(South Africa)"},
                   {"name":"Panda Plushie", "id": 274, "hint": "(China)"},
                   {"name":"Monkey Plushie", "id": 269, "hint": "(Argentina)"},
                   {"name":"Chamois Plushie", "id": 273, "hint": "(Zurich)"},
                   {"name":"Wolverine Plushie", "id": 261, "hint": "(Canada)"},
                   {"name":"Nessie Plushie", "id": 266, "hint": "(UK)"},
                   {"name":"Red Fox Plushie", "id": 268, "hint": "(UK)"},
                   {"name":"Camel Plushie", "id": 384, "hint": "(UAE)"},
                   {"name":"Kitten Plushie", "id": 215, "hint": "(Torn)"},
                   {"name":"Teddy Bear Plushie", "id": 187, "hint": "(Torn)"},
                   {"name":"Sheep Plushie", "id": 186, "hint": "(Torn)"},
                   {"name":"Stingray Plushie", "id": 618, "hint": "(Caymans)"}];

var temporaryHints = [{"name":"Epinephrine", "id": 463, "hint": "(Strength by 500% for 120 secs)"},
                     {"name":"Melatonin", "id": 464, "hint": "(Speed by 500% for 120 secs)"},
                     {"name":"Serotonin", "id": 465, "hint": "(Defense by 300% for 120 secs, life by 25%)"},
                     {"name":"Tyrosine", "id": 814, "hint": "(Dexterity by 500% for 120 seconds)"}];

// TBD: Add pepper spray, smoke grenade, flash grenade, tear gas, etc.

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

