// ==UserScript==
// @name         Torn Chain Watcher v2.0
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Make the chain timeout/count blatantly obvious.
// @author       xedx [2100735]
// @match        https://www.torn.com/factions.php*
// @connect      api.torn.com
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers-2.45.7.js
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

(function() {
    'use strict';

    const chainTimeSelect = "[class*='chain-bar__'] [class*='bar-stats__'] [class*='bar-timeleft__']";
    const chainCountSelect = "[class*='chain-bar__'] [class*='bar-stats__'] [class*='bar-value__']";

    const chainTime = function () { return $(chainTimeSelect).text();}
    const chainCount = function () { return $(chainCountSelect).text();}

    var beepType = "sine"; // "sine", "square", "sawtooth", "triangle" (or 'custom', but then need to define a periodic wave function)
    var beepFrequency = 440; // In hertz, 440 is middle A

    
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
    var intTimer = null;
    var hideOpts = false;



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

    function timerProc() {
        let parts = chainTime() ? chainTime().split(':') : [0, 0];
        let seconds = Number(parts[0]) * 60 + Number(parts[1]);

        // Check for chain drop/end
        let count = Number(chainCount().split('/')[0]);
        if (count == 0) {
            return;
        }

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
        $($("#xedx-chain-span")[0]).text(chainTime()); 
    };

    function saveOptions() {
        GM_setValue('flashOn', flashOn);
        GM_setValue('muted', muted);
        GM_setValue('beepOpt', beepOpt);
        GM_setValue('blinkOpt', blinkOpt);
        GM_setValue('volume', volume);
        GM_setValue('beepType', beepType);
        GM_setValue('hideOpts', hideOpts);
    }

    function readOptions() {
        flashOn = GM_getValue('flashOn', flashOn);
        muted = GM_getValue('muted', muted);
        beepOpt = GM_getValue('beepOpt', beepOpt);
        blinkOpt = GM_getValue('blinkOpt', blinkOpt);
        volume = GM_getValue('volume', volume);
        beepType = GM_getValue('beepType', beepType);
        hideOpts = GM_getValue('hideOpts', hideOpts);
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
        $('#xedx-hide-opt').prop('checked', hideOpts);
    }

    function startTimer() {
        //targetNode = document.querySelector("#barChain > div.bar-stats___pZpNX > p.bar-timeleft____259L");
        // #sidebar > div:nth-child(1) > div > div.user-information___VBSOk > div > div.toggle-content___BJ9Q9 > div > div:nth-child(5) >
        // a.bar___Bv5Ho.energy___hsTnO.bar-desktop___p5Cas.bar-link
        // energy__, nerve__, chain-bar__ etc.
        // Then for chain, count is  that > bar-stats__ > bar-value__, time at... > bar-timeleft__
        // ("[class*='chain-bar__'][class*='bar-stats__'][class*='bar-timeleft__']")
        targetNode = document.querySelector("[class*='bar-timeleft__']");
        //chainNode = document.querySelector("#barChain > div.bar-stats___pZpNX > p.bar-value___HKzIH");
        chainNode = document.querySelector("[class*='bar-value__']");

        log("targetNode: ", $(targetNode));
        log("Chain node: ", $(chainNode));

        if (!targetNode || !chainNode) {
            log('Unable to find target nodes! ', targetNode, chainNode);
            return setTimeout(startTimer, 1000);
        }

        intTimer = setInterval(timerProc, 1000);
    }

    function handlePageLoad() {
        let parent = document.querySelector("#react-root > div > div > hr");

        // Install UI
        if (!parent) {
            log('Parent not found!');
            return setTimeout(handlePageLoad, 250);
        }
        $(parent).after(getChainDiv());

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

        // Hide Options checkbox xedx-hide-opt
        $('#xedx-hide-opt').on('click', function(e) {
            log("hide-op clicked! ", $('#xedx-chainwatch-opts'));

            let size = 0;
            if (parseInt($('#xedx-chainwatch-opts').css("height")) > 0)
                size = "0px";
            else
                size = "100px";

            log("Changing Height to ", size);
            $('#xedx-chainwatch-opts').animate({
                height: size,
                opacity: ((size == "0px") ? 0 : 1),
                left: ((size == "0px") ? -5000 : ""),
            }, 1000, function() {
                log("Animate done! height = ", $('#xedx-chainwatch-opts').css("height"));
            });


        });

        // =====

        if (hideOpts) {
            //$('#xedx-chainwatch-opts').css("display","none");
            $('#xedx-chainwatch-opts').css("height","0px");
            $('#xedx-chainwatch-opts').css("opacity",0);
            $('#xedx-opt-label').addClass('top-margin20');
        } else {
            $('#xedx-opt-label').removeClass('top-margin20');
        }

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
                log('Turning off');
                $('#test-audio')[0].value = 'off';
                $('#test-audio').removeClass('button-on');
                $('#test-audio').addClass('button-off');
                clearInterval(testBeepInt);
                testBeepInt = 0;
            } else {
                if (testBeepInt) return;
                log('Turning on');
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

    logScriptStart();
    versionCheck();
    addStyles();
    callOnContentLoaded(handlePageLoad);

    function getChainDiv() {
        const chainDiv = `
            <div id="xedx-chain-div" class="xflexc-center xshow-flex">

                 <div class="title-black border-round" style="height: 5px; width: 100%;"></div>

                 <div class="">
                     <div id="xedx-opt-label">
                         <input type="checkbox" class="xcbx" id="xedx-hide-opt" name="hide" checked>
                         <label for="hide"><span class="xedx-span">Hide Opts</shidepan></label>
                     </div>
                     <div>
                         <span id="xedx-chain-span" class="xedx-chain">&nbsp</span>
                     </div>
                 </div>

                 <div class="title-black border-round m-top10" style="height: 5px; width: 100%;"></div>

                 <div id="xedx-chainwatch-opts">
                 <table id="xedx-chainwatch-opts-table">
                 <tbody>
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
                             <Button class="button-off" id="test-audio" value="off">Test Audio</Button>
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
                             <Button class="button-off" id="test-video" value="off">Test Video</Button>
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
                 </table>

                 <span style="height: 5px;"></span>
                 <div class="title-black border-round" style="height: 5px; width: 100%; margin-top: -5px;"></div>

                 </div>
             </div>`;

        return chainDiv;
    }

    function addStyles() {
        loadMiscStyles();
        addFlexStyles();

        GM_addStyle(`

            #xedx-chain-span {
                text-align: center;
                font-size: 56px;
                color: red;
                width: 100%;
                margin-top: -20px;
                justify-content: center;
                display: flex;
            }

            #xedx-chainwatch-opts-table {
                width: 100%;
                color: white;
            }

             .body:not(.dark-mode) .xedx-table {
                 background: #3D3D3D;
                 border-radius: 10px;
             }


                 body.dark-mode .xedx-chain-alert {text-align: center;
                              font-size: 56px; color: lime; width: auto; margin-top: 10px; margin-left: 60px;
                              -webkit-animation: highlight-active 1s linear 0s infinite normal;
                              animation: highlight-active 1s linear 0s infinite normal;}

               .body:not(.dark-mode) .xedx-chain-alert {text-align: center;
                              font-size: 56px; color: #0CB814; width: auto; margin-top: 10px; margin-left: 60px;
                              -webkit-animation: highlight-active 1s linear 0s infinite normal;
                              animation: highlight-active 1s linear 0s infinite normal;}

                 .xcbx {margin-left: 10px; margin-top: 0px; border-radius: 50%; vertical-align: middle;
                         width: 1.1em; height: 1.1em; background-color: white;
                        border: 1px solid #ddd; appearance: none; -webkit-appearance: none;}

               .xcbx:checked {background-color: #0032E0;}

                .xtdx {color: white;}

                .xedx-select {margin-left: 10px; margin-bottom: 10px; border-radius: 10px; margin-top: 10px;}
                 .xedx-select-row2 {margin-left: 10px; margin-bottom: 10px; border-radius: 10px; margin-top: 0px;}
                 .xedx-select2 {margin-left: 4px; margin-bottom: 10px; border-radius: 10px;}
                 .top-margin10 {margin-top: 10px;}
                 .top-margin20 {margin-top: 20px;}
                 .xxx-box-div {width: 100%;}
                 .box-col {flex-direction: column;}
                 .box {display: flex !important; align-items: center;}

                 #xedx-chain-div .button-off {display: table-cell; border-radius: 10px; border: 1px solid black; color:black;
                                          background: white; height: 100%; width: 168px; margin-left: 10px; margin-right: 5px;}
                 #xedx-chain-div .button-on {display: table-cell; border-radius: 10px; border: 1px solid black; color: black;
                                          background: lime; height: 100%; width: 168px; margin-left: 10px; margin-right: 5px;}
                 .body:not(.dark-mode) .xedx-span {margin-left: 5px; color: white;}
                 .body.dark-mode .xedx-span {margin-left: 5px; color: white;}
                 .xedx-vol-span {margin-left: 20px !important; padding-left: 10px !important;}
                 .xedx-volume {margin-left: 15px; margin-top: -14px;}

                 input[type="range"] {
                  -webkit-appearance: none;
                  height: 7px;
                  width: 218px;
                  background: rgba(255, 255, 255, 0.6);
                  border-radius: 5px;
                  background-image: linear-gradient(#0032E0, #0032E0);
                  background-size: 70% 100%;
                  background-repeat: no-repeat;
                }

                input[type="range"]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  height: 20px;
                  width: 10px;
                  border-radius: 20%;
                  background: white;
                  cursor: ew-resize;
                  box-shadow: 0 0 2px 0 #555;
                  transition: background .3s ease-in-out;
                }

                input[type=range]::-webkit-slider-runnable-track  {
                  -webkit-appearance: none;
                  box-shadow: none;
                  border: none;
                  background: transparent;
                }
        `);
    }

})();