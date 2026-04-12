import { Router } from 'express';
import { getBuildsByChampion } from '../controllers/builds.controller';

const router = Router();

router.get('/by-champion', getBuildsByChampion);

export default router;