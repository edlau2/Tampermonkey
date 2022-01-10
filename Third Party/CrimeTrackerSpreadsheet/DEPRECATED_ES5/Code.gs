// Global constants - change back to const for ES6!!! Don't use 'const' is ES5!!!
var scriptProperties = PropertiesService.getScriptProperties();
//const ui = SpreadsheetApp.getUi();
var APIkey = getApiKey();
var baseURL = "https://api.torn.com/user/?comment=MyCrimesLog&selections=log&log=5700,5705,5710,5715,5720,5725,5730,5735,6791,8842&";

var timestampURL = "https://api.torn.com/torn/?comment=MyCrimesLog&selections=timestamp&key=" + APIkey;
var datasheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log");
var totalsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Totals");
var statusTitleCell = totalsSheet.getRange('AA14');
var statusCell = totalsSheet.getRange('AA15');
var timeCell = totalsSheet.getRange('AA16');
var dateCell = totalsSheet.getRange('AA17');
var MAX_RUN_TIME = 275000;
var NEW_CRIME_INT = 1; // Hours for new crimes trigger interval
var OLD_CRIME_INT = 10; // Seconds for new crimes trigger interval
var debug = true;
// End const's

var fromTimer = false;
var runNumber = 1; // When loading old logs, keep track of how many runs

// If debug is enabled, 'console.debug(...)' will spit out stuff to the execution log.
// Otherwise, it won't. Supports full object expansion. For example,
// let obj = {me: 'ed', value: 25, something: {a: 3, b: 4}};
// console.debug('Obj = ', obj); 
// will output: 'Obj =  { me: 'ed', value: 25, something: { a: 3, b: 4 } }'
// without having to stringify first.
if (!debug) {console.debug = function(){};}
// Not legal inf DEPRECATED_ES5
//else {console.debug = function(...x){console.log(...x)};}

// TEMPORARY function to set the 'lasteventdate' to last row on the 'Log' sheet 
function debug_setLastEventDate() {
  var lastrow = datasheet.getLastRow();
  var lasteventdate = datasheet.getRange("A" + lastrow).getValue();
  console.log('Setting last event date to: ', lasteventdate + ' (', theDate(lasteventdate), ')')
  scriptProperties.setProperty('LAST_EVENT_DATE', lasteventdate);
}

// Stubs to launch the two main functions, so I can detect if timer-driven
// or menu driven (or editor driven). These call the normal functions in a
// try-catch block to catch any completely unhandled exceptions.
function timer_myPastCrimeLog() {
  try {
    fromTimer = true;
    myPastCrimeLog();
  } catch (e) {
    console.error('[myPastCrimeLog, timer driven] error: ', e);
    throw(e);
  }
}

function timer_myCurrentCrimeLog() {
  try {
    fromTimer = true;
    myCurrentCrimeLog();
  } catch (e) {
    console.error('[myCurrentCrimeLog, timer driven] error: ', e);
    throw(e);
  }
}

// Get current crime data
function myCurrentCrimeLog() {
  console.log('[myCurrentCrimeLog] ==> from timer? ', fromTimer);
  setStatusTitle('Getting current crime data...');
  updateElapsed();
  var jsonTornData = queryData(baseURL + "key=" + APIkey);
  var keys = jsonTornData ? Object.keys(jsonTornData.log) : null;
  var lastlog = datasheet.getRange("A7").getValue();
  if (!keys || keys.length <= 0) {
    setStatusTitle('No new crimes!');
    setStatus('Will check for new crimes every hour.');
    timeCell.setValue('');
    dateCell.setValue('Last check: ' + Date.now().toLocaleTimeString());
    return;
  }

  setStatusTitle('Parsing current log data...');
  for (var i = 0; i < keys.length; i++) {
    setStatus('Parsing entry ' + (i+1) + ' of ' + keys.length);
    var row = 7 + i;
    var time = jsonTornData.log[keys[i]].timestamp;
    updateElapsed();
    updateEntryDate(time);
    
    if (time > lastlog) {
      datasheet.insertRowAfter(row-1);
      setRowFormulas(row, time);
      logCrimeData(jsonTornData.log[keys[i]], row);
    } // Could just 'break' here and be done, no real harm to continue
      // Or invert the check to a '<'
  }

  setStatusTitle('Success!');
  setStatus('Will check for new crimes every hour.');
  timeCell.setValue('');
  dateCell.setValue('');
  console.log('<== [myCurrentCrimeLog]');
}

