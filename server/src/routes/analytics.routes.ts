import { Router } from 'express';
import {
  getAnalyticsSummary,
  getLpHistory,
  syncAnalyticsMatches,
} from '../controllers/analytics.controller';

const router = Router();

router.post('/sync', syncAnalyticsMatches);
router.get('/summary', getAnalyticsSummary);
router.get('/lp-history', getLpHistory);

export default router;