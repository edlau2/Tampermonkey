// Global constants
const APIkey = getApiKey();
const baseURL = "https://api.torn.com/user/?comment=MyCrimesLog&selections=log&log=5700,5705,5710,5715,5720,5725,5730,5735,6791,8842&";

const timestampURL = "https://api.torn.com/torn/?comment=MyCrimesLog&selections=timestamp&key=" + APIkey;
const datasheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Log");
const totalsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Totals");
const statusTitleCell = totalsSheet.getRange('AA14');
const statusCell = totalsSheet.getRange('AA15');
const debug = true;

// If debug is enabled, 'console.debug(...)' will spit out stuff to the execution log.
// Otherwise, it won't. Supports full object expansion. For example,
// let obj = {me: 'ed', value: 25, something: {a: 3, b: 4}};
// console.debug('Obj = ', obj); 
// will output: 'Obj =  { me: 'ed', value: 25, something: { a: 3, b: 4 } }'
// without having to stringify first.
if (!debug) {console.debug = function(){};}
else {console.debug = function(...x){console.log(...x)};}

// Get current crime data
function myCurrentCrimeLog() {
  console.log('[myCurrentCrimeLog] ==>');
  setStatusTitle('Getting current crime data...')
  let jsonTornData = queryData(baseURL + "key=" + APIkey);
  let keys = Object.keys(jsonTornData.log);
  let lastlog = datasheet.getRange("A7").getValue();

  setStatusTitle('Parsing current log data...');
  for (let i = 0; i < keys.length; i++) {
    setStatus('Parsing entry ' + (i+1) + ' of ' + keys.length);
    let row = 7 + i;
    let categorynum = jsonTornData.log[keys[i]].log;
    let time = jsonTornData.log[keys[i]].timestamp;
    
    if (time > lastlog) {
      datasheet.insertRowAfter(row-1);
      setRowFormulas(row, time);
    
      //nerve bar change
      if (categorynum == "8842") {
        var nervechange = "Nerve has increased from " + jsonTornData.log[keys[i]].data.maximum_nerve_before + " to " + jsonTornData.log[keys[i]].data.maximum_nerve_after;
        datasheet.getRange("D"+ row ).setValue(nervechange);
      }
      else {
        var crime = jsonTornData.log[keys[i]].data.crime;
        datasheet.getRange("B"+ row ).setValue(crime);
        
        //OCs
        if (categorynum == "6791") {
          var result = jsonTornData.log[keys[i]].data.result;
        } 
        
        //crimes
        else {
          var result = jsonTornData.log[keys[i]].title;
          logMoneyGains(jsonTornData.log[keys[i]], row);
        }
        datasheet.getRange("D"+ row ).setValue(result);
      }
    }
  }
  setStatus('');
  setStatusTitle('Success!');
  console.log('<== [myCurrentCrimeLog]');
}

// Get past crime data
function myPastCrimeLog() {
  console.log('[myPastCrimeLog] ==>');
  let starttime = new Date();
  let runtime = 0;
  let lastrow = datasheet.getLastRow();
  
  //if log is empty, start with today's timestamp, else look for the earliest timestamp
  if (lastrow == 6) {
    let jsonTornData = queryData(timestampURL);
    var lasteventdate = jsonTornData.timestamp[0];
  } else {
    var lastgoodrow = lastrow - 1;
    var lasteventdate = datasheet.getRange("A" + lastgoodrow).getValue();
    datasheet.deleteRow(lastrow);
  }

  setStatusTitle('Getting past log data...');
  let jsonTornData = queryData(baseURL + "to=" + lasteventdate + "&key=" + APIkey);
  let keys = Object.keys(jsonTornData.log);

  Logger.log(jsonTornData.log[keys[0]].timestamp);

  //iterate until no more results 
  let time = 0;
  let counter = 1;
  while (keys.length > 0 && runtime < 275000) {
    setStatusTitle('Parsing past log data (pass ' + (counter++) + ')');
    let grouprow = datasheet.getLastRow();
    let firstentry = jsonTornData.log[keys[0]].timestamp;
    for (let i = 0; i < keys.length; i++) {
      setStatus('Parsing entry ' + (i+1) + ' of ' + keys.length);
      time = jsonTornData.log[keys[i]].timestamp;
      //console.log(jsonTornData.log[keys[i]]);

      let row = grouprow + 1 + i;
      let categorynum = jsonTornData.log[keys[i]].log;
      setRowFormulas(row, time);
      
      //nervebar change
      if (categorynum == "8842") {
        let nervechange = "Nerve has increased from " + jsonTornData.log[keys[i]].data.maximum_nerve_before + " to " + jsonTornData.log[keys[i]].data.maximum_nerve_after;
        datasheet.getRange("D"+ row ).setValue(nervechange);
      }
      else {
        let crime = jsonTornData.log[keys[i]].data.crime;
        datasheet.getRange("B"+ row ).setValue(crime);
        
        //OCs
        if (categorynum == "6791") {
          var result = jsonTornData.log[keys[i]].data.result;
        } 
        //Crimes
        else {
          var result = jsonTornData.log[keys[i]].title;
          logMoneyGains(jsonTornData.log[keys[i]], row);
        }
        datasheet.getRange("D"+ row ).setValue(result);
      }
    }

    setStatus('Parse complete.');
    //record last timestamp from previous API call before making next call
    if (time) lasteventdate = time;

    //API function call will sometimes return same crimes, repeat until new set with a pause
    let nextentry = firstentry;
    while (firstentry == nextentry) {
      url = baseURL + "to=" + lasteventdate + "&key=" + APIkey;
      Logger.log(url);
      jsonTornData = queryData(url);    
      try {
        keys = Object.keys(jsonTornData.log);
        nextentry = jsonTornData.log[keys[0]].timestamp;
      } catch (error) {
        Logger.log(error);
      }
      Logger.log(firstentry, " = ", nextentry);
      if (firstentry == nextentry) {
        Utilities.sleep(8000);
      }
    }
    //check runtime after each call, ends at 5 minutes
    runtime = new Date() - starttime;
  }
  setStatus('');
  setStatusTitle('Success!');
  console.log('<== [myPastCrimeLog]');
}

