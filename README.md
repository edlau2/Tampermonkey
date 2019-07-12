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

Note that the PNG files are not part of the installation, they are simple screenshots showing what to expect when the script is run.

**Torn Latest Attacks Extender**

- [Torn Latest Attacks Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Latest%20Attacks%20Extender.user.js)

Images:

- [Torn Latest Attacks Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Latest%20Attacks%20Extender.png)
- [Torn Latest Attacks Extender 2.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Latest%20Attacks%20Extender%202.png)
- [Torn Latest Attacks Extender 3.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Latest%20Attacks%20Extender%203.png)

This script adds an extended 'latest attacks' screen to your home page. It is configurable and allows you to display up to 100 of the latest attacks, and adds attacking (or attacked) faction name and respect earned. Your API Key is required, as this uses the Torn API so is completely legal. You key is never shared. Before first use, the configuration dialog should appear asking for your key.

**Torn Numeric Rank Display**

- [Torn Numeric Rank Display.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Numeric%20Rank%20Display.user.js)

Images:

- [Torn Numeric Rank Display.png](https://github.com/edlau2/Tampermonkey/blob/master/Torn%20Numeric%20Rank%20Display.png)

This simple script appends a user's rank number next to the rank in the User Information section of a user's profile. I find it easier than scrolling down to look at the rank that is also displayed in the Medals section. This script also highlights using the MutationObserver object, so that chages are made only when the relevant DOM has been loaded.

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

These scripts aren't mine, just here for easy access by fac mates

- [TORN- High-Low Helper.user.js](https://github.com/edlau2/Tampermonkey/blob/master/TORN-%20High-Low%20Helper.user.js)

Helper to assist in getting the Hi/Lo merit. Simply picks the best choice via odds, worked for me, but not infallable. Took me about 20 minutes and maybe 100 or 120 tokens. Makes it a lot easier, though. Just click click click your way through it.
