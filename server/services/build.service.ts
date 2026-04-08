import { getItemsByNames, getRunesByNames, getLatestDdragonVersion, ItemData, RuneData } from "./ddragon.service";
import { getProBuild, CHAMPION_CATEGORIES, PRO_BUILDS_DATABASE } from "./probuilds.service";
import { 
  analyzeEnemyBuild, 
  analyzeTeamBuild, 
  getCounterBuildVsEnemy,
  type EnemyBuildAnalysis,
  type TeamBuildAnalysis,
  type BuildType
} from "./enemyBuildAnalyzer.service";
import { getCounterItems as getCounterItemsByType } from "./itemClassification";

// Types for full build data with images
export type FullItemData = {
  name: string;
  image: string;
  gold: number;
  description: string;
};

export type FullRuneData = {
  name: string;
  image: string;
  tree: string;
  description: string;
};

export type LaneBuild = {
  title: string;
  description: string;
  vsChampion: string | null;
  vsRole: string;
  items: FullItemData[];
  runes: {
    keystone: FullRuneData;
    primaryTree: string;
    primaryRunes: FullRuneData[];
    secondaryTree: string;
    secondaryRunes: FullRuneData[];
  };
  summonerSpells: string[];
  skillOrder: string;
  startingItems: FullItemData[];
  boots: FullItemData | null;
  tips: string[];
  winRate: number;
};

export type TeamBuild = {
  title: string;
  description: string;
  enemyTeamComp: {
    champion: string;
    role: string;
    threat: "low" | "medium" | "high";
  }[];
  items: FullItemData[];
  runes: {
    keystone: FullRuneData;
    primaryTree: string;
    primaryRunes: FullRuneData[];
    secondaryTree: string;
    secondaryRunes: FullRuneData[];
  };
  situationalItems: FullItemData[];
  tips: string[];
  teamAnalysis: {
    healerCount: number;
    tankCount: number;
    ccCount: number;
    apThreat: number;
    adThreat: number;
  };
};

export type FullBuildRecommendation = {
  champion: string;
  championImage: string;
  role: string;
  laneBuild: LaneBuild;
  teamBuild: TeamBuild;
  proPlayers: Array<{ name: string; team: string; region: string }>;
  generalStats: {
    winRate: number;
    pickRate: number;
    banRate: number;
  };
};

// New types for VS specific enemy builds
export type EnemyItemAnalysis = {
  champion: string;
  championImage: string;
  detectedBuildType: BuildType;
  expectedBuildType: BuildType;
  isOffMeta: boolean;
  confidence: number;
  items: FullItemData[];
  counterItems: FullItemData[];
  tips: string[];
};

export type VsEnemyBuildRecommendation = {
  myChampion: string;
  myChampionImage: string;
  myRole: string;
  targetEnemy: EnemyItemAnalysis;
  recommendedBuild: {
    coreItems: FullItemData[];
    counterItems: FullItemData[];
    boots: FullItemData | null;
    runes: {
      keystone: FullRuneData;
      primaryTree: string;
      primaryRunes: FullRuneData[];
      secondaryTree: string;
      secondaryRunes: FullRuneData[];
    };
    tips: string[];
  };
  teamContext: {
    enemies: Array<{
      champion: string;
      championImage: string;
      detectedBuildType: BuildType;
      isOffMeta: boolean;
    }>;
    totalAPThreat: number;
    totalADThreat: number;
    primaryThreat: 'ap' | 'ad' | 'balanced';
    teamTips: string[];
    teamPriorityItems: FullItemData[];
  };
};

// Helper to convert item names to full item data
async function getFullItemData(names: string[]): Promise<FullItemData[]> {
  const items = await getItemsByNames(names);
  return items.map(item => ({
    name: item.name,
    image: item.image,
    gold: item.gold.total,
    description: item.plaintext || item.description.replace(/<[^>]*>/g, '').substring(0, 100)
  }));
}

// Helper to convert rune names to full rune data
async function getFullRuneData(names: string[]): Promise<FullRuneData[]> {
  const runes = await getRunesByNames(names);
  return runes.map(r => ({
    name: r.rune.name,
    image: r.rune.icon,
    tree: r.tree,
    description: r.rune.shortDesc.replace(/<[^>]*>/g, '')
  }));
}

