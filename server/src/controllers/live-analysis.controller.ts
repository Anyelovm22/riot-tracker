import { Request, Response } from 'express';
import { getLiveClientAllGameData } from '../services/live-client.service';

type Role = 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'UTILITY' | 'NONE';
type ChampionClass =
  | 'tank'
  | 'bruiser'
  | 'mage'
  | 'marksman'
  | 'assassin'
  | 'support'
  | 'unknown';

type LiveItem = {
  itemID: number;
  displayName: string;
  price: number;
  count: number;
  slot: number;
};

type LiveScores = {
  assists?: number;
  creepScore?: number;
  deaths?: number;
  kills?: number;
  wardScore?: number;
  gold?: number | null;
  totalGold?: number | null;
  currentGold?: number | null;
  damage?: number | null;
  totalDamage?: number | null;
  damageToChampions?: number | null;
};

type LivePlayer = {
  championName: string;
  items: LiveItem[];
  level: number;
  position?: Role;
  riotId?: string;
  riotIdGameName?: string;
  riotIdTagLine?: string;
  summonerName?: string;
  scores?: LiveScores;
  team: 'ORDER' | 'CHAOS';
  runes?: any;
  raw?: any;
};

type EnemyBuildProfile = {
  buildType: 'tank' | 'ap' | 'ad' | 'mixed' | 'bruiser';
  damageType: 'AD' | 'AP' | 'MIXED';
  sustain: boolean;
  crit: boolean;
  onHit: boolean;
  frontline: boolean;
  antiTank: boolean;
  cc: boolean;
  itemNames: string[];
  shownCoreItems: string[];
};

type MatchupStats = {
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  cs: number;
  vision: number;
  level: number;
  gold: number | null;
  damage: number | null;
};

type MatchupComparison = {
  targetRiotId: string;
  targetChampion: string;
  me: MatchupStats;
  enemy: MatchupStats;
  diff: {
    kills: number;
    deaths: number;
    assists: number;
    kda: number;
    cs: number;
    vision: number;
    level: number;
    gold: number | null;
    damage: number | null;
  };
  verdicts: string[];
};

type EnemySignal = {
  tag: string;
  sourceItem: string;
  severity: 'alta' | 'media' | 'baja';
  summary: string;
};

type RecommendedItem = {
  itemId: number;
  name: string;
  why: string;
  priority: 'alta' | 'media' | 'baja';
  counters: string[];
};

type Recommendation = {
  key: string;
  title: string;
  reason: string;
  items: RecommendedItem[];
};

type ReplaceSuggestion = {
  sell: string;
  buy: string;
  buyItemId?: number;
  reason: string;
};

type BuildAdvice = {
  sellCandidates: Array<{
    item: string;
    slot: number;
    reason: string;
  }>;
  replaceSuggestions: ReplaceSuggestion[];
  decayCandidates: Array<{
    item: string;
    slot: number;
    reason: string;
    urgency: 'alta' | 'media' | 'baja';
  }>;
  fullBuildTips: string[];
};

type DecayCandidate = BuildAdvice['decayCandidates'][number];

type LiveCoach = {
  status: 'ahead' | 'even' | 'behind';
  now: string[];
  nextBuy: string[];
  replaceNow: string[];
  watchEnemy: string[];
  nextCheckSeconds: number;
};

const ITEM_DB = {
  thornmail: { id: 3075, name: 'Espinas' },
  frozenHeart: { id: 3110, name: 'Corazón de Hielo' },
  spiritVisage: { id: 3065, name: 'Rostro Espiritual' },
  forceOfNature: { id: 4401, name: 'Fuerza de la Naturaleza' },
  kaenic: { id: 2504, name: 'Rookern Kaénica' },
  randuin: { id: 3143, name: 'Presagio de Randuin' },
  platedSteelcaps: { id: 3047, name: 'Botas Blindadas' },
  mercs: { id: 3111, name: 'Botas de Mercurio' },
  brambleVest: { id: 3076, name: 'Chaleco de Zarzas' },
  executioners: { id: 3123, name: 'Verdugo' },
  morello: { id: 3165, name: 'Morellonomicón' },
  oblivionOrb: { id: 3916, name: 'Orbe del Olvido' },
  blackCleaver: { id: 3071, name: 'La Cuchilla Negra' },
  liandry: { id: 6653, name: 'Tormento de Liandry' },
  bork: { id: 3153, name: 'Hoja del Rey Arruinado' },
  maw: { id: 3156, name: 'Fauces de Malmortius' },
  deathsDance: { id: 6333, name: 'Baile de la Muerte' },
  banshee: { id: 3102, name: 'Velo de la Banshee' },
  zhonyas: { id: 3157, name: 'Reloj de Arena de Zhonya' },
  unendingDespair: { id: 2501, name: 'Desesperación Interminable' },
  sunfire: { id: 3068, name: 'Égida de Fuego Solar' },
  jaksho: { id: 6665, name: 'Jak’Sho, el Proteico' },
  guardianAngel: { id: 3026, name: 'Ángel Guardián' },
  deadMansPlate: { id: 3742, name: 'Placa del Hombre Muerto' },
};

function normalizeText(value?: string) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRole(role?: string): Role {
  const value = String(role || '').trim().toUpperCase();

  if (value === 'TOP') return 'TOP';
  if (value === 'JUNGLE') return 'JUNGLE';
  if (value === 'MIDDLE' || value === 'MID') return 'MIDDLE';
  if (value === 'BOTTOM' || value === 'BOT' || value === 'ADC') return 'BOTTOM';
  if (value === 'UTILITY' || value === 'SUPPORT') return 'UTILITY';

  return 'NONE';
}

