/*************************************************************************************/
/*
/* Torn Loot Level Notifier
/* Version 1.2, 08/05/2019
/* xedx [2100735]
/*
/* This Chrome extension display notifications when Torn NPC's go through a status
/* change. THis is configurable via an Options menu.
/* 
/* You can be notified when in hospital, which displays the time when they are getting
/* out of hospital. You can display when at any Loot Level, I, II, III, IV, or IV. This
/* will also display either the time when at the next level, the time until the next
/* level, or the time (relative) until the next level or until level IV.
/*
/* Presently, the status is checked every minute. THe duration that the notification 
/* is displayed for is configurable, but can be closed at any time. There is also a
/* button provided to jump to the attack page immediately from the notification.
/* 
/* Please direct any issues (bugs), suggestions, requests, etc. to me via a message
/* or PM in Torn - xedx [2100735].
/*
/* Repository link: https://github.com/edlau2/Tampermonkey#extensions
/*
/*************************************************************************************/

/*************************************************************************************/
/*
/* Startup: Create our 1-minute alarm to fire off our API call and notifications
/*
/*************************************************************************************/

chrome.alarms.create(
  "xedx-loot-level", 
  {
    delayInMinutes: 1,
    periodInMinutes: 1
  }
);

chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === "xedx-loot-level") {
    onAlarm();
  }
});

/*
// TEST handler, use to implement asyn ImportJSON()
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "Message from a content script:" + sender.tab.url :
                "Message from the extension");
    if (validPointer(request)) {
      if (request.greeting == "hello") {
        sendResponse({farewell: "goodbye"});
      }
    }
  });

// Test 2
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  chrome.tabs.sendMessage(tabs[0].id, {greeting: "hello"}, function(response) {
    if (validPointer(response)) {
      console.log(response.farewell);
    }
  });
});

function testFunc() {
  console.log("Test Function Called");
}

chrome.runtime.onConnect.addListener(function(port) {
  console.log("addListener" + msg);
  port.onMessage.addListener(function(msg) {
    // Handle message however you want
    console.log("Message Received" + msg);
  })
});
*/

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => sendResponse('pong'));

// Launch right away, don't wait for first call This is mostly for debugging.
// Makes finding syntactical errors quicker. This call also ensures that the
// user has entered their API key.
console.log(current_time() + ": Starting Loot Level Notifier extension!");
onAlarm();



/*************************************************************************************/
/*
/* Global variables used throughout the program
/*
/************************************************************************************/

// Time put in hosp and time left until out
var dukeInHosp = null;
var leslieInHosp = null;
var dukeOutOfHosp = null;
var leslieOutOfHosp = null;

// Times we hit certain levels. Used if we miss hosp time.
var dukeHitLvl1 = null;
var dukeHitLvl2 = null;
var dukeHitLvl3 = null;
var dukeHitLvl4 = null;
var dukeHitLvl5 = null;

var leslieHitLvl1 = null;
var leslieHitLvl2 = null;
var leslieHitLvl3 = null;
var leslieHitLvl4 = null;
var leslieHitLvl5 = null;

var haveAttacked = [{'Duke':   false, 
                     'Leslie': false}];

// THe NPC's we are interested in
var userIDs = 
    [{name: 'Duke',        ID: '4',  statusCell: 'C2', lvlCell: 'D2', lifeStr: '', enabled: true}, 
     {name: 'Leslie',      ID: '15', statusCell: 'C3', lvlCell: 'D3', lifeStr: '', enabled: true},
     {name: 'Scrooge',     ID: '10', statusCell: 'C4', lvlCell: 'D4', lifeStr: '', enabled: true}];

// Just quick shortcuts to user ID's
var idDuke = 4;
var idLeslie = 15;
var idScrooge = 10;

// Mis options configured via the Options HTML and associated .js
// Note that we don't actually have to declare here, as long as we
// create in the loadOptions function, they wil be added automatically.
// I do this for clarity.
var options = 
  {
  'apiKey': "",
  'notifyHosp': true,
  'notifyLvlI': true,
  'notifyLvlII': true,
  'notifyLvlIII': true,
  'notifyLvlIV': true,
  'notifyLvlV': true,
  'notifyTimeout': 10, // In seconds
  'frequency': 1, // minutes, unused
  'nextLevel': true,
  'atLevelIV': false,
  'untilLevelIV': false,
  'autoAttack': false
  };

