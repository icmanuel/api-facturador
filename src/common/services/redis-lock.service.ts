import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

/**
 * Simple distributed lock using Redis SET NX EX.
 * Ensures only one instance runs a cron job at a time.
 */
@Injectable()
export class RedisLockService implements OnModuleInit {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisLockService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);

    this.client = createClient({ url: `redis://${host}:${port}` }) as RedisClientType;
    this.client.on('error', (err) => this.logger.warn(`Redis lock client error: ${err.message}`));
    await this.client.connect();
  }

  /**
   * Try to acquire a lock. Returns true if acquired, false if another instance holds it.
   * @param key Lock name
   * @param ttlSeconds How long the lock lives (auto-expires as safety net)
   */
  async acquire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.set(`lock:${key}`, process.pid.toString(), {
      NX: true,
      EX: ttlSeconds,
    });
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    await this.client.del(`lock:${key}`);
  }
}