// Helpers to indicate status on the main sheet.
function setStatus(msg) {
  console.debug(msg);
  statusCell.setValue(msg);
  }

function setStatusTitle(msg) {
  console.debug(msg);
  statusTitleCell.setValue(msg);
  }

// Helper: record money gains
function logMoneyGains(logEntry, row) {
  console.debug('[logMoneyGains] ==>');
  let money_gain = logEntry.data.money_gained;
  let money_lost = logEntry.data.money_lost;
  let item_gain = logEntry.data.item_gained;

  datasheet.getRange("F"+ row ).setValue(money_gain);
  datasheet.getRange("G"+ row ).setValue(money_lost);
  datasheet.getRange("H"+ row ).setValue(item_gain);
  console.debug('<== [logMoneyGains]');
}

// Helper - set row formulas
function setRowFormulas(row, time) {
  console.debug('[setRowFormulas] ==>');
  let formulaC = "=if(B"+row +"=\"\",\"\",if(or(D"+row +"=\"failure\",D"+row +"=\"success\"),vlookup(B"+row +",OCs,2,false),vlookup(B"+row +",Crimes,2,false)))";
  let formulaE = "=if(B"+row +"=\"\",\"\", vlookup(D"+row +",Results,2,false))";
  let formulaI = "=if(isblank(H"+row +"),sum(F"+row +",-G"+row +"),vlookup(H"+row +",Items,10,false))";
  let formulaJ = "=if(B"+row +"=\"\",\"\",if(D"+row +"=\"success\",vlookup(B"+row +",OCs,3,false),vlookup(B"+row +",Crimes,3,false)*ifs(E"+row +"=\"Success\",1,E"+row +"=\"Jail\",-20,True,0)))";

  datasheet.getRange("A"+ row ).setValue(time);
  datasheet.getRange("C" + row).setFormula(formulaC);
  datasheet.getRange("E" + row).setFormula(formulaE);
  datasheet.getRange("I" + row).setFormula(formulaI);
  datasheet.getRange("J" + row).setFormula(formulaJ);
  console.debug('<== [setRowFormulas]');
}

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

function resetApiKey() {
  console.debug('[resetApiKey] ==>');
  var scriptProperties = PropertiesService.getScriptProperties();
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt('Enter New API Key');

  if (response.getSelectedButton() == ui.Button.OK) {
    key = response.getResponseText();
    scriptProperties.setProperty('API_KEY', key);
  }
  console.debug('<== [resetApiKey]');
}

function queryData(url) {
  console.debug('[queryData] ==>');
  var object = null;
  var jsondata = null;
  try {
    jsondata = UrlFetchApp.fetch(url);
  } catch(e) {
    setStatus("UrlFetchApp failed!");
    console.error('Error: ', e);
    Logger.log("UrlFetchApp failed");
  }

  // This line fails sometimes. Need to catch the exception. Not sure why it fails...
  try {
    object = JSON.parse(jsondata.getContentText());
  } catch(error) {
    setStatus("UrlFetchApp failed!");
    console.error('Error: ', error);
    Logger.log("JSON.parse failed");
    console.log('<== [queryData] Error.');
    return null;
  }
  console.debug('<== [queryData]');
  return object;
}
