const BACKEND_URL = "http://localhost:3001/api/live/push";
const ALL_GAME_DATA_URL = "https://127.0.0.1:2999/liveclientdata/allgamedata";
const KEY = "local-player";

/**
 * Antes de correrlo en PowerShell:
 * $env:NODE_TLS_REJECT_UNAUTHORIZED="0"
 * npm run dev
 */

type LivePlayer = {
  summonerName?: string;
  riotId?: string;
  championName?: string;
  position?: string;
  team?: string;
  currentGold?: number;
  items?: Array<{ itemID: number }>;
  scores?: {
    kills?: number;
    deaths?: number;
    assists?: number;
    creepScore?: number;
    visionScore?: number;
    wardScore?: number;
  };
};

type AllGameData = {
  activePlayer?: {
    summonerName?: string;
    riotId?: string;
    level?: number;
    currentGold?: number;
    items?: Array<{ itemID: number }>;
    scores?: {
      kills?: number;
      deaths?: number;
      assists?: number;
      creepScore?: number;
      visionScore?: number;
      wardScore?: number;
    };
  };
  allPlayers?: LivePlayer[];
  gameData?: {
    gameMode?: string;
    gameTime?: number;
  };
};

type TeamPlayerSnapshot = {
  summonerName: string;
  championName: string;
  position: string | null;
  kda: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  vision: number;
  gold: number | null;
  items: string[];
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function toTeamPlayerSnapshot(player: LivePlayer): TeamPlayerSnapshot {
  const kills = player.scores?.kills || 0;
  const deaths = player.scores?.deaths || 0;
  const assists = player.scores?.assists || 0;
  const cs = player.scores?.creepScore || 0;
  const vision =
    player.scores?.visionScore ||
    player.scores?.wardScore ||
    0;

  return {
    summonerName: player.summonerName || "Unknown",
    championName: player.championName || "Unknown",
    position: player.position || null,
    kda: `${kills}/${deaths}/${assists}`,
    kills,
    deaths,
    assists,
    cs,
    vision,
    gold:
      typeof player.currentGold === "number"
        ? player.currentGold
        : null,
    items: (player.items || []).map((i) => String(i.itemID)),
  };
}

function findMe(players: LivePlayer[], activePlayerName?: string) {
  if (!activePlayerName) return null;

  const me =
    players.find((p) => p.summonerName === activePlayerName) || null;

  return me;
}

function findLaneEnemy(players: LivePlayer[], me: LivePlayer | null) {
  if (!me?.team || !me?.position) return null;

  return (
    players.find(
      (p) => p.team !== me.team && p.position === me.position
    ) || null
  );
}

async function pollLiveClient() {
  const data = await fetchJson<AllGameData>(ALL_GAME_DATA_URL);

  if (!data?.activePlayer || !data?.allPlayers || !data?.gameData) {
    return;
  }

  const activePlayer = data.activePlayer;
  const players = data.allPlayers;
  const me = findMe(players, activePlayer.summonerName);
  const enemy = findLaneEnemy(players, me);

  const allyTeam = me?.team
    ? players
        .filter((p) => p.team === me.team)
        .map(toTeamPlayerSnapshot)
    : [];

  const enemyTeam = me?.team
    ? players
        .filter((p) => p.team !== me.team)
        .map(toTeamPlayerSnapshot)
    : [];

  const myKills = activePlayer.scores?.kills || 0;
  const myDeaths = activePlayer.scores?.deaths || 0;
  const myAssists = activePlayer.scores?.assists || 0;
  const myCs = activePlayer.scores?.creepScore || 0;
  const myVision =
    activePlayer.scores?.visionScore ||
    activePlayer.scores?.wardScore ||
    0;

  const snapshot = {
    riotId: activePlayer.riotId || null,
    summonerName: activePlayer.summonerName || "Unknown",
    championName: me?.championName || "Unknown",
    position: me?.position || null,
    gameMode: data.gameData.gameMode || null,
    gameTime: data.gameData.gameTime || 0,

    cs: myCs,
    kills: myKills,
    deaths: myDeaths,
    assists: myAssists,
    gold:
      typeof activePlayer.currentGold === "number"
        ? activePlayer.currentGold
        : null,
    vision: myVision,
    level: activePlayer.level || 0,
    items: (activePlayer.items || []).map((i) => String(i.itemID)),

    enemyChampion: enemy?.championName || null,

    allies: allyTeam,
    enemies: enemyTeam,

    diffCs:
      enemy?.scores?.creepScore != null
        ? myCs - enemy.scores.creepScore
        : null,

    diffVision:
      (enemy?.scores?.visionScore ?? enemy?.scores?.wardScore) != null
        ? myVision -
          (enemy?.scores?.visionScore ?? enemy?.scores?.wardScore ?? 0)
        : null,
  };

  await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: KEY, snapshot }),
  });
}

setInterval(pollLiveClient, 3000);
console.log("Live agent running...");