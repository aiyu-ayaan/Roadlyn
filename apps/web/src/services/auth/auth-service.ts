import { apiClient } from '@/services/api';
import {
  ApiResponse,
  AuthUser,
  OAuthClientResponse,
  TokenResponse,
} from '@/types';

export interface LoginInput {
  clientId: string;
  clientSecret: string;
  scope?: string;
}

export interface RegisterClientInput {
  name: string;
  userId?: string;
  scopes?: string[];
}

export const authService = {
  async createOAuthClient(input: RegisterClientInput) {
    const { data } = await apiClient.post<ApiResponse<OAuthClientResponse> & { warning?: string }>(
      '/api/auth/oauth-clients',
      input,
    );

    return data;
  },
  async login(input: LoginInput) {
    const { data } = await apiClient.post<TokenResponse>('/api/auth/token', {
      grant_type: 'client_credentials',
      client_id: input.clientId,
      client_secret: input.clientSecret,
      scope: input.scope ?? 'ai:read ai:write',
    });

    return data;
  },
  async me() {
    const { data } = await apiClient.get<ApiResponse<AuthUser>>('/api/auth/me');
    return data.data;
  },
  async forgotPassword(email: string) {
    const { data } = await apiClient.post<ApiResponse<{ accepted: boolean }>>(
      '/api/auth/forgot-password',
      { email },
    );

    return data.data;
  },
  async resetPassword(input: { token: string; password: string }) {
    const { data } = await apiClient.post<ApiResponse<{ accepted: boolean }>>(
      '/api/auth/reset-password',
      input,
    );

    return data.data;
  },
};
