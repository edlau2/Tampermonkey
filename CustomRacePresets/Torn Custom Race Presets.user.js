// ==UserScript==
// @name         Torn Custom Race Presets
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  Make it easier and faster to make custom races
// @author       xedx [2100735]
// @match        https://www.torn.com/loader.php?sid=racing*
// @exclude      https://www.torn.com/loader.php*sid=attack&user2ID*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

/*eslint no-undef: 0*/

// **** TBD: Add button on lower half, where you enter data, to save as a preset!! *****
// Also a way  to remove....

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
        minDrivers: 2,
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
        minDrivers: 2,
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
        minDrivers: 2,
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
        minDrivers: 2,
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
        minDrivers: 2,
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

    var autoJoin = GM_getValue("autoJoin", false);

    function log(...data) {console.log(GM_info.script.name + ': ', ...data);}

    log("script starting");
    if (location.href.indexOf("sid=racing") < 0) return log("Not on racing page");

    addStyles();

    scrubPresets();
    $('body').ajaxComplete(function(e, xhr, settings) {
        log("ajaxComplete, settings: ", settings);
        var createCustomRaceSection = "section=createCustomRace";
        var url = settings.url;
        if (url.indexOf(createCustomRaceSection) >= 0) {
            log("ajaxComplete, creating presets");
            scrubPresets();
            drawPresetBar();
            addSavePresetBtn();
        }
    });

