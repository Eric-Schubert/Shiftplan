export function createValidationError(message: string) {
  return createError({
    statusCode: 400,
    statusMessage: message,
  });
}
