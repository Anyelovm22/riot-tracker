import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT || 1000),
  RIOT_API_KEY: requireEnv('RIOT_API_KEY'),
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  AI_PROVIDER: process.env.AI_PROVIDER || 'rules',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3.2:3b',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  LIVE_CLIENT_ENABLED: process.env.LIVE_CLIENT_ENABLED === 'true',
  LIVE_CLIENT_BASE_URL:
    process.env.LIVE_CLIENT_BASE_URL || 'https://127.0.0.1:2999/liveclientdata',
};
