# Steam Widget for GitHub  

A **self-updating SVG badge** that shows your **Steam profile summary**, **current status**, **level**, **total games owned**, and – when you’re in-game – the **header image of the game you’re playing**.

[![Steam Widget](steam-widget.svg)](https://github.com/punketa/steam-widget)

The badge is **generated automatically every 5 minutes** by a GitHub Actions workflow and saved as `steam-widget.svg` in the repository root.  
You can embed it anywhere Markdown or HTML is allowed.

 ## Setup (One-Time):
1. Get a Steam Web API key: </br>
<https://steamcommunity.com/dev/apikey> </br>
2. Find your SteamID64: </br>
Use <https://steamid.io> → paste your profile URL → copy SteamID64 </br>
3. Add secrets to the repo: </br>
Settings → Secrets and variables → Actions </br>
STEAM_API_KEY = ( your-key ) </br>
STEAM_ID = ( your-steamid64 ) </br>

## How It Works:
1. GitHub Actions (.github/workflows/steam-widget.yml) </br>
-Schedule: It runs every 5 min. </br>
-Secrets – It takes STEAM_API_KEY (your Steam Web API key) and STEAM_ID (your SteamID64). </br>
-Node 20 – It executes steam-widget.js. </br>
-Commit – only when the SVG actually changed. </br>
```xml
Note on update frequency:
Even though the cron is set to every 5 minutes, GitHub Actions often delays scheduled runs (queue time, runner availability, etc.).
In practice, updates may take 6–15 minutes or longer.
You can always trigger a run manually using the "Run workflow" button.
```

2. Generator Script (.github/workflows/steam-widget.js) </br>
The script fetches data from the Steam Web API, downloads your avatar and (if playing) the game header image, and builds an SVG with embedded images (as Base64).

## Manual Badges: Games, Years of Service & Profile Badge Icons

Important: The "Games Owned", "Years of Service" and "Profile badge" icons are not generated automatically. (They are not included in the API) </br>
You must manually find the images, convert them to Base64, and paste them into the script. </br>

1. Where to find the icons: </br>
Games Owned and Years of Service: <https://www.steamcardexchange.net/index.php?gamepage-appid-753> </br>
Profile badge: <https://www.steamcardexchange.net/index.php> </br>

2. How to Convert Image → Base64
-Right-click the image → Copy image address </br>
-Go to: https://www.base64-image.de/ </br>
-Paste the URL → Click "Encode image" </br> 
-Copy the full data:image/png;base64,... string </br>

3. Paste into the Script: </br>
Open (.github/workflows/steam-widget.js) and replace these lines: </br>
```xml
<!-- Games Owned Icon -->
<image x="160" y="${height - 48}" width="40" height="40" href="your_img_base64" />
<!-- Years of Sevice -->
<image x="210" y="${height - 48}" width="40" height="40" href="your_img_base64" />
<!-- Profile Badge -->
  <image x="260" y="${height - 52}" width="48" height="48" href="your_img_base64" />
```

## Privacy & Requirements
-Your Steam profile must be public.</br>
-No data is stored:  everything is embedded in the SVG.</br>
-Only uses official Steam Web API.</br>
-Push – the first workflow run will generate steam-widget.svg.</br>

# 🎮 EXAMPLES

-Mine currently: </br>
[![Steam Widget](steam-widget.svg)](https://github.com/punketa/steam-widget)

-Offline: </br>
<img width="544" height="180" alt="image" src="https://github.com/user-attachments/assets/e94eb729-a620-4651-8bc7-d238a8fe9edc" />

-Online: </br>
<img width="547" height="188" alt="image" src="https://github.com/user-attachments/assets/4427f875-3783-4e85-929c-66cb817a8ea9" />

-Playing: </br>
<img width="547" height="184" alt="image" src="https://github.com/user-attachments/assets/d889d683-aa29-4c02-9215-36980582005b" />
