import axios from 'axios';
import https from 'https';

const liveClient = axios.create({
  baseURL: 'https://127.0.0.1:2999/liveclientdata',
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
  timeout: 5000,
});

export async function getLiveClientAllGameData() {
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