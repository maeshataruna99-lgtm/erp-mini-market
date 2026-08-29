import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoHelper } from '../../common/helpers/crypto.helper';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  const userRow = {
    id: 'u1',
    name: 'Admin',
    email: 'admin@minierp.id',
    passwordHash: '$2a$10$hash',
    role: Role.ADMIN,
    unitId: 'unit-central',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed-token'),
            verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1' }),
            decode: jest.fn().mockReturnValue({ exp: 9999999999 }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
              if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('harus didefinisikan', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('mengembalikan token saat kredensial benar', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      jest
        .spyOn(CryptoHelper, 'verifyPassword')
        .mockResolvedValue(true);
      jest
        .spyOn(CryptoHelper, 'sha256')
        .mockReturnValue('hashed-refresh');

      const result = await service.login({
        email: 'admin@minierp.id',
        password: 'admin123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('admin@minierp.id');
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });

    it('menolak saat password salah', async () => {
      prisma.user.findUnique.mockResolvedValue(userRow);
      jest.spyOn(CryptoHelper, 'verifyPassword').mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@minierp.id', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('menolak saat email tidak ditemukan', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'x@y.id', password: 'admin123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('me-rotasi token saat refresh token valid', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        userId: 'u1',
        tokenHash: 'hashed',
        expiresAt: new Date(Date.now() + 100000),
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(userRow);
      jest.spyOn(CryptoHelper, 'sha256').mockReturnValue('hashed');

      const result = await service.refresh({ refreshToken: 'some-token' });

      expect(result.accessToken).toBeDefined();
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt1' } });
    });

    it('menolak saat refresh token tidak ditemukan di DB', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh({ refreshToken: 'ghost' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('createUser', () => {
    it('menolak email duplikat dengan ConflictException', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Duplicate', {
          code: 'P2002',
          clientVersion: '6.19.3',
        }),
      );
      jest.spyOn(CryptoHelper, 'hashPassword').mockResolvedValue('hash');

      await expect(
        service.createUser({
          name: 'X',
          email: 'dup@minierp.id',
          password: 'admin123',
          role: Role.STAFF_KASIR,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
