// State Variables
let currentMode = 'SIGNAL';
let isEmergency = false;
let clockInterval;
let aiSimulationInterval;
let autoTradeTaken = false;

// DOM Elements
const timeDisplay = document.getElementById('clock');
const timeWindowDisplay = document.getElementById('time-window');
const marketState = document.getElementById('market-state');
const modeBtns = document.querySelectorAll('.mode-btn');
const emergencyBtn = document.getElementById('emergency-btn');
const terminalBody = document.getElementById('terminal-body');
const authModal = document.getElementById('auth-modal');

// Metrics Elements
const confFill = document.getElementById('confidence-fill');
const confVal = document.getElementById('confidence-val');
const qualFill = document.getElementById('quality-fill');
const qualVal = document.getElementById('quality-val');
const manipFill = document.getElementById('manipulation-fill');
const manipVal = document.getElementById('manipulation-val');
const liqFill = document.getElementById('liquidity-fill');
const liqVal = document.getElementById('liquidity-val');
const actionArea = document.getElementById('action-area');

// Initialization
function init() {
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
    
    // Attach Event Listeners
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn));
    });
    
    emergencyBtn.addEventListener('click', triggerEmergency);
    
    // Start Simulation
    startAISimulation();
    
    logAI("System Diagnostics: NORMAL. Booting analytical core...");
}

// Time Engine
function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
    
    // Check trading window (9 AM to 3 PM)
    const hour = now.getHours();
    if (hour >= 9 && hour < 15) {
        timeWindowDisplay.textContent = "ACTIVE (09:00 - 15:00)";
        timeWindowDisplay.classList.add('positive');
        timeWindowDisplay.classList.remove('danger-text');
    } else {
        timeWindowDisplay.textContent = "CLOSED";
        timeWindowDisplay.classList.remove('positive');
        timeWindowDisplay.classList.add('danger-text');
        
        if(currentMode !== 'DEFENSE' && currentMode !== 'SIGNAL') {
            logAI("[TIME ENGINE] Outside allowed window. Switching to passive observation.", true);
        }
    }
}

// Mode Engine
function switchMode(btn) {
    if(isEmergency) {
        logAI("[ERROR] System in EMERGENCY mode. Cannot switch modes.", true);
        return;
    }
    
    if(btn.classList.contains('locked')) {
        logAI("[AUTH FAILED] Auto Trading is LOCKED. Requires further paper validation.", true);
        return;
    }

    // Remove active from all
    modeBtns.forEach(b => b.classList.remove('active'));
    
    // Set active
    btn.classList.add('active');
    currentMode = btn.dataset.mode;
    
    logAI(`[MASTER CONTROL] Switched to ${currentMode} MODE.`);
    
    // Update Action Area based on mode
    if(currentMode === 'SEMI_AUTO') {
        actionArea.innerHTML = `<div class="standby-msg" style="color: var(--primary);">SCANNING FOR HIGH PROBABILITY SETUP...</div>`;
    } else if (currentMode === 'DEFENSE') {
        actionArea.innerHTML = `<div class="standby-msg" style="color: var(--warning);">CAPITAL DEFENSE PROTOCOL ACTIVE</div>`;
    } else if (currentMode === 'AUTO') {
        if(autoTradeTaken) {
            actionArea.innerHTML = `<div class="standby-msg" style="color: var(--success); font-weight:bold;">DAILY TRADE COMPLETE. PROFIT SECURED.</div>`;
        } else {
            actionArea.innerHTML = `<div class="standby-msg" style="color: var(--primary);">AUTO: WAITING FOR PERFECT SETUP...</div>`;
        }
    } else {
        actionArea.innerHTML = `<div class="standby-msg">AWAITING HIGH PROBABILITY SETUP</div>`;
    }
}

