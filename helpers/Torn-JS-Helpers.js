// ==UserScript==
// @exclude     *
// @namespace   https://github.com/edlau2

// ==UserLibrary==
// @name        Torn-JS-Helpers
// @description Commonly used functions in my Torn scripts.
// @author      xedx [2100735]
// @updateURL   https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js
// @connect     api.torn.com
// @connect     www.tornstats.com
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @version     2.26
// @license     MIT
// ==/UserLibrary==

// ==/UserScript==

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/

///////////////////////////////////////////////////////////////////////////////////
// Validate an API key and prompt if misssing
///////////////////////////////////////////////////////////////////////////////////

var api_key = GM_getValue('gm_api_key');

function validateApiKey() {
    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt(GM_info.script.name + "Says:\n\nPlease enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.", "");
        GM_setValue('gm_api_key', api_key);
    }
}

function getApiKey() {
    return api_key;
}

///////////////////////////////////////////////////////////////////////////////////
// Get the user's ID
///////////////////////////////////////////////////////////////////////////////////

function queryUserId(callback) {
    xedx_TornUserQuery(null, 'basic', function(responseText, id, callback) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {return handleError(responseText);}
        try {
          return callback(jsonResp.player_id);
        } catch (e) {
          debugger;
        }
    }, callback);
}

///////////////////////////////////////////////////////////////////////////////////
// Miscellaneous utilities
///////////////////////////////////////////////////////////////////////////////////

// Just spit out the name of the script at startup
function logScriptStart() {
    console.log(GM_info.script.name + ' version ' + GM_info.script.version + ' script started!');
}

// non-blocking (async) delay, use with 'await' in an async function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Call the callback once page content laoded.
function callOnContentLoaded(callback) {
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// Store latest version info and notify if updated.
var silentUpdates = false;
function versionCheck() {
    let curr_ver = GM_getValue('curr_ver', GM_info.script.version);
    if (Number(GM_info.script.version) > Number(curr_ver)) {
        let msg = 'Your version of ' + GM_info.script.name + ' has been updated to version ' + GM_info.script.version +
              ' ! Press OK to continue.';
        if (!silentUpdates) {alert(msg);}
        console.log(msg);
    }
    GM_setValue('curr_ver', GM_info.script.version);
}

// Simple logging helpers. Log regular events or debug-only events.
// Set these two vars as appropriate in your script.
var debugLoggingEnabled = true;
var loggingEnabled = true;

function log(...data) {
    if (loggingEnabled) {
        console.log(GM_info.script.name + ': ', ...data);
    }
}

function debug(...data) {
    if (debugLoggingEnabled) {
        console.log(GM_info.script.name + ': ', ...data);
    }
}

// All arguments are optional:
//   duration of the tone in milliseconds. Default is 500
//   frequency of the tone in hertz. default is 440
//   volume of the tone. Default is 1, off is 0.
//   type of tone. Possible values are sine, square, sawtooth, triangle, and custom. Default is sine.
//   callback to use on end of tone
var audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
function beep(duration, frequency, volume, type, callback) {
    log('Beeping speaker!');
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

// Date formatting 'constants'
const date_formats = ["YYYY-MM-DD",
                      "YYYY-MONTH-DD DDD",
                      "YYYY-MM-DD HH:MM:SS",
                      "DAY MONTH DD YYYY HH:MM:SS",
                      "FULL (DAY MONTH DD YYYY HH:MM:SS TZ)"];

const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const days = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

// HTML constants
const CRLF = '<br/>';
const TAB = '&emsp;';
const separator = '<hr class = "delimiter-999 m-top10 m-bottom10">';


// Convert a date object into a readable format
// Note: use 'Utilities.formatDate' instead.
function dateConverter(dateobj, format){
    var year = dateobj.getFullYear();
    var month= ("0" + (dateobj.getMonth()+1)).slice(-2);
    var date = ("0" + dateobj.getDate()).slice(-2);
    var hours = ("0" + dateobj.getHours()).slice(-2);
    var minutes = ("0" + dateobj.getMinutes()).slice(-2);
    var seconds = ("0" + dateobj.getSeconds()).slice(-2);
    var day = dateobj.getDay();
    var converted_date = dateobj.toString();

    switch(format){
        case "YYYY-MM-DD":
            converted_date = year + "-" + month + "-" + date;
            break;
        case "YYYY-MONTH-DD DDD":
            converted_date = year + "-" + months[parseInt(month)-1] + "-" + date + " " + days[parseInt(day)];
            break;
        case "YYYY-MM-DD HH:MM:SS":
            converted_date = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
            break;
        case "DAY MONTH DD YYYY HH:MM:SS":
            converted_date = days[parseInt(day)] + " " + months[parseInt(month)-1] + " " + date + " " + year + " " +
                hours + ":" + minutes + ":" + seconds;
            break;
        case "FULL (DAY MONTH DD YYYY HH:MM:SS TZ)":
            converted_date = dateobj.toString();
            break;
    }

    return converted_date;
}

// Check if a var is numeric
function isaNumber(x)
{
    /*
    var regex=/^[0-9]+$/;
    if (!validPointer) {return false;}
    if (x.match(regex)) { // Will crash on undefined, null, etc. The above checks for that
        return true;
    }
    return false;
    */
    return !isNaN(x);
}

// Format a number as currency.
function asCurrency(num) {
    var formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',

        // These options are needed to round to whole numbers if that's what you want.
        //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
        maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
    });

  return formatter.format(num);
  }