function safeNumber(value: any, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeNullableNumber(value: any): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function getPlayerDisplayName(player: LivePlayer) {
  if (player.riotId) return player.riotId;

  if (player.riotIdGameName && player.riotIdTagLine) {
    return `${player.riotIdGameName}#${player.riotIdTagLine}`;
  }

  return player.summonerName || 'Jugador';
}

function getItemTotalGold(items: LiveItem[] = []): number {
  return items.reduce((sum, item) => {
    const price = safeNumber(item?.price, 0);
    const count = safeNumber(item?.count, 1);
    return sum + price * Math.max(1, count);
  }, 0);
}

function tryReadGold(raw: any, items: LiveItem[] = []): number | null {
  const candidates = [
    raw?.scores?.gold,
    raw?.scores?.totalGold,
    raw?.scores?.currentGold,
    raw?.gold,
    raw?.totalGold,
    raw?.currentGold,
    raw?.totalGoldEarned,
  ];

  for (const candidate of candidates) {
    const parsed = safeNullableNumber(candidate);
    if (parsed !== null) return parsed;
  }

  const itemGold = getItemTotalGold(items);
  return itemGold > 0 ? itemGold : null;
}

function tryReadDamage(raw: any): number | null {
  const candidates = [
    raw?.scores?.damage,
    raw?.scores?.totalDamage,
    raw?.scores?.damageToChampions,
    raw?.damage,
    raw?.totalDamage,
    raw?.damageToChampions,
    raw?.championDamage,
  ];

  for (const candidate of candidates) {
    const parsed = safeNullableNumber(candidate);
    if (parsed !== null) return parsed;
  }

  return null;
}

function mapPlayer(raw: any): LivePlayer {
  const items: LiveItem[] = raw?.items || [];

  return {
    championName: raw?.championName || '',
    items,
    level: safeNumber(raw?.level, 1),
    position: normalizeRole(raw?.position),
    riotId: raw?.riotId,
    riotIdGameName: raw?.riotIdGameName,
    riotIdTagLine: raw?.riotIdTagLine,
    summonerName: raw?.summonerName,
    scores: {
      ...(raw?.scores || {}),
      gold: tryReadGold(raw, items),
      damage: tryReadDamage(raw),
    },
    team: raw?.team,
    runes: raw?.runes || {},
    raw,
  };
}

function getChampionClass(championName?: string): ChampionClass {
  const champ = normalizeText(championName);

  const tanks = new Set([
    'dr. mundo',
    'sion',
    'ornn',
    'malphite',
    'maokai',
    'zac',
    'rammus',
    'sejuani',
    'shen',
    'nautilus',
    'leona',
    'alistar',
    'braum',
    'amumu',
    'tahm kench',
    'ksante',
  ]);

  const bruisers = new Set([
    'aatrox',
    'camille',
    'darius',
    'fiora',
    'garen',
    'gwen',
    'illaoi',
    'irelia',
    'jarvan iv',
    'jax',
    'mordekaiser',
    'olaf',
    'pantheon',
    'renekton',
    'riven',
    'sett',
    'trundle',
    'volibear',
    'warwick',
    'wukong',
    'yorick',
  ]);

  const mages = new Set([
    'ahri',
    'annie',
    'brand',
    'cassiopeia',
    'diana',
    'heimerdinger',
    'hwei',
    'karma',
    'karthus',
    'kassadin',
    'katarina',
    'kennen',
    'leblanc',
    'lissandra',
    'lux',
    'malzahar',
    'morgana',
    'neeko',
    'orianna',
    'ryze',
    'seraphine',
    'swain',
    'syndra',
    'taliyah',
    'twisted fate',
    'veigar',
    'vex',
    'viktor',
    'vladimir',
    'xerath',
    'ziggs',
    'zoe',
    'zyra',
  ]);

  const marksmen = new Set([
    'aphelios',
    'ashe',
    'caitlyn',
    'draven',
    'ezreal',
    'jhin',
    'jinx',
    'kaisa',
    'kalista',
    'kindred',
    'lucian',
    'miss fortune',
    'nilah',
    'samira',
    'senna',
    'sivir',
    'smolder',
    'tristana',
    'twitch',
    'varus',
    'vayne',
    'xayah',
    'zeri',
  ]);

  const assassins = new Set([
    'akali',
    'akshan',
    'ekko',
    'evelynn',
    'fizz',
    'kayn',
    'khazix',
    'naafiri',
    'qiyana',
    'rengar',
    'talon',
    'zed',
  ]);

  const supports = new Set([
    'bard',
    'blitzcrank',
    'janna',
    'lulu',
    'milio',
    'nami',
    'pyke',
    'rakan',
    'rell',
    'renata glasc',
    'sona',
    'soraka',
    'taric',
    'thresh',
    'yuumi',
    'zilean',
  ]);

  if (tanks.has(champ)) return 'tank';
  if (bruisers.has(champ)) return 'bruiser';
  if (mages.has(champ)) return 'mage';
  if (marksmen.has(champ)) return 'marksman';
  if (assassins.has(champ)) return 'assassin';
  if (supports.has(champ)) return 'support';

  return 'unknown';
}

function hasAnyItem(itemNames: string[], ...terms: string[]) {
  return itemNames.some((name) => terms.some((term) => name.includes(term)));
}

function normalizeItemName(name?: string) {
  return normalizeText(name);
}

function hasItemById(items: LiveItem[] = [], itemId?: number) {
  if (!itemId) return false;
  return items.some((item) => item.itemID === itemId);
}

function hasItemByName(items: LiveItem[] = [], itemName?: string) {
  const target = normalizeItemName(itemName);
  if (!target) return false;

  return items.some((item) => normalizeItemName(item.displayName) === target);
}

function alreadyOwnItem(items: LiveItem[] = [], item: { id: number; name: string }) {
  return hasItemById(items, item.id) || hasItemByName(items, item.name);
}

function isDefensiveTankItem(itemId: number) {
  return new Set([
    ITEM_DB.frozenHeart.id,
    ITEM_DB.randuin.id,
    ITEM_DB.forceOfNature.id,
    ITEM_DB.kaenic.id,
    ITEM_DB.spiritVisage.id,
    ITEM_DB.jaksho.id,
    ITEM_DB.unendingDespair.id,
  ]).has(itemId);
}

function canUseDefensiveTankItems(myClass: ChampionClass, role?: Role) {
  if (myClass === 'tank' || myClass === 'bruiser') return true;
  if (role !== 'UTILITY') return false;
  return myClass === 'support';
}

function canRecommendItemForProfile(
  item: { id: number; name: string },
  myClass: ChampionClass,
  role?: Role
) {
  const utilityTankAllowed = role === 'UTILITY' && myClass === 'support';
  const allowedByClass: Partial<Record<number, ChampionClass[]>> = {
    [ITEM_DB.frozenHeart.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.randuin.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.forceOfNature.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.kaenic.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.spiritVisage.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.jaksho.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.unendingDespair.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.sunfire.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.deadMansPlate.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.brambleVest.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.thornmail.id]: ['tank', 'bruiser', 'support'],
    [ITEM_DB.zhonyas.id]: ['mage', 'assassin', 'support'],
    [ITEM_DB.banshee.id]: ['mage', 'assassin', 'support'],
    [ITEM_DB.liandry.id]: ['mage', 'support'],
    [ITEM_DB.morello.id]: ['mage', 'support'],
    [ITEM_DB.oblivionOrb.id]: ['mage', 'support'],
    [ITEM_DB.blackCleaver.id]: ['bruiser', 'assassin', 'marksman'],
    [ITEM_DB.bork.id]: ['bruiser', 'assassin', 'marksman'],
    [ITEM_DB.deathsDance.id]: ['bruiser', 'assassin', 'marksman'],
    [ITEM_DB.maw.id]: ['bruiser', 'assassin', 'marksman'],
    [ITEM_DB.guardianAngel.id]: ['bruiser', 'assassin', 'marksman'],
  };

  const classPool = allowedByClass[item.id];
  if (classPool && !classPool.includes(myClass)) {
    if (!(utilityTankAllowed && classPool.includes('support'))) {
      return false;
    }
  }

  if (isDefensiveTankItem(item.id)) {
    return canUseDefensiveTankItems(myClass, role);
  }

  return true;
}

function analyzeEnemyBuild(player: LivePlayer): EnemyBuildProfile {
  const champ = normalizeText(player.championName);
  const itemNames = (player.items || []).map((item) => normalizeText(item.displayName));

  let buildType: EnemyBuildProfile['buildType'] = 'mixed';
  let damageType: EnemyBuildProfile['damageType'] = 'MIXED';

  const sustain =
    hasAnyItem(
      itemNames,
      'riftmaker',
      'bloodthirster',
      'blade of the ruined king',
      'ravenous hydra',
      'immortal shieldbow',
      'goredrinker'
    ) ||
    ['dr. mundo', 'volibear', 'warwick', 'aatrox', 'fiora', 'vladimir', 'swain'].includes(champ);

  const crit = hasAnyItem(
    itemNames,
    'infinity edge',
    'collector',
    'phantom dancer',
    'rapid firecannon',
    'lord dominik'
  );

  const onHit = hasAnyItem(
    itemNames,
    'guinsoo',
    'kraken',
    'nashor',
    'blade of the ruined king',
    'wits end',
    'terminus'
  );

  const frontline = hasAnyItem(
    itemNames,
    'sunfire',
    'thornmail',
    'jaksho',
    'warmog',
    'hollow radiance',
    'unending despair',
    'heartsteel'
  );

  const antiTank = hasAnyItem(
    itemNames,
    'black cleaver',
    'lord dominik',
    'mortal reminder',
    'void staff',
    'cryptbloom',
    'liandry',
    'blade of the ruined king'
  );

  const cc = [
    'volibear',
    'sion',
    'ornn',
    'leona',
    'nautilus',
    'amumu',
    'maokai',
    'pantheon',
    'thresh',
    'rell',
  ].includes(champ);

  const hasAPItems = hasAnyItem(
    itemNames,
    'riftmaker',
    'liandry',
    'luden',
    'stormsurge',
    'shadowflame',
    'rabadon',
    'nashor',
    'void staff',
    'cryptbloom'
  );

  const hasTankItems = hasAnyItem(
    itemNames,
    'sunfire',
    'thornmail',
    'jaksho',
    'warmog',
    'hollow radiance',
    'spirit visage',
    'force of nature',
    'kaenic',
    'heartsteel'
  );

  const hasADItems = hasAnyItem(
    itemNames,
    'black cleaver',
    'sundered sky',
    'sterak',
    'bloodthirster',
    'collector',
    'infinity edge',
    'hydra',
    'blade of the ruined king',
    'serrated dirk',
    'caulfield'
  );

  const shownCoreItems = (player.items || [])
    .map((item) => item.displayName)
    .filter(Boolean)
    .slice(0, 6);

  if (hasAPItems && !hasTankItems && !hasADItems) {
    buildType = 'ap';
    damageType = 'AP';
  } else if (hasTankItems && !hasAPItems) {
    buildType = 'tank';
    damageType = 'MIXED';
  } else if (hasADItems && !hasAPItems && !hasTankItems) {
    buildType = 'ad';
    damageType = 'AD';
  } else if (hasAPItems && hasTankItems) {
    buildType = 'bruiser';
    damageType = 'AP';
  } else if (hasADItems && hasTankItems) {
    buildType = 'bruiser';
    damageType = 'AD';
  }

  if (champ === 'dr. mundo') {
    if (hasAPItems) {
      buildType = 'ap';
      damageType = 'AP';
    } else if (hasTankItems || !itemNames.length) {
      buildType = 'tank';
      damageType = 'MIXED';
    }
  }

  if (champ === 'volibear') {
    if (hasAPItems) {
      buildType = 'ap';
      damageType = 'AP';
    } else if (hasTankItems) {
      buildType = 'tank';
      damageType = 'MIXED';
    } else {
      buildType = 'bruiser';
      damageType = hasADItems ? 'AD' : 'AP';
    }
  }

  return {
    buildType,
    damageType,
    sustain,
    crit,
    onHit,
    frontline,
    antiTank,
    cc,
    itemNames,
    shownCoreItems,
  };
}

function detectEnemySignals(player: LivePlayer): EnemySignal[] {
  const itemNames = (player.items || []).map((item) => normalizeText(item.displayName));
  const itemIds = new Set((player.items || []).map((item) => safeNumber(item.itemID, 0)).filter(Boolean));
  const signals: EnemySignal[] = [];

  const pushSignal = (
    tag: string,
    sourceItem: string,
    severity: 'alta' | 'media' | 'baja',
    summary: string
  ) => {
    if (!signals.some((signal) => signal.tag === tag)) {
      signals.push({ tag, sourceItem, severity, summary });
    }
  };

  if (itemNames.some((name) => name.includes('serrated dirk')) || itemIds.has(3134)) {
    pushSignal('early_ad_burst', 'Serrated Dirk', 'alta', 'El rival ya mostró burst AD temprano.');
  }

  if (itemNames.some((name) => name.includes('caulfield')) || itemIds.has(3133)) {
    pushSignal('ad_spike_setup', 'Caulfield', 'media', 'El rival va camino a spike AD de midgame.');
  }

  if (itemNames.some((name) => name.includes('blade of the ruined king')) || itemIds.has(3153)) {
    pushSignal(
      'anti_hp_duelist',
      'Blade of the Ruined King',
      'alta',
      'El rival castiga vida alta y duelos largos.'
    );
  }

  if (itemNames.some((name) => name.includes('liandry')) || itemIds.has(6653)) {
    pushSignal(
      'anti_tank_ap',
      'Tormento de Liandry',
      'alta',
      'El rival ya mostró daño AP de peleas largas.'
    );
  }

  if (itemNames.some((name) => name.includes('nashor')) || itemIds.has(3115)) {
    pushSignal('ap_onhit', 'Nashor’s Tooth', 'media', 'El rival está entrando en DPS AP/on-hit.');
  }

  if (itemNames.some((name) => name.includes('infinity edge')) || itemIds.has(3031)) {
    pushSignal('crit_spike', 'Infinity Edge', 'alta', 'El rival ya tiene un spike fuerte de crítico.');
  }

  if (itemNames.some((name) => name.includes('collector')) || itemIds.has(6676)) {
    pushSignal('execute_burst', 'The Collector', 'alta', 'El rival tiene burst y ejecución más peligrosa.');
  }

  if (itemNames.some((name) => name.includes('heartsteel')) || itemIds.has(3084)) {
    pushSignal('hp_stacking', 'Heartsteel', 'media', 'El rival está escalando a mucha vida.');
  }

  if (itemNames.some((name) => name.includes('black cleaver')) || itemIds.has(3071)) {
    pushSignal(
      'armor_shred',
      'Black Cleaver',
      'alta',
      'El rival está buscando bajar armadura en peleas largas.'
    );
  }

  if (itemNames.some((name) => name.includes('riftmaker')) || itemIds.has(4633)) {
    pushSignal(
      'ap_sustain',
      'Riftmaker',
      'alta',
      'El rival tiene daño mágico sostenido con curación.'
    );
  }

  if (itemNames.some((name) => name.includes('sunfire')) || itemIds.has(3068)) {
    pushSignal(
      'frontline_sunfire',
      'Sunfire Aegis',
      'media',
      'El rival ya mostró frontline de pelea larga.'
    );
  }

  if (itemNames.some((name) => name.includes('bramble vest')) || itemIds.has(3076)) {
    pushSignal(
      'antiheal_armor',
      'Bramble Vest',
      'media',
      'El rival está priorizando antiheal y armadura temprana.'
    );
  }

  return signals;
}

function buildStats(player: LivePlayer): MatchupStats {
  const kills = safeNumber(player.scores?.kills, 0);
  const deaths = safeNumber(player.scores?.deaths, 0);
  const assists = safeNumber(player.scores?.assists, 0);
  const cs = safeNumber(player.scores?.creepScore, 0);
  const vision = round2(safeNumber(player.scores?.wardScore, 0));
  const level = safeNumber(player.level, 1);
  const gold =
    safeNullableNumber(player.scores?.gold) ??
    safeNullableNumber(player.scores?.totalGold) ??
    safeNullableNumber(player.scores?.currentGold);
  const damage =
    safeNullableNumber(player.scores?.damage) ??
    safeNullableNumber(player.scores?.totalDamage) ??
    safeNullableNumber(player.scores?.damageToChampions);

  return {
    kills,
    deaths,
    assists,
    kda: round2((kills + assists) / Math.max(1, deaths)),
    cs,
    vision,
    level,
    gold,
    damage,
  };
}

function buildMatchupVerdicts(me: MatchupStats, enemy: MatchupStats) {
  const verdicts: string[] = [];

  if (me.cs - enemy.cs >= 12) verdicts.push('Vas claramente arriba en farmeo.');
  else if (enemy.cs - me.cs >= 12) verdicts.push('Vas abajo en farmeo; prioriza CS seguro.');

  if (me.level > enemy.level) verdicts.push('Tienes ventaja de nivel para pelear o zonear.');
  else if (enemy.level > me.level) verdicts.push('El rival tiene ventaja de nivel; evita forzar.');

  if (me.vision - enemy.vision >= 8) verdicts.push('Llevas mejor control de visión.');
  else if (enemy.vision - me.vision >= 8) verdicts.push('El rival te gana en visión; cuidado con ganks.');

  if (me.kda - enemy.kda >= 1.5) verdicts.push('Tu estado actual de pelea es mejor que el del rival.');
  else if (enemy.kda - me.kda >= 1.5) verdicts.push('El rival está peleando mejor; no entres sin ventaja.');

  if (me.gold !== null && enemy.gold !== null) {
    if (me.gold - enemy.gold >= 800) verdicts.push('Llevas ventaja clara de oro.');
    else if (enemy.gold - me.gold >= 800) verdicts.push('Vas abajo en oro; juega más seguro.');
  }

  if (me.damage !== null && enemy.damage !== null) {
    if (me.damage - enemy.damage >= 1500) verdicts.push('Tu presión de daño actual es mayor.');
    else if (enemy.damage - me.damage >= 1500) verdicts.push('El rival está impactando más daño.');
  }

  if (!verdicts.length) {
    verdicts.push('El matchup está relativamente parejo por ahora.');
  }

  return verdicts;
}

function buildComparison(mePlayer: LivePlayer, enemyPlayer: LivePlayer): MatchupComparison {
  const me = buildStats(mePlayer);
  const enemy = buildStats(enemyPlayer);

  return {
    targetRiotId: getPlayerDisplayName(enemyPlayer),
    targetChampion: enemyPlayer.championName,
    me,
    enemy,
    diff: {
      kills: me.kills - enemy.kills,
      deaths: me.deaths - enemy.deaths,
      assists: me.assists - enemy.assists,
      kda: round2(me.kda - enemy.kda),
      cs: me.cs - enemy.cs,
      vision: round2(me.vision - enemy.vision),
      level: me.level - enemy.level,
      gold: me.gold !== null && enemy.gold !== null ? me.gold - enemy.gold : null,
      damage: me.damage !== null && enemy.damage !== null ? me.damage - enemy.damage : null,
    },
    verdicts: buildMatchupVerdicts(me, enemy),
  };
}

function pushRecommendation(
  list: RecommendedItem[],
  ownedItems: LiveItem[],
  item: { id: number; name: string },
  why: string,
  priority: 'alta' | 'media' | 'baja',
  counters: string[]
) {
  if (alreadyOwnItem(ownedItems, item)) return;

  if (!list.some((entry) => entry.itemId === item.id)) {
    list.push({
      itemId: item.id,
      name: item.name,
      why,
      priority,
      counters,
    });
  }
}

function dedupeRecommendations(items: RecommendedItem[]) {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.itemId)) return false;
    seen.add(item.itemId);
    return true;
  });
}

