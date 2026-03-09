import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { CompanySmtp } from '../../entities/company-smtp.entity';
import { CryptoService } from '../../common/services/crypto.service';
import { UpsertSmtpDto } from './dto/upsert-smtp.dto';

@Injectable()
export class SmtpService {
  constructor(
    @InjectRepository(CompanySmtp)
    private readonly repo: Repository<CompanySmtp>,
    private readonly crypto: CryptoService,
  ) {}

  async findByCompany(companyId: number): Promise<any> {
    const smtp = await this.repo.findOne({ where: { companyId } });
    if (!smtp) return null;

    // Never return the real password
    return {
      id: smtp.id,
      companyId: smtp.companyId,
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      user: smtp.user,
      hasPassword: true,
      fromEmail: smtp.fromEmail,
      fromName: smtp.fromName,
      isActive: smtp.isActive,
      verifiedAt: smtp.verifiedAt,
      createdAt: smtp.createdAt,
      updatedAt: smtp.updatedAt,
    };
  }

  async upsert(companyId: number, dto: UpsertSmtpDto): Promise<any> {
    let smtp = await this.repo.findOne({ where: { companyId } });

    if (smtp) {
      // Update existing
      smtp.host = dto.host;
      smtp.port = dto.port;
      smtp.secure = dto.secure;
      smtp.user = dto.user;
      smtp.fromEmail = dto.fromEmail;
      smtp.fromName = dto.fromName;
      smtp.isActive = dto.isActive;

      if (dto.password) {
        const { encrypted, iv } = this.crypto.encryptString(dto.password);
        smtp.password = encrypted;
        smtp.passwordIv = iv;
        // Reset verification when password changes
        smtp.verifiedAt = null;
      }
    } else {
      // Create new — password is required
      if (!dto.password) {
        throw new BadRequestException('Password es requerido para la configuración inicial');
      }

      const { encrypted, iv } = this.crypto.encryptString(dto.password);
      smtp = this.repo.create({
        companyId,
        host: dto.host,
        port: dto.port,
        secure: dto.secure,
        user: dto.user,
        password: encrypted,
        passwordIv: iv,
        fromEmail: dto.fromEmail,
        fromName: dto.fromName,
        isActive: dto.isActive,
      });
    }

    await this.repo.save(smtp);
    return this.findByCompany(companyId);
  }

  async remove(companyId: number): Promise<void> {
    const result = await this.repo.delete({ companyId });
    if (result.affected === 0) {
      throw new NotFoundException('No hay configuración SMTP para esta empresa');
    }
  }

  async testConnection(companyId: number, testEmail: string): Promise<{ success: boolean; message: string }> {
    const smtp = await this.repo.findOne({ where: { companyId } });
    if (!smtp) {
      throw new NotFoundException('No hay configuración SMTP. Guarda la configuración primero.');
    }

    const password = this.crypto.decryptString(smtp.password, smtp.passwordIv);

    const transportOpts: any = {
      host: smtp.host,
      port: smtp.port,
      auth: { user: smtp.user, pass: password },
    };

    if (smtp.secure === 'ssl') {
      transportOpts.secure = true;
    } else if (smtp.secure === 'tls') {
      transportOpts.secure = false;
      transportOpts.tls = { rejectUnauthorized: false };
    } else {
      transportOpts.secure = false;
    }

    try {
      const transporter = nodemailer.createTransport(transportOpts);
      await transporter.verify();

      await transporter.sendMail({
        from: `${smtp.fromName} <${smtp.fromEmail}>`,
        to: testEmail,
        subject: 'AutorizadorEC — Prueba de servidor SMTP',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Prueba de conexión exitosa</h2>
            <p>Tu servidor SMTP está correctamente configurado en AutorizadorEC.</p>
            <p style="color: #666; font-size: 12px;">
              Servidor: ${smtp.host}:${smtp.port}<br>
              Remitente: ${smtp.fromName} &lt;${smtp.fromEmail}&gt;
            </p>
          </div>
        `,
      });

      // Mark as verified
      smtp.verifiedAt = new Date();
      await this.repo.save(smtp);

      return { success: true, message: 'Conexión exitosa. Se envió un email de prueba.' };
    } catch (err: any) {
      return {
        success: false,
        message: `Error de conexión: ${err.message || 'No se pudo conectar al servidor SMTP'}`,
      };
    }
  }

  /** Used by the email engine to get a transporter for a company */
  async getTransporter(companyId: number): Promise<nodemailer.Transporter | null> {
    const smtp = await this.repo.findOne({ where: { companyId, isActive: true } });
    if (!smtp) return null;

    const password = this.crypto.decryptString(smtp.password, smtp.passwordIv);

    const opts: any = {
      host: smtp.host,
      port: smtp.port,
      auth: { user: smtp.user, pass: password },
    };

    if (smtp.secure === 'ssl') {
      opts.secure = true;
    } else if (smtp.secure === 'tls') {
      opts.secure = false;
      opts.tls = { rejectUnauthorized: false };
    } else {
      opts.secure = false;
    }

    return nodemailer.createTransport(opts);
  }
}
