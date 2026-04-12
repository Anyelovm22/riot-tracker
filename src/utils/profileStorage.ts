export function readStoredProfile() {
  try {
    const raw = localStorage.getItem('riot-profile-summary');
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed?.account?.puuid || !parsed?.resolvedPlatform) {
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem('riot-profile-summary');
    return null;
  }
}