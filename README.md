# Torn Utilities
Repository for Torn-related scripts, extensions, and more.

# Installation

1. Install Tampermonkey
 [(Tampermonkey link)](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en)
2. Select a script in this repo that you wish to use. The script is the link ending in .user.js. The .png file is a screenshot showing what the script does.
3. View the file and click the Raw button at the top of the file to view its source.
4. Copy the source.
5. Open Tampermonkey in your browser and click the Add Script tab (icon with a plus symbol).
6. Paste the source into the script window and select file->save.
7. Viola!

There are other ways, or I could upload to OpenUserJS or GreasyFork, but I'm lazy and don't want to take the time, even though I have accounts there.

The majority of the third-party scripts are usually self-installing (just press an "install" button). They are usually hosted at either OpenUserJS or GreasyFork.

# Scripting Rules

The rules for scripting, from the "Tools and Userscripts" forum (https://www.torn.com/forums.php#/p=threads&f=67&t=16037108&b=0&a=0), are as follows:

"The use of scripts, extensions, applications or any other kind of software is allowed only if it uses data from our API or a page you (or your users) have loaded manually and are currently viewing. They cannot make additional non-API requests to Torn, scrape pages that you're not currently viewing, or attempt to bypass the captcha. If the software you're using makes non-API requests that are not manually triggered by you, it is not allowed and can be tracked.

Assuming this rule is followed, go wild!"

This is somewhat vague, so I consulted with Bogie on some of the scripts I was unsure of. For instance, here is a snippet of our conversation regarding the 'Torn Get Naked' script:

<details>
  <summary>Click to see conversation...</summary>
  
xedx: If I have a script that loads only when a user visits the page the script runs on, can the script use the Javascript         click() function to click more than one button/link in succession? In particular, I 'get naked' often when wall             sitting, so would like to un-equip with a single click. Is something like that legal, or illegal?

bogie: That wouldn't be legal, sorry.

xedx: Would having 5 separate buttons on the items page - one to un-equip primary, one for secondary, one melee, etc. be           legit? What exactly is the rule for this situation?

bogie: thats fine

bogie: As it wouldn't be performing server side actions for you, you'd be doing the main actions

xedx: OK, thank you very much! That's a big help

bogie: But having one button do it all for you would be illegal

xedx: Got it. Thanks!

</details>

So that script has been modified to have 5 buttons, on one simple bar, to rapidly click through to equip/un-equip each category. The modified script has not yet been uploaded.

# Scripts 

Note that the PNG files are not part of the installation, they are simple screenshots showing what to expect when the script is run. Any bugs, broken links, or suggestions, feel free to message me on Torn: [xedx [2100735]](https://www.torn.com/profiles.php?XID=2100735#/)

One of these days, I'll publish to my OpenUserJS account and make them self-updateable. When I have the time and inclination to go to the effort, for now, you'd have to go look for an update, they are all versioned. Hmm - should probably put the version number in the name, as I usually do everywhere ele for open source stuff. Not sure why I didn't. Probably beacuse I would then have to edit this file as well, every time I uploaded newer versions. Auto-update would solve that issue.

**_Torn Latest Attacks Extender_**

- [Torn Latest Attacks Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/AttacksExtender/Torn%20Latest%20Attacks%20Extender.user.js)

Images:

- [Torn Latest Attacks Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/AttacksExtender/Torn%20Latest%20Attacks%20Extender.png)
- [Torn Latest Attacks Extender 2.png](https://github.com/edlau2/Tampermonkey/blob/master/AttacksExtender/Torn%20Latest%20Attacks%20Extender%202.png)
- [Torn Latest Attacks Extender 3.png](https://github.com/edlau2/Tampermonkey/blob/master/AttacksExtender/Torn%20Latest%20Attacks%20Extender%203.png)

This script adds an extended 'latest attacks' screen to your home page. It is configurable and allows you to display up to 100 of the latest attacks, and adds attacking (or attacked) faction name and respect earned. Your API Key is required, as this uses the Torn API so is completely legal. You key is never shared. Before first use, the configuration dialog should appear asking for your key.

As of 03/03/2020, you can now click the attack to get the full attack log (version 0.2). This is thanks to Chedburn adding the log ID to both the 'attacks' queries under user and faction.

**_Torn Gym Gains_**

- [Torn Gym Gains.user.js](https://github.com/edlau2/Tampermonkey/blob/master/GymGains/Torn%20Gym%20Gains.user.js)

Images:

- [Torn Gym Gains-1.png](https://github.com/edlau2/Tampermonkey/blob/master/GymGains/Torn%20Gym%20Gains-1.png)
- [Torn Gym Gains-2.png](https://github.com/edlau2/Tampermonkey/blob/master/GymGains/Torn%20Gym%20Gains-2.png)

This script adds extended gym information to your Gym page. It displays the additional gains you get, depending on what perks are currently available to you - company perks, merits, fac perks, etc. These are displayed, by default, as a summary in percentage, along with the base gym gain that depends on the current gym you are in, 2.0 through 10.0. An expandle screen is available to see the breakout of the percentage gains. Your API Key is required, as this uses the Torn API so is completely legal. You key is never shared. Before first use, the configuration dialog should appear asking for your key.

**_Torn Bounty List Extender_**

(Coming soon, it's been written but not yet uploaded!)

- [Torn Bounty List Extender.user.js]
<!--(https://github.com/edlau2/Tampermonkey/blob/master/UserListExtender/Torn%20User%20List%20Extender.user.js)

Images:

- [Torn User List Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/UserListExtender/Torn%20User%20List%20Extender.png)
-->

This script adds rank next to the level in the Bounties List. The goal was to make it easier to more quickly decide what targets for an attack, without having to inspect the user individually. 

**_Torn Weapon Experience_**

- [Torn Weapon Experience.user.js](https://github.com/edlau2/Tampermonkey/blob/master/WeaponExp/Torn%20Weapon%20Experience.user.js)

Images:

- [Torn Weapon Experience-1.png](https://github.com/edlau2/Tampermonkey/blob/master/WeaponExp/Torn%20Weapon%20Exp-1.png)
- [Torn Weapon Experience-2.png](https://github.com/edlau2/Tampermonkey/blob/master/WeaponExp/Torn%20Weapon%20Exp-2.png)

This script adds a new section on the Items page, collapsed by default, that shows all of your weapons experience. It is collapsed by default, underneath you equipped weapons section. There is a much nicer way to view this, via Torn Stats: https://www.tornstats.com/weapons.php


**_Torn Get Naked_**

Note: Removed for now, see the comments in the Scripting Rules section, above.

<details>
  <summary>Click to see description...</summary>

- [Torn Get Naked.user.js] <!-- (https://github.com/edlau2/Tampermonkey/blob/master/GetNaked/Torn%20Get%20Naked.user.js) -->

Images:

- [Torn Get Naked.png](https://github.com/edlau2/Tampermonkey/blob/master/GetNaked/Torn%20Get%20Naked.png)

Sneak Peak at v2, that follows the rules:

- [Torn Get Naked v2.png](https://i.imgur.com/bPzcYJF.png)

Per Bogie's reply to my questions regarding this script, it has since been modified so that there are now 5 buttons, not one, hence the following paragraph is slightly outdated.

This script adds buttons to the Items page: Re-equip, Un-equip, and Reset. Pressing the Un-equip button will un-equip all equipped weapons and armor - Primary, Secondary, Melee, Temporary and Armor. The items that were equipped are saved in local storage, so that when the Re-equip button is pressed, the same items will then be equipped. If you change your choices of weapons and/or armor, pressing the Reset button, while equipped, will erase what is saved so that the next time Un-equip is pressed, the new choices of weaponry and armor will be saved instead of using the old ones. After each action, a results summary dialog is displayed.

<details>
  <summary>Click to see 'Still to be implemented/Known Issues'...</summary>
  
  1. Weapon mods are not saved, so those need to be manually re-added upon re-equipping. The currently equipped mods are displayed on the results summary dialog.
  2. ~~If you decide to equip alternate weapons, such as a plastic sword after un-equipping, this is not currently honored automatically, and I haven't yet tested what happens upon re-equipping - there is normally a warning displayed telling you that your DBK will replace your plastic sword, for example.~~ 
  <br>*Added 7/16/2019, version 0.2*
  <br>After un-equipping, if you then equip another weapon, say a plastic sword, when you later re-equip using the script, it will save the plastic sword as an 'alternate' weapon, and will automatically equip that in place of your normal weapon when you next un-equip using the script. This also prevents the warning about your normal weapon replacing whatever you have equipped since the last un-equip.
  3. Only weapons are affected - if you want to equip masks or clothing such as a thong when un-equipping, this isn't supported nor is it planned to be supported, unless enough people ask for it.
  4. The 'collapse' arrow is not working.
  5. The confirmation dialogs (results summary dialogs) displayed after an action could use a 'Do not show this again' checkbox. This will likey require adding JQuery library support, which should also allow for HTML style formatting, such as bold, italics, etc.
  
Note: The ability to restore weapons modes may wind up being a separate script, so you'd still have to go to the mods page, but there would be a new dialog at the top with Save and Restore buttons. So one click would save the current config, and one click to restore that config. The current script *does* display what mods you have in place currently on un-equip, but *does not* yet restore them.

</details>
</details>

**_Torn Net Worth Display_**

- [Torn Net Worth Display.user.js](https://github.com/edlau2/Tampermonkey/blob/master/NetWorth/Torn%20Net%20Worth%20Display.user.js)

Images:

- [Torn Net Worth Display.png](https://github.com/edlau2/Tampermonkey/blob/master/NetWorth/Torn%20Net%20Worth%20Display.png)

This simple script display a user's net worth on their profile page, immediately beneath their "last action". Note that this is net worth, not cash on hand. Updated at new day.

**_Torn Numeric Rank Display_**

- [Torn Numeric Rank Display.user.js](https://github.com/edlau2/Tampermonkey/blob/master/NumericRankDisplay/Torn%20Numeric%20Rank%20Display.user.js)

Images:

- [Torn Numeric Rank Display.png](https://github.com/edlau2/Tampermonkey/blob/master/NumericRankDisplay/Torn%20Numeric%20Rank%20Display.png)

This simple script appends a user's rank number next to the rank in the User Information section of a user's profile. I find it easier than scrolling down to look at the rank that is also displayed in the Medals section. This script also highlights using the MutationObserver object, so that chages are made only when the relevant DOM has been loaded.

**_Torn One-Click Daily Dime_**

Note: I've removed this for now, as I'm not sure if it breaks the rules or not (see the 'Scripting Rules' section, above). I'll have to confer with Bogie again to verify.

<details>
  <summary>Click to see description...</summary>

- [Torn One-Click Daily Dime.user.js]<!--(https://github.com/edlau2/Tampermonkey/blob/master/DailyDime/Torn%20One%2dClick%20Daily%20Dime.user.js)-->

Images:

- [Torn One-Click Daily Dime.png](Coming Soon - when I have more tokens)

This script lets you click the Daily Dime 'buy' button with one click - up to the number of casino tokens you have available. I am using it to get the 'Win a lottery' merit (Lucky Break), you can easily bet 75 times, refill, and bet 75 more times quickly. Or, as many tokens as you may have. 

</details>

**_Torn User List Extender_**

- [Torn User List Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/UserListExtender/Torn%20User%20List%20Extender.user.js)

Images:

- [Torn User List Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/UserListExtender/Torn%20User%20List%20Extender.png)

This script adds rank next to the level in the User List, as seen when searching for users. The goal was to make it easier to more quickly decide what targets for an attack, without having to inspect the user individually. It helps to quickly determine who may be level holding. Of course, you may want to still look at things such as Xanax or SE's used, that is up to you.

**_Torn Drug Stats_**

- [Torn Drug Stats.user.js](https://github.com/edlau2/Tampermonkey/blob/master/DrugStats/Torn%20Drug%20Stats.user.js)

Images:

- [Torn Drug Stats-1.png](https://github.com/edlau2/Tampermonkey/blob/master/DrugStats/Torn%20Drug%20Stats-1.png)
- [Torn Drug Stats-2.png](https://github.com/edlau2/Tampermonkey/blob/master/DrugStats/Torn%20Drug%20Stats-2.png)
- [Torn Drug Stats-3.png](https://github.com/edlau2/Tampermonkey/blob/master/DrugStats/Torn%20Drug%20Stats-3.png)

This script adds a new section to your Home page, and display beneaths the faction perks section a new section, similar to the Crimes section, displaying your drug usage (individual and total), ODs, Rehabs and money spent on rehab in total. Can be used towards monitoring your progress towards the drug merits.

~~Note: I haven't yet found the names for the stats for Shrooms, Speed, and PCP in theTorn API. Every other drug is listed in the 'personalstats' field. When I find the, I'll add them. For now it displays 'unavailable'.

**_Torn Jail Stats_**

- [Torn Jail Stats.user.js](https://github.com/edlau2/Tampermonkey/blob/master/JailStats/Torn%20Jail%20Stats.user.js)

Images:

- [Torn Jail Stats.png](https://github.com/edlau2/Tampermonkey/blob/master/JailStats/Torn%20Jail%20Stats.png)

This script adds a new section to your Home page, and displays beneath the faction perks section a new section, similar to the Crimes section, displaying your bust progress - bust successes, fails, jails, and bail stats. Bounty stats have been stuck in here as well. Can be used towards monitoring your progress towards bust and bail merits.

**_Torn Jail Scores_**

- [Torn Jail Scores.user.js](https://github.com/edlau2/Tampermonkey/blob/master/JailScores/Torn%20Jail%20Scores.user.js)

Images:

- [Torn Jail Scores.png](https://github.com/edlau2/Tampermonkey/blob/master/JailScores/Torn%20Jail%20Scores.png)

This script adds the "score" of a user in jail, which is used to determine the difficulty (or your chance of success) of busting that user out of jail. The score is displayed as a number in parenthesis beneath the user's level. The score corresponds directly to the DocTorn 'Quick Bust/Quick Bail/Min Score/Max Score' bar scores. Some information, mostly speculative, can be found in this guide: https://www.tornstats.com/guides.php?id=22 Will also give you an idea of what to use as scores on the DocTorn bar if you'd like to use those filters.


**_Torn War Wall List Extender_**

- [Torn War Wall List Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/WarListExtender/Torn%20War%20Wall%20List%20Extender.user.js)

Images:

- [Torn War Wall List Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/WarListExtender/Torn%20War%20Wall%20List%20Extender.png)

*** Beta, just be aware that if it causes issues, you can disable from the Tampermonkey dashboard ***

<details>
 <summary>Click to see details...</summary>

Similar to the above script, this extends the user list on the territory wall page(s) when your faction is in a war. It appends the numeric rank next to the level of all people on the wall. There is a glitch in that when a wall page is opened the first time, sometimes a refresh is required for the script to execute properly. Also, this script has a tendency to perform too many requests to the Torn api - there is a limit on requests (100 per minute), the result of which is that only the level may be displayed for certain users (new users getting on the wall) if there is heavy wall activity, or possible a '?' for rank. If multiple things are running that query the Torn API, and the faction has 100 members (or more) and the wall is full, this will most definitely be hit (as mentioned above, heavy wall activity may also affect this). This clears itself up in time. Note that internal caching is done to help alleviate this, if a user's ID has already been mapped to a rank, a new request to the Torn API is not generated. A deferred request queue is in the process of being implemented to solve this.

</details>

**_Torn War Other Fac Extender_**

- [Torn War Other Fac Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/OtherFacExtender/Torn%20War%20Other%20Fac%20Extender.user.js)

Images:

- [Torn War Other Fac Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/OtherFacExtender/Torn%20War%20Other%20Fac%20Extender.png)

*** alpha - don't use yet ***

<details>
  <summary>Click to see details...</summary>
 
Similar to the above script, this extends the user list of another faction, typically used during war. It appends the numeric rank next to the level of all fac members on their faction page. This script has a tendency to perform too many requests to the Torn api - there is a limit (100) on requests per minute, the result of which is that only the level may be displayed for certain users, and a '?' for rank. Or no rank info at all. If multiple things are running that query the Torn API, and the faction has 100 members (or more) this will most definitely be hit. This clears itself up in time. Note that internal caching is done to help alleviate this, if a user's ID has already been mapped to a rank, a new request to the Torn API is not generated. A deferred request queue is in the process of being implemented to solve this.

</details>

# 3rd Party Scripts

These scripts aren't mine, just here for easy access by fac mates. The links link to the respective author's repos, either GitHub, OpenUserJS, or GreasyFork.

**_TORN HighLow Helper_**

The two following links point to the same code, no idea why named differently. 

OpenUserJS link:
- [TORN_HighLow_Helper.user.js](https://openuserjs.org/meta/DeKleineKobini/TORN_HighLow_Helper.user.js)

Alternate, GreasyFork link:
- [TORN: High/Low Helper.user.js](https://greasyfork.org/en/scripts/391481-torn-high-low-helper)

Helper to assist in getting the Hi/Lo merit. Simply picks the best choice via odds, worked for me, but not infallable. Took me about 20 minutes and maybe 100 or 120 tokens. Makes it a lot easier, though. Just click click click your way through it. Written by DeKleineKobini [2114440]

**_Dibs_**

<!--(https://github.com/edlau2/Tampermonkey/blob/master/Dibs/Dibs.user.js)-->
- [Dibs.user.js](https://greasyfork.org/nb/scripts/371859-dibs)

Allows you to claim 'dibs' on wall targets during territory wars/chaining. Basically, if all parties have the script installed, the first person to attack a target will have claimed 'dibs' on it, preventing others (who are using the script as well) from attacking - this prevents unwanted assists and wasted energy. Written by sullengenie [1946152]

**_Stock Block Price_**

- [Stock Block Price.user.js](https://github.com/Nepherius/userscrips/raw/master/stock_block_price.user.js)

Displays the cost of a BB of stock on the Stock Exchange page, beneath the share price. Useful to quickly see the price of a BB without having to 'fake' buying it or use a calculator. Written by nepherius [2009878]

Note: It appears that this does not work well with the 'Stock Market Helper', below. It causes the display of the values of shares you own, on the Stock Exchange page, to appear as $NaN. Since version 1.8 of Stock Market Helper, the block price is displayed as the 'Benefist Price' on the Info page of a stock in the Stock xchange.

Note 2: I think this has subsequently been added to Torn itself, on the 'About' tab in the stock market or portfolio pages.

**_Stock Market Helper_**

- [Stock Market Helper.user.js] <!-- (https://greasyfork.org/scripts/384161-stock-market-helper/code/Stock%20Market%20Helper.user.js) -->

Note: the link is disabled as I do not have permission from Mafia to re-distribute. 
He has taken down ALL of his scripts.
Kept here for legacy purposes.

<details>
  <summary>Click to see description...</summary>
 
Torn Stock Helper that calculates your profit/loss in your portfolio, highlights forecasts that are poor, very poor, good and very good in the Stock Exchange, and lists the amount of $$ you have invested in stocks you have shares in. Also marks the stock's worth, as ($) 0 < 20b < 50b < 100b. And gets new data everytime stock profile reexpanded in Stock Exchange or your portfolio. Written by Mafia [610357]

</details>

- [Bazaar Scam Warning.user.js](https://greasyfork.org/en/scripts/388003-bazaar-scam-warning)

Puts a big red warning on items that are priced way above their market value. Written by Sulsay [2173590]

- [Race Helper.user.js]<!--(https://github.com/edlau2/Tampermonkey/blob/master/r%40ce%20h3lper/T-RN%20-%20R%40ce%20H3lper.user.js)-->

Racing assistant script. 
Note: the link is disabled as I do not have permission from Mafia to re-distribute.
He has taken down ALL of his scripts.
Kept here for legacy purposes.

<details>
  <summary>Click to see description...</summary>
 
Accurate Stats for your car
Showing accurate stats number of your car with percentage on your Listed Cars and Race Events

EASY UPGRADE NOTIFICATION
Got random events when your car crashed during race?

Looking, searching, finding, or... go thru part by part to make sure your car are fully upgraded ?

Don't worry, with this feature, you will notice which categories are available to upgrade (if you are not fully upgrade your car)

DOWNLOAD CSV

Also, there are feature to download all saved upgrade stats of your car into 1 CSV / Excel format. You can use it later if you need to view it at all or sorting on your pc.

Originally written by Mafia [610357], this is a slightly modified version as his was pulled. This one won't auto-update to the removed version. Kept for legacy purposes.

</details>

# Extensions

Extensions allow for things that aren't neccesarily page-specific, although these are Torn specific. They can be installed in two ways. When still in testing, or I haven't yet bothered to publish to the Chrome App Store, I'll distribute as a .zip file of all the required files. From chrome://extension, enable "developer mode". You will then see an option, "Load Unpacked". Browse from there to the directory containg the files extracted from the .zip file. My extensions all have an Options page which can be accessed via the "Details" menu of the extension. 

Once in the Chrome App Store, the link will point there instead, and should install from there.

**_Torn Loot Level Notifier_**

- [Loot Level Notifier.zip version 1.6.1](https://github.com/edlau2/Tampermonkey/blob/master/LootLevel/Loot%20Level%20Notifier-1.6.1.zip)

Images:

- [Loot Level Options.png](https://github.com/edlau2/Tampermonkey/blob/master/LootLevel/Loot%20Level%20Options.png)
- [Loot Level Notifier1.png](https://github.com/edlau2/Tampermonkey/blob/master/LootLevel/Loot%20Level%20Notifier1.png)
- [Loot Level Notifier2.png](https://github.com/edlau2/Tampermonkey/blob/master/LootLevel/Loot%20Level%20Notifier2.png)

This script displays notifications regarding NPC loot levels, health, and the time when the next loot level will be hit, as well as an option to go directly to the NPC's attack page. The notifications displayed can be configured from the Options menu. The options allow you to select which NPC's to be notified about. At present this is only Duke and Leslie. You may also select to display notifications when the player is in hospital, at Loot Level I, II, III, IV or IV, and any combination of the above. By default, the notification is displayed for 10 seconds but can be closed at any time, and there is an Attack button available to go directly to the player's Attack page. 

There is also an option to automatically open the NPC's profile at level IV in a new tab - the Attack page.

This has been tested on PC's and Mac's, but since I'm using a Mac, mostly on a Mac.

This extension requires you to enter your API key in the Options dialog. If not entered, the Options dialog will open automatically when run.

There is a warning Idisplays as an error) about an synchronous call, this can be ignored. I will address this later, given time. Async is partially implemented but still in alpha, so not enabled at this time.

I have re-written this to use the YATA API, but the most recent version (1.6.3) has not been uploaded yet.

# Third Party Extensions

These extensions aren't mine, just here for easy access by fac mates. The links link to the respective author's repos or the Chrome App Store.

**_Torn HiLo Assistant_**

- [Torn HiLo Assistant](https://www.torn.com/forums.php#/?p=threads&f=67&t=16059935&b=0&a=0&start=0&to=18782179)

Images:

- [Torn HiLo Assistant.png](https://github.com/edlau2/Tampermonkey/blob/master/Third%20Party/Torn%20HiLow%20Assistant.png)

The link above is to a forum post that explains it all. It has two links, one for the Chrome app store and one for Firefox, at mozilla.org, which both have screenshots. As of this writing, it appears to be broken. Version 0.0.2 - I have notified the author, so I hope he will fix it soon.

# Google Sheets and Scripts

**_Torn Stock Ticker_**

- [Torn Stock Ticker](https://docs.google.com/spreadsheets/d/1f9_UgVatH2q6Ozgz65Z4z-ify8ljeMh-y8WBznYStgk/edit?usp=sharing/copy)

This requires some configuation. After downloading from the above link, make a copy, renaming if you like, from Google Sheet's File->Copy menu. This will give your own, private, editable copy. Next, enter on the Options sheet your API key and optionally, an e-mail address and/or Discord webhook channel URL to receive event notifications. Finally, from the 
Tools->Script Editor option in Google Sheets, select the icon that looks a bit like a stopwatch to add a trigger. See the 'Trigger Options' images, below, for more details.

Images:

- [Trigger Options #1](https://github.com/edlau2/Tampermonkey/blob/master/StockTicker/trigger_page_1.png)
- [Trigger Options #2](https://github.com/edlau2/Tampermonkey/blob/master/StockTicker/trigger_page_2.png)

- [Example output #1](https://github.com/edlau2/Tampermonkey/blob/master/StockTicker/sample_output_1.png)
- [Example output #2](https://github.com/edlau2/Tampermonkey/blob/master/StockTicker/sample_output_2.png)

