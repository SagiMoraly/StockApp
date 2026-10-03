import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';

import { APIClient, APIClientError } from '../api/client';
import { withAPIRetry } from '../api/boot';
import { isAPIConfigured } from '../api/config';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'stockapp.api.access-token';
const TOKEN_EXPIRY_KEY = 'stockapp.api.token-expiry';

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
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: clientId,
    androidClientId: Platform.OS === 'android' ? extra?.googleAndroidClientId : undefined,
    iosClientId: extra?.googleIosClientId,
  }, {
    native: 'com.stockapp.mobile:/oauthredirect',
  });

  useEffect(() => {
    const restoreSession = async () => {
      let clearSavedSession = false;
      try {
        const token = await readSecureValue(TOKEN_KEY);
        const expiry = Number(await readSecureValue(TOKEN_EXPIRY_KEY) ?? 0);

        if (token) {
          if (expiry <= Date.now()) {
            clearSavedSession = true;
          } else {
            try {
              await withAPIRetry(() => new APIClient().getMe(token));
              setAccessToken(token);
              setTokenExpiry(expiry);
              setMode('google');
              return;
            } catch (error) {
              if (error instanceof APIClientError && error.status === 401) {
                clearSavedSession = true;
              } else {
                throw error;
              }
            }
          }
        }
      } catch {
      }

      if (clearSavedSession) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      }
      setMode('login');
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    const saveResponse = async () => {
      if (response?.type !== 'success') {
        return;
      }

      const idToken = response.params?.id_token;
      if (!idToken) {
        Alert.alert('Google login failed', 'Google did not return an identity token.');
        return;
      }
      if (!isAPIConfigured()) {
        Alert.alert('Google login is unavailable', 'Set EXPO_PUBLIC_API_URL before signing in.');
        return;
      }

      try {
        const session = await withAPIRetry(() => new APIClient().signInWithGoogle(idToken));
        const expiresAt = Date.parse(session.expiresAt) || Date.now() + 12 * 60 * 60 * 1000;
        await SecureStore.setItemAsync(TOKEN_KEY, session.accessToken);
        await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(expiresAt));
        setAccessToken(session.accessToken);
        setTokenExpiry(expiresAt);
        setMode('google');
      } catch (error) {
        Alert.alert('Google login failed', error instanceof Error ? error.message : 'The API rejected the Google sign-in.');
      }
    };

    void saveResponse();
  }, [response]);

  useEffect(() => {
    if (mode !== 'google' || tokenExpiry === null) {
      return;
    }

    const expireSession = async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      setAccessToken(null);
      setTokenExpiry(null);
      setMode('login');
      Alert.alert('Session expired', 'Sign in again to continue syncing your data.');
    };
    const remaining = tokenExpiry - Date.now();

    if (remaining <= 0) {
      void expireSession();
      return;
    }

    const timeout = setTimeout(() => void expireSession(), remaining);
    return () => clearTimeout(timeout);
  }, [mode, tokenExpiry]);

  const value = useMemo<AuthContextValue>(() => ({
    mode,
    accessToken,
    signInWithGoogle: () => {
      const configuredClientId = Platform.select({
        android: extra?.googleAndroidClientId,
        ios: extra?.googleIosClientId,
        web: extra?.googleWebClientId,
        default: undefined,
      });

      if (!configuredClientId || !request) {
        Alert.alert('Google login is unavailable', 'Configure a Google OAuth client for this platform.');
        return;
      }

      void promptAsync();
    },
    continueOffline: () => setMode('offline'),
    logout: async () => {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      setAccessToken(null);
      setTokenExpiry(null);
      setMode('login');
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
