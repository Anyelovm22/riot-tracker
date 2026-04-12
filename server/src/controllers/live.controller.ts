import { Request, Response } from 'express';
import { getLiveGameSmart } from '../services/riot.service';

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