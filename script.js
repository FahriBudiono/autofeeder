/**
 * PetFlow Smart Feeder - Professional Dashboard Logic
 */

let espIp = localStorage.getItem('esp_ip') || '192.168.1.100';
let feedingHistory = JSON.parse(localStorage.getItem('feeding_history')) || [];
let petInfo = JSON.parse(localStorage.getItem('pet_info')) || { name: '', breed: '' };

// UI Elements
const statusIndicator = document.getElementById('status-indicator');
const statusLabel = statusIndicator.querySelector('.label');
const feedBtn = document.getElementById('feed-btn');
const feedStatus = document.getElementById('feed-status');
const saveScheduleBtn = document.getElementById('save-schedule-btn');
const scheduleStatus = document.getElementById('schedule-status');
const ipInput = document.getElementById('esp-ip');
const saveIpBtn = document.getElementById('save-ip-btn');

// Pet Identity Elements
const petNameInput = document.getElementById('pet-name');
const petBreedInput = document.getElementById('pet-breed');
const savePetBtn = document.getElementById('save-pet-btn');
const displayPetName = document.getElementById('display-pet-name');

// Stats Elements
const lastFeedTimeDisplay = document.getElementById('last-feed-time');
const totalFeedsTodayDisplay = document.getElementById('total-feeds-today');

// History Elements
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// Initialize UI
function init() {
    ipInput.value = espIp;
    petNameInput.value = petInfo.name;
    petBreedInput.value = petInfo.breed;
    updatePetDisplay();
    renderHistory();
    updateStats();
    checkStatus();
}

/**
 * Update the pet name in the hero section
 */
function updatePetDisplay() {
    if (petInfo.name) {
        displayPetName.textContent = `Welcome back, ${petInfo.name}!`;
    } else {
        displayPetName.textContent = "Welcome back!";
    }
}

/**
 * Update feeding statistics
 */
function updateStats() {
    if (feedingHistory.length > 0) {
        lastFeedTimeDisplay.textContent = feedingHistory[0].time;
        
        // Count feeds for today
        const today = new Date().toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
        const todayFeeds = feedingHistory.filter(entry => entry.date === today).length;
        totalFeedsTodayDisplay.textContent = todayFeeds;
    } else {
        lastFeedTimeDisplay.textContent = "--:--";
        totalFeedsTodayDisplay.textContent = "0";
    }
}

/**
 * Update the online/offline status of the ESP32
 */
async function checkStatus() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        await fetch(`http://${espIp}/`, { 
            mode: 'no-cors', 
            signal: controller.signal 
        });
        
        statusIndicator.classList.remove('offline');
        statusIndicator.classList.add('online');
        statusLabel.textContent = 'CONNECTED';
    } catch (error) {
        statusIndicator.classList.remove('online');
        statusIndicator.classList.add('offline');
        statusLabel.textContent = 'DISCONNECTED';
    }
}

/**
 * Add an entry to the feeding history
 */
function addHistoryEntry() {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const date = now.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    
    const entry = { time, date, timestamp: now.getTime() };
    feedingHistory.unshift(entry);
    
    if (feedingHistory.length > 50) feedingHistory.pop();
    
    localStorage.setItem('feeding_history', JSON.stringify(feedingHistory));
    renderHistory();
    updateStats();
}

/**
 * Render the history list in the UI
 */
function renderHistory() {
    if (feedingHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-log">No recent activity</div>';
        return;
    }

    historyList.innerHTML = feedingHistory.map(entry => `
        <div class="log-item">
            <div class="log-time">${entry.time}</div>
            <div class="log-date">${entry.date}</div>
        </div>
    `).join('');
}

/**
 * Trigger the manual feed action
 */
async function triggerFeed() {
    feedStatus.textContent = 'Processing request...';
    feedBtn.disabled = true;
    
    try {
        await fetch(`http://${espIp}/feed`);
        addHistoryEntry();
        feedStatus.textContent = 'Food dispensed successfully';
    } catch (error) {
        addHistoryEntry();
        feedStatus.textContent = 'Request sent to device';
    }

    setTimeout(() => {
        feedStatus.textContent = 'System Ready';
        feedBtn.disabled = false;
    }, 3000);
}

/**
 * Save the schedule settings
 */
async function saveSchedule() {
    const j1 = document.getElementById('j1').value;
    const j2 = document.getElementById('j2').value;
    const j3 = document.getElementById('j3').value;

    scheduleStatus.textContent = 'Syncing schedule...';

    const url = `http://${espIp}/set?j1=${j1}&j2=${j2}&j3=${j3}`;

    try {
        await fetch(url);
        scheduleStatus.textContent = 'Schedule synced successfully';
    } catch (error) {
        scheduleStatus.textContent = 'Sync request sent';
    }

    setTimeout(() => {
        scheduleStatus.textContent = '';
    }, 3000);
}

/**
 * Save Pet Identity
 */
savePetBtn.addEventListener('click', () => {
    petInfo = {
        name: petNameInput.value.trim(),
        breed: petBreedInput.value.trim()
    };
    localStorage.setItem('pet_info', JSON.stringify(petInfo));
    updatePetDisplay();
    
    // Visual feedback
    const originalText = savePetBtn.textContent;
    savePetBtn.textContent = "Profile Updated!";
    setTimeout(() => savePetBtn.textContent = originalText, 2000);
});

/**
 * Clear History
 */
clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all activity logs?')) {
        feedingHistory = [];
        localStorage.setItem('feeding_history', JSON.stringify(feedingHistory));
        renderHistory();
        updateStats();
    }
});

/**
 * Update ESP32 IP Address
 */
saveIpBtn.addEventListener('click', () => {
    espIp = ipInput.value.trim();
    localStorage.setItem('esp_ip', espIp);
    checkStatus();
    
    const originalText = saveIpBtn.textContent;
    saveIpBtn.textContent = "Linked";
    setTimeout(() => saveIpBtn.textContent = originalText, 2000);
});

// Event Listeners
feedBtn.addEventListener('click', triggerFeed);
saveScheduleBtn.addEventListener('click', saveSchedule);

// Start app
init();
setInterval(checkStatus, 10000);
