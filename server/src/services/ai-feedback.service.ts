import axios from 'axios';
import { env } from '../config/env';

export async function generateLocalAiRetrospective(input: {
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
}) {
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
    return text || null;
  } catch {
    return null;
  }
}