// Analyze enemy team composition
function analyzeEnemyTeam(enemyTeam: string[]): {
  healerCount: number;
  tankCount: number;
  ccCount: number;
  apThreat: number;
  adThreat: number;
  threats: Array<{ champion: string; role: string; threat: "low" | "medium" | "high" }>;
} {
  const healerCount = enemyTeam.filter(c => CHAMPION_CATEGORIES.healers.includes(c)).length;
  const tankCount = enemyTeam.filter(c => CHAMPION_CATEGORIES.tanks.includes(c)).length;
  const ccCount = enemyTeam.filter(c => CHAMPION_CATEGORIES.heavyCC.includes(c)).length;
  const apThreat = enemyTeam.filter(c => CHAMPION_CATEGORIES.burstAP.includes(c)).length;
  const adThreat = enemyTeam.filter(c => CHAMPION_CATEGORIES.burstAD.includes(c)).length;

  const threats = enemyTeam.map(champion => {
    const isHypercarry = CHAMPION_CATEGORIES.hypercarries.includes(champion);
    const isBurstAP = CHAMPION_CATEGORIES.burstAP.includes(champion);
    const isBurstAD = CHAMPION_CATEGORIES.burstAD.includes(champion);
    
    let threat: "low" | "medium" | "high" = "medium";
    if (isHypercarry || isBurstAP || isBurstAD) threat = "high";
    if (CHAMPION_CATEGORIES.tanks.includes(champion)) threat = "low";
    
    // Determine role based on champion category
    let role = "Unknown";
    if (CHAMPION_CATEGORIES.healers.includes(champion)) role = "Support";
    else if (CHAMPION_CATEGORIES.tanks.includes(champion)) role = "Tank";
    else if (CHAMPION_CATEGORIES.burstAP.includes(champion)) role = "Mage";
    else if (CHAMPION_CATEGORIES.burstAD.includes(champion)) role = "Assassin";
    else if (CHAMPION_CATEGORIES.hypercarries.includes(champion)) role = "Carry";
    
    return { champion, role, threat };
  });

  return { healerCount, tankCount, ccCount, apThreat, adThreat, threats };
}

// Get items to counter specific team composition
function getCounterItems(
  proBuild: ReturnType<typeof getProBuild>,
  analysis: ReturnType<typeof analyzeEnemyTeam>
): string[] {
  if (!proBuild) return [];
  
  const counterItems: string[] = [];
  
  if (analysis.healerCount >= 1) {
    counterItems.push(...proBuild.vsHealers);
  }
  if (analysis.tankCount >= 2) {
    counterItems.push(...proBuild.vsTanks);
  }
  if (analysis.apThreat >= 2) {
    counterItems.push(...proBuild.vsAP);
  }
  if (analysis.adThreat >= 2) {
    counterItems.push(...proBuild.vsAD);
  }
  
  // Remove duplicates and limit
  return [...new Set(counterItems)].slice(0, 4);
}

// Get tips based on team composition
function getTeamTips(analysis: ReturnType<typeof analyzeEnemyTeam>): string[] {
  const tips: string[] = [];
  
  if (analysis.healerCount >= 2) {
    tips.push(`Equipo enemigo tiene ${analysis.healerCount} healers - ANTIHEAL OBLIGATORIO desde early`);
  }
  if (analysis.tankCount >= 2) {
    tips.push(`${analysis.tankCount} tanks enemigos - prioriza items de penetracion`);
  }
  if (analysis.ccCount >= 3) {
    tips.push(`Alto CC enemigo - considera Mercury's Treads y posicionate bien`);
  }
  if (analysis.apThreat >= 2) {
    tips.push(`${analysis.apThreat} amenazas AP - considera items de MR`);
  }
  if (analysis.adThreat >= 2) {
    tips.push(`${analysis.adThreat} asesinos AD - Zhonya's o armadura es necesario`);
  }
  
  return tips;
}

