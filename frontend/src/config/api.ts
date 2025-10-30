// API Configuration - Produzione
const API_BASE_URL = 'https://task-manager-platform.onrender.com';

console.log('🔧 API Config:', {
  API_BASE_URL,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD
});

export const API_URL = `${API_BASE_URL}/api`;

export default API_URL;
