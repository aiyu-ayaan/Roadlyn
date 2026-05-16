/**
 * Common response utilities
 */

export function createSuccessResponse<T>(data: T) {
  return {
    success: true,
    data,
  };
}

export function createErrorResponse(message: string, code: string) {
  return {
    success: false,
    error: {
      message,
      code,
    },
  };
}
