import axios from 'axios';
import https from 'https';
import { env } from '../config/env';

const liveClient = axios.create({
  baseURL: env.LIVE_CLIENT_BASE_URL,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  timeout: 5000,
});

export async function getLiveClientAllGameData() {
  if (!env.LIVE_CLIENT_ENABLED) {
    const error = new Error('Live Client disabled by configuration');
    (error as any).code = 'LIVE_CLIENT_DISABLED';
    throw error;
  }
  const { data } = await liveClient.get('/allgamedata');
  return data;
}

export async function getLiveClientPlayerList() {
  const { data } = await liveClient.get('/playerlist');
  return data;
}

export async function getLiveClientActivePlayer() {
  const { data } = await liveClient.get('/activeplayer');
  return data;
}

export async function getLiveClientGameStats() {
  const { data } = await liveClient.get('/gamestats');
  return data;
}