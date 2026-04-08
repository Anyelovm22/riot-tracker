import { Router } from "express";
import { getDynamicRecommendation, getAvailableProBuildChampions, getProBuildsForChampions } from "../services/recommend.service";

const router = Router();

// Get recommendation for a specific champion with optional enemy context
router.get("/:champion", (req, res) => {
  const champion = req.params.champion;
  const versus = typeof req.query.versus === "string" ? req.query.versus : null;
  const enemyTeam = typeof req.query.enemies === "string" 
    ? req.query.enemies.split(",").filter(Boolean)
    : [];

  const recommendation = getDynamicRecommendation({
    champion,
    versus,
    enemyTeam
  });

  res.json(recommendation);
});

// Get list of champions with pro builds available
router.get("/", (_req, res) => {
  res.json({
    champions: getAvailableProBuildChampions()
  });
});

// Get pro builds for multiple champions (useful for live game)
router.post("/batch", (req, res) => {
  const { champions } = req.body as { champions: string[] };
  
  if (!Array.isArray(champions)) {
    res.status(400).json({ error: "champions must be an array" });
    return;
  }

  const builds = getProBuildsForChampions(champions);
  res.json({ builds });
});

export default router;
