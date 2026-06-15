// ==UserScript==
// @name         Animesss Analyzer
// @namespace    https://github.com/Punkalone
// @version      3.1
// @description  Animesss card analyzer
// @author       Punkalone
// @match        *://animesss.com/user/cards/*
// @match        *://animesss.com/cards/pack/*
// @grant        none

// @updateURL    https://raw.githubusercontent.com/Punkalone/Animesss-Analyzer/main/Animesss-Analyzer.user.js
// @downloadURL  https://raw.githubusercontent.com/Punkalone/Animesss-Analyzer/main/Animesss-Analyzer.user.js
// ==/UserScript==

(function () {
    'use strict';

    /* ==========================================================================================
       СТИЛИ (STYLES)
       ========================================================================================== */

    const style = document.createElement('style');
    style.textContent = `
        @keyframes animesssGlowGold {
            0% { box-shadow: 0 0 20px rgba(255,215,0,.5); }
            50% { box-shadow: 0 0 35px rgba(255,215,0,.75); }
            100% { box-shadow: 0 0 20px rgba(255,215,0,.5); }
        }

        @keyframes animesssCardAppear {
            from { opacity:0; transform:translateY(20px); }
            to { opacity:1; transform:translateY(0); }
        }

        @keyframes animesssGlowSilver {
            0% { box-shadow: 0 0 20px rgba(192,192,192,.5); }
            50% { box-shadow: 0 0 30px rgba(192,192,192,.7); }
            100% { box-shadow: 0 0 20px rgba(192,192,192,.5); }
        }

        @keyframes animesssGlowBronze {
            0% { box-shadow: 0 0 20px rgba(205,127,50,.5); }
            50% { box-shadow: 0 0 30px rgba(205,127,50,.7); }
            100% { box-shadow: 0 0 20px rgba(205,127,50,.5); }
        }
    `;
    document.head.appendChild(style);

    /* ==========================================================================================
       УТИЛИТЫ (UTILS)
       ========================================================================================== */

    const sleep = ms => new Promise(r => setTimeout(r, ms));

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

    /* ==========================================================================================
       ЧАСТЬ 1: COLLECTION SCANNER (АНАЛИЗАТОР КОЛЛЕКЦИИ)
       ========================================================================================== */

    function createUI() {
        if (document.querySelector('#animesss-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'animesss-btn';
        const currentRank = new URL(location.href).searchParams.get('rank');
        btn.textContent = currentRank ? `📊 Анализировать ${currentRank.toUpperCase()}` : '📊 Анализировать ВСЁ';

        const savedPos = JSON.parse(localStorage.getItem('animesss_btn_pos') || '{}');
        btn.style.cssText = `
            position: fixed;
            left: ${savedPos.left || '20px'};
            top: ${savedPos.top || '20px'};
            z-index: 999999;
            padding: 10px 20px;
            cursor: pointer;
            transition: transform .15s ease, left .12s ease-out, top .12s ease-out;
        `;

        btn.onmouseover = () => { btn.style.transform = 'scale(1.03)'; };
        btn.onmouseout = () => { btn.style.transform = 'scale(1)'; };

        const progressBox = document.createElement('div');
        progressBox.id = 'animesss-progress-box';
        progressBox.style.cssText = `
            position: fixed; top: 70px; right: 20px; width: 320px;
            background: rgba(17, 17, 17, 0.9); border: 1px solid #444; border-radius: 15px;
            padding: 12px; z-index: 999999; display: none; color: white;
            box-shadow: 0 0 20px rgba(0,0,0,.5); backdrop-filter: blur(10px);
        `;
        progressBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold; margin-bottom:10px;">
                <span>Animesss Analyzer</span>
                <span id="animesss-time">⏱ --</span>
            </div>
            <div id="animesss-content">
                <div id="animesss-status">Ожидание...</div>
                <div style="width:100%; height:20px; background:#222; margin-top:10px; border-radius:10px; overflow:hidden;">
                    <div id="animesss-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #a64dff, #ff4db8); transition:width .2s;"></div>
                </div>
                <div id="animesss-percent" style="margin-top:5px;">0%</div>
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
                await scanCollection();
                btn.textContent = '📊 Показать результаты';
            }
        }, true);
    }

    async function scanCollection() {
        const progressBox = document.querySelector('#animesss-progress-box');
        progressBox.style.display = 'block';

        const params = new URL(location.href).searchParams;
        const username = params.get('name');
        const rank = params.get('rank');

        document.querySelector('#animesss-status').textContent = `Определяю страницы пользователя ${username}`;

        const firstPageHtml = await fetchWithRetry(rank ? `/user/cards/?name=${username}&rank=${rank}` : `/user/cards/?name=${username}`);
        const firstDoc = new DOMParser().parseFromString(firstPageHtml, 'text/html');
        const pageNumbers = [...firstDoc.querySelectorAll('a[href*="page="]')].map(a => Number(a.href.match(/page=(\d+)/)?.[1] || 1));
        const maxPages = Math.max(1, ...pageNumbers);

        const allCards = [];
        let physicalCardsCount = 0;
        const cacheKey = `animesss_scan_${username}_all`;
        const allCache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const savedMap = new Map(allCache.map(card => [String(card.id), card]));

        const scanStartTime = Date.now();

        for (let page = 1; page <= maxPages; page++) {
            document.querySelector('#animesss-status').textContent = `Страница ${page}/${maxPages}`;
            const html = await fetchWithRetry(rank ? `/user/cards/?name=${username}&rank=${rank}&page=${page}` : `/user/cards/?name=${username}&page=${page}`);
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const cards = [...doc.querySelectorAll('.anime-cards__item')];
            physicalCardsCount += cards.length;

            cards.forEach(card => {
                const id = String(card.dataset.id);
                const cachedCard = savedMap.get(id);
                if (cachedCard) {
                    if (!allCards.some(x => String(x.id) === id)) allCards.push(cachedCard);
                } else if (!allCards.some(x => String(x.id) === id)) {
                    allCards.push({
                        id,
                        name: card.dataset.name,
                        rank: card.dataset.rank,
                        anime: card.dataset.animeName,
                        image: card.dataset.image || card.querySelector("img")?.src || ""
                    });
                }
            });
        }

        const cardsToScan = allCards.filter(card => card.total === undefined || card.wanted === undefined || card.trade === undefined || !card.lastUpdate);
        const randomCards = allCards.filter(card => !cardsToScan.includes(card)).sort(() => Math.random() - 0.5).slice(0, 20);
        cardsToScan.push(...randomCards);

        console.log(`+ случайных карт: ${randomCards.length}`);
        console.log(`Всего к обновлению: ${cardsToScan.length}`);

        for (let i = 0; i < cardsToScan.length; i++) {
            const card = cardsToScan[i];
            document.querySelector('#animesss-status').textContent = `Сканирование ${card.name}`;

            try {
                const html = await fetchWithRetry(`/cards/users/?id=${card.id}`);
                const doc = new DOMParser().parseFromString(html, 'text/html');
                card.total = Number(doc.querySelector('#owners-count')?.textContent || 0);
                card.wanted = Number(doc.querySelector('#owners-need')?.textContent || 0);
                card.trade = Number(doc.querySelector('#owners-trade')?.textContent || 0);
                card.lastUpdate = Date.now();
            } catch (e) {
                card.total = -1; card.wanted = -1; card.trade = -1; card.lastUpdate = Date.now();
            }

            const completed = i + 1;
            const percent = Math.floor((completed / cardsToScan.length) * 100);
            document.querySelector('#animesss-bar').style.width = percent + '%';

            const elapsed = Date.now() - scanStartTime;
            const avgTime = elapsed / completed;
            const remainingSec = Math.floor((cardsToScan.length - completed) * avgTime / 1000);

            document.querySelector('#animesss-percent').textContent = `${completed}/${cardsToScan.length} (${percent}%)`;
            const timeElement = document.querySelector('#animesss-time');
            if (timeElement) {
                timeElement.textContent = remainingSec > 60 ? `⏱ ${Math.floor(remainingSec / 60)}м ${remainingSec % 60}с` : `⏱ ${remainingSec}с`;
            }
            await sleep(700);
        }

        window.animesssResults = allCards;
        const oldCache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const mergedMap = new Map();
        oldCache.forEach(card => mergedMap.set(String(card.id), card));
        allCards.forEach(card => mergedMap.set(String(card.id), card));
        localStorage.setItem(cacheKey, JSON.stringify([...mergedMap.values()]));

        document.querySelector('#animesss-status').textContent = 'Сканирование завершено 🔥';
        setTimeout(() => { document.querySelector('#animesss-progress-box').style.display = 'none'; }, 1500);
        showResults(allCards);
        console.table(allCards);
    }

    function showResults(cards) {
        const rankWeight = { e: 1, d: 2, c: 4, b: 8, a: 16, s: 32, ass: 64, sss: 128 };
        const enriched = cards.map(card => {
            const rank = rankWeight[(card.rank || '').toLowerCase()] || 1;
            return {
                ...card,
                valueScore: (rank * 1000) + (card.wanted * 10),
                rareScore: (rank * 100000) - card.total,
                demandScore: card.wanted,
                trashScore: ((1000 - rank) * 100) - (card.wanted * 10)
            };
        });

        const uniqueMap = new Map();
        for (const card of enriched) {
            const id = String(card.id);
            if (!uniqueMap.has(id)) {
                uniqueMap.set(id, { ...card, duplicates: 1 });
            } else {
                uniqueMap.get(id).duplicates++;
            }
        }

        const uniqueCards = [...uniqueMap.values()];
        const topValue = [...uniqueCards].sort((a, b) => b.valueScore - a.valueScore).slice(0, 50);
        const topRare = [...uniqueCards].sort((a, b) => b.rareScore - a.rareScore).slice(0, 50);
        const topDemand = [...uniqueCards].sort((a, b) => b.demandScore - a.demandScore).slice(0, 50);
        const topTrash = [...uniqueCards].sort((a, b) => b.trashScore - a.trashScore).slice(0, 50);

        function renderGrid(list) {
            return `
                <div id="animesss-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:20px;">
                    ${list.map((card, i) => `
                        <div style="position:relative; background:#1a1a1a; border:${i === 0 ? '3px solid #FFD700' : i === 1 ? '3px solid #C0C0C0' : i === 2 ? '3px solid #CD7F32' : '1px solid #333'}; border-radius:12px; overflow:hidden; transition:all .2s ease; cursor:pointer; animation-delay:${i * 0.03}s; animation:${i === 0 ? 'animesssGlowGold 2.5s infinite' : i === 1 ? 'animesssGlowSilver 2.5s infinite' : i === 2 ? 'animesssGlowBronze 2.5s infinite' : 'none'}; box-shadow:${i === 0 ? '0 0 12px rgba(255,215,0,.35)' : i === 1 ? '0 0 10px rgba(192,192,192,.3)' : i === 2 ? '0 0 10px rgba(205,127,50,.3)' : 'none'};" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onclick="window.open('/cards/users/?id=${card.id}', '_blank')">
                            <img src="${card.image}" style="width:100%; display:block;">
                            ${card.duplicates > 1 ? `<div style="position:absolute; right:10px; bottom:95px; background:rgba(0,0,0,.85); color:white; font-weight:bold; font-size:16px; padding:4px 10px; border-radius:999px; border:2px solid #ff4444; backdrop-filter:blur(4px);">×${card.duplicates}</div>` : ''}
                            ${i < 3 ? `<div style="position:absolute; top:10px; right:10px; background:linear-gradient(135deg, ${['#FFD700, #FFA500', '#f0f0f0, #a0a0a0', '#CD7F32, #8B4513'][i]}); color:${i === 2 ? 'white' : 'black'}; font-weight:bold; padding:4px 8px; border-radius:8px; font-size:12px;">${['👑 KING', '⭐ ELITE', '🔥 PRO'][i]}</div>` : ''}
                            <div style="padding:10px; text-align:center;">
                                <div style="font-weight:bold; margin-bottom:8px; color:gold;">${i < 3 ? ['🥇 #1', '🥈 #2', '🥉 #3'][i] : `🏆 #${i + 1}`}</div>
                                <div style="display:flex; justify-content:center; gap:12px; font-size:14px;">
                                    <span>❤️ ${card.wanted}</span> <span>🔄 ${card.trade}</span> <span>👥 ${card.total}</span>
                                </div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;
        }

        const old = document.querySelector('#animesss-results');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'animesss-results';
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999999; overflow:auto; padding:20px;';

        const currentRank = new URL(location.href).searchParams.get('rank');
        modal.innerHTML = `
            <div style="max-width:1200px; margin:auto; background:#111; color:white; padding:20px; border-radius:15px;">
                <div style="position:fixed; top:20px; right:20px; display:flex; gap:10px; z-index:99999999;">
                    <button id="animesss-close" style="cursor:pointer; padding:10px 15px; border:none; border-radius:10px; background:#b03060; color:white; font-weight:bold; transition:all .15s ease;" onmouseover="this.style.background='#ff8800'; this.style.transform='scale(1.05)';" onmouseout="this.style.background='#b03060'; this.style.transform='scale(1)';">ЗАКРЫТЬ</button>
                </div>
                <h1>📊 Результаты анализа</h1>
                <div id="animesss-results-content">
                    <div style="display:flex; gap:10px; margin-bottom:20px;">
                        ${currentRank ? `<button data-tab="demand">📈 Востребованные</button><button data-tab="trash">🗑 Худшие</button>` : `<button data-tab="best">🔥 Лучшие</button><button data-tab="rare">💎 Редкие</button><button data-tab="demand">📈 Востребованные</button><button data-tab="trash">🗑 Худшие</button>`}
                    </div>
                    <div id="tab-content">${currentRank ? renderGrid(topDemand) : renderGrid(topValue)}</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        setTimeout(() => {
            document.querySelectorAll('#animesss-grid > div').forEach((card, i) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    card.style.transition = 'all .35s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, i * 30);
            });
        }, 10);

        const tabs = currentRank ? { demand: topDemand, trash: topTrash } : { best: topValue, rare: topRare, demand: topDemand, trash: topTrash };
        modal.querySelectorAll('[data-tab]').forEach(btn => {
            btn.style.cssText = "cursor:pointer; padding:8px 16px; border-radius:12px; border:1px solid #444; background:#222; color:white;";
            btn.onclick = () => {
                modal.querySelectorAll('[data-tab]').forEach(other => { other.style.background = ''; other.style.color = ''; other.style.padding = '8px 16px'; });
                btn.style.background = '#ff8800'; btn.style.color = 'white'; btn.style.padding = '12px 22px';
                document.querySelector('#tab-content').innerHTML = renderGrid(tabs[btn.dataset.tab]);
            };
        });

        const firstTab = modal.querySelector('[data-tab]');
        if (firstTab) firstTab.click();

        document.querySelector('#animesss-close').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    }

    /* ==========================================================================================
       !!! РАЗДЕЛИТЕЛЬ: ДАЛЬШЕ ИДЕТ КОД АНАЛИЗАТОРА ПАКОВ !!!
       !!! ВЫДЕЛИТЕ ОТСЮДА И ДО КОНЦА ФАЙЛА, ЧТОБЫ УДАЛИТЬ ЧАСТЬ 2 !!!
       ========================================================================================== */

    function getRankWeight(rank) {
        const weights = { SSS: 5000, ASS: 4000, S: 3000, A: 1200, B: 400, C: 120, D: 40, E: 0 };
        return weights[rank] || 0;
    }

    function clearPackFrames() {
        document.querySelectorAll('.animesss-pack-frame').forEach(frame => {
            const card = frame.cardRef;
            if (card) {
                card.packFrame = null; card.packLabelElement = null; card.packStatsElement = null;
                frame.parentNode.insertBefore(card, frame);
            }
            frame.remove();
        });
    }

    async function initPackAnalyzer() {
        if (window.packAnalyzerBusy) return;
        const cards = [...document.querySelectorAll('.lootbox__card')];
        if (cards.length !== 3) return;

        const packSignature = cards.map(card => card.dataset.id || '').join('-');
        if (!packSignature || packSignature === '--' || window.lastAnalyzedSignature === packSignature) return;

        window.packAnalyzerBusy = true;
        window.lastAnalyzedSignature = packSignature;

        const cardData = [];
        for (const card of cards) {
            const id = card.dataset.id;
            const rank = (card.dataset.rank || '').toUpperCase();
            try {
                const html = await fetchWithRetry(`/cards/users/?id=${id}`);
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const wanted = Number(doc.querySelector('#owners-need')?.textContent || 0);
                const trade = Number(doc.querySelector('#owners-trade')?.textContent || 0);
                const total = Number(doc.querySelector('#owners-count')?.textContent || 0);
                cardData.push({ card, rank, wanted, trade, total });
            } catch (e) {
                cardData.push({ card, rank, wanted: 0, trade: 0, total: 0 });
            }
        }

        cardData.forEach(data => { data.score = getRankWeight(data.rank) + data.wanted; });
        cardData.sort((a, b) => b.score - a.score);

        const labels = ['👑 BEST', '👍 NORMAL', '📦 TRASH'];
        const styles = [
            { bg: 'linear-gradient(135deg, #fff200 0%, #ffcc00 50%, #ffaa00 100%)', glow: '0 0 30px rgba(255, 217, 0, 0.8)', scale: '1.0', border: '2px solid #fff' },
            { bg: 'linear-gradient(135deg, #ffffff 0%, #c0c0c0 50%, #808080 100%)', glow: '0 0 15px rgba(255, 255, 255, 0.4)', scale: '0.95', border: '1px solid #eee' },
            { bg: 'linear-gradient(135deg, #442200 0%, #221100 100%)', glow: 'none', scale: '0.92', border: '1px solid #552200' }
        ];

        for (let i = 0; i < cardData.length; i++) {
            const { card, wanted, trade, total, rank } = cardData[i];
            const style = styles[i];
            const frame = document.createElement('div');
            frame.className = 'animesss-pack-frame';
            frame.style.cssText = `
                display:flex; flex-direction:column; align-items:center; padding:8px; border-radius:20px;
                opacity:0; transform: scale(0.5); transition: opacity .4s cubic-bezier(0.175, 0.885, 0.32, 1.275), transform .4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                background: ${style.bg}; box-shadow: ${style.glow}; border: ${style.border}; z-index: ${10 - i};
            `;

            const label = document.createElement('div');
            label.className = 'animesss-pack-label';
            label.textContent = labels[i];
            label.style.cssText = `width:100%; text-align:center; font-size:22px; font-weight:900; color: ${i === 2 ? '#884422' : '#000'}; padding:4px; text-transform: uppercase; letter-spacing: 1px;`;

            const stats = document.createElement('div');
            stats.className = 'animesss-pack-stats';
            stats.innerHTML = `❤️ ${wanted} &nbsp;&nbsp; 🔄 ${trade} &nbsp;&nbsp; 👥 ${total}`;
            stats.style.cssText = `width:100%; text-align:center; font-size:18px; font-weight:800; color: ${i === 2 ? '#884422' : '#000'}; padding:4px;`;

            card.style.width = '240px'; card.style.borderRadius = '10px';
            frame.cardRef = card; card.packFrame = frame; card.packLabelElement = label; card.packStatsElement = stats;

            const clickHandler = () => { clearPackFrames(); card.removeEventListener('click', clickHandler); };
            card.addEventListener('click', clickHandler);

            card.parentNode.insertBefore(frame, card);
            frame.appendChild(label); frame.appendChild(card); frame.appendChild(stats);

            setTimeout(() => { frame.style.opacity = '1'; frame.style.transform = `scale(${style.scale})`; }, 50 + (i * 100));
        }
        window.packAnalyzerBusy = false;
    }

    function observePackChanges() {
        if (!location.pathname.startsWith('/cards/pack')) return;
        const observer = new MutationObserver((mutations) => {
            const isOurMutation = mutations.some(m => m.target.classList?.contains('animesss-pack-frame') || m.target.closest?.('.animesss-pack-frame'));
            if (isOurMutation) return;

            const cards = document.querySelectorAll('.lootbox__card');
            if (cards.length !== 3) {
                if (document.querySelector('.animesss-pack-frame')) clearPackFrames();
                return;
            }

            const currentSignature = [...cards].map(card => card.dataset.id || '').join('-');
            if (currentSignature !== window.lastObservedSignature) {
                window.lastObservedSignature = currentSignature;
                clearPackFrames();
                if (currentSignature && currentSignature !== '--') {
                    clearTimeout(window.packAnalyzerTimer);
                    window.packAnalyzerTimer = setTimeout(() => { initPackAnalyzer(); }, 800);
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-id'] });
    }

    /* ==========================================================================================
       ИНИЦИАЛИЗАЦИЯ (ENTRY POINT)
       ========================================================================================== */

    if (location.pathname.startsWith('/user/cards/')) {
        createUI();
    } else if (location.pathname.startsWith('/cards/pack/')) {
        observePackChanges();
    }

})();
