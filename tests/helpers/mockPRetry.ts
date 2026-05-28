export class AbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AbortError';
  }
}

export default async function pRetry<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}
