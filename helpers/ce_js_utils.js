// ==UserScript==
// @name        ce_js_utils
// @version     1.17
// @namespace   http://tampermonkey.net/
// @description Common JS functions for Cartel Empire
// @author      xedx
// @exclude     *
// @grant       GM_addStyle
// @grant       GM_getValue
// @grant       GM_setValue
// @license     MIT
// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

// Should match version above
const thisLibVer = '1.17';

const  deepCopy = (src) => { return JSON.parse(JSON.stringify(src)); }

// Enables the debug() log function, can be set by scripts as needed.
var debugLoggingEnabled = GM_getValue("debugLoggingEnabled", false);

const secsInMin = 60 * 60;
const secsInHr = secsInMin * 60;
const secsInDay = secsInHr * 24;

const epochTime = () => { return new Date().getTime(); }

const log = (...data) => { console.log(GM_info.script.name + ': ', ...data);}
const logtTime = () => { return (parseInt(epochTime()/1000) % 60) + '.' + epochTime() % 1000; }
const logt = (...data) => { console.log(logtTime() + " " + GM_info.script.name + ': ', ...data); }
const logtm = (...data) => { console.log(parseInt((epochTime()/1000) / 60) + '.' +logtTime() + " " + GM_info.script.name + ': ', ...data); }
const debug = (...data) => { if (debugLoggingEnabled) { console.log(GM_info.script.name + ': ', ...data); }}

const logScriptStart = () => {
    console.log(GM_info.script.name + ' version ' +
        GM_info.script.version + ' script started, library version ' + thisLibVer);
}

// ============================== get user ID ===================================

const initUserId = () => {
    let id = GM_getValue("user_id", null);
    if (!id) id = $("#userId").attr("userId");
    if (!id) {
        id = prompt("Please enter your User ID, I couldn't find it!");
    }
    if (id) {
        GM_setValue("user_id", id);
    }
    return id;
}

// ======================= API Key request, if required ==========================
 var api_key = GM_getValue("api_key", undefined);
 async function validateApiKey() {
    let text = GM_info.script.name + "Says:\n\nPlease enter your API key.\n" +
        "Your key will be saved locally so you won't have to be asked again.\n" +
        "Your key is kept private and not shared with anyone.";

    if (!api_key) {
        api_key = prompt(text, "");
        GM_setValue('api_key', api_key);
    }
}

