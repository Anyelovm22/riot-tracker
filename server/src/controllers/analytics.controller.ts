import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  getMatchById,
  getMatchIdsByPuuid,
  getSummonerByPuuid,
  getLeagueEntriesBySummonerId,
} from '../services/riot.service';

type QueueMode = 'solo' | 'flex' | 'all';
type Severity = 'high' | 'medium' | 'low';

type Insight = {
  key: string;
  title: string;
  description: string;
  severity: Severity;
  metric?: string;
  currentValue?: number | string;
  targetValue?: number | string;
  recommendation: string;
};

type MatchLike = {
  puuid: string;
  platform: string;
  matchId: string;
  queueId: number;
  gameCreation: bigint | number;
  gameDuration: number;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  visionScore: number;
  timeCCingOthers: number;
  damageDealtToObjectives: number;
  turretTakedowns: number;
  goldEarned: number;
  individualPosition: string | null;
};

const queueMap = {
  solo: 420,
  flex: 440,
};

const activeSyncRequests = new Set<string>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toNumberGameCreation(value: bigint | number) {
  return typeof value === 'bigint' ? Number(value) : value;
}

function normalizeRole(role?: string | null) {
  if (!role) return 'UNKNOWN';

  const upper = role.toUpperCase();

  if (upper === 'MIDDLE') return 'MID';
  if (upper === 'BOTTOM') return 'ADC';
  if (upper === 'UTILITY') return 'SUPPORT';
  if (upper === 'JUNGLE') return 'JUNGLE';
  if (upper === 'TOP') return 'TOP';

  return upper;
}

function getKdaRatio(match: MatchLike) {
  if (match.deaths === 0) {
    return Number((match.kills + match.assists).toFixed(2));
  }

  return Number(((match.kills + match.assists) / match.deaths).toFixed(2));
}

function getCs(match: MatchLike) {
  return (match.totalMinionsKilled || 0) + (match.neutralMinionsKilled || 0);
}

function getMinutes(match: MatchLike) {
  return Math.max((match.gameDuration || 0) / 60, 1);
}

function summarizeMatches(matches: MatchLike[]) {
  const wins = matches.filter((m) => m.win).length;
  const losses = matches.length - wins;

  const totalMinutes = matches.reduce((sum, match) => sum + getMinutes(match), 0);
  const totalCs = matches.reduce((sum, match) => sum + getCs(match), 0);
  const totalDamage = matches.reduce(
    (sum, match) => sum + (match.totalDamageDealtToChampions || 0),
    0
  );
  const totalVision = matches.reduce((sum, match) => sum + (match.visionScore || 0), 0);
  const totalGold = matches.reduce((sum, match) => sum + (match.goldEarned || 0), 0);
  const totalObjectiveDamage = matches.reduce(
    (sum, match) => sum + (match.damageDealtToObjectives || 0),
    0
  );
  const totalTurrets = matches.reduce((sum, match) => sum + (match.turretTakedowns || 0), 0);
  const totalDeaths = matches.reduce((sum, match) => sum + (match.deaths || 0), 0);
  const totalDamageTaken = matches.reduce((sum, match) => sum + (match.totalDamageTaken || 0), 0);

  const avgKda =
    matches.length > 0
      ? Number(
          (matches.reduce((sum, match) => sum + getKdaRatio(match), 0) / matches.length).toFixed(2)
        )
      : 0;

  const avgDamage = matches.length > 0 ? Math.round(totalDamage / matches.length) : 0;
  const avgGold = matches.length > 0 ? Math.round(totalGold / matches.length) : 0;
  const avgCs = matches.length > 0 ? Math.round(totalCs / matches.length) : 0;
  const avgVision = matches.length > 0 ? Math.round(totalVision / matches.length) : 0;
  const objectiveDamageAvg =
    matches.length > 0 ? Math.round(totalObjectiveDamage / matches.length) : 0;
  const turretAvg = matches.length > 0 ? Number((totalTurrets / matches.length).toFixed(2)) : 0;
  const deathsAvg = matches.length > 0 ? Number((totalDeaths / matches.length).toFixed(2)) : 0;
  const avgDamageTaken =
    matches.length > 0 ? Math.round(totalDamageTaken / matches.length) : 0;

  const csPerMin = totalMinutes > 0 ? Number((totalCs / totalMinutes).toFixed(2)) : 0;
  const damagePerMin = totalMinutes > 0 ? Math.round(totalDamage / totalMinutes) : 0;
  const goldPerMin = totalMinutes > 0 ? Math.round(totalGold / totalMinutes) : 0;
  const visionPerMin = totalMinutes > 0 ? Number((totalVision / totalMinutes).toFixed(2)) : 0;

  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  return {
    total: matches.length,
    wins,
    losses,
    winRate,
    avgKda,
    avgDamage,
    avgGold,
    avgCs,
    avgVision,
    avgDamageTaken,
    csPerMin,
    damagePerMin,
    goldPerMin,
    visionPerMin,
    objectiveDamageAvg,
    turretAvg,
    deathsAvg,
  };
}

