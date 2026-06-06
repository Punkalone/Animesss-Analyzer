// ==UserScript==
// @name         Animesss Analyzer
// @namespace    https://github.com/Punkalone
// @version      2.2
// @description  Animesss card analyzer
// @author       Punkalone
// @match        *://animesss.com/user/cards/*
// @grant        none

// @updateURL    https://raw.githubusercontent.com/Punkalone/Animesss-Analyzer/main/Animesss-Analyzer.user.js
// @downloadURL  https://raw.githubusercontent.com/Punkalone/Animesss-Analyzer/main/Animesss-Analyzer.user.js
// ==/UserScript==

(function () {
    'use strict';

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function fetchWithRetry(url, retries = 3) {

        for (let i = 1; i <= retries; i++) {

            try {

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return await response.text();

            } catch (e) {

                console.warn(
                    `Ошибка ${url} | попытка ${i}/${retries}`
                );

                if (i === retries) {
                    throw e;
                }

                await sleep(3000);
            }
        }
    }

    function createUI() {

        if (document.querySelector('#animesss-btn')) {
            return;
        }

        const btn = document.createElement('button');

        btn.id = 'animesss-btn';

        const currentRank =
    new URL(location.href)
    .searchParams.get('rank');

btn.textContent =
    currentRank
    ? `📊 Анализировать ${currentRank.toUpperCase()}`
    : '📊 Анализировать ВСЁ';

        btn.style.position = 'fixed';

const savedPos =
    JSON.parse(
        localStorage.getItem(
            'animesss_btn_pos'
        ) || '{}'
    );

btn.style.left =
    savedPos.left || '20px';

btn.style.top =
    savedPos.top || '20px';
        btn.style.zIndex = '999999';
        btn.style.padding = '10px 20px';
        btn.style.cursor = 'pointer';
        btn.style.transition =
    'transform .15s ease, left .12s ease-out, top .12s ease-out';
        btn.onmouseover = () => {

    btn.style.transform =
        'scale(1.03)';
};

btn.onmouseout = () => {

    btn.style.transform =
        'scale(1)';
};

        const progressBox = document.createElement('div');

progressBox.id = 'animesss-progress-box';

progressBox.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    width: 320px;
    background: #111;
    border: 1px solid #444;
    border-radius: 15px;
    padding: 12px;
    z-index: 999999;
    display: none;
    color: white;
    box-shadow: 0 0 20px rgba(0,0,0,.5);
`;

progressBox.innerHTML = `

<div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    font-weight:bold;
    margin-bottom:10px;
">
    <span>Animesss Analyzer</span>

    <span id="animesss-time">
        ⏱ --
    </span>
</div>

    <div id="animesss-content">

        <div id="animesss-status">
            Ожидание...
        </div>

        <div style="
            width:100%;
            height:20px;
            background:#222;
            margin-top:10px;
            border-radius:10px;
            overflow:hidden;
        ">
            <div id="animesss-bar"
                 style="
                    width:0%;
                    height:100%;
                    background:#a64dff;
                    transition:width .2s;
                 ">
            </div>
        </div>

        <div id="animesss-percent"
             style="
                margin-top:5px;
             ">
            0%
        </div>

    </div>
`;

document.body.appendChild(btn);
       let dragging = false;
let moved = false;

let offsetX = 0;
let offsetY = 0;

btn.addEventListener(
    'mousedown',
    e => {

        dragging = true;
        moved = false;

        offsetX =
            e.clientX -
            btn.offsetLeft;

        offsetY =
            e.clientY -
            btn.offsetTop;
    }
);

document.addEventListener(
    'mousemove',
    e => {

        if (!dragging) {
            return;
        }
        moved = true;

        btn.style.left =
            (e.clientX - offsetX)
            + 'px';

        btn.style.top =
            (e.clientY - offsetY)
            + 'px';
    }
);

document.addEventListener(
    'mouseup',
    () => {

        if (!dragging) {
            return;
        }

        dragging = false;

        localStorage.setItem(
            'animesss_btn_pos',
            JSON.stringify({
                left: btn.style.left,
                top: btn.style.top
            })
        );
    }
);
        btn.addEventListener(
    'click',
    e => {

        if (moved) {

            e.preventDefault();
            e.stopPropagation();

            moved = false;

            return false;
        }
    },
    true
);
document.body.appendChild(progressBox);

        let isOpen = false;

btn.addEventListener('click', async () => {

    const progressBox =
        document.querySelector('#animesss-progress-box');

    const resultWindow =
        document.querySelector('#animesss-results');

    if (window.animesssResults) {

        if (resultWindow) {

            if (
                resultWindow.style.display === 'none'
            ) {

                resultWindow.style.display = 'block';

            } else {

                resultWindow.style.display = 'none';
            }

            return;
        }

        showResults(
            window.animesssResults
        );

        return;
    }

    if (
        progressBox.style.display === 'none'
        ||
        !progressBox.style.display
    ) {

        progressBox.style.display = 'block';

    } else {

        progressBox.style.display = 'none';
    }

    if (!window.animesssScanStarted) {

        window.animesssScanStarted = true;

        await scanCollection();

        btn.textContent =
            '📊 Показать результаты';
    }
});
    }

    async function scanCollection() {

        const progressBox =
            document.querySelector('#animesss-progress-box');

        progressBox.style.display = 'block';

        const username =
            new URL(location.href)
            .searchParams.get('name');
        const rank =
    new URL(location.href)
    .searchParams.get('rank');
        const storageRank =
    rank || 'all';

        document.querySelector('#animesss-status')
            .textContent =
            `Определяю страницы пользователя ${username}`;

        const firstPageHtml =
    await fetchWithRetry(
        rank
        ? `/user/cards/?name=${username}&rank=${rank}`
        : `/user/cards/?name=${username}`
    );

        const firstDoc =
            new DOMParser()
            .parseFromString(firstPageHtml, 'text/html');

        const pageNumbers =
            [...firstDoc.querySelectorAll('a[href*="page="]')]
            .map(a => {
                const m = a.href.match(/page=(\d+)/);
                return m ? Number(m[1]) : 1;
            });

        const maxPages =
            Math.max(1, ...pageNumbers);

        const allCards = [];
        let savedCards =
    JSON.parse(
        localStorage.getItem(
            `animesss_scan_${username}_${storageRank}`
        ) || '[]'
    );

if (
    savedCards.length === 0
    &&
    rank
) {

    const allCardsCache =
        JSON.parse(
            localStorage.getItem(
                `animesss_scan_${username}_all`
            ) || '[]'
        );

    savedCards =
        allCardsCache.filter(
            card =>
                (card.rank || '')
                    .toLowerCase()
                === rank.toLowerCase()
        );

    console.log(
        `Использован общий кэш: ${savedCards.length}`
    );
}

const savedMap =
    new Map(
        savedCards.map(card => [
            String(card.id),
            card
        ])
    );
        let completed = 0;

const scanStartTime = Date.now();

        for (let page = 1; page <= maxPages; page++) {

            document.querySelector('#animesss-status')
                .textContent =
                `Страница ${page}/${maxPages}`;

            const html =
    await fetchWithRetry(
        rank
        ? `/user/cards/?name=${username}&rank=${rank}&page=${page}`
        : `/user/cards/?name=${username}&page=${page}`
    );

            const doc =
                new DOMParser()
                .parseFromString(html, 'text/html');

            const cards =
                [...doc.querySelectorAll('.anime-cards__item')];

            cards.forEach(card => {

    const id =
        String(card.dataset.id);

    if (savedMap.has(id)) {

        allCards.push(
            savedMap.get(id)
        );

        return;
    }

    allCards.push({
        id,
        name: card.dataset.name,
        rank: card.dataset.rank,
        anime: card.dataset.animeName,

        image:
            card.dataset.image ||
            card.querySelector("img")?.src ||
            ""
    });

            });

            await sleep(300);
        }

        console.log(
            `Найдено карт: ${allCards.length}`
        );
const cardsToScan =
    allCards.filter(
        card =>
            card.total === undefined
    );

console.log(
    `Новых карт: ${cardsToScan.length}`
);
        for (let i = 0; i < cardsToScan.length; i++) {

            const card = cardsToScan[i];

            document.querySelector('#animesss-status')
                .textContent =
                `Сканирование ${card.name}`;

            try {

                const html =
                    await fetchWithRetry(
                        `/cards/users/?id=${card.id}`
                    );

                const doc =
                    new DOMParser()
                    .parseFromString(html, 'text/html');

                card.total =
                    Number(
                        doc.querySelector('#owners-count')
                            ?.textContent || 0
                    );

                card.wanted =
                    Number(
                        doc.querySelector('#owners-need')
                            ?.textContent || 0
                    );

                card.trade =
                    Number(
                        doc.querySelector('#owners-trade')
                            ?.textContent || 0
                    );

            } catch (e) {

                card.total = -1;
                card.wanted = -1;
                card.trade = -1;
            }
            completed++;

            const percent =
    Math.floor(
        (completed / allCards.length) * 100
    );

            document.querySelector('#animesss-bar')
                .style.width =
                percent + '%';

            const elapsed =
    Date.now() - scanStartTime;

const avgTime =
    elapsed / completed;

const remaining =
    (allCards.length - completed)
    * avgTime;

const remainingSec =
    Math.floor(
        remaining / 1000
    );

const min =
    Math.floor(
        remainingSec / 60
    );

const sec =
    remainingSec % 60;

document.querySelector(
    '#animesss-percent'
).textContent =
`${completed}/${allCards.length} (${percent}%)`;
            const timeElement =
    document.querySelector('#animesss-time');

if (timeElement) {

    timeElement.textContent =
        remainingSec > 60
        ? `⏱ ${Math.floor(remainingSec / 60)}м ${remainingSec % 60}с`
        : `⏱ ${remainingSec}с`;
}

            await sleep(700);
        }

        window.allCards = allCards;
        window.animesssResults = allCards;

        localStorage.setItem(
    `animesss_scan_${username}_${storageRank}`,
    JSON.stringify(allCards)
);

        document.querySelector('#animesss-status')
            .textContent =
            'Сканирование завершено 🔥';
        setTimeout(() => {

    document.querySelector(
        '#animesss-progress-box'
    ).style.display = 'none';

}, 1500);

        showResults(allCards);

        console.table(allCards);
    }
function showResults(cards) {

    const rankWeight = {
        e: 1,
        d: 2,
        c: 4,
        b: 8,
        a: 16,
        s: 32,
        ass: 64,
        sss: 128
    };

    const enriched = cards.map(card => {

        const rank =
            rankWeight[
                (card.rank || '').toLowerCase()
            ] || 1;

        return {

    ...card,

    // Лучшие:
    // ранг + хотят

    valueScore:
        (rank * 1000) +
        (card.wanted * 10),

    // Редкие:
    // ранг + владельцы

    rareScore:
        (rank * 100000) -
        card.total,

    // Востребованные:
    // только хотят

    demandScore:
        card.wanted,

    // Худшие:
    // низкий ранг + мало желающих

    trashScore:
        ((1000 - rank) * 100) -
        (card.wanted * 10)
};

    });
const currentRank =
    new URL(location.href)
    .searchParams.get('rank');
    const uniqueMap = new Map();

for (const card of enriched) {

    const id = String(card.id);

    if (!uniqueMap.has(id)) {

        uniqueMap.set(id, {
            ...card,
            duplicates: 1
        });

    } else {

        uniqueMap.get(id).duplicates++;
    }
}

const uniqueCards =
    [...uniqueMap.values()];
    const topValue =
        [...uniqueCards]
        .sort((a,b) => b.valueScore - a.valueScore)
        .slice(0,10);

    const topRare =
        [...uniqueCards]
        .sort((a,b) => b.rareScore - a.rareScore)
        .slice(0,10);

    const topDemand =
        [...uniqueCards]
        .sort((a,b) => b.demandScore - a.demandScore)
        .slice(0,10);

    const topTrash =
        [...uniqueCards]
        .sort((a,b) => b.trashScore - a.trashScore)
        .slice(0,10);
    function renderGrid(cards) {

    return `
        <div style="
            display:grid;
            grid-template-columns:
                repeat(auto-fill,minmax(180px,1fr));
            gap:20px;
        ">

            ${cards.map((card,i) => `

                <div style="
    position:relative;
    background:#1a1a1a;

    border:${
        i === 0
        ? '3px solid #FFD700'
        : i === 1
        ? '3px solid #C0C0C0'
        : i === 2
        ? '3px solid #CD7F32'
        : '1px solid #333'
    };

    border-radius:12px;
    overflow:hidden;
    transition:all .2s ease;
    cursor:pointer;

    box-shadow:${
        i === 0
        ? '0 0 25px rgba(255,215,0,.4)'
        : i === 1
        ? '0 0 20px rgba(192,192,192,.3)'
        : i === 2
        ? '0 0 20px rgba(205,127,50,.3)'
        : 'none'
    };
"
onmouseover="
    this.style.transform='scale(1.05)';
    this.style.boxShadow='0 0 20px rgba(255,255,255,.15)';
"
onmouseout="
    this.style.transform='scale(1)';
    this.style.boxShadow='none';
">

                    <img
                        src="${card.image}"
                        style="
                            width:100%;
                            display:block;
                        "
                    >
                    ${
    card.duplicates > 1
    ? `
    <div style="
        position:absolute;
        right:10px;
        bottom:95px;
        background:rgba(0,0,0,.85);
        color:white;
        font-weight:bold;
        font-size:16px;
        padding:4px 10px;
        border-radius:999px;
        border:2px solid #ff4444;
        backdrop-filter:blur(4px);
    ">
        ×${card.duplicates}
    </div>
    `
    : ''
}
                    ${
    i === 0
    ? `
    <div style="
        position:absolute;
        top:10px;
        right:10px;
        background:gold;
        color:black;
        font-weight:bold;
        padding:4px 8px;
        border-radius:8px;
        font-size:12px;
    ">
        👑 KING
    </div>
    `
    : i === 1
    ? `
    <div style="
        position:absolute;
        top:10px;
        right:10px;
        background:silver;
        color:black;
        font-weight:bold;
        padding:4px 8px;
        border-radius:8px;
        font-size:12px;
    ">
        ⭐ ELITE
    </div>
    `
    : i === 2
    ? `
    <div style="
        position:absolute;
        top:10px;
        right:10px;
        background:#CD7F32;
        color:white;
        font-weight:bold;
        padding:4px 8px;
        border-radius:8px;
        font-size:12px;
    ">
        🔥 PRO
    </div>
    `
    : ''
}

                    <div style="
    padding:10px;
    text-align:center;
">

    <div style="
        font-weight:bold;
        margin-bottom:8px;
        color:gold;
    ">
        <div>
    ${
        i === 0
        ? '🥇 #1'
        : i === 1
        ? '🥈 #2'
        : i === 2
        ? '🥉 #3'
        : `🏆 #${i + 1}`
    }
</div>
    </div>

    <div style="
        display:flex;
        justify-content:center;
        gap:12px;
        font-size:14px;
    ">
        <span>❤️ ${card.wanted}</span>
        <span>🔄 ${card.trade}</span>
        <span>👥 ${card.total}</span>
    </div>

</div>

                </div>

            `).join("")}

        </div>
    `;
}

    const old =
        document.querySelector('#animesss-results');

    if (old) old.remove();

    const modal =
        document.createElement('div');

    modal.id = 'animesss-results';

    modal.style.cssText = `
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.8);
        z-index:9999999;
        overflow:auto;
        padding:20px;
    `;

    function renderList(title, list) {

        return `
            <h2>${title}</h2>

            ${list.map((card,i) => `
                <div style="
                    margin-bottom:8px;
                    padding:8px;
                    border-bottom:1px solid #333;
                ">
                    <b>${i+1}. ${card.name}</b>
                    [${card.rank.toUpperCase()}]

                    <br>

                    ❤️ Хотят: ${card.wanted}
                    |
                    🔄 Отдают: ${card.trade}
                    |
                    👥 Всего: ${card.total}
                </div>
            `).join('')}
        `;
    }

    modal.innerHTML = `
        <div style="
            max-width:1200px;
            margin:auto;
            background:#111;
            color:white;
            padding:20px;
            border-radius:15px;
        ">

           <div style="
position:fixed;
top:20px;
right:20px;
display:flex;
gap:10px;
z-index:99999999;
">

<button id="animesss-close"
    style="
        cursor:pointer;
        padding:10px 15px;
        border:none;
        border-radius:10px;
        background:#b03060;
        color:white;
        font-weight:bold;
        transition:all .15s ease;
    "
    onmouseover="
        this.style.background='#ff8800';
        this.style.transform='scale(1.05)';
    "
    onmouseout="
        this.style.background='#b03060';
        this.style.transform='scale(1)';
    "
>
    ЗАКРЫТЬ
</button>

</div>

<h1>📊 Результаты анализа</h1>

<div id="animesss-results-content">

    <div style="
    display:flex;
    gap:10px;
    margin-bottom:20px;
">

${
    currentRank

    ?

    `
    <button data-tab="demand">
        📈 Востребованные
    </button>

    <button data-tab="trash">
        🗑 Худшие
    </button>
    `

    :

    `
    <button
    data-tab="best"
    style="
        cursor:pointer;
        transition:all .15s ease;
    "
    onmouseover="
        this.style.transform='scale(1.03)';
    "
    onmouseout="
        this.style.transform='scale(1)';
    "
>
    🔥 Лучшие
</button>

    <button
    data-tab="rare"

    style="
        cursor:pointer;
        transition:all .15s ease;
    "

    onmouseover="
        this.style.transform='scale(1.03)';
    "

    onmouseout="
        this.style.transform='scale(1)';
    "
>
    💎 Редкие
</button>

    <button
    data-tab="demand"

    style="
        cursor:pointer;
        transition:all .15s ease;
    "

    onmouseover="
        this.style.transform='scale(1.03)';
    "

    onmouseout="
        this.style.transform='scale(1)';
    "
>
    📈 Востребованные
</button>

    <button
    data-tab="trash"

    style="
        cursor:pointer;
        transition:all .15s ease;
    "

    onmouseover="
        this.style.transform='scale(1.03)';
    "

    onmouseout="
        this.style.transform='scale(1)';
    "
>
    🗑 Худшие
</button>
    `
}

</div>

<div id="tab-content">

    ${
    currentRank
    ? renderGrid(topDemand)
    : renderGrid(topValue)
}

</div>
    `

    ;

    document.body.appendChild(modal);
    const tabs = currentRank

? {

    demand: topDemand,
    trash: topTrash
}

: {

    best: topValue,
    rare: topRare,
    demand: topDemand,
    trash: topTrash
};

modal
.querySelectorAll('[data-tab]')
.forEach(btn => {

    btn.onclick = () => {

        document
        .querySelectorAll('[data-tab]')
        .forEach(other => {

            other.style.background = '';
other.style.color = '';
other.style.transform = '';
other.style.padding =
    '8px 16px';
        });

        btn.style.background = '#ff8800';
        btn.style.color = 'white';
        btn.style.padding =
    '12px 22px';
        btn.style.transform = '';
btn.style.padding =
    '12px 22px';

        document
        .querySelector('#tab-content')
        .innerHTML =
        renderGrid(
            tabs[
                btn.dataset.tab
            ]
        );
    };
});
    const firstTab =
    modal.querySelector('[data-tab]');

if (firstTab) {

    firstTab.style.background =
        '#ff8800';

    firstTab.style.color =
        'white';

    firstTab.style.padding =
    '12px 22px';
}

    document
    .querySelector('#animesss-close')
    .onclick = () => modal.remove();

}
    createUI();

})();
