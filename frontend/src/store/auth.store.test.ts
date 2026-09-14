import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './auth.store';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

type MockedApiFn = ReturnType<typeof vi.fn>;

const apiPost = api.post as unknown as MockedApiFn;
const apiGet = api.get as unknown as MockedApiFn;

const user = {
  id: 'user-1',
  email: 'admin@erp.com',
  firstName: 'Juan',
  lastName: 'Pérez',
  role: 'ADMIN',
};

describe('auth.store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: null, restored: false });
  });

  it('logs in and stores the user', async () => {
    apiPost.mockResolvedValue({ data: { user } });

    await useAuthStore.getState().login('admin@erp.com', 'secret');

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'admin@erp.com',
      password: 'secret',
    });
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('clears the user on logout', async () => {
    useAuthStore.setState({ user });
    apiPost.mockResolvedValue({});

    await useAuthStore.getState().logout();

    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('clears the user even when logout fails', async () => {
    useAuthStore.setState({ user });
    apiPost.mockRejectedValue(new Error('network'));

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
  });

  it('restores the session from the profile', async () => {
    apiGet.mockResolvedValue({ data: user });

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().restored).toBe(true);
  });

  it('clears the user when restore fails', async () => {
    apiGet.mockRejectedValue(new Error('401'));

    await useAuthStore.getState().restoreSession();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().restored).toBe(true);
  });

  it('removes the user with clearAuth', () => {
    useAuthStore.setState({ user });

    useAuthStore.getState().clearAuth();

    expect(useAuthStore.getState().user).toBeNull();
  });

  it('sets the user directly', () => {
    useAuthStore.getState().setUser(user);

    expect(useAuthStore.getState().user).toEqual(user);
  });
});