//})();

    // Instead of just filling the screen with preset data, could make option
    // to create and join - post required URL
    /*
    let raceLink = `https://www.torn.com/page.php
      ?sid=racing&tab=customrace&section=getInRace&step=getInRace&id=&carID=${carId}&createRace=true&title=${raceName}
      &minDrivers=${minDrivers}&maxDrivers=${maxDrivers}&trackID=${trackId}&laps=${laps}
      &minClass=${minClass}&carsTypeAllowed=${carsTypeAllowed}&carsAllowed=${carsAllowed}&betAmount=${betAmount}&waitTime=0&rfcv=${getRFC()}`;
      $.post(raceLink, function (response) {
        console.log("Race started");
        const saveButton = document.querySelector(".save-button");
        saveButton.classList.remove("blinking");
      });
    */
    function fillPreset(index) {
        let race = presets[index];

        if ("name" in race) $('.race-wrap div.input-wrap input').attr('value', race.name);
        if ("minDrivers" in race) $(".drivers-wrap [name='minDrivers']").attr('value', race.minDrivers);
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
            if ("minDrivers" in x) x.minDrivers = (x.minDrivers > 6) ? 6 : (x.maxDrivers < 2) ? 2 : x.minDrivers;
            if ("maxDrivers" in x) x.maxDrivers = (x.maxDrivers > 100) ? 100 : (x.maxDrivers < 2) ? 2 : x.maxDrivers;
            if ("trackName" in x) x.trackName.toLowerCase().split(' ').map(x => x.charAt(0).toUpperCase() + x.substring(1)).join(' ');
            if ("numberOfLaps" in x) x.numberOfLaps = (x.numberOfLaps > 100) ? 100 : (x.numberOfLaps < 1) ? 1 : x.numberOfLaps;
            if ("upgradesAllowed" in x) x.upgradesAllowedString = x.upgradesAllowed ? "Allow upgrades" : "Stock cars only";
            if ("betAmount" in x) x.betAmount = (x.betAmount > 10000000) ? 10000000 : (x.betAmount < 0) ? 0 : x.betAmount;
            if ("waitTime" in x) x.waitTime = (x.waitTime > 2880) ? 2880 : (x.waitTime < 1) ? 1 : x.waitTime;
            if ("password" in x && x.password.length > 25) x.password = x.password.substring(0, 26);
        })
    }

    function handleSavePreset() {
        log("handleSavePreset");
        let allowUpg =
            ($("#select-allow-upgrades-button > span.ui-selectmenu-status").text() == 'Allow upgrades');
        let preset = {
            name: $("#racename").attr('data-default-value'),
            minDrivers: $(".drivers-wrap [name='minDrivers']").val(),
            maxDrivers: $(".form-custom [name='maxDrivers']").val(),
            trackName: $("#select-racing-track-button > span:first-child").text(),
            numberOfLaps: $(".laps-wrap [name='laps']").val(),
            upgradesAllowed: allowUpg,
            betAmount: $("#betAmount").val(),
            waitTime: $("#wait-time-button > span.ui-selectmenu-status").text(),
            password: "",
        };

        log("Preset: ", preset);
    }

    function addSavePresetBtn() {
        let wrap = `<div id='xsav-wrap' style='display: flex; flex-flow: row wrap;'></div>`;
        let btn = `<div class='x-btn-wrap'>
                       <button id='xsav' class="xtorn-btn preset-btn" style="margin:0 10px 10px 0">Save</button>
                   </div>`
        let titleBar = $("#racingAdditionalContainer > div.form-custom-wrap > div.title-black");

        log("addSavePresetBtn: ", $(titleBar));
        $(titleBar).css("width", "100%");
        $(titleBar).wrap(wrap);
        $("#xsav-wrap").append(btn);
        $("#xsav").on('click', handleSavePreset);
    }

    function handleOptCbChange(e) {
        e.stopPropagation();
        e.preventDefault();

        let node = $(e.currentTarget);
        let checked = $(node)[0].checked;
        let key = $(node).attr('name');
        GM_setValue(key, checked);
    }

    function drawPresetBar() {
        log("drawPresetBar");
        let filterBar = $(`
              <div class="filter-container m-top10">
                <div class="preset-wrap">
                    <div class="title-gray top-round" style="width: 100%;">Race Presets</div>
                    <label class='xlabel-right'>Auto-Join:
                        <input id="cb-auto-join" type="checkbox" class="cb-right xma-cb" name="autoJoin" value="${autoJoin}">
                    </label>
                </div>
                <div id="xpresets" class="cont-gray p10 bottom-round"></div>
              </div>
          `);

        /*
        let filterBarOrg = $(`
              <div class="filter-container m-top10">
                <div class="title-gray top-round" style="width: 100%;">Race Presets</div>
                <div id="xpresets" class="cont-gray p10 bottom-round"></div>
              </div>
          `);
        let filterBarNew = $(`
              <div class="filter-container m-top10">
                <div class="title-gray top-round">Race Presets</div>
                <label class='xlabel-right'>Auto-Join:
                    <input id="cb-auto-join" type="checkbox" class="cb-right xma-cb" name="autoJoin">
                </label>
                <div id="xpresets" class="cont-gray p10 bottom-round"></div>
              </div>
          `);
          */

        $('#racingAdditionalContainer > .form-custom-wrap').before(filterBar);

        $("#cb-auto-join").prop("checked", autoJoin);
        $("#cb-auto-join").on('change', handleOptCbChange);

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

        fillPreset(0);
    }

    function addStyles() {

        GM_addStyle(`
            .preset-wrap {
                display: flex;
                flex-flow: row wrap;
                position: relative;
            }
            .xlabel-right {
                position: absolute;
                display: inline-flex;
                flex-flow: row wrap;
                right: 0;
                padding-right: 20px;
                height: 30px;
                align-content: center;
            }
            #cb-auto-join {
                display: inline-flex;
                flex-flow: row wrap;
                margin-left: 10px;
                align-items: center;
                font-size: 10pt;
            }
            .x-btn-wrap {
                display: flex;
                position: absolute;
                float: right;
                right: 21%;
                align-content: center;
                flex-flow: row wrap;
            }
            #xsav {
                margin: 10px 20px 0px 0px !important;
                height: 28px !important;
                line-height: 28px !important;
            }
        `);
    }

    /*
    Put this type of select next to "start and join race" to  pick a car:

    <div class="select-wrap dropdown-new" aria-label="Track" role="application" style="width: 166px;">
        <select id="select-racing-track" name="trackID" aria-disabled="false" style="display: none;">
                                                  <option value="6">Uptown</option>                                                                         <option value="7">Withdrawal</option>                                                                         <option value="8">Underdog</option>                                                                         <option value="9">Parkland</option>                                                                         <option value="10">Docks</option>                                                                         <option value="11">Commerce</option>                                                                         <option value="12">Two Islands</option>                                                                         <option value="15">Industrial</option>                                                                         <option value="16">Vector</option>                                                                         <option value="17">Mudpit</option>                                                                         <option value="18">Hammerhead</option>                                                                         <option value="19">Sewage</option>                                                                         <option value="20">Meltdown</option>                                                                         <option value="21">Speedway</option>                                                                         <option value="23">Stone Park</option>                                                                         <option value="24">Convict</option>                                                                   </select><span><a class="ui-selectmenu ui-widget ui-state-default ui-selectmenu-dropdown ui-corner-all" id="select-racing-track-button" role="button" href="#nogo" tabindex="0" aria-haspopup="true" aria-owns="select-racing-track-menu" aria-disabled="false" style="width: 166px;" i-data="i_204_980_166_34"><span class="ui-selectmenu-status" aria-live="polite">Uptown</span><span class="ui-selectmenu-icon ui-icon ui-icon-triangle-1-s"></span></a></span>
        <div class="select-racing-track-list select-racing-list dropdown-content"><div class="ui-selectmenu-menu" style="z-index: 1; position: relative; top: 291px; left: 224px;"><ul class="ui-widget ui-widget-content ui-selectmenu-menu-dropdown ui-corner-bottom scrollbar-black" aria-hidden="true" role="listbox" aria-labelledby="select-racing-track-button" id="select-racing-track-menu" aria-disabled="false" aria-activedescendant="ui-selectmenu-item-351" style="width: 166px; height: auto; max-height: 170px;"><li role="presentation" class="ui-selectmenu-item-selected"><a href="#nogo" tabindex="-1" role="option" aria-selected="true" id="ui-selectmenu-item-351">Uptown</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Withdrawal</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Underdog</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Parkland</a></li><li role="presentation" class=""><a href="#nogo" tabindex="-1" role="option" aria-selected="false" i-data="i_208_1100_164_24">Docks</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Commerce</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Two Islands</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Industrial</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Vector</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Mudpit</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Hammerhead</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Sewage</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Meltdown</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Speedway</a></li><li role="presentation"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Stone Park</a></li><li role="presentation" class="ui-corner-bottom"><a href="#nogo" tabindex="-1" role="option" aria-selected="false">Convict</a></li></ul></div></div>
    </div>

    Need to grab all cars and IDs....

    */




})();
