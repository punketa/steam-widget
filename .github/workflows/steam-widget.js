const fs = require('fs');
const https = require('https');

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;

if (!API_KEY || !STEAM_ID) {
  console.error("Falta API_KEY o STEAM_ID");
  process.exit(1);
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function getImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const mime = res.headers['content-type'] || 'image/jpeg';
        resolve(`data:${mime};base64,${base64}`);
      });
    }).on('error', reject);
  });
}

async function generateSVG() {
  const SUMMARY_URL = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${STEAM_ID}`;
  const GAMES_URL = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${API_KEY}&steamid=${STEAM_ID}&include_appinfo=0&include_played_free_games=1`;
  const LEVEL_URL = `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${API_KEY}&steamid=${STEAM_ID}`;

  const [summary, games, level] = await Promise.all([
    get(SUMMARY_URL),
    get(GAMES_URL),
    get(LEVEL_URL)
  ]);

  const player = summary.response?.players?.[0] || {};
  const gameCount = games.response?.game_count || 0;
  const steamLevel = level.response?.player_level || 0;
  const isPlaying = !!player.gameextrainfo;

  let avatarBase64 = '';
  if (player.avatarfull) {
    try {
      avatarBase64 = await getImageAsBase64(player.avatarfull);
    } catch (e) {
      console.warn("⚠️ No se pudo obtener el avatar:", e.message);
    }
  }
  
  let gameHeader = '';
  if (isPlaying && player.gameid) {
    const appData = await get(`https://store.steampowered.com/api/appdetails?appids=${player.gameid}`);
    if (appData[player.gameid]?.success) {
      const imageUrl = appData[player.gameid].data.header_image;
      gameHeader = await getImageAsBase64(imageUrl);
    }
  }

const height = isPlaying ? 180 : 160;
  
// Determinar color del nombre según estado
let nameColor = '#888888'; // Gris (Offline)
if (player.personastate === 1) {
  nameColor = isPlaying ? '#90ee90' : '#1E90FF'; // Verde si juega, Azul si online
}
const svg = `
<svg width="540" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font-family: 'Segoe UI'; font-size: 20px; fill: ${nameColor}; }
      .subtitle { font-family: 'Segoe UI'; font-size: 14px; fill: #ccc; }
      .label { font-family: 'Segoe UI'; font-size: 12px; fill: #aaa; }
      .count { font-family: 'Segoe UI'; font-size: 12px; fill: #fff; }
    </style>
  </defs>

  <rect width="540" height="${height}" rx="16" fill="#1b1b1b"/>

  <!-- Avatar -->
  ${avatarBase64 ? `<image x="20" y="20" width="96" height="96" href="${avatarBase64}" />` : ''}
  
  <!-- Name -->
  <text x="130" y="45" class="title">${player.personaname || 'Steam User'}</text>

  <!-- Status -->
  <text x="130" y="70" class="subtitle">${isPlaying ? 'Playing:' : 'Currently:'} ${isPlaying ? player.gameextrainfo : (player.personastate === 1 ? 'Online' : 'Offline')}</text>

  <!-- Level -->
  <circle cx="40" cy="${height - 30}" r="16" fill="#2e8b57" />
  <text x="34" y="${height - 26}" font-family="Segoe UI" font-size="12" fill="#fff">${steamLevel}</text>

  <!-- Games Quantity -->
  <text x="70" y="${height - 26}" class="count">${gameCount} Games</text>

  <!-- Icon 250+ -->
  <image x="160" y="${height - 48}" width="40" height="40" href="data:image/png;base64,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" />

  <!-- Icon 4 -->
  <image x="210" y="${height - 48}" width="40" height="40" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2RpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo0MzcyQzgyQTAyQ0FFMTExOUJEN0RGN0YxOUU5NzQzMiIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo2NENGNTY2QUNDNjIxMUUxOUZGNDhCMEIyNTU0NDhERSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2NENGNTY2OUNDNjIxMUUxOUZGNDhCMEIyNTU0NDhERSIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IFdpbmRvd3MiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0QTcyQzgyQTAyQ0FFMTExOUJEN0RGN0YxOUU5NzQzMiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0MzcyQzgyQTAyQ0FFMTExOUJEN0RGN0YxOUU5NzQzMiIvPiA8L3JkZjpEZXNjcmlwdGlv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" />

  <!-- Game Header -->
  ${isPlaying && gameHeader ? `<image x="320" y="20" width="200" height="80" href="${gameHeader}" />` : ''}
</svg>
`.trim();

  fs.writeFileSync('steam-widget.svg', svg);
  console.log("✅ Widget generado correctamente");
}

generateSVG();
