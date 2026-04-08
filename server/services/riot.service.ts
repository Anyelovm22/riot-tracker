import type {
  RiotAccountDto,
  RiotActiveGameDto,
  RiotChallengesPlayerDataDto,
  RiotChampionMasteryDto,
  RiotLeagueEntryDto,
  RiotMatchDto,
  RiotSummonerDto
} from "../types/riot";
import { parseRiotId } from "../utils/helpers";
import { PLATFORM_HOSTS, REGIONAL_HOSTS } from "../utils/riotHosts";
import {
  buildLpHistoryFromRankedMatches,
  mapLeagueEntries,
  mapMasteries,
  mapRecentMatches
} from "./transform.service";
import { getChampionIdMap } from "./ddragon.service";
import { getDynamicRecommendation } from "./recommend.service";

const searchCache = new Map<string, { data: unknown; expiresAt: number }>();

type CanonicalRole = "Top" | "Jungle" | "Mid" | "ADC" | "Support" | "Unknown";

type LiveGamePlayer = {
  summonerName: string;
  championName: string;
  position: CanonicalRole;
  teamId: number;
};

function getRiotApiKey(): string {
  const apiKey = process.env.RIOT_API_KEY;

  if (!apiKey) {
    throw new Error("Falta RIOT_API_KEY en .env");
  }

  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, "");

  if (!cleanKey.startsWith("RGAPI-")) {
    console.warn("[riot-service] Warning: API key doesn't start with RGAPI-");
  }

  return cleanKey;
}

