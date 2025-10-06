// Interfaccia per l'utente
export interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: 'admin' | 'manager' | 'user';
}

// Interfaccia per il contesto di autenticazione
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

// Interfaccia per i task
export interface Task {
  id: string;
  titolo: string;
  descrizione?: string;
  stato: 'da_fare' | 'in_corso' | 'completato';
  priorita: 'bassa' | 'media' | 'alta';
  scadenza?: string;
  assegnato_a?: string;
  creato_da: string;
  team_id?: string;
  createdAt: string;
  updatedAt: string;
}

// Interfaccia per i team
export interface Team {
  id: string;
  nome: string;
  descrizione?: string;
  colore?: string;
}