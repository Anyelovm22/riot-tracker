import { getProBuild, CHAMPION_CATEGORIES, PRO_BUILDS_DATABASE } from "./probuilds.service";

type BuildRecommendationInput = {
  champion: string;
  versus: string | null;
  enemyTeam: string[];
};

export type BuildRecommendation = {
  champion: string;
  versus: string | null;
  runes: string[];
  boots: string;
  coreItems: string[];
  situationalItems: string[];
  tips: string[];
  proPlayers: Array<{ name: string; team: string; region: string }>;
  winRate: number;
  pickRate: number;
  banRate: number;
  vsSpecific: {
    label: string;
    items: string[];
    reason: string;
  }[];
  skillOrder: string;
  summonerSpells: string[];
  startingItems: string[];
  keystone: string;
  primaryRune: string;
  secondaryRune: string;
  runeDetails: {
    primary: string;
    keystone: string;
    primaryRunes: string[];
    secondary: string;
    secondaryRunes: string[];
  } | null;
};

function countMatches(team: string[], pool: string[]) {
  return team.filter((champ) => pool.includes(champ)).length;
}

function getEnemyLaner(enemyTeam: string[], versus: string | null): string | null {
  if (versus) return versus;
  if (enemyTeam.length > 0) return enemyTeam[0];
  return null;
}

export function getDynamicRecommendation(
  input: BuildRecommendationInput
): BuildRecommendation {
  const { champion, versus, enemyTeam } = input;
  const proBuild = getProBuild(champion);

  // Count enemy team composition
  const healerCount = countMatches(enemyTeam, CHAMPION_CATEGORIES.healers);
  const ccCount = countMatches(enemyTeam, CHAMPION_CATEGORIES.heavyCC);
  const tankCount = countMatches(enemyTeam, CHAMPION_CATEGORIES.tanks);
  const apBurstCount = countMatches(enemyTeam, CHAMPION_CATEGORIES.burstAP);
  const adBurstCount = countMatches(enemyTeam, CHAMPION_CATEGORIES.burstAD);

  // If we have pro build data, use it as base
  if (proBuild) {
    const situationalItems = [...proBuild.situationalItems];
    const tips = [...proBuild.tips];
    const vsSpecific: BuildRecommendation["vsSpecific"] = [];

    // Add enemy-specific recommendations
    const enemyLaner = getEnemyLaner(enemyTeam, versus);
    
    if (enemyLaner) {
      // Check if enemy laner has specific counter
      const isHealer = CHAMPION_CATEGORIES.healers.includes(enemyLaner);
      const isAP = CHAMPION_CATEGORIES.burstAP.includes(enemyLaner);
      const isAD = CHAMPION_CATEGORIES.burstAD.includes(enemyLaner);
      const isTank = CHAMPION_CATEGORIES.tanks.includes(enemyLaner);

      if (isHealer && proBuild.vsHealers.length > 0) {
        vsSpecific.push({
          label: `vs ${enemyLaner} (Healer)`,
          items: proBuild.vsHealers,
          reason: "Compra antiheal temprano para reducir su sustain"
        });
      }
      if (isAP && proBuild.vsAP.length > 0) {
        vsSpecific.push({
          label: `vs ${enemyLaner} (AP Burst)`,
          items: proBuild.vsAP,
          reason: "Necesitas resistencia magica contra su burst"
        });
      }
      if (isAD && proBuild.vsAD.length > 0) {
        vsSpecific.push({
          label: `vs ${enemyLaner} (AD Assassin)`,
          items: proBuild.vsAD,
          reason: "Itemiza armadura para sobrevivir su burst"
        });
      }
      if (isTank && proBuild.vsTanks.length > 0) {
        vsSpecific.push({
          label: `vs ${enemyLaner} (Tank)`,
          items: proBuild.vsTanks,
          reason: "Necesitas penetracion para atravesar su resistencia"
        });
      }
    }

    // Team composition based recommendations
    if (healerCount >= 2) {
      vsSpecific.push({
        label: "vs Heavy Healing",
        items: proBuild.vsHealers,
        reason: `${healerCount} healers en equipo enemigo - antiheal es obligatorio`
      });
      tips.push("El equipo enemigo tiene mucho sustain - compra antiheal temprano.");
    }

    if (ccCount >= 2) {
      tips.push("Cuidado con el CC enemigo - posicionate bien en teamfights.");
      if (!situationalItems.includes("Mercury's Treads")) {
        situationalItems.unshift("Mercury's Treads");
      }
    }

    if (tankCount >= 2) {
      vsSpecific.push({
        label: "vs Heavy Tanks",
        items: proBuild.vsTanks,
        reason: `${tankCount} tanks en equipo enemigo - necesitas penetracion`
      });
      tips.push("Frontline pesada enemiga - prioriza items de penetracion.");
    }

    if (apBurstCount >= 2) {
      vsSpecific.push({
        label: "vs AP Heavy",
        items: proBuild.vsAP,
        reason: `${apBurstCount} amenazas AP - considera MR`
      });
    }

    if (adBurstCount >= 2) {
      vsSpecific.push({
        label: "vs AD Assassins",
        items: proBuild.vsAD,
        reason: `${adBurstCount} asesinos AD - necesitas armadura`
      });
    }

    // Calculate boots based on enemy comp
    let boots = proBuild.boots;
    if (ccCount >= 3) {
      boots = "Mercury's Treads";
    } else if (adBurstCount >= 2 && !["ADC", "Mid AP"].includes(proBuild.role)) {
      boots = "Plated Steelcaps";
    }

    return {
      champion,
      versus,
      runes: [proBuild.runes.keystone, ...proBuild.runes.primaryRunes.slice(0, 3)],
      boots,
      coreItems: proBuild.coreItems,
      situationalItems: [...new Set(situationalItems)].slice(0, 5),
      tips: [...new Set(tips)].slice(0, 5),
      proPlayers: proBuild.proPlayers,
      winRate: proBuild.winRate,
      pickRate: proBuild.pickRate,
      banRate: proBuild.banRate,
      vsSpecific,
      skillOrder: proBuild.skillOrder,
      summonerSpells: proBuild.summonerSpells,
      startingItems: proBuild.startingItems,
      keystone: proBuild.runes.keystone,
      primaryRune: proBuild.runes.primary,
      secondaryRune: proBuild.runes.secondary,
      runeDetails: {
        primary: proBuild.runes.primary,
        keystone: proBuild.runes.keystone,
        primaryRunes: proBuild.runes.primaryRunes,
        secondary: proBuild.runes.secondary,
        secondaryRunes: proBuild.runes.secondaryRunes
      }
    };
  }

  // Fallback for champions not in database - generate generic recommendation
  return getGenericRecommendation(champion, versus, enemyTeam, {
    healerCount,
    ccCount,
    tankCount,
    apBurstCount,
    adBurstCount
  });
}

