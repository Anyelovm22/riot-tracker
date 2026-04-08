const DD_VERSION = "16.6.1";

// Item name to ID mapping for common items
const ITEM_NAME_TO_ID: Record<string, string> = {
  // Boots
  "Berserker's Greaves": "3006",
  "Sorcerer's Shoes": "3020",
  "Plated Steelcaps": "3047",
  "Mercury's Treads": "3111",
  "Ionian Boots of Lucidity": "3158",
  "Ionian Boots": "3158",
  "Boots of Swiftness": "3009",
  "Mobility Boots": "3117",
  
  // Mythics / Core items
  "Eclipse": "6692",
  "Luden's Companion": "4005",
  "Kraken Slayer": "6672",
  "Infinity Edge": "3031",
  "Nashor's Tooth": "3115",
  "Locket of the Iron Solari": "3190",
  
  // AD Items
  "Black Cleaver": "3071",
  "Death's Dance": "6333",
  "Guardian Angel": "3026",
  "Sterak's Gage": "3053",
  "Maw of Malmortius": "3156",
  "Serylda's Grudge": "6694",
  "Lord Dominik's Regards": "3036",
  "Mortal Reminder": "3033",
  "Bloodthirster": "3072",
  "Phantom Dancer": "3046",
  "Rapid Firecannon": "3094",
  "Blade of the Ruined King": "3153",
  "Voltaic Cyclosword": "6610",
  "Edge of Night": "3814",
  "Serpent's Fang": "6696",
  "Chempunk Chainsword": "6609",
  
  // AP Items
  "Shadowflame": "4645",
  "Rabadon's Deathcap": "3089",
  "Void Staff": "3135",
  "Zhonya's Hourglass": "3157",
  "Banshee's Veil": "3102",
  "Morellonomicon": "3165",
  "Lich Bane": "3100",
  "Liandry's Anguish": "6653",
  "Mejai's Soulstealer": "3041",
  "Cryptbloom": "7024",
  
  // Tank Items
  "Knight's Vow": "3109",
  "Zeke's Convergence": "3050",
  "Redemption": "3107",
  "Mikael's Blessing": "3222",
  "Frozen Heart": "3110",
  "Thornmail": "3075",
  "Force of Nature": "4401",
  "Randuin's Omen": "3143",
  "Evenshroud": "3001",
  "Seeker's Armguard": "2420",
  "Bramble Vest": "3076",
  
  // Starting Items
  "Doran's Ring": "1056",
  "Doran's Blade": "1055",
  "Doran's Shield": "1054",
  "Long Sword": "1036",
  "Health Potion": "2003",
  "Health Potion x2": "2003",
  "Refillable Potion": "2031",
  "Relic Shield": "3858",
  "Spellthief's Edge": "3850",
  "Gustwalker Hatchling": "1101",
  
  // Other
  "Wit's End": "3091",
  "Galeforce": "6671",
  "Prowler's Claw": "6693",
  "Oblivion Orb": "3916"
};

export function normalizeChampionKey(name: string) {
  return name.replace(/\s+/g, "").replace(/'/g, "").replace(/\./g, "");
}

export function getChampionIcon(championName: string) {
  return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${normalizeChampionKey(
    championName
  )}.png`;
}

export function getItemIcon(itemNameOrId: string | number) {
  // If it's already a number or looks like an ID, use it directly
  if (typeof itemNameOrId === "number" || /^\d+$/.test(itemNameOrId)) {
    return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/item/${itemNameOrId}.png`;
  }
  
  // Try to find the item ID from the name
  const itemId = ITEM_NAME_TO_ID[itemNameOrId];
  if (itemId) {
    return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/item/${itemId}.png`;
  }
  
  // Fallback - return a placeholder or default item icon
  return `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/item/1001.png`;
}