// Get past crime data
function myPastCrimeLog() {
  console.log('[myPastCrimeLog] ==> from timer? ', fromTimer);
  updateElapsed();
  var starttime = new Date();
  var runtime = 0;
  var lastrow = datasheet.getLastRow();

  if (fromTimer) {
    runNumber = scriptProperties.getProperty('RUN_NUMBER') ? scriptProperties.getProperty('RUN_NUMBER') : 1;
  } else {
    scriptProperties.setProperty('RUN_NUMBER', 0);
  }

  // Delete any previously set trigger(s))
  clearRunningTriggers();
  
  // If log is empty, start with today's timestamp, else look for the earliest timestamp
  // Note: queryData() will rethrow on error. Catch it, if the error code is 'restart',
  // we can recover by setting our restart trigger and coming back.
  var jsonTornData = null, lasteventdate = 0, keys = null;
  try {
    if (lastrow == 6) {
      jsonTornData = queryData(timestampURL);
      lasteventdate = jsonTornData.timestamp[0];
    } else {
      //var lastgoodrow = lastrow - 1;
      lasteventdate = scriptProperties.getProperty('LAST_EVENT_DATE');
      //if (!lasteventdate) lasteventdate = datasheet.getRange("A" + lastgoodrow).getValue(); // failsafe
      datasheet.deleteRow(lastrow);
    }

    console.log('Retrieving data from: ' + theDate(lasteventdate));

    setStatusTitle('Getting past log data...');
    jsonTornData = queryData(baseURL + "to=" + lasteventdate + "&key=" + APIkey);
    if (jsonTornData.log == null) { // No more data! All done'
      setStatusTitle('No more data, complete!');
      setStatus('');
      startPeriodicTrigger("timer_myCurrentCrimeLog", NEW_CRIME_INT);
      return;
    }
  } catch(e) { // Trap intentionally thrown queryData() exceptions
    if (e.code == 'restart') {
      startNewRestarTrigger();
      return console.log('<== [myPastCrimeLog]');
    }
    console.log('Initial load, queryData error: ', e);
    setStatus("queryData() failed!");
    throw(e); // Exception will bubble up, show on sheet.
  }

  keys = Object.keys(jsonTornData.log);
  if (keys.length <= 0) {                // Shouldn't happen, returns NULL instead. 
    setStatusTitle('Nothing to do!');    // Should prob install the current crime log trigger here.
    console.log('<== [myPastCrimeLog]'); 
    return;
  }

  //iterate until no more results 
  var time = 0, counter = 1;
  while (keys.length > 0 && runtime < MAX_RUN_TIME) {
    setStatusTitle('Parsing past log data (pass ' + (counter++) + ', run ' + Number(runNumber).toFixed(0) + ')');
    var grouprow = datasheet.getLastRow();
    var firstentry = jsonTornData.log[keys[0]].timestamp;
    for (var i = 0; i < keys.length; i++) {
      if (runtime > MAX_RUN_TIME) {
        startNewRestarTrigger();
        console.log('<== [myPastCrimeLog] (max runtime exceeded)');
        return;
      }
      
      setStatus('Parsing entry ' + (i+1) + ' of ' + keys.length);
      updateElapsed();
      lasteventdate = jsonTornData.log[keys[i]].timestamp;
      updateEntryDate(lasteventdate);
      var row = grouprow + 1 + i;
      logCrimeData(jsonTornData.log[keys[i]], row);
      setRowFormulas(row, lasteventdate);

      console.log('Saving last date processed: ', lasteventdate, ' as date: ', theDate(lasteventdate));
      scriptProperties.setProperty('LAST_EVENT_DATE', lasteventdate);
      runtime = new Date() - starttime;
      console.log('runtime: ', runtime);
    }

    setStatus('Parse complete.');
    console.log('Last event date: ', + theDate(lasteventdate));
    console.log('runtime: ' + runtime);

    // Get next chunk of data (log entries) to parse, max 100 at a time.
    // API function call will sometimes return same crimes, repeat until new set with a pause
    var nextentry = firstentry; 
    var retries = 0;
    console.log('Getting next entry for while loop, first entry = ' + theDate(firstentry));
    while (firstentry == nextentry) {
      url = baseURL + "to=" + lasteventdate + "&key=" + APIkey; // Is this inclusive?
      console.log('url: ', url);
      try {
        jsonTornData = queryData(url);  
      } catch(e) {
        if (e.code == 'restart') {
          console.log('Starting trigger: "e.code == `restart`" ~183');
          startNewRestarTrigger();
          return console.log('<== [myPastCrimeLog]');
        }
        console.log('Parse complete. queryData error: ', e);
        setStatus("queryData() failed!");
        throw(e); // Exception will bubble up, show on sheet.
      }

      if (!jsonTornData) { //} || !jsonTornData.log) { // Must be finished!
        console.error('[myPastCrimeLog] jsonTornData unknown error');
        startNewRestarTrigger();
        console.log('<== [myPastCrimeLog] (error)');
        return;
      }

      if (!jsonTornData.log) { // Must be finished!)
        setStatus('');
        setStatusTitle('Success!');
        startPeriodicTrigger("timer_myCurrentCrimeLog", NEW_CRIME_INT);
        console.log('<== [myPastCrimeLog] (complete)');
        return;
        }

      runtime = new Date() - starttime;
      if (runtime > MAX_RUN_TIME) {
        console.log('Starting trigger: "runtime > MAX_RUN_TIME || !jsonTornData"');
        startNewRestarTrigger();
        console.log('<== [myPastCrimeLog] jsonTornData: ' + jsonTornData);
        return;
      }

      keys = Object.keys(jsonTornData.log);
      nextentry = jsonTornData.log[keys[0]].timestamp;
      console.log('Got next entry: ' + theDate(nextentry));
      if (firstentry == nextentry) {
        retries++;
        Utilities.sleep(8000);
      }
    }
    
    //check runtime after each call, ends at 5 minutes
    runtime = new Date() - starttime;
  }

  // If we exceeded our max runtime, set a trigger to fire to restart.
  if (runtime > MAX_RUN_TIME) {
    startNewRestarTrigger();
    console.log('<== [myPastCrimeLog] (max runtime exceeded)');
    return;
  }

  setStatus('');
  setStatusTitle('Success!');
  startPeriodicTrigger("timer_myCurrentCrimeLog", NEW_CRIME_INT);
  console.log('<== [myPastCrimeLog] (complete)');
}

