import api from './api';

interface User {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  roleId: string;
  teamId?: string;
  role: {
    id: string;
    nome: string;
    permessi: Record<string, boolean>;
  };
  team?: {
    id: string;
    nome: string;
  };
}

interface LoginResponse {
  token: string;
  user: User;
}

interface RegisterData {
  email: string;
  password: string;
  nome: string;
  cognome: string;
  roleId: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', { email, password });
    return response.data;
  },

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/register', data);
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export type { User };