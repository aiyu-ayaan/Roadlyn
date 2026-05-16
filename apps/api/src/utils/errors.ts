/**
 * Error handler utility
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      message: error.message,
      code: 'INTERNAL_SERVER_ERROR',
    };
  }

  return {
    statusCode: 500,
    message: 'An unexpected error occurred',
    code: 'INTERNAL_SERVER_ERROR',
  };
}
