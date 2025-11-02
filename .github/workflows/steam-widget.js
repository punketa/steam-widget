const fs = require('fs');
const https = require('https');

const API_KEY = process.env.STEAM_API_KEY;
const STEAM_ID = process.env.STEAM_ID;

// Marco decorativo en Base64 (GIF)
const avatarFrame = 'data:image/gif;base64,...TU_GIF_BASE64_AQUÍ...';

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

  let gameHeader = '';
  if (isPlaying && player.gameid) {
    const appData = await get(`https://store.steampowered.com/api/appdetails?appids=${player.gameid}`);
    if (appData[player.gameid]?.success) {
      const imageUrl = appData[player.gameid].data.header_image;
      gameHeader = await getImageAsBase64(imageUrl);
    }
  }

  const height = isPlaying ? 260 : 180;
  const svg = `
<svg width="540" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .title { font-family: 'Segoe UI'; font-size: 22px; fill: #90ee90; }
      .subtitle { font-family: 'Segoe UI'; font-size: 16px; fill: #ccc; }
      .label { font-family: 'Segoe UI'; font-size: 14px; fill: #aaa; }
      .count { font-family: 'Segoe UI'; font-size: 14px; fill: #fff; }
    </style>
  </defs>

  <rect width="540" height="${height}" rx="16" fill="#1b1b1b"/>

  <!-- Avatar + Marco -->
  ${player.avatarfull ? `
    <image x="20" y="20" width="64" height="64" href="${player.avatarfull}" />
    <image x="20" y="20" width="64" height="64" href="${avatarFrame}" />
  ` : ''}

  <!-- Nombre -->
  <text x="100" y="40" class="title">${player.personaname || 'Steam User'}</text>

  <!-- Estado -->
  <text x="100" y="65" class="subtitle">${isPlaying ? 'jugando' : 'estado'} ${isPlaying ? player.gameextrainfo : (player.personastate === 1 ? 'Online' : 'Offline')}</text>

  <!-- Nivel -->
  <circle cx="40" cy="${height - 40}" r="20" fill="#2e8b57" />
  <text x="32" y="${height - 36}" font-family="Segoe UI" font-size="14" fill="#fff">${steamLevel}</text>

  <!-- Cantidad de juegos -->
  <text x="70" y="${height - 36}" class="count">${gameCount} juegos</text>

  <!-- Imagen del juego -->
  ${isPlaying && gameHeader ? `<image x="300" y="20" width="220" height="100" href="${gameHeader}" />` : ''}
</svg>
`.trim();

  fs.writeFileSync('steam-widget.svg', svg);
  console.log("✅ Widget generado correctamente");
}

generateSVG();
