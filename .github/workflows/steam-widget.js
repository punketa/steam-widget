// .github/workflows/steam-widget.js - DEBUG COMPLETO
const fs = require('fs');
const https = require('https');
const path = require('path');

console.log("=====================================");
console.log(" STEAM WIDGET - DEBUG INICIADO");
console.log("=====================================");

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;

console.log("API_KEY:", API_KEY ? `OK (${API_KEY.substring(0, 8)}...)` : "FALTA");
console.log("STEAM_ID:", STEAM_ID ? `OK (${STEAM_ID})` : "FALTA");

if (!API_KEY || !STEAM_ID) {
  console.error("ERROR: Falta API_KEY o STEAM_ID");
  process.exit(1);
}

const SUMMARY_URL = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${API_KEY}&steamids=${STEAM_ID}`;
const GAMES_URL = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${API_KEY}&steamid=${STEAM_ID}&include_appinfo=0&include_played_free_games=1`;
const LEVEL_URL = `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${API_KEY}&steamid=${STEAM_ID}`;

function get(url) {
  return new Promise((resolve, reject) => {
    console.log(`\nPETICIÓN → ${url}`);
    https.get(url, { timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        if (res.statusCode !== 200) {
          console.error(`ERROR HTTP: ${res.statusCode}`);
          resolve({});
          return;
        }
        try {
          const json = JSON.parse(data);
          console.log("JSON OK →", JSON.stringify(json).slice(0, 400) + (json.response?.players ? "..." : ""));
          resolve(json);
        } catch (e) {
          console.error("ERROR JSON:", e.message);
          resolve({});
        }
      });
    }).on('error', (err) => {
      console.error("ERROR RED:", err.message);
      reject(err);
    });
  });
}

async function generateSVG() {
  try {
    console.log("\nOBTENIENDO DATOS DE STEAM...");
    const [summary, games, level] = await Promise.all([
      get(SUMMARY_URL).catch(() => ({ response: { players: [] } })),
      get(GAMES_URL).catch(() => ({ response: { game_count: 0 } })),
      get(LEVEL_URL).catch(() => ({ response: { player_level: 0 } }))
    ]);

    const player = summary.response?.players?.[0];
    if (!player || !player.personaname) {
      console.error("ERROR: Jugador no encontrado. Verifica SteamID y API Key.");
      console.error("Respuesta summary:", JSON.stringify(summary));
      fs.writeFileSync('error-summary.json', JSON.stringify(summary, null, 2));
      process.exit(1);
    }

    console.log(`\nJUGADOR ENCONTRADO: ${player.personaname}`);
    console.log(`Avatar: ${player.avatarfull}`);
    console.log(`Juegos: ${games.response?.game_count || 0}`);
    console.log(`Nivel: ${level.response?.player_level || 0}`);
    console.log(`Estado: ${player.personastate === 1 ? 'Online' : 'Offline'}`);
    if (player.gameextrainfo) console.log(`Jugando: ${player.gameextrainfo}`);

    let gameHeader = '';
    if (player.gameextrainfo && player.gameid) {
      const appUrl = `https://store.steampowered.com/api/appdetails?appids=${player.gameid}`;
      const appData = await get(appUrl);
      if (appData[player.gameid]?.success) {
        gameHeader = appData[player.gameid].data.header_image;
        console.log(`Imagen del juego: ${gameHeader}`);
      }
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="${player.gameextrainfo ? '220' : '180'}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0f0f"/><stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>
    <clipPath id="avatarClip"><circle cx="60" cy="60" r="45"/></clipPath>
  </defs>
  <rect width="500" height="${player.gameextrainfo ? '220' : '180'}" fill="url(#bg)" rx="16"/>
  <image href="${player.avatarfull}" x="20" y="20" width="80" height="80" clip-path="url(#avatarClip)"/>
  <circle cx="60" cy="60" r="47" fill="none" stroke="#4CAF50" stroke-width="3"/>
  <text x="120" y="45" font-family="Segoe UI, sans-serif" font-size="20" font-weight="600" fill="#fff">${player.personaname}</text>
  <text x="120" y="70" font-family="Segoe UI" font-size="15" fill="#4CAF50">Nivel ${level.response?.player_level || 0} • ${games.response?.game_count || 0} juegos</text>
  <text x="120" y="95" font-family="Segoe UI" font-size="14" fill="#66ff66">${player.gameextrainfo ? 'Jugando ' + player.gameextrainfo : (player.personastate === 1 ? 'Online' : 'Offline')}</text>
  ${gameHeader ? `<image href="${gameHeader}" x="20" y="120" width="460" height="80" preserveAspectRatio="xMidYMid slice"/>` : ''}
  <circle cx="460" cy="40" r="12" fill="#00bfff"/><text x="475" y="46" font-family="Segoe UI" font-size="14" fill="#fff" font-weight="bold">S</text>
</svg>`;

    const output = path.join(process.cwd(), 'steam-widget.svg');
    fs.writeFileSync(output, svg.trim());
    console.log(`\nSVG GUARDADO EN: ${output}`);
    console.log("=====================================");
    console.log(" WIDGET GENERADO CORRECTAMENTE");
    console.log("=====================================");
  } catch (err) {
    console.error("ERROR FATAL:", err);
    process.exit(1);
  }
}

generateSVG();
