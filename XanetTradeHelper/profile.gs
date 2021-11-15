/*** Really Really cool helper to provide a call stack for logging
 * 
 * identify the call stack
 * @param {Number} level level of call stack to report at (1 = the caller, 
 * 2 the callers caller etc..., 0 .. the whole stack (NOT TRUE!)
 * @return {object || array.object} location info - eg {caller:function,line:string,file:string};
 * 
 * Just call as 'wherAmI()' - gets (logs) real location of call, and previous call.
 * Only logs if > 20 ms.
 */
let lastDecomp = null;
function whereAmI(level) {
  // by default this is 1 (meaning identify the line number that called this function) 
  // 2 would mean call the function 1 higher etc.
  level = typeof level === 'undefined' ? 3 : Math.abs(level);
  try {
    // throw a fake error
    //x is undefined and will fail under use struct- ths will provoke an error so i can get the call stack
    var __y__ = __X_;  
  }
  catch (err) {
    // return the error object so we know where we are
    var stack = err.stack.split('\n');
    if (!level) {
      // return an array of the entire stack
      return stack.slice(0,stack.length-1).map (function(d) {
        return deComposeMatch(d);
      });
    }
    else {
      // return the requested stack level
      let decomp = deComposeMatch(stack[Math.min(level,stack.length-1)]);
      let result = {lastDecomp, decomp};
      lastDecomp = decomp;
      return result;
    }
  }
  
  // This doesn't work correctly...
  function deComposeMatch (where) {
    
    var file = /at\s(.*):/.exec(where);
    var line =/:(\d*)/.exec(where);
    var caller =/:.*\((.*)\)/.exec(where);

    return {file: file ? file[1] : 'unknown'};

    //return {caller:caller ? caller[1] :  'unknown' ,line: line ? line[1] : 
    //'unknown',file: file ? file[1] : 'unknown'};

  }
}

// Function to aid in profiling: will log elapsed time since last call
// as well as the line/function where called
var lastTime = 0;
function profile() {
  if (!opts.opt_profile) return;
  let now = new Date().getTime();
  let diff = lastTime ? (now - lastTime) : 0;
  lastTime = now;

  let where = whereAmI();

  // Quick filter: don't log if < 20 ms
  if (diff < 20) {return;}

  Logger.log('Elapsed time: ' + diff + ' ms ==>\n' + JSON.stringify(where.lastDecomp) +
  '\n' + JSON.stringify(where.decomp));
}