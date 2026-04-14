import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import RequireProfile from './components/common/RequireProfile';

const HomePage = lazy(() => import('./pages/HomePage'));
const MatchupPage = lazy(() => import('./pages/MatchupPage'));
const MatchDetailPage = lazy(() => import('./pages/MatchDetailPage'));
const MetaPage = lazy(() => import('./pages/MetaPage'));
const BuilderPage = lazy(() => import('./pages/BuilderPage'));
const ChampionBuildsPage = lazy(() => import('./pages/ChampionBuildsPage'));
const ChampionPage = lazy(() => import('./pages/ChampionPage'));
const LivePage = lazy(() => import('./pages/LivePage'));
const LiveAnalyzePage = lazy(() => import('./pages/LiveAnalyzePage'));

function PageFallback() {
  return (
    <main className="page-shell">
      <div className="page-container">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-[var(--text-secondary)]">
          Cargando vista...
        </div>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/matches"
            element={
              <RequireProfile>
                <MatchupPage />
              </RequireProfile>
            }
          />
          <Route
            path="/matches/:matchId"
            element={
              <RequireProfile>
                <MatchDetailPage />
              </RequireProfile>
            }
          />
          <Route
            path="/meta"
            element={
              <RequireProfile>
                <MetaPage />
              </RequireProfile>
            }
          />
          <Route
            path="/live"
            element={
              <RequireProfile>
                <LivePage />
              </RequireProfile>
            }
          />
          <Route
            path="/builds"
            element={
              <RequireProfile>
                <BuilderPage />
              </RequireProfile>
            }
          />
          <Route
            path="/builds/:championName"
            element={
              <RequireProfile>
                <ChampionBuildsPage />
              </RequireProfile>
            }
          />
          <Route
            path="/champions"
            element={
              <RequireProfile>
                <ChampionPage />
              </RequireProfile>
            }
          />
          <Route
            path="/live/analyze"
            element={
              <RequireProfile>
                <LiveAnalyzePage />
              </RequireProfile>
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
