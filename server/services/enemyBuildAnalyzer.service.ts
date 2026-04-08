/**
 * Enemy Build Analyzer Service
 * Analyzes enemy items and runes to detect their build type and recommend counters
 */

import { 
  classifyItem, 
  getCounterItems, 
  isAPItem, 
  isADItem, 
  isTankItem,
  type ItemCategory 
} from './itemClassification';
import { CHAMPION_CATEGORIES } from './probuilds.service';

export type BuildType = 'ap' | 'ad' | 'tank' | 'hybrid' | 'support' | 'unknown';

export interface EnemyBuildAnalysis {
  champion: string;
  detectedBuildType: BuildType;
  expectedBuildType: BuildType;
  isOffMeta: boolean;
  apScore: number;
  adScore: number;
  tankScore: number;
  supportScore: number;
  apItems: string[];
  adItems: string[];
  tankItems: string[];
  supportItems: string[];
  confidence: number;
  recommendation: {
    counterItems: string[];
    counterTips: string[];
  };
}

export interface TeamBuildAnalysis {
  totalAPDamage: number;
  totalADDamage: number;
  totalTankiness: number;
  primaryThreat: 'ap' | 'ad' | 'balanced';
  recommendations: {
    priorityItems: string[];
    tips: string[];
  };
}

// Default champion build types based on their kit
const CHAMPION_DEFAULT_BUILDS: Record<string, BuildType> = {
  // AP Mages
  'Ahri': 'ap', 'Azir': 'ap', 'Viktor': 'ap', 'Syndra': 'ap', 'Orianna': 'ap',
  'Lux': 'ap', 'Brand': 'ap', 'Veigar': 'ap', 'Xerath': 'ap', 'Zyra': 'ap',
  'LeBlanc': 'ap', 'Annie': 'ap', 'Malzahar': 'ap', 'Cassiopeia': 'ap',
  'Ryze': 'ap', 'Twisted Fate': 'ap', 'Neeko': 'ap', 'Zoe': 'ap',
  'Sylas': 'ap', 'Ekko': 'ap', 'Fizz': 'ap', 'Katarina': 'ap', 'Akali': 'ap',
  'Diana': 'ap', 'Elise': 'ap', 'Nidalee': 'ap', 'Evelynn': 'ap',
  'Karthus': 'ap', 'Vel\'Koz': 'ap', 'Ziggs': 'ap', 'Karma': 'ap',
  'Lissandra': 'ap', 'Taliyah': 'ap', 'Aurelion Sol': 'ap', 'Hwei': 'ap',
  'Aurora': 'ap', 'Naafiri': 'ad', 'Vex': 'ap', 'Seraphine': 'ap',
  
  // AD Assassins/Fighters
  'Zed': 'ad', 'Talon': 'ad', 'Qiyana': 'ad', 'Rengar': 'ad', 'Kha\'Zix': 'ad',
  'Kayn': 'ad', 'Pyke': 'ad', 'Jayce': 'ad', 'Riven': 'ad', 'Aatrox': 'ad',
  'Fiora': 'ad', 'Irelia': 'ad', 'Camille': 'ad', 'Jax': 'ad', 'Tryndamere': 'ad',
  'Yasuo': 'ad', 'Yone': 'ad', 'Master Yi': 'ad', 'Viego': 'ad',
  'Graves': 'ad', 'Kindred': 'ad', 'Hecarim': 'ad', 'Wukong': 'ad',
  'Pantheon': 'ad', 'Lee Sin': 'ad', 'Vi': 'ad', 'Xin Zhao': 'ad',
  'Jarvan IV': 'ad', 'Olaf': 'ad', 'Darius': 'ad', 'Garen': 'ad',
  'Renekton': 'ad', 'Sett': 'ad', 'Urgot': 'ad', 'Akshan': 'ad',
  
  // ADCs
  'Jinx': 'ad', 'Vayne': 'ad', 'Caitlyn': 'ad', 'Ashe': 'ad', 'Miss Fortune': 'ad',
  'Kai\'Sa': 'ad', 'Aphelios': 'ad', 'Samira': 'ad', 'Draven': 'ad',
  'Ezreal': 'ad', 'Tristana': 'ad', 'Twitch': 'ad', 'Kog\'Maw': 'ad',
  'Sivir': 'ad', 'Xayah': 'ad', 'Jhin': 'ad', 'Lucian': 'ad',
  'Kalista': 'ad', 'Zeri': 'ad', 'Nilah': 'ad', 'Smolder': 'ad',
  
  // Tanks
  'Ornn': 'tank', 'Sion': 'tank', 'Malphite': 'tank', 'Rammus': 'tank',
  'K\'Sante': 'tank', 'Maokai': 'tank', 'Cho\'Gath': 'tank', 'Dr. Mundo': 'tank',
  'Tahm Kench': 'tank', 'Shen': 'tank', 'Zac': 'tank', 'Sejuani': 'tank',
  'Amumu': 'tank', 'Alistar': 'tank', 'Leona': 'tank', 'Nautilus': 'tank',
  'Braum': 'tank', 'Poppy': 'tank', 'Gragas': 'tank', 'Skarner': 'tank',
  'Rell': 'tank', 'Ksante': 'tank',
  
  // Supports (Enchanter)
  'Soraka': 'support', 'Yuumi': 'support', 'Nami': 'support', 'Sona': 'support',
  'Lulu': 'support', 'Janna': 'support', 'Milio': 'support', 'Renata Glasc': 'support',
  'Bard': 'support', 'Rakan': 'support',
  
  // Can be built differently (hybrid/flex)
  'Thresh': 'tank', 'Morgana': 'ap', 'Senna': 'ad', 'Teemo': 'ap',
  'Shaco': 'ad', 'Singed': 'ap', 'Volibear': 'tank', 'Nasus': 'ad',
  'Varus': 'ad', 'Kog\'Maw': 'ad', 'Twitch': 'ad',
};

