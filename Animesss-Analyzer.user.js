// ==UserScript==
// @name         Animesss Analyzer
// @namespace    https://github.com/Punkalone
// @version      4.2
// @description  Animesss card analyzer
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
            width: 26px;
            height: 26px;
            background: rgba(10,10,13,0.65);
            color: var(--an-ink);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
            font-size: 16px;
            transition: background 0.2s, border-color .2s;
            backdrop-filter: blur(6px);
            border: 1px solid var(--an-line);
        }
        .animesss-menu-btn:hover {
            background: rgba(214,48,74,0.85);
            color: #1a1408;
            border-color: var(--an-red);
        }
        .animesss-menu-popup {
            display: none;
            position: absolute;
            top: 38px;
            right: 8px;
            background: var(--an-panel-raised);
            border: 1px solid var(--an-line);
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.55);
            z-index: 100;
            overflow: hidden;
            min-width: 150px;
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
        const value = Number(card?.[key]);
        return Number.isFinite(value) && value >= 0;
    });
    const readStatValue = (doc, selector) => normalizeStatValue(doc.querySelector(selector)?.textContent);
    const normalizeCardStats = card => {
        const hadInvalidStats = ['total', 'wanted', 'trade'].some(key => {
            const value = Number(card?.[key]);
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

    window.animesssRefreshResults = () => {
        const modal = document.querySelector('#animesss-results');
        if (!modal) return;
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
        window.animesssRefreshResults();
    };

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
            padding: 16px; z-index: 999999; display: none; color: var(--an-ink);
            font-family: var(--an-body);
            box-shadow: 0 10px 30px rgba(0,0,0,.5); backdrop-filter: blur(14px);
        `;
        progressBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">
                <span style="font-family:var(--an-display); font-weight:800; font-size:13px; letter-spacing:0.5px; color:var(--an-red-bright);">СКАНИРОВАНИЕ</span>
                <span id="animesss-time" style="font-family:var(--an-mono); font-size:13px; color:var(--an-ink-dim);">⏱ --</span>
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
                <div id="animesss-percent" style="margin-top:8px; font-family:var(--an-mono); font-size:12px; color:var(--an-ink-dim); text-align:right;">0%</div>
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
                return;
            }

            if (progressBox.style.display === 'none' || !progressBox.style.display) {
                progressBox.style.display = 'block';
            } else {
                progressBox.style.display = 'none';
            }

            if (!window.animesssScanStarted) {
                window.animesssScanStarted = true;
                const success = await scanCollection();
                if (success) {
                    btn.innerHTML = '<span style="opacity:.9;">◆</span>&nbsp; РЕЗУЛЬТАТЫ АНАЛИЗА';
                }
            }
        }, true);
    }

    async function scanCollection() {
        const progressBox = document.querySelector('#animesss-progress-box');
        progressBox.style.display = 'block';

        const params = new URL(location.href).searchParams;
        let username = params.get('name');
        if (!username) {
            const userHeader = document.querySelector('.user-cards__title') || document.querySelector('h1');
            username = userHeader ? userHeader.textContent.trim().replace(/[^a-zA-Z0-9_а-яА-ЯёЁ]/g, '_') : 'my_collection';
        }
        const rank = params.get('rank');

        const statusEl = document.querySelector('#animesss-status');
        statusEl.textContent = `Определяю страницы пользователя ${username}`;

        try {
            const firstPageHtml = await fetchWithRetry(rank ? `/user/cards/?name=${username}&rank=${rank}` : `/user/cards/?name=${username}`);
            const firstDoc = parser.parseFromString(firstPageHtml, 'text/html');
            const pageNumbers = [...firstDoc.querySelectorAll('a[href*="page="]')].map(a => Number(a.href.match(/page=(\d+)/)?.[1] || 1));
            const maxPages = Math.max(1, ...pageNumbers);

            const allCards = [];
            const cacheKey = `animesss_scan_${username}_all`;
            const allCache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
            const savedMap = new Map(allCache.map(card => [String(card.id), card]));

            const scanStartTime = Date.now();

            for (let page = 1; page <= maxPages; page++) {
                statusEl.textContent = `Страница ${page}/${maxPages}`;
                const html = await fetchWithRetry(rank ? `/user/cards/?name=${username}&rank=${rank}&page=${page}` : `/user/cards/?name=${username}&page=${page}`);
                const doc = parser.parseFromString(html, 'text/html');
                const cards = [...doc.querySelectorAll('.anime-cards__item')];

                cards.forEach(card => {
                    const id = String(card.dataset.id);
                    const cachedCard = savedMap.get(id);
                    const listingImage = card.dataset.image || card.querySelector("img")?.src || "";
                    if (cachedCard) {
                        // Картинка на странице списка карт — надёжный источник (это гарантированно
                        // именно эта карта, без риска зацепить чужую). Обновляем её при каждом
                        // сканировании, чтобы подхватывать новый арт и чинить прошлые ошибки.
                        if (listingImage) cachedCard.image = listingImage;
                        allCards.push(cachedCard);
                    } else {
                        allCards.push({
                            id,
                            name: card.dataset.name,
                            rank: card.dataset.rank,
                            anime: card.dataset.animeName,
                            image: listingImage,
                            isNewInScan: !savedMap.has(id)
                        });
                    }
                });
            }

            allCards.forEach(normalizeCardStats);
            const cardsToScan = allCards.filter(card => !hasCompleteStats(card) || !card.lastUpdate);

            // ===== SCANSPEED =====
            // Пауза между запросами карт (в миллисекундах). Раньше было 700 и всё
            // стабильно работало без перерывов — если хочешь ускорить сканирование,
            // просто уменьши это число (например, 600, 500...). Если снова начнутся
            // 502 — увеличь обратно.
            const SCAN_DELAY_MS = 400;
            // ===== /SCANSPEED =====

            // Оценка времени на карту через медиану последних N карт — устойчива
            // к редким выбросам (например, если одна карта попала на ретрай и
            // заняла несколько секунд, это не должно портить прогноз времени).
            const TIME_WINDOW_SIZE = 15;
            const cardTimes = [];

            function medianOf(arr) {
                const sorted = [...arr].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
            }

            for (let i = 0; i < cardsToScan.length; i++) {
                const card = cardsToScan[i];
                statusEl.textContent = `Сканирование ${card.name}`;
                const cardStartTime = Date.now();

                try {
                    const html = await fetchWithRetry(`/cards/users/?id=${card.id}`);
                    const doc = parser.parseFromString(html, 'text/html');
                    card.total = readStatValue(doc, '#owners-count');
                    card.wanted = readStatValue(doc, '#owners-need');
                    card.trade = readStatValue(doc, '#owners-trade');
                    card.lastUpdate = Date.now();
                } catch (e) {
                    normalizeCardStats(card);
                    delete card.lastUpdate;
                }

                const completed = i + 1;
                const percent = Math.floor((completed / cardsToScan.length) * 100);
                document.querySelector('#animesss-bar').style.width = percent + '%';
                document.querySelector('#animesss-percent').textContent = `${completed}/${cardsToScan.length} (${percent}%)`;

                await sleep(SCAN_DELAY_MS);

                const cardTotalTime = Date.now() - cardStartTime;
                cardTimes.push(cardTotalTime);
                if (cardTimes.length > TIME_WINDOW_SIZE) cardTimes.shift();

                const remainingSec = Math.round((cardsToScan.length - completed) * medianOf(cardTimes) / 1000);
                const timeElement = document.querySelector('#animesss-time');
                if (timeElement) {
                    timeElement.textContent = remainingSec > 60 ? `⏱ ${Math.floor(remainingSec / 60)}м ${remainingSec % 60}с` : `⏱ ${remainingSec}с`;
                }
            }

            window.animesssResults = allCards.map(normalizeCardStats);
            allCards.forEach(card => savedMap.set(String(card.id), card));
            localStorage.setItem(cacheKey, JSON.stringify([...savedMap.values()]));

            statusEl.textContent = 'Сканирование завершено 🔥';
            setTimeout(() => { document.querySelector('#animesss-progress-box').style.display = 'none'; }, 1500);
            showResults(allCards, null, true);
            return true;
        } catch (err) {
            console.error("Ошибка при сканировании коллекции: ", err);
            statusEl.textContent = 'Ошибка сканирования ❌';
            window.animesssScanStarted = false;
            const btn = document.querySelector('#animesss-btn');
            if (btn) btn.innerHTML = '<span style="opacity:.9;">◆</span>&nbsp; ПОВТОРИТЬ АНАЛИЗ';
            return false;
        }
    }

    // ===== 3D-НАКЛОН КАРТОЧКИ (как у карточек Steam) =====
    // TILT_MAX_DEG — насколько сильно карта наклоняется (в градусах), TILT_SCALE — насколько увеличивается при наведении.
    const TILT_MAX_DEG = 6;
    const TILT_SCALE = 1.06;

    window.animesssTiltMove = (e, el) => {
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
        const idStr = String(id);
        const statsEl = element.querySelector('.animesss-lazy-stats');
        if (!statsEl) return;
        const oldValues = [...statsEl.querySelectorAll('.animesss-stat b')].map(el => parseInt(el.textContent, 10) || 0);
        statsEl.style.opacity = '0.5';
        try {
            const html = await fetchWithRetry(`/cards/users/?id=${idStr}`);
            const doc = parser.parseFromString(html, 'text/html');
            const total = readStatValue(doc, '#owners-count');
            const wanted = readStatValue(doc, '#owners-need');
            const trade = readStatValue(doc, '#owners-trade');
            if (window.animesssResults) {
                const card = window.animesssResults.find(c => String(c.id) === idStr);
                if (card) { card.total = total; card.wanted = wanted; card.trade = trade; card.lastUpdate = Date.now(); }
            }
            const params = new URL(location.href).searchParams;
            const username = params.get('name');
            if (username) {
                const cacheKey = `animesss_scan_${username}_all`;
                const cache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                const cardInCache = cache.find(c => String(c.id) === idStr);
                if (cardInCache) {
                    cardInCache.total = total;
                    cardInCache.wanted = wanted;
                    cardInCache.trade = trade;
                    cardInCache.lastUpdate = Date.now();
                    localStorage.setItem(cacheKey, JSON.stringify(cache));
                }
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
            const card = window.animesssResults.find(c => String(c.id) === idStr);
            if (card) card.isNewInScan = false;
        }
        const params = new URL(location.href).searchParams;
        const username = params.get('name');
        const cacheKey = `animesss_scan_${username}_all`;
        const cache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const cardInCache = cache.find(c => String(c.id) === idStr);
        if (cardInCache) { cardInCache.isNewInScan = false; localStorage.setItem(cacheKey, JSON.stringify(cache)); }
    };

    function showResults(cards, activeTabId = null, animateIntroStats = false, suppressCardIntro = false) {
        let shouldAnimateIntroStats = animateIntroStats && !window.animesssIntroStatsAnimated;
        const rankWeight = { e: 1, d: 2, c: 4, b: 8, a: 16, s: 32, ass: 64, sss: 128 };
        const enriched = cards.map(card => {
            const safeCard = normalizeCardStats({ ...card });
            const rank = rankWeight[(card.rank || '').toLowerCase()] || 1;
            return {
                ...safeCard,
                valueScore: (rank * 1000) + (safeCard.wanted * 10),
                rareScore: (rank * 100000) - safeCard.total,
                demandScore: safeCard.wanted,
                trashScore: ((1000 - rank) * 100) - (safeCard.wanted * 10)
            };
        });

        const uniqueMap = new Map();
        for (const card of enriched) {
            const id = String(card.id);
            if (!uniqueMap.has(id)) { uniqueMap.set(id, { ...card, duplicates: 1 }); } else { uniqueMap.get(id).duplicates++; }
        }

        const uniqueCards = [...uniqueMap.values()];
        const archivedIds = new Set(JSON.parse(localStorage.getItem('animesss_archived_ids') || '[]'));
        const activeCards = uniqueCards.filter(c => !archivedIds.has(String(c.id)));
        const archiveList = uniqueCards.filter(c => archivedIds.has(String(c.id))).sort((a, b) => b.wanted - a.wanted);
        const newCardsList = activeCards.filter(c => c.isNewInScan).sort((a, b) => b.wanted - a.wanted);

        const fullSortedValue = [...activeCards].sort((a, b) => b.valueScore - a.valueScore);
        const fullSortedRare = [...activeCards].sort((a, b) => b.rareScore - a.rareScore);
        const fullSortedDemand = [...activeCards].sort((a, b) => b.demandScore - a.demandScore);
        const fullSortedTrash = [...activeCards].sort((a, b) => b.trashScore - a.trashScore);

        const rankMaps = {
            best: new Map(fullSortedValue.map((c, i) => [String(c.id), i])),
            rare: new Map(fullSortedRare.map((c, i) => [String(c.id), i])),
            demand: new Map(fullSortedDemand.map((c, i) => [String(c.id), i])),
            trash: new Map(fullSortedTrash.map((c, i) => [String(c.id), i])),
            new: new Map(newCardsList.map((c, i) => [String(c.id), i])),
            archive: new Map(archiveList.map((c, i) => [String(c.id), i]))
        };

        const tabs = {
            best: fullSortedValue.slice(0, 50),
            rare: fullSortedRare.slice(0, 50),
            demand: fullSortedDemand.slice(0, 50),
            trash: fullSortedTrash.slice(0, 50),
            new: newCardsList,
            archive: archiveList
        };

        function renderGrid(list, tabId) {
            const isArchive = tabId === 'archive';
            const isNewTab = tabId === 'new';
            if (list.length === 0) return `<div class="animesss-empty-state">${isArchive ? 'Архив пуст' : isNewTab ? 'Новых карт нет' : 'Нет карт для отображения'}</div>`;

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
                        const isTop3 = !isArchive && !isNewTab && i >= 0 && i < 3;
                        const rv = isTop3 ? rankVisual[i] : null;
                        const cardAnimation = suppressCardIntro ? (rv ? rv.anim : 'none') : (rv ? `animesssCardFlipIn 0.5s cubic-bezier(.22,1,.36,1) both, ${rv.anim}` : 'animesssCardFlipIn 0.5s cubic-bezier(.22,1,.36,1) both');
                        return `
                        <div data-id="${card.id}" class="animesss-card${rv ? rv.cls : ''}" style="position:relative; background:var(--an-panel); border:${rv ? rv.border || '2px solid transparent' : '1px solid var(--an-line)'}; border-radius:14px; overflow:hidden; transition:all .2s ease; cursor:pointer; animation-delay:${suppressCardIntro ? '0s' : `${(i % 50) * 0.03}s`}; animation:${cardAnimation}; box-shadow:${rv ? rv.shadow : 'none'};"
                             onmouseenter="window.animesssClearNewTag('${card.id}', this); clearTimeout(this.lazyTimer); this.lazyTimer = setTimeout(() => window.animesssLazyUpdate('${card.id}', this), 1500); this.style.transition='none';"
                             onmousemove="window.animesssTiltMove(event, this)"
                             onmouseleave="clearTimeout(this.lazyTimer); window.animesssTiltReset(this);"
                             onclick="window.open('/cards/users/?id=${card.id}', '_blank')">
                            <div class="animesss-card-glare"></div>
                            ${card.isNewInScan ? '<div class="animesss-new-tag">NEW</div>' : ''}
                            <div class="animesss-menu-btn" onclick="event.stopPropagation(); const p = this.nextElementSibling; document.querySelectorAll('.animesss-menu-popup').forEach(x => {if(x!==p) x.style.display='none'}); p.style.display = p.style.display === 'block' ? 'none' : 'block';">⋮</div>
                            <div class="animesss-menu-popup" onclick="event.stopPropagation();">
                                <div class="animesss-menu-item" onclick="window.animesssToggleArchive('${card.id}')">${isArchive ? '📂 Деархивировать' : '📁 Архивировать'}</div>
                            </div>
                            ${card.duplicates > 1 ? `<div class="animesss-dup-count">x${card.duplicates}</div>` : ''}
                            <img src="${card.image}" style="width:100%; display:block;">
                            ${rv ? `<div class="animesss-top-badge" style="position:absolute; top:10px; left:50%; transform:translateX(-50%); background:${rv.badgeBg}; color:${rv.badgeColor}; font-family:var(--an-body); font-weight:700; padding:4px 11px; border-radius:999px; font-size:11px; letter-spacing:.5px; z-index:5; white-space:nowrap; box-shadow:0 3px 10px rgba(0,0,0,.4);">${rv.badgeIcon} ${rv.badgeLabel}</div>` : ''}
                            <div style="padding:10px; text-align:center;">
                                ${!isArchive && !isNewTab ? `<div class="animesss-rank-badge" style="font-family:var(--an-mono); font-weight:700; margin-bottom:8px; color:var(--an-red-bright); font-size:13px;">${i >= 0 && i < 3 ? ['🥇 #1', '🥈 #2', '🥉 #3'][i] : `#${i + 1}`}</div>` : ''}
                                ${isNewTab ? `<div style="font-family:var(--an-body); font-weight:700; margin-bottom:8px; color:var(--an-mint); font-size:12.5px; letter-spacing:.3px;">✨ НОВАЯ КАРТА</div>` : ''}
                                <div class="animesss-lazy-stats">
                                    <span class="animesss-stat">❤️<b>${card.wanted}</b></span><span class="animesss-stat-sep"></span><span class="animesss-stat">🔄<b>${card.trade}</b></span><span class="animesss-stat-sep"></span><span class="animesss-stat">👥<b>${card.total}</b></span>
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
                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; flex-wrap:wrap; gap:15px;">
                    <div>
                        <div style="font-family:var(--an-body); font-weight:700; font-size:11px; letter-spacing:2px; color:var(--an-red); text-transform:uppercase; margin-bottom:6px;">◆ Animesss Analyzer</div>
                        <h1 class="animesss-shimmer-title" style="font-family:var(--an-display); font-weight:800; font-size:28px; margin:0; letter-spacing:-0.3px;">Результаты анализа</h1>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
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
                </div>
                <div id="animesss-results-content">
                    <div style="display:flex; gap:6px; margin-bottom:22px; flex-wrap:wrap; border-bottom:1px solid var(--an-line); padding-bottom:2px;">
                        ${currentRank ? `<button data-tab="demand">📈 Востребованные</button><button data-tab="trash">🗑 Худшие</button>` : `<button data-tab="best">🔥 Лучшие</button><button data-tab="rare">💎 Редкие</button><button data-tab="demand">📈 Востребованные</button><button data-tab="trash">🗑 Худшие</button>`}
                        ${newCardsList.length > 0 ? `<button data-tab="new">✨ НОВОЕ</button><button id="animesss-mark-seen" class="animesss-mark-seen-btn"><span>✅</span><span>Убрать метки NEW</span></button>` : ''}
                        <div style="flex-grow:1;"></div>
                        <button data-tab="archive">📦 АРХИВ</button>
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
            const isArchiveTab = tabId === 'archive'; const isNewTab = tabId === 'new';
            let sourceList = isArchiveTab ? archiveList : (isNewTab ? newCardsList : activeCards);
            let filtered = sourceList.filter(card => {
                const ms = !query || card.name.toLowerCase().includes(query) || card.anime.toLowerCase().includes(query) || String(card.id).includes(query);
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
            if (btn.dataset.tab === 'archive') { btn.style.color = 'var(--an-violet)'; }
            btn.onclick = () => {
                modal.querySelectorAll('[data-tab]').forEach(other => {
                    other.style.background = 'transparent'; other.style.color = 'var(--an-ink-dim)'; other.style.padding = '8px 16px 10px'; other.style.boxShadow = 'none'; other.style.borderBottomColor = 'transparent';
                    if (other.dataset.tab === 'new') { other.style.color = 'var(--an-mint)'; other.style.borderBottomColor = 'rgba(76,224,160,0.35)'; }
                    if (other.dataset.tab === 'archive') { other.style.color = 'var(--an-violet)'; }
                });
                if (btn.dataset.tab === 'new') {
                    btn.style.background = 'rgba(76,224,160,0.1)'; btn.style.color = 'var(--an-mint)'; btn.style.borderBottomColor = 'var(--an-mint)'; btn.style.boxShadow = '0 8px 16px -10px rgba(76,224,160,.6)';
                } else if (btn.dataset.tab === 'archive') {
                    btn.style.background = 'rgba(155,127,232,0.1)'; btn.style.color = 'var(--an-violet)'; btn.style.borderBottomColor = 'var(--an-violet)';
                } else {
                    btn.style.background = 'rgba(214,48,74,0.1)'; btn.style.color = 'var(--an-red-bright)'; btn.style.borderBottomColor = 'var(--an-red)';
                }
                btn.style.padding = '12px 22px 10px'; applyFilters();

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
                const params = new URL(location.href).searchParams;
                const username = params.get('name');
                const cacheKey = `animesss_scan_${username}_all`;
                const cache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
                newCardsList.forEach(c => {
                    const idStr = String(c.id);
                    if (window.animesssResults) {
                        const rc = window.animesssResults.find(x => String(x.id) === idStr);
                        if (rc) rc.isNewInScan = false;
                    }
                    const cc = cache.find(x => String(x.id) === idStr);
                    if (cc) cc.isNewInScan = false;
                });
                localStorage.setItem(cacheKey, JSON.stringify(cache));
                window.animesssRefreshResults();
            };
        }

        // Если сохранённая активная вкладка (например "new") пропала после обновления —
        // падаем обратно на первую доступную, чтобы модалка не осталась без активной вкладки.
        const firstTab = (activeTabId && modal.querySelector(`[data-tab="${activeTabId}"]`)) || modal.querySelector('[data-tab]');
        if (firstTab) firstTab.click();
        document.querySelector('#animesss-close').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
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

    function showIntroNotification(next = showUpdateNotification) {
        const key = 'animesss_intro_v4_1_shown';
        if (localStorage.getItem(key)) { next(); return; }
        if (!document.body) { setTimeout(() => showIntroNotification(next), 1000); return; }

        const modal = document.createElement('div');
        modal.id = 'animesss-intro-notif';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(4,4,6,0.92); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; z-index:10000001; font-family: var(--an-body); padding:20px; box-sizing:border-box;';
        modal.innerHTML = `
            <div style="background: var(--an-panel); border: 1px solid var(--an-line); border-top: 2px solid var(--an-red); border-radius: 20px; padding: 38px; max-width: 620px; color: var(--an-ink); box-shadow: 0 24px 70px rgba(0,0,0,.6), 0 0 40px rgba(214,48,74,.15); animation: animesssCardAppear 0.5s ease;">
                <div style="font-family:var(--an-body); font-weight:700; font-size:11px; letter-spacing:2px; color:var(--an-red); text-transform:uppercase; text-align:center; margin-bottom:10px;">◆ Animesss Analyzer</div>
                <div class="animesss-shimmer-title" style="font-family:var(--an-display); font-size: 27px; font-weight: 800; margin-bottom: 18px; text-align: center;">Привет, пользователь</div>
                <div style="font-size: 15.5px; line-height: 1.7; margin-bottom: 26px; color: var(--an-ink-dim);">
                    <p style="margin:0 0 14px;">Это Anime Analyzer для Animesss. Он помогает быстро разобрать коллекцию и понять, какие карты самые ценные, редкие, востребованные или слабые.</p>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        <li style="margin-bottom: 10px;">◆ Анализирует карты по рангу, желающим, обменам и общему количеству владельцев.</li>
                        <li style="margin-bottom: 10px;">◆ Показывает лучшие, редкие, востребованные и худшие карты отдельными вкладками.</li>
                        <li style="margin-bottom: 10px;">◆ Подсвечивает новые карты и умеет обновлять статистику при наведении.</li>
                        <li style="margin-bottom: 10px;">◆ Помогает оценивать выбор в паках и показывает BEST/NORMAL/TRASH.</li>
                        <li style="margin-bottom: 10px;">◆ Анализирует трейды и показывает, насколько предложенный обмен выгоден.</li>
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
        const ver = "4.2";
        const key = `animesss_update_v${ver}_trade_analyzer_shown`;
        if (localStorage.getItem(key)) return;
        if (!document.body) { setTimeout(showUpdateNotification, 1000); return; }

        const modal = document.createElement('div');
        modal.id = 'animesss-update-notif';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(4,4,6,0.9); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; z-index:10000000; font-family: var(--an-body);';
        modal.innerHTML = `
            <div style="background: var(--an-panel); border: 1px solid var(--an-line); border-top: 2px solid var(--an-red); border-radius: 20px; padding: 40px; max-width: 600px; color: var(--an-ink); box-shadow: 0 24px 70px rgba(0,0,0,.6), 0 0 40px rgba(214,48,74,.15); animation: animesssCardAppear 0.5s ease;">
                <div style="font-family:var(--an-body); font-weight:700; font-size:11px; letter-spacing:2px; color:var(--an-red); text-transform:uppercase; text-align:center; margin-bottom:10px;">◆ Animesss Analyzer · v${ver}</div>
                <div class="animesss-shimmer-title" style="font-family:var(--an-display); font-size:31px; font-weight:800; margin-bottom:4px; text-align:center;">Трейды под контролем</div>
                <div class="animesss-trade-gauge" style="--needle-angle:-36deg; margin-bottom:12px;">
                    <svg class="animesss-trade-arc-svg" viewBox="0 0 260 138" aria-hidden="true">
                        <path d="M 30 118 A 100 100 0 0 1 58 49" stroke="#e04a57"></path>
                        <path d="M 60 47 A 100 100 0 0 1 100 22" stroke="#ff7b42"></path>
                        <path d="M 104 21 A 100 100 0 0 1 156 21" stroke="#c9a449"></path>
                        <path d="M 160 22 A 100 100 0 0 1 200 47" stroke="#8fd23d"></path>
                        <path d="M 202 49 A 100 100 0 0 1 230 118" stroke="#4ce0a0"></path>
                    </svg>
                    <div class="animesss-trade-needle" style="animation:animesssTradeNeedleTwitch 1.35s ease-in-out .65s infinite;"></div>
                    <div class="animesss-trade-scale-labels"><span>Невыгодно</span><span>Ровно</span><span>Выгодно</span></div>
                </div>
                <div style="font-size: 15.5px; line-height: 1.75; margin-bottom: 30px; color: var(--an-ink-dim);">
                    <div style="padding:18px; border-radius:12px; background:linear-gradient(135deg, rgba(214,48,74,.18), rgba(76,224,160,.07)); border:1px solid rgba(255,90,114,.3); box-shadow:0 0 30px rgba(214,48,74,.18);">
                        <div style="color:var(--an-red-bright); font-family:var(--an-display); font-weight:800; font-size:18px; margin-bottom:8px;">Новая возможность</div>
                        <div style="color:var(--an-ink); font-weight:700;">Я добавил возможность анализировать трейды.</div>
                        <div style="margin-top:8px;">Открой предложение обмена, разверни анализатор и сразу увидишь, насколько этот трейд выгоден для тебя.</div>
                    </div>
                </div>
                <button id="animesss-upd-close" style="width: 100%; padding: 15px; border: none; border-radius: 12px; background: linear-gradient(135deg, var(--an-red), var(--an-red-bright)); color: #fff5f6; font-family:var(--an-body); font-weight: 700; font-size: 16px; cursor: pointer; transition: transform .2s, box-shadow .2s;"
                        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 10px 24px rgba(214,48,74,.35)';"
                        onmouseout="this.style.transform=''; this.style.boxShadow='';">ПОНЯТНО</button>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#animesss-upd-close').onclick = () => { modal.remove(); localStorage.setItem(key, 'true'); };
    }

    observeTradeChanges();
    if (location.pathname.startsWith('/user/cards/')) { createUI(); }
    else if (location.pathname.startsWith('/cards/pack/')) { observePackChanges(); }
    setTimeout(showIntroNotification, 500);
})();
