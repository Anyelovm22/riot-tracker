import { Router } from 'express';
import { getLiveGame } from '../controllers/live.controller';
import { getLiveAnalysis } from '../controllers/live-analysis.controller';

const router = Router();

router.get('/current', getLiveGame);
router.get('/analysis', getLiveAnalysis);

export default router;