// ==UserScript==
// @name        Torn-JS-Helpers
// @version     2.45
// @namespace   https://github.com/edlau2
// @description Commonly used functions in my Torn scripts.
// @author      xedx [2100735]
// @connect     api.torn.com
// @connect     www.tornstats.com
// @exclude     *
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @license     MIT
// ==/UserScript==

// Until I figure out how to grab the metadata from this lib,
// it's not available via GM_info, this should be the same as
// the @version above
const thisLibVer = 2.43;

/*eslint no-unused-vars: 0*/
/*eslint no-undef: 0*/
/*eslint curly: 0*/
/*eslint no-multi-spaces: 0*/

//
// This check is designed to be run before abosuletly everything else in my scripts that
// load my helper library, which is 90% of them. This ensures they abort and will
// not execute when on the attacking page, to make loading as fast as possible.
//
// The 'require' of 'abort' script in the header didn't seem to work...
//
// Enable this when I feel ready with it, disabled (and not uploaded) for now...
//
const abortOnAttackPage = false;
const onAttackPage = function () { return location.search.startsWith("?sid=attack");}
if (abortOnAttackPage) {
    console.log(GM_info.script.name + " attack page check, match: ", location.search);
    if (location.search.startsWith("?sid=attack")) {
        console.log(GM_info.script.name + ' on page ' + location.href + " --- ABORTING!");
        //throw new Error(GM_info.script.name + " attack cheack, intentional abort, on attack page!");
    }
}

///////////////////////////////////////////////////////////////////////////////////
// Validate an API key and prompt if misssing
///////////////////////////////////////////////////////////////////////////////////

var debugLoggingEnabled = false;
var loggingEnabled = true;
var alertOnRetry = false;
var alertOnError = false;
var Torn_JS_Helpers_Installed = true;

// I haven't tested this yet, is meant
// for systems (such as Greasemonkey) that don't
// have GM_setValue/GM_getValue
if (GM) {
    window.GM_getValue = GM.getValue;
    window.GM_setValue = GM.setValue;
}

alertOnError = GM_getValue("alertOnError", alertOnError);
alertOnRetry = GM_getValue("alertOnRetry", alertOnRetry);

GM_setValue("alertOnError", alertOnError);
GM_setValue("alertOnRetry", alertOnRetry);

var api_key = GM_getValue('gm_api_key');

async function validateApiKey(type = null) {
    let text = GM_info.script.name + "Says:\n\nPlease enter your API key.\n" +
                         "Your key will be saved locally so you won't have to be asked again.\n" +
                         "Your key is kept private and not shared with anyone.";
    if (type == 'FULL')
        text += '\n\nA full access key is required!';
    else
        text += '\n\nOnly limited access is required';

    if (api_key == null || api_key == 'undefined' || typeof api_key === 'undefined' || api_key == '') {
        api_key = prompt(text, "");
        GM_setValue('gm_api_key', api_key);
    }

    if (type == 'FULL') {

    }
}

function getApiKey() {
    return api_key;
}

function getPlayerId() {
    return $('script[secret]').attr("uid");
}

function getPlayerName() {
    return $('script[secret]').attr("name");
}

function getPlayerFullName() {
    return getPlayerName() + ' [' + getPlayerId() + ']';
}

///////////////////////////////////////////////////////////////////////////////////
// Get the user's ID
///////////////////////////////////////////////////////////////////////////////////

