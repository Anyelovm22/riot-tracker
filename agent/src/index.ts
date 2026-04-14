const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001/api/live/push";
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

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function pollLiveClient() {
  const data = await fetchJson<AllGameData>(ALL_GAME_DATA_URL);

  if (!data?.activePlayer || !data?.allPlayers || !data?.gameData) {
    return;
  }

  await fetch(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: KEY, snapshot: data }),
  });
}

setInterval(pollLiveClient, 3000);
console.log("Live agent running...");
