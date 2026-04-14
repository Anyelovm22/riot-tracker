import { Router } from 'express';
import { getLiveGame, getLivePushStatus, pushLiveSnapshot } from '../controllers/live.controller';
import { getLiveAnalysis } from '../controllers/live-analysis.controller';

const router = Router();

router.get('/current', getLiveGame);
router.get('/analysis', getLiveAnalysis);
router.post('/push', pushLiveSnapshot);
router.get('/push/status', getLivePushStatus);

export default router;