import { Router } from 'express';
import { getMatchDetail, getMatchHistory } from '../controllers/matches.controller';

const router = Router();
router.get('/history', getMatchHistory);
router.get('/:matchId/detail', getMatchDetail);
export default router;
