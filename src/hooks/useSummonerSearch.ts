import { useMemo, useState } from "react";
import { fetchRiotProfile } from "../services/riotApi";
import type {
  MainTab,
  QueueView,
  RegionCode,
  SearchResponse
} from "../types/riot";
import { winrate } from "../utils/format";

const ddVersion = "16.6.1";
const ddragonChampion = (name: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/champion/${name}.png`;

// Default empty state
const EMPTY_DATA: SearchResponse = {
  profile: {
    puuid: "",
    gameName: "",
    tagLine: "",
    summonerLevel: 0,
    profileIconId: 29,
    region: ""
  },
  solo: null,
  flex: null,
  lpProgressSolo: [],
  lpProgressFlex: [],
  hasSoloLpHistory: false,
  hasFlexLpHistory: false,
  recentMatches: [],
  topChampions: [],
  liveGame: {
    isInGame: false,
    gameMode: null,
    gameLength: null,
    allies: [],
    enemies: []
  },
  challenges: {
    totalPoints: 0,
    level: "NONE",
    percentile: 0
  },
  recommendation: {
    champion: "",
    versus: null,
    runes: [],
    coreItems: [],
    situationalItems: [],
    tips: []
  }
};

// Demo data for testing when API is not available
export const DEMO_DATA: SearchResponse = {
  profile: {
    puuid: "demo-puuid",
    gameName: "Faker",
    tagLine: "KR1",
    summonerLevel: 889,
    profileIconId: 29,
    region: "KR"
  },
  solo: {
    queueType: "RANKED_SOLO_5x5",
    tier: "CHALLENGER",
    rank: "I",
    leaguePoints: 1580,
    wins: 245,
    losses: 156
  },
  flex: {
    queueType: "RANKED_FLEX_SR",
    tier: "MASTER",
    rank: "I",
    leaguePoints: 404,
    wins: 48,
    losses: 31
  },
  lpProgressSolo: [
    { game: 1, lp: 1480, result: "W" },
    { game: 2, lp: 1500, result: "W" },
    { game: 3, lp: 1485, result: "L" },
    { game: 4, lp: 1510, result: "W" },
    { game: 5, lp: 1530, result: "W" },
    { game: 6, lp: 1515, result: "L" },
    { game: 7, lp: 1540, result: "W" },
    { game: 8, lp: 1560, result: "W" },
    { game: 9, lp: 1580, result: "W" }
  ],
  lpProgressFlex: [
    { game: 1, lp: 380, result: "W" },
    { game: 2, lp: 404, result: "W" }
  ],
  hasSoloLpHistory: true,
  hasFlexLpHistory: true,
  recentMatches: [
    {
      matchId: "KR_1",
      championName: "Azir",
      championIcon: ddragonChampion("Azir"),
      result: "W",
      kills: 8,
      deaths: 2,
      assists: 12,
      cs: 287,
      damage: 32500,
      gold: 15800,
      vision: 28,
      queueId: 420,
      queueLabel: "Mid - 32:15",
      ago: "Hace 2h",
      items: ["6653", "3020", "3089", "3157", "3135"]
    },
    {
      matchId: "KR_2",
      championName: "Viktor",
      championIcon: ddragonChampion("Viktor"),
      result: "W",
      kills: 11,
      deaths: 4,
      assists: 8,
      cs: 245,
      damage: 28900,
      gold: 14200,
      vision: 22,
      queueId: 420,
      queueLabel: "Mid - 28:45",
      ago: "Hace 4h",
      items: ["6653", "3020", "3089", "3135"]
    },
    {
      matchId: "KR_3",
      championName: "Ahri",
      championIcon: ddragonChampion("Ahri"),
      result: "L",
      kills: 5,
      deaths: 6,
      assists: 7,
      cs: 198,
      damage: 18700,
      gold: 11200,
      vision: 18,
      queueId: 420,
      queueLabel: "Mid - 24:30",
      ago: "Hace 6h",
      items: ["6653", "3020", "3165"]
    }
  ],
  topChampions: [
    {
      championId: 268,
      championName: "Azir",
      championIcon: ddragonChampion("Azir"),
      championPoints: 1850000,
      lastPlayTimeLabel: "Hace 2h",
      masteryLevel: 7
    },
    {
      championId: 112,
      championName: "Viktor",
      championIcon: ddragonChampion("Viktor"),
      championPoints: 1250000,
      lastPlayTimeLabel: "Hace 4h",
      masteryLevel: 7
    },
    {
      championId: 103,
      championName: "Ahri",
      championIcon: ddragonChampion("Ahri"),
      championPoints: 980000,
      lastPlayTimeLabel: "Hace 6h",
      masteryLevel: 7
    },
    {
      championId: 7,
      championName: "LeBlanc",
      championIcon: ddragonChampion("Leblanc"),
      championPoints: 850000,
      lastPlayTimeLabel: "Hace 2d",
      masteryLevel: 7
    },
    {
      championId: 61,
      championName: "Orianna",
      championIcon: ddragonChampion("Orianna"),
      championPoints: 720000,
      lastPlayTimeLabel: "Hace 5d",
      masteryLevel: 7
    }
  ],
  liveGame: {
    isInGame: false,
    gameMode: null,
    gameLength: null,
    allies: [],
    enemies: []
  },
  challenges: {
    totalPoints: 45250,
    level: "MASTER",
    percentile: 0.8
  },
  recommendation: {
    champion: "Azir",
    versus: null,
    runes: ["Lethal Tempo", "Presence of Mind", "Legend: Haste", "Cut Down"],
    coreItems: ["Nashor's Tooth", "Sorcerer's Shoes", "Shadowflame"],
    situationalItems: ["Zhonya's Hourglass", "Void Staff", "Rabadon's Deathcap"],
    tips: ["Pokea con soldados en fase de lineas", "Guarda tu R para peel o engage crucial", "Farmea bien, escalas muy fuerte"]
  }
};

export function useSummonerSearch() {
  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState<RegionCode>("LA1");
  const [activeTab, setActiveTab] = useState<MainTab>("lp");
  const [queueView, setQueueView] = useState<QueueView>("solo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [data, setData] = useState<SearchResponse>(EMPTY_DATA);

  const currentRank = queueView === "solo" ? data.solo : data.flex;
  const lpData = queueView === "solo" ? data.lpProgressSolo : data.lpProgressFlex;

  const recentSummary = useMemo(() => {
    const wins = data.recentMatches.filter((m) => m.result === "W").length;
    const losses = data.recentMatches.length - wins;
    return {
      wins,
      losses,
      wr: winrate(wins, losses)
    };
  }, [data.recentMatches]);

  const handleSearch = async () => {
    const trimmedId = riotId.trim();
    
    if (!trimmedId || loading) return;

    // Validate Riot ID format
    if (!trimmedId.includes("#")) {
      setError("El Riot ID debe tener el formato: Nombre#TAG");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchRiotProfile({ region, riotId: trimmedId });
      setData(result);
      setHasSearched(true);
      setActiveTab("lp"); // Reset to LP tab on new search
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ocurrio un error inesperado.";
      
      // Provide more helpful error messages
      if (errorMessage.includes("404") || errorMessage.includes("not found")) {
        setError("No se encontro el invocador. Verifica el nombre y la region.");
      } else if (errorMessage.includes("rate limit")) {
        setError("Demasiadas solicitudes. Espera unos segundos y vuelve a intentar.");
      } else if (errorMessage.includes("JSON") || errorMessage.includes("backend")) {
        setError("El servidor no esta disponible. Verifica que el backend este corriendo.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo mode for testing
  const loadDemo = () => {
    setData(DEMO_DATA);
    setHasSearched(true);
    setRiotId("Faker#KR1");
    setRegion("KR");
  };

  return {
    riotId,
    setRiotId,
    region,
    setRegion,
    activeTab,
    setActiveTab,
    queueView,
    setQueueView,
    loading,
    error,
    hasSearched,
    data,
    currentRank,
    lpData,
    recentSummary,
    handleSearch,
    loadDemo
  };
}