function mergeRecommendationSets(recommendations: Recommendation[]) {
  const merged: RecommendedItem[] = [];

  for (const recommendation of recommendations) {
    for (const item of recommendation.items || []) {
      if (!merged.some((entry) => entry.itemId === item.itemId)) {
        merged.push(item);
      }
    }
  }

  return merged;
}

function buildProRecommendations(
  me: LivePlayer,
  enemy: LivePlayer | null,
  comparison: MatchupComparison | null
): Recommendation[] {
  const myClass = getChampionClass(me.championName);
  const myRole = normalizeRole(me.position);
  const result: RecommendedItem[] = [];
  const signals = enemy ? detectEnemySignals(enemy) : [];
  const ownedItems = me.items || [];

  const isBehind =
    (comparison?.diff.gold ?? 0) <= -800 ||
    (comparison?.diff.level ?? 0) < 0 ||
    (comparison?.diff.cs ?? 0) <= -12;

  const isAhead =
    (comparison?.diff.gold ?? 0) >= 800 ||
    (comparison?.diff.level ?? 0) > 0 ||
    (comparison?.diff.cs ?? 0) >= 12;

  for (const signal of signals) {
    if (signal.tag === 'early_ad_burst') {
      if (myClass === 'tank' || myClass === 'bruiser') {
        if (!alreadyOwnItem(ownedItems, ITEM_DB.platedSteelcaps)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.platedSteelcaps,
            `Ya mostró ${signal.sourceItem}; reduce muy bien su castigo físico temprano.`,
            'alta',
            [signal.sourceItem, 'burst AD']
          );
        } else if (!alreadyOwnItem(ownedItems, ITEM_DB.brambleVest)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.brambleVest,
            isBehind
              ? 'Vas abajo y necesitas una respuesta barata y eficiente para aguantar.'
              : 'Te da armadura temprana muy buena contra su spike.',
            'alta',
            [signal.sourceItem]
          );
        } else if (!alreadyOwnItem(ownedItems, ITEM_DB.frozenHeart)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.frozenHeart,
            'Ya cubriste lo básico; ahora conviene bajar DPS sostenido y velocidad de ataque.',
            'media',
            [signal.sourceItem, 'burst AD']
          );
        }
      } else {
        if (!alreadyOwnItem(ownedItems, ITEM_DB.platedSteelcaps)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.platedSteelcaps,
            `Ya mostró ${signal.sourceItem}; necesitas bajar su burst.`,
            'alta',
            [signal.sourceItem]
          );
        } else if (!alreadyOwnItem(ownedItems, ITEM_DB.deathsDance)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.deathsDance,
            'Muy buena respuesta contra daño físico explosivo.',
            'media',
            ['burst AD']
          );
        } else if (!alreadyOwnItem(ownedItems, ITEM_DB.guardianAngel)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.guardianAngel,
            'Siguiente capa útil para sobrevivir pickoffs o reset del rival.',
            'media',
            ['burst AD']
          );
        }
      }
    }

    if (signal.tag === 'ad_spike_setup') {
      if (!alreadyOwnItem(ownedItems, ITEM_DB.platedSteelcaps)) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.platedSteelcaps,
          'Ya está armando piezas AD de midgame; las botas frenan bien su presión.',
          'media',
          [signal.sourceItem]
        );
      } else if (!alreadyOwnItem(ownedItems, ITEM_DB.deathsDance)) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.deathsDance,
          'Si ya tienes botas defensivas, esta es una buena siguiente respuesta al spike AD.',
          'media',
          [signal.sourceItem]
        );
      }
    }

    if (signal.tag === 'anti_hp_duelist') {
      if (
        canRecommendItemForProfile(ITEM_DB.frozenHeart, myClass, myRole) &&
        !alreadyOwnItem(ownedItems, ITEM_DB.frozenHeart)
      ) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.frozenHeart,
          'Reduce mucho el valor de su DPS sostenido y velocidad de ataque.',
          'alta',
          [signal.sourceItem, 'duelos largos']
        );
      } else if (
        canRecommendItemForProfile(ITEM_DB.randuin, myClass, myRole) &&
        !alreadyOwnItem(ownedItems, ITEM_DB.randuin)
      ) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.randuin,
          'Segunda capa útil si también te amenaza con autoataques y trades largos.',
          'media',
          [signal.sourceItem, 'duelos largos']
        );
      }
    }

    if (signal.tag === 'crit_spike') {
      if (
        canRecommendItemForProfile(ITEM_DB.randuin, myClass, myRole) &&
        !alreadyOwnItem(ownedItems, ITEM_DB.randuin)
      ) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.randuin,
          `Ya llegó a ${signal.sourceItem}; Randuin gana muchísimo valor aquí.`,
          'alta',
          [signal.sourceItem, 'crit']
        );
      } else if (
        canRecommendItemForProfile(ITEM_DB.frozenHeart, myClass, myRole) &&
        !alreadyOwnItem(ownedItems, ITEM_DB.frozenHeart)
      ) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.frozenHeart,
          'Ya tienes respuesta anti-crit; ahora conviene bajar DPS sostenido y velocidad de ataque.',
          'media',
          [signal.sourceItem, 'crit', 'DPS']
        );
      }
    }

    if (signal.tag === 'anti_tank_ap') {
      if (
        canRecommendItemForProfile(ITEM_DB.forceOfNature, myClass, myRole) &&
        !alreadyOwnItem(ownedItems, ITEM_DB.forceOfNature)
      ) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.forceOfNature,
          `Ya mostró ${signal.sourceItem}; necesitas MR real para peleas largas.`,
          'alta',
          [signal.sourceItem, 'AP sostenido']
        );
      } else if (
        canRecommendItemForProfile(ITEM_DB.kaenic, myClass, myRole) &&
        !alreadyOwnItem(ownedItems, ITEM_DB.kaenic)
      ) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.kaenic,
          'Si ya tienes MR base, esta es una gran segunda capa contra poke o burst AP.',
          'media',
          [signal.sourceItem, 'AP']
        );
      } else if (
        canRecommendItemForProfile(ITEM_DB.spiritVisage, myClass, myRole) &&
        !alreadyOwnItem(ownedItems, ITEM_DB.spiritVisage)
      ) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.spiritVisage,
          'Otra opción útil para aguantar peleas largas si ya cubriste MR principal.',
          'media',
          [signal.sourceItem, 'AP']
        );
      }
    }

    if (signal.tag === 'ap_onhit') {
      if (
        canRecommendItemForProfile(ITEM_DB.forceOfNature, myClass, myRole) &&
        !alreadyOwnItem(ownedItems, ITEM_DB.forceOfNature)
      ) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.forceOfNature,
          'Muy buena contra daño mágico repetido.',
          'media',
          [signal.sourceItem, 'AP on-hit']
        );
      } else if (
        canRecommendItemForProfile(ITEM_DB.kaenic, myClass, myRole) &&
        !alreadyOwnItem(ownedItems, ITEM_DB.kaenic)
      ) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.kaenic,
          'Siguiente resistencia útil si ya tienes la primera respuesta anti AP.',
          'media',
          [signal.sourceItem, 'AP on-hit']
        );
      }
    }

    if (signal.tag === 'ap_sustain') {
      if (myClass === 'mage') {
        if (!alreadyOwnItem(ownedItems, ITEM_DB.morello)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.morello,
            'Necesitas antiheal contra daño mágico sostenido con curación.',
            'alta',
            [signal.sourceItem, 'sustain']
          );
        } else if (!alreadyOwnItem(ownedItems, ITEM_DB.zhonyas)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.zhonyas,
            'Ya tienes antiheal; ahora conviene supervivencia para no regalar engage o reset.',
            'alta',
            [signal.sourceItem, 'burst', 'follow-up']
          );
        } else if (!alreadyOwnItem(ownedItems, ITEM_DB.banshee)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.banshee,
            'Ya cubriste curación; ahora puedes bloquear pick AP o engage clave.',
            'media',
            [signal.sourceItem, 'AP']
          );
        }
      } else {
        if (!alreadyOwnItem(ownedItems, ITEM_DB.maw)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.maw,
            'Te ayuda a no caer contra burst y daño mágico prolongado.',
            'alta',
            [signal.sourceItem, 'AP sustain']
          );
        } else if (!alreadyOwnItem(ownedItems, ITEM_DB.spiritVisage)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.spiritVisage,
            'Ya tienes defensa inicial; ahora mejora tu aguante en peleas largas.',
            'media',
            [signal.sourceItem, 'AP sustain']
          );
        } else if (!alreadyOwnItem(ownedItems, ITEM_DB.forceOfNature)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.forceOfNature,
            'Buena siguiente capa de MR contra daño mágico repetido.',
            'media',
            [signal.sourceItem, 'AP']
          );
        }
      }
    }

    if (signal.tag === 'hp_stacking') {
      if (myClass === 'mage') {
        if (!alreadyOwnItem(ownedItems, ITEM_DB.liandry)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.liandry,
            'Para magos, suele rendir mejor que BORK contra objetivos de mucha vida.',
            'alta',
            [signal.sourceItem, 'vida alta']
          );
        } else if (!alreadyOwnItem(ownedItems, ITEM_DB.morello)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.morello,
            'Buen follow-up si además hay sustain en peleas largas.',
            'media',
            [signal.sourceItem, 'vida alta']
          );
        }
      } else {
        if (!alreadyOwnItem(ownedItems, ITEM_DB.bork)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.bork,
            'Castiga muy bien acumulación de vida.',
            'media',
            [signal.sourceItem, 'vida alta']
          );
        } else if (!alreadyOwnItem(ownedItems, ITEM_DB.blackCleaver)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.blackCleaver,
            'Ayuda a ganar peleas largas contra frontlines.',
            'media',
            ['vida alta', 'armadura']
          );
        }
      }
    }

    if (signal.tag === 'armor_shred' && (myClass === 'tank' || myClass === 'bruiser')) {
      if (!alreadyOwnItem(ownedItems, ITEM_DB.jaksho)) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.jaksho,
          'Si el rival te quiere bajar armadura, te conviene aguante más completo.',
          'media',
          [signal.sourceItem, 'shred de armadura']
        );
      } else if (!alreadyOwnItem(ownedItems, ITEM_DB.unendingDespair)) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.unendingDespair,
          'Muy útil para aguantar peleas largas aunque te estén desgastando.',
          'media',
          [signal.sourceItem]
        );
      }
    }

    if (signal.tag === 'frontline_sunfire') {
      if (myClass === 'mage') {
        if (!alreadyOwnItem(ownedItems, ITEM_DB.liandry)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.liandry,
            'Excelente contra frontlines que quieren pelear largo.',
            'media',
            [signal.sourceItem, 'frontline']
          );
        }
      } else {
        if (!alreadyOwnItem(ownedItems, ITEM_DB.blackCleaver)) {
          pushRecommendation(
            result,
            ownedItems,
            ITEM_DB.blackCleaver,
            'Muy útil para bajar frontline y no pegarle a una pared.',
            'media',
            [signal.sourceItem, 'frontline']
          );
        }
      }
    }

    if (signal.tag === 'antiheal_armor') {
      if (isAhead && !alreadyOwnItem(ownedItems, ITEM_DB.zhonyas) && myClass === 'mage') {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.zhonyas,
          'Si vas arriba, Zhonya te deja mantener presión sin regalar shutdown.',
          'media',
          [signal.sourceItem, 'armadura']
        );
      }
    }

    if (signal.tag === 'execute_burst') {
      if (!alreadyOwnItem(ownedItems, ITEM_DB.zhonyas) && myClass === 'mage') {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.zhonyas,
          'Muy valiosa contra ejecución y burst para cortar el follow-up.',
          'alta',
          [signal.sourceItem, 'execute']
        );
      } else if (!alreadyOwnItem(ownedItems, ITEM_DB.guardianAngel)) {
        pushRecommendation(
          result,
          ownedItems,
          ITEM_DB.guardianAngel,
          'Buena respuesta si el rival ya amenaza reset o ejecución.',
          'media',
          [signal.sourceItem, 'execute']
        );
      }
    }
  }

  const deduped = dedupeRecommendations(result).filter((item) =>
    canRecommendItemForProfile(
      { id: item.itemId, name: item.name },
      myClass,
      myRole
    )
  );

  if (!deduped.length) {
    const enemyProfile = enemy ? analyzeEnemyBuild(enemy) : null;

    if (
      enemyProfile?.damageType === 'AD' &&
      !alreadyOwnItem(ownedItems, ITEM_DB.platedSteelcaps)
    ) {
      deduped.push({
        itemId: ITEM_DB.platedSteelcaps.id,
        name: ITEM_DB.platedSteelcaps.name,
        why: 'El mayor daño mostrado es físico; esta compra te da valor inmediato.',
        priority: 'media',
        counters: ['AD'],
      });
    }

    if (
      enemyProfile?.damageType === 'AP' &&
      !alreadyOwnItem(ownedItems, ITEM_DB.mercs)
    ) {
      deduped.push({
        itemId: ITEM_DB.mercs.id,
        name: ITEM_DB.mercs.name,
        why: 'El rival está priorizando daño mágico; necesitas resistencia mágica temprana.',
        priority: 'media',
        counters: ['AP'],
      });
    }
    if (myClass === 'mage') {
      if (!alreadyOwnItem(ownedItems, ITEM_DB.zhonyas)) {
        deduped.push({
          itemId: ITEM_DB.zhonyas.id,
          name: ITEM_DB.zhonyas.name,
          why: 'No hay una amenaza específica dominante; este item sigue siendo la opción más segura y flexible.',
          priority: 'media',
          counters: ['general'],
        });
      } else if (!alreadyOwnItem(ownedItems, ITEM_DB.banshee)) {
        deduped.push({
          itemId: ITEM_DB.banshee.id,
          name: ITEM_DB.banshee.name,
          why: 'Ya cubriste Zhonya; Banshee es una buena capa defensiva general.',
          priority: 'baja',
          counters: ['general'],
        });
      }
    } else if (myClass === 'tank' || myClass === 'bruiser') {
      if (!alreadyOwnItem(ownedItems, ITEM_DB.jaksho)) {
        deduped.push({
          itemId: ITEM_DB.jaksho.id,
          name: ITEM_DB.jaksho.name,
          why: 'No hay una señal única dominante; Jak’Sho te da aguante general muy sólido.',
          priority: 'media',
          counters: ['general'],
        });
      }
    } else if (myClass === 'support') {
      if (!alreadyOwnItem(ownedItems, ITEM_DB.mercs)) {
        deduped.push({
          itemId: ITEM_DB.mercs.id,
          name: ITEM_DB.mercs.name,
          why: 'Como soporte, te ayuda a reposicionarte y sobrevivir control enemigo.',
          priority: 'media',
          counters: ['control', 'AP'],
        });
      } else if (!alreadyOwnItem(ownedItems, ITEM_DB.zhonyas)) {
        deduped.push({
          itemId: ITEM_DB.zhonyas.id,
          name: ITEM_DB.zhonyas.name,
          why: 'Excelente compra defensiva universal cuando no hay una señal dominante.',
          priority: 'media',
          counters: ['general'],
        });
      }
    } else {
      if (!alreadyOwnItem(ownedItems, ITEM_DB.guardianAngel)) {
        deduped.push({
          itemId: ITEM_DB.guardianAngel.id,
          name: ITEM_DB.guardianAngel.name,
          why: 'Compra segura para no regalar kills cuando el análisis aún no ve un counter claro.',
          priority: 'baja',
          counters: ['general'],
        });
      }
    }
  }

  if (!deduped.length) {
    const emergencyPool = [
      ITEM_DB.platedSteelcaps,
      ITEM_DB.mercs,
      ITEM_DB.zhonyas,
      ITEM_DB.guardianAngel,
      ITEM_DB.jaksho,
    ];

    const fallback = emergencyPool.find((item) => !alreadyOwnItem(ownedItems, item));
    if (fallback) {
      deduped.push({
        itemId: fallback.id,
        name: fallback.name,
        why: 'No hay señales suficientes, pero necesitas un spike defensivo inmediato para pelear mejor.',
        priority: 'baja',
        counters: ['general'],
      });
    }
  }

  return deduped.length
    ? [
        {
          key: 'core-counter',
          title: 'Counter recomendado',
          reason: 'Estas recomendaciones se basan en lo que el rival ya mostró en partida y en la diferencia real del matchup.',
          items: deduped.slice(0, 4),
        },
      ]
    : [];
}

