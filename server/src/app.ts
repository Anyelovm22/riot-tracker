import express from 'express';
import cors from 'cors';

import profileRouter from './routes/profile.routes';
import matchesRouter from './routes/matches.routes';
import rankedRouter from './routes/ranked.routes';
import liveRouter from './routes/live.routes';
import buildsRouter from './routes/builds.routes';
import championsRouter from './routes/champions.routes';
import analyticsRouter from './routes/analytics.routes';


const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/profile', profileRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/ranked', rankedRouter);
app.use('/api/live', liveRouter);
app.use('/api/builds', buildsRouter);
app.use('/api/champions', championsRouter);
app.use('/api/analytics', analyticsRouter);

export default app;