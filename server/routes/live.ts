import { Router } from "express";
import { getLiveSnapshot, setLiveSnapshot } from "../services/live.service";
import { getDynamicRecommendation } from "../services/recommend.service";

const router = Router();

router.post("/push", (req, res) => {
  const { key, snapshot } = req.body;

  if (!key || !snapshot) {
    res.status(400).send("Missing key or snapshot");
    return;
  }

  setLiveSnapshot(key, snapshot);
  res.json({ ok: true });
});

router.get("/:key", (req, res) => {
  const data = getLiveSnapshot(req.params.key);

  if (!data) {
    res.json(null);
    return;
  }

  // 🔥 FIX: convertir objetos → string[]
  const enemyTeam = Array.isArray(data.enemies)
    ? data.enemies.map((e) => e.championName)
    : [];

  const recommendation = getDynamicRecommendation({
    champion: data.championName,
    versus: data.enemyChampion,
    enemyTeam
  });

  res.json({
    ...data,
    recommendation
  });
});

export default router;