// Function used to get time formatted for the running averages sheet
// Formatted as: mm/dd/yyyy 00:00:00 TCT
// This is stolenn from one of my Google Sheets App Scripts, never
// tried in pure Javascript. This is in TCT, which is the same as UTC/GMT
function timenow() {
  return Utilities.formatDate(new Date(), "GMT", "MM/dd/yyy HH:mm:ss");
}

// Add commas at thousand place - works with decimal numbers
function numberWithCommas(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

// Check to see if a pointer (sic) is valid
// Note: "val == undefined" is the same as the coercion, "val == null", and 'val'.
function validPointer(val, dbg = false) {
    if (typeof val !== undefined && val) {return true;}
    if (dbg) {debugger;}
    return false;
    /*
    if (val == 'undefined' || typeof val == 'undefined' || val == null) {
        if (dbg) {
            debugger;
        }
        return false;
    }
    return true;
    */
}

// Return a random int, 0 up to 'max', inclusive.
function getRandomInt(max) {
  return Math.floor(Math.random() * (max+1));
}

//////////////////////////////////////////////////////////////////
// Function to create a hash for a string. Returns a positive
// 32 bit int.
//////////////////////////////////////////////////////////////////

String.prototype.hashCode = function(){
    var hash = 0;
    for (var i = 0; i < this.length; i++) {
        var character = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

// The URL expected is in the form "https://www.torn.com/profiles.php?XID=1162022#/"
// More accurately, "XID=" must be present :-)
// We need the XID; the trailing '#' may not be present.
function xidFromProfileURL(URL) {
    var n = URL.indexOf('XID='); // Find the 'XID=' token
    if (n == -1) {return null;}
    var n2 = URL.indexOf('#'); // Find the '#' sign (removed in some patch, may not exist)
    var ID = 0;
    if (n2 != -1) {
        ID = URL.slice(n+4, n2); // Extract just the ID from the URL, between the '=' and '#'
    } else {
        ID = URL.slice(n+4);
    }
    return ID;
}

// Another version of above, except search for 'userid='
// Should combine these...
function useridFromProfileURL(URL) {
    var n = URL.indexOf('userId='); // Find the 'userId=' token
    if (n == -1) {return null;}
    var n2 = URL.indexOf('#'); // Find the '#' sign (removed in some patch, may not exist)
    var ID = 0;
    if (n2 != -1) {
        ID = URL.slice(n+7, n2); // Extract just the ID from the URL, between the '=' and '#'
    } else {
        ID = URL.slice(n+7);
    }
    return ID;
}

// Return the numeric equivalent of the full rank returned by the 'profile' selection
// Torn 'user' API query.
function numericRankFromFullRank(fullRank) {
    let parts = fullRank.split(' ');
    let rank = parts[0];
    if (parts.length >= 3 &&
        (rank == 'Absolute' || rank == 'Below' || rank == 'Above' || rank == 'Highly')) {
        rank = rank + ' ' + parts[1];
    }

    // Lookup name in our table (array) to convert to number
    let numeric_rank = 0;
    for (let i = 0; i < _ranks.length; i++) {
        if (rank == _ranks[i]) {
            numeric_rank = i;
            break;
        }
    }

    return numeric_rank;
}

// Add the style(s) I use for tool-tips
// tooltip3 is the correct one, with an opaque gray background
//
// Important: Add these to your script:
//
// @require      http://code.jquery.com/jquery-3.4.1.min.js
// @require      http://code.jquery.com/ui/1.12.1/jquery-ui.js
//
function addToolTipStyle() {
    GM_addStyle(`.ui-helper-hidden-accessible {display: none;}`);
    GM_addStyle(".tooltip2 {" +
              "radius: 4px !important;" +
              "background-color: #ddd !important;" +
              "padding: 5px 20px;" +
              "border: 2px solid white;" +
              "border-radius: 10px;" +
              "width: 300px;" +
              "margin: 50px;" +
              "text-align: left;" +
              "font: bold 14px ;" +
              "font-stretch: condensed;" +
              "text-decoration: none;" +
              "}");

    GM_addStyle(".tooltip3 {" +
              "radius: 4px !important;" +
              "background-color: #000000 !important;" +
              "filter: alpha(opacity=80);" +
              "opacity: 0.80;" +
              "padding: 5px 20px;" +
              "border: 2px solid gray;" +
              "border-radius: 10px;" +
              "width: 300px;" +
              "margin: 50px;" +
              "text-align: left;" +
              "font: bold 14px ;" +
              "font-stretch: condensed;" +
              "text-decoration: none;" +
              "color: #FFF;" +
              "font-size: 1em;" +
              "}");
}

// Adds a tool tip to a node/element
function displayToolTip(node, text) {
    $(document).ready(function() {
        $(node).attr("title", "original");
        $(node).tooltip({
            content: text,
            classes: {
                "ui-tooltip": "tooltip3"
            }
        });
    })
}

//////////////////////////////////////////////////////////////////////
// Map textual rank names to numeric, via array index
//////////////////////////////////////////////////////////////////////

var _ranks = ['Absolute beginner',
             'Beginner',
             'Inexperienced',
             'Rookie',
             'Novice',
             'Below average',
             'Average',
             'Reasonable',
             'Above average',
             'Competent',
             'Highly competent',
             'Veteran',
             'Distinguished',
             'Highly distinguished',
             'Professional',
             'Star',
             'Master',
             'Outstanding',
             'Celebrity',
             'Supreme',
             'Idolized',
             'Champion',
             'Heroic',
             'Legendary',
             'Elite',
             'Invincible'];

/////////////////////////////////////////////////////////////////////////////////
// Functions to query the Torn API
/////////////////////////////////////////////////////////////////////////////////

//
// Callback should have the following signature: callback(responseText, ID, (optional)param)
//
function xedx_TornUserQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('user', ID, selection, callback, param);
}

function xedx_TornPropertyQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('property', ID, selection, callback, param);
}

function xedx_TornFactionQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('faction', ID, selection, callback, param);
}

