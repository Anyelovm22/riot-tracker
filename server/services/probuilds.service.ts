// Pro builds data - based on high ELO and professional player builds
// This provides realistic recommendations similar to probuilds.net

type ProBuildData = {
  champion: string;
  role: string;
  runes: {
    primary: string;
    keystone: string;
    primaryRunes: string[];
    secondary: string;
    secondaryRunes: string[];
    statShards: string[];
  };
  summonerSpells: string[];
  skillOrder: string;
  startingItems: string[];
  coreItems: string[];
  situationalItems: string[];
  boots: string;
  vsAP: string[];
  vsAD: string[];
  vsTanks: string[];
  vsHealers: string[];
  tips: string[];
  proPlayers: Array<{
    name: string;
    team: string;
    region: string;
  }>;
  winRate: number;
  pickRate: number;
  banRate: number;
};

// Extended champion database with pro-level builds
export const PRO_BUILDS_DATABASE: Record<string, ProBuildData> = {
  Azir: {
    champion: "Azir",
    role: "Mid",
    runes: {
      primary: "Precision",
      keystone: "Lethal Tempo",
      primaryRunes: ["Presence of Mind", "Legend: Haste", "Cut Down"],
      secondary: "Sorcery",
      secondaryRunes: ["Manaflow Band", "Transcendence"],
      statShards: ["Attack Speed", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Teleport"],
    skillOrder: "W > Q > E",
    startingItems: ["Doran's Ring", "Health Potion x2"],
    coreItems: ["Nashor's Tooth", "Sorcerer's Shoes", "Shadowflame"],
    situationalItems: ["Zhonya's Hourglass", "Void Staff", "Rabadon's Deathcap", "Banshee's Veil", "Cryptbloom"],
    boots: "Sorcerer's Shoes",
    vsAP: ["Banshee's Veil", "Mercury's Treads"],
    vsAD: ["Zhonya's Hourglass", "Seeker's Armguard"],
    vsTanks: ["Void Staff", "Liandry's Anguish"],
    vsHealers: ["Morellonomicon", "Oblivion Orb"],
    tips: [
      "Pokea con soldados en fase de lineas",
      "Guarda tu R para peel o engage crucial",
      "Farmea bien, escalas muy fuerte",
      "Posiciona soldados para zonear objetivos",
      "Usa E+Q para escapar de ganks"
    ],
    proPlayers: [
      { name: "Faker", team: "T1", region: "LCK" },
      { name: "Chovy", team: "Gen.G", region: "LCK" },
      { name: "ShowMaker", team: "DK", region: "LCK" }
    ],
    winRate: 49.2,
    pickRate: 4.8,
    banRate: 2.1
  },
  Ahri: {
    champion: "Ahri",
    role: "Mid",
    runes: {
      primary: "Domination",
      keystone: "Electrocute",
      primaryRunes: ["Taste of Blood", "Eyeball Collection", "Ultimate Hunter"],
      secondary: "Inspiration",
      secondaryRunes: ["Magical Footwear", "Biscuit Delivery"],
      statShards: ["Adaptive Force", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "Q > W > E",
    startingItems: ["Doran's Ring", "Health Potion x2"],
    coreItems: ["Luden's Companion", "Sorcerer's Shoes", "Shadowflame"],
    situationalItems: ["Zhonya's Hourglass", "Void Staff", "Rabadon's Deathcap", "Banshee's Veil", "Morellonomicon"],
    boots: "Sorcerer's Shoes",
    vsAP: ["Banshee's Veil", "Mercury's Treads"],
    vsAD: ["Zhonya's Hourglass"],
    vsTanks: ["Void Staff", "Cryptbloom"],
    vsHealers: ["Morellonomicon"],
    tips: [
      "Usa E para iniciar trades y buscar kills",
      "Tu R te permite roamear rapido - aprovechalo",
      "Farmea con Q para sustain con pasiva",
      "Busca picks en mid-game con tu mobilidad",
      "Guarda al menos un dash de R para escapar"
    ],
    proPlayers: [
      { name: "Caps", team: "G2", region: "LEC" },
      { name: "Faker", team: "T1", region: "LCK" },
      { name: "Scout", team: "LNG", region: "LPL" }
    ],
    winRate: 51.8,
    pickRate: 8.2,
    banRate: 3.4
  },
  Viktor: {
    champion: "Viktor",
    role: "Mid",
    runes: {
      primary: "Inspiration",
      keystone: "First Strike",
      primaryRunes: ["Magical Footwear", "Biscuit Delivery", "Cosmic Insight"],
      secondary: "Sorcery",
      secondaryRunes: ["Manaflow Band", "Transcendence"],
      statShards: ["Adaptive Force", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Teleport"],
    skillOrder: "E > Q > W",
    startingItems: ["Doran's Ring", "Health Potion x2"],
    coreItems: ["Luden's Companion", "Sorcerer's Shoes", "Shadowflame"],
    situationalItems: ["Zhonya's Hourglass", "Void Staff", "Rabadon's Deathcap", "Lich Bane", "Banshee's Veil"],
    boots: "Sorcerer's Shoes",
    vsAP: ["Banshee's Veil", "Mercury's Treads"],
    vsAD: ["Zhonya's Hourglass"],
    vsTanks: ["Void Staff", "Liandry's Anguish"],
    vsHealers: ["Morellonomicon"],
    tips: [
      "Farmea seguro hasta completar mejora de E",
      "Tu W es excelente para controlar zonas",
      "En teamfights posicionate atras y usa E para poke",
      "First Strike te da gold extra - aprovechalo",
      "Mejora E primero, luego Q para duelos"
    ],
    proPlayers: [
      { name: "Faker", team: "T1", region: "LCK" },
      { name: "Chovy", team: "Gen.G", region: "LCK" },
      { name: "Knight", team: "BLG", region: "LPL" }
    ],
    winRate: 50.4,
    pickRate: 5.1,
    banRate: 1.8
  },
  Jinx: {
    champion: "Jinx",
    role: "ADC",
    runes: {
      primary: "Precision",
      keystone: "Lethal Tempo",
      primaryRunes: ["Presence of Mind", "Legend: Bloodline", "Cut Down"],
      secondary: "Sorcery",
      secondaryRunes: ["Absolute Focus", "Gathering Storm"],
      statShards: ["Attack Speed", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Heal"],
    skillOrder: "Q > W > E",
    startingItems: ["Doran's Blade", "Health Potion"],
    coreItems: ["Infinity Edge", "Berserker's Greaves", "Phantom Dancer"],
    situationalItems: ["Lord Dominik's Regards", "Bloodthirster", "Guardian Angel", "Mortal Reminder", "Rapid Firecannon"],
    boots: "Berserker's Greaves",
    vsAP: ["Maw of Malmortius", "Wit's End"],
    vsAD: ["Guardian Angel", "Plated Steelcaps"],
    vsTanks: ["Lord Dominik's Regards", "Blade of the Ruined King"],
    vsHealers: ["Mortal Reminder"],
    tips: [
      "Farmea seguro en early - eres debil",
      "Usa trampas E para peeling en teamfights",
      "Cambia a cohetes en teamfights por el AOE",
      "Tu pasiva te hace imparable - busca el reset",
      "Snipea con R para asistir otras lanes"
    ],
    proPlayers: [
      { name: "Gumayusi", team: "T1", region: "LCK" },
      { name: "Ruler", team: "Gen.G", region: "LCK" },
      { name: "Viper", team: "HLE", region: "LCK" }
    ],
    winRate: 52.1,
    pickRate: 15.3,
    banRate: 8.7
  },
  Yasuo: {
    champion: "Yasuo",
    role: "Mid",
    runes: {
      primary: "Precision",
      keystone: "Lethal Tempo",
      primaryRunes: ["Triumph", "Legend: Alacrity", "Last Stand"],
      secondary: "Resolve",
      secondaryRunes: ["Second Wind", "Unflinching"],
      statShards: ["Attack Speed", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "Q > E > W",
    startingItems: ["Doran's Blade", "Health Potion"],
    coreItems: ["Kraken Slayer", "Berserker's Greaves", "Infinity Edge"],
    situationalItems: ["Death's Dance", "Guardian Angel", "Immortal Shieldbow", "Blade of the Ruined King", "Mortal Reminder"],
    boots: "Berserker's Greaves",
    vsAP: ["Wit's End", "Maw of Malmortius"],
    vsAD: ["Death's Dance", "Guardian Angel"],
    vsTanks: ["Blade of the Ruined King", "Lord Dominik's Regards"],
    vsHealers: ["Mortal Reminder"],
    tips: [
      "Stackea Q antes de tradear",
      "Usa E a traves de minions para ganar trades",
      "Windwall bloquea proyectiles clave",
      "Busca knockups de tu equipo para R",
      "Splitpushea cuando no hay objetivos"
    ],
    proPlayers: [
      { name: "Chovy", team: "Gen.G", region: "LCK" },
      { name: "ShowMaker", team: "DK", region: "LCK" },
      { name: "Rookie", team: "IG", region: "LPL" }
    ],
    winRate: 49.5,
    pickRate: 9.8,
    banRate: 15.2
  },
  Zed: {
    champion: "Zed",
    role: "Mid",
    runes: {
      primary: "Domination",
      keystone: "Electrocute",
      primaryRunes: ["Taste of Blood", "Eyeball Collection", "Ultimate Hunter"],
      secondary: "Sorcery",
      secondaryRunes: ["Transcendence", "Scorch"],
      statShards: ["Adaptive Force", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "Q > W > E",
    startingItems: ["Long Sword", "Refillable Potion"],
    coreItems: ["Eclipse", "Ionian Boots", "Voltaic Cyclosword"],
    situationalItems: ["Serylda's Grudge", "Edge of Night", "Guardian Angel", "Maw of Malmortius", "Black Cleaver"],
    boots: "Ionian Boots of Lucidity",
    vsAP: ["Maw of Malmortius", "Edge of Night"],
    vsAD: ["Death's Dance", "Guardian Angel"],
    vsTanks: ["Black Cleaver", "Serylda's Grudge"],
    vsHealers: ["Serpent's Fang", "Chempunk Chainsword"],
    tips: [
      "Pokea con W+E+Q en lane",
      "Guarda W para escapar de ganks",
      "Tu R te hace untargeteable - usalo bien",
      "Roamea despues de nivel 6",
      "Splitpushea y busca picks en side lanes"
    ],
    proPlayers: [
      { name: "Faker", team: "T1", region: "LCK" },
      { name: "Chovy", team: "Gen.G", region: "LCK" },
      { name: "Scout", team: "LNG", region: "LPL" }
    ],
    winRate: 50.2,
    pickRate: 7.5,
    banRate: 18.3
  },
  Leona: {
    champion: "Leona",
    role: "Support",
    runes: {
      primary: "Resolve",
      keystone: "Aftershock",
      primaryRunes: ["Shield Bash", "Bone Plating", "Unflinching"],
      secondary: "Inspiration",
      secondaryRunes: ["Hextech Flashtraption", "Cosmic Insight"],
      statShards: ["Health", "Armor", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "W > E > Q",
    startingItems: ["Relic Shield", "Health Potion x2"],
    coreItems: ["Locket of the Iron Solari", "Plated Steelcaps", "Knight's Vow"],
    situationalItems: ["Zeke's Convergence", "Thornmail", "Frozen Heart", "Force of Nature", "Redemption"],
    boots: "Plated Steelcaps",
    vsAP: ["Force of Nature", "Mercury's Treads"],
    vsAD: ["Frozen Heart", "Thornmail"],
    vsTanks: ["Evenshroud"],
    vsHealers: ["Thornmail"],
    tips: [
      "Nivel 2 es tu powerspike - busca all-in",
      "Usa E para engage y Q para peel",
      "Tu W te hace muy tanky en trades",
      "Roamea con tu jungler mid game",
      "En teamfights protege a tu ADC o engage"
    ],
    proPlayers: [
      { name: "Keria", team: "T1", region: "LCK" },
      { name: "Meiko", team: "EDG", region: "LPL" },
      { name: "Ming", team: "RNG", region: "LPL" }
    ],
    winRate: 51.5,
    pickRate: 6.2,
    banRate: 4.1
  },
  Thresh: {
    champion: "Thresh",
    role: "Support",
    runes: {
      primary: "Resolve",
      keystone: "Aftershock",
      primaryRunes: ["Font of Life", "Bone Plating", "Unflinching"],
      secondary: "Inspiration",
      secondaryRunes: ["Hextech Flashtraption", "Cosmic Insight"],
      statShards: ["Health", "Armor", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "Q > E > W",
    startingItems: ["Relic Shield", "Health Potion x2"],
    coreItems: ["Locket of the Iron Solari", "Mobility Boots", "Knight's Vow"],
    situationalItems: ["Zeke's Convergence", "Thornmail", "Redemption", "Mikael's Blessing", "Force of Nature"],
    boots: "Mobility Boots",
    vsAP: ["Force of Nature", "Mercury's Treads"],
    vsAD: ["Frozen Heart", "Thornmail"],
    vsTanks: ["Evenshroud"],
    vsHealers: ["Thornmail"],
    tips: [
      "Practica tu Q - es tu habilidad clave",
      "Lanterna salva vidas - posicionala bien",
      "Flay interrumpe dashes enemigos",
      "Colecciona almas para escalar",
      "Roamea con tu jungler para hacer plays"
    ],
    proPlayers: [
      { name: "Keria", team: "T1", region: "LCK" },
      { name: "Lehends", team: "Gen.G", region: "LCK" },
      { name: "CoreJJ", team: "TL", region: "LCS" }
    ],
    winRate: 49.8,
    pickRate: 8.5,
    banRate: 5.3
  },
  "Lee Sin": {
    champion: "Lee Sin",
    role: "Jungle",
    runes: {
      primary: "Precision",
      keystone: "Conqueror",
      primaryRunes: ["Triumph", "Legend: Alacrity", "Coup de Grace"],
      secondary: "Inspiration",
      secondaryRunes: ["Magical Footwear", "Cosmic Insight"],
      statShards: ["Attack Speed", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Smite"],
    skillOrder: "Q > W > E",
    startingItems: ["Gustwalker Hatchling", "Refillable Potion"],
    coreItems: ["Eclipse", "Ionian Boots", "Black Cleaver"],
    situationalItems: ["Death's Dance", "Maw of Malmortius", "Guardian Angel", "Sterak's Gage", "Serpent's Fang"],
    boots: "Ionian Boots of Lucidity",
    vsAP: ["Maw of Malmortius", "Force of Nature"],
    vsAD: ["Death's Dance", "Guardian Angel"],
    vsTanks: ["Black Cleaver", "Serylda's Grudge"],
    vsHealers: ["Chempunk Chainsword"],
    tips: [
      "Gankea early - eres fuerte niveles 3-6",
      "Usa ward hop para movilidad",
      "Insec (R+Flash) puede ganar teamfights",
      "Trackea al jungler enemigo",
      "Cae late game - cierra partidas temprano"
    ],
    proPlayers: [
      { name: "Canyon", team: "Gen.G", region: "LCK" },
      { name: "Oner", team: "T1", region: "LCK" },
      { name: "Wei", team: "BLG", region: "LPL" }
    ],
    winRate: 48.9,
    pickRate: 12.1,
    banRate: 9.8
  },
  Lux: {
    champion: "Lux",
    role: "Support",
    runes: {
      primary: "Sorcery",
      keystone: "Arcane Comet",
      primaryRunes: ["Manaflow Band", "Transcendence", "Scorch"],
      secondary: "Inspiration",
      secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
      statShards: ["Adaptive Force", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "E > Q > W",
    startingItems: ["Spellthief's Edge", "Health Potion x2"],
    coreItems: ["Luden's Companion", "Sorcerer's Shoes", "Shadowflame"],
    situationalItems: ["Zhonya's Hourglass", "Mejai's Soulstealer", "Void Staff", "Rabadon's Deathcap", "Morellonomicon"],
    boots: "Sorcerer's Shoes",
    vsAP: ["Banshee's Veil"],
    vsAD: ["Zhonya's Hourglass"],
    vsTanks: ["Void Staff", "Liandry's Anguish"],
    vsHealers: ["Morellonomicon"],
    tips: [
      "Pokea con E para stackear Spellthief",
      "Tu Q es root doble - atrapa 2 enemigos",
      "Usa W para shieldear a tu ADC",
      "Tu R tiene bajo cooldown - usalo frecuente",
      "En teamfights quédate atras y spamea habilidades"
    ],
    proPlayers: [
      { name: "Keria", team: "T1", region: "LCK" },
      { name: "Beryl", team: "DK", region: "LCK" }
    ],
    winRate: 51.2,
    pickRate: 10.5,
    banRate: 6.8
  },
  Sylas: {
    champion: "Sylas",
    role: "Mid",
    runes: {
      primary: "Domination",
      keystone: "Electrocute",
      primaryRunes: ["Sudden Impact", "Eyeball Collection", "Ultimate Hunter"],
      secondary: "Precision",
      secondaryRunes: ["Presence of Mind", "Coup de Grace"],
      statShards: ["Adaptive Force", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "W > Q > E",
    startingItems: ["Doran's Ring", "Health Potion x2"],
    coreItems: ["Rod of Ages", "Ionian Boots of Lucidity", "Lich Bane"],
    situationalItems: ["Zhonya's Hourglass", "Rabadon's Deathcap", "Shadowflame", "Banshee's Veil", "Cosmic Drive"],
    boots: "Ionian Boots of Lucidity",
    vsAP: ["Banshee's Veil", "Mercury's Treads", "Spirit Visage"],
    vsAD: ["Zhonya's Hourglass", "Frozen Heart"],
    vsTanks: ["Void Staff", "Liandry's Anguish"],
    vsHealers: ["Morellonomicon", "Oblivion Orb"],
    tips: [
      "Tu W tiene mucho heal - usalo en trades cortos",
      "E1 + E2 es tu gap closer principal",
      "Roba las ultimates mas impactantes del enemigo",
      "Prioriza robar ults de engage o burst",
      "Puedes robar ults aunque esten en cooldown"
    ],
    proPlayers: [
      { name: "Faker", team: "T1", region: "LCK" },
      { name: "Chovy", team: "Gen.G", region: "LCK" },
      { name: "Caps", team: "G2", region: "LEC" }
    ],
    winRate: 50.5,
    pickRate: 7.8,
    banRate: 12.3
  },
  Akshan: {
    champion: "Akshan",
    role: "Mid",
    runes: {
      primary: "Precision",
      keystone: "Press the Attack",
      primaryRunes: ["Presence of Mind", "Legend: Alacrity", "Coup de Grace"],
      secondary: "Domination",
      secondaryRunes: ["Taste of Blood", "Treasure Hunter"],
      statShards: ["Attack Speed", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "Q > E > W",
    startingItems: ["Doran's Blade", "Health Potion"],
    coreItems: ["Kraken Slayer", "Berserker's Greaves", "Wit's End"],
    situationalItems: ["Blade of the Ruined King", "Guardian Angel", "Guinsoo's Rageblade", "Infinity Edge"],
    boots: "Berserker's Greaves",
    vsAP: ["Wit's End", "Maw of Malmortius"],
    vsAD: ["Guardian Angel", "Death's Dance"],
    vsTanks: ["Blade of the Ruined King", "Lord Dominik's Regards"],
    vsHealers: ["Mortal Reminder"],
    tips: [
      "Usa E para roamear rapido por el mapa",
      "Tu pasiva revive aliados - prioriza matar al asesino enemigo",
      "W te da camuflaje cerca de paredes",
      "El E puede usarse para escapar o para burst",
      "Tu R es excelente para ejecutar enemigos bajos"
    ],
    proPlayers: [
      { name: "ShowMaker", team: "DK", region: "LCK" },
      { name: "Caps", team: "G2", region: "LEC" }
    ],
    winRate: 51.8,
    pickRate: 5.2,
    banRate: 8.9
  },
  Veigar: {
    champion: "Veigar",
    role: "Mid",
    runes: {
      primary: "Sorcery",
      keystone: "First Strike",
      primaryRunes: ["Magical Footwear", "Biscuit Delivery", "Cosmic Insight"],
      secondary: "Sorcery",
      secondaryRunes: ["Manaflow Band", "Transcendence"],
      statShards: ["Adaptive Force", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Teleport"],
    skillOrder: "Q > W > E",
    startingItems: ["Doran's Ring", "Health Potion x2"],
    coreItems: ["Luden's Companion", "Sorcerer's Shoes", "Shadowflame"],
    situationalItems: ["Zhonya's Hourglass", "Rabadon's Deathcap", "Void Staff", "Banshee's Veil", "Morellonomicon"],
    boots: "Sorcerer's Shoes",
    vsAP: ["Banshee's Veil", "Mercury's Treads"],
    vsAD: ["Zhonya's Hourglass"],
    vsTanks: ["Void Staff", "Liandry's Anguish"],
    vsHealers: ["Morellonomicon"],
    tips: [
      "Farmea stacks de AP con Q - escala infinito",
      "Tu E es una de las mejores zonas de control",
      "Posiciona E para cortar escapes enemigos",
      "R ejecuta - espera a que esten bajos",
      "En late game tu Q puede one-shotear squishies"
    ],
    proPlayers: [
      { name: "Faker", team: "T1", region: "LCK" },
      { name: "BDD", team: "KT", region: "LCK" }
    ],
    winRate: 52.3,
    pickRate: 6.1,
    banRate: 4.5
  },
  Illaoi: {
    champion: "Illaoi",
    role: "Top",
    runes: {
      primary: "Resolve",
      keystone: "Grasp of the Undying",
      primaryRunes: ["Demolish", "Bone Plating", "Overgrowth"],
      secondary: "Precision",
      secondaryRunes: ["Triumph", "Legend: Tenacity"],
      statShards: ["Adaptive Force", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Teleport"],
    skillOrder: "Q > E > W",
    startingItems: ["Doran's Blade", "Health Potion"],
    coreItems: ["Black Cleaver", "Sterak's Gage", "Plated Steelcaps"],
    situationalItems: ["Death's Dance", "Spirit Visage", "Hullbreaker", "Gargoyle Stoneplate"],
    boots: "Plated Steelcaps",
    vsAP: ["Spirit Visage", "Force of Nature"],
    vsAD: ["Death's Dance", "Frozen Heart"],
    vsTanks: ["Black Cleaver", "Serylda's Grudge"],
    vsHealers: ["Chempunk Chainsword"],
    tips: [
      "Golpea el alma (E) para ganar trades",
      "Tu R es fuerte en teamfights - busca multi-ult",
      "Los tentaculos healean mucho - pelea cerca de ellos",
      "Splitpushea - eres muy fuerte en 1v1/1v2",
      "No pelees sin tentaculos cerca"
    ],
    proPlayers: [
      { name: "TheShy", team: "WE", region: "LPL" },
      { name: "Zeus", team: "T1", region: "LCK" }
    ],
    winRate: 51.0,
    pickRate: 4.2,
    banRate: 5.8
  },
  Shaco: {
    champion: "Shaco",
    role: "Jungle",
    runes: {
      primary: "Domination",
      keystone: "Hail of Blades",
      primaryRunes: ["Cheap Shot", "Eyeball Collection", "Relentless Hunter"],
      secondary: "Precision",
      secondaryRunes: ["Triumph", "Coup de Grace"],
      statShards: ["Attack Speed", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Smite"],
    skillOrder: "E > Q > W",
    startingItems: ["Gustwalker Hatchling", "Refillable Potion"],
    coreItems: ["Profane Hydra", "Berserker's Greaves", "Voltaic Cyclosword"],
    situationalItems: ["Edge of Night", "Collector", "Lord Dominik's Regards", "Guardian Angel"],
    boots: "Berserker's Greaves",
    vsAP: ["Maw of Malmortius", "Edge of Night"],
    vsAD: ["Guardian Angel", "Death's Dance"],
    vsTanks: ["Lord Dominik's Regards", "Black Cleaver"],
    vsHealers: ["Chempunk Chainsword"],
    tips: [
      "Invade early - tu nivel 2 es muy fuerte",
      "Usa cajas para controlar objectives",
      "Q te hace invisible - usalo para emboscadas",
      "Tu clon (R) puede tanquear habilidades",
      "Juega agresivo en early game"
    ],
    proPlayers: [
      { name: "Canyon", team: "Gen.G", region: "LCK" }
    ],
    winRate: 51.5,
    pickRate: 5.8,
    banRate: 9.2
  },
  Seraphine: {
    champion: "Seraphine",
    role: "Support",
    runes: {
      primary: "Sorcery",
      keystone: "Summon Aery",
      primaryRunes: ["Manaflow Band", "Transcendence", "Scorch"],
      secondary: "Inspiration",
      secondaryRunes: ["Biscuit Delivery", "Cosmic Insight"],
      statShards: ["Adaptive Force", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "E > W > Q",
    startingItems: ["Spellthief's Edge", "Health Potion x2"],
    coreItems: ["Echoes of Helia", "Ionian Boots of Lucidity", "Ardent Censer"],
    situationalItems: ["Staff of Flowing Water", "Redemption", "Mikael's Blessing", "Zhonya's Hourglass"],
    boots: "Ionian Boots of Lucidity",
    vsAP: ["Mikael's Blessing", "Banshee's Veil"],
    vsAD: ["Zhonya's Hourglass"],
    vsTanks: ["Void Staff"],
    vsHealers: ["Morellonomicon"],
    tips: [
      "Usa W para shieldear y healear en trades",
      "Tu R atraviesa campeones - busca multi-charm",
      "El E con nota duplicada hace root",
      "Posicionate atras y spamea habilidades",
      "Coordina tu R con el engage de tu equipo"
    ],
    proPlayers: [
      { name: "Keria", team: "T1", region: "LCK" },
      { name: "Meiko", team: "EDG", region: "LPL" }
    ],
    winRate: 52.8,
    pickRate: 8.5,
    banRate: 3.2
  },
  Caitlyn: {
    champion: "Caitlyn",
    role: "ADC",
    runes: {
      primary: "Precision",
      keystone: "Fleet Footwork",
      primaryRunes: ["Presence of Mind", "Legend: Bloodline", "Cut Down"],
      secondary: "Sorcery",
      secondaryRunes: ["Absolute Focus", "Gathering Storm"],
      statShards: ["Attack Speed", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Heal"],
    skillOrder: "Q > W > E",
    startingItems: ["Doran's Blade", "Health Potion"],
    coreItems: ["Infinity Edge", "Berserker's Greaves", "Rapid Firecannon"],
    situationalItems: ["Lord Dominik's Regards", "Bloodthirster", "Guardian Angel", "Mortal Reminder"],
    boots: "Berserker's Greaves",
    vsAP: ["Maw of Malmortius", "Wit's End"],
    vsAD: ["Guardian Angel", "Plated Steelcaps"],
    vsTanks: ["Lord Dominik's Regards"],
    vsHealers: ["Mortal Reminder"],
    tips: [
      "Tu rango de ataque es el mas largo - abusa de eso",
      "Pon trampas en bushes y bajo CC aliado",
      "E + Q combo es tu principal poke",
      "R es bueno para ejecutar enemigos que escapan",
      "Domina la fase de lineas con tu rango"
    ],
    proPlayers: [
      { name: "Gumayusi", team: "T1", region: "LCK" },
      { name: "Ruler", team: "Gen.G", region: "LCK" },
      { name: "Viper", team: "HLE", region: "LCK" }
    ],
    winRate: 50.8,
    pickRate: 18.2,
    banRate: 12.5
  },
  Darius: {
    champion: "Darius",
    role: "Top",
    runes: {
      primary: "Precision",
      keystone: "Conqueror",
      primaryRunes: ["Triumph", "Legend: Tenacity", "Last Stand"],
      secondary: "Resolve",
      secondaryRunes: ["Second Wind", "Unflinching"],
      statShards: ["Attack Speed", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Ghost"],
    skillOrder: "Q > E > W",
    startingItems: ["Doran's Blade", "Health Potion"],
    coreItems: ["Trinity Force", "Plated Steelcaps", "Sterak's Gage"],
    situationalItems: ["Dead Man's Plate", "Force of Nature", "Death's Dance", "Gargoyle Stoneplate"],
    boots: "Plated Steelcaps",
    vsAP: ["Force of Nature", "Spirit Visage"],
    vsAD: ["Dead Man's Plate", "Randuin's Omen"],
    vsTanks: ["Black Cleaver"],
    vsHealers: ["Chempunk Chainsword"],
    tips: [
      "Stackea pasiva a 5 para hacer dano masivo",
      "Q heala mucho en el borde - no falles",
      "E es tu unico gap closer - usalo bien",
      "Ghost es mejor que Flash en muchos matchups",
      "Tu R resetea con kills - busca multi-kill"
    ],
    proPlayers: [
      { name: "Zeus", team: "T1", region: "LCK" },
      { name: "Kiin", team: "DK", region: "LCK" }
    ],
    winRate: 50.2,
    pickRate: 7.5,
    banRate: 15.8
  },
  Nautilus: {
    champion: "Nautilus",
    role: "Support",
    runes: {
      primary: "Resolve",
      keystone: "Aftershock",
      primaryRunes: ["Shield Bash", "Bone Plating", "Unflinching"],
      secondary: "Inspiration",
      secondaryRunes: ["Hextech Flashtraption", "Biscuit Delivery"],
      statShards: ["Health", "Armor", "Health"]
    },
    summonerSpells: ["Flash", "Ignite"],
    skillOrder: "Q > E > W",
    startingItems: ["Relic Shield", "Health Potion x2"],
    coreItems: ["Locket of the Iron Solari", "Plated Steelcaps", "Knight's Vow"],
    situationalItems: ["Zeke's Convergence", "Thornmail", "Redemption", "Force of Nature"],
    boots: "Plated Steelcaps",
    vsAP: ["Force of Nature", "Mercury's Treads"],
    vsAD: ["Thornmail", "Frozen Heart"],
    vsTanks: ["Evenshroud"],
    vsHealers: ["Thornmail"],
    tips: [
      "Tu Q engancha terreno y enemigos",
      "Pasiva rootea en el primer auto",
      "R es point-and-click CC - muy fiable",
      "Usa E para slow antes de Q",
      "Roamea mid despues de nivel 6"
    ],
    proPlayers: [
      { name: "Keria", team: "T1", region: "LCK" },
      { name: "Ming", team: "RNG", region: "LPL" }
    ],
    winRate: 50.5,
    pickRate: 9.8,
    banRate: 8.2
  },
  Kayn: {
    champion: "Kayn",
    role: "Jungle",
    runes: {
      primary: "Precision",
      keystone: "Conqueror",
      primaryRunes: ["Triumph", "Legend: Alacrity", "Last Stand"],
      secondary: "Domination",
      secondaryRunes: ["Sudden Impact", "Eyeball Collection"],
      statShards: ["Attack Speed", "Adaptive Force", "Health"]
    },
    summonerSpells: ["Flash", "Smite"],
    skillOrder: "Q > W > E",
    startingItems: ["Gustwalker Hatchling", "Refillable Potion"],
    coreItems: ["Eclipse", "Ionian Boots of Lucidity", "Black Cleaver"],
    situationalItems: ["Death's Dance", "Maw of Malmortius", "Serylda's Grudge", "Guardian Angel"],
    boots: "Ionian Boots of Lucidity",
    vsAP: ["Maw of Malmortius", "Force of Nature"],
    vsAD: ["Death's Dance", "Guardian Angel"],
    vsTanks: ["Black Cleaver", "Serylda's Grudge"],
    vsHealers: ["Chempunk Chainsword"],
    tips: [
      "Farmea forma rapidamente atacando el tipo correcto",
      "E atraviesa paredes - usalo para ganks creativos",
      "Rhaast (Rojo) vs tanks, Shadow (Azul) vs squishies",
      "Tu R te hace invulnerable - usalo para dodge",
      "Cleareas muy rapido - counterjunglea"
    ],
    proPlayers: [
      { name: "Canyon", team: "Gen.G", region: "LCK" },
      { name: "Oner", team: "T1", region: "LCK" }
    ],
    winRate: 51.2,
    pickRate: 11.5,
    banRate: 7.8
  }
};

// Champion categories for dynamic situational recommendations
export const CHAMPION_CATEGORIES = {
  healers: ["Soraka", "Yuumi", "Nami", "Sona", "Bard", "Seraphine", "Senna", "Lulu"],
  heavyCC: ["Leona", "Nautilus", "Amumu", "Sejuani", "Bard", "Rakan", "Thresh", "Alistar", "Morgana"],
  tanks: ["Ornn", "Sion", "Malphite", "Rammus", "K'Sante", "Maokai", "Cho'Gath", "Dr. Mundo", "Tahm Kench"],
  burstAP: ["Syndra", "LeBlanc", "Annie", "Veigar", "Ahri", "Lux", "Brand", "Xerath", "Zyra"],
  burstAD: ["Zed", "Talon", "Qiyana", "Rengar", "Kha'Zix", "Kayn", "Pyke"],
  hypercarries: ["Jinx", "Vayne", "Kog'Maw", "Twitch", "Aphelios", "Kayle", "Kassadin", "Azir"]
};

export function getProBuild(championName: string): ProBuildData | null {
  return PRO_BUILDS_DATABASE[championName] || null;
}

export function getAllProBuilds(): ProBuildData[] {
  return Object.values(PRO_BUILDS_DATABASE);
}
