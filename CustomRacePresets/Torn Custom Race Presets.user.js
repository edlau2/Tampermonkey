// ==UserScript==
// @name         Torn Custom Race Presets
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Make it easier and faster to make custom races
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=racing*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @grant        none
// ==/UserScript==

/*eslint no-undef: 0*/

/**
 * Modify the presets as you see fit, you can add and remove presets,
 * or remove individual fields within the preset to only use the fields you care about.
 * 
 * TEMPLATE
 * {
        name: "Appears as the button name and the public name of the race",
        maxDrivers: 6,
        trackName: "Industrial",
        numberOfLaps: 1,
        upgradesAllowed: true,
        betAmount: 0,
        waitTime: 1,
        password: "",
    },
 * 
 */
var presets = [{
        name: "Xedx 100 Lap Docks",
        maxDrivers: 6,
        trackName: "Docks",
        numberOfLaps: 100,
        upgradesAllowed: true,
        betAmount: 0,
        waitTime: 5,
        password: "",
    },
    {
        name: "Xedx - WKT Commerce",
        maxDrivers: 2,
        trackName: "Commerce",
        numberOfLaps: 20,
        upgradesAllowed: true,
        betAmount: 0,
        waitTime: 15,
        password: "wkt2",
    },
    {
        name: "Xedx - 1 lap",
        maxDrivers: 2,
        trackName: "Commerce",
        numberOfLaps: 1,
        upgradesAllowed: true,
        betAmount: 0,
        waitTime: 1,
        password: "xedx",
    },
    {
        name: "Xedx - Underdog 1",
        maxDrivers: 2,
        trackName: "Underdog",
        numberOfLaps: 1,
        upgradesAllowed: true,
        betAmount: 0,
        waitTime: 60,
        password: "xedx",
    },
    {
        name: "Xedx - Vector 100",
        maxDrivers: 10,
        trackName: "Vector",
        numberOfLaps: 100,
        upgradesAllowed: true,
        betAmount: 0,
        waitTime: 15,
        password: "",
    },
];

(function() {
    'use strict';

    function log(...data) {console.log(GM_info.script.name + ': ', ...data);}

    log("script starting");

    if (location.href.indexOf("sid=racing") < 0) return log("Not on racing page");

    scrubPresets();
    $('body').ajaxComplete(function(e, xhr, settings) {
        var createCustomRaceSection = "section=createCustomRace";
        var url = settings.url;
        if (url.indexOf(createCustomRaceSection) >= 0) {
            scrubPresets();
            drawPresetBar();
        }
    });
})();

function fillPreset(index) {
    let race = presets[index];

    if ("name" in race) $('.race-wrap div.input-wrap input').attr('value', race.name);
    if ("maxDrivers" in race) $('.drivers-max-wrap div.input-wrap input').attr('value', race.maxDrivers);
    if ("numberOfLaps" in race) $('.laps-wrap > .input-wrap > input').attr('value', race.numberOfLaps);
    if ("betAmount" in race) $('.bet-wrap > .input-wrap > input').attr('value', race.betAmount);
    if ("waitTime" in race) $('.time-wrap > .input-wrap > input').attr('value', race.waitTime);
    if ("password" in race) $('.password-wrap > .input-wrap > input').attr('value', race.password);

    if ("trackName" in race) {
        $('#select-racing-track').selectmenu();
        $('#select-racing-track-menu > li:contains(' + race.trackName + ')').mouseup();
    }
    if ("upgradesAllowed" in race) {
        $('#select-allow-upgrades').selectmenu();
        $('#select-allow-upgrades-menu > li:contains(' + race.upgradesAllowedString + ')').mouseup();
    }
}

function scrubPresets() {
    presets.forEach(x => {
        if ("name" in x && x.name.length > 25) x.name = x.name.substring(0, 26);
        if ("maxDrivers" in x) x.maxDrivers = (x.maxDrivers > 100) ? 100 : (x.maxDrivers < 2) ? 2 : x.maxDrivers;
        if ("trackName" in x) x.trackName.toLowerCase().split(' ').map(x => x.charAt(0).toUpperCase() + x.substring(1)).join(' ');
        if ("numberOfLaps" in x) x.numberOfLaps = (x.numberOfLaps > 100) ? 100 : (x.numberOfLaps < 1) ? 1 : x.numberOfLaps;
        if ("upgradesAllowed" in x) x.upgradesAllowedString = x.upgradesAllowed ? "Allow upgrades" : "Stock cars only";
        if ("betAmount" in x) x.betAmount = (x.betAmount > 10000000) ? 10000000 : (x.betAmount < 0) ? 0 : x.betAmount;
        if ("waitTime" in x) x.waitTime = (x.waitTime > 2880) ? 2880 : (x.waitTime < 1) ? 1 : x.waitTime;
        if ("password" in x && x.password.length > 25) x.password = x.password.substring(0, 26);
    })
}

function drawPresetBar() {
    let filterBar = $(`
          <div class="filter-container m-top10">
            <div class="title-gray top-round">Race Presets</div>
            <div id="xpresets" class="cont-gray p10 bottom-round"></div>
          </div>
      `);

    $('#racingAdditionalContainer > .form-custom-wrap').before(filterBar);

    presets.forEach(function (element, index) {
        let btn = `
            <button class="torn-btn preset-btn" style="margin:0 10px 10px 0">
                ${("name" in element) ? element.name : "Preset " + (+index + 1)}
            </button>
        `;

        $("#xpresets").append(btn);
    });

    $('.preset-btn').each((index, element) => $(element).on('click', function() {fillPreset(index)}));

    // $('.preset-btn').each((index, element) => element.onclick = function() {fillPreset(index)});
}


