// ==UserScript==
// @name         Animesss Analyzer
// @namespace    https://github.com/Punkalone
// @version      4.4
// @description  Animesss collection, trade, pack, Labyrinth shop and comparison analyzer
// @author       Punkalone
// @match        *://animesss.com/*
// @match        *://*.animesss.com/*
// @match        *://*/*
// @grant        none
// @all-frames   true

// @updateURL    https://raw.githubusercontent.com/Punkalone/Animesss-Analyzer/main/Animesss-Analyzer.user.js
// @downloadURL  https://raw.githubusercontent.com/Punkalone/Animesss-Analyzer/main/Animesss-Analyzer.user.js
// ==/UserScript==

(function () {
    'use strict';

    const ANIMESSS_ANALYZER_IS_TOP = window.top === window;
    const ANIMESSS_ANALYZER_IS_ANIMESSS = /(^|\.)animesss\.com$/i.test(location.hostname);

    if (!(ANIMESSS_ANALYZER_IS_ANIMESSS && ANIMESSS_ANALYZER_IS_TOP)) {
        animesssAnalyzerRunFullscreenFrame();
        return;
    }

    animesssAnalyzerRunFullscreenParent();

    function animesssAnalyzerRunFullscreenParent() {
        const VIDEO_LIFT_VH = 1.2;
        const MSG_TOGGLE_FS = 'AMS_ANALYZER_TOGGLE_CONTAINER_FULLSCREEN';
        const MSG_ENTER_FS = 'AMS_ANALYZER_ENTER_CONTAINER_FULLSCREEN';
        const PLAYER_SELECTOR = '#player_kodik';
        const CARD_SELECTOR = '.card-notification';
        const MODAL_SELECTOR = '.ui-dialog[aria-describedby="card-modal"], .ui-dialog[aria-describedby="trade-card-modal"]';
        const STYLE_ID = 'animesss-analyzer-fullscreen-style';
        const ORIGINAL_PARENT_KEY = '__animesssAnalyzerOriginalParent';
        const ORIGINAL_NEXT_KEY = '__animesssAnalyzerOriginalNext';

        const onReady = (callback) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback, { once: true });
            } else {
                callback();
            }
        };

        onReady(() => {
            injectParentFullscreenStyle();
            patchParentFullscreenRequests();
            setupParentFullscreenLayer();

            setInterval(setupParentFullscreenLayer, 700);
            document.addEventListener('fullscreenchange', setupParentFullscreenLayer, true);

            new MutationObserver(setupParentFullscreenLayer).observe(document.body || document.documentElement, {
                childList: true,
                subtree: true
            });

            window.addEventListener('message', async (event) => {
                if (!event.data) return;

                const player = document.querySelector(PLAYER_SELECTOR);
                if (!player) return;

                if (event.data.type === MSG_TOGGLE_FS) {
                    await togglePlayerFullscreen(player);
                }

                if (event.data.type === MSG_ENTER_FS) {
                    await enterPlayerFullscreen(player);
                }

                setTimeout(setupParentFullscreenLayer, 0);
                setTimeout(setupParentFullscreenLayer, 250);
            });
        });

        function setupParentFullscreenLayer() {
            const player = document.querySelector(PLAYER_SELECTOR);
            if (!player) return;

            player.classList.add('animesss-analyzer-ruby-player');
            player.style.setProperty('--animesss-analyzer-video-lift', `${VIDEO_LIFT_VH}vh`);

            fixCard(player);
            fixModal(player);
        }

        function patchParentFullscreenRequests() {
            if (Element.prototype.__animesssAnalyzerParentFsPatched) return;
            Element.prototype.__animesssAnalyzerParentFsPatched = true;

            const nativeRequest = Element.prototype.requestFullscreen;
            if (!nativeRequest) return;

            Element.prototype.requestFullscreen = function (...args) {
                const player = document.querySelector(PLAYER_SELECTOR);

                if (player && this !== player && player.contains(this)) {
                    return nativeRequest.apply(player, args);
                }

                return nativeRequest.apply(this, args);
            };
        }

        async function togglePlayerFullscreen(player) {
            try {
                if (document.fullscreenElement === player) {
                    await document.exitFullscreen();
                } else {
                    await enterPlayerFullscreen(player);
                }
            } catch (error) {
                console.warn('[Animesss Analyzer FS] fullscreen toggle failed:', error);
            }
        }

        async function enterPlayerFullscreen(player) {
            try {
                if (document.fullscreenElement === player) return;
                await player.requestFullscreen();
            } catch (error) {
                console.warn('[Animesss Analyzer FS] fullscreen open failed:', error);
            }
        }

        function fixCard(player) {
            const card = player.querySelector(CARD_SELECTOR);
            if (!card) return;
            card.classList.add('animesss-analyzer-ruby-card');
        }

        function fixModal(player) {
            const isFullscreen = document.fullscreenElement === player;

            document.querySelectorAll(MODAL_SELECTOR).forEach((modal) => {
                if (!(modal instanceof HTMLElement)) return;

                remember(modal);
                modal.classList.add('animesss-analyzer-ruby-modal');

                if (isFullscreen) {
                    if (!player.contains(modal)) player.appendChild(modal);
                } else {
                    restore(modal);
                }
            });
        }

        function remember(el) {
            if (el[ORIGINAL_PARENT_KEY]) return;
            el[ORIGINAL_PARENT_KEY] = el.parentNode;
            el[ORIGINAL_NEXT_KEY] = el.nextSibling;
        }

        function restore(el) {
            const parent = el[ORIGINAL_PARENT_KEY];
            const next = el[ORIGINAL_NEXT_KEY];

            if (!parent || !document.contains(parent) || el.parentNode === parent) return;

            if (next && document.contains(next)) {
                parent.insertBefore(el, next);
            } else {
                parent.appendChild(el);
            }
        }

        function injectParentFullscreenStyle() {
            if (document.getElementById(STYLE_ID)) return;

            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = `
                #player_kodik.animesss-analyzer-ruby-player {
                    position: relative !important;
                    background: #000 !important;
                    overflow: hidden !important;
                }

                #player_kodik:fullscreen {
                    position: fixed !important;
                    inset: 0 !important;
                    width: 100vw !important;
                    height: 100vh !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #000 !important;
                    overflow: hidden !important;
                }

                #player_kodik:fullscreen > div:not(.card-notification):not(.ui-dialog) {
                    position: absolute !important;
                    left: 0 !important;
                    top: calc(var(--animesss-analyzer-video-lift, 1.2vh) * -1) !important;
                    width: 100% !important;
                    height: calc(100% + var(--animesss-analyzer-video-lift, 1.2vh)) !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #000 !important;
                    overflow: hidden !important;
                }

                #player_kodik:fullscreen iframe {
                    position: absolute !important;
                    inset: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    border: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    z-index: 1 !important;
                }

                #player_kodik .animesss-analyzer-ruby-card,
                #player_kodik:fullscreen .animesss-analyzer-ruby-card {
                    position: fixed !important;
                    right: clamp(16px, 1.4vw, 28px) !important;
                    bottom: clamp(76px, 8vh, 110px) !important;
                    width: clamp(58px, 3.8vw, 70px) !important;
                    height: clamp(87px, 5.7vw, 105px) !important;
                    z-index: 2147483647 !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                    cursor: pointer !important;
                }

                #player_kodik:fullscreen .animesss-analyzer-ruby-modal {
                    position: fixed !important;
                    left: 50% !important;
                    top: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    width: min(500px, calc(100vw - 32px)) !important;
                    max-width: min(500px, calc(100vw - 32px)) !important;
                    max-height: calc(100vh - 48px) !important;
                    height: auto !important;
                    z-index: 2147483647 !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                    pointer-events: auto !important;
                }

                #player_kodik:fullscreen .animesss-analyzer-ruby-modal #card-modal,
                #player_kodik:fullscreen .animesss-analyzer-ruby-modal #trade-card-modal {
                    max-height: calc(100vh - 110px) !important;
                    height: auto !important;
                    overflow: auto !important;
                }
            `;

            document.documentElement.appendChild(style);
        }
    }

    function animesssAnalyzerRunFullscreenFrame() {
        if (window.top === window) return;

        const MSG_TOGGLE_FS = 'AMS_ANALYZER_TOGGLE_CONTAINER_FULLSCREEN';
        const MSG_ENTER_FS = 'AMS_ANALYZER_ENTER_CONTAINER_FULLSCREEN';
        const KODIK_FS_SELECTOR = '.fp-x-fullscreen, #footer > div.fp-controls > a';
        const STYLE_ID = 'animesss-analyzer-frame-fullscreen-style';

        patchFrameFullscreenRequests();

        const onReady = (callback) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', callback, { once: true });
            } else {
                callback();
            }
        };

        onReady(() => {
            injectFrameStyle();
            interceptKodikControls();

            setInterval(interceptKodikControls, 500);

            new MutationObserver(interceptKodikControls).observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        });

        document.addEventListener('keydown', interceptFullscreenHotkeys, true);
        document.addEventListener('dblclick', interceptFullscreenGesture, true);

        function patchFrameFullscreenRequests() {
            if (Element.prototype.__animesssAnalyzerFrameFsPatched) return;
            Element.prototype.__animesssAnalyzerFrameFsPatched = true;

            const fakeFullscreen = function () {
                window.parent.postMessage({ type: MSG_ENTER_FS }, '*');
                return Promise.resolve();
            };

            Element.prototype.requestFullscreen = fakeFullscreen;

            if (Element.prototype.webkitRequestFullscreen) Element.prototype.webkitRequestFullscreen = fakeFullscreen;
            if (Element.prototype.mozRequestFullScreen) Element.prototype.mozRequestFullScreen = fakeFullscreen;
            if (Element.prototype.msRequestFullscreen) Element.prototype.msRequestFullscreen = fakeFullscreen;
        }

        function interceptFullscreenHotkeys(event) {
            const key = String(event.key || '').toLowerCase();

            if (key === 'f') {
                stopOnly(event);
                window.parent.postMessage({ type: MSG_TOGGLE_FS }, '*');
            }
        }

        function interceptFullscreenGesture(event) {
            stopOnly(event);
            window.parent.postMessage({ type: MSG_TOGGLE_FS }, '*');
        }

        function interceptKodikControls() {
            const buttons = document.querySelectorAll(KODIK_FS_SELECTOR);

            for (const button of buttons) {
                if (!(button instanceof HTMLElement)) continue;

                button.classList.add('animesss-analyzer-ruby-native-fs-button');
                button.title = 'Fullscreen with cards';

                if (button.dataset.animesssAnalyzerIntercepted === '1') continue;
                button.dataset.animesssAnalyzerIntercepted = '1';
                button.tabIndex = -1;

                button.addEventListener('pointerdown', stopOnly, true);
                button.addEventListener('mousedown', stopOnly, true);
                button.addEventListener('mouseup', stopOnly, true);
                button.addEventListener('keydown', stopOnly, true);

                button.addEventListener('click', (event) => {
                    stopOnly(event);
                    button.blur();

                    window.parent.postMessage({ type: MSG_TOGGLE_FS }, '*');

                    setTimeout(() => button.blur(), 0);
                }, true);
            }
        }

        function stopOnly(event) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation?.();
        }

        function injectFrameStyle() {
            if (document.getElementById(STYLE_ID)) return;

            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = `
                @keyframes animesssAnalyzerRubyFlow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                .animesss-analyzer-ruby-native-fs-button {
                    background: linear-gradient(135deg, #360513, #8d173f, #e0477f, #9f1b4a, #2a0410) !important;
                    background-size: 260% 260% !important;
                    animation: animesssAnalyzerRubyFlow 3.2s ease infinite !important;
                    box-shadow:
                        0 0 0 1px rgba(255,210,226,.28) inset,
                        0 0 16px rgba(224,71,127,.75) !important;
                    outline: none !important;
                    user-select: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                }

                .animesss-analyzer-ruby-native-fs-button:hover {
                    box-shadow:
                        0 0 0 1px rgba(255,230,238,.52) inset,
                        0 0 24px rgba(255,77,145,.95) !important;
                    filter: brightness(1.12) !important;
                }

                .animesss-analyzer-ruby-native-fs-button svg,
                .animesss-analyzer-ruby-native-fs-button .fp-fill,
                .animesss-analyzer-ruby-native-fs-button svg path {
                    fill: #fff6fa !important;
                }
            `;

            document.documentElement.appendChild(style);
        }
    }


    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap';
    document.head.appendChild(fontLink);

    const style = document.createElement('style');
    style.textContent = `
        #animesss-btn, #animesss-progress-box, #animesss-results, #animesss-update-notif, #animesss-intro-notif, #animesss-trade-analysis {
            --an-void: #0a0a0d;
            --an-panel: #131317;
            --an-panel-raised: #1c1c22;
            --an-line: rgba(255,255,255,0.09);
            --an-red: #d6304a;
            --an-red-bright: #ff5a72;
            --an-wine: #5c1626;
            --an-rose: #e8a598;
            --an-violet: #9b7fe8;
            --an-mint: #4ce0a0;
            --an-ink: #f3f1ec;
            --an-ink-dim: #9d9aa6;
            --an-display: 'Manrope', 'Segoe UI', sans-serif;
            --an-body: 'Inter', 'Segoe UI', sans-serif;
            --an-mono: 'JetBrains Mono', 'Consolas', monospace;
            font-family: var(--an-body);
        }

        @keyframes animesssGlowGold {
            0% { box-shadow: 0 0 20px rgba(214,48,74,.45); }
            50% { box-shadow: 0 0 34px rgba(214,48,74,.7); }
            100% { box-shadow: 0 0 20px rgba(214,48,74,.45); }
        }

        @keyframes animesssCardAppear {
            from { opacity:0; transform:translateY(20px); }
            to { opacity:1; transform:translateY(0); }
        }

        @keyframes animesssCardFlipIn {
            0% { opacity:0; transform: perspective(600px) translateY(18px) rotateX(-14deg) scale(.94); }
            100% { opacity:1; transform: perspective(600px) translateY(0) rotateX(0deg) scale(1); }
        }

        @keyframes animesssPulseOrange {
            0%, 100% { box-shadow: 0 0 28px rgba(214,48,74,.45); }
            50% { box-shadow: 0 0 42px rgba(214,48,74,.7); }
        }

        @keyframes animesssGlowSilver {
            0% { box-shadow: 0 0 20px rgba(200,200,210,.45); }
            50% { box-shadow: 0 0 30px rgba(200,200,210,.65); }
            100% { box-shadow: 0 0 20px rgba(200,200,210,.45); }
        }

        @keyframes animesssGlowBronze {
            0% { box-shadow: 0 0 18px rgba(190,120,70,.45); }
            50% { box-shadow: 0 0 28px rgba(190,120,70,.65); }
            100% { box-shadow: 0 0 18px rgba(190,120,70,.45); }
        }

        @keyframes animesssFoilSweep {
            0% { background-position: 0% 0%, 0% 50%; }
            100% { background-position: 0% 0%, 200% 50%; }
        }

        @keyframes animesssSingleSweep {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
        }

        @keyframes animesssShimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(400%); }
        }

        @keyframes animesssTitleShine {
            0% { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
        }

        .animesss-shimmer-title {
            background: linear-gradient(90deg, var(--an-ink) 0%, var(--an-ink) 35%, var(--an-red-bright) 48%, var(--an-rose) 52%, var(--an-ink) 65%, var(--an-ink) 100%);
            background-size: 250% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: animesssTitleShine 5s linear infinite;
        }

        .animesss-menu-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 30px;
            height: 30px;
            background: rgba(10,10,13,0.65);
            color: var(--an-ink);
            border-radius: 9px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 60;
            font-size: 18px;
            line-height: 1;
            transition: background 0.2s, border-color .2s;
            backdrop-filter: blur(6px);
            border: 1px solid var(--an-line);
            user-select: none;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
        }
        .animesss-menu-btn:hover {
            background: rgba(214,48,74,0.85);
            color: #1a1408;
            border-color: var(--an-red);
        }
        .animesss-menu-popup {
            display: none;
            position: absolute;
            top: 42px;
            right: 8px;
            background: var(--an-panel-raised);
            border: 1px solid var(--an-line);
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.55);
            z-index: 70;
            overflow: hidden;
            min-width: 150px;
        }
        .animesss-card.animesss-menu-active {
            z-index: 80 !important;
            transform: perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1) !important;
            transition: none !important;
        }
        .animesss-card.animesss-menu-active .animesss-card-glare {
            opacity: 0 !important;
            pointer-events: none !important;
        }
        .animesss-menu-item {
            padding: 10px 14px;
            font-size: 13px;
            font-family: var(--an-body);
            color: var(--an-ink-dim);
            cursor: pointer;
            transition: background 0.2s, color .2s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .animesss-menu-item:hover {
            background: rgba(214,48,74,0.12);
            color: var(--an-red-bright);
        }
        .animesss-archive-tools {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 5px;
            min-width: 142px;
        }
        #animesss-select-mode,
        #animesss-select-cancel {
            min-height: 29px;
            padding: 5px 10px;
            border-radius: 8px;
            font-family: var(--an-body);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: .35px;
            cursor: pointer;
            transition: background .18s, border-color .18s, color .18s, box-shadow .18s;
        }
        #animesss-select-mode {
            border: 1px solid rgba(214,48,74,.42);
            background: rgba(214,48,74,.09);
            color: var(--an-red-bright);
        }
        #animesss-select-mode:hover,
        #animesss-select-mode.animesss-selection-ready {
            border-color: var(--an-red-bright);
            background: rgba(214,48,74,.2);
            box-shadow: 0 0 16px rgba(214,48,74,.18);
        }
        #animesss-select-mode:disabled {
            cursor: default;
            opacity: .58;
            box-shadow: none;
        }
        #animesss-select-cancel {
            display: none;
            border: 1px solid var(--an-line);
            background: rgba(255,255,255,.035);
            color: var(--an-ink-dim);
        }
        .animesss-card-select-circle {
            position: absolute;
            top: 9px;
            left: 9px;
            width: 25px;
            height: 25px;
            box-sizing: border-box;
            display: grid;
            place-items: center;
            border: 2px solid rgba(255,255,255,.28);
            border-radius: 50%;
            background: rgba(8,8,11,.88);
            color: transparent;
            font-size: 15px;
            font-weight: 900;
            line-height: 1;
            z-index: 65;
            pointer-events: none;
            box-shadow: 0 3px 12px rgba(0,0,0,.55);
            transition: background .16s, border-color .16s, color .16s, transform .16s, box-shadow .16s;
        }
        .animesss-card.animesss-card-selected .animesss-card-select-circle {
            border-color: #ff8298;
            background: linear-gradient(145deg, #8f1634, #dc3558);
            color: #fff8fa;
            transform: scale(1.08);
            box-shadow: 0 0 0 3px rgba(214,48,74,.18), 0 0 18px rgba(214,48,74,.55);
        }
        .animesss-card.animesss-card-selected {
            outline: 2px solid rgba(255,90,114,.72);
            outline-offset: -2px;
        }
        .animesss-new-tag {
            position: absolute;
            top: 12px;
            left: -32px;
            background: var(--an-mint);
            color: #06261a;
            font-family: var(--an-mono);
            font-weight: 700;
            font-size: 10px;
            letter-spacing: 0.5px;
            padding: 3px 32px;
            transform: rotate(-45deg);
            box-shadow: 0 0 14px rgba(76,224,160,.55);
            text-transform: uppercase;
            z-index: 5;
            pointer-events: none;
            transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .animesss-dup-count {
            position: absolute;
            top: 40px;
            right: 8px;
            min-width: 26px;
            height: 26px;
            padding: 0 6px;
            background: rgba(10,10,13,0.75);
            color: var(--an-wine);
            border: 1.5px solid var(--an-wine);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: var(--an-mono);
            font-weight: 700;
            font-size: 11px;
            z-index: 9;
            pointer-events: none;
            backdrop-filter: blur(4px);
        }
        #animesss-search {
            background: var(--an-panel-raised);
            border: 1px solid var(--an-line);
            border-radius: 10px;
            color: var(--an-ink);
            font-family: var(--an-body);
            padding: 9px 14px;
            font-size: 14px;
            width: 200px;
            outline: none;
            transition: border-color 0.2s, box-shadow .2s;
        }
        #animesss-search::placeholder { color: var(--an-ink-dim); }
        #animesss-search:focus {
            border-color: var(--an-red);
            box-shadow: 0 0 0 3px rgba(214,48,74,0.15);
        }
        .animesss-results-header {
            display: grid;
            grid-template-columns: minmax(240px, 1fr) auto;
            grid-template-areas:
                "title filters"
                "actions actions";
            align-items: end;
            column-gap: 15px;
            row-gap: 15px;
            margin-bottom: 24px;
        }
        .animesss-results-title { grid-area: title; }
        .animesss-results-filters {
            grid-area: filters;
            display: flex;
            gap: 8px;
            align-items: center;
            justify-content: flex-end;
        }
        .animesss-results-actions {
            grid-area: actions;
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }
        @media (max-width: 900px) {
            .animesss-results-header {
                grid-template-columns: minmax(0, 1fr);
                grid-template-areas:
                    "title"
                    "filters"
                    "actions";
            }
            .animesss-results-filters {
                justify-content: flex-start;
                flex-wrap: wrap;
            }
        }
        .animesss-stat-filter {
            background: transparent;
            border: none;
            color: var(--an-ink);
            font-family: var(--an-mono);
            font-weight: 600;
            padding: 9px 2px;
            font-size: 14px;
            width: 48px;
            outline: none;
            text-align: center;
        }
        /* Убираем стрелочки у input type=number */
        .animesss-stat-filter::-webkit-inner-spin-button,
        .animesss-stat-filter::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .animesss-filter-group {
            display: flex;
            align-items: stretch;
            background: var(--an-panel-raised);
            border: 1px solid var(--an-line);
            border-radius: 10px;
            overflow: hidden;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .animesss-filter-group:focus-within {
            border-color: var(--an-red);
            box-shadow: 0 0 0 3px rgba(214,48,74,0.15);
        }
        .animesss-filter-icon {
            display: flex;
            align-items: center;
            padding: 0 4px 0 12px;
            font-size: 14px;
            user-select: none;
            opacity: 0.85;
        }
        .animesss-dir-toggle {
            display: flex;
            flex-direction: column;
            border-left: 1px solid var(--an-line);
        }
        .animesss-dir-btn {
            all: unset;
            box-sizing: border-box;
            cursor: pointer;
            width: 22px;
            flex: 1 1 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            line-height: 1;
            color: var(--an-ink-dim);
            background: rgba(0,0,0,0.25);
            transition: background 0.15s ease, color 0.15s ease;
        }
        .animesss-dir-btn:first-child {
            border-bottom: 1px solid var(--an-line);
        }
        .animesss-dir-btn:hover {
            color: var(--an-ink);
            background: rgba(255,255,255,0.08);
        }
        .animesss-dir-btn.active {
            color: #1a1408;
            background: var(--an-red);
        }
        .animesss-dir-btn.active:hover {
            background: var(--an-red-bright);
        }
        .animesss-card-glare {
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 6;
            opacity: 0;
            transition: opacity 0.3s ease;
            border-radius: inherit;
        }
        @keyframes animesssFlashGold {
            0% { border-color: var(--an-red); box-shadow: 0 0 25px rgba(214,48,74,.55); border-width: 2px; }
            100% { border-color: var(--an-line); box-shadow: none; border-width: 1px; }
        }
        .animesss-searching-flash {
            animation: animesssFlashGold 2s ease-out forwards !important;
        }
        @keyframes animesssMarkSeenIn {
            0% { opacity: 0; transform: scale(0.8) translateY(-6px); }
            60% { opacity: 1; transform: scale(1.04) translateY(0); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animesss-mark-seen-btn {
            display: none;
            align-items: center;
            gap: 7px;
            cursor: pointer;
            padding: 8px 18px;
            border-radius: 10px;
            border: 1px solid rgba(76,224,160,0.4);
            background: rgba(76,224,160,0.1);
            color: var(--an-mint);
            font-family: var(--an-body);
            font-weight: 600;
            font-size: 13px;
            letter-spacing: 0.2px;
            backdrop-filter: blur(3px);
            transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
        }
        .animesss-mark-seen-btn.animesss-mark-seen-visible {
            display: inline-flex;
            animation: animesssMarkSeenIn 0.35s cubic-bezier(.22,1,.36,1) both;
        }
        .animesss-mark-seen-btn:hover {
            background: rgba(76,224,160,0.18);
            box-shadow: 0 0 16px rgba(76,224,160,0.3);
            border-color: var(--an-mint);
            transform: scale(1.04);
        }
        .animesss-mark-seen-btn:active {
            transform: scale(0.97);
        }
        .animesss-card-foil {
            border: 2px solid transparent !important;
            background-image: linear-gradient(var(--an-panel), var(--an-panel)), linear-gradient(115deg, var(--an-red) 0%, var(--an-rose) 22%, var(--an-red-bright) 40%, var(--an-violet) 60%, var(--an-mint) 78%, var(--an-red) 100%);
            background-origin: border-box;
            background-clip: padding-box, border-box;
            background-size: 100% 100%, 300% 300%;
            animation: animesssFoilSweep 4s ease-in-out infinite, animesssGlowGold 2.2s infinite !important;
            position: relative;
        }
        .animesss-card-foil::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.16) 45%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0.16) 55%, transparent 70%);
            background-size: 250% 250%;
            animation: animesssSingleSweep 4s ease-in-out infinite;
            pointer-events: none;
            z-index: 4;
            mix-blend-mode: overlay;
        }
        .animesss-lazy-stats {
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: var(--an-mono);
            font-size: 13px;
            color: var(--an-ink);
            transition: color 0.3s ease, opacity 0.3s ease;
        }
        .animesss-stat {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 0 8px;
        }
        .animesss-stat b { font-weight: 700; }
        .animesss-stat-sep {
            width: 1px;
            height: 12px;
            background: var(--an-line);
        }
        #animesss-trade-analysis {
            width: 100%;
            height: 100%;
            max-width: calc(100vw - 24px);
            max-height: 100%;
            box-sizing: border-box;
            background: linear-gradient(160deg, rgba(28,28,34,.98), rgba(12,12,16,.98));
            border: 1px solid rgba(255,90,114,.28);
            border-top: 2px solid var(--an-red);
            border-radius: 14px 0 0 14px;
            padding: 14px;
            color: var(--an-ink);
            box-shadow: 0 16px 45px rgba(0,0,0,.42), 0 0 30px rgba(214,48,74,.16);
            overflow-x: hidden;
            overflow-y: auto;
            position: relative;
            animation: none;
            opacity: 1;
            visibility: visible;
            transform: none;
            clip-path: inset(0);
            transition: clip-path .34s cubic-bezier(.22,.75,.25,1);
        }
        #animesss-trade-shell {
            position: absolute;
            top: 0;
            right: 100%;
            width: 480px;
            height: 100%;
            z-index: -1;
            pointer-events: auto;
            transform: translateX(0);
            transition: transform .34s cubic-bezier(.22, .75, .25, 1);
        }
        #animesss-trade-shell.animesss-trade-collapsed {
            pointer-events: none;
            transform: translateX(100%);
        }
        #animesss-trade-shell.animesss-trade-collapsed::after {
            opacity: 0;
        }
        #animesss-trade-shell.animesss-trade-collapsed #animesss-trade-analysis {
            opacity: 1;
            visibility: visible;
            transform: none;
            clip-path: inset(0 100% 0 0);
            pointer-events: none;
        }
        #animesss-trade-shell.animesss-trade-shell-right.animesss-trade-collapsed #animesss-trade-analysis {
            transform: none;
            clip-path: inset(0 0 0 100%);
        }
        .animesss-trade-toggle {
            position: absolute;
            top: 50%;
            left: -26px;
            right: auto;
            width: 26px;
            height: 42px;
            border-radius: 9px;
            border: 1px solid rgba(255,90,114,.55);
            background: linear-gradient(160deg, rgba(92,22,38,.98), rgba(214,48,74,.92));
            color: #fff5f6;
            font-family: var(--an-mono);
            font-size: 17px;
            font-weight: 900;
            display: grid;
            place-items: center;
            cursor: pointer;
            z-index: 5;
            box-shadow: 0 0 18px rgba(214,48,74,.38), 0 12px 24px rgba(0,0,0,.35);
            transform: translateY(-50%);
            transition: transform .16s ease, box-shadow .16s ease, filter .16s ease;
            pointer-events: auto;
        }
        .animesss-trade-toggle:hover {
            filter: brightness(1.12);
            box-shadow: 0 0 24px rgba(255,90,114,.55), 0 12px 24px rgba(0,0,0,.35);
        }
        .animesss-trade-toggle:active {
            transform: translateY(-50%) scale(.96);
        }
        #animesss-trade-shell.animesss-trade-shell-right .animesss-trade-toggle {
            left: auto;
            right: -26px;
        }
        #animesss-trade-shell.animesss-trade-shell-right.animesss-trade-collapsed {
            transform: translateX(-100%);
        }
        #animesss-trade-shell.animesss-trade-shell-right #animesss-trade-analysis {
            border-radius: 0 14px 14px 0;
        }
        #animesss-trade-shell::after {
            content: '';
            display: none;
            position: absolute;
            right: -1px;
            top: 0;
            width: 1px;
            height: 100%;
            background: linear-gradient(180deg, rgba(255,90,114,.75), rgba(255,90,114,.18), rgba(255,90,114,.75));
            box-shadow: 0 0 14px rgba(255,90,114,.35);
        }
        #animesss-trade-shell.animesss-trade-shell-right::after {
            left: -1px;
            right: auto;
        }
        #animesss-trade-shell.animesss-trade-shell-right {
            left: 100%;
            right: auto;
        }
        #animesss-trade-analysis::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,.08) 46%, transparent 72%);
            transform: translateX(-120%);
            animation: animesssShimmer 3.8s ease-in-out infinite;
            pointer-events: none;
        }
        .animesss-trade-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            margin-bottom: 12px;
            position: relative;
            z-index: 1;
        }
        .animesss-trade-kicker {
            font-family: var(--an-body);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.8px;
            text-transform: uppercase;
            color: var(--an-red-bright);
        }
        .animesss-trade-verdict {
            font-family: var(--an-display);
            font-size: 18px;
            font-weight: 800;
            color: var(--an-ink);
            margin-top: 3px;
        }
        .animesss-trade-gauge {
            --score: 50;
            --needle-angle: -90deg;
            width: min(310px, 100%);
            height: 150px;
            margin: -2px auto 12px;
            position: relative;
            z-index: 1;
        }
        .animesss-trade-arc-svg {
            position: absolute;
            left: 0;
            right: 0;
            top: 0;
            width: 100%;
            height: 126px;
            overflow: visible;
            filter: drop-shadow(0 0 10px rgba(214,48,74,.18));
        }
        .animesss-trade-arc-svg path {
            fill: none;
            stroke-width: 26;
            stroke-linecap: butt;
        }
        .animesss-trade-needle {
            position: absolute;
            left: 50%;
            bottom: 32px;
            width: 38%;
            height: 4px;
            background: linear-gradient(90deg, transparent, #f3f1ec 28%, var(--an-red-bright));
            border-radius: 999px;
            transform-origin: 0 50%;
            transform: rotate(var(--needle-angle));
            transition: transform 1s cubic-bezier(.22,1,.36,1);
            box-shadow: 0 0 12px rgba(255,90,114,.7);
        }
        @keyframes animesssTradeNeedleTwitch {
            0%, 100% { transform: rotate(var(--needle-angle)); }
            35% { transform: rotate(calc(var(--needle-angle) - 1.4deg)); }
            68% { transform: rotate(calc(var(--needle-angle) + 1.2deg)); }
        }
        #animesss-trade-analysis.animesss-trade-ready .animesss-trade-needle {
            animation: animesssTradeNeedleTwitch 1.35s ease-in-out .65s infinite;
        }
        .animesss-trade-needle::after {
            content: '';
            position: absolute;
            left: -8px;
            top: 50%;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--an-panel-raised);
            border: 2px solid var(--an-red-bright);
            transform: translateY(-50%);
            box-shadow: 0 0 12px rgba(255,90,114,.55);
        }
        .animesss-trade-scale-labels {
            position: absolute;
            inset: 0;
            font-family: var(--an-mono);
            font-size: 8.5px;
            font-weight: 800;
            color: rgba(243,241,236,.84);
            letter-spacing: .4px;
            text-transform: uppercase;
            pointer-events: none;
        }
        .animesss-trade-scale-labels span {
            position: absolute;
            padding: 3px 6px;
            border-radius: 999px;
            background: rgba(10,10,13,.78);
            border: 1px solid rgba(255,255,255,.1);
            text-shadow: 0 1px 2px rgba(0,0,0,.75);
        }
        .animesss-trade-scale-labels span:first-child {
            left: 7%;
            bottom: 8px;
        }
        .animesss-trade-scale-labels span:nth-child(2) {
            left: 50%;
            top: 44px;
            transform: translateX(-50%);
        }
        .animesss-trade-scale-labels span:last-child {
            right: 7%;
            bottom: 8px;
        }
        .animesss-trade-columns {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
            position: relative;
            z-index: 1;
        }
        .animesss-trade-side {
            background: rgba(10,10,13,.55);
            border: 1px solid var(--an-line);
            border-radius: 10px;
            padding: 10px;
            min-width: 0;
        }
        .animesss-trade-card-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(165px, 1fr));
            gap: 8px;
        }
        .animesss-trade-side-title {
            font-family: var(--an-body);
            font-size: 11px;
            font-weight: 800;
            color: var(--an-ink-dim);
            text-transform: uppercase;
            letter-spacing: .8px;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,.07);
        }
        .animesss-trade-card-row {
            display: grid;
            grid-template-columns: 42px minmax(0, 1fr);
            gap: 8px;
            align-items: center;
            padding: 8px;
            border: 1px solid rgba(255,255,255,.07);
            border-radius: 8px;
            background: rgba(255,255,255,.025);
            min-width: 0;
        }
        .animesss-trade-card-row img {
            width: 42px;
            aspect-ratio: 2/3;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,.14);
        }
        .animesss-trade-card-name {
            font-family: var(--an-body);
            font-size: 12px;
            font-weight: 800;
            color: var(--an-ink);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .animesss-trade-card-stats {
            margin-top: 4px;
            display: grid;
            grid-template-columns: repeat(4, max-content);
            gap: 6px;
            font-family: var(--an-mono);
            font-size: 9.5px;
            color: var(--an-ink-dim);
            white-space: nowrap;
            align-items: center;
            overflow: hidden;
        }
        .animesss-trade-card-stats span {
            display: inline-flex;
            align-items: center;
            line-height: 1;
        }
        .animesss-trade-loading {
            font-family: var(--an-body);
            font-size: 13px;
            color: var(--an-ink-dim);
            text-align: center;
            padding: 18px 10px;
            position: relative;
            z-index: 1;
        }
        @media screen and (max-width: 560px) {
            .animesss-trade-columns { grid-template-columns: 1fr; }
            .animesss-trade-head { align-items: flex-start; flex-direction: column; }
            #animesss-trade-analysis { width: calc(100vw - 24px); height: auto; max-height: none; border-radius: 14px; }
            #animesss-trade-shell { position: relative; left: auto; right: auto; top: auto; width: 100%; height: auto; margin-bottom: 12px; }
        }
        .animesss-empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--an-ink-dim);
            font-family: var(--an-body);
            font-size: 16px;
        }
    `;
    document.head.appendChild(style);

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const parser = new DOMParser();
    const normalizeStatValue = value => {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? number : 0;
    };
    const hasCompleteStats = card => ['total', 'wanted', 'trade'].every(key => {
        const raw = card?.[key];
        if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) return false;
        const value = Number(raw);
        return Number.isFinite(value) && value >= 0;
    });
    const readStatValue = (doc, selector) => normalizeStatValue(doc.querySelector(selector)?.textContent);
    const normalizeCardStats = card => {
        const hadInvalidStats = ['total', 'wanted', 'trade'].some(key => {
            const raw = card?.[key];
            if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) return true;
            const value = Number(raw);
            return !Number.isFinite(value) || value < 0;
        });
        card.total = normalizeStatValue(card.total);
        card.wanted = normalizeStatValue(card.wanted);
        card.trade = normalizeStatValue(card.trade);
        if (hadInvalidStats) delete card.lastUpdate;
        return card;
    };
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

    async function fetchWithRetry(url, retries = 3) {
        for (let i = 1; i <= retries; i++) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return await response.text();
            } catch (e) {
                console.warn(`Ошибка ${url} | попытка ${i}/${retries}`);
                if (i === retries) throw e;
                await sleep(3000);
            }
        }
    }

    function extractCardIdFromHref(href) {
        try {
            return new URL(href, location.origin).searchParams.get('id');
        } catch (e) {
            return String(href || '').match(/[?&]id=(\d+)/)?.[1] || '';
        }
    }

    function prettifyCardNameFromImage(src, fallback) {
        const file = decodeURIComponent(String(src || '').split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '');
        const clean = file.replace(/-\d+(?:-\d+)?$/g, '').replace(/[-_]+/g, ' ').trim();
        if (!clean) return fallback;
        const readable = /[а-яё]/i.test(clean) ? clean : transliterateSlugToRussian(clean);
        return readable.replace(/(^|\s)\S/g, letter => letter.toUpperCase());
    }

    function transliterateSlugToRussian(text) {
        const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
        const overrides = {
            zheltye: 'желтые',
            zheltyj: 'желтый',
            zheltaya: 'желтая',
            zheltoe: 'желтое',
            kolokolchiki: 'колокольчики',
            para: 'пара',
            rejd: 'рейд'
        };
        const tokens = ['shch', 'yo', 'yu', 'ya', 'zh', 'kh', 'ts', 'ch', 'sh', 'sch', 'ye', 'iy', 'y', 'a', 'b', 'v', 'g', 'd', 'e', 'z', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'f', 'h', 'c'];
        const map = {
            shch: 'щ', sch: 'щ', yo: 'ё', yu: 'ю', ya: 'я', zh: 'ж', kh: 'х', ts: 'ц', ch: 'ч', sh: 'ш', ye: 'е', iy: 'ий',
            y: 'ы', a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', e: 'е', z: 'з', i: 'и', j: 'й', k: 'к', l: 'л', m: 'м',
            n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'к'
        };

        return words.map(word => {
            if (overrides[word]) return overrides[word];
            let result = '';
            for (let i = 0; i < word.length;) {
                const token = tokens.find(item => word.startsWith(item, i));
                if (token) {
                    result += map[token];
                    i += token.length;
                } else {
                    result += word[i];
                    i++;
                }
            }
            return result;
        }).join(' ');
    }

    function normalizeTradeCardName(candidate, fallback) {
        const name = String(candidate || '').trim();
        if (/[а-яё]/i.test(name)) return name;
        return String(fallback || name || 'Карта').trim();
    }

    function extractRankFromImage(src) {
        const parts = String(src || '').toLowerCase().split('/').filter(Boolean);
        const rank = parts.find(part => ['e', 'd', 'c', 'b', 'a', 's', 'ass', 'sss'].includes(part));
        return (rank || 'e').toUpperCase();
    }

    function getTradeCardValue(card) {
        return Math.max(0, Number(card.wanted) || 0);
    }

    function getTradeVerdict(percent, delta) {
        if (percent >= 85) return { label: 'Очень выгодно', tone: 'var(--an-mint)' };
        if (percent >= 58) return { label: 'Выгодно', tone: '#9bd84d' };
        if (percent >= 46) return { label: 'Ровный обмен', tone: '#d8bd55' };
        if (percent >= 34) return { label: 'Сомнительно', tone: '#ff8b52' };
        if (percent <= 12) return { label: 'Очень невыгодно', tone: 'var(--an-red-bright)' };
        return { label: 'Невыгодно', tone: 'var(--an-red-bright)' };
    }

    function calculateTradeScore(receiveCards, giveCards) {
        const receiveScore = receiveCards.reduce((sum, card) => sum + getTradeCardValue(card), 0);
        const giveScore = giveCards.reduce((sum, card) => sum + getTradeCardValue(card), 0);
        const delta = receiveScore - giveScore;
        let percent = 50;
        if (giveScore > 0) {
            const demandRatio = receiveScore / giveScore;
            percent = demandRatio > 1
                ? Math.round(58 + ((demandRatio - 1) / 0.5) * 42)
                : Math.round((demandRatio - 0.5) * 100);
        } else if (receiveScore > 0) {
            percent = 100;
        }
        percent = Math.max(0, Math.min(100, percent));
        return { receiveScore, giveScore, delta, percent, verdict: getTradeVerdict(percent, delta) };
    }

    async function getTradeCardStats(card) {
        const cacheKey = `animesss_trade_card_${card.id}`;
        const maxAge = 1000 * 60 * 60 * 12;
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            if (cached && Date.now() - cached.cachedAt < maxAge) {
                return { ...card, ...cached, name: normalizeTradeCardName(cached.name, card.name) };
            }
        } catch (e) {}

        try {
            const html = await fetchWithRetry(`/cards/users/?id=${card.id}`, 2);
            const doc = parser.parseFromString(html, 'text/html');
            const parsedName = doc.querySelector('.card-modal__name, .anime-card__name, .card__name, h1, h2')?.textContent?.trim();
            const stats = {
                name: normalizeTradeCardName(parsedName, card.name),
                total: readStatValue(doc, '#owners-count'),
                wanted: readStatValue(doc, '#owners-need'),
                trade: readStatValue(doc, '#owners-trade'),
                cachedAt: Date.now()
            };
            localStorage.setItem(cacheKey, JSON.stringify(stats));
            return { ...card, ...stats };
        } catch (e) {
            return { ...card, total: 0, wanted: 0, trade: 0 };
        }
    }

    function collectTradeCards(group) {
        return [...group.querySelectorAll('a.trade__main-item[href*="/cards/users/"]')].map((link, index) => {
            const img = link.querySelector('img');
            const src = img?.getAttribute('src') || '';
            const href = link.getAttribute('href') || '';
            return {
                id: extractCardIdFromHref(href) || `unknown-${index}`,
                href,
                image: src,
                rank: extractRankFromImage(src),
                name: prettifyCardNameFromImage(src, `Карта #${index + 1}`)
            };
        }).filter(card => card.id);
    }

    function renderTradeCardLine(card) {
        return `
            <div class="animesss-trade-card-row">
                <img src="${escapeHtml(card.image)}" alt="">
                <div>
                    <div class="animesss-trade-card-name" title="${escapeHtml(card.name)}">${escapeHtml(card.name)}</div>
                    <div class="animesss-trade-card-stats">
                        <span>${escapeHtml(card.rank)}</span>
                        <span>❤️ ${card.wanted}</span>
                        <span>👥 ${card.total}</span>
                        <span>🔄 ${card.trade}</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderTradeAnalysis(panel, receiveCards, giveCards) {
        const result = calculateTradeScore(receiveCards, giveCards);
        const needleAngle = -180 + (result.percent * 1.8);
        panel.innerHTML = `
            <div class="animesss-trade-head">
                <div>
                    <div class="animesss-trade-kicker">◆ Animesss Trade Analyzer</div>
                    <div class="animesss-trade-verdict" style="color:${result.verdict.tone};">${result.verdict.label}</div>
                </div>
            </div>
            <div class="animesss-trade-gauge" style="--score:${result.percent}; --needle-angle:${needleAngle}deg;">
                <svg class="animesss-trade-arc-svg" viewBox="0 0 260 138" aria-hidden="true">
                    <path d="M 30 118 A 100 100 0 0 1 58 49" stroke="#e04a57"></path>
                    <path d="M 60 47 A 100 100 0 0 1 100 22" stroke="#ff7b42"></path>
                    <path d="M 104 21 A 100 100 0 0 1 156 21" stroke="#c9a449"></path>
                    <path d="M 160 22 A 100 100 0 0 1 200 47" stroke="#8fd23d"></path>
                    <path d="M 202 49 A 100 100 0 0 1 230 118" stroke="#4ce0a0"></path>
                </svg>
                <div class="animesss-trade-needle"></div>
                <div class="animesss-trade-scale-labels"><span>Невыгодно</span><span>Ровно</span><span>Выгодно</span></div>
            </div>
            <div class="animesss-trade-columns">
                <div class="animesss-trade-side">
                    <div class="animesss-trade-side-title">Тебе предлагают</div>
                    <div class="animesss-trade-card-list">
                        ${receiveCards.map(renderTradeCardLine).join('') || '<div class="animesss-trade-loading">Нет карт</div>'}
                    </div>
                </div>
                <div class="animesss-trade-side">
                    <div class="animesss-trade-side-title">У тебя просят</div>
                    <div class="animesss-trade-card-list">
                        ${giveCards.map(renderTradeCardLine).join('') || '<div class="animesss-trade-loading">Нет карт</div>'}
                    </div>
                </div>
            </div>
        `;
        panel.classList.remove('animesss-trade-ready');
        requestAnimationFrame(() => panel.classList.add('animesss-trade-ready'));
    }

    function getTradeDialogFromModal(modal) {
        return modal.closest('.ui-dialog') || modal;
    }

    function positionTradeAnalysisShell(shell, tradeDialog) {
        if (!shell || !tradeDialog || !document.contains(tradeDialog)) return;
        tradeDialog.style.overflow = 'visible';
        const rect = tradeDialog.getBoundingClientRect();
        const leftSpace = Math.max(0, rect.left - 8);
        const shellWidth = leftSpace >= 320
            ? Math.min(480, leftSpace)
            : Math.min(480, Math.max(320, window.innerWidth - 24));
        const canFitLeft = rect.left >= shellWidth + 8;
        const canFitRight = window.innerWidth - rect.right >= shellWidth + 8;
        shell.classList.toggle('animesss-trade-shell-right', !canFitLeft);
        if (!canFitLeft && !canFitRight && window.innerWidth <= 920) {
            shell.classList.remove('animesss-trade-shell-right');
            shell.style.position = 'relative';
            shell.style.left = 'auto';
            shell.style.right = 'auto';
            shell.style.top = 'auto';
            shell.style.width = '100%';
            shell.style.marginBottom = '12px';
            return;
        }
        shell.style.position = 'absolute';
        shell.style.width = `${shellWidth}px`;
        shell.style.left = !canFitLeft ? '100%' : 'auto';
        shell.style.right = canFitLeft ? '100%' : 'auto';
        shell.style.top = '0';
        shell.style.marginBottom = '0';
        updateTradeToggle(shell);
    }

    function updateTradeToggle(shell) {
        const toggle = shell?.querySelector('.animesss-trade-toggle');
        if (!toggle) return;
        const isRight = shell.classList.contains('animesss-trade-shell-right');
        const isCollapsed = shell.classList.contains('animesss-trade-collapsed');
        toggle.textContent = isCollapsed
            ? (isRight ? '>' : '<')
            : (isRight ? '<' : '>');
        toggle.title = isCollapsed ? 'Показать анализ' : 'Скрыть анализ';
    }

    function removeOrphanTradeAnalysisShells() {
        document.querySelectorAll('#animesss-trade-shell').forEach(shell => {
            const tradeId = shell.dataset.tradeModalId;
            const owner = tradeId ? document.querySelector(`[data-animesss-trade-modal-id="${tradeId}"]`) : null;
            if (!owner || !document.contains(owner)) shell.remove();
        });
    }

    async function analyzeTradeModal(modal) {
        if (!modal || modal.dataset.animesssTradeAnalyzed === '1') return;
        const groups = modal.querySelectorAll('.trade__main-items');
        if (groups.length < 2) return;
        modal.dataset.animesssTradeAnalyzed = '1';
        if (!modal.dataset.animesssTradeModalId) {
            modal.dataset.animesssTradeModalId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        }

        let shell = document.querySelector(`#animesss-trade-shell[data-trade-modal-id="${modal.dataset.animesssTradeModalId}"]`);
        if (!shell) {
            shell = document.createElement('div');
            shell.id = 'animesss-trade-shell';
            shell.dataset.tradeModalId = modal.dataset.animesssTradeModalId;
            shell.className = 'animesss-trade-collapsed';
            shell.innerHTML = '<button type="button" class="animesss-trade-toggle" title="Показать анализ">&lt;</button><div id="animesss-trade-analysis"><div class="animesss-trade-loading">Анализирую обмен...</div></div>';
            shell.querySelector('.animesss-trade-toggle').addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                shell.classList.toggle('animesss-trade-collapsed');
                updateTradeToggle(shell);
            });
        }
        const panel = shell.querySelector('#animesss-trade-analysis');
        const tradeDialog = getTradeDialogFromModal(modal);
        if (shell.parentNode !== tradeDialog) tradeDialog.appendChild(shell);
        positionTradeAnalysisShell(shell, tradeDialog);

        const receiveBase = collectTradeCards(groups[0]);
        const giveBase = collectTradeCards(groups[1]);
        const receiveCards = await Promise.all(receiveBase.map(getTradeCardStats));
        const giveCards = await Promise.all(giveBase.map(getTradeCardStats));
        receiveCards.forEach(card => { card.score = getTradeCardValue(card); });
        giveCards.forEach(card => { card.score = getTradeCardValue(card); });
        renderTradeAnalysis(panel, receiveCards, giveCards);
        positionTradeAnalysisShell(shell, tradeDialog);
    }

    function observeTradeChanges() {
        const scan = () => {
            removeOrphanTradeAnalysisShells();
            document.querySelectorAll('#trade-card-modal').forEach(analyzeTradeModal);
            document.querySelectorAll('#animesss-trade-shell').forEach(shell => {
                const owner = document.querySelector(`[data-animesss-trade-modal-id="${shell.dataset.tradeModalId}"]`);
                if (owner) positionTradeAnalysisShell(shell, getTradeDialogFromModal(owner));
            });
        };
        scan();
        const observer = new MutationObserver(() => {
            clearTimeout(window.animesssTradeObserverTimer);
            window.animesssTradeObserverTimer = setTimeout(scan, 120);
        });
        observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
        window.addEventListener('resize', scan);
    }

    window.animesssRefreshResults = (options = {}) => {
        const modal = document.querySelector('#animesss-results');
        if (!modal) return;
        const cardInteraction = modal.querySelector(
            '.animesss-card:hover, .animesss-card.animesss-menu-active, .animesss-card[data-menu-interacting="1"]'
        );
        if (!options.force && cardInteraction) {
            clearTimeout(window.animesssDeferredResultsRefreshTimer);
            window.animesssDeferredResultsRefreshTimer = setTimeout(
                () => window.animesssRefreshResults(),
                260
            );
            return;
        }
        clearTimeout(window.animesssDeferredResultsRefreshTimer);
        const scrollPos = modal.scrollTop;
        const searchInput = modal.querySelector('#animesss-search');
        const fWanted = modal.querySelector('#filter-wanted');
        const fTrade = modal.querySelector('#filter-trade');
        const fTotal = modal.querySelector('#filter-total');

        const searchQuery = searchInput ? searchInput.value : '';
        const valWanted = fWanted ? fWanted.value : '';
        const valTrade = fTrade ? fTrade.value : '';
        const valTotal = fTotal ? fTotal.value : '';

        const dirStates = {};
        modal.querySelectorAll('.animesss-dir-toggle').forEach(toggle => {
            const activeDirBtn = toggle.querySelector('.animesss-dir-btn.active');
            dirStates[toggle.dataset.target] = activeDirBtn ? activeDirBtn.dataset.dir : 'down';
        });

        const getActiveBtnGlobal = () => Array.from(modal.querySelectorAll('[data-tab]')).find(b => b.style.padding.includes('12px'));
        const activeBtn = getActiveBtnGlobal();
        const currentTab = activeBtn ? activeBtn.dataset.tab : null;

        if (window.animesssResults) {
            showResults(window.animesssResults, currentTab, false, true);
            const newModal = document.querySelector('#animesss-results');
            if (newModal) {
                newModal.scrollTop = scrollPos;

                const newSearch = newModal.querySelector('#animesss-search');
                const newWanted = newModal.querySelector('#filter-wanted');
                const newTrade = newModal.querySelector('#filter-trade');
                const newTotal = newModal.querySelector('#filter-total');

                if (newSearch) newSearch.value = searchQuery;
                if (newWanted) newWanted.value = valWanted;
                if (newTrade) newTrade.value = valTrade;
                if (newTotal) newTotal.value = valTotal;

                newModal.querySelectorAll('.animesss-dir-toggle').forEach(toggle => {
                    const wantDir = dirStates[toggle.dataset.target] || 'down';
                    const dirBtn = toggle.querySelector(`.animesss-dir-btn[data-dir="${wantDir}"]`);
                    if (dirBtn) dirBtn.click();
                });

                if (newSearch) newSearch.dispatchEvent(new Event('input'));
            }
        }
    };

    window.animesssToggleArchive = (id) => {
        const archivedIds = JSON.parse(localStorage.getItem('animesss_archived_ids') || '[]');
        const idStr = String(id);
        const idx = archivedIds.indexOf(idStr);
        if (idx > -1) {
            archivedIds.splice(idx, 1);
        } else {
            archivedIds.push(idStr);
        }
        localStorage.setItem('animesss_archived_ids', JSON.stringify(archivedIds));
        window.animesssRefreshResults({ force:true });
    };

    window.animesssArchiveMany = (ids, shouldArchive = true) => {
        const archivedIds = new Set(JSON.parse(localStorage.getItem('animesss_archived_ids') || '[]').map(String));
        [...ids].map(String).forEach(id => {
            if (shouldArchive) archivedIds.add(id);
            else archivedIds.delete(id);
        });
        localStorage.setItem('animesss_archived_ids', JSON.stringify([...archivedIds]));
        window.animesssSelectionMode = false;
        window.animesssSelectedCardIds = new Set();
        window.animesssRefreshResults({ force:true });
    };

    // ===== COLLECTION CACHE V2 =====
    // The three stores below have deliberately separate responsibilities:
    // 1) animesss_scan_* is historical statistics by card type;
    // 2) snapshot v2 is exact collection membership by owned copy;
    // 3) unseen v2 stores NEW state and is shared by all rank views.
    const COLLECTION_SNAPSHOT_VERSION = 2;
    const COLLECTION_PAGE_START_INTERVAL_MS = 300;
    const COLLECTION_PAGE_CONCURRENCY = 3;
    const COLLECTION_STATS_DELAY_MS = 400;
    const COLLECTION_STATS_REQUEST_TIMEOUT_MS = 20000;
    const COLLECTION_DOM_STABLE_MS = 1400;
    const COLLECTION_AUTO_SYNC_DELAY_MS = 2200;
    const COLLECTION_SYNC_COOLDOWN_MS = 5 * 60 * 1000;
    const COLLECTION_SYNC_COOLDOWN_KEY = "animesss_collection_sync_cooldown_until_v2";
    let collectionPageLastRequestStartedAt = 0;
    let collectionPageStartGateV2 = Promise.resolve();
    let collectionSyncPromiseV2 = null;
    let collectionAutoSyncTimerV2 = null;
    let collectionCooldownResumeTimerV2 = null;
    let collectionProgressHideTimerV2 = null;
    let collectionProgressClockV2 = null;
    let collectionSnapshotRevisionCounterV2 = 0;
    const collectionStatsInFlightV2 = new Map();
    const collectionStatsQueuesV2 = new Map();
    const collectionStatsMemoryV2 = new Map();
    const collectionStatsContextsV2 = new Map();
    const collectionStatsDirtyUsersV2 = new Set();
    const collectionStatsRefreshedPendingV2 = new Map();
    const mainCollectionCacheNeedsMigrationV2 = new Set();
    const mainCollectionLegacySourceKeysV2 = new Map();
    const mainCollectionCacheMigrationBlockedV2 = new Set();
    let collectionStatsFlushTimerV2 = null;
    const collectionSnapshotMemoryV2 = new Map();
    const collectionUnseenMemoryV2 = new Map();
    const collectionUnseenPersistenceBlockedV2 = new Set();
    const collectionTailChecksV2 = new Map();

    function normalizeCollectionRank(value) {
        return String(value || "").trim().toLowerCase().replace(/\+/g, "_plus");
    }

    function getCollectionContext() {
        const params = new URL(location.href).searchParams;
        let username = params.get("name");
        if (!username) {
            const paginationLink = [...document.querySelectorAll('.pagination a[href*="/user/cards/"], a[href*="/user/cards/"][href*="page="]')].find(link => {
                try { return Boolean(new URL(link.getAttribute("href"), location.origin).searchParams.get("name")); }
                catch (error) { return false; }
            });
            if (paginationLink) {
                try { username = new URL(paginationLink.getAttribute("href"), location.origin).searchParams.get("name"); }
                catch (error) {}
            }
        }
        if (!username) {
            const header = document.querySelector(".user-cards__title") || document.querySelector("h1");
            const title = header?.textContent?.trim() || "";
            const parsed = title.match(/(?:пользователя|коллекция)\s+([^|—]+)$/i)?.[1]?.trim();
            const simpleName = /^[a-zA-Z0-9_а-яА-ЯёЁ.-]{1,64}$/.test(title)
                && !/(?:коллекц|карточ|cards)/i.test(title) ? title : "";
            username = parsed || simpleName;
        }
        if (!username && typeof window.visitor_name === "string" && window.visitor_name.trim()) username = window.visitor_name.trim();
        if (!username && window.animesssCurrentCollectionUsername) username = window.animesssCurrentCollectionUsername;
        username = String(username || "my_collection").trim();
        const rankParam = String(params.get("rank") || "").trim();
        return {
            username,
            userKey: username.toLowerCase(),
            rank:normalizeCollectionRank(rankParam),
            rankParam
        };
    }

    function getMainCollectionCacheKey(username) {
        return "animesss_scan_" + username + "_all";
    }

    function getCollectionSnapshotCacheKey(context) {
        return "animesss_collection_snapshot_v2_"
            + encodeURIComponent(context.userKey)
            + "_"
            + encodeURIComponent(context.rank || "all");
    }

    function getCollectionUnseenCacheKey(context) {
        return "animesss_collection_unseen_v2_" + encodeURIComponent(context.userKey);
    }

    function readJsonStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw == null ? fallback : JSON.parse(raw);
        } catch (error) {
            console.warn("[Animesss] Повреждён кэш " + key + ":", error);
            return fallback;
        }
    }

    function readMainCollectionCache(username) {
        const exactKey = getMainCollectionCacheKey(username);
        let cached = readJsonStorage(exactKey, null);
        let sourceKey = exactKey;
        if (!(Array.isArray(cached) || (cached?.version === 2 && Array.isArray(cached.rows)))) {
            const wanted = exactKey.toLowerCase();
            for (let index = 0; index < localStorage.length; index++) {
                const key = localStorage.key(index);
                if (String(key || "").toLowerCase() !== wanted) continue;
                cached = readJsonStorage(key, null);
                sourceKey = key;
                break;
            }
        }
        if (Array.isArray(cached)) {
            const migrationKey = String(username).toLowerCase();
            mainCollectionCacheNeedsMigrationV2.add(migrationKey);
            if (!mainCollectionLegacySourceKeysV2.has(migrationKey)) {
                mainCollectionLegacySourceKeysV2.set(migrationKey, new Set());
            }
            mainCollectionLegacySourceKeysV2.get(migrationKey).add(sourceKey);
            return cached;
        }
        if (cached?.version === 2 && Array.isArray(cached.rows)) {
            return cached.rows.map(row => ({
                id:String(row?.[0] || ""),
                total:row?.[1],
                wanted:row?.[2],
                trade:row?.[3],
                lastUpdate:row?.[4]
            }));
        }
        return [];
    }

    function saveMainCollectionCache(username, cards) {
        try {
            const rows = (cards || [])
                .filter(card => /^\d+$/.test(String(card?.id || "")) && isCollectionStatsReady(card))
                .map(card => [
                    String(card.id),
                    normalizeStatValue(card.total),
                    normalizeStatValue(card.wanted),
                    normalizeStatValue(card.trade),
                    getCollectionStatsTimestamp(card)
                ]);
            localStorage.setItem(getMainCollectionCacheKey(username), JSON.stringify({ version:2, rows }));
            const migrationKey = String(username).toLowerCase();
            const exactKey = getMainCollectionCacheKey(username);
            (mainCollectionLegacySourceKeysV2.get(migrationKey) || []).forEach(key => {
                if (String(key) !== exactKey) localStorage.removeItem(key);
            });
            mainCollectionLegacySourceKeysV2.delete(migrationKey);
            mainCollectionCacheNeedsMigrationV2.delete(migrationKey);
            return true;
        } catch (error) {
            console.warn("[Animesss] Не удалось сохранить статистику коллекции:", error);
            return false;
        }
    }

    function readCollectionStatsRows(context) {
        const exact = readMainCollectionCache(context.username);
        const sources = [];
        const headerTitle = document.querySelector(".user-cards__title, h1")?.textContent?.trim() || "";
        const legacyHeaderName = headerTitle.replace(/[^a-zA-Z0-9_а-яА-ЯёЁ]/g, "_");
        if (legacyHeaderName && legacyHeaderName.toLowerCase() !== context.userKey) {
            const legacy = readMainCollectionCache(legacyHeaderName);
            if (legacy.length) {
                sources.push(legacy);
                const legacyKey = legacyHeaderName.toLowerCase();
                if (mainCollectionCacheNeedsMigrationV2.has(legacyKey)) {
                    mainCollectionCacheNeedsMigrationV2.add(context.userKey);
                    if (!mainCollectionLegacySourceKeysV2.has(context.userKey)) {
                        mainCollectionLegacySourceKeysV2.set(context.userKey, new Set());
                    }
                    (mainCollectionLegacySourceKeysV2.get(legacyKey) || []).forEach(key => {
                        mainCollectionLegacySourceKeysV2.get(context.userKey).add(key);
                    });
                }
            }
        }
        if (exact.length) sources.push(exact);
        const merged = new Map();
        sources.flat().forEach(card => {
            const id = String(card?.id || "");
            if (!/^\d+$/.test(id)) return;
            const previous = merged.get(id) || { id };
            const next = { ...previous, id };
            ["name", "rank", "anime", "image"].forEach(key => {
                if (card?.[key]) next[key] = String(card[key]);
            });
            if (isCollectionStatsReady(card)
                && (!isCollectionStatsReady(previous) || getCollectionStatsTimestamp(card) >= getCollectionStatsTimestamp(previous))) {
                next.total = normalizeStatValue(card.total);
                next.wanted = normalizeStatValue(card.wanted);
                next.trade = normalizeStatValue(card.trade);
                next.lastUpdate = getCollectionStatsTimestamp(card);
            }
            merged.set(id, next);
        });
        return [...merged.values()];
    }

    function getCollectionStatsTimestamp(card) {
        return Math.max(1, Number(card?.lastUpdate || card?.cachedAt || card?.updatedAt || 1) || 1);
    }

    function isCollectionStatsReady(card) {
        return hasCompleteStats(card) && Number(card.total) >= 1;
    }

    function cleanCollectionStatsRecord(card) {
        const clean = {
            id:String(card?.id || ""),
            name:String(card?.name || ""),
            rank:String(card?.rank || ""),
            anime:String(card?.anime || ""),
            image:String(card?.image || "")
        };
        if (isCollectionStatsReady(card)) {
            clean.total = normalizeStatValue(card.total);
            clean.wanted = normalizeStatValue(card.wanted);
            clean.trade = normalizeStatValue(card.trade);
            clean.lastUpdate = getCollectionStatsTimestamp(card);
        }
        return clean;
    }

    function getCollectionStatsMap(context) {
        if (collectionStatsMemoryV2.has(context.userKey)) return collectionStatsMemoryV2.get(context.userKey);
        const map = new Map();
        readCollectionStatsRows(context).forEach(card => {
            const id = String(card?.id || "");
            if (/^\d+$/.test(id)) map.set(id, cleanCollectionStatsRecord(card));
        });
        collectionStatsMemoryV2.set(context.userKey, map);
        collectionStatsContextsV2.set(context.userKey, { ...context });
        if (mainCollectionCacheNeedsMigrationV2.has(context.userKey)) {
            collectionStatsDirtyUsersV2.add(context.userKey);
            scheduleCollectionStatsFlush();
        }
        return map;
    }

    function flushCollectionStatsCache(context) {
        const map = collectionStatsMemoryV2.get(context.userKey);
        if (mainCollectionCacheMigrationBlockedV2.has(context.userKey)) return false;
        let saved = true;
        if (map && collectionStatsDirtyUsersV2.has(context.userKey)) {
            cleanupLegacyCollectionSnapshots();
            saved = saveMainCollectionCache(context.username, [...map.values()]);
            if (saved) collectionStatsDirtyUsersV2.delete(context.userKey);
        }
        return saved && commitCollectionStatsRefreshMarkers(context);
    }

    function scheduleCollectionStatsFlush() {
        clearTimeout(collectionStatsFlushTimerV2);
        collectionStatsFlushTimerV2 = setTimeout(() => {
            collectionStatsFlushTimerV2 = null;
            collectionStatsDirtyUsersV2.forEach(userKey => {
                const context = collectionStatsContextsV2.get(userKey);
                if (context) flushCollectionStatsCache(context);
            });
        }, 2500);
    }

    window.addEventListener("pagehide", () => {
        const users = new Set([
            ...collectionStatsDirtyUsersV2,
            ...collectionStatsRefreshedPendingV2.keys()
        ]);
        users.forEach(userKey => {
            const context = collectionStatsContextsV2.get(userKey);
            if (context) flushCollectionStatsCache(context);
        });
    });

    function getMissingCollectionStatsIds(context, snapshot) {
        const stats = getCollectionStatsMap(context);
        return (snapshot?.types || [])
            .map(type => String(type?.id || ""))
            .filter(id => /^\d+$/.test(id) && !isCollectionStatsReady(stats.get(id)));
    }

    function getCollectionStatsWorkIds(context, snapshot) {
        return [...new Set([
            ...getMissingCollectionStatsIds(context, snapshot),
            ...getPendingCollectionStatsIds(context, snapshot)
        ])];
    }

    function isCollectionSnapshotAnalysisReady(context, snapshot) {
        return Boolean(snapshot) && getCollectionStatsWorkIds(context, snapshot).length === 0;
    }

    function upsertCollectionStats(context, incoming) {
        const id = String(incoming?.id || "");
        if (!/^\d+$/.test(id)) return null;
        const map = getCollectionStatsMap(context);
        const previous = map.get(id) || { id };
        const next = {
            ...previous,
            id,
            name:incoming.name || previous.name || "",
            rank:incoming.rank || previous.rank || "",
            anime:incoming.anime || previous.anime || "",
            image:incoming.image || previous.image || ""
        };
        if (isCollectionStatsReady(incoming)
            && (!isCollectionStatsReady(previous) || Number(incoming.lastUpdate) >= Number(previous.lastUpdate))) {
            next.total = normalizeStatValue(incoming.total);
            next.wanted = normalizeStatValue(incoming.wanted);
            next.trade = normalizeStatValue(incoming.trade);
            next.lastUpdate = Number(incoming.lastUpdate);
        }
        map.set(id, cleanCollectionStatsRecord(next));
        collectionStatsDirtyUsersV2.add(context.userKey);
        collectionStatsContextsV2.set(context.userKey, { ...context });
        scheduleCollectionStatsFlush();
        return map.get(id);
    }

    function unpackCollectionSnapshot(stored) {
        if (!stored || stored.packed !== 2 || !Array.isArray(stored.types) || !Array.isArray(stored.pages)) return stored;
        const types = stored.types.map(row => ({
            id:String(row?.[0] || ""),
            name:String(row?.[1] || ""),
            rank:String(row?.[2] || ""),
            anime:String(row?.[3] || ""),
            image:String(row?.[4] || "")
        }));
        const copies = [];
        stored.pages.forEach((pageCopies, pageIndex) => {
            (Array.isArray(pageCopies) ? pageCopies : []).forEach((row, position) => {
                const type = types[Number(row?.[0])];
                if (!type) return;
                copies.push({
                    id:type.id,
                    ownerId:String(row?.[1] || ""),
                    page:pageIndex + 1,
                    position
                });
            });
        });
        return { ...stored, types, copies };
    }

    function readCollectionSnapshot(context) {
        const key = getCollectionSnapshotCacheKey(context);
        const memoryStored = collectionSnapshotMemoryV2.get(key);
        const stored = memoryStored || readJsonStorage(key, null);
        const needsPackingMigration = !memoryStored && stored?.packed !== 2;
        let snapshot = unpackCollectionSnapshot(stored);
        if (!snapshot
            || snapshot.version !== COLLECTION_SNAPSHOT_VERSION
            || snapshot.complete !== true
            || snapshot.userKey !== context.userKey
            || normalizeCollectionRank(snapshot.rank) !== context.rank
            || !Array.isArray(snapshot.types)
            || !Array.isArray(snapshot.copies)) return null;
        const typeIds = new Set(snapshot.types.map(type => String(type?.id || "")));
        if (typeIds.size !== snapshot.types.length || [...typeIds].some(id => !/^\d+$/.test(id))) return null;
        if (snapshot.copies.some(copy => !/^\d+$/.test(String(copy?.id || "")) || !typeIds.has(String(copy.id)))) return null;
        const ownerIds = snapshot.copies.map(copy => String(copy?.ownerId || "")).filter(Boolean);
        if (new Set(ownerIds).size !== ownerIds.length) return null;
        if (snapshot.totalCopies != null && Number(snapshot.totalCopies) !== snapshot.copies.length) return null;
        const needsMetadataMigration = snapshot.types.some(type => !type.name || !type.rank || !type.image);
        if (needsMetadataMigration) {
            const stats = getCollectionStatsMap(context);
            snapshot = {
                ...snapshot,
                types:snapshot.types.map(type => {
                    const cached = stats.get(String(type.id)) || {};
                    return {
                        ...type,
                        name:type.name || cached.name || "",
                        rank:type.rank || cached.rank || "",
                        anime:type.anime || cached.anime || "",
                        image:type.image || cached.image || ""
                    };
                })
            };
        }
        const metadataComplete = snapshot.types.every(type => type.name && type.rank && type.image);
        if (!metadataComplete) {
            console.warn("[Animesss] Снимок без метаданных отброшен; требуется точная пересинхронизация.");
            collectionSnapshotMemoryV2.delete(key);
            try { localStorage.removeItem(key); }
            catch (error) {}
            return null;
        }
        if (needsPackingMigration || needsMetadataMigration) {
            snapshot = saveCollectionSnapshot(context, snapshot);
            if (snapshot.persisted === false && needsMetadataMigration) {
                mainCollectionCacheMigrationBlockedV2.add(context.userKey);
            }
        }
        const validated = { ...snapshot, persisted:snapshot.persisted !== false };
        collectionSnapshotMemoryV2.set(key, validated);
        return validated;
    }

    function cleanupLegacyCollectionSnapshots() {
        try {
            const keys = [];
            for (let index = 0; index < localStorage.length; index++) keys.push(localStorage.key(index));
            keys.filter(key => /^animesss_collection_snapshot_v1_/i.test(String(key || "")))
                .forEach(key => localStorage.removeItem(key));
            cleanupExpiredCompareCaches();
        } catch (error) {}
    }

    function saveCollectionSnapshot(context, snapshot) {
        const clean = {
            version:COLLECTION_SNAPSHOT_VERSION,
            complete:true,
            revision:String(snapshot.revision || (Date.now() + "-" + (++collectionSnapshotRevisionCounterV2))),
            username:context.username,
            userKey:context.userKey,
            rank:context.rank,
            updatedAt:Number(snapshot.updatedAt || Date.now()),
            pageCount:Math.max(1, Number(snapshot.pageCount) || 1),
            totalCopies:snapshot.copies.length,
            types:snapshot.types,
            copies:snapshot.copies,
            persisted:true
        };
        const packedTypes = clean.types.map(type => [
            String(type.id), type.name || "", type.rank || "", type.anime || "", type.image || ""
        ]);
        const typeIndexes = new Map(clean.types.map((type, index) => [String(type.id), index]));
        const packedPages = Array.from({ length:clean.pageCount }, () => []);
        [...clean.copies]
            .sort((a, b) => Number(a.page) - Number(b.page) || Number(a.position) - Number(b.position))
            .forEach(copy => {
                const pageIndex = Math.max(0, Math.min(packedPages.length - 1, (Number(copy.page) || 1) - 1));
                packedPages[pageIndex].push([typeIndexes.get(String(copy.id)), String(copy.ownerId || "")]);
            });
        const packed = {
            version:clean.version,
            packed:2,
            complete:true,
            revision:clean.revision,
            username:clean.username,
            userKey:clean.userKey,
            rank:clean.rank,
            updatedAt:clean.updatedAt,
            pageCount:clean.pageCount,
            totalCopies:clean.totalCopies,
            types:packedTypes,
            pages:packedPages,
            persisted:true
        };
        const key = getCollectionSnapshotCacheKey(context);
        cleanupLegacyCollectionSnapshots();
        try {
            localStorage.setItem(key, JSON.stringify(packed));
            mainCollectionCacheMigrationBlockedV2.delete(context.userKey);
            collectionSnapshotMemoryV2.set(key, clean);
            return clean;
        } catch (error) {
            console.warn("[Animesss] Не удалось сохранить точный состав:", error);
            clean.persisted = false;
            collectionSnapshotMemoryV2.set(key, clean);
            return clean;
        }
    }

    function isCurrentCollectionSnapshot(context, snapshot) {
        const current = readCollectionSnapshot(context);
        if (!current || !snapshot) return false;
        if (current.revision && snapshot.revision) return String(current.revision) === String(snapshot.revision);
        if (Number(current.updatedAt) !== Number(snapshot.updatedAt)) return false;
        return pageSignature(current.copies || []) === pageSignature(snapshot.copies || []);
    }

    function readCollectionUnseen(context) {
        const key = getCollectionUnseenCacheKey(context);
        const state = collectionUnseenMemoryV2.get(key) || readJsonStorage(key, null);
        const knownOwners = state && typeof state.knownOwners === "object" && state.knownOwners
            ? state.knownOwners
            : Object.fromEntries((Array.isArray(state?.knownOwnerIds) ? state.knownOwnerIds : []).map(id => [String(id), true]));
        const normalized = {
            owners:state && typeof state.owners === "object" && state.owners ? state.owners : {},
            cardIds:Array.isArray(state?.cardIds) ? [...new Set(state.cardIds.map(String))] : [],
            knownOwners,
            knownCounts:state && typeof state.knownCounts === "object" && state.knownCounts ? state.knownCounts : {},
            initializedScopes:state && typeof state.initializedScopes === "object" && state.initializedScopes ? state.initializedScopes : {},
            pendingStats:Array.isArray(state?.pendingStats) ? [...new Set(state.pendingStats.map(String))] : []
        };
        collectionUnseenMemoryV2.set(key, normalized);
        return normalized;
    }

    function saveCollectionUnseen(context, state, options = {}) {
        const key = getCollectionUnseenCacheKey(context);
        const memoryState = {
            owners:state.owners || {},
            cardIds:[...new Set((state.cardIds || []).map(String))],
            knownOwners:state.knownOwners || {},
            knownCounts:state.knownCounts || {},
            initializedScopes:state.initializedScopes || {},
            pendingStats:[...new Set((state.pendingStats || []).map(String))]
        };
        collectionUnseenMemoryV2.set(key, memoryState);
        if (options.persist === false
            || (collectionUnseenPersistenceBlockedV2.has(context.userKey) && !options.allowBlockedPersistence)) return false;
        try {
            localStorage.setItem(key, JSON.stringify({
                owners:memoryState.owners,
                cardIds:memoryState.cardIds,
                knownOwnerIds:Object.keys(memoryState.knownOwners),
                knownCounts:memoryState.knownCounts,
                initializedScopes:memoryState.initializedScopes,
                pendingStats:memoryState.pendingStats
            }));
            return true;
        } catch (error) {
            console.warn("[Animesss] Не удалось сохранить метки NEW:", error);
            return false;
        }
    }

    function getOwnedCardOwnerId(node) {
        const candidates = [
            node?.dataset?.ownerId,
            node?.dataset?.userCardId,
            node?.dataset?.cardOwnerId,
            node?.querySelector?.("[data-owner-id]")?.dataset?.ownerId
        ];
        for (const candidate of candidates) {
            const value = String(candidate || "").trim();
            if (/^\d+$/.test(value)) return value;
        }
        const tradeLink = node?.querySelector?.('a[href*="/trade/"]');
        const match = String(tradeLink?.getAttribute?.("href") || "").match(/\/cards\/(\d+)\/trade\/?/i);
        return match?.[1] || "";
    }

    function parseOwnedCardNode(node, page, position) {
        const id = String(node?.dataset?.id || "").trim();
        if (!/^\d+$/.test(id)) return null;
        const imageNode = node.querySelector?.("img");
        return {
            id,
            ownerId:getOwnedCardOwnerId(node),
            page:Math.max(1, Number(page) || 1),
            position:Math.max(0, Number(position) || 0),
            name:node.dataset.name?.trim() || "",
            rank:String(node.dataset.rank || "").trim(),
            anime:node.dataset.animeName?.trim() || "",
            image:node.dataset.image
                || imageNode?.dataset?.src
                || imageNode?.getAttribute?.("src")
                || imageNode?.src
                || ""
        };
    }

    function isSameCollectionPageLink(link, context) {
        try {
            const url = new URL(link.getAttribute("href"), location.origin);
            if (!/^\/user\/cards\/?$/i.test(url.pathname)) return false;
            const linkName = url.searchParams.get("name");
            if (linkName && linkName.trim().toLowerCase() !== context.userKey) return false;
            if (normalizeCollectionRank(url.searchParams.get("rank")) !== context.rank) return false;
            return true;
        } catch (error) {
            return false;
        }
    }

    function getCollectionPageCount(doc, context, currentPage) {
        const pages = [...doc.querySelectorAll('a[href*="page="]')]
            .filter(link => isSameCollectionPageLink(link, context))
            .map(link => {
                try {
                    return Number(new URL(link.getAttribute("href"), location.origin).searchParams.get("page")) || 1;
                } catch (error) {
                    return 1;
                }
            });
        return Math.max(1, Number(currentPage) || 1, ...pages);
    }

    function hasActiveCollectionSearch(doc) {
        if (doc !== document) return false;
        const params = new URL(location.href).searchParams;
        if (["search", "query", "q"].some(key => String(params.get(key) || "").trim())) return true;
        return [...document.querySelectorAll('input[placeholder*="Имя персонажа"], input[placeholder*="название аниме"]')]
            .some(input => !String(input.id || "").startsWith("animesss-") && String(input.value || "").trim());
    }

    function hasExplicitEmptyCollectionState(doc) {
        const pattern = /(?:коллекция\s+пуста|нет\s+карт|карты\s+не\s+найдены|ничего\s+не\s+найдено)/i;
        const roots = [...doc.querySelectorAll(".anime-cards, .user-cards__list")];
        const candidates = [...new Set([
            ...doc.querySelectorAll(".anime-cards__empty, .user-cards__empty, .empty-state, [class*='empty']"),
            ...roots,
            ...roots.flatMap(root => [...root.querySelectorAll("*")])
        ])];
        return candidates.some(element => {
            if (!pattern.test(element.textContent || "")) return false;
            if ([...element.children].some(child => pattern.test(child.textContent || ""))) return false;
            for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
                const style = String(node.getAttribute?.("style") || "");
                if (node.hidden || node.getAttribute?.("aria-hidden") === "true"
                    || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(style)
                    || node.tagName === "TEMPLATE") return false;
            }
            if (doc === document && typeof getComputedStyle === "function") {
                const style = getComputedStyle(element);
                if (style.display === "none" || style.visibility === "hidden") return false;
            }
            return true;
        });
    }

    function getCollectionDocumentState(doc, context, forcedPage) {
        const currentPage = Math.max(1, Number(forcedPage)
            || Number(doc === document ? new URL(location.href).searchParams.get("page") : 1)
            || 1);
        const nodes = [...doc.querySelectorAll(".anime-cards__item[data-id]")]
            .map((node, index) => parseOwnedCardNode(node, currentPage, index))
            .filter(Boolean);
        const pageCount = getCollectionPageCount(doc, context, currentPage);
        const explicitEmpty = nodes.length === 0 && hasExplicitEmptyCollectionState(doc);
        const activeSearch = hasActiveCollectionSearch(doc);
        return {
            cards:nodes,
            currentPage,
            pageCount,
            explicitEmpty,
            activeSearch,
            loaded:nodes.length > 0 || explicitEmpty,
            singleExact:currentPage === 1 && pageCount === 1 && !activeSearch && (nodes.length > 0 || explicitEmpty)
        };
    }

    function isCollectionStateInScope(state, context) {
        if (!context.rank || !state?.cards?.length) return true;
        return state.cards.every(card => card.rank && normalizeCollectionRank(card.rank) === context.rank);
    }

    function makeCompositionSnapshot(context, pages, pageCount) {
        const typeMap = new Map();
        const copies = [];
        const seenOwners = new Set();
        pages.forEach((cards, page) => {
            cards.forEach((card, index) => {
                if (card.ownerId && seenOwners.has(card.ownerId)) {
                    throw new Error("Сервер вернул одну и ту же копию карты на нескольких страницах.");
                }
                if (card.ownerId) seenOwners.add(card.ownerId);
                if (!typeMap.has(card.id)) {
                    typeMap.set(card.id, {
                        id:card.id,
                        name:card.name,
                        rank:card.rank,
                        anime:card.anime,
                        image:card.image
                    });
                } else {
                    const type = typeMap.get(card.id);
                    if (!type.name && card.name) type.name = card.name;
                    if (!type.rank && card.rank) type.rank = card.rank;
                    if (!type.anime && card.anime) type.anime = card.anime;
                    if (!type.image && card.image) type.image = card.image;
                }
                copies.push({
                    id:card.id,
                    ownerId:card.ownerId || "",
                    page:Number(page) || card.page || 1,
                    position:Number(card.position ?? index)
                });
            });
        });
        copies.sort((a, b) => a.page - b.page || a.position - b.position);
        return {
            version:COLLECTION_SNAPSHOT_VERSION,
            complete:true,
            username:context.username,
            userKey:context.userKey,
            rank:context.rank,
            updatedAt:Date.now(),
            pageCount:Math.max(1, Number(pageCount) || 1),
            totalCopies:copies.length,
            types:[...typeMap.values()],
            copies
        };
    }

    function getCompositionCounts(snapshot) {
        const counts = new Map();
        (snapshot?.copies || []).forEach(copy => counts.set(String(copy.id), (counts.get(String(copy.id)) || 0) + 1));
        return counts;
    }

    function diffComposition(previous, current) {
        const addedCopies = [];
        const removedCopies = [];
        const previousGroups = new Map();
        const currentGroups = new Map();
        (previous?.copies || []).forEach(copy => {
            const id = String(copy.id);
            if (!previousGroups.has(id)) previousGroups.set(id, []);
            previousGroups.get(id).push(copy);
        });
        (current?.copies || []).forEach(copy => {
            const id = String(copy.id);
            if (!currentGroups.has(id)) currentGroups.set(id, []);
            currentGroups.get(id).push(copy);
        });

        const allIds = new Set([...previousGroups.keys(), ...currentGroups.keys()]);
        allIds.forEach(id => {
            const before = previousGroups.get(id) || [];
            const after = currentGroups.get(id) || [];
            const ownerIdsReliable = before.every(copy => Boolean(copy.ownerId))
                && after.every(copy => Boolean(copy.ownerId));
            if (ownerIdsReliable) {
                const beforeOwners = new Set(before.map(copy => String(copy.ownerId)));
                const afterOwners = new Set(after.map(copy => String(copy.ownerId)));
                after.forEach(copy => { if (!beforeOwners.has(String(copy.ownerId))) addedCopies.push(copy); });
                before.forEach(copy => { if (!afterOwners.has(String(copy.ownerId))) removedCopies.push(copy); });
                return;
            }
            const addedCount = Math.max(0, after.length - before.length);
            const removedCount = Math.max(0, before.length - after.length);
            for (let index = Math.max(0, after.length - addedCount); index < after.length; index++) addedCopies.push(after[index]);
            for (let index = Math.max(0, before.length - removedCount); index < before.length; index++) removedCopies.push(before[index]);
        });

        const addedTypeIds = new Set();
        addedCopies.forEach(copy => {
            if (!(previousGroups.get(String(copy.id)) || []).length) addedTypeIds.add(String(copy.id));
        });
        return {
            addedCopies,
            removedCopies,
            addedTypeIds,
            addedCount:addedCopies.length,
            removedCount:removedCopies.length
        };
    }

    function addUnseenFromDiff(context, previous, current, diff, options = {}) {
        const unseen = readCollectionUnseen(context);
        const scopeKey = context.rank || "all";
        const currentOwnerIds = new Set((current?.copies || []).map(copy => String(copy.ownerId || "")).filter(Boolean));
        const currentCardIds = new Set((current?.copies || []).map(copy => String(copy.id)));
        const scopedCardIds = new Set([
            ...(previous?.copies || []).map(copy => String(copy.id)),
            ...(current?.copies || []).map(copy => String(copy.id))
        ]);
        const cardIds = new Set(unseen.cardIds);
        const globalNewCopies = [];
        const globalNewTypeIds = new Set();

        const rememberSnapshot = snapshot => {
            const counts = getCompositionCounts(snapshot);
            (snapshot?.copies || []).forEach(copy => {
                if (copy.ownerId) unseen.knownOwners[String(copy.ownerId)] = String(copy.id);
            });
            counts.forEach((count, id) => {
                unseen.knownCounts[id] = Math.max(Number(unseen.knownCounts[id]) || 0, Number(count) || 0);
            });
        };

        if (context.rank && !unseen.initializedScopes.all) {
            const allContext = { ...context, rank:"", rankParam:"" };
            const allBaseline = readCollectionSnapshot(allContext);
            if (allBaseline) {
                rememberSnapshot(allBaseline);
                unseen.initializedScopes.all = true;
            }
        }

        const scopeWasInitialized = Boolean(unseen.initializedScopes[scopeKey]);
        if (previous) rememberSnapshot(previous);
        const shouldDiscoverUnknown = Boolean(previous || scopeWasInitialized || unseen.initializedScopes.all);
        let copiesToDiscover = shouldDiscoverUnknown ? diff.addedCopies : [];
        if (!shouldDiscoverUnknown && scopeKey === "all") {
            const ranksById = new Map((current?.types || []).map(type => [String(type.id), normalizeCollectionRank(type.rank)]));
            copiesToDiscover = diff.addedCopies.filter(copy => {
                const rankScope = ranksById.get(String(copy.id));
                return Boolean(rankScope && unseen.initializedScopes[rankScope]);
            });
        }
        if (copiesToDiscover.length) {
            const currentCounts = getCompositionCounts(current);
            const ownerlessIds = new Set();
            copiesToDiscover.forEach(copy => {
                const id = String(copy.id);
                if (copy.ownerId) {
                    const ownerId = String(copy.ownerId);
                    if (!unseen.knownOwners[ownerId]) {
                        unseen.owners[ownerId] = id;
                        globalNewCopies.push(copy);
                        if ((Number(unseen.knownCounts[id]) || 0) === 0) globalNewTypeIds.add(id);
                    }
                } else {
                    ownerlessIds.add(id);
                }
            });
            ownerlessIds.forEach(id => {
                const delta = Math.max(0, (currentCounts.get(id) || 0) - (Number(unseen.knownCounts[id]) || 0));
                if (delta > 0) {
                    cardIds.add(id);
                    if ((Number(unseen.knownCounts[id]) || 0) === 0) globalNewTypeIds.add(id);
                    for (let index = 0; index < delta; index++) globalNewCopies.push({ id, ownerId:"" });
                }
            });
        }
        rememberSnapshot(current);
        unseen.initializedScopes[scopeKey] = true;
        unseen.pendingStats = [...new Set([...(unseen.pendingStats || []), ...globalNewTypeIds])];

        Object.keys(unseen.owners).forEach(ownerId => {
            const cardId = String(unseen.owners[ownerId]);
            if (scopedCardIds.has(cardId) && !currentOwnerIds.has(String(ownerId))) delete unseen.owners[ownerId];
        });
        unseen.cardIds = [...cardIds].filter(id => !scopedCardIds.has(String(id)) || currentCardIds.has(String(id)));
        const persisted = saveCollectionUnseen(context, unseen, {
            persist:options.persist !== false,
            allowBlockedPersistence:Boolean(options.allowBlockedPersistence)
        });
        return {
            globalNewCopies,
            globalNewCount:globalNewCopies.length,
            globalNewTypeIds,
            persisted
        };
    }

    function markCollectionCardSeen(context, cardId) {
        const id = String(cardId);
        const unseen = readCollectionUnseen(context);
        Object.keys(unseen.owners).forEach(ownerId => {
            if (String(unseen.owners[ownerId]) === id) delete unseen.owners[ownerId];
        });
        unseen.cardIds = unseen.cardIds.filter(value => String(value) !== id);
        saveCollectionUnseen(context, unseen);
    }

    function getPendingCollectionStatsIds(context, snapshot) {
        const typeIds = new Set((snapshot?.types || []).map(type => String(type.id)));
        return readCollectionUnseen(context).pendingStats.filter(id => typeIds.has(String(id)));
    }

    function markCollectionStatsRefreshComplete(context, cardId) {
        const id = String(cardId);
        if (!collectionStatsRefreshedPendingV2.has(context.userKey)) {
            collectionStatsRefreshedPendingV2.set(context.userKey, new Set());
        }
        collectionStatsRefreshedPendingV2.get(context.userKey).add(id);
    }

    function commitCollectionStatsRefreshMarkers(context) {
        const completed = collectionStatsRefreshedPendingV2.get(context.userKey);
        if (!completed?.size) return true;
        const state = readCollectionUnseen(context);
        const previousPending = [...state.pendingStats];
        const next = state.pendingStats.filter(value => !completed.has(String(value)));
        if (next.length === state.pendingStats.length) {
            collectionStatsRefreshedPendingV2.delete(context.userKey);
            return true;
        }
        state.pendingStats = next;
        const saved = saveCollectionUnseen(context, state);
        if (saved) {
            collectionStatsRefreshedPendingV2.delete(context.userKey);
            return true;
        }
        state.pendingStats = previousPending;
        saveCollectionUnseen(context, state, { persist:false });
        return false;
    }

    function hydrateCollectionSnapshot(context, snapshot) {
        if (!snapshot) return [];
        const types = new Map(snapshot.types.map(type => [String(type.id), type]));
        const stats = getCollectionStatsMap(context);
        const unseen = readCollectionUnseen(context);
        const unseenCardIds = new Set(unseen.cardIds.map(String));
        const pendingStatsIds = new Set(unseen.pendingStats.map(String));
        return snapshot.copies.map(copy => {
            const id = String(copy.id);
            const type = types.get(id) || { id };
            const stat = stats.get(id) || {};
            const card = {
                ...stat,
                ...type,
                id,
                name:type.name || stat.name || ("Карта #" + id),
                rank:type.rank || stat.rank || "",
                anime:type.anime || stat.anime || "",
                image:type.image || stat.image || "",
                ownerId:String(copy.ownerId || ""),
                page:Number(copy.page) || 1,
                statsPending:pendingStatsIds.has(id) || !isCollectionStatsReady(stat),
                isNewInScan:Boolean((copy.ownerId && unseen.owners[String(copy.ownerId)]) || unseenCardIds.has(id))
            };
            return normalizeCardStats(card);
        });
    }

    function countCollectionUnseenCopies(context, snapshot) {
        const unseen = readCollectionUnseen(context);
        const unseenCardIds = new Set(unseen.cardIds.map(String));
        let count = 0;
        (snapshot?.copies || []).forEach(copy => {
            if (copy.ownerId && unseen.owners[String(copy.ownerId)]) count++;
        });
        unseenCardIds.forEach(id => {
            if ((snapshot?.copies || []).some(copy => String(copy.id) === id && !copy.ownerId)) count++;
        });
        return count;
    }

    function setCollectionAnalysisButtonReady(newCount) {
        const btn = document.querySelector("#animesss-btn");
        if (!btn) return;
        const suffix = Number(newCount) > 0 ? " · +" + Number(newCount) + " НОВ." : "";
        btn.innerHTML = '<span style="opacity:.9;">◆</span>&nbsp; РЕЗУЛЬТАТЫ АНАЛИЗА' + suffix;
    }

    function setCollectionAnalysisButtonPending(count) {
        const btn = document.querySelector("#animesss-btn");
        if (!btn) return;
        const suffix = Number(count) > 0 ? " · " + Number(count) + " КАРТ" : "";
        btn.innerHTML = '<span style="opacity:.9;">◆</span>&nbsp; ПРОДОЛЖИТЬ АНАЛИЗ' + suffix;
    }

    function setCollectionAnalysisButtonPartial(pendingCount, newCount = 0) {
        const btn = document.querySelector("#animesss-btn");
        if (!btn) return;
        const newSuffix = Number(newCount) > 0 ? " · +" + Number(newCount) + " НОВ." : "";
        const pendingSuffix = Number(pendingCount) > 0 ? " · ⏳" + Number(pendingCount) : "";
        btn.innerHTML = '<span style="opacity:.9;">◆</span>&nbsp; РЕЗУЛЬТАТЫ АНАЛИЗА' + newSuffix + pendingSuffix;
    }

    function updateCollectionAnalysisButton(context, snapshot, newCount = 0) {
        if (!snapshot) return;
        const unseenCount = Math.max(Number(newCount) || 0, countCollectionUnseenCopies(context, snapshot));
        const pendingCount = getCollectionStatsWorkIds(context, snapshot).length;
        if (pendingCount) setCollectionAnalysisButtonPartial(pendingCount, unseenCount);
        else setCollectionAnalysisButtonReady(unseenCount);
    }

    function markCollectionAnalysisStorageWarning() {
        const btn = document.querySelector("#animesss-btn");
        if (btn && !btn.textContent.includes("НЕ СОХР.")) btn.innerHTML += " · ⚠ НЕ СОХР.";
    }

    function setCollectionSyncButtons(running, label) {
        document.querySelectorAll("#animesss-sync-current").forEach(button => {
            button.disabled = Boolean(running);
            button.textContent = label || (running ? "↻ СИНХРОНИЗАЦИЯ…" : "↻ ОБНОВИТЬ СОСТАВ");
            button.style.opacity = running ? ".65" : "1";
        });
        document.querySelectorAll("#animesss-compare-open").forEach(button => {
            button.disabled = Boolean(running);
            button.style.opacity = running ? ".55" : "1";
        });
    }

    function formatCollectionDuration(milliseconds) {
        const totalSeconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return hours > 0
            ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0")
            : String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    }

    function renderCollectionProgressClock(finalLabel) {
        const timeEl = document.querySelector("#animesss-time");
        const etaEl = document.querySelector("#animesss-eta");
        const clock = collectionProgressClockV2;
        if (!timeEl || !clock) return;
        const now = Date.now();
        const elapsed = now - clock.startedAt;
        timeEl.textContent = "⏱ " + formatCollectionDuration(elapsed);

        if (!etaEl) return;
        const completedWork = Math.max(0, clock.phaseDone - clock.phaseStartDone);
        const remainingWork = Math.max(0, clock.phaseTotal - clock.phaseDone);
        const phaseElapsed = Math.max(1, now - clock.phaseStartedAt);
        if (finalLabel || !remainingWork || clock.phaseTotal <= 1) {
            etaEl.textContent = "";
            return;
        }
        if (completedWork < 2 || phaseElapsed < 1500) {
            etaEl.textContent = "Осталось: считаю…";
            return;
        }
        const workPerMillisecond = completedWork / phaseElapsed;
        const eta = remainingWork / workPerMillisecond;
        etaEl.textContent = Number.isFinite(eta) && eta >= 0
            ? "Осталось ≈ " + formatCollectionDuration(eta)
            : "Осталось: считаю…";
    }

    function startCollectionProgressClock() {
        if (collectionProgressClockV2?.timer) clearInterval(collectionProgressClockV2.timer);
        const now = Date.now();
        collectionProgressClockV2 = {
            startedAt:now,
            phaseStartedAt:now,
            phaseTotal:0,
            phaseDone:0,
            phaseStartDone:0,
            timer:null
        };
        collectionProgressClockV2.timer = setInterval(() => renderCollectionProgressClock(), 500);
        renderCollectionProgressClock();
    }

    function beginCollectionProgressPhase(total, completed = 0) {
        if (!collectionProgressClockV2) startCollectionProgressClock();
        const now = Date.now();
        collectionProgressClockV2.phaseStartedAt = now;
        collectionProgressClockV2.phaseTotal = Math.max(0, Number(total) || 0);
        collectionProgressClockV2.phaseDone = Math.max(0, Number(completed) || 0);
        collectionProgressClockV2.phaseStartDone = collectionProgressClockV2.phaseDone;
        renderCollectionProgressClock();
    }

    function recordCollectionProgressWork(completed) {
        if (!collectionProgressClockV2) return;
        collectionProgressClockV2.phaseDone = Math.max(0, Number(completed) || 0);
        renderCollectionProgressClock();
    }

    function stopCollectionProgressClock(label = "готово") {
        if (!collectionProgressClockV2) return;
        if (collectionProgressClockV2.timer) clearInterval(collectionProgressClockV2.timer);
        collectionProgressClockV2.timer = null;
        renderCollectionProgressClock(label);
        collectionProgressClockV2 = null;
    }

    function setCollectionProgress(status, completed, total, visible) {
        const box = document.querySelector("#animesss-progress-box");
        const statusEl = document.querySelector("#animesss-status");
        const bar = document.querySelector("#animesss-bar");
        const percent = document.querySelector("#animesss-percent");
        if (!box || !statusEl || !bar || !percent) return;
        if (visible) {
            clearTimeout(collectionProgressHideTimerV2);
            collectionProgressHideTimerV2 = null;
            box.style.display = "block";
        }
        statusEl.textContent = status;
        const safeTotal = Math.max(1, Number(total) || 1);
        const safeCompleted = Math.max(0, Math.min(safeTotal, Number(completed) || 0));
        const value = Math.floor(safeCompleted / safeTotal * 100);
        bar.style.width = value + "%";
        percent.textContent = safeCompleted + "/" + safeTotal + " (" + value + "%)";
    }

    function hideCollectionProgress(delay) {
        clearTimeout(collectionProgressHideTimerV2);
        collectionProgressHideTimerV2 = setTimeout(() => {
            collectionProgressHideTimerV2 = null;
            const box = document.querySelector("#animesss-progress-box");
            if (box) box.style.display = "none";
        }, Number(delay) || 1600);
    }

    function getCollectionSyncCooldownRemaining() {
        return Math.max(0, Number(localStorage.getItem(COLLECTION_SYNC_COOLDOWN_KEY) || 0) - Date.now());
    }

    function startCollectionSyncCooldown() {
        try {
            localStorage.setItem(COLLECTION_SYNC_COOLDOWN_KEY, String(Date.now() + COLLECTION_SYNC_COOLDOWN_MS));
        } catch (error) {}
    }

    function scheduleCollectionResumeAfterCooldown() {
        clearTimeout(collectionCooldownResumeTimerV2);
        const wait = getCollectionSyncCooldownRemaining();
        collectionCooldownResumeTimerV2 = setTimeout(() => {
            collectionCooldownResumeTimerV2 = null;
            reconcileVisibleCollectionV2();
        }, Math.max(250, wait + 350));
    }

    function waitForCollectionPageStartSlot() {
        const slot = collectionPageStartGateV2.then(async () => {
            const wait = Math.max(0, COLLECTION_PAGE_START_INTERVAL_MS - (Date.now() - collectionPageLastRequestStartedAt));
            if (wait) await sleep(wait);
            collectionPageLastRequestStartedAt = Date.now();
        });
        collectionPageStartGateV2 = slot.catch(() => {});
        return slot;
    }

    async function fetchCollectionPageOnce(url, options = {}) {
        await waitForCollectionPageStartSlot();
        if (options.signal?.aborted) {
            const error = new Error("Загрузка страниц остановлена.");
            error.name = "AbortError";
            throw error;
        }
        const response = await fetch(url, { signal:options.signal });
        if (!response.ok) {
            const error = new Error("HTTP " + response.status);
            error.status = response.status;
            if ([429, 502, 520].includes(response.status)) startCollectionSyncCooldown();
            throw error;
        }
        const html = await response.text();
        return options.withMeta ? { html, url:response.url || url } : html;
    }

    function assertCollectionPageResponse(response, requestedPage, context = getCollectionContext()) {
        const responseUrl = new URL(response?.url || buildCollectionPageUrl(context, requestedPage), location.origin);
        const actualPage = Math.max(1, Number(responseUrl.searchParams.get("page")) || 1);
        if (actualPage !== Number(requestedPage)) {
            throw new Error("Сервер вместо страницы " + requestedPage + " вернул страницу " + actualPage + ".");
        }
        const actualName = String(responseUrl.searchParams.get("name") || "").trim().toLowerCase();
        const actualRank = normalizeCollectionRank(responseUrl.searchParams.get("rank") || "");
        if (!/\/user\/cards\/?$/i.test(responseUrl.pathname)
            || actualName !== context.userKey
            || actualRank !== context.rank) {
            throw new Error("Сервер вернул страницу другой коллекции или ранга.");
        }
    }

    function buildCollectionPageUrl(context, page) {
        const url = new URL("/user/cards/", location.origin);
        url.searchParams.set("name", context.username);
        if (context.rank) url.searchParams.set("rank", context.rankParam || context.rank.replace(/_plus/g, "+"));
        if (Number(page) > 1) url.searchParams.set("page", String(page));
        return url.pathname + url.search;
    }

    function parseRequiredCollectionStat(element, label, minimum = 0) {
        const raw = String(element?.textContent || "").replace(/[\s\u00a0\u202f]/g, "");
        if (!/^\d+$/.test(raw)) throw new Error("Некорректное значение статистики: " + label + ".");
        const value = Number(raw);
        if (!Number.isSafeInteger(value) || value < minimum) throw new Error("Некорректное значение статистики: " + label + ".");
        return value;
    }

    async function fetchCollectionCardStats(context, type, options = {}) {
        const id = String(type?.id || "");
        if (!/^\d+$/.test(id)) throw new Error("Некорректный ID карты.");
        const cooldown = getCollectionSyncCooldownRemaining();
        if (cooldown > 0) {
            const error = new Error("Защитная пауза после ошибки сервера.");
            error.cooldown = true;
            error.retryAfter = cooldown;
            throw error;
        }
        const requestKey = context.userKey + ":" + id;
        const existing = collectionStatsInFlightV2.get(requestKey);
        if (existing) {
            if (!options.signal) return existing.promise;
            const abortExisting = () => existing.controller.abort();
            if (options.signal.aborted) abortExisting();
            else options.signal.addEventListener("abort", abortExisting, { once:true });
            return existing.promise.finally(() => options.signal.removeEventListener("abort", abortExisting));
        }
        const controller = new AbortController();
        let timedOut = false;
        const abortFromCaller = () => controller.abort();
        if (options.signal?.aborted) abortFromCaller();
        else options.signal?.addEventListener("abort", abortFromCaller, { once:true });
        const timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, COLLECTION_STATS_REQUEST_TIMEOUT_MS);
        const standalone = !collectionSyncPromiseV2 && !collectionStatsQueuesV2.size && !collectionStatsInFlightV2.size;
        if (standalone) setCollectionSyncButtons(true, "↻ ОБНОВЛЯЮ КАРТУ…");
        const promise = (async () => {
            let response;
            try {
                response = await fetch("/cards/users/?id=" + encodeURIComponent(id), { signal:controller.signal });
            } catch (error) {
                if (timedOut && error?.name === "AbortError") {
                    const timeoutError = new Error("Превышено время ожидания статистики карты.");
                    timeoutError.name = "TimeoutError";
                    throw timeoutError;
                }
                throw error;
            }
            if (!response.ok) {
                const error = new Error("HTTP " + response.status);
                error.status = response.status;
                if ([429, 502, 520].includes(response.status)) startCollectionSyncCooldown();
                throw error;
            }
            const html = await response.text();
            const doc = parser.parseFromString(html, "text/html");
            const totalEl = doc.querySelector("#owners-count");
            const wantedEl = doc.querySelector("#owners-need");
            const tradeEl = doc.querySelector("#owners-trade");
            if (!totalEl || !wantedEl || !tradeEl) throw new Error("Страница статистики карты имеет неверный формат.");
            const record = {
                ...type,
                id,
                total:parseRequiredCollectionStat(totalEl, "владельцы", 1),
                wanted:parseRequiredCollectionStat(wantedEl, "желающие"),
                trade:parseRequiredCollectionStat(tradeEl, "обмен"),
                lastUpdate:Date.now()
            };
            const saved = upsertCollectionStats(context, record);
            if (!saved) throw new Error("Не удалось сохранить статистику карты.");
            markCollectionStatsRefreshComplete(context, id);
            return saved;
        })().finally(() => {
            clearTimeout(timeout);
            options.signal?.removeEventListener("abort", abortFromCaller);
            collectionStatsInFlightV2.delete(requestKey);
            if (!collectionSyncPromiseV2 && !collectionStatsQueuesV2.size && !collectionStatsInFlightV2.size) {
                setCollectionSyncButtons(false);
            }
        });
        collectionStatsInFlightV2.set(requestKey, { promise, controller });
        return promise;
    }

    function getStatsIdsForSnapshot(context, previous, snapshot, diff) {
        return getCollectionStatsWorkIds(context, snapshot);
    }

    async function ensureSnapshotStatsCore(context, snapshot, ids, options = {}) {
        const uniqueIds = [...new Set((ids || []).map(String))];
        const queueControl = options.queueControl;
        const ownsProgressClock = !collectionProgressClockV2;
        let progressFinalLabel = "готово";
        if (ownsProgressClock) startCollectionProgressClock();
        beginCollectionProgressPhase(uniqueIds.length, 0);
        try {
            if (options.automatic && getCollectionSyncCooldownRemaining() > 0) {
                progressFinalLabel = "пауза";
                scheduleCollectionResumeAfterCooldown();
                return {
                    completed:0,
                    failed:0,
                    ready:isCollectionSnapshotAnalysisReady(context, snapshot),
                    deferred:true,
                    persisted:flushCollectionStatsCache(context)
                };
            }
            if (!uniqueIds.length) {
                const persisted = flushCollectionStatsCache(context);
                if (!isCurrentCollectionSnapshot(context, snapshot)) {
                    const latest = readCollectionSnapshot(context);
                    return {
                        completed:0,
                        failed:0,
                        ready:isCollectionSnapshotAnalysisReady(context, latest),
                        stale:true,
                        persisted
                    };
                }
                const ready = isCollectionSnapshotAnalysisReady(context, snapshot);
                window.animesssResults = hydrateCollectionSnapshot(context, snapshot);
                window.animesssScanStarted = true;
                updateCollectionAnalysisButton(context, snapshot, options.newCount);
                if (!persisted || options.snapshotPersisted === false) {
                    progressFinalLabel = "частично";
                    markCollectionAnalysisStorageWarning();
                    setCollectionProgress("Результат готов, но хранилище браузера переполнено.", 1, 1, true);
                }
                if (document.querySelector("#animesss-results")) window.animesssRefreshResults();
                return { completed:0, failed:0, ready, persisted };
            }
            const types = new Map(snapshot.types.map(type => [String(type.id), type]));
            const stats = getCollectionStatsMap(context);
            const pendingIds = new Set(getPendingCollectionStatsIds(context, snapshot).map(String));
            let completed = 0;
            let failed = 0;
            for (const id of uniqueIds) {
                if (queueControl?.cancelled) {
                    progressFinalLabel = "остановлено";
                    break;
                }
                const requestNeeded = !isCollectionStatsReady(stats.get(id))
                    || (pendingIds.has(id) && !collectionStatsRefreshedPendingV2.get(context.userKey)?.has(id));
                if (!requestNeeded) {
                    completed++;
                    recordCollectionProgressWork(completed);
                    setCollectionProgress("Статистика карт: " + completed + "/" + uniqueIds.length, completed, uniqueIds.length, true);
                    continue;
                }
                const type = types.get(id) || { id, name:"Карта #" + id };
                setCollectionProgress("Анализирую карту: " + (type.name || ("#" + id)), completed, uniqueIds.length, true);
                try {
                    await fetchCollectionCardStats(context, type, { signal:queueControl?.controller.signal });
                } catch (error) {
                    if (error?.name === "AbortError" && queueControl?.cancelled) {
                        progressFinalLabel = "остановлено";
                        break;
                    }
                    failed++;
                    console.warn("[Animesss] Не удалось получить статистику карты " + id + ":", error);
                    if (error?.cooldown || [429, 502, 520].includes(Number(error?.status))) break;
                }
                completed++;
                recordCollectionProgressWork(completed);
                setCollectionProgress("Статистика карт: " + completed + "/" + uniqueIds.length, completed, uniqueIds.length, true);
                if (queueControl?.cancelled) {
                    progressFinalLabel = "остановлено";
                    break;
                }
                if (completed < uniqueIds.length) await sleep(COLLECTION_STATS_DELAY_MS);
            }
            if (options.automatic && failed && getCollectionSyncCooldownRemaining() > 0) {
                scheduleCollectionResumeAfterCooldown();
            }
            if (failed) progressFinalLabel = "частично";
            const persisted = flushCollectionStatsCache(context);
            if (!isCurrentCollectionSnapshot(context, snapshot)) {
                const latest = readCollectionSnapshot(context);
                return {
                    completed,
                    failed,
                    ready:isCollectionSnapshotAnalysisReady(context, latest),
                    stale:true,
                    persisted
                };
            }
            const ready = isCollectionSnapshotAnalysisReady(context, snapshot);
            window.animesssResults = hydrateCollectionSnapshot(context, snapshot);
            window.animesssScanStarted = true;
            updateCollectionAnalysisButton(context, snapshot, options.newCount);
            if (!persisted || options.snapshotPersisted === false) {
                progressFinalLabel = "частично";
                markCollectionAnalysisStorageWarning();
                setCollectionProgress("Результат готов, но хранилище браузера переполнено.", 1, 1, true);
            }
            if (document.querySelector("#animesss-results")) window.animesssRefreshResults();
            return { completed, failed, ready, persisted, cancelled:Boolean(queueControl?.cancelled) };
        } finally {
            if (ownsProgressClock) {
                stopCollectionProgressClock(progressFinalLabel);
                hideCollectionProgress(progressFinalLabel === "готово" ? 2200 : 4500);
            }
        }
    }

    function ensureSnapshotStats(context, snapshot, ids, options = {}) {
        const queueKey = context.userKey + ":" + (context.rank || "all") + ":"
            + String(snapshot?.revision || snapshot?.updatedAt || "current");
        const existing = collectionStatsQueuesV2.get(queueKey);
        if (existing) return existing.promise;
        const control = { cancelled:false, controller:new AbortController() };
        setCollectionSyncButtons(true, "↻ АНАЛИЗ СТАТИСТИКИ…");
        const task = ensureSnapshotStatsCore(context, snapshot, ids, { ...options, queueControl:control })
            .finally(() => {
                collectionStatsQueuesV2.delete(queueKey);
                if (!collectionSyncPromiseV2 && !collectionStatsQueuesV2.size && !collectionStatsInFlightV2.size) {
                    setCollectionSyncButtons(false);
                }
            });
        collectionStatsQueuesV2.set(queueKey, { promise:task, control });
        return task;
    }

    function cancelCollectionStatsQueuesV2() {
        const running = [...collectionStatsQueuesV2.values()];
        const inFlight = [...collectionStatsInFlightV2.values()];
        running.forEach(entry => {
            entry.control.cancelled = true;
            entry.control.controller.abort();
        });
        inFlight.forEach(entry => entry.controller.abort());
        return Promise.allSettled([
            ...running.map(entry => entry.promise),
            ...inFlight.map(entry => entry.promise)
        ]);
    }

    function commitComposition(context, previous, candidate) {
        const diff = diffComposition(previous, candidate);
        const snapshotKey = getCollectionSnapshotCacheKey(context);
        let previousStoredSnapshot = null;
        try { previousStoredSnapshot = localStorage.getItem(snapshotKey); }
        catch (error) {}
        const saved = saveCollectionSnapshot(context, candidate);
        if (!saved) throw new Error("Не удалось сохранить точный состав коллекции.");
        const discovery = addUnseenFromDiff(context, previous, saved, diff, {
            persist:saved.persisted !== false,
            allowBlockedPersistence:saved.persisted !== false
        });
        if (saved.persisted !== false && discovery.persisted === false) {
            try {
                localStorage.removeItem(snapshotKey);
                if (previousStoredSnapshot != null) localStorage.setItem(snapshotKey, previousStoredSnapshot);
            } catch (error) {
                console.warn("[Animesss] Не удалось откатить несогласованный снимок:", error);
            }
            saved.persisted = false;
        }
        window.animesssCurrentCollectionUsername = context.username;
        const newCount = Number(discovery?.globalNewCount) || 0;
        const ready = isCollectionSnapshotAnalysisReady(context, saved);
        window.animesssResults = hydrateCollectionSnapshot(context, saved);
        window.animesssScanStarted = true;
        updateCollectionAnalysisButton(context, saved, newCount);
        const persisted = saved.persisted !== false && discovery.persisted !== false;
        if (persisted) collectionUnseenPersistenceBlockedV2.delete(context.userKey);
        else collectionUnseenPersistenceBlockedV2.add(context.userKey);
        if (!persisted) markCollectionAnalysisStorageWarning();
        return {
            snapshot:saved,
            diff,
            ready,
            newCount,
            discovery,
            persisted
        };
    }

    function restoreSavedCollectionResults() {
        const context = getCollectionContext();
        const snapshot = readCollectionSnapshot(context);
        if (!snapshot) return null;
        window.animesssCurrentCollectionUsername = context.username;
        window.animesssResults = hydrateCollectionSnapshot(context, snapshot);
        window.animesssScanStarted = true;
        if (!isCollectionSnapshotAnalysisReady(context, snapshot)) {
            updateCollectionAnalysisButton(context, snapshot);
            return { context, snapshot, pendingStats:true };
        }
        updateCollectionAnalysisButton(context, snapshot);
        return { context, snapshot };
    }

    function pageSignature(cards) {
        return (cards || [])
            .map(card => card.ownerId ? "o:" + card.ownerId : "t:" + card.id)
            .sort()
            .join("|");
    }

    function snapshotPageSignature(snapshot, page) {
        return pageSignature((snapshot?.copies || []).filter(copy => Number(copy.page) === Number(page)));
    }

    function clearCollectionAutoSyncTimerV2() {
        clearTimeout(collectionAutoSyncTimerV2);
        collectionAutoSyncTimerV2 = null;
    }

    async function reconcileVisibleCollectionV2(options = {}) {
        if (collectionSyncPromiseV2) return;
        if (window.animesssCompareLoading || collectionCompareStatsInFlight.size
            || collectionStatsQueuesV2.size || collectionStatsInFlightV2.size) {
            clearCollectionAutoSyncTimerV2();
            collectionAutoSyncTimerV2 = setTimeout(reconcileVisibleCollectionV2, 1200);
            return;
        }
        const context = getCollectionContext();
        const state = getCollectionDocumentState(document, context);
        if (!state.loaded || state.activeSearch || !isCollectionStateInScope(state, context)) {
            clearCollectionAutoSyncTimerV2();
            return;
        }
        const previous = readCollectionSnapshot(context);

        if (state.singleExact && !(previous && Number(previous.pageCount) > 1)) {
            clearCollectionAutoSyncTimerV2();
            const unchanged = Boolean(previous
                && Number(previous.pageCount) === 1
                && pageSignature(state.cards) === snapshotPageSignature(previous, 1));
            if (unchanged) {
                const ids = getCollectionStatsWorkIds(context, previous);
                if (ids.length) await ensureSnapshotStats(context, previous, ids, { automatic:true, newCount:0 });
                return;
            }
            await syncCollectionV2({
                automatic:true,
                manual:false,
                openResults:false,
                forceServerVerification:true
            });
            return;
        }

        if (!previous) {
            clearCollectionAutoSyncTimerV2();
            return;
        }
        const visibleUnchanged = pageSignature(state.cards) === snapshotPageSignature(previous, state.currentPage)
            && Number(state.pageCount) === Number(previous.pageCount);
        if (visibleUnchanged) {
            clearCollectionAutoSyncTimerV2();
            const tailCheckKey = context.userKey + ":" + (context.rank || "all") + ":"
                + String(previous.revision || previous.updatedAt || "current");
            if (state.pageCount > 1 && state.currentPage !== state.pageCount && !collectionTailChecksV2.has(tailCheckKey)) {
                if (getCollectionSyncCooldownRemaining() > 0) {
                    scheduleCollectionResumeAfterCooldown();
                    return;
                }
                collectionTailChecksV2.set(tailCheckKey, true);
                try {
                    const response = await fetchCollectionPageOnce(buildCollectionPageUrl(context, state.pageCount), { withMeta:true });
                    assertCollectionPageResponse(response, state.pageCount, context);
                    const tailDoc = parser.parseFromString(response.html, "text/html");
                    const tailState = getCollectionDocumentState(tailDoc, context, state.pageCount);
                    if (!tailState.cards.length || !isCollectionStateInScope(tailState, context)) {
                        throw new Error("Не удалось проверить последнюю страницу коллекции.");
                    }
                    if (pageSignature(tailState.cards) !== snapshotPageSignature(previous, state.pageCount)) {
                        const synced = await syncCollectionV2({
                            automatic:true,
                            manual:false,
                            openResults:false,
                            forceServerVerification:true
                        });
                        if (!synced) collectionTailChecksV2.delete(tailCheckKey);
                        return;
                    }
                } catch (error) {
                    collectionTailChecksV2.delete(tailCheckKey);
                    console.warn("[Animesss] Не удалось проверить последнюю страницу:", error);
                    if (getCollectionSyncCooldownRemaining() > 0) scheduleCollectionResumeAfterCooldown();
                }
            }
            const missingIds = getCollectionStatsWorkIds(context, previous);
            if (missingIds.length) await ensureSnapshotStats(context, previous, missingIds, { automatic:true, newCount:0 });
            return;
        }
        clearCollectionAutoSyncTimerV2();
        if (options.immediate) {
            return syncCollectionV2({
                automatic:true,
                manual:false,
                openResults:Boolean(options.openResults),
                forceServerVerification:true
            });
        }
        collectionAutoSyncTimerV2 = setTimeout(() => {
            if (getCollectionSyncCooldownRemaining() > 0) {
                scheduleCollectionResumeAfterCooldown();
                return;
            }
            syncCollectionV2({ automatic:true, manual:false, openResults:false, forceServerVerification:true });
        }, COLLECTION_AUTO_SYNC_DELAY_MS);
    }

    function startCollectionDomObserverV2() {
        if (window.animesssCollectionDomObserverV2) return;
        let timer;
        const schedule = () => {
            clearTimeout(timer);
            timer = setTimeout(reconcileVisibleCollectionV2, COLLECTION_DOM_STABLE_MS);
        };
        window.animesssCollectionDomObserverV2 = new MutationObserver(mutations => {
            const relevant = mutations.some(mutation => {
                const target = mutation.target?.nodeType === 1 ? mutation.target : mutation.target?.parentElement;
                if (target?.closest?.("#animesss-results, #animesss-progress-box, #animesss-update-notif, #animesss-intro-notif")) return false;
                if (target?.closest?.(".anime-cards, .user-cards, .pagination")) return true;
                return [...(mutation.addedNodes || [])].some(node => node.nodeType === 1
                    && (node.matches?.(".anime-cards__item, .pagination")
                        || node.querySelector?.(".anime-cards__item, .pagination")));
            });
            if (relevant) schedule();
        });
        window.animesssCollectionDomObserverV2.observe(document.body, { childList:true, subtree:true });
        document.addEventListener("input", event => {
            if (event.target?.matches?.('input[placeholder*="Имя персонажа"], input[placeholder*="название аниме"]')) schedule();
        }, true);
        schedule();
    }

    async function fetchCollectionPagesPool(context, pageNumbers, pages, pageCount) {
        const queue = [...pageNumbers];
        if (!queue.length) {
            beginCollectionProgressPhase(0, 0);
            return;
        }
        const controller = new AbortController();
        let nextIndex = 0;
        let completed = 0;
        let firstError = null;
        beginCollectionProgressPhase(queue.length, 0);

        const worker = async () => {
            while (!firstError) {
                const index = nextIndex++;
                if (index >= queue.length) return;
                const page = queue[index];
                try {
                    const response = await fetchCollectionPageOnce(buildCollectionPageUrl(context, page), {
                        signal:controller.signal,
                        withMeta:true
                    });
                    assertCollectionPageResponse(response, page, context);
                    const html = response.html;
                    const doc = parser.parseFromString(html, "text/html");
                    const state = getCollectionDocumentState(doc, context, page);
                    if (!state.cards.length) throw new Error("Не удалось прочитать страницу " + page + "/" + pageCount + ".");
                    if (!isCollectionStateInScope(state, context)) throw new Error("Страница " + page + " содержит карты другого ранга.");
                    pages.set(page, state.cards);
                    completed++;
                    recordCollectionProgressWork(completed);
                    setCollectionProgress("Состав: получено " + pages.size + "/" + pageCount + " (стр. " + page + ")", pages.size, pageCount, true);
                } catch (error) {
                    if (error?.name === "AbortError" && firstError) return;
                    if (!firstError) {
                        firstError = error;
                        controller.abort();
                    }
                    return;
                }
            }
        };

        const workers = Array.from(
            { length:Math.min(COLLECTION_PAGE_CONCURRENCY, queue.length) },
            () => worker()
        );
        await Promise.all(workers);
        if (firstError) throw firstError;
    }

    async function runCollectionSyncV2(options) {
        clearCollectionAutoSyncTimerV2();
        const context = getCollectionContext();
        const previous = readCollectionSnapshot(context);
        const cooldown = getCollectionSyncCooldownRemaining();
        if (cooldown > 0) {
            const minutes = Math.ceil(cooldown / 60000);
            startCollectionProgressClock();
            setCollectionProgress("Защитная пауза после ошибки сервера: ещё " + minutes + " мин.", 0, 1, true);
            stopCollectionProgressClock("пауза");
            hideCollectionProgress(3500);
            if (previous) {
                window.animesssResults = hydrateCollectionSnapshot(context, previous);
                window.animesssScanStarted = true;
                updateCollectionAnalysisButton(context, previous);
            } else {
                window.animesssResults = null;
                window.animesssScanStarted = false;
            }
            return false;
        }
        clearTimeout(collectionCooldownResumeTimerV2);
        collectionCooldownResumeTimerV2 = null;

        startCollectionProgressClock();
        setCollectionSyncButtons(true);
        setCollectionProgress("Проверяю точный состав коллекции…", 0, 1, true);
        const currentState = getCollectionDocumentState(document, context);
        const pages = new Map();
        let pageCount = currentState.pageCount;
        const mustVerifyPageShrink = Boolean(options.forceServerVerification || options.manual
            || (previous && Number(previous.pageCount) > 1 && Number(currentState.pageCount) === 1));
        let committedSnapshot = null;
        let clockFinalLabel = "остановлено";

        try {
            if (currentState.singleExact && isCollectionStateInScope(currentState, context) && !mustVerifyPageShrink) {
                pages.set(1, currentState.cards);
                pageCount = 1;
            } else {
                let firstState;
                if (!mustVerifyPageShrink && currentState.currentPage === 1 && currentState.loaded && !currentState.activeSearch
                    && isCollectionStateInScope(currentState, context)) {
                    firstState = currentState;
                } else {
                    beginCollectionProgressPhase(1, 0);
                    const firstResponse = await fetchCollectionPageOnce(buildCollectionPageUrl(context, 1), { withMeta:true });
                    assertCollectionPageResponse(firstResponse, 1, context);
                    const firstHtml = firstResponse.html;
                    recordCollectionProgressWork(1);
                    const firstDoc = parser.parseFromString(firstHtml, "text/html");
                    firstState = getCollectionDocumentState(firstDoc, context, 1);
                }
                if (!firstState.loaded) throw new Error("Не удалось прочитать первую страницу коллекции.");
                if (!isCollectionStateInScope(firstState, context)) throw new Error("Сервер вернул карты другого ранга.");
                pageCount = firstState.pageCount;
                pages.set(1, firstState.cards);
                setCollectionProgress("Состав: страница 1/" + pageCount, 1, pageCount, true);
                if (currentState.currentPage > 1 && currentState.currentPage <= pageCount
                    && currentState.loaded && !currentState.activeSearch && isCollectionStateInScope(currentState, context)) {
                    pages.set(currentState.currentPage, currentState.cards);
                }
                const pagesToFetch = [];
                for (let page = 2; page <= pageCount; page++) {
                    if (!pages.has(page)) pagesToFetch.push(page);
                }
                await fetchCollectionPagesPool(context, pagesToFetch, pages, pageCount);
            }

            const candidate = makeCompositionSnapshot(context, pages, pageCount);
            const committed = commitComposition(context, previous, candidate);
            committedSnapshot = committed.snapshot;
            clockFinalLabel = "частично";
            if (Array.isArray(window.animesssResults)) {
                if (document.querySelector("#animesss-results")) window.animesssRefreshResults();
                else if (options.openResults) showResults(window.animesssResults, null, true);
            }
            const ids = getStatsIdsForSnapshot(context, previous, committed.snapshot, committed.diff);
            const statsResult = await ensureSnapshotStats(context, committed.snapshot, ids, {
                ...options,
                newCount:committed.newCount,
                snapshotPersisted:committed.persisted
            });
            const analysisReady = Boolean(statsResult.ready ?? committed.ready);
            if ((!analysisReady || statsResult.failed) && options.automatic && getCollectionSyncCooldownRemaining() > 0) {
                scheduleCollectionResumeAfterCooldown();
            }

            if (Array.isArray(window.animesssResults)) {
                if (document.querySelector("#animesss-results")) window.animesssRefreshResults();
                else if (options.openResults) showResults(window.animesssResults, null, true);
            }

            const pendingCount = getCollectionStatsWorkIds(context, committed.snapshot).length;
            const persisted = committed.persisted && statsResult.persisted !== false;
            clockFinalLabel = analysisReady && !statsResult.failed && persisted ? "готово" : "частично";
            const persistenceWarning = persisted ? "" : " Кэш слишком большой: результат сохранён только до перезагрузки.";
            const summary = analysisReady
                ? "Состав обновлён: +" + committed.newCount
                    + ", −" + committed.diff.removedCopies.length
                    + (statsResult.failed ? ". Обновление статистики отложено." : ".") + persistenceWarning
                : "Состав готов. Статистика ещё догружается для " + pendingCount
                    + " карт." + persistenceWarning;
            setCollectionProgress(summary, 1, 1, true);
            hideCollectionProgress(analysisReady && !statsResult.failed ? 2200 : 5000);
            return true;
        } catch (error) {
            console.error("[Animesss] Ошибка синхронизации состава:", error);
            const status = Number(error?.status);
            const message = [429, 502, 520].includes(status)
                ? "Сервер вернул " + status + ". Синхронизация остановлена; старый состав сохранён."
                : (error?.message || "Не удалось синхронизировать состав.");
            setCollectionProgress(message, 0, 1, true);
            hideCollectionProgress(4500);
            if (options.automatic && getCollectionSyncCooldownRemaining() > 0) scheduleCollectionResumeAfterCooldown();
            const fallbackSnapshot = committedSnapshot || previous;
            if (fallbackSnapshot) {
                window.animesssResults = hydrateCollectionSnapshot(context, fallbackSnapshot);
                window.animesssScanStarted = true;
                updateCollectionAnalysisButton(context, fallbackSnapshot);
            } else {
                window.animesssResults = null;
                window.animesssScanStarted = false;
            }
            return false;
        } finally {
            stopCollectionProgressClock(clockFinalLabel);
            setCollectionSyncButtons(false);
        }
    }

    function syncCollectionV2(options = {}) {
        if (collectionSyncPromiseV2) return collectionSyncPromiseV2;
        if (window.animesssCompareLoading || collectionCompareStatsInFlight.size) {
            if (options.automatic) {
                clearCollectionAutoSyncTimerV2();
                collectionAutoSyncTimerV2 = setTimeout(reconcileVisibleCollectionV2, 1200);
                return Promise.resolve(false);
            }
            setCollectionProgress("Сначала дождись завершения сравнения коллекций.", 0, 1, true);
            hideCollectionProgress(3000);
            return Promise.resolve(false);
        }
        const waitForStats = cancelCollectionStatsQueuesV2();
        collectionSyncPromiseV2 = waitForStats
            .then(() => runCollectionSyncV2(options))
            .finally(() => {
                collectionSyncPromiseV2 = null;
                if (!collectionStatsQueuesV2.size && !collectionStatsInFlightV2.size) setCollectionSyncButtons(false);
            });
        return collectionSyncPromiseV2;
    }

    window.animesssSyncCurrentCollection = () => syncCollectionV2({ manual:true, automatic:false, openResults:true });
    // ===== /COLLECTION CACHE V2 =====

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.animesss-menu-btn')) {
            document.querySelectorAll('.animesss-menu-popup').forEach(p => p.style.display = 'none');
        }
    });

    function createUI() {
        if (document.querySelector('#animesss-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'animesss-btn';
        const params = new URL(location.href).searchParams;
        const currentRank = params.get('rank');
        btn.innerHTML = `<span style="opacity:.9;">◆</span>&nbsp; ${currentRank ? `АНАЛИЗ ${currentRank.toUpperCase()}` : 'АНАЛИЗ КОЛЛЕКЦИИ'}`;

        const savedPos = JSON.parse(localStorage.getItem('animesss_btn_pos') || '{}');
        btn.style.cssText = `
            position: fixed;
            left: ${savedPos.left || '20px'};
            top: ${savedPos.top || '20px'};
            z-index: 999999;
            padding: 11px 20px 11px 16px;
            cursor: pointer;
            border: 1px solid var(--an-line);
            border-left: 3px solid var(--an-red);
            border-radius: 10px;
            background: rgba(12,12,15,0.88);
            backdrop-filter: blur(10px);
            color: var(--an-ink);
            font-family: var(--an-body);
            font-weight: 700;
            font-size: 12.5px;
            letter-spacing: 0.6px;
            box-shadow: 0 6px 20px rgba(0,0,0,.4);
            transition: transform .15s ease, box-shadow .2s ease, left .12s ease-out, top .12s ease-out;
        `;

        btn.onmouseover = () => { btn.style.transform = 'scale(1.03)'; btn.style.boxShadow = '0 8px 26px rgba(214,48,74,.25)'; };
        btn.onmouseout = () => { btn.style.transform = 'scale(1)'; btn.style.boxShadow = '0 6px 20px rgba(0,0,0,.4)'; };

        const progressBox = document.createElement('div');
        progressBox.id = 'animesss-progress-box';
        progressBox.style.cssText = `
            position: fixed; top: 70px; right: 20px; width: 320px;
            background: rgba(12,12,15,0.92); border: 1px solid var(--an-line); border-radius: 14px;
            padding: 16px; box-sizing:border-box; z-index: 10000020; display: none; color: var(--an-ink);
            font-family: var(--an-body);
            box-shadow: 0 10px 30px rgba(0,0,0,.5); backdrop-filter: blur(14px);
        `;
        progressBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">
                <span style="font-family:var(--an-display); font-weight:800; font-size:13px; letter-spacing:0.5px; color:var(--an-red-bright);">СКАНИРОВАНИЕ</span>
                <span id="animesss-time" style="font-family:var(--an-mono); font-size:13px; color:var(--an-ink-dim); white-space:nowrap;">⏱ --</span>
            </div>
            <div id="animesss-content">
                <div id="animesss-status" style="font-size:13px; color:var(--an-ink-dim); margin-bottom:10px;">Ожидание...</div>
                <div style="position:relative; width:100%; height:8px; background:rgba(255,255,255,0.06); border-radius:8px; overflow:hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,.4);">
                    <div id="animesss-bar" style="width:0%; height:100%; background:linear-gradient(90deg, var(--an-wine), var(--an-red), var(--an-red-bright)); transition:width .2s; position:relative;"></div>
                    <div style="position:absolute; inset:0 0 50% 0; background:linear-gradient(180deg, rgba(255,255,255,0.22), transparent); pointer-events:none;"></div>
                    <div style="position:absolute; inset:0; overflow:hidden; pointer-events:none;">
                        <div style="width:30%; height:100%; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation: animesssShimmer 1.8s linear infinite;"></div>
                    </div>
                </div>
                <div style="margin-top:8px; min-height:16px; display:flex; align-items:center; justify-content:space-between; gap:12px; font-family:var(--an-mono); font-size:12px; color:var(--an-ink-dim);">
                    <span id="animesss-eta" style="white-space:nowrap;"></span>
                    <span id="animesss-percent" style="margin-left:auto; text-align:right; white-space:nowrap;">0%</span>
                </div>
            </div>
        `;

        document.body.appendChild(btn);
        document.body.appendChild(progressBox);

        // Drag & Drop Logic
        let dragging = false, moved = false, offsetX = 0, offsetY = 0;
        btn.addEventListener('mousedown', e => {
            dragging = true; moved = false;
            offsetX = e.clientX - btn.offsetLeft;
            offsetY = e.clientY - btn.offsetTop;
        });

        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            moved = true;
            btn.style.left = (e.clientX - offsetX) + 'px';
            btn.style.top = (e.clientY - offsetY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            localStorage.setItem('animesss_btn_pos', JSON.stringify({ left: btn.style.left, top: btn.style.top }));
        });

        btn.addEventListener('click', async e => {
            if (moved) {
                e.preventDefault();
                e.stopPropagation();
                moved = false;
                return;
            }

            if (window.animesssResults) {
                const resWin = document.querySelector('#animesss-results');
                if (resWin) {
                    resWin.style.display = resWin.style.display === 'none' ? 'block' : 'none';
                } else {
                    showResults(window.animesssResults);
                }
                // Сначала подтверждаем, что восстановленный снимок всё ещё описывает
                // текущий состав. Статистика запускается самим reconcile только после
                // проверки видимой и последней страниц, поэтому удалённые карты не
                // могут задержать обновление коллекции.
                await reconcileVisibleCollectionV2({ immediate:true, openResults:true });
                return;
            }

            if (progressBox.style.display === 'none' || !progressBox.style.display) {
                progressBox.style.display = 'block';
            } else {
                progressBox.style.display = 'none';
            }

            if (!window.animesssScanStarted) {
                await scanCollection();
            }
        }, true);

        // Сразу показываем последний точный снимок, а после стабилизации DOM
        // безопасно сверяем открытую страницу коллекции.
        restoreSavedCollectionResults();
        startCollectionDomObserverV2();
    }

    async function scanCollection() {
        return syncCollectionV2({ manual:true, automatic:false, openResults:true });
    }
    // ===== 3D-НАКЛОН КАРТОЧКИ (как у карточек Steam) =====
    // TILT_MAX_DEG — насколько сильно карта наклоняется (в градусах), TILT_SCALE — насколько увеличивается при наведении.
    const TILT_MAX_DEG = 6;
    const TILT_SCALE = 1.06;

    window.animesssCloseCardMenus = (exceptCard = null) => {
        document.querySelectorAll('#animesss-results .animesss-card.animesss-menu-active').forEach(card => {
            if (card === exceptCard) return;
            card.classList.remove('animesss-menu-active');
            delete card.dataset.menuOpen;
            delete card.dataset.menuInteracting;
            const popup = card.querySelector('.animesss-menu-popup');
            if (popup) popup.style.display = 'none';
            window.animesssTiltReset(card);
        });
    };

    window.animesssPrepareCardMenu = (event, button) => {
        event.stopPropagation();
        const card = button.closest('.animesss-card');
        if (!card) return;
        clearTimeout(card.lazyTimer);
        card.dataset.menuInteracting = '1';
        card.style.transition = 'none';
        card.style.setProperty(
            'transform',
            'perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
            'important'
        );
        const glare = card.querySelector('.animesss-card-glare');
        if (glare) glare.style.opacity = '0';
    };

    window.animesssToggleCardMenu = (event, button) => {
        event.preventDefault();
        event.stopPropagation();
        const card = button.closest('.animesss-card');
        const popup = button.nextElementSibling;
        if (!card || !popup) return;
        const willOpen = card.dataset.menuOpen !== '1';
        window.animesssCloseCardMenus(willOpen ? card : null);
        if (willOpen) {
            clearTimeout(card.lazyTimer);
            card.dataset.menuOpen = '1';
            card.dataset.menuInteracting = '1';
            card.classList.add('animesss-menu-active');
            popup.style.display = 'block';
        } else {
            popup.style.display = 'none';
            card.classList.remove('animesss-menu-active');
            delete card.dataset.menuOpen;
            setTimeout(() => {
                if (card.isConnected) delete card.dataset.menuInteracting;
            }, 180);
        }
    };

    window.animesssArchiveFromMenu = (event, id) => {
        event.preventDefault();
        event.stopPropagation();
        const card = event.currentTarget?.closest?.('.animesss-card');
        if (card) {
            clearTimeout(card.lazyTimer);
            card.dataset.menuInteracting = '1';
        }
        window.animesssToggleArchive(id);
    };

    window.animesssOpenCard = (event, id, card) => {
        if (event.defaultPrevented
            || event.target.closest('.animesss-menu-btn, .animesss-menu-popup')
            || card?.dataset.menuOpen === '1'
            || card?.dataset.menuInteracting === '1') return;
        window.open('/cards/users/?id=' + encodeURIComponent(id), '_blank');
    };

    window.animesssCardClick = (event, id, card) => {
        if (!window.animesssSelectionMode) {
            window.animesssOpenCard(event, id, card);
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const idStr = String(id);
        if (!(window.animesssSelectedCardIds instanceof Set)) {
            window.animesssSelectedCardIds = new Set();
        }
        if (window.animesssSelectedCardIds.has(idStr)) {
            window.animesssSelectedCardIds.delete(idStr);
            card.classList.remove('animesss-card-selected');
        } else {
            window.animesssSelectedCardIds.add(idStr);
            card.classList.add('animesss-card-selected');
        }
        document.querySelector('#animesss-results')
            ?.dispatchEvent(new CustomEvent('animesss-selection-change'));
    };

    window.animesssCardEnter = (id, card) => {
        if (window.animesssSelectionMode) {
            clearTimeout(card.lazyTimer);
            card.style.transition = 'none';
            return;
        }
        window.animesssClearNewTag(id, card);
        clearTimeout(card.lazyTimer);
        if (card.dataset.menuOpen === '1' || card.dataset.menuInteracting === '1') return;
        card.lazyTimer = setTimeout(() => {
            if (card.isConnected && card.dataset.menuOpen !== '1' && card.dataset.menuInteracting !== '1') {
                window.animesssLazyUpdate(id, card);
            }
        }, 1500);
        card.style.transition = 'none';
    };

    window.animesssCardMove = (event, card) => {
        if (window.animesssSelectionMode
            || card.dataset.menuOpen === '1'
            || card.dataset.menuInteracting === '1'
            || event.target.closest('.animesss-menu-btn, .animesss-menu-popup')) return;
        window.animesssTiltMove(event, card);
    };

    window.animesssCardLeave = (card) => {
        clearTimeout(card.lazyTimer);
        if (window.animesssSelectionMode) return;
        if (card.dataset.menuOpen === '1') return;
        delete card.dataset.menuInteracting;
        window.animesssTiltReset(card);
    };

    if (!window.animesssCardMenuOutsideHandlerInstalled) {
        window.animesssCardMenuOutsideHandlerInstalled = true;
        document.addEventListener('pointerdown', event => {
            if (!event.target.closest?.('.animesss-menu-btn, .animesss-menu-popup')) {
                window.animesssCloseCardMenus();
            }
        }, true);
    }

    window.animesssTiltMove = (e, el) => {
        if (el.dataset.menuOpen === '1' || el.dataset.menuInteracting === '1') return;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const px = x / rect.width;
        const py = y / rect.height;
        const rotateY = (px - 0.5) * 2 * TILT_MAX_DEG;
        const rotateX = (0.5 - py) * 2 * TILT_MAX_DEG;
        el.style.setProperty('transform', `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${TILT_SCALE}, ${TILT_SCALE}, ${TILT_SCALE})`, 'important');
        const glare = el.querySelector('.animesss-card-glare');
        if (glare) {
            glare.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.12), transparent 55%)`;
            glare.style.opacity = '1';
        }
    };

    window.animesssTiltReset = (el) => {
        el.style.transition = 'transform 0.5s ease';
        el.style.setProperty('transform', 'perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)', 'important');
        const glare = el.querySelector('.animesss-card-glare');
        if (glare) glare.style.opacity = '0';
        setTimeout(() => { el.style.transition = ''; el.style.removeProperty('transform'); }, 500);
    };
    // ===== /3D-НАКЛОН КАРТОЧКИ =====

    window.animesssAnimateStatNumbers = (container, duration = 650) => {
        if (!container) return;
        container.querySelectorAll('.animesss-stat b').forEach(el => {
            const target = parseInt(el.textContent, 10);
            if (isNaN(target)) return;
            const startValue = parseInt(el.dataset.animStart || '0', 10);
            const start = performance.now();
            delete el.dataset.animStart;

            function tick(now) {
                const p = Math.min(1, (now - start) / duration);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(startValue + (target - startValue) * eased);
                if (p < 1) requestAnimationFrame(tick);
                else el.textContent = target;
            }

            el.textContent = startValue;
            requestAnimationFrame(tick);
        });
    };

    window.animesssLazyUpdate = async (id, element) => {
        if (collectionSyncPromiseV2 || collectionStatsQueuesV2.size
            || collectionStatsInFlightV2.size || window.animesssCompareLoading) return;
        const idStr = String(id);
        const statsEl = element.querySelector('.animesss-lazy-stats');
        if (!statsEl) return;
        const oldValues = [...statsEl.querySelectorAll('.animesss-stat b')].map(el => parseInt(el.textContent, 10) || 0);
        statsEl.style.opacity = '0.5';
        try {
            const context = getCollectionContext();
            const current = window.animesssResults?.find(card => String(card.id) === idStr) || { id:idStr };
            const fresh = await fetchCollectionCardStats(context, {
                id:idStr,
                name:current.name || '',
                rank:current.rank || '',
                anime:current.anime || '',
                image:current.image || ''
            });
            if (!fresh || !isCollectionStatsReady(fresh)) throw new Error('Некорректная статистика карты.');
            const total = fresh.total;
            const wanted = fresh.wanted;
            const trade = fresh.trade;
            if (window.animesssResults) {
                window.animesssResults.forEach(card => {
                    if (String(card.id) === idStr) { card.total = total; card.wanted = wanted; card.trade = trade; card.lastUpdate = Date.now(); card.statsPending = false; }
                });
            }
            statsEl.innerHTML = `<span class="animesss-stat">❤️<b>${wanted}</b></span><span class="animesss-stat-sep"></span><span class="animesss-stat">🔄<b>${trade}</b></span><span class="animesss-stat-sep"></span><span class="animesss-stat">👥<b>${total}</b></span>`;
            statsEl.querySelectorAll('.animesss-stat b').forEach((el, index) => {
                el.dataset.animStart = oldValues[index] || 0;
            });
            window.animesssAnimateStatNumbers(statsEl);
            statsEl.style.color = '#4ce0a0';
            setTimeout(() => { statsEl.style.color = ''; statsEl.style.opacity = '1'; }, 2000);
            clearTimeout(window.animesssLazyResortTimer);
            window.animesssLazyResortTimer = setTimeout(() => window.animesssRefreshResults(), 720);
        } catch (e) { statsEl.style.opacity = '1'; }
    };

    window.animesssClearNewTag = (id, element) => {
        const tag = element.querySelector('.animesss-new-tag');
        if (!tag || element.animesssNewCleared) return;
        element.animesssNewCleared = true;
        tag.style.opacity = '0';
        tag.style.transform = 'rotate(-45deg) scale(0.5)';
        setTimeout(() => tag.remove(), 800);
        const idStr = String(id);
        if (window.animesssResults) {
            window.animesssResults.forEach(card => {
                if (String(card.id) === idStr) card.isNewInScan = false;
            });
        }
        const context = getCollectionContext();
        markCollectionCardSeen(context, idStr);
        const snapshot = readCollectionSnapshot(context);
        if (snapshot) updateCollectionAnalysisButton(context, snapshot);
        };

    function showResults(cards, activeTabId = null, animateIntroStats = false, suppressCardIntro = false) {
        let shouldAnimateIntroStats = animateIntroStats && !window.animesssIntroStatsAnimated;
        if (!(window.animesssSelectedCardIds instanceof Set)) {
            window.animesssSelectedCardIds = new Set();
        }
        let selectionMode = Boolean(window.animesssSelectionMode);
        const selectedIds = window.animesssSelectedCardIds;
        const rankWeight = {
            e:1, e_plus:1.5, d:2, d_plus:3, c:4, c_plus:6,
            b:8, b_plus:12, a:16, a_plus:24, s:32, s_plus:48,
            ass:64, sss:128
        };
        const enriched = cards.map(card => {
            const statsPending = Boolean(card.statsPending) || !isCollectionStatsReady(card);
            const safeCard = normalizeCardStats({ ...card });
            const rank = rankWeight[normalizeCollectionRank(card.rank)] || 1;
            return {
                ...safeCard,
                statsPending,
                valueScore:statsPending ? Number.NEGATIVE_INFINITY : (rank * 1000) + (safeCard.wanted * 10),
                rareScore:statsPending ? Number.NEGATIVE_INFINITY : (rank * 100000) - safeCard.total,
                demandScore:statsPending ? Number.NEGATIVE_INFINITY : safeCard.wanted,
                trashScore:statsPending ? Number.NEGATIVE_INFINITY : ((1000 - rank) * 100) - (safeCard.wanted * 10)
            };
        });

        const uniqueMap = new Map();
        for (const card of enriched) {
            const id = String(card.id);
            if (!uniqueMap.has(id)) {
                uniqueMap.set(id, { ...card, duplicates:1 });
            } else {
                const existing = uniqueMap.get(id);
                existing.duplicates++;
                existing.isNewInScan = Boolean(existing.isNewInScan || card.isNewInScan);
            }
        }

        const uniqueCards = [...uniqueMap.values()];
        const archivedIds = new Set(JSON.parse(localStorage.getItem('animesss_archived_ids') || '[]'));
        const activeCards = uniqueCards.filter(c => !archivedIds.has(String(c.id)));
        const archiveList = uniqueCards.filter(c => archivedIds.has(String(c.id))).sort((a, b) => b.wanted - a.wanted);
        const newCardsList = activeCards.filter(c => c.isNewInScan).sort((a, b) => b.wanted - a.wanted);
        const pendingCardsList = activeCards.filter(c => c.statsPending);
        const readyCards = activeCards.filter(c => !c.statsPending);

        const fullSortedValue = [...readyCards].sort((a, b) => b.valueScore - a.valueScore);
        const fullSortedRare = [...readyCards].sort((a, b) => b.rareScore - a.rareScore);
        const fullSortedDemand = [...readyCards].sort((a, b) => b.demandScore - a.demandScore);
        const fullSortedTrash = [...readyCards].sort((a, b) => b.trashScore - a.trashScore);

        const rankMaps = {
            best: new Map(fullSortedValue.map((c, i) => [String(c.id), i])),
            rare: new Map(fullSortedRare.map((c, i) => [String(c.id), i])),
            demand: new Map(fullSortedDemand.map((c, i) => [String(c.id), i])),
            trash: new Map(fullSortedTrash.map((c, i) => [String(c.id), i])),
            new: new Map(newCardsList.map((c, i) => [String(c.id), i])),
            pending: new Map(pendingCardsList.map((c, i) => [String(c.id), i])),
            archive: new Map(archiveList.map((c, i) => [String(c.id), i]))
        };

        const tabs = {
            best: fullSortedValue.slice(0, 50),
            rare: fullSortedRare.slice(0, 50),
            demand: fullSortedDemand.slice(0, 50),
            trash: fullSortedTrash.slice(0, 50),
            new: newCardsList,
            pending: pendingCardsList.slice(0, 100),
            archive: archiveList
        };

        function renderGrid(list, tabId) {
            const isArchive = tabId === 'archive';
            const isNewTab = tabId === 'new';
            const isPendingTab = tabId === 'pending';
            if (list.length === 0) return `<div class="animesss-empty-state">${isArchive ? 'Архив пуст' : isNewTab ? 'Новых карт нет' : isPendingTab ? 'Вся статистика готова' : 'Нет карт для отображения'}</div>`;

            const currentRankMap = rankMaps[tabId] || rankMaps.best;
            const rankVisual = [
                { cls: ' animesss-card-foil', border: '', anim: 'animesssGlowGold 2.5s infinite', shadow: '0 0 14px rgba(214,48,74,.3)', badgeBg: 'linear-gradient(135deg, var(--an-red), var(--an-red-bright))', badgeIcon: '♛', badgeLabel: 'KING', badgeColor: '#fff5f6' },
                { cls: '', border: '2px solid rgba(205,210,220,.55)', anim: 'animesssGlowSilver 2.5s infinite', shadow: '0 0 10px rgba(205,210,220,.25)', badgeBg: 'linear-gradient(135deg, #dfe2e8, #a9adb6)', badgeIcon: '✦', badgeLabel: 'ELITE', badgeColor: '#181818' },
                { cls: '', border: '2px solid rgba(196,138,90,.55)', anim: 'animesssGlowBronze 2.5s infinite', shadow: '0 0 10px rgba(196,138,90,.25)', badgeBg: 'linear-gradient(135deg, #c48a5a, #8a5730)', badgeIcon: '◆', badgeLabel: 'PRO', badgeColor: '#fff' }
            ];
            return `
                <div id="animesss-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:20px;">
                    ${list.map((card) => {
                        const globalIndex = currentRankMap.get(String(card.id));
                        const i = globalIndex !== undefined ? globalIndex : -1;
                        const isTop3 = !isArchive && !isNewTab && !isPendingTab && i >= 0 && i < 3;
                        const rv = isTop3 ? rankVisual[i] : null;
                        const isSelected = selectionMode && selectedIds.has(String(card.id));
                        const cardAnimation = suppressCardIntro ? (rv ? rv.anim : 'none') : (rv ? `animesssCardFlipIn 0.5s cubic-bezier(.22,1,.36,1) both, ${rv.anim}` : 'animesssCardFlipIn 0.5s cubic-bezier(.22,1,.36,1) both');
                        return `
                        <div data-id="${card.id}" class="animesss-card${rv ? rv.cls : ''}${isSelected ? ' animesss-card-selected' : ''}" style="position:relative; background:var(--an-panel); border:${rv ? rv.border || '2px solid transparent' : '1px solid var(--an-line)'}; border-radius:14px; overflow:hidden; transition:all .2s ease; cursor:pointer; animation-delay:${suppressCardIntro ? '0s' : `${(i % 50) * 0.03}s`}; animation:${cardAnimation}; box-shadow:${rv ? rv.shadow : 'none'};"
                             onmouseenter="window.animesssCardEnter('${card.id}', this)"
                             onmousemove="window.animesssCardMove(event, this)"
                             onmouseleave="window.animesssCardLeave(this)"
                             onclick="window.animesssCardClick(event, '${card.id}', this)">
                            <div class="animesss-card-glare"></div>
                            ${card.isNewInScan ? '<div class="animesss-new-tag">NEW</div>' : ''}
                            ${selectionMode ? '<div class="animesss-card-select-circle">✓</div>' : ''}
                            ${selectionMode ? '' : `<button type="button" class="animesss-menu-btn" aria-label="Меню карточки" title="Действия с карточкой"
                                    onpointerenter="window.animesssPrepareCardMenu(event, this)"
                                    onpointerdown="window.animesssPrepareCardMenu(event, this)"
                                    onclick="window.animesssToggleCardMenu(event, this)">⋮</button>
                            <div class="animesss-menu-popup" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();">
                                <div class="animesss-menu-item" role="button" tabindex="0"
                                     onpointerdown="event.stopPropagation()"
                                     onclick="window.animesssArchiveFromMenu(event, '${card.id}')">${isArchive ? '📂 Деархивировать' : '📁 Архивировать'}</div>
                            </div>`}
                            ${card.duplicates > 1 ? `<div class="animesss-dup-count">x${card.duplicates}</div>` : ''}
                            <img src="${card.image}" style="width:100%; display:block;">
                            ${rv ? `<div class="animesss-top-badge" style="position:absolute; top:10px; left:50%; transform:translateX(-50%); background:${rv.badgeBg}; color:${rv.badgeColor}; font-family:var(--an-body); font-weight:700; padding:4px 11px; border-radius:999px; font-size:11px; letter-spacing:.5px; z-index:5; white-space:nowrap; box-shadow:0 3px 10px rgba(0,0,0,.4);">${rv.badgeIcon} ${rv.badgeLabel}</div>` : ''}
                            <div style="padding:10px; text-align:center;">
                                ${!isArchive && !isNewTab && !isPendingTab ? `<div class="animesss-rank-badge" style="font-family:var(--an-mono); font-weight:700; margin-bottom:8px; color:var(--an-red-bright); font-size:13px;">${i >= 0 && i < 3 ? ['🥇 #1', '🥈 #2', '🥉 #3'][i] : `#${i + 1}`}</div>` : ''}
                                ${isNewTab ? `<div style="font-family:var(--an-body); font-weight:700; margin-bottom:8px; color:var(--an-mint); font-size:12.5px; letter-spacing:.3px;">✨ НОВАЯ КАРТА</div>` : ''}
                                <div class="animesss-lazy-stats">
                                    ${card.statsPending
                                        ? '<span class="animesss-stat" style="color:var(--an-ink-dim);">⏳ статистика загружается…</span>'
                                        : `<span class="animesss-stat">❤️<b>${card.wanted}</b></span><span class="animesss-stat-sep"></span><span class="animesss-stat">🔄<b>${card.trade}</b></span><span class="animesss-stat-sep"></span><span class="animesss-stat">👥<b>${card.total}</b></span>`}
                                </div>
                            </div>
                        </div>
                    `; }).join("")}
                </div>
            `;
        }

        const old = document.querySelector('#animesss-results');
        if (old) old.remove();
        const modal = document.createElement('div');
        modal.id = 'animesss-results';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(4,4,6,0.88); backdrop-filter:blur(3px); z-index:9999999; overflow:auto; padding:20px; font-family:var(--an-body);';
        const currentRank = new URL(location.href).searchParams.get('rank');
        modal.innerHTML = `
            <div style="max-width:1200px; margin:auto; background:var(--an-panel); color:var(--an-ink); padding:28px; border-radius:18px; border:1px solid var(--an-line); border-top:2px solid var(--an-red); box-shadow:0 24px 70px rgba(0,0,0,.55);">
                <div style="position:fixed; top:20px; right:20px; display:flex; gap:10px; z-index:99999999;">
                    <button id="animesss-close" title="Закрыть" style="cursor:pointer; width:38px; height:38px; display:flex; align-items:center; justify-content:center; border:1px solid var(--an-line); border-radius:10px; background:rgba(12,12,15,0.85); backdrop-filter:blur(8px); color:var(--an-ink-dim); font-size:16px; transition:all .15s ease;">✕</button>
                </div>
                <div class="animesss-results-header">
                    <div class="animesss-results-title">
                        <div style="font-family:var(--an-body); font-weight:700; font-size:11px; letter-spacing:2px; color:var(--an-red); text-transform:uppercase; margin-bottom:6px;">◆ Animesss Analyzer</div>
                        <h1 class="animesss-shimmer-title" style="font-family:var(--an-display); font-weight:800; font-size:28px; margin:0; letter-spacing:-0.3px;">Результаты анализа</h1>
                    </div>
                    <div class="animesss-results-filters">
                        <div class="animesss-filter-group">
                            <span class="animesss-filter-icon">❤️</span>
                            <input type="number" id="filter-wanted" class="animesss-stat-filter" placeholder="0" min="0">
                            <div class="animesss-dir-toggle" data-target="wanted">
                                <button type="button" class="animesss-dir-btn" data-dir="up" title="От значения и выше">▲</button>
                                <button type="button" class="animesss-dir-btn active" data-dir="down" title="От значения и ниже">▼</button>
                            </div>
                        </div>
                        <div class="animesss-filter-group">
                            <span class="animesss-filter-icon">🔄</span>
                            <input type="number" id="filter-trade" class="animesss-stat-filter" placeholder="0" min="0">
                            <div class="animesss-dir-toggle" data-target="trade">
                                <button type="button" class="animesss-dir-btn" data-dir="up" title="От значения и выше">▲</button>
                                <button type="button" class="animesss-dir-btn active" data-dir="down" title="От значения и ниже">▼</button>
                            </div>
                        </div>
                        <div class="animesss-filter-group">
                            <span class="animesss-filter-icon">👥</span>
                            <input type="number" id="filter-total" class="animesss-stat-filter" placeholder="0" min="0">
                            <div class="animesss-dir-toggle" data-target="total">
                                <button type="button" class="animesss-dir-btn" data-dir="up" title="От значения и выше">▲</button>
                                <button type="button" class="animesss-dir-btn active" data-dir="down" title="От значения и ниже">▼</button>
                            </div>
                        </div>
                        <input type="text" id="animesss-search" placeholder="🔍 Поиск..." style="margin-left:10px;">
                    </div>
                    <div class="animesss-results-actions">
                        <button type="button" id="animesss-sync-current" title="Точно сверить все страницы коллекции" style="height:38px; padding:0 15px; border:1px solid rgba(76,224,160,.42); border-radius:9px; background:rgba(76,224,160,.10); color:var(--an-ink); font-family:var(--an-body); font-weight:700; cursor:pointer;">↻ ОБНОВИТЬ СОСТАВ</button>
                        ${currentRank ? '' : '<button type="button" id="animesss-compare-open" style="height:38px; padding:0 15px; border:1px solid rgba(155,127,232,.45); border-radius:9px; background:rgba(155,127,232,.12); color:var(--an-ink); font-family:var(--an-body); font-weight:700; cursor:pointer;">⇄ СРАВНИТЬ</button>'}
                    </div>
                </div>
                <div id="animesss-results-content">
                    <div style="display:flex; gap:6px; margin-bottom:0; flex-wrap:wrap; border-bottom:1px solid var(--an-line); padding-bottom:2px;">
                        ${currentRank ? `<button data-tab="demand">📈 Востребованные</button><button data-tab="trash">🗑 Худшие</button>` : `<button data-tab="best">🔥 Лучшие</button><button data-tab="rare">💎 Редкие</button><button data-tab="demand">📈 Востребованные</button><button data-tab="trash">🗑 Худшие</button>`}
                        ${newCardsList.length > 0 ? `<button data-tab="new">✨ НОВОЕ</button><button id="animesss-mark-seen" class="animesss-mark-seen-btn"><span>✅</span><span>Убрать метки NEW</span></button>` : ''}
                        ${pendingCardsList.length > 0 ? `<button data-tab="pending" style="color:#e7b85c;">⏳ ДОГРУЖАЕТСЯ (${pendingCardsList.length})</button>` : ''}
                        <div style="flex-grow:1;"></div>
                        <button data-tab="archive">📦 АРХИВ</button>
                    </div>
                    <div style="display:flex; justify-content:flex-end; margin:7px 0 15px;">
                        <div class="animesss-archive-tools">
                            <button type="button" id="animesss-select-mode">◯ ВЫДЕЛИТЬ</button>
                            <button type="button" id="animesss-select-cancel">ОТМЕНА</button>
                        </div>
                    </div>
                    <div id="tab-content"></div>
                </div>
            </div>`;
        document.body.appendChild(modal);

        // Красивая "накрутка" чисел статистики (❤️🔄👥) при появлении карточек —
        // цифры плавно считаются от 0 до значения вместо мгновенного показа.
        function animateStatNumbers(container) {
            container.querySelectorAll('.animesss-stat b').forEach(el => {
                const target = parseInt(el.textContent, 10);
                if (isNaN(target)) return;
                const duration = 600;
                const start = performance.now();
                function tick(now) {
                    const p = Math.min(1, (now - start) / duration);
                    const eased = 1 - Math.pow(1 - p, 3);
                    el.textContent = Math.round(target * eased);
                    if (p < 1) requestAnimationFrame(tick);
                    else el.textContent = target;
                }
                requestAnimationFrame(tick);
            });
        }
        const tabContentEl = modal.querySelector('#tab-content');
        if (tabContentEl) {
            // Animation is triggered explicitly after each grid render.
        }

        modal.querySelector('#animesss-close').onmouseover = function () { this.style.background = 'rgba(214,48,74,0.9)'; this.style.color = '#fff'; this.style.borderColor = 'var(--an-red)'; this.style.boxShadow = '0 0 16px rgba(214,48,74,.45)'; };
        modal.querySelector('#animesss-close').onmouseout = function () { this.style.background = 'rgba(12,12,15,0.85)'; this.style.color = 'var(--an-ink-dim)'; this.style.borderColor = 'var(--an-line)'; this.style.boxShadow = 'none'; };

        const searchInput = modal.querySelector('#animesss-search');
        const fWanted = modal.querySelector('#filter-wanted');
        const fTrade = modal.querySelector('#filter-trade');
        const fTotal = modal.querySelector('#filter-total');
        const getActiveBtn = () => Array.from(modal.querySelectorAll('[data-tab]')).find(b => b.style.padding.includes('12px'));

        // Направление фильтра по каждому полю: 'down' — значение и ниже (по умолчанию,
        // как раньше), 'up' — значение и выше. Переключается стрелочками ▲/▼.
        const filterDir = { wanted: 'down', trade: 'down', total: 'down' };

        // Возвращает { match, gap } для одного поля с учётом направления:
        // down: card.stat <= val, gap = val - card.stat (чем ближе снизу, тем меньше gap)
        // up:   card.stat >= val, gap = card.stat - val (чем ближе сверху, тем меньше gap)
        function fieldFilter(valStr, dir, statValue) {
            if (valStr === '') return { match: true, gap: 0 };
            const val = parseInt(valStr);
            return dir === 'up'
                ? { match: statValue >= val, gap: statValue - val }
                : { match: statValue <= val, gap: val - statValue };
        }

        const applyFilters = () => {
            const query = searchInput.value.toLowerCase().trim();
            const valWanted = fWanted.value.trim(); const valTrade = fTrade.value.trim(); const valTotal = fTotal.value.trim();
            const activeBtn = getActiveBtn(); if (!activeBtn) return;
            const tabId = activeBtn.dataset.tab;
            const isArchiveTab = tabId === 'archive'; const isNewTab = tabId === 'new'; const isPendingTab = tabId === 'pending';
            let sourceList = isArchiveTab ? archiveList : (isNewTab ? newCardsList : (isPendingTab ? pendingCardsList : readyCards));
            let filtered = sourceList.filter(card => {
                const ms = !query || card.name.toLowerCase().includes(query) || card.anime.toLowerCase().includes(query) || String(card.id).includes(query);
                if (card.statsPending && (valWanted !== '' || valTrade !== '' || valTotal !== '')) return false;
                const rw = fieldFilter(valWanted, filterDir.wanted, card.wanted);
                const rt = fieldFilter(valTrade, filterDir.trade, card.trade);
                const rto = fieldFilter(valTotal, filterDir.total, card.total);
                return ms && rw.match && rt.match && rto.match;
            });
            filtered.sort((a, b) => {
                const gapA = fieldFilter(valWanted, filterDir.wanted, a.wanted).gap + fieldFilter(valTrade, filterDir.trade, a.trade).gap + fieldFilter(valTotal, filterDir.total, a.total).gap;
                const gapB = fieldFilter(valWanted, filterDir.wanted, b.wanted).gap + fieldFilter(valTrade, filterDir.trade, b.trade).gap + fieldFilter(valTotal, filterDir.total, b.total).gap;
                if (gapA !== gapB) return gapA - gapB;
                return b.wanted - a.wanted;
            });
            if (valWanted === '' && valTrade === '' && valTotal === '' && !query) {
                document.querySelector('#tab-content').innerHTML = renderGrid(tabs[tabId], tabId);
            } else {
                document.querySelector('#tab-content').innerHTML = renderGrid(filtered.slice(0, 50), tabId);
            }
            if (shouldAnimateIntroStats) {
                shouldAnimateIntroStats = false;
                window.animesssIntroStatsAnimated = true;
                requestAnimationFrame(() => window.animesssAnimateStatNumbers(document.querySelector('#tab-content'), 2200));
            }
            if (query) document.querySelectorAll('#animesss-grid > div').forEach(c => c.classList.add('animesss-searching-flash'));
        };

        searchInput.oninput = applyFilters; fWanted.oninput = applyFilters; fTrade.oninput = applyFilters; fTotal.oninput = applyFilters;
        [fWanted, fTrade, fTotal].forEach(el => el.addEventListener('keydown', e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }));

        const selectModeBtn = modal.querySelector('#animesss-select-mode');
        const selectCancelBtn = modal.querySelector('#animesss-select-cancel');

        const updateSelectionControls = () => {
            if (!selectModeBtn || !selectCancelBtn) return;
            const count = selectedIds.size;
            const archiveTabActive = getActiveBtn()?.dataset.tab === 'archive';
            if (!selectionMode) {
                selectModeBtn.disabled = false;
                selectModeBtn.textContent = '◯ ВЫДЕЛИТЬ';
                selectModeBtn.classList.remove('animesss-selection-ready');
                selectCancelBtn.style.display = 'none';
                return;
            }
            selectModeBtn.disabled = count === 0;
            selectModeBtn.textContent = archiveTabActive
                ? `📂 ДЕАРХИВИРОВАТЬ (${count})`
                : `📁 АРХИВИРОВАТЬ (${count})`;
            selectModeBtn.classList.toggle('animesss-selection-ready', count > 0);
            selectCancelBtn.style.display = 'block';
        };

        const leaveSelectionMode = (rerender = true) => {
            selectionMode = false;
            window.animesssSelectionMode = false;
            selectedIds.clear();
            window.animesssSelectedCardIds = selectedIds;
            if (rerender) applyFilters();
            updateSelectionControls();
        };

        if (selectModeBtn) {
            selectModeBtn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                if (!selectionMode) {
                    selectionMode = true;
                    window.animesssSelectionMode = true;
                    selectedIds.clear();
                    window.animesssSelectedCardIds = selectedIds;
                    window.animesssCloseCardMenus();
                    applyFilters();
                    updateSelectionControls();
                    return;
                }
                if (!selectedIds.size) return;
                const shouldArchive = getActiveBtn()?.dataset.tab !== 'archive';
                window.animesssArchiveMany(selectedIds, shouldArchive);
            };
        }

        if (selectCancelBtn) {
            selectCancelBtn.onclick = event => {
                event.preventDefault();
                event.stopPropagation();
                leaveSelectionMode(true);
            };
        }

        modal.addEventListener('animesss-selection-change', updateSelectionControls);

        modal.querySelectorAll('.animesss-dir-btn').forEach(btn => {
            btn.onclick = () => {
                const toggle = btn.parentElement;
                const target = toggle.dataset.target;
                filterDir[target] = btn.dataset.dir;
                toggle.querySelectorAll('.animesss-dir-btn').forEach(b => b.classList.toggle('active', b === btn));
                applyFilters();
            };
        });

        modal.querySelectorAll('[data-tab]').forEach(btn => {
            btn.style.cssText = "cursor:pointer; padding:8px 16px 10px; border:none; border-bottom:2px solid transparent; background:transparent; color:var(--an-ink-dim); font-family:var(--an-body); font-weight:600; font-size:13.5px; letter-spacing:.2px; transition:all 0.2s; border-radius:8px 8px 0 0;";
            if (btn.dataset.tab === 'new') { btn.style.color = 'var(--an-mint)'; btn.style.borderBottomColor = 'rgba(76,224,160,0.35)'; }
            if (btn.dataset.tab === 'pending') { btn.style.color = '#e7b85c'; btn.style.borderBottomColor = 'rgba(231,184,92,.35)'; }
            if (btn.dataset.tab === 'archive') { btn.style.color = 'var(--an-violet)'; }
            btn.onclick = () => {
                const previousTab = getActiveBtn()?.dataset.tab;
                if (selectionMode && previousTab && previousTab !== btn.dataset.tab) {
                    selectedIds.clear();
                }
                modal.querySelectorAll('[data-tab]').forEach(other => {
                    other.style.background = 'transparent'; other.style.color = 'var(--an-ink-dim)'; other.style.padding = '8px 16px 10px'; other.style.boxShadow = 'none'; other.style.borderBottomColor = 'transparent';
                    if (other.dataset.tab === 'new') { other.style.color = 'var(--an-mint)'; other.style.borderBottomColor = 'rgba(76,224,160,0.35)'; }
                    if (other.dataset.tab === 'pending') { other.style.color = '#e7b85c'; other.style.borderBottomColor = 'rgba(231,184,92,.35)'; }
                    if (other.dataset.tab === 'archive') { other.style.color = 'var(--an-violet)'; }
                });
                if (btn.dataset.tab === 'new') {
                    btn.style.background = 'rgba(76,224,160,0.1)'; btn.style.color = 'var(--an-mint)'; btn.style.borderBottomColor = 'var(--an-mint)'; btn.style.boxShadow = '0 8px 16px -10px rgba(76,224,160,.6)';
                } else if (btn.dataset.tab === 'pending') {
                    btn.style.background = 'rgba(231,184,92,.10)'; btn.style.color = '#e7b85c'; btn.style.borderBottomColor = '#e7b85c';
                } else if (btn.dataset.tab === 'archive') {
                    btn.style.background = 'rgba(155,127,232,0.1)'; btn.style.color = 'var(--an-violet)'; btn.style.borderBottomColor = 'var(--an-violet)';
                } else {
                    btn.style.background = 'rgba(214,48,74,0.1)'; btn.style.color = 'var(--an-red-bright)'; btn.style.borderBottomColor = 'var(--an-red)';
                }
                btn.style.padding = '12px 22px 10px'; applyFilters();
                updateSelectionControls();

                const markSeenBtn = modal.querySelector('#animesss-mark-seen');
                if (markSeenBtn) {
                    if (btn.dataset.tab === 'new') {
                        markSeenBtn.classList.remove('animesss-mark-seen-visible');
                        void markSeenBtn.offsetWidth; // reset animation
                        markSeenBtn.classList.add('animesss-mark-seen-visible');
                    } else {
                        markSeenBtn.classList.remove('animesss-mark-seen-visible');
                    }
                }
            };
        });

        const markSeenBtn = modal.querySelector('#animesss-mark-seen');
        if (markSeenBtn) {
            markSeenBtn.onclick = () => {
                const newIds = new Set(newCardsList.map(card => String(card.id)));
                newCardsList.forEach(c => {
                    const idStr = String(c.id);
                    if (window.animesssResults) {
                        window.animesssResults.forEach(card => {
                            if (String(card.id) === idStr) card.isNewInScan = false;
                        });
                    }
                });
                const context = getCollectionContext();
                newIds.forEach(id => markCollectionCardSeen(context, id));
                const snapshot = readCollectionSnapshot(context);
                if (snapshot) updateCollectionAnalysisButton(context, snapshot);
                window.animesssRefreshResults();
            };
        }

        // Если сохранённая активная вкладка (например "new") пропала после обновления —
        // падаем обратно на первую доступную, чтобы модалка не осталась без активной вкладки.
        const firstTab = (activeTabId && modal.querySelector(`[data-tab="${activeTabId}"]`))
            || (!readyCards.length && modal.querySelector('[data-tab="pending"]'))
            || modal.querySelector('[data-tab]');
        if (firstTab) firstTab.click();
        const compareOpenBtn = modal.querySelector('#animesss-compare-open');
        if (compareOpenBtn) compareOpenBtn.onclick = () => window.animesssOpenCollectionCompare?.(window.animesssResults || cards);
        const syncCurrentBtn = modal.querySelector('#animesss-sync-current');
        if (syncCurrentBtn) syncCurrentBtn.onclick = () => window.animesssSyncCurrentCollection?.();
        if (collectionSyncPromiseV2 || collectionStatsQueuesV2.size || collectionStatsInFlightV2.size) {
            setCollectionSyncButtons(true, collectionSyncPromiseV2 ? "↻ СИНХРОНИЗАЦИЯ…" : "↻ АНАЛИЗ СТАТИСТИКИ…");
        }
        const closeResults = () => {
            selectionMode = false;
            window.animesssSelectionMode = false;
            selectedIds.clear();
            window.animesssSelectedCardIds = selectedIds;
            modal.remove();
        };
        document.querySelector('#animesss-close').onclick = closeResults;
        modal.addEventListener('click', e => { if (e.target === modal) closeResults(); });
    }

    function getRankWeight(rank) { const weights = { SSS: 5000, ASS: 4000, S: 3000, A: 1200, B: 400, C: 120, D: 40, E: 0 }; return weights[rank] || 0; }

    // ===== PACKSCORE =====
    // Формула "ценности" карты при выборе из пака (какая станет BEST/NORMAL/TRASH).
    // По твоим словам, важнее всего — "желающих" (❤️), а дальше ранг; остальное
    // не так принципиально. Раньше ранг был слишком тяжёлым (например, разница
    // между B и C рангом — это +280 очков, что перебивало почти любую разницу
    // в желающих). Прикинул новое соотношение на реальных примерах твоих
    // выборов — теперь ранг даёт лишь небольшую добавку, а желающих решают
    // исход в большинстве случаев. Если захочешь сделать ранг чуть весомее —
    // просто увеличь RANK_WEIGHT (например, до 0.2-0.3).
    const RANK_WEIGHT = 0.1;   // насколько важен ранг сам по себе (по сравнению с желающими)
    const WANTED_WEIGHT = 1;   // вес "желающих" (❤️) — основной показатель

    function getPackScore(rank, wanted) {
        return getRankWeight(rank) * RANK_WEIGHT + wanted * WANTED_WEIGHT;
    }
    // ===== /PACKSCORE =====
    function clearPackFrames() {
        document.querySelectorAll('.animesss-pack-frame').forEach(frame => {
            const card = frame.cardRef;
            if (card) {
                card.packFrame = null;
                if (card.animesssClickHandler) {
                    card.removeEventListener('click', card.animesssClickHandler);
                    card.animesssClickHandler = null;
                }
                frame.parentNode.insertBefore(card, frame);
            }
            frame.remove();
        });
    }

    async function initPackAnalyzer() {
        if (window.packAnalyzerBusy) return;
        const cards = [...document.querySelectorAll('.lootbox__card')]; if (cards.length === 0) return;
        const packSignature = cards.map(card => card.dataset.id || '').join('-');
        if (!packSignature || packSignature === '--' || window.lastAnalyzedSignature === packSignature) return;
        window.packAnalyzerBusy = true; window.lastAnalyzedSignature = packSignature;
        const cardData = [];
        for (const card of cards) {
            const id = card.dataset.id; const rank = (card.dataset.rank || '').toUpperCase();
            try {
                const html = await fetchWithRetry(`/cards/users/?id=${id}`);
                const doc = parser.parseFromString(html, 'text/html');
                const wanted = Number(doc.querySelector('#owners-need')?.textContent || 0);
                const trade = Number(doc.querySelector('#owners-trade')?.textContent || 0);
                const total = Number(doc.querySelector('#owners-count')?.textContent || 0);
                cardData.push({ card, rank, wanted, trade, total });
            } catch (e) { cardData.push({ card, rank, wanted: 0, trade: 0, total: 0 }); }
        }
        cardData.forEach(data => { data.score = getPackScore(data.rank, data.wanted); });
        cardData.sort((a, b) => b.score - a.score);

        for (let i = 0; i < cardData.length; i++) {
            const { card, wanted, trade, total } = cardData[i];
            let labelText = '✦ NORMAL';
            let style = { bg: 'linear-gradient(160deg, #232329 0%, #17171b 100%)', glow: 'none', border: '1px solid rgba(255,255,255,0.12)', text: '#c9c6d1' };

            if (i === 0) {
                labelText = '♛ BEST';
                style = { bg: 'linear-gradient(160deg, #ff5a72 0%, #d6304a 55%, #8a1626 100%)', glow: '0 0 34px rgba(214,48,74,.55)', border: '2px solid #ff5a72', text: '#fff5f6' };
            } else if (i === cardData.length - 1 && cardData.length > 1) {
                labelText = '◦ TRASH';
                style = { bg: 'linear-gradient(160deg, #1a1005 0%, #100a04 100%)', glow: 'none', border: '1px solid rgba(162,50,86,0.3)', text: '#8a7a68' };
            }

            const frame = document.createElement('div'); frame.className = 'animesss-pack-frame';
            frame.style.cssText = `display:flex; flex-direction:column; align-items:center; padding:8px; border-radius:20px; background: ${style.bg}; box-shadow: ${style.glow}; border: ${style.border};`;
            const label = document.createElement('div'); label.textContent = labelText; label.style.cssText = `width:100%; text-align:center; font-family:'Manrope',sans-serif; font-size:20px; font-weight:800; letter-spacing:.5px; color: ${style.text}; padding:4px;`;
            const stats = document.createElement('div'); stats.innerHTML = `<span>❤️ ${wanted}</span><span style="width:1px; height:11px; background:${style.text}; opacity:.25;"></span><span>🔄 ${trade}</span><span style="width:1px; height:11px; background:${style.text}; opacity:.25;"></span><span>👥 ${total}</span>`; stats.style.cssText = `width:100%; display:flex; justify-content:center; align-items:center; gap:10px; white-space:nowrap; font-family:'JetBrains Mono',monospace; font-size:13.5px; font-weight:700; color: ${style.text}; padding:6px 10px; opacity:.9; box-sizing:border-box;`;
            card.style.width = '240px'; card.style.borderRadius = '10px'; frame.cardRef = card; card.packFrame = frame;

            if (card.animesssClickHandler) {
                card.removeEventListener('click', card.animesssClickHandler);
            }
            card.animesssClickHandler = () => { clearPackFrames(); card.removeEventListener('click', card.animesssClickHandler); card.animesssClickHandler = null; };
            card.addEventListener('click', card.animesssClickHandler);

            card.parentNode.insertBefore(frame, card); frame.appendChild(label); frame.appendChild(card); frame.appendChild(stats);
        }
        window.packAnalyzerBusy = false;
    }

    function observePackChanges() {
        if (!location.pathname.startsWith('/cards/pack')) return;
        const observer = new MutationObserver(() => {
            const cards = document.querySelectorAll('.lootbox__card');
            if (cards.length === 0) { if (document.querySelector('.animesss-pack-frame')) clearPackFrames(); return; }
            const currentSignature = [...cards].map(card => card.dataset.id || '').join('-');
            if (currentSignature !== window.lastObservedSignature) {
                window.lastObservedSignature = currentSignature; clearPackFrames();
                if (currentSignature && currentSignature !== '--') { clearTimeout(window.packAnalyzerTimer); window.packAnalyzerTimer = setTimeout(initPackAnalyzer, 800); }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-id'] });
    }

    // ===== ACCOUNT SHOP ANALYZER =====
    // Compares only cards of the same rank. Demand is the main signal; rarity,
    // trade availability and (when prices differ) value for money refine it.
    const ACCSHOP_ANALYZED_CLASS = 'animesss-accshop-analyzed';

    function injectAccShopStyle() {
        if (document.getElementById('animesss-accshop-style')) return;
        const shopStyle = document.createElement('style');
        shopStyle.id = 'animesss-accshop-style';
        shopStyle.textContent = `
            #animesss-accshop-status { display:flex; align-items:center; gap:10px; margin:0 0 16px; padding:12px 15px; border-radius:12px; background:linear-gradient(135deg,rgba(214,48,74,.18),rgba(19,19,23,.96)); border:1px solid rgba(255,90,114,.35); color:#f3f1ec; box-shadow:0 8px 25px rgba(0,0,0,.22); font:700 13px/1.35 'Inter','Segoe UI',sans-serif; }
            #animesss-accshop-status::before { content:'◆'; color:#ff5a72; }
            #animesss-accshop-status[data-state="ready"]::before { content:'✓'; color:#4ce0a0; }
            #animesss-accshop-status[data-state="error"]::before { content:'!'; color:#ffb45a; }
            .${ACCSHOP_ANALYZED_CLASS} { position:relative !important; overflow:visible !important; }
            .animesss-accshop-badge { position:absolute; z-index:30; top:8px; right:8px; left:auto; min-width:112px; padding:8px 10px; border-radius:11px; background:rgba(13,13,17,.94); border:1px solid rgba(255,255,255,.16); box-shadow:0 8px 24px rgba(0,0,0,.48); color:#f3f1ec; font:700 12px/1.25 'Inter','Segoe UI',sans-serif; pointer-events:none; backdrop-filter:blur(7px); box-sizing:border-box; }
            .animesss-accshop-badge strong { display:block; color:#d0cbd7; font:800 13px/1.2 'Manrope','Segoe UI',sans-serif; letter-spacing:.2px; }
            .animesss-accshop-badge small { display:block; margin-top:4px; color:#a9a4b1; font:600 10px/1.25 'JetBrains Mono',monospace; white-space:nowrap; }
            .animesss-accshop-best { outline:2px solid #ff5a72 !important; box-shadow:0 0 30px rgba(214,48,74,.55) !important; }
            .animesss-accshop-best .animesss-accshop-badge { background:linear-gradient(145deg,rgba(214,48,74,.97),rgba(92,22,38,.97)); border-color:#ff8193; }
            .animesss-accshop-best .animesss-accshop-badge strong,.animesss-accshop-best .animesss-accshop-badge small { color:#fff7f8; }
        `;
        document.head.appendChild(shopStyle);
    }

    function parseAccShopNumber(value) {
        const normalized = String(value || '').replace(/\s+/g, '').replace(',', '.');
        const match = normalized.match(/\d+(?:\.\d+)?/);
        return match ? Number(match[0]) : 0;
    }

    function setAccShopStatus(text, state = 'loading') {
        const wrap = document.querySelector('#accshopCardsWrap');
        if (!wrap) return;
        let status = document.querySelector('#animesss-accshop-status');
        if (!status) {
            status = document.createElement('div');
            status.id = 'animesss-accshop-status';
            wrap.parentNode.insertBefore(status, wrap);
        }
        status.dataset.state = state;
        status.textContent = text;
    }

    function extractAccShopRank(...sources) {
        for (const source of sources.filter(Boolean)) {
            const direct = String(source.dataset?.rank || '').toUpperCase().replace(/[_+-].*$/, '');
            if (/^(SSS|ASS|S|A|B|C|D|E)$/.test(direct)) return direct;
            const ranked = source.querySelector?.('[data-rank]');
            const nested = String(ranked?.dataset?.rank || '').toUpperCase().replace(/[_+-].*$/, '');
            if (/^(SSS|ASS|S|A|B|C|D|E)$/.test(nested)) return nested;
            const rankClassNode = source.matches?.('[class*="rank-"]') ? source : source.querySelector?.('[class*="rank-"]');
            const classRank = String(rankClassNode?.className || '').match(/(?:^|\s)rank-(sss|ass|s|a|b|c|d|e)(?:[_+-]|\s|$)/i)?.[1]?.toUpperCase();
            if (classRank) return classRank;
            const imagePath = source.querySelector?.('img[src], source[src]')?.getAttribute('src') || '';
            const pathRank = imagePath.match(/\/(sss|ass|s|a|b|c|d|e)\//i)?.[1]?.toUpperCase();
            if (pathRank) return pathRank;
            const textRank = String(source.textContent || '').toUpperCase().match(/РАНГ\s*[:—-]?\s*(SSS|ASS|S|A|B|C|D|E)\b/)?.[1];
            if (textRank) return textRank;
        }
        return '';
    }

    function findAccShopEntries() {
        const wrap = document.querySelector('#accshopCardsWrap') || document;
        const nodes = [...wrap.querySelectorAll('.anime-cards__item[data-id], .accshop__buy-btn[data-card-id], [data-card-id], [data-id][data-rank], a[href*="/cards/users/"]')];
        const seen = new Set();
        const entries = [];
        for (const node of nodes) {
            const link = node.matches?.('a[href*="/cards/users/"]') ? node : node.querySelector?.('a[href*="/cards/users/"]');
            const href = link?.getAttribute('href') || '';
            const id = String(node.dataset?.cardId || node.dataset?.id || new URL(href || location.href, location.href).searchParams.get('id') || '').trim();
            if (!id || seen.has(id)) continue;
            const root = node.closest('.accshop__card, .accshop-card, .shop-card, .anime-cards__item-wrapper, .card-item, li') || node;
            if (!(root instanceof HTMLElement) || root.closest('.animesss-accshop-badge')) continue;
            const card = root.querySelector(`.anime-cards__item[data-id="${CSS.escape(id)}"]`) || (node.matches?.('.anime-cards__item') ? node : null);
            const rank = extractAccShopRank(card, root, node);
            const priceNode = root.querySelector('[data-price], .price, .card-price, .shop-price, [class*="price"]');
            const price = parseAccShopNumber(priceNode?.dataset?.price || priceNode?.textContent || 0);
            seen.add(id);
            entries.push({ id, rank, root, card, price });
        }
        return entries;
    }

    function getAccShopScore(item, rankItems) {
        const rarity = item.total > 0 ? 1000 / Math.sqrt(item.total) : 0;
        const liquidity = item.trade > 0 ? Math.min(30, Math.log2(item.trade + 1) * 5) : 0;
        const base = item.wanted * 8 + rarity + liquidity;
        const prices = rankItems.map(x => x.price).filter(Boolean);
        if (item.price && prices.length > 1 && Math.max(...prices) !== Math.min(...prices)) {
            const median = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)];
            return base * Math.sqrt(median / item.price);
        }
        return base;
    }

    async function analyzeAccShop() {
        if (!location.pathname.startsWith('/accshop') || window.animesssAccShopBusy) return;
        const entries = findAccShopEntries();
        const signature = entries.map(x => `${x.id}:${x.rank}:${x.price}`).join('|');
        if (!entries.length) {
            setAccShopStatus('Анализатор запущен, но карточки магазина пока не найдены.', 'error');
            return;
        }
        if (signature === window.animesssAccShopSignature) return;
        window.animesssAccShopBusy = true;
        injectAccShopStyle();
        setAccShopStatus(`Анализирую карточки: 0 из ${entries.length}…`);
        try {
            let completed = 0;
            const data = await Promise.all(entries.map(async item => {
                try {
                    const html = await fetchWithRetry(`/cards/users/?id=${encodeURIComponent(item.id)}`, 2);
                    const doc = parser.parseFromString(html, 'text/html');
                    return { ...item, rank:item.rank || extractAccShopRank(doc), wanted: parseAccShopNumber(doc.querySelector('#owners-need')?.textContent), trade: parseAccShopNumber(doc.querySelector('#owners-trade')?.textContent), total: parseAccShopNumber(doc.querySelector('#owners-count')?.textContent) };
                } catch (error) { return { ...item, wanted: 0, trade: 0, total: 0 }; }
                finally { completed++; setAccShopStatus(`Анализирую карточки: ${completed} из ${entries.length}…`); }
            }));
            const comparable = data.filter(x => x.rank);
            const groups = Object.groupBy ? Object.groupBy(comparable, x => x.rank) : comparable.reduce((all, x) => ((all[x.rank] ||= []).push(x), all), {});
            Object.values(groups).forEach(group => {
                group.forEach(item => { item.score = getAccShopScore(item, group); });
                group.sort((a, b) => b.score - a.score || b.wanted - a.wanted || a.total - b.total);
                group.forEach((item, index) => {
                    item.root.querySelector(':scope > .animesss-accshop-badge')?.remove();
                    item.root.classList.add(ACCSHOP_ANALYZED_CLASS);
                    item.root.classList.toggle('animesss-accshop-best', index === 0);
                    const badge = document.createElement('div');
                    badge.className = 'animesss-accshop-badge';
                    const title = index === 0 ? `♛ ЛУЧШАЯ ${item.rank}` : `#${index + 1} В РАНГЕ ${item.rank}`;
                    badge.innerHTML = `<strong>${title}</strong><small>❤️ ${item.wanted} · 🔄 ${item.trade} · 👥 ${item.total}</small>`;
                    item.root.appendChild(badge);
                });
            });
            window.animesssAccShopSignature = signature;
            const bestCount = Object.keys(groups).length;
            setAccShopStatus(`Готово: сравнено ${comparable.length} карточек, выбрано лучших — ${bestCount}.`, comparable.length ? 'ready' : 'error');
        } finally { window.animesssAccShopBusy = false; }
    }

    function observeAccShopChanges() {
        if (!location.pathname.startsWith('/accshop')) return;
        injectAccShopStyle();
        let timer;
        const schedule = () => { clearTimeout(timer); timer = setTimeout(analyzeAccShop, 500); };
        schedule();
        new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });
    }
    // ===== /ACCOUNT SHOP ANALYZER =====

    // ===== COLLECTION COMPARE + TRADE HELPER =====
    // Collection pages use the same bounded, start-spaced pool as the regular
    // analyzer: faster than a sequential loop without a request burst.
    const COLLECTION_COMPARE_START_INTERVAL_MS = 300;
    const COLLECTION_COMPARE_CONCURRENCY = 3;
    const COLLECTION_COMPARE_CACHE_TTL_MS = 15 * 60 * 1000;
    const COLLECTION_COMPARE_PARTIAL_TTL_MS = 6 * 60 * 60 * 1000;
    const COLLECTION_COMPARE_COOLDOWN_MS = 20 * 60 * 1000;
    const COLLECTION_COMPARE_COOLDOWN_KEY = 'animesss_compare_cooldown_until';
    const COLLECTION_COMPARE_RANK_VALUE = {
        e: 10, e_plus: 25, d: 40, d_plus: 80, c: 120, c_plus: 250,
        b: 400, b_plus: 800, a: 1200, a_plus: 2200,
        s: 3000, s_plus: 3500, ass: 4000, sss: 5000
    };
    const COLLECTION_COMPARE_SINGLE_OFFER_IDEALS = {
        e_plus:1.60,
        d:1.50, d_plus:1.47,
        c:1.44, c_plus:1.41,
        b:1.36, b_plus:1.32,
        a:1.28, a_plus:1.24,
        s:1.20, s_plus:1.17,
        ass:1.14, sss:1.10
    };
    const COLLECTION_COMPARE_MIN_WANTED_PREMIUM = {
        e_plus:14,
        d:11, d_plus:10,
        c:9, c_plus:8,
        b:7, b_plus:6,
        a:5, a_plus:4,
        s:3, s_plus:3,
        ass:2, sss:2
    };
    let collectionCompareStartGate = Promise.resolve();
    let collectionCompareLastRequestStartedAt = 0;
    const collectionCompareStatsInFlight = new Map();

    function cancelCompareStatsRequests() {
        const running = [...collectionCompareStatsInFlight.values()];
        running.forEach(entry => entry.controller.abort());
        return Promise.allSettled(running.map(entry => entry.promise));
    }

    function getCurrentCollectionUsername() {
        const fromUrl = new URL(location.href).searchParams.get('name');
        if (fromUrl) return fromUrl.trim();
        if (window.animesssCurrentCollectionUsername) return String(window.animesssCurrentCollectionUsername).trim();
        if (typeof window.visitor_name === 'string' && window.visitor_name.trim()) return window.visitor_name.trim();
        const title = document.querySelector('.user-cards__title, h1')?.textContent?.trim() || '';
        return title.match(/(?:пользователя|коллекция)\s+([^|]+)$/i)?.[1]?.trim() || 'Текущая коллекция';
    }

    function buildCompareCollectionUrl(username, page = 1) {
        const url = new URL('/user/cards/', location.origin);
        url.searchParams.set('name', username);
        if (page > 1) url.searchParams.set('page', String(page));
        return url.pathname + url.search;
    }

    function getCompareCooldownRemaining() {
        const until = Number(localStorage.getItem(COLLECTION_COMPARE_COOLDOWN_KEY) || 0);
        return Math.max(0, until - Date.now());
    }

    function startCompareCooldown() {
        try { localStorage.setItem(COLLECTION_COMPARE_COOLDOWN_KEY, String(Date.now() + COLLECTION_COMPARE_COOLDOWN_MS)); }
        catch (error) {}
    }

    function waitForCompareRequestStartSlot() {
        const slot = collectionCompareStartGate.then(async () => {
            const wait = Math.max(0, COLLECTION_COMPARE_START_INTERVAL_MS - (Date.now() - collectionCompareLastRequestStartedAt));
            if (wait) await sleep(wait);
            collectionCompareLastRequestStartedAt = Date.now();
        });
        collectionCompareStartGate = slot.catch(() => {});
        return slot;
    }

    async function fetchCompareCollectionPage(url, options = {}) {
        await waitForCompareRequestStartSlot();
        if (options.signal?.aborted) {
            const error = new Error('Сравнение остановлено.');
            error.name = 'AbortError';
            throw error;
        }
        const response = await fetch(url, { signal:options.signal });
        if (!response.ok) {
            const error = new Error('HTTP ' + response.status);
            error.status = response.status;
            if ([429, 502, 520].includes(response.status)) startCompareCooldown();
            throw error;
        }
        const html = await response.text();
        return options.withMeta ? { html, url:response.url || url } : html;
    }

    function readCollectionStatsCache(username) {
        const result = new Map();
        try {
            const raw = readMainCollectionCache(username);
            if (Array.isArray(raw)) raw.forEach(card => {
                if (card?.id != null) result.set(String(card.id), card);
            });
        } catch (error) {
            console.warn('[Animesss Compare] Повреждён кэш статистики:', error);
        }
        return result;
    }

    function getCompareCacheKey(username) {
        // v2 stores every owner-id so duplicate copies can open separate trade pages.
        return `animesss_compare_collection_v2_${encodeURIComponent(String(username).toLowerCase())}`;
    }

    function getComparePartialCacheKey(username) {
        return `animesss_compare_partial_v2_${encodeURIComponent(String(username).toLowerCase())}`;
    }

    function readComparePartialCache(username) {
        try {
            const key = getComparePartialCacheKey(username);
            const partial = JSON.parse(localStorage.getItem(key) || 'null');
            if (!partial || !Array.isArray(partial.cards) || Date.now() - Number(partial.updatedAt || 0) > COLLECTION_COMPARE_PARTIAL_TTL_MS) {
                localStorage.removeItem(key);
                return null;
            }
            if (!Number.isFinite(Number(partial.lastPage)) || !Number.isFinite(Number(partial.maxPages))) return null;
            return partial;
        } catch (error) { return null; }
    }

    function saveComparePartialCache(username, byId, lastPage, maxPages) {
        try {
            localStorage.setItem(getComparePartialCacheKey(username), JSON.stringify({
                updatedAt:Date.now(), lastPage, maxPages, cards:[...byId.values()]
            }));
        } catch (error) {}
    }

    function clearComparePartialCache(username) {
        try { localStorage.removeItem(getComparePartialCacheKey(username)); }
        catch (error) {}
    }

    function readRecentCompareCache(username) {
        try {
            const key = getCompareCacheKey(username);
            const cached = JSON.parse(localStorage.getItem(key) || 'null');
            if (!cached || !Array.isArray(cached.cards) || Date.now() - Number(cached.updatedAt || 0) > COLLECTION_COMPARE_CACHE_TTL_MS) {
                localStorage.removeItem(key);
                return null;
            }
            return makeCompareCollection(username, cached.cards, true);
        } catch (error) {
            return null;
        }
    }

    function saveCompareCache(collection) {
        try {
            cleanupExpiredCompareCaches();
            localStorage.setItem(getCompareCacheKey(collection.username), JSON.stringify({
                updatedAt: Date.now(),
                cards: collection.cards
            }));
        } catch (error) {
            console.warn('[Animesss Compare] Не удалось сохранить состав коллекции:', error);
        }
    }

    function normalizeCompareRank(rank) {
        return String(rank || 'e').trim().toLowerCase().replace('+', '_plus');
    }

    function getCompareTradeMaxOfferCards(rank) {
        const normalized = normalizeCompareRank(rank);
        if (['s', 's_plus', 'ass', 'sss'].includes(normalized)) return 1;
        if (['a', 'a_plus'].includes(normalized)) return 2;
        return 3;
    }

    function displayCompareRank(rank) {
        return normalizeCompareRank(rank).toUpperCase().replace('_PLUS', '+');
    }

    function getCompareOfferRule(rank, size, targetWanted = 1) {
        const normalizedRank = normalizeCompareRank(rank);
        const wanted = Math.max(1, Number(targetWanted) || 1);
        const baseSingleIdeal = COLLECTION_COMPARE_SINGLE_OFFER_IDEALS[normalizedRank] || 1.24;
        const minimumPremium = COLLECTION_COMPARE_MIN_WANTED_PREMIUM[normalizedRank] || 4;
        const singleIdeal = Math.max(baseSingleIdeal, (wanted + minimumPremium + 2) / wanted);
        const singleMin = Math.max(baseSingleIdeal - .08, (wanted + minimumPremium) / wanted);
        const singleMax = Math.max(baseSingleIdeal + .08, (wanted + minimumPremium + 6) / wanted);
        if (size === 1) {
            return {
                ideal:singleIdeal,
                min:singleMin,
                max:singleMax,
                dominantIdeal:singleIdeal,
                additionsIdeal:0
            };
        }
        if (size === 2) {
            const ideal = singleIdeal - .06;
            const dominantIdeal = 1 + (singleIdeal - 1) * .44;
            return {
                ideal,
                min:ideal - .08,
                max:ideal + .09,
                dominantIdeal,
                dominantMin:dominantIdeal - .12,
                dominantMax:dominantIdeal + .12,
                additionsIdeal:ideal - dominantIdeal
            };
        }
        const ideal = singleIdeal - .12;
        const dominantIdeal = 1 + (singleIdeal - 1) * .06;
        return {
            ideal,
            min:ideal - .08,
            max:ideal + .10,
            dominantIdeal,
            dominantMin:dominantIdeal - .12,
            dominantMax:dominantIdeal + .12,
            additionsIdeal:ideal - dominantIdeal
        };
    }

    function mergeComparePage(doc, byId, cachedById) {
        const nodes = [...doc.querySelectorAll('.anime-cards__item[data-id]')];
        let added = 0;
        for (const node of nodes) {
            const id = String(node.dataset.id || '').trim();
            if (!/^\d+$/.test(id)) continue;
            const cached = cachedById.get(id) || {};
            let card = byId.get(id);
            if (!card) {
                card = {
                    id,
                    name: node.dataset.name?.trim() || cached.name || `Карта #${id}`,
                    rank: normalizeCompareRank(node.dataset.rank || cached.rank),
                    anime: node.dataset.animeName?.trim() || cached.anime || '',
                    image: node.dataset.image || node.querySelector('img')?.dataset.src || node.querySelector('img')?.getAttribute('src') || cached.image || '',
                    count: 0,
                    ownerIds: [],
                    total: hasCompleteStats(cached) ? normalizeStatValue(cached.total) : null,
                    wanted: hasCompleteStats(cached) ? normalizeStatValue(cached.wanted) : null,
                    trade: hasCompleteStats(cached) ? normalizeStatValue(cached.trade) : null,
                    lastUpdate: cached.lastUpdate || null
                };
                byId.set(id, card);
            }
            const ownerId = getOwnedCardOwnerId(node);
            if (ownerId && card.ownerIds.includes(ownerId)) {
                throw new Error('Сервер вернул повтор одной копии карты на нескольких страницах.');
            }
            card.count++;
            added++;
            if (ownerId) card.ownerIds.push(ownerId);
        }
        return added;
    }

    function getCompareMaxPage(doc) {
        const pages = [...doc.querySelectorAll('a[href*="page="]')].map(link => {
            try { return Number(new URL(link.getAttribute('href'), location.origin).searchParams.get('page')) || 1; }
            catch (error) { return 1; }
        });
        return Math.max(1, ...pages);
    }

    function assertComparePageResponse(response, username, requestedPage) {
        const url = new URL(response?.url || buildCompareCollectionUrl(username, requestedPage), location.origin);
        const actualPage = Math.max(1, Number(url.searchParams.get('page')) || 1);
        const actualName = String(url.searchParams.get('name') || '').trim().toLowerCase();
        if (!/\/user\/cards\/?$/i.test(url.pathname)
            || actualPage !== Number(requestedPage)
            || actualName !== String(username).trim().toLowerCase()) {
            throw new Error(`Сервер вместо страницы ${requestedPage} вернул другую коллекцию.`);
        }
    }

    function cleanupExpiredCompareCaches() {
        const now = Date.now();
        const recent = [];
        const keys = [];
        for (let index = 0; index < localStorage.length; index++) keys.push(localStorage.key(index));
        keys.forEach(key => {
            const name = String(key || '');
            if (name.startsWith('animesss_compare_partial_v2_')) {
                localStorage.removeItem(name);
                return;
            }
            if (!name.startsWith('animesss_compare_collection_v2_')) return;
            try {
                const cached = JSON.parse(localStorage.getItem(name) || 'null');
                const updatedAt = Number(cached?.updatedAt || 0);
                if (!cached || !Array.isArray(cached.cards) || now - updatedAt > COLLECTION_COMPARE_CACHE_TTL_MS) {
                    localStorage.removeItem(name);
                } else {
                    recent.push({ key:name, updatedAt });
                }
            } catch (error) {
                localStorage.removeItem(name);
            }
        });
        recent.sort((a, b) => b.updatedAt - a.updatedAt).slice(4)
            .forEach(entry => localStorage.removeItem(entry.key));
    }

    async function fetchComparePagesPool(username, pageNumbers, byId, cachedById, maxPages, initialCopies, onProgress, options) {
        const queue = [...pageNumbers];
        if (!queue.length) return initialCopies;
        const controller = new AbortController();
        const abortFromCaller = () => controller.abort();
        if (options.signal?.aborted) abortFromCaller();
        else options.signal?.addEventListener('abort', abortFromCaller, { once:true });
        let nextIndex = 0;
        let completedPages = 1;
        let copies = initialCopies;
        let firstError = null;

        const worker = async () => {
            while (!firstError) {
                const index = nextIndex++;
                if (index >= queue.length) return;
                const page = queue[index];
                try {
                    if (options.isCancelled?.()) throw new Error('Сравнение остановлено.');
                    const response = await fetchCompareCollectionPage(buildCompareCollectionUrl(username, page), {
                        signal:controller.signal,
                        withMeta:true
                    });
                    assertComparePageResponse(response, username, page);
                    if (options.isCancelled?.()) throw new Error('Сравнение остановлено.');
                    const doc = parser.parseFromString(response.html, 'text/html');
                    const found = mergeComparePage(doc, byId, cachedById);
                    if (found === 0) throw new Error(`Не удалось прочитать страницу ${page}.`);
                    copies += found;
                    completedPages++;
                    onProgress?.({ cached:false, page:completedPages, maxPages, unique:byId.size, copies, loadedPage:page });
                } catch (error) {
                    if (error?.name === 'AbortError' && firstError) return;
                    if (!firstError) {
                        firstError = error;
                        controller.abort();
                    }
                    return;
                }
            }
        };

        try {
            await Promise.all(Array.from(
                { length:Math.min(COLLECTION_COMPARE_CONCURRENCY, queue.length) },
                () => worker()
            ));
        } finally {
            options.signal?.removeEventListener('abort', abortFromCaller);
        }
        if (firstError) throw firstError;
        return copies;
    }

    function makeCompareCollection(username, cards, fromCache = false) {
        const normalized = cards.map(card => ({
            ...card,
            id: String(card.id),
            rank: normalizeCompareRank(card.rank),
            count: Math.max(1, Number(card.count) || 1),
            ownerIds: [...new Set((Array.isArray(card.ownerIds) ? card.ownerIds : []).map(String).filter(id => /^\d+$/.test(id)))]
        }));
        const byId = new Map(normalized.map(card => [String(card.id), card]));
        return {
            username,
            cards: normalized,
            byId,
            uniqueCount: normalized.length,
            totalCopies: normalized.reduce((sum, card) => sum + card.count, 0),
            fromCache
        };
    }

    function aggregateCurrentCompareCollection(sourceCards, username) {
        const byId = new Map();
        for (const raw of sourceCards || []) {
            const id = String(raw?.id || '').trim();
            if (!id) continue;
            const existing = byId.get(id);
            if (existing) {
                existing.count++;
                const extraOwnerIds = Array.isArray(raw.ownerIds) ? raw.ownerIds : (raw.ownerId ? [raw.ownerId] : []);
                extraOwnerIds.map(String).filter(ownerId => /^\d+$/.test(ownerId)).forEach(ownerId => {
                    if (!existing.ownerIds.includes(ownerId)) existing.ownerIds.push(ownerId);
                });
                continue;
            }
            byId.set(id, {
                id,
                name: raw.name || `Карта #${id}`,
                rank: normalizeCompareRank(raw.rank),
                anime: raw.anime || '',
                image: raw.image || '',
                count: 1,
                ownerIds: Array.isArray(raw.ownerIds) ? raw.ownerIds.map(String) : (raw.ownerId ? [String(raw.ownerId)] : []),
                total: isCollectionStatsReady(raw) ? normalizeStatValue(raw.total) : null,
                wanted: isCollectionStatsReady(raw) ? normalizeStatValue(raw.wanted) : null,
                trade: isCollectionStatsReady(raw) ? normalizeStatValue(raw.trade) : null,
                lastUpdate: raw.lastUpdate || null
            });
        }
        return makeCompareCollection(username, [...byId.values()]);
    }

    async function loadCompareCollection(username, onProgress, options = {}) {
        username = String(username || '').trim();
        if (!username) throw new Error('Укажи имя второго пользователя.');
        if (collectionSyncPromiseV2 || collectionStatsQueuesV2.size || collectionStatsInFlightV2.size) {
            throw new Error('Сначала дождись завершения анализа текущей коллекции.');
        }
        const cooldownRemaining = getCompareCooldownRemaining();
        if (cooldownRemaining > 0) throw new Error(`Защитная пауза после ошибки сервера: ещё ${Math.ceil(cooldownRemaining / 60000)} мин.`);
        if (!options.force) {
            const recent = readRecentCompareCache(username);
            if (recent) {
                onProgress?.({ cached:true, page:recent.pages || 0, maxPages:recent.pages || 0, unique:recent.uniqueCount, copies:recent.totalCopies });
                return recent;
            }
        } else {
            clearComparePartialCache(username);
        }

        clearComparePartialCache(username);
        const cachedById = readCollectionStatsCache(username);
        const byId = new Map();
        const firstResponse = await fetchCompareCollectionPage(buildCompareCollectionUrl(username), {
            withMeta:true,
            signal:options.signal
        });
        assertComparePageResponse(firstResponse, username, 1);
        if (options.isCancelled?.()) throw new Error('Сравнение остановлено.');
        const firstDoc = parser.parseFromString(firstResponse.html, 'text/html');
        const maxPages = getCompareMaxPage(firstDoc);
        const firstCopies = mergeComparePage(firstDoc, byId, cachedById);
        if (firstCopies === 0) throw new Error(`В коллекции пользователя ${username} карточки не найдены.`);
        onProgress?.({ cached:false, page:1, maxPages, unique:byId.size, copies:firstCopies });
        const pagesToFetch = Array.from({ length:Math.max(0, maxPages - 1) }, (_, index) => index + 2);
        await fetchComparePagesPool(
            username, pagesToFetch, byId, cachedById, maxPages, firstCopies, onProgress, options
        );

        if (!byId.size) throw new Error(`В коллекции пользователя ${username} карточки не найдены.`);
        const collection = makeCompareCollection(username, [...byId.values()]);
        collection.pages = maxPages;
        saveCompareCache(collection);
        clearComparePartialCache(username);
        return collection;
    }

    function getCompareCardValue(card) {
        const base = COLLECTION_COMPARE_RANK_VALUE[normalizeCompareRank(card.rank)] || 10;
        const hasStats = card.wanted != null && card.total != null && Number.isFinite(Number(card.wanted)) && Number.isFinite(Number(card.total));
        if (!hasStats) return { value:base, known:false };
        const wanted = Math.max(0, Number(card.wanted) || 0);
        const total = Math.max(0, Number(card.total) || 0);
        const trade = Math.max(0, Number(card.trade) || 0);
        const demandRatio = wanted / Math.max(1, wanted + total);
        const tradeRatio = trade / Math.max(1, trade + total);
        const modifier = 1 + Math.min(.35, demandRatio * .35) + Math.min(.1, Math.log1p(wanted) / Math.log(1001) * .1) - Math.min(.12, tradeRatio * .12);
        return { value:base * modifier, known:true };
    }

    function hasCompareStats(card) {
        return card?.wanted != null && card?.total != null && card?.trade != null
            && ['wanted', 'total', 'trade'].every(key => Number.isFinite(Number(card[key])) && Number(card[key]) >= 0);
    }

    function getCompareWanted(card) {
        return hasCompareStats(card) ? Math.max(0, Number(card.wanted) || 0) : null;
    }

    async function ensureCompareCardStats(card, collectionA, options = {}) {
        if (hasCompareStats(card)) return card;
        const sameCard = collectionA?.byId?.get(String(card.id));
        if (sameCard && hasCompareStats(sameCard)) {
            card.total = sameCard.total; card.wanted = sameCard.wanted; card.trade = sameCard.trade; card.lastUpdate = sameCard.lastUpdate;
            return card;
        }
        try {
            const cached = JSON.parse(localStorage.getItem(`animesss_trade_card_${card.id}`) || 'null');
            if (cached && Date.now() - Number(cached.cachedAt || 0) < 12 * 60 * 60 * 1000 && hasCompareStats(cached)) {
                card.total = cached.total; card.wanted = cached.wanted; card.trade = cached.trade; card.lastUpdate = cached.cachedAt;
                return card;
            }
        } catch (error) {}

        const id = String(card.id);
        let entry = collectionCompareStatsInFlight.get(id);
        if (entry?.controller.signal.aborted) {
            if (collectionCompareStatsInFlight.get(id) === entry) collectionCompareStatsInFlight.delete(id);
            entry = null;
        }
        if (!entry) {
            const controller = new AbortController();
            const promise = (async () => {
                try {
                    const html = await fetchCompareCollectionPage(`/cards/users/?id=${encodeURIComponent(id)}`, {
                        signal:controller.signal
                    });
                    const doc = parser.parseFromString(html, 'text/html');
                    if (!doc.querySelector('#owners-count, #owners-need, #owners-trade')) throw new Error('Статистика выбранной карты недоступна.');
                    return {
                        total:readStatValue(doc, '#owners-count'),
                        wanted:readStatValue(doc, '#owners-need'),
                        trade:readStatValue(doc, '#owners-trade'),
                        lastUpdate:Date.now()
                    };
                } finally {
                    if (collectionCompareStatsInFlight.get(id)?.controller === controller) {
                        collectionCompareStatsInFlight.delete(id);
                    }
                }
            })();
            entry = { promise, controller };
            collectionCompareStatsInFlight.set(id, entry);
        }
        const abortFromCaller = () => entry.controller.abort();
        if (options.signal?.aborted) abortFromCaller();
        else options.signal?.addEventListener('abort', abortFromCaller, { once:true });
        try {
            const stats = await entry.promise;
            if (options.signal?.aborted) {
                const error = new Error('Проверка карты остановлена.');
                error.name = 'AbortError';
                throw error;
            }
            Object.assign(card, stats);
            try {
                localStorage.setItem(`animesss_trade_card_${id}`, JSON.stringify({
                    total:stats.total, wanted:stats.wanted, trade:stats.trade, cachedAt:stats.lastUpdate
                }));
            } catch (error) {}
            return card;
        } finally {
            options.signal?.removeEventListener('abort', abortFromCaller);
        }
    }

    function getTradeOfferCandidates(collectionA, collectionB) {
        let archived = new Set();
        try {
            const saved = JSON.parse(localStorage.getItem('animesss_archived_ids') || '[]');
            if (Array.isArray(saved)) archived = new Set(saved.map(String));
        } catch (error) {}
        return collectionA.cards
            .filter(card => card.count > 0 && !archived.has(String(card.id)))
            .map(card => ({
                ...card,
                availableCount:card.count,
                estimate:getCompareCardValue(card)
            }));
    }

    function findTradeSuggestions(target, collectionA, collectionB) {
        const targetEstimate = getCompareCardValue(target);
        const targetWanted = getCompareWanted(target);
        const targetRank = normalizeCompareRank(target.rank);
        const maxOfferCards = getCompareTradeMaxOfferCards(targetRank);
        if (targetWanted == null || targetWanted <= 0) return { targetEstimate, targetWanted, suggestions:[], reason:'no-stats' };

        const allCandidates = getTradeOfferCandidates(collectionA, collectionB)
            .map(card => ({ ...card, wanted:getCompareWanted(card) }))
            .filter(card => card.wanted != null && normalizeCompareRank(card.rank) === targetRank);
        if (!allCandidates.length) return { targetEstimate, targetWanted, suggestions:[], reason:'no-duplicates' };

        // E — отдельный рынок: уверенно подсказываем только сценарий
        // "золото" (250+ желающих) за одну мусорную E (до 50).
        if (targetRank === 'e') {
            if (targetWanted < 250) return { targetEstimate, targetWanted, suggestions:[], reason:'e-uncertain' };
            const suggestions = allCandidates
                .filter(card => normalizeCompareRank(card.rank) === 'e' && card.wanted <= 50)
                .sort((a, b) => a.wanted - b.wanted || b.availableCount - a.availableCount)
                .slice(0, 3)
                .map(card => ({
                    items:[card], wantedTotal:card.wanted, effectiveWantedTotal:card.wanted,
                    targetWanted, effectiveRatio:card.wanted / targetWanted,
                    specialGoldForTrash:true, score:card.wanted
                }));
            return { targetEstimate, targetWanted, suggestions, reason:suggestions.length ? null : 'no-e-trash' };
        }

        const effectiveWanted = card => card.wanted;
        const offerRules = {
            1:getCompareOfferRule(targetRank, 1, targetWanted),
            2:getCompareOfferRule(targetRank, 2, targetWanted),
            3:getCompareOfferRule(targetRank, 3, targetWanted)
        };
        const candidateMarks = [
            offerRules[1].ideal,
            offerRules[2].dominantIdeal,
            offerRules[2].additionsIdeal,
            offerRules[3].dominantIdeal,
            offerRules[3].additionsIdeal / 2
        ].map(ratio => targetWanted * ratio);

        // Обычные E не подмешиваются к рынку высоких рангов.
        const pool = allCandidates
            .filter(card => normalizeCompareRank(card.rank) === targetRank)
            .map(card => {
                const effective = effectiveWanted(card);
                const selectionDistance = Math.min(...candidateMarks.map(mark => Math.abs(effective - mark) / Math.max(10, mark)));
                return { ...card, effectiveWanted:effective, selectionDistance };
            })
            .sort((a, b) => a.selectionDistance - b.selectionDistance)
            .slice(0, 34);
        if (!pool.length) return { targetEstimate, targetWanted, suggestions:[], reason:'no-duplicates' };

        const combinations = [];
        const add = items => {
            const orderedItems = [...items].sort((a, b) =>
                b.effectiveWanted - a.effectiveWanted
                || b.availableCount - a.availableCount
                || String(a.id).localeCompare(String(b.id))
            );
            const usage = new Map();
            for (const item of orderedItems) usage.set(item.id, (usage.get(item.id) || 0) + 1);
            if ([...usage].some(([id, count]) => count > (pool.find(card => card.id === id)?.availableCount || 0))) return;
            const rule = offerRules[orderedItems.length];
            const wantedTotal = orderedItems.reduce((sum, item) => sum + item.wanted, 0);
            const effectiveWantedTotal = orderedItems.reduce((sum, item) => sum + item.effectiveWanted, 0);
            const effectiveRatio = effectiveWantedTotal / targetWanted;
            const sortedWanted = orderedItems.map(item => item.effectiveWanted);
            let dominantRatio = null;
            let additionsRatio = null;
            let fillerImbalance = 0;
            if (orderedItems.length >= 2) {
                dominantRatio = sortedWanted[0] / targetWanted;
                additionsRatio = sortedWanted.slice(1).reduce((sum, value) => sum + value, 0) / targetWanted;
                if (orderedItems.length === 3) fillerImbalance = Math.abs(sortedWanted[1] - sortedWanted[2]) / Math.max(1, sortedWanted[1] + sortedWanted[2]);
            }
            const additionsMin = Math.max(.03, rule.additionsIdeal - (orderedItems.length === 3 ? .10 : .08));
            const additionsMax = rule.additionsIdeal + (orderedItems.length === 3 ? .14 : .12);
            const shapeAcceptable = orderedItems.length === 1 || (
                dominantRatio >= rule.dominantMin && dominantRatio <= rule.dominantMax
                && additionsRatio >= additionsMin && additionsRatio <= additionsMax
                && (orderedItems.length !== 3 || fillerImbalance <= .75)
            );
            const acceptable = effectiveRatio >= rule.min && effectiveRatio <= rule.max && shapeAcceptable;
            let score = 6 * Math.abs(Math.log(Math.max(.01, effectiveRatio / rule.ideal)))
                + Math.max(0, rule.min - effectiveRatio) * 5
                + Math.max(0, effectiveRatio - rule.max) * 3;
            if (orderedItems.length >= 2) {
                score += 2.5 * Math.abs(dominantRatio - rule.dominantIdeal);
                score += 1.5 * Math.abs(additionsRatio - rule.additionsIdeal);
                if (orderedItems.length === 3) score += .75 * fillerImbalance;
            }
            combinations.push({ items:orderedItems, wantedTotal, effectiveWantedTotal, targetWanted, effectiveRatio, dominantRatio, additionsRatio, fillerImbalance, acceptable, score });
        };

        for (let i = 0; i < pool.length; i++) add([pool[i]]);
        if (maxOfferCards >= 2) {
            for (let i = 0; i < pool.length; i++) {
                for (let j = i; j < pool.length; j++) add([pool[i], pool[j]]);
            }
        }
        if (maxOfferCards >= 3) {
            const triplePool = pool.slice(0, 22);
            for (let i = 0; i < triplePool.length; i++) {
                for (let j = i; j < triplePool.length; j++) {
                    for (let k = j; k < triplePool.length; k++) add([triplePool[i], triplePool[j], triplePool[k]]);
                }
            }
        }

        const suggestions = [];
        const used = new Set();
        const addSuggestion = option => {
            const key = option.items.map(item => item.id).sort().join('-');
            if (used.has(key)) return false;
            used.add(key);
            suggestions.push({ ...option, fallback:!option.acceptable });
            return true;
        };
        // Каждый столбец имеет свою роль: ровно одна карта, ровно две и ровно три.
        // Если идеального варианта размера нет, берём ближайший безопасный того же размера.
        for (const size of [1, 2, 3].slice(0, maxOfferCards)) {
            let option = combinations
                .filter(item => item.items.length === size && item.acceptable)
                .sort((a, b) => a.score - b.score)[0];
            if (!option) {
                const rule = offerRules[size];
                option = combinations
                    .filter(item => item.items.length === size && !item.acceptable)
                    .filter(item => item.effectiveRatio >= rule.min && item.effectiveRatio <= rule.max + .18)
                    .filter(item => size === 1 || (
                        item.dominantRatio >= rule.dominantMin - .08
                        && item.dominantRatio <= rule.dominantMax + .08
                        && item.additionsRatio >= Math.max(.02, rule.additionsIdeal - .14)
                        && item.additionsRatio <= rule.additionsIdeal + .22
                    ))
                    .sort((a, b) => a.score - b.score)[0];
            }
            if (option) addSuggestion(option);
        }
        return { targetEstimate, targetWanted, suggestions, reason:suggestions.length ? null : 'no-safe-match' };
    }

    function injectCollectionCompareStyle() {
        if (document.getElementById('animesss-collection-compare-style')) return;
        const compareStyle = document.createElement('style');
        compareStyle.id = 'animesss-collection-compare-style';
        compareStyle.textContent = `
            #animesss-collection-compare { position:fixed; inset:0; z-index:10000020; padding:20px; overflow:auto; background:rgba(4,4,7,.93); backdrop-filter:blur(5px); color:#f3f1ec; font-family:'Inter','Segoe UI',sans-serif; box-sizing:border-box; }
            .animesss-compare-panel { width:min(1240px,100%); min-height:calc(100vh - 40px); margin:auto; padding:26px; border:1px solid rgba(255,255,255,.1); border-top:2px solid #d6304a; border-radius:18px; background:#131317; box-shadow:0 24px 70px rgba(0,0,0,.65); box-sizing:border-box; }
            .animesss-compare-header,.animesss-compare-form,.animesss-compare-summary,.animesss-compare-columns { display:flex; gap:14px; align-items:center; }
            .animesss-compare-header { justify-content:space-between; margin-bottom:22px; }
            .animesss-compare-title { margin:0; font:800 27px/1.2 'Manrope','Segoe UI',sans-serif; }
            .animesss-compare-close { width:38px; height:38px; border:1px solid rgba(255,255,255,.12); border-radius:10px; background:#1c1c22; color:#aaa6b2; cursor:pointer; font-size:17px; }
            .animesss-compare-form { flex-wrap:wrap; padding:16px; border-radius:13px; background:#1a1a20; border:1px solid rgba(255,255,255,.08); }
            .animesss-compare-user { padding:10px 13px; border-radius:9px; background:rgba(155,127,232,.12); color:#d9cff8; font-weight:700; }
            .animesss-compare-input { flex:1; min-width:210px; height:40px; padding:0 13px; border:1px solid rgba(255,255,255,.14); border-radius:9px; background:#0d0d11; color:#f3f1ec; outline:none; }
            .animesss-compare-action { height:40px; padding:0 17px; border:0; border-radius:9px; background:linear-gradient(135deg,#d6304a,#ff5a72); color:#fff; font-weight:800; cursor:pointer; }
            .animesss-compare-action:disabled { opacity:.5; cursor:wait; }
            .animesss-compare-status { margin-top:14px; padding:12px 14px; border:1px solid rgba(255,90,114,.25); border-radius:10px; background:rgba(214,48,74,.08); color:#c9c5cf; font-size:13px; }
            .animesss-compare-progress { height:4px; margin-top:9px; border-radius:3px; overflow:hidden; background:rgba(255,255,255,.08); }
            .animesss-compare-progress > i { display:block; width:0; height:100%; background:linear-gradient(90deg,#d6304a,#ff5a72); transition:width .2s; }
            .animesss-compare-summary { flex-wrap:wrap; margin:18px 0; }
            .animesss-compare-statbox { flex:1; min-width:150px; padding:13px; border:1px solid rgba(255,255,255,.08); border-radius:11px; background:#1a1a20; }
            .animesss-compare-statbox b { display:block; margin-top:4px; color:#fff; font:800 21px/1 'Manrope',sans-serif; }
            .animesss-compare-toolbar { display:flex; justify-content:flex-end; margin:16px 0 0; }
            .animesss-compare-gesture-tip { display:flex; align-items:center; justify-content:center; gap:11px; margin:12px 0; padding:10px 14px; border:1px solid rgba(255,90,114,.36); border-radius:11px; background:linear-gradient(90deg,rgba(214,48,74,.13),rgba(155,127,232,.10)); color:#c9c5cf; font-size:12px; box-shadow:0 8px 24px rgba(0,0,0,.18); }
            .animesss-compare-gesture-tip > span { display:grid; place-items:center; flex:0 0 auto; width:30px; height:30px; border:1px solid rgba(255,90,114,.40); border-radius:9px; background:rgba(214,48,74,.15); color:#ff8295; font-size:16px; }
            .animesss-compare-gesture-tip b { color:#fff; }
            .animesss-compare-columns { align-items:flex-start; }
            .animesss-compare-column { flex:1 1 0; min-width:0; padding:15px; border:1px solid rgba(255,255,255,.08); border-radius:13px; background:#101014; box-sizing:border-box; overflow:hidden; }
            .animesss-compare-column h3 { margin:0 0 6px; font:800 17px/1.3 'Manrope',sans-serif; }
            .animesss-compare-deck-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:6px; }
            .animesss-compare-deck-head h3 { margin:0; }
            .animesss-compare-deck-total { flex-shrink:0; padding:5px 9px; border:1px solid rgba(155,127,232,.28); border-radius:999px; background:rgba(155,127,232,.09); color:#d9cff8; font-size:11px; font-weight:800; }
            .animesss-compare-note { margin-bottom:12px; color:#9894a1; font-size:12px; }
            .animesss-compare-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); grid-auto-rows:max-content; align-items:start; align-content:start; gap:9px; max-height:560px; overflow-y:auto; overflow-x:hidden; padding:2px; }
            .animesss-compare-card { position:relative; display:block; min-width:0; height:auto !important; min-height:0 !important; max-height:none !important; padding:7px; border:1px solid rgba(255,255,255,.09); border-radius:10px; background:#1b1b21; color:#f3f1ec; text-align:left; line-height:normal; text-transform:none; overflow:hidden; box-sizing:border-box; cursor:default; }
            button.animesss-compare-card { display:block !important; align-self:start; width:100%; height:auto !important; min-height:0 !important; max-height:none !important; margin:0 !important; padding:7px !important; font:inherit; white-space:normal !important; appearance:none; -webkit-appearance:none; cursor:pointer; }
            button.animesss-compare-card:hover,button.animesss-compare-card.is-selected { border-color:#ff5a72; box-shadow:0 0 18px rgba(214,48,74,.28); transform:translateY(-1px); }
            .animesss-compare-card img { display:block; width:100%; height:auto !important; max-height:none !important; aspect-ratio:288/432; object-fit:cover; border-radius:7px; background:#09090c; }
            .animesss-compare-card strong { display:block; margin-top:7px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }
            .animesss-compare-card small { display:flex; justify-content:space-between; flex-wrap:wrap; gap:5px; margin-top:4px; color:#aaa6b2; font-size:10px; }
            .animesss-compare-rank { color:#ff7085; font-weight:800; }
            .animesss-compare-load-more { grid-column:1/-1; width:100%; height:40px !important; margin:2px 0 0 !important; border:1px solid rgba(155,127,232,.3); border-radius:9px; background:rgba(155,127,232,.1); color:#d9cff8; font-weight:800; cursor:pointer; }
            .animesss-compare-search { width:100%; height:36px; margin-bottom:10px; padding:0 11px; border:1px solid rgba(255,255,255,.12); border-radius:8px; background:#19191e; color:#fff; box-sizing:border-box; }
            .animesss-trade-helper { display:none; margin:18px 0; padding:16px; border:1px solid rgba(155,127,232,.34); border-radius:12px; background:linear-gradient(145deg,#1b1822,#151319); box-sizing:border-box; }
            .animesss-trade-helper.animesss-trade-helper-open { display:block; }
            .animesss-trade-helper h3 { margin:0 0 5px; font:800 18px/1.3 'Manrope',sans-serif; }
            .animesss-trade-variants { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-top:13px; }
            .animesss-trade-variant { padding:12px; border:1px solid rgba(255,255,255,.09); border-radius:10px; background:rgba(10,10,13,.72); }
            .animesss-trade-verdict { margin-bottom:9px; color:#4ce0a0; font-weight:800; font-size:12px; }
            .animesss-trade-offer-line { display:flex; align-items:center; gap:8px; margin-top:7px; }
            .animesss-trade-offer-line img { width:34px; height:51px; object-fit:cover; border-radius:4px; }
            .animesss-trade-offer-line span { min-width:0; font-size:11px; }
            .animesss-trade-offer-line b { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            @media(max-width:800px) { .animesss-compare-columns { flex-direction:column; } .animesss-compare-column { width:100%; box-sizing:border-box; } .animesss-trade-variants { grid-template-columns:1fr; } .animesss-compare-gesture-tip { justify-content:flex-start; } }
        `;
        document.head.appendChild(compareStyle);
    }

    function compareCardHtml(card, options = {}) {
        const tag = options.clickable ? 'button' : 'div';
        const targetAttr = options.clickable ? ` type="button" data-target-id="${escapeHtml(card.id)}" title="Открыть страницу трейда"` : '';
        const image = escapeHtml(card.image || '');
        const wanted = getCompareWanted(card);
        return `<${tag} class="animesss-compare-card"${targetAttr}>
            ${image ? `<img loading="lazy" src="${image}" alt="">` : '<div style="aspect-ratio:288/432;background:#09090c;border-radius:7px;"></div>'}
            <strong title="${escapeHtml(card.name)}">${escapeHtml(card.name)}</strong>
            <small><span class="animesss-compare-rank">${displayCompareRank(card.rank)}</span>${wanted == null ? '' : `<span>❤️ ${wanted}</span>`}<span>${card.count} шт.</span></small>
        </${tag}>`;
    }

    async function renderTradeHelper(modal, target) {
        const state = modal.animesssCompareState;
        const helperShell = modal.querySelector('#animesss-trade-helper');
        const helper = helperShell?.querySelector('.animesss-trade-helper-content');
        if (!state || !helperShell || !helper) return;
        helperShell.classList.add('animesss-trade-helper-open');
        state.helperController?.abort();
        const controller = new AbortController();
        state.helperController = controller;
        const requestId = (state.helperRequestId || 0) + 1;
        state.helperRequestId = requestId;
        modal.querySelectorAll('[data-target-id]').forEach(el => el.classList.toggle('is-selected', el.dataset.targetId === String(target.id)));
        helper.innerHTML = `<h3>Помощник по трейду</h3><div class="animesss-compare-note">Проверяю сохранённую статистику «${escapeHtml(target.name)}»…</div>`;
        try {
            try {
                await ensureCompareCardStats(target, state.collectionA, { signal:controller.signal });
                if (!modal.isConnected || modal.animesssCompareState !== state || state.helperRequestId !== requestId) return;
                saveCompareCache(state.collectionB);
                renderCompareCollectionList(modal, 'target', modal.querySelector('#animesss-compare-target-search')?.value || '');
                modal.querySelectorAll('[data-target-id]').forEach(el => el.classList.toggle('is-selected', el.dataset.targetId === String(target.id)));
            } catch (error) {
                if (error?.name === 'AbortError'
                    || !modal.isConnected || modal.animesssCompareState !== state || state.helperRequestId !== requestId) return;
                helper.innerHTML = `<h3>Помощник по трейду</h3><div class="animesss-compare-note">${escapeHtml(error?.message || 'Не удалось получить статистику выбранной карты.')}</div>`;
                return;
            }
            const result = findTradeSuggestions(target, state.collectionA, state.collectionB);
            if (!result.suggestions.length) {
                const reason = result.reason === 'e-uncertain'
                    ? 'Обычные карты ранга E плохо меняются по предсказуемой схеме. Уверенный совет даётся только для E-золота с 250+ желающих.'
                    : result.reason === 'no-e-trash'
                        ? 'Это E-золото, но среди твоих карт нет доступной мусорной E до 50 желающих.'
                        : result.reason === 'no-safe-match'
                            ? `Среди твоих карт ранга ${displayCompareRank(target.rank)} нет даже близкого по востребованности варианта. Совет: не отдавай сильно более дорогую карту за эту цель.`
                            : `Среди твоих карт ранга ${displayCompareRank(target.rank)} пока нет подходящего предложения.`;
                helper.innerHTML = `<h3>Помощник по трейду</h3><div class="animesss-compare-note">${reason}</div>`;
                return;
            }
            const variants = result.suggestions.map(option => {
            let verdict = option.items.length === 1
                ? 'Напролом: одна сильная карта'
                : option.items.length === 2
                    ? 'Основная карта + дополнение'
                    : 'Основная карта + два дополнения';
            if (option.specialGoldForTrash) {
                verdict = 'ЗОЛОТО за мусор — очень выгодно, если примут';
            }
            const groupedItems = [];
            option.items.forEach(card => {
                const existing = groupedItems.find(item => String(item.card.id) === String(card.id));
                if (existing) existing.quantity++;
                else groupedItems.push({ card, quantity:1 });
            });
            const lines = groupedItems.map(({ card, quantity }) => `<div class="animesss-trade-offer-line">
                ${card.image ? `<img loading="lazy" src="${escapeHtml(card.image)}" alt="">` : ''}
                <span><b>${escapeHtml(card.name)}${quantity > 1 ? ` ×${quantity}` : ''}</b>${displayCompareRank(card.rank)} · ❤️ ${getCompareWanted(card) ?? '?'}${quantity > 1 ? ` каждая` : ''} · останется ${Math.max(0, card.count - quantity)}</span>
            </div>`).join('');
            const adjusted = option.effectiveWantedTotal != null && Math.abs(option.effectiveWantedTotal - option.wantedTotal) >= 1
                ? ` · с учётом ранга ≈ ${Math.round(option.effectiveWantedTotal)}` : '';
            const sum = option.wantedTotal == null ? '' : `<div style="margin-top:8px;color:#aaa6b2;font-size:10px;">Сумма желающих: ❤️ ${option.wantedTotal}${adjusted}</div>`;
            return `<div class="animesss-trade-variant"><div class="animesss-trade-verdict">Вариант ${option.items.length}: ${verdict}</div>${lines}${sum}</div>`;
        }).join('');
        const maxOfferCards = getCompareTradeMaxOfferCards(target.rank);
        const rankLimitText = maxOfferCards === 1
            ? 'По правилам сайта за этот ранг можно предложить только одну карту.'
            : maxOfferCards === 2
                ? 'По правилам сайта за этот ранг можно предложить максимум две карты.'
                : 'По правилам сайта за этот ранг можно предложить максимум три карты.';
            helper.innerHTML = `<h3>Что предложить за «${escapeHtml(target.name)}» · ❤️ ${getCompareWanted(target) ?? '?'}</h3>
                <div class="animesss-compare-note">Предлагаются твои карты только ранга ${displayCompareRank(target.rank)}. ${rankLimitText} Чем ниже ранг, тем выше запас по желающим. Вариант 1 — одна усиленная карта. Вариант 2 — основная карта и одно дополнение. Вариант 3 — основная карта, близкая к цели, и два дополнения. Можно предложить и единственную копию — тогда будет указано «останется 0». Карты из архива не используются.</div>
                <div class="animesss-trade-variants" style="grid-template-columns:repeat(${Math.max(1, Math.min(3, result.suggestions.length))},minmax(0,1fr));">${variants}</div>`;
        } finally {
            if (state.helperController === controller) state.helperController = null;
        }
    }

    function compareCardMatches(card, query) {
        const clean = String(query || '').toLowerCase().trim();
        if (!clean) return true;
        return String(card.name || '').toLowerCase().includes(clean)
            || String(card.anime || '').toLowerCase().includes(clean)
            || displayCompareRank(card.rank).toLowerCase() === clean
            || String(card.id).includes(clean);
    }

    function renderCompareCollectionList(modal, side, query = '', resetLimit = false) {
        const state = modal.animesssCompareState;
        const list = modal.querySelector(side === 'mine' ? '#animesss-compare-mine-list' : '#animesss-compare-target-list');
        if (!state || !list) return;
        if (resetLimit) state.listLimits[side] = 180;
        const source = side === 'mine' ? state.mine : state.targets;
        const filtered = source.filter(card => compareCardMatches(card, query));
        const limit = state.listLimits[side] || 180;
        const clickable = side === 'target';
        const cardsHtml = filtered.slice(0, limit).map(card => compareCardHtml(card, { clickable })).join('');
        const more = filtered.length > limit
            ? `<button type="button" class="animesss-compare-load-more" data-side="${side}">Показать ещё ${Math.min(180, filtered.length - limit)} · осталось ${filtered.length - limit}</button>` : '';
        list.innerHTML = filtered.length ? cardsHtml + more : '<div class="animesss-compare-note">Карты не найдены.</div>';
    }

    function renderCollectionComparison(modal, collectionA, collectionB) {
        const result = modal.querySelector('#animesss-compare-result');
        if (!result) return;

        const previousState = modal.animesssCompareState;
        if (previousState) {
            previousState.helperRequestId = (previousState.helperRequestId || 0) + 1;
            previousState.helperController?.abort();
        }

        // Статистика глобальна для типа карты: если карта есть в обеих колодах,
        // используем уже готовые данные основного анализа без нового запроса.
        collectionB.cards.forEach(card => {
            const mine = collectionA.byId.get(String(card.id));
            if (!hasCompareStats(card) && mine && hasCompareStats(mine)) {
                card.total = mine.total; card.wanted = mine.wanted; card.trade = mine.trade; card.lastUpdate = mine.lastUpdate;
            }
        });

        const mine = [...collectionA.cards].sort((a, b) => getCompareCardValue(b).value - getCompareCardValue(a).value);
        const targets = [...collectionB.cards].sort((a, b) => getCompareCardValue(b).value - getCompareCardValue(a).value);
        modal.animesssCompareState = {
            collectionA, collectionB, mine, targets,
            tradeCopyCursor:new Map(), listLimits:{ mine:180, target:180 },
            helperRequestId:0, helperController:null
        };
        result.style.display = 'block';
        result.innerHTML = `
            <div class="animesss-compare-toolbar"><button type="button" id="animesss-compare-force-refresh" class="animesss-compare-action" style="background:#292932;">Обновить состав</button></div>
            <div id="animesss-trade-helper" class="animesss-trade-helper"><div class="animesss-trade-helper-content"><h3>Помощник по трейду</h3><div class="animesss-compare-note">Нажми правой кнопкой мыши на карту в правой колоде, чтобы получить варианты из своих карт того же ранга.</div></div></div>
            <div class="animesss-compare-gesture-tip"><span>🖱</span><div><b>Карты второй колоды:</b> ЛКМ — открыть трейд · ПКМ — получить совет помощника</div></div>
            <div class="animesss-compare-columns">
                <section class="animesss-compare-column">
                    <div class="animesss-compare-deck-head"><h3>Твоя колода</h3><span class="animesss-compare-deck-total">Всего карт: ${collectionA.totalCopies}</span></div>
                    <div class="animesss-compare-note">Показаны все карты, включая общие и повторяющиеся. Число копий указано на карточке.</div>
                    <input id="animesss-compare-mine-search" class="animesss-compare-search" placeholder="Поиск в своей колоде…">
                    <div id="animesss-compare-mine-list" class="animesss-compare-list"></div>
                </section>
                <section class="animesss-compare-column">
                    <div class="animesss-compare-deck-head"><h3>Колода ${escapeHtml(collectionB.username)}</h3><span class="animesss-compare-deck-total">Всего карт: ${collectionB.totalCopies}</span></div>
                    <div class="animesss-compare-note">Повторные ЛКМ по дублю открывают следующую копию карты.</div>
                    <input id="animesss-compare-target-search" class="animesss-compare-search" placeholder="Поиск карты, ранга или ID…">
                    <div id="animesss-compare-target-list" class="animesss-compare-list"></div>
                </section>
            </div>`;
        renderCompareCollectionList(modal, 'mine');
        renderCompareCollectionList(modal, 'target');

        const mineList = modal.querySelector('#animesss-compare-mine-list');
        const targetList = modal.querySelector('#animesss-compare-target-list');
        mineList.onclick = event => {
            const more = event.target.closest('[data-side="mine"]');
            if (!more) return;
            modal.animesssCompareState.listLimits.mine += 180;
            renderCompareCollectionList(modal, 'mine', modal.querySelector('#animesss-compare-mine-search').value);
        };
        const getTargetFromEvent = event => {
            const targetEl = event.target.closest('[data-target-id]');
            if (!targetEl) return null;
            return modal.animesssCompareState.targets.find(card => String(card.id) === targetEl.dataset.targetId) || null;
        };
        const openTargetTrade = target => {
            const state = modal.animesssCompareState;
            const ownerIds = Array.isArray(target.ownerIds) ? target.ownerIds.filter(id => /^\d+$/.test(String(id))) : [];
            if (!ownerIds.length) {
                alert('Не удалось определить ID экземпляра этой карты для трейда. Обнови состав колоды.');
                return;
            }
            const cursor = state.tradeCopyCursor.get(String(target.id)) || 0;
            const ownerId = ownerIds[cursor % ownerIds.length];
            state.tradeCopyCursor.set(String(target.id), cursor + 1);
            window.open(`/cards/${encodeURIComponent(ownerId)}/trade/`, '_blank', 'noopener');
        };
        targetList.onclick = event => {
            const more = event.target.closest('[data-side="target"]');
            if (more) {
                modal.animesssCompareState.listLimits.target += 180;
                renderCompareCollectionList(modal, 'target', modal.querySelector('#animesss-compare-target-search').value);
                return;
            }
            const target = getTargetFromEvent(event);
            if (!target) return;
            openTargetTrade(target);
        };
        targetList.oncontextmenu = event => {
            const target = getTargetFromEvent(event);
            if (!target) return;
            event.preventDefault();
            event.stopPropagation();
            renderTradeHelper(modal, target);
        };

        let mineSearchTimer;
        modal.querySelector('#animesss-compare-mine-search').oninput = event => {
            clearTimeout(mineSearchTimer);
            mineSearchTimer = setTimeout(() => renderCompareCollectionList(modal, 'mine', event.target.value, true), 120);
        };
        let targetSearchTimer;
        modal.querySelector('#animesss-compare-target-search').oninput = event => {
            clearTimeout(targetSearchTimer);
            targetSearchTimer = setTimeout(() => renderCompareCollectionList(modal, 'target', event.target.value, true), 120);
        };
    }

    window.animesssOpenCollectionCompare = sourceCards => {
        window.animesssCompareController?.abort();
        const oldModal = document.querySelector('#animesss-collection-compare');
        if (oldModal?.animesssCompareState) {
            oldModal.animesssCompareState.helperRequestId++;
            oldModal.animesssCompareState.helperController?.abort();
        }
        oldModal?.remove();
        void cancelCompareStatsRequests();
        injectCollectionCompareStyle();
        const usernameA = getCurrentCollectionUsername();
        let collectionA = aggregateCurrentCompareCollection(window.animesssResults || sourceCards || [], usernameA);
        if (!collectionA.cards.length) {
            alert('Сначала выполни основной анализ текущей коллекции.');
            return;
        }
        const modal = document.createElement('div');
        modal.id = 'animesss-collection-compare';
        modal.innerHTML = `<div class="animesss-compare-panel">
            <div class="animesss-compare-header"><div><div style="color:#d6304a;font-size:11px;font-weight:800;letter-spacing:1.6px;">ANIMESSS ANALYZER</div><h2 class="animesss-compare-title">Сравнение коллекций</h2></div><button type="button" class="animesss-compare-close">✕</button></div>
            <div class="animesss-compare-form">
                <div class="animesss-compare-user">Твоя: ${escapeHtml(usernameA)}</div><span>⇄</span>
                <input id="animesss-compare-user-b" class="animesss-compare-input" placeholder="Имя второго пользователя" value="${escapeHtml(localStorage.getItem('animesss_compare_last_user') || '')}">
                <button type="button" id="animesss-compare-run" class="animesss-compare-action">СРАВНИТЬ</button>
            </div>
            <div id="animesss-compare-status" class="animesss-compare-status" style="display:none;"><span></span><div class="animesss-compare-progress"><i></i></div></div>
            <div id="animesss-compare-result" style="display:none;"></div>
        </div>`;
        document.body.appendChild(modal);

        const status = modal.querySelector('#animesss-compare-status');
        const progress = status.querySelector('i');
        const runBtn = modal.querySelector('#animesss-compare-run');
        const input = modal.querySelector('#animesss-compare-user-b');
        let activeController = null;
        const close = () => {
            modal.dataset.cancelled = '1';
            activeController?.abort();
            if (modal.animesssCompareState) {
                modal.animesssCompareState.helperRequestId++;
                modal.animesssCompareState.helperController?.abort();
            }
            void cancelCompareStatsRequests();
            modal.remove();
        };
        modal.querySelector('.animesss-compare-close').onclick = close;
        modal.addEventListener('click', event => { if (event.target === modal) close(); });

        const run = async (force = false) => {
            const usernameB = input.value.trim();
            if (!usernameB) { status.style.display = 'block'; status.firstElementChild.textContent = 'Укажи имя второго пользователя.'; return; }
            if (usernameB.toLowerCase() === usernameA.toLowerCase()) { status.style.display = 'block'; status.firstElementChild.textContent = 'Это одна и та же коллекция.'; return; }
            if (collectionSyncPromiseV2 || collectionStatsQueuesV2.size || collectionStatsInFlightV2.size) {
                status.style.display = 'block';
                status.firstElementChild.textContent = 'Сначала дождись завершения анализа текущей коллекции.';
                return;
            }
            modal.dataset.cancelled = '0';
            runBtn.disabled = true;
            input.disabled = true;
            modal.querySelector('#animesss-compare-result').style.display = 'none';
            status.style.display = 'block';
            status.firstElementChild.textContent = 'Начинаю безопасную загрузку коллекции…';
            progress.style.width = '0%';
            activeController?.abort();
            const controller = new AbortController();
            const runToken = {};
            activeController = controller;
            window.animesssCompareController = controller;
            window.animesssCompareLoading = runToken;
            try {
                const previousState = modal.animesssCompareState;
                if (previousState) {
                    previousState.helperRequestId = (previousState.helperRequestId || 0) + 1;
                    previousState.helperController?.abort();
                }
                await cancelCompareStatsRequests();
                if (controller.signal.aborted || !modal.isConnected || modal.dataset.cancelled === '1') return;

                // Основной анализ мог обновиться, пока пользователь вводил имя.
                // Берём собственную коллекцию заново непосредственно перед сравнением.
                collectionA = aggregateCurrentCompareCollection(window.animesssResults || sourceCards || [], usernameA);
                if (!collectionA.cards.length) throw new Error('Сначала выполни основной анализ текущей коллекции.');
                const collectionB = await loadCompareCollection(usernameB, info => {
                    if (!modal.isConnected) return;
                    if (info.cached) {
                        status.firstElementChild.textContent = 'Использую недавно сохранённый состав колоды.';
                        progress.style.width = '100%';
                    } else {
                        const percent = Math.round(info.page / Math.max(1, info.maxPages) * 100);
                        status.firstElementChild.textContent = `Загружаю ${usernameB}: страница ${info.page}/${info.maxPages} · ${info.copies} карт.`;
                        progress.style.width = `${percent}%`;
                    }
                }, {
                    force,
                    signal:controller.signal,
                    isCancelled:() => controller.signal.aborted || !modal.isConnected || modal.dataset.cancelled === '1'
                });
                if (!modal.isConnected) return;
                localStorage.setItem('animesss_compare_last_user', usernameB);
                renderCollectionComparison(modal, collectionA, collectionB);
                status.style.display = 'none';
                progress.style.width = '100%';
                modal.querySelector('#animesss-compare-force-refresh').onclick = () => run(true);
            } catch (error) {
                if (!modal.isConnected) return;
                status.style.display = 'block';
                const cooldown = getCompareCooldownRemaining();
                status.firstElementChild.textContent = cooldown > 0
                    ? `Сервер вернул ошибку. Сравнение остановлено, незавершённый состав не сохранён. Защитная пауза: ${Math.ceil(cooldown / 60000)} мин.`
                    : (error?.message || 'Не удалось сравнить коллекции.');
                progress.style.width = '0%';
            } finally {
                if (activeController === controller) activeController = null;
                if (window.animesssCompareController === controller) window.animesssCompareController = null;
                if (window.animesssCompareLoading === runToken) {
                    window.animesssCompareLoading = null;
                    setTimeout(reconcileVisibleCollectionV2, 0);
                }
                if (modal.isConnected && !activeController) { runBtn.disabled = false; input.disabled = false; }
            }
        };
        runBtn.onclick = () => run(false);
        input.addEventListener('keydown', event => { if (event.key === 'Enter') run(false); });
        input.focus();
    };
    // ===== /COLLECTION COMPARE + TRADE HELPER =====

    // ===== TRADE PAGE SUGGESTION ASSISTANT =====
    function injectTradeSuggestionAssistantStyle() {
        if (document.getElementById('animesss-trade-suggestion-style')) return;
        const suggestionStyle = document.createElement('style');
        suggestionStyle.id = 'animesss-trade-suggestion-style';
        suggestionStyle.textContent = `
            #animesss-trade-suggestions {
                --ats-bg:#121217;
                --ats-panel:#191920;
                --ats-line:rgba(255,255,255,.09);
                --ats-text:#f3f1ec;
                --ats-dim:#aaa6b2;
                --ats-ruby:#d6304a;
                --ats-ruby-bright:#ff5a72;
                margin:18px 0 22px;
                padding:20px;
                border:1px solid var(--ats-line);
                border-top:2px solid var(--ats-ruby);
                border-radius:17px;
                background:
                    radial-gradient(circle at 100% 0,rgba(214,48,74,.14),transparent 34%),
                    linear-gradient(145deg,#17171d,#101014);
                color:var(--ats-text);
                box-shadow:0 20px 48px rgba(0,0,0,.34),0 0 34px rgba(214,48,74,.08);
                font-family:var(--an-body);
                box-sizing:border-box;
                overflow:hidden;
            }
            .animesss-ts-head {
                display:flex;
                align-items:flex-start;
                justify-content:space-between;
                gap:16px;
                margin-bottom:16px;
            }
            .animesss-ts-kicker {
                margin-bottom:5px;
                color:var(--ats-ruby-bright);
                font-size:10px;
                font-weight:900;
                letter-spacing:1.7px;
                text-transform:uppercase;
            }
            .animesss-ts-title {
                margin:0;
                font-family:var(--an-display);
                font-size:clamp(19px,2.5vw,26px);
                line-height:1.18;
                font-weight:800;
            }
            .animesss-ts-subtitle {
                margin-top:6px;
                color:var(--ats-dim);
                font-size:12.5px;
                line-height:1.45;
            }
            .animesss-ts-refresh {
                flex:0 0 auto;
                min-height:35px;
                padding:0 13px;
                border:1px solid rgba(255,90,114,.36);
                border-radius:9px;
                background:rgba(214,48,74,.09);
                color:var(--ats-ruby-bright);
                font:800 11px/1 var(--an-body);
                cursor:pointer;
            }
            .animesss-ts-refresh:hover { background:rgba(214,48,74,.18); }
            .animesss-ts-target {
                display:grid;
                grid-template-columns:46px minmax(0,1fr) auto;
                align-items:center;
                gap:11px;
                margin-bottom:15px;
                padding:10px 12px;
                border:1px solid rgba(255,255,255,.075);
                border-radius:12px;
                background:rgba(255,255,255,.025);
            }
            .animesss-ts-target img {
                width:46px;
                aspect-ratio:2/3;
                object-fit:cover;
                border-radius:7px;
                border:1px solid rgba(255,255,255,.14);
            }
            .animesss-ts-target-name { font-size:13px; font-weight:850; }
            .animesss-ts-target-meta {
                margin-top:4px;
                color:var(--ats-dim);
                font:700 10px/1.3 var(--an-mono);
            }
            .animesss-ts-target-wanted {
                padding:7px 10px;
                border-radius:9px;
                background:rgba(214,48,74,.12);
                color:#ff9bab;
                font:800 12px/1 var(--an-mono);
                white-space:nowrap;
            }
            .animesss-ts-variants {
                display:grid;
                grid-template-columns:repeat(3,minmax(0,1fr));
                gap:11px;
            }
            .animesss-ts-variant {
                min-width:0;
                padding:12px;
                border:1px solid var(--ats-line);
                border-radius:13px;
                background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012));
            }
            .animesss-ts-variant-head {
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:8px;
                margin-bottom:10px;
            }
            .animesss-ts-variant-name {
                font-size:11px;
                font-weight:900;
                letter-spacing:.65px;
                text-transform:uppercase;
            }
            .animesss-ts-variant-total {
                color:#ff91a3;
                font:800 10px/1 var(--an-mono);
                white-space:nowrap;
            }
            .animesss-ts-cards {
                display:grid;
                grid-template-columns:repeat(var(--ats-count,1),minmax(0,1fr));
                gap:7px;
                align-items:start;
            }
            .animesss-ts-card {
                position:relative;
                display:block !important;
                justify-self:center;
                width:100% !important;
                max-width:132px;
                height:auto !important;
                min-height:0 !important;
                max-height:none !important;
                min-width:0;
                padding:0 0 8px;
                border:1px solid rgba(255,255,255,.09);
                border-radius:10px;
                overflow:hidden;
                background:#0e0e13;
                color:var(--ats-text);
                cursor:pointer;
                text-align:left;
                transition:transform .2s,opacity .2s,border-color .2s,filter .2s;
            }
            .animesss-ts-card:hover {
                transform:translateY(-3px);
                border-color:rgba(255,90,114,.65);
            }
            .animesss-ts-card img {
                display:block;
                width:100% !important;
                height:auto !important;
                min-height:0 !important;
                max-height:none !important;
                aspect-ratio:2/3 !important;
                object-fit:cover;
                background:#08080b;
            }
            .animesss-ts-card-name {
                display:block;
                padding:7px 7px 0;
                overflow:hidden;
                color:#e9e6e2;
                font-size:9.5px;
                font-weight:800;
                text-overflow:ellipsis;
                white-space:nowrap;
            }
            .animesss-ts-card-wanted {
                display:block;
                padding:5px 7px 0;
                color:#ff8fa2;
                font:800 9.5px/1 var(--an-mono);
            }
            .animesss-ts-card.animesss-ts-flying,
            .animesss-ts-card.animesss-ts-added {
                transform:scale(.9);
                opacity:.2;
                filter:grayscale(.75);
                pointer-events:none;
            }
            .animesss-ts-card.animesss-ts-added::after {
                content:'ДОБАВЛЕНО';
                position:absolute;
                inset:0;
                display:grid;
                place-items:center;
                color:#fff;
                background:rgba(73,8,25,.72);
                font-size:9px;
                font-weight:900;
                letter-spacing:.7px;
            }
            .animesss-ts-note {
                margin-top:12px;
                color:var(--ats-dim);
                font-size:11px;
                line-height:1.45;
            }
            .animesss-ts-status {
                padding:18px 12px;
                border:1px dashed rgba(255,255,255,.12);
                border-radius:12px;
                color:var(--ats-dim);
                text-align:center;
                font-size:12.5px;
            }
            .animesss-ts-status b { color:var(--ats-text); }
            .animesss-ts-progress {
                height:4px;
                margin-top:12px;
                border-radius:4px;
                overflow:hidden;
                background:rgba(255,255,255,.07);
            }
            .animesss-ts-progress i {
                display:block;
                width:0;
                height:100%;
                background:linear-gradient(90deg,#8f1736,#ff5a72);
                transition:width .2s;
            }
            .animesss-ts-message {
                margin-top:10px;
                min-height:18px;
                color:#ff9bab;
                font-size:11.5px;
                text-align:center;
            }
            .animesss-ts-flyer {
                position:fixed;
                z-index:2147483646;
                object-fit:cover;
                border:2px solid #ff5a72;
                border-radius:9px;
                pointer-events:none;
                box-shadow:0 0 28px rgba(255,90,114,.72),0 14px 36px rgba(0,0,0,.6);
            }
            @media (max-width:820px) {
                .animesss-ts-variants { grid-template-columns:1fr; }
                .animesss-ts-cards { grid-template-columns:repeat(var(--ats-count,1),minmax(74px,130px)); }
            }
            @media (max-width:520px) {
                #animesss-trade-suggestions { padding:15px; }
                .animesss-ts-head { flex-direction:column; }
                .animesss-ts-target { grid-template-columns:40px minmax(0,1fr); }
                .animesss-ts-target img { width:40px; }
                .animesss-ts-target-wanted { grid-column:1/-1; text-align:center; }
            }
        `;
        document.head.appendChild(suggestionStyle);
    }

    function getTradeSuggestionPageContext() {
        const container = document.querySelector('.cards--container.noffer[data-original-id][data-rank]');
        if (!container || !/^\/cards\/\d+\/trade\/?$/i.test(location.pathname)) return null;
        return {
            container,
            targetId:String(container.dataset.originalId || ''),
            targetRank:normalizeCompareRank(container.dataset.rank || ''),
            receiverId:String(container.dataset.receiverId || ''),
            receiverName:String(container.dataset.receiver || ''),
            tradeId:String(container.dataset.tradeId || ''),
            targetName:container.querySelector('.noffer__main-title h2')?.textContent?.trim() || 'Запрашиваемая карта',
            targetImage:container.querySelector('.noffer__img img')?.getAttribute('src') || ''
        };
    }

    function getTradeSuggestionHash() {
        if (typeof window.dle_login_hash === 'string' && window.dle_login_hash) return window.dle_login_hash;
        try {
            if (typeof dle_login_hash === 'string' && dle_login_hash) return dle_login_hash;
        } catch (error) {}
        return '';
    }

    function collectTradeSuggestionInventoryFromRoot(root, inventoryByOwner) {
        const selector = '.trade__inventory-item--available.trade__inventory-item--dontlock[data-id][data-card-id]';
        let matched = 0;
        root?.querySelectorAll?.(selector).forEach(node => {
            const ownerId = String(node.dataset.id || '').trim();
            const cardId = String(node.dataset.cardId || '').trim();
            if (!/^\d+$/.test(ownerId) || !/^\d+$/.test(cardId)) return;
            const image = node.querySelector('img')?.getAttribute('src') || '';
            matched++;
            inventoryByOwner.set(ownerId, {
                ownerId,
                cardId,
                image,
                name:prettifyCardNameFromImage(image, `Карта #${cardId}`)
            });
        });
        return matched;
    }

    function parseTradeSuggestionInventory(html, inventoryByOwner) {
        const doc = parser.parseFromString(`<div>${String(html || '')}</div>`, 'text/html');
        return collectTradeSuggestionInventoryFromRoot(doc, inventoryByOwner);
    }

    async function fetchTradeSuggestionInventoryPage(context, page) {
        const hash = getTradeSuggestionHash();
        if (!hash) throw new Error('Сессия Animesss не найдена. Обнови страницу после входа в аккаунт.');
        const params = new URLSearchParams({
            action:'search_trade',
            rank:context.targetRank,
            not_searching:'0',
            search:'',
            locked:'0',
            withplus:'',
            withs:'',
            sort:'0',
            want:'',
            donthave:'',
            page:String(page),
            reciever:context.receiverId,
            reciever_name:context.receiverName,
            user_hash:hash
        });
        const response = await fetch('/index.php?controller=ajax&mod=cards_filter', {
            method:'POST',
            credentials:'same-origin',
            headers:{
                'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With':'XMLHttpRequest'
            },
            body:params.toString()
        });
        if (!response.ok) throw new Error(`Не удалось загрузить доступные карты: HTTP ${response.status}.`);
        const data = await response.json();
        if (!data || typeof data.html !== 'string') throw new Error('Сайт вернул неизвестный формат списка карт.');
        return data;
    }

    async function loadTradeSuggestionInventory(context, onProgress) {
        const inventoryByOwner = new Map();
        const visibleInventory = [...document.querySelectorAll('.trade__inventory-list')]
            .find(list => list.querySelector('.trade__inventory-item--available.trade__inventory-item--dontlock'));
        collectTradeSuggestionInventoryFromRoot(visibleInventory, inventoryByOwner);

        const visiblePageCount = Math.max(
            1,
            ...[...document.querySelectorAll('#choose_trade_page option')]
                .map(option => Number(option.value) || 1)
        );
        let pageCount = Math.min(200, visiblePageCount);
        onProgress?.(1, pageCount, inventoryByOwner.size);

        try {
            const first = await fetchTradeSuggestionInventoryPage(context, 1);
            pageCount = Math.max(1, Math.min(200, Number(first.count_pages) || pageCount));
            const firstPageMatches = parseTradeSuggestionInventory(first.html, inventoryByOwner);
            onProgress?.(1, pageCount, inventoryByOwner.size);

            // Некоторые конфигурации Animesss возвращают пустой HTML на прямой
            // AJAX-запрос, хотя штатный список страницы уже заполнен. В таком
            // случае сохраняем видимые доступные карты и не обнуляем результат.
            if (firstPageMatches > 0 || inventoryByOwner.size === 0) {
                for (let page = 2; page <= pageCount; page++) {
                    const data = await fetchTradeSuggestionInventoryPage(context, page);
                    parseTradeSuggestionInventory(data.html, inventoryByOwner);
                    onProgress?.(page, pageCount, inventoryByOwner.size);
                    if (page < pageCount) await sleep(110);
                }
            }
        } catch (error) {
            if (!inventoryByOwner.size) throw error;
            console.warn('[Animesss Trade Adviser] Дополнительные страницы не загружены; использую видимый инвентарь:', error);
        }

        const selectedOwnerIds = new Set(
            [...document.querySelectorAll('.trade__main-items[data-type="creator"] .trade__main-item[data-id]')]
                .map(node => String(node.dataset.id || ''))
        );
        selectedOwnerIds.forEach(ownerId => inventoryByOwner.delete(ownerId));
        return inventoryByOwner;
    }

    function makeTradeSuggestionCollection(context, inventoryByOwner) {
        const collectionContext = getCollectionContext();
        collectionContext.rank = '';
        collectionContext.rankParam = '';
        const snapshot = readCollectionSnapshot(collectionContext);
        const hydrated = snapshot ? hydrateCollectionSnapshot(collectionContext, snapshot) : [];
        const cachedCollection = aggregateCurrentCompareCollection(hydrated, collectionContext.username);
        const statsMap = getCollectionStatsMap(collectionContext);
        const typeMap = new Map((snapshot?.types || []).map(type => [String(type.id), type]));
        const byCardId = new Map();

        inventoryByOwner.forEach(copy => {
            if (String(copy.cardId) === String(context.targetId)) return;
            let group = byCardId.get(copy.cardId);
            if (!group) {
                const cached = cachedCollection.byId.get(copy.cardId) || {};
                const stats = statsMap.get(copy.cardId) || {};
                const type = typeMap.get(copy.cardId) || {};
                const source = { ...type, ...stats, ...cached };
                group = {
                    id:copy.cardId,
                    name:source.name || copy.name,
                    anime:source.anime || '',
                    rank:normalizeCompareRank(source.rank || context.targetRank),
                    image:source.image || copy.image,
                    count:0,
                    ownerIds:[],
                    total:hasCompleteStats(source) ? normalizeStatValue(source.total) : null,
                    wanted:hasCompleteStats(source) ? normalizeStatValue(source.wanted) : null,
                    trade:hasCompleteStats(source) ? normalizeStatValue(source.trade) : null,
                    lastUpdate:source.lastUpdate || null
                };
                byCardId.set(copy.cardId, group);
            }
            group.count++;
            group.ownerIds.push(copy.ownerId);
        });
        const cards = [...byCardId.values()];
        return {
            collection:makeCompareCollection(collectionContext.username, cards),
            missingStats:cards.filter(card => !hasCompareStats(card)).length,
            totalTypes:cards.length
        };
    }

    function assignTradeSuggestionOwnerIds(suggestions) {
        return suggestions.map(suggestion => {
            const cursors = new Map();
            const items = suggestion.items.map(item => {
                const id = String(item.id);
                const cursor = cursors.get(id) || 0;
                cursors.set(id, cursor + 1);
                return {
                    ...item,
                    offerOwnerId:String(item.ownerIds?.[cursor] || '')
                };
            }).filter(item => /^\d+$/.test(item.offerOwnerId));
            return { ...suggestion, items };
        }).filter(suggestion => suggestion.items.length > 0);
    }

    function tradeSuggestionCardHtml(card) {
        return `
            <button type="button" class="animesss-ts-card"
                    data-owner-id="${escapeHtml(card.offerOwnerId)}"
                    data-card-id="${escapeHtml(card.id)}"
                    data-image="${escapeHtml(card.image)}"
                    title="Добавить эту карту в обмен">
                <img src="${escapeHtml(card.image)}" alt="">
                <span class="animesss-ts-card-name">${escapeHtml(card.name || `Карта #${card.id}`)}</span>
                <span class="animesss-ts-card-wanted">❤️ ${normalizeStatValue(card.wanted)}</span>
            </button>
        `;
    }

    function renderTradeSuggestionAssistant(panel, context, target, result, coverage) {
        const suggestionsBySize = new Map(result.suggestions.map(option => [option.items.length, option]));
        const maxCards = getCompareTradeMaxOfferCards(context.targetRank);
        const variants = [1, 2, 3].slice(0, maxCards).map(size => {
            const suggestion = suggestionsBySize.get(size);
            if (!suggestion) {
                return `
                    <section class="animesss-ts-variant">
                        <div class="animesss-ts-variant-head">
                            <span class="animesss-ts-variant-name">Вариант ${size}</span>
                            <span class="animesss-ts-variant-total">${size} карт.</span>
                        </div>
                        <div class="animesss-ts-status">Безопасный вариант не найден</div>
                    </section>
                `;
            }
            return `
                <section class="animesss-ts-variant">
                    <div class="animesss-ts-variant-head">
                        <span class="animesss-ts-variant-name">Вариант ${size}</span>
                        <span class="animesss-ts-variant-total">❤️ ${suggestion.wantedTotal}</span>
                    </div>
                    <div class="animesss-ts-cards" style="--ats-count:${size};">
                        ${suggestion.items.map(tradeSuggestionCardHtml).join('')}
                    </div>
                </section>
            `;
        }).join('');

        const coverageNote = coverage.missingStats
            ? `Карты без сохранённой статистики не участвовали в расчёте: ${coverage.missingStats}.`
            : `Проверено доступных типов карт: ${coverage.totalTypes}.`;
        panel.innerHTML = `
            <div class="animesss-ts-head">
                <div>
                    <div class="animesss-ts-kicker">◆ Animesss Trade Adviser</div>
                    <h2 class="animesss-ts-title">Советы для обмена</h2>
                    <div class="animesss-ts-subtitle">Выбери один из вариантов. Клик по карте сразу добавит её в обменник.</div>
                </div>
                <button type="button" class="animesss-ts-refresh">↻ ПЕРЕСЧИТАТЬ</button>
            </div>
            <div class="animesss-ts-target">
                <img src="${escapeHtml(target.image)}" alt="">
                <div>
                    <div class="animesss-ts-target-name">${escapeHtml(target.name)}</div>
                    <div class="animesss-ts-target-meta">${displayCompareRank(target.rank)} · запрашиваемая карта</div>
                </div>
                <div class="animesss-ts-target-wanted">❤️ ${normalizeStatValue(target.wanted)} хотят</div>
            </div>
            <div class="animesss-ts-variants">${variants}</div>
            <div class="animesss-ts-note">${coverageNote} Используются только разблокированные экземпляры, которые сервер Animesss разрешил предложить этому пользователю.</div>
            <div class="animesss-ts-message" aria-live="polite"></div>
        `;
    }

    function renderTradeSuggestionLoading(panel, text, completed = 0, total = 1) {
        const percent = Math.round(Math.max(0, Math.min(1, completed / Math.max(1, total))) * 100);
        panel.innerHTML = `
            <div class="animesss-ts-head">
                <div>
                    <div class="animesss-ts-kicker">◆ Animesss Trade Adviser</div>
                    <h2 class="animesss-ts-title">Советы для обмена</h2>
                </div>
            </div>
            <div class="animesss-ts-status">
                <b>${escapeHtml(text)}</b>
                <div class="animesss-ts-progress"><i style="width:${percent}%"></i></div>
            </div>
        `;
    }

    function setTradeSuggestionMessage(panel, message, tone = '#ff9bab') {
        const box = panel.querySelector('.animesss-ts-message');
        if (!box) return;
        box.textContent = message;
        box.style.color = tone;
        clearTimeout(box.animesssMessageTimer);
        box.animesssMessageTimer = setTimeout(() => {
            if (box.isConnected) box.textContent = '';
        }, 3500);
    }

    function ensureTradeSuggestionInventoryProxy(cardButton) {
        const ownerId = String(cardButton.dataset.ownerId || '');
        const cardId = String(cardButton.dataset.cardId || '');
        let inventoryCard = document.querySelector(
            `.trade__inventory-item--available[data-id="${ownerId}"][data-card-id="${cardId}"]`
        );
        if (inventoryCard) return inventoryCard;
        const inventoryList = document.querySelector('.trade__search + .trade__inventory .trade__inventory-list')
            || document.querySelector('.trade__inventory-list');
        if (!inventoryList) return null;
        inventoryCard = document.createElement('div');
        inventoryCard.className = 'trade__inventory-item user__have__card trade__inventory-item--dontlock trade__inventory-item--available animesss-ts-proxy';
        inventoryCard.dataset.id = ownerId;
        inventoryCard.dataset.cardId = cardId;
        inventoryCard.style.cssText = 'position:absolute!important; width:1px!important; height:1px!important; opacity:0!important; pointer-events:none!important; overflow:hidden!important;';
        inventoryCard.innerHTML = `<img src="${escapeHtml(cardButton.dataset.image || '')}" alt="Карта">`;
        inventoryList.appendChild(inventoryCard);
        return inventoryCard;
    }

    function animateTradeSuggestionTransfer(sourceButton, destination) {
        const sourceImage = sourceButton.querySelector('img');
        if (!sourceImage || !destination) return;
        const from = sourceImage.getBoundingClientRect();
        const to = destination.getBoundingClientRect();
        if (!from.width || !from.height || !to.width || !to.height) return;
        const flyer = sourceImage.cloneNode(true);
        flyer.className = 'animesss-ts-flyer';
        Object.assign(flyer.style, {
            left:`${from.left}px`,
            top:`${from.top}px`,
            width:`${from.width}px`,
            height:`${from.height}px`
        });
        document.body.appendChild(flyer);
        const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
        const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
        const scaleX = Math.max(.2, to.width / from.width);
        const scaleY = Math.max(.2, to.height / from.height);
        const animation = flyer.animate([
            { transform:'translate3d(0,0,0) scale(1)', opacity:1 },
            { transform:`translate3d(${dx}px,${dy}px,0) scale(${scaleX},${scaleY})`, opacity:.15 }
        ], {
            duration:620,
            easing:'cubic-bezier(.2,.8,.25,1)',
            fill:'forwards'
        });
        animation.finished.catch(() => {}).finally(() => flyer.remove());
    }

    function moveTradeSuggestionCardToEnd(button) {
        const cardsContainer = button.closest('.animesss-ts-cards');
        if (!cardsContainer || button.dataset.animesssMoved === '1') return;
        const cards = [...cardsContainer.querySelectorAll('.animesss-ts-card')];
        const previousPositions = new Map(
            cards.map(card => [card, card.getBoundingClientRect()])
        );
        button.dataset.animesssMoved = '1';
        button.classList.remove('animesss-ts-flying');
        button.classList.add('animesss-ts-added');
        cardsContainer.appendChild(button);
        cards.forEach(card => {
            if (!card.isConnected) return;
            const before = previousPositions.get(card);
            const after = card.getBoundingClientRect();
            const offsetX = before.left - after.left;
            const offsetY = before.top - after.top;
            if (Math.abs(offsetX) < 1 && Math.abs(offsetY) < 1) return;
            card.animate([
                { translate:`${offsetX}px ${offsetY}px` },
                { translate:'0px 0px' }
            ], {
                duration:360,
                easing:'cubic-bezier(.2,.8,.25,1)'
            });
        });
    }

    function syncTradeSuggestionAddedState(panel) {
        const selected = new Set(
            [...document.querySelectorAll('.trade__main-items[data-type="creator"] .trade__main-item[data-id]')]
                .map(node => String(node.dataset.id || ''))
        );
        panel.querySelectorAll('.animesss-ts-card[data-owner-id]').forEach(button => {
            button.classList.toggle('animesss-ts-added', selected.has(String(button.dataset.ownerId || '')));
            if (!selected.has(String(button.dataset.ownerId || ''))) button.classList.remove('animesss-ts-flying');
        });
    }

    async function addTradeSuggestionCard(panel, button, context) {
        const ownerId = String(button.dataset.ownerId || '');
        if (!/^\d+$/.test(ownerId) || button.classList.contains('animesss-ts-added')) return;
        const selectedContainer = document.querySelector('.trade__main-items[data-type="creator"]');
        if (!selectedContainer) {
            setTradeSuggestionMessage(panel, 'Не найден блок «Вы отдадите».');
            return;
        }
        const maxCards = getCompareTradeMaxOfferCards(context.targetRank);
        if (selectedContainer.querySelectorAll('.trade__main-item[data-id]').length >= maxCards) {
            setTradeSuggestionMessage(panel, `Для ранга ${displayCompareRank(context.targetRank)} можно предложить максимум ${maxCards} карт.`);
            return;
        }
        const inventoryCard = ensureTradeSuggestionInventoryProxy(button);
        if (!inventoryCard) {
            setTradeSuggestionMessage(panel, 'Не удалось связать карту с обменником.');
            return;
        }
        button.classList.add('animesss-ts-flying');
        inventoryCard.dispatchEvent(new MouseEvent('click', { bubbles:true, cancelable:true, view:window }));
        await sleep(60);
        const destination = selectedContainer.querySelector(`.trade__main-item[data-id="${ownerId}"]`);
        if (!destination) {
            button.classList.remove('animesss-ts-flying');
            setTradeSuggestionMessage(panel, 'Сайт не добавил карту. Нажми «Пересчитать» и попробуй ещё раз.');
            return;
        }
        animateTradeSuggestionTransfer(button, destination);
        moveTradeSuggestionCardToEnd(button);
        setTimeout(() => {
            if (!panel.isConnected) return;
            syncTradeSuggestionAddedState(panel);
            setTradeSuggestionMessage(panel, 'Карта добавлена в обмен.', '#69e5aa');
        }, 620);
    }

    async function runTradeSuggestionAssistant(panel, context) {
        const runId = String(Date.now()) + Math.random();
        panel.dataset.runId = runId;
        renderTradeSuggestionLoading(panel, 'Читаю доступные для обмена карты…');
        try {
            const targetPromise = getTradeCardStats({
                id:context.targetId,
                name:context.targetName,
                rank:context.targetRank,
                image:context.targetImage
            });
            const inventoryPromise = loadTradeSuggestionInventory(context, (page, total, count) => {
                if (!panel.isConnected || panel.dataset.runId !== runId) return;
                renderTradeSuggestionLoading(panel, `Проверяю доступные карты: страница ${page}/${total} · ${count} экз.`, page, total);
            });
            const [target, inventoryByOwner] = await Promise.all([targetPromise, inventoryPromise]);
            if (!panel.isConnected || panel.dataset.runId !== runId) return;
            if (!inventoryByOwner.size) throw new Error('У тебя нет разблокированных карт этого ранга, доступных для данного обмена.');

            const coverage = makeTradeSuggestionCollection(context, inventoryByOwner);
            if (!coverage.collection.cards.some(hasCompareStats)) {
                throw new Error('Не найдена сохранённая статистика коллекции. Сначала открой свою коллекцию и запусти основной анализ.');
            }
            const rawResult = findTradeSuggestions(target, coverage.collection, null);
            const result = {
                ...rawResult,
                suggestions:assignTradeSuggestionOwnerIds(rawResult.suggestions)
            };
            renderTradeSuggestionAssistant(panel, context, target, result, coverage);
            panel.querySelector('.animesss-ts-refresh')?.addEventListener('click', () => {
                runTradeSuggestionAssistant(panel, context);
            });
            syncTradeSuggestionAddedState(panel);
            if (!result.suggestions.length) {
                setTradeSuggestionMessage(panel, 'Для этой карты пока не найден безопасный вариант по количеству желающих.');
            }
        } catch (error) {
            if (!panel.isConnected || panel.dataset.runId !== runId) return;
            panel.innerHTML = `
                <div class="animesss-ts-head">
                    <div>
                        <div class="animesss-ts-kicker">◆ Animesss Trade Adviser</div>
                        <h2 class="animesss-ts-title">Советы для обмена</h2>
                    </div>
                    <button type="button" class="animesss-ts-refresh">↻ ПОВТОРИТЬ</button>
                </div>
                <div class="animesss-ts-status">${escapeHtml(error?.message || 'Не удалось построить советы.')}</div>
            `;
            panel.querySelector('.animesss-ts-refresh')?.addEventListener('click', () => {
                runTradeSuggestionAssistant(panel, context);
            });
        }
    }

    function initTradeSuggestionAssistant() {
        const context = getTradeSuggestionPageContext();
        if (!context || document.getElementById('animesss-trade-suggestions')) return;
        injectTradeSuggestionAssistantStyle();
        const panel = document.createElement('section');
        panel.id = 'animesss-trade-suggestions';
        panel.addEventListener('click', event => {
            const card = event.target.closest('.animesss-ts-card[data-owner-id]');
            if (!card) return;
            event.preventDefault();
            event.stopPropagation();
            addTradeSuggestionCard(panel, card, context);
        });
        const search = document.querySelector('.trade__search');
        if (search) search.insertAdjacentElement('afterend', panel);
        else context.container.appendChild(panel);
        const selectedContainer = document.querySelector('.trade__main-items[data-type="creator"]');
        if (selectedContainer) {
            new MutationObserver(() => syncTradeSuggestionAddedState(panel))
                .observe(selectedContainer, { childList:true, subtree:true });
        }
        runTradeSuggestionAssistant(panel, context);
    }
    // ===== /TRADE PAGE SUGGESTION ASSISTANT =====

    function showIntroNotification(next = showUpdateNotification) {
        const key = 'animesss_intro_v4_4_shown';
        if (localStorage.getItem(key)) { next(); return; }
        if (!document.body) { setTimeout(() => showIntroNotification(next), 1000); return; }

        const modal = document.createElement('div');
        modal.id = 'animesss-intro-notif';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(4,4,6,0.92); backdrop-filter:blur(3px); display:flex; align-items:safe center; justify-content:center; z-index:10000001; font-family: var(--an-body); padding:20px; box-sizing:border-box; overflow:auto;';
        modal.innerHTML = `
            <div style="background: var(--an-panel); border: 1px solid var(--an-line); border-top: 2px solid var(--an-red); border-radius: 20px; padding: 38px; max-width: 620px; color: var(--an-ink); box-shadow: 0 24px 70px rgba(0,0,0,.6), 0 0 40px rgba(214,48,74,.15); animation: animesssCardAppear 0.5s ease;">
                <div style="font-family:var(--an-body); font-weight:700; font-size:11px; letter-spacing:2px; color:var(--an-red); text-transform:uppercase; text-align:center; margin-bottom:10px;">◆ Animesss Analyzer</div>
                <div class="animesss-shimmer-title" style="font-family:var(--an-display); font-size: 27px; font-weight: 800; margin-bottom: 18px; text-align: center;">Привет, пользователь</div>
                <div style="font-size: 15.5px; line-height: 1.7; margin-bottom: 26px; color: var(--an-ink-dim);">
                    <p style="margin:0 0 14px;">Animesss Analyzer помогает разбирать коллекцию, выбирать карты и оценивать обмены.</p>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        <li style="margin-bottom: 10px;">◆ Анализирует карты по рангу, желающим, обменам и общему количеству владельцев.</li>
                        <li style="margin-bottom: 10px;">◆ Показывает лучшие, редкие, востребованные и худшие карты отдельными вкладками.</li>
                        <li style="margin-bottom: 10px;">◆ Помогает оценивать выбор в паках и показывает BEST/NORMAL/TRASH.</li>
                        <li style="margin-bottom: 10px;">◆ Анализирует карты в магазине Лабиринта.</li>
                        <li style="margin-bottom: 10px;">◆ Сравнивает коллекции.</li>
                        <li style="margin-bottom: 10px;">◆ Помогает с трейдами.</li>
                        <li style="margin-bottom: 10px;">◆ &#1055;&#1086;&#1079;&#1074;&#1086;&#1083;&#1103;&#1077;&#1090; &#1087;&#1086;&#1083;&#1091;&#1095;&#1072;&#1090;&#1100; &#1074;&#1099;&#1087;&#1072;&#1076;&#1072;&#1102;&#1097;&#1080;&#1077; &#1082;&#1072;&#1088;&#1090;&#1086;&#1095;&#1082;&#1080; &#1087;&#1088;&#1103;&#1084;&#1086; &#1074; &#1087;&#1086;&#1083;&#1085;&#1086;&#1101;&#1082;&#1088;&#1072;&#1085;&#1085;&#1086;&#1084; &#1088;&#1077;&#1078;&#1080;&#1084;&#1077; Kodik — &#1073;&#1077;&#1079; &#1074;&#1099;&#1093;&#1086;&#1076;&#1072; &#1080;&#1079; &#1087;&#1088;&#1086;&#1089;&#1084;&#1086;&#1090;&#1088;&#1072;.</li>
                    </ul>
                    <p style="margin:18px 0 0; color:var(--an-ink); font-weight:700; text-align:center;">
                        Создатель:
                        <a href="https://animesss.com/user/Punkalone/" target="_blank" rel="noopener noreferrer" style="color:var(--an-red-bright); text-decoration:none; border-bottom:1px solid rgba(255,90,114,.55);">Punkalone</a>
                    </p>
                </div>
                <button id="animesss-intro-close" style="width: 100%; padding: 15px; border: none; border-radius: 12px; background: linear-gradient(135deg, var(--an-red), var(--an-red-bright)); color: #fff5f6; font-family:var(--an-body); font-weight: 700; font-size: 16px; cursor: pointer; transition: transform .2s, box-shadow .2s;"
                        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 10px 24px rgba(214,48,74,.35)';"
                        onmouseout="this.style.transform=''; this.style.boxShadow='';">Понятно</button>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#animesss-intro-close').onclick = () => {
            modal.remove();
            localStorage.setItem(key, 'true');
            next();
        };
    }

    function showUpdateNotification() {
        const ver = "4.4";
        const key = 'animesss_update_v4_4_release_shown';
        if (localStorage.getItem(key)) return;
        if (!document.body) { setTimeout(showUpdateNotification, 1000); return; }

        const modal = document.createElement('div');
        modal.id = 'animesss-update-notif';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(4,4,6,0.92); backdrop-filter:blur(5px); display:flex; align-items:safe center; justify-content:center; z-index:10000000; font-family:var(--an-body); padding:20px; box-sizing:border-box; overflow:auto;';
        modal.innerHTML = `
            <div style="position:relative; overflow:hidden; margin:auto; background:linear-gradient(145deg,#19191f,#0e0e12); border:1px solid rgba(255,255,255,.12); border-top:2px solid var(--an-red); border-radius:24px; padding:34px; width:min(740px,calc(100vw - 40px)); box-sizing:border-box; color:var(--an-ink); box-shadow:0 34px 100px rgba(0,0,0,.76),0 0 70px rgba(214,48,74,.16); animation:animesssCardAppear .5s ease;">
                <div aria-hidden="true" style="position:absolute; width:260px; height:260px; right:-120px; top:-150px; border-radius:50%; background:rgba(214,48,74,.18); filter:blur(35px); pointer-events:none;"></div>
                <div aria-hidden="true" style="position:absolute; width:220px; height:220px; left:-150px; bottom:-150px; border-radius:50%; background:rgba(155,127,232,.14); filter:blur(38px); pointer-events:none;"></div>
                <div style="position:relative; font-weight:800; font-size:11px; letter-spacing:2px; color:var(--an-red-bright); text-transform:uppercase; text-align:center; margin-bottom:8px;">◆ Animesss Analyzer · v${ver}</div>
                <div class="animesss-shimmer-title" style="position:relative; font-family:var(--an-display); font-size:clamp(27px,5vw,36px); line-height:1.12; font-weight:800; text-align:center;">Большое обновление</div>
                <div style="position:relative; margin:9px auto 9px; max-width:570px; color:var(--an-ink-dim); font-size:14px; line-height:1.55; text-align:center;">Коллекция, архивы и обмены получили новые инструменты.</div>
                <div style="position:relative; width:max-content; margin:0 auto 22px; padding:6px 11px; border:1px solid rgba(255,90,114,.26); border-radius:999px; background:rgba(214,48,74,.08); color:#ff9bab; font-size:10px; font-weight:900; letter-spacing:1.1px;">5 ГЛАВНЫХ ИЗМЕНЕНИЙ</div>

                <div style="position:relative; display:grid; grid-template-columns:repeat(auto-fit,minmax(245px,1fr)); gap:10px; margin-bottom:22px; color:var(--an-ink-dim); font-size:12px; line-height:1.45;">
                    <div style="display:grid; grid-template-columns:38px minmax(0,1fr); gap:11px; padding:14px; border:1px solid rgba(255,90,114,.30); border-radius:13px; background:linear-gradient(145deg,rgba(214,48,74,.13),rgba(214,48,74,.045));"><span style="display:grid; place-items:center; width:36px; height:36px; border-radius:10px; background:rgba(214,48,74,.18); font-size:18px;">📊</span><div><b style="display:block; margin-bottom:3px; color:var(--an-ink); font-size:13px;">Обновилась система анализа</b>Быстрее замечает изменения и аккуратнее обновляет результаты.</div></div>
                    <div style="display:grid; grid-template-columns:38px minmax(0,1fr); gap:11px; padding:14px; border:1px solid rgba(155,127,232,.28); border-radius:13px; background:linear-gradient(145deg,rgba(155,127,232,.13),rgba(155,127,232,.04));"><span style="display:grid; place-items:center; width:36px; height:36px; border-radius:10px; background:rgba(155,127,232,.16); font-size:18px;">📦</span><div><b style="display:block; margin-bottom:3px; color:var(--an-ink); font-size:13px;">Архивы стали удобнее</b>Карты можно выделять и архивировать сразу группой.</div></div>
                    <div style="display:grid; grid-template-columns:38px minmax(0,1fr); gap:11px; padding:14px; border:1px solid rgba(76,224,160,.25); border-radius:13px; background:linear-gradient(145deg,rgba(76,224,160,.11),rgba(76,224,160,.035));"><span style="display:grid; place-items:center; width:36px; height:36px; border-radius:10px; background:rgba(76,224,160,.14); font-size:18px;">⇄</span><div><b style="display:block; margin-bottom:3px; color:var(--an-ink); font-size:13px;">Сравнение коллекций</b>Две колоды рядом — проще искать интересные карты и обмены.</div></div>
                    <div style="display:grid; grid-template-columns:38px minmax(0,1fr); gap:11px; padding:14px; border:1px solid rgba(255,90,114,.30); border-radius:13px; background:linear-gradient(145deg,rgba(214,48,74,.13),rgba(214,48,74,.045));"><span style="display:grid; place-items:center; width:36px; height:36px; border-radius:10px; background:rgba(214,48,74,.18); font-size:18px;">◆</span><div><b style="display:block; margin-bottom:3px; color:var(--an-ink); font-size:13px;">Помощник с трейдами</b>Подбирает варианты с учётом ранга и востребованности карт.</div></div>
                    <div style="grid-column:1/-1; display:grid; grid-template-columns:38px minmax(0,1fr); gap:11px; padding:14px; border:1px solid rgba(155,127,232,.28); border-radius:13px; background:linear-gradient(90deg,rgba(155,127,232,.13),rgba(214,48,74,.07));"><span style="display:grid; place-items:center; width:36px; height:36px; border-radius:10px; background:rgba(155,127,232,.16); font-size:18px;">🧭</span><div><b style="display:block; margin-bottom:3px; color:var(--an-ink); font-size:13px;">Анализ магазина в Лабиринте</b>Помогает быстро заметить лучшие карты среди доступных.</div></div>
                </div>
                <button id="animesss-upd-close" style="position:relative; width:100%; padding:15px; border:0; border-radius:12px; background:linear-gradient(135deg,var(--an-red),var(--an-red-bright)); color:#fff8f9; font-family:var(--an-body); font-weight:900; font-size:15px; cursor:pointer; box-shadow:0 10px 28px rgba(214,48,74,.28); transition:transform .2s,box-shadow .2s;" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 13px 32px rgba(214,48,74,.38)'" onmouseout="this.style.transform='';this.style.boxShadow='0 10px 28px rgba(214,48,74,.28)'">ПОНЯТНО</button>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#animesss-upd-close').onclick = () => { modal.remove(); localStorage.setItem(key, 'true'); };
    }

    observeTradeChanges();
    observeAccShopChanges();
    if (/^\/cards\/\d+\/trade\/?$/i.test(location.pathname)) initTradeSuggestionAssistant();
    if (location.pathname.startsWith('/user/cards/')) { createUI(); }
    else if (location.pathname.startsWith('/cards/pack/')) { observePackChanges(); }
    setTimeout(showIntroNotification, 500);
})();
