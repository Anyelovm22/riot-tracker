import { Router } from "express";
import { getFullBuildRecommendation, getAvailableBuildChampions, getBuildVsSpecificEnemy } from "../services/build.service";
import { getAllItems, getAllRunes, getLatestDdragonVersion, getItemsByNames, getRunesByNames } from "../services/ddragon.service";
import { getProBuild } from "../services/probuilds.service";
import { analyzeEnemyBuild, analyzeTeamBuild } from "../services/enemyBuildAnalyzer.service";

const router = Router();

// Get simple build for a champion (for ProBuildsPanel)
router.get("/simple/:champion", async (req, res) => {
  try {
    const champion = req.params.champion;
    const version = await getLatestDdragonVersion();
    const proBuild = getProBuild(champion);
    
    if (!proBuild) {
      // Return default build for champions not in database
      res.json({
        champion,
        championImage: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion}.png`,
        role: "Mid",
        winRate: 50.0,
        pickRate: 5.0,
        banRate: 3.0,
        proPlayers: [],
        runes: {
          primary: "Domination",
          secondary: "Sorcery",
          keystone: "Electrocute",
          keystoneRune: null,
          primaryRunes: ["Taste of Blood", "Eyeball Collection", "Ultimate Hunter"],
          primaryRuneImages: [],
          secondaryRunes: ["Manaflow Band", "Transcendence"],
          secondaryRuneImages: [],
          statShards: ["Adaptive Force", "Adaptive Force", "Health"]
        },
        items: {
          starting: [],
          core: [],
          boots: null,
          situational: [],
          vsAP: [],
          vsAD: [],
          vsTanks: [],
          vsHealers: []
        },
        skillOrder: "Q > W > E",
        summonerSpells: ["Flash", "Ignite"],
        tips: ["Farmea bien y escala"]
      });
      return;
    }

    // Get item images
    const [
      coreItems,
      startingItems,
      bootsItem,
      situationalItems,
      vsAPItems,
      vsADItems,
      vsTanksItems,
      vsHealersItems
    ] = await Promise.all([
      getItemsByNames(proBuild.coreItems),
      getItemsByNames(proBuild.startingItems),
      getItemsByNames([proBuild.boots]),
      getItemsByNames(proBuild.situationalItems),
      getItemsByNames(proBuild.vsAP),
      getItemsByNames(proBuild.vsAD),
      getItemsByNames(proBuild.vsTanks),
      getItemsByNames(proBuild.vsHealers)
    ]);

    // Get rune images
    const [keystoneRune, primaryRunes, secondaryRunes] = await Promise.all([
      getRunesByNames([proBuild.runes.keystone]),
      getRunesByNames(proBuild.runes.primaryRunes),
      getRunesByNames(proBuild.runes.secondaryRunes)
    ]);

    // Transform items to expected format
    const transformItem = (item: { name: string; image: string; gold: { total: number; base: number; sell: number } }) => ({
      name: item.name,
      image: item.image,
      gold: item.gold
    });

    // Transform runes to expected format
    const transformRune = (r: { rune: { name: string; icon: string; shortDesc: string }; tree: string }) => ({
      name: r.rune.name,
      icon: r.rune.icon,
      tree: r.tree,
      shortDesc: r.rune.shortDesc
    });

    res.json({
      champion: proBuild.champion,
      championImage: `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champion}.png`,
      role: proBuild.role,
      winRate: proBuild.winRate,
      pickRate: proBuild.pickRate,
      banRate: proBuild.banRate,
      proPlayers: proBuild.proPlayers,
      runes: {
        primary: proBuild.runes.primary,
        secondary: proBuild.runes.secondary,
        keystone: proBuild.runes.keystone,
        keystoneRune: keystoneRune[0] ? transformRune(keystoneRune[0]) : null,
        primaryRunes: proBuild.runes.primaryRunes,
        primaryRuneImages: primaryRunes.map(transformRune),
        secondaryRunes: proBuild.runes.secondaryRunes,
        secondaryRuneImages: secondaryRunes.map(transformRune),
        statShards: proBuild.runes.statShards
      },
      items: {
        starting: startingItems.map(transformItem),
        core: coreItems.map(transformItem),
        boots: bootsItem[0] ? transformItem(bootsItem[0]) : null,
        situational: situationalItems.map(transformItem),
        vsAP: vsAPItems.map(transformItem),
        vsAD: vsADItems.map(transformItem),
        vsTanks: vsTanksItems.map(transformItem),
        vsHealers: vsHealersItems.map(transformItem)
      },
      skillOrder: proBuild.skillOrder,
      summonerSpells: proBuild.summonerSpells,
      tips: proBuild.tips
    });
  } catch (error) {
    console.error("Error getting simple build:", error);
    res.status(500).json({ error: "Failed to get build" });
  }
});

// Get full build recommendation with items and runes data
router.get("/full/:champion", async (req, res) => {
  try {
    const champion = req.params.champion;
    const role = typeof req.query.role === "string" ? req.query.role : "Mid";
    const versus = typeof req.query.versus === "string" ? req.query.versus : null;
    const enemyTeam = typeof req.query.enemies === "string" 
      ? req.query.enemies.split(",").filter(Boolean)
      : [];

    const build = await getFullBuildRecommendation(champion, role, versus, enemyTeam);
    res.json(build);
  } catch (error) {
    console.error("Error getting build recommendation:", error);
    res.status(500).json({ error: "Failed to get build recommendation" });
  }
});

// Get all items from DDragon
router.get("/items", async (_req, res) => {
  try {
    const items = await getAllItems();
    res.json({ items });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// Get all runes from DDragon
router.get("/runes", async (_req, res) => {
  try {
    const runes = await getAllRunes();
    res.json({ runes });
  } catch (error) {
    console.error("Error fetching runes:", error);
    res.status(500).json({ error: "Failed to fetch runes" });
  }
});

// Get DDragon version
router.get("/version", async (_req, res) => {
  try {
    const version = await getLatestDdragonVersion();
    res.json({ version });
  } catch (error) {
    console.error("Error fetching version:", error);
    res.status(500).json({ error: "Failed to fetch version" });
  }
});

// Get list of champions with full builds available
router.get("/champions", (_req, res) => {
  res.json({
    champions: getAvailableBuildChampions()
  });
});

// Get build for live game context
router.post("/live", async (req, res) => {
  try {
    const { champion, role, vsChampion, enemyTeam } = req.body as {
      champion: string;
      role: string;
      vsChampion: string | null;
      enemyTeam: string[];
    };

    if (!champion) {
      res.status(400).json({ error: "champion is required" });
      return;
    }

    const build = await getFullBuildRecommendation(
      champion,
      role || "Mid",
      vsChampion || null,
      enemyTeam || []
    );

    res.json(build);
  } catch (error) {
    console.error("Error getting live build:", error);
    res.status(500).json({ error: "Failed to get build recommendation" });
  }
});

// NEW: Get build vs a specific enemy with item/rune analysis
router.post("/versus-enemy", async (req, res) => {
  try {
    const { 
      myChampion, 
      myRole, 
      targetEnemy, 
      targetEnemyItems, 
      targetEnemyRune,
      allEnemies 
    } = req.body as {
      myChampion: string;
      myRole: string;
      targetEnemy: string;
      targetEnemyItems: string[];
      targetEnemyRune?: string;
      allEnemies: Array<{ champion: string; items: string[]; runeKeystone?: string }>;
    };

    if (!myChampion || !targetEnemy) {
      res.status(400).json({ error: "myChampion and targetEnemy are required" });
      return;
    }

    const build = await getBuildVsSpecificEnemy(
      myChampion,
      myRole || "Mid",
      targetEnemy,
      targetEnemyItems || [],
      targetEnemyRune,
      allEnemies || [{ champion: targetEnemy, items: targetEnemyItems || [] }]
    );

    res.json(build);
  } catch (error) {
    console.error("Error getting vs enemy build:", error);
    res.status(500).json({ error: "Failed to get vs enemy build recommendation" });
  }
});

// NEW: Analyze enemy build (quick analysis without full recommendations)
router.post("/analyze-enemy", async (req, res) => {
  try {
    const { champion, items, runeKeystone } = req.body as {
      champion: string;
      items: string[];
      runeKeystone?: string;
    };

    if (!champion) {
      res.status(400).json({ error: "champion is required" });
      return;
    }

    const analysis = analyzeEnemyBuild(champion, items || [], runeKeystone);
    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing enemy build:", error);
    res.status(500).json({ error: "Failed to analyze enemy build" });
  }
});

// NEW: Analyze entire enemy team builds
router.post("/analyze-team", async (req, res) => {
  try {
    const { enemies, myRole } = req.body as {
      enemies: Array<{ champion: string; items: string[]; runeKeystone?: string }>;
      myRole: string;
    };

    if (!enemies || enemies.length === 0) {
      res.status(400).json({ error: "enemies array is required" });
      return;
    }

    const analysis = analyzeTeamBuild(enemies, myRole || "mid");
    res.json(analysis);
  } catch (error) {
    console.error("Error analyzing team builds:", error);
    res.status(500).json({ error: "Failed to analyze team builds" });
  }
});

export default router;
