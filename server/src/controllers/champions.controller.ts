import { Request, Response } from 'express';
import { getChampionById, getChampionList } from '../services/riot.service';

export async function listChampions(_req: Request, res: Response) {
  try {
    const result = await getChampionList();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      message: 'Error fetching champions',
      detail: error?.response?.data || null,
    });
  }
}

export async function getChampion(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug ?? '').trim();

    if (!slug) {
      return res.status(400).json({ message: 'Champion slug is required' });
    }

    const champion = await getChampionById(slug);
    res.json(champion);
  } catch (error: any) {
    res.status(500).json({
      message: 'Error fetching champion',
      detail: error?.response?.data || null,
    });
  }
}