var timing =
  { 
  'duke':
       {'id': "4",
	'name': "duke",
        'hospout': "",
        'update': "",
	'status': "",
	'timings':
		{'one': {'ts': "", 'due': "", 'pro': ""},
		'two':{'ts': "", 'due': "", 'pro': ""},
		'three':{'ts': "", 'due': "", 'pro': ""},
		'four':{'ts': "", 'due': "", 'pro': ""},
		'five':{'ts': "", 'due': "", 'pro': ""},
		},
	 'levels': {'current': "", 'next': ""}
	},

  'leslie':
       {'id': "15",
	'name': "leslie",
        'hospout': "",
        'update': "",
	'status': "",
	'timings':
		{'one': {'ts': "", 'due': "", 'pro': ""},
		'two':{'ts': "", 'due': "", 'pro': ""},
		'three':{'ts': "", 'due': "", 'pro': ""},
		'four':{'ts': "", 'due': "", 'pro': ""},
		'five':{'ts': "", 'due': "", 'pro': ""},
		},
 	'levels': {'current': "", 'next': ""}
	},

'scrooge':
       {'id': "10",
	'name': "scrooge",
        'hospout': "",
        'update': "",
	'status': "",
	'timings':
		{'one': {'ts': "", 'due': "", 'pro': ""},
		'two':{'ts': "", 'due': "", 'pro': ""},
		'three':{'ts': "", 'due': "", 'pro': ""},
		'four':{'ts': "", 'due': "", 'pro': ""},
		'five':{'ts': "", 'due': "", 'pro': ""},
		},
 	'levels': {'current': "", 'next': ""}
	}
  }
  
/*************************************************************************************/
/*
/* Utility functions
/*
/************************************************************************************/

// Check a ptr for undefined/null
function validPointer(val, dbg = false) {
  if (val == 'undefined' || typeof val == 'undefined' || val == null) {
    if (dbg) {
      // debugger; // Is this supported in extensions?
    }
      return false;
    }
        
    return true;
} 

// Return current time string
function current_time() {
 return new Date().toLocaleTimeString(); 
}

// Take a possible string, convert to an INT, set to zero if empty string
function strToNum(num) {
  var ret = 0;
  if (num == "" || parseInt(num) == 'NaN') {
    return 0;
  }

  return parseInt(num);
}

// Left-pad a number with zeros, up to size, defaults to 2
Number.prototype.pad = function(size) {
    var s = String(this);
    while (s.length < (size || 2)) {s = "0" + s;}
    return s;
}

// Take hrs, mins, secs and return as HH:MM:SS
function toHhMmSs(hrs, mins, secs) {
  hrs = strToNum(hrs).pad();
  mins = strToNum(mins).pad();
  secs = strToNum(secs).pad();

 return hrs + ":" + mins + ":" + secs;
}

//Determine if an object is numeric
var isNumeric = function(obj) {
  return !Array.isArray( obj ) && (obj - parseFloat( obj ) + 1) >= 0;
}

// Convert seconds to HH:MM:SS
function secsToTime(duration) {
    var seconds = parseInt(duration);
    var minutes = Math.floor((duration / 60) % 60);
    var hours = Math.floor((duration / 3600) % 24);

  // Padding...
  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  if (hours < 0 || minutes < 0 || seconds < 0) {
    console.log(current_time() + ": uh-oh! " + toHhMmSs(hours, minutes, seconds)); // Break here...
  }

  return hours + ":" + minutes + ":" + seconds; // + "." + milliseconds;
}

// Convert milliseconds to HH:MM:SS
function msToTime(duration) {
  var milliseconds = parseInt((duration % 1000) / 100),
    seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  // Padding...
  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  if (hours < 0 || minutes < 0 || seconds < 0) {
    console.log(current_time() + ": uh-oh! " + toHhMmSs(hours, minutes, seconds)); // Break here...
  }

  return hours + ":" + minutes + ":" + seconds; // + "." + milliseconds;
}

// Subtract two dates, return as HH:MM:SS
// date2 - date2
function dateDifference(date1, date2) {
  var futureDate = date2.getTime();
  var pastDate = date1.getTime();
  var diff = futureDate - pastDate;

  return msToTime(diff);
}

