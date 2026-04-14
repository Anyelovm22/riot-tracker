import { Router } from 'express';
import { getChampionBuildDetails, getChampionBuildSummary } from '../controllers/builds.controller';

const router = Router();

router.get('/champion-summary', getChampionBuildSummary);
router.get('/champion-details', getChampionBuildDetails);

export default router;
