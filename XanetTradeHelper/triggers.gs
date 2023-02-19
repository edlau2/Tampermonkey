//
// Public trigger functions:
//
// logTrigger(trigger) - logs a trigger's run func and ID, for trigger ID 'trigger'. Could be expanded
//                       to log a lot more, only used by the 'deleteFunctionTriggers' function.
// createTimeDrivenTrigger(someFunc, timeSecs) - create a trigger to fire once in timeSecs seconds
// createPeriodicTrigger(someFunc, timeMins) - create a trigger to fire periodically, every timeMins minutes
// createDailyTriggerAtHour(someFunc, hour) - create a trigger to run daily at 'hour' hour (1-24).
// deleteFunctionTriggers(funcName) - delete all triggers for funcName function
//
// createNewRestarTrigger(someFunc, secs) - wrapper around createTimeDrivenTrigger that also
// clears the supplied fn first. Rarely, if ever, used.
//
// Note that all creatXXXtrigger() functions delete all existing triggers of the same name first.
//
const DEFAULT_RESTART_TIME = 30;

// Debug fn: spit out what we know about a trigger.
function logTrigger(trigger) {
  console.log('Trigger ID ', trigger.getUniqueId() + '\n' +
      'Handler: ', trigger.getHandlerFunction());
}

// Helper: create time-driven trigger (fires in timeSecs seconds)
function createTimeDrivenTrigger(someFunc, timeSecs) {
  console.log("[createTimeDrivenTrigger] for " + someFunc + " in " + timeSecs + " seconds");
  return ScriptApp.newTrigger(someFunc)
      .timeBased()
      .after(timeSecs * 1000) // After timeSecs seconds 
      .create();
}

// Helper: create a periodic (every timeMins minutes) trigger
function createPeriodicTrigger(someFunc, timeMins) {
  deleteFunctionTriggers(someFunc);
  //var popDate = new Date(Date.now() + (hours * (60 * 60 * 1000)));
  console.log("[startPeriodicTrigger] for " + someFunc + " every " + timeMins + " minutes");
  return ScriptApp.newTrigger(someFunc)
      .timeBased()
      .everyMinutes(timeMins)
      .create();
}

// Helper: create a new 'restart' trigger, deleting any existing past ones first.
// Will cause the supplied function to run in 'secs' seconds.
function createNewRestarTrigger(someFunc, secs) { 
  if (!someFunc) return;
  if (!secs) secs = DEFAULT_RESTART_TIME;
  deleteFunctionTriggers(someFunc);
  console.log('[startNewRestarTrigger] to start in ' + secs + ' seconds');
  console.log('[startNewRestarTrigger] run function: ' + someFunc);
  createTimeDrivenTrigger(someFunc, secs);
}

function createDailyTriggerAtHour(someFunc, hour) {
  deleteFunctionTriggers(someFunc);
  console.log('[createDailyTriggerAtHour], ' + someFunc + ' to start at hour ' + hour + ' daily.');
   ScriptApp.newTrigger(someFunc)
   .timeBased()
   .atHour(hour)
   .everyDays(1)
   .create();
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