function xedx_TornCompanyQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('company', ID, selection, callback, param);
}

function xedx_TornMarketQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('market', ID, selection, callback, param);
}

function xedx_TornTornQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('torn', ID, selection, callback, param);
}

function xedx_TornGenericQuery(section, ID, selection, callback, param=null) {
    if (ID == null) ID = '';
    let comment = GM_info.script.name.replace('Torn', 'XedX');
    let url = "https://api.torn.com/" + section + "/" + ID + "?comment=" + comment + "&selections=" + selection + "&key=" + api_key;
    console.debug('(JS-Helper) ' + GM_info.script.name + ' Querying ' + section + ':' + selection);
    let details = GM_xmlhttpRequest({
        method:"POST",
        url:url,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        onload: function(response) {
            callback(response.responseText, ID, param);
        },
        onerror: function(response) {
            handleSysError(response);
        },
        onabort: function(response) {
            console.debug('(JS-Helper) ' + GM_info.script.name + ': onabort');
            handleSysError(response);
        },
        ontimeout: function(response) {
            console.debug('(JS-Helper) ' + GM_info.script.name +': ontimeout');
            handleSysError(response);
        }
    });
}

//////////////////////////////////////////////////////////////////
// Function to do a TornStats bat stats spy
//////////////////////////////////////////////////////////////////