// AP Keystones that indicate AP build
const AP_KEYSTONES = [
  'Electrocute', 'Dark Harvest', 'Arcane Comet', 'Summon Aery',
  'First Strike', 'Phase Rush'
];

// AD/Attack Keystones
const AD_KEYSTONES = [
  'Lethal Tempo', 'Conqueror', 'Press the Attack', 'Hail of Blades',
  'Fleet Footwork'
];

// Tank Keystones
const TANK_KEYSTONES = [
  'Grasp of the Undying', 'Aftershock', 'Guardian'
];

/**
 * Get the expected/default build type for a champion
 */
export function getExpectedBuildType(champion: string): BuildType {
  // Check direct mapping
  if (CHAMPION_DEFAULT_BUILDS[champion]) {
    return CHAMPION_DEFAULT_BUILDS[champion];
  }
  
  // Check categories
  if (CHAMPION_CATEGORIES.burstAP.includes(champion)) return 'ap';
  if (CHAMPION_CATEGORIES.burstAD.includes(champion)) return 'ad';
  if (CHAMPION_CATEGORIES.tanks.includes(champion)) return 'tank';
  if (CHAMPION_CATEGORIES.healers.includes(champion)) return 'support';
  if (CHAMPION_CATEGORIES.hypercarries.includes(champion)) return 'ad';
  
  return 'unknown';
}

/**
 * Analyze an enemy's build based on their items
 */
