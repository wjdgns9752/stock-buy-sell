// State Management
const state = {
    bots: [],
    isSimulationRunning: true,
    simulationInterval: null
};

// DOM Elements
const form = document.getElementById('strategy-form');
const botList = document.getElementById('bot-list');
const tradeLog = document.getElementById('trade-log');
const toggleSimBtn = document.getElementById('toggleSim');
const btnSearch = document.getElementById('btn-search');
import { GoogleGenerativeAI } from "@google/generative-ai";

// State Management
const state = {
    bots: [],
    isSimulationRunning: true,
    simulationInterval: null,
    marketData: { risers: [], fallers: [] }
};

// DOM Elements
const form = document.getElementById('strategy-form');
const botList = document.getElementById('bot-list');
const tradeLog = document.getElementById('trade-log');
const toggleSimBtn = document.getElementById('toggleSim');
const btnSearch = document.getElementById('btn-search');
const inputCode = document.getElementById('stockCode');
const btnAnalyze = document.getElementById('btn-analyze');
const aiResultBox = document.getElementById('ai-result');
const aiText = document.getElementById('ai-text');

// --- AI Logic (Gemini) ---
async function analyzeMarketWithGemini() {
    const apiKey = prompt("Gemini API Key를 입력해주세요 (브라우저에 저장됩니다):", localStorage.getItem("gemini_api_key") || "");
    if (!apiKey) return;
    
    localStorage.setItem("gemini_api_key", apiKey);
    
    aiResultBox.style.display = "block";
    aiText.textContent = "시장 데이터를 분석하고 있습니다...";

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using a high-performance model. 
        // Note: 'gemini-3' is not a valid model ID yet. Using 'gemini-1.5-flash' for speed/efficiency.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const risersText = state.marketData.risers.map(i => `${i.nm} (+${i.rate}%)`).join(", ");
        const fallersText = state.marketData.fallers.map(i => `${i.nm} (${i.rate}%)`).join(", ");
        
        const prompt = `
            너는 주식 시장 전문가야. 현재 한국 시장(KOSPI)의 실시간 급등/급락 종목은 다음과 같아.
            
            🔥 급등 Top 5: ${risersText}
            💧 급락 Top 5: ${fallersText}
            
            이 데이터를 바탕으로 현재 시장의 분위기가 어떤지(강세/약세/혼조세), 
            그리고 단타 매매 전략으로 어떤 섹터나 종목에 주목하면 좋을지 3줄 요약으로 간단하고 명확하게 조언해줘.
            말투는 전문적이고 친절하게 해줘.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        aiText.innerHTML = text.replace(/\n/g, "<br>");
        
    } catch (error) {
        console.error("Gemini Error:", error);
        aiText.textContent = "분석 중 오류가 발생했습니다. API Key를 확인하거나 잠시 후 다시 시도해주세요.";
    }
}

btnAnalyze.addEventListener('click', analyzeMarketWithGemini);

// --- Naver Finance API & Chart Logic ---
async function updateMarketDashboard() {
    try {
        const proxyUrl = 'https://corsproxy.io/?';
        const riseUrl = 'https://m.stock.naver.com/api/json/sise/siseListJson.nhn?menu=rise&sosok=0';
        const fallUrl = 'https://m.stock.naver.com/api/json/sise/siseListJson.nhn?menu=fall&sosok=0';

        const [riseRes, fallRes] = await Promise.all([
            fetch(proxyUrl + encodeURIComponent(riseUrl)),
            fetch(proxyUrl + encodeURIComponent(fallUrl))
        ]);

        const riseData = await riseRes.json();
        const fallData = await fallRes.json();

        const topRisers = riseData.result.itemList.slice(0, 5);
        const topFallers = fallData.result.itemList.slice(0, 5);
        
        state.marketData = { risers: topRisers, fallers: topFallers };

        renderMoversList(topRisers, topFallers);
        renderMarketChart(topRisers, topFallers);

    } catch (error) {
        console.error("Failed to fetch market data:", error);
        document.getElementById('top-risers').innerHTML = '<li>데이터 로드 실패</li>';
    }
}

function renderMoversList(risers, fallers) {
    const riseList = document.getElementById('top-risers');
    const fallList = document.getElementById('top-fallers');

    const createItem = (item, isRise) => `
        <li>
            <span>${item.nm}</span>
            <span class="${isRise ? 'up' : 'down'}">
                ${isRise ? '+' : ''}${item.rate}%
            </span>
        </li>
    `;

    riseList.innerHTML = risers.map(item => createItem(item, true)).join('');
    fallList.innerHTML = fallers.map(item => createItem(item, false)).join('');
}

let marketChartInstance = null;

function renderMarketChart(risers, fallers) {
    const ctx = document.getElementById('marketChart').getContext('2d');
    
    // Combine data for chart: Top 3 Risers and Top 3 Fallers
    const chartItems = [...risers.slice(0, 5), ...fallers.slice(0, 5)];
    const labels = chartItems.map(item => item.nm);
    const dataPoints = chartItems.map(item => parseFloat(item.rate));
    const colors = dataPoints.map(val => val >= 0 ? '#ff3d00' : '#3d5afe'); // Red for + (KR), Blue for -

    if (marketChartInstance) {
        marketChartInstance.destroy();
    }

    marketChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '등락률 (%)',
                data: dataPoints,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#333' },
                    ticks: { color: '#a0a0a0' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#a0a0a0' }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + '%';
                        }
                    }
                }
            }
        }
    });
}

// --- API Logic ---
async function fetchStockPrice(symbol) {
    try {
        // Using a CORS proxy to bypass browser restrictions
        const proxyUrl = 'https://corsproxy.io/?';
        const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
        const data = await response.json();
        
        const result = data.chart.result[0];
        const meta = result.meta;
        
        // Extract relevant data
        // For Korean stocks, currency is KRW.
        const price = meta.regularMarketPrice;
        // Attempt to find a readable name if possible, or use symbol
        // Yahoo chart API often returns 'symbol' as the name if detailed profile isn't fetched.
        // We might just use the symbol or a generic name if not available, 
        // but often 'longName' or 'shortName' isn't in the chart meta directly for all symbols.
        // Let's check what we have. meta usually has 'symbol', 'exchangeName', 'instrumentType', 'currency'.
        // We will default name to symbol if not found.
        const name = symbol; 
        
        return { price, name };
    } catch (error) {
        console.error("Failed to fetch stock data:", error);
        alert("주식 정보를 가져오는데 실패했습니다. 올바른 티커(예: 005930.KS)인지 확인해주세요.");
        return null;
    }
}

// --- Core Logic ---

class TradeBot {
    constructor(id, symbol, name, basePrice, buyThreshold, sellThreshold, quantity) {
        this.id = id;
        this.symbol = symbol;
        this.name = name;
        this.basePrice = parseFloat(basePrice);
        this.currentPrice = this.basePrice;
        
        this.buyThreshold = parseFloat(buyThreshold); 
        this.sellThreshold = parseFloat(sellThreshold);
        this.quantity = parseInt(quantity);

        this.status = 'waiting'; 
        this.buyPrice = 0; 
    }

    updatePrice(newPrice) {
        this.currentPrice = newPrice;
        this.checkConditions();
    }

    checkConditions() {
        if (this.status === 'waiting') {
            const targetBuyPrice = this.basePrice * (1 + (this.buyThreshold / 100));
            if (this.currentPrice <= targetBuyPrice) {
                this.executeBuy();
            }
        } else if (this.status === 'holding') {
            const targetSellPrice = this.buyPrice * (1 + (this.sellThreshold / 100));
            if (this.currentPrice >= targetSellPrice) {
                this.executeSell();
            }
        }
    }

    executeBuy() {
        this.status = 'holding';
        this.buyPrice = this.currentPrice;
        addLog(this.name, '매수', this.currentPrice, this.quantity);
        renderBots();
    }

    executeSell() {
        this.status = 'sold';
        addLog(this.name, '매도', this.currentPrice, this.quantity);
        renderBots();
    }
}

// --- UI Functions ---

function init() {
    loadState();
    renderBots();
    startSimulation(); 
    updateMarketDashboard(); // Load market data on startup
    
    form.addEventListener('submit', handleFormSubmit);
    toggleSimBtn.addEventListener('click', toggleSimulation);
    
    // Search Button Handler
    btnSearch.addEventListener('click', async () => {
        const symbol = inputCode.value.trim().toUpperCase();
        if (!symbol) {
            alert("종목 코드를 입력해주세요.");
            return;
        }
        
        btnSearch.textContent = "조회중...";
        const data = await fetchStockPrice(symbol);
        btnSearch.textContent = "조회";
        
        if (data) {
            document.getElementById('stockName').value = data.name; // Currently just symbol, could be improved with another API
            document.getElementById('basePrice').value = data.price;
        }
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const symbol = document.getElementById('stockCode').value.toUpperCase();
    const name = document.getElementById('stockName').value || symbol;
    const basePrice = document.getElementById('basePrice').value;
    const buyThreshold = document.getElementById('buyThreshold').value;
    const sellThreshold = document.getElementById('sellThreshold').value;
    const quantity = document.getElementById('quantity').value;

    const newBot = new TradeBot(
        Date.now(),
        symbol,
        name, 
        basePrice, 
        buyThreshold, 
        sellThreshold, 
        quantity
    );

    state.bots.push(newBot);
    saveState();
    renderBots();
    form.reset();
}

function renderBots() {
    botList.innerHTML = '';
    
    state.bots.forEach(bot => {
        const row = document.createElement('tr');
        
        const refPrice = bot.status === 'holding' ? bot.buyPrice : bot.basePrice;
        const change = ((bot.currentPrice - refPrice) / refPrice) * 100;
        const changeClass = change > 0 ? 'up' : (change < 0 ? 'down' : '');
        const changeSign = change > 0 ? '+' : '';

        let statusClass = 'sold';
        let statusText = '완료';
        if (bot.status === 'waiting') { statusClass = 'buying'; statusText = '매수 대기'; }
        if (bot.status === 'holding') { statusClass = 'holding'; statusText = '보유 중'; }

        const targetBuy = Math.floor(bot.basePrice * (1 + (bot.buyThreshold / 100))).toLocaleString();
        const targetSell = bot.status === 'holding' 
            ? Math.floor(bot.buyPrice * (1 + (bot.sellThreshold / 100))).toLocaleString()
            : '-';

        row.innerHTML = `
            <td>${bot.name} (${bot.symbol})</td>
            <td class="${changeClass}">${Math.floor(bot.currentPrice).toLocaleString()}</td>
            <td class="${changeClass}">${changeSign}${change.toFixed(2)}%</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${targetBuy}</td>
            <td>${targetSell}</td>
            <td><button class="btn-delete" onclick="window.deleteBot(${bot.id})">🗑️</button></td>
        `;
        botList.appendChild(row);
    });
}

function addLog(name, type, price, qty) {
    const li = document.createElement('li');
    li.className = 'log-item';
    const time = new Date().toLocaleTimeString();
    const total = (price * qty).toLocaleString();
    
    li.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-action ${type === '매수' ? 'buy' : 'sell'}">${type}</span>
        ${name} ${qty}주 @ ${Math.floor(price).toLocaleString()}원 (총 ${total}원)
    `;
    
    const emptyMsg = tradeLog.querySelector('.empty-log');
    if (emptyMsg) emptyMsg.remove();
    
    tradeLog.prepend(li);
}

