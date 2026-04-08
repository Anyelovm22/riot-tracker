/**
 * Item Classification Service
 * Categorizes items by their primary stats to detect build types
 */

export type ItemCategory = 'ap' | 'ad' | 'tank_armor' | 'tank_mr' | 'support' | 'attack_speed' | 'lethality' | 'crit' | 'other';

export interface ItemClassification {
  category: ItemCategory;
  weight: number; // How strongly this item indicates the build type (0-1)
}

// AP Items - Magic damage dealers
export const AP_ITEMS: Record<string, ItemClassification> = {
  "Rabadon's Deathcap": { category: 'ap', weight: 1.0 },
  "Void Staff": { category: 'ap', weight: 0.9 },
  "Shadowflame": { category: 'ap', weight: 0.9 },
  "Luden's Companion": { category: 'ap', weight: 0.95 },
  "Luden's Tempest": { category: 'ap', weight: 0.95 },
  "Nashor's Tooth": { category: 'ap', weight: 0.85 },
  "Lich Bane": { category: 'ap', weight: 0.85 },
  "Zhonya's Hourglass": { category: 'ap', weight: 0.7 },
  "Banshee's Veil": { category: 'ap', weight: 0.6 },
  "Morellonomicon": { category: 'ap', weight: 0.8 },
  "Rod of Ages": { category: 'ap', weight: 0.75 },
  "Rylai's Crystal Scepter": { category: 'ap', weight: 0.75 },
  "Cosmic Drive": { category: 'ap', weight: 0.8 },
  "Horizon Focus": { category: 'ap', weight: 0.85 },
  "Stormsurge": { category: 'ap', weight: 0.9 },
  "Cryptbloom": { category: 'ap', weight: 0.8 },
  "Malignance": { category: 'ap', weight: 0.85 },
  "Blackfire Torch": { category: 'ap', weight: 0.9 },
  "Liandry's Torment": { category: 'ap', weight: 0.9 },
  "Liandry's Anguish": { category: 'ap', weight: 0.9 },
  "Archangel's Staff": { category: 'ap', weight: 0.8 },
  "Seraph's Embrace": { category: 'ap', weight: 0.8 },
  "Hextech Rocketbelt": { category: 'ap', weight: 0.85 },
  "Night Harvester": { category: 'ap', weight: 0.85 },
  "Everfrost": { category: 'ap', weight: 0.8 },
  "Riftmaker": { category: 'ap', weight: 0.85 },
  "Mejai's Soulstealer": { category: 'ap', weight: 0.9 },
  "Haunting Guise": { category: 'ap', weight: 0.6 },
  "Blasting Wand": { category: 'ap', weight: 0.4 },
  "Needlessly Large Rod": { category: 'ap', weight: 0.5 },
  "Amplifying Tome": { category: 'ap', weight: 0.3 },
  "Lost Chapter": { category: 'ap', weight: 0.5 },
  "Fiendish Codex": { category: 'ap', weight: 0.4 },
};

// AD Items - Physical damage dealers
export const AD_ITEMS: Record<string, ItemClassification> = {
  "Infinity Edge": { category: 'ad', weight: 1.0 },
  "The Collector": { category: 'ad', weight: 0.9 },
  "Lord Dominik's Regards": { category: 'ad', weight: 0.85 },
  "Black Cleaver": { category: 'ad', weight: 0.85 },
  "Eclipse": { category: 'ad', weight: 0.9 },
  "Duskblade of Draktharr": { category: 'ad', weight: 0.9 },
  "Youmuu's Ghostblade": { category: 'ad', weight: 0.85 },
  "Serylda's Grudge": { category: 'ad', weight: 0.85 },
  "Edge of Night": { category: 'ad', weight: 0.8 },
  "Serpent's Fang": { category: 'ad', weight: 0.75 },
  "Essence Reaver": { category: 'ad', weight: 0.85 },
  "Muramana": { category: 'ad', weight: 0.85 },
  "Manamune": { category: 'ad', weight: 0.7 },
  "Ravenous Hydra": { category: 'ad', weight: 0.8 },
  "Titanic Hydra": { category: 'ad', weight: 0.7 },
  "Death's Dance": { category: 'ad', weight: 0.8 },
  "Maw of Malmortius": { category: 'ad', weight: 0.75 },
  "Sterak's Gage": { category: 'ad', weight: 0.7 },
  "Guardian Angel": { category: 'ad', weight: 0.6 },
  "Bloodthirster": { category: 'ad', weight: 0.9 },
  "Mercurial Scimitar": { category: 'ad', weight: 0.7 },
  "Mortal Reminder": { category: 'ad', weight: 0.8 },
  "Chempunk Chainsword": { category: 'ad', weight: 0.75 },
  "Hubris": { category: 'ad', weight: 0.85 },
  "Profane Hydra": { category: 'ad', weight: 0.85 },
  "Opportunity": { category: 'ad', weight: 0.85 },
  "Voltaic Cyclosword": { category: 'ad', weight: 0.8 },
  "Axiom Arc": { category: 'ad', weight: 0.8 },
  "Spear of Shojin": { category: 'ad', weight: 0.8 },
  "Sundered Sky": { category: 'ad', weight: 0.8 },
  "Stridebreaker": { category: 'ad', weight: 0.75 },
  "Goredrinker": { category: 'ad', weight: 0.75 },
  "Trinity Force": { category: 'ad', weight: 0.8 },
  "Divine Sunderer": { category: 'ad', weight: 0.8 },
  "B.F. Sword": { category: 'ad', weight: 0.4 },
  "Pickaxe": { category: 'ad', weight: 0.3 },
  "Long Sword": { category: 'ad', weight: 0.2 },
  "Serrated Dirk": { category: 'ad', weight: 0.5 },
  "Caulfield's Warhammer": { category: 'ad', weight: 0.4 },
};

