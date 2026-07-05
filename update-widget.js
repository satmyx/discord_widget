require("dotenv").config();
const http = require("http");
const os = require("os");
const cron = require("node-cron");

const APP_ID = process.env.APP_ID;
const USER_ID = process.env.USER_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;

// ⏱️ Helpers lisibles pour les durées
const seconds = (n) => n * 1000;
const minutes = (n) => n * 60_000;

// ⏱️ Temps par défaut si une chanson n'a pas de durée
const DEFAULT_INTERVAL_MS = minutes(2);

// 🎵 Playlist : chaque objet = une entrée à afficher
// durationMs  = durée d'affichage de CETTE chanson (optionnel, sinon défaut)
// startCurVal = valeur de départ du CurVal pour cette chanson (optionnel, sinon 0)
const PLAYLIST = [
  {
    imageUrl: "https://cdn.discordapp.com/attachments/1523105747930710079/1523105948665643018/ghost.png?ex=6a4ae674&is=6a4994f4&hm=2aa29de9f0f5e766e06e9455b4e45834894a4a4bc6cd01e9c08de9f31eda77af&",
    song_name: "Halsey - Gasoline",
    song_description: "(Slowed down to it's perfection + Reverbed)",
    durationMs: minutes(3),
  },
  {
    imageUrl: "https://cdn.discordapp.com/attachments/1523105747930710079/1523109246244225185/homelander.png?ex=6a4ae986&is=6a499806&hm=870d45649bee99688c992ec99dc7169393e23308d8a34e303975eccedc5f2ce5&",
    song_name: "MIA BOYKA - ЭКСПОНАТ",
    song_description: "(MilWo, Sunset HARDTEKK Remix)",
    durationMs: minutes(2),
  },
  {
    imageUrl: "https://cdn.discordapp.com/attachments/1523105747930710079/1523109968428007444/ada_wong.png?ex=6a4aea32&is=6a4998b2&hm=c917e48632a6f8781cba967f2f8200fdf84a1706f6aeb267fd31c8418cc102b2&",
    song_name: "Sabi, MIA BOYKA - Базовый минимум",
    song_description: "(Original)",
    durationMs: minutes(2),
  },
    {
    imageUrl: "https://cdn.discordapp.com/attachments/1523105747930710079/1523240676156772422/montagem.png?ex=6a4b63ed&is=6a4a126d&hm=7b16d6f6e091bcb97490173c4e30b6b9f44d0fdc61c2eb064275c6c541fa6510&",
    song_name: "AKXNESHIVA, Avenxir, HamiBeats - MONTAGEM UNKNOWN",
    song_description: "(Original)",
    durationMs: minutes(1),
  },
  {
    imageUrl: "https://cdn.discordapp.com/attachments/1523105747930710079/1523240676156772422/montagem.png?ex=6a4b63ed&is=6a4a126d&hm=7b16d6f6e091bcb97490173c4e30b6b9f44d0fdc61c2eb064275c6c541fa6510&",
    song_name: "WhyBaby? - Нравишься",
    song_description: "(Original)",
    durationMs: minutes(3),
  },
  {
    imageUrl: "https://cdn.discordapp.com/attachments/1523105747930710079/1523251837879189624/capte.png?ex=6a4b6e52&is=6a4a1cd2&hm=f931b885e4852cb56ebab24fd4944a4179e1c38730854b5604f02ef402dd465e&",
    song_name: "Nakama, Nxxkz - LOUCURA LETAL",
    song_description: "(Super Slowed)",
    durationMs: minutes(2),
  },
  {
    imageUrl: "https://cdn.discordapp.com/attachments/1523105747930710079/1523112117677457488/sem_tempo.png?ex=6a4aec32&is=6a499ab2&hm=64d3377cb35bec41f572c33524f41cd6604b6dead8f2f6338b492c6f67015b31&",
    song_name: "SCARIONIX, chipbagov - Sem Tempo",
    song_description: "(Hardstyle Remix • Ultra Slowed)",
    durationMs: minutes(6),
  },
  {
    imageUrl: "https://cdn.discordapp.com/attachments/1523105747930710079/1523242397566242936/yuta.png?ex=6a4b6588&is=6a4a1408&hm=5278471d7d7b01a73d7edddab8eab00320ae60ebf5f5b3c72282a6c15f98a3e5&",
    song_name: "Scythermane, DJ LYVIXRA - BONITO ROUBO",
    song_description: "(Jumpstyle (Lykyor Remix) • Slowed & Reverb)",
    durationMs: minutes(2),
  },
  {
    imageUrl: "https://cdn.discordapp.com/attachments/1523105747930710079/1523245646042239077/velvet.png?ex=6a4b688e&is=6a4a170e&hm=a464bd06e2e0ca7df9067eb9082ec40d29dfd8d34b9793c9fdf7b5d67f8acb52&",
    song_name: "VELVET SIN - Killer Protocol",
    song_description: "(Original)",
    durationMs: minutes(2),
  },
  {
    imageUrl: "https://cdn.discordapp.com/attachments/1523105747930710079/1523113998046855309/hiyuki.png?ex=6a4aedf3&is=6a499c73&hm=ae987a10bc95d3a644729d07531379b2b0db06b9607bc8f6ade228ff982966b2&",
    song_name: "ATIC, DJ Raulipues - Montagem Vortex",
    song_description: "(Super Slowed)",
    durationMs: minutes(2),
  },
];