// --- Simulation Logic ---

function startSimulation() {
    if (state.simulationInterval) clearInterval(state.simulationInterval);
    state.simulationInterval = setInterval(async () => {
        if (!state.isSimulationRunning) return;

        // For this demo, we can either continue random simulation OR try to fetch real prices for all bots.
        // Fetching real prices every 2 seconds for many bots might hit API limits.
        // Let's stick to random simulation for the 'active monitoring' visual effect,
        // BUT we could add a button to "Refresh All Prices" later.
        // For now, let's keep the random fluctuation to demonstrate the "trigger" logic 
        // since the market might be closed or not moving fast enough for a demo.
        
        state.bots.forEach(bot => {
            if (bot.status === 'sold') return;

            // Hybrid: 90% chance of random noise, 10% chance (or manual) could be real fetch?
            // Let's stick to pure simulation for the 'auto-trading' demo part 
            // because waiting for real market movements takes too long for user testing.
            const fluctuation = (Math.random() - 0.5) * 0.03; 
            const newPrice = bot.currentPrice * (1 + fluctuation);
            bot.updatePrice(newPrice);
        });
        renderBots();
    }, 2000); 
}

function toggleSimulation() {
    state.isSimulationRunning = !state.isSimulationRunning;
    toggleSimBtn.textContent = state.isSimulationRunning ? '시뮬레이션 일시정지' : '시뮬레이션 재개';
    toggleSimBtn.classList.toggle('paused', !state.isSimulationRunning);
}

// --- Persistence ---
function saveState() {
    // localStorage.setItem('stockBots', JSON.stringify(state.bots));
}

function loadState() {
}

window.deleteBot = (id) => {
    state.bots = state.bots.filter(b => b.id !== id);
    renderBots();
};

init();
