import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'server', 'src', 'data', 'rankedSnapshots.json');

export type RankedSnapshot = {
  puuid: string;
  platform: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  capturedAt: string;
};

export function readSnapshots(): RankedSnapshot[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function isSameSnapshot(a: RankedSnapshot, b: RankedSnapshot) {
  return (
    a.puuid === b.puuid &&
    a.platform === b.platform &&
    a.queueType === b.queueType &&
    a.tier === b.tier &&
    a.rank === b.rank &&
    a.leaguePoints === b.leaguePoints &&
    a.wins === b.wins &&
    a.losses === b.losses
  );
}

export function appendSnapshots(newSnapshots: RankedSnapshot[]) {
  const current = readSnapshots();
  const merged = [...current];

  for (const newSnapshot of newSnapshots) {
    const lastForQueue = [...merged]
      .reverse()
      .find(
        (item) =>
          item.puuid === newSnapshot.puuid &&
          item.platform === newSnapshot.platform &&
          item.queueType === newSnapshot.queueType
      );

    if (!lastForQueue || !isSameSnapshot(lastForQueue, newSnapshot)) {
      merged.push(newSnapshot);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
}