function isBootsItem(item: LiveItem) {
  const name = normalizeText(item.displayName);
  return (
    name.includes('boots') ||
    name.includes('botas') ||
    item.itemID === ITEM_DB.platedSteelcaps.id ||
    item.itemID === ITEM_DB.mercs.id
  );
}

function isStarterOrLowValueItem(item: LiveItem) {
  const name = normalizeText(item.displayName);

  return (
    name.includes('potion') ||
    name.includes('poción') ||
    name.includes('ward') ||
    name.includes('sentinel') ||
    name.includes('control') ||
    name.includes('galleta') ||
    name.includes('doran') ||
    name.includes('cull')
  );
}

function shouldSwapBoots(items: LiveItem[] = []) {
  const fullItems = items.filter((item) => item.itemID && !isStarterOrLowValueItem(item));
  return fullItems.length >= 6 && fullItems.some(isBootsItem);
}

function hasNearFullBuild(items: LiveItem[] = []) {
  const combatItems = items.filter(
    (item) => item.itemID && !isStarterOrLowValueItem(item)
  );
  return combatItems.length >= 5;
}

function getSellCandidates(items: LiveItem[] = []) {
  const candidates = items
    .filter((item) => item.itemID)
    .filter((item) => isStarterOrLowValueItem(item))
    .map((item) => ({
      item: item.displayName,
      slot: item.slot,
      reason: 'Este slot podría rendir mejor con un item situacional más fuerte.',
    }));

  return candidates.slice(0, 3);
}

