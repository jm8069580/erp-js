import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: any;
  let jwtService: any;

  const hashedPassword = bcrypt.hashSync('secret123', 10);

  const user = {
    id: 'user-1',
    email: 'user@erp.com',
    password: hashedPassword,
    firstName: 'Juan',
    lastName: 'Pérez',
    role: 'ADMIN',
    isActive: true,
  };

  beforeEach(() => {
    usersService = { findByEmail: jest.fn() };
    jwtService = { sign: jest.fn(() => 'signed-token') };

    service = new AuthService(usersService, jwtService);
  });

  it('returns a token and public user data on valid login', async () => {
    usersService.findByEmail.mockResolvedValue(user);

    const result = await service.login({
      email: 'user@erp.com',
      password: 'secret123',
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'user@erp.com',
      role: 'ADMIN',
    });
    expect(result.accessToken).toBe('signed-token');
    expect(result.user).toEqual({
      id: 'user-1',
      email: 'user@erp.com',
      firstName: 'Juan',
      lastName: 'Pérez',
      role: 'ADMIN',
    });
    expect(result.user).not.toHaveProperty('password');
  });

  it('rejects login with an unknown email', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@erp.com', password: 'x' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it('rejects login with a wrong password', async () => {
    usersService.findByEmail.mockResolvedValue(user);

    await expect(
      service.login({ email: 'user@erp.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects login for a deactivated user', async () => {
    usersService.findByEmail.mockResolvedValue({
      ...user,
      isActive: false,
    });

    await expect(
      service.login({ email: 'user@erp.com', password: 'secret123' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });
});