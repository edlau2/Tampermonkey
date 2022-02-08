## Helper Libraries

These libraries are ones I use for commonly used tasks in all my scripts.
To use, include in your script header like this:

// @require      https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js

#### Libraries I use:

- [Torn-JS-helpers.js](https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/Torn-JS-Helpers.js)
- [tinysort.js](https://raw.githubusercontent.com/edlau2/Tampermonkey/master/helpers/tinysort.js)

#### Template I use for new scripts, is saved in the Tampermoney dashboard:

- [Torn Tampermonkey Template.user.js](	https://github.com/edlau2/Tampermonkey/raw/master/helpers/Torn%20Tampermonkey%20Template.user.js)

This is inserted into the Tampermonkey Dashboard, Setting, New userscript template: ECMAScript 5

#### Other libraries: 

Torn-Hints-Helper.js (used only to display 'hints' on certain pages), not generic and used by a few of my scripts.<br>
DeKleineKobini-DKK_Utilities.js: Written by DeKleineKobini, not used, here for reference.

#### Public variables exported by Torn-JS-helpers.js:

api_key<br>
silentUpdates<br>
debugLoggingEnabled<br>
loggingEnabled<br>
date_formats<br>
months<br>
days<br>
CRLF<br>
TAB<br>
separator<br>

#### Functions exported by Torn-JS-helpers.js:

validateApiKey()<br>
getApiKey()<br>
queryUserId(callback)<br>
logScriptStart()<br>
sleep(ms)<br>
callOnContentLoaded(callback)<br>
versionCheck()<br>
log(...data)<br>
debug(...data)<br>
beep(duration, frequency, volume, type, callback)<br>
dateConverter(dateobj, format)<br>
isaNumber(x)<br>
asCurrency(num)<br>
timenow()<br>
numberWithCommas(x)<br>
validPointer(val, dbg = false)<br>
String.prototype.hashCode()<br>
xidFromProfileURL(URL)<br>
useridFromProfileURL(URL)<br>
numericRankFromFullRank(fullRank)<br>
addToolTipStyle()<br>
displayToolTip(node, text)<br>
xedx_TornUserQuery(ID, selection, callback, param=null)<br>
xedx_TornPropertyQuery(ID, selection, callback, param=null)<br>
xedx_TornFactionQuery(ID, selection, callback, param=null)<br>
xedx_TornCompanyQuery(ID, selection, callback, param=null)<br>
xedx_TornMarketQuery(ID, selection, callback, param=null)<br>
xedx_TornTornQuery(ID, selection, callback, param=null)<br>
xedx_TornGenericQuery(section, ID, selection, callback, param=null)<br>
xedx_TornStatsSpy(ID, callback, param=null)<br>
currentCountry()<br>
awayFromHome()<br>
abroad()<br>
travelling()<br>
darkMode()<br>
handleError(responseText)<br>
handleSysError(response, addlText=null)<br>
SmartPhone.isAny()<br>
SmartPhone.getUserAgent()<br>
SmartPhone.setUserAgent()<br>
SmartPhone.isAndroid()<br>
SmartPhone.isBlackBerry()<br>
SmartPhone.isBlackBerryPlayBook()<br>
SmartPhone.isBlackBerry10()<br>
SmartPhone.isIOS()<br>
SmartPhone.isIPhone()<br>
SmartPhone.isIPad()<br>
SmartPhone.isIPod()<br>
SmartPhone.isOpera()<br>
SmartPhone.isWindows()<br>
SmartPhone.isWindowsMobile()<br>
SmartPhone.isWindowsDesktop()<br>
SmartPhone.isFireFox()<br>
SmartPhone.isNexus()<br>
SmartPhone.isKindleFire()<br>
SmartPhone.isPalm()<br>







