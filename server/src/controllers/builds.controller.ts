import { Request, Response } from 'express';
import { getItemData, getMatchById, getMatchIdsByPuuid } from '../services/riot.service';

export async function getBuildsByChampion(req: Request, res: Response) {
  try {
    const puuid = String(req.query.puuid || '').trim();
    const platform = String(req.query.platform || 'la1').trim().toLowerCase();
    const champion = String(req.query.champion || '').trim();

    if (!puuid) {
      return res.status(400).json({ message: 'puuid is required' });
    }

    const matchIds = await getMatchIdsByPuuid(puuid, platform, 20, 0);
    const matches = await Promise.all(matchIds.map((id: string) => getMatchById(id, platform)));
    const { items } = await getItemData();

    const relevantPlayers = matches
      .map((match: any) => match.info.participants.find((p: any) => p.puuid === puuid))
      .filter(Boolean)
      .filter((p: any) => (champion ? p.championName === champion : true));

    const itemCounts = new Map<number, number>();

    for (const player of relevantPlayers) {
      const slots = [player.item0, player.item1, player.item2, player.item3, player.item4, player.item5];

      for (const itemId of slots) {
        if (itemId && itemId !== 0) {
          itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + 1);
        }
      }
    }

    const topItems = [...itemCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([itemId, count]) => ({
        itemId,
        count,
        itemData: items[String(itemId)] || null,
      }));

    res.json({
      champion: champion || null,
      sampleSize: relevantPlayers.length,
      topItems,
    });
  } catch (error: any) {
    res.status(error?.response?.status || 500).json({
      message: 'Error generating builds',
      detail: error?.response?.data || null,
    });
  }
}