import { Request, Response } from 'express';
import { getChampionAnalytics, toChampionSummary } from '../services/champion-analytics.service';

function parseFilters(req: Request) {
  return {
    champion: String(req.query.champion || '').trim(),
    platform: String(req.query.platform || 'la1').trim().toLowerCase(),
    role: String(req.query.role || 'ALL').trim().toUpperCase(),
    rank: String(req.query.rank || 'ALL').trim().toUpperCase(),
    patch: String(req.query.patch || 'latest').trim(),
    versusChampion: String(req.query.versusChampion || '').trim() || undefined,
  };
}

export async function getChampionBuildSummary(req: Request, res: Response) {
  try {
    const filters = parseFilters(req);
    if (!filters.champion) return res.status(400).json({ message: 'champion is required' });

    const payload = await getChampionAnalytics(filters);
    return res.json(toChampionSummary(payload));
  } catch (error: any) {
    return res.status(error?.response?.status || 500).json({
      message: 'Error fetching champion build summary',
      detail: error?.response?.data || error?.message || null,
    });
  }
}

export async function getChampionBuildDetails(req: Request, res: Response) {
  try {
    const filters = parseFilters(req);
    if (!filters.champion) return res.status(400).json({ message: 'champion is required' });

    const payload = await getChampionAnalytics(filters);
    return res.json(payload);
  } catch (error: any) {
    return res.status(error?.response?.status || 500).json({
      message: 'Error fetching champion build details',
      detail: error?.response?.data || error?.message || null,
    });
  }
}
