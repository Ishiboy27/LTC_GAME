const map = L.map('map').setView([42.9849, -81.2453], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let geojsonData = null;
let routeLayer = null;

const resultEl = document.getElementById('result');
const playAgainBtn = document.getElementById('play-again');

// Load the GeoJSON once
fetch('data/shapes.geojson')
  .then(response => response.json())
  .then(data => {
    geojsonData = data;
    startGame(); // Start first round
  })
  .catch(error => {
    console.error("Error loading GeoJSON:", error);
    alert("Failed to load bus route data.");
  });

function startGame() {
  resultEl.textContent = "";
  resultEl.style.color = "black";
  playAgainBtn.style.display = "none";

  // Remove previous layer if exists
  if (routeLayer) {
    map.removeLayer(routeLayer);
  }

  const allRoutes = geojsonData.features;
  const correctFeature = allRoutes[Math.floor(Math.random() * allRoutes.length)];
  const correctRouteName = correctFeature.properties.Name;

  routeLayer = L.geoJSON(correctFeature, {
    style: { color: 'blue', weight: 4 }
  }).addTo(map);

  const otherRoutes = allRoutes
    .filter(f => f !== correctFeature)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);

  const choices = [...otherRoutes, correctFeature].sort(() => 0.5 - Math.random());

  choices.forEach((feature, i) => {
    const btn = document.getElementById(`choice${i + 1}`);
    const routeName = feature.properties.Name;
    btn.textContent = `Route ${routeName}`;
    btn.disabled = false;
    btn.onclick = () => {
      if (routeName === correctRouteName) {
        resultEl.textContent = "✅ Correct!";
        resultEl.style.color = "green";
      } else {
        resultEl.textContent = `❌ Wrong! It was Route ${correctRouteName}`;
        resultEl.style.color = "red";
      }
      // Disable further clicks
      for (let j = 1; j <= 4; j++) {
        document.getElementById(`choice${j}`).disabled = true;
      }
      playAgainBtn.style.display = "inline-block";
    };
  });
}

// Hook up play again button
playAgainBtn.onclick = startGame;
