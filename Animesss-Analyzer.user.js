// ==UserScript==
// @name         Animesss Analyzer
// @namespace    https://github.com/Punkalone
// @version      3.6
// @description  Animesss card analyzer
// @author       Punkalone
// @match        *://animesss.com/*
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
        .animesss-stat-filter {
            background: #222;
            border: 1px solid #444;
            border-radius: 8px;
            color: white;
            padding: 8px;
            font-size: 14px;
            width: 70px;
            outline: none;
            transition: border-color 0.2s;
            text-align: center;
        }
        .animesss-stat-filter:focus {
            border-color: #ff8800;
        }
        /* Убираем стрелочки у input type=number */
        .animesss-stat-filter::-webkit-inner-spin-button,
        .animesss-stat-filter::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
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
        const fWanted = document.querySelector('#filter-wanted');
        const fTrade = document.querySelector('#filter-trade');
        const fTotal = document.querySelector('#filter-total');

        const searchQuery = searchInput ? searchInput.value : '';
        const valWanted = fWanted ? fWanted.value : '';
        const valTrade = fTrade ? fTrade.value : '';
        const valTotal = fTotal ? fTotal.value : '';

        const getActiveBtnGlobal = () => Array.from(document.querySelectorAll('#animesss-results [data-tab]')).find(b => b.style.padding.includes('12px'));
        const activeBtn = getActiveBtnGlobal();
        const currentTab = activeBtn ? activeBtn.dataset.tab : null;

        if (window.animesssResults) {
            showResults(window.animesssResults, currentTab);
            const newModal = document.querySelector('#animesss-results');
            if (newModal) {
                newModal.scrollTop = scrollPos;

                // Восстанавливаем значения в полях
                const newSearch = newModal.querySelector('#animesss-search');
                const newWanted = newModal.querySelector('#filter-wanted');
                const newTrade = newModal.querySelector('#filter-trade');
                const newTotal = newModal.querySelector('#filter-total');

                if (newSearch) newSearch.value = searchQuery;
                if (newWanted) newWanted.value = valWanted;
                if (newTrade) newTrade.value = valTrade;
                if (newTotal) newTotal.value = valTotal;

                // Применяем фильтрацию (вызываем oninput одного из полей, так как applyFilters общая)
                if (newSearch) newSearch.dispatchEvent(new Event('input'));
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
        const params = new URL(location.href).searchParams;
        const currentRank = params.get('rank');
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
        const cacheKey = `animesss_scan_${username}_all`;
        const allCache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const savedMap = new Map(allCache.map(card => [String(card.id), card]));

        const scanStartTime = Date.now();

        for (let page = 1; page <= maxPages; page++) {
            document.querySelector('#animesss-status').textContent = `Страница ${page}/${maxPages}`;
            const html = await fetchWithRetry(rank ? `/user/cards/?name=${username}&rank=${rank}&page=${page}` : `/user/cards/?name=${username}&page=${page}`);
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const cards = [...doc.querySelectorAll('.anime-cards__item')];

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
                        isNewInScan: !savedMap.has(id)
                    });
                }
            });
        }

        const cardsToScan = allCards.filter(card => card.total === undefined || card.wanted === undefined || card.trade === undefined || !card.lastUpdate);

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
            document.querySelector('#animesss-percent').textContent = `${completed}/${cardsToScan.length} (${percent}%)`;

            const elapsed = Date.now() - scanStartTime;
            const avgTime = elapsed / completed;
            const remainingSec = Math.floor((cardsToScan.length - completed) * avgTime / 1000);
            const timeElement = document.querySelector('#animesss-time');
            if (timeElement) {
                timeElement.textContent = remainingSec > 60 ? `⏱ ${Math.floor(remainingSec / 60)}м ${remainingSec % 60}с` : `⏱ ${remainingSec}с`;
            }
            await sleep(700);
        }

        window.animesssResults = allCards;
        allCards.forEach(card => savedMap.set(String(card.id), card));
        localStorage.setItem(cacheKey, JSON.stringify([...savedMap.values()]));

        document.querySelector('#animesss-status').textContent = 'Сканирование завершено 🔥';
        setTimeout(() => { document.querySelector('#animesss-progress-box').style.display = 'none'; }, 1500);
        showResults(allCards);
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
            if (window.animesssResults) {
                const card = window.animesssResults.find(c => String(c.id) === idStr);
                if (card) { card.total = total; card.wanted = wanted; card.trade = trade; card.lastUpdate = Date.now(); }
            }
            statsEl.innerHTML = `<span>❤️ ${wanted}</span> <span>🔄 ${trade}</span> <span>👥 ${total}</span>`;
            statsEl.style.color = '#00ff00';
            setTimeout(() => { statsEl.style.color = ''; statsEl.style.opacity = '1'; }, 1000);
        } catch (e) { statsEl.style.opacity = '1'; }
    };

    window.animesssClearNewTag = (id, element) => {
        const tag = element.querySelector('.animesss-new-tag');
        if (!tag || element.animesssNewTimer) return;
        element.animesssNewTimer = setTimeout(() => {
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
        }, 500);
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
            if (list.length === 0) return `<div style="text-align:center; padding:50px; color:#666; font-size:18px;">${isArchive ? 'Архив пуст' : isNewTab ? 'Новых карт нет' : 'Нет карт для отображения'}</div>`;

            const currentRankMap = rankMaps[tabId] || rankMaps.best;
            return `
                <div id="animesss-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:20px;">
                    ${list.map((card) => {
                        const globalIndex = currentRankMap.get(String(card.id));
                        const i = globalIndex !== undefined ? globalIndex : -1;
                        return `
                        <div style="position:relative; background:#1a1a1a; border:${!isArchive && !isNewTab && i === 0 ? '3px solid #FFD700' : !isArchive && !isNewTab && i === 1 ? '3px solid #C0C0C0' : !isArchive && !isNewTab && i === 2 ? '3px solid #CD7F32' : '1px solid #333'}; border-radius:12px; overflow:hidden; transition:all .2s ease; cursor:pointer; animation-delay:${(i % 50) * 0.03}s; animation:${!isArchive && !isNewTab && i === 0 ? 'animesssGlowGold 2.5s infinite' : !isArchive && !isNewTab && i === 1 ? 'animesssGlowSilver 2.5s infinite' : !isArchive && !isNewTab && i === 2 ? 'animesssGlowBronze 2.5s infinite' : 'none'}; box-shadow:${!isArchive && !isNewTab && i === 0 ? '0 0 12px rgba(255,215,0,.35)' : !isArchive && !isNewTab && i === 1 ? '0 0 10px rgba(192,192,192,.3)' : !isArchive && !isNewTab && i === 2 ? '0 0 10px rgba(205,127,50,.3)' : 'none'};"
                             onmouseover="this.style.transform='scale(1.05)'; window.animesssClearNewTag('${card.id}', this); clearTimeout(this.lazyTimer); this.lazyTimer = setTimeout(() => window.animesssLazyUpdate('${card.id}', this), 3000);"
                             onmouseout="this.style.transform='scale(1)'; clearTimeout(this.lazyTimer); clearTimeout(this.animesssNewTimer); this.animesssNewTimer = null;"
                             onclick="window.open('/cards/users/?id=${card.id}', '_blank')">
                            ${card.isNewInScan ? '<div class="animesss-new-tag">NEW</div>' : ''}
                            <div class="animesss-menu-btn" onclick="event.stopPropagation(); const p = this.nextElementSibling; document.querySelectorAll('.animesss-menu-popup').forEach(x => {if(x!==p) x.style.display='none'}); p.style.display = p.style.display === 'block' ? 'none' : 'block';">⋮</div>
                            <div class="animesss-menu-popup" onclick="event.stopPropagation();">
                                <div class="animesss-menu-item" onclick="window.animesssToggleArchive('${card.id}')">${isArchive ? '📂 Деархивировать' : '📁 Архивировать'}</div>
                            </div>
                            ${card.duplicates > 1 ? `<div class="animesss-dup-count">x${card.duplicates}</div>` : ''}
                            <img src="${card.image}" style="width:100%; display:block;">
                            ${!isArchive && !isNewTab && i >= 0 && i < 3 ? `<div style="position:absolute; top:10px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg, ${['#FFD700, #FFA500', '#f0f0f0, #a0a0a0', '#CD7F32, #8B4513'][i]}); color:${i === 2 ? 'white' : 'black'}; font-weight:bold; padding:4px 8px; border-radius:8px; font-size:12px; z-index:5; white-space:nowrap;">${['👑 KING', '⭐ ELITE', '🔥 PRO'][i]}</div>` : ''}
                            <div style="padding:10px; text-align:center;">
                                ${!isArchive && !isNewTab ? `<div style="font-weight:bold; margin-bottom:8px; color:gold;">${i >= 0 && i < 3 ? ['🥇 #1', '🥈 #2', '🥉 #3'][i] : `🏆 #${i + 1}`}</div>` : ''}
                                ${isNewTab ? `<div style="font-weight:bold; margin-bottom:8px; color:#00ff00;">✨ НОВАЯ КАРТА</div>` : ''}
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
                    <button id="animesss-close" style="cursor:pointer; padding:10px 15px; border:none; border-radius:10px; background:#b03060; color:white; font-weight:bold; transition:all .15s ease;">ЗАКРЫТЬ</button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:15px;">
                    <h1>📊 Результаты анализа</h1>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span>❤️</span> <input type="number" id="filter-wanted" class="animesss-stat-filter" placeholder="0" min="0">
                        <span>🔄</span> <input type="number" id="filter-trade" class="animesss-stat-filter" placeholder="0" min="0">
                        <span>👥</span> <input type="number" id="filter-total" class="animesss-stat-filter" placeholder="0" min="0">
                        <input type="text" id="animesss-search" placeholder="🔍 Поиск..." style="margin-left:10px;">
                    </div>
                </div>
                <div id="animesss-results-content">
                    <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                        ${currentRank ? `<button data-tab="demand">📈 Востребованные</button><button data-tab="trash">🗑 Худшие</button>` : `<button data-tab="best">🔥 Лучшие</button><button data-tab="rare">💎 Редкие</button><button data-tab="demand">📈 Востребованные</button><button data-tab="trash">🗑 Худшие</button>`}
                        ${newCardsList.length > 0 ? `<button data-tab="new">✨ НОВОЕ</button>` : ''}
                        <div style="flex-grow:1;"></div>
                        <button data-tab="archive" style="border-color:#ff8800 !important;">📦 АРХИВ</button>
                    </div>
                    <div id="tab-content"></div>
                </div>
            </div>`;
        document.body.appendChild(modal);

        const searchInput = modal.querySelector('#animesss-search');
        const fWanted = modal.querySelector('#filter-wanted');
        const fTrade = modal.querySelector('#filter-trade');
        const fTotal = modal.querySelector('#filter-total');
        const getActiveBtn = () => Array.from(modal.querySelectorAll('[data-tab]')).find(b => b.style.padding.includes('12px'));

        const applyFilters = () => {
            const query = searchInput.value.toLowerCase().trim();
            const valWanted = fWanted.value.trim(); const valTrade = fTrade.value.trim(); const valTotal = fTotal.value.trim();
            const maxWanted = valWanted === '' ? Infinity : parseInt(valWanted);
            const maxTrade = valTrade === '' ? Infinity : parseInt(valTrade);
            const maxTotal = valTotal === '' ? Infinity : parseInt(valTotal);
            const activeBtn = getActiveBtn(); if (!activeBtn) return;
            const tabId = activeBtn.dataset.tab;
            const isArchiveTab = tabId === 'archive'; const isNewTab = tabId === 'new';
            let sourceList = isArchiveTab ? archiveList : (isNewTab ? newCardsList : activeCards);
            let filtered = sourceList.filter(card => {
                const ms = !query || card.name.toLowerCase().includes(query) || card.anime.toLowerCase().includes(query) || String(card.id).includes(query);
                const mw = card.wanted <= maxWanted; const mt = card.trade <= maxTrade; const mto = card.total <= maxTotal;
                return ms && mw && mt && mto;
            });
            filtered.sort((a, b) => {
                let gapA = 0, gapB = 0;
                if (valWanted !== '') { gapA += (maxWanted - a.wanted); gapB += (maxWanted - b.wanted); }
                if (valTrade !== '') { gapA += (maxTrade - a.trade); gapB += (maxTrade - b.trade); }
                if (valTotal !== '') { gapA += (maxTotal - a.total); gapB += (maxTotal - b.total); }
                if (gapA !== gapB) return gapA - gapB;
                return b.wanted - a.wanted;
            });
            if (valWanted === '' && valTrade === '' && valTotal === '' && !query) {
                document.querySelector('#tab-content').innerHTML = renderGrid(tabs[tabId], tabId);
            } else {
                document.querySelector('#tab-content').innerHTML = renderGrid(filtered.slice(0, 50), tabId);
            }
            if (query) document.querySelectorAll('#animesss-grid > div').forEach(c => c.classList.add('animesss-searching-flash'));
        };

        searchInput.oninput = applyFilters; fWanted.oninput = applyFilters; fTrade.oninput = applyFilters; fTotal.oninput = applyFilters;
        [fWanted, fTrade, fTotal].forEach(el => el.addEventListener('keydown', e => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }));

        modal.querySelectorAll('[data-tab]').forEach(btn => {
            btn.style.cssText = "cursor:pointer; padding:8px 16px; border-radius:12px; border:1px solid #444; background:#222; color:white; transition:all 0.2s;";
            if (btn.dataset.tab === 'new') { btn.style.background = '#00ff00'; btn.style.color = 'black'; btn.style.borderColor = '#00ff00'; btn.style.fontWeight = 'bold'; }
            btn.onclick = () => {
                modal.querySelectorAll('[data-tab]').forEach(other => {
                    other.style.background = ''; other.style.color = ''; other.style.padding = '8px 16px'; other.style.boxShadow = 'none';
                    if (other.dataset.tab === 'new') { other.style.background = '#00ff00'; other.style.color = 'black'; }
                });
                if (btn.dataset.tab === 'new') { btn.style.background = '#00ff00'; btn.style.color = 'black'; btn.style.boxShadow = '0 0 15px #00ff00'; } else { btn.style.background = '#ff8800'; btn.style.color = 'white'; }
                btn.style.padding = '12px 22px'; applyFilters();
            };
        });

        const firstTab = activeTabId ? modal.querySelector(`[data-tab="${activeTabId}"]`) : modal.querySelector('[data-tab]');
        if (firstTab) firstTab.click();
        document.querySelector('#animesss-close').onclick = () => modal.remove();
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    }

    function getRankWeight(rank) { const weights = { SSS: 5000, ASS: 4000, S: 3000, A: 1200, B: 400, C: 120, D: 40, E: 0 }; return weights[rank] || 0; }
    function clearPackFrames() { document.querySelectorAll('.animesss-pack-frame').forEach(frame => { const card = frame.cardRef; if (card) { card.packFrame = null; frame.parentNode.insertBefore(card, frame); } frame.remove(); }); }

    async function initPackAnalyzer() {
        if (window.packAnalyzerBusy) return;
        const cards = [...document.querySelectorAll('.lootbox__card')]; if (cards.length !== 3) return;
        const packSignature = cards.map(card => card.dataset.id || '').join('-');
        if (!packSignature || packSignature === '--' || window.lastAnalyzedSignature === packSignature) return;
        window.packAnalyzerBusy = true; window.lastAnalyzedSignature = packSignature;
        const cardData = [];
        for (const card of cards) {
            const id = card.dataset.id; const rank = (card.dataset.rank || '').toUpperCase();
            try {
                const html = await fetchWithRetry(`/cards/users/?id=${id}`); const doc = new DOMParser().parseFromString(html, 'text/html');
                const wanted = Number(doc.querySelector('#owners-need')?.textContent || 0); const trade = Number(doc.querySelector('#owners-trade')?.textContent || 0); const total = Number(doc.querySelector('#owners-count')?.textContent || 0);
                cardData.push({ card, rank, wanted, trade, total });
            } catch (e) { cardData.push({ card, rank, wanted: 0, trade: 0, total: 0 }); }
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
            const { card, wanted, trade, total } = cardData[i]; const style = styles[i];
            const frame = document.createElement('div'); frame.className = 'animesss-pack-frame';
            frame.style.cssText = `display:flex; flex-direction:column; align-items:center; padding:8px; border-radius:20px; background: ${style.bg}; box-shadow: ${style.glow}; border: ${style.border};`;
            const label = document.createElement('div'); label.textContent = labels[i]; label.style.cssText = `width:100%; text-align:center; font-size:22px; font-weight:900; color: ${i === 2 ? '#884422' : '#000'}; padding:4px;`;
            const stats = document.createElement('div'); stats.innerHTML = `❤️ ${wanted} &nbsp;&nbsp; 🔄 ${trade} &nbsp;&nbsp; 👥 ${total}`; stats.style.cssText = `width:100%; text-align:center; font-size:18px; font-weight:800; color: ${i === 2 ? '#884422' : '#000'}; padding:4px;`;
            card.style.width = '240px'; card.style.borderRadius = '10px'; frame.cardRef = card; card.packFrame = frame;
            const clickHandler = () => { clearPackFrames(); card.removeEventListener('click', clickHandler); }; card.addEventListener('click', clickHandler);
            card.parentNode.insertBefore(frame, card); frame.appendChild(label); frame.appendChild(card); frame.appendChild(stats);
        }
        window.packAnalyzerBusy = false;
    }

    function observePackChanges() {
        if (!location.pathname.startsWith('/cards/pack')) return;
        const observer = new MutationObserver(() => {
            const cards = document.querySelectorAll('.lootbox__card');
            if (cards.length !== 3) { if (document.querySelector('.animesss-pack-frame')) clearPackFrames(); return; }
            const currentSignature = [...cards].map(card => card.dataset.id || '').join('-');
            if (currentSignature !== window.lastObservedSignature) {
                window.lastObservedSignature = currentSignature; clearPackFrames();
                if (currentSignature && currentSignature !== '--') { clearTimeout(window.packAnalyzerTimer); window.packAnalyzerTimer = setTimeout(initPackAnalyzer, 800); }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-id'] });
    }

    function showUpdateNotification() {
        const ver = "3.6";
        const key = `animesss_update_v${ver}_shown`;
        if (localStorage.getItem(key)) return;
        if (!document.body) { setTimeout(showUpdateNotification, 1000); return; }

        const modal = document.createElement('div');
        modal.id = 'animesss-update-notif';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); display:flex; align-items:center; justify-content:center; z-index:10000000; font-family: sans-serif;';
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); border: 2px solid #8a2be2; border-radius: 25px; padding: 40px; max-width: 600px; color: white; box-shadow: 0 0 30px rgba(138, 43, 226, 0.5); animation: animesssCardAppear 0.6s ease;">
                <div style="font-size: 32px; font-weight: 900; margin-bottom: 20px; text-align: center; color: #a64dff;">🌌 НОВЫЙ ГОРИЗОНТ: v${ver}</div>
                <div style="font-size: 18px; line-height: 1.6; margin-bottom: 30px;">
                    <p style="margin-bottom: 15px; color: #dcd0ff;">Привет! Я обновил анализатор, вот что нового:</p>
                    <ul style="list-style: none; padding: 0;">
                        <li style="margin-bottom: 10px;">✨ <b>Вкладка «НОВОЕ»</b> — все новинки в отдельном списке.</li>
                        <li style="margin-bottom: 10px;">📊 <b>Умные фильтры (❤️, 🔄, 👥)</b> — ввод чисел слева от поиска.</li>
                        <li style="margin-bottom: 10px;">🔍 <b>Комбинированный поиск</b> — ищи по нескольким статам сразу.</li>
                        <li style="margin-bottom: 10px;">📂 <b>Анти-сброс архива</b> — фильтры больше не слетают.</li>
                        <li style="margin-bottom: 10px;">🎨 <b>Обновленный UI</b> — новые иконки и фиксы дизайна.</li>
                    </ul>
                </div>
                <button id="animesss-upd-close" style="width: 100%; padding: 15px; border: none; border-radius: 15px; background: #8a2be2; color: white; font-weight: bold; font-size: 18px; cursor: pointer; transition: all 0.3s;">ПОЕХАЛИ! 🚀</button>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#animesss-upd-close').onclick = () => { modal.remove(); localStorage.setItem(key, 'true'); };
    }

    if (location.pathname.startsWith('/user/cards/')) { createUI(); }
    else if (location.pathname.startsWith('/cards/pack/')) { observePackChanges(); }
    setTimeout(showUpdateNotification, 500);
})();
