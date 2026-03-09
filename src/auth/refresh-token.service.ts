import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { randomBytes } from 'crypto';

@Injectable()
export class RefreshTokenService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly ttl: number;

  constructor(private readonly config: ConfigService) {
    this.ttl = this.config.get<number>('JWT_REFRESH_EXPIRES_SECONDS', 604800); // 7 days
  }

  async onModuleInit() {
    const host = this.config.get('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);

    this.client = createClient({ url: `redis://${host}:${port}` }) as RedisClientType;
    this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
    await this.client.connect();
    this.logger.log('Refresh token Redis client connected');
  }

  async onModuleDestroy() {
    await this.client?.disconnect();
  }

  private key(token: string) {
    return `rt:${token}`;
  }

  /**
   * Create a new refresh token and store the associated user info in Redis.
   */
  async create(userId: number, role: 'platform_admin' | 'account_user', accountId?: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const payload = JSON.stringify({ userId, role, accountId });
    await this.client.set(this.key(token), payload, { EX: this.ttl });
    return token;
  }

  /**
   * Validate and consume a refresh token (rotate: old token is deleted).
   * Returns the stored payload or null if invalid/expired.
   */
  async consume(token: string): Promise<{ userId: number; role: 'platform_admin' | 'account_user'; accountId?: number } | null> {
    const data = await this.client.get(this.key(token));
    if (!data) return null;
    await this.client.del(this.key(token));
    return JSON.parse(data);
  }

  /**
   * Revoke a specific refresh token (logout).
   */
  async revoke(token: string): Promise<void> {
    await this.client.del(this.key(token));
  }
}
