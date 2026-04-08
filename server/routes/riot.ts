import { Router } from "express";
import { searchSummoner } from "../services/riot.service";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const region = String(req.query.region || "");
    const riotId = String(req.query.riotId || "");

    if (!region || !riotId) {
      res.status(400).send("Faltan parámetros: region y riotId");
      return;
    }

    const data = await searchSummoner(region, riotId);
    res.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error inesperado en Riot route";
    res.status(500).send(message);
  }
});

export default router;