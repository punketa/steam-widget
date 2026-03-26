const fs = require('fs');
const https = require('https');

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;

// ⭐ añade esto
const FAVORITE_GAME_ID = '1091500'; // cambia por el que quieras

if (!API_KEY || !STEAM_ID) {
  console.error("API_KEY o STEAM_ID missing");
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

// ⭐ nueva función
async function getGameHeader(appid) {
  try {
    const appData = await get(`https://store.steampowered.com/api/appdetails?appids=${appid}`);
    if (appData[appid]?.success) {
      return await getImageAsBase64(appData[appid].data.header_image);
    }
  } catch (e) {
    console.warn("Error getting game header:", e.message);
  }
  return '';
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
  const realName = player.realname || '';
  const gameCount = games.response?.game_count || 0;
  const steamLevel = level.response?.player_level || 0;
  const isPlaying = !!player.gameextrainfo;

  let avatarBase64 = '';
  if (player.avatarfull) {
    try {
      avatarBase64 = await getImageAsBase64(player.avatarfull);
    } catch (e) {
      console.warn("The avatar could not be obtained:", e.message);
    }
  }

  // ⭐ NUEVA LÓGICA
  let gameHeader = '';
  let favoriteHeader = '';

  if (isPlaying && player.gameid) {
    gameHeader = await getGameHeader(player.gameid);
  }

  favoriteHeader = await getGameHeader(FAVORITE_GAME_ID);

  const miniProfileBase64 = 'data:'; 
  const height = 180;

  let nameColor = '#888888';
  if (player.personastate === 1) {
    nameColor = isPlaying ? '#90ee90' : '#1E90FF';
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

  <image x="0" y="0" width="540" height="${height}" href="${miniProfileBase64}" />
  <rect width="540" height="${height}" rx="16" fill="#000000"/>

  ${avatarBase64 ? `<image x="20" y="20" width="96" height="96" href="${avatarBase64}" />` : ''}
  
  <text x="130" y="45" class="title">${player.personaname || 'Steam User'}</text>

  ${realName ? `<text x="130" y="65" class="label">${realName}</text>` : ''}
  
  <text x="130" y="85" class="subtitle">
    ${isPlaying ? 'Playing :' : 'Currently :'} 
    ${isPlaying ? player.gameextrainfo : (player.personastate === 1 ? 'Online' : 'Offline')}
  </text>

  <circle cx="40" cy="${height - 30}" r="16" fill="#2e8b57" />
  <text x="34" y="${height - 26}" font-family="Segoe UI" font-size="12" fill="#fff">${steamLevel}</text>

  <text x="70" y="${height - 26}" class="count">${gameCount} Games</text>

  <!-- ⭐ HEADER DINÁMICO -->
  ${
    isPlaying && gameHeader
      ? `
        <text x="300" y="15" class="label">Playing</text>
        <image x="300" y="20" width="115" height="96" href="${gameHeader}" />
        
        ${favoriteHeader ? `
          <text x="425" y="15" class="label">Fav</text>
          <image x="425" y="20" width="115" height="96" href="${favoriteHeader}" />
        ` : ''}
      `
      : `
        ${favoriteHeader ? `
          <text x="300" y="15" class="label">Favorite Game</text>
          <image x="300" y="20" width="240" height="96" href="${favoriteHeader}" />
        ` : ''}
      `
  }

</svg>
`.trim();

  fs.writeFileSync('steam-widget.svg', svg);
  console.log("Widget generated successfully");
}

generateSVG();