var queryRetries = 0;
function queryUserId(callback) {
    xedx_TornUserQuery(null, 'basic', function(responseText, id, callback) {
        let jsonResp = JSON.parse(responseText);
        if (jsonResp.error) {
            if (jsonResp.error.code == 17) {
                if (queryRetries++ < 5) {
                    //debugger;
                    if (alertOnRetry) alert("Retrying error 17!");
                    return queryUserId(callback);
                } else {
                    queryRetries = 0;
                    return handleError(responseText);
                }
            } else { // != 17
                return handleError(responseText);
            }
        }
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
const logScriptStart = function () {
    console.log(GM_info.script.name + ' version ' +
                GM_info.script.version + ' script started, library version ' + thisLibVer);
}

function enableDebugLogging(enable=true) {
    debugLoggingEnabled = enable;
}

// non-blocking (async) delay, use with 'await' in an async function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Call the callback once page content loaded (readystate is still interactive)
function callOnContentLoaded(callback) {
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

// Call the callback once page content loading is complete (readystate is complete)
function callOnContentComplete(callback) {
    if (document.readyState == 'complete') {
        callback();
    } else {
        document.addEventListener('readystatechange',
            event => {if (document.readyState == 'complete') callback();});
    }
}

// Install an event listener for hash change notifications
function callOnHashChange(callback) {
    return installHashChangeHandler(callback);
}

function installHashChangeHandler(callback) {
    window.addEventListener('hashchange', function() {
    log('The hash has changed! new hash: ' + location.hash);
    callback();}, false);
}

// Store latest version info and notify if updated.
var silentUpdates = false;
function versionCheck(silent=false) {
    let curr_ver = GM_getValue('curr_ver', GM_info.script.version);
    if (Number(GM_info.script.version) > Number(curr_ver)) {
        let msg = 'Your version of ' + GM_info.script.name + ' has been updated to version ' + GM_info.script.version +
              ' ! Press OK to continue.';
        if (!silentUpdates && !silent) {alert(msg);}
        console.log(msg);
    }
    GM_setValue('curr_ver', GM_info.script.version);
}

// Simple logging helpers. Log regular events or debug-only events.
// Set these two vars as appropriate in your script.

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

/////////////////////////////////////////////////////////
// Functions to see if on a given pag
/////////////////////////////////////////////////////////

function isIndexPage() {return (location.href.indexOf("index.php") > -1)}
function isItemPage() {return (location.href.indexOf("item.php") > -1)}
function isFactionPage() {return (location.href.indexOf("factions.php") > -1)}
function isGymPage() {return (location.href.indexOf("gym.php") > -1)}
function isAttackPage() {return (location.href.indexOf("loader.php?sid=attack&user2ID") > -1)}
function isStocksPage() {return (location.href.indexOf("page.php?sid=stocks") > -1)}
function isRacePage() {return (location.href.indexOf("loader.php?sid=racing") > -1)}
function isBazaarPage() {return (location.href.indexOf("bazaar.php") > -1)}
function isJailPage() {return (location.href.indexOf("jailview.php") > -1)}
function isPointsPage() {return (location.href.indexOf("page.php?sid=points") > -1)} //https://www.torn.com/page.php?sid=points
function isUserListPage() {return (location.href.toLowerCase().indexOf("userlist") > -1)}
function isAmmoPage() {return (location.href.toLowerCase().indexOf("sid=ammo") > -1)}
function isModsPage() {return (location.href.toLowerCase().indexOf("sid=itemsmods") > -1)};
function isJobsPage() {return (location.href.toLowerCase().indexOf("joblist") > -1)};
function isTravelPage() {return (location.href.toLowerCase().indexOf("travelagency") > -1)};

//
// Get class list for an element
//
function getClassList(element) {
    let classList;
    let list = $(element).attr("class");
    if (list) classList = list.split(/\s+/);

    return classList;
}

/* Old function to cause a beep - won't work unless initiated by an element click */

// All arguments are optional:
//   duration of the tone in milliseconds. Default is 500
//   frequency of the tone in hertz. default is 440
//   volume of the tone. Default is 1, off is 0.
//   type of tone. Possible values are sine, square, sawtooth, triangle, and custom. Default is sine.
//   callback to use on end of tone
/*
var audioCtx = new (window.AudioContext || window.webkitAudioContext || window.audioContext);
function beep(duration=500, frequency=440, volume=1, type='sine', callback) {
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
*/

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

// Return the page sid for cuurent page. For example, an attack log is at
// "https://www.torn.com/loader.php?sid=attackLog&ID=<log id>", this would
// return "attackLog". Couls differentiate between diff crime pages, for example.
function getPageSid() {
    const params = new URLSearchParams(window.location.search);
    return params.get('sid');
}

// The URL expected is in the form "https://www.torn.com/profiles.php?XID=1162022#/"
// More accurately, "XID=" must be present :-)
// We need the XID; the trailing '#' may not be present.
function xidFromProfileURL(URL) {
    var n = URL.indexOf('XID='); // Find the 'XID=' token
    if (n == -1) {return null;}
    var n2 = URL.slice(n).indexOf('#'); // Find the '#' sign (removed in some patch, may not exist)
    var ID = 0;
    if (n2 != -1) {
        ID = URL.slice(n+4, n2); // Extract just the ID from the URL, between the '=' and '#'
    } else {
        ID = URL.slice(n+4);
    }
    return ID;
}

// Generic version of above, "ID=" must be preset.
// More accurately, "XID=" must be present :-)
// We need the XID; the trailing '#' may not be present.
function idFromURL(URL) {
    var n = URL.indexOf('ID='); // Find the 'ID=' token
    if (n == -1) {return null;}
    var n2 = URL.slice(n).indexOf('#'); // Find the next '#' sign (may not exist)
    var ID = 0;
    if (n2 != -1) {
        ID = URL.slice(n+3, n2); // Extract just the ID from the URL, between the '=' and '#'
    } else {
        ID = URL.slice(n+3);
    }
    return ID;
}

// Another version of above, except search for 'userid='
// Should combine these...
function useridFromProfileURL(URL) {
    var n = URL.indexOf('userId='); // Find the 'userId=' token
    if (n == -1) {return null;}
    var n2 = URL.slice(n).indexOf('#'); // Find the '#' sign (removed in some patch, may not exist)
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
// Functions to query the Torn API (and a few others)
/////////////////////////////////////////////////////////////////////////////////

// Get current Torn time, secs since epoch
// Usually, Date() works just as well, just be
// aware of secsvs ms...
//
//https://api.torn.com/user/?selections=timestamp&key=
function GetTornTime(callback) {
    xedx_TornGenericQuery('user', 0, "timestamp", callback);
}

//
// Callback should have the following signature: callback(responseText, ID, (optional)param)
//
function xedx_TornUserQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('user', ID, selection, callback, param);
}

function xedx_TornUserQueryDbg(ID, selection, callback, param=null) {
    xedx_TornGenericQueryDbg('user', ID, selection, callback, param);
}

function xedx_TornPropertyQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('property', ID, selection, callback, param);
}

function xedx_TornPropertyQueryDbg(ID, selection, callback, param=null) {
    xedx_TornGenericQueryDbg('property', ID, selection, callback, param);
}

function xedx_TornFactionQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('faction', ID, selection, callback, param);
}

function xedx_TornFactionQueryDbg(ID, selection, callback, param=null) {
    xedx_TornGenericQueryDbg('faction', ID, selection, callback, param);
}

function xedx_TornCompanyQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('company', ID, selection, callback, param);
}

function xedx_TornCompanyQueryDbg(ID, selection, callback, param=null) {
    xedx_TornGenericQueryDbg('company', ID, selection, callback, param);
}

function xedx_TornMarketQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('market', ID, selection, callback, param);
}

