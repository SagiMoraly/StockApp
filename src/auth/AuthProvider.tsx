import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'stockup.google.access-token';
const TOKEN_EXPIRY_KEY = 'stockup.google.token-expiry';

export type AuthMode = 'loading' | 'login' | 'offline' | 'google';

type AuthContextValue = {
  mode: AuthMode;
  accessToken: string | null;
  signInWithGoogle: () => void;
  continueOffline: () => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const extra = Constants.expoConfig?.extra as {
  googleWebClientId?: string;
  googleAndroidClientId?: string;
  googleIosClientId?: string;
} | undefined;
const clientId = extra?.googleWebClientId;

const readSecureValue = (key: string) =>
  Promise.race([
    SecureStore.getItemAsync(key),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
  ]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>('loading');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: clientId,
    androidClientId: Platform.OS === 'android' ? extra?.googleAndroidClientId : undefined,
    scopes: ['https://www.googleapis.com/auth/drive.appdata'],
  }, {
    native: 'com.stockup.mobile:/oauthredirect',
  });

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await readSecureValue(TOKEN_KEY);
        const expiry = Number(await readSecureValue(TOKEN_EXPIRY_KEY) ?? 0);

        if (token && expiry > Date.now()) {
          setAccessToken(token);
          setMode('google');
          return;
        }
      } catch {
      }

      setMode('login');
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    const saveResponse = async () => {
      if (response?.type !== 'success' || !response.authentication?.accessToken) {
        return;
      }

      const token = response.authentication.accessToken;
      const expiresIn = response.authentication.expiresIn ?? 3600;
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
      setAccessToken(token);
      setMode('google');
    };

    void saveResponse();
  }, [response]);

  const value = useMemo<AuthContextValue>(() => ({
    mode,
    accessToken,
    signInWithGoogle: () => {
      if (Platform.OS !== 'android') {
        Alert.alert('Google login is unavailable', 'Google login is currently supported on Android only.');
        return;
      }

      if (!extra?.googleAndroidClientId || !request) {
        Alert.alert('Google login is unavailable', 'The Android Google OAuth client is not configured.');
        return;
      }

      void promptAsync();
    },
    continueOffline: () => setMode('offline'),
    logout: async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      setAccessToken(null);
      setMode('offline');
    },
  }), [accessToken, mode, promptAsync, request]);

  useEffect(() => {
    if (response?.type === 'error') {
      Alert.alert('Google login failed', response.params?.error_description ?? response.params?.error ?? 'Google returned an unknown OAuth error.');
    }
  }, [response]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
