// ==UserScript==
// @name         Torn WE Spreadsheet
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Creates a new expandable DIV on the Items page with Weapon Experience info in a table
// @match        https://www.torn.com/item.php*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
// @connect      api.torn.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    debugLoggingEnabled = true;

    //////////////////////////////////////////////////////////////////////
    // HTML for new DIVs and styles for the table cells
    //////////////////////////////////////////////////////////////////////

    // TBD: add .box div for title bar, and center

    // These are all functions to help reduce clutter in here, can use code folding
    function newTopDiv() {
        return '<div class="sortable-box t-blue-cont h" id="xedx-we-spreadsheet-div">' +
                     '<div class="title main-title title-black top-round active box" role="table" aria-level="5" id="xedx-we-spreadsheet-hdr-div">' +
                         '<div class="arrow-wrap sortable-list">' +
                             '<a role="button" href="#/" class="accordion-header-arrow right"></a>' +
                         '</div>' +
                         '<div class="box"><span id="xedx-we-title">Weapon Experience and Finishing Hits</span></div>' +
                     '</div>' +
                         '<div class="bottom-round" style="display: none; overflow: hidden;" id="xedx-fh-spreadsheet-body">' +
                             '<div class="cont-gray" style="height: auto;" id="xedx-fh-spreadsheet-cont">' +
                                 // Finishing hits table
                                 '<table id="xedx-fh-spreadsheet-table" style="width: 782px;">' +
                                     '<thead><tr>' +
                                         '<th class="xthx" id="xedx-fh-hdr" colspan="4" scope="colgroup">Finishing Hits</th>' +
                                     '</tr></thead>' +
                                     '<tbody>'; // Start table

                                     /* Rows (fhRows) will be inserted here */
    }

    function newMiddleDiv() {
        return '</tbody>' + // End table
                                 '</table>' +
                             '</div>' +
                         '</div>' +

                         '<div class="bottom-round" style="display: none; overflow: hidden;" id="xedx-we-spreadsheet-body">' +
                             '<div class="cont-gray" style="height: auto;" id="xedx-we-spreadsheet-cont">' +
                                 // Weapon Experience table
                                 '<table id="xedx-we-spreadsheet-table" style="width: 782px;">' +
                                     //'<thead><tr>' +
                                     //    '<th class="xthx" colspan="4" scope="colgroup">Weapon Experience</th>' +
                                     //'</tr></thead>' +
                                     '<thead><tr>' +
                                         '<th class="xthx">Primary</th>' +
                                         '<th class="xthx">Secondary</th>' +
                                         '<th class="xthx">Melee</th>' +
                                         '<th class="xthx">Temporary</th>' +
                                     '</tr></thead>' +
                                     '<tbody>'; // Start table

                                     /* Rows (weRows) will be inserted here */
    }

    function newBottomDiv() {
       return            '</tbody>' + // End table
                                 '</table>' +
                             '</div>' +
                         '</div>' +
                     '</div>' +
                 '</div>' +
             '</div>' +
             '<hr class="delimiter-999 m-top10 m-bottom10"></hr>';
    }

    // Will be table rows
    var fhRows = null;
    var weRows = null;

    // Globals
    var itemsArray = null; // Array of all Torn items
    var inventoryArray = null; // Array of inventory items
    var weArray = null;  // Array of weapon experience
    var fhArray = null; // Array of personalstats, including finishing hits
    var weAt100pct = 0; // Count of weapons at 100%
    var fhRemains = 0; // Remaining finishing hits total

    var useCellBackground = false; // true to color background, else text itself.

    var primaryArray = [];
    var secondaryArray = [];
    var meleeArray = [];
    var temporaryArray = [];

    // Declared in Torn-JS-Helpers
    debugLoggingEnabled = true;
    loggingEnabled = true;

    // Load CSS styles for the new UI.
    function loadTableStyles() {
        log('Loading table styles.');
        GM_addStyle(`.box {display: flex; align-items: center; justify-content: center; flex-direction: column;}`);

        // General cell styles
        GM_addStyle(".xthx, .xtdx {" +
                    (useCellBackground ? '' : "background: #333333 !important;") +
                    "border-width: 1px !important;" +
                    "border-style: solid !important;" +
                    "border-color: #5B5B5B !important;" +
                    "padding: 0.5rem !important;" +
                    "vertical-align: middle !important;" +
                    "color: white; !important;" +
                    "text-align: center;" + // hmmm - seems redundant/not needed
                    "}");

        // Cell alignment
        GM_addStyle(`.xtdx-left {text-align: left;}
                    .xtdx-center {text-align: center;}
                    .xtdx-right {text-align: right;}`);

        // Cell colors. Text or background.
        if (useCellBackground) {
            GM_addStyle(`.xtdx-green {background: green;}
                         .xtdx-red {background: red;}
                         .xtdx-yellow {background: yellow;}
                         .xtdx-orange {background: orange;}`);
        } else {
            GM_addStyle(`.xtdx-green {color: green;}
                         .xtdx-red {color: red;}
                         .xtdx-yellow {color: yellow;}
                         .xtdx-orange {color: orange;}`);
        }
    }

    //////////////////////////////////////////////////////////////////////
    // Real meat of the code. Labelled in order for convenience, Each
    // async call is chained, could use promises instead.
    //////////////////////////////////////////////////////////////////////

    // Step 1:
    // Called once page is loaded
    function handlePageLoad() {
        log('handlePageLoad.');
        loadTableStyles();

        // Query inventory,weaponexp,personalstats
        xedx_TornUserQuery(null, 'inventory,weaponexp,personalstats', inventoryCB);
    }

    // Step 2: Callback for inventory,weaponexp,personalstats query.
    // Launches torn items query.
    function inventoryCB(responseText, ID, param) {
        log('User inventory query callback.');
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        inventoryArray = jsonResp.inventory; // Array of our inventory
        weArray = jsonResp.weaponexp; // Array of 'weaponexperience' objects: {"itemID", "name", "Exp"}
        fhArray = jsonResp.personalstats; // Array of 'personalstats', including finishing hits

        xedx_TornTornQuery(null, 'items', tornQueryCB);
    }

    // Step 3:
    // Response handler for Torn API 'torn' query, above.
    function tornQueryCB(responseText, ID, param) {
        log('Torn items query callback.');
        var jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        itemsArray = jsonResp.items; // Array of Torn items
        sortArrays(); // Also calls 'modifyPage()'
    }

    // Step 4:
    // Sorts and merges the two arrays, items and experience, into 4 new arrays,
    // primary, secondary, melee and temporary weapons and their WE.
    // Also count the ## at 100% (weAt100pct)
    function sortArrays() {
        for (let i =0; i < weArray.length; i++) {
            if (weArray[i].exp == 100) {weAt100pct++;}
            let ID = weArray[i].itemID;
            let itemObj = getItemById(ID);
            if (validPointer(itemObj)) {
                if (itemObj.type == 'Primary') {
                    primaryArray.push(weArray[i]);
                } else if (itemObj.type == 'Secondary') {
                    secondaryArray.push(weArray[i]);
                } else if (itemObj.type == 'Melee') {
                    meleeArray.push(weArray[i]);
                } else if (itemObj.type == 'Temporary') {
                    temporaryArray.push(weArray[i]);
                } else {
                    log('Unknown type ' + itemObj.type + ' for weapon ID ' + ID);
                }
            } else {
                log('Error finding item ' + ID + ' in itemsArray!');
            }
        }

        weRows = buildWeTableRows();
        fhRows = buildFhTableRows(fhArray);
        modifyPage();
    }

    // Step 5:
    // Build our new DIV
    function modifyPage() {
        log('modifyPage');

        // Install above this div
        let refDiv = $("#loadoutsRoot");
        if (!refDiv) return setTimeout(modifyPage, 250);

        if (validPointer(document.querySelector("#xedx-we-spreadsheet-div"))) {
            debug('New WE and FH div already installed!');
            return;
        }
        let newDiv = newTopDiv() + fhRows + newMiddleDiv() + weRows + newBottomDiv();

        $(newDiv).insertBefore(refDiv);
        setTitlebar();
        installClickHandler();

        // Add all tooltips
        // displayToolTip(li, text + CRLF + CRLF + text2);
        addWeaponTypeToolTips();
    }

    function addWeaponTypeToolTips() {
        const typeIDs = ["machits", "rifhits", "piehits", "axehits", "smghits", "pishits",
                         "chahits", "grehits", "heahits", "shohits", "slahits", "h2hhits"];

        addToolTipStyle();

        for (let i=0; i<typeIDs.length; i++) {
            displayToolTip($("#" + typeIDs[i]), getToolTipText(typeIDs[i]));
        }
    }

    function machineGunText() {
        return  '<B>Machine Gun Weapons:</B>' + CRLF + CRLF +
                TAB + "PKM" + CRLF +
                TAB + "Stoner 96" + CRLF +
                TAB + "Negev NG-5" + CRLF +
                TAB + "Rheinmetall MG 3" + CRLF +
                TAB + "Snow Cannon" + CRLF +
                TAB + "M249 SAW" + CRLF +
                TAB + "Minigun" + CRLF;
    }
    function mechanicalText() {
        return  '<B>Mechanical Weapons:</B>' + CRLF + CRLF +
                TAB + "Bolt Gun" + CRLF +
                TAB + "Taser" + CRLF +
                TAB + "Chainsaw" + CRLF;
    }
    function SubMachineGunText() {
        return  '<B>Sub Machine Guns:</B>' + CRLF + CRLF +
                TAB + "Dual TMPs" + CRLF +
                TAB + "Dual Bushmasters" + CRLF +
                TAB + "Dual MP5s" + CRLF +
                TAB + "Dual P90s" + CRLF +
                TAB + "Dual Uzis" + CRLF +
                TAB + "Pink Mac-10" + CRLF +
                TAB + "9mm Uzi" + CRLF +
                TAB + "MP5k" + CRLF +
                TAB + "Skorpion" + CRLF +
                TAB + "TMP" + CRLF +
                TAB + "Thompson" + CRLF +
                TAB + "MP 40" + CRLF +
                TAB + "AK74U" + CRLF +
                TAB + "Bushmaster Carbon 15" + CRLF +
                TAB + "P90" + CRLF +
                TAB + "BT MP9" + CRLF +
                TAB + "MP5 Navy" + CRLF;
    }
    function rifleText() {
        return  '<B>Rifle Weapons:</B>' + CRLF + CRLF +
                TAB + "Prototype" + CRLF +
                TAB + "Gold Plated AK-47" + CRLF +
                TAB + "SIG 552" + CRLF +
                TAB + "ArmaLite M-15A4" + CRLF +
                TAB + "SIG 550" + CRLF +
                TAB + "SKS Carbine" + CRLF +
                TAB + "Heckler & Koch SL8" + CRLF +
                TAB + "Tavor TAR-21" + CRLF +
                TAB + "Vektor CR-21" + CRLF +
                TAB + "XM8 Rifle" + CRLF +
                TAB + "M4A1 Colt Carbine" + CRLF +
                TAB + "M16 A2 Rifle" + CRLF +
                TAB + "AK-47" + CRLF +
                TAB + "Enfield SA-80" + CRLF +
                TAB + "Steyr AUG" + CRLF;
    }
    function piercingText() {
        return  '<B>Piercing Weapons:</B>' + CRLF + CRLF +
                TAB + "Tranquilizer Gun" + CRLF +
                TAB + "Scalpel" + CRLF +
                TAB + "Wand of Destruction" + CRLF +
                TAB + "Poison Umbrella" + CRLF +
                TAB + "Meat Hook" + CRLF +
                TAB + "Devil's Pitchfork" + CRLF +
                TAB + "Pair of High Heels" + CRLF +
                TAB + "Fine Chisel" + CRLF +
                TAB + "Diamond Icicle" + CRLF +
                TAB + "Twin Tiger Hooks" + CRLF +
                TAB + "Harpoon" + CRLF +
                TAB + "Ice Pick" + CRLF +
                TAB + "Sai" + CRLF +
                TAB + "Ninja Claws" + CRLF +
                TAB + "Spear" + CRLF +
                TAB + "Crossbow" + CRLF +
                TAB + "Dagger" + CRLF +
                TAB + "Butterfly Knife" + CRLF +
                TAB + "Pen Knife" + CRLF +
                TAB + "Blowgun" + CRLF +
                TAB + "Diamond Bladed Knife" + CRLF +
                TAB + "Macana" + CRLF +
                TAB + "Swiss Army Knife" + CRLF +
                TAB + "Kitchen Knife" + CRLF;
    }
    function clubbingText() {
        return  '<B>Clubbing Weapons:</B>' + CRLF + CRLF +
                TAB + "Millwall Brick" + CRLF +
                TAB + "Handbag" + CRLF +
                TAB + "Sledgehammer" + CRLF +
                TAB + "Penelope" + CRLF +
                TAB + "Duke's Hammer" + CRLF +
                TAB + "Madball" + CRLF +
                TAB + "Dual Axes" + CRLF +
                TAB + "Flail" + CRLF +
                TAB + "Dual Hammers" + CRLF +
                TAB + "Golden Broomstick" + CRLF +
                TAB + "Petrified Humerus" + CRLF +
                TAB + "Ivory Walking Cane" + CRLF +
                TAB + "Wushu Double Axes" + CRLF +
                TAB + "Cricket Bat" + CRLF +
                TAB + "Wooden Nunchakus" + CRLF +
                TAB + "Pillow" + CRLF +
                TAB + "Slingshot" + CRLF +
                TAB + "Metal Nunchakus" + CRLF +
                TAB + "Bo Staff" + CRLF +
                TAB + "Frying Pan" + CRLF +
                TAB + "Axe" + CRLF +
                TAB + "Knuckle Dusters" + CRLF +
                TAB + "Lead Pipe" + CRLF +
                TAB + "Crowbar" + CRLF +
                TAB + "Plastic Sword" + CRLF +
                TAB + "Baseball Bat" + CRLF +
                TAB + "Hammer" + CRLF;
    }
    function pistolText() {
        return  '<B>Pistol Weapons:</B>' + CRLF + CRLF +
            TAB + "Beretta Pico" + CRLF +
            TAB + "S&W M29" + CRLF +
            TAB + "Cobra Derringer" + CRLF +
            TAB + "Desert Eagle" + CRLF +
            TAB + "Luger" + CRLF +
            TAB + "Beretta 92FS" + CRLF +
            TAB + "Dual 92G Berettas" + CRLF +
            TAB + "Fiveseven" + CRLF +
            TAB + "Qsz-92" + CRLF +
            TAB + "Springfield 1911" + CRLF +
            TAB + "Flare Gun" + CRLF +
            TAB + "Beretta M9" + CRLF +
            TAB + "Magnum" + CRLF +
            TAB + "S&W Revolver" + CRLF +
            TAB + "Ruger 22/45" + CRLF +
            TAB + "Lorcin 380" + CRLF +
            TAB + "Taurus" + CRLF +
            TAB + "Raven MP25" + CRLF +
            TAB + "USP" + CRLF +
            TAB + "Glock 17" + CRLF;
    }
    function tempText() {
        return  '<B>Temporary, damaging Weapons:</B>' + CRLF + CRLF +
            TAB + "Nerve Gas" + CRLF +
            TAB + "Semtex" + CRLF +
            TAB + "Concussion Grenade" + CRLF +
            TAB + "Sand" + CRLF +
            TAB + "Nail Bomb" + CRLF +
            TAB + "Book" + CRLF +
            TAB + "Claymore Mine" + CRLF +
            TAB + "Fireworks" + CRLF +
            TAB + "Throwing Knife" + CRLF +
            TAB + "Molotov Cocktail" + CRLF +
            TAB + "Stick Grenade" + CRLF +
            TAB + "Snowball" + CRLF +
            TAB + "Trout" + CRLF +
            TAB + "Ninja Star" + CRLF +
            TAB + "HEG" + CRLF +
            TAB + "Grenade" + CRLF +
            TAB + "Brick" + CRLF;
    }
    function heavyArtilleryText() {
         return  '<B>Heavy Artillery Weapons:</B>' + CRLF + CRLF +
                TAB + "Milkor MGL" + CRLF +
                TAB + "SMAW Launcher" + CRLF +
                TAB + "China Lake" + CRLF +
                TAB + "Neutrilux 2000" + CRLF +
                TAB + "Egg Propelled Launcher" + CRLF +
                TAB + "RPG Launcher" + CRLF +
                TAB + "Type 98 Anti Tank" + CRLF +
                TAB + "Flamethrower" + CRLF;
    }
    function shotgunText() {
        return  '<B>Shotgun Weapons:</B>' + CRLF + CRLF +
            TAB + "Nock Gun" + CRLF +
            TAB + "Homemade Pocket Shotgun" + CRLF +
            TAB + "Blunderbuss" + CRLF +
            TAB + "Jackhammer" + CRLF +
            TAB + "Ithaca 37" + CRLF +
            TAB + "Mag 7" + CRLF +
            TAB + "Benelli M4 Super" + CRLF +
            TAB + "Sawed-Off Shotgun" + CRLF +
            TAB + "Benelli M1 Tactical" + CRLF;
    }
    function slashingText() {
        return  '<B>Slashing Weapons:</B>' + CRLF + CRLF +
            TAB + "Bug Swatter" + CRLF +
            TAB + "Bread Knife" + CRLF +
            TAB + "Riding Crop" + CRLF +
            TAB + "Cleaver" + CRLF +
            TAB + "Dual Scimitars" + CRLF +
            TAB + "Naval Cutlass" + CRLF +
            TAB + "Dual Samurai Swords" + CRLF +
            TAB + "Pair of Ice Skates" + CRLF +
            TAB + "Blood Spattered Sickle" + CRLF +
            TAB + "Guandao" + CRLF +
            TAB + "Kama" + CRLF +
            TAB + "Yasukuni Sword" + CRLF +
            TAB + "Chain Whip" + CRLF +
            TAB + "Claymore Sword" + CRLF +
            TAB + "Katana" + CRLF +
            TAB + "Rusty Sword" + CRLF +
            TAB + "Samurai Sword" + CRLF +
            TAB + "Scimitar" + CRLF +
            TAB + "Kodachi" + CRLF +
            TAB + "Leather Bullwhip" + CRLF;
    }
    function hand2handText() {
        return "I hope it's obvious - feet and hands." + CRLF;
    }

    function getToolTipText(id) {
        switch (id) {
            case "machits":
                return machineGunText();
            case "rifhits":
                return rifleText();
            case "piehits":
                return piercingText();
            case "axehits":
                return clubbingText();
            case "smghits":
                return SubMachineGunText();
            case "pishits":
                return pistolText();
            case "chahits":
                return mechanicalText();
            case "grehits":
                return tempText();
            case "heahits":
                return heavyArtilleryText();
            case "shohits":
                return shotgunText();
            case "slahits":
                return slashingText();
            case "h2hhits":
                return hand2handText();
            default:
                return null;

        }
    }

    //////////////////////////////////////////////////////////////////////
    // Helper functions
    //////////////////////////////////////////////////////////////////////

    // Helper to set the title in the title bar to reflect # of weapons completed to 100%
    function setTitlebar() {
        let titleBar = document.querySelector("#xedx-we-title");
        if (!validPointer(titleBar)) {
            setTimeout(setTitlebar, 1000);
        } else {
            let rfPct = Math.round((fhArray.roundsfired/1000000)*100);
            let dmgPct = Math.round((fhArray.attackdamage) /100000000*100);
            //document.querySelector("#xedx-we-title").innerText = "WE and Finishing Hits: " +
            titleBar.innerText = "WE and Finishing Hits: " +
                weAt100pct + " weapons at 100%, Rounds fired: " + numberWithCommas(fhArray.roundsfired) + "/1,000,000 (" + rfPct + "%)," +
                " Total damage: " + numberWithCommas(fhArray.attackdamage) + "/100,000,000 (" + dmgPct + "%)";

            $("#xedx-fh-hdr")[0].textContent = 'Finishing hits: ' + fhRemains + ' remain, about ' + numberWithCommas(fhRemains * 25) + 'e';
        }
    }

    // Function to build the table rows from our arrays for Weapon Experience
    function buildWeTableRows() {
        let maxRows = Math.max(primaryArray.length, secondaryArray.length, meleeArray.length, temporaryArray.length);
        if (maxRows < 1) {return;}

        let result = '';
        for (let i = 0; i < maxRows; i++) {
            result += '<tr style="height: 23px;">'; // Start row

            let arrays = [primaryArray, secondaryArray, meleeArray, temporaryArray];
            for (let j = 0; j < 4; j++) {
                let useArray = arrays[j];
                if (validPointer(useArray[i])) {
                    result += buildWeCell(useArray[i]);
                } else {
                    result += '<td class="xtdx"></td>'; // Empty cell
                }
            }
            result += '</tr>'; // End row
        }
        return result;
    }

    // Helper to build and color-code an individual cell for WE
    function buildWeCell(weItem) {
        let itemObj = getInventoryById(weItem.itemID);
        let color = (weItem.exp == 100) ? 'xtdx-green' :
            (weItem.exp >= 50) ? 'xtdx-orange' : 'xtdx-red';
        if (validPointer(itemObj) ? itemObj.equipped : false) {color = 'xtdx-yellow';}

        let output = '<td class="xtdx ' + color + '">' +
            '<span style="float:left">' + weItem.name +
            '</span><span style="float:right">' + weItem.exp + '%</span></td>';

        return output;
    }

    // Helper for below, put in helper lib!!!
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Function to build the table rows from our arrays for Finishing Hits
    function buildFhTableRows(obj) { // obj is a personalstats object
        let result = '<tr>';
        result += buildFhCell('Machine Guns', obj.machits, "machits");
        result += buildFhCell('Rifles', obj.rifhits, "rifhits");
        result += buildFhCell('Piercing', obj.piehits, "piehits");
        result += buildFhCell('Clubbing', obj.axehits, "axehits");
        result += '</tr><tr>';
        result += buildFhCell('Sub Machine Guns', obj.smghits, "smghits");
        result += buildFhCell('Pistols', obj.pishits, "pishits");
        result += buildFhCell('Mechanical', obj.chahits, "chahits");
        result += buildFhCell('Temporary', obj.grehits, "grehits");
        result += '</tr><tr>';
        result += buildFhCell('Heavy Artillery', obj.heahits, "heahits");
        result += buildFhCell('Shotguns', obj.shohits, "shohits");
        result += buildFhCell('Slashing', obj.slahits, "slahits");
        result += buildFhCell('Hand to Hand', obj.h2hhits, "h2hhits");
        result += '</tr>';

        fhRemains = calcRemainingFinishingHits(obj);

        return result;
    }

    // Helper to add together remaining finishing hits
    function calcRemainingFinishingHits(obj) {
        let result = remainingHits(obj.machits);
        result += remainingHits(obj.rifhits);
        result += remainingHits(obj.piehits);
        result += remainingHits(obj.axehits);
        result += remainingHits(obj.smghits);
        result += remainingHits(obj.pishits);
        result += remainingHits(obj.chahits);
        result += remainingHits(obj.grehits);
        result += remainingHits(obj.heahits);
        result += remainingHits(obj.shohits);
        result += remainingHits(obj.slahits);
        result += remainingHits(obj.h2hhits);

        return result;
    }

    function remainingHits(count) {
        return (count > 1000) ? 0 : 1000 - count;
    }

    // Helper to build and color-code an individual cell for FH
    function buildFhCell(name, count, id=null) {
        let color = (count >= 1000) ? 'xtdx-green' : (count >= 750 ? 'xtdx-orange' : 'xtdx-red');
        let result = '<td class="xtdx ' + color + '"' + (id ? ('id="' + id + '"') : '' ) + '><span style="float:left">' + name +
            '</span><span style="float:right">' + numberWithCommas(count) + '</span></td>';
        return result;
    }

    // Helper to get item object by ID
    function getItemById(itemID) {
        let itemObj = itemsArray[itemID.toString()];
        return itemObj;
    }

    // Helper to get inventory object by ID
    function getInventoryById(itemID) {
        let itemObjs = inventoryArray.filter(item => item.ID == itemID);
        return itemObjs[0];
    }

    // Helper to toggle body div on arrow click
    function installClickHandler() {
        const bodyDiv = document.getElementById('xedx-we-spreadsheet-body');
        const bodyDiv2 = document.getElementById('xedx-fh-spreadsheet-body');
        const headerDiv = document.getElementById('xedx-we-spreadsheet-hdr-div');
        const arrowDiv = headerDiv.parentElement; // xedx-we-spreadsheet-div ??

        arrowDiv.addEventListener("click", function() {
            if (bodyDiv.style.display === "block") {
                bodyDiv.style.display = "none";
                bodyDiv2.style.display = "none";
                headerDiv.className = 'title main-title title-black border-round';
            } else {
                bodyDiv.style.display = "block";
                bodyDiv2.style.display = "block";
            }
        });
    }

    //////////////////////////////////////////////////////////////////////
    // Main entry point. Start an observer so that we trigger when we
    // actually get to the page(s) - technically, when the page(s) change.
    // As they do on load. Seems more reliable than onLoad().
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();

    // The queries will take a bit - just go ahead and start the party!
    handlePageLoad();

})();
