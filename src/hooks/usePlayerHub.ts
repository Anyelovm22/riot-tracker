import { useCallback, useMemo, useState } from 'react';
import { fetchPlayerHubData } from '../services/playerHub';
import { clearModuleCache, saveCache } from '../utils/appCache';
import { getApiErrorMessage } from '../utils/httpError';

type SearchParams = {
  gameName: string;
  tagLine: string;
  region: string;
};

export function usePlayerHub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);

  const runSearch = useCallback(async (params: SearchParams) => {
    try {
      setLoading(true);
      setError('');
      setWarnings([]);

      clearModuleCache();
      const hubData = await fetchPlayerHubData(params);

      setProfile(hubData.profile);
      setOverview(hubData.overview);
      setWarnings(hubData.errors);

      saveCache('profile', hubData.profile);
      localStorage.setItem('riot-profile-summary', JSON.stringify(hubData.profile));

      if (hubData.modules.live.data) saveCache('live', hubData.modules.live.data);
      if (hubData.modules.matches.data) saveCache('matches', hubData.modules.matches.data);
      if (hubData.modules.ranked.data) saveCache('rankedOverview', hubData.modules.ranked.data);

      return hubData.profile;
    } catch (err) {
      setProfile(null);
      setOverview(null);
      setWarnings([]);
      setError(getApiErrorMessage(err, 'No se pudo cargar el perfil'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    clearModuleCache();
    localStorage.removeItem('riot-profile-summary');
    setProfile(null);
    setOverview(null);
    setError('');
    setWarnings([]);
  }, []);

  return useMemo(
    () => ({
      loading,
      error,
      warnings,
      profile,
      overview,
      runSearch,
      reset,
      setProfile,
    }),
    [loading, error, warnings, profile, overview, runSearch, reset]
  );
}
