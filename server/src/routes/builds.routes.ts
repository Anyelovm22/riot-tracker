import { Router } from 'express';
import { getBuildsByChampion, getChampionBuildInsights } from '../controllers/builds.controller';

const router = Router();

router.get('/by-champion', getBuildsByChampion);
router.get('/champion-insights', getChampionBuildInsights);

export default router;
