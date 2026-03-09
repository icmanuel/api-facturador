import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccountApiKeyGuard } from './account-api-key.guard';

/**
 * Guard that allows authentication via EITHER:
 * - Account API Key (X-Account-Key header or Bearer ak_...)
 * - JWT token (Authorization: Bearer eyJ...)
 *
 * If Account API Key is present and valid, JWT is skipped.
 * If no Account API Key, falls back to standard JWT auth.
 */
@Injectable()
export class JwtOrAccountKeyGuard implements CanActivate {
  constructor(
    private readonly accountApiKeyGuard: AccountApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Try Account API Key first
    try {
      const result = await this.accountApiKeyGuard.canActivate(context);
      if (result) return true;
    } catch {
      // Account API Key auth failed, try JWT
    }

    // Fall back to JWT
    const jwtGuard = new (AuthGuard('jwt'))();
    return jwtGuard.canActivate(context) as Promise<boolean>;
  }
}
