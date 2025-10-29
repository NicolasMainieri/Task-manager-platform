// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

console.log('🔧 API Config:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD
});

export const API_URL = `${API_BASE_URL}/api`;

export default API_URL;