// Emergency Engine
function triggerEmergency() {
    isEmergency = true;
    currentMode = 'EMERGENCY';
    
    // UI Updates
    document.body.style.boxShadow = "inset 0 0 150px rgba(255, 51, 102, 0.4)";
    marketState.textContent = "EMERGENCY HALT";
    marketState.className = "value danger-text pulse";
    
    modeBtns.forEach(b => b.classList.remove('active'));
    
    actionArea.innerHTML = `<div class="standby-msg" style="color: var(--danger); font-weight: bold;">ALL TRADING HALTED</div>`;
    
    // Zero out metrics
    updateMetrics(0, 0, 100, 0);
    
    // Stop Simulation
    clearInterval(aiSimulationInterval);
    
    logAI("[CRITICAL] EMERGENCY STOP ACTIVATED. All pending orders cancelled.", true);
    logAI("[CRITICAL] Auto-trading disabled. Safety protocol engaged.", true);
}

// Terminal Engine
function logAI(message, isSystem = false) {
    const p = document.createElement('p');
    p.className = isSystem ? 'sys-msg' : 'ai-msg';
    p.textContent = message;
    terminalBody.appendChild(p);
    
    // Auto scroll to bottom
    terminalBody.scrollTop = terminalBody.scrollHeight;
    
    // Limit log size
    if(terminalBody.children.length > 50) {
        terminalBody.removeChild(terminalBody.firstChild);
    }
}

// Simulation Engine
function startAISimulation() {
    const aiThoughts = [
        "Analyzing 5m and 15m structural alignment...",
        "Order flow indicates hidden institutional buying at demand zone.",
        "Checking Options Max Pain... PCR is currently elevated.",
        "Retail trap detected on lower timeframe. Avoiding entry.",
        "Liquidity sweep successful. Waiting for displacement.",
        "Volatility index spiking. Adjusting risk parameters.",
        "Smart money accumulating below VWAP.",
        "HFT spoofing detected in order book. Ignoring false signals."
    ];
    
    aiSimulationInterval = setInterval(() => {
        if(isEmergency) return;
        
        // Random thought
        if(Math.random() > 0.4) {
            const thought = aiThoughts[Math.floor(Math.random() * aiThoughts.length)];
            logAI(thought);
        }
        
        // Simulate fluctuating metrics
        const baseConf = 40 + Math.random() * 50;
        const baseQual = 50 + Math.random() * 45;
        const baseManip = Math.random() * 80;
        const baseLiq = 30 + Math.random() * 60;
        
        updateMetrics(baseConf, baseQual, baseManip, baseLiq);
        
        // Random market state
        updateMarketState(baseManip, baseConf);
        
        // Trigger Semi-Auto Modal randomly if in Semi-Auto mode
        if(currentMode === 'SEMI_AUTO' && baseConf > 85 && baseQual > 85 && baseManip < 20) {
            if(Math.random() > 0.8 && !authModal.classList.contains('active')) {
                triggerTradeAuth();
            }
        }
        
        // Auto Trading Logic (1 Profitable Trade Per Day)
        if(currentMode === 'AUTO' && !autoTradeTaken && baseConf > 90 && baseQual > 90 && baseManip < 10) {
            executeAutoTrade();
        }
        
    }, 4500);
}

function updateMetrics(conf, qual, manip, liq) {
    confFill.style.width = `${conf}%`;
    confVal.textContent = `${Math.round(conf)}%`;
    
    qualFill.style.width = `${qual}%`;
    qualVal.textContent = `${Math.round(qual)}%`;
    
    manipFill.style.width = `${manip}%`;
    manipVal.textContent = `${Math.round(manip)}%`;
    if(manip > 60) manipFill.classList.add('danger');
    else manipFill.classList.remove('danger');
    
    liqFill.style.width = `${liq}%`;
    liqVal.textContent = `${Math.round(liq)}%`;
}

function updateMarketState(manip, conf) {
    if(manip > 70) {
        marketState.textContent = "MANIPULATED";
        marketState.className = "value danger-text";
    } else if (conf > 80) {
        marketState.textContent = "TRENDING";
        marketState.className = "value positive";
    } else {
        marketState.textContent = "CHOPPY / SIDEWAYS";
        marketState.className = "value warning";
    }
}

