## Torn Retal Watcher

[installation link](https://github.com/edlau2/Tampermonkey/raw/master/RetalWatcher/Torn%20Retal%20Watcher.user.js)

This runs if the chain watching page is open: https://www.torn.com/factions.php?step=your#/war/chain <br>
It will pop up a notification on an inbound attack that results in a loss.<br>

![Sample Notification](https://github.com/edlau2/Tampermonkey/blob/master/RetalWatcher/notification.png)

1. The notification by default stays there for 10 seconds (configurable), unless you click 'close', or click the notification itself.

2. Clicking the notification brings up the attacker's profile in a new tab.

3. There are a few options in the script, hard-coded, that you can change, using the Tampermonkey Script Editor.

  - const NOTIFY_TIMEOUT_SECS = 10; // Seconds a notification will stay up, in seconds.

  - const DEV_MODE = true; // true for additional logging and test link on top of page. 

    Adds a link that looks like this, just for debugging: <br>
    
    ![](https://github.com/edlau2/Tampermonkey/blob/master/RetalWatcher/mini-ui2.png)

    Clicking it forces a notification, wether it's a win or a loss (but not stealthed or an assist). The option also controls the logging level, if true, much more verbose.
    
4. The checkbox, Retals Only, defaults to checked, and if unchecked, will notify for wins and losses, in any mode (DEV_MODE or not). DEV_MODE, by itself, does not notify on wins. This is also designed as a debugging aid only.