// Attack Speed / Crit Items
export const ATTACK_SPEED_ITEMS: Record<string, ItemClassification> = {
  "Kraken Slayer": { category: 'attack_speed', weight: 0.95 },
  "Blade of the Ruined King": { category: 'attack_speed', weight: 0.9 },
  "Wit's End": { category: 'attack_speed', weight: 0.8 },
  "Guinsoo's Rageblade": { category: 'attack_speed', weight: 0.9 },
  "Phantom Dancer": { category: 'attack_speed', weight: 0.85 },
  "Rapid Firecannon": { category: 'attack_speed', weight: 0.85 },
  "Runaan's Hurricane": { category: 'attack_speed', weight: 0.85 },
  "Statikk Shiv": { category: 'attack_speed', weight: 0.85 },
  "Navori Quickblades": { category: 'crit', weight: 0.9 },
  "Yun Tal Wildarrows": { category: 'crit', weight: 0.9 },
  "Terminus": { category: 'attack_speed', weight: 0.85 },
  "Immortal Shieldbow": { category: 'crit', weight: 0.85 },
  "Galeforce": { category: 'crit', weight: 0.9 },
  "Stormrazor": { category: 'crit', weight: 0.8 },
  "Zeal": { category: 'attack_speed', weight: 0.4 },
  "Recurve Bow": { category: 'attack_speed', weight: 0.3 },
  "Cloak of Agility": { category: 'crit', weight: 0.3 },
};

// Tank Armor Items
export const TANK_ARMOR_ITEMS: Record<string, ItemClassification> = {
  "Thornmail": { category: 'tank_armor', weight: 1.0 },
  "Randuin's Omen": { category: 'tank_armor', weight: 0.95 },
  "Dead Man's Plate": { category: 'tank_armor', weight: 0.9 },
  "Frozen Heart": { category: 'tank_armor', weight: 0.9 },
  "Sunfire Aegis": { category: 'tank_armor', weight: 0.9 },
  "Iceborn Gauntlet": { category: 'tank_armor', weight: 0.85 },
  "Jak'Sho, The Protean": { category: 'tank_armor', weight: 0.85 },
  "Unending Despair": { category: 'tank_armor', weight: 0.85 },
  "Overlord's Bloodmail": { category: 'tank_armor', weight: 0.75 },
  "Plated Steelcaps": { category: 'tank_armor', weight: 0.5 },
  "Bramble Vest": { category: 'tank_armor', weight: 0.5 },
  "Warden's Mail": { category: 'tank_armor', weight: 0.4 },
  "Chain Vest": { category: 'tank_armor', weight: 0.3 },
  "Cloth Armor": { category: 'tank_armor', weight: 0.2 },
};

// Tank MR Items
export const TANK_MR_ITEMS: Record<string, ItemClassification> = {
  "Force of Nature": { category: 'tank_mr', weight: 1.0 },
  "Spirit Visage": { category: 'tank_mr', weight: 0.95 },
  "Abyssal Mask": { category: 'tank_mr', weight: 0.85 },
  "Kaenic Rookern": { category: 'tank_mr', weight: 0.9 },
  "Hollow Radiance": { category: 'tank_mr', weight: 0.85 },
  "Mercury's Treads": { category: 'tank_mr', weight: 0.5 },
  "Spectre's Cowl": { category: 'tank_mr', weight: 0.5 },
  "Negatron Cloak": { category: 'tank_mr', weight: 0.4 },
  "Null-Magic Mantle": { category: 'tank_mr', weight: 0.2 },
};

// General Tank/HP Items
export const TANK_HP_ITEMS: Record<string, ItemClassification> = {
  "Warmog's Armor": { category: 'tank_armor', weight: 0.9 },
  "Heartsteel": { category: 'tank_armor', weight: 0.95 },
  "Anathema's Chains": { category: 'tank_armor', weight: 0.7 },
  "Gargoyle Stoneplate": { category: 'tank_armor', weight: 0.85 },
  "Giant's Belt": { category: 'tank_armor', weight: 0.3 },
  "Ruby Crystal": { category: 'tank_armor', weight: 0.2 },
  "Kindlegem": { category: 'tank_armor', weight: 0.3 },
};