function getGenericRecommendation(
  champion: string,
  versus: string | null,
  enemyTeam: string[],
  counts: {
    healerCount: number;
    ccCount: number;
    tankCount: number;
    apBurstCount: number;
    adBurstCount: number;
  }
): BuildRecommendation {
  const { healerCount, ccCount, tankCount, apBurstCount, adBurstCount } = counts;
  
  const situationalItems: string[] = [];
  const tips: string[] = [];
  const vsSpecific: BuildRecommendation["vsSpecific"] = [];

  // Generic AP mid recommendations
  const runes = ["Electrocute", "Taste of Blood", "Eyeball Collection", "Ultimate Hunter"];
  const coreItems = ["Luden's Companion", "Sorcerer's Shoes", "Shadowflame"];

  if (healerCount >= 1) {
    situationalItems.push("Morellonomicon");
    vsSpecific.push({
      label: "vs Healers",
      items: ["Morellonomicon", "Oblivion Orb"],
      reason: "Compra antiheal contra el sustain enemigo"
    });
  }

  if (tankCount >= 2) {
    situationalItems.push("Void Staff");
    vsSpecific.push({
      label: "vs Tanks",
      items: ["Void Staff", "Liandry's Anguish"],
      reason: "Necesitas penetracion magica"
    });
  }

  if (apBurstCount >= 2) {
    situationalItems.push("Banshee's Veil");
    vsSpecific.push({
      label: "vs AP Burst",
      items: ["Banshee's Veil", "Mercury's Treads"],
      reason: "Protegete del burst AP enemigo"
    });
  }

  if (adBurstCount >= 2) {
    situationalItems.push("Zhonya's Hourglass");
    vsSpecific.push({
      label: "vs AD Assassins",
      items: ["Zhonya's Hourglass", "Seeker's Armguard"],
      reason: "Zhonya es esencial contra asesinos AD"
    });
  }

  // Add generic situational items
  if (situationalItems.length < 3) {
    situationalItems.push("Zhonya's Hourglass", "Void Staff", "Rabadon's Deathcap");
  }

  tips.push(
    "Adapta tu build segun la composicion enemiga",
    "Farmea bien y busca tu powerspike de items",
    "Posicionate bien en teamfights"
  );

  if (versus) {
    tips.unshift(`Estudia el matchup vs ${versus} para mejorar tus trades`);
  }

  return {
    champion,
    versus,
    runes,
    boots: ccCount >= 2 ? "Mercury's Treads" : "Sorcerer's Shoes",
    coreItems,
    situationalItems: [...new Set(situationalItems)].slice(0, 5),
    tips: tips.slice(0, 5),
    proPlayers: [],
    winRate: 50,
    pickRate: 5,
    banRate: 2,
    vsSpecific,
    skillOrder: "Q > W > E",
    summonerSpells: ["Flash", "Ignite"],
    startingItems: ["Doran's Ring", "Health Potion x2"],
    keystone: "Electrocute",
    primaryRune: "Domination",
    secondaryRune: "Sorcery",
    runeDetails: {
      primary: "Domination",
      keystone: "Electrocute",
      primaryRunes: ["Taste of Blood", "Eyeball Collection", "Ultimate Hunter"],
      secondary: "Sorcery",
      secondaryRunes: ["Manaflow Band", "Transcendence"]
    }
  };
}

// Get all available pro builds for a list of champions
export function getProBuildsForChampions(champions: string[]): BuildRecommendation[] {
  return champions
    .map(champ => {
      const proBuild = getProBuild(champ);
      if (proBuild) {
        return getDynamicRecommendation({ champion: champ, versus: null, enemyTeam: [] });
      }
      return null;
    })
    .filter((build): build is BuildRecommendation => build !== null);
}

// List all champions with pro builds available
export function getAvailableProBuildChampions(): string[] {
  return Object.keys(PRO_BUILDS_DATABASE);
}
