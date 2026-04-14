import { Router } from 'express';
import { getLiveGame } from '../controllers/live.controller';
import { getLiveAnalysis, pushLiveSnapshot } from '../controllers/live-analysis.controller';

const router = Router();

router.get('/current', getLiveGame);
router.get('/analysis', getLiveAnalysis);
router.post('/push', pushLiveSnapshot);

export default router;
