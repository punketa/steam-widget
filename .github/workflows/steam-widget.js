// .github/workflows/steam-widget.js - VERSIÓN DEBUG
const fs = require('fs');
const https = require('https');
const path = require('path');

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;

console.log("=== STEAM WIDGET DEBUG ===");
console.log("API_KEY:", API_KEY ? "OK" : "FALTA");
console.log("STEAM_ID:", STEAM_ID ? STEAM_ID : "FALTA");

if (!API_KEY || !STEAM_ID) {
  console.error("ERROR: Falta API_KEY o STEAM_ID");
  process.exit(1);
}

const SUMMARY_URL = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${STEAM_ID}`;
const GAMES_URL = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${API_KEY}&steamid=${STEAM_ID}&include_appinfo=0`;
const LEVEL_URL = `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${API_KEY}&steamid=${STEAM_ID}`;

function get(url) {
  return new Promise((resolve, reject) => {
    console.log(`\nGET → ${url}`);
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        try {
          const json = JSON.parse(data);
          console.log("RESPUESTA:", JSON.stringify(json).slice(0, 300) + "...");
          resolve(json);
        } catch (e) {
          console.error("ERROR JSON:", e);
          resolve({});
        }
      });
    }).on('error', (err) => {
      console.error("ERROR HTTP:", err.message);
      reject(err);
    });
  });
}

async function generateSVG() {
  try {
    console.log("\nBuscando datos de Steam...");
    const [summary, games, level] = await Promise.all([
      get(SUMMARY_URL),
      get(GAMES_URL),
      get(LEVEL_URL)
    ]);

    const player = summary.response?.players?.[0];
    if (!player) {
      console.error("ERROR: No se encontró el jugador. Verifica SteamID o API Key.");
      process.exit(1);
    }

    console.log(`Jugador: ${player.personaname}`);
    console.log(`Avatar: ${player.avatarfull}`);
    console.log(`Juegos: ${games.response?.game_count || 0}`);
    console.log(`Nivel: ${level.response?.player_level || 0}`);

    const isPlaying = !!player.gameextrainfo;
    const status = isPlaying ? `Jugando ${player.gameextrainfo}` : 
                   player.personastate === 1 ? 'Online' : 'Offline';

    let gameHeader = '';
    if (isPlaying && player.gameid) {
      const appUrl = `https://store.steampowered.com/api/appdetails?appids=${player.gameid}`;
      const appData = await get(appUrl);
      if (appData[player.gameid]?.success) {
        gameHeader = appData[player.gameid].data.header_image;
        console.log(`Header del juego: ${gameHeader}`);
      }
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="${isPlaying ? '220' : '180'}" xmlns="http://www.w3.org/2000/svg">
  <rect width="500" height="${isPlaying ? '220' : '180'}" fill="#111" rx="16"/>
  <image href="${player.avatarfull}" x="20" y="20" width="80" height="80"/>
  <text x="120" y="50" fill="#fff" font-family="Segoe UI" font-size="20" font-weight="600">${player.personaname}</text>
  <text x="120" y="75" fill="#4CAF50" font-size="15">Nivel ${level.response?.player_level || 0} • ${games.response?.game_count || 0} juegos</text>
  <text x="120" y="100" fill="#66ff66" font-size="14">${status}</text>
  ${isPlaying && gameHeader ? `<image href="${gameHeader}" x="20" y="120" width="460" height="80"/>` : ''}
</svg>`.trim();

    fs.writeFileSync('steam-widget.svg', svg);
    console.log("\nSVG GENERADO Y GUARDADO!");
  } catch (err) {
    console.error("ERROR CRÍTICO:", err);
    process.exit(1);
  }
}

generateSVG();
