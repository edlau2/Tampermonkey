/////////////////////////////////////////////////////////////////////////////
// Helpers/Utilities
/////////////////////////////////////////////////////////////////////////////

const UTILITIES_VERSION_INTERNAL = '1.0';
const defSSID = '1ILupZaXA52F0bwEXLSbegvSTT94jX2NfYSyxD7zQ3X4';

// The onOpen() function, when defined, is automatically invoked whenever the
// spreadsheet is opened. For more information on using the Spreadsheet API, see
// https://developers.google.com/apps-script/service_spreadsheet
function onOpen() {
  SCRIPT_PROP = PropertiesService.getScriptProperties();
  let ss = important_getSSID();
  console.log('[onOpen] ss=' + ss);
}

// Referenced from [index].html, includes JavaScript.html and any stylesheets.
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Load script options
function loadScriptOptions() {
  opts.opt_consoleLogging = optsSheet().getRange("B3").getValue();
  opts.opt_useLocks = optsSheet().getRange("B4").getValue();
  opts.opt_allowUI = optsSheet().getRange("B5").getValue();
  console.log('[loadScriptOptions] ', opts);
}

// Function to get the spreadsheet handle by SSID
// See also ssidTest() in 'unitTests.gs'
var SCRIPT_PROP = PropertiesService.getScriptProperties();
function important_getSSID() {
  let ss = null;
  let savedKey = SCRIPT_PROP.getProperty("key");
  if (!savedKey) {
    let doc = SpreadsheetApp.getActiveSpreadsheet();
    if (doc) {
      console.log('Saved SSID not found, using current SSID:', doc.getId())
      SCRIPT_PROP.setProperty("key", doc.getId());
      console.log('Saved SSID: ' + doc.getId());
    }
  }

  try {
    ss = SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
    if (ss) console.log('Used saved SSID: ', ss.getKey());
  } catch (e) {
    console.log('Error: ' , e + '\nWill retry with default SSID (' + defSSID + ')');
    ss = SpreadsheetApp.openById(defSSID);
    if (ss) {
      SCRIPT_PROP.setProperty("key", ss.getKey());
      console.log('Saved SSID: ', ss.getKey());
    }
  } finally {
    return ss;
  }
}

// Delete any saved spreadsheet key - debuggin utility only.
function deleteSSID() {
  SCRIPT_PROP.deleteProperty("key");
  console.log('Deleted saved SSID');
}

// Versioning info
function getVersion(ss=null) {
  return 'ALLIANCE_SERVICES_VERSION_INTERNAL = "' + ALLIANCE_SERVICES_VERSION_INTERNAL + '"\n' +
         'UTILITIES_VERSION_INTERNAL = "' + UTILITIES_VERSION_INTERNAL + '"\n' +
         'SSID: ' + (ss ? ss.getKey() : important_getSSID().getKey());
}

// Determine the main spreadsheet version, as a number
function getSpreadsheetVersion(ss=null) {
  let version = optsSheet(ss).getRange('B2').getValue();
  //let verArray = verStr.split(' ');
  //let version = +verArray[1]; // The '+' casts the string to a number
  //console.log(version + ' ' + getObjType(version));

  return (Math.round(version * 100) / 100).toFixed(2).toString();
}

// Prevents the exception 'Cannot call SpreadsheetApp.getUi() from this context.'
// from being propogated if called from a triggered function.
//
// Used as a replacement for 'if (opts.opt_allowUI) SpreadsheetApp.getUi().alert(...)'
function safeAlert(...args) {
  try {
    let ui = SpreadsheetApp.getUi();
    let output = '';
    args.forEach(arg => {output += (arg + '\n')});
    ui.alert(output);
  } catch (e) {
    e.from = 'safeAlert()';
    console.log('Exception: ', e);
  }
}

// Get handles to various worksheets in the spreadsheet
function getDocById() {
  if (!SCRIPT_PROP.getProperty("key")) {
    important_getSSID();
  }
  return SpreadsheetApp.openById(SCRIPT_PROP.getProperty("key"));
}

// Helper function used to get time formatted as: mm/dd/yyyy 00:00:00 TCT
function timenow() {
  return Utilities.formatDate(new Date(), "GMT", "MM/dd/yyy HH:mm:ss") + ' TCT';
}

// Perform an array deep copy
function deepCopy(copyArray) {
    return JSON.parse(JSON.stringify(copyArray));
}

// Helper to optionally log.
function log(...data) {
  if (opts.opt_consoleLogging) console.log(...data);
}

function optsSheet() {
  return getDocById().getSheetByName('Options');
}

function productsSheet() {
  return getDocById().getSheetByName('Products');
}

function imagesSheet() {
  return getDocById().getSheetByName('Images');
}

// Format a number as currency
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

// Converts an image from a URL to a base64 encoded data string
// Sample usage:
/*
toDataURL('https://www.gravatar.com/avatar/d50c83cc0c6523b4d3f6085295c953e0', function(dataUrl) {
  console.log('RESULT:', dataUrl)
})
*/
/*
function toDataURL(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    var reader = new FileReader();
    reader.onloadend = function() {
      callback(reader.result);
    }
    reader.readAsDataURL(xhr.response);
  };
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}
*/

// Or call this in async fn:
// let res = await toDataUrl(URL);
/*
function toDataUrl(url) {
    console.log('[toDataUrl] ==>');
    return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.onload = function () {
            var reader = new FileReader();
            reader.onloadend = function () {
                console.log('resolve [toDataUrl]');
                resolve(reader.result);
            };
            reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = reject;
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
    });
}
*/