function numeToStr(num)
{
  switch (num) {
	case 1:
	case '1':
	  return "one";
	  break;
	case 2:
	case '2':
	  return "two";
	  break;
	case 3:
	case '3':
	  return "three";
	  break;
	case 4:
	case '4':
	  return "four";
	  break;
	case 5:
	case '5':
	  return "five";s
	  break;	
	}	
}

/*************************************************************************************/
/*
/* Torn API query functions
/*
/* Note: At present,these are synchronous XMLHttpRequest calls, in ImportJSON.js
/* Should be converted to async calls with async complete handlers.
/*
/* To implement here, switch to async in ImportJSON, and end the loadOptionsComplete()
/* async handler right after these calls; create a new async handler with the rest 
/* of the code that follows and call it from the handler in ImportJSON.
/*
/************************************************************************************/

// Query the players Profile data
function buildLifeString(userId) {
  var lifeCurr = 0;
  var lifeMax = 0;
  var lifeStr = "";
  var query = "";

  url = "https://api.torn.com/user/" + userId.ID + "?selections=profile&key=" + options.apiKey;
  value = ImportJSON(url, query, "noHeaders,noTruncate");
  if (value != null) {
    lifeCurr = value[0][16];
    lifeMax = value[0][17];

    // Debugging - might not need to query 'basic'
    var dbgLootLvl = value[0][22]; // Same as statusStr? Seems to be
    var dbgMisc = value[0][23];

    lifeStr = lifeCurr + "/" + lifeMax;
  }

  userId.lifeStr = lifeStr;
}

// Query the players Basic data
function queryBasicStats(userId) {
  var ID = userId.ID;
  var query = "";
  var url = "https://api.torn.com/user/" + ID + "?selections=basic&key=" + options.apiKey;
  var value = ImportJSON(url, query, "noHeaders,noTruncate");     

  // We should make from here a 'importJsonComplete()' fn,
  // and call when async XMLHttpRequest completes.
  // eg: function inportJsonComplete(...) { 

  // Check for errors, specifically 'Invalid API key'
  if (!validPointer(value)) {
    return null;
    }

  if (value.length == 1) {
    var errCode = value[0][0];
    var errStr = value[0][1];
    if (isNumeric(errCode)) {
      console.log(current_time() + ": query returned error: code=" + errCode + " error=\'" + errStr + "\'");
    
      if (errCode == 2 || errStr == 'Incorrect key') {
        alert("Invalid API key! Please enter in the Options page.");
        options.apiKey = null;
        validateApiKey();
      }
    return null;
    }
  }

  statusStr = value[0][4];
  if (!validPointer(statusStr)) {
    return null;
    }

  return statusStr;
}

/*************************************************************************************/
/*
/* Validation. This ensures that a valid API key is present, and kicks off
/* the main program right away, before the first 1-minute alarm goes off.
/*
/************************************************************************************/

function validateApiKey() {
  if (options.apiKey === '' || options.apiKey == null) {
    console.log(current_time() + ": Launching options dialog, NULL API key.");
    chrome.runtime.openOptionsPage();
    return false;;
  }

  console.log(current_time() + ": validateApiKey, key present (\'" + options.apiKey + ")\'");
  return true;
}

/*************************************************************************************/
/*
/* Where the work is done This function is called when the alarm gos off. It loads
/* options, which is an async call - it fires of the async complete handler - the
/* loadOptionsComplete function.
/*
/************************************************************************************/

function onAlarm() {
  console.log(current_time() + ": onAlarm");

  // This call is async, so we can't do any real work until it completes.
  loadOptions();
}
 
 // Async complete handler for loadOptions()
