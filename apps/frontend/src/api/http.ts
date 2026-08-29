import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/auth';
import type { ApiResponse, AuthResponse } from '@/types';

export const http = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const auth = useAuthStore();
  if (!auth.refreshToken) {
    throw new Error('Tidak ada refresh token');
  }
  const { data } = await axios.post<ApiResponse<AuthResponse>>('/api/v1/auth/refresh', {
    refreshToken: auth.refreshToken,
  });
  auth.setTokens(data.data.accessToken, data.data.refreshToken);
  return data.data.accessToken;
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status === 401 && !original._retry && !original.url?.includes('/auth/login')) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const token = await refreshPromise;
        refreshPromise = null;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      } catch {
        refreshPromise = null;
        const auth = useAuthStore();
        auth.logout();
        window.location.href = '/login';
      }
    }

    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      (error.response?.data as { errors?: string[] } | undefined)?.errors?.[0] ??
      error.message ??
      'Terjadi kesalahan';

    return Promise.reject(new Error(message));
  },
);

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get<ApiResponse<T>>(url, config);
  return res.data.data;
}

export async function post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.post<ApiResponse<T>>(url, body, config);
  return res.data.data;
}

export async function patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.patch<ApiResponse<T>>(url, body, config);
  return res.data.data;
}

export async function remove<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.delete<ApiResponse<T>>(url, config);
  return res.data.data;
}
