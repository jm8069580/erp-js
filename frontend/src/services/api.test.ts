import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { api } from './api';

const { clearAuth } = vi.hoisted(() => ({ clearAuth: vi.fn() }));

vi.mock('../store/auth.store', () => ({
  useAuthStore: { getState: () => ({ clearAuth }) },
}));

function rejectWithStatus(status: number) {
  const error = new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST');
  (error as { response?: unknown }).response = {
    status,
    data: {},
    statusText: 'Error',
    headers: {},
    config: {},
  };
  api.defaults.adapter = async (): Promise<never> => Promise.reject(error);
}

describe('api client', () => {
  beforeEach(() => {
    clearAuth.mockClear();
  });

  it('is an axios instance with credentials enabled', () => {
    expect(api.defaults.withCredentials).toBe(true);
    expect(api.defaults.baseURL).toBeTruthy();
  });

  it('clears the auth store when receiving a 401', async () => {
    rejectWithStatus(401);

    await expect(api.get('/profile')).rejects.toThrow();
    expect(clearAuth).toHaveBeenCalledTimes(1);
  });

  it('does not clear auth on other status codes', async () => {
    rejectWithStatus(500);

    await expect(api.get('/profile')).rejects.toThrow();
    expect(clearAuth).not.toHaveBeenCalled();
  });
});