// ⏱️ À quelle fréquence mettre à jour CurVal (en millisecondes)
// 30s → 2 calls/min → safe pour le rate limit du endpoint PATCH (~5/min)
const UPDATE_INTERVAL_MS = seconds(30);

// Valeur de départ de CurVal si non précisée dans la chanson
const DEFAULT_START_CURVAL = 0;

// 🌐 État global partagé avec le serveur HTTP
const state = {
  index: 0,
  totalSongs: 0,
  currentSong: null,
  skipTo: null,
};

async function updateWidgetImage(imageUrl, song_name, song_description, CurVal) {
  const rounded = Math.round(CurVal * 10000) / 10000;

  let attempt = 0;
  while (true) {
    attempt++;
    const res = await fetch(
      `https://discord.com/api/v9/applications/${APP_ID}/users/${USER_ID}/identities/0/profile`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${BOT_TOKEN}`,
          "User-Agent": "DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)",
        },
        body: JSON.stringify({
          username: "your_username",
          data: {
            dynamic: [
              { type: 1, name: "song_name", value: song_name },
              { type: 1, name: "song_description", value: song_description },
              { type: 2, name: "CurVal", value: rounded },
              { type: 3, name: "image_objective", value: { url: imageUrl } },
            ],
          },
        }),
      }
    );

    if (res.status === 429) {
      const json = await res.json().catch(() => ({}));
      const waitSec = (json.retry_after ?? 5) + 1; // +1s de marge
      console.log(`  ⚠️ Rate limit, pause ${waitSec.toFixed(1)}s (tentative ${attempt})...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    const text = await res.text();
    const json = text ? JSON.parse(text) : null;

    if (!res.ok) {
      console.error(`  ❌ Erreur ${res.status}:`, JSON.stringify(json, null, 2));
    } else {
      console.log(`  ✅ CurVal=${rounded}`);
    }
    return;
  }
}

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

/**
 * Joue une chanson : met à jour CurVal progressivement de startCurVal → 1.
 * Si `signal.aborted` devient true, la chanson est interrompue.
 */
async function playSong(entry, signal) {
  const duration = entry.durationMs ?? DEFAULT_INTERVAL_MS;
  const startVal = entry.startCurVal ?? DEFAULT_START_CURVAL;
  const totalSteps = Math.max(1, Math.floor(duration / UPDATE_INTERVAL_MS));

  console.log(`🎶 ${entry.song_name} (${formatTime(duration)}, CurVal: ${startVal} → 1, ${totalSteps + 1} calls)`);

  // Première update immédiate
  await updateWidgetImage(entry.imageUrl, entry.song_name, entry.song_description, startVal);
  if (signal.aborted) return;

  for (let step = 1; step <= totalSteps; step++) {
    // Attente annulable
    const waited = await sleepUntil(UPDATE_INTERVAL_MS, signal);
    if (!waited) return; // interrompu par skip

    const curVal = startVal + (step / totalSteps) * (1 - startVal);
    await updateWidgetImage(entry.imageUrl, entry.song_name, entry.song_description, curVal);
    if (signal.aborted) return;
  }
}

/** Attend `ms` millisecondes, retourne `true` si terminé, `false` si annulé */
function sleepUntil(ms, signal) {
  return new Promise((resolve) => {
    const check = () => {
      if (signal.aborted) { clearTimeout(timer); resolve(false); }
    };
    const timer = setTimeout(() => { clearInterval(interval); resolve(true); }, ms);
    const interval = setInterval(check, 250);
  });
}

async function startLoop() {
  let currentSignal = { aborted: false };

  const skipTo = (newIndex) => {
    currentSignal.aborted = true;
    state.index = ((newIndex % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
  };
  state.skipTo = skipTo;

  const tick = () => {
    currentSignal = { aborted: false };
    const signal = currentSignal;
    const entry = PLAYLIST[state.index];
    state.currentSong = { ...entry, index: state.index, progress: 0 };

    playSong(entry, signal).then(() => {
      if (signal.aborted) {
        tick();
        return;
      }
      state.totalSongs++;
      state.index = (state.index + 1) % PLAYLIST.length;
      state.currentSong = null;
      const nextDuration = PLAYLIST[state.index].durationMs ?? DEFAULT_INTERVAL_MS;
      console.log(`⏳ Prochaine chanson dans ${formatTime(nextDuration)} (total: ${state.totalSongs})`);
      tick();
    });
  };

  // Démarrage automatique de la playlist (headless, pas de contrôles clavier)
  tick();
}

// 🚀 Lancement du service 24/7
startLoop();

// 🔄 Cron heartbeat optionnel — log toutes les 5 min pour confirmer que le service tourne
cron.schedule("*/5 * * * *", () => {
  console.log("💓 Heartbeat — le service tourne toujours");
});

console.log("🚀 Service de mise à jour du widget Discord lancé (h24)");

// ═══════════════════════════════════════════
// 🌐 SERVEUR HTTP — Interface web de contrôle
// ═══════════════════════════════════════════

const PORT = process.env.WEB_PORT || 3456;

function apiJSON(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }

  // GET /api/state — état actuel
  if (url.pathname === "/api/state") {
    return apiJSON(res, {
      currentIndex: state.index,
      totalSongs: state.totalSongs,
      currentSong: state.currentSong,
      playlist: PLAYLIST,
    });
  }

  // POST /api/skip — body: { index }
  if (url.pathname === "/api/skip" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { index } = JSON.parse(body);
        if (typeof index !== "number" || index < 0 || index >= PLAYLIST.length) {
          return apiJSON(res, { error: "Index invalide" }, 400);
        }
        state.skipTo(index);
        console.log(`🌐 Skip → ${PLAYLIST[index].song_name}`);
        apiJSON(res, { ok: true, skippedTo: index, song: PLAYLIST[index].song_name });
      } catch {
        apiJSON(res, { error: "JSON invalide" }, 400);
      }
    });
    return;
  }

  // Serveur de fichier statique (page HTML)
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(HTML_PAGE);
});

