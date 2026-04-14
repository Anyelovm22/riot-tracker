import axios from 'axios';

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL;

  if (configured && configured.trim()) {
    return normalizeBaseUrl(configured.trim());
  }

  if (typeof window === 'undefined') {
    return '/api';
  }

  const { hostname, origin } = window.location;

  if (hostname.endsWith('.onrender.com')) {
    const serviceName = hostname.replace('.onrender.com', '');
    const normalizedServiceName = serviceName.replace(/-\d+$/, '');
    return `https://${normalizedServiceName}.onrender.com/api`;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return '/api';
  }

  return `${origin}/api`;
}

const apiBaseUrl = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: apiBaseUrl,
});
