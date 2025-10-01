// Guess the LTC Bus Route — full game with scoring & unique rounds (uses properties.Name)

const map = L.map('map', { zoomControl: true }).setView([42.9849, -81.2453], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let geojsonData = null;
let routeLayer = null;

// UI elements
const resultEl   = document.getElementById('result');
const scoreEl    = document.getElementById('score');
const progressEl = document.getElementById('progress');
const nextBtn    = document.getElementById('next');
const restartBtn = document.getElementById('restart');

const choiceBtns = [
  document.getElementById('choice1'),
  document.getElementById('choice2'),
  document.getElementById('choice3'),
  document.getElementById('choice4'),
];

// Game state
const GAME = {
  routes: [],        // all features (shuffled)
  index: 0,          // current round idx
  score: 0,          // total score
  attempts: 0,       // attempts in current round
  current: null,     // current feature
};

// Fetch data and init
fetch('data/shapes.geojson')
  .then(r => r.json())
  .then(data => {
    // Keep only features that actually have a Name
    data.features = (data.features || []).filter(f => f?.properties?.Name);
    if (!data.features.length) throw new Error('No routable features with properties.Name found');
    geojsonData = data;
    resetGame();
    startRound();
  })
  .catch(err => {
    console.error("Error loading GeoJSON:", err);
    alert("Failed to load bus route data.");
  });

function resetGame() {
  GAME.routes = shuffle([...geojsonData.features]); // unique, no repeats
  GAME.index = 0;
  GAME.score = 0;
  GAME.attempts = 0;
  updateHUD();
  resultEl.textContent = '';
  resultEl.className = 'result';
  nextBtn.style.display = 'none';
  restartBtn.style.display = 'none';
}

function startRound() {
  // Clear previous layer
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }

  // End-of-game check
  if (GAME.index >= GAME.routes.length) {
    endGame();
    return;
  }

  GAME.attempts = 0;
  resultEl.textContent = '';
  resultEl.className = 'result';

  // Current route (unique — no repeats)
  const correctFeature = GAME.routes[GAME.index];
  GAME.current = correctFeature;

  // Draw it
  routeLayer = L.geoJSON(correctFeature, {
    style: { color: '#3b82f6', weight: 4 }
  }).addTo(map);

  tryFitBounds(routeLayer);

  // Build choices (correct + 3 random others that are not this feature)
  const pool = geojsonData.features.filter(f => f !== correctFeature);
  const distractors = shuffle(pool).slice(0, 3);

  const choices = shuffle([correctFeature, ...distractors]);
  // Bind to buttons
  choiceBtns.forEach((btn, i) => {
    const feature = choices[i];
    const routeName = feature.properties.Name; // ← exact field from your GeoJSON
    btn.textContent = `Route ${routeName}`;
    btn.disabled = false;
    btn.classList.remove('correct', 'wrong');

    btn.onclick = () => handleGuess(btn, routeName, correctFeature.properties.Name);
  });

  // Buttons visibility
  nextBtn.style.display = 'none';
  restartBtn.style.display = 'none';

  // HUD
  updateHUD();
}

function handleGuess(btn, chosen, correct) {
  // Ignore if already finished this round
  if (nextBtn.style.display === 'inline-block') return;

  GAME.attempts += 1;

  if (chosen === correct) {
    const points = pointsForAttempt(GAME.attempts);
    GAME.score += points;

    // Mark correct
    btn.classList.add('correct');
    // Disable all choices
    choiceBtns.forEach(b => b.disabled = true);

    // Message
    resultEl.textContent = `✅ Correct! It was Route ${correct}. +${points} points`;
    resultEl.className = 'result ok';

    // Show Next or Finish
    nextBtn.style.display = 'inline-block';
    nextBtn.textContent = (GAME.index + 1 < GAME.routes.length) ? '➡️ Next Route' : '🏁 Finish';
    nextBtn.onclick = () => {
      GAME.index += 1;
      startRound();
    };

    updateHUD();
  } else {
    // Wrong guess: disable that button, mark red; keep round active
    btn.classList.add('wrong');
    btn.disabled = true;

    const left = 4 - GAME.attempts;
    resultEl.textContent = `❌ Not this one. Try again… (${left} attempt${left === 1 ? '' : 's'} left)`;
    resultEl.className = 'result err';
  }
}

function endGame() {
  // Remove layer
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
  // Disable choices
  choiceBtns.forEach(b => {
    b.disabled = true;
    b.textContent = '';
  });

  resultEl.className = 'result ok';
  resultEl.innerHTML = `🏁 Game over!<br/>Final score: <strong>${GAME.score}</strong> out of <strong>${GAME.routes.length * 10}</strong>`;

  nextBtn.style.display = 'none';
  restartBtn.style.display = 'inline-block';
  restartBtn.onclick = () => {
    resetGame();
    startRound();
  };

  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = GAME.score;
  progressEl.textContent = `${Math.min(GAME.index + 1, GAME.routes.length)} / ${GAME.routes.length}`;
}

function pointsForAttempt(n) {
  // 1st=10, 2nd=7, 3rd=5, 4th=2
  return [10, 7, 5, 2][Math.min(n, 4) - 1] || 0;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function tryFitBounds(layer) {
  try {
    const b = layer.getBounds();
    if (b.isValid()) {
      map.fitBounds(b.pad(0.15));
    }
  } catch (e) {
    // ignore if bounds cannot be computed
  }
}
