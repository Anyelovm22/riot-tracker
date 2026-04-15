import { useCallback, useMemo, useRef, useState } from 'react';
import { fetchPlayerHubData } from '../services/playerHub';
import { clearModuleCache, saveCache } from '../utils/appCache';
import { getApiErrorMessage } from '../utils/httpError';
import { readStoredProfile } from '../utils/profileStorage';

type SearchParams = {
  gameName: string;
  tagLine: string;
  region: string;
};

export function usePlayerHub() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(() => readStoredProfile());
  const [overview, setOverview] = useState<any>(null);
  const requestIdRef = useRef(0);
  const lastQueryRef = useRef('');

  const runSearch = useCallback(async (params: SearchParams) => {
    const queryKey = `${params.region}:${params.gameName}:${params.tagLine}`.toLowerCase().trim();
    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    try {
      setLoading(true);
      setError('');
      setWarnings([]);

      const hubData = await fetchPlayerHubData(params);
      if (requestIdRef.current !== currentRequestId) return null;

      clearModuleCache();
      setProfile(hubData.profile);
      setOverview(hubData.overview);
      setWarnings(hubData.errors);
      lastQueryRef.current = queryKey;

      saveCache('profile', hubData.profile);
      localStorage.setItem('riot-profile-summary', JSON.stringify(hubData.profile));

      if (hubData.modules.live.data) saveCache('live', hubData.modules.live.data);
      if (hubData.modules.matches.data) saveCache('matches', hubData.modules.matches.data);
      if (hubData.modules.ranked.data) saveCache('rankedOverview', hubData.modules.ranked.data);

      return hubData.profile;
    } catch (err) {
      if (requestIdRef.current !== currentRequestId) return null;
      setProfile(null);
      setOverview(null);
      setWarnings([]);
      setError(getApiErrorMessage(err, 'No se pudo cargar el perfil'));
      return null;
    } finally {
      if (requestIdRef.current === currentRequestId) {
        setLoading(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    lastQueryRef.current = '';
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
      hasActiveProfile: Boolean(profile),
      lastQuery: lastQueryRef.current,
    }),
    [loading, error, warnings, profile, overview, runSearch, reset]
  );
}
