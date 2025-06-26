// scripts.js

const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');
const restartButton = document.getElementById('restart');
const difficultySelect = document.getElementById('difficulty');
const playerNameInput = document.getElementById('player-name');
const soundToggleButton = document.getElementById('sound-toggle');

// Replace with your Discord webhook URL
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1383911900651458630/isCPdgJ1U3DOTkuq9OIQTyTzupGqShPz_vplKjQnbNhOrTl4tbRoVUaZRcbzeZfh3O5u';

// Placeholder images for fallback
const placeholderImages = {
    easy: [
        'https://via.placeholder.com/120x120/007bff/ffffff?text=1',
        'https://via.placeholder.com/120x120/28a745/ffffff?text=2',
        'https://via.placeholder.com/120x120/dc3545/ffffff?text=3',
        'https://via.placeholder.com/120x120/ffc107/000000?text=4'
    ],
    medium: [
        'https://via.placeholder.com/120x120/007bff/ffffff?text=1',
        'https://via.placeholder.com/120x120/28a745/ffffff?text=2',
        'https://via.placeholder.com/120x120/dc3545/ffffff?text=3',
        'https://via.placeholder.com/120x120/ffc107/000000?text=4',
        'https://via.placeholder.com/120x120/6f42c1/ffffff?text=5',
        'https://via.placeholder.com/120x120/fd7e14/ffffff?text=6'
    ],
    hard: [
        'https://via.placeholder.com/120x120/007bff/ffffff?text=1',
        'https://via.placeholder.com/120x120/28a745/ffffff?text=2',
        'https://via.placeholder.com/120x120/dc3545/ffffff?text=3',
        'https://via.placeholder.com/120x120/ffc107/000000?text=4',
        'https://via.placeholder.com/120x120/6f42c1/ffffff?text=5',
        'https://via.placeholder.com/120x120/fd7e14/ffffff?text=6',
        'https://via.placeholder.com/120x120/20c997/ffffff?text=7',
        'https://via.placeholder.com/120x120/e83e8c/ffffff?text=8'
    ]
};

// Check for required DOM elements
function checkDOMElements() {
    if (!gameBoard || !scoreDisplay || !restartButton || !difficultySelect || !playerNameInput || !soundToggleButton) {
        console.error('Required DOM elements are missing');
        return false;
    }
    return true;
}

// Send Discord webhook notification
async function sendDiscordWebhook(message) {
    try {
        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message })
        });
        if (!response.ok) {
            console.error('Failed to send Discord webhook:', response.status);
        } else {
            console.log('Discord webhook sent:', message);
        }
    } catch (error) {
        console.error('Error sending Discord webhook:', error);
    }
}

