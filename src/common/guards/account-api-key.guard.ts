import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../entities/account.entity';

@Injectable()
export class AccountApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const apiKey =
      request.headers['x-account-key'] ||
      this.extractBearerToken(request.headers['authorization']);

    if (!apiKey || !apiKey.startsWith('ak_')) {
      return false;
    }

    const account = await this.accountRepo.findOne({
      where: { apiKey, isActive: true },
    });

    if (!account) {
      throw new UnauthorizedException('Account API key inválida o cuenta inactiva');
    }

    // Set request.user with accountId so @CurrentUser('accountId') works
    request.user = { id: null, accountId: account.id, role: 'account_api_key' };
    return true;
  }

  private extractBearerToken(header?: string): string | null {
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
  }
}
