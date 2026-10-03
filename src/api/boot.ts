import { APIClientError } from './client';

export type APIBootState =
  | { status: 'idle' }
  | { status: 'loading'; attempt: number }
  | { status: 'ready' }
  | { status: 'error'; error: APIClientError };

export const retryDelay = (attempt: number) => Math.min(500 * 2 ** attempt, 4_000);

export const shouldRetry = (error: APIClientError, attempt: number) => error.retryable && attempt < 3;

export const withAPIRetry = async <Result>(
  request: () => Promise<Result>,
  wait: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<Result> => {
  let attempt = 0;

  while (true) {
    try {
      return await request();
    } catch (error) {
      if (!(error instanceof APIClientError) || !shouldRetry(error, attempt)) {
        throw error;
      }

      await wait(retryDelay(attempt));
      attempt += 1;
    }
  }
};