// Call the callback once page content loaded (readystate is still interactive)
const callOnContentLoaded = (callback) => {
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// Call the callback once page content loading is complete (readystate is complete)
const callOnContentComplete = (callback) => {
    if (document.readyState == 'complete') {
        callback();
    } else {
        document.addEventListener('readystatechange',
            event => {if (document.readyState == 'complete') callback();});
    }
}

// Be notified if visibility changes (change tabs, for example)
// Callback sig: cllbackFn(visible) {} // 'visible' is true if getting focus
const callOnVisibilityChange = (callback) => {
    document.addEventListener("visibilitychange", function() {
      if (document.visibilityState === 'visible') {
        callback(true);
      } else {
        callback(false);
      }
    });
}

// Notify when an element exits, via polling. If possible,
// use callWhenElementExistsEx(...) instead
//
// Callback signature: callback(success, element, selector, retries)
// Success is true if found, false if timed out
// Of course you could call again from the callback....
// Freq is how often to check for element, ms
// max is max attempts, defaults are 5 seconds total.
//
const callWhenElementExists = (selector, callback, freq=250, max=20) => {

    if (!selector || !callback) return console.error("Invalid function params!");
    if ($(selector).length) {callback(true, $(selector), selector, 0); return;}
    findElement({sel: selector, cb: callback, timeout: freq, maxRetries: max});

    function findElement(options, retries=0) {
        let target = $(options.sel);
        if (!$(target).length) {
            if (retries++ < options.maxRetries) return setTimeout(findElement, options.timeout, options, retries);
            options.cb(false, null, options.sel, retries);
        } else {
            options.cb(true, $(target), options.sel, retries);
        }
    }
}

// Mutation observer method, used if you have a parent to observe
// callback sig: callback(node)
const callWhenElementExistsEx = (closestRoot, selector, callback) => {
    if (!$(closestRoot).length) {
        console.error("ERROR: observer root does not exist: ", $(closestRoot));
        if ($(selector).length > 0)
            callback($(selector));
        return;
    }

    if ($(selector).length > 0) {
        callback($(selector));
        return;
    }

    const context = { sel: selector, cb: callback, found: false };
    const observer = new MutationObserver((mutations, observer) => {
       localMutationCb(mutations, observer, context)
    });

    observer.observe($(closestRoot)[0], { attributes: false, childList: true, subtree: true });

    function localMutationCb(mutations, observer, context) {
        if ($(context.sel).length > 0) {
            observer.disconnect();
            context.cb($(context.sel));
        }
    }
}

// Install an event listener for hash change notifications
const callOnHashChange = (callback) => {
    return installHashChangeHandler(callback);
}

const installHashChangeHandler = (callback) => {
    window.addEventListener('hashchange', function() {
        log('The hash has changed! new hash: ' + location.hash);
        callback();}, false);
}

// ==================== PushState handler installation ==================
const bindEventListener = (type) => {
    const historyEvent = history[type];
    return function () {
        const newEvent = historyEvent.apply(this, arguments);
        const e = new Event(type);
        e.arguments = arguments;
        window.dispatchEvent(e);
        return newEvent;
    };
}

const installPushStateHandler = (pushStateChangedHandler) => {
    history.pushState = bindEventListener("pushState");
    window.addEventListener("pushState", function (e) {
        pushStateChangedHandler(e);
    });
}

// Return time as hh:mm:ss, or mm:ss
const nn = function(n) { if (n < 10) return ('0' + n); return n; }
function secsToClock(secsLeft) {
    if (secsLeft > 0) {
        let hrs = parseInt(secsLeft / 3600);
        let remains = secsLeft - (hrs * 3600);
        let mins = parseInt(remains / 60);
        let secs = parseInt(remains % 60);
        if (hrs > 24) hrs = 0;

        return ((+hrs > 0) ? (nn(hrs) + ":") : '') +
            ((+mins > 0) ? (nn(mins)) : '00') + ":" + nn(secs);
    } else {
        return '00:00:00';
    }
}

// Get a user ID from href, Cartel Empire specific
const idFromHref = (href) => { return href ? href.substring(href.lastIndexOf('/') + 1) : 0; }

// ========================== Hash a URL into a small one ===============================

async function hashUrlToId(url, length = 7) {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  let num = 0;
  for (let i = 0; i < Math.min(length, hashArray.length); i++) {
    num = (num * 256) + hashArray[i];
  }

  const base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  while (num > 0) {
    result = base62Chars[num % 62] + result;
    num = Math.floor(num / 62);
  }

  while (result.length < length) {
    result = "0" + result;
  }

  return result.substring(0, length); // Ensure the final length
}

// ======================= Generic Cartel Empire API call  ==============================
// Success result callback sig: callback(response, status, xhr, id, param) {}

function ce_executeApiCall(category, id, type, callback, opts=null, param=null) {
    let idParam = id ? `id=${id}&` : '';
    const url = `https://cartelempire.online/api/${category}?${idParam}type=${type}&key=${api_key}`;
    if (opts != null) {
        let keys = Object.keys(opts);
        for (let idx=0; idx<keys.length; idx++) {
            let key = keys[idx], val = opts[key];
            url += `&${key}=${val}`;
            //url += `&${keys[idx]}=${opts[keys[idx]]}`;
        }
    }
    $.ajax({
        url: url,
        type: 'GET',
        success: function (response, status, xhr) {
            if (response.error) { return log("ajax error: ", response); }
            callback(response, status, xhr, id, param);
        },
        //error: function (jqXHR, textStatus, errorThrown) {
        //    console.error("Error in ajax lookup: ", textStatus,
        //                  "\nError jqXHR: ", jqXHR, "\nError thrown: ", errorThrown);
        //    callback({error: jqXHR}, jqXHR.statusText, jqHXR, id);
        //},
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("AJAX Error:", (jqXHR ? jqXHR.responseText : 'unknown'),
                "\nRequest obj:", jqXHR);
            // You can also access responseJSON if the server sent JSON and it failed to parse
            //if (jqXHR.responseJSON) {
            //    log("Response JSON:", jqXHR.responseJSON);
            //}
            callback({ req: jqXHR, error: (jqXHR ? jqXHR.responseText : 'unknown') });
        }
    });
}

