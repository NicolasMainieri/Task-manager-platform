// API Configuration - Produzione su Render
// Usa lo stesso dominio del backend Render
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://task-manager-platform.onrender.com';

console.log('🔧 API Config:', {
  API_BASE_URL,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD,
  VITE_API_URL: import.meta.env.VITE_API_URL
});

export const API_URL = `${API_BASE_URL}/api`;

export default API_URL;