function getDecayCandidates(
  me: LivePlayer,
  enemy: LivePlayer | null,
  comparison: MatchupComparison | null
) {
  const items = me.items || [];
  const isBehind = (comparison?.diff.gold ?? 0) <= -700 || (comparison?.diff.level ?? 0) < 0;
  const enemySignals = enemy ? detectEnemySignals(enemy) : [];

  const candidates: DecayCandidate[] = items
    .filter((item) => item.itemID)
    .flatMap<DecayCandidate>((item) => {
        const name = normalizeText(item.displayName);

      if (name.includes('doran') || name.includes('cull')) {
        return {
          item: item.displayName,
          slot: item.slot,
          reason: 'Item de early game: ya no escala tan bien para peleas de mid/late.',
          urgency: 'media',
        };
      }

      if ((name.includes('potion') || name.includes('galleta')) && items.length >= 4) {
        return {
          item: item.displayName,
          slot: item.slot,
          reason: 'Valor bajo en este momento; mejor convertir ese slot en spike real.',
          urgency: 'alta',
        };
      }

      if (name.includes('executioner') || name.includes('oblivion orb')) {
        const enemyHasSustain = enemySignals.some((signal) =>
          ['ap_sustain', 'anti_hp_duelist'].includes(signal.tag)
        );
        if (!enemyHasSustain && !isBehind) {
           return {
            item: item.displayName,
            slot: item.slot,
            reason: 'El rival no está mostrando tanta curación; este slot puede rendir más en stats directos.',
            urgency: 'media',
          };
        }
      }

      return [];
    });

  return candidates.slice(0, 3);
}

