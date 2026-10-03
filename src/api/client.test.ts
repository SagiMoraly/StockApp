import { APIClient, APIClientError } from './client';

const response = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe('APIClient', () => {
  it('exchanges a Google identity token without a bearer token', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      response(200, {
        accessToken: 'api-token',
        expiresAt: '2026-07-31T12:00:00Z',
        account: {
          profile: { id: 'user-1', displayName: 'Ada' },
          scope: { id: 'user-1', type: 'personal' },
          household: null,
        },
      }),
    ) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.signInWithGoogle('google-id-token')).resolves.toMatchObject({
      accessToken: 'api-token',
    });

    expect(fetchImplementation).toHaveBeenCalledWith('https://api.stockapp.test/v1/auth/google', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken: 'google-id-token' }),
      signal: undefined,
    });
  });

  it('sends controller commands with the bearer token and JSON body', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      response(200, {
        id: 'category-1',
        name: 'Produce',
        version: 1,
        createdAt: '2026-07-31T00:00:00Z',
        updatedAt: '2026-07-31T00:00:00Z',
      }),
    ) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.createCategory('session-token', { name: 'Produce' })).resolves.toMatchObject({
      id: 'category-1',
      name: 'Produce',
    });

    expect(fetchImplementation).toHaveBeenCalledWith('https://api.stockapp.test/v1/categories', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer session-token',
      },
      body: JSON.stringify({ name: 'Produce' }),
      signal: undefined,
    });
  });

  it('creates, previews, and accepts copy-share links', async () => {
    const fetchImplementation = jest.fn()
      .mockResolvedValueOnce(response(200, { url: 'https://stockapp.app/shares/accept?token=opaque', expiresAt: '2026-10-02T00:00:00Z' }))
      .mockResolvedValueOnce(response(200, { resourceType: 'recipe', title: 'Soup', expired: false }))
      .mockResolvedValueOnce(response(200, { resourceType: 'recipe', id: 'copied-recipe' })) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.createShare('session-token', 'recipe', 'recipe-1')).resolves.toMatchObject({
      url: 'https://stockapp.app/shares/accept?token=opaque',
    });
    await expect(client.previewShare('session-token', 'opaque')).resolves.toMatchObject({ title: 'Soup' });
    await expect(client.acceptShare('session-token', 'opaque')).resolves.toMatchObject({ id: 'copied-recipe' });

    expect(fetchImplementation).toHaveBeenNthCalledWith(1, 'https://api.stockapp.test/v1/shares', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ resourceType: 'recipe', resourceId: 'recipe-1' }),
    }));
    expect(fetchImplementation).toHaveBeenNthCalledWith(2, 'https://api.stockapp.test/v1/shares/preview', expect.objectContaining({
      body: JSON.stringify({ token: 'opaque' }),
    }));
    expect(fetchImplementation).toHaveBeenNthCalledWith(3, 'https://api.stockapp.test/v1/shares/accept', expect.objectContaining({
      body: JSON.stringify({ token: 'opaque' }),
    }));
  });

  it('maps server problems into typed, non-retryable client errors', async () => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      response(409, {
        code: 'conflict',
        message: 'The category has changed.',
      }),
    ) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.renameCategory('session-token', 'category-1', { name: 'Bakery', version: 1 })).rejects.toMatchObject({
      name: 'APIClientError',
      status: 409,
      retryable: false,
      problem: { code: 'conflict', message: 'The category has changed.' },
    } satisfies Partial<APIClientError>);
  });

  it.each([
    ['category version conflicts', 'The category has changed.'],
    ['duplicate category names', 'A category with that name already exists.'],
    ['pantry item version conflicts', 'The item has changed.'],
    ['duplicate pantry items', 'An item with that name already exists.'],
    ['grocery list version conflicts', 'The grocery list has changed.'],
    ['duplicate grocery list items', 'That item is already on the list.'],
    ['recipe version conflicts', 'The recipe has changed.'],
    ['duplicate recipe ingredients', 'That item is already an ingredient.'],
  ])('preserves %s as a non-retryable conflict', async (_caseName, message) => {
    const fetchImplementation = jest.fn().mockResolvedValue(
      response(409, { code: 'conflict', message }),
    ) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.getMe('session-token')).rejects.toMatchObject({
      name: 'APIClientError',
      status: 409,
      retryable: false,
      problem: { code: 'conflict', message },
    } satisfies Partial<APIClientError>);
  });

  it.each([
    [409, false],
    [429, true],
    [500, true],
    [503, true],
  ])('classifies HTTP status %s as retryable=%s', async (status, retryable) => {
    const fetchImplementation = jest.fn().mockResolvedValue(response(status, { message: 'Request failed.' })) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.getMe('session-token')).rejects.toMatchObject({ status, retryable });
  });

  it('marks network errors as retryable', async () => {
    const fetchImplementation = jest.fn().mockRejectedValue(new Error('Network request failed')) as unknown as typeof fetch;
    const client = new APIClient('https://api.stockapp.test', fetchImplementation);

    await expect(client.getMe('session-token')).rejects.toMatchObject({
      name: 'APIClientError',
      status: 0,
      retryable: true,
    } satisfies Partial<APIClientError>);
  });
});