// Support Items
export const SUPPORT_ITEMS: Record<string, ItemClassification> = {
  "Redemption": { category: 'support', weight: 0.9 },
  "Locket of the Iron Solari": { category: 'support', weight: 0.9 },
  "Staff of Flowing Water": { category: 'support', weight: 0.85 },
  "Ardent Censer": { category: 'support', weight: 0.85 },
  "Mikael's Blessing": { category: 'support', weight: 0.8 },
  "Shurelya's Battlesong": { category: 'support', weight: 0.85 },
  "Moonstone Renewer": { category: 'support', weight: 0.9 },
  "Echoes of Helia": { category: 'support', weight: 0.85 },
  "Dawncore": { category: 'support', weight: 0.8 },
  "Imperial Mandate": { category: 'support', weight: 0.8 },
  "Knight's Vow": { category: 'support', weight: 0.75 },
  "Zeke's Convergence": { category: 'support', weight: 0.75 },
  "Trailblazer": { category: 'support', weight: 0.7 },
  "Dream Maker": { category: 'support', weight: 0.8 },
  "Celestial Opposition": { category: 'support', weight: 0.8 },
  "Solstice Sleigh": { category: 'support', weight: 0.75 },
  "World Atlas": { category: 'support', weight: 0.4 },
  "Runic Compass": { category: 'support', weight: 0.5 },
  "Bounty of Worlds": { category: 'support', weight: 0.6 },
  "Bloodsong": { category: 'support', weight: 0.75 },
  "Zaz'Zak's Realmspike": { category: 'support', weight: 0.7 },
};

// Combined lookup for all items
export const ALL_ITEMS: Record<string, ItemClassification> = {
  ...AP_ITEMS,
  ...AD_ITEMS,
  ...ATTACK_SPEED_ITEMS,
  ...TANK_ARMOR_ITEMS,
  ...TANK_MR_ITEMS,
  ...TANK_HP_ITEMS,
  ...SUPPORT_ITEMS,
};

/**
 * Classify a single item
 */
export function classifyItem(itemName: string): ItemClassification {
  // Try exact match first
  if (ALL_ITEMS[itemName]) {
    return ALL_ITEMS[itemName];
  }
  
  // Try partial match (for slight naming variations)
  const lowerName = itemName.toLowerCase();
  for (const [name, classification] of Object.entries(ALL_ITEMS)) {
    if (name.toLowerCase().includes(lowerName) || lowerName.includes(name.toLowerCase())) {
      return classification;
    }
  }
  
  return { category: 'other', weight: 0 };
}

/**
 * Check if an item is primarily AP
 */
export function isAPItem(itemName: string): boolean {
  const classification = classifyItem(itemName);
  return classification.category === 'ap';
}

/**
 * Check if an item is primarily AD
 */
export function isADItem(itemName: string): boolean {
  const classification = classifyItem(itemName);
  return classification.category === 'ad' || classification.category === 'attack_speed' || classification.category === 'crit' || classification.category === 'lethality';
}

/**
 * Check if an item is a tank item
 */
export function isTankItem(itemName: string): boolean {
  const classification = classifyItem(itemName);
  return classification.category === 'tank_armor' || classification.category === 'tank_mr';
}

/**
 * Get counter items based on enemy build type
 */
export function getCounterItems(buildType: 'ap' | 'ad' | 'tank' | 'hybrid' | 'support', myRole: string): string[] {
  switch (buildType) {
    case 'ap':
      // Counter AP with MR items
      if (myRole === 'adc' || myRole === 'mid') {
        return ["Maw of Malmortius", "Mercurial Scimitar", "Wit's End", "Hexdrinker"];
      }
      return ["Force of Nature", "Spirit Visage", "Kaenic Rookern", "Abyssal Mask", "Mercury's Treads"];
    
    case 'ad':
      // Counter AD with Armor items
      if (myRole === 'adc' || myRole === 'mid') {
        return ["Zhonya's Hourglass", "Guardian Angel", "Plated Steelcaps"];
      }
      return ["Thornmail", "Randuin's Omen", "Frozen Heart", "Dead Man's Plate", "Plated Steelcaps"];
    
    case 'tank':
      // Counter tanks with penetration/% damage
      if (myRole === 'adc') {
        return ["Lord Dominik's Regards", "Blade of the Ruined King", "Kraken Slayer", "Black Cleaver"];
      }
      if (myRole === 'mid' || myRole === 'support') {
        return ["Void Staff", "Liandry's Torment", "Cryptbloom"];
      }
      return ["Black Cleaver", "Serylda's Grudge", "Lord Dominik's Regards", "Blade of the Ruined King"];
    
    case 'hybrid':
      // Mixed defense
      return ["Gargoyle Stoneplate", "Death's Dance", "Jak'Sho, The Protean"];
    
    case 'support':
      // Anti-heal and damage
      return ["Morellonomicon", "Chempunk Chainsword", "Mortal Reminder", "Serpent's Fang"];
    
    default:
      return [];
  }
}