// Main game setup function
function setupGame() {
    if (!checkDOMElements()) {
        if (document.body) {
            const errorMessage = document.createElement('p');
            errorMessage.textContent = 'Error: Game cannot start due to missing elements.';
            document.body.appendChild(errorMessage);
        }
        return;
    }

    let cards = [];
    let flippedCards = [];
    let score = 0;
    let matchedPairs = 0;
    let isLocked = false;
    let timerInterval = null;
    let isSoundEnabled = true;
    let gameStarted = false;
    let timeLeft = 0;

    const matchSound = new Audio('./audio/match.wav');
    const mismatchSound = new Audio('./audio/mismatch.wav');
    const winSound = new Audio('./audio/win.wav');

    const difficultySettings = {
        easy: {
            totalPairs: 4,
            matchScore: 50,
            mismatchPenalty: 10,
            completionBonus: 100,
            timeLimit: null,
            images: [
                './images/card1.jpg',
                './images/card2.jpg',
                './images/card3.jpg',
                './images/card4.jpg'
            ]
        },
        medium: {
            totalPairs: 6,
            matchScore: 100,
            mismatchPenalty: 20,
            completionBonus: 300,
            timeLimit: null,
            images: [
                './images/card1.jpg',
                './images/card2.jpg',
                './images/card3.jpg',
                './images/card4.jpg',
                './images/card5.jpg',
                './images/card6.jpg'
            ]
        },
        hard: {
            totalPairs: 8,
            matchScore: 150,
            mismatchPenalty: 30,
            completionBonus: 500,
            timeLimit: 60,
            images: [
                './images/card1.jpg',
                './images/card2.jpg',
                './images/card3.jpg',
                './images/card4.jpg',
                './images/card5.jpg',
                './images/card6.jpg',
                './images/card7.jpg',
                './images/card8.jpg'
            ]
        }
    };

    // Toggle sound
    soundToggleButton.addEventListener('click', () => {
        isSoundEnabled = !isSoundEnabled;
        soundToggleButton.textContent = `Sound: ${isSoundEnabled ? 'On' : 'Off'}`;
        soundToggleButton.classList.toggle('sound-off', !isSoundEnabled);
        soundToggleButton.classList.add('click-animate');
        setTimeout(() => soundToggleButton.classList.remove('click-animate'), 200);
    });

    // Enable/disable game based on name
    function updateGameState() {
        const playerName = playerNameInput.value.trim();
        if (playerName && !gameStarted) {
            gameStarted = true;
            restartButton.textContent = 'Restart';
            restartButton.setAttribute('aria-label', 'Restart game');
            initGame();
        } else if (playerName) {
            gameBoard.classList.remove('disabled');
            restartButton.disabled = false;
            difficultySelect.disabled = false;
        } else {
            gameBoard.classList.add('disabled');
            restartButton.disabled = true;
            difficultySelect.disabled = true;
            gameBoard.classList.add('name-required');
        }
    }

    playerNameInput.addEventListener('input', updateGameState);

    function initGame() {
        cards = [];
        flippedCards = [];
        score = 0;
        matchedPairs = 0;
        isLocked = false;
        gameBoard.innerHTML = '<div class="loading">Loading...</div>';
        gameBoard.className = 'game-board ' + difficultySelect.value;
        scoreDisplay.textContent = `Score: ${score}`;

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        const difficulty = difficultySelect.value;
        const { totalPairs, matchScore, mismatchPenalty, timeLimit, completionBonus, images } = difficultySettings[difficulty];

        console.log(`Difficulty: ${difficulty}, Image paths:`, images);
        images.forEach((img, index) => console.log(`Checking image ${index + 1}: ${img}`));

        if (timeLimit) {
            timeLeft = timeLimit;
            scoreDisplay.textContent = `Score: ${score} | Time: ${timeLeft}s`;
            timerInterval = setInterval(() => {
                timeLeft--;
                scoreDisplay.textContent = `Score: ${score} | Time: ${timeLeft}s`;
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    gameBoard.classList.add('disabled');
                    const playerName = playerNameInput.value.trim();
                    sendDiscordWebhook(`Player ${playerName} ran out of time on ${difficulty} difficulty with score: ${score}`);
                    alert(`Time's up! Final Score: ${score}`);
                }
            }, 1000);
        }

        for (let i = 1; i <= totalPairs; i++) {
            const fallbackImage = placeholderImages[difficulty][i - 1];
            cards.push(
                { value: i, id: `card-${i}-a`, image: images[i - 1], fallback: fallbackImage },
                { value: i, id: `card-${i}-b`, image: images[i - 1], fallback: fallbackImage }
            );
        }

        cards = shuffle(cards);

        gameBoard.innerHTML = '';
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.classList.add('card');
            cardElement.setAttribute('tabindex', '0');
            cardElement.setAttribute('role', 'button');
            cardElement.setAttribute('aria-label', `Card ${card.value}`);
            cardElement.innerHTML = `
                <div class="card-inner">
                    <div class="card-front" aria-hidden="true"></div>
                    <div class="card-back" data-value="${card.value}" aria-label="Card ${card.value} image">
                        <img src="${card.image}" alt="Card image ${card.value}" onerror="this.src='${card.fallback}'; console.error('Failed to load image: ${card.image}')">
                    </div>
                </div>
            `;
            cardElement.dataset.value = card.value;
            cardElement.dataset.id = card.id;
            
            // Add both click and touch events for better mobile support
            cardElement.addEventListener('click', (e) => {
                e.preventDefault();
                flipCard(cardElement, card.value, matchScore, mismatchPenalty);
            });
            
            cardElement.addEventListener('touchstart', (e) => {
                e.preventDefault();
                flipCard(cardElement, card.value, matchScore, mismatchPenalty);
            });
            
            cardElement.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    flipCard(cardElement, card.value, matchScore, mismatchPenalty);
                }
            });
            
            gameBoard.appendChild(cardElement);
        });

        console.log('Checking background image: ./images/background.jpg');
        updateGameState();
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function flipCard(cardElement, value, matchScore, mismatchPenalty) {
        if (isLocked || flippedCards.length >= 2 || cardElement.classList.contains('flipped') || cardElement.classList.contains('matched') || !playerNameInput.value.trim()) {
            return;
        }
        cardElement.classList.add('flipped');
        flippedCards.push({ element: cardElement, value });

        if (flippedCards.length === 2) {
            isLocked = true;
            checkMatch(matchScore, mismatchPenalty);
        }
    }

    function checkMatch(matchScore, mismatchPenalty) {
        const [card1, card2] = flippedCards;
        const difficulty = difficultySelect.value;
        const { totalPairs, completionBonus } = difficultySettings[difficulty];

        if (card1.value === card2.value) {
            score += matchScore;
            matchedPairs++;
            card1.element.classList.add('matched', 'match-animate');
            card2.element.classList.add('matched', 'match-animate');
            setTimeout(() => {
                card1.element.classList.remove('match-animate');
                card2.element.classList.remove('match-animate');
            }, 500);
            if (isSoundEnabled) {
                matchSound.play().catch((err) => console.warn('Failed to play match sound:', err));
            }
            if (matchedPairs === totalPairs) {
                score += completionBonus;
                const finalScore = difficultySettings[difficulty].timeLimit
                    ? `Score: ${score} | Time: ${timeLeft}s`
                    : `Score: ${score}`;
                scoreDisplay.textContent = finalScore;
                if (timerInterval) clearInterval(timerInterval);
                if (isSoundEnabled) {
                    winSound.play().catch((err) => console.warn('Failed to play win sound:', err));
                }
                gameBoard.classList.add('win-animate');
                setTimeout(() => {
                    gameBoard.classList.remove('win-animate');
                    const playerName = playerNameInput.value.trim();
                    sendDiscordWebhook(`Player ${playerName} completed ${difficulty} difficulty with score: ${score} (including ${completionBonus} bonus)`);
                    alert(`You won! Final Score: ${score}`);
                    gameBoard.classList.add('disabled');
                }, 1000);
            }
            flippedCards = [];
            isLocked = false;
        } else {
            score = Math.max(0, score - mismatchPenalty);
            card1.element.classList.add('mismatch-animate');
            card2.element.classList.add('mismatch-animate');
            if (isSoundEnabled) {
                mismatchSound.play().catch((err) => console.warn('Failed to play mismatch sound:', err));
            }
            setTimeout(() => {
                card1.element.classList.remove('flipped', 'mismatch-animate');
                card2.element.classList.remove('flipped', 'mismatch-animate');
                flippedCards = [];
                isLocked = false;
            }, 1000);
            const currentScore = difficultySettings[difficulty].timeLimit
                ? `Score: ${score} | Time: ${timeLeft}s`
                : `Score: ${score}`;
            scoreDisplay.textContent = currentScore;
        }
    }

    restartButton.addEventListener('click', () => {
        restartButton.classList.add('click-animate');
        setTimeout(() => restartButton.classList.remove('click-animate'), 200);
        initGame();
    });

    difficultySelect.addEventListener('change', () => {
        difficultySelect.classList.add('click-animate');
        setTimeout(() => difficultySelect.classList.remove('click-animate'), 200);
        if (gameStarted) {
            initGame();
        }
    });

    // Add window resize handler for better mobile responsiveness
    window.addEventListener('resize', () => {
        // Force a reflow to ensure proper sizing
        gameBoard.style.display = 'none';
        gameBoard.offsetHeight; // Trigger reflow
        gameBoard.style.display = 'grid';
    });

    // Initial state: disable game until name is entered
    updateGameState();
}

// Initialize the game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGame);
} else {
    setupGame();
}