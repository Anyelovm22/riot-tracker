const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

// Aliases for ProBuildsPanel compatibility
export type ItemWithImage = {
  name: string;
  image: string;
  gold?: { total: number; base: number; sell: number };
};

export type RuneWithImage = {
  name: string;
  icon: string;
  tree: string;
  shortDesc?: string;
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

// Build type detected from enemy items
export type BuildType = 'ap' | 'ad' | 'tank' | 'hybrid' | 'support' | 'unknown';

// Enemy analysis type
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

// VS specific enemy build recommendation
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

// Enemy build analysis result (quick analysis)
export type EnemyBuildAnalysis = {
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
};

// Team build analysis result
export type TeamBuildAnalysis = {
  totalAPDamage: number;
  totalADDamage: number;
  totalTankiness: number;
  primaryThreat: 'ap' | 'ad' | 'balanced';
  recommendations: {
    priorityItems: string[];
    tips: string[];
  };
};

// Type expected by ProBuildsPanel
export type FullBuildResponse = {
  champion: string;
  championImage: string;
  role: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  proPlayers: Array<{ name: string; team: string; region: string }>;
  runes: {
    primary: string;
    secondary: string;
    keystone: string;
    keystoneRune: RuneWithImage | null;
    primaryRunes: string[];
    primaryRuneImages: RuneWithImage[];
    secondaryRunes: string[];
    secondaryRuneImages: RuneWithImage[];
    statShards: string[];
  };
  items: {
    starting: ItemWithImage[];
    core: ItemWithImage[];
    boots: ItemWithImage | null;
    situational: ItemWithImage[];
    vsAP: ItemWithImage[];
    vsAD: ItemWithImage[];
    vsTanks: ItemWithImage[];
    vsHealers: ItemWithImage[];
  };
  skillOrder: string;
  summonerSpells: string[];
  tips: string[];
};

// Fetch simple build for ProBuildsPanel (only needs champion name)
export async function getFullBuild(champion: string): Promise<FullBuildResponse> {
  const response = await fetch(
    `${API_BASE}/api/build/simple/${encodeURIComponent(champion)}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch build: ${response.statusText}`);
  }

  return response.json();
}

// Fetch full build recommendation with matchup context
export async function getFullBuildWithMatchup(
  champion: string,
  role: string,
  vsChampion: string | null,
  enemyTeam: string[]
): Promise<FullBuildRecommendation> {
  const params = new URLSearchParams();
  params.set("role", role);
  if (vsChampion) params.set("versus", vsChampion);
  if (enemyTeam.length > 0) params.set("enemies", enemyTeam.join(","));

  const response = await fetch(
    `${API_BASE}/api/build/full/${encodeURIComponent(champion)}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch build: ${response.statusText}`);
  }

  return response.json();
}

// Fetch build for live game
export async function getLiveGameBuild(
  champion: string,
  role: string,
  vsChampion: string | null,
  enemyTeam: string[]
): Promise<FullBuildRecommendation> {
  const response = await fetch(`${API_BASE}/api/build/live`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      champion,
      role,
      vsChampion,
      enemyTeam,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch live build: ${response.statusText}`);
  }

  return response.json();
}

// Get DDragon version
export async function getDDragonVersion(): Promise<string> {
  const response = await fetch(`${API_BASE}/api/build/version`);
  if (!response.ok) {
    throw new Error("Failed to fetch version");
  }
  const data = await response.json();
  return data.version;
}

// Get available champions with builds
export async function getAvailableChampions(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/api/build/champions`);
  if (!response.ok) {
    throw new Error("Failed to fetch champions");
  }
  const data = await response.json();
  return data.champions;
}

// NEW: Get build vs a specific enemy with their item analysis
export async function getBuildVsEnemy(
  myChampion: string,
  myRole: string,
  targetEnemy: string,
  targetEnemyItems: string[],
  targetEnemyRune: string | undefined,
  allEnemies: Array<{ champion: string; items: string[]; runeKeystone?: string }>
): Promise<VsEnemyBuildRecommendation> {
  const response = await fetch(`${API_BASE}/api/build/versus-enemy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      myChampion,
      myRole,
      targetEnemy,
      targetEnemyItems,
      targetEnemyRune,
      allEnemies,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vs enemy build: ${response.statusText}`);
  }

  return response.json();
}

// NEW: Quick analysis of an enemy's build
export async function analyzeEnemyBuild(
  champion: string,
  items: string[],
  runeKeystone?: string
): Promise<EnemyBuildAnalysis> {
  const response = await fetch(`${API_BASE}/api/build/analyze-enemy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      champion,
      items,
      runeKeystone,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to analyze enemy build: ${response.statusText}`);
  }

  return response.json();
}

// NEW: Analyze entire enemy team builds
export async function analyzeTeamBuilds(
  enemies: Array<{ champion: string; items: string[]; runeKeystone?: string }>,
  myRole: string
): Promise<TeamBuildAnalysis> {
  const response = await fetch(`${API_BASE}/api/build/analyze-team`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      enemies,
      myRole,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to analyze team builds: ${response.statusText}`);
  }

  return response.json();
}
