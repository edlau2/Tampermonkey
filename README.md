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

#### **_Torn Racing - Car Order_**

- [Torn Racing - Car Order.user.js](https://github.com/edlau2/Tampermonkey/raw/master/RaceCarOrder/Torn%20Racing%20-%20Car%20Order.user.js)

Images:

- [Torn Racing - Car Order-1.png](https://github.com/edlau2/Tampermonkey/blob/master/RaceCarOrder/Torn%20Racing%20-%20Car%20Order-1.png)
- [Torn Racing - Car Order-2.png](https://github.com/edlau2/Tampermonkey/blob/master/RaceCarOrder/Torn%20Racing%20-%20Car%20Order-2.png)
- [Torn Racing - Car Order-3.png](https://github.com/edlau2/Tampermonkey/blob/master/RaceCarOrder/Torn%20Racing%20-%20Car%20Order-3.png)

This script allows you to drag and drop your enlisted race cars into any order you like. Saving this order will allow them to automatically appear in this order when starting a race. Or, you can reset to the Torn default.

#### **_Torn Gym Gains_**

- [Torn Gym Gains.user.js](https://github.com/edlau2/Tampermonkey/raw/master/GymGains/Torn%20Gym%20Gains.user.js)

Images:

![Torn Gym Gains-1.png](https://github.com/edlau2/Tampermonkey/blob/master/GymGains/Torn%20Gym%20Gains-1.png)
![Torn Gym Gains-2.png](https://github.com/edlau2/Tampermonkey/blob/master/GymGains/Torn%20Gym%20Gains-2.png)

This script adds extended gym information to your Gym page. It displays the additional gains you get, depending on what perks are currently available to you - company perks, merits, fac perks, etc. These are displayed, by default, as a summary in percentage, along with the base gym gain that depends on the current gym you are in, 2.0 through 10.0. An expandle screen is available to see the breakout of the percentage gains. It also has a panel that displays bat stats - base, extended, current (takes Xanax into consideration, for example) and extended with vico. (Note to self: add screen shot here)

#### **_Torn User List Extender v2_**

- [Torn User List Extender v2.user.js](https://github.com/edlau2/Tampermonkey/raw/master/UserListExtender/Torn%20User%20List%20Extender%20v2.user.js)

Images:

- [Torn User List Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/UserListExtender/Torn%20User%20List%20Extender.png)

This script adds rank next to the level in the User List, as seen when searching for users. The goal was to make it easier to more quickly decide what targets to attack, without having to inspect the user individually. It helps to quickly determine who may be level holding. Of course, you may want to still look at things such as Xanax or SE's used, that is up to you (see 'Torn Adv Mini Profile'!).


