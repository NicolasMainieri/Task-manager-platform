import axios from 'axios';

// Configurazione API - usa Render in produzione, localhost in sviluppo
const getApiUrl = () => {
  // Se siamo in produzione (Render/Vercel), usa il backend su Render
  if (import.meta.env.PROD) {
    return 'https://task-manager-platform.onrender.com/api';
  }
  // Altrimenti usa la variabile d'ambiente o localhost
  return import.meta.env.VITE_API_URL?.replace(/\/$/, '') + '/api' || 'http://localhost:4000/api';
};

const API_URL = getApiUrl();

console.log('🔧 API Configuration:', {
  API_URL,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD
});

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Esporta anche l'URL base per uso diretto
export const API_BASE_URL = API_URL.replace('/api', '');

// Interceptor per aggiungere il token a ogni richiesta
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor per gestire errori 401 (non autenticato)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;