// ==UserScript==
// @name         Torn Enable Attack Btn
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Enable disabled attack btn on profile page
// @author       xedx [2100735]
// @match        https://www.torn.com/profiles.php?XID=*
// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
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

    // This is the most important option, I'll try to put on the page
    // to make it easier to change on the fly. What it does is make it
    // so that when this much time is left in hosp, clicking the attack
    // button will start going to the attack page. From usin the links
    // on the war page in YATA, I usually can figure out exact time to
    // click at so I don't have to refresh and am first to attack. Varies
    // every time due to lag, usually dependent on how busy the war is.
    // Since Torn times are truncated to the second, the tenths place is
    // not terribly accurate
    var timeLeftLimit  = GM_getValue("timeLeftLimit", 4.5);         // Enable button when this many seconds remain...

    var inHospital = false;
    var statusValid = false;
    var waitingForStatus = false;

    debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

    const intervalTable = [
            {secsLeft: 10, checkEvery: 500},          // When 10 secs left in hosp, check status every half second
            {secsLeft: 20, checkEvery: 750},          // 20 secs left, 750ms (3/4 second)
            {secsLeft: 60, checkEvery: 1000},         // 60 secs, check every 1 sec. Maybe 2 or 3 here?
            {secsLeft: 'default', checkEvery: 2000}   // All else, every 2 secs...prob should be 5 or use time on page...
        ];

    // Checkbox options
    var options = {
        enableAttack: GM_getValue("enableAttack", false),
        enableAt: GM_getValue("enableAt", false),
        enableContext: GM_getValue("enableContext", false),
        enableNow: GM_getValue("enableNow", false)
    }

    const allowGoOnGreen = true;
    var goOnGreen = false;              // experimental...
    const statusCheckInt = 1000;        // Initially, check status every 1 sec

    logScriptStart();

    const secsPerMin = 60, secsPerHr = 3600;
    const XID = xidFromProfileURL(location.href);
    const rfcv = getRfcv();
    const fillColor = $('body')[0].classList.contains('dark-mode') ?
          `url(#linear-gradient-dark-mode)` :
          `rgba(153, 153, 153, 0.4)`;
    const btnSel = "#button0-profile-" + XID;
    const url = `https://www.torn.com/profiles.php`;
    const userHref = `https://www.torn.com/loader.php?sid=attack&user2ID=${XID}`;

    const reqData = {step: 'getProfileData', XID: XID, rfcv: rfcv};

    // See if in hosp ASAP...don't touch UI if not.
    getStatus();

    callOnContentLoaded(handlePageLoad);

    function handleRightClick() {
        openInNewTab(userHref);
        return false;
    }

    function activateBtn() {
        debug("activateBtn");
        $(btnSel).off('click.xedx');
        $(btnSel).css("border", "1px solid rgba(0,255,0,1)");
        $(btnSel).addClass("alert-on");
        $(btnSel).on('click', function(e) {
            window.location.href = userHref;
            return false;
        });
        if (goOnGreen == true)
            window.location.href = userHref;
    }

    var statusInt = 0;
    function go() {
        debug("go, statusValid: ", statusValid, " waiting: ", waitingForStatus, " in hosp: ", inHospital);
        if (statusValid == false) {
            waitingForStatus = true;
            return;
        }
        waitingForStatus = false;

        let btn = $(btnSel);
        debug("Attack btn: ", $(btn), " has class: ", $(btn).hasClass('disabled'));
        debug("selector: $('" + btnSel + "')");
        let cl = getClassList($(btn));
        debug("Class list: ", cl);

        debug("$(btn).length: ", $(btn).length, " $(btn).hasClass('disabled'): ", $(btn).hasClass('disabled'));
        if ($(btn).length > 0 && $(btn).hasClass('disabled') == true) {

            debug("**** Editing btn: ", $(btn));

            let svg = $(btn).find("svg");
            $(btn).removeClass('disabled');
            $(btn).addClass('active');
            $(btn).removeAttr('aria-disabled');
            $(btn).removeAttr('href');

            $(btn).find("svg").css('fill', fillColor);
            $(btn).css("border", "1px solid red");

            if (allowGoOnGreen == true) {
                $(btn).on('click.xedx', function() {
                    debug("on click, adding greem");
                    $(btnSel).css("border", "1px solid green");
                    goOnGreen = true;}
                );
            }

            $(btn).on('contextmenu', handleRightClick);

            getStatus();
            return;
        }
        if ($(btn).length > 0) return;

        setTimeout(go, 250);
    }

    function getSecsAndAdjust(time) {
        let nowMs = new Date().getTime();
        let now = nowMs / 1000;
        let diffMs = (time*1000) - nowMs;
        let diffSecs = time - now;
        if (diffSecs < intervalTable[0].secsLeft)
            return {diff: diffSecs, diffMs: diffMs, timeout: intervalTable[0].checkEvery};
        else if (diffSecs < intervalTable[1].secsLeft)
            return {diff: diffSecs, diffMs: diffMs, timeout: intervalTable[1].checkEvery};
        else if (diffSecs < intervalTable[2].secsLeft)
            return {diff: diffSecs, diffMs: diffMs, timeout: intervalTable[2].checkEvery};
        else
            return {diff: diffSecs, diffMs: diffMs, timeout: intervalTable[3].checkEvery};
    }

    var ts, type;
    var newTimeout = statusCheckInt;
    var oldTimeout = newTimeout;
    function getStatus() {
        debug("getStatus, url: ", url);

        $.ajax({url: url, type: 'GET', data: reqData,
          success: function(data) {
              let jsonObj;
              try {jsonObj = JSON.parse(data);} catch (err) {log("Error: ", err);}
              if (jsonObj && jsonObj.userStatus && jsonObj.userStatus.status) {
                  let status = jsonObj.userStatus.status;
                  debug("status: ", status);

                  ts = status.timestamp;
                  type = status.type;
                  if (type == "hospital") {
                      inHospital = true;
                      let rc = getSecsAndAdjust(ts);
                      let remains = rc.diff;
                      let remainsMs = rc.diffMs;
                      newTimeout = rc.timeout;
                      debug("getSecsAndAdjust returned: ", rc);
                      if (newTimeout != oldTimeout) {
                          oldTimeout = newTimeout;
                          debug("Timeout changed at ", rc.diff, " seconds");
                      }

                      statusValid = true;
                      if (waitingForStatus == true) go();

                      if (remainsMs < timeLeftLimit*1000) {
                          debug("Activating at ", rc.diffMs/1000, " seconds");
                          activateBtn();
                          return;
                      }
                      return setTimeout(getStatus, newTimeout);
                  } else {
                      inHospital = false;
                      //activateBtn();
                  }
                  statusValid = true;
                  if (waitingForStatus == true) go();
              }
          },
          error: function(error) {log("Error: ", error);}
        });

    }

    function addStyles() {
        GM_addStyle(`
           #eab label {
               color: var(--content-title-color) !important;
               padding-left: 5px;
               display: inline-flex;
           }
           .alert-on {
               animation: blinker .5s step-end infinite alternate;
           }

           @keyframes blinker {
               50% {border: 1px solid rgba(0,255,0,.2);}
           }
           #xtime {
               width: 30px;
               border-radius: 4px;
               margin: 0px 6px 0px;
               padding-left: 4px;
           }
           .time-wrap {
               display: flex;
               flex-flow: row wrap;
               align-content: center;
               justify-content: center;
               font-family: arial;
               font-size: 12px;
           }
           .cdc-cb {
               margin: 0px 4px 0px;
           }
        `);
    }

    function updateOption(name, newVal) {
        options[name] = newVal;
        GM_setValue(name, newVal);
    }

    function writeOptions() {
        let keys = Object.keys(options);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            GM_setValue(key, options[key]);
        }
    }

    function updateOptions() {
        let keys = Object.keys(options);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            options[key] = GM_getValue(key, options[key]);
        }
    }

    function logOptions() {
        let keys = Object.keys(options);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx];
            log("Option: ", key, " value: ", options[key]);
        }
    }

    var divCheck = null;
    function checkUi() {    // Add observer, don't do this!
        if (!$("#eab").length) {
            clearInterval(divCheck);
            divCheck = null;
            installUI();
        }
    }

    function installUI(retries=0) {
        let hdr = $("#skip-to-content");
        if ($(hdr).length < 1) {
            if (retries++ < 20) return setTimeout(installUI, 250, retries);
            return log("Didn't find content header...");
        }

        const newDiv = `<div id="eab" class="time-wrap">
                            <table><tbody><tr>
                                <td><label>Btn enable: <input class="cdc-cb" type="checkbox" name="enableAttack"></label></td>
                                <td class="xfes"><label>Immediate: <input class="cdc-cb" type="checkbox" name="enableNow"></label></td>
                                <td class="xfes"><label>Context: <input class="cdc-cb" type="checkbox" name="enableContext"></label></td>
                                <td class="xfes"><label>Go at<input type="number" id="xtime" value="${timeLeftLimit}"></label></td>
                                <td class="xfes"><label>secs<input class="cdc-cb" type="checkbox" name="enableAt"></label>
                            </tr></tbody></table>
                        </div>`;

        $(hdr).css("display", "flex");
        $(hdr).css("flex-flow", "row wrap");
        $(hdr).append(newDiv);

        if (options.enableAttack == true)
            $(".xfes").css("display", "table-cell");
        else
            $(".xfes").css("display", "none");

        log("Added div: ", $("#eab"));

        $("#xtime").on('change', function() {
            timeLeftLimit = $("#xtime").val();
            GM_setValue("timeLeftLimit", timeLeftLimit);
            debug("New xtime value: ", timeLeftLimit);
        });

        // init checkboxes
        let cbs = $(".cdc-cb");
        for (let idx=0; idx<$(cbs).length; idx++) {
            let cb = cbs[idx];
            let optName = $(cb).attr('name');
            $(`[name='${optName}']`).prop('checked', options[optName]);
        }

        // Checkbox handlers
        $(".cdc-cb").on('click', function (e) {
            let key = $(this).attr('name');
            updateOption(key, $(this).prop('checked'));

            if (options.enableAttack == true)
                $(".xfes").css("display", "table-cell");
            else
                $(".xfes").css("display", "none");

            log("Opt change: (", $(this).attr('name'), ")");
            logOptions();
        });

        log("Added div: ", $(".time-wrap"), $("#xtime"));

        divCheck = setInterval(checkUi, 1000);
    }

    function handlePageLoad() {
        addStyles();
        installUI();
        go();
    }

})();




