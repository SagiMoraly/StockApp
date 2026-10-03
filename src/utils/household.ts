export const parseHouseholdInviteToken = (value: string) => {
  const trimmedValue = value.trim();
  const tokenMatch = trimmedValue.match(/[?&]token=([^&]+)/);
  const token = tokenMatch?.[1] ?? trimmedValue;

  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
};

export const parseIncomingAppLink = (url: string) => {
  const tokenMatch = url.match(/[?&]token=([^&#]+)/);
  if (!tokenMatch) {
    return null;
  }

  const token = parseHouseholdInviteToken(url);
  if (!token) {
    return null;
  }

  if (/\/households\/join(?:[/?#]|$)/i.test(url)) {
    return { type: 'household-invite' as const, token };
  }
  if (/\/shares\/accept(?:[/?#]|$)/i.test(url)) {
    return { type: 'copy-share' as const, token };
  }
  return null;
};

export const createHouseholdInviteURL = (token: string, baseURL = 'https://stockapp.app') =>
  `${baseURL.replace(/\/$/, '')}/households/join?token=${encodeURIComponent(token)}`;