// Helpers to indicate status on the main sheet.
function setStatus(msg) {
  try {
    //console.debug(msg);
    console.log(msg);
    if (statusCell) {
      statusCell.setValue(msg);
    } else {
      statusCell = totalsSheet.getRange('AA15');
      if (statusCell) statusCell.setValue(msg);
    }
  } catch (e) {
    console.error('Exception in [setStatus] (ignored): ' ,e);
  }
}

function setStatusTitle(msg) {
  try {
    //console.debug(msg);
    console.log(msg);
    statusTitleCell.setValue(msg);
    if (statusTitleCell) {
      statusTitleCell.setValue(msg);
    } else {
      statusTitleCell = totalsSheet.getRange('AA14');
      if (statusTitleCell) statusCell.setValue(msg);
    }
  } catch (e) {
    console.error('Exception in [statusTitleCell] (ignored): ' ,e);
  }
}

// Helper to update elapsed time
var displayTimeStart = 0;
function updateElapsed() {
  var now = new Date().getTime();
  if (!displayTimeStart) return (displayTimeStart = now);
  var elapsed = now - displayTimeStart; 
  timeCell.setValue('Elapsed time: ' + millisToMinutesAndSeconds(elapsed));
}

function updateEntryDate(timestamp) {
  dateCell.setValue('Entry: ' + theDate(timestamp));
}

