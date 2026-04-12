const DEFAULT_DDRAGON_VERSION = '15.7.1';
let cachedVersion: string | null = null;

export async function getLatestDdragonVersion() {
  if (cachedVersion) return cachedVersion;

  try {
    const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    if (!response.ok) throw new Error('No se pudo cargar versions.json');

    const versions = (await response.json()) as string[];
    cachedVersion = versions?.[0] || DEFAULT_DDRAGON_VERSION;
    return cachedVersion;
  } catch {
    cachedVersion = DEFAULT_DDRAGON_VERSION;
    return cachedVersion;
  }
}

export function getChampionIconUrl(version: string, championName?: string | null) {
  if (!championName) return '';
  const safe = String(championName).replace(/[\s'.]/g, '');
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${safe}.png`;
}

export function getItemIconUrl(version: string, itemId?: number | null) {
  if (!itemId) return '';
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}