function detectMainRole(matches: MatchLike[]) {
  const counts = new Map<string, number>();

  for (const match of matches) {
    const role = normalizeRole(match.individualPosition);
    if (role !== 'UNKNOWN') {
      counts.set(role, (counts.get(role) || 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || 'UNKNOWN';
}

function buildTrend(matches: MatchLike[]) {
  const ordered = [...matches].sort(
    (a, b) => toNumberGameCreation(a.gameCreation) - toNumberGameCreation(b.gameCreation)
  );

  const chunkSize = 5;
  const chunks: MatchLike[][] = [];

  for (let i = 0; i < ordered.length; i += chunkSize) {
    chunks.push(ordered.slice(i, i + chunkSize));
  }

  return chunks.map((chunk, index) => {
    const summary = summarizeMatches(chunk);

    return {
      label: `Bloque ${index + 1}`,
      winRate: summary.winRate,
      kda: summary.avgKda,
      csPerMin: summary.csPerMin,
      visionPerMin: summary.visionPerMin,
      goldPerMin: summary.goldPerMin,
      damagePerMin: summary.damagePerMin,
      deathsAvg: summary.deathsAvg,
      objectiveDamageAvg: summary.objectiveDamageAvg,
      turretAvg: summary.turretAvg,
    };
  });
}

function buildRoleBreakdown(matches: MatchLike[]) {
  const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

  return roles
    .map((role) => {
      const filtered = matches.filter((m) => normalizeRole(m.individualPosition) === role);
      const summary = summarizeMatches(filtered);

      return {
        role,
        games: summary.total,
        winRate: summary.winRate,
        avgKda: summary.avgKda,
        avgDamage: summary.avgDamage,
        avgGold: summary.avgGold,
        avgCs: summary.avgCs,
        avgVision: summary.avgVision,
        avgDamageTaken: summary.avgDamageTaken,
        csPerMin: summary.csPerMin,
        visionPerMin: summary.visionPerMin,
        goldPerMin: summary.goldPerMin,
        damagePerMin: summary.damagePerMin,
        objectiveDamageAvg: summary.objectiveDamageAvg,
        turretAvg: summary.turretAvg,
        deathsAvg: summary.deathsAvg,
      };
    })
    .filter((item) => item.games > 0)
    .sort((a, b) => b.games - a.games);
}

function buildChampionBreakdown(matches: MatchLike[]) {
  const map = new Map<
    string,
    {
      games: number;
      wins: number;
      rawKda: number;
      rawDamage: number;
      rawGold: number;
      rawVision: number;
      rawCs: number;
      rawMinutes: number;
      rawDeaths: number;
    }
  >();

  for (const match of matches) {
    const champion = match.championName;
    if (!champion) continue;

    const current = map.get(champion) || {
      games: 0,
      wins: 0,
      rawKda: 0,
      rawDamage: 0,
      rawGold: 0,
      rawVision: 0,
      rawCs: 0,
      rawMinutes: 0,
      rawDeaths: 0,
    };

    current.games += 1;
    if (match.win) current.wins += 1;
    current.rawKda += getKdaRatio(match);
    current.rawDamage += match.totalDamageDealtToChampions || 0;
    current.rawGold += match.goldEarned || 0;
    current.rawVision += match.visionScore || 0;
    current.rawCs += getCs(match);
    current.rawMinutes += getMinutes(match);
    current.rawDeaths += match.deaths || 0;

    map.set(champion, current);
  }

  return [...map.entries()]
    .map(([champion, value]) => ({
      champion,
      games: value.games,
      wins: value.wins,
      losses: value.games - value.wins,
      winRate: value.games > 0 ? Math.round((value.wins / value.games) * 100) : 0,
      avgKda: Number((value.rawKda / value.games).toFixed(2)),
      avgDamage: Math.round(value.rawDamage / value.games),
      avgGold: Math.round(value.rawGold / value.games),
      avgDeaths: Number((value.rawDeaths / value.games).toFixed(2)),
      csPerMin: value.rawMinutes > 0 ? Number((value.rawCs / value.rawMinutes).toFixed(2)) : 0,
      visionPerMin:
        value.rawMinutes > 0 ? Number((value.rawVision / value.rawMinutes).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.games - a.games);
}

function buildPerformanceScore(summary: ReturnType<typeof summarizeMatches>, mainRole: string) {
  let score = 50;

  if (summary.winRate >= 55) score += 15;
  else if (summary.winRate >= 50) score += 5;
  else if (summary.winRate < 48) score -= 10;

  if (summary.avgKda >= 3.2) score += 12;
  else if (summary.avgKda >= 2.5) score += 6;
  else if (summary.avgKda < 2) score -= 10;

  if (['TOP', 'MID', 'ADC'].includes(mainRole)) {
    if (summary.csPerMin >= 7.2) score += 10;
    else if (summary.csPerMin >= 6.2) score += 4;
    else score -= 10;
  }

  if (mainRole === 'JUNGLE') {
    if (summary.goldPerMin >= 390) score += 8;
    else if (summary.goldPerMin < 330) score -= 8;
  }

  if (mainRole === 'SUPPORT') {
    if (summary.visionPerMin >= 1.4) score += 12;
    else if (summary.visionPerMin >= 1.1) score += 5;
    else score -= 10;
  }

  if (summary.deathsAvg <= 4.5) score += 8;
  else if (summary.deathsAvg > 6.5) score -= 10;

  if (summary.objectiveDamageAvg >= 4500) score += 5;
  if (summary.turretAvg >= 1) score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildBenchmarks(mainRole: string) {
  const defaultBenchmarks = {
    winRate: 55,
    kda: 3,
    csPerMin: 6.5,
    visionPerMin: 0.9,
    goldPerMin: 380,
    damagePerMin: 550,
    deathsAvg: 5,
    objectiveDamageAvg: 3500,
    turretAvg: 1,
  };

  if (mainRole === 'SUPPORT') {
    return {
      ...defaultBenchmarks,
      csPerMin: 1.5,
      visionPerMin: 1.3,
      goldPerMin: 300,
      damagePerMin: 300,
      deathsAvg: 5.5,
    };
  }

  if (mainRole === 'JUNGLE') {
    return {
      ...defaultBenchmarks,
      csPerMin: 5.5,
      visionPerMin: 0.85,
      goldPerMin: 370,
      damagePerMin: 500,
      deathsAvg: 5.5,
    };
  }

  return defaultBenchmarks;
}

function pushIssue(issues: Insight[], item: Insight, limit = 8) {
  if (issues.length < limit) issues.push(item);
}

function pushStrength(strengths: Insight[], item: Insight, limit = 8) {
  if (strengths.length < limit) strengths.push(item);
}

function buildInsights(matches: MatchLike[], mainRole: string) {
  const summary = summarizeMatches(matches);
  const issues: Insight[] = [];
  const strengths: Insight[] = [];

  if (summary.total < 10) {
    issues.push({
      key: 'sample-low',
      title: 'Muestra pequeña',
      description: 'Todavía hay pocas partidas cacheadas para sacar conclusiones muy fuertes.',
      severity: 'medium',
      recommendation: 'Haz más sincronizaciones para ampliar la base histórica.',
    });
  }

  if (['TOP', 'MID', 'ADC'].includes(mainRole) && summary.csPerMin < 6.2) {
    pushIssue(issues, {
      key: 'low-cs',
      title: 'Farmeo bajo',
      description: `Tu CS/min es ${summary.csPerMin}, bajo para ${mainRole}.`,
      severity: 'high',
      metric: 'CS/min',
      currentValue: summary.csPerMin,
      targetValue: '7.0+',
      recommendation:
        'Practica last hit, recoge side waves con más disciplina y evita rotaciones sin prioridad.',
    });
  }

  if (['TOP', 'MID', 'ADC'].includes(mainRole) && summary.csPerMin >= 7) {
    pushStrength(strengths, {
      key: 'good-cs',
      title: 'Buen farmeo',
      description: `Tu CS/min es ${summary.csPerMin}, bastante sólido para ${mainRole}.`,
      severity: 'low',
      metric: 'CS/min',
      currentValue: summary.csPerMin,
      targetValue: '7.0+',
      recommendation: 'Mantén ese nivel y conviértelo mejor en presión de mapa y objetivos.',
    });
  }

  if (mainRole === 'SUPPORT' && summary.visionPerMin < 1.1) {
    pushIssue(issues, {
      key: 'low-vision-support',
      title: 'Visión baja para support',
      description: `Tu visión por minuto es ${summary.visionPerMin}.`,
      severity: 'high',
      metric: 'Vision/min',
      currentValue: summary.visionPerMin,
      targetValue: '1.3+',
      recommendation:
        'Compra más control wards y coloca visión antes de dragones, Heraldo y entradas de jungla.',
    });
  }

  if (mainRole === 'SUPPORT' && summary.visionPerMin >= 1.3) {
    pushStrength(strengths, {
      key: 'good-vision-support',
      title: 'Muy buena visión',
      description: `Tu visión por minuto es ${summary.visionPerMin}, bastante buena para support.`,
      severity: 'low',
      metric: 'Vision/min',
      currentValue: summary.visionPerMin,
      targetValue: '1.3+',
      recommendation: 'Sigue usando esa visión para preparar peleas y picks.',
    });
  }

  if (summary.deathsAvg > 6.2) {
    pushIssue(issues, {
      key: 'high-deaths',
      title: 'Muertes elevadas',
      description: `Promedias ${summary.deathsAvg} muertes por partida.`,
      severity: 'high',
      metric: 'Muertes',
      currentValue: summary.deathsAvg,
      targetValue: '< 5',
      recommendation:
        'Respeta más la visión enemiga, revisa tus entradas y evita pelear cuando no tienes tempo.',
    });
  }

  if (summary.deathsAvg <= 4.8) {
    pushStrength(strengths, {
      key: 'good-deaths',
      title: 'Buena supervivencia',
      description: `Promedias ${summary.deathsAvg} muertes por partida, lo cual es estable.`,
      severity: 'low',
      metric: 'Muertes',
      currentValue: summary.deathsAvg,
      targetValue: '< 5',
      recommendation: 'Mantén esa estabilidad y busca convertirla mejor en objetivos.',
    });
  }

  if (summary.goldPerMin < 340) {
    pushIssue(issues, {
      key: 'low-gold',
      title: 'Generación de oro baja',
      description: `Tu oro por minuto es ${summary.goldPerMin}.`,
      severity: 'medium',
      metric: 'Gold/min',
      currentValue: summary.goldPerMin,
      targetValue: '380+',
      recommendation:
        'Farmea más constante, recoge recursos laterales y no regales tiempo muerto entre jugadas.',
    });
  }

  if (summary.goldPerMin >= 380) {
    pushStrength(strengths, {
      key: 'good-gold',
      title: 'Buen ritmo de oro',
      description: `Tu oro por minuto es ${summary.goldPerMin}.`,
      severity: 'low',
      metric: 'Gold/min',
      currentValue: summary.goldPerMin,
      targetValue: '380+',
      recommendation: 'Usa esa ventaja para cerrar partidas con más orden.',
    });
  }

  if (summary.damagePerMin < 500 && ['MID', 'ADC', 'TOP'].includes(mainRole)) {
    pushIssue(issues, {
      key: 'low-damage',
      title: 'Daño por minuto bajo',
      description: `Tu daño por minuto es ${summary.damagePerMin}.`,
      severity: 'medium',
      metric: 'Damage/min',
      currentValue: summary.damagePerMin,
      targetValue: '600+',
      recommendation:
        'Busca más uptime en teamfights y presencia en peleas decisivas.',
    });
  }

  if (summary.damagePerMin >= 620 && ['MID', 'ADC', 'TOP'].includes(mainRole)) {
    pushStrength(strengths, {
      key: 'good-damage',
      title: 'Buen daño por minuto',
      description: `Tu daño por minuto es ${summary.damagePerMin}.`,
      severity: 'low',
      metric: 'Damage/min',
      currentValue: summary.damagePerMin,
      targetValue: '600+',
      recommendation: 'Convierte ese daño en dragones, torres y Baron.',
    });
  }

  if (summary.visionPerMin < 0.7 && mainRole !== 'SUPPORT') {
    pushIssue(issues, {
      key: 'low-vision',
      title: 'Visión mejorable',
      description: `Tu visión por minuto es ${summary.visionPerMin}.`,
      severity: 'medium',
      metric: 'Vision/min',
      currentValue: summary.visionPerMin,
      targetValue: '0.8+',
      recommendation:
        'Wardea antes de pushear, invadir o pelear objetivos. La visión no es solo tarea del support.',
    });
  }

  if (summary.visionPerMin >= 0.9 && mainRole !== 'SUPPORT') {
    pushStrength(strengths, {
      key: 'good-vision',
      title: 'Visión decente',
      description: `Tu visión por minuto es ${summary.visionPerMin}.`,
      severity: 'low',
      metric: 'Vision/min',
      currentValue: summary.visionPerMin,
      targetValue: '0.8+',
      recommendation: 'Sigue usándola para jugar con más información.',
    });
  }

  if (summary.winRate < 50) {
    pushIssue(issues, {
      key: 'low-winrate',
      title: 'Winrate por debajo de 50%',
      description: `Tu winrate cacheado actual es ${summary.winRate}%.`,
      severity: 'high',
      metric: 'Winrate',
      currentValue: `${summary.winRate}%`,
      targetValue: '50%+',
      recommendation:
        'Reduce picks inconsistentes y concéntrate en campeones más estables mientras corriges fundamentos.',
    });
  }

  if (summary.winRate >= 55) {
    pushStrength(strengths, {
      key: 'good-winrate',
      title: 'Buen winrate cacheado',
      description: `Tu winrate cacheado es ${summary.winRate}%.`,
      severity: 'low',
      metric: 'Winrate',
      currentValue: `${summary.winRate}%`,
      targetValue: '55%+',
      recommendation: 'Sigue priorizando tus picks más confiables.',
    });
  }

  if (summary.objectiveDamageAvg < 2500) {
    pushIssue(issues, {
      key: 'low-objectives',
      title: 'Baja presión sobre objetivos',
      description: `Tu daño promedio a objetivos es ${summary.objectiveDamageAvg}.`,
      severity: 'medium',
      metric: 'Objective damage',
      currentValue: summary.objectiveDamageAvg,
      targetValue: '3500+',
      recommendation:
        'Después de ganar presión o una pelea, conviértelo más seguido en dragón, Heraldo o torres.',
    });
  }

  if (summary.objectiveDamageAvg >= 4000) {
    pushStrength(strengths, {
      key: 'good-objectives',
      title: 'Buena conversión a objetivos',
      description: `Tu daño promedio a objetivos es ${summary.objectiveDamageAvg}.`,
      severity: 'low',
      metric: 'Objective damage',
      currentValue: summary.objectiveDamageAvg,
      targetValue: '3500+',
      recommendation: 'Esa conversión te ayuda a cerrar mejor las partidas.',
    });
  }

  if (!issues.length) {
    issues.push({
      key: 'no-major-issue',
      title: 'Sin debilidad dominante',
      description: 'No se detecta un problema muy marcado en la muestra actual.',
      severity: 'low',
      recommendation:
        'Sigue ampliando la muestra y mejora detalles finos de tempo, visión y objetivos.',
    });
  }

  if (!strengths.length) {
    strengths.push({
      key: 'stable-performance',
      title: 'Rendimiento estable',
      description: 'No destaca una fortaleza enorme, pero la muestra se ve relativamente estable.',
      severity: 'low',
      recommendation:
        'Construye una ventaja más clara mejorando un área concreta como visión, farmeo o conversión a objetivos.',
    });
  }

  return { issues, strengths };
}

function buildFullDiagnostics(matches: MatchLike[], mainRole: string) {
  const summary = summarizeMatches(matches);

  return [
    {
      key: 'sample-size',
      title: 'Tamaño de muestra',
      description: `Se analizaron ${summary.total} partidas cacheadas.`,
      severity: summary.total >= 30 ? 'low' : 'medium',
      recommendation:
        summary.total >= 30
          ? 'La muestra ya permite ver patrones relativamente estables.'
          : 'Conviene aumentar la muestra para sacar conclusiones más sólidas.',
    },
    {
      key: 'winrate',
      title: 'Winrate general',
      description: `Tu winrate cacheado es ${summary.winRate}%.`,
      severity: summary.winRate < 50 ? 'high' : summary.winRate < 55 ? 'medium' : 'low',
      metric: 'Winrate',
      currentValue: `${summary.winRate}%`,
      targetValue: '55%+',
      recommendation:
        summary.winRate >= 55
          ? 'Tu winrate cacheado es bueno; cuida consistencia y selección de picks.'
          : 'Reduce errores base y prioriza tus campeones más confiables.',
    },
    {
      key: 'kda',
      title: 'KDA promedio',
      description: `Tu KDA promedio es ${summary.avgKda}.`,
      severity: summary.avgKda < 2 ? 'high' : summary.avgKda < 3 ? 'medium' : 'low',
      metric: 'KDA',
      currentValue: summary.avgKda,
      targetValue: '3.0+',
      recommendation:
        summary.avgKda >= 3
          ? 'Tu estabilidad en peleas es buena.'
          : 'Busca morir menos y mejorar entradas o posicionamiento.',
    },
    {
      key: 'cs-pm',
      title: 'CS por minuto',
      description: `Tu CS/min es ${summary.csPerMin}.`,
      severity:
        ['TOP', 'MID', 'ADC'].includes(mainRole) && summary.csPerMin < 6.2
          ? 'high'
          : ['TOP', 'MID', 'ADC'].includes(mainRole) && summary.csPerMin < 7
          ? 'medium'
          : 'low',
      metric: 'CS/min',
      currentValue: summary.csPerMin,
      targetValue: ['TOP', 'MID', 'ADC'].includes(mainRole) ? '7.0+' : 'según rol',
      recommendation:
        ['TOP', 'MID', 'ADC'].includes(mainRole)
          ? 'Mejora control de waves, tempo y recolección de side lane.'
          : 'Úsalo como apoyo secundario, no como métrica principal de tu rol.',
    },
    {
      key: 'vision-pm',
      title: 'Visión por minuto',
      description: `Tu visión por minuto es ${summary.visionPerMin}.`,
      severity:
        mainRole === 'SUPPORT'
          ? summary.visionPerMin < 1.1
            ? 'high'
            : summary.visionPerMin < 1.3
            ? 'medium'
            : 'low'
          : summary.visionPerMin < 0.7
          ? 'medium'
          : 'low',
      metric: 'Vision/min',
      currentValue: summary.visionPerMin,
      targetValue: mainRole === 'SUPPORT' ? '1.3+' : '0.8+',
      recommendation:
        'Coloca visión antes de pelear o invadir, no solo cuando ya pasó la jugada.',
    },
    {
      key: 'gold-pm',
      title: 'Oro por minuto',
      description: `Tu oro por minuto es ${summary.goldPerMin}.`,
      severity: summary.goldPerMin < 340 ? 'medium' : 'low',
      metric: 'Gold/min',
      currentValue: summary.goldPerMin,
      targetValue: '380+',
      recommendation:
        'Convierte mejor el tiempo en recursos: farm, placas, objetivos y side waves.',
    },
    {
      key: 'damage-pm',
      title: 'Daño por minuto',
      description: `Tu daño por minuto es ${summary.damagePerMin}.`,
      severity:
        ['TOP', 'MID', 'ADC'].includes(mainRole) && summary.damagePerMin < 500
          ? 'medium'
          : 'low',
      metric: 'Damage/min',
      currentValue: summary.damagePerMin,
      targetValue: ['TOP', 'MID', 'ADC'].includes(mainRole) ? '600+' : 'según rol',
      recommendation:
        'Mejora uptime de daño en peleas y tu presencia en momentos decisivos.',
    },
    {
      key: 'deaths',
      title: 'Muertes promedio',
      description: `Promedias ${summary.deathsAvg} muertes por partida.`,
      severity: summary.deathsAvg > 6.2 ? 'high' : summary.deathsAvg > 5 ? 'medium' : 'low',
      metric: 'Muertes',
      currentValue: summary.deathsAvg,
      targetValue: '< 5',
      recommendation:
        'Respeta visión enemiga, timers y evita peleas sin prioridad o información.',
    },
  ] as Insight[];
}

function buildTrendMessage(matches: MatchLike[]) {
  if (matches.length < 10) {
    return 'Hay pocas partidas cacheadas todavía para detectar una tendencia fuerte.';
  }

  const trend = buildTrend(matches);
  if (trend.length < 2) {
    return 'No hay suficientes bloques para construir una tendencia confiable.';
  }

  const first = trend[0];
  const last = trend[trend.length - 1];

  if (last.winRate > first.winRate && last.kda >= first.kda) {
    return 'Tu rendimiento reciente muestra una tendencia positiva en resultados y consistencia.';
  }

  if (last.winRate < first.winRate && last.deathsAvg > first.deathsAvg) {
    return 'Tu rendimiento reciente cayó; vale la pena revisar muertes, tempo y toma de peleas.';
  }

  return 'Tu rendimiento reciente se mantiene relativamente estable.';
}

function buildChampionRecommendations(championBreakdown: ReturnType<typeof buildChampionBreakdown>) {
  const recommendedChampions = championBreakdown
    .filter((item) => item.games >= 4 && item.winRate >= 55 && item.avgKda >= 2.5)
    .slice(0, 5);

  const stableChampions = championBreakdown
    .filter((item) => item.games >= 4 && item.winRate >= 50 && item.avgKda >= 2.2)
    .slice(0, 5);

  const avoidChampions = championBreakdown
    .filter((item) => item.games >= 4 && item.winRate < 45)
    .slice(0, 5);

  return {
    recommendedChampions,
    stableChampions,
    avoidChampions,
  };
}

function buildImprovementPlan(
  issues: Insight[],
  strengths: Insight[],
  summary: ReturnType<typeof summarizeMatches>,
  mainRole: string
) {
  const focus = issues.slice(0, 3).map((item) => item.title);
  const habits = issues.slice(0, 3).map((item) => item.recommendation);
  const keepDoing = strengths.slice(0, 3).map((item) => item.title);

  let weeklyGoal = 'Aumentar la muestra y mantener consistencia en tus picks más confiables.';

  if (['TOP', 'MID', 'ADC'].includes(mainRole) && summary.csPerMin < 7) {
    weeklyGoal = 'Subir tu CS/min en tus próximas sesiones sin sacrificar supervivencia.';
  } else if (mainRole === 'SUPPORT' && summary.visionPerMin < 1.3) {
    weeklyGoal = 'Mejorar la visión previa a objetivos y aumentar el uso de control wards.';
  } else if (summary.deathsAvg > 5.5) {
    weeklyGoal = 'Reducir tus muertes promedio en las próximas partidas.';
  }

  return {
    focus,
    habits,
    keepDoing,
    weeklyGoal,
  };
}

function buildQueueAnalytics(matches: MatchLike[]) {
  const summary = summarizeMatches(matches);
  const mainRole = detectMainRole(matches);
  const benchmarks = buildBenchmarks(mainRole);
  const roleBreakdown = buildRoleBreakdown(matches);
  const championBreakdown = buildChampionBreakdown(matches);
  const trend = buildTrend(matches);
  const { issues, strengths } = buildInsights(matches, mainRole);
  const diagnostics = buildFullDiagnostics(matches, mainRole);
  const trendMessage = buildTrendMessage(matches);
  const performanceScore = buildPerformanceScore(summary, mainRole);

  const { recommendedChampions, avoidChampions, stableChampions } =
    buildChampionRecommendations(championBreakdown);

  const bestChampion =
    championBreakdown
      .filter((item) => item.games >= 3)
      .sort((a, b) => {
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.games - a.games;
      })[0] || null;

  const weakestChampion =
    championBreakdown
      .filter((item) => item.games >= 3)
      .sort((a, b) => {
        if (a.winRate !== b.winRate) return a.winRate - b.winRate;
        return b.games - a.games;
      })[0] || null;

  const improvementPlan = buildImprovementPlan(issues, strengths, summary, mainRole);

  return {
    summary,
    benchmarks,
    mainRole,
    performanceScore,
    roleBreakdown,
    championBreakdown,
    trend,
    strengths,
    issues,
    diagnostics,
    trendMessage,
    topChampion: championBreakdown[0] || null,
    bestChampion,
    weakestChampion,
    recommendedChampions,
    avoidChampions,
    stableChampions,
    improvementPlan,
  };
}

function normalizeLeagueEntries(entries: any[]) {
  return (entries || []).map((entry) => ({
    queueType: entry.queueType,
    tier: entry.tier,
    rank: entry.rank,
    leaguePoints: entry.leaguePoints,
    wins: entry.wins,
    losses: entry.losses,
    hotStreak: entry.hotStreak,
    veteran: entry.veteran,
    freshBlood: entry.freshBlood,
    inactive: entry.inactive,
  }));
}

function getQueueTypeFromQueueId(queueId: number) {
  if (queueId === queueMap.solo) return 'RANKED_SOLO_5x5';
  if (queueId === queueMap.flex) return 'RANKED_FLEX_SR';
  return null;
}

function rankToNumber(tier: string, rank: string, lp: number) {
  const tierMap: Record<string, number> = {
    IRON: 1,
    BRONZE: 2,
    SILVER: 3,
    GOLD: 4,
    PLATINUM: 5,
    EMERALD: 6,
    DIAMOND: 7,
    MASTER: 8,
    GRANDMASTER: 9,
    CHALLENGER: 10,
  };

  const rankMap: Record<string, number> = {
    IV: 1,
    III: 2,
    II: 3,
    I: 4,
  };

  const tierValue = tierMap[(tier || '').toUpperCase()] || 0;
  const rankValue = rankMap[(rank || '').toUpperCase()] || 0;

  return tierValue * 1000 + rankValue * 100 + (lp || 0);
}

async function saveRankSnapshots(puuid: string, platform: string) {
  try {
    const summoner = await getSummonerByPuuid(puuid, platform);
    if (!summoner?.id) return;

    const entries = await getLeagueEntriesBySummonerId(summoner.id, platform);
    if (!entries?.length) return;

    for (const entry of entries) {
      const lastSnapshot = await prisma.playerRankSnapshot.findFirst({
        where: {
          puuid,
          platform,
          queueType: entry.queueType,
        },
        orderBy: {
          snapshotAt: 'desc',
        },
      });

      const isSameAsLast =
        lastSnapshot &&
        lastSnapshot.tier === entry.tier &&
        lastSnapshot.rank === entry.rank &&
        lastSnapshot.leaguePoints === entry.leaguePoints &&
        lastSnapshot.wins === entry.wins &&
        lastSnapshot.losses === entry.losses;

      if (isSameAsLast) continue;

      await prisma.playerRankSnapshot.create({
        data: {
          puuid,
          platform,
          queueType: entry.queueType,
          tier: entry.tier,
          rank: entry.rank,
          leaguePoints: entry.leaguePoints,
          wins: entry.wins,
          losses: entry.losses,
        },
      });
    }
  } catch {
    // no romper sync o analytics
  }
}

async function getMatchWithRetry(matchId: string, platform: string, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await getMatchById(matchId, platform);
    } catch (error: any) {
      const status = error?.response?.status;

      if (status === 429 && attempt < retries - 1) {
        await sleep(4000 * (attempt + 1));
        continue;
      }

      throw error;
    }
  }

  throw new Error('Retry attempts exhausted');
}

export async function syncAnalyticsMatches(req: Request, res: Response) {
  const puuid = String(req.body.puuid || '').trim();
  const platform = String(req.body.platform || 'la1').trim().toLowerCase();
  const mode = String(req.body.mode || 'incremental').trim().toLowerCase();
  const requestedMaxMatches = Math.min(Number(req.body.maxMatches || 200), 1000);

  if (!puuid) {
    return res.status(400).json({ message: 'puuid is required' });
  }

  const requestKey = `${platform}:${puuid}`;

  if (activeSyncRequests.has(requestKey)) {
    return res.status(429).json({
      success: false,
      message: 'Ya hay una sincronización en progreso para este perfil. Espera un momento.',
    });
  }

  activeSyncRequests.add(requestKey);

  try {
    const syncState = await prisma.playerSyncState.upsert({
      where: {
        puuid_platform: {
          puuid,
          platform,
        },
      },
      create: {
        puuid,
        platform,
        lastMatchStart: 0,
      },
      update: {},
    });

    let start = mode === 'full_backfill' ? 0 : syncState.lastMatchStart;
    let saved = 0;
    let scannedIds = 0;
    let totalPages = 0;
    let keepGoing = true;

    while (keepGoing) {
      const batchSize = 100;
      const ids = await getMatchIdsByPuuid(puuid, platform, batchSize, start);

      totalPages += 1;

      if (!ids.length) break;

      scannedIds += ids.length;

      const existingMatches = await prisma.playerMatchCache.findMany({
        where: {
          puuid,
          platform,
          matchId: { in: ids },
        },
        select: { matchId: true },
      });

      const existingIds = new Set(existingMatches.map((m) => m.matchId));
      const missingIds = ids.filter((id: string) => !existingIds.has(id));

      const chunkSize = 2;

      for (let i = 0; i < missingIds.length; i += chunkSize) {
        const chunk = missingIds.slice(i, i + chunkSize);

        const results = await Promise.allSettled(
          chunk.map((id: string) => getMatchWithRetry(id, platform))
        );

        const rowsToInsert: any[] = [];

        for (let index = 0; index < results.length; index++) {
          const result = results[index];
          const id = chunk[index];

          if (result.status !== 'fulfilled') continue;

          const match = result.value;
          const player = match.info.participants.find((p: any) => p.puuid === puuid);

          if (!player) continue;
          if (match.info.queueId !== 420 && match.info.queueId !== 440) continue;

          rowsToInsert.push({
            puuid,
            platform,
            matchId: id,
            queueId: match.info.queueId,
            gameCreation: BigInt(match.info.gameCreation),
            gameDuration: match.info.gameDuration,
            championName: player.championName,
            kills: player.kills,
            deaths: player.deaths,
            assists: player.assists,
            win: player.win,
            totalMinionsKilled: player.totalMinionsKilled || 0,
            neutralMinionsKilled: player.neutralMinionsKilled || 0,
            totalDamageDealtToChampions: player.totalDamageDealtToChampions || 0,
            totalDamageTaken: player.totalDamageTaken || 0,
            visionScore: player.visionScore || 0,
            timeCCingOthers: player.timeCCingOthers || 0,
            damageDealtToObjectives: player.damageDealtToObjectives || 0,
            turretTakedowns: player.turretTakedowns || 0,
            goldEarned: player.goldEarned || 0,
            individualPosition: player.individualPosition || null,
          });
        }

        if (rowsToInsert.length) {
          await prisma.playerMatchCache.createMany({
            data: rowsToInsert,
            skipDuplicates: true,
          });

          saved += rowsToInsert.length;
        }

        await sleep(2500);
      }

      start += ids.length;

      if (ids.length < batchSize) {
        keepGoing = false;
      }

      if (mode !== 'full_backfill' && saved >= requestedMaxMatches) {
        keepGoing = false;
      }
    }

    await prisma.playerSyncState.update({
      where: {
        puuid_platform: {
          puuid,
          platform,
        },
      },
      data: {
        lastMatchStart: start,
        lastFullSyncAt: new Date(),
      },
    });

    if (mode !== 'full_backfill') {
      await saveRankSnapshots(puuid, platform);
    }

    return res.json({
      success: true,
      mode,
      saved,
      scannedIds,
      totalPages,
      nextStart: start,
      message:
        mode === 'full_backfill'
          ? 'Backfill completo terminado'
          : 'Sincronización incremental terminada',
    });
  } catch (error: any) {
    const status = error?.response?.status || 500;

    return res.status(status).json({
      success: false,
      message:
        status === 429
          ? 'Demasiadas solicitudes a Riot. Espera un momento antes de volver a sincronizar.'
          : 'Error syncing analytics matches',
      detail: error?.response?.data || error?.message || null,
    });
  } finally {
    activeSyncRequests.delete(requestKey);
  }
}

export async function getAnalyticsSummary(req: Request, res: Response) {
  try {
    const puuid = String(req.query.puuid || '').trim();
    const platform = String(req.query.platform || 'la1').trim().toLowerCase();
    const queue = String(req.query.queue || 'all').trim().toLowerCase() as QueueMode;
    const startAt = String(req.query.startAt || '').trim();
    const endAt = String(req.query.endAt || '').trim();
    const seasonKey = String(req.query.seasonKey || '').trim();

    if (!puuid) {
      return res.status(400).json({ message: 'puuid is required' });
    }

    const where: any = {
      puuid,
      platform,
    };

    if (queue === 'solo') where.queueId = queueMap.solo;
    if (queue === 'flex') where.queueId = queueMap.flex;

    if (startAt || endAt) {
      where.gameCreation = {};

      if (startAt) {
        const startMs = new Date(startAt).getTime();
        if (!Number.isNaN(startMs)) {
          where.gameCreation.gte = BigInt(startMs);
        }
      }

      if (endAt) {
        const endMs = new Date(endAt).getTime();
        if (!Number.isNaN(endMs)) {
          where.gameCreation.lte = BigInt(endMs);
        }
      }

      if (!Object.keys(where.gameCreation).length) {
        delete where.gameCreation;
      }
    }

    const rows = await prisma.playerMatchCache.findMany({
      where,
      orderBy: {
        gameCreation: 'asc',
      },
    });

    await saveRankSnapshots(puuid, platform);

    const summoner = await getSummonerByPuuid(puuid, platform).catch(() => null);
    const leagueEntries = summoner?.id
      ? await getLeagueEntriesBySummonerId(summoner.id, platform).catch(() => [])
      : [];

    const normalizedEntries = normalizeLeagueEntries(leagueEntries);

    const officialRecord =
      queue === 'solo'
        ? normalizedEntries.find((e: any) => e.queueType === 'RANKED_SOLO_5x5') || null
        : queue === 'flex'
        ? normalizedEntries.find((e: any) => e.queueType === 'RANKED_FLEX_SR') || null
        : null;

    const dates = rows.map((m) => Number(m.gameCreation));
    const sample = {
      totalMatches: rows.length,
      from: dates.length ? new Date(Math.min(...dates)).toISOString() : null,
      to: dates.length ? new Date(Math.max(...dates)).toISOString() : null,
      seasonKey: seasonKey || null,
    };

    const analytics = rows.length ? buildQueueAnalytics(rows as MatchLike[]) : null;
    const queueAnalytics = {
      solo: buildQueueAnalytics(
        rows.filter((row) => row.queueId === queueMap.solo) as MatchLike[]
      ),
      flex: buildQueueAnalytics(
        rows.filter((row) => row.queueId === queueMap.flex) as MatchLike[]
      ),
    };

    return res.json({
      success: true,
      ranked: {
        rankedAvailable: normalizedEntries.length > 0,
        leagueEntries: normalizedEntries,
      },
      officialRecord,
      cacheCoverage:
        officialRecord && analytics
          ? {
              cachedMatches: analytics.summary.total,
              officialMatches: officialRecord.wins + officialRecord.losses,
              coveragePercent:
                officialRecord.wins + officialRecord.losses > 0
                  ? Math.round(
                      (analytics.summary.total / (officialRecord.wins + officialRecord.losses)) * 100
                    )
                  : 0,
            }
          : null,
      sample,
      analytics,
      queueAnalytics,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error building analytics summary',
      detail: error?.message || null,
    });
  }
}

export async function getLpHistory(req: Request, res: Response) {
  try {
    const puuid = String(req.query.puuid || '').trim();
    const platform = String(req.query.platform || 'la1').trim().toLowerCase();
    const queue = String(req.query.queue || '').trim().toLowerCase();

    if (!puuid) {
      return res.status(400).json({ message: 'puuid is required' });
    }

    if (queue !== 'solo' && queue !== 'flex') {
      return res.status(400).json({ message: 'queue must be "solo" or "flex"' });
    }

    await saveRankSnapshots(puuid, platform);

    const queueType = queue === 'flex' ? 'RANKED_FLEX_SR' : 'RANKED_SOLO_5x5';

    const snapshots = await prisma.playerRankSnapshot.findMany({
      where: {
        puuid,
        platform,
        queueType,
      },
      orderBy: {
        snapshotAt: 'asc',
      },
    });

    const points = snapshots.map((item, index) => {
      const previous = index > 0 ? snapshots[index - 1] : null;

      let lpChange = 0;
      let winsDelta = 0;
      let lossesDelta = 0;
      if (previous) {
        const prevValue = rankToNumber(previous.tier, previous.rank, previous.leaguePoints);
        const currentValue = rankToNumber(item.tier, item.rank, item.leaguePoints);
        lpChange = currentValue - prevValue;
        winsDelta = Math.max(0, item.wins - previous.wins);
        lossesDelta = Math.max(0, item.losses - previous.losses);
      }

      return {
        label: new Date(item.snapshotAt).toLocaleString(),
        snapshotAt: item.snapshotAt,
        tier: item.tier,
        rank: item.rank,
        leaguePoints: item.leaguePoints,
        wins: item.wins,
        losses: item.losses,
        lpChange,
        lpGain: lpChange > 0 ? lpChange : 0,
        lpLoss: lpChange < 0 ? Math.abs(lpChange) : 0,
        winsDelta,
        lossesDelta,
        matchesDelta: winsDelta + lossesDelta,
        rankValue: rankToNumber(item.tier, item.rank, item.leaguePoints),
        queueType: getQueueTypeFromQueueId(queue === 'solo' ? queueMap.solo : queueMap.flex),
      };
    });

    const lpGained = points.reduce((sum, point) => sum + point.lpGain, 0);
    const lpLost = points.reduce((sum, point) => sum + point.lpLoss, 0);
    const winsDetected = points.reduce((sum, point) => sum + point.winsDelta, 0);
    const lossesDetected = points.reduce((sum, point) => sum + point.lossesDelta, 0);

    return res.json({
      success: true,
      queueType,
      totalSnapshots: snapshots.length,
      points,
      totals: {
        lpGained,
        lpLost,
        netLp: lpGained - lpLost,
        winsDetected,
        lossesDetected,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error building LP history',
      detail: error?.message || null,
    });
  }
}
