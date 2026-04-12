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
};

function generateRuleBasedRetrospective(input: RetrospectiveInput) {
  const sections: string[] = [];
  sections.push(`1) Fortalezas:\n- ${input.result} en ${input.queueLabel} con ${input.championName} (${input.role}).`);
  sections.push(`2) Ajustes clave:\n- KDA ${input.kda}, CS/min ${input.csPerMin}, Vision/min ${input.visionPerMin}. Prioriza decisiones de riesgo bajo y mejor timing de objetivos.`);
  sections.push(`3) Build:\n- Revisa si tu build final (${input.itemNames.slice(0, 6).join(', ') || 'N/A'}) tuvo valor completo en late. Si un ítem no impactó, cámbialo por supervivencia o daño sostenido según amenaza rival.`);
  sections.push(`4) Plan próxima partida:\n- Primeros 10 min: farm seguro + visión de río.\n- Min 10-20: jugar por objetivo con prioridad de línea.\n- Late: pelear sólo con visión y cooldowns.`);
  return sections.join('\n\n');
}

export async function generateLocalAiRetrospective(input: RetrospectiveInput) {
  if (env.AI_PROVIDER === 'rules') {
    return generateRuleBasedRetrospective(input);
  }

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
`;

  try {
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