function loadOptionsComplete() {
  console.log(current_time() + ": loadOptionsComplete");
  if (!validateApiKey()) {
    return;
  }

  var notificationDetails = {
    type: "basic",
    title: "Loot Level Checker",
    message: "Primary message to display",
    iconUrl: "icon_128.png"
  };
  
  for (var i = 0; i<userIDs.length; i++) {
    // See if our options are configured to display for this NPC
    if (userIDs[i].enabled == false) {
      console.log(current_time() + ": Notifications not enabled for NPC " + 
                  userIDs[i].name);
      continue;
    }

    // Query basic stats to get NPC's status         
    var statusStr = queryBasicStats(userIDs[i]);
    if (!validPointer(statusStr)) {
      //continue;
      return; // 'null' is returned on error, usually indicates invalid key or server error.
    }

    // Parse the status string. Is similar to 'OKAY,Loot Level II'. Just want the loot level.
    var pAt = statusStr.indexOf(',');
    if (validPointer(pAt)) {
	    var temp = statusStr.slice(pAt+1, statusStr.length);
	    statusStr = temp;
    }

    // Do same to get life current/max
    buildLifeString(userIDs[i]);
    var lifeStr = 'Life: ' + userIDs[i].lifeStr;

// NEW! Use the YATA API
// I'm going to try switching this us JQuery ...
    var query = "";
    var url = "https://yata.alwaysdata.net/loot/timings";

    // ImportJSON(), as I am using it, isn't returning an associative array
    // Not sure if it can or not. So, for now, I'm going to try using JQuery.
    //var value = ImportJSON(url, query, "noHeaders,noTruncate");

    var jqxhr = jQuery.post( url, function(value) {
    if (value != null) {
        //var jsonArray = $.parseJSON(str);
        timing = createTimingObject(value);
	    var useObj = timing[userIDs[i].name.toLowerCase()];

	    // Comment out next line to use status from personal stats.
	    if (statusStr.localeCompare("Okay") == 0)
	        statusStr = useObj.status;

	    // Better default
	    notificationDetails.message = lifeStr + '\n(def) Loot lvl IV at ' + new Date(useObj.timings.four.ts).toLocaleTimeString();

        if (statusStr == 'hospitalized') {
            notificationDetails.title = userIDs[i].name + " in hosp: " + msToTime(useObj.timings.one.due * 1000);
	        notificationDetails.message = lifeStr + '\nOut of hosp at ' + msToTime(timing[userIDs[i].name.toLowerCase()].hospout * 1000)
        } else {
	        notificationDetails.title = userIDs[i].name + ' is at ' + statusStr;
	    }
	    
    	    if (options.atLevelIV) {                
        	            notificationDetails.message = lifeStr + '\nLoot lvl IV at ' + new Date(useObj.timings.four.ts).toLocaleTimeString();
    	    } else if (options.nextLevel) {
        		    var nextLvlStr = numToStr(useObj.levels.next);
                    notificationDetails.message = lifeStr + '\nNext level at ' + new Date(useObj.timings[nextLvlStr].ts).toLocaleTimeString();
	    
        	    } else if (options.untilLevelIV) {
        		    notificationDetails.message = lifeStr + '\nLoot lvl IV in ' + 
        		    secsToTime(useObj.timings.four.due);
        		    console.log(userIDs[i].name + " due in " + useObj.timings.four.due + " seconds, or " + msToTime(useObj.timings.four.due * 1000));
        		    console.log("Verifying name: useObj.id = " + useObj.id + " useObj.name = " + useObj.name);
        	    } else {
        	        return;
        	    }
        }
        
        // If configured to auto-attack, launch now if needed
        if (timing[userIDs[i].name.toLowerCase()].status == 'Loot level IV' && options.autoAttack) {
            var key = userIDs[i].name;
            if (!haveAttacked[key]) {
              var url = "https://www.torn.com/loader.php?sid=attack&user2ID=" +
                userIDs[i].ID;
              console.log(current_time() + ": Launching URL: " + url);
              chrome.tabs.create({url: url});
              haveAttacked[key] = true;
          }
        }

        var iconUrlStr = "icon_128.png";
        if (userIDs[i].name == "Duke") {
          iconUrlStr = "https://profileimages.torn.com/50c3ed98-ae8f-311d-4.png";
        } else if (userIDs[i].name == "Leslie") {
          iconUrlStr = "https://profileimages.torn.com/4d661456-746e-b140-15.png";
        } else if (userIDs[i].name == "Scrooge") {
          iconUrlStr = "https://profileimages.torn.com/50bdc916-3fc2-d678-10.png";
        }

        console.log(current_time() + ": Creating notification, Title: " +
                notificationDetails.title + '\nMessage: ' +
                notificationDetails.message);
        chrome.notifications.getPermissionLevel(permissionLevelCallback);
        chrome.notifications.onButtonClicked.addListener(onBtnClickCallback);
        chrome.notifications.onClicked.addListener(onClickCallback);
        //chrome.notifications.onClosed.addListener(onClickCallback);
        chrome.notifications.create(userIDs[i].name, 
                                {type: "basic",
                                 title: notificationDetails.title,
                                 message: notificationDetails.message,
                                 iconUrl: iconUrlStr,
                                 requireInteraction: true,
                                 buttons: [{
                                    title: "Attack"
                                  },
                                  {
                                    title: "Options"
                                  }]
                                },
                                creationCallback);
    })
    .done(function() {    // Don't think I need this handler...
        console.log( ".done handler called." );
    })
    .fail(function() {    // This def needs to be implemented
        console.log( ".fail handler called." );
    })
    .always(function() {    // Don't think I need this handler...
        console.log( ".always handler called." );
    }); // end of the jquery post
  } // end 'for' loop
}

