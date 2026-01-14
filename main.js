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

// --- Core Logic ---

class TradeBot {
    constructor(id, name, basePrice, buyThreshold, sellThreshold, quantity) {
        this.id = id;
        this.name = name;
        this.basePrice = parseFloat(basePrice); // Initial reference price
        this.currentPrice = this.basePrice;
        
        // Percentages: -2.0 means drop 2%, 3.5 means rise 3.5%
        this.buyThreshold = parseFloat(buyThreshold); 
        this.sellThreshold = parseFloat(sellThreshold);
        this.quantity = parseInt(quantity);

        this.status = 'waiting'; // waiting -> holding -> sold
        this.buyPrice = 0; // Price at which we bought
    }

    updatePrice(newPrice) {
        this.currentPrice = newPrice;
        this.checkConditions();
    }

    checkConditions() {
        if (this.status === 'waiting') {
            // Check for Buy Condition (Current Price <= Base Price * (1 - threshold/100))
            // Note: buyThreshold is typically negative (e.g. -2)
            // Let's assume user inputs "-2" for a 2% drop.
            const targetBuyPrice = this.basePrice * (1 + (this.buyThreshold / 100));
            
            if (this.currentPrice <= targetBuyPrice) {
                this.executeBuy();
            }
        } else if (this.status === 'holding') {
            // Check for Sell Condition (Current Price >= Buy Price * (1 + threshold/100))
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
        // Reset to waiting? or keep sold? Let's keep sold for this prototype.
        // Optional: Reset to waiting with new base price?
        // this.status = 'waiting'; 
        // this.basePrice = this.currentPrice;
        renderBots();
    }
}

// --- UI Functions ---

function init() {
    loadState();
    renderBots();
    startSimulation();
    
    form.addEventListener('submit', handleFormSubmit);
    toggleSimBtn.addEventListener('click', toggleSimulation);
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('stockName').value;
    const basePrice = document.getElementById('basePrice').value;
    const buyThreshold = document.getElementById('buyThreshold').value;
    const sellThreshold = document.getElementById('sellThreshold').value;
    const quantity = document.getElementById('quantity').value;

    const newBot = new TradeBot(
        Date.now(), 
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
        
        // Calculate change % from base (or buy price if holding)
        const refPrice = bot.status === 'holding' ? bot.buyPrice : bot.basePrice;
        const change = ((bot.currentPrice - refPrice) / refPrice) * 100;
        const changeClass = change > 0 ? 'up' : (change < 0 ? 'down' : '');
        const changeSign = change > 0 ? '+' : '';

        // Status Badge logic
        let statusClass = 'sold';
        let statusText = '완료';
        if (bot.status === 'waiting') { statusClass = 'buying'; statusText = '매수 대기'; }
        if (bot.status === 'holding') { statusClass = 'holding'; statusText = '보유 중'; }

        // Targets
        const targetBuy = Math.floor(bot.basePrice * (1 + (bot.buyThreshold / 100))).toLocaleString();
        const targetSell = bot.status === 'holding' 
            ? Math.floor(bot.buyPrice * (1 + (bot.sellThreshold / 100))).toLocaleString()
            : '-';

        row.innerHTML = `
            <td>${bot.name}</td>
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
    
    // Remove empty log message if present
    const emptyMsg = tradeLog.querySelector('.empty-log');
    if (emptyMsg) emptyMsg.remove();
    
    tradeLog.prepend(li);
}

// --- Simulation Logic ---

function startSimulation() {
    if (state.simulationInterval) clearInterval(state.simulationInterval);
    state.simulationInterval = setInterval(() => {
        if (!state.isSimulationRunning) return;

        state.bots.forEach(bot => {
            if (bot.status === 'sold') return;

            // Random fluctuation between -1.5% and +1.5%
            const fluctuation = (Math.random() - 0.5) * 0.03; 
            const newPrice = bot.currentPrice * (1 + fluctuation);
            bot.updatePrice(newPrice);
        });
        renderBots();
    }, 2000); // Update every 2 seconds
}

function toggleSimulation() {
    state.isSimulationRunning = !state.isSimulationRunning;
    toggleSimBtn.textContent = state.isSimulationRunning ? '시뮬레이션 일시정지' : '시뮬레이션 재개';
    toggleSimBtn.classList.toggle('paused', !state.isSimulationRunning);
}

// --- Persistence ---
function saveState() {
    // Only save config, not current temporary price states strictly
    // For prototype, we verify simple JSON stringify
   // localStorage.setItem('stockBots', JSON.stringify(state.bots));
}

function loadState() {
    // const saved = localStorage.getItem('stockBots');
    // if (saved) {
        // We would need to re-instantiate classes here. 
        // Skipping for simplicity in this turn, fresh start on reload.
    // }
}

// Expose delete function to window for HTML access
window.deleteBot = (id) => {
    state.bots = state.bots.filter(b => b.id !== id);
    renderBots();
};

// Start
init();
