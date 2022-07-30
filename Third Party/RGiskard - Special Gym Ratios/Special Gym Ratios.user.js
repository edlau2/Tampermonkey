// ==UserScript==
// @name         Special Gym Ratios
// @namespace    RGiskard.hanksRatio
// @version      2.3.1
// @description  Monitors battle stat ratios and provides warnings if they approach levels that would preclude access to special gyms
// @author       RGiskard [1953860], assistance by Xiphias [187717]
// @match        *.torn.com/gym.php*
// @require      http://code.jquery.com/jquery-latest.js
// @grant        none
// ==/UserScript==

/*eslint no-multi-spaces: 0*/
/*e s l i n t no-undef: 0*/

// Based off of Torn Gym Pony by Zanoab (http://puu.sh/jFtro/1af393771e.user.js).

// A second method, "Baldr's Ratio", is in this code, but the ability to select it has been
// deliberately excluded for public release. This has been done for clarity, as there is
// no accompanying information about what this ratio is. Those who would like to use it,
// which unlocks a specialty gym that is one of the same stats as a combo gym
// (e.g.: Frontline Fitness (str/spd) and Gym 3000 (str), can uncomment the lines of code
// adding those options to $specialistGymBuild.

// Suppress JQuery's use of '$' in this scope.
jQuery.noConflict(true)(document).ready(function($) {

    // Maximum amount below the stat limit another stat can be before we start warning the player.
    let statSafeDistance = localStorage.statSafeDistance;
    if (statSafeDistance === null) {
        statSafeDistance = 1000000;
    }
	
    // Global vars
    let noBuildKeyValue = {value: 'none', text: 'No specialty gyms'};
    let defenseDexterityGymKeyValue = {value: 'balboas', text: 'Defense and dexterity specialist',
                                       stat1: 'defense', stat2: 'dexterity', secondarystat1: 'strength', secondarystat2: 'speed'};
    let strengthSpeedGymKeyValue = {value: 'frontline', text: 'Strength and speed specialist',
                                    stat1: 'strength', stat2: 'speed', secondarystat1: 'defense', secondarystat2: 'dexterity'};
    let strengthComboGymKeyValue = {value: 'frontlinegym3000', text: 'Strength combo specialist (Baldr\'s Ratio)', stat: 'strength', combogym: strengthSpeedGymKeyValue};
    let defenseComboGymKeyValue = {value: 'balboasisoyamas', text: 'Defense combo specialist (Baldr\'s Ratio)', stat: 'defense', combogym: defenseDexterityGymKeyValue};
    let speedComboGymKeyValue = {value: 'frontlinetotalrebound', text: 'Speed combo specialist (Baldr\'s Ratio)', stat: 'speed', combogym: strengthSpeedGymKeyValue};
    let dexterityComboGymKeyValue = {value: 'balboaselites', text: 'Dexterity combo specialist (Baldr\'s Ratio)', stat: 'dexterity', combogym: defenseDexterityGymKeyValue};
    let strengthGymKeyValue = {value: 'gym3000', text: 'Strength specialist (Hank\'s Ratio)', stat: 'strength', combogym: defenseDexterityGymKeyValue};
    let defenseGymKeyValue = {value: 'isoyamas', text: 'Defense specialist (Hank\'s Ratio)', stat: 'defense', combogym: strengthSpeedGymKeyValue};
    let speedGymKeyValue = {value: 'totalrebound', text: 'Speed specialist (Hank\'s Ratio)', stat: 'speed', combogym: defenseDexterityGymKeyValue};
    let dexterityGymKeyValue = {value: 'elites', text: 'Dexterity specialist (Hank\'s Ratio)', stat: 'dexterity', combogym: strengthSpeedGymKeyValue};
    
	let oldTotal = 0;
    let oldBuild = '';

    let $specialistGymBuild = null; // The UI

    // Function declarations
    function cleanNumber(a) {
		return Number(a.replace(/[$,]/g, "").trim());
	};

    function GetStoredGymKeyValuePair() {
        if (localStorage.specialistGymType == defenseDexterityGymKeyValue.value) return defenseDexterityGymKeyValue;
        if (localStorage.specialistGymType == strengthSpeedGymKeyValue.value) return strengthSpeedGymKeyValue;
        if (localStorage.specialistGymType == strengthComboGymKeyValue.value) return strengthComboGymKeyValue;
        if (localStorage.specialistGymType == defenseComboGymKeyValue.value) return defenseComboGymKeyValue;
        if (localStorage.specialistGymType == speedComboGymKeyValue.value) return speedComboGymKeyValue;
        if (localStorage.specialistGymType == dexterityComboGymKeyValue.value) return dexterityComboGymKeyValue;
        if (localStorage.specialistGymType == strengthGymKeyValue.value) return strengthGymKeyValue;
        if (localStorage.specialistGymType == defenseGymKeyValue.value) return defenseGymKeyValue;
        if (localStorage.specialistGymType == speedGymKeyValue.value) return speedGymKeyValue;
        if (localStorage.specialistGymType == dexterityGymKeyValue.value) return dexterityGymKeyValue;
        return noBuildKeyValue;
    }

    function buildUI() {
        let $hanksRatioDiv = $('<div></div>');
        let $titleDiv = $('<div>', {'class': 'title-black top-round', 'aria-level': '5', 'text': 'Special Gym Ratios'})
            .css('margin-top', '10px');
        $hanksRatioDiv.append($titleDiv);
        let $bottomDiv = $('<div class="bottom-round gym-box cont-gray p10"></div>');
        $bottomDiv.append($('<p class="sub-title">Select desired specialist build:</p>'));
        $specialistGymBuild = $('<select>', {'class': 'vinkuun-enemeyDifficulty'}).css('margin-top', '10px').on('change', function() {
            localStorage.specialistGymType = $specialistGymBuild.val();
        });
        $specialistGymBuild.append($('<option>', noBuildKeyValue));
        $specialistGymBuild.append($('<option>', defenseDexterityGymKeyValue));
        $specialistGymBuild.append($('<option>', strengthSpeedGymKeyValue));
        $specialistGymBuild.append($('<option>', strengthComboGymKeyValue));
        $specialistGymBuild.append($('<option>', defenseComboGymKeyValue));
        $specialistGymBuild.append($('<option>', speedComboGymKeyValue));
        $specialistGymBuild.append($('<option>', dexterityComboGymKeyValue));
        $specialistGymBuild.append($('<option>', strengthGymKeyValue));
        $specialistGymBuild.append($('<option>', defenseGymKeyValue));
        $specialistGymBuild.append($('<option>', speedGymKeyValue));
        $specialistGymBuild.append($('<option>', dexterityGymKeyValue));
        localStorage.specialistGymType = GetStoredGymKeyValuePair().value;  // In case there is bad data, replace it.
        $specialistGymBuild.val(GetStoredGymKeyValuePair().value);
        $bottomDiv.append($specialistGymBuild);
        $hanksRatioDiv.append($bottomDiv);
        $('#gymroot').append($hanksRatioDiv);
    }

    /**
     * Formats a number into an abbreviated string with an appropriate trailing descriptive unit
     * up to 't' for trillion.
     * @param {float} number the number to be formatted
     * @param {int} maxFractionDigits the maximum number of fractional digits to display
     * @returns a string representing the number, abbreviated if appropriate
     **/
    function FormatAbbreviatedNumber(number, maxFractionDigits) {
        let abbreviations = [];
        abbreviations[0] = '';
        abbreviations[1] = 'k';
        abbreviations[2] = 'm';
        abbreviations[3] = 'b';
        abbreviations[4] = 't';

        let outputNumber = number;
        let abbreviationIndex = 0;
        for (; outputNumber >= 1000 && abbreviationIndex < abbreviations.length; ++abbreviationIndex) {
            outputNumber = outputNumber / 1000;
        }

        return outputNumber.toLocaleString('EN', { maximumFractionDigits : maxFractionDigits }) + abbreviations[abbreviationIndex];
    };

    function getStats($doc) {
        let ReplaceStatValueAndReturnCleanNumber = function(elementId) {
            let $statTotalElement = $doc.find('#' + elementId);
            if ($statTotalElement.size() === 0) throw 'No element found with id "' + elementId + '".';
            let numericalValue = cleanNumber($statTotalElement.text());
            return numericalValue;
        };
		$doc = $($doc || document);
		return {
			strength: ReplaceStatValueAndReturnCleanNumber('strength-val'),
			defense: ReplaceStatValueAndReturnCleanNumber('defense-val'),
			speed: ReplaceStatValueAndReturnCleanNumber('speed-val'),
			dexterity: ReplaceStatValueAndReturnCleanNumber('dexterity-val'),
		};
	};

    String.prototype.capitalizeFirstLetter = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    function GetStatAbbreviation(statString) {
        if (statString == 'strength') {
            return 'str';
        } else if (statString == 'defense') {
            return 'def';
        } else if (statString == 'speed') {
            return 'spd';
        } else if (statString == 'dexterity') {
            return 'dex';
        }
        return statString;
    }

    buildUI();
	setInterval(function() {
		let stats = getStats();
		let total = 0;
        let highestSecondaryStat = 0;
		for (let stat in stats) {
            total += stats[stat];
            if (GetStoredGymKeyValuePair().stat && GetStoredGymKeyValuePair().stat != stat && stats[stat] > highestSecondaryStat) {
                highestSecondaryStat = stats[stat];
            }
        }
        let currentBuild = $specialistGymBuild.val();
        
        if (oldTotal == total && oldBuild == currentBuild && $('.gymstatus').size() != 0) {
            return;
        }
        
        let $statContainers = $('[class^="gymContent__"], [class*=" gymContent__"]').find('li');

        if (currentBuild == noBuildKeyValue.value) {
            // Clear the training info in case it exists.
            $statContainers.each(function(index, element) {
                let $statInfoDiv = $(element).find('[class^="description__"], [class*=" description__"]');
                let $insertedElement = $statInfoDiv.find('.gymstatus');
                $insertedElement.remove();
            });
            return;
        }
        
        let isComboGymOnlyRatio = (
            localStorage.specialistGymType == defenseDexterityGymKeyValue.value ||
            localStorage.specialistGymType == strengthSpeedGymKeyValue.value);
        let isComboGymCombinedRatio = (
            localStorage.specialistGymType == strengthComboGymKeyValue.value ||
            localStorage.specialistGymType == defenseComboGymKeyValue.value ||
            localStorage.specialistGymType == speedComboGymKeyValue.value ||
            localStorage.specialistGymType == dexterityComboGymKeyValue.value);
        let isSingleGymRatio = (
            localStorage.specialistGymType == strengthGymKeyValue.value ||
            localStorage.specialistGymType == defenseGymKeyValue.value ||
            localStorage.specialistGymType == speedGymKeyValue.value ||
            localStorage.specialistGymType == dexterityGymKeyValue.value);

        // The combined total of the primary stats must be 25% higher than the total of the secondary stats.
        let minPrimaryComboSum = 0;    // The minimum amount the combined primary stats must be to unlock the gym based on the secondary stat sum.
        let maxSecondaryComboSum = 0;  // The maximum amount the combined secondary stats must be to unlock the gym based on the primary stat sum.
        // The primary stat needs to be 25% higher than the second highest stat.
        let minPrimaryStat = 0;
        let maxSecondaryStat = 0;
        let comboGymKeyValuePair = noBuildKeyValue;
        let primaryGymKeyValuePair = noBuildKeyValue;
        if (isComboGymOnlyRatio) {
            comboGymKeyValuePair = GetStoredGymKeyValuePair();
        } else if (isComboGymCombinedRatio || isSingleGymRatio) {
            primaryGymKeyValuePair = GetStoredGymKeyValuePair();
            comboGymKeyValuePair = primaryGymKeyValuePair.combogym;
            minPrimaryStat = highestSecondaryStat * 1.25;
            maxSecondaryStat = stats[primaryGymKeyValuePair.stat] / 1.25;
        } else {
            console.debug('Somehow attempted to calculate stat requirements for invalid gym: ' + GetStoredGymKeyValuePair());
            return;
        }
        minPrimaryComboSum = (stats[comboGymKeyValuePair.secondarystat1] + stats[comboGymKeyValuePair.secondarystat2]) * 1.25;
        maxSecondaryComboSum = (stats[comboGymKeyValuePair.stat1] + stats[comboGymKeyValuePair.stat2]) / 1.25;
        
        let distanceFromComboGymMin = minPrimaryComboSum - stats[comboGymKeyValuePair.stat1] - stats[comboGymKeyValuePair.stat2];
        let distanceToComboGymMax = maxSecondaryComboSum - stats[comboGymKeyValuePair.secondarystat1] - stats[comboGymKeyValuePair.secondarystat2];

        $statContainers.each(function(index, element) {
            let $element = $(element);
            let title = $element.find('[class^="title__"], [class*=" title__"]');
            let stat = $element.attr('zStat');
            if (!stat) {
                stat = title.text().toLowerCase();
                $element.attr('zStat', stat);
            }
            if (stats[stat]) {
                let gymStatus;
                let statIdentifierString;
                if (isComboGymOnlyRatio) {
                    if (stat == comboGymKeyValuePair.stat1 || stat == comboGymKeyValuePair.stat2) {
                        statIdentifierString = GetStatAbbreviation(comboGymKeyValuePair.stat1).capitalizeFirstLetter() +
                            ' + ' + GetStatAbbreviation(comboGymKeyValuePair.stat2);
                        if (distanceFromComboGymMin > 0) {
                            gymStatus = '<span class="gymstatus t-red bold">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(distanceFromComboGymMin, 1) + ' too low!</span>';
                        } else if (distanceFromComboGymMin < statSafeDistance) {
                            gymStatus = '<span class="gymstatus t-red bold">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(-distanceFromComboGymMin, 1) + ' above the limit.</span>';
                        } else {
                            gymStatus = '<span class="gymstatus t-green">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(-distanceFromComboGymMin, 1) + ' above the limit.</span>';
                        }
                    } else {
                        statIdentifierString = GetStatAbbreviation(comboGymKeyValuePair.secondarystat1).capitalizeFirstLetter() +
                            ' + ' + GetStatAbbreviation(comboGymKeyValuePair.secondarystat2);
                        if (distanceToComboGymMax < 0) {
                            gymStatus = '<span class="gymstatus t-red bold">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(-distanceToComboGymMax, 1) + ' too high!</span>';
                        } else if (distanceToComboGymMax < statSafeDistance) {
                            gymStatus = '<span class="gymstatus t-red bold">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(distanceToComboGymMax, 1) + ' below the limit.</span>';
                        } else {
                            gymStatus = '<span class="gymstatus t-green">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(distanceToComboGymMax, 1) + ' below the limit.</span>';
                        }
                    }
                } else {
                    let distanceFromSpecialistGymMin = minPrimaryStat - stats[stat];
                    let distanceToSpecialistGymMax = maxSecondaryStat - stats[stat];
                    
                    let distanceToMax = 0;
                    statIdentifierString = stat.capitalizeFirstLetter();
                    if (stat == primaryGymKeyValuePair.stat) {
                        if (distanceFromSpecialistGymMin <= 0) {
                            if (isSingleGymRatio) {
                                // Specialist stat for Hank's Gym Ratio is never one of the primary combo stats.
                                // Only set the identifier if we don't already know this stat is too low to unlock its own specific gym.
                                distanceToMax = distanceToComboGymMax;
                                if (distanceToMax < 0) {
                                    statIdentifierString = GetStatAbbreviation(comboGymKeyValuePair.secondarystat1).capitalizeFirstLetter() +
                                        ' + ' + GetStatAbbreviation(comboGymKeyValuePair.secondarystat2);
                                }
                            } else {
                                // Specialist stat IS the combo stat; we only care to show how it's doing in relation to the specialist gym.
                                distanceToMax = distanceFromSpecialistGymMin;
                            }
                        }
                    } else if (stat == comboGymKeyValuePair.stat1 || stat == comboGymKeyValuePair.stat2) {
                        // We don't have to worry about this stat going too high for the combo gym.
                        distanceToMax = distanceToSpecialistGymMax;
                    } else {
                        // This stat is neither the primary stat nor a combo gym stat, so it's limited by both.
                        distanceToMax = Math.min(distanceToSpecialistGymMax, distanceToComboGymMax);
                        if (distanceToComboGymMax < distanceToSpecialistGymMax && distanceToMax < 0) {
                            statIdentifierString = GetStatAbbreviation(comboGymKeyValuePair.secondarystat1).capitalizeFirstLetter() +
                                ' + ' + GetStatAbbreviation(comboGymKeyValuePair.secondarystat2);
                        }
                    }
                    
                    if (stat == primaryGymKeyValuePair.stat) {
                        console.debug(stat + ' distanceFromSpecialistGymMin: ' + distanceFromSpecialistGymMin);
                        console.debug(stat + ' distanceToComboGymMax: ' + distanceToComboGymMax);
                    } else if (stat == comboGymKeyValuePair.stat1 || stat == comboGymKeyValuePair.stat2) {
                        console.debug(stat + ' distanceToSpecialistGymMax: ' + distanceToSpecialistGymMax);
                        console.debug(stat + ' distanceFromComboGymMin: ' + distanceFromComboGymMin);
                    } else {
                        console.debug(stat + ' distanceToSpecialistGymMax: ' + distanceToSpecialistGymMax);
                        console.debug(stat + ' distanceToComboGymMax: ' + distanceToComboGymMax);
                    }
                    console.debug(stat + ' distanceToMax: ' + distanceToMax);
                    
                    if (stat == primaryGymKeyValuePair.stat && distanceFromSpecialistGymMin > 0) {
                        gymStatus = '<span class="gymstatus t-red bold">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(distanceFromSpecialistGymMin, 1) + ' too low!</span>';
                    } else if (distanceToMax < 0) {
                        if (stat == primaryGymKeyValuePair.stat && isComboGymCombinedRatio) {
                            gymStatus = '<span class="gymstatus t-green">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(-distanceToMax, 1) + ' above the limit.</span>';
                        } else {
                            gymStatus = '<span class="gymstatus t-red bold">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(-distanceToMax, 1) + ' too high!</span>';
                        }
                    } else if (distanceToMax < statSafeDistance) {
                        gymStatus = '<span class="gymstatus t-red bold">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(distanceToMax, 1) + ' below the limit.</span>';
                    } else {
                        gymStatus = '<span class="gymstatus t-green">' + statIdentifierString + ' is ' + FormatAbbreviatedNumber(distanceToMax, 1) + ' below the limit.</span>';
                    }
                }

                let $statInfoDiv = $element.find('[class^="description__"], [class*=" description__"]');
                let $insertedElement = $statInfoDiv.find('.gymstatus');
                $insertedElement.remove();
                $statInfoDiv.append(gymStatus);
            }
        });
        oldTotal = total;
        oldBuild = currentBuild;
        console.debug("Stat spread updated!");
	}, 400);
});

