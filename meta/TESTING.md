# testing guide

this document is for contributors who want to test features without grinding for weeks.

## wait, this isnt for finding bugs?

no! this isn't for finding bugs. this is mainly for testers who wanna get ahead and test their new features and other stuff out. finding bugs and problems is handled with the smoke, lighthouse, ESLint, stylelint, HTMLLint checks that happens and checks with EVERY commit.

## quick start

open the game in your browser, open devtools (`F12`), go to the **console** tab, and paste whatever script you want!

there is an official cheat script that maxes out everything in one go, or a community cheat/mod menu proudly vibe-coded by StarryDev (https://starryscracks.online/)

to navigate easily:

- [mod menu](#mod-menu)
- [official cheat script](#official-cheat-script)

cheat/mod menu first, and cheat script after:

## mod menu

```javascript
// ==UserScript==
// @name         auth's RNG Mod Menu / Trainer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A premium, feature-rich glassmorphic mod menu and trainer for auth's RNG game. Includes RNG manipulation, speed roll hacks, unlockers, potion freezer, wishing well cooldown resets, and more!
// @author       Antigravity
// @match        *://authsrng.xyz/*
// @match        *://nightly.authsrng.xyz/*
// @match        http://localhost:*/*
// @match        file:///*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
(function() {
    'use strict';
    // Inject Google Fonts & Trainer Styles
    const style = document.createElement('style');
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

        #rng-trainer-container {
            position: fixed;
            top: 50px;
            right: 50px;
            width: 350px;
            background: rgba(10, 10, 15, 0.75);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.5);
            color: #f0f0f5;
            font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            z-index: 100000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transition: height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            box-sizing: border-box;
            user-select: none;
        }
        #rng-trainer-container.minimized {
            width: 200px;
            height: 42px !important;
        }
        #rng-trainer-header {
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            font-weight: 600;
            letter-spacing: 0.5px;
            font-size: 13.5px;
            text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        #rng-trainer-header-title {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        #rng-trainer-minimize {
            background: none;
            border: none;
            color: #aaa;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
        }
        #rng-trainer-minimize:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        #rng-trainer-tabs {
            display: flex;
            background: rgba(0, 0, 0, 0.2);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .rng-tab-btn {
            flex: 1;
            background: none;
            border: none;
            color: #888;
            padding: 10px 0;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
            outline: none;
            font-family: inherit;
        }
        .rng-tab-btn:hover {
            color: #ccc;
            background: rgba(255, 255, 255, 0.02);
        }
        .rng-tab-btn.active {
            color: #a855f7;
            border-bottom-color: #a855f7;
            background: rgba(168, 85, 247, 0.06);
        }
        #rng-trainer-content {
            padding: 16px;
            flex: 1;
            max-height: 380px;
            overflow-y: auto;
            font-size: 12.5px;
        }
        /* Custom Scrollbar for modern look */
        #rng-trainer-content::-webkit-scrollbar {
            width: 5px;
        }
        #rng-trainer-content::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
        }
        #rng-trainer-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
        }
        #rng-trainer-content::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.25);
        }
        .rng-tab-pane {
            display: none;
            flex-direction: column;
            gap: 12px;
        }
        .rng-tab-pane.active {
            display: flex;
        }
        .rng-cheat-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }
        .rng-cheat-col {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .rng-label {
            color: #c8c8d2;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .rng-btn {
            background: linear-gradient(135deg, #8b5cf6, #d946ef);
            border: none;
            color: white;
            padding: 7px 11px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 11px;
            box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);
            outline: none;
            font-family: inherit;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .rng-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
            filter: brightness(1.1);
        }
        .rng-btn:active:not(:disabled) {
            transform: translateY(0);
        }
        .rng-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .rng-btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.07);
            color: #e2e8f0;
            box-shadow: none;
        }
        .rng-btn-secondary:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.14);
            box-shadow: none;
        }
        .rng-btn-danger {
            background: linear-gradient(135deg, #ef4444, #f43f5e);
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
        }
        .rng-btn-danger:hover:not(:disabled) {
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }
        .rng-input {
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 6px;
            color: #fff;
            padding: 5px 8px;
            font-size: 11px;
            outline: none;
            width: 80px;
            box-sizing: border-box;
            font-family: monospace;
        }
        .rng-input:focus {
            border-color: #8b5cf6;
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25);
        }
        .rng-select {
            background: rgba(15, 15, 25, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 6px;
            color: #fff;
            padding: 5px 8px;
            font-size: 11.5px;
            outline: none;
            width: 100%;
            box-sizing: border-box;
            font-family: inherit;
        }
        .rng-select:focus {
            border-color: #8b5cf6;
        }
        /* Toggle Switch */
        .rng-switch {
            position: relative;
            display: inline-block;
            width: 34px;
            height: 18px;
        }
        .rng-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .rng-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.08);
            transition: .2s;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .rng-slider:before {
            position: absolute;
            content: "";
            height: 12px;
            width: 12px;
            left: 2px;
            bottom: 2px;
            background-color: #a0aec0;
            transition: .2s;
            border-radius: 50%;
        }
        input:checked + .rng-slider {
            background: linear-gradient(135deg, #8b5cf6, #d946ef);
        }
        input:checked + .rng-slider:before {
            transform: translateX(16px);
            background-color: #fff;
        }
        .rng-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.08);
            margin: 8px 0;
        }
        /* Hotkey helper label */
        .rng-hotkey-label {
            font-size: 10px;
            opacity: 0.45;
            text-align: center;
            margin-top: 6px;
        }
    `;
    document.head.appendChild(style);
    // Trainer State Management
    const TRAINER_SETTINGS_KEY = '_rng_trainer_settings';
    let trainerSettings = {
        instantRolls: false,
        skipCutscenes: false,
        autoConsume: false,
        ultraAutoRoll: false,
        autoRollDelay: 100,
        forceRoll: false,
        forcedRarity: '',
        customLuck: false,
        luckMult: 1000,
        infinitePotions: false,
        noMutationCd: false,
        minimized: false,
        xOffset: 0,
        yOffset: 0
    };
    // Load saved trainer state
    const saved = localStorage.getItem(TRAINER_SETTINGS_KEY);
    if (saved) {
        try {
            trainerSettings = Object.assign(trainerSettings, JSON.parse(saved));
        } catch (e) {}
    }
    function saveSettings() {
        localStorage.setItem(TRAINER_SETTINGS_KEY, JSON.stringify(trainerSettings));
    }
    // Check game ready
    function init() {
        if (typeof Beacon === 'undefined' || typeof updatePointsDisplay === 'undefined' || typeof rarities === 'undefined') {
            setTimeout(init, 100);
            return;
        }
        startTrainer();
    }
    function startTrainer() {
        // Create trainer container
        const container = document.createElement('div');
        container.id = 'rng-trainer-container';
        if (trainerSettings.minimized) {
            container.classList.add('minimized');
        }

        // Restore position
        container.style.transform = `translate3d(${trainerSettings.xOffset}px, ${trainerSettings.yOffset}px, 0)`;
        // HTML Layout
        container.innerHTML = `
            <div id="rng-trainer-header">
                <div id="rng-trainer-header-title">
                    <span>🔮</span> auth's RNG Trainer
                </div>
                <button id="rng-trainer-minimize">${trainerSettings.minimized ? '+' : '−'}</button>
            </div>
            <div id="rng-trainer-tabs">
                <button class="rng-tab-btn active" data-tab="cheats">Cheats</button>
                <button class="rng-tab-btn" data-tab="rng">RNG Manip</button>
                <button class="rng-tab-btn" data-tab="unlocks">Unlocks</button>
                <button class="rng-tab-btn" data-tab="potions">Potions</button>
            </div>
            <div id="rng-trainer-content">
                <!-- CHEATS TAB -->
                <div class="rng-tab-pane active" id="pane-cheats">
                    <div class="rng-cheat-row">
                        <span class="rng-label">💵 Add Points:</span>
                        <div style="display: flex; gap: 4px;">
                            <button class="rng-btn rng-btn-secondary" id="add-points-10k">+10K</button>
                            <button class="rng-btn rng-btn-secondary" id="add-points-100k">+100K</button>
                            <button class="rng-btn" id="add-points-1m">+1M</button>
                        </div>
                    </div>
                    <div class="rng-cheat-row">
                        <span class="rng-label">✏️ Set Points:</span>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <input type="number" class="rng-input" id="set-points-val" placeholder="Value">
                            <button class="rng-btn" id="set-points-btn">Set</button>
                        </div>
                    </div>
                    <div class="rng-cheat-row">
                        <span class="rng-label">🌀 Add Anomalies:</span>
                        <div style="display: flex; gap: 4px;">
                            <button class="rng-btn rng-btn-secondary" id="add-anoms-10">+10</button>
                            <button class="rng-btn rng-btn-secondary" id="add-anoms-100">+100</button>
                            <button class="rng-btn" id="add-anoms-1000">+1K</button>
                        </div>
                    </div>
                    <div class="rng-cheat-row">
                        <span class="rng-label">🎲 Set Total Rolls:</span>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <input type="number" class="rng-input" id="set-rolls-val" placeholder="Rolls">
                            <button class="rng-btn" id="set-rolls-btn">Set</button>
                        </div>
                    </div>

                    <div class="rng-divider"></div>

                    <div class="rng-cheat-row">
                        <span class="rng-label">⚡ Instant Rolls:</span>
                        <label class="rng-switch">
                            <input type="checkbox" id="toggle-instant-rolls">
                            <span class="rng-slider"></span>
                        </label>
                    </div>
                    <div class="rng-cheat-row">
                        <span class="rng-label">🎬 Skip Cutscenes:</span>
                        <label class="rng-switch">
                            <input type="checkbox" id="toggle-skip-cutscenes">
                            <span class="rng-slider"></span>
                        </label>
                    </div>
                    <div class="rng-cheat-row">
                        <span class="rng-label">🔄 Auto-Consume Anomalies:</span>
                        <label class="rng-switch">
                            <input type="checkbox" id="toggle-auto-consume">
                            <span class="rng-slider"></span>
                        </label>
                    </div>
                    <div class="rng-divider"></div>
                    <div class="rng-cheat-row">
                        <span class="rng-label">⏩ Ultra Auto-Roll:</span>
                        <label class="rng-switch">
                            <input type="checkbox" id="toggle-ultra-roll">
                            <span class="rng-slider"></span>
                        </label>
                    </div>
                    <div class="rng-cheat-col">
                        <div style="display:flex; justify-content:space-between;">
                            <span class="rng-label">Auto-Roll Interval:</span>
                            <span id="autoroll-delay-txt" style="color:#d946ef;font-weight:bold;">100ms</span>
                        </div>
                        <input type="range" min="10" max="1000" step="10" value="100" id="autoroll-delay-slider" style="width:100%;">
                    </div>
                </div>
                <!-- RNG MANIP TAB -->
                <div class="rng-tab-pane" id="pane-rng">
                    <div class="rng-cheat-row">
                        <span class="rng-label">🎯 Force Specific Roll:</span>
                        <label class="rng-switch">
                            <input type="checkbox" id="toggle-force-roll">
                            <span class="rng-slider"></span>
                        </label>
                    </div>
                    <div class="rng-cheat-col">
                        <span class="rng-label">Forced Rarity:</span>
                        <select class="rng-select" id="force-rarity-select"></select>
                    </div>

                    <div class="rng-divider"></div>
                    <div class="rng-cheat-row">
                        <span class="rng-label">🍀 Custom Luck Boost:</span>
                        <label class="rng-switch">
                            <input type="checkbox" id="toggle-custom-luck">
                            <span class="rng-slider"></span>
                        </label>
                    </div>
                    <div class="rng-cheat-col">
                        <div style="display:flex; justify-content:space-between;">
                            <span class="rng-label">Luck Multiplier:</span>
                            <span id="luck-mult-txt" style="color:#8b5cf6;font-weight:bold;">1,000x</span>
                        </div>
                        <select class="rng-select" id="luck-preset-select">
                            <option value="10">10x Luck</option>
                            <option value="100">100x Luck</option>
                            <option value="1000">1,000x Luck</option>
                            <option value="10000">10,000x Luck</option>
                            <option value="1000000">1,000,000x Luck</option>
                            <option value="1000000000">1,000,000,000x Luck</option>
                            <option value="custom">Custom Multiplier</option>
                        </select>
                        <input type="number" class="rng-input" id="luck-custom-val" value="1000" style="display:none; width:100%; margin-top:6px;" placeholder="Custom Multiplier">
                    </div>
                </div>
                <!-- UNLOCKS TAB -->
                <div class="rng-tab-pane" id="pane-unlocks">
                    <button class="rng-btn" id="unlock-all-rarities" style="width: 100%;">Add 1 of Every Rarity</button>
                    <button class="rng-btn" id="unlock-all-achievements" style="width: 100%;">Unlock All Achievements</button>
                    <button class="rng-btn rng-btn-secondary" id="unlock-mutations" style="width: 100%;">Force Unlock Mutations</button>

                    <div class="rng-divider"></div>

                    <button class="rng-btn rng-btn-secondary" id="reset-daily-cooldown" style="width: 100%;">Reset Daily Claim Cooldown</button>
                    <button class="rng-btn rng-btn-secondary" id="reset-weekly-cooldown" style="width: 100%;">Reset Weekly Claim Cooldown</button>
                    <button class="rng-btn rng-btn-secondary" id="reset-well-cooldown" style="width: 100%;">Reset Wishing Well Cooldown</button>
                    <button class="rng-btn rng-btn-secondary" id="reset-gauntlet-cooldowns" style="width: 100%;">Reset Gauntlet Cooldowns</button>

                    <div class="rng-divider"></div>
                    <div class="rng-cheat-row">
                        <span class="rng-label">⚡ No Mutation Cooldown:</span>
                        <label class="rng-switch">
                            <input type="checkbox" id="toggle-mutation-cd">
                            <span class="rng-slider"></span>
                        </label>
                    </div>
                    <div class="rng-divider"></div>
                    <button class="rng-btn rng-btn-danger" id="wipe-rarities-btn" style="width: 100%;">Wipe Rarity Inventory</button>
                </div>
                <!-- POTIONS TAB -->
                <div class="rng-tab-pane" id="pane-potions">
                    <div class="rng-cheat-row">
                        <span class="rng-label">🧪 Infinite Potion Effects:</span>
                        <label class="rng-switch">
                            <input type="checkbox" id="toggle-infinite-potions">
                            <span class="rng-slider"></span>
                        </label>
                    </div>
                    <div class="rng-divider"></div>
                    <button class="rng-btn" id="give-99-potions" style="width: 100%;">Give 99 of Every Potion</button>
                </div>

                <div class="rng-hotkey-label">Press [ M ] to toggle Mod Menu</div>
            </div>
        `;
        document.body.appendChild(container);
        // Bind UI Actions
        setupTabs();
        setupDrag();
        setupInputs();
        setupCheats();
        populateForcedRarities();
        hookRollEngine();
        startCheatLoops();
    }
    // Tab Switching
    function setupTabs() {
        const tabs = document.querySelectorAll('.rng-tab-btn');
        const panes = document.querySelectorAll('.rng-tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));

                tab.classList.add('active');
                const paneId = `pane-${tab.dataset.tab}`;
                document.getElementById(paneId).classList.add('active');
            });
        });
    }
    // Draggable Window
    function setupDrag() {
        const container = document.getElementById('rng-trainer-container');
        const header = document.getElementById('rng-trainer-header');

        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = trainerSettings.xOffset;
        let yOffset = trainerSettings.yOffset;
        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);
        function dragStart(e) {
            if (e.target === header || header.contains(e.target)) {
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
                isDragging = true;
            }
        }
        function dragEnd() {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;

            trainerSettings.xOffset = xOffset;
            trainerSettings.yOffset = yOffset;
            saveSettings();
        }
        function drag(e) {
            if (isDragging && !container.classList.contains('minimized')) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                container.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            }
        }
    }
    // Setup input fields and sync switches with stored settings
    function setupInputs() {
        const container = document.getElementById('rng-trainer-container');
        const minimizeBtn = document.getElementById('rng-trainer-minimize');

        // Minimize/Expand Toggle
        minimizeBtn.addEventListener('click', () => {
            container.classList.toggle('minimized');
            const isMin = container.classList.contains('minimized');
            minimizeBtn.textContent = isMin ? '+' : '−';
            trainerSettings.minimized = isMin;
            saveSettings();
        });
        // Toggle visibility with 'm' key
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'm' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                if (container.style.display === 'none') {
                    container.style.display = 'flex';
                } else {
                    container.style.display = 'none';
                }
            }
        });
        // Initialize toggle states
        const mapSettings = [
            { id: 'toggle-instant-rolls', prop: 'instantRolls' },
            { id: 'toggle-skip-cutscenes', prop: 'skipCutscenes' },
            { id: 'toggle-auto-consume', prop: 'autoConsume' },
            { id: 'toggle-ultra-roll', prop: 'ultraAutoRoll' },
            { id: 'toggle-force-roll', prop: 'forceRoll' },
            { id: 'toggle-custom-luck', prop: 'customLuck' },
            { id: 'toggle-mutation-cd', prop: 'noMutationCd' },
            { id: 'toggle-infinite-potions', prop: 'infinitePotions' }
        ];
        mapSettings.forEach(({ id, prop }) => {
            const el = document.getElementById(id);
            el.checked = trainerSettings[prop];
            el.addEventListener('change', (e) => {
                trainerSettings[prop] = e.target.checked;
                saveSettings();

                // Trigger instant effects
                if (prop === 'skipCutscenes') {
                    toggleCutscenes(!e.target.checked);
                } else if (prop === 'instantRolls') {
                    toggleInstantRolls(e.target.checked);
                } else if (prop === 'ultraAutoRoll') {
                    toggleUltraRoll();
                }
            });
        });
        // Auto roll interval slider
        const slider = document.getElementById('autoroll-delay-slider');
        const delayTxt = document.getElementById('autoroll-delay-txt');
        slider.value = trainerSettings.autoRollDelay;
        delayTxt.textContent = `${trainerSettings.autoRollDelay}ms`;

        slider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            delayTxt.textContent = `${val}ms`;
            trainerSettings.autoRollDelay = val;
            saveSettings();
            if (trainerSettings.ultraAutoRoll) {
                toggleUltraRoll(); // restart auto roll loop with new delay
            }
        });
        // Luck multiplier inputs
        const luckPreset = document.getElementById('luck-preset-select');
        const luckCustom = document.getElementById('luck-custom-val');
        const luckTxt = document.getElementById('luck-mult-txt');
        // Check if current setting matches a preset
        const presets = ['10', '100', '1000', '10000', '1000000', '1000000000'];
        if (presets.includes(String(trainerSettings.luckMult))) {
            luckPreset.value = trainerSettings.luckMult;
            luckCustom.style.display = 'none';
        } else {
            luckPreset.value = 'custom';
            luckCustom.style.display = 'block';
            luckCustom.value = trainerSettings.luckMult;
        }

        updateLuckTxt();
        luckPreset.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                luckCustom.style.display = 'block';
                trainerSettings.luckMult = parseFloat(luckCustom.value) || 1;
            } else {
                luckCustom.style.display = 'none';
                trainerSettings.luckMult = parseFloat(e.target.value);
            }
            saveSettings();
            updateLuckTxt();
        });
        luckCustom.addEventListener('input', (e) => {
            trainerSettings.luckMult = parseFloat(e.target.value) || 1;
            saveSettings();
            updateLuckTxt();
        });
        function updateLuckTxt() {
            const formatted = typeof formatNum === 'function' ? formatNum(trainerSettings.luckMult) : trainerSettings.luckMult.toLocaleString();
            luckTxt.textContent = `${formatted}x`;
        }
    }
    // Setup Mod / Cheat buttons
    function setupCheats() {
        // Point Cheats
        const addPoints = (amt) => {
            if (typeof points !== 'undefined') {
                points += amt;
                if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
                if (typeof updateShopUI === 'function') updateShopUI();
                if (typeof saveAllData === 'function') saveAllData();
            }
        };
        document.getElementById('add-points-10k').addEventListener('click', () => addPoints(10000));
        document.getElementById('add-points-100k').addEventListener('click', () => addPoints(100000));
        document.getElementById('add-points-1m').addEventListener('click', () => addPoints(1000000));
        document.getElementById('set-points-btn').addEventListener('click', () => {
            const val = parseInt(document.getElementById('set-points-val').value);
            if (!isNaN(val) && typeof points !== 'undefined') {
                points = val;
                if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
                if (typeof updateShopUI === 'function') updateShopUI();
                if (typeof saveAllData === 'function') saveAllData();
            }
        });
        // Anomalies Cheats
        const addAnoms = (amt) => {
            if (typeof anomalies !== 'undefined') {
                anomalies += amt;
                if (typeof updateAnomalyUI === 'function') updateAnomalyUI();
                if (typeof saveAllData === 'function') saveAllData();
            }
        };
        document.getElementById('add-anoms-10').addEventListener('click', () => addAnoms(10));
        document.getElementById('add-anoms-100').addEventListener('click', () => addAnoms(100));
        document.getElementById('add-anoms-1000').addEventListener('click', () => addAnoms(1000));
        // Total Rolls Cheats
        document.getElementById('set-rolls-btn').addEventListener('click', () => {
            const val = parseInt(document.getElementById('set-rolls-val').value);
            if (!isNaN(val) && typeof totalRolls !== 'undefined') {
                totalRolls = val;
                if (typeof updateTotalRolls === 'function') updateTotalRolls();
                if (typeof saveAllData === 'function') saveAllData();
            }
        });
        // Unlocks Tab Actions
        document.getElementById('unlock-all-rarities').addEventListener('click', () => {
            if (typeof rarities === 'undefined' || typeof addToInventory !== 'function' || typeof inventoryData === 'undefined') return;
            let addedCount = 0;
            rarities.forEach(r => {
                if (!inventoryData.has(r.name)) {
                    addToInventory(r);
                    addedCount++;
                }
            });
            if (addedCount > 0) {
                if (typeof saveAllData === 'function') saveAllData();
                if (typeof updateCollectedCounter === 'function') updateCollectedCounter();

                // Re-render sorting view if possible
                const sortSelect = document.getElementById('sortSelect');
                if (typeof renderSortedInventory === 'function' && sortSelect) {
                    renderSortedInventory(sortSelect.value);
                }
                alert(`Unlocked ${addedCount} new rarities! Total collected is now maxed out!`);
            } else {
                alert('You already have all rarities in your inventory!');
            }
        });
        document.getElementById('unlock-all-achievements').addEventListener('click', () => {
            if (typeof achievementsList === 'undefined' || typeof achievementsUnlocked === 'undefined') return;
            achievementsList.forEach(ach => {
                achievementsUnlocked.add(ach.id);
            });
            if (typeof updateAchievementsUI === 'function') updateAchievementsUI();
            if (typeof saveAllData === 'function') saveAllData();
            alert('All achievements unlocked successfully!');
        });
        document.getElementById('unlock-mutations').addEventListener('click', () => {
            localStorage.setItem('mutationsUnlocked', '1');
            if (typeof renderMutations === 'function') renderMutations();
            if (typeof showAnomalyPopup === 'function') {
                showAnomalyPopup('mutations unlocked! 🧬');
            } else {
                alert('Mutations forced unlocked! Open the mutations tab to view.');
            }
        });
        // Cooldown Reset Buttons
        document.getElementById('reset-daily-cooldown').addEventListener('click', () => {
            localStorage.removeItem('daily_lastClaim');
            if (typeof updateDailyUI === 'function') {
                updateDailyUI();
                alert('Daily claim cooldown reset!');
            } else {
                location.reload();
            }
        });
        document.getElementById('reset-weekly-cooldown').addEventListener('click', () => {
            localStorage.removeItem('weekly_lastClaim');
            if (typeof updateWeeklyUI === 'function') {
                updateWeeklyUI();
                alert('Weekly claim cooldown reset!');
            } else {
                location.reload();
            }
        });
        document.getElementById('reset-well-cooldown').addEventListener('click', () => {
            if (typeof wellData !== 'undefined') {
                wellData.lastThrow = 0;
                localStorage.setItem('wishingWell', JSON.stringify(wellData));
                if (typeof updateWellUI === 'function') {
                    updateWellUI();
                    alert('Wishing well cooldown reset! Ready to throw points again.');
                }
            } else {
                localStorage.removeItem('wishingWell');
                location.reload();
            }
        });
        document.getElementById('reset-gauntlet-cooldowns').addEventListener('click', () => {
            localStorage.removeItem('gauntletData');
            if (typeof renderGauntlets === 'function') {
                renderGauntlets();
                alert('Gauntlet claim cooldowns reset!');
            } else {
                location.reload();
            }
        });
        // Give 99 of All Potions
        document.getElementById('give-99-potions').addEventListener('click', () => {
            if (typeof playerPotions === 'undefined') return;
            for (let key in playerPotions) {
                playerPotions[key] = 99;
            }
            if (typeof updatePotionUI === 'function') updatePotionUI();
            if (typeof saveAllData === 'function') saveAllData();
            alert('Gave 99 of every potion type!');
        });
        // Reset Inventory
        document.getElementById('wipe-rarities-btn').addEventListener('click', () => {
            if (confirm('Are you absolutely sure you want to clear your rarity inventory? You will lose all collected rarities!')) {
                localStorage.removeItem('rarityInventory');
                location.reload();
            }
        });
    }
    // Populate Rarity Dropdown
    function populateForcedRarities() {
        const select = document.getElementById('force-rarity-select');
        if (!select || typeof rarities === 'undefined') return;
        // Sort rarities by rarity (rarest first)
        const sorted = [...rarities].sort((a, b) => a.chance - b.chance);

        sorted.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.name;
            const denom = Math.round(1 / r.chance);
            const formattedChance = typeof formatNum === 'function' ? formatNum(denom) : denom.toLocaleString();
            opt.textContent = `${r.name} (1/${formattedChance})`;

            if (trainerSettings.forcedRarity === r.name) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });
        // Initialize state
        if (!trainerSettings.forcedRarity && sorted.length > 0) {
            trainerSettings.forcedRarity = sorted[0].name;
            saveSettings();
        }
        select.addEventListener('change', (e) => {
            trainerSettings.forcedRarity = e.target.value;
            saveSettings();
        });
    }
    // Skip/Mute Cutscenes Logic
    let originalCutsceneMap = null;
    function toggleCutscenes(enable) {
        if (typeof cutsceneMap === 'undefined') return;

        if (!originalCutsceneMap) {
            originalCutsceneMap = Object.assign({}, cutsceneMap);
        }
        if (enable) {
            Object.assign(cutsceneMap, originalCutsceneMap);
        } else {
            for (let key in cutsceneMap) {
                delete cutsceneMap[key];
            }
        }
    }
    // Fast spinner option
    function toggleInstantRolls(enable) {
        if (enable) {
            window.spinnerStyleSetting = 'none';
        } else {
            // Restore from select setting if exists, otherwise slot
            const selectEl = document.getElementById('spinnerStyle');
            window.spinnerStyleSetting = selectEl ? selectEl.value : 'slot';
        }
    }
    // Hook Beacon Rolling System
    function hookRollEngine() {
        if (typeof Beacon === 'undefined' || !Beacon.roll) return;
        const originalRoll = Beacon.roll;

        Beacon.roll = function(rollRarities, luckMult, inventory, upgrades, boostActive) {
            // 1. Force Rarity Check
            if (trainerSettings.forceRoll && trainerSettings.forcedRarity) {
                const forced = rollRarities.find(r => r.name === trainerSettings.forcedRarity);
                if (forced) {
                    const idx = rollRarities.indexOf(forced);
                    return {
                        rarity: forced,
                        index: idx,
                        totalWeight: 1000n,
                        wasPity: false,
                        pityCurrent: 0,
                        isHotPulse: false
                    };
                }
            }
            // 2. Custom Luck Check
            if (trainerSettings.customLuck) {
                luckMult = trainerSettings.luckMult;
            }
            return originalRoll.call(this, rollRarities, luckMult, inventory, upgrades, boostActive);
        };
    }
    // Ultra Auto Roll Loop
    let autoRollTimer = null;
    function toggleUltraRoll() {
        if (autoRollTimer) {
            clearInterval(autoRollTimer);
            autoRollTimer = null;
        }
        if (trainerSettings.ultraAutoRoll) {
            autoRollTimer = setInterval(() => {
                // Ensure instant roll is set to none when auto-rolling fast
                window.spinnerStyleSetting = 'none';

                const rollBtn = document.getElementById('rollBtn');
                if (rollBtn && !rollBtn.disabled && typeof isCutscenePlaying !== 'undefined' && !isCutscenePlaying) {
                    rollBtn.click();
                }
            }, trainerSettings.autoRollDelay);
        }
    }
    // Passive trainer loops running in background
    function startCheatLoops() {
        // Run skip cutscene config instantly
        if (trainerSettings.skipCutscenes) {
            toggleCutscenes(false);
        }

        if (trainerSettings.instantRolls) {
            toggleInstantRolls(true);
        }
        if (trainerSettings.ultraAutoRoll) {
            toggleUltraRoll();
        }
        setInterval(() => {
            // 1. Infinite Potions
            if (trainerSettings.infinitePotions && typeof activePotions !== 'undefined') {
                activePotions.forEach(p => {
                    p.endTime = Date.now() + 30000; // keep duration frozen at 30 seconds
                });

                if (typeof duplicateRollsLeft !== 'undefined' && duplicateRollsLeft < 5) {
                    // force duplicate rolls
                    // window scope check
                    if (window.duplicateRollsLeft !== undefined) {
                        window.duplicateRollsLeft = 10;
                    } else {
                        // eslint-disable-next-line no-undef
                        duplicateRollsLeft = 10;
                    }
                }

                if (typeof recalcPotionLuck === 'function') recalcPotionLuck();
                if (typeof updateActivePotionsDisplay === 'function') updateActivePotionsDisplay();
            }
            // 2. No Mutation Cooldown
            if (trainerSettings.noMutationCd) {
                const mutateBtn = document.getElementById('mutateBtn');
                if (mutateBtn && mutateBtn.disabled) {
                    mutateBtn.disabled = false;
                }
                const cdEl = document.getElementById('mutationCooldown');
                if (cdEl) {
                    cdEl.textContent = '';
                }
            }
            // 3. Auto-consume anomalies
            if (trainerSettings.autoConsume && typeof anomalies !== 'undefined' && anomalies > 0) {
                if (typeof consumeAllAnomalies === 'function') {
                    consumeAllAnomalies();
                }
            }
        }, 100);
    }
    // Start loading sequence
    init();
})();
```
you will probably know what it does when you install it in.

## official cheat script

```javascript
(function() {
  if (typeof rarities === 'undefined' || !rarities.length) {
    alert('rarities not loaded yet, try again in a second');
    return;
  }

  Object.keys(localStorage).forEach(k => localStorage.removeItem(k));

  const now = Date.now();

  totalRolls = 999999;
  points = 999999999;
  anomalies = 99999;
  anomaliesUsed = 500;
  totalSeconds = 999999;
  shopUpgrades.luck = 100;
  shopUpgrades.speed = 3;
  shopUpgrades.pointMult = 10;
  shopUpgrades.magnet = 5;
  shopUpgrades.printer = 99;
  shopUpgrades.duplicate = 10;
  Object.keys(playerPotions).forEach(k => playerPotions[k] = 99);
  soldOutRarities.clear();
  activePotions.length = 0;
  duplicateRollsLeft = 0;
  localStorage.setItem('mutationTrust', '99999');
  potionLuckMultiplier = 1;
  rollSpeed = 0.25;
  pointDivisor = 1.0;
  shopLuckMultiplier = 11.0;

  inventoryData.clear();
  inventoryList.innerHTML = '';
  rarities.forEach(r => {
    const li = document.createElement('li');
    inventoryData.set(r.name, { rarityObj: r, count: 99999, liElement: li });
    inventoryList.appendChild(li);
  });
  rarityTimestamps = new Map(rarities.map(r => [r.name, now]));
  window.rarityTimestamps = rarityTimestamps;

  achievementsUnlocked.clear();
  ['roller','gambler','discordMod','touchGrass','addicted','insane','joel',
   'crazyAddicted','funkyTown','outsideTime','actually-addicted','what','devoted',
   'get-a-job','genuinely-insane','roll-factory','just-one-more-roll','got-no-life',
   'introverted','holy-hell','dude','please-just-stop','you-will-pay',
   'startingOut','lucky','spammin','leftHanded','insanelyLucky','lunar','jackpot',
   'antimatter','oh-my-god','market-crash','phenomenon','ok-bro','summer'
  ].forEach(id => achievementsUnlocked.add(id));

  localStorage.setItem('mutationsUnlocked', '1');
  localStorage.setItem('starmapUnlocked', '1');
  window.unlockPageDot?.(3);
  window.unlockPageDot?.(4);

  localStorage.setItem('daily_lastClaim', '2000-01-01');
  localStorage.setItem('weekly_lastClaim', '0');
  localStorage.setItem('daily_streak', '9999');
  localStorage.setItem('weekly_streak', '9999');

  localStorage.setItem('starmapData', JSON.stringify({
    constellations: [], voidShards: 999999, lastShardCalc: now,
    shopPurchases: {}, permanentLuckStacks: 99, voidMarketLuck: 0
  }));
  localStorage.setItem('gauntletData', JSON.stringify({ lastSeenRot: 0 }));
  localStorage.setItem('notifications', JSON.stringify([]));
  localStorage.setItem('wishingWell', JSON.stringify({
    lastThrow: 0, totalThrown: 0, totalReceived: 0, timesThrown: 0, successes: 0
  }));
  localStorage.setItem('runesUnlocked', '1');
  localStorage.setItem('runesData', JSON.stringify({
    counts: { rare: 99, 'mid-rare': 99, common: 99 },
    elementals: { water: 99, fire: 99, earth: 99, wizardry: 99 },
    totalDropped: 999
  }));
  localStorage.setItem('runeBlocks', '999999');
  window.unlockPageDot?.(5);
  window.renderRunes?.();

  saveAllData();

  recalcLuckMultiplier();
  updateTotalRolls();
  updatePointsDisplay();
  updateShopUI();
  updateAnomalyUI();
  updateAchievementsUI();
  updatePotionUI();
  updateCollectedCounter();
  renderSortedInventory(document.getElementById('sortSelect')?.value || 'rare');
  window.refreshAllDisplays?.();
  window.renderGauntlets?.();
  window.renderStarmap?.();
  window.renderMutations?.();

  console.log(`done! injected ${rarities.length} rarities into live memory`);
})();
```

## what it gives you

| thing | value |
|---|---|
| all rarities | 99,999x each |
| points | 999,999,999 |
| anomalies | 99,999 (500 consumed for luck) |
| total rolls | 999,999 |
| all shop upgrades | maxed |
| all potions | 99 of each |
| all achievements | unlocked |
| mutations page | unlocked |
| starmap page | unlocked |
| void shards | 999,999 |
| starmap permanent luck stacks | 99 |
| daily / weekly | claimable |
| mutation trust | 99,999 |
| runes page | unlocked |
| all rune types | 99 each |
| elemental runes | 99 each |
| blocks | 999,999 |

## what it does NOT do

- does not touch settings or theme preferences
- does not affect cloud backups
- does not unlock void market items (those are bought manually with the shards)
- does not add gauntlet claims (gauntlets re-check inventory on their own timer, they'll register as claimable within ~4 seconds)

## if the script says "rarities not loaded yet"

the game's scripts haven't finished running. wait a second and try again. this usually only happens if you open devtools and paste immediately after a hard refresh.

## if something breaks after running it

the script calls `saveAllData()` at the end, so everything is written to localStorage. if the UI looks wrong, try navigating between pages (the arrow buttons) to force a re-render, or do a manual page refresh — your injected save will persist.

## keeping this script up to date

if new shop upgrades, potions, or achievements are added to the game, update this script to match. the relevant places to check are:

- `shopUpgrades` object in `main.js`
- `playerPotions` object in `main.js`
- `potionData` object in `main.js`
- `achievementsList` array in `main.js`
- gauntlet tier `id` fields in `gauntlets.js`
