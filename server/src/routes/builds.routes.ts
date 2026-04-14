import { Router } from 'express';
import { getChampionBuildInsights } from '../controllers/builds.controller';

const router = Router();

router.get('/champion-insights', getChampionBuildInsights);

export default router;
