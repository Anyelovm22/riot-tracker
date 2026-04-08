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

type LiveSnapshot = {
  riotId: string | null;
  summonerName: string;
  championName: string;
  position: string | null;
  gameMode: string | null;
  gameTime: number;

  cs: number;
  kills: number;
  deaths: number;
  assists: number;
  gold: number | null;
  vision: number;
  level: number;
  items: string[];

  enemyChampion: string | null;

  allies: TeamPlayerSnapshot[];
  enemies: TeamPlayerSnapshot[];

  diffCs: number | null;
  diffVision: number | null;
};

const liveStore = new Map<string, LiveSnapshot>();

export function setLiveSnapshot(key: string, snapshot: LiveSnapshot) {
  liveStore.set(key, snapshot);
}

export function getLiveSnapshot(key: string) {
  return liveStore.get(key) || null;
}