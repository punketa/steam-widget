// .github/workflows/steam-widget.js - VERSIÓN FINAL (imágenes FIJAS)
const fs = require('fs');
const https = require('https');
const path = require('path');

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;

if (!API_KEY || !STEAM_ID) {
  console.error("ERROR: Falta API_KEY o STEAM_ID");
  process.exit(1);
}

const SUMMARY_URL = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${STEAM_ID}`;
const GAMES_URL = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${API_KEY}&steamid=${STEAM_ID}&include_appinfo=0&include_played_free_games=1`;
const LEVEL_URL = `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${API_KEY}&steamid=${STEAM_ID}`;

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({});
        }
      });
    }).on('error', reject);
  });
}

async function generateSVG() {
  try {
    const [summary, games, level] = await Promise.all([
      get(SUMMARY_URL),
      get(GAMES_URL),
      get(LEVEL_URL)
    ]);

    const player = summary.response?.players?.[0] || {};
    const gameCount = games.response?.game_count || 0;
    const steamLevel = level.response?.player_level || 0;
    const isPlaying = !!player.gameextrainfo;

    let gameHeader = '';
    if (isPlaying && player.gameid) {
      const appUrl = `https://store.steampowered.com/api/appdetails?appids=${player.gameid}`;
      const appData = await get(appUrl);
      if (appData[player.gameid]?.success) {
        gameHeader = appData[player.gameid].data.header_image;
      }
    }

    // SVG SIN CLIPPATH (para que cargue siempre)
    const height = isPlaying ? 220 : 180;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0f0f"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>
  </defs>
  <rect width="500" height="${height}" fill="url(#bg)" rx="16"/>
  
  <!-- Avatar SIN recorte (carga garantizada) -->
  <image href="${player.avatarfull || ''}" x="20" y="20" width="80" height="80" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="60" cy="60" r="40" fill="none" stroke="#4CAF50" stroke-width="3"/>
  
  <!-- Nombre -->
  <text x="120" y="45" font-family="Segoe UI, sans-serif" font-size="20" font-weight="600" fill="#ffffff">${player.personaname || 'Steam User'}</text>
  
  <!-- Nivel y juegos -->
  <text x="120" y="70" font-family="Segoe UI" font-size="15" fill="#4CAF50">
    Nivel ${steamLevel} • ${gameCount} juegos
  </text>
  
  <!-- Status -->
  <text x="120" y="95" font-family="Segoe UI" font-size="14" fill="#66ff66">
    ${isPlaying ? `Jugando ${player.gameextrainfo}` : (player.personastate === 1 ? 'Online' : 'Offline')}
  </text>
  
  <!-- Header del juego (SIN clip, con overlay) -->
  ${isPlaying && gameHeader ? `
    <image href="${gameHeader}" x="20" y="120" width="460" height="80" preserveAspectRatio="xMidYMid slice"/>
    <rect x="20" y="120" width="460" height="80" fill="#00000060" rx="8"/>
    <text x="30" y="185" font-family="Segoe UI" font-size="16" font-weight="600" fill="#ffffff">
      ${player.gameextrainfo}
    </text>
  ` : ''}
  
  <!-- Logo Steam -->
  <circle cx="460" cy="40" r="12" fill="#00bfff"/>
  <text x="475" y="46" font-family="Segoe UI" font-size="14" fill="#fff" font-weight="bold">S</text>
</svg>`.trim();

    fs.writeFileSync('steam-widget.svg', svg);
    console.log("SVG generado con imágenes FIJAS!");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

generateSVG();
