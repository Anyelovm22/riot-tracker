import axios from 'axios';
import { env } from '../config/env';

type RetrospectiveInput = {
  championName: string;
  role: string;
  kda: string;
  csPerMin: number;
  visionPerMin: number;
  damage: number;
  damageTaken: number;
  gold: number;
  queueLabel: string;
  result: 'Victoria' | 'Derrota';
  itemNames: string[];
  laneEnemy?: {
    championName: string;
    role: string;
    kda: string;
    csPerMin: number;
    damage: number;
    gold: number;
    itemNames: string[];
  } | null;
};

type NumericComparison = {
  label: string;
  mine: number;
  enemy?: number | null;
};

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;
}

function parseKdaParts(kda: string) {
  const [killsRaw, deathsRaw, assistsRaw] = String(kda || '0/0/0').split('/');
  const kills = Number(killsRaw) || 0;
  const deaths = Number(deathsRaw) || 0;
  const assists = Number(assistsRaw) || 0;
  const ratio = deaths === 0 ? kills + assists : (kills + assists) / deaths;
  return { kills, deaths, assists, ratio: formatNumber(ratio) };
}

function buildComparisons(input: RetrospectiveInput): NumericComparison[] {
  const enemy = input.laneEnemy;

  return [
    { label: 'CS/min', mine: input.csPerMin, enemy: enemy?.csPerMin ?? null },
    { label: 'Daño a campeones', mine: input.damage, enemy: enemy?.damage ?? null },
    { label: 'Oro', mine: input.gold, enemy: enemy?.gold ?? null },
  ];
}

function buildMetricVerdict(metric: NumericComparison) {
  if (metric.enemy == null) return null;

  const delta = formatNumber(metric.mine - metric.enemy, 1);
  if (delta === 0) {
    return `${metric.label}: paridad (${metric.mine} vs ${metric.enemy}).`;
  }

  return `${metric.label}: ${delta > 0 ? 'ventaja' : 'desventaja'} ${Math.abs(delta)} (${metric.mine} vs ${metric.enemy}).`;
}

function generateRuleBasedRetrospective(input: RetrospectiveInput) {
  const kda = parseKdaParts(input.kda);
  const enemyKda = input.laneEnemy ? parseKdaParts(input.laneEnemy.kda) : null;
  const comparisons = buildComparisons(input).map(buildMetricVerdict).filter(Boolean) as string[];

  const strengths: string[] = [];
  const improvements: string[] = [];
  const nextGamePlan: string[] = [];

  if (kda.ratio >= 3) {
    strengths.push(`KDA eficiente (${kda.ratio}) con ${kda.kills}/${kda.deaths}/${kda.assists}.`);
  } else {
    improvements.push(`KDA (${kda.ratio}) bajo el objetivo operativo (3.0). Reduce entradas sin prioridad de visión.`);
  }

  if (input.csPerMin >= 7) {
    strengths.push(`Economía estable (${input.csPerMin} CS/min).`);
  } else {
    improvements.push(`CS/min (${input.csPerMin}) por debajo del ritmo recomendado. Asegura oleadas antes de rotar.`);
  }

  if (input.visionPerMin >= 1.1) {
    strengths.push(`Control de visión correcto (${input.visionPerMin}/min).`);
  } else {
    improvements.push(`Visión/min (${input.visionPerMin}) baja. Compra wards de control en cada reset con objetivo cercano.`);
  }

  if (enemyKda && input.laneEnemy) {
    const ratioDelta = formatNumber(kda.ratio - enemyKda.ratio);
    if (ratioDelta >= 0.5) {
      strengths.push(`Superaste a ${input.laneEnemy.championName} en KDA (${kda.ratio} vs ${enemyKda.ratio}).`);
    } else if (ratioDelta <= -0.5) {
      improvements.push(`El rival ${input.laneEnemy.championName} te superó en KDA (${enemyKda.ratio} vs ${kda.ratio}).`);
    }
  }

  if (input.damageTaken > 0 && input.damage / input.damageTaken < 0.9) {
    improvements.push(
      `Relación daño infligido/recibido desfavorable (${input.damage}/${input.damageTaken}). Ajusta ángulos de entrada y timing de cooldowns.`
    );
  }

  nextGamePlan.push(...comparisons.slice(0, 3));

  const ownBuild = input.itemNames.slice(0, 6).filter(Boolean);
  const enemyBuild = input.laneEnemy?.itemNames?.slice(0, 6).filter(Boolean) || [];

  return [
    `1) Contexto\n- ${input.result} en ${input.queueLabel} con ${input.championName} (${input.role}).`,
    `2) Fortalezas\n- ${(strengths.length ? strengths : ['No hubo métricas por encima del baseline en esta partida.']).join('\n- ')}`,
    `3) Ajustes prioritarios\n- ${(improvements.length ? improvements : ['Sin déficits críticos detectados; mantén consistencia y revisa microerrores en repetición.']).join('\n- ')}`,
    `4) Build\n- Propia: ${ownBuild.join(', ') || 'Sin datos suficientes.'}.\n- Rival de línea: ${enemyBuild.join(', ') || 'Sin datos suficientes.'}.`,
    `5) Plan para la próxima\n- ${(nextGamePlan.length ? nextGamePlan : ['Sin comparación directa suficiente contra rival de línea.']).join('\n- ')}`,
  ].join('\n\n');
}