export function analyzeEnemyBuild(
  champion: string,
  items: string[],
  runeKeystone?: string
): EnemyBuildAnalysis {
  let apScore = 0;
  let adScore = 0;
  let tankScore = 0;
  let supportScore = 0;
  
  const apItems: string[] = [];
  const adItems: string[] = [];
  const tankItems: string[] = [];
  const supportItems: string[] = [];
  
  // Analyze items
  for (const item of items) {
    if (!item) continue;
    
    const classification = classifyItem(item);
    
    switch (classification.category) {
      case 'ap':
        apScore += classification.weight;
        apItems.push(item);
        break;
      case 'ad':
      case 'attack_speed':
      case 'crit':
      case 'lethality':
        adScore += classification.weight;
        adItems.push(item);
        break;
      case 'tank_armor':
      case 'tank_mr':
        tankScore += classification.weight;
        tankItems.push(item);
        break;
      case 'support':
        supportScore += classification.weight;
        supportItems.push(item);
        break;
    }
  }
  
  // Factor in rune keystone
  if (runeKeystone) {
    if (AP_KEYSTONES.includes(runeKeystone)) {
      apScore += 0.5;
    } else if (AD_KEYSTONES.includes(runeKeystone)) {
      adScore += 0.5;
    } else if (TANK_KEYSTONES.includes(runeKeystone)) {
      tankScore += 0.5;
    }
  }
  
  // Determine detected build type
  const totalScore = apScore + adScore + tankScore + supportScore;
  let detectedBuildType: BuildType = 'unknown';
  let confidence = 0;
  
  if (totalScore > 0) {
    const maxScore = Math.max(apScore, adScore, tankScore, supportScore);
    
    if (maxScore === apScore) {
      detectedBuildType = 'ap';
      confidence = apScore / totalScore;
    } else if (maxScore === adScore) {
      detectedBuildType = 'ad';
      confidence = adScore / totalScore;
    } else if (maxScore === tankScore) {
      detectedBuildType = 'tank';
      confidence = tankScore / totalScore;
    } else if (maxScore === supportScore) {
      detectedBuildType = 'support';
      confidence = supportScore / totalScore;
    }
    
    // Check for hybrid builds
    const secondMaxScore = [apScore, adScore, tankScore, supportScore]
      .filter(s => s !== maxScore)
      .sort((a, b) => b - a)[0];
    
    if (secondMaxScore > 0 && maxScore / secondMaxScore < 1.5) {
      detectedBuildType = 'hybrid';
      confidence = Math.max(apScore, adScore) / totalScore;
    }
  } else {
    // No items - use default champion build type
    detectedBuildType = getExpectedBuildType(champion);
    confidence = 0.5; // Low confidence since no items
  }
  
  const expectedBuildType = getExpectedBuildType(champion);
  const isOffMeta = expectedBuildType !== 'unknown' && 
                    detectedBuildType !== 'unknown' && 
                    detectedBuildType !== expectedBuildType &&
                    totalScore > 1; // Only flag if they have enough items
  
  // Generate recommendations
  const counterItems = getCounterItems(detectedBuildType, 'mid'); // Default to mid, will be overridden
  const counterTips = generateCounterTips(champion, detectedBuildType, isOffMeta, items);
  
  return {
    champion,
    detectedBuildType,
    expectedBuildType,
    isOffMeta,
    apScore,
    adScore,
    tankScore,
    supportScore,
    apItems,
    adItems,
    tankItems,
    supportItems,
    confidence,
    recommendation: {
      counterItems,
      counterTips
    }
  };
}

/**
 * Generate counter tips based on enemy analysis
 */
function generateCounterTips(
  champion: string,
  buildType: BuildType,
  isOffMeta: boolean,
  items: string[]
): string[] {
  const tips: string[] = [];
  
  if (isOffMeta) {
    switch (buildType) {
      case 'ap':
        tips.push(`${champion} esta yendo AP - compra MR temprano aunque normalmente no lo harias`);
        break;
      case 'ad':
        tips.push(`${champion} esta yendo AD - prioriza armadura`);
        break;
      case 'tank':
        tips.push(`${champion} esta yendo tanque - compra penetracion`);
        break;
    }
  }
  
  // Check for specific items
  const hasHeal = items.some(i => 
    i?.toLowerCase().includes('bloodthirster') || 
    i?.toLowerCase().includes('riftmaker') ||
    i?.toLowerCase().includes('blade of the ruined king')
  );
  if (hasHeal) {
    tips.push(`${champion} tiene sustain alto - considera anti-heal`);
  }
  
  const hasShield = items.some(i => 
    i?.toLowerCase().includes('immortal shieldbow') ||
    i?.toLowerCase().includes('sterak')
  );
  if (hasShield) {
    tips.push(`${champion} tiene shields - Serpent's Fang puede ayudar`);
  }
  
  // Build type specific tips
  switch (buildType) {
    case 'ap':
      tips.push(`Contra ${champion} AP: Mercury's Treads, Maw, o items de MR`);
      break;
    case 'ad':
      tips.push(`Contra ${champion} AD: Zhonya's, Guardian Angel, o armadura`);
      break;
    case 'tank':
      tips.push(`${champion} es tanque - necesitas penetracion o % damage`);
      break;
    case 'hybrid':
      tips.push(`${champion} tiene build hibrido - considera resistencias mixtas`);
      break;
  }
  
  return tips;
}

