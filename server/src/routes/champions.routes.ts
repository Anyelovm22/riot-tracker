import { Router } from 'express';
import { getChampion, listChampions } from '../controllers/champions.controller';

const router = Router();

router.get('/', listChampions);
router.get('/:slug', getChampion);

export default router;