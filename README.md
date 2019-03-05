# Tampermonkey
Repository for TamperMonkey scripts

# Installation

1. Install Tampermonkey
2. Select a script in this repo that you wish to use. View the file and click the Raw button at the top of the file to view its source
3. Copy the source
4. Open Tampermonkey in your browser and click the Add Script tab (icon with a plus symbol)
5. Paste the source into the script window and hit save
6. Viola!

# Scripts 

Note that the PNG files are not part of the installation, they are simple screenshots showing what to expect when the script is run.

- [Attack Log Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Attack%20Log%20Extender.user.js)
- [Attack Log Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/Attack%20Log%20Extender.png)

This script adds an extended 'latest attacks' screen to your home page. It is configurable and allows you to display up to 100 of the latest attacks, and adds attacking (or attacked) faction name and respect earned. Your API Key is required, as this uses the Torn API so is completely legal. You key is never shared. Before first use, the configuration dialog should appear asking for your key.

- [Numeric Rank Display.user.js](https://github.com/edlau2/Tampermonkey/blob/master/Numeric%20Rank%20Display.user.js)
- [Numeric Rank Display.png](https://github.com/edlau2/Tampermonkey/blob/master/Numeric%20Rank%20Display.png)

This simple script appends a user's rank number next to the rank in the User Information section of a user's profile. I find it easier than scrolling down to look at the rank that is also displayed in the Medals section. This script also highlights using the MutationObserver object, so that chages are made only when the relevant DOM has been loaded.

- [User List Extender.user.js](https://github.com/edlau2/Tampermonkey/blob/master/User%20List%20Extender.user.js)
- [User List Extender.png](https://github.com/edlau2/Tampermonkey/blob/master/User%20List%20Extender.png)

This script adds rank next to the level in the User List, as seen when searching for users. The goal was to make it easier to more quickly decide what targets for an attack, without having to inspect the user individually. It helps to quickly determine who may be level holding. Of course, you may want to still look at things such as Xanax or SE's used, that is up to you.
