type BuildInput = {
  champion: string;
  enemy: string;
  role: string;
};

export function recommendBuild({ champion, enemy, role }: BuildInput) {
  const lowerEnemy = enemy.toLowerCase();

  const antiAd = ['zed', 'yasuo', 'talon', 'naafiri'];
  const antiAp = ['syndra', 'leblanc', 'veigar', 'annie'];

  const starter = ["Doran's Ring", 'Health Potion'];
  const boots =
    antiAd.includes(lowerEnemy) ? "Plated Steelcaps" : "Sorcerer's Shoes";

  const situational = antiAd.includes(lowerEnemy)
    ? ["Zhonya's Hourglass", 'Seeker’s Armguard']
    : antiAp.includes(lowerEnemy)
    ? ["Banshee's Veil", 'Mercury’s Treads']
    : ['Shadowflame', 'Void Staff'];

  return {
    champion,
    enemy,
    role,
    recommendedBuild: {
      starter,
      core: ["Luden's Companion", boots, "Rabadon's Deathcap"],
      situational,
    },
    runes: {
      primary: ['Electrocute', 'Taste of Blood', 'Eyeball Collection', 'Ultimate Hunter'],
      secondary: ['Manaflow Band', 'Transcendence'],
    },
    spells: ['Flash', 'Ignite'],
    notes: [
      `La build fue ajustada contra ${enemy}.`,
      'Se priorizan ítems de supervivencia si el rival tiene burst.',
      'La recomendación es dinámica según el campeón enemigo.',
    ],
  };
}