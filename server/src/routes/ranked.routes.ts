import { Router } from 'express';
import { getRankedOverview } from '../controllers/ranked.controller';

const router = Router();

router.get('/overview', getRankedOverview);

export default router;