/*************************************************************************************/
/*
/* Misc. callbacks for the notification functions
/*
/************************************************************************************/

function creationCallback(id) {
  if (validPointer(chrome.runtime.lastError)) {
    var text = current_time() + ": Creating notification for " + id + 
               ", lastError = " + chrome.runtime.lastError;
    console.log(current_time() + ": " + text);
  }

  // Automatically close/clear after 10 seconds
  if (options.autoclose) {
    setTimeout(function(){ 
        console.log(current_time() + ": notification timing out (closing), id = " + id);
        chrome.notifications.clear(id);}, 
        options.notifyTimeout*1000);
  }
}

function onBtnClickCallback(id, index) {
  console.log(current_time() + ": notification onClickCallback" +
                               " ID=" + id + " Index=" + index);
  if (index == 0) { // Attack button
    var done = false;
    for (var i = 0; i<userIDs.length && !done; i++) {
      if (userIDs[i].name == id) {
        var url = "https://www.torn.com/loader.php?sid=attack&user2ID=" +
          userIDs[i].ID;
        console.log(current_time() + ": Launching URL: " + url);
        chrome.tabs.create({url: url});
        done = true;
      }
    }
  } else if (index == 1) { // Options button
    console.log(current_time() + ": Launching options dialog.");
    chrome.runtime.openOptionsPage();
  } 
}

function onClickCallback(id, index) {
    chrome.notifications.clear(id);
}

function permissionLevelCallback(level) {
  console.log(current_time() + ": notification permission level = " + level);
}

/*************************************************************************************/
/*
/* Utility function to build the timing object from a returned string
/*
/************************************************************************************/

