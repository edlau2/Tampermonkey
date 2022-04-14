/*
* Main entry point for an interface that provides access to the data
* in the PSKnowledgebase in HTML format, intended for use as 'fliers'
* (brochures). This is a work in progress...
*/

/////////////////////////////////////////////////////////////////////////////
// File: Main.gs
// Note: doGet() is the main entry point exposed.
/////////////////////////////////////////////////////////////////////////////

// Versioning, internal
var ALLIANCE_SERVICES_VERSION_INTERNAL = '1.0';

// Params for testing w/out a browser
const params = { parameter: {},
  contentLength: -1,
  parameters: {},
  contextPath: '',
  queryString: '' };

// Function that calls the main unit test, here so I can set breakpoints here and not step in.
function doIt() {return doGet(params);} //{doMainTest();}

/////////////////////////////////////////////////////////////////////////////
// Globals
/////////////////////////////////////////////////////////////////////////////

var opts = {};

// Commonly used ranges
var dataSheetRange = null;

/////////////////////////////////////////////////////////////////////////////
// Default entry points to handle POST or GET requests
/////////////////////////////////////////////////////////////////////////////

function doGet(request) {
  loadScriptOptions();
  console.log('[doGet] verion: ', getVersion()); // ALWAYS logged.
  log('[doGet] request: ', request);
  log('parameters: ', request.parameters);
  log('reqDoc:', request.parameter.reqDoc);

  return handleRequest(request);
}

function doPost(e){
  loadScriptOptions();
  console.log('[doPost] verion: ', getVersion()); // ALWAYS logged.

  return handleRequest(e);
}

// IMPORTANT:
//
// Called from JavaScript.js; get spreadsheet data.
// Can do whatever, I return as an array. Returned data is consumed
// by showData(), also in JavaScript.html
//
async function getData() {
  //var spreadSheetId = important_getSSID();
  let dataRange = productsSheet().getRange('B3:B100');
  let values  = dataRange.getValues();
  var filtered = values.filter(el => { return el != ''});

  for (let i=0; i<filtered.length; i++) {
    log('Data value: ', filtered[i]);
  }
 
  return filtered;
}

/*
async function testImgUrlToBase64() {
  console.log('[testImgUrlToBase64]');
  let url = "http://18.119.136.223:8080/redrabbit/Molly-Photo.jpeg";
  console.log('calling toDataUrl');
  let result = await toDataUrl(url);
  console.log('[testImgUrlToBase64] result: ', result);
}
*/

/////////////////////////////////////////////////////////////////////////
// Entry point called when POST data is received. Where processing 
// occurs.
/////////////////////////////////////////////////////////////////////////

function handleRequest(request) {
  const startTime = new Date().getTime();
  const lock = LockService.getPublicLock();
  const sheetVersion = getSpreadsheetVersion();
  log('[handleRequest] ==>');
  
  // Safely lock access to this path concurrently.
  if (opts.opt_useLocks) {
    let success = lock.tryLock(30000); 
    if (!success) { 
      let output = 'Error: Unable to obtain exclusive lock after ' + timeout + ' seconds.';
      log(output); 
      return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
      }
  }

  // Based on query string, provide appropriate HTML result
  // TBD...
  try {
    log('Doing fancy stuff here...');

    return provideResult(request); // TBD (placeholder)
  } catch (e) {
    log('[handleRequest] exception: ', e);
    log(e.stack);
    let output = JSON.stringify({"exception":e});
    return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  } finally {  // Cleanup and leave
    if (opts.opt_useLocks) {
      log('Releasing lock.');
      lock.releaseLock();
      }
    const endTime = new Date().getTime();
    log('Execution complete. Elapsed time: ' + (endTime - startTime)/1000 + ' seconds.');
    log('<== [handleRequest]');
  }
} // end handleRequest()

/////////////////////////////////////////////////////////////////////////////
// Provide a result back to the requestor. (TBD)
/////////////////////////////////////////////////////////////////////////////

// Provide HTML result to send back.
// Request requires params: ?reqDoc=[index] for index.html, etc.
// https://script.google.com/macros/s/AKfycbybh4loZkBuWTXqZbH4fgAPSRY1Y_DrZV23PQo0le0/dev?reqDoc=index
function provideResult(request) {
  log('[provideResult] ==>');
  log('Request: ', request);
  log('parameters: ', request.parameters);
  log('reqDoc:', request.parameter.reqDoc);
  
  try {
    let reqDoc = request.parameter ? request.parameter.reqDoc : 'unknown';

    //var html = HtmlService.createHtmlOutputFromFile(reqDoc + '.html')
    //                      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    
    var html = HtmlService.createTemplateFromFile(reqDoc + '.html').evaluate();

  } catch (e) {
    log('[provideResult] exception: ', e);
  }

  log('<== [provideResult]');
  return html; // Put in finally, what to do on error?
}




