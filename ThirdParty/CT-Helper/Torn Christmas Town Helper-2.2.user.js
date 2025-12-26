// ==UserScript==
// @name         Torn Christmas Town Helper
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Auto-run movement and present highlighting for Christmas Town
// @author       Getty111 [3955428]
// @contributor  Claude did most of the work.
// @homepageURL  https://www.torn.com/profiles.php?XID=3955428
// @license      MIT
// @match        https://www.torn.com/christmas_town.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/559547/Torn%20Christmas%20Town%20Helper.user.js
// @updateURL https://update.greasyfork.org/scripts/559547/Torn%20Christmas%20Town%20Helper.meta.js
// ==/UserScript==

(function() {
    'use strict';

    let isAutoRunning = false;
    let autoRunInterval = null;
    let currentDirection = null;
    let statusDiv = null;
    let audioContext = null;
    let arrowDiv = null;
    let activeItems = new Map(); // Track items and their positions

    // Movement speed in ms (lower = faster, but don't go too fast or server might reject)
    const MOVE_INTERVAL = 200;

    // Direction mappings - class names on the li elements
    const DIRECTIONS = {
        'top': { angle: -90, range: 22.5 },
        'right-top': { angle: -45, range: 22.5 },
        'right': { angle: 0, range: 22.5 },
        'right-bottom': { angle: 45, range: 22.5 },
        'bottom': { angle: 90, range: 22.5 },
        'left-bottom': { angle: 135, range: 22.5 },
        'left': { angle: 180, range: 22.5 },
        'left-top': { angle: -135, range: 22.5 }
    };

    function addGlobalStyle(css) {
        const head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    function init() {
        console.log('[CT Helper] Initializing Christmas Town Helper...');

        // Load saved settings
        loadSettings();

        addGlobalStyle(`
            .cncl-btn {
                width: 16px;
                height: 16px;
                border-radius: 16px;
                background-color: red;
                position: relative;
                cursor: pointer;
                display: flex;
                flex-flow: row wrap;
                align-content: center;
                justify-content: center;
            }
            .cncl-wrap {
                display: flex;
                justify-content: space-between;
            }
            .bg-green { background-color: green; }
        `);

        // Wait for the map to load
        waitForElement('#user-map', (mapElement) => {
            console.log('[CT Helper] Map found, setting up...');
            createStatusDisplay();
            applySettingsToUI();
            setupMapClickHandler(mapElement);
            setupPresentHighlighting();
            setupKeyboardShortcuts();
            initAudio();
            watchInventory();
            watchStatusMessages();
        });
    }

    function applySettingsToUI() {
        // Apply sound setting
        const hotkeyM = document.getElementById('ct-hotkey-m');
        if (hotkeyM) {
            hotkeyM.style.color = soundEnabled ? '#00ff00' : '#ff4444';
        }
        const volumeSlider = document.getElementById('ct-volume-slider');
        if (volumeSlider) {
            volumeSlider.value = soundVolume * 100;
        }

        // Apply arrow setting
        const hotkeyP = document.getElementById('ct-hotkey-p');
        if (hotkeyP) {
            hotkeyP.style.color = arrowEnabled ? '#00ff00' : '#ff4444';
        }

        // Apply highlights setting
        if (highlightsEnabled) {
            document.body.classList.add('ct-helper-highlight-items');
        } else {
            document.body.classList.remove('ct-helper-highlight-items');
        }
        const hotkeyH = document.getElementById('ct-hotkey-h');
        if (hotkeyH) {
            hotkeyH.style.color = highlightsEnabled ? '#00ff00' : '#ff4444';
        }
    }

    function waitForElement(selector, callback, maxAttempts = 50) {
        let attempts = 0;
        const check = () => {
            const element = document.querySelector(selector);
            if (element) {
                callback(element);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(check, 200);
            } else {
                console.log('[CT Helper] Element not found:', selector);
            }
        };
        check();
    }

    var autoRunCancelled = false;
    function handleCancel(e) {
        console.log("[CT Helper] handleCancel");
        let elements = document.getElementsByClassName("cncl-btn");
        let button = elements[0];
        button.classList.toggle('bg-green');
        autoRunCancelled = !autoRunCancelled;

        if (autoRunCancelled == true) {
            const elementToRemove = document.getElementById('ct-click-overlay');
            if (elementToRemove) {
                elementToRemove.remove();
            }
        } else {
            const element = document.querySelector('#user-map');
            setupMapClickHandler(element);
        }
    }

    function handleHighlights() {
        highlightsEnabled = !highlightsEnabled;
        document.body.classList.toggle('ct-helper-highlight-items', highlightsEnabled);
        console.log('[CT Helper] Highlighting:', highlightsEnabled ? 'ON' : 'OFF');
        const hotkeyH = document.getElementById('ct-hotkey-h');
        if (hotkeyH) {
            hotkeyH.style.color = highlightsEnabled ? '#00ff00' : '#ff4444';
        }
        saveSettings();
    }

    function createStatusDisplay() {
        statusDiv = document.createElement('div');
        statusDiv.id = 'ct-helper-status';
        statusDiv.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 99999;
            border: 1px solid #00ff00;
            min-width: 150px;
            margin-top: 90px;
        `;
        statusDiv.innerHTML = `
            <div style="position: relative;">
                <div style="position: absolute; top: 0; right: 0; width: 24px; height: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 2px; cursor: pointer;" id="ct-corner-selector" title="Click to move panel">
                    <div class="ct-corner" data-corner="top-left" style="width: 10px; height: 10px; border: 1px solid #888; border-radius: 2px;"></div>
                    <div class="ct-corner" data-corner="top-right" style="width: 10px; height: 10px; border: 1px solid #888; border-radius: 2px;"></div>
                    <div class="ct-corner" data-corner="bottom-left" style="width: 10px; height: 10px; border: 1px solid #888; border-radius: 2px;"></div>
                    <div class="ct-corner" data-corner="bottom-right" style="width: 10px; height: 10px; border: 1px solid #888; border-radius: 2px;"></div>
                </div>
                <div style="margin-bottom: 5px; font-weight: bold; color: #ffcc00;">🎄 CT Helper</div>
            </div>
            <div>Status: <span id="ct-status-text">Idle</span></div>
            <div>Direction: <span id="ct-direction-text">-</span></div>
            <div style="margin-top: 8px; font-size: 10px;">
                Click map to auto-run<br>
                Click again to stop<br>
                <span id="ct-hotkey-h" style="color: #00ff00; cursor: pointer;">[H] Highlights</span><br>
                <span id="ct-hotkey-m" style="color: #ff4444; cursor: pointer;">[M] Sound</span>
                <input type="range" id="ct-volume-slider" min="0" max="100" value="30"
                    style="width: 50px; height: 10px; vertical-align: middle; margin-left: 5px; cursor: pointer;"
                    title="Volume"><br>
                <span id="ct-hotkey-p" style="color: #00ff00; cursor: pointer;">[P] Arrow</span><br>
                <div class="cncl-wrap"><span style="color: #888;">[Space] Stop</span><span class="cncl-btn">X</span></div>
            </div>
        `;
        document.body.appendChild(statusDiv);

        let elements = document.getElementsByClassName("cncl-btn");
        let button = elements[0];
        if (button) {
            button.addEventListener("click", handleCancel);
        }
        button = document.getElementById("ct-hotkey-h");
        if (button) {
            button.addEventListener("click", handleHighlights);
        }
        button = document.getElementById("ct-hotkey-m");
        if (button) {
            button.addEventListener("click", toggleSound);
        }
        button = document.getElementById("ct-hotkey-p");
        if (button) {
            button.addEventListener("click", toggleArrow);
        }

        // Setup corner selector
        setupCornerSelector();

        // Create arrow indicator
        createArrowIndicator();

        // Setup volume slider
        const volumeSlider = document.getElementById('ct-volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                soundVolume = e.target.value / 100;
                console.log('[CT Helper] Volume:', Math.round(soundVolume * 100) + '%');
            });
            // Test sound on change and save
            volumeSlider.addEventListener('change', () => {
                saveSettings();
                if (soundEnabled) {
                    playBing();
                }
            });
        }
    }

    function createArrowIndicator() {
        arrowDiv = document.createElement('div');
        arrowDiv.id = 'ct-helper-arrow';
        arrowDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            pointer-events: none;
            z-index: 999;
            display: none;
        `;
        arrowDiv.innerHTML = `
            <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; filter: drop-shadow(0 0 3px #000);">
                <polygon points="50,10 90,90 50,70 10,90" fill="#00ff00" stroke="#003300" stroke-width="3"/>
            </svg>
            <div id="ct-arrow-distance" style="
                position: absolute;
                bottom: -15px;
                left: 50%;
                transform: translateX(-50%);
                color: #00ff00;
                font-family: monospace;
                font-size: 10px;
                text-shadow: 0 0 3px #000;
                white-space: nowrap;
            "></div>
        `;

        // Add to map container instead of body
        waitForElement('.user-map-container', (mapContainer) => {
            mapContainer.style.position = 'relative';
            mapContainer.appendChild(arrowDiv);
            console.log('[CT Helper] Arrow added to map container');
        });
    }

    function setupCornerSelector() {
        // Set initial position
        updatePanelPosition();

        // Highlight current corner
        updateCornerHighlight();

        // Add click handlers
        const corners = document.querySelectorAll('.ct-corner');
        corners.forEach(corner => {
            corner.addEventListener('click', (e) => {
                e.stopPropagation();
                panelCorner = corner.dataset.corner;
                updatePanelPosition();
                updateCornerHighlight();
                saveSettings();
                console.log('[CT Helper] Panel moved to:', panelCorner);
            });

            // Hover effect
            corner.addEventListener('mouseenter', () => {
                corner.style.background = '#666';
            });
            corner.addEventListener('mouseleave', () => {
                if (corner.dataset.corner !== panelCorner) {
                    corner.style.background = 'transparent';
                }
            });
        });
    }

    function updatePanelPosition() {
        if (!statusDiv) return;

        // Reset all positions
        statusDiv.style.top = 'auto';
        statusDiv.style.bottom = 'auto';
        statusDiv.style.left = 'auto';
        statusDiv.style.right = 'auto';

        switch(panelCorner) {
            case 'top-left':
                statusDiv.style.top = '10px';
                statusDiv.style.left = '10px';
                break;
            case 'top-right':
                statusDiv.style.top = '10px';
                statusDiv.style.right = '10px';
                break;
            case 'bottom-left':
                statusDiv.style.bottom = '10px';
                statusDiv.style.left = '10px';
                break;
            case 'bottom-right':
                statusDiv.style.bottom = '10px';
                statusDiv.style.right = '10px';
                break;
        }
    }

    function updateCornerHighlight() {
        const corners = document.querySelectorAll('.ct-corner');
        corners.forEach(corner => {
            if (corner.dataset.corner === panelCorner) {
                corner.style.background = '#00ff00';
                corner.style.borderColor = '#00ff00';
            } else {
                corner.style.background = 'transparent';
                corner.style.borderColor = '#888';
            }
        });
    }

    function updateStatus(status, direction) {
        const statusText = document.getElementById('ct-status-text');
        const directionText = document.getElementById('ct-direction-text');
        if (statusText) {
            statusText.textContent = status;
            statusText.style.color = status === 'Running' ? '#00ff00' : '#ff6600';
        }
        if (directionText) {
            directionText.textContent = direction || '-';
        }
    }

    function setupMapClickHandler(mapElement) {
        // Create an invisible overlay for click detection
        const overlay = document.createElement('div');
        overlay.id = 'ct-click-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
            cursor: crosshair;
            pointer-events: auto;
        `;

        // Find the map container
        const mapContainer = mapElement.closest('.user-map-container') || mapElement;
        mapContainer.style.position = 'relative';

        // Add click handler
        overlay.addEventListener('click', (e) => {
            if (autoRunCancelled == true) {
                // console.log("[CT Helper] autoRunCancelled!");
                // return;
            }
            e.preventDefault();
            e.stopPropagation();

            if (isAutoRunning) {
                stopAutoRun();
            } else {
                const rect = overlay.getBoundingClientRect();
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;

                // Calculate angle from center
                const angle = Math.atan2(clickY - centerY, clickX - centerX) * (180 / Math.PI);
                const direction = getDirectionFromAngle(angle);

                if (direction) {
                    startAutoRun(direction);
                }
            }
        });

        // Right-click to stop
        overlay.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (isAutoRunning) {
                stopAutoRun();
            }
        });

        mapContainer.appendChild(overlay);
        console.log('[CT Helper] Click overlay added');
    }

    function getDirectionFromAngle(angle) {
        // Normalize angle to -180 to 180
        while (angle > 180) angle -= 360;
        while (angle < -180) angle += 360;

        // Map angles to directions (0 = right, -90 = up, 90 = down, 180/-180 = left)
        if (angle >= -22.5 && angle < 22.5) return 'right';
        if (angle >= 22.5 && angle < 67.5) return 'right-bottom';
        if (angle >= 67.5 && angle < 112.5) return 'bottom';
        if (angle >= 112.5 && angle < 157.5) return 'left-bottom';
        if (angle >= 157.5 || angle < -157.5) return 'left';
        if (angle >= -157.5 && angle < -112.5) return 'left-top';
        if (angle >= -112.5 && angle < -67.5) return 'top';
        if (angle >= -67.5 && angle < -22.5) return 'right-top';

        return null;
    }

    function startAutoRun(direction) {
        // if (autoRunCancelled == true) {
        //     console.log("[CT Helper] autoRunCancelled!");
        //     return;
        // }
        currentDirection = direction;
        isAutoRunning = true;

        console.log('[CT Helper] Starting auto-run:', direction);
        updateStatus('Running', direction);

        // Immediately move once
        triggerMove(direction);

        // Then set up interval
        autoRunInterval = setInterval(() => {
            triggerMove(direction);
        }, MOVE_INTERVAL);
    }

    function stopAutoRun() {
        isAutoRunning = false;
        currentDirection = null;

        if (autoRunInterval) {
            clearInterval(autoRunInterval);
            autoRunInterval = null;
        }

        console.log('[CT Helper] Stopped auto-run');
        updateStatus('Idle', null);
    }

    function triggerMove(direction) {
        // Find the direction control element
        const controlSelector = `ul.map-controls li.${direction}`;
        const control = document.querySelector(controlSelector);

        if (control) {
            // Simulate mousedown and mouseup (how the game handles movement)
            const mousedownEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            const mouseupEvent = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });

            control.dispatchEvent(mousedownEvent);
            control.dispatchEvent(clickEvent);
            control.dispatchEvent(mouseupEvent);
        } else {
            console.log('[CT Helper] Direction control not found:', direction);
        }
    }

    function setupPresentHighlighting() {
        // Add CSS for highlighting presents/items
        const style = document.createElement('style');
        style.id = 'ct-helper-styles';
        style.textContent = `
            /* Only highlight actual collectible items in the items-layer on the map */
            /* The items-layer is specifically where pickups spawn, not decorations */
            .ct-helper-highlight-items #world .items-layer > * {
                filter: drop-shadow(0 0 8px #00ff00) drop-shadow(0 0 16px #ffff00) !important;
                animation: ct-glow 0.5s ease-in-out infinite alternate !important;
            }

            @keyframes ct-glow {
                from { filter: drop-shadow(0 0 8px #00ff00) drop-shadow(0 0 12px #ffff00); }
                to { filter: drop-shadow(0 0 12px #00ff00) drop-shadow(0 0 20px #ff6600); }
            }

            /* Make the overlay visible when auto-running */
            #ct-click-overlay.running {
                background: radial-gradient(circle, transparent 40%, rgba(0, 255, 0, 0.1) 100%);
            }
        `;
        document.head.appendChild(style);

        // Highlighting state is now applied by applySettingsToUI()

        // Also set up a MutationObserver to watch for new items appearing
        observeForItems();
    }

    function observeForItems() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if it's an item or contains items
                        const items = node.querySelectorAll ? node.querySelectorAll('.items-layer *, [class*="item"], [src*="item"]') : [];
                        if (items.length > 0) {
                            console.log('[CT Helper] New items detected on map');
                        }
                    }
                });
            });
        });

        const world = document.getElementById('world');
        if (world) {
            observer.observe(world, { childList: true, subtree: true });
        }
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle if not typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch(e.key.toLowerCase()) {
                case ' ': // Space to stop
                case 'escape':
                    if (isAutoRunning) {
                        e.preventDefault();
                        stopAutoRun();
                    }
                    break;
                case 'h': { // Toggle highlighting
                    // highlightsEnabled = !highlightsEnabled;
                    // document.body.classList.toggle('ct-helper-highlight-items', highlightsEnabled);
                    // console.log('[CT Helper] Highlighting:', highlightsEnabled ? 'ON' : 'OFF');
                    // const hotkeyH = document.getElementById('ct-hotkey-h');
                    // if (hotkeyH) {
                    //     hotkeyH.style.color = highlightsEnabled ? '#00ff00' : '#ff4444';
                    // }
                    // saveSettings();
                    handleHighlights();
                    break;
                }
                case 'm': // Toggle sound
                    toggleSound();
                    break;
                case 'p': // Toggle arrow (P for pointer)
                    toggleArrow();
                    break;
            }
        });

        // Stop auto-run when tab loses visibility (switching tabs)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && isAutoRunning) {
                console.log('[CT Helper] Tab hidden, stopping auto-run');
                stopAutoRun();
            }
        });
    }

    function initAudio() {
        // Create audio context on first user interaction
        document.addEventListener('click', () => {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('[CT Helper] Audio initialized');
            }
        }, { once: true });
    }

    let soundEnabled = false;
    let soundVolume = 0.3; // 0 to 1
    let arrowEnabled = true;
    let highlightsEnabled = true;
    let panelCorner = 'top-right'; // top-left, top-right, bottom-left, bottom-right

    const STORAGE_KEY = 'ct-helper-settings';

    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const settings = JSON.parse(saved);
                soundEnabled = settings.soundEnabled ?? false;
                soundVolume = settings.soundVolume ?? 0.3;
                arrowEnabled = settings.arrowEnabled ?? true;
                highlightsEnabled = settings.highlightsEnabled ?? true;
                panelCorner = settings.panelCorner ?? 'top-right';
                console.log('[CT Helper] Settings loaded:', settings);
            }
        } catch (e) {
            console.log('[CT Helper] Could not load settings:', e);
        }
    }

    function saveSettings() {
        try {
            const settings = {
                soundEnabled,
                soundVolume,
                arrowEnabled,
                highlightsEnabled,
                panelCorner
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            console.log('[CT Helper] Settings saved');
        } catch (e) {
            console.log('[CT Helper] Could not save settings:', e);
        }
    }

    function toggleArrow() {
        arrowEnabled = !arrowEnabled;
        console.log('[CT Helper] Arrow:', arrowEnabled ? 'ON' : 'OFF');
        if (!arrowEnabled && arrowDiv) {
            arrowDiv.style.display = 'none';
        }
        const hotkeyEl = document.getElementById('ct-hotkey-p');
        if (hotkeyEl) {
            hotkeyEl.style.color = arrowEnabled ? '#00ff00' : '#ff4444';
        }
        saveSettings();
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        console.log('[CT Helper] Sound:', soundEnabled ? 'ON' : 'OFF');
        const hotkeyEl = document.getElementById('ct-hotkey-m');
        if (hotkeyEl) {
            hotkeyEl.style.color = soundEnabled ? '#00ff00' : '#ff4444';
        }
        saveSettings();
    }

    function playBing() {
        if (!soundEnabled) return;

        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        try {
            // Resume context if suspended (browser autoplay policy)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            // Create a pleasant "bing" sound
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Nice chime frequency
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
            oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1); // C#6
            oscillator.type = 'sine';

            // Quick fade in and out
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(soundVolume, audioContext.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);

            console.log('[CT Helper] 🔔 BING! Item collected!');
        } catch (e) {
            console.log('[CT Helper] Audio error:', e);
        }
    }

    function watchInventory() {
        // Watch the items-layer on the map for new collectibles appearing
        waitForElement('#world .items-layer', (itemsLayer) => {
            console.log('[CT Helper] Items layer found, watching for collectibles...');

            // Track items we've already binged for (by their style/position)
            const seenItems = new Set();

            // Check for any existing items on load
            const existingItems = itemsLayer.querySelectorAll('.ct-item, [class*="item"], div');
            existingItems.forEach(item => {
                const itemKey = getItemKey(item);
                if (itemKey) {
                    seenItems.add(itemKey);
                    trackItem(item, itemKey);
                }
            });

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    // Handle added nodes
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            const itemKey = getItemKey(node);
                            if (itemKey && !seenItems.has(itemKey)) {
                                seenItems.add(itemKey);
                                console.log('[CT Helper] 🎁 New item appeared on map!', itemKey);
                                playBing();
                                trackItem(node, itemKey);
                            }
                        }
                    });

                    // Handle removed nodes (item picked up)
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            const itemKey = getItemKey(node);
                            if (itemKey) {
                                activeItems.delete(itemKey);
                                updateArrow();
                            }
                        }
                    });
                });
            });

            observer.observe(itemsLayer, {
                childList: true,
                subtree: true
            });

            console.log('[CT Helper] Item appearance watcher active');

            // Start arrow update loop
            setInterval(updateArrow, 500);
        });
    }

    function trackItem(element, itemKey) {
        const pos = getItemPosition(element);
        if (pos) {
            activeItems.set(itemKey, { element, pos });
            updateArrow();
        }
    }

    function getItemPosition(element) {
        if (!element || !element.style) return null;
        const style = element.getAttribute('style') || '';

        const leftMatch = style.match(/left:\s*(-?\d+)px/);
        const topMatch = style.match(/top:\s*(-?\d+)px/);

        if (leftMatch && topMatch) {
            return {
                x: parseInt(leftMatch[1]),
                y: parseInt(topMatch[1])
            };
        }
        return null;
    }

    function getPlayerPosition() {
        // The 'you' class is on an inner element, so find its parent .ct-user
        const youMarker = document.querySelector('.img-wrap.you, .svgImageWrap.you');
        const player = youMarker ? youMarker.closest('.ct-user') : null;

        if (!player) return null;

        const style = player.getAttribute('style') || '';
        const transformMatch = style.match(/translate\((-?\d+)px,\s*(-?\d+)px\)/);

        if (transformMatch) {
            return {
                x: parseInt(transformMatch[1]),
                y: parseInt(transformMatch[2])
            };
        }
        return null;
    }

    function updateArrow() {
        if (!arrowDiv || !arrowEnabled) {
            if (arrowDiv) arrowDiv.style.display = 'none';
            return;
        }

        const playerPos = getPlayerPosition();
        if (!playerPos || activeItems.size === 0) {
            arrowDiv.style.display = 'none';
            return;
        }

        // Find the closest item
        let closestItem = null;
        let closestDist = Infinity;

        activeItems.forEach((item, key) => {
            // Check if element still exists in DOM
            if (!document.contains(item.element)) {
                activeItems.delete(key);
                return;
            }

            const dx = item.pos.x - playerPos.x;
            const dy = item.pos.y - playerPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < closestDist) {
                closestDist = dist;
                closestItem = item;
            }
        });

        if (!closestItem) {
            arrowDiv.style.display = 'none';
            return;
        }

        // Calculate angle to item
        const dx = closestItem.pos.x - playerPos.x;
        const dy = closestItem.pos.y - playerPos.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 because arrow points up by default

        // Show arrow and rotate it
        arrowDiv.style.display = 'block';
        arrowDiv.querySelector('svg').style.transform = `rotate(${angle}deg)`;

        // Show distance (in tiles, roughly 30px per tile)
        const distInTiles = Math.round(closestDist / 30);
        const distanceDiv = document.getElementById('ct-arrow-distance');
        if (distanceDiv) {
            distanceDiv.textContent = `~${distInTiles} tiles`;
        }
    }

    function getItemKey(element) {
        // Create a unique key for an item based on its position/style
        if (!element || !element.style) return null;
        const style = element.getAttribute('style') || '';
        const className = element.className || '';
        // Use position as unique identifier
        if (style.includes('left:') && style.includes('top:')) {
            return `${className}-${style}`;
        }
        return null;
    }

    // Also watch for status messages about finding items
    function watchStatusMessages() {
        // Keep this as a backup detection method
        const statusContainer = document.querySelector('.status-area-container, .text-container');

        if (!statusContainer) {
            setTimeout(watchStatusMessages, 1000);
            return;
        }

        let lastMessage = '';

        const observer = new MutationObserver((mutations) => {
            const text = statusContainer.textContent.toLowerCase();
            // Avoid duplicate bings for the same message
            if (text !== lastMessage) {
                lastMessage = text;
                // Only bing on actual pickup messages, not appearance
                // (we handle appearance separately now)
            }
        });

        observer.observe(statusContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });

        console.log('[CT Helper] Status message watcher active');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();