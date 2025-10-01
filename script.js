document.addEventListener('DOMContentLoaded', () => {
    // --- IMPORTANT ---
    // PASTE YOUR GOOGLE APPS SCRIPT URL HERE (แก้ไข: เพิ่มเครื่องหมาย quotes)
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwSPWHYnU9Uf3eKR-w01IdCPbXQbsg9jy64zj_JOf-0eqerUXlxqiMEnCic6k802VjltA/exec'; 
    
    // DOM Elements
    const screens = {
        welcome: document.getElementById('welcome-screen'),
        game: document.getElementById('game-screen'),
        stats: document.getElementById('stats-screen'),
    };
    const nameInput = document.getElementById('name-input');
    const ageInput = document.getElementById('age-input');
    const enterGameBtn = document.getElementById('enter-game-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const timeDisplay = document.getElementById('time-display');
    const scoreDisplay = document.getElementById('score-display');
    const gameGrid = document.getElementById('game-grid');
    const modal = document.getElementById('game-over-modal');
    const modalSummary = document.getElementById('modal-summary');
    const modalReactionTime = document.getElementById('modal-reaction-time');
    const playAgainBtn = document.getElementById('play-again-btn');
    const viewStatsBtn = document.getElementById('view-stats-btn');
    const statsContainer = document.getElementById('stats-container');
    const backToGameBtn = document.getElementById('back-to-game-btn');

    const sounds = {
        start: document.getElementById('start-sound'),
        correct: document.getElementById('correct-sound'),
        end: document.getElementById('end-sound')
    };
    
    // Game State
    let score = 0;
    let timeLeft = 60;
    let gameInterval = null;
    let isActiveGame = false;
    let currentLitHole = -1;
    let reactionTimes = [];
    let lastLitTime = 0;
    let userInfo = { name: '', age: '' };

    // Initialization
    function init() {
        // Show the welcome screen by default
        showScreen('welcome');

        loadUserInfo();
        createGameGrid();
        addEventListeners();
    }

    function createGameGrid() {
        gameGrid.innerHTML = ''; 
        for (let i = 0; i < 8; i++) {
            const hole = document.createElement('div');
            hole.classList.add('mole-hole');
            hole.dataset.index = i;
            gameGrid.appendChild(hole);
        }
    }

    function addEventListeners() {
        enterGameBtn.addEventListener('click', enterGame);
        startGameBtn.addEventListener('click', startGame);
        gameGrid.addEventListener('click', handleHoleClick);
        playAgainBtn.addEventListener('click', resetUI);
        viewStatsBtn.addEventListener('click', showStatsScreen);
        backToGameBtn.addEventListener('click', () => showScreen('game'));
    }

    // --- REVISED FUNCTION ---
    // This now works by adding/removing the .active class
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    function loadUserInfo() {
        const savedName = localStorage.getItem('playerName');
        const savedAge = localStorage.getItem('playerAge');
        if (savedName) nameInput.value = savedName;
        if (savedAge) ageInput.value = savedAge;
    }
    
    function enterGame() {
        userInfo.name = nameInput.value.trim();
        userInfo.age = ageInput.value.trim();
        if (userInfo.name === '' || userInfo.age === '') {
            alert('กรุณากรอกชื่อและอายุ');
            return;
        }
        localStorage.setItem('playerName', userInfo.name);
        localStorage.setItem('playerAge', userInfo.age);
        showScreen('game');
    }

    function startGame() {
        if (isActiveGame) return;
        
        isActiveGame = true;
        score = 0;
        timeLeft = 60;
        reactionTimes = [];
        updateScore(0);
        updateTimer();
        startGameBtn.disabled = true;
        sounds.start.play().catch(e => console.log("Audio play failed:", e));
        
        gameInterval = setInterval(() => {
            timeLeft--;
            updateTimer();
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);

        lightUpRandomHole();
    }

    function endGame() {
        isActiveGame = false;
        clearInterval(gameInterval);
        sounds.end.play().catch(e => console.log("Audio play failed:", e));
        if (currentLitHole !== -1 && gameGrid.children[currentLitHole]) {
             gameGrid.children[currentLitHole].classList.remove('lit');
        }
        currentLitHole = -1;
        
        const avgReactionTime = reactionTimes.length > 0
            ? (reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length / 1000).toFixed(2)
            : 0;

        modalSummary.textContent = `คุณ ${userInfo.name} ได้คะแนน ${score} คะแนน`;
        modalReactionTime.textContent = `Reaction Time เฉลี่ย: ${avgReactionTime} วินาที`;
        modal.classList.add('active'); // Use .active to show modal

        const gameData = {
            timestamp: new Date().toISOString(),
            name: userInfo.name,
            age: userInfo.age,
            points: score,
            reactionTime: parseFloat(avgReactionTime)
        };
        
        saveStatsToLocalStorage(gameData);
        sendDataToBackend(gameData);
    }
    
    function lightUpRandomHole() {
        if (!isActiveGame) return;

        if (currentLitHole !== -1 && gameGrid.children[currentLitHole]) {
            gameGrid.children[currentLitHole].classList.remove('lit');
        }

        let newHole;
        do {
            newHole = Math.floor(Math.random() * 8);
        } while (newHole === currentLitHole);
        
        currentLitHole = newHole;
        gameGrid.children[currentLitHole].classList.add('lit');
        lastLitTime = performance.now();
    }

    function handleHoleClick(e) {
        if (!isActiveGame || !e.target.classList.contains('mole-hole')) return;

        if (parseInt(e.target.dataset.index) === currentLitHole) {
            const reactionTime = performance.now() - lastLitTime;
            reactionTimes.push(reactionTime);
            
            updateScore(score + 1);
            sounds.correct.play().catch(e => console.log("Audio play failed:", e));
            lightUpRandomHole();
        }
    }

    function updateScore(newScore) {
        score = newScore;
        scoreDisplay.textContent = `คะแนน: ${score}`;
    }

    function updateTimer() {
        timeDisplay.textContent = `เวลา: ${timeLeft} วินาที`;
    }
    
    function resetUI() {
        modal.classList.remove('active'); // Use .active to hide modal
        updateScore(0);
        timeLeft = 60;
        updateTimer();
        startGameBtn.disabled = false;
        if (currentLitHole !== -1 && gameGrid.children[currentLitHole]) {
            gameGrid.children[currentLitHole].classList.remove('lit');
        }
        currentLitHole = -1;
    }

    function showStatsScreen() {
        modal.classList.remove('active'); // Use .active to hide modal
        showScreen('stats');
        renderStats();
    }

    function renderStats() {
        const stats = JSON.parse(localStorage.getItem('playerStats')) || [];
        statsContainer.innerHTML = ''; 
        if (stats.length === 0) {
            statsContainer.innerHTML = '<p>ยังไม่มีสถิติการเล่น</p>';
            return;
        }

        const statsList = document.createElement('ul');
        stats.slice().reverse().forEach(stat => {
            const date = new Date(stat.timestamp).toLocaleDateString('th-TH', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const listItem = document.createElement('li');
            listItem.innerHTML = `<strong>วันที่:</strong> ${date} | <strong>คะแนน:</strong> ${stat.points} | <strong>Reaction Time:</strong> ${stat.reactionTime} วิ`;
            statsList.appendChild(listItem);
        });
        statsContainer.appendChild(statsList);
    }

    function saveStatsToLocalStorage(gameData) {
        let stats = JSON.parse(localStorage.getItem('playerStats')) || [];
        stats.push(gameData);
        if (stats.length > 100) {
            stats = stats.slice(stats.length - 100);
        }
        localStorage.setItem('playerStats', JSON.stringify(stats));
    }

   // โค้ดที่แก้ไขแล้ว
function sendDataToBackend(data) {
    // ตรวจสอบว่า URL ยังเป็นค่าเริ่มต้นที่ให้กรอกหรือไม่
    if (SCRIPT_URL === 'YOUR_COPIED_WEB_APP_URL_HERE' || !SCRIPT_URL) {
        console.warn("Google Apps Script URL is not set. Data will not be saved to Google Sheets.");
        return;
    }
    
    // ถ้า URL ถูกต้อง จะทำงานส่วนนี้ต่อ
    fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        cache: 'no-cache',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(data)
    })
    .then(() => console.log('Data sent successfully to Google Sheets.'))
    .catch(error => console.error('Error sending data:', error));
}

