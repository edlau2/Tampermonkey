// ==UserScript==
// @name         Torn Enable Attack Btn
// @namespace    http://tampermonkey.net/
// @version      0.5
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

    // 'States' the button may be in, indicated by color
    const waitingStateColor = "1px solid rgba(255, 0, 0, .7)";      // Click will turn green so next click goes to page
    const activatedStateColor = "1px solid rgba(0, 200, 0, .5)";    // Activated, click goes to attack loader page
    const activeWarningStateColor = "1px solid rgba(0, 255, 0, .8)";  // Active and at warning seconds
    const svgWarningStateColor = "rgba(0, 255, 0, .6)";

    GM_addStyle(`
        .wait-state {
            border: ${waitingStateColor};
        }
        .active-state {
            border: ${activatedStateColor};}
    `);

    const btnState =
          Object.freeze({ UNMODIFIED: 'unmodified', WAITING: 'waiting', ACTIVE: 'active', WARNING: 'warning'});
    var currBtnState = btnState.UNMODIFIED;

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
        enableBtn: GM_getValue("enableBtn", true),    // Button will be enabled or not
        warnAt: GM_getValue("warnAt", true),
        //enableContext: GM_getValue("enableContext", false),
        enableNow: GM_getValue("enableNow", false),
        newTab: GM_getValue("newTab", false)
    }
    writeOptions();

    const statusCheckInt = 1000;        // Initially, check status every 1 sec

    logScriptStart();

    const secsPerMin = 60, secsPerHr = 3600;
    const XID = xidFromProfileURL(location.href);
    const rfcv = getRfcv();
    const fillColor = $('body')[0].classList.contains('dark-mode') ?
          `url(#linear-gradient-dark-mode)` :
          `rgba(153, 153, 153, 0.4)`;
    const btnSel = "#button0-profile-" + XID;
    const svgSel = "#button0-profile-" + XID + " > svg";
    const url = `https://www.torn.com/profiles.php`;
    const userHref = `https://www.torn.com/loader.php?sid=attack&user2ID=${XID}`;
    var btnClone;

    const reqData = {step: 'getProfileData', XID: XID, rfcv: rfcv};

    // See if in hosp ASAP...don't touch UI if not.
    getStatus();

    callOnContentLoaded(handlePageLoad);

    function goToAttackPg(e) {
        if (options.newTab == true)
            openInNewTab(userHref);
        else
            window.location.href = userHref;
        return false;
    }

    function restoreBtn() {
        if (!btnClone || !$(btnClone).length) return;
        $(btnSel).replaceWith($(btnClone));
        btnClone = null;
    }

    // Fully activate the button - clicking will go to loader.
    function activateBtn(e) {
        debug("activateBtn");
        $(btnSel).off();
        $(btnSel).css("border", activatedStateColor);
        $(btnSel).removeClass("wait-state");
        $(btnSel).addClass("active-state");

        log("Activate: state: ", currBtnState);
        log("btn: ", $(btnSel));
        log("svg: ", $(svgSel));
        if (currBtnState == btnState.WARNING) {
            log("Adding warning animations");
            $(btnSel).addClass("alert-on");

            let svgElement = $(svgSel)[0]; // Get the raw DOM element
            log("svg el: ", svgElement);
            if (svgElement) svgElement.classList.add('svg-alert-on');
        }

        $(btnSel).on('click', goToAttackPg);
        currBtnState = btnState.ACTIVE;
    }

    // Enable the button, but does not fully enable yet. A click is stiil
    // required to go fully active - unless the enableNow ("Immediate")
    // option is on.
    var statusInt = 0;
    function enableButton() {
        debug("enableButton, statusValid: ", statusValid, " waiting: ", waitingForStatus, " in hosp: ", inHospital);
        if (statusValid == false) {
            waitingForStatus = true;
            return;
        }
        waitingForStatus = false;

        let btn = $(btnSel);
        if ($(btn).length > 0 && !$(btnClone).length) {
            btnClone = $(btn).clone();
            debug("Saving clone: ", $(btnClone));
        }

        debug("$(btn).length: ", $(btn).length, " $(btn).hasClass('disabled'): ", $(btn).hasClass('disabled'));
        if ($(btn).length > 0 && $(btn).hasClass('disabled') == true) {
            let svg = $(btn).find("svg");
            $(btn).removeClass('disabled');
            $(btn).addClass('active');
            $(btn).removeAttr('aria-disabled');
            $(btn).removeAttr('href');

            $(svg).css('fill', fillColor);

            $(btn).css("border", waitingStateColor);
            $(btn).addClass("wait-state");
            currBtnState = btnState.WAITING;

            $(btn).off();
            $(btn).on('click', activateBtn);

            // Fully activate if that option is on.
            if (options.enableNow)
                activateBtn();

            getStatus();
            return;
        }
        if ($(btn).length > 0) return;

        setTimeout(enableButton, 250);
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
                      if (waitingForStatus == true) enableButton();

                      if (remainsMs < timeLeftLimit*1000) {// && options.warnAt == true) {
                          debug("Activating at ", rc.diffMs/1000, " seconds");
                          if (options.warnAt == true)
                              currBtnState = btnState.WARNING;
                          activateBtn();
                          return;
                      }
                      return setTimeout(getStatus, newTimeout);
                  } else {
                      inHospital = false;
                      //activateBtn();
                  }
                  statusValid = true;
                  if (waitingForStatus == true) enableButton();
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
               animation: btn-blink .5s step-end infinite alternate;
           }

           @keyframes btn-blink {
               0%, 100% {border: ${activatedStateColor};}
               50% {border: ${activeWarningStateColor};}
           }
           .svg-alert-on {
               animation: svg-blink .5s step-end infinite alternate;
           }
           @keyframes svg-blink {
               50% {fill: ${svgWarningStateColor};}
           }
           #xtime {
               width: 36px;
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
                                <td><label>Btn enable: <input class="cdc-cb" type="checkbox" name="enableBtn"></label></td>
                                <td class="xfes"><label>Always On: <input class="cdc-cb" type="checkbox" name="enableNow"></label></td>
                                <td class="xfes"><label>New tab: <input class="cdc-cb" type="checkbox" name="newTab"></label></td>
                                <td class="xfes"><label>Warn at<input type="number" id="xtime" value="${timeLeftLimit}"></label></td>
                                <td class="xfes"><label>secs<input class="cdc-cb" type="checkbox" name="warnAt"></label>
                            </tr></tbody></table>
                        </div>`;

        $(hdr).css("display", "flex");
        $(hdr).css("flex-flow", "row wrap");
        $(hdr).append(newDiv);

        if (options.enableBtn == true)
            $(".xfes").css("display", "table-cell");
        else
            $(".xfes").css("display", "none");

        log("Added div: ", $("#eab"));

        $("#xtime").on('change', function() {
            timeLeftLimit = $("#xtime").val();
            GM_setValue("timeLeftLimit", timeLeftLimit);
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
            let checked = $(this).prop('checked');
            updateOption(key, $(this).prop('checked'));

            if (key == 'enableNow' && checked == true) {
                activateBtn();
            }

            if (key == 'enableBtn') {
                if (options.enableBtn == true) {
                    enableButton();
                } else {
                    restoreBtn();
                }
            }

            if (options.enableBtn == true)
                $(".xfes").css("display", "table-cell");
            else
                $(".xfes").css("display", "none");

            logOptions();
        });

        log("Added div: ", $(".time-wrap"), $("#xtime"));

        divCheck = setInterval(checkUi, 1000);
    }

    function handlePageLoad() {
        addStyles();
        installUI();
        if (options.enableBtn == true) enableButton();
    }

})();




