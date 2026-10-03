import { APIClientError } from './client';
import { retryDelay, shouldRetry, withAPIRetry } from './boot';

describe('API boot retry policy', () => {
  it('uses bounded exponential retry delays', () => {
    expect(retryDelay(0)).toBe(500);
    expect(retryDelay(3)).toBe(4_000);
    expect(retryDelay(10)).toBe(4_000);
  });

  it('retries transient errors at most three times', () => {
    expect(shouldRetry(new APIClientError('Unavailable', 503), 0)).toBe(true);
    expect(shouldRetry(new APIClientError('Unavailable', 503), 3)).toBe(false);
    expect(shouldRetry(new APIClientError('Forbidden', 403), 0)).toBe(false);
  });

  it('retries transient API requests and returns the successful response', async () => {
    const request = jest.fn()
      .mockRejectedValueOnce(new APIClientError('Unavailable', 503))
      .mockResolvedValue('ready');
    const wait = jest.fn().mockResolvedValue(undefined);

    await expect(withAPIRetry(request, wait)).resolves.toBe('ready');
    expect(request).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(500);
  });

  it('does not retry non-retryable API errors', async () => {
    const request = jest.fn().mockRejectedValue(new APIClientError('Forbidden', 403));
    const wait = jest.fn().mockResolvedValue(undefined);

    await expect(withAPIRetry(request, wait)).rejects.toThrow('Forbidden');
    expect(request).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });
});