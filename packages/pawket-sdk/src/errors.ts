export class PawketError extends Error {
  constructor(
    message: string,
    public code = 'PAWKET_ERROR',
  ) {
    super(message);
  }
}
export class NotConfiguredError extends PawketError {
  constructor(feature: string) {
    super(`${feature} is not configured yet.`, 'NOT_CONFIGURED');
  }
}
