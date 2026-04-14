import { Request, Response } from 'express';
import { env } from '../config/env';
import { getLiveGameSmart } from '../services/riot.service';
import { getLivePushEntry, saveLivePushEntry } from '../services/live-push-cache.service';

const DEFAULT_LIVE_PUSH_KEY = 'local-player';

export async function getLiveGame(req: Request, res: Response) {
  try {
    const puuid = String(req.query.puuid || '').trim();
    const platform = String(req.query.platform || 'la1').trim().toLowerCase();

    if (!puuid) {
      return res.status(400).json({ message: 'puuid is required' });
    }

    console.log('LIVE QUERY PARAMS', { puuid, platform });

    const result = await getLiveGameSmart(puuid, platform);

    console.log('LIVE RESULT', {
      hasActiveGame: Boolean(result?.activeGame),
      strategy: result?.debug?.strategy,
      participants: result?.activeGame?.participants?.length || 0,
    });

    return res.json(result);
  } catch (error: any) {
    console.log(
      'LIVE ERROR',
      error?.response?.status,
      error?.response?.data || error?.message || error
    );

    if (error?.response?.status === 404) {
      return res.json({
        activeGame: null,
        debug: {
          status: 404,
          detail: error?.response?.data || null,
        },
      });
    }

    return res.status(error?.response?.status || 500).json({
      message: 'Error fetching live game',
      detail: error?.response?.data || null,
    });
  }
}

export async function pushLiveSnapshot(req: Request, res: Response) {
  const providedSecret = String(req.headers['x-live-push-secret'] || '').trim();

  if (env.LIVE_PUSH_SECRET && providedSecret !== env.LIVE_PUSH_SECRET) {
    return res.status(401).json({ message: 'Unauthorized live push' });
  }

  const key = String(req.body?.key || DEFAULT_LIVE_PUSH_KEY).trim();
  const snapshot = req.body?.snapshot;
  const allGameData = req.body?.allGameData;
  const source = String(req.body?.source || 'local-agent').trim();

  if (!snapshot && !allGameData) {
    return res.status(400).json({ message: 'snapshot or allGameData is required' });
  }

  const saved = saveLivePushEntry({
    key,
    snapshot,
    allGameData,
    source,
  });

  return res.json({
    ok: true,
    key: saved?.key,
    updatedAt: saved?.updatedAt,
  });
}

export async function getLivePushStatus(req: Request, res: Response) {
  const key = String(req.query.key || DEFAULT_LIVE_PUSH_KEY).trim();
  const maxAgeMs = Math.max(5, env.LIVE_PUSH_MAX_AGE_SECONDS) * 1000;
  const entry = getLivePushEntry(key, maxAgeMs);

  return res.json({
    ok: true,
    key,
    hasFreshData: Boolean(entry),
    ageMs: entry?.ageMs ?? null,
    source: entry?.source ?? null,
  });
}
