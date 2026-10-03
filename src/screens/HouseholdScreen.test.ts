import { APIClient } from '../api/client';
import { createHouseholdInviteURL, parseHouseholdInviteToken, parseIncomingAppLink } from '../utils/household';

const response = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe('HouseholdScreen boundaries', () => {
  it.each([
    ['raw invite token', 'invite-token', 'invite-token'],
    ['invite URL', 'https://stockup.app/households/join?token=invite-token', 'invite-token'],
    ['encoded invite token', 'https://stockup.app/households/join?token=invite%2Dtoken', 'invite-token'],
    ['blank input', '  ', ''],
  ])('parses %s', (_caseName, value, expected) => {
    expect(parseHouseholdInviteToken(value)).toBe(expected);
  });

  it('routes household invite and copy-share app links by path', () => {
    expect(parseIncomingAppLink('https://stockapp.app/households/join?token=invite-token')).toEqual({
      type: 'household-invite',
      token: 'invite-token',
    });
    expect(parseIncomingAppLink('https://stockapp.app/shares/accept?token=share-token')).toEqual({
      type: 'copy-share',
      token: 'share-token',
    });
    expect(parseIncomingAppLink('https://stockapp.app/unknown?token=other-token')).toBeNull();
  });

  it('creates a household invite link for the configured host', () => {
    expect(createHouseholdInviteURL('invite token', 'https://links.stockapp.app/')).toBe(
      'https://links.stockapp.app/households/join?token=invite%20token',
    );
  });

  it('gets household status with the bearer token', async () => {
    const status = { household: null };
    const fetchImplementation = jest.fn().mockResolvedValue(response(200, status)) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.getHouseholdStatus('session-token')).resolves.toEqual(status);
    expect(fetchImplementation).toHaveBeenCalledWith('https://api.stockapp.test/v1/households/status', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer session-token',
      },
      signal: undefined,
    });
  });

  it('gets the startup sync revision with the bearer token', async () => {
    const status = { scopeId: 'scope-1', revision: '2026-09-29T12:00:00Z' };
    const fetchImplementation = jest.fn().mockResolvedValue(response(200, status)) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.getSyncStatus('session-token')).resolves.toEqual(status);
    expect(fetchImplementation).toHaveBeenCalledWith('https://api.stockapp.test/v1/sync/status', expect.objectContaining({ method: 'GET' }));
  });

  it('applies to a household with an invite token', async () => {
    const status = {
      household: {
        id: 'household-1',
        name: 'Ada Household',
        members: [{ id: 'user-1', displayName: 'Ada' }],
      },
    };
    const fetchImplementation = jest.fn().mockResolvedValue(response(200, status)) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.applyToHousehold('session-token', 'invite-token')).resolves.toEqual(status);
    expect(fetchImplementation).toHaveBeenCalledWith('https://api.stockapp.test/v1/households/applications', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer session-token',
      },
      body: JSON.stringify({ token: 'invite-token' }),
      signal: undefined,
    });
  });

  it('keeps invite conflicts typed for the screen to display', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      response(409, { code: 'conflict', message: 'This household invite is no longer valid.' }),
    ) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.applyToHousehold('session-token', 'expired-token')).rejects.toMatchObject({
      status: 409,
      retryable: false,
      problem: { code: 'conflict', message: 'This household invite is no longer valid.' },
    });
  });

  it('creates a household and returns its in-app invite token', async () => {
    const result = { householdId: 'household-1', name: 'Ada Household', inviteToken: 'invite-token' };
    const fetchImplementation = jest.fn().mockResolvedValue(response(200, result)) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.createHousehold('session-token', 'Ada Household')).resolves.toEqual(result);
    expect(fetchImplementation).toHaveBeenCalledWith('https://api.stockapp.test/v1/households', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer session-token',
      },
      body: JSON.stringify({ name: 'Ada Household' }),
      signal: undefined,
    });
  });

  it('accepts an application with the discard-data choice', async () => {
    const status = { household: { id: 'household-1', name: 'Ada Household', members: [] }, applications: [] };
    const fetchImplementation = jest.fn().mockResolvedValue(response(200, status)) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.acceptHouseholdApplication('session-token', 'application-1', false)).resolves.toEqual(status);
    expect(fetchImplementation).toHaveBeenCalledWith('https://api.stockapp.test/v1/households/applications/application-1/accept', expect.objectContaining({
      body: JSON.stringify({ moveExistingData: false }),
    }));
  });

  it('sends the household leave command', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(response(204, null)) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await client.leaveHousehold('session-token');

    expect(fetchImplementation).toHaveBeenCalledWith('https://api.stockapp.test/v1/households/leave', expect.objectContaining({ method: 'POST' }));
  });
});