function xedx_TornStatsSpy(ID, callback, param=null) {
    if (!ID) ID = '';
    let url = 'https://www.tornstats.com/api/v1/' + api_key + '/spy/' + ID;
    console.debug('(JS-Helper) ' + GM_info.script.name + ' Spying ' + ID + ' via TornStats');
    console.debug('(JS-Helper) ' + GM_info.script.name + ' url: ' + url);
    GM_xmlhttpRequest({
        method:"GET",
        url:url,
        headers: {
            'Accept': '*/*'
        },
        onload: function(response) {
            callback(response.responseText, ID, param);
        },
        onerror: function(response) {
            console.debug('(JS-Helper) ' + GM_info.script.name + ': onerror');
            console.debug(response);
            handleSysError(response);
        },
        onabort: function(response) {
            console.debug('(JS-Helper) ' + GM_info.script.name + ': onabort');
            console.debug(response);
            handleSysError(response);
        },
        ontimeout: function(response) {
            console.debug('(JS-Helper) ' + GM_info.script.name +': ontimeout');
            console.debug(response);
            handleSysError(response);
        }
    });
}

//////////////////////////////////////////////////////////////////////
// ************************ Travel Related ***************************
//////////////////////////////////////////////////////////////////////

// Return what country we are in (or going to!)
function currentCountry() {
    return $('body')[0].getAttribute('data-country');
}

// Return TRUE if travelling or not in Torn
function awayFromHome() {
    return abroad() || travelling();
}

// Return true if abroad (in the air or landed)
function abroad() {
    return $('body')[0].getAttribute('data-abroad') == 'true';
}

// Return true if travelling (in the air)
function travelling() {
    return $('body')[0].getAttribute('data-traveling') == 'true';
}

// Return true if in dark mode
function darkMode() {
    return $('body')[0].classList.contains('dark-mode');
}

/////////////////////////////////////////////////////////////////////////////////////
// Very simple error handler; only displayed (and logged) [once <== this is a lie!]
// Called from the various xedx_Torn*Query() functions
/////////////////////////////////////////////////////////////////////////////////////

// TBD: Change this to a self-closing message.
var errorLogged = false;
function handleError(responseText) {
    if (!errorLogged) {
        let jsonResp = JSON.parse(responseText);
        let errorText = GM_info.script.name + ': An error has occurred querying the Torn API.\n' +
            '\nCode: ' + jsonResp.error.code +
            '\nError: ' + jsonResp.error.error;

        if (jsonResp.error.code == 5) {
            errorText += '\n\n The Torn API only allows so many requests per minute. ' +
                'If this limit is exceeded, this error will occur. It will clear itself' +
                'up shortly, or you may try refreshing the page.\n';
        }

        if (jsonResp.error.code == 2) {
            errorText += '\n\n It appears that the API key entered or saved for you ' +
                'is incorrect. Please try refreshing the page, you will be prompted again for your API key.\n';
            GM_setValue('gm_api_key', '');
        }

        errorText += '\nPress OK to continue.';
        alert(errorText);
        console.log(errorText);
        errorLogged = true;
    }
}
function handleSysError(response, addlText=null) {
    let errorText = GM_info.script.name + ': An error has occurred querying data.\n\n' +
        response.error;

    errorText += '\n\nPress OK to continue.';
    alert(errorText);
    console.log(errorText);
    console.log(response);
    console.log(response.error);
}

