// ==UserScript==
// @exclude     *
// @namespace   https://openuserjs.org/users/DeKleineKobini
// @homepageURL https://www.torn.com/forums.php#/p=threads&t=16110079

// ==UserLibrary==
// @name        DKK Torn Utilities
// @description Commonly used functions in my Torn scripts.
// @version     1.2
// @license     MIT
// @require     https://openuserjs.org/src/libs/DeKleineKobini/DKK_Utilities.js
// ==/UserLibrary==

// ==/UserScript==

// Note: see ‘https://openuserjs.org/libs/DeKleineKobini/DKK_Torn_Utilities/source'

initialize();

function initialize() {
  Number.prototype.format = function (n, x) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\.' : '$') + ')';
    return this.toFixed(Math.max(0, ~~n)).replace(new RegExp(re, 'g'), '$&,');
  };
}

var logging = {
  regular: true,
  debug: false
};
var prefix = {
  regular: "[DKK] ",
  debug: "[DKK DEBUG] "
};

var apiKey;

const API_LENGTH = 16;
const STORAGE_LOCATION = "dkkutils_apikey";

function requireAPI() {
  debug("Require API")
  apiKey = getAPI();
  if (!_isValidAPIKey(apiKey)) {
    debug("Require API - no valid api found")
    let response = prompt("Please enter your API key: ");
    if (_isValidAPIKey(response)) {
      setAPI(response);
    }
    else {
      debug("Require API - no valid api given")
      alert("Given API key was not valid, script might not work.\nRefresh to try again.")
    }
  }
}

function _isValidAPIKey(key) {
  if (!key) key = apiKey;

  if (!key || key === undefined || key == "undefined" || key === null || key == "null" || key === "") return false;
  if (key.length != API_LENGTH) return false;

  return true;
}

function sendAPIRequest(part, id, selections, key) {
  debug(`Sending API request to ${part}/${selections} on id ${id}`);
  if (!key) key = apiKey;

  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: `https://api.torn.com/${part}/${id}?selections=${selections}&key=${key}`,
      onreadystatechange: function (res) {
        if (res.readyState > 3 && res.status === 200) {
          debug("API response received.")
          var json = JSON.parse(res.response);
          resolve(json);

          if (json.error) {
            var code = json.error.code;
            debug("API Error: " + code)
            if (code == 2) setAPI(null);
          }
        }
      },
      onerror: function (err) {
        console.log(err);
        reject('XHR error.');
      }
    })
  }).catch(e => {
    console.log(e);
  });
}

function setAPI(key) {
  if (!_isValidAPIKey(key)) {
    localStorage.removeItem(STORAGE_LOCATION);
    debug("Removed key from storage.")
  }
  else {
    localStorage.setItem(STORAGE_LOCATION, key);
    debug(`Added key '${key}' to storage. '${localStorage.getItem(STORAGE_LOCATION)}'`)
  }

  apiKey = key;
}

function getAPI() {
  let utilsKey = localStorage.getItem(STORAGE_LOCATION);
  if (_isValidAPIKey(utilsKey)) {
    debug("getAPI - from own storage '" + utilsKey.length + "'");
    return utilsKey;
  }
  else {
    debug("getAPI - from own storage is invalid '" + utilsKey + "'");
  }

  let key = localStorage.getItem("_apiKey") || localStorage.getItem("x_apikey") || localStorage.getItem("jebster.torn") || localStorage.getItem("TornApiKey");

  if (_isValidAPIKey(key)) {
    debug("getAPI - from other storage");
    setAPI(key);
  }
  else if (localStorage.getItem("_apiKey")) {
    debug("getAPI - removed 1");
    localStorage.removeItem("_apiKey");
  }
  else if (localStorage.getItem("x_apikey")) {
    debug("getAPI - removed 2");
    localStorage.removeItem("x_apikey");
  }
  else if (localStorage.getItem("jebster.torn")) {
    debug("getAPI - removed 3");
    localStorage.removeItem("jebster.torn");
  }
  else if (localStorage.getItem("_apiKey")) {
    debug("getAPI - removed 4");
    localStorage.removeItem("TornApiKey");
  }

  return utilsKey;
}

function setDebug(debug) {
  logging.debug = debug;
}

function setPrefixEasy(name) {
  prefix.regular = "[" + name + "] ";
  prefix.debug = "[" + name + " DEBUG] ";
}

