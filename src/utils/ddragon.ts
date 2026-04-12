type ChampionMap = Record<
  number,
  {
    id: string;
    key: string;
    name: string;
    image: string;
  }
>;

type SpellMap = Record<
  number,
  {
    id: string;
    key: string;
    name: string;
    image: string;
  }
>;

const DDRAGON_VERSION = '15.7.1';

let championCache: ChampionMap | null = null;
let spellCache: SpellMap | null = null;

export async function loadChampionMap(): Promise<ChampionMap> {
  if (championCache) return championCache;

  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US/champion.json`
  );

  if (!res.ok) {
    throw new Error('No se pudo cargar champion.json');
  }

  const json = await res.json();

  const map: ChampionMap = {};

  Object.values(json.data).forEach((champ: any) => {
    map[Number(champ.key)] = {
      id: champ.id,
      key: champ.key,
      name: champ.name,
      image: `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${champ.image.full}`,
    };
  });

  championCache = map;
  return map;
}

export async function loadSpellMap(): Promise<SpellMap> {
  if (spellCache) return spellCache;

  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/data/en_US/summoner.json`
  );

  if (!res.ok) {
    throw new Error('No se pudo cargar summoner.json');
  }

  const json = await res.json();

  const map: SpellMap = {};

  Object.values(json.data).forEach((spell: any) => {
    map[Number(spell.key)] = {
      id: spell.id,
      key: spell.key,
      name: spell.name,
      image: `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/spell/${spell.image.full}`,
    };
  });

  spellCache = map;
  return map;
}

export function getQueueLabel(queueId?: number) {
  const queues: Record<number, string> = {
    420: 'Ranked Solo/Duo',
    440: 'Ranked Flex',
    450: 'ARAM',
    400: 'Normal Draft',
    430: 'Normal Blind',
    490: 'Quickplay',
    700: 'Clash',
    1700: 'Arena',
  };

  return queues[queueId || 0] || `Queue ${queueId ?? '-'}`;
}