function xedx_TornMarketQueryDbg(ID, selection, callback, param=null) {
    xedx_TornGenericQueryDbg('market', ID, selection, callback, param);
}

function xedx_TornTornQuery(ID, selection, callback, param=null) {
    xedx_TornGenericQuery('torn', ID, selection, callback, param);
}

function xedx_TornTornQueryDbg(ID, selection, callback, param=null) {
    xedx_TornGenericQueryDbg('torn', ID, selection, callback, param);
}

function xedx_TornGenericQuery(section, ID, selection, callback, param=null) {
    if (ID == null) ID = '';
    let comment = GM_info.script.name.replace('Torn', 'XedX');
    let url = "https://api.torn.com/" + section + "/" + ID + "?comment=" + comment + "&selections=" + selection + "&key=" + api_key;
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

function xedx_TornGenericQueryDbg(section, ID, selection, callback, param=null) {
    if (ID == null) ID = '';
    let comment = GM_info.script.name.replace('Torn', 'XedX');
    let url = "https://api.torn.com/" + section + "/" + ID + "?comment=" + comment + "&selections=" + selection + "&key=" + api_key;
    console.debug('(JS-Helper) ' + GM_info.script.name + ' Querying ' + section + ':' + selection + ' ID: ' + ID);
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
            console.log('(JS-Helper) ' + GM_info.script.name + ' Error Response: ', response);
            handleSysError(response);
        },
        onabort: function(response) {
            console.log('(JS-Helper) ' + GM_info.script.name + ': onabort response: ', response);
            handleSysError(response);
        },
        ontimeout: function(response) {
            console.log('(JS-Helper) ' + GM_info.script.name +': ontimeout response: ', response);
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
    //console.debug('(JS-Helper) ' + GM_info.script.name + ' Spying ' + ID + ' via TornStats');
    //console.debug('(JS-Helper) ' + GM_info.script.name + ' url: ' + url);
    GM_xmlhttpRequest({
        method:"GET",
        url:url,
        headers: {
            'Accept': '*/*'
        },
        onload: function(response) {
            // Check status code here: 429
            //console.log('TornStat response: ', response);
            //if (response.status != 200) {
            //} else {
                callback(response.responseText, ID, param);
            //}
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

//
// Query YATA for foreign stocks, put this into library...
//
function xedx_YataForeignStocks(callback, param=null) {

    const yataHost = "https://yata.yt";
    const stocksURL = "/api/v1/travel/export/";
    let url = yataHost + stocksURL;

    //console.debug('(JS-Helper) ' + GM_info.script.name + ' Spying ' + ID + ' via TornStats');
    //console.debug('(JS-Helper) ' + GM_info.script.name + ' url: ' + url);

    log("xedx_YataForeignStocks: url is ", url);
    GM_xmlhttpRequest({
        method:"GET",
        url:url,
        headers: {
            'Accept': '*/*'
        },
        onload: function(response) {
            // Check status code here: 429
            console.log('TornStat response: ', response);
            //if (response.status != 200) {
            //} else {
                callback(response.responseText, param);
            //}
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
}// End YATA stocks fn...

// Given a coutry taken from looking at someone's travel
// destination via the API, translate it into a YATA country code
function codeFromCountry(country) {
    if (country == 'uk') return 'uni';                // Verified
    if (country == 'mexico') return 'mex';            // Verified
    if (country == 'canada') return 'can';            // Verified
    if (country == 'argentina') return 'arg';         // Verified
    if (country == 'hawaii') return 'haw';
    if (country == 'cayman-islands') return 'cay';    // Verified
    if (country == 'switzerland') return 'swi';       // Verified
    if (country == 'japan') return 'jap';
    if (country == 'china') return 'chi';             // Verified
    if (country == 'uae') return 'uae';               // Verified
    if (country == 'south-africa') return 'sou';      // Verified

    debug("*** Didn't find ", country, " in country list! ***");
    return null;
}

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

        // Temporary
        log("[jsHelper] Error: ", errorText);
        if (jsonResp.error.code == 5) debugger;

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

        if (jsonResp.error.code == 16) {
            errorText += '\n\nPlease try refreshing the page, you will be prompted again for your API key.\n';
            GM_setValue('gm_api_key', '');
        }

        errorText += '\nPress OK to continue.';
        if (alertOnError) alert(errorText);
        console.log(errorText);
        errorLogged = true;
    }
}

function handleSysError(response, addlText=null) {

    console.log("System error: ", response);

    let errorText = GM_info.script.name + ': An error has occurred querying data.\n\n' +
        response.error;

    errorText += '\n\nPress OK to continue.';
    if (alertOnError) alert(errorText);
    console.log(errorText);
    console.log(response);
    console.log(response.error);
}

// Print out ajax errors....
function decodeAjaxError(jqXHR, textStatus, errorThrown) {
    log("decodeQuickReloadError");
    log("jqXHR: ", jqXHR);
    log("textStatus: ", textStatus);
    log("errorThrown: ", errorThrown);
}

//--- Simulate a natural mouse-click sequence.
function simulateMouseClick(targetNode) {
    triggerMouseEvent (targetNode, "mouseover");
    triggerMouseEvent (targetNode, "mousedown");
    triggerMouseEvent (targetNode, "mouseup");
    triggerMouseEvent (targetNode, "click");
}

function triggerMouseEvent (node, eventType) {
    var clickEvent = document.createEvent ('MouseEvents');
    clickEvent.initEvent (eventType, true, true);
    node.dispatchEvent (clickEvent);
}

// Just a nifty little helper so I can see the status of the page load.
// For development stuff...
function addLoadingLights() {
    if (document.querySelector("xedx-lights")) return;
    const targetSel = "#topHeaderBanner > div.header-wrapper-top > div";
    GM_addStyle(`
     .topcorner {position:absolute; top: 0px; right: 0px; width: 117px; height: 39px; color: #a7b9ca;}
     .icon-enabled {display: inline-block; vertical-align: middle; height: 34px; width: 34px;
                    background: url(/images/v2/chat/tab_icons.svg) left top;
                    filter: drop-shadow(0px 0px 1px rgba(17,17,17,0.678431));}
     .icon-disabled {display: inline-block; vertical-align: middle; height: 34px; width: 34px;
                    background: url(/images/v2/chat/tab_icons.svg) -68px top;
                    filter: drop-shadow(0px 0px 1px rgba(17,17,17,0.678431));}
    `);
    const miniUI = '<div id="xedx-lights" class="topcorner">' +
                   '<i id="xloading" class="icon-disabled"></i>' +
                   '<i id="xinteractive" class="icon-disabled"></i>' +
                   '<i id="xcomplete" class="icon-disabled"></i>' +
               '</div>';
    const toggleLightIcon = function (id) {
        let node = document.getElementById('x' + id);
        $(node).removeClass('icon-disabled');
        $(node).addClass('icon-enabled');
    }

    document.onreadystatechange = function () {toggleLightIcon(document.readyState);}
    let target = document.querySelector(targetSel);
    if (!target) return setTimeout(addLoadingLights, 50);
    if (!document.querySelector("xedx-lights")) $(target).after(miniUI);

    if (document.readyState == 'loading') toggleLightIcon('loading');
    if (document.readyState == 'interactive') {
        toggleLightIcon('loading');
        toggleLightIcon('interactive');
    }
    if (document.readyState == 'complete') {
        toggleLightIcon('loading');
        toggleLightIcon('interactive');
        toggleLightIcon('complete');
    }
}

/*
//
// Get an element that is an a href for a personal stat. Can wrap a div/span/etc.
// by using JQuery .wrap: $(yourNode).wrap(thisNode)
//
function getPesonalStatHref(statName, userId) {
    let newNode = '<a href="https://www.torn.com/personalstats.php?ID=' +
                        userId + '&stats=' + statName + '&from=1%20month" class="xdim85 href t-blue"></a>';

    return newNode;
}
*/

/**
 * @auther SM@K<smali.kazmi@hotmail.com>
 * @description website: smak.pk
 * usage: alert(SmartPhone.isAny());
 * if (SmartPhone.isAny()) {...}
 */
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

// *******************************************************
// The following can be called to add styles I use often.
// I may move to a separate .css file, loading those is a
// bit trickier than just calling these functions for what
// I need.
// *******************************************************

// Styles defined here are used by calling a function to install.
//
// addTornButtonExStyles() - A replacement for a button class "torn-btn", won't flicker on hover
// addContextStyles() - Styles used to build a popup context menu, see the notes
// addToolTipStyle() - Styles to support tool tips. Be sure to read the comment about JQuery versions!
//

// Replacement for class .torn-btn,which I find cab flicker
// on hover-over sometimes, I think due to border width,
// padding and margin issues.
function addTornButtonExStyles() {
    GM_addStyle(`
        .xedx-torn-btn {
            height: 22px !important;
            width: 74px;
            line-height: 22px;
            font-family: "Fjalla One", Arial, serif;
            font-size: 14px;
            font-weight: normal;
            text-align: center;
            text-transform: uppercase;
            border-radius: 5px;
            padding: 0 10px;
            cursor: pointer;
            color: #555;
            color: var(--btn-color);
            text-shadow: 0 1px 0 #FFFFFF40;
            text-shadow: var(--btn-text-shadow);
            background: linear-gradient(180deg, #DEDEDE 0%, #F7F7F7 25%, #CFCFCF 60%, #E7E7E7 78%, #D9D9D9 100%);
            background: var(--btn-background);
            border: 1px solid #aaa;
            border: var(--btn-border);
            display: inline-block;
            vertical-align: middle;
         }
         .xedx-torn-btn:hover {
            filter: brightness(2.00);
         }
         .xedx-torn-btn:active {
            filter: brightness(0.80);
         }
     `);
}


// Add the style(s) I use for tool-tips
// tooltip3 is *no longer* the correct one, with an opaque gray background
// tooltip4 sizes to content, current preferred version. May now also
// provide your own.
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

    GM_addStyle(".tooltip4 {" +
              "radius: 4px !important;" +
              "background-color: #000000 !important;" +
              "filter: alpha(opacity=80);" +
              "opacity: 0.80;" +
              "padding: 5px 20px;" +
              "border: 2px solid gray;" +
              "border-radius: 10px;" +
              "width: auto;" +
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
// 'cl' is the name of a custom class if you want to pass that in.
function displayToolTip(node, text, cl) {
    $(document).ready(function() {
        $(node).attr("title", "original");
        $(node).tooltip({
            content: text,
            classes: {
                "ui-tooltip": cl ? cl : "tooltip3"
            }
        });
    })
}

// Adds a tool tip to a node/element
// 'cl' is the name of a custom class if you want to pass that in.
function displayToolTip2(node, text, cl) {
    $(document).ready(function() {
        $(node).attr("title", "original");
        $(node).tooltip({
            content: text,
            classes: {
                "ui-tooltip": cl ? cl : "tooltip4"
            }
        });
    })
}

// This was a test fn, can use the one above instead.
function displayMiniToolTip(node, text) {
    $(document).ready(function() {
        $(node).attr("title", "original");
        $(node).tooltip({
            content: text,
            classes: {
                "ui-tooltip": "tooltip4"
            }
        });
    })
}


// These classes are used to build a right-click context menu...
//
// context-wrapper is used in a div encompassing the context menu if desired, to see
// where it is. x-box is another diagnostic class to draw a box at a point to see where
// that would be. Once the menu is created and placed anywhere on the page, a click
// handler would do this:
//   $(cmSel).css("left", x.toString() + "px");
//   $(cmSel).css("top", y.toString() + "px");
//   $(cmSel).removeClass("ctxhide").addClass("ctxshow");
// to display and place somewhere onscreen. Menus can be appended to the UL.
// Sample HTML:
/*
    `<div id="x-contextMenu" class="context-menu ctxhide">
        <ul>
            <li><a href="#">Menu 1</a></li>
            <li><a href="#">Menu 2</a></li>
            <li id="click-me"><a>Clickable Choice</a></li>
        </ul>
    </div`
*/
function addContextStyles() {
    GM_addStyle(`
        .context-wrapper {
            border: 1px solid red;
        }
        .context-menu {
            position: absolute;
            text-align: center;
            background: lightgray;
            border: 1px solid black;
            border-radius: 15px;
            margin: 2px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 20;
        }

        .ctxhide {display: none;}
        .ctxshow {display: block}

        .context-menu ul {
            padding: 0px;
            margin: 0px;
            min-width: 150px;
            list-style: none;
            border: 1px solid black;
            border-radius: 15px;
        }

        .context-menu ul li {
            border-top: 1px solid black;

        }

        .context-menu ul li-ex {
            border: 1px solid black;
            border-radius: 5px;
            cursor: pointer;
            color: #555;
            color: var(--btn-color);
            text-shadow: 0 1px 0 #FFFFFF40;
            text-shadow: var(--btn-text-shadow);
            background: linear-gradient(180deg, #DEDEDE 0%, #F7F7F7 25%, #CFCFCF 60%, #E7E7E7 78%, #D9D9D9 100%);
            background: var(--btn-background);
            border: 1px solid #aaa;
            border: var(--btn-border);
            vertical-align: middle;
        }

        .context-menu ul li a {
            padding-bottom: 7px;
            padding-top: 7px;
            text-decoration: none;
            color: black;
            display: block;
        }

        .context-menu ul li:hover {
            background: darkgray;
            border-radius: 15px;
        }
        .x-centered {
          position: fixed;
          top: 50%;
          left: 50%;
          /* bring your own prefixes */
          transform: translate(-50%, -50%);
        }
        .x-box {
            z-index: 20;
            width: 20px;
            height: 20px;
            border: 2px solid;
            border-color: black;
            display: block;
        }
    `);
}

//
// Work in progress: collecting common ones used everywhere
//
function loadAllCommonStyles() {

    log("Loading All Common Styles");

    loadCommonMarginStyles();
    loadTtsColors();
    loadMiscStyles();

}

// General stuff without good categories
function loadMiscStyles() {
    GM_addStyle(`
        .xhide {
            display: none;
        }
        .xshow {
            display: block;
        }
        .xshowi {
            display: inline-block;
        }
    `);
}

// Colors, brightness, opacity...
function loadTtsColors() {

    log("Loading Color Styles");

    GM_addStyle(`
        .xdim85 {
            filter: brightness(85%);
        }
    `);

    GM_addStyle(`
        .xedx-green {
            color: limegreen;
        }
        .xedx-red {
            color: red;
        }
        .xedx-offred {
            color: #FF2B2B;
        }
    `);
}

function loadCommonMarginStyles() {

    log("Loading Margin Styles");

    GM_addStyle(`
        .xmb3 {
            margin-bottom: 3px;
        }
        .xmb5 {
            margin-bottom: 5px;
        }
        .xmb10 {
            margin-bottom: 10px;
        }
        .xmb30 {
            margin-bottom: 30px;
        }
        .xml5 {
            margin-left: 5px;
        }
        .xml10 {
            margin-left: 10px;
        }
        .xml20 {
            margin-left: 20px;
        }
        .xmr5 {
            margin-right: 5px;
        }
        .xmr10 {
            margin-right: 10px;
        }
        .xmr20 {
            margin-right: 20px;
        }
        .xmt3 {
            margin-top: 3px;
        }
        .xmt5 {
            margin-top: 5px;
        }
        .xmt10 {
            margin-top: 10px;
        }
        .xmt20 {
            margin-top: 20px;
        }

    `);
}







