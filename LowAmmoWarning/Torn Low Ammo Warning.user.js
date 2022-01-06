// ==UserScript==
// @name         Torn Low Ammo Warning
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Warns, on the attack page, if the ammo for an equipped weapon is beneath a certain threshold.
// @author       xedx [2100735]
// @include      https://www.torn.com/loader.php?sid=attack&user2ID=*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @local        file://///Users/edlau/Documents/Tampermonkey Scripts/helpers/Torn-JS-Helpers.js
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

    GM_addStyle(`.xedx-highlight-active {animation: highlight-active 1s linear 0s infinite normal; background-color: rgb(109, 22, 162);}
                 .xedx-low-ammo {margin-left: 40px; position: absolute; top: 60px;left: 9px;font-size: 12px;color: green;}`);
    const lowAmmoDiv = `<div class="xedx-low-ammo">Low Ammo!</div>`;
    var intId = 0, intSet = false; // Interval timer ID

    // This table comes from https://wiki.torn.com/wiki/Ammo
    const ammoTable = [{ammo: "12 Gauge Cartridges", weapons: "The Sawed-Off Shotgun, Mag 7, Benelli M1 Tactical, Ithaca 37," +
                              "Benelli M4 Super, Jackhammer, Blunderbuss, Nock Gun, and Homemade Pocket Shotgun"},
                       {ammo: "9mm Parabellum Rounds", weapons:	"The MP5 Navy, TMP, MP5k, Skorpion, MP 40, 9mm Uzi, " +
                              "Taurus, Glock 17, Luger, USP, Beretta M9, Beretta 92FS, BT MP9, Qsz-92 and Dual 92G Berettas"},
                       {ammo: ".45 ACP Rounds", weapons: "Thompson, Springfield 1911-A1 and Cobra Derringer"},
                       {ammo: "7.62mm Rifle Rounds", weapons: "Sks Carbine, AK-47, Gold-Plated AK-47 and Rheinmetall MG 3"},
                       {ammo: "5.56mm Rifle Rounds", weapons: "Vektor CR-21, XM8 Rifle, Bushmaster Carbon 15 Type 21s, " +
                              "M4A1 Colt Carbine, Heckler & Koch SL8, M16 A2 Rifle, Sig 550, Steyr AUG, Enfield SA-80, Tavor TAR-21, " +
                              "M249 PARA LMG, Minigun, Swiss Army SG 550 and ArmaLite M-15A4 Rifle"},
                       {ammo: "5.7mm High Vel. Rounds", weapons: "P90, Dual P90s, Ruger 22/45 and Fiveseven"},
                       {ammo: "5.45mm Rifle Rounds", weapons: "AK74u"},
                       {ammo: ".25 ACP Rounds", weapons: "Raven MP25"},
                       {ammo: ".44 Special Rounds", weapons: "S&W Revolver, Magnum, S&W M29 and Desert Eagle"},
                       {ammo: ".380 ACP Rounds", weapons: "Lorcin 380 and Beretta Pico"},
                       {ammo: "Warheads", weapons: "Anti Tank"},
                       {ammo: "Snow Balls", weapons: "Snow Cannon"},
                       {ammo: "Flares", weapons: "Flare Gun"},
                       {ammo: "Stones", weapons: "Slingshot"},
                       {ammo: "Bolts", weapons: "Crossbow and Harpoon"},
                       {ammo: "Darts", weapons: "Blowgun"},
                       {ammo: "Liters of Fuel", weapons: "Flamethrower"},
                       {ammo: "RPGs", weapons: "RPG Launcher"},
                       {ammo: "40mm Grenade", weapons: "China Lake (unreleased), Milkor Mgl (unreleased)"}];

    // Process inventory list
    function userQueryCB(responseText, ID, param) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        parseEquippedWeapons(jsonResp);
    }

    function parseEquippedWeapons(jsonResp) {
        if (intSet) {
            let mainSel = document.querySelector("#weapon_main");
            log('Main selector: ', mainSel);
            if (!mainSel) {
                log('***** Main selector not found! *****');
                //return setTimeout(parseEquippedWeapons(jsonResp), 1000);
            }
        }

        // May wind up being unused
        let priCap = 0, secCap = 0;
        let priCapSel = document.querySelector("#weapon_main > div.bottom___rh6Yy > div.bottomMarker___XEMiE > span");
        let secCapSel = document.querySelector("#weapon_second > div.bottom___rh6Yy > div.bottomMarker___XEMiE > span");
        log ('Weapon selectors, primary: ', priCapSel, ' secondary: ', secCapSel);
        if (!priCapSel || !secCapSel) return setTimeout(parseEquippedWeapons(jsonResp), 1000);
        if (priCapSel) priCap = priCapSel.textContent;
        if (secCapSel) secCap = secCapSel.textContent;
        log('Primary capacity: ', priCap, ' Secondary capacity: ', secCap);

        // Get equipped primary & secondary
        let primary = jsonResp.inventory.filter(item => (item.type == 'Primary' && item.equipped))[0];
        let secondary = jsonResp.inventory.filter(item => (item.type == 'Secondary' && item.equipped))[0];
        log('Equipped primary: ', primary);
        log('Equipped secondary: ', secondary);

        // Get equipped ammo
        let ammo = jsonResp.ammo.filter(item => item.equipped);
        log('Equipped ammo: ', ammo);

        // Get ammo for each weapon
        let priAmmo = ammoTable.filter(item => (item.weapons.indexOf(primary.name) > -1))[0].ammo;
        let secAmmo = ammoTable.filter(item => (item.weapons.indexOf(secondary.name) > -1))[0].ammo;
        log('Primary ammo: ', priAmmo, ' Secondary ammo: ', secAmmo);

        // May be unused
        let priParts = priCap ? priCap.split(/[()/]/g) : null;
        let secParts = secCap ? secCap.split(/[()/]/g) : null;
        log('pri parts: ', priParts, ' sec parts: ', secParts);

        let priThreshold = priParts[1] * (Number(priParts[2])+1) * 3; // mag cap. * mags * 3 attacks
        let secThreshold = secParts[1] * (Number(secParts[2])+1) * 3; // mag cap. * mags * 3 attacks
        log('Primary threshold: ', priThreshold, ' Secondary threshold: ', secThreshold);

        /*
        Array(4)0: "1"1: "1 "2: "2"3: ""length: 4[[Prototype]]: Array(0)
        Primary threshold:  315  Secondary threshold:  63
        */

        // Ammo count per weapon
        let priAmmoCount = ammo ? ammo.filter(item => (priAmmo && priAmmo.indexOf(item.size) > -1))[0].quantity : 0;
        let secAmmoCount = ammo ? ammo.filter(item => (secAmmo && secAmmo.indexOf(item.size) > -1))[0].quantity : 0;
        log('priAmmoCount: ', priAmmoCount);
        log('secAmmoCount: ', secAmmoCount);

        // Trigger a warning at a certain threshold.
        if (priAmmoCount < priThreshold) highlightPrimary();
        if (secAmmoCount < secThreshold) highlightSecondary();

        // If from the initial query, set a check for the end of the fight to alert again.
        if (!intSet) {
            log('Setting interval timer');
            intId = setInterval(checkRes, 250); // Check for fight result.
            intSet = true;
        }
    }

    // Check the status of the fight periodically, once it appears, the fight is over, one way or another.
    function checkRes() {
        let sel = document.querySelector("#defender > div.playerArea___W1SRh > div.modal___EfpxI.defender___vDcLc > div > div > div.title___VHuxs");
        if (sel) {
            let result = sel.innerText;
            if (result) {
                log('Fight over, checking ammo remaining.');
                if (intId) clearInterval(intId);
                xedx_TornUserQuery(null, 'ammo,inventory', userQueryCB);
            }
        }
    }

    // Functions to 'blink' the weapons with low ammo.
    // Note: if selectors are not here, come back?
    function highlightPrimary() {
        let mainSel = document.querySelector("#weapon_main");
        let sel = document.querySelector("#weapon_main > figure");
        if (sel) sel.classList.add('xedx-highlight-active');
        if (mainSel) $(mainSel).append(lowAmmoDiv);
    }

    function highlightSecondary() {
        let mainSel = document.querySelector("#weapon_second");
        let sel = document.querySelector("#weapon_second > figure");
        if (sel) sel.classList.add('xedx-highlight-active');
        if (mainSel) $(mainSel).append(lowAmmoDiv);
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    logScriptStart();
    validateApiKey();
    versionCheck();

    xedx_TornUserQuery(null, 'ammo,inventory', userQueryCB);

})();