// ==================== Generic Cartel Empire API call for user stats ==============================
// Success result callback sig: callback(response, status, xhr, id) {}
// type is one or more of Basic, Advanced, Cooldowns, Battle Stats, Status, Attacks, Events, Graph
function ce_getUserStats(id, type, callback) {
    if (!id) return console.error("[ce_getUserStats] Error: id is required");
    const url = `https://cartelempire.online/api/user?id=${id}&type=${type}&key=${api_key}`;
    $.ajax({
        url: url,
        type: 'GET',
        success: function (response, status, xhr) {
            if (response.error) { return log("ajax error: ", response); }
            callback(response, status, xhr, id);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("Error in ajax lookup: ", (jqXHR ? jqXHR.responseText : 'unknown'),
                "\nRequest obj:", jqXHR);
            callback({ req: jqXHR, error: (jqXHR ? jqXHR.responseText : 'unknown') });
        }
    });
}

// Similar, for items
function ce_getItemsList(type, callback) {
    const url = `https://cartelempire.online/api/items?type=${type}&key=${api_key}`;
    $.ajax({
        url: url,
        type: 'GET',
        success: function (response, status, xhr) {
            if (response.error) { return log("ajax error: ", response); }
            callback(response, status, xhr);
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.error("Error in ajax lookup: ", (jqXHR ? jqXHR.responseText : 'unknown'),
                          "\nError jqXHR: ", jqXHR, "\nError thrown: ", errorThrown);
            callback({ req: jqXHR, error: (jqXHR ? jqXHR.responseText : 'unknown') });
        }
    });
}

// ============= Display an alert that can time out ==============

async function alertWithTimeout(mainMsg, timeoutSecs, btnMsg) {
    addAlertStyles();
    addAlertDiv();

    $("#xalert .mainMsg").text(mainMsg);
    if (btnMsg) $("#xalert button").text(btnMsg);
    return await openModelessAlert(timeoutSecs);

    async function openModelessAlert(timeoutSecs) {
        $("#xalert").css("display", "block");
        if (timeoutSecs) setTimeout(function() {$("#xalert").remove();}, timeoutSecs*1000);
        return new Promise(resolve => {
            $("#xalert-ok-btn").on('click', (e) => {resolve($("#xalert").remove())});
        });
    }

     var alertStylesAdded = false;
     function addAlertDiv() {
         if ($("#xalert").length > 0) return;
         let newDiv = `
             <div id="xalert"><div class="alert-content">
                 <p class='mainMsg'></p>
                 <span class="xbtn-wrap"><button id="xalert-ok-btn" class="xedx-torn-btn" data-ret="true">OK</button></span>
             </div></div>`;
         $("body").append(newDiv);
     }
     function addAlertStyles() {
         if (alertStylesAdded) return;
         GM_addStyle(`
             #xalert {
                 display: none;
                 position: fixed;
                 top: 50%;
                 left: 50%;
                 width: 300px;
                 transform: translate(-50%, -50%);
                 background-color: var(--default-white-color);
                 padding: 20px 20px 0px 20px;
                 border-radius: 10px;
                 box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
                 color: var(--default-black-color);
                 font-size: 14px;
                 font-family: arial;
                 z-index: 9999999;
            }
            #xalert button {
                 margin: 10px 25px 10px 25px;
            }
            .mainMsg {
                 padding: 20px 0px 20px 0px;
                 font-size: 16px;
                 white-space: pre-line;
            }
            .alert-content {
                 position: relative;
                 display: flex;
                 flex-flow: column wrap;
                 align-content: center;
                 height: 100%;
            }
            .xbtn-wrap {
                 display: flex;
                 flex-flow: row wrap;
                 justify-content: center;
                 width: 100%;
                 align-content: center;
            }
        `);
    alertStylesAdded = true;
    }
}

