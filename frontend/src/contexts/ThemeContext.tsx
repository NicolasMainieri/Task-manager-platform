import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    gradient: string;
    bgDark: string;
    bgMedium: string;
    bgLight: string;
  };
  icon: string;
}

export const themes: Record<string, Theme> = {
  purple: {
    id: 'purple',
    name: 'Purple Dream',
    description: 'Il tema predefinito di Planora. Elegante e moderno.',
    colors: {
      primary: '#9333ea',
      primaryLight: '#c084fc',
      primaryDark: '#7e22ce',
      accent: '#a855f7',
      gradient: 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)',
      bgDark: '#1e1b4b',
      bgMedium: '#312e81',
      bgLight: '#4c1d95',
    },
    icon: '💜',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Fresco e calmo. Ideale per sessioni concentrate.',
    colors: {
      primary: '#0891b2',
      primaryLight: '#06b6d4',
      primaryDark: '#0e7490',
      accent: '#14b8a6',
      gradient: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
      bgDark: '#164e63',
      bgMedium: '#155e75',
      bgLight: '#0e7490',
    },
    icon: '🌊',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    description: 'Caldo ed energizzante per team creativi.',
    colors: {
      primary: '#f97316',
      primaryLight: '#fb923c',
      primaryDark: '#ea580c',
      accent: '#f472b6',
      gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
      bgDark: '#7c2d12',
      bgMedium: '#9a3412',
      bgLight: '#c2410c',
    },
    icon: '🌅',
  },
  forest: {
    id: 'forest',
    name: 'Forest Green',
    description: 'Naturale e rilassante per ridurre affaticamento.',
    colors: {
      primary: '#059669',
      primaryLight: '#10b981',
      primaryDark: '#047857',
      accent: '#84cc16',
      gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      bgDark: '#064e3b',
      bgMedium: '#065f46',
      bgLight: '#047857',
    },
    icon: '🌲',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Scuro e professionale per lavorare di notte.',
    colors: {
      primary: '#4f46e5',
      primaryLight: '#6366f1',
      primaryDark: '#4338ca',
      accent: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
      bgDark: '#1e1b4b',
      bgMedium: '#312e81',
      bgLight: '#3730a3',
    },
    icon: '🌙',
  },
  cherry: {
    id: 'cherry',
    name: 'Cherry Red',
    description: 'Audace ed energico per uno stile vivace.',
    colors: {
      primary: '#e11d48',
      primaryLight: '#f43f5e',
      primaryDark: '#be123c',
      accent: '#ec4899',
      gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
      bgDark: '#881337',
      bgMedium: '#9f1239',
      bgLight: '#be123c',
    },
    icon: '🍒',
  },
};

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  themeId: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<string>('purple');

  // Carica tema salvato al mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme && themes[savedTheme]) {
      setThemeId(savedTheme);
    }
  }, []);

  // Applica le variabili CSS quando il tema cambia
  useEffect(() => {
    const theme = themes[themeId];
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', theme.colors.primary);
      root.style.setProperty('--color-primary-light', theme.colors.primaryLight);
      root.style.setProperty('--color-primary-dark', theme.colors.primaryDark);
      root.style.setProperty('--color-accent', theme.colors.accent);
      root.style.setProperty('--gradient-primary', theme.colors.gradient);
      root.style.setProperty('--bg-dark', theme.colors.bgDark);
      root.style.setProperty('--bg-medium', theme.colors.bgMedium);
      root.style.setProperty('--bg-light', theme.colors.bgLight);
    }
  }, [themeId]);

  const setTheme = (newThemeId: string) => {
    if (themes[newThemeId]) {
      setThemeId(newThemeId);
      localStorage.setItem('selectedTheme', newThemeId);
    }
  };

  const currentTheme = themes[themeId] || themes.purple;

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themeId }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
