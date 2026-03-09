import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PlatformAdmin } from '../entities/platform-admin.entity';
import { AccountUser } from '../entities/account-user.entity';
import { MailService } from '../common/services/mail.service';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(PlatformAdmin)
    private readonly adminRepo: Repository<PlatformAdmin>,
    @InjectRepository(AccountUser)
    private readonly accountUserRepo: Repository<AccountUser>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async loginAdmin(email: string, password: string) {
    const admin = await this.adminRepo.findOne({
      where: { email, isActive: true },
      select: ['id', 'name', 'email', 'passwordHash', 'isActive'],
    });

    if (!admin) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: admin.id, email: admin.email, role: 'platform_admin' as const };
    const refreshToken = await this.refreshTokenService.create(admin.id, 'platform_admin');

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      user: { id: admin.id, name: admin.name, email: admin.email, role: 'platform_admin' },
    };
  }

  async loginClient(email: string, password: string) {
    const user = await this.accountUserRepo.findOne({
      where: { email, isActive: true },
      select: ['id', 'name', 'email', 'passwordHash', 'role', 'accountId'],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: 'account_user' as const,
      accountId: user.accountId,
    };

    const refreshToken = await this.refreshTokenService.create(user.id, 'account_user', user.accountId);

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountId: user.accountId,
      },
    };
  }

  /**
   * Issue a new access token + refresh token from a valid refresh token.
   */
  async refresh(oldRefreshToken: string) {
    const data = await this.refreshTokenService.consume(oldRefreshToken);
    if (!data) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Build JWT payload based on role
    if (data.role === 'platform_admin') {
      const admin = await this.adminRepo.findOne({ where: { id: data.userId, isActive: true } });
      if (!admin) throw new UnauthorizedException('Usuario no encontrado o desactivado');

      const payload = { sub: admin.id, email: admin.email, role: 'platform_admin' as const };
      const newRefreshToken = await this.refreshTokenService.create(admin.id, 'platform_admin');

      return {
        accessToken: this.jwtService.sign(payload),
        refreshToken: newRefreshToken,
        user: { id: admin.id, name: admin.name, email: admin.email, role: 'platform_admin' },
      };
    }

    // account_user
    const user = await this.accountUserRepo.findOne({ where: { id: data.userId, isActive: true } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado o desactivado');

    const payload = {
      sub: user.id,
      email: user.email,
      role: 'account_user' as const,
      accountId: user.accountId,
    };
    const newRefreshToken = await this.refreshTokenService.create(user.id, 'account_user', user.accountId);

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountId: user.accountId,
      },
    };
  }

  /**
   * Revoke a refresh token (logout).
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.refreshTokenService.revoke(refreshToken);
    return { message: 'Sesión cerrada correctamente' };
  }

  /**
   * Request password reset — searches both admin and client users.
   * Always returns success (never reveals if email exists).
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    // Check client user first
    const clientUser = await this.accountUserRepo.findOne({
      where: { email, isActive: true },
    });

    if (clientUser) {
      const token = this.jwtService.sign(
        { sub: clientUser.id, email: clientUser.email, type: 'password_reset', userType: 'client' },
        { expiresIn: '15m' },
      );
      const resetUrl = this.buildResetUrl(token);
      await this.mailService.sendPasswordReset(email, clientUser.name, resetUrl);
      this.logger.log(`Password reset requested for client user: ${email}`);
      return { message: 'Si el correo existe, recibirás un enlace de recuperación.' };
    }

    // Check platform admin
    const admin = await this.adminRepo.findOne({
      where: { email, isActive: true },
    });

    if (admin) {
      const token = this.jwtService.sign(
        { sub: admin.id, email: admin.email, type: 'password_reset', userType: 'admin' },
        { expiresIn: '15m' },
      );
      const resetUrl = this.buildResetUrl(token);
      await this.mailService.sendPasswordReset(email, admin.name, resetUrl);
      this.logger.log(`Password reset requested for admin user: ${email}`);
    }

    // Always same response to prevent email enumeration
    return { message: 'Si el correo existe, recibirás un enlace de recuperación.' };
  }

  /**
   * Reset password with token.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new BadRequestException('El enlace ha expirado o es inválido. Solicita uno nuevo.');
    }

    if (payload.type !== 'password_reset') {
      throw new BadRequestException('Token inválido.');
    }

    const hash = await bcrypt.hash(newPassword, 10);

    if (payload.userType === 'client') {
      const user = await this.accountUserRepo.findOne({ where: { id: payload.sub, isActive: true } });
      if (!user) throw new BadRequestException('Usuario no encontrado.');
      user.passwordHash = hash;
      await this.accountUserRepo.save(user);
    } else if (payload.userType === 'admin') {
      const admin = await this.adminRepo.findOne({ where: { id: payload.sub, isActive: true } });
      if (!admin) throw new BadRequestException('Usuario no encontrado.');
      admin.passwordHash = hash;
      await this.adminRepo.save(admin);
    } else {
      throw new BadRequestException('Token inválido.');
    }

    this.logger.log(`Password reset completed for ${payload.email}`);
    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }

  private buildResetUrl(token: string): string {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:8080');
    return `${frontendUrl}/reset-password?token=${token}`;
  }
}
