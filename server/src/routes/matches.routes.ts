import { Router } from 'express';
import { getMatchHistory } from '../controllers/matches.controller';

const router = Router();
router.get('/history', getMatchHistory);
export default router;