/**
 * @auther SM@K<smali.kazmi@hotmail.com>
 * @description website: smak.pk
 */

// usage: alert(SmartPhone.isAny());
// if (SmartPhone.isAny()) {...}

(function() { // SmartPhone = function(obj) {
    var root = this;
    var SmartPhone = function(obj) {
        if (obj instanceof SmartPhone) return obj;
        if (!(this instanceof SmartPhone)) return new SmartPhone(obj);
        this._wrapped = obj;
    };

    SmartPhone.userAgent = null;
    SmartPhone.getUserAgent = function() {return this.userAgent;};
    SmartPhone.setUserAgent = function(userAgent) {this.userAgent = userAgent;};
    SmartPhone.isAndroid = function() {return this.getUserAgent().match(/Android/i);};
    SmartPhone.isBlackBerry = function() {return this.getUserAgent().match(/BlackBerry/i);};
    SmartPhone.isBlackBerryPlayBook = function() {return this.getUserAgent().match(/PlayBook/i);};
    SmartPhone.isBlackBerry10 = function() {return this.getUserAgent().match(/BB10/i);};
    SmartPhone.isIOS = function() {this.isIPhone() || this.isIPad() || this.isIPod();};
    SmartPhone.isIPhone = function() {return this.getUserAgent().match(/iPhone/i);};
    SmartPhone.isIPad = function() {return this.getUserAgent().match(/iPad/i);};
    SmartPhone.isIPod = function() {return this.getUserAgent().match(/iPod/i);};
    SmartPhone.isOpera = function() {return this.getUserAgent().match(/Opera Mini/i);};
    SmartPhone.isWindows = function() {return this.isWindowsDesktop() || this.isWindowsMobile();};
    SmartPhone.isWindowsMobile = function() {return this.getUserAgent().match(/IEMobile/i);};
    SmartPhone.isWindowsDesktop = function() {return this.getUserAgent().match(/WPDesktop/i);};
    SmartPhone.isFireFox = function() {return this.getUserAgent().match(/Firefox/i);};
    SmartPhone.isNexus = function() {return this.getUserAgent().match(/Nexus/i);};
    SmartPhone.isKindleFire = function() {return this.getUserAgent().match(/Kindle Fire/i);};
    SmartPhone.isPalm = function() {return this.getUserAgent().match(/PalmSource|Palm/i);};
    SmartPhone.isAny = function() {
        var foundAny = false;
        var getAllMethods = Object.getOwnPropertyNames(SmartPhone).filter(function(property) {
            return typeof SmartPhone[property] == 'function';
        });

        for (var index in getAllMethods) {
            if (getAllMethods[index] === 'setUserAgent' || getAllMethods[index] === 'getUserAgent' ||
                    getAllMethods[index] === 'isAny' || getAllMethods[index] === 'isWindows' ||
                    getAllMethods[index] === 'isIOS') {
                continue;
            }
            if (SmartPhone[getAllMethods[index]]()) {
                foundAny = true;
                break;
            }
        }
        return foundAny;
    };

    if(typeof window === 'function' || typeof window === 'object') {
        SmartPhone.setUserAgent(navigator.userAgent);
    }

    if (typeof exports !== 'undefined') {
        var middleware = function(isMiddleware) {
            isMiddleware = isMiddleware === (void 0) ? true : isMiddleware;
            if(isMiddleware) {
                return function(req, res, next) {
                    var userAgent = req.headers['user-agent'] || '';
                    SmartPhone.setUserAgent(userAgent);
                    req.SmartPhone = SmartPhone;
                    if ('function' === typeof res.locals) {
                        res.locals({SmartPhone: SmartPhone});
                    } else {
                        res.locals.SmartPhone = SmartPhone;
                    }
                    next();
                };
            } else {
                return SmartPhone;
            }
        };
        if (typeof module !== 'undefined' && module.exports) {
            var exports = module.exports = middleware;
        }
        exports = middleware;
    } else {
        root.SmartPhone = SmartPhone;
    }
}.call(this));

