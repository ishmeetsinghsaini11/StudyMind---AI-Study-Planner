import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,  // 30s timeout for AI calls
  headers: { 'Content-Type': 'application/json' }
});

// Log every request (helpful for debugging)
api.interceptors.request.use(config => {
  console.log('[API Request]', config.method.toUpperCase(), config.url);
  return config;
});

// Log every response/error
api.interceptors.response.use(
  response => {
    console.log('[API Response]', response.status, response.config.url);
    return response;
  },
  error => {
    console.error('[API Error]', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
