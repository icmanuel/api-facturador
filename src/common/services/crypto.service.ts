import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const hex = this.config.get<string>('CERT_ENCRYPTION_KEY');
    if (!hex || hex.length !== 64) {
      throw new Error('CERT_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
    }
    this.key = Buffer.from(hex, 'hex');
  }

  encrypt(data: Buffer): { encrypted: Buffer; iv: Buffer } {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    return { encrypted, iv };
  }

  decrypt(encrypted: Buffer, iv: Buffer): Buffer {
    const authTag = encrypted.subarray(encrypted.length - 16);
    const ciphertext = encrypted.subarray(0, encrypted.length - 16);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  encryptString(text: string): { encrypted: string; iv: string } {
    const { encrypted, iv } = this.encrypt(Buffer.from(text, 'utf-8'));
    return { encrypted: encrypted.toString('base64'), iv: iv.toString('base64') };
  }

  decryptString(encrypted: string, iv: string): string {
    return this.decrypt(
      Buffer.from(encrypted, 'base64'),
      Buffer.from(iv, 'base64'),
    ).toString('utf-8');
  }
}