function getNextOwnedCounterUpgrade(me: LivePlayer, enemy: LivePlayer | null): ReplaceSuggestion[] {
  if (!enemy) return [];

  const ownedItems = me.items || [];
  const signals = detectEnemySignals(enemy);
  const suggestions: ReplaceSuggestion[] = [];

  const addSuggestion = (
    sellName: string,
    buyItem: { id: number; name: string },
    reason: string
  ) => {
    if (alreadyOwnItem(ownedItems, buyItem)) return;

    if (
      suggestions.some(
        (entry) => entry.sell === sellName && entry.buyItemId === buyItem.id
      )
    ) {
      return;
    }

    suggestions.push({
      sell: sellName,
      buy: buyItem.name,
      buyItemId: buyItem.id,
      reason,
    });
  };

  for (const signal of signals) {
    if (signal.tag === 'ap_sustain' && alreadyOwnItem(ownedItems, ITEM_DB.morello)) {
      if (!alreadyOwnItem(ownedItems, ITEM_DB.zhonyas)) {
        addSuggestion(
          ITEM_DB.morello.name,
          ITEM_DB.zhonyas,
          'Ya cubriste heridas graves; el siguiente spike útil aquí es supervivencia.'
        );
      } else if (!alreadyOwnItem(ownedItems, ITEM_DB.banshee)) {
        addSuggestion(
          ITEM_DB.morello.name,
          ITEM_DB.banshee,
          'Ya cubriste antiheal y defensa activa; ahora puedes cubrir pick AP.'
        );
      }
    }

    if (signal.tag === 'crit_spike' && alreadyOwnItem(ownedItems, ITEM_DB.randuin)) {
      if (!alreadyOwnItem(ownedItems, ITEM_DB.frozenHeart)) {
        addSuggestion(
          ITEM_DB.randuin.name,
          ITEM_DB.frozenHeart,
          'Ya tienes anti-crit; ahora conviene cortar velocidad de ataque y DPS sostenido.'
        );
      }
    }

    if (signal.tag === 'anti_tank_ap' && alreadyOwnItem(ownedItems, ITEM_DB.forceOfNature)) {
      if (!alreadyOwnItem(ownedItems, ITEM_DB.kaenic)) {
        addSuggestion(
          ITEM_DB.forceOfNature.name,
          ITEM_DB.kaenic,
          'Ya tienes MR base; Kaénica puede ser el siguiente paso situacional.'
        );
      }
    }
  }

  return suggestions.slice(0, 3);
}

