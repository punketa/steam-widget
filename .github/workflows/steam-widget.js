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
  ${player.avatarfull ? `<image x="460" y="20" width="64" height="64" href="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAAAAAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAgACADAREAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAABQYHCP/EAC4QAAEDAwMCBQMEAwAAAAAAAAECAwQFBhEHEiEAFAgTMUFRImFxFTIzQ4GRof/EABoBAAEFAQAAAAAAAAAAAAAAAAUAAQIDBAb/xAAnEQABAwMDAwQDAAAAAAAAAAABAAIDBBEhBRIxExRBMlGBsZGh8P/aAAwDAQACEQMRAD8AmGnlwsaoeHysTI9nxKvX0VSVJiUtALDbTLkhWzZjO4hTjisHAGwk8Y6hSOFOBAck8fAW17xLdwGc/aEVvRec3R2GnaxRWpwQA60ha1pz8eYk5J9s7QOOi5aGjLgqdpKSarpTPoiEvx6xT50hoJX263FsrPJ/jCsbsH8Z6qNrYIPynaC0p/ol/wBFqdu0GmOUuZBZgLjufqTMZ9YYfTnuG1LbQVKCt6tqcEJxzkc9cJW0L3VD5SAd3IxkeOcLrqaun6LY2l21uRa9gfPCBeCm/wCQ5Auqx4/bNuuR1So3nO4dcKRuKGgBg7vjOf8AvU9aD+k19zYH+ugFAWGQtPlbN0a0voF4Wsa/LgrRVXnHEuORVlC28EYAA+wB9MnPQ6nfvite6OyMaxwslPWTT6ksWlPnSG2u+81lpMp1H14S5xyecYz/ALPW2WTZCbJdNm8m2VEtQK7rpadPiVyzKnLjWl2SRHiNiOGFyErIWdjicK4WAcFJGcjPWjS9j4CH+55QevmfFMOm4jA4x9LMPhqjPRdY6NVO4EGPEUqQoZAW4lI/YPgq+/oMn8nJYmzsMbuCgrZHREPbyFf6v4vri0q1pqdvQ6CxXKDLRHS9RMqbcU4ttCsoWM4cG484I5wRxnoazS4YxZhIKIx6nMHCQpa1U8TFeuKtN+TT4luW3T2vOVS0yC+t50q+rzHONy8cAJGACfc9XdhG4bZDdTm1OaaQyI9aOuVUvWyKrTqjbdMmyItOceXPbSpnsGlEJU+NrqUhz2CilRwD+Q3bmIFjfSfyqBKyQh59f6WcNKZ0kLrFVQhIdiduQtZwkblrBBI9ARu9vbooAAh5VOqVUMe6IF5yojE2oBg01fG3zAhDad+M5GUktg+uCeemsVEAcJHuC16rVrqqVwTIDb0OK4Hn2IqcMxdygkpJ9AEqUlA+T/npA2GU49lTNBtW4On9zSo81ptqg1N1LTlRQyHHYKwMFwp/tZ5+tokZACkFK0gliNwS4yF//9k=" />` : ''}
  ${isPlaying && gameHeader ? `<image x="20" y="130" width="460" height="100" href="${gameHeader}" />` : ''}
</svg>
`.trim();

  fs.writeFileSync('steam-widget.svg', svg);
  console.log("✅ Widget generado correctamente");
}

generateSVG();
