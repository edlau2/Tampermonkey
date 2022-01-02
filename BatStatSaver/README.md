## Torn Bat Stat Saver

This file runs when attacking. It will save the results of an attack (if successful), namely, opponent info and your info - your bat stat score, and use this info to calculate the opponents estimated bat stats.

It uses the Fair Fight formula, found here: 

Fair fights
The fair fight (FF) multiplier ranges between 1x and 3x and is applied for attacking a target with battle stats that are similar to your own. The simplified mechanics are as follows:

Attacking someone with roughly 50% of your total battle stats or higher yields a FF of 3x (1)
The lower a target's battle stats are compared to yours, the more the FF multiplier tends toward 1x
Players hitting anyone with a battle stat score higher than the player with the top 1000th battle stats will receive a full FF of 3x
For a more comprehensive understanding JTS (Journal of Torn Science)[1] derived the formulas behind the fair fight mechanic as follows:

The Fair-Fight multiplier is solely contingent upon the battle stats of both you and your opponent. Each player has their own battle stat score (BS Score).
[BS score](https://github.com/edlau2/Tampermonkey/blob/master/BatStatSaver/BatStatScoreFormula.jpeg)

The battle stat score for the attack and defender is therefore used in the calculation of the fair fight ratio (FF).
[FF Ratio](https://cdn.discordapp.com/attachments/784118895366635561/891239901301993482/image0.jpg)