function theDate(timestamp) {
  return new Date(timestamp*1000).toLocaleString();
}

function millisToMinutesAndSeconds(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return (seconds == 60 ? (minutes+1) + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
}

// Helper: log crime data
function logCrimeData(logEntry, row) {
  try {
    var categorynum = logEntry.log;
    if (categorynum == "8842") { // Nerve bar change
      var nervechange = "Nerve has increased from " + logEntry.data.maximum_nerve_before + " to " + 
            logEntry.data.maximum_nerve_after;
      datasheet.getRange("D"+ row ).setValue(nervechange);
    } else { // OC or reguar crimes
      var crime = logEntry.data.crime;
      datasheet.getRange("B"+ row ).setValue(crime);
      
      var result = null;
      if (categorynum == "6791") { // OCs
        result = logEntry.data.result;
      } else { // Regular crimes
        result = logEntry.title;
        logMoneyGains(logEntry, row);
      }
      datasheet.getRange("D"+ row ).setValue(result);
    }
  } catch (e) {
    console.error('[logCrimeData] Error: ', e);
  }
}

// Helper: record money gains
function logMoneyGains(logEntry, row) {
  try {
    //console.debug('[logMoneyGains] ==>');
    console.log('[logMoneyGains] ==>');
    var money_gain = logEntry.data.money_gained;
    var money_lost = logEntry.data.money_lost;
    var item_gain = logEntry.data.item_gained;

    datasheet.getRange("F"+ row ).setValue(money_gain);
    datasheet.getRange("G"+ row ).setValue(money_lost);
    datasheet.getRange("H"+ row ).setValue(item_gain);
    //console.debug('<== [logMoneyGains]');
    console.log('<== [logMoneyGains]');
  } catch (e) {
    console.error('[logMoneyGains] Error: ', e);
  }
}

// Helper - set row formulas
function setRowFormulas(row, time) {
  try {
    //console.debug('[setRowFormulas] ==>');
    console.log('[setRowFormulas] ==>');
    var formulaC = "=if(B"+row +"=\"\",\"\",if(or(D"+row +"=\"failure\",D"+row +
                  "=\"success\"),vlookup(B"+row +",OCs,2,false),vlookup(B"+row +",Crimes,2,false)))";
    var formulaE = "=if(B"+row +"=\"\",\"\", vlookup(D"+row +",Results,2,false))";
    var formulaI = "=if(isblank(H"+row +"),sum(F"+row +",-G"+row +"),vlookup(H"+row +",Items,10,false))";
    var formulaJ = "=if(B"+row +"=\"\",\"\",if(D"+row +"=\"success\",vlookup(B"+row +
                  ",OCs,3,false),vlookup(B"+row +",Crimes,3,false)*ifs(E"+row +
                  "=\"Success\",1,E"+row +"=\"Jail\",-20,True,0)))";

    datasheet.getRange("A"+ row ).setValue(time);
    datasheet.getRange("C" + row).setFormula(formulaC);
    datasheet.getRange("E" + row).setFormula(formulaE);
    datasheet.getRange("I" + row).setFormula(formulaI);
    datasheet.getRange("J" + row).setFormula(formulaJ);
    //console.debug('<== [setRowFormulas]');
    console.log('<== [setRowFormulas]');
  } catch (e) {
    console.error('[setRowFormulas] Error: ', e);
  }
}

// Debug fn: spit out what we know about a trigger.
function logTrigger(trigger) {
  console.log('Trigger ID ', trigger.getUniqueId() + '\n' +
      'Handler: ', trigger.getHandlerFunction());
}

// Helper: create time-driven trigger
function createTimeDrivenTrigger(someFunc, timeSecs) {
  return ScriptApp.newTrigger(someFunc)
      .timeBased()
      .after(timeSecs * 1000) // After timeSecs seconds 
      .create();
}

// Helper: create a periodic (ever timeMins minutes) trigger
function startPeriodicTrigger(someFunc, hours) {
  clearRunningTriggers();
  deleteFunctionTriggers(someFunc);
  var popDate = new Date(Date.now() + (hours * (60 * 60 * 1000)));
  setStatus('Will check for new crimes every hour.');
  //timeCell.setValue(popDate.toLocaleString('en-GB', { timeZone: 'UTC' }) + ' TCT');
  timeCell.setValue('');
  dateCell.setValue('');
  return ScriptApp.newTrigger(someFunc)
      .timeBased()
      .everyHours(hours)
      .create();
}

// Helper: delete any of our triggers. Only deletes past crime log triggers.
function clearRunningTriggers() {
  var result = deleteFunctionTriggers("timer_myPastCrimeLog");
  console.log('Triggers cleared by func name: ' + result + '');
}

// Helper: start a new 'restart' trigger, deleting any existing past crimes ones first.
function startNewRestarTrigger(someFunc, secs) { //(someFunc="timer_myPastCrimeLog", secs=OLD_CRIME_INT) {
  if (!someFunc) someFunc = "timer_myPastCrimeLog";
  if (!secs) secs = OLD_CRIME_INT;
  clearRunningTriggers();
  //var triggerId = createTimeDrivenTrigger(someFunc, secs); 
  scriptProperties.setProperty('RUN_NUMBER', ++runNumber);
  console.log('[startNewRestarTrigger] next run #' + runNumber + ' to start in ' + secs + ' seconds');
  console.log('[startNewRestarTrigger] run function: ' + someFunc);
  setStatus('');
  setStatusTitle('Pausing, will resume soon...');
}

// Delete triggers by handler func name
function deleteFunctionTriggers(funcName) {
  var result = 0;
  var allTriggers = ScriptApp.getProjectTriggers();
  //console.debug('[deleteFunctionTriggers] name: ', funcName, 
  //              ' allTriggers.len: ', allTriggers.length);
  for (var i = 0; i < allTriggers.length; i++) {
    console.log('trigger #' + i + ' > ID: ', allTriggers[i].getUniqueId(), 
                ' Handler: ', allTriggers[i].getHandlerFunction());
    logTrigger(allTriggers[i]);
    if (allTriggers[i].getHandlerFunction() === funcName) {
      console.log('Deleting trigger...');
      ScriptApp.deleteTrigger(allTriggers[i]);
      result++;
    }
  }
  return result;
}

// Helper: get a saved API key or else prompt for one.
function getApiKey() {
  console.log('[getApiKey] ==>');
  var scriptProperties = PropertiesService.getScriptProperties();
  var key = scriptProperties.getProperty("API_KEY");

  if ((key == null) || (key == '')) {
    var ui = SpreadsheetApp.getUi();
    var response = ui.prompt('Enter API Key');

    if (response.getSelectedButton() == ui.Button.OK) {
      key = response.getResponseText();
    scriptProperties.setProperty('API_KEY', key);
    }
  }
  console.log('<== [getApiKey]');
  return key;
}

// Helper: prompt for a new API key
function resetApiKey() {
  //console.debug('[resetApiKey] ==>');
  console.log('[resetApiKey] ==>');
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Enter New API Key');

  if (response.getSelectedButton() == ui.Button.OK) {
    key = response.getResponseText();
    scriptProperties.setProperty('API_KEY', key);
  }
  //console.debug('<== [resetApiKey]');
  console.log('<== [resetApiKey]');
}

// Wraps a call to UrlFetchApp()
function queryData(url) {
  var object = null;
  try {
    //console.debug('[queryData] ==>');
    console.log('[queryData] ==>');
    var jsondata = UrlFetchApp.fetch(url);
    object = jsondata ? JSON.parse(jsondata.getContentText()) : null;
  } catch(e) {
    console.error('<== [queryData] Error: ', e);
    throw({code: 'restart', error: e})
  }

  //console.debug('<== [queryData]');
  console.log('<== [queryData]');
  return object;
}