function buildAdaptiveTips(
  me: LivePlayer,
  enemy: LivePlayer | null,
  comparison: MatchupComparison | null
) {
  const tips: string[] = [];

  if (!enemy) return tips;

  const signals = detectEnemySignals(enemy);

  for (const signal of signals) {
    if (signal.tag === 'ap_sustain') {
      tips.push('El rival tiene curación visible; considera antiheal temprano.');
    }

    if (signal.tag === 'early_ad_burst') {
      tips.push('Respeta el burst temprano; evita intercambios largos sin visión.');
    }

    if (signal.tag === 'crit_spike') {
      tips.push('Su spike de crítico ya existe; no entres a rango gratis.');
    }
  }

  if ((comparison?.diff.level ?? 0) < 0) {
    tips.push('Estás abajo en nivel; evita all-ins hasta igualar experiencia.');
  }

  if ((comparison?.diff.vision ?? 0) < -8) {
    tips.push('Te falta visión para seguir presionando cómodo.');
  }

  return Array.from(new Set(tips)).slice(0, 4);
}

function buildBuildAdvice(
  me: LivePlayer,
  enemy: LivePlayer | null,
  comparison: MatchupComparison | null
): BuildAdvice {
  const nearFullBuild = hasNearFullBuild(me.items || []);
  const sellCandidates = nearFullBuild ? getSellCandidates(me.items || []) : [];
  const decayCandidates = nearFullBuild
    ? getDecayCandidates(me, enemy, comparison)
    : [];

  const replaceSuggestions: ReplaceSuggestion[] = [
    ...(nearFullBuild ? getNextOwnedCounterUpgrade(me, enemy) : []),
  ];

  if (shouldSwapBoots(me.items || [])) {
    const myClass = getChampionClass(me.championName);

    replaceSuggestions.push({
      sell: 'Botas',
      buy:
        myClass === 'tank'
          ? ITEM_DB.unendingDespair.name
          : myClass === 'mage'
          ? ITEM_DB.zhonyas.name
          : ITEM_DB.guardianAngel.name,
      buyItemId:
        myClass === 'tank'
          ? ITEM_DB.unendingDespair.id
          : myClass === 'mage'
          ? ITEM_DB.zhonyas.id
          : ITEM_DB.guardianAngel.id,
      reason:
        'Si ya estás full build, el slot de botas puede rendir menos que un item completo situacional.',
    });
  }

  const fullBuildTips: string[] = [];

  if (replaceSuggestions.length) {
    fullBuildTips.push('Ya cubriste parte del counter principal; piensa en el siguiente spike situacional.');
  }

  if (shouldSwapBoots(me.items || [])) {
    fullBuildTips.push('Estás cerca de full build o ya lo estás; revisa si botas sigue siendo tu mejor slot.');
  }

  return {
    sellCandidates,
    replaceSuggestions: replaceSuggestions.slice(0, 4),
    decayCandidates,
    fullBuildTips,
  };
}

function buildLiveCoach(
  me: LivePlayer,
  enemy: LivePlayer | null,
  comparison: MatchupComparison | null,
  buildAdvice: BuildAdvice
): LiveCoach {
  const status: LiveCoach['status'] =
    (comparison?.diff.gold ?? 0) >= 700 || (comparison?.diff.level ?? 0) > 0
      ? 'ahead'
      : (comparison?.diff.gold ?? 0) <= -700 || (comparison?.diff.level ?? 0) < 0
      ? 'behind'
      : 'even';

  const watchEnemy = (enemy ? detectEnemySignals(enemy) : [])
    .slice(0, 3)
    .map((signal) => `${signal.sourceItem}: ${signal.summary}`);

  const nextBuy = buildAdvice.replaceSuggestions
    .slice(0, 2)
    .map((entry) => `Cambia ${entry.sell} por ${entry.buy} (${entry.reason})`);

  const replaceNow = buildAdvice.decayCandidates
    .slice(0, 2)
    .map((entry) => `${entry.item}: ${entry.reason}`);

  const now: string[] = [];
  now.push(
    `Estado (${me.position || 'NONE'}): KDA ${safeNumber(me.scores?.kills, 0)}/${safeNumber(me.scores?.deaths, 0)}/${safeNumber(me.scores?.assists, 0)}, CS ${safeNumber(me.scores?.creepScore, 0)}, Oro ${safeNumber(me.scores?.gold, 0)}, Daño ${safeNumber(me.scores?.damage, 0)}.`
  );

  if (enemy) {
    const shownItems = (enemy.items || [])
      .map((item) => item.displayName)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    now.push(
      `Referencia rival (${enemy.position || 'NONE'} · ${enemy.championName}): KDA ${safeNumber(enemy.scores?.kills, 0)}/${safeNumber(enemy.scores?.deaths, 0)}/${safeNumber(enemy.scores?.assists, 0)}, CS ${safeNumber(enemy.scores?.creepScore, 0)}${shownItems ? `, items ${shownItems}` : ''}.`
    );
  }

  if ((comparison?.diff.cs ?? 0) <= -10) now.push('Prioriza farm seguro 60-90s antes de forzar pelea.');
  if ((comparison?.diff.vision ?? 0) < -6) now.push('Juega con visión defensiva y evita zonas oscuras.');
  if ((comparison?.diff.level ?? 0) > 0) now.push('Tienes ventana por nivel: busca trade corto o presión de objetivo.');
  if (!now.length) now.push('Mantén presión estable y espera mostrar más items enemigos para ajustar el spike.');

  return {
    status,
    now: now.slice(0, 3),
    nextBuy,
    replaceNow,
    watchEnemy,
    nextCheckSeconds: 25,
  };
}

function serializeTarget(player: LivePlayer) {
  const profile = analyzeEnemyBuild(player);

  return {
    riotId: getPlayerDisplayName(player),
    championName: player.championName,
    position: player.position || 'NONE',
    level: player.level,
    items: player.items || [],
    scores: buildStats(player),
    runes: player.runes || {},
    enemyProfile: profile,
    detectedFrom: {
      champion: player.championName,
      items: (player.items || []).map((item) => item.displayName),
    },
  };
}

function findMyPlayer(allPlayers: LivePlayer[]) {
  return allPlayers.find((player) => player.team === 'ORDER') || allPlayers[0] || null;
}

function findEnemies(allPlayers: LivePlayer[], myTeam: 'ORDER' | 'CHAOS') {
  return allPlayers.filter((player) => player.team !== myTeam);
}

function findLaneEnemy(
  enemies: LivePlayer[],
  preferredRole?: Role,
  myPosition?: Role
) {
  const targetRole = preferredRole && preferredRole !== 'NONE' ? preferredRole : myPosition;

  if (targetRole && targetRole !== 'NONE') {
    const exact = enemies.find((enemy) => enemy.position === targetRole);
    if (exact) return exact;
  }

  return enemies[0] || null;
}

function findEnemyByRiotId(enemies: LivePlayer[], targetRiotId?: string) {
  const wanted = normalizeText(targetRiotId);
  if (!wanted) return null;

  return (
    enemies.find((enemy) => normalizeText(getPlayerDisplayName(enemy)) === wanted) ||
    null
  );
}

