import { Router } from 'express';
import { getProfileSummary } from '../controllers/profile.controller';

const router = Router();
router.get('/summary', getProfileSummary);
export default router;