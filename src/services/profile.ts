import axios from 'axios';
import { api } from './api';

const summaryPath = '/profile/summary';

export async function fetchProfileSummary(params: {
  gameName: string;
  tagLine: string;
  region: string;
}) {
  try {
    const { data } = await api.get(summaryPath, { params });
    return data;
  } catch (error: any) {
    const shouldRetryWithoutApiPrefix =
      error?.response?.status === 404 &&
      typeof window !== 'undefined' &&
      !import.meta.env.DEV;

    if (!shouldRetryWithoutApiPrefix) {
      throw error;
    }

    const fallbackClient = axios.create({
      baseURL: window.location.origin,
    });

    const { data } = await fallbackClient.get(summaryPath, { params });
    return data;
  }
}
