import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoHelper } from '../../common/helpers/crypto.helper';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CreateUserDto } from './dto/create-user.dto';

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  unitId: string | null;
  unitName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') ?? 'refresh-secret';
    this.refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }
    const valid = await CryptoHelper.verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email atau password salah');
    }
    const tokens = await this.generateTokens(user);
    return { user: await this.buildUserResponse(user.id), ...tokens };
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string }>(dto.refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    const hash = CryptoHelper.sha256(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token sudah tidak berlaku');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await this.generateTokens(user);
    return { user: await this.buildUserResponse(user.id), ...tokens };
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash: CryptoHelper.sha256(dto.refreshToken) },
    });
  }

  async me(userId: string): Promise<AuthUserResponse> {
    return this.buildUserResponse(userId);
  }

  async createUser(dto: CreateUserDto): Promise<AuthUserResponse> {
    const passwordHash = await CryptoHelper.hashPassword(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: dto.role,
          unitId: dto.unitId ?? null,
        },
      });
      return this.sanitize(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email sudah terdaftar');
      }
      throw error;
    }
  }

  async listUsers(): Promise<AuthUserResponse[]> {
    const users = await this.prisma.user.findMany({
      include: { unit: true },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => this.sanitize(u));
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      unitId: user.unitId,
      name: user.name,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as unknown as number,
      },
    );

    const decoded = this.jwtService.decode(refreshToken) as { exp?: number };
    const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 86_400_000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: CryptoHelper.sha256(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async buildUserResponse(userId: string): Promise<AuthUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { unit: true },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return this.sanitize(user);
  }

  private sanitize(user: User & { unit?: { name: string } | null }): AuthUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      unitId: user.unitId,
      unitName: user.unit?.name,
    };
  }
}
