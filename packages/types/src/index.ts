// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

// AI Provider types
export interface AIProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'other';
  isActive: boolean;
  createdAt: Date;
}

export interface AIModel {
  id: string;
  providerId: string;
  name: string;
  displayName: string;
  version: string;
  maxTokens: number;
  costPer1kTokens: number;
  isActive: boolean;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Auth types
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}