function setPrefix(regular, debug) {
  prefix.regular = regular;
  prefix.debug = debug;
}

function log(message, object) {
  if (!logging.regular) return;

  message = prefix.regular + message;
  if (object) console.log(message, object);
  else console.log(message);
}

function debug(message, object) {
  if (!logging.debug) return;

  message = prefix.debug + message;
  if (object) console.log(message, object);
  else console.log(message);
}

function xhrIntercept(callback) {
  let oldXHROpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function () {
    this.addEventListener('readystatechange', function () {
      if (this.readyState > 3 && this.status == 200) {
        var page = this.responseURL.substring(this.responseURL.indexOf("torn.com/") + "torn.com/".length, this.responseURL.indexOf(".php"));

        var json, uri;
        if (isJsonString(this.response)) json = JSON.parse(this.response);
        else uri = getUrlParams(this.responseURL);

        callback(page, json, uri, this);
      }
    });

    return oldXHROpen.apply(this, arguments);
  }
}

function isJsonString(str) {
  try {
    JSON.parse(str);
  }
  catch (e) {
    return false;
  }
  return true;
}

/**
 * JavaScript Get URL Parameter (https://www.kevinleary.net/javascript-get-url-parameters/)
 *
 * @param String prop The specific URL parameter you want to retreive the value for
 * @return String|Object If prop is provided a string value is returned, otherwise an object of all properties is returned
 */
function getUrlParams(url, prop) {
  var params = {};
  var search = decodeURIComponent(((url) ? url : window.location.href).slice(window.location.href.indexOf('?') + 1));
  var definitions = search.split('&');

  definitions.forEach(function (val, key) {
    var parts = val.split('=', 2);
    params[parts[0]] = parts[1];
  });

  return (prop && prop in params) ? params[prop] : params;
}

function getSpecialSearch() {
  let hash = window.location.hash;

  return hash.replace("#/", "?");
}

function observeMutationsFull(root, callback, options) {
  if (!options) options = {
    childList: true
  };

  new MutationObserver(callback).observe(root, options);
}

function observeMutations(root, selector, runOnce, callback, options, callbackRemoval) {
  var ran = false;
  observeMutationsFull(root, function (mutations, me) {
    var check = $(selector);

    if (check.length) {
      if (runOnce) me.disconnect();
      
      ran = true;
      callback(mutations, me);
    }
    else if (ran) {
      ran = false;
      if (callbackRemoval) callbackRemoval(mutations, me);
    }
  }, options);
}

function replaceAll(str, text, replace) {
  while (contains(str, text)) {
    str = str.replace(text, replace);
  }
  return str;
}

function contains(str, text) {
  return str.indexOf(text) >= 0;
}

function stripHtml(html) {
  var tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  var stripped = tmp.textContent || tmp.innerText || "";

  stripped = replaceAll(stripped, "\n", "");
  stripped = replaceAll(stripped, "\t", "");
  stripped = replaceAll(stripped, "  ", " ");

  return stripped;
}

function setCache(key, value, time, sub) {
  var end = time == -1 ? -1 : Date.now() + time;

  var obj = sub ? value : {
    value: value,
    end: Date.now() + time
  };

  GM_setValue(key, JSON.stringify(obj));
}

async function getCache(key, subbed) {
  let _obj = await GM_getValue(key, subbed ? "{}" : "{\"end\":0}");
  let obj = JSON.parse(_obj);

  var end = obj.end;
  if (!end || end == -1 || end > Date.now())
    return subbed ? obj : obj.value;

  return undefined;
}

function getSubCache(cache, id) {
  if (cache[id]) {
    var end = cache[id].end;
    if (end == -1 || end > Date.now())
      return cache[id].value;
  }

  return undefined;
}

function getNewDay() {
  let now = new Date();
  let newDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0));

  if (Date.now() >= newDay.getTime()) newDay.setUTCDate(newDay.getUTCDate() + 1);
  if (Date.now() >= newDay.getTime()) newDay.setUTCDate(newDay.getUTCDate() + 1);

  return newDay;
}

function getMillisUntilNewDay() {
  return getNewDay().getTime() - Date.now();
}

function isMobile() {
  return navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/iPod/i) ||
    navigator.userAgent.match(/BlackBerry/i) ||
    navigator.userAgent.match(/Windows Phone/i);
}
