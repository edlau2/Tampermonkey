# Tampermonkey
Repository for TamperMonkey scripts

# Installation

1. Install Tampermonkey.
2. Select a script in this repo that you wish to use. The script is the link ending in .user.js. The .png file is a screenshot showing what the script does.
3. View the file and click the Raw button at the top of the file to view its source.
4. Copy the source.
5. Open Tampermonkey in your browser and click the Add Script tab (icon with a plus symbol).
6. Paste the source into the script window and select file->save.
7. Viola!

# Scripts 

Note that the PNG files are not part of the installation, they are simple screenshots showing what to expect when the script is run. Any bugs or suggestions, feel free to message me on Torn: [xedx [2100735]](https://www.torn.com/profiles.php?XID=2100735#/)

**Torn Latest Attacks Extender**

- [Torn Latest Attacks Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Latest%20Attacks%20Extender.user.js)

Images:

- [Torn Latest Attacks Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Latest%20Attacks%20Extender.png)
- [Torn Latest Attacks Extender 2.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Latest%20Attacks%20Extender%202.png)
- [Torn Latest Attacks Extender 3.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Latest%20Attacks%20Extender%203.png)

This script adds an extended 'latest attacks' screen to your home page. It is configurable and allows you to display up to 100 of the latest attacks, and adds attacking (or attacked) faction name and respect earned. Your API Key is required, as this uses the Torn API so is completely legal. You key is never shared. Before first use, the configuration dialog should appear asking for your key.

**Torn Get Naked**

- [Torn Get Naked.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Get%20Naked.user.js)

Images:

- [Torn Get Naked.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Get%20Naked.png)

This script adds buttons to the Items page: Re-equip, Un-equip, and Reset. Pressing the Un-equip button will un-equip all equipped weapons and armor - Primary, Secondary, Melee, Temporary and Armor. The items that were equipped are saved in local storage, so that when the Re-equip button is pressed, the same items will then be equipped. If you change your choices of weapons and/or armor, pressing the Reset button, while equipped, will erase what is saved so that the next time Un-equip is pressed, the new choices of weaponry and armor will be saved instead of using the old ones. After each action, a results summary dialog is displayed.

Still to be implemented/Known Issues:
  1. Weapon mods are not saved, so those need to be manually re-added upon re-equipping. The currently equipped mods are displayed on the results summary dialog.
  2. ~~If you decide to equip alternate weapons, such as a plastic sword after un-equipping, this is not currently honored automatically, and I haven't yet tested what happens upon re-equipping - there is normally a warning displayed telling you that your DBK will replace your plastic sword, for example.~~ 
  <br>*Added 7/16/2019, version 0.2*
  <br>After un-equipping, if you then equip another weapon, say a plastic sword, when you later re-equip using the script, it will save the plastic sword as an 'alternate' weapon, and will automatically equip that in place of your normal weapon when you next un-equip using the script. This also prevents the warning about your normal weapon replacing whatever you have equipped since the last un-equip.
  3. Only weapons are affected - if you want to equip masks or clothing such as a thong when un-equipping, this isn't supported nor is it planned to be supported, unless enough people ask for it.
  4. The 'collapse' arrow is not working.
  5. The confirmation dialogs (results summary dialogs) displayed after an action could use a 'Do not show this again' checkbox. This will likey require adding JQuery library support, which should also allow for HTML style formatting, such as bold, italics, etc.
  
Note: The ability to restore weapons modes may wind up being a separate script, so you'd still have to go to the mods page, but there would be a new dialog at the top with Save and Restore buttons. So one click would save the current config, and one click to restore that config. The current script *does* display what mods you have in place currently on un-equip, but *does not* yet restore them.

**Torn Numeric Rank Display**

- [Torn Numeric Rank Display.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Numeric%20Rank%20Display.user.js)

Images:

- [Torn Numeric Rank Display.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Numeric%20Rank%20Display.png)

This simple script appends a user's rank number next to the rank in the User Information section of a user's profile. I find it easier than scrolling down to look at the rank that is also displayed in the Medals section. This script also highlights using the MutationObserver object, so that chages are made only when the relevant DOM has been loaded.

**Torn One-Click Daily Dime**

Note: I've removed this for now, as I'm not sure if it breaks the rules or not. The 'rules' link seems to have been removed, and I'm not sure how to check without asking staff, and not sure I want to do that. ~~If anyone knows where the rules regarding scripting can be found, please let me know.~~

Found the rules (https://www.torn.com/forums.php#/p=threads&f=67&t=16037108&b=0&a=0):

"The use of scripts, extensions, applications or any other kind of software is allowed only if it uses data from our API or a page you (or your users) have loaded manually and are currently viewing. They cannot make additional non-API requests to Torn, scrape pages that you're not currently viewing, or attempt to bypass the captcha. If the software you're using makes non-API requests that are not manually triggered by you, it is not allowed and can be tracked."

So it does *not* sound like this script breaks the rules, as you have to be on the page to press the button that presses the button; it happens so fast you could not possibly leave the page before it completes. If anyone disagrees let me know, I'll wait a bit before re-enabling the link below.

- [Torn One-Click Daily Dime.user.js]<!--(https://github.com/edlau2/Tampermonkey/blob/master/Torn%20One%2dClick%20Daily%20Dime.user.js)-->

Images:

- [Torn One-Click Daily Dime.png](Coming Soon - when I have more tokens)

This script lets you click the Daily Dime 'buy' button with one click - up to the number of casino tokens you have available. I am using it to get the 'Win a lottery' merit (Lucky Break), you can easily bet 75 times, refill, and bet 75 more times quickly. Or, as many tokens as you may have. 

**Torn User List Extender**

- [Torn User List Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20User%20List%20Extender.user.js)

Images:

- [Torn User List Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20User%20List%20Extender.png)

This script adds rank next to the level in the User List, as seen when searching for users. The goal was to make it easier to more quickly decide what targets for an attack, without having to inspect the user individually. It helps to quickly determine who may be level holding. Of course, you may want to still look at things such as Xanax or SE's used, that is up to you.

**Torn Jail Scores**

- [Torn Jail Scores.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Jail%20Scores.user.js)

Images:

- [Torn Jail Scores.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Jail%20Scores.png)

This script adds the "score" of a user in jail, which is used to determine the difficulty (or your chance of success) of busting that user out of jail. The score is displayed as a number in parenthesis beneath the user's level. Some information, mostly speculative, can be found in this guide: https://www.tornstats.com/guides.php?id=22


**Torn War Wall List Extender**

- [Torn War Wall List Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20War%20Wall%20List%20Extender.user.js)

Images:

- [Torn War Wall List Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20War%20Wall%20List%20Extender.png)

*** Beta, just be aware that if it causes issues, you can disable from the Tampermonkey dashboard ***
Similar to the above script, this extends the user list on the territory wall page(s) when your faction is in a war. It appends the numeric rank next to the level of all people on the wall. There is a glitch in that when a wall page is opened the first time, sometimes a refresh is required for the script to execute properly. Also, this script has a tendency to perform too many requests to the Torn api - there is a limit on requests (100 per minute), the result of which is that only the level may be displayed for certain users (new users getting on the wall) if there is heavy wall activity, or possible a '?' for rank. If multiple things are running that query the Torn API, and the faction has 100 members (or more) and the wall is full, this will most definitely be hit (as mentioned above, heavy wall activity may also affect this). This clears itself up in time. Note that internal caching is done to help alleviate this, if a user's ID has already been mapped to a rank, a new request to the Torn API is not generated. A deferred request queue is in the process of being implemented to solve this.

**Torn War Other Fac Extender**

- [Torn War Other Fac Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20War%20Other%20Fac%20Extender.user.js)

Images:

- [Torn War Other Fac Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20War%20Other%20Fac%20Extender.png)

*** alpha - don't use yet ***
Similar to the above script, this extends the user list of another faction, typically used during war. It appends the numeric rank next to the level of all fac members on their faction page. This script has a tendency to perform too many requests to the Torn api - there is a limit (100) on requests per minute, the result of which is that only the level may be displayed for certain users, and a '?' for rank. Or no rank info at all. If multiple things are running that query the Torn API, and the faction has 100 members (or more) this will most definitely be hit. This clears itself up in time. Note that internal caching is done to help alleviate this, if a user's ID has already been mapped to a rank, a new request to the Torn API is not generated. A deferred request queue is in the process of being implemented to solve this.

# 3rd Party Scripts

These scripts aren't mine, just here for easy access by fac mates. The links link to the respective author's repos, either GitHub, OpenUserJS, or GreasyFork.

- [TORN_HighLow_Helper.user.js](https://openuserjs.org/meta/DeKleineKobini/TORN_HighLow_Helper.user.js)

Helper to assist in getting the Hi/Lo merit. Simply picks the best choice via odds, worked for me, but not infallable. Took me about 20 minutes and maybe 100 or 120 tokens. Makes it a lot easier, though. Just click click click your way through it. Written by DeKleineKobini [2114440]

<!--(https://github.com/edlau2/Tampermonkey/blob/master/Dibs.user.js)-->
- [Dibs.user.js](https://greasyfork.org/nb/scripts/371859-dibs)

Allows you to claim 'dibs' on wall targets during territory wars/chaining. Basically, if all parties have the script installed, the first person to attack a target will have claimed 'dibs' on it, preventing others (who are using the script as well) from attacking - this prevents unwanted assists and wasted energy. Written by sullengenie [1946152]

- [Stock Block Price.user.js](https://github.com/Nepherius/userscrips/raw/master/stock_block_price.user.js)

Displays the cost of a BB of stock on the Stock Exchange page, beneath the share price. Useful to quickly see the price of a BB without having to 'fake' buying it or use a calculator. Written by nepherius [2009878]
