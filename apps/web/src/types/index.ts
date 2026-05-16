// Common application types
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
}
