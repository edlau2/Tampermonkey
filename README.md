# Torn Utilities
Repository for Torn-related scripts, extensions, and more.

# Installation

1. Install Tampermonkey
 [(Tampermonkey link)](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en)
2. Select a script in this repo that you wish to use. The script is the link ending in .user.js. The .png file is a screenshot showing what the script does.
3. Click the 'Install' button.
4. Viola!

The majority of the third-party scripts are usually self-installing (just press an "install" button). They are usually hosted at either OpenUserJS or GreasyFork.

# Scripting Rules

The rules for scripting, from the "Tools and Userscripts" forum (https://www.torn.com/forums.php#/p=threads&f=67&t=16037108&b=0&a=0), are as follows:

"The use of scripts, extensions, applications or any other kind of software is allowed only if it uses data from our API or a page you (or your users) have loaded manually and are currently viewing. They cannot make additional non-API requests to Torn, scrape pages that you're not currently viewing, or attempt to bypass the captcha. If the software you're using makes non-API requests that are not manually triggered by you, it is not allowed and can be tracked.

Assuming this rule is followed, go wild!"

This is somewhat vague, so I consulted with Bogie on some of the scripts I was unsure of. For instance, here is a snippet of our conversation regarding the 'Torn Get Naked' script:

<details>
  <summary>Click to see conversation...</summary>
  
xedx: If I have a script that loads only when a user visits the page the script runs on, can the script use the Javascript click() function to click more than one button/link in succession? In particular, I 'get naked' often when wall sitting, so would like to un-equip with a single click. Is something like that legal, or illegal?

bogie: That wouldn't be legal, sorry.

xedx: Would having 5 separate buttons on the items page - one to un-equip primary, one for secondary, one melee, etc. be legit? What exactly is the rule for this situation?

bogie: thats fine

bogie: As it wouldn't be performing server side actions for you, you'd be doing the main actions

xedx: OK, thank you very much! That's a big help

bogie: But having one button do it all for you would be illegal

xedx: Got it. Thanks!

So that script has been modified to have 5 buttons, on one simple bar, to rapidly click through to equip/un-equip each category. The modified script has not yet been uploaded.
 
</details>

# Scripts 

Note that the PNG files are not part of the installation, they are simple screenshots showing what to expect when the script is run. Any bugs, broken links, or suggestions, feel free to message me on Torn: [xedx [2100735]](https://www.torn.com/profiles.php?XID=2100735#/). Every script of mine logs the start of script execution, and if required, will prompt for an API key which is saved in your private local storage so you are not prompted again. It is never shared in any manner. None of these scripts require full access, most require limited access.

#### **_Torn Weapon Experience Spreadsheet_**

- [Torn WE Spreadsheet.user.js](https://github.com/edlau2/Tampermonkey/raw/master/Weapon%20Experience%20Spreadsheet/Torn%20WE%20Spreadsheet.user.js
)

Images:

![SS-Sample-collapsed.png](https://github.com/edlau2/Tampermonkey/blob/master/Weapon%20Experience%20Spreadsheet/SS-Sample-collapsed.png)
![SS-Sample-expanded.png](https://github.com/edlau2/Tampermonkey/blob/master/Weapon%20Experience%20Spreadsheet/SS-Sample-expanded.png)

This script displays your current Weapons Experience in a table or spreadsheet format, as well as finishing hits for each category. I used it to cut and paste the table as an image onto my profile page while merit hunting those two merits, 'Specialized' and 'War Machine'. The table is in a dropdown DIV on the page. The first sample image shows it collapsed (not visible), the arrow on the DIV's header expands it, that is visible in the second sample image.

#### **_Torn Weapon Experience Tracker_**

- [Torn Weapon Experience Tracker.user.js](https://github.com/edlau2/Tampermonkey/raw/master/WeaponExperience/Torn%20Weapon%20Experience%20Tracker.user.js)

Images:

![WeaponExperienceSample.png](https://github.com/edlau2/Tampermonkey/blob/master/WeaponExperience/WeaponExperienceSample.png)
![WeaponExperienceSample2.png](https://github.com/edlau2/Tampermonkey/blob/master/WeaponExperience/WeaponExperienceSample2.png)

This script displays your current Weapons Experience on the Items pages, for Primary, Secondary, Melee and Temporary weapons, alongside each weapon, before the damage and accuracy stats.

#### **_Torn Personal Profile Stats_**

- [Torn Personal Profile Stats.user.js](https://github.com/edlau2/Tampermonkey/raw/master/PersonalProfileStats/Torn%20Personal%20Profile%20Stats.user.js)

Images:

![Numeric Rank](https://github.com/edlau2/Tampermonkey/blob/master/PersonalProfileStats/Torn%20Numeric%20Rank%20Display.png)
![Bat Stats and NetWorth](https://github.com/edlau2/Tampermonkey/blob/master/PersonalProfileStats/Torn%20Bat%20Stat%20Estimator-horokeu.png)

This script combines what was previously three separate scripts. On a person's Profile page, it display the numeric equivalent of their rank, their net worth, and their estimated bat stats. This replaces the 'Torn Bat Stat Estimator', 'Torn Numeric Rank Display', and 'Torn Net Woth Display' scripts.

#### **_Torn Museum Set Helper_**

- [Torn Museum Sets Helper.user.js](https://github.com/edlau2/Tampermonkey/raw/master/MuseumSetsHelper/Torn%20Museum%20Sets%20Helper.user.js)

Images: Note - the images are outdated, now, they are sorted ascending by the amount you have, aand additionally, the country where the items are found and time it takes to get there are listed beside the items.

![SampleFlowerSets.png](https://github.com/edlau2/Tampermonkey/blob/master/MuseumSetsHelper/SampleFlowerSets.png)
![SamplePlushieSets.png](https://github.com/edlau2/Tampermonkey/blob/master/MuseumSetsHelper/SamplePlushieSets.png)

This script displays on your Iteems pages the number of full sets, if any, you have collected and if not, what items are missing.

#### **_Torn Racing - Car Order_**

- [Torn Racing - Car Order.user.js](https://github.com/edlau2/Tampermonkey/raw/master/RaceCarOrder/Torn%20Racing%20-%20Car%20Order.user.js)

Images:

- [Torn Racing - Car Order-1.png](https://github.com/edlau2/Tampermonkey/blob/master/RaceCarOrder/Torn%20Racing%20-%20Car%20Order-1.png)
- [Torn Racing - Car Order-2.png](https://github.com/edlau2/Tampermonkey/blob/master/RaceCarOrder/Torn%20Racing%20-%20Car%20Order-2.png)
- [Torn Racing - Car Order-3.png](https://github.com/edlau2/Tampermonkey/blob/master/RaceCarOrder/Torn%20Racing%20-%20Car%20Order-3.png)

This script allows you to drag and drop your enlisted race cars into any order you like. Saving this order will allow them to automatically appear in this order when starting a race. Or, you can reset to the Torn default.

#### **_Torn Hide-Show Chat Icons_**

- [Torn Hide-Show Chat Icons.user.js](https://github.com/edlau2/Tampermonkey/raw/master/HideShowChat/Torn%20Hide-Show%20Chat%20Icons.user.js)

Images:

![Torn Hide-Show Chat Icons.displayed.png](https://github.com/edlau2/Tampermonkey/raw/master/HideShowChat/Torn%20Hide-Show%20Chat%20Icons.displayed.png)
![Torn Hide-Show Chat Icons.hidden.png](https://github.com/edlau2/Tampermonkey/raw/master/HideShowChat/Torn%20Hide-Show%20Chat%20Icons.hidden.png)

This script toggles the display of the chat icons at the bottom of the screen. Probably most useful for mobile users, but has not been tried on a mobile device yet. Please let me know if you do try it on a phone :-) It isn't exactly friendly with the Torn Tools show/hide chat balloon, there aren't conflicts but it is best to use or the other, as they achieve the same thing in different ways. In other words, if my script is used, it will hide and show when it is clicked - but won't re-show the icons if hidden by Torn Tools - and my 'show' option will not display icons hidden by Torn Tools. This may change in the future - on my end, at least.

#### **_Torn Latest Attacks Extender_**

- [Torn Latest Attacks Extender.user.js](https://github.com/edlau2/Tampermonkey/raw/master/AttacksExtender/Torn%20Latest%20Attacks%20Extender.user.js)

Images:

![Torn Latest Attacks Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/AttacksExtender/Torn%20Latest%20Attacks%20Extender.png)
![Torn Latest Attacks Extender 2.png](https://github.com/edlau2/Tampermonkey/blob/master/AttacksExtender/Torn%20Latest%20Attacks%20Extender%202.png)
![Torn Latest Attacks Extender 3.png](https://github.com/edlau2/Tampermonkey/blob/master/AttacksExtender/Torn%20Latest%20Attacks%20Extender%203.png)

This script adds an extended 'latest attacks' screen to your home page. It is configurable and allows you to display up to 100 of the latest attacks, and adds attacking (or attacked) faction name and respect earned. Your API Key is required, as this uses the Torn API so is completely legal. You key is never shared. Before first use, the configuration dialog should appear asking for your key.

As of 03/03/2020, you can now click the attack to get the full attack log (version 0.2). This is thanks to Chedburn adding the log ID to both the 'attacks' queries under user and faction.

#### **_Torn Gym Gains_**

- [Torn Gym Gains.user.js](https://github.com/edlau2/Tampermonkey/raw/master/GymGains/Torn%20Gym%20Gains.user.js)

Images:

![Torn Gym Gains-1.png](https://github.com/edlau2/Tampermonkey/blob/master/GymGains/Torn%20Gym%20Gains-1.png)
![Torn Gym Gains-2.png](https://github.com/edlau2/Tampermonkey/blob/master/GymGains/Torn%20Gym%20Gains-2.png)

This script adds extended gym information to your Gym page. It displays the additional gains you get, depending on what perks are currently available to you - company perks, merits, fac perks, etc. These are displayed, by default, as a summary in percentage, along with the base gym gain that depends on the current gym you are in, 2.0 through 10.0. An expandle screen is available to see the breakout of the percentage gains. It also has a panel that displays bat stats - base, extended, current (takes Xanax into consideration, for example) and extended with vico. (Note to self: add screen shot here)

#### **_Torn Fac Respect Earned_**

- [Torn Fac Respect Earned.user.js](https://github.com/edlau2/Tampermonkey/raw/master/FacRespect/Torn%20Fac%20Respect%20Earned.user.js)

Images:

- [Torn Fac Respect Earned.png](https://github.com/edlau2/Tampermonkey/blob/master/FacRespect/Torn%20Fac%20Respect%20Earned.png)

This script add a section to the Faction Stats area on your home page, listing the respect you have earned for your faction so far. It has a tool tip, so if you hover over the respect you have earned, it will tell you what medals and honors (merits) are available, and how close you are to getting them.

#### **_Torn Bounty List Extender_**

- [Torn Bounty List Extender.user.js](https://github.com/edlau2/Tampermonkey/raw/master/BountyList/Torn%20Bounty%20List%20Extender.user.js)

Images:

![BountyListSample.png](https://github.com/edlau2/Tampermonkey/blob/master/BountyList/BountyListSample.png)

This script adds rank next to the level in the Bounties List. The goal was to make it easier to more quickly decide what targets to attack, without having to inspect each user individually. The queried ranks are locally cached so as not to exceed the Torn API call limit.
 
#### **_Torn Bat Stat Estimator_**

<details>
 <summary>Deprecated: moved into <b>Torn Personal Profile Stats</b></summary>

- [Torn Bat Stat Estimator.user.js](https://github.com/edlau2/Tampermonkey/raw/master/BatStatEst/Torn%20Bat%20Stat%20Estimator.user.js)

Images:

- [Torn Bat Stat Estimator-horokeu.png](https://github.com/edlau2/Tampermonkey/blob/master/BatStatEst/Torn%20Bat%20Stat%20Estimator-horokeu.png)
- [Torn Bat Stat Estimator-xedx.png](https://github.com/edlau2/Tampermonkey/blob/master/BatStatEst/Torn%20Bat%20Stat%20Estimator-xedx.png)

This script uses the method described here: https://www.torn.com/forums.php#/p=threads&f=61&t=16065473&b=0&a=0 to estimate a user's bat stats, as best as can be estimated with publicly available stats. The possible range of bat stats is displayed on the user's profile page. This is most useful for lower level players, due to the ranges involved at higher levels. Also, 'ghost' triggers can't be helped, for instance if you hit a NW trigger and then lose it. Also, level holding will also throw off the results, usually resulting in an 'N/A' result. Always check things like Xanax and refills used, and other indicators also before relying on this estimate to pick a fight!
 
 </details>

**_Torn One-Click Daily Dime_**

Note: I've removed this for now, as I'm not sure if it breaks the rules or not (see the 'Scripting Rules' section, above). I'll have to confer with Bogie again to verify.

<details>
  <summary>Click to see description...</summary>

- [Torn One-Click Daily Dime.user.js]<!--(https://github.com/edlau2/Tampermonkey/raw/master/DailyDime/Torn%20One%2dClick%20Daily%20Dime.user.js)-->

Images:

- [DailyDimeSample.png](https://github.com/edlau2/Tampermonkey/blob/master/DailyDime/DailyDimeSample.png)

This script lets you click the Daily Dime 'buy' button with one click - up to the number of casino tokens you have available. I am using it to get the 'Win a lottery' merit (Lucky Break), you can easily bet 75 times, refill, and bet 75 more times quickly. Or, as many tokens as you may have. 

</details>

#### **_Torn User List Extender v2_**

- [Torn User List Extender v2.user.js](https://github.com/edlau2/Tampermonkey/raw/master/UserListExtender/Torn%20User%20List%20Extender%20v2.user.js)

Images:

- [Torn User List Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/UserListExtender/Torn%20User%20List%20Extender.png)

This script adds rank next to the level in the User List, as seen when searching for users. The goal was to make it easier to more quickly decide what targets to attack, without having to inspect the user individually. It helps to quickly determine who may be level holding. Of course, you may want to still look at things such as Xanax or SE's used, that is up to you (see 'Torn Adv Mini Profile'!).

#### **_Torn Crime Tooltips_**

- [Torn Crime Tooltips.user.js](https://github.com/edlau2/Tampermonkey/raw/master/CrimeTooltips/Torn%20Crime%20Tooltips.user.js)

Images:

![Torn Crime Tooltips-1.png](https://github.com/edlau2/Tampermonkey/blob/master/CrimeTooltips/Torn%20Crime%20Tooltips-1.png)
![Torn Crime Tooltips-2.png](https://github.com/edlau2/Tampermonkey/blob/master/CrimeTooltips/Torn%20Crime%20Tooltips-2.png)

Adds Tool Tips to the Criminal Offences display on your home page. Useful for merit hunting.

#### **_Torn Drug Stats_**

- [Torn Drug Stats.user.js](https://github.com/edlau2/Tampermonkey/raw/master/DrugStats/Torn%20Drug%20Stats.user.js)

Images:

![Torn Drug Stats-1.png](https://github.com/edlau2/Tampermonkey/blob/master/DrugStats/Torn%20Drug%20Stats-1.png)
![Torn Drug Stats-2.png](https://github.com/edlau2/Tampermonkey/blob/master/DrugStats/Torn%20Drug%20Stats-2.png)
![Torn Drug Stats-3.png](https://github.com/edlau2/Tampermonkey/blob/master/DrugStats/Torn%20Drug%20Stats-3.png)

This script adds a new section to your Home page, and display beneath the faction perks section a new section, similar to the Crimes section, displaying your drug usage (individual and total), ODs, Rehabs and money spent on rehab in total. Can be used towards monitoring your progress towards the drug merits, comes with tool tips to display merit progress.

#### **_Torn Jail Stats_**

- [Torn Jail Stats.user.js](https://github.com/edlau2/Tampermonkey/raw/master/JailStats/Torn%20Jail%20Stats.user.js)

Images:

![Torn Jail Stats.png](https://github.com/edlau2/Tampermonkey/blob/master/JailStats/Torn%20Jail%20Stats.png)
![Torn Jail Stats 2.png](https://github.com/edlau2/Tampermonkey/blob/master/JailStats/Torn%20Jail%20Stats-2.png)

This script adds a new section to your Home page, and displays beneath the faction perks section a new section, similar to the Crimes section, displaying your bust progress - bust successes, fails, jails, and bail stats. Bounty stats have been stuck in here as well. Can be used towards monitoring your progress towards bust and bail merits, comes with tool tips to display merit progress.

#### **_Torn Jail Scores_**

- [Torn Jail Scores.user.js](https://github.com/edlau2/Tampermonkey/raw/master/JailScores/Torn%20Jail%20Scores.user.js)

Images:

![Torn Jail Scores.png](https://github.com/edlau2/Tampermonkey/blob/master/JailScores/Torn%20Jail%20Scores.png)

This script adds the "score" of a user in jail, which is used to determine the difficulty (or your chance of success) of busting that user out of jail. The score is displayed as a number in parenthesis beneath the user's level. The score corresponds directly to the DocTorn 'Quick Bust/Quick Bail/Min Score/Max Score' bar scores. Some information, mostly speculative, can be found in this guide: https://www.tornstats.com/guides.php?id=22 Will also give you an idea of what to use as scores on the DocTorn bar if you'd like to use those filters.


#### **_Torn War Wall List Extender_**

- [Torn War Wall List Extender.user.js](https://github.com/edlau2/Tampermonkey/raw/master/WarListExtender/Torn%20War%20Wall%20List%20Extender.user.js)

Images:

- [Torn War Wall List Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/WarListExtender/Torn%20War%20Wall%20List%20Extender.png)

Similar to the User List Extender, this extends the user list on the territory wall page(s) when your faction is in a war. It appends the numeric rank next to the level of all people on the wall. Note that internal caching is done to prevent too many API calls, if a user's ID has already been mapped to a rank, a new request to the Torn API is not generated.

#### **_Torn War Other Fac Extender_**

- [Torn War Other Fac Extender.user.js](https://github.com/edlau2/Tampermonkey/raw/master/OtherFacExtender/Torn%20War%20Other%20Fac%20Extender.user.js)

Images:

- [Torn War Other Fac Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/OtherFacExtender/Torn%20War%20Other%20Fac%20Extender.png)
 
Similar to the above script, this extends the user list of another faction, typically used during war. It appends the numeric rank next to the level of all fac members on their faction page. This script has a tendency to perform too many requests to the Torn api - there is a limit (100) on requests per minute, the result of which is that only the level may be displayed for certain users, and a '?' for rank. Or no rank info at all. If multiple things are running that query the Torn API, and the faction has 100 members (or more) this will most definitely be hit. This clears itself up in time. Note that internal caching is done to help alleviate this, if a user's ID has already been mapped to a rank, a new request to the Torn API is not generated. A deferred request queue is in the process of being implemented to solve this.

# 3rd Party Scripts

These scripts aren't mine, just here for easy access by fac mates. The links link to the respective author's repos, either GitHub, OpenUserJS, or GreasyFork.

TBD: Add Special Gym Ratios and Special Gym Reqs scripts here ...

#### **_Torn: Racing enhancements_** by Lugburz (Highly recommended!)

Show car's current speed, precise skill, official race penalty, racing skill of others and race car skins. Among other things...

- [Torn: Racing enhancements](https://github.com/f2404/torn-userscripts/raw/master/racing_show_speed.user.js)

#### **_Easter Egg Hunt: Random_**

To aid in just clicking around Torn, to hopefully stumble across more Easter Eggs, ths script puts an icon/link on your page that takes you to a random page in Torn. I had a small hand in it, it works very well. Not supposed to guarantee any more eggs, but easier to go around to new places you may never have been. I'd recommend using it in conjunction with DoctorN's "Alert me if there's an Easter Egg on the page" option enabled.

Greasy Fork link:
- [Easter Egg Hunt: Random.user.js](https://greasyfork.org/en/scripts/399644-easter-egg-hunt-random)

Forum link:
- [Easter Egg Hunt: Random thread](https://www.torn.com/forums.php#/p=threads&f=67&t=16152823&b=0&a=0)

#### **_TORN HighLow Helper_**

The two following links point to the same code, no idea why named differently. 

OpenUserJS link: (now an empty shell)
- ~~-[TORN_HighLow_Helper.user.js](https://openuserjs.org/meta/DeKleineKobini/TORN_HighLow_Helper.user.js)~~

Alternate, GreasyFork link:
- [TORN: High/Low Helper.user.js](https://greasyfork.org/en/scripts/391481-torn-high-low-helper)

Helper to assist in getting the Hi/Lo merit. Simply picks the best choice via odds, worked for me, but not infallable. Took me about 20 minutes and maybe 100 or 120 tokens. Makes it a lot easier, though. Just click click click your way through it. Written by DeKleineKobini [2114440]

#### **_Dibs_**

<!--(https://github.com/edlau2/Tampermonkey/blob/master/Dibs/Dibs.user.js)-->
- [Dibs.user.js](https://greasyfork.org/nb/scripts/371859-dibs)

Allows you to claim 'dibs' on wall targets during territory wars/chaining. Basically, if all parties have the script installed, the first person to attack a target will have claimed 'dibs' on it, preventing others (who are using the script as well) from attacking - this prevents unwanted assists and wasted energy. Written by sullengenie [1946152]

<details>
  <summary>Stock Helpers, obsoleted by Stocks 3.0. Click to see details...</summary>

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
 
Torn Stock Helper that calculates your profit/loss in your portfolio, highlights forecasts that are poor, very poor, good and very good in the Stock Exchange, and lists the amount of $$ you have invested in stocks you have shares in. Also marks the stock's worth, as ($) 0 < 20b < 50b < 100b. And gets new data everytime stock profile reexpanded in Stock Exchange or your portfolio. Written by Mafia [610357]

</details>

#### **_Bazaar Scam Warning_**

- [Bazaar Scam Warning.user.js](https://greasyfork.org/en/scripts/388003-bazaar-scam-warning)

Puts a big red warning on items that are priced way above their market value. Written by Sulsay [2173590]

#### **_Race Helper_**

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
 
 <details>
  <summary>Deprecated, no longer updated/supported. Click to see details...</summary>

**_Torn Loot Level Notifier_**

Note: Most, myself included, find it just as easy to monitor YATA's NPC loot page: https://yata.alwaysdata.net/loot/

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
  
 </details>

# Third Party Extensions

These extensions aren't mine, just here for easy access by fac mates. The links link to the respective author's repos or the Chrome App Store.

#### **_Torn HiLo Assistant_**

- [Torn HiLo Assistant](https://www.torn.com/forums.php#/?p=threads&f=67&t=16059935&b=0&a=0&start=0&to=18782179)

Images:

- [Torn HiLo Assistant.png](https://github.com/edlau2/Tampermonkey/blob/master/Third%20Party/Torn%20HiLow%20Assistant.png)

The link above is to a forum post that explains it all. It has two links, one for the Chrome app store and one for Firefox, at mozilla.org, which both have screenshots. As of this writing, it appears to be broken. Version 0.0.2 - I have notified the author, so I hope he will fix it soon.

# Google Sheets and Scripts
 
The following are Google Sheets and App Scripts that integrate with the sheets and the Torn API. If your API key is required, you will be prompted and it will be saved on a hidden sheet, called 'Options', that is created dynamically if need be. The links point to a sheet on my account, read-only, so you must make a copy and rename it to whatever you like in order to uses it. Then you can erase the read-only link to mine.
 
 #### **_Inventory by XedX_**
 
This allows you to view your inventory regardless of whether you are in Torn or not. It is a simple Google Apps Script and sheet(s) (created automatically) that uses one API call to retrieve your inventory and display it in worksheets titled by item type, just as on the Torn inventory page.
 
 - [Inventory by XedX](https://docs.google.com/spreadsheets/d/1_5lz3NYCMb_5tlwGVJ-B7icSt9eUbfQwWUu4eBEKQBA/edit?usp=sharing)
 
 Images: Coming soon!
 
 #### **_Bazaar Inventory, by XedX_**
 
This allows you to view your Bazaar regardless of whether you are in Torn or not. It is a simple Google Apps Script and sheet(s) (created automatically) that uses one API call to retrieve your inventory and display it in worksheets titled by item type, just as on the Torn inventory page. Note that if you Bazar is closed (or has nothing in it), nothing is displayed. Three is no way I know of to differentiate between the two situations. If anyone does, please let me know.
 
 - [Bazaar Inventory, by XedX](https://docs.google.com/spreadsheets/d/1oxgXPYQOS-0EoPA4kKA4rdXB9JxRuMweIfOHh0z4E8w/edit?usp=sharing)
 
  Images: Coming soon!

**_Torn Stock Ticker_**
 
 <b>Deprecated.</b>
 
 <details>
  <summary>Click to see description...</summary>

- [Torn Stock Ticker](<!--https://docs.google.com/spreadsheets/d/1f9_UgVatH2q6Ozgz65Z4z-ify8ljeMh-y8WBznYStgk/edit?usp=sharing/copy-->)

This requires some configuation. After downloading from the above link, make a copy, renaming if you like, from Google Sheet's File->Copy menu. This will give your own, private, editable copy. Next, enter on the Options sheet your API key and optionally, an e-mail address and/or Discord webhook channel URL to receive event notifications. Finally, from the 
Tools->Script Editor option in Google Sheets, select the icon that looks a bit like a stopwatch to add a trigger. See the 'Trigger Options' images, below, for more details.

Images:

- [Trigger Options #1](https://github.com/edlau2/Tampermonkey/blob/master/StockTicker/trigger_page_1.png)
- [Trigger Options #2](https://github.com/edlau2/Tampermonkey/blob/master/StockTicker/trigger_page_2.png)

- [Example output #1](https://github.com/edlau2/Tampermonkey/blob/master/StockTicker/sample_output_1.png)
- [Example output #2](https://github.com/edlau2/Tampermonkey/blob/master/StockTicker/sample_output_2.png)
  
 </details>

