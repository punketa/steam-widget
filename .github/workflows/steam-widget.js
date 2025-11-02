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
      gameHeader = appData[player.gameid].data.header_image;
    }
  }

  const height = isPlaying ? 260 : 180;
  const width = 540; // Aumentamos el ancho para que quepa el avatar

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#111" rx="16"/>
  <text x="20" y="40" font-family="Segoe UI" font-size="20" fill="#fff">${player.personaname || 'Steam User'}</text>
  <text x="20" y="70" font-family="Segoe UI" font-size="16" fill="#aaa">Nivel ${steamLevel} • ${gameCount} juegos</text>
  <text x="20" y="100" font-family="Segoe UI" font-size="16" fill="#aaa">${isPlaying ? 'Jugando ' + player.gameextrainfo : (player.personastate === 1 ? 'Online' : 'Offline')}</text>
  ${player.avatarfull ? `<image x="460" y="20" width="64" height="64" href="${player.avatarfull}" />` : ''}
  ${isPlaying && gameHeader ? `<image x="20" y="130" width="460" height="100" href="${gameHeader}" />` : ''}
</svg>
`.trim();

  fs.writeFileSync('steam-widget.svg', svg);
  console.log("✅ Widget generado correctamente");
}

generateSVG();
