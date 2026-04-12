import { Request, Response } from 'express';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
} from '../services/riot.service';

const platformFallbacks: Record<string, string[]> = {
  la1: ['la1', 'la2', 'na1', 'br1'],
  la2: ['la2', 'la1', 'na1', 'br1'],
  na1: ['na1', 'la1', 'la2', 'br1'],
  br1: ['br1', 'la1', 'la2', 'na1'],
  euw1: ['euw1', 'eun1', 'tr1', 'ru'],
  eun1: ['eun1', 'euw1', 'tr1', 'ru'],
  kr: ['kr', 'jp1'],
  jp1: ['jp1', 'kr'],
};

export async function getProfileSummary(req: Request, res: Response) {
  try {
    const gameName = String(req.query.gameName || '').trim();
    const tagLine = String(req.query.tagLine || '').trim();
    const region = String(req.query.region || 'la2').trim().toLowerCase();

    if (!gameName || !tagLine) {
      return res.status(400).json({ message: 'gameName y tagLine son requeridos' });
    }

    const account = await getAccountByRiotId(gameName, tagLine, region);

    const platformsToTry = platformFallbacks[region] || [region];
    let summoner: any = null;
    let resolvedPlatform = region;

    for (const platform of platformsToTry) {
      try {
        summoner = await getSummonerByPuuid(account.puuid, platform);
        resolvedPlatform = platform;
        break;
      } catch {
        continue;
      }
    }

    if (!summoner) {
      return res.status(404).json({
        message: 'Summoner no encontrado en las platforms probadas',
        account,
      });
    }

    return res.json({
      account,
      summoner,
      resolvedPlatform,
    });
  } catch (error: any) {
    return res.status(error?.response?.status || 500).json({
      message: 'Error al consultar Riot API',
      detail: error?.response?.data || null,
    });
  }
}