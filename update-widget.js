require("dotenv").config();
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
  let index = 0;
  let totalSongs = 0;
  let currentSignal = { aborted: false };

  const skipTo = (newIndex) => {
    currentSignal.aborted = true;
    index = ((newIndex % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
  };

  const tick = () => {
    currentSignal = { aborted: false };
    const signal = currentSignal;
    const entry = PLAYLIST[index];

    playSong(entry, signal).then(() => {
      if (signal.aborted) {
        // skip → relancer pour la nouvelle chanson (index déjà mis à jour par skipTo)
        tick();
        return;
      }
      totalSongs++;
      index = (index + 1) % PLAYLIST.length;
      const nextDuration = PLAYLIST[index].durationMs ?? DEFAULT_INTERVAL_MS;
      console.log(`⏳ Prochaine chanson dans ${formatTime(nextDuration)} (total: ${totalSongs})`);
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