server.listen(PORT, () => {
  const ifaces = os.networkInterfaces();
  console.log("═══════════════════════════════════════");
  console.log(`🌐 Interface web accessible sur :`);
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        console.log(`   http://${addr.address}:${PORT}`);
      }
    }
  }
  console.log(`   http://localhost:${PORT}`);
  console.log("═══════════════════════════════════════");
});

// ═══════════════════════════════════════════
// 🎨 PAGE HTML — Mini lecteur style Spotify
// ═══════════════════════════════════════════

const HTML_PAGE = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Discord Widget Controller</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: #121212; color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-height: 100vh; display: flex; justify-content: center; align-items: center;
  }
  .player {
    width: 100%; max-width: 480px; background: #181818; border-radius: 16px;
    padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,.5);
  }
  h1 { font-size: 14px; color: #1db954; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; text-align: center; }
  .now-playing {
    text-align: center; padding: 16px 0; border-bottom: 1px solid #282828; margin-bottom: 16px;
  }
  .now-playing img {
    width: 200px; height: 200px; border-radius: 8px; object-fit: cover;
    box-shadow: 0 4px 20px rgba(0,0,0,.4); margin-bottom: 12px;
  }
  .now-playing .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .now-playing .desc { font-size: 13px; color: #b3b3b3; }
  .progress-bar {
    width: 100%; height: 4px; background: #404040; border-radius: 2px;
    margin-top: 12px; overflow: hidden;
  }
  .progress-fill {
    height: 100%; background: #1db954; border-radius: 2px;
    transition: width 1s linear; width: 0%;
  }
  .playlist { max-height: 380px; overflow-y: auto; }
  .playlist::-webkit-scrollbar { width: 6px; }
  .playlist::-webkit-scrollbar-thumb { background: #404040; border-radius: 3px; }
  .song {
    display: flex; align-items: center; gap: 12px; padding: 10px 8px;
    border-radius: 8px; cursor: pointer; transition: background .2s;
  }
  .song:hover { background: #282828; }
  .song.active { background: #1db95420; }
  .song img { width: 48px; height: 48px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
  .song-info { flex: 1; min-width: 0; }
  .song-info .name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .song-info .sub { font-size: 12px; color: #b3b3b3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .song .dur { font-size: 12px; color: #b3b3b3; flex-shrink: 0; }
  .song.active .name { color: #1db954; }
  .playing-dot {
    width: 8px; height: 8px; background: #1db954; border-radius: 50%;
    flex-shrink: 0; display: none;
  }
  .song.active .playing-dot { display: block; }
  .song.active .dur { display: none; }
  .status { text-align: center; font-size: 12px; color: #666; margin-top: 16px; }
</style>
</head>
<body>
<div class="player">
  <h1>🎮 Discord Widget</h1>
  <div class="now-playing" id="nowPlaying">
    <img id="npImg" src="" alt="Cover">
    <div class="title" id="npTitle">—</div>
    <div class="desc" id="npDesc">En attente...</div>
    <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
  </div>
  <div class="playlist" id="playlist"></div>
  <div class="status" id="status">🔄 Connexion...</div>
</div>
<script>
  const nowPlaying = document.getElementById('nowPlaying');
  const npImg = document.getElementById('npImg');
  const npTitle = document.getElementById('npTitle');
  const npDesc = document.getElementById('npDesc');
  const progressFill = document.getElementById('progressFill');
  const playlistEl = document.getElementById('playlist');
  const statusEl = document.getElementById('status');

  let currentIndex = -1;

  async function fetchState() {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      render(data);
      statusEl.textContent = '✅ Connecté';
      statusEl.style.color = '#666';
    } catch (e) {
      statusEl.textContent = '⚠️ Déconnecté — reconnexion...';
      statusEl.style.color = '#ff4444';
    }
  }

  function render(data) {
    currentIndex = data.currentIndex;
    const cs = data.currentSong;

    // Now playing
    if (cs) {
      npImg.src = cs.imageUrl;
      npTitle.textContent = cs.song_name;
      npDesc.textContent = cs.song_description;
      nowPlaying.style.display = '';
    } else {
      nowPlaying.style.display = 'none';
    }

    // Playlist
    playlistEl.innerHTML = data.playlist.map((s, i) => {
      const active = i === currentIndex ? ' active' : '';
      const dur = s.durationMs ? formatDur(s.durationMs) : '?';
      return \`<div class="song\${active}" onclick="skipTo(\${i})">
        <div class="playing-dot"></div>
        <img src="\${s.imageUrl}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22><rect fill=%22%23333%22 width=%2248%22 height=%2248%22/></svg>'">
        <div class="song-info">
          <div class="name">\${s.song_name}</div>
          <div class="sub">\${s.song_description}</div>
        </div>
        <div class="dur">\${dur}</div>
      </div>\`;
    }).join('');
  }

  async function skipTo(index) {
    await fetch('/api/skip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index })
    });
    fetchState();
  }

  function formatDur(ms) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return m + ':' + String(s).padStart(2, '0');
  }

  // Animation de la progress bar
  let progress = 0;
  setInterval(() => {
    if (currentIndex >= 0) {
      progress = (progress + 0.3) % 100;
      progressFill.style.width = progress + '%';
    } else {
      progressFill.style.width = '0%';
    }
  }, 1000);

  // Polling toutes les 5 secondes
  fetchState();
  setInterval(fetchState, 5000);
</script>
</body>
</html>`;
