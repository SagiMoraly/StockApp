import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, ThemeColors, ThemeName, ThemePreference } from './theme';

const THEME_PREFERENCE_STORAGE_KEY = 'stockup.theme.preference';

type ThemeContextValue = {
  colors: ThemeColors;
  themeName: ThemeName;
  themePreference: ThemePreference;
  setThemePreference: (nextPreference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let active = true;

    const loadPreference = async () => {
      try {
        const storedPreference = await AsyncStorage.getItem(THEME_PREFERENCE_STORAGE_KEY);

        if (!active || !isThemePreference(storedPreference)) {
          return;
        }

        setThemePreferenceState(storedPreference);
      } catch {
      }
    };

    void loadPreference();

    return () => {
      active = false;
    };
  }, []);

  const setThemePreference = useCallback((nextPreference: ThemePreference) => {
    setThemePreferenceState(nextPreference);
    void AsyncStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, nextPreference);
  }, []);

  const themeName: ThemeName =
    themePreference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themePreference;

  const colors = themeName === 'dark' ? darkColors : lightColors;

  const value = useMemo(
    () => ({ colors, themeName, themePreference, setThemePreference }),
    [colors, themeName, themePreference, setThemePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};
