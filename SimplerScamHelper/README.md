# Torn Simpler Scam Range Helper
This script was originally wtitten to show the predictions of where you would land when scamming, before clicking the 'commit' button. 
Then I finished the edu before I finished the script, and had a way to easily see if my predictions matched what the Torn predictor displayed,
and found a much easier way to do a lot of the things the script was doing, it used to intercept Torn result messages to gather data to
see how accurate I was. This version no longer does that, but did evolve to do a lot of other things. Which although features were added, in general 
it became 'simple', internally, hence the title change.

Installation link:
- [Torn Simpler Scam Range Helper-2.0](https://github.com/edlau2/Tampermonkey/raw/refs/heads/master/SimplerScamHelper/Torn%20Simpler%20Scam%20Range%20Helper-2.0.user.js)

Eventually I will document all the options, some may have tool tip help already. Until then, here is an overview:

When you click on the 'accelerate' button, it will now show you where the accelerated movement option - fast forward, slow forward,
or backwards - would place you once commited.

You can right-click the accel button and get a menu to select 1-5 accelerations and see where that would put you.

It has all sorts of options such as hiding the banner bar, displaying minimal results, or none, to speed things up. If 'no result' display is
selected, it can show your payout at the top of the screen. It can show your current CS at the top, and the instantaneous CS gain or loss
after each commit. It can warn if clicking commit may put you in a red zone (critical fail). Note that I may have broken this feature in  the
current release, 2.11, but will fix soon.

Some examples of what it looks like. This is the main window at the top, note the tooltip indicating what
clickin the small little 'halo' does.

![Main Window](https://github.com/edlau2/Tampermonkey/blob/master/SimplerScamHelper/main-window-no-banner.png)

Options screen you see when you right-click the halo:

![Options](https://github.com/edlau2/Tampermonkey/blob/master/SimplerScamHelper/Options.png)

The prediction - mine is the magenta bar, Torn's is the white one:

![Prediction](https://github.com/edlau2/Tampermonkey/blob/master/SimplerScamHelper/sample-prediction.png)

A prediction with acceleration, the cyan bar:

![Acceleration](https://github.com/edlau2/Tampermonkey/blob/master/SimplerScamHelper/sample-accel.png)

The menu to allow you to see where additional acceleration will put you. That pops up when
you have selected the accel button, and then right-click it.

![More-Acceleration](https://github.com/edlau2/Tampermonkey/blob/master/SimplerScamHelper/accel-option.png)

After capitalizing (commiting and getting paid) with the option to hide all outcomes will show this at the top.
Note I got .02 CS

![More-Acceleration](https://github.com/edlau2/Tampermonkey/blob/master/SimplerScamHelper/after-commit.png)

There's a 'funky bubble' option which fades in a little bubble showing your gain, same as the green number at the top:

![More-Acceleration](https://github.com/edlau2/Tampermonkey/blob/master/SimplerScamHelper/funky-bubble.png)


# Installation

Simply click this link:

- [Torn Simpler Scam Range Helper-2.0](https://github.com/edlau2/Tampermonkey/raw/refs/heads/master/SimplerScamHelper/Torn%20Simpler%20Scam%20Range%20Helper-2.0.user.js)



