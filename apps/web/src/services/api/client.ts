import axios, { AxiosError } from 'axios';
import { appConfig } from '@/config/app';
import { tokenStorage } from '@/services/auth/token-storage';

export interface NormalizedApiError {
  message: string;
  code: string;
  status?: number;
}

export const apiClient = axios.create({
  baseURL: appConfig.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { message?: string; code?: string } }>) => {
    const normalized: NormalizedApiError = {
      message:
        error.response?.data?.error?.message ??
        error.message ??
        'Something went wrong',
      code: error.response?.data?.error?.code ?? 'API_ERROR',
      status: error.response?.status,
    };

    if (normalized.status === 401) {
      tokenStorage.clear();
    }

    return Promise.reject(normalized);
  },
);
