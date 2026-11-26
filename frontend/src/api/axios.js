import axios from 'axios';

function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_URL || '').trim();
  if (!raw || raw === '/api' || raw === '/api/') {
    return '/api';
  }
  let url = raw.replace(/\/+$/, '');
  // On Windows, localhost often resolves to IPv6 (::1) which connection-refuses when backend binds IPv4 127.0.0.1
  url = url.replace('http://localhost:8002', 'http://127.0.0.1:8002');
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    url = `https://${url}`;
  }
  return url.endsWith('/api') ? url : `${url}/api`;
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