function createTimingObject(value)
{
  var test0 = value[idDuke]; // Here, '4' is id
  var test1 = value[idDuke].name;
  var test2 = value[idDuke].timings[5].due; // Here, the '5' is level

  // Duke's info
  var useValue = value[idDuke];
  if (validPointer(useValue)) {
     var timings = useValue.timings;
  
     timing.duke.name = useValue.name;
     timing.duke.hospout = useValue.hospout;
     timing.duke.update = useValue.update;
     timing.duke.status = useValue.status;
     timing.duke.timings.one.due = timings[1].due;
     timing.duke.timings.one.ts = timings[1].ts;
     timing.duke.timings.one.pro = timings[1].pro;
     timing.duke.timings.two.due = timings[2].due;
     timing.duke.timings.two.ts = timings[2].ts;
     timing.duke.timings.two.pro = timings[2].pro;  
     timing.duke.timings.three.due = timings[3].due;
     timing.duke.timings.three.ts = timings[3].ts;
     timing.duke.timings.three.pro = timings[3].pro;
     timing.duke.timings.four.due = timings[4].due;
     timing.duke.timings.four.ts = timings[4].ts;
     timing.duke.timings.four.pro = timings[4].pro;
     timing.duke.timings.five.due = timings[5].due;
     timing.duke.timings.five.ts = timings[5].ts;
     timing.duke.timings.five.pro = timings[5].pro;
     timing.duke.levels.current = useValue.levels.current;
     timing.duke.levels.next = useValue.levels.next;
  }

  // Scrooge's info, valid only during Christamas event.
  useValue - value[idScrooge];
  if (validPointer(useValue)) {
     var timings = useValue.timings;
     timing.scrooge.name = useValue.name;
     timing.scrooge.hospout = useValue.hospout;
     timing.scrooge.update = useValue.update;
     timing.scrooge.status = useValue.status;
     timing.scrooge.timings.one.due = timings[1].due;
     timing.scrooge.timings.one.ts = timings[1].ts;
     timing.scrooge.timings.one.pro = timings[1].pro;
     timing.scrooge.timings.two.due = timings[2].due;
     timing.scrooge.timings.two.ts = timings[2].ts;
     timing.scrooge.timings.two.pro = timings[2].pro;  
     timing.scrooge.timings.three.due = timings[3].due;
     timing.scrooge.timings.three.ts = timings[3].ts;
     timing.scrooge.timings.three.pro = timings[3].pro;
     timing.scrooge.timings.four.due = timings[4].due;
     timing.scrooge.timings.four.ts = timings[4].ts;
     timing.scrooge.timings.four.pro = timings[4].pro;
     timing.scrooge.timings.five.due = timings[5].due;
     timing.scrooge.timings.five.ts = timings[5].ts;
     timing.scrooge.timings.five.pro = timings[5].pro;
     timing.scrooge.levels.current = useValue.levels.current;
     timing.scrooge.levels.next = useValue.levels.next;
  }
  // Leslie's info
  useValue = value[idLeslie];

  if (validPointer(useValue)) {  
    timings = useValue.timings;
    timing.leslie.name = useValue.name;
    timing.leslie.hospout = useValue.hospout;
    timing.leslie.update = useValue.update;
    timing.leslie.status = useValue.status;
    timing.leslie.timings.one.due = timings[1].due;
    timing.leslie.timings.one.ts = timings[1].ts;
    timing.leslie.timings.one.pro = timings[1].pro;
    timing.leslie.timings.two.due = timings[2].due;
    timing.leslie.timings.two.ts = timings[2].ts;
    timing.leslie.timings.two.pro = timings[2].pro;  
    timing.leslie.timings.three.due = timings[3].due;
    timing.leslie.timings.three.ts = timings[3].ts;
    timing.leslie.timings.three.pro = timings[3].pro;
    timing.leslie.timings.four.due = timings[4].due;
    timing.leslie.timings.four.ts = timings[4].ts;
    timing.leslie.timings.four.pro = timings[4].pro;
    timing.leslie.timings.five.due = timings[5].due;
    timing.leslie.timings.five.ts = timings[5].ts;
    timing.leslie.timings.five.pro = timings[5].pro;
    timing.leslie.levels.current = useValue.levels.current;
    timing.leslie.levels.next = useValue.levels.next;
  }

  console.log('Got timing objects, created at ' + new Date(timing.duke.update).toLocaleString());

  return timing;
}

function loadOptions() {
  chrome.storage.sync.get({
      apiKey: null,
      Duke: true,
      Leslie: true,
      Scrooge: true,	
      levelI: true,
      levelII: true,
      levelIII: true,
      levelIV: true,
      levelV: true,
      hosp: true,
      notifyTimeout: 10,
      nextLevel: true,
      atLevelIV: false,
      untilLevelIV: false,
      autoAttack: false,
      autoclose: true
  }, 
  function(items) { // null = all items
    for (var i = 0; i<userIDs.length; i++) {
      switch (userIDs[i].name) {
         case "Duke":
           userIDs[i].enabled = items.Duke;
           break;
         case "Leslie":
           userIDs[i].enabled = items.Leslie;
           break;
         case "Scrooge":
           userIDs[i].enabled = items.Scrooge;
           break;
      }

    options.apiKey = items.apiKey;
    options.notifyHosp = items.hosp;
    options.notifyLvlI = items.levelI;
    options.notifyLvlII = items.levelII;
    options.notifyLvlIII = items.levelIII;
    options.notifyLvlIV = items.levelIV;
    options.notifyLvlV = items.levelV;
    options.notifyTimeout = items.notifyTimeout;
    options.nextLevel = items.nextLevel;
    options.atLevelIV = items.atLevelIV;
    options.untilLevelIV = items.untilLevelIV;
    options.autoAttack = items.autoAttack;
    options.autoclose = items.autoclose;
    }

  // Now we can do the real stuff.
  loadOptionsComplete();
  });
}

