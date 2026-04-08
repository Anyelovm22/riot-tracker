let cachedVersion: string | null = null;
let cachedChampionMap: Record<number, string> | null = null;
let cachedItems: ItemData[] | null = null;
let cachedRunes: RuneTree[] | null = null;

export type ItemData = {
  id: number;
  name: string;
  description: string;
  plaintext: string;
  image: string;
  gold: {
    base: number;
    total: number;
    sell: number;
  };
  stats: Record<string, number>;
  tags: string[];
};

export type RuneData = {
  id: number;
  key: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  icon: string;
};

export type RuneTree = {
  id: number;
  key: string;
  name: string;
  icon: string;
  slots: {
    runes: RuneData[];
  }[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Data Dragon error ${response.status}: ${url}`);
  }

  return response.json() as Promise<T>;
}

export async function getLatestDdragonVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;

  const versions = await fetchJson<string[]>(
    "https://ddragon.leagueoflegends.com/api/versions.json"
  );

  cachedVersion = versions[0];
  return cachedVersion;
}

export async function getChampionIdMap(): Promise<Record<number, string>> {
  if (cachedChampionMap) return cachedChampionMap;

  const version = await getLatestDdragonVersion();

  const payload = await fetchJson<{
    data: Record<
      string,
      {
        id: string;
        key: string;
        name: string;
      }
    >;
  }>(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);

  const map: Record<number, string> = {};

  Object.values(payload.data).forEach((champion) => {
    map[Number(champion.key)] = champion.id;
  });

  cachedChampionMap = map;
  return map;
}

export async function getAllItems(): Promise<ItemData[]> {
  if (cachedItems) return cachedItems;

  const version = await getLatestDdragonVersion();

  const payload = await fetchJson<{
    data: Record<string, {
      name: string;
      description: string;
      plaintext: string;
      image: { full: string };
      gold: { base: number; total: number; sell: number };
      stats: Record<string, number>;
      tags: string[];
    }>;
  }>(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`);

  const items: ItemData[] = Object.entries(payload.data).map(([id, item]) => ({
    id: Number(id),
    name: item.name,
    description: item.description,
    plaintext: item.plaintext,
    image: `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${item.image.full}`,
    gold: item.gold,
    stats: item.stats,
    tags: item.tags || []
  }));

  cachedItems = items;
  return items;
}

export async function getItemByName(name: string): Promise<ItemData | null> {
  const items = await getAllItems();
  return items.find(item => 
    item.name.toLowerCase() === name.toLowerCase() ||
    item.name.toLowerCase().includes(name.toLowerCase())
  ) || null;
}

export async function getItemsByNames(names: string[]): Promise<ItemData[]> {
  const items = await getAllItems();
  return names.map(name => {
    const found = items.find(item => 
      item.name.toLowerCase() === name.toLowerCase() ||
      item.name.toLowerCase().includes(name.toLowerCase())
    );
    return found;
  }).filter((item): item is ItemData => item !== null);
}

export async function getAllRunes(): Promise<RuneTree[]> {
  if (cachedRunes) return cachedRunes;

  const version = await getLatestDdragonVersion();

  const payload = await fetchJson<Array<{
    id: number;
    key: string;
    name: string;
    icon: string;
    slots: Array<{
      runes: Array<{
        id: number;
        key: string;
        name: string;
        shortDesc: string;
        longDesc: string;
        icon: string;
      }>;
    }>;
  }>>(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`);

  const runeTrees: RuneTree[] = payload.map(tree => ({
    id: tree.id,
    key: tree.key,
    name: tree.name,
    icon: `https://ddragon.leagueoflegends.com/cdn/img/${tree.icon}`,
    slots: tree.slots.map(slot => ({
      runes: slot.runes.map(rune => ({
        id: rune.id,
        key: rune.key,
        name: rune.name,
        shortDesc: rune.shortDesc,
        longDesc: rune.longDesc,
        icon: `https://ddragon.leagueoflegends.com/cdn/img/${rune.icon}`
      }))
    }))
  }));

  cachedRunes = runeTrees;
  return runeTrees;
}

export async function getRuneByName(name: string): Promise<{ rune: RuneData; tree: string } | null> {
  const trees = await getAllRunes();
  
  for (const tree of trees) {
    for (const slot of tree.slots) {
      const found = slot.runes.find(rune => 
        rune.name.toLowerCase() === name.toLowerCase() ||
        rune.key.toLowerCase() === name.toLowerCase()
      );
      if (found) {
        return { rune: found, tree: tree.name };
      }
    }
  }
  
  return null;
}

export async function getRunesByNames(names: string[]): Promise<Array<{ rune: RuneData; tree: string }>> {
  const results: Array<{ rune: RuneData; tree: string }> = [];
  
  for (const name of names) {
    const found = await getRuneByName(name);
    if (found) {
      results.push(found);
    }
  }
  
  return results;
}
