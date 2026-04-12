import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import RequireProfile from './components/common/RequireProfile';

import HomePage from './pages/HomePage';
import MatchupPage from './pages/MatchupPage';
import MatchDetailPage from './pages/MatchDetailPage';
import MetaPage from './pages/MetaPage';
import BuilderPage from './pages/BuilderPage';
import ChampionPage from './pages/ChampionPage';
import LivePage from './pages/LivePage';
import LiveAnalyzePage from './pages/LiveAnalyzePage';

export default function App() {
  return (
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
  );
}
