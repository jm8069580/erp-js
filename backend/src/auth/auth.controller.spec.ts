import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let usersService: any;
  let configService: any;

  beforeEach(() => {
    authService = { login: jest.fn() };
    usersService = { findOne: jest.fn() };
    configService = {
      get: jest.fn(
        (key: string, defaultValue?: unknown) =>
          key === 'COOKIE_SECURE' ? 'false' : defaultValue,
      ),
    };

    controller = new AuthController(authService, usersService, configService);
  });

  it('sets a session cookie on login', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'token-123',
      user: { id: 'user-1', email: 'user@erp.com' },
    });
    const res = { cookie: jest.fn() } as any;

    const result = await controller.login(
      { email: 'user@erp.com', password: 'secret123' },
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'token-123',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 3600_000,
        path: '/',
      }),
    );
    expect(result).toEqual({ user: { id: 'user-1', email: 'user@erp.com' } });
  });

  it('sets the secure flag when COOKIE_SECURE is enabled', async () => {
    configService.get
      .mockReturnValueOnce('true')
      .mockReturnValueOnce(3600_000);
    authService.login.mockResolvedValue({
      accessToken: 'token-123',
      user: { id: 'user-1' },
    });
    const res = { cookie: jest.fn() } as any;

    await controller.login(
      { email: 'user@erp.com', password: 'secret123' },
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'token-123',
      expect.objectContaining({ secure: true }),
    );
  });

  it('clears the cookie on logout', () => {
    const res = { clearCookie: jest.fn() } as any;

    const result = controller.logout(res);

    expect(res.clearCookie).toHaveBeenCalledWith('access_token', {
      path: '/',
    });
    expect(result).toEqual({ success: true });
  });

  it('returns the current user profile', async () => {
    usersService.findOne.mockResolvedValue({ id: 'user-1', email: 'a@b.c' });

    const result = await controller.getProfile({
      user: { id: 'user-1' },
    } as any);

    expect(usersService.findOne).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ id: 'user-1', email: 'a@b.c' });
  });
});