/**
 * Analyze the entire enemy team's builds
 */
export function analyzeTeamBuild(
  enemies: Array<{ champion: string; items: string[]; runeKeystone?: string }>,
  myRole: string
): TeamBuildAnalysis {
  let totalAPDamage = 0;
  let totalADDamage = 0;
  let totalTankiness = 0;
  
  for (const enemy of enemies) {
    const analysis = analyzeEnemyBuild(enemy.champion, enemy.items, enemy.runeKeystone);
    totalAPDamage += analysis.apScore;
    totalADDamage += analysis.adScore;
    totalTankiness += analysis.tankScore;
  }
  
  // Determine primary threat
  let primaryThreat: 'ap' | 'ad' | 'balanced';
  const apRatio = totalAPDamage / (totalAPDamage + totalADDamage + 0.1);
  const adRatio = totalADDamage / (totalAPDamage + totalADDamage + 0.1);
  
  if (apRatio > 0.65) {
    primaryThreat = 'ap';
  } else if (adRatio > 0.65) {
    primaryThreat = 'ad';
  } else {
    primaryThreat = 'balanced';
  }
  
  // Generate team-wide recommendations
  const priorityItems: string[] = [];
  const tips: string[] = [];
  
  if (primaryThreat === 'ap') {
    priorityItems.push(...getCounterItems('ap', myRole));
    tips.push('El equipo enemigo es principalmente AP - prioriza MR');
  } else if (primaryThreat === 'ad') {
    priorityItems.push(...getCounterItems('ad', myRole));
    tips.push('El equipo enemigo es principalmente AD - prioriza armadura');
  } else {
    tips.push('El equipo enemigo tiene dano mixto - considera resistencias balanceadas');
    priorityItems.push('Gargoyle Stoneplate', "Jak'Sho, The Protean");
  }
  
  if (totalTankiness > 3) {
    priorityItems.push(...getCounterItems('tank', myRole));
    tips.push('Hay varios tanques enemigos - compra penetracion');
  }
  
  return {
    totalAPDamage,
    totalADDamage,
    totalTankiness,
    primaryThreat,
    recommendations: {
      priorityItems: [...new Set(priorityItems)].slice(0, 5), // Remove duplicates, max 5
      tips
    }
  };
}

/**
 * Get specific counter build for facing a single enemy champion
 */
export function getCounterBuildVsEnemy(
  myChampion: string,
  myRole: string,
  targetEnemy: string,
  targetEnemyItems: string[],
  targetEnemyRune?: string
): {
  analysis: EnemyBuildAnalysis;
  counterItems: string[];
  tips: string[];
} {
  const analysis = analyzeEnemyBuild(targetEnemy, targetEnemyItems, targetEnemyRune);
  
  // Get role-specific counter items
  const counterItems = getCounterItems(analysis.detectedBuildType, myRole);
  
  // Generate specific tips
  const tips = [...analysis.recommendation.counterTips];
  
  // Add champion-specific tips
  if (analysis.isOffMeta) {
    tips.unshift(`ALERTA: ${targetEnemy} esta usando una build no convencional (${analysis.detectedBuildType.toUpperCase()})`);
  }
  
  return {
    analysis,
    counterItems,
    tips
  };
}