// ========================================================================

// Get class list for an element
const getClassList = (element) => {
    let list = $(element).attr("class");
    if (list) return list.split(/\s+/);
}

// Check if a var is numeric
const isaNumber = (x) => { return !isNaN(x); }

// Format a number as currency.
const asCurrency = (num, cc) => {
    let formatter = new Intl.NumberFormat((cc ? cc : 'en-US'), {
        style: 'currency', currency: 'USD', maximumFractionDigits: 0,
    });

    return formatter.format(num);
}

// Add commas at thousand place - works with decimal numbers
const numberWithCommas = (x) => {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

// Return a random int, 0 up to 'max', inclusive.
const getRandomInt = (max) => { return Math.floor(Math.random() * (max+1)); }

// Return an arbitrary (not int) number between min and max, inclusive.
const getRandomArbitrary = (min, max) => { return Math.random() * (max - min) + min; }

// Return a random int between min and max, inclusive
const getRandomIntEx = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to create a hash for a string.
String.prototype.hashCode = () => {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
        let character = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// Get any cookie value - use '$.cookie()' if JQuery available
const getCookie = (cname) => {
    let name = cname + "=";
    let ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

// ============ Dynamically load another script ==================
// Alternative to @require if not always needed....
//
const loadScript = (file, noisy) => {
  const newScript = document.createElement('script');
  newScript.setAttribute('src', file);
  newScript.setAttribute('async', 'true');

    if (noisy == true) {
      newScript.onload = () => {
        debug(`${file} loaded successfully.`, 'success');
      };

      newScript.onerror = () => {
        debug(`Error loading script: ${file}`, 'error');
      };
    }

  document.head.appendChild(newScript);
}

// Open a new tab to a given URL. Will get focus by default
const openInNewTab = (url, focus=true) => {focus ? window.open(url, '_blank').focus() :
                                                   window.open(url, '_blank');}
//--- Simulate a natural mouse-click sequence.
const simulateMouseClick = (targetNode) => {
    triggerMouseEvent (targetNode, "mouseover");
    triggerMouseEvent (targetNode, "mousedown");
    triggerMouseEvent (targetNode, "mouseup");
    triggerMouseEvent (targetNode, "click");

    function triggerMouseEvent(node, eventType) {
        var clickEvent = document.createEvent ('MouseEvents');
        clickEvent.initEvent (eventType, true, true);
        node.dispatchEvent (clickEvent);
    }
}

// ========================= Draggable support =========================
//
// Outermost div (elmt is ID of the div) must have position: absolute or fixed
// Inside that must be a div called <outer-id>header ... See "Torn Hospital Timer" as an example.
//
const dragElement = (elmnt) => {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
      document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
      elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    let t = (elmnt.offsetTop - pos2);
    if (t < 0) t = 0;
    if (t > window.innerHeight)
        t = window.innerHeight - (event.target.offsetHeight);
    elmnt.style.top = t + "px";

    let l = (elmnt.offsetLeft - pos1);
    if (l < 0) l = 0;
    if (l > window.innerWidth)
        l = window.innerWidth - (event.target.offsetWidth);
    elmnt.style.left = l + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;

    //GM_setValue("lastPosition", $("#x-hosp-watch").position());
    let curPos = {top: elmnt.style.top, left: elmnt.style.left};
    GM_setValue("lastPosition", curPos);
  }
}

// See if a click is on top of an element
const isClickInElement = (event, elem) => {
    let xOK = false, yOK = false;
    let xClick = event.clientX, yClick = event.clientY;
    let elemTop = $(elem).offset().top, elemLeft = $(elem).offset().left;
    let elemBottom = elemTop + $(elem).height(), elemRight = elemLeft + $(elem).width();
    let pos = $(elem).position();

    if (xClick >= elemLeft && xClick <= elemRight) xOK = true;
    if (yClick >= elemTop && yClick <= elemBottom) yOK = true;

    // Compensation for sidebar scrolling.
    if (yClick >= pos.top && yClick <= (pos.top + $(elem).height())) yOK = true;

    return (xOK && yOK);
}

//
// Display a 'spinner'/'spin loader'/'loader' as an indication of a lengthy process
//
const displaySpinner = (target, spinnerId) => {
    addSpinLoaderStyles();
    let loaderDiv = "<div id='" + spinnerId + "' class='spinLoader'></div>"
    $(target).before(loaderDiv);
}

const removeSpinner = (spinnerId) => {
    let sel = "#"+ spinnerId;
    $(sel).remove();
}

// ===================== Save/restore actual position =======================
// I typically use with floating divs that are children of a very high
// level element, such as #mainContainer. Pass the id of the outermost
// div and frequency at which to poll for changes. Only usefull with draggable
// DIVs, seethe dragElement() for details on doing that also. Torn Hospital
// Timer, Torn Blood Bag Reminder, Torn War Timer on Every Page all use  both fns.
//
// The optional 'stayInWindow' param, if true, will try to force the window to
// stay within the window extents.
//
const isInViewport = (element) => {
    let elementTop = $(element).offset().top;
    let elementBottom = elementTop + $(element).outerHeight();
    let viewportTop = $(window).scrollTop();
    let viewportBottom = viewportTop + $(window).height();

    return elementBottom > viewportTop && elementTop < viewportBottom;
}

const isOffsetInViewport = (element, off) => {
    let elementTop = off.top;
    let elementBottom = elementTop + $(element).outerHeight();
    let viewportTop = $(window).scrollTop();
    let viewportBottom = viewportTop + $(window).height();

  return elementBottom > viewportTop && elementTop < viewportBottom;
}

const startSavingPos = (interval, outerDivId, stayInWindow) => {
    var posTimer = 0;
    if (!interval) return console.error("[startSavingPos] interval is required!");
    if (!outerDivId) return console.error("[startSavingPos] outerDivId is required!");
    restoreSavedPos(outerDivId);
    posTimer = setInterval(savePosition, 1500, outerDivId, stayInWindow);

    function getPosSelector(outerDivId) {
        return "#" + outerDivId;
    }

    function getDefPos(outerDivId) {
        let outerDivSelector = getPosSelector(outerDivId);
        let l = parseInt($("#mainContainer").outerWidth(true)) -
            ($(outerDivSelector).outerWidth() + 50);
        let t = 80;
        let off = {left: l, top: t};
        return off;
    }

    function getPosKey(outerDivId) {
        let key = outerDivId + "-lastPos";
        return key;
    }

    function getSavedPosition(outerDivId) {
        let key = getPosKey(outerDivId);
        let off;
        let tmp = GM_getValue(key, undefined);
        if (tmp) {
            off = JSON.parse(tmp);
        } else {
            off = getDefPos(outerDivId);
        }
        return off;
    }

    function checkExtents(outerDivSelector, off) {
        let changed = false;
        if (off.left < 0) {off.left = 0; changed = true;}
        if (off.left > (window.innerWidth - 20)) {off.left =
            (window.innerWidth - $(outerDivSelector).width());
            changed = true;}
        if (off.top < 0) {off.top = 0; changed = true;}
        if (off.top > window.innerHeight - 30) {off.top =
            (window.innerHeight - 30); changed = true;}

        if (changed) $(outerDivSelector).offset(off);
    }

    function savePosition(outerDivId, stayInWindow) {
        let outerDivSelector = getPosSelector(outerDivId);
        if ($(outerDivSelector).length == 0) {        // Element is gone
            console.log(GM_info.script.name + ': ' + outerDivSelector + " not found! Stopping position timer.");
            clearInterval(posTimer);
            posTimer = 0;
            return;
        }

        // Account for scroll! This will be offset to *unscrolled*
        let off = $(outerDivSelector).offset();
        let scr = $(window).scrollTop();
        off.top = parseInt(off.top) - parseInt(scr);

        if (stayInWindow == true) {
        //    checkExtents(outerDivSelector, off);
        }

        let key = getPosKey(outerDivId);
        GM_setValue(key, JSON.stringify(off));
    }

    function restoreSavedPos(outerDivId) {
        let outerDivSelector = getPosSelector(outerDivId);
        let off = getSavedPosition(outerDivId);

        let scr = $(window).scrollTop();
        off.top = parseInt(off.top) + parseInt(scr);
        if (off.top < 0) {
            off.top = 50;
        }

        $(outerDivSelector).offset(off);
    }
}

const addDraggableStyles = () => {
    GM_addStyle(`
        .x-drag {
            position: fixed;
            display: flex;
            z-index: 999998;
            overflow: scroll;
            border: 1px solid steelblue;
            border-radius: 10px;
            background: var(--default-bg-panel-color) none repeat scroll 0% 0% / auto padding-box border-box;
        }
    `);
}

// ====================== Tooltip support =============================
//
// Note that the jquery-ui lib must be included:
// at require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
//
function displayHtmlToolTip(node, text, cl='tooltip4') {
    let useClass = cl + " tt-ws";
    $(document).ready(function() {
        $(node).attr("title", "original");
        $(node).attr("data-html", "true");
        $(node).tooltip({
            content: text,
            classes: {
                "ui-tooltip": useClass
            }
        });
    })
}

// Tooltip styles, you can provide your own...
function addToolTipStyle() {
    GM_addStyle(`.tt-ws {white-space: pre-line;}`);
    GM_addStyle(`
        .tooltip4 {
            radius: 4px !important;
            background-color: #000000 !important;
            filter: alpha(opacity=80);
            opacity: 0.80;
            padding: 5px 20px;
            border: 2px solid gray;
            border-radius: 10px;
            width: fit-content;
            margin: 50px;
            text-align: left;
            font: bold 14px ;
            font-stretch: condensed;
            text-decoration: none;
            color: #FFF;
            font-size: 1em;
            line-height: 1.5;
            z-index: 999999;
        }
    `);

    GM_addStyle(`
        .tooltip5 {
            radius: 4px !important;
            background-color: #000000 !important;
            filter: alpha(opacity=80);
            opacity: 0.80;
            padding: 5px 20px;
            border: 2px solid gray;
            border-radius: 10px;
            width: fit-content;
            margin: 10px;
            text-align: left;
            font: bold 14px ;
            font-stretch: condensed;
            text-decoration: none;
            color: #FFF;
            font-size: 1em;
            z-index: 999999;
        }
    `);

    GM_addStyle(`
        .tooltip6 {
            position: relative;
            top: 225px !important;
            left: 480px !important;
            transform: translateX(-110%);
            background-color: #000000 !important;
            filter: alpha(opacity=80);
            opacity: 0.80;
            padding: 5px 20px;
            border: 2px solid gray;
            border-radius: 10px;
            width: fit-content;
            margin: 10px;
            text-align: left;
            font-weight: bold !important;
            font-stretch: condensed;
            text-decoration: none;
            color: #FFF;
            font-size: 13px;
            line-height: 1.5;
            z-index: 999;
        }
    `);
}





