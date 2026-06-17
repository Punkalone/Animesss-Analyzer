// ==UserScript==
// @name         Animesss Analyzer
// @namespace    https://github.com/Punkalone
// @version      3.5
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

        .animesss-menu-btn {
            position: absolute;
            top: 5px;
            right: 5px;
            width: 26px;
            height: 26px;
            background: rgba(0,0,0,0.6);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
            font-size: 18px;
            transition: background 0.2s;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .animesss-menu-btn:hover {
            background: rgba(255,136,0,0.8);
        }
        .animesss-menu-popup {
            display: none;
            position: absolute;
            top: 35px;
            right: 5px;
            background: #222;
            border: 1px solid #444;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            z-index: 100;
            overflow: hidden;
            min-width: 140px;
        }
        .animesss-menu-item {
            padding: 10px 14px;
            font-size: 13px;
            color: #eee;
            cursor: pointer;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .animesss-menu-item:hover {
            background: #333;
            color: #ff8800;
        }
        .animesss-new-tag {
            position: absolute;
            top: 10px;
            left: -30px;
            background: #00ff00;
            color: black;
            font-weight: 900;
            font-size: 10px;
            padding: 2px 30px;
            transform: rotate(-45deg);
            box-shadow: 0 0 15px #00ff00;
            text-transform: uppercase;
            z-index: 5;
            pointer-events: none;
            transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .animesss-dup-count {
            position: absolute;
            top: 35px;
            right: 5px;
            width: 26px;
            height: 26px;
            background: rgba(0,0,0,0.8);
            color: #ff4444;
            border: 2px solid #ff4444;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 11px;
            z-index: 9;
            pointer-events: none;
            backdrop-filter: blur(2px);
        }
        #animesss-search {
            background: #222;
            border: 1px solid #444;
            border-radius: 8px;
            color: white;
            padding: 8px 12px;
            font-size: 14px;
            width: 200px;
            outline: none;
            transition: border-color 0.2s;
        }
        #animesss-search:focus {
            border-color: #ff8800;
        }
        @keyframes animesssFlashOrange {
            0% { border-color: #ff8800; box-shadow: 0 0 25px #ff8800; border-width: 3px; }
            100% { border-color: #333; box-shadow: none; border-width: 1px; }
        }
        .animesss-searching-flash {
            animation: animesssFlashOrange 2s ease-out forwards !important;
        }
    `;
    document.head.appendChild(style);

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

        // Запоминаем текущую вкладку, позицию скролла и текст поиска
        const modal = document.querySelector('#animesss-results');
        const scrollPos = modal ? modal.scrollTop : 0;
        const searchInput = document.querySelector('#animesss-search');
        const searchQuery = searchInput ? searchInput.value : '';
        const activeBtn = document.querySelector('#animesss-results [data-tab][style*="background: rgb(255, 136, 0)"]');
        const currentTab = activeBtn ? activeBtn.dataset.tab : null;

        if (window.animesssResults) {
            showResults(window.animesssResults, currentTab);
            const newModal = document.querySelector('#animesss-results');
            if (newModal) {
                newModal.scrollTop = scrollPos;
                const newSearchInput = newModal.querySelector('#animesss-search');
                if (newSearchInput && searchQuery) {
                    newSearchInput.value = searchQuery;
                    // Вызываем поиск вручную, чтобы отфильтровать список
                    newSearchInput.dispatchEvent(new Event('input'));
                }
            }
        }
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
                    allCards.push(cachedCard);
                } else {
                    allCards.push({
                        id,
                        name: card.dataset.name,
                        rank: card.dataset.rank,
                        anime: card.dataset.animeName,
                        image: card.dataset.image || card.querySelector("img")?.src || "",
                        isNewInScan: !savedMap.has(id) // Если ID нет в кэше - значит карта новая
                    });
                }
            });
        }

        const cardsToScan = allCards.filter(card => card.total === undefined || card.wanted === undefined || card.trade === undefined || !card.lastUpdate);

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

    window.animesssLazyUpdate = async (id, element) => {
        const idStr = String(id);
        const statsEl = element.querySelector('.animesss-lazy-stats');
        if (!statsEl) return;

        statsEl.style.opacity = '0.5';
        try {
            const html = await fetchWithRetry(`/cards/users/?id=${idStr}`);
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const total = Number(doc.querySelector('#owners-count')?.textContent || 0);
            const wanted = Number(doc.querySelector('#owners-need')?.textContent || 0);
            const trade = Number(doc.querySelector('#owners-trade')?.textContent || 0);

            // Обновляем данные в глобальном массиве результатов
            if (window.animesssResults) {
                const card = window.animesssResults.find(c => String(c.id) === idStr);
                if (card) {
                    card.total = total; card.wanted = wanted; card.trade = trade; card.lastUpdate = Date.now();
                }
            }

            // Визуальное обновление без перерисовки всей сетки
            statsEl.innerHTML = `<span>❤️ ${wanted}</span> <span>🔄 ${trade}</span> <span>👥 ${total}</span>`;
            statsEl.style.color = '#00ff00';
            setTimeout(() => { statsEl.style.color = ''; statsEl.style.opacity = '1'; }, 1000);
        } catch (e) {
            console.error('Lazy update failed', e);
            statsEl.style.opacity = '1';
        }
    };

    function showResults(cards, activeTabId = null) {
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

        // Архивные ID
        const archivedIds = new Set(JSON.parse(localStorage.getItem('animesss_archived_ids') || '[]'));

        // Разделяем на активные и архивные
        const activeCards = uniqueCards.filter(c => !archivedIds.has(String(c.id)));
        const archiveList = uniqueCards.filter(c => archivedIds.has(String(c.id))).sort((a, b) => b.wanted - a.wanted);

        // Создаем ПОЛНЫЕ отсортированные списки для определения реального места каждой карты
        const fullSortedValue = [...activeCards].sort((a, b) => b.valueScore - a.valueScore);
        const fullSortedRare = [...activeCards].sort((a, b) => b.rareScore - a.rareScore);
        const fullSortedDemand = [...activeCards].sort((a, b) => b.demandScore - a.demandScore);
        const fullSortedTrash = [...activeCards].sort((a, b) => b.trashScore - a.trashScore);

        // Мапы для быстрого поиска места карты в общем списке
        const rankMaps = {
            best: new Map(fullSortedValue.map((c, i) => [String(c.id), i])),
            rare: new Map(fullSortedRare.map((c, i) => [String(c.id), i])),
            demand: new Map(fullSortedDemand.map((c, i) => [String(c.id), i])),
            trash: new Map(fullSortedTrash.map((c, i) => [String(c.id), i])),
            archive: new Map(archiveList.map((c, i) => [String(c.id), i]))
        };

        const topValue = fullSortedValue.slice(0, 50);
        const topRare = fullSortedRare.slice(0, 50);
        const topDemand = fullSortedDemand.slice(0, 50);
        const topTrash = fullSortedTrash.slice(0, 50);

        function renderGrid(list, tabId) {
            const isArchive = tabId === 'archive';
            if (list.length === 0) return `<div style="text-align:center; padding:50px; color:#666; font-size:18px;">${isArchive ? 'Архив пуст' : 'Нет карт для отображения'}</div>`;

            const currentRankMap = rankMaps[tabId] || rankMaps.best;

            return `
                <div id="animesss-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:20px;">
                    ${list.map((card) => {
                        const globalIndex = currentRankMap.get(String(card.id));
                        const i = globalIndex !== undefined ? globalIndex : -1;

                        return `
                        <div style="position:relative; background:#1a1a1a; border:${!isArchive && i === 0 ? '3px solid #FFD700' : !isArchive && i === 1 ? '3px solid #C0C0C0' : !isArchive && i === 2 ? '3px solid #CD7F32' : '1px solid #333'}; border-radius:12px; overflow:hidden; transition:all .2s ease; cursor:pointer; animation-delay:${(i % 50) * 0.03}s; animation:${!isArchive && i === 0 ? 'animesssGlowGold 2.5s infinite' : !isArchive && i === 1 ? 'animesssGlowSilver 2.5s infinite' : !isArchive && i === 2 ? 'animesssGlowBronze 2.5s infinite' : 'none'}; box-shadow:${!isArchive && i === 0 ? '0 0 12px rgba(255,215,0,.35)' : !isArchive && i === 1 ? '0 0 10px rgba(192,192,192,.3)' : !isArchive && i === 2 ? '0 0 10px rgba(205,127,50,.3)' : 'none'};"
                             onmouseover="this.style.transform='scale(1.05)'; const tag = this.querySelector('.animesss-new-tag'); if(tag) { setTimeout(() => { tag.style.opacity='0'; tag.style.transform='rotate(-45deg) scale(0.5)'; setTimeout(() => tag.remove(), 800); }, 1500); } clearTimeout(this.lazyTimer); this.lazyTimer = setTimeout(() => window.animesssLazyUpdate('${card.id}', this), 3000);"
                             onmouseout="this.style.transform='scale(1)'; clearTimeout(this.lazyTimer);"
                             onclick="window.open('/cards/users/?id=${card.id}', '_blank')">

                            ${card.isNewInScan ? '<div class="animesss-new-tag">NEW</div>' : ''}
                            <div class="animesss-menu-btn" onclick="event.stopPropagation(); const p = this.nextElementSibling; document.querySelectorAll('.animesss-menu-popup').forEach(x => {if(x!==p) x.style.display='none'}); p.style.display = p.style.display === 'block' ? 'none' : 'block';">⋮</div>
                            <div class="animesss-menu-popup" onclick="event.stopPropagation();">
                                <div class="animesss-menu-item" onclick="window.animesssToggleArchive('${card.id}')">
                                    ${isArchive ? '📂 Деархивировать' : '📁 Архивировать'}
                                </div>
                            </div>
                            ${card.duplicates > 1 ? `<div class="animesss-dup-count">x${card.duplicates}</div>` : ''}

                            <img src="${card.image}" style="width:100%; display:block;">
                            ${!isArchive && i >= 0 && i < 3 ? `<div style="position:absolute; top:10px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg, ${['#FFD700, #FFA500', '#f0f0f0, #a0a0a0', '#CD7F32, #8B4513'][i]}); color:${i === 2 ? 'white' : 'black'}; font-weight:bold; padding:4px 8px; border-radius:8px; font-size:12px; z-index:5; white-space:nowrap;">${['👑 KING', '⭐ ELITE', '🔥 PRO'][i]}</div>` : ''}
                            <div style="padding:10px; text-align:center;">
                                ${!isArchive ? `<div style="font-weight:bold; margin-bottom:8px; color:gold;">${i >= 0 && i < 3 ? ['🥇 #1', '🥈 #2', '🥉 #3'][i] : `🏆 #${i + 1}`}</div>` : ''}
                                <div class="animesss-lazy-stats" style="display:flex; justify-content:center; gap:12px; font-size:14px; transition: all 0.3s ease;">
                                    <span>❤️ ${card.wanted}</span> <span>🔄 ${card.trade}</span> <span>👥 ${card.total}</span>
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
        modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:9999999; overflow:auto; padding:20px;';

        const currentRank = new URL(location.href).searchParams.get('rank');
        modal.innerHTML = `
            <div style="max-width:1200px; margin:auto; background:#111; color:white; padding:20px; border-radius:15px;">
                <div style="position:fixed; top:20px; right:20px; display:flex; gap:10px; z-index:99999999;">
                    <button id="animesss-close" style="cursor:pointer; padding:10px 15px; border:none; border-radius:10px; background:#b03060; color:white; font-weight:bold; transition:all .15s ease;" onmouseover="this.style.background='#ff8800'; this.style.transform='scale(1.05)';" onmouseout="this.style.background='#b03060'; this.style.transform='scale(1)';">ЗАКРЫТЬ</button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:15px;">
                    <h1>📊 Результаты анализа</h1>
                    <input type="text" id="animesss-search" placeholder="🔍 Поиск (имя или аниме)...">
                </div>
                    <div id="animesss-results-content">
                        <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                            ${currentRank ? `<button data-tab="demand">📈 Востребованные</button><button data-tab="trash">🗑 Худшие</button>` : `<button data-tab="best">🔥 Лучшие</button><button data-tab="rare">💎 Редкие</button><button data-tab="demand">📈 Востребованные</button><button data-tab="trash">🗑 Худшие</button>`}
                            <div style="flex-grow:1;"></div>
                            <button data-tab="archive" style="border-color:#ff8800 !important;">📦 АРХИВ</button>
                        </div>
                        <div id="tab-content">${activeTabId ? '' : (currentRank ? renderGrid(topDemand, 'demand') : renderGrid(topValue, 'best'))}</div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            const searchInput = modal.querySelector('#animesss-search');
            const handleSearch = () => {
                const query = searchInput.value.toLowerCase().trim();
                const activeBtn = modal.querySelector('[data-tab][style*="background: rgb(255, 136, 0)"]');
                if (!activeBtn) return;

                const tabId = activeBtn.dataset.tab;
                const isArchiveTab = tabId === 'archive';

                if (query) {
                    const sourceList = isArchiveTab ? archiveList : activeCards;
                    const filtered = sourceList.filter(card =>
                        card.name.toLowerCase().includes(query) ||
                        card.anime.toLowerCase().includes(query) ||
                        String(card.id).includes(query)
                    );
                    document.querySelector('#tab-content').innerHTML = renderGrid(filtered, tabId);
                } else {
                    document.querySelector('#tab-content').innerHTML = renderGrid(tabs[tabId], tabId);
                }
            };

            searchInput.oninput = () => {
                const query = searchInput.value.toLowerCase().trim();
                const activeBtn = modal.querySelector('[data-tab][style*="background: rgb(255, 136, 0)"]');
                if (!activeBtn) return;

                const tabId = activeBtn.dataset.tab;
                const isArchiveTab = tabId === 'archive';

                if (query) {
                    const sourceList = isArchiveTab ? archiveList : activeCards;
                    const filtered = sourceList.filter(card =>
                        card.name.toLowerCase().includes(query) ||
                        card.anime.toLowerCase().includes(query) ||
                        String(card.id).includes(query)
                    );
                    document.querySelector('#tab-content').innerHTML = renderGrid(filtered, tabId);

                    // Добавляем класс свечения всем найденным картам
                    document.querySelectorAll('#animesss-grid > div').forEach(card => {
                        card.classList.add('animesss-searching-flash');
                    });
                } else {
                    document.querySelector('#tab-content').innerHTML = renderGrid(tabs[tabId], tabId);
                }
            };

            setTimeout(() => {
                const shouldAnimate = !window.animesssHasAnimated;
                document.querySelectorAll('#animesss-grid > div').forEach((card, i) => {
                    if (shouldAnimate) {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        setTimeout(() => {
                            card.style.transition = 'all .35s ease';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, i * 30);
                    } else {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }
                });
                window.animesssHasAnimated = true;
            }, 10);

            const tabs = currentRank ?
                { demand: topDemand, trash: topTrash, archive: archiveList } :
                { best: topValue, rare: topRare, demand: topDemand, trash: topTrash, archive: archiveList };

            modal.querySelectorAll('[data-tab]').forEach(btn => {
                btn.style.cssText = "cursor:pointer; padding:8px 16px; border-radius:12px; border:1px solid #444; background:#222; color:white; transition:all 0.2s;";
                btn.onclick = () => {
                    modal.querySelectorAll('[data-tab]').forEach(other => { other.style.background = ''; other.style.color = ''; other.style.padding = '8px 16px'; });
                    btn.style.background = '#ff8800'; btn.style.color = 'white'; btn.style.padding = '12px 22px';
                    document.querySelector('#tab-content').innerHTML = renderGrid(tabs[btn.dataset.tab], btn.dataset.tab);
                };
            });

            const firstTab = activeTabId ? modal.querySelector(`[data-tab="${activeTabId}"]`) : modal.querySelector('[data-tab]');
            if (firstTab) firstTab.click();

        document.querySelector('#animesss-close').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    }

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

    if (location.pathname.startsWith('/user/cards/')) {
        createUI();
    } else if (location.pathname.startsWith('/cards/pack/')) {
        observePackChanges();
    }

})();