// Semi-Auto Auth Engine
function triggerTradeAuth() {
    logAI("[OPPORTUNITY DETECTED] High probability setup found. Requesting human authorization.", true);
    authModal.classList.add('active');
}

window.authorizeTrade = function() {
    authModal.classList.remove('active');
    logAI("[AUTH GRANTED] Human authorization received. Executing trade...", true);
    logAI("> Entry filled at optimum limit price. Stop loss automated.");
    
    actionArea.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
            <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted)">ACTIVE POSITION:</span>
                <span class="positive">LONG (BUY)</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted)">UNREALIZED P/L:</span>
                <span class="positive pulse" id="unrealized-pl">+$12.50</span>
            </div>
        </div>
    `;
    
    // Simulate trade running
    setTimeout(() => {
        if(!isEmergency) {
            document.getElementById('unrealized-pl').textContent = "+$45.20";
        }
    }, 2000);
    
    setTimeout(() => {
        if(!isEmergency && currentMode === 'SEMI_AUTO') {
            logAI("[EXIT] Target reached. Position closed successfully.", true);
            actionArea.innerHTML = `<div class="standby-msg" style="color: var(--primary);">SCANNING FOR HIGH PROBABILITY SETUP...</div>`;
            
            // Update stats
            document.querySelector('.stat-number.positive').textContent = "+$45.20";
            document.querySelectorAll('.stat-number')[0].textContent = "1";
        }
    }, 5000);
}

window.denyTrade = function() {
    authModal.classList.remove('active');
    logAI("[AUTH DENIED] Trade rejected by human. Returning to observation.", true);
}

// Auto Trade Engine
function executeAutoTrade() {
    autoTradeTaken = true;
    logAI("[AUTO MODE] Perfect setup detected. Executing 1 highly profitable trade of the day...", true);
    logAI("> Entry: Smart Buy at Institutional Level. SL: Auto calculated.");
    
    actionArea.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px; text-align:left;">
            <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted)">AUTO POSITION:</span>
                <span class="positive pulse">LONG (BUY)</span>
            </div>
            <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted)">UNREALIZED P/L:</span>
                <span class="positive pulse" id="auto-unrealized-pl">+$50.00</span>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        if(!isEmergency) {
            document.getElementById('auto-unrealized-pl').textContent = "+$180.50";
            logAI("> Trailing stop loss moved to breakeven + profit.");
        }
    }, 2500);
    
    setTimeout(() => {
        if(!isEmergency && currentMode === 'AUTO') {
            logAI("[AUTO EXIT] Target reached. Profit secured. Daily limit reached.", true);
            actionArea.innerHTML = `<div class="standby-msg" style="color: var(--success); font-weight:bold;">DAILY TRADE COMPLETE. PROFIT SECURED.</div>`;
            
            document.querySelector('.stat-number.positive').textContent = "+$180.50";
            document.querySelectorAll('.stat-number')[0].textContent = "1";
        }
    }, 6000);
}

// Angel One Integration
window.runAngelOneAnalysis = function() {
    logAI("[ANGEL ONE AI] Connecting to Angel One Live Feed...", true);
    setTimeout(() => logAI("[ANGEL ONE AI] Analyzing Order Flow & Options Chain..."), 1000);
    setTimeout(() => {
        logAI("[ANGEL ONE AI] SIGNAL GENERATED: STRONG BUY", true);
        logAI("> Entry: Current Market Price");
        logAI("> Target: +45 Points | Stop Loss: -15 Points");
        
        actionArea.innerHTML = `
            <div style="background: rgba(255, 153, 0, 0.1); padding: 15px; border-radius: 8px; border: 1px solid #ff9900;">
                <h4 style="color: #ff9900; margin-bottom: 10px;">ANGEL ONE SIGNAL</h4>
                <div style="color: #00ff88; font-size: 1.2rem; font-weight: bold; margin-bottom: 5px;">BUY NOW</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">High Conviction Setup</div>
            </div>
        `;
    }, 2500);
}

// Start
init();
