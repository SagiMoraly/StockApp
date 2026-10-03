const configuredAPIURL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

export const apiConfig = {
  baseURL: configuredAPIURL ?? '',
};

export const isAPIConfigured = () => apiConfig.baseURL.length > 0;