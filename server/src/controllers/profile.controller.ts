import { Request, Response } from 'express';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
} from '../services/riot.service';

const allPlatforms = [
  'la1', 'la2', 'na1', 'br1',
  'euw1', 'eun1', 'tr1', 'ru',
  'kr', 'jp1',
  'oc1', 'ph2', 'sg2', 'th2', 'tw2', 'vn2',
];

const platformFallbacks: Record<string, string[]> = {
  la1: ['la1', 'la2', 'na1', 'br1'],
  la2: ['la2', 'la1', 'na1', 'br1'],
  na1: ['na1', 'la1', 'la2', 'br1'],
  br1: ['br1', 'la1', 'la2', 'na1'],
  euw1: ['euw1', 'eun1', 'tr1', 'ru'],
  eun1: ['eun1', 'euw1', 'tr1', 'ru'],
  tr1: ['tr1', 'euw1', 'eun1', 'ru'],
  ru: ['ru', 'euw1', 'eun1', 'tr1'],
  kr: ['kr', 'jp1'],
  jp1: ['jp1', 'kr'],
  oc1: ['oc1', 'sg2', 'ph2', 'th2', 'tw2', 'vn2'],
  ph2: ['ph2', 'sg2', 'oc1', 'th2', 'tw2', 'vn2'],
  sg2: ['sg2', 'ph2', 'oc1', 'th2', 'tw2', 'vn2'],
  th2: ['th2', 'sg2', 'ph2', 'oc1', 'tw2', 'vn2'],
  tw2: ['tw2', 'sg2', 'ph2', 'th2', 'oc1', 'vn2'],
  vn2: ['vn2', 'sg2', 'ph2', 'th2', 'tw2', 'oc1'],
};

function getPlatformsToTry(region: string) {
  const preferred = platformFallbacks[region] || [region];
  const unique = new Set<string>();

  for (const platform of preferred) {
    unique.add(platform);
  }

  for (const platform of allPlatforms) {
    unique.add(platform);
  }

  return Array.from(unique);
}

export async function getProfileSummary(req: Request, res: Response) {
  try {
    const gameName = String(req.query.gameName || '').trim();
    const tagLine = String(req.query.tagLine || '').trim();
    const region = String(req.query.region || 'la2').trim().toLowerCase();

    if (!gameName || !tagLine) {
      return res.status(400).json({ message: 'gameName y tagLine son requeridos' });
    }

    const account = await getAccountByRiotId(gameName, tagLine, region);

    const platformsToTry = getPlatformsToTry(region);
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