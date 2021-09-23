// ==UserScript==
// @exclude     *
// @namespace   https://github.com/edlau2
// ==UserLibrary==
// @name        Torn-Hints-Helper
// @description 'Hints' placed in various places
// @author      xedx [2100735]
// @updateURL   https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-Hints-Helper.js
// @version     1.0
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

var temporaryHits = [{"name":"Epinephrine", "id": 463, "hint": "(Strength by 500% for 120 secs)"},
                     {"name":"Melatonin", "id": 464, "hint": "(Speed by 500% for 120 secs)"},
                     {"name":"Serotonin", "id": 465, "hint": "(Defense by 300% for 120 secs, life by 25%)"},
                     {"name":"Tyrosine", "id": 814, "hint": "(Dexterity by 500% for 120 seconds)"}];

// TBD: Add pepper spray, smoke grenade, flash grenade, tear gas, etc.

