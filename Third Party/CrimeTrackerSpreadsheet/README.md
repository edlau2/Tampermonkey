## Crime Tracker Spreadsheet

THere are two versions here - the standard version, code.gs, that runsusing the ES6 runtime (V8 runtime). 
Some people have issues with triggers being mysteriously cancelled using this vesion, Google has seen this
as a known issue.

Reference: [https://issuetracker.google.com/issues/15075661](https://issuetracker.google.com/issues/150756612?pli=1)

So, there is also a DEPRECATED_ES5 version to run in situations where this ocurrs - a trigger is created
but marked as 'disabled, unknown reason' It is in the DEPRECATED_ES5 folder. It also requires the accompanying
mainfest file.