export async function generateLocalAiRetrospective(input: RetrospectiveInput) {
  const prompt = `
Eres analista competitivo de League of Legends.
Responde en español, formato accionable y concreto.
Reglas obligatorias:
- No uses texto genérico.
- Cada recomendación debe citar al menos una métrica del input.
- Si falta información, dilo claramente; no inventes datos.
- Prioriza recomendaciones con impacto inmediato.

Estructura exacta:
1) Fortalezas (máximo 3 bullets)
2) Errores prioritarios (máximo 3 bullets)
3) Ajustes de build basados en datos observados
4) Plan early/mid/late (1 bullet por fase)

Datos:
- Resultado: ${input.result}
- Cola: ${input.queueLabel}
- Campeón: ${input.championName}
- Rol: ${input.role}
- KDA: ${input.kda}
- CS/min: ${input.csPerMin}
- Vision/min: ${input.visionPerMin}
- Daño: ${input.damage}
- Daño recibido: ${input.damageTaken}
- Oro: ${input.gold}
- Build final: ${input.itemNames.filter(Boolean).join(', ') || 'N/A'}
- Rival de línea: ${input.laneEnemy?.championName || 'N/A'} (${input.laneEnemy?.role || 'N/A'})
- KDA rival de línea: ${input.laneEnemy?.kda || 'N/A'}
- CS/min rival de línea: ${input.laneEnemy?.csPerMin ?? 'N/A'}
- Daño rival de línea: ${input.laneEnemy?.damage ?? 'N/A'}
- Oro rival de línea: ${input.laneEnemy?.gold ?? 'N/A'}
- Build rival de línea: ${input.laneEnemy?.itemNames?.filter(Boolean).join(', ') || 'N/A'}
`;

  try {
    if (env.AI_PROVIDER === 'rules') {
      return generateRuleBasedRetrospective(input);
    }

    if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        if (text) return text;
      }
    }

    if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Eres analista de rendimiento competitivo de League of Legends.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 600,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = String(data?.choices?.[0]?.message?.content || '').trim();
        if (text) return text;
      }
    }

    const { data } = await axios.post(
      `${env.OLLAMA_URL.replace(/\/$/, '')}/api/generate`,
      {
        model: env.OLLAMA_MODEL,
        prompt,
        stream: false,
      },
      { timeout: 15000 }
    );

    const text = String(data?.response || '').trim();
    return text || generateRuleBasedRetrospective(input);
  } catch {
    return generateRuleBasedRetrospective(input);
  }
}