// Main function to get full build recommendation
export async function getFullBuildRecommendation(
  champion: string,
  role: string,
  vsChampion: string | null,
  enemyTeam: string[]
): Promise<FullBuildRecommendation> {
  const version = await getLatestDdragonVersion();
  const proBuild = getProBuild(champion);
  const analysis = analyzeEnemyTeam(enemyTeam);
  
  // Base build data
  const baseBuild = proBuild || {
    champion,
    role: role || "Mid",
    runes: {
      primary: "Domination",
      keystone: "Electrocute",
      primaryRunes: ["Taste of Blood", "Eyeball Collection", "Ultimate Hunter"],
      secondary: "Sorcery",
      secondaryRunes: ["Manaflow Band", "Transcendence"],
      statShards: ["Adaptive Force", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "Q > W > E",
    startingItems: ["Doran's Ring", "Health Potion x2"],
    coreItems: ["Luden's Companion", "Sorcerer's Shoes", "Shadowflame"],
    situationalItems: ["Zhonya's Hourglass", "Void Staff", "Rabadon's Deathcap"],
    boots: "Sorcerer's Shoes",
    vsAP: ["Banshee's Veil"],
    vsAD: ["Zhonya's Hourglass"],
    vsTanks: ["Void Staff"],
    vsHealers: ["Morellonomicon"],
    tips: ["Farmea bien y escala", "Posicionate en teamfights"],
    proPlayers: [],
    winRate: 50,
    pickRate: 5,
    banRate: 2
  };

  // Get lane-specific items (vs enemy laner)
  let laneItems = [...baseBuild.coreItems];
  let laneTips = [...baseBuild.tips];
  
  if (vsChampion) {
    const isVsHealer = CHAMPION_CATEGORIES.healers.includes(vsChampion);
    const isVsAP = CHAMPION_CATEGORIES.burstAP.includes(vsChampion);
    const isVsAD = CHAMPION_CATEGORIES.burstAD.includes(vsChampion);
    const isVsTank = CHAMPION_CATEGORIES.tanks.includes(vsChampion);
    
    if (isVsHealer) {
      laneItems = [...laneItems.slice(0, 2), ...baseBuild.vsHealers.slice(0, 1), ...laneItems.slice(2)];
      laneTips.unshift(`vs ${vsChampion}: Compra antiheal temprano para reducir su sustain`);
    }
    if (isVsAP) {
      laneItems = [...laneItems, ...baseBuild.vsAP.slice(0, 1)];
      laneTips.unshift(`vs ${vsChampion}: Considera resistencia magica temprana`);
    }
    if (isVsAD) {
      laneItems = [...laneItems, ...baseBuild.vsAD.slice(0, 1)];
      laneTips.unshift(`vs ${vsChampion}: Zhonya's o armadura te salvara del burst`);
    }
    if (isVsTank) {
      laneItems = [...laneItems, ...baseBuild.vsTanks.slice(0, 1)];
      laneTips.unshift(`vs ${vsChampion}: Necesitas penetracion para hacer dano`);
    }
  }

  // Get team-specific items
  const teamCounterItems = getCounterItems(proBuild, analysis);
  const teamItems = [...baseBuild.coreItems, ...teamCounterItems];
  const teamTips = [...getTeamTips(analysis), ...baseBuild.tips.slice(0, 2)];

  // Fetch full item and rune data
  const [
    laneItemsData,
    teamItemsData,
    startingItemsData,
    bootsData,
    situationalItemsData,
    keystoneData,
    primaryRunesData,
    secondaryRunesData
  ] = await Promise.all([
    getFullItemData([...new Set(laneItems)].slice(0, 6)),
    getFullItemData([...new Set(teamItems)].slice(0, 6)),
    getFullItemData(baseBuild.startingItems),
    getFullItemData([baseBuild.boots]),
    getFullItemData(baseBuild.situationalItems.slice(0, 4)),
    getFullRuneData([baseBuild.runes.keystone]),
    getFullRuneData(baseBuild.runes.primaryRunes.slice(0, 3)),
    getFullRuneData(baseBuild.runes.secondaryRunes.slice(0, 2))
  ]);

  const runeConfig = {
    keystone: keystoneData[0] || { name: baseBuild.runes.keystone, image: "", tree: baseBuild.runes.primary, description: "" },
    primaryTree: baseBuild.runes.primary,
    primaryRunes: primaryRunesData,
    secondaryTree: baseBuild.runes.secondary,
    secondaryRunes: secondaryRunesData
  };

  // Determine enemy laner role
  const vsRole = vsChampion 
    ? (CHAMPION_CATEGORIES.healers.includes(vsChampion) ? "Support/Healer"
      : CHAMPION_CATEGORIES.tanks.includes(vsChampion) ? "Tank"
      : CHAMPION_CATEGORIES.burstAP.includes(vsChampion) ? "Mage"
      : CHAMPION_CATEGORIES.burstAD.includes(vsChampion) ? "Assassin"
      : "Fighter")
    : "Unknown";

  return {
    champion,
    championImage: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion}.png`,
    role: proBuild?.role || role,
    laneBuild: {
      title: vsChampion ? `Build vs ${vsChampion}` : "Build de Linea",
      description: vsChampion 
        ? `Build optimizada para ganar la linea contra ${vsChampion}`
        : "Build standard para dominar tu linea",
      vsChampion,
      vsRole,
      items: laneItemsData,
      runes: runeConfig,
      summonerSpells: baseBuild.summonerSpells,
      skillOrder: baseBuild.skillOrder,
      startingItems: startingItemsData,
      boots: bootsData[0] || null,
      tips: laneTips.slice(0, 4),
      winRate: baseBuild.winRate + (vsChampion ? Math.random() * 3 - 1 : 0)
    },
    teamBuild: {
      title: "Build vs Equipo Enemigo",
      description: `Build adaptada para enfrentar la composicion enemiga completa`,
      enemyTeamComp: analysis.threats,
      items: teamItemsData,
      runes: runeConfig,
      situationalItems: situationalItemsData,
      tips: teamTips.slice(0, 5),
      teamAnalysis: {
        healerCount: analysis.healerCount,
        tankCount: analysis.tankCount,
        ccCount: analysis.ccCount,
        apThreat: analysis.apThreat,
        adThreat: analysis.adThreat
      }
    },
    proPlayers: baseBuild.proPlayers,
    generalStats: {
      winRate: baseBuild.winRate,
      pickRate: baseBuild.pickRate,
      banRate: baseBuild.banRate
    }
  };
}

// Get all available champions with builds
export function getAvailableBuildChampions(): string[] {
  return Object.keys(PRO_BUILDS_DATABASE);
}

// New function: Get build recommendation vs a specific enemy
export async function getBuildVsSpecificEnemy(
  myChampion: string,
  myRole: string,
  targetEnemy: string,
  targetEnemyItems: string[],
  targetEnemyRune: string | undefined,
  allEnemies: Array<{ champion: string; items: string[]; runeKeystone?: string }>
): Promise<VsEnemyBuildRecommendation> {
  const version = await getLatestDdragonVersion();
  const proBuild = getProBuild(myChampion);
  
  // Analyze the specific target enemy
  const targetAnalysis = analyzeEnemyBuild(targetEnemy, targetEnemyItems, targetEnemyRune);
  
  // Analyze the whole team
  const teamAnalysis = analyzeTeamBuild(allEnemies, myRole);
  
  // Get counter build for the target
  const counterBuild = getCounterBuildVsEnemy(
    myChampion, 
    myRole, 
    targetEnemy, 
    targetEnemyItems, 
    targetEnemyRune
  );
  
  // Base build data
  const baseBuild = proBuild || {
    champion: myChampion,
    role: myRole || "Mid",
    runes: {
      primary: "Domination",
      keystone: "Electrocute",
      primaryRunes: ["Taste of Blood", "Eyeball Collection", "Ultimate Hunter"],
      secondary: "Sorcery",
      secondaryRunes: ["Manaflow Band", "Transcendence"],
      statShards: ["Adaptive Force", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "Q > W > E",
    startingItems: ["Doran's Ring", "Health Potion x2"],
    coreItems: ["Luden's Companion", "Sorcerer's Shoes", "Shadowflame"],
    situationalItems: ["Zhonya's Hourglass", "Void Staff", "Rabadon's Deathcap"],
    boots: "Sorcerer's Shoes",
    vsAP: ["Banshee's Veil", "Mercury's Treads"],
    vsAD: ["Zhonya's Hourglass", "Plated Steelcaps"],
    vsTanks: ["Void Staff", "Liandry's Anguish"],
    vsHealers: ["Morellonomicon"],
    tips: ["Farmea bien y escala", "Posicionate en teamfights"],
    proPlayers: [],
    winRate: 50,
    pickRate: 5,
    banRate: 2
  };

  // Get role-specific counter items
  const roleCounterItems = getCounterItemsByType(targetAnalysis.detectedBuildType, myRole);
  
  // Combine with pro build situational items
  let counterItemNames: string[] = [];
  switch (targetAnalysis.detectedBuildType) {
    case 'ap':
      counterItemNames = [...baseBuild.vsAP, ...roleCounterItems.slice(0, 2)];
      break;
    case 'ad':
      counterItemNames = [...baseBuild.vsAD, ...roleCounterItems.slice(0, 2)];
      break;
    case 'tank':
      counterItemNames = [...baseBuild.vsTanks, ...roleCounterItems.slice(0, 2)];
      break;
    case 'support':
    case 'hybrid':
    default:
      counterItemNames = [...roleCounterItems.slice(0, 3)];
  }
  
  // Remove duplicates
  counterItemNames = [...new Set(counterItemNames)].slice(0, 4);
  
  // Fetch all item and rune data
  const [
    coreItemsData,
    counterItemsData,
    bootsData,
    targetEnemyItemsData,
    keystoneData,
    primaryRunesData,
    secondaryRunesData,
    teamPriorityItemsData
  ] = await Promise.all([
    getFullItemData(baseBuild.coreItems.slice(0, 4)),
    getFullItemData(counterItemNames),
    getFullItemData([baseBuild.boots]),
    getFullItemData(targetEnemyItems.filter(Boolean)),
    getFullRuneData([baseBuild.runes.keystone]),
    getFullRuneData(baseBuild.runes.primaryRunes.slice(0, 3)),
    getFullRuneData(baseBuild.runes.secondaryRunes.slice(0, 2)),
    getFullItemData(teamAnalysis.recommendations.priorityItems.slice(0, 4))
  ]);

  // Analyze all enemies
  const enemiesWithAnalysis = await Promise.all(
    allEnemies.map(async (enemy) => {
      const analysis = analyzeEnemyBuild(enemy.champion, enemy.items, enemy.runeKeystone);
      return {
        champion: enemy.champion,
        championImage: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${enemy.champion}.png`,
        detectedBuildType: analysis.detectedBuildType,
        isOffMeta: analysis.isOffMeta
      };
    })
  );

  // Build tips combining target-specific and general tips
  const tips = [
    ...counterBuild.tips,
    ...(targetAnalysis.isOffMeta ? [`ALERTA: ${targetEnemy} tiene build ${targetAnalysis.detectedBuildType.toUpperCase()} - ajusta tu build!`] : []),
    ...baseBuild.tips.slice(0, 2)
  ].slice(0, 6);

  // Calculate counter items for target
  const targetCounterItemsData = await getFullItemData(counterBuild.counterItems.slice(0, 4));

  return {
    myChampion,
    myChampionImage: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${myChampion}.png`,
    myRole: proBuild?.role || myRole,
    targetEnemy: {
      champion: targetEnemy,
      championImage: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${targetEnemy}.png`,
      detectedBuildType: targetAnalysis.detectedBuildType,
      expectedBuildType: targetAnalysis.expectedBuildType,
      isOffMeta: targetAnalysis.isOffMeta,
      confidence: targetAnalysis.confidence,
      items: targetEnemyItemsData,
      counterItems: targetCounterItemsData,
      tips: counterBuild.tips.slice(0, 3)
    },
    recommendedBuild: {
      coreItems: coreItemsData,
      counterItems: counterItemsData,
      boots: bootsData[0] || null,
      runes: {
        keystone: keystoneData[0] || { name: baseBuild.runes.keystone, image: "", tree: baseBuild.runes.primary, description: "" },
        primaryTree: baseBuild.runes.primary,
        primaryRunes: primaryRunesData,
        secondaryTree: baseBuild.runes.secondary,
        secondaryRunes: secondaryRunesData
      },
      tips
    },
    teamContext: {
      enemies: enemiesWithAnalysis,
      totalAPThreat: teamAnalysis.totalAPDamage,
      totalADThreat: teamAnalysis.totalADDamage,
      primaryThreat: teamAnalysis.primaryThreat,
      teamTips: teamAnalysis.recommendations.tips,
      teamPriorityItems: teamPriorityItemsData
    }
  };
}
