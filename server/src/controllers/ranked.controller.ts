import { Request, Response } from 'express';
import {
  getSummonerByPuuid,
  getLeagueEntriesBySummonerId,
} from '../services/riot.service';

function normalizeLeagueEntries(entries: any[]) {
  return (entries || []).map((entry) => ({
    queueType: entry.queueType,
    tier: entry.tier,
    rank: entry.rank,
    leaguePoints: entry.leaguePoints,
    wins: entry.wins,
    losses: entry.losses,
    hotStreak: entry.hotStreak,
    veteran: entry.veteran,
    freshBlood: entry.freshBlood,
    inactive: entry.inactive,
  }));
}

export async function getRankedOverview(req: Request, res: Response) {
  try {
    const puuid = String(req.query.puuid || '').trim();
    const platform = String(req.query.platform || 'la1').trim().toLowerCase();

    if (!puuid) {
      return res.status(400).json({ message: 'puuid is required' });
    }

    const summoner = await getSummonerByPuuid(puuid, platform);

    console.log('RANKED SUMMONER RESPONSE:', JSON.stringify(summoner, null, 2));

    if (!summoner || !summoner.id) {
      return res.json({
        success: true,
        rankedAvailable: false,
        summoner: summoner || null,
        leagueEntries: [],
      });
    }

    const leagueEntries = await getLeagueEntriesBySummonerId(summoner.id, platform);

    return res.json({
      success: true,
      rankedAvailable: true,
      summoner,
      leagueEntries: normalizeLeagueEntries(leagueEntries),
    });
  } catch (error: any) {
    console.error('RANKED OVERVIEW ERROR:', error?.response?.data || error.message || error);

    return res.status(error?.response?.status || 500).json({
      success: false,
      rankedAvailable: false,
      message: 'Error fetching ranked overview',
      detail: error?.response?.data || null,
      leagueEntries: [],
    });
  }
}