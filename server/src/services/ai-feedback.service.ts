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

function generateRuleBasedRetrospective(input: RetrospectiveInput) {
  const sections: string[] = [];
  sections.push(`1) Fortalezas:\n- ${input.result} en ${input.queueLabel} con ${input.championName} (${input.role}).`);
  sections.push(`2) Ajustes clave:\n- KDA ${input.kda}, CS/min ${input.csPerMin}, Vision/min ${input.visionPerMin}, daño ${input.damage}, oro ${input.gold}. Prioriza decisiones de riesgo bajo y mejor timing de objetivos.`);

  if (input.laneEnemy) {
    sections.push(
      `3) Matchup de línea:\n- Rival ${input.laneEnemy.championName} (${input.laneEnemy.role}) con KDA ${input.laneEnemy.kda}, CS/min ${input.laneEnemy.csPerMin}, daño ${input.laneEnemy.damage}, oro ${input.laneEnemy.gold}.\n- Items rival: ${input.laneEnemy.itemNames.slice(0, 6).join(', ') || 'N/A'}.`
    );
  }

  sections.push(`4) Build:\n- Tu build final: ${input.itemNames.slice(0, 6).join(', ') || 'N/A'}.\n- Si un ítem no impactó, véndelo por una opción situacional que responda a los items del rival de línea.`);
  sections.push(`5) Plan próxima partida:\n- Primeros 10 min: farm seguro + visión de río.\n- Min 10-20: jugar por objetivo con prioridad de línea.\n- Late: pelear sólo con visión y cooldowns.`);
  return sections.join('\n\n');
}

export async function generateLocalAiRetrospective(input: RetrospectiveInput) {
  const prompt = `
Eres coach de League of Legends.
Responde en español, formato breve y profesional.
Da: 1) Qué hiciste bien, 2) Qué mejorar, 3) Cambios de build (incluye si conviene vender algún item), 4) Plan para próxima partida.

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
            generationConfig: { temperature: 0.6, maxOutputTokens: 600 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = String(
          data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        ).trim();
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
            { role: 'system', content: 'Eres coach experto de League of Legends.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.6,
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