async function riotFetch<T>(url: string): Promise<T> {
  console.log(
    `[riot-service] Fetching: ${url.replace(
      /\/riot\/account\/v1\/accounts\/by-riot-id\/.*/,
      "/riot/account/..."
    )}`
  );

  const response = await fetch(url, {
    headers: {
      "X-Riot-Token": getRiotApiKey()
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `[riot-service] API error ${response.status}: ${text.substring(0, 200)}`
    );

    if (response.status === 429) {
      throw new Error(
        "Riot API rate limit exceeded. Espera unos segundos y vuelve a intentar."
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "API key inválida o expirada. Verifica tu RIOT_API_KEY en el archivo .env"
      );
    }

    if (response.status === 404) {
      throw new Error("Invocador no encontrado (404)");
    }

    throw new Error(`Riot API error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

function normalizeRole(role?: string | null): CanonicalRole {
  if (!role) return "Unknown";

  const upper = role.toUpperCase();

  const roleMap: Record<string, CanonicalRole> = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MID: "Mid",
    MIDDLE: "Mid",
    BOTTOM: "ADC",
    BOT: "ADC",
    ADC: "ADC",
    UTILITY: "Support",
    SUPPORT: "Support",
    SUP: "Support"
  };

  return roleMap[upper] ?? "Unknown";
}

function fallbackRoleByChampion(champion: string): CanonicalRole {
  const roleMap: Record<string, CanonicalRole> = {
    // Top
    "Aatrox": "Top",
    "Akali": "Top",
    "Camille": "Top",
    "Cho'Gath": "Top",
    "Darius": "Top",
    "Dr. Mundo": "Top",
    "Fiora": "Top",
    "Garen": "Top",
    "Gnar": "Top",
    "Gragas": "Top",
    "Gwen": "Top",
    "Heimerdinger": "Top",
    "Illaoi": "Top",
    "Irelia": "Top",
    "Jax": "Top",
    "Jayce": "Top",
    "Kayle": "Top",
    "Kennen": "Top",
    "Kled": "Top",
    "K'Sante": "Top",
    "Malphite": "Top",
    "Mordekaiser": "Top",
    "Nasus": "Top",
    "Ornn": "Top",
    "Pantheon": "Top",
    "Quinn": "Top",
    "Renekton": "Top",
    "Riven": "Top",
    "Rumble": "Top",
    "Sett": "Top",
    "Shen": "Top",
    "Singed": "Top",
    "Sion": "Top",
    "Tahm Kench": "Top",
    "Teemo": "Top",
    "Tryndamere": "Top",
    "Urgot": "Top",
    "Volibear": "Top",
    "Wukong": "Top",
    "Yasuo": "Top",
    "Yone": "Top",
    "Yorick": "Top",

    // Jungle
    "Amumu": "Jungle",
    "Bel'Veth": "Jungle",
    "Briar": "Jungle",
    "Diana": "Jungle",
    "Ekko": "Jungle",
    "Elise": "Jungle",
    "Evelynn": "Jungle",
    "Fiddlesticks": "Jungle",
    "Graves": "Jungle",
    "Hecarim": "Jungle",
    "Ivern": "Jungle",
    "Jarvan IV": "Jungle",
    "Karthus": "Jungle",
    "Kayn": "Jungle",
    "Kha'Zix": "Jungle",
    "Kindred": "Jungle",
    "Lee Sin": "Jungle",
    "Lillia": "Jungle",
    "Master Yi": "Jungle",
    "Nidalee": "Jungle",
    "Nocturne": "Jungle",
    "Nunu": "Jungle",
    "Nunu & Willump": "Jungle",
    "Poppy": "Jungle",
    "Rammus": "Jungle",
    "Rek'Sai": "Jungle",
    "Rengar": "Jungle",
    "Sejuani": "Jungle",
    "Shaco": "Jungle",
    "Shyvana": "Jungle",
    "Skarner": "Jungle",
    "Taliyah": "Jungle",
    "Trundle": "Jungle",
    "Udyr": "Jungle",
    "Vi": "Jungle",
    "Viego": "Jungle",
    "Warwick": "Jungle",
    "Xin Zhao": "Jungle",
    "Zac": "Jungle",

    // Mid
    "Ahri": "Mid",
    "Akshan": "Mid",
    "Anivia": "Mid",
    "Annie": "Mid",
    "Aurelion Sol": "Mid",
    "Aurora": "Mid",
    "Azir": "Mid",
    "Cassiopeia": "Mid",
    "Corki": "Mid",
    "Fizz": "Mid",
    "Galio": "Mid",
    "Hwei": "Mid",
    "Kassadin": "Mid",
    "Katarina": "Mid",
    "LeBlanc": "Mid",
    "Lissandra": "Mid",
    "Lux": "Mid",
    "Malzahar": "Mid",
    "Naafiri": "Mid",
    "Neeko": "Mid",
    "Orianna": "Mid",
    "Qiyana": "Mid",
    "Ryze": "Mid",
    "Sylas": "Mid",
    "Syndra": "Mid",
    "Talon": "Mid",
    "Twisted Fate": "Mid",
    "Veigar": "Mid",
    "Vel'Koz": "Mid",
    "Vex": "Mid",
    "Viktor": "Mid",
    "Vladimir": "Mid",
    "Xerath": "Mid",
    "Zed": "Mid",
    "Ziggs": "Mid",
    "Zoe": "Mid",

    // ADC
    "Aphelios": "ADC",
    "Ashe": "ADC",
    "Caitlyn": "ADC",
    "Draven": "ADC",
    "Ezreal": "ADC",
    "Jhin": "ADC",
    "Jinx": "ADC",
    "Kai'Sa": "ADC",
    "Kalista": "ADC",
    "Kog'Maw": "ADC",
    "Lucian": "ADC",
    "Miss Fortune": "ADC",
    "Nilah": "ADC",
    "Samira": "ADC",
    "Sivir": "ADC",
    "Smolder": "ADC",
    "Tristana": "ADC",
    "Twitch": "ADC",
    "Varus": "ADC",
    "Vayne": "ADC",
    "Xayah": "ADC",
    "Zeri": "ADC",

    // Support
    "Alistar": "Support",
    "Bard": "Support",
    "Blitzcrank": "Support",
    "Braum": "Support",
    "Brand": "Support",
    "Janna": "Support",
    "Karma": "Support",
    "Leona": "Support",
    "Lulu": "Support",
    "Milio": "Support",
    "Morgana": "Support",
    "Nami": "Support",
    "Nautilus": "Support",
    "Pyke": "Support",
    "Rakan": "Support",
    "Renata Glasc": "Support",
    "Senna": "Support",
    "Seraphine": "Support",
    "Sona": "Support",
    "Soraka": "Support",
    "Taric": "Support",
    "Thresh": "Support",
    "Yuumi": "Support",
    "Zilean": "Support",
    "Zyra": "Support"
  };

  return roleMap[champion] ?? "Unknown";
}

function resolveLivePlayerRole(player: {
  teamPosition?: string | null;
  individualPosition?: string | null;
}, championName: string): CanonicalRole {
  const teamPosition = normalizeRole(player.teamPosition);
  if (teamPosition !== "Unknown") return teamPosition;

  const individualPosition = normalizeRole(player.individualPosition);
  if (individualPosition !== "Unknown") return individualPosition;

  return fallbackRoleByChampion(championName);
}

async function getLiveGame(platformHost: string, puuid: string) {
  try {
    const activeGame = await riotFetch<RiotActiveGameDto>(
      `${platformHost}/lol/spectator/v5/active-games/by-summoner/${puuid}`
    );

    const championMap = await getChampionIdMap();

    // Find the searched player's team by matching their puuid
    const searchedPlayer = activeGame.participants.find((p) => p.puuid === puuid);
    
    // Determine the searched player's team ID
    // In LoL, teams are 100 (blue) and 200 (red)
    let searchedPlayerTeamId = searchedPlayer?.teamId;
    
    // If we can't find the player by puuid, try to determine their team from the first half of participants
    if (!searchedPlayerTeamId && activeGame.participants.length >= 5) {
      // In standard games, first 5 participants are typically team 100, next 5 are team 200
      // Check if we can find the player by summonerId or other means
      const playerInFirstHalf = activeGame.participants.slice(0, 5).find((p) => p.puuid === puuid);
      searchedPlayerTeamId = playerInFirstHalf ? 100 : 200;
    }
    
    // Default to team 100 if still not found
    searchedPlayerTeamId = searchedPlayerTeamId ?? 100;

    const mappedPlayers: LiveGamePlayer[] = activeGame.participants.map((p) => {
      const championName =
        championMap[p.championId] || `Champion-${p.championId}`;

      // Ensure teamId is properly assigned - in most games it's 100 or 200
      const teamId = p.teamId ?? (activeGame.participants.indexOf(p) < 5 ? 100 : 200);

      return {
        summonerName:
          p.riotId ||
          p.riotIdGameName ||
          p.summonerName ||
          "Unknown",
        championName,
        position: resolveLivePlayerRole(p, championName),
        teamId
      };
    });

    // Allies are players on the same team as the searched player
    // Enemies are players on the opposite team
    const allies = mappedPlayers.filter((p) => p.teamId === searchedPlayerTeamId);
    const enemies = mappedPlayers.filter((p) => p.teamId !== searchedPlayerTeamId);

    // Find the searched player in allies
    const playerData = allies.find((p) => {
      // Try to match by various name fields from the original participant data
      const originalParticipant = activeGame.participants.find(
        (op) => op.puuid === puuid
      );
      if (originalParticipant) {
        return p.summonerName === (originalParticipant.riotId || originalParticipant.riotIdGameName || originalParticipant.summonerName);
      }
      return false;
    }) || allies[0]; // Fallback to first ally if not found

    const playerChampion = playerData?.championName || null;
    const playerRole = playerData?.position || null;

    // Find the enemy laner based on player's role
    const enemyLaner = enemies.find((e) => e.position === playerRole)?.championName || null;

    // Log for debugging
    console.log(`[riot-service] Live game: ${allies.length} allies, ${enemies.length} enemies, player: ${playerChampion} (${playerRole}), vs: ${enemyLaner}`);

    return {
      isInGame: true,
      gameMode: activeGame.gameMode,
      gameLength: activeGame.gameLength,
      allies,
      enemies,
      playerChampion,
      playerRole,
      enemyLaner
    };
  } catch {
    return {
      isInGame: false,
      gameMode: null,
      gameLength: null,
      allies: [],
      enemies: [],
      playerChampion: null,
      playerRole: null,
      enemyLaner: null
    };
  }
}

async function getChallenges(platformHost: string, puuid: string) {
  try {
    const data = await riotFetch<RiotChallengesPlayerDataDto>(
      `${platformHost}/lol/challenges/v1/player-data/${puuid}`
    );

    return {
      totalPoints: data.totalPoints?.current ?? 0,
      level: data.totalPoints?.level ?? "NONE",
      percentile: data.totalPoints?.percentile ?? 0
    };
  } catch {
    return {
      totalPoints: 0,
      level: "NONE",
      percentile: 0
    };
  }
}

export async function searchSummoner(region: string, riotId: string) {
  const cacheKey = `${region}:${riotId.toLowerCase()}`;
  const now = Date.now();
  const cached = searchCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const platformHost = PLATFORM_HOSTS[region];
  const regionalHost = REGIONAL_HOSTS[region];

  if (!platformHost || !regionalHost) {
    throw new Error("Región no soportada");
  }

  const { gameName, tagLine } = parseRiotId(riotId);

  const account = await riotFetch<RiotAccountDto>(
    `${regionalHost}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`
  );

  const summoner = await riotFetch<RiotSummonerDto>(
    `${platformHost}/lol/summoner/v4/summoners/by-puuid/${account.puuid}`
  );

  const leagueEntries = await riotFetch<RiotLeagueEntryDto[]>(
    `${platformHost}/lol/league/v4/entries/by-puuid/${account.puuid}`
  );

  const matchIds = await riotFetch<string[]>(
    `${regionalHost}/lol/match/v5/matches/by-puuid/${account.puuid}/ids?start=0&count=5`
  );

  const matches = await Promise.all(
    matchIds.map((matchId) =>
      riotFetch<RiotMatchDto>(`${regionalHost}/lol/match/v5/matches/${matchId}`)
    )
  );

  const masteries = await riotFetch<RiotChampionMasteryDto[]>(
    `${platformHost}/lol/champion-mastery/v4/champion-masteries/by-puuid/${account.puuid}/top?count=10`
  );

  const liveGame = await getLiveGame(platformHost, account.puuid);
  const challenges = await getChallenges(platformHost, account.puuid);
  const { solo, flex } = mapLeagueEntries(leagueEntries);
  const recentMatches = await mapRecentMatches(matches, account.puuid);
  const topChampions = await mapMasteries(masteries);

  const rankedMatchInputs: Array<{ result: "W" | "L"; queueId: number }> =
    recentMatches.map((m) => ({
      result: m.result,
      queueId: m.queueId
    }));

  const soloLpHistory = buildLpHistoryFromRankedMatches(
    solo?.leaguePoints ?? 0,
    rankedMatchInputs,
    "solo"
  );

  const flexLpHistory = buildLpHistoryFromRankedMatches(
    flex?.leaguePoints ?? 0,
    rankedMatchInputs,
    "flex"
  );

  // Determine the player's current champion and role from live game or recent matches
  const playerInLiveGame = liveGame.isInGame 
    ? liveGame.allies.find((ally) => ally.summonerName.toLowerCase().includes(account.gameName.toLowerCase()))
    : null;
  
  const currentChampion = playerInLiveGame?.championName 
    || recentMatches[0]?.championName 
    || topChampions[0]?.championName 
    || "Ahri";

  const playerRole = playerInLiveGame?.position || "Mid";

  const enemyTeam =
    liveGame.isInGame && liveGame.enemies.length > 0
      ? liveGame.enemies.map((player) => player.championName)
      : [];

  // Find the enemy laner that matches the player's current role
  const enemyLaner =
    liveGame.isInGame && liveGame.enemies.length > 0
      ? liveGame.enemies.find((player) => player.position === playerRole)?.championName ?? null
      : null;

  const recommendation = getDynamicRecommendation({
    champion: currentChampion,
    versus: enemyLaner,
    enemyTeam
  });

  const response = {
    profile: {
      puuid: account.puuid,
      gameName: account.gameName,
      tagLine: account.tagLine,
      summonerLevel: summoner.summonerLevel,
      profileIconId: summoner.profileIconId,
      region
    },
    solo,
    flex,
    lpProgressSolo: soloLpHistory.points,
    lpProgressFlex: flexLpHistory.points,
    hasSoloLpHistory: soloLpHistory.hasHistory,
    hasFlexLpHistory: flexLpHistory.hasHistory,
    recentMatches,
    topChampions,
    liveGame,
    challenges,
    recommendation
  };

  searchCache.set(cacheKey, {
    data: response,
    expiresAt: now + 1000 * 60 * 2
  });

  return response;
}