function buildNarrativeSummary(targets: LivePlayer[], me?: LivePlayer | null, comparisons: MatchupComparison[] = []) {
  if (!targets.length) {
    return 'No se encontraron objetivos para analizar.';
  }

  if (targets.length === 1) {
    const target = targets[0];
    const profile = analyzeEnemyBuild(target);
    const shown = profile.shownCoreItems.length
      ? `Items visibles: ${profile.shownCoreItems.join(', ')}.`
      : '';
    const comparison = comparisons[0];
    const matchupContext = comparison
      ? ` Matchup directo (${me?.position || 'NONE'} vs ${target.position || 'NONE'}): diff KDA ${comparison.diff.kda}, diff CS ${comparison.diff.cs}, diff oro ${
          comparison.diff.gold ?? 'N/A'
        }, diff daño ${comparison.diff.damage ?? 'N/A'}.`
      : '';

    return `${target.championName} está jugando una ruta ${profile.buildType.toUpperCase()} con daño ${profile.damageType}. ${
      profile.sustain ? 'Tiene sustain importante. ' : ''
    }${profile.frontline ? 'Puede aguantar peleas largas. ' : ''}${
      profile.antiTank ? 'Sus items castigan bien a campeones con vida o resistencias. ' : ''
    }${shown}${matchupContext}`;
  }

  const profiles = targets.map(analyzeEnemyBuild);

  const ap = profiles.filter((p) => p.damageType === 'AP').length;
  const ad = profiles.filter((p) => p.damageType === 'AD').length;
  const sustain = profiles.filter((p) => p.sustain).length;
  const frontline = profiles.filter((p) => p.frontline).length;
  const cc = profiles.filter((p) => p.cc).length;

  const parts: string[] = [];

  if (ap >= 2) parts.push('hay bastante daño mágico');
  if (ad >= 2) parts.push('hay bastante daño físico');
  if (sustain >= 2) parts.push('varios enemigos tienen sustain');
  if (frontline >= 2) parts.push('el equipo tiene frontline sólida');
  if (cc >= 2) parts.push('hay bastante control de masas');

  if (!parts.length) {
    return 'El equipo enemigo está bastante mixto; conviene responder al campeón que más te esté castigando.';
  }

  return `En el equipo enemigo ${parts.join(', ')}.`;
}

export async function getLiveAnalysis(req: Request, res: Response) {
  try {
    const mode = String(req.query.mode || 'lane').trim().toLowerCase();
    const targetRiotId = String(req.query.targetRiotId || '').trim();
    const preferredRole = normalizeRole(String(req.query.preferredRole || ''));

    const allGameData = await getLiveClientAllGameData();
    const players: LivePlayer[] = (allGameData?.allPlayers || []).map(mapPlayer);

    if (!players.length) {
      return res.status(404).json({
        message: 'No se detectaron jugadores en la partida en vivo.',
      });
    }

    const activePlayerName =
      allGameData?.activePlayer?.riotId ||
      (allGameData?.activePlayer?.riotIdGameName && allGameData?.activePlayer?.riotIdTagLine
        ? `${allGameData.activePlayer.riotIdGameName}#${allGameData.activePlayer.riotIdTagLine}`
        : allGameData?.activePlayer?.summonerName) ||
      '';

    let me =
      players.find((player) => normalizeText(getPlayerDisplayName(player)) === normalizeText(activePlayerName)) ||
      players[0];

    if (!me) {
      return res.status(404).json({
        message: 'No se pudo identificar al jugador activo.',
      });
    }

    const myRole = me.position || 'NONE';
    const detectedRole = myRole;
    const enemyTeam = findEnemies(players, me.team);

    if (!enemyTeam.length) {
      return res.status(404).json({
        message: 'No se encontró el equipo enemigo.',
      });
    }

    let selectedTargets: LivePlayer[] = [];

    if (mode === 'team') {
      selectedTargets = enemyTeam;
    } else if (mode === 'player' && targetRiotId) {
      const byId = findEnemyByRiotId(enemyTeam, targetRiotId);
      selectedTargets = byId ? [byId] : [enemyTeam[0]];
    } else {
      const laneEnemy = findLaneEnemy(enemyTeam, preferredRole, myRole);
      selectedTargets = laneEnemy ? [laneEnemy] : [enemyTeam[0]];
    }

    const comparisons = selectedTargets.map((target) => buildComparison(me, target));
    const primaryTarget = selectedTargets[0] || null;
    const signalSourceTargets = mode === 'team' ? selectedTargets : primaryTarget ? [primaryTarget] : [];
    const primarySignals = signalSourceTargets.flatMap((target) => detectEnemySignals(target));
    const uniqueSignals = primarySignals.filter(
      (signal, index, list) =>
        list.findIndex((current) => current.tag === signal.tag && current.sourceItem === signal.sourceItem) === index
    );

    const recommendations =
      mode === 'team'
        ? (() => {
            const fromAll = selectedTargets.map((target, index) =>
              buildProRecommendations(me, target, comparisons[index] || null)
            );
            const merged = mergeRecommendationSets(fromAll.flat());
            return merged.length
              ? [
                  {
                    key: 'team-counter',
                    title: 'Counter recomendado vs team enemigo',
                    reason:
                      'La recomendación integra señales de items y spikes detectados en varios rivales.',
                    items: merged.slice(0, 6),
                  },
                ]
              : [];
          })()
        : buildProRecommendations(me, primaryTarget, comparisons[0] || null);

    const initialBuildAdvice = buildBuildAdvice(me, primaryTarget, comparisons[0] || null);
    const targetForBuildAdvice =
      mode === 'team'
        ? selectedTargets
            .slice()
            .sort((a, b) => safeNumber(b.scores?.gold, 0) - safeNumber(a.scores?.gold, 0))[0] || null
        : primaryTarget;

    const buildAdviceByTarget = buildBuildAdvice(
      me,
      targetForBuildAdvice,
      comparisons[0] || null
    );

    const buildAdvice: BuildAdvice = {
      sellCandidates: buildAdviceByTarget.sellCandidates,
      replaceSuggestions: buildAdviceByTarget.replaceSuggestions,
      decayCandidates: buildAdviceByTarget.decayCandidates,
      fullBuildTips: [
        'Refresca el análisis si el rival enseña nuevos items.',
        'El counter se basa en lo que el enemigo ya mostró, no en una build inventada.',
        'Mientras más piezas de build se vean, más preciso será el análisis.',
        ...initialBuildAdvice.fullBuildTips,
      ],
    };
     const coach = buildLiveCoach(me, targetForBuildAdvice, comparisons[0] || null, buildAdvice);

    return res.json({
      mode,
      me: {
        riotId: getPlayerDisplayName(me),
        championName: me.championName,
        championClass: getChampionClass(me.championName),
        position: myRole || 'NONE',
        detectedPosition: detectedRole,
        team: me.team,
        level: me.level,
        items: me.items || [],
        scores: buildStats(me),
        runes: me.runes || {},
      },
      allEnemies: enemyTeam.map(serializeTarget),
      targets: selectedTargets.map(serializeTarget),
      analysisSummary: buildNarrativeSummary(selectedTargets, me, comparisons),
      enemySignals: uniqueSignals,
      recommendations,
      matchupComparisons: comparisons,
      adaptiveTips: buildAdaptiveTips(me, primaryTarget, comparisons[0] || null),
      buildAdvice,
      coach,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('LIVE ANALYSIS ERROR:', error?.message || error);

    const message = String(error?.message || '');

    if (
      message.includes('ECONNREFUSED 127.0.0.1:2999') ||
      message.includes('connect ECONNREFUSED')
    ) {
      return res.status(503).json({
        message:
          'El análisis en vivo local no está disponible. Abre League of Legends y entra en una partida en esta misma PC para usar esta función.',
        code: 'LIVE_CLIENT_UNAVAILABLE',
        detail: error?.message || null,
      });
    }

    return res.status(500).json({
      message: 'No se pudo analizar la partida en vivo',
      detail: error?.message || null,
    });
  }
}
