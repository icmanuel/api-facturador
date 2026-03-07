import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

export interface UploadResult {
  s3Key: string;
  sizeBytes: number;
  hashSha256: string;
}

@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get('AWS_BUCKET', 'icya-bucket');
    this.s3 = new S3Client({
      region: config.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY', ''),
        secretAccessKey: config.get('AWS_SECRET_KEY', ''),
      },
    });
  }

  async uploadXml(
    companyRuc: string,
    accessKey: string,
    type: 'signed' | 'authorized',
    xmlContent: string,
  ): Promise<UploadResult> {
    const buffer = Buffer.from(xmlContent, 'utf-8');
    const s3Key = `documents/${companyRuc}/${accessKey}/${type}.xml`;
    return this.upload(s3Key, buffer, 'application/xml');
  }

  async uploadPdf(
    companyRuc: string,
    accessKey: string,
    pdfBuffer: Buffer,
  ): Promise<UploadResult> {
    const s3Key = `documents/${companyRuc}/${accessKey}/ride.pdf`;
    return this.upload(s3Key, pdfBuffer, 'application/pdf');
  }

  async uploadLogo(
    companyRuc: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<UploadResult> {
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const s3Key = `logos/${companyRuc}/logo.${ext}`;
    return this.upload(s3Key, buffer, mimeType);
  }

  async deleteLogo(s3Key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: s3Key }));
    this.logger.log(`Deleted ${s3Key}`);
  }

  async download(s3Key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });
    const response = await this.s3.send(command);
    const stream = response.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private async upload(
    s3Key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    const hashSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3.send(command);

    this.logger.log(`Uploaded ${s3Key} (${buffer.length} bytes)`);

    return {
      s3Key,
      sizeBytes: buffer.length,
      hashSha256,
    };
  }
}
