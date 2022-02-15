// ==UserScript==
// @name         Torn Chain Watcher (PDA)
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Make the chain timeout/count blatantly obvious.
// @author       xedx [2100735]
// @include      https://www.torn.com/factions.php*
// ==/UserScript==

/*eslint no-undef: 0*/

(function() {
    'use strict';

    const chainDiv = `<div id="xedx-chain-div" class="box">
                         <div class="box-div"><span id="xedx-chain-span" class="xedx-chain">&nbsp</span></div>
                         <div class="box-div"><table class="xedx-table"><tbody>
                             <tr>
                                 <td class="xtdx"><div>
                                     <input type="checkbox" class="xcbx" id="xedx-audible-opt" name="audible" checked>
                                     <label for="audible"><span class="xedx-span">Audible</span></label>
                                 </div></td>
                                 <td class="xtdx">
                                     <select id="audible-select" class="xedx-select">
                                          <option value="$">--Please Select--</option>
                                          <option value="60">1:00</option>
                                          <option value="75">1:!5</option>
                                          <option value="90">1:30</option>
                                          <option value="120">2:00</option>
                                          <option value="150">2:30</option>
                                          <option value="180">3:00</option>
                                          <option value="210">3:30</option>
                                          <option value="240">4:00</option>
                                          <option value="270">4:30</option>
                                    </select>
                                 </td>
                                 <td>
                                     <Button class="button-off" id="test-audio" value="off">Test</Button>
                                 </td>
                            </tr>
                            <tr>
                                 <td class="xtdx"><div>
                                     <input type="checkbox" class="xcbx" id="xedx-visual-opt" name="visual" checked>
                                     <label for="visual"><span class="xedx-span">Visual</span></label>
                                 </div></td>
                                 <td class="xtdx">
                                     <select id="visible-select" class="xedx-select-row2">
                                          <option value="$">--Please Select--</option>
                                          <option value="60">1:00</option>
                                          <option value="75">1:!5</option>
                                          <option value="90">1:30</option>
                                          <option value="120">2:00</option>
                                          <option value="150">2:30</option>
                                          <option value="180">3:00</option>
                                          <option value="210">3:30</option>
                                          <option value="240">4:00</option>
                                          <option value="270">4:30</option>
                                    </select>
                                    </select>
                                 </td>
                                 <td>
                                     <Button class="button-off" id="test-video" value="off">Test</Button>
                                 </td>
                             </tr>
                             <tr>
                                 <td class="xtdx">
                                 <select id="type-select" class="xedx-select2"">
                                          <option value="sine">Sine</option>
                                          <option value="square">Square</option>
                                          <option value="sawtooth">Sawtooth</option>
                                          <option value="triangle">Triangle</option>
                                    </select>
                                 </td>
                                 <td class="xtdx xedx-vol-span" colspan="2">
                                     <span>Volume:</span>
                                     <input id="rangeslider" class="xedx-volume" type="range" min="0" max="100" value="50" oninput="rangevalue.value=value"/>
                                     <output id="rangevalue">100</output>
                                 </td>
                             </tr>
                         </table></div>
                     </div>`;

    var loggingEnabled = true;
    var targetNode = null;
    var chainNode = null;
    var muted = false; // Audio on/off
    var flashOn = true; // Video on/off
    var beeping = false;
    var beepInt = 0;
    var testBeepInt = 0;
    var testingVideo = false;
    var blinkOpt = '$'; // Time in sec
    var beepOpt = '$'; // Time in sec
    var volume = .5;
    var beepType = "sine"; // "sine", "square", "sawtooth", "triangle" (or 'custom', but then need to define a periodic wave function)
    var beepFrequency = 440; // In hertz, 440 is middle A

    function GM_addStyle(css) {
            const style = document.getElementById("GM_addStyleBy2100735") || (function() {
            const style = document.createElement('style');
            style.type = 'text/css';
            style.id = "GM_addStyleBy2100735";
            document.head.appendChild(style);
            return style;
        })();
        const sheet = style.sheet;
        sheet.insertRule(css, (sheet.rules || sheet.cssRules || []).length);
    }

    function GM_setValue(a, b) {window.localStorage.setItem(a, b);}
    function GM_getValue(a, b) {return (window.localStorage.getItem(a)) ? window.localStorage.getItem(a) : b;}

    var audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
    log('Init audioCtx: ', audioCtx);
    function beep(duration, frequency, volume, type, callback) {
        var oscillator = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (volume){gainNode.gain.value = volume;}
        if (frequency){oscillator.frequency.value = frequency;}
        if (type){oscillator.type = type;}
        if (callback){oscillator.onended = callback;}

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + ((duration || 500) / 1000));
    };

    function log(...data) {
        if (loggingEnabled) {
            console.log('Torn Chain Watcher: ', ...data);
        }
    }

    function handleInputChange(e) {
        log('handleInputChange: ', e);
        let target = e.target
        if (e.target.type !== 'range') {
            target = document.getElementById('range')
        }
        const min = target.min
        const max = target.max
        const val = target.value
        $("#rangevalue")[0].textContent = val;
        log('min: ' + min + ' max: ' + max + ' val: ' + val + ' background size: ' + target.style.backgroundSize);

        target.style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%'
        volume = val/100;
        saveOptions();
    }

    function doBeep() {
        beep(null, beepFrequency, volume, beepType);
    }

    function beepingOn() {
        if (!muted && !beeping && !beepInt) {
            beepInt = setInterval(doBeep, 1000);
            beeping = true;
        }
    }

    function beepingOff() {
        if (beepInt) clearInterval(beepInt);
        beeping = false;
        beepInt = 0;
    }

    function mute(value) { // TRUE to mute
        log('Muting');
        muted = value;
        if (value) beepingOff();
    }

    function checkBeep(seconds) {
        if (!beepOpt || beepOpt == '$' || muted || beepOpt < seconds) return false;
        return true;
    }

    function checkBlink(seconds) {
        if (!blinkOpt || blinkOpt == '$' || blinkOpt < seconds) return false;
        return true;
    }

    function timerTimeout() {
        let parts = targetNode.textContent.split(':');
        let seconds = Number(parts[0]) * 60 + Number(parts[1]);

        // Handle audio
        if (checkBeep(seconds)) {
            beepingOn();
        } else {
            beepingOff();
        }

        // Handle video
        if ((checkBlink(seconds) && flashOn) || testingVideo) {
            $("#xedx-chain-span").removeClass('xedx-chain');
            $("#xedx-chain-span").addClass('xedx-chain-alert');
        } else {
            $("#xedx-chain-span").addClass('xedx-chain');
            $("#xedx-chain-span").removeClass('xedx-chain-alert');
        }
        //$("#xedx-chain-span")[0].textContent = targetNode.textContent + ' | ' + chainNode.textContent.split('/')[0];
        $("#xedx-chain-span")[0].textContent = targetNode.textContent;
    };

    function saveOptions() {
        GM_setValue('flashOn', flashOn);
        GM_setValue('muted', muted);
        GM_setValue('beepOpt', beepOpt);
        GM_setValue('blinkOpt', blinkOpt);
        GM_setValue('volume', volume);
        GM_setValue('beepType', beepType);
    }

    function readOptions() {
        flashOn = GM_getValue('flashOn', flashOn);
        muted = GM_getValue('muted', muted);
        beepOpt = GM_getValue('beepOpt', beepOpt);
        blinkOpt = GM_getValue('blinkOpt', blinkOpt);
        volume = GM_getValue('volume', volume);
        beepType = GM_getValue('beepType', beepType);
    }

    function setOptions() {
        let val = volume * 100;
        let min = $('#rangeslider')[0].min;
        let max = $('#rangeslider')[0].min;
        $('#rangeslider')[0].value = volume * 100;
        $('#rangeslider')[0].style.backgroundSize = (val - min) * 100 / (max - min) + '% 100%'
        $("#rangevalue")[0].textContent = volume * 100;
        $('#audible-select')[0].value = beepOpt;
        $('#visible-select')[0].value = blinkOpt;
        $('#xedx-audible-opt').prop('checked', !muted);
        $('#xedx-visual-opt').prop('checked', flashOn);
        $('#type-select')[0].value = beepType;
    }

    function startTimer() {
        let targetSel = "#react-root > div > div > ul > li.warListItem___Kb1Hh > div > div.chain-box-stats-block > div > span.chain-box-timeleft";
        let chainSel = "#react-root > div > div > ul > li.warListItem___Kb1Hh > div > div.chain-box-stats-block > div > span.chain-box-center-stat";
        targetNode = document.querySelector(targetSel);
        chainNode = document.querySelector(chainSel);

        if (!targetNode || !chainNode) {
            log('Unable to find target nodes! ', targetNode, chainNode);
            return setTimeout(startTimer, 1000);
        }

        setInterval(timerTimeout, 1000);
    }

    function handlePageLoad() {
        let parent = document.querySelector("#react-root > div > div > hr");

        // Install UI
        if (!parent) {
            log('Parent not found!');
            return setTimeout(handlePageLoad, 250);
        }
        $(parent).after(chainDiv);

        // Read saved options
        readOptions();
        setOptions();

        // Hook up volume control
        let rangeInputs = document.querySelectorAll('input[type="range"]');
        rangeInputs.forEach(input => {
            $("#rangevalue")[0].textContent = input.value;
            input.style.backgroundSize = (input.value - input.min) * 100 / (input.max - input.min) + '% 100%';
            input.addEventListener('input', handleInputChange);
        });

        // Hook up audio/visual enable checkboxes
        $('#xedx-audible-opt').change(function() {
            mute(!this.checked);
            saveOptions();
        });

        $('#xedx-visual-opt').change(function() {
            flashOn = this.checked;
            saveOptions();
        });


        // Hookup time (audible/visible) options
        $('#audible-select').change(function() {
            beepOpt = Number(this.value);
            saveOptions();
        });

        $('#visible-select').change(function() {
            blinkOpt = Number(this.value);
            saveOptions();
        });


        $('#type-select').change(function() {
            beepType = this.value;
            saveOptions();
        });

        // Hook up test buttons
        $('#test-audio').click(function() {
            let enabled = ($('#test-audio')[0].value == 'on') ? true : false;
            if (enabled) {
                log('Turning off, context = ', audioCtx);
                $('#test-audio')[0].value = 'off';
                $('#test-audio').removeClass('button-on');
                $('#test-audio').addClass('button-off');
                clearInterval(testBeepInt);
                testBeepInt = 0;
            } else {
                if (testBeepInt) return;
                log('Turning on, context = ', audioCtx);
                $('#test-audio')[0].value = 'on';
                $('#test-audio').addClass('button-on');
                $('#test-audio').removeClass('button-off');
                testBeepInt = setInterval(doBeep, 1000);
            }
        });

        $('#test-video').click(function() {
            let enabled = ($('#test-video')[0].value == 'on') ? true : false;
            if (enabled) {
                testingVideo = false;
                $('#test-video')[0].value = 'off';
                $('#test-video').removeClass('button-on');
                $('#test-video').addClass('button-off');
            } else {
                testingVideo = true;
                $('#test-video')[0].value = 'on';
                $('#test-video').removeClass('button-off');
                $('#test-video').addClass('button-on');
            }

        });

        startTimer();
    }

    //////////////////////////////////////////////////////////////////////
    // Main.
    //////////////////////////////////////////////////////////////////////

    //logScriptStart();
    //versionCheck();
    addStyles();
    handlePageLoad();

    function addStyles() {
        GM_addStyle(`.xedx-chain {text-align: center;
                              font-size: 56px; color: red; width: auto; margin-top: 10px; margin-left: 60px;}`);

        GM_addStyle(`body.dark-mode .xedx-chain-alert {text-align: center;
                              font-size: 56px; color: lime; width: auto; margin-top: 10px; margin-left: 60px;
                              -webkit-animation: highlight-active 1s linear 0s infinite normal;
                              animation: highlight-active 1s linear 0s infinite normal;}`);
        GM_addStyle(`.body:not(.dark-mode) .xedx-chain-alert {text-align: center;
                              font-size: 56px; color: #0CB814; width: auto; margin-top: 10px; margin-left: 60px;
                              -webkit-animation: highlight-active 1s linear 0s infinite normal;
                              animation: highlight-active 1s linear 0s infinite normal;}`);
        GM_addStyle(`.body.dark-mode .xedx-table {width: auto; color: white; margin-top: 10px;}`);

        GM_addStyle(`.body:not(.dark-mode) .xedx-table {width: auto; color: white; margin-top: 10px; background: #3D3D3D;
                                                    border-radius: 10px;}`);
        GM_addStyle(`.xcbx {margin-left: 10px; margin-top: 0px; border-radius: 50%; vertical-align: middle;
                         width: 1.1em; height: 1.1em; background-color: white;
                        border: 1px solid #ddd; appearance: none; -webkit-appearance: none;}`);
        GM_addStyle(`.xcbx:checked {background-color: #0032E0;}`);
        GM_addStyle(`.xtdx {color: white;}`);
        GM_addStyle(`.xedx-select {margin-left: 10px; margin-bottom: 10px; border-radius: 10px; margin-top: 10px;}`);
        GM_addStyle(`.xedx-select-row2 {margin-left: 10px; margin-bottom: 10px; border-radius: 10px; margin-top: 0px;}`);
        GM_addStyle(`.xedx-select2 {margin-left: 4px; margin-bottom: 10px; border-radius: 10px;}`);
        GM_addStyle(`.box-div {width: 100%;}`);
        GM_addStyle(`.box {display: flex !important; flex-direction: column; align-items: center;}`);
        GM_addStyle(` #xedx-chain-div .button-off {display: table-cell; border-radius: 10px; border: 1px solid black; color:black;
                                          background: white; height: 100%; width: 68px; margin-left: 10px; margin-right: 5px;}`);
        GM_addStyle(`#xedx-chain-div .button-on {display: table-cell; border-radius: 10px; border: 1px solid black; color: black;
                                          background: lime; height: 100%; width: 68px; margin-left: 10px; margin-right: 5px;}`);
        GM_addStyle(`.body:not(.dark-mode) .xedx-span {margin-left: 5px; color: white;}`);
        GM_addStyle(`.body.dark-mode .xedx-span {margin-left: 5px; color: white;}`);
        GM_addStyle(`.xedx-vol-span {margin-left: 20px !important; padding-left: 10px !important;}`);
        GM_addStyle(`.xedx-volume {margin-left: 15px; margin-top: -14px;}`);

        GM_addStyle(`input[type="range"] {
                  -webkit-appearance: none;
                  height: 7px;
                  background: rgba(255, 255, 255, 0.6);
                  border-radius: 5px;
                  background-image: linear-gradient(#0032E0, #0032E0);
                  background-size: 70% 100%;
                  background-repeat: no-repeat;
                }`);

        GM_addStyle(`input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  height: 20px;
                  width: 10px;
                  border-radius: 20%;
                  background: white;
                  cursor: ew-resize;
                  box-shadow: 0 0 2px 0 #555;
                  transition: background .3s ease-in-out;
                }`);

        GM_addStyle(`input[type=range]::-webkit-slider-runnable-track  {
                  -webkit-appearance: none;
                  box-shadow: none;
                  border: none;
                  background: transparent;